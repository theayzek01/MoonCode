import { MODELS } from "./models.generated.js";
import type { Api, KnownProvider, Model, ModelThinkingLevel, Usage } from "./types.js";
import { GITLAB_MODELS } from "./utils/oauth/gitlab.js";

const modelRegistry: Map<string, Map<string, Model<Api>>> = new Map();

// Initialize registry from MODELS on module load
for (const [provider, models] of Object.entries(MODELS)) {
	const providerModels = new Map<string, Model<Api>>();
	for (const [id, model] of Object.entries(models)) {
		providerModels.set(id, model as Model<Api>);
	}
	modelRegistry.set(provider, providerModels);
}

function getNodeSpawnSync(): typeof import("node:child_process").spawnSync | undefined {
	if (typeof process === "undefined" || !process.versions?.node) {
		return undefined;
	}
	const builtinModuleLoader = (
		process as typeof process & {
			getBuiltinModule?: (id: string) => { spawnSync?: typeof import("node:child_process").spawnSync } | undefined;
		}
	).getBuiltinModule;
	return builtinModuleLoader?.("node:child_process")?.spawnSync;
}

function getLocalOllamaModels(): string[] {
	const spawnSync = getNodeSpawnSync();
	if (!spawnSync) {
		return [];
	}
	try {
		const result = spawnSync("curl", ["-s", "-m", "1", "http://localhost:11434/api/tags"], { encoding: "utf-8" });
		if (result.status === 0 && result.stdout) {
			const data = JSON.parse(result.stdout);
			if (data && Array.isArray(data.models)) {
				return data.models.map((m: any) => m.name);
			}
		}
	} catch (_e) {}

	try {
		if (process.platform === "win32") {
			const result = spawnSync(
				"powershell",
				[
					"-Command",
					"[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; (Invoke-RestMethod -Uri http://localhost:11434/api/tags -TimeoutSec 1).models.name",
				],
				{ encoding: "utf-8" },
			);
			if (result.status === 0 && result.stdout) {
				const names = result.stdout
					.split(/\r?\n/)
					.map((s) => s.trim())
					.filter(Boolean);
				if (names.length > 0) {
					return names;
				}
			}
		}
	} catch (_e) {}

	return [];
}

// Inject Cloud & Local Ollama models dynamically
const cloudOllamaModels = new Map<string, Model<Api>>();
const localModels = getLocalOllamaModels();
const finalOllamaModels = ["gemma4:31b-cloud", "nemotron-3-super:cloud"];
for (const model of localModels) {
	if (model !== "gemma4:31b-cloud" && model !== "nemotron-3-super:cloud") {
		finalOllamaModels.push(model);
	}
}

for (const id of finalOllamaModels) {
	cloudOllamaModels.set(id, {
		id,
		name: id,
		api: "openai-completions",
		provider: "ollama",
		baseUrl: "http://localhost:11434/v1",
		reasoning: id.includes("thinking") || id.includes("coder"),
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 128000,
		maxTokens: 16384,
	} as Model<Api>);
}
modelRegistry.set("ollama", cloudOllamaModels);

// Inject GitLab Duo models dynamically
const gitlabDuoModelsMap = new Map<string, Model<Api>>();
for (const model of GITLAB_MODELS) {
	gitlabDuoModelsMap.set(model.id, model as Model<Api>);
}
modelRegistry.set("gitlab-duo", gitlabDuoModelsMap);

export function getModel(provider: string, modelId: string): Model<any> | undefined {
	const providerModels = modelRegistry.get(provider);
	return providerModels?.get(modelId);
}

export function getProviders(): KnownProvider[] {
	return Array.from(modelRegistry.keys()) as KnownProvider[];
}

export function getModels(provider: string): Model<any>[] {
	const models = modelRegistry.get(provider);
	return models ? Array.from(models.values()) : [];
}

export function calculateCost<TApi extends Api>(model: Model<TApi>, usage: Usage): Usage["cost"] {
	usage.cost.input = (model.cost.input / 1000000) * usage.input;
	usage.cost.output = (model.cost.output / 1000000) * usage.output;
	usage.cost.cacheRead = (model.cost.cacheRead / 1000000) * usage.cacheRead;
	usage.cost.cacheWrite = (model.cost.cacheWrite / 1000000) * usage.cacheWrite;
	usage.cost.total = usage.cost.input + usage.cost.output + usage.cost.cacheRead + usage.cost.cacheWrite;
	return usage.cost;
}

const EXTENDED_THINKING_LEVELS: ModelThinkingLevel[] = ["off", "minimal", "low", "medium", "high", "xhigh"];

export function getSupportedThinkingLevels<TApi extends Api>(model: Model<TApi>): ModelThinkingLevel[] {
	if (!model.reasoning) return ["off"];

	return EXTENDED_THINKING_LEVELS.filter((level) => {
		const mapped = model.thinkingLevelMap?.[level];
		if (mapped === null) return false;
		if (level === "xhigh") return mapped !== undefined;
		return true;
	});
}

export function clampThinkingLevel<TApi extends Api>(
	model: Model<TApi>,
	level: ModelThinkingLevel,
): ModelThinkingLevel {
	const availableLevels = getSupportedThinkingLevels(model);
	if (availableLevels.includes(level)) return level;

	const requestedIndex = EXTENDED_THINKING_LEVELS.indexOf(level);
	if (requestedIndex === -1) return availableLevels[0] ?? "off";

	for (let i = requestedIndex; i < EXTENDED_THINKING_LEVELS.length; i++) {
		const candidate = EXTENDED_THINKING_LEVELS[i];
		if (availableLevels.includes(candidate)) return candidate;
	}
	for (let i = requestedIndex - 1; i >= 0; i--) {
		const candidate = EXTENDED_THINKING_LEVELS[i];
		if (availableLevels.includes(candidate)) return candidate;
	}
	return availableLevels[0] ?? "off";
}

/**
 * Check if two models are equal by comparing both their id and provider.
 * Returns false if either model is null or undefined.
 */
export function modelsAreEqual<TApi extends Api>(
	a: Model<TApi> | null | undefined,
	b: Model<TApi> | null | undefined,
): boolean {
	if (!a || !b) return false;
	return a.id === b.id && a.provider === b.provider;
}
