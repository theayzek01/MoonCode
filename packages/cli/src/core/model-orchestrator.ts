// @ts-nocheck
import type { Model } from "mooncli-core";
import { modelsAreEqual } from "mooncli-core";
import type { ModelRegistry } from "./model-registry.js";

function scoreModel(candidate: Model<any>, current: Model<any>): number {
	let score = 0;
	if (candidate.provider !== current.provider) score += 5;
	if (candidate.reasoning) score += 2;
	if (candidate.input?.includes("image") === current.input?.includes("image")) score += 1;
	return score;
}

export async function pickFallbackModel(
	current: Model<any> | undefined,
	modelRegistry: ModelRegistry,
): Promise<Model<any> | undefined> {
	if (!current) return undefined;
	const available = await modelRegistry.getAvailable();
	const candidates = available.filter((m) => !modelsAreEqual(m, current));
	candidates.sort((a, b) => scoreModel(b, current) - scoreModel(a, current));
	return candidates[0];
}
