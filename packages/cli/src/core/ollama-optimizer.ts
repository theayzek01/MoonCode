import chalk from "chalk";

const DEFAULT_BASE_URL = "http://localhost:11434";
const PROFILE_VALUES = {
	turbo: {
		HODEUS_OLLAMA_MODE: "turbo",
		HODEUS_OLLAMA_NUM_CTX: "8192", // 4K→8K: 4K ile gerçek kod analizi imkansız
		HODEUS_OLLAMA_NUM_BATCH: "1024", // daha büyük batch = prefill hızlanır
		HODEUS_OLLAMA_LOW_VRAM: "true",
		HODEUS_OLLAMA_KEEP_ALIVE: "1h", // 30m→1h: model yeniden yükleme gecikti
	},
	balanced: {
		HODEUS_OLLAMA_MODE: "balanced",
		HODEUS_OLLAMA_NUM_CTX: "16384", // 8K→16K: orta büyüklük dosyalar sığsın
		HODEUS_OLLAMA_NUM_BATCH: "1024",
		HODEUS_OLLAMA_LOW_VRAM: "false",
		HODEUS_OLLAMA_KEEP_ALIVE: "2h",
	},
	quality: {
		HODEUS_OLLAMA_MODE: "quality",
		HODEUS_OLLAMA_NUM_CTX: "32768", // 12K→32K: büyük dosya/codebase analizi
		HODEUS_OLLAMA_NUM_BATCH: "512", // büyük ctx'te daha küçük batch daha kararlı
		HODEUS_OLLAMA_LOW_VRAM: "false",
		HODEUS_OLLAMA_KEEP_ALIVE: "4h",
	},
} as const;

type Profile = keyof typeof PROFILE_VALUES;

export interface OllamaModelTag {
	name: string;
	size?: number;
	modified_at?: string;
	details?: { parameter_size?: string; quantization_level?: string };
}

interface OllamaTagsResponse {
	models?: OllamaModelTag[];
}

function baseUrl(): string {
	return (process.env.OLLAMA_HOST || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function psSetCommand(values: Record<string, string>): string {
	return Object.entries(values)
		.map(([key, value]) => `$env:${key}="${value}"`)
		.join("; ");
}

function bashSetCommand(values: Record<string, string>): string {
	return Object.entries(values)
		.map(([key, value]) => `export ${key}=${JSON.stringify(value)}`)
		.join("; ");
}

function formatBytes(bytes?: number): string {
	if (!bytes || !Number.isFinite(bytes)) return "?";
	const units = ["B", "KB", "MB", "GB", "TB"];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < units.length - 1) {
		value /= 1024;
		unit++;
	}
	return `${value.toFixed(value >= 10 ? 1 : 2)} ${units[unit]}`;
}

async function fetchJson<T>(path: string): Promise<T> {
	const response = await fetch(`${baseUrl()}${path}`);
	if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
	return (await response.json()) as T;
}

export async function getLocalModels(): Promise<OllamaModelTag[]> {
	const tags = await fetchJson<OllamaTagsResponse>("/api/tags");
	return tags.models ?? [];
}

export async function checkModelAvailability(modelName: string): Promise<boolean> {
	const normalized = modelName.trim().toLowerCase();
	if (!normalized) return false;
	const models = await getLocalModels();
	return models.some((m) => m.name.toLowerCase() === normalized || m.name.toLowerCase().split(":")[0] === normalized);
}

export async function getRunningModels(): Promise<string[]> {
	try {
		const ps = await fetchJson<{ models?: OllamaModelTag[] }>("/api/ps");
		return (ps.models ?? []).map((m) => m.name);
	} catch {
		return [];
	}
}

export async function pullModel(modelName: string, onProgress?: (event: any) => void): Promise<void> {
	const response = await fetch(`${baseUrl()}/api/pull`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ name: modelName, stream: true }),
	});
	if (!response.ok || !response.body) throw new Error(`${response.status} ${response.statusText}`);
	const reader = response.body.getReader();
	const decoder = new TextDecoder();
	let buffer = "";
	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;
		buffer += decoder.decode(value, { stream: true });
		const lines = buffer.split("\n");
		buffer = lines.pop() ?? "";
		for (const line of lines) {
			if (!line.trim()) continue;
			try {
				const event = JSON.parse(line);
				onProgress?.(event);
				if (event.error) throw new Error(event.error);
			} catch (parseErr) {
				// Skip malformed NDJSON lines; re-throw only real Ollama errors
				if ((parseErr as Error).message && !(parseErr instanceof SyntaxError)) {
					throw parseErr;
				}
			}
		}
	}
}

export async function suggestModels(): Promise<OllamaModelTag[]> {
	const local = await getLocalModels().catch(() => []);
	const popular = [
		"qwen2.5-coder:7b",
		"qwen2.5-coder:14b",
		"deepseek-coder-v2:16b",
		"codestral:22b",
		"llama3.1:8b",
		"mistral-nemo:12b",
	];
	const localNames = new Set(local.map((m) => m.name));
	return [...local, ...popular.filter((name) => !localNames.has(name)).map((name) => ({ name }))];
}

function printUsage(): void {
	console.log(`${chalk.bold("Kullanım:")}
  moon ollama doctor
  moon ollama models
  moon ollama pull <model>
  moon ollama profile <turbo|balanced|quality>

${chalk.bold("Profil etkisi:")}
  turbo     Düşük RAM, hızlı, ${chalk.cyan("8K")} context  — günlük kullanım, küçük dosyalar
  balanced  Denge, ${chalk.cyan("16K")} context — kod tabanı analizi, orta projeler
  quality   Yüksek RAM, ${chalk.cyan("32K")} context — büyük dosyalar, derin analiz

${chalk.dim("İpucu: Eğer modeliniz yavaşsa önce turbo deneyin. RAM yetersizse balanced'a geçin.")}

Çalıştır: Ctrl + E`);
}

function printProfile(profile: Profile): void {
	const values = PROFILE_VALUES[profile];
	console.log(chalk.bold(`Ollama profili: ${profile}`));
	console.log(chalk.dim("PowerShell:"));
	console.log(psSetCommand(values));
	console.log(chalk.dim("Bash:"));
	console.log(bashSetCommand(values));
	console.log(chalk.green("Bu oturumda Moon Ollama istekleri bu profile göre optimize edilir."));
	console.log(chalk.dim("Çalıştır: Ctrl + E"));
}

async function printDoctor(): Promise<void> {
	console.log(chalk.bold("Moon Ollama Doctor"));
	console.log(`${chalk.dim("Endpoint:")} ${baseUrl()}`);

	try {
		const tags = await fetchJson<OllamaTagsResponse>("/api/tags");
		const models = tags.models ?? [];
		console.log(`${chalk.green("Durum:")} bağlı`);
		console.log(`${chalk.dim("Model sayısı:")} ${models.length}`);
		for (const model of models.slice(0, 12)) {
			const details = [model.details?.parameter_size, model.details?.quantization_level].filter(Boolean).join(" / ");
			console.log(
				`  ${chalk.cyan(model.name)} ${chalk.dim(formatBytes(model.size))}${details ? chalk.dim(` · ${details}`) : ""}`,
			);
		}
		if (models.length > 12) console.log(chalk.dim(`  ... ${models.length - 12} model daha`));
	} catch (error) {
		console.log(`${chalk.red("Durum:")} bağlı değil`);
		console.log(chalk.dim(error instanceof Error ? error.message : String(error)));
		console.log(chalk.yellow("Ollama çalışmıyor. Önce `ollama serve` başlat."));
	}

	const activeProfile = process.env.HODEUS_OLLAMA_MODE || "balanced";
	console.log(`${chalk.dim("Aktif profil:")} ${activeProfile}`);
	console.log(chalk.dim("Hız/RAM için öneri:"));
	console.log(`  ${psSetCommand(PROFILE_VALUES.turbo)}`);
	console.log(chalk.dim("Çalıştır: Ctrl + E"));
}

export async function handleOllamaCommand(args: string[]): Promise<boolean> {
	if (args[0] !== "ollama") return false;
	const subcommand = args[1] ?? "doctor";
	if (subcommand === "doctor" || subcommand === "status") {
		await printDoctor();
		return true;
	}
	if (subcommand === "models" || subcommand === "list") {
		const models = await getLocalModels();
		const running = new Set(await getRunningModels());
		if (models.length === 0) console.log(chalk.yellow("Yerel Ollama modeli yok."));
		for (const model of models) {
			const mark = running.has(model.name) ? chalk.green("●") : chalk.dim("○");
			console.log(`${mark} ${chalk.cyan(model.name)} ${chalk.dim(formatBytes(model.size))}`);
		}
		return true;
	}
	if (subcommand === "pull") {
		const model = args[2];
		if (!model) {
			console.log(chalk.yellow("Kullanım: moon ollama pull <model>"));
			return true;
		}
		await pullModel(model, (event) => {
			const total = event.total || 0;
			const completed = event.completed || 0;
			const pct = total ? ` ${Math.round((completed / total) * 100)}%` : "";
			if (event.status) process.stdout.write(`\r${event.status}${pct}     `);
		});
		console.log(`\n${chalk.green("Model hazır:")} ${model}`);
		return true;
	}
	if (subcommand === "profile") {
		const profile = args[2] as Profile | undefined;
		if (!profile || !(profile in PROFILE_VALUES)) {
			printUsage();
			return true;
		}
		printProfile(profile);
		return true;
	}
	if (subcommand === "help" || subcommand === "--help" || subcommand === "-h") {
		printUsage();
		return true;
	}
	return false;
}
