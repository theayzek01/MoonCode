import chalk from "chalk";

const DEFAULT_BASE_URL = "http://localhost:11434";
const PROFILE_VALUES = {
	turbo: {
		MOONCLI_OLLAMA_MODE: "turbo",
		MOONCLI_OLLAMA_NUM_CTX: "4096",
		MOONCLI_OLLAMA_NUM_BATCH: "512",
		MOONCLI_OLLAMA_LOW_VRAM: "true",
		MOONCLI_OLLAMA_KEEP_ALIVE: "30m",
	},
	balanced: {
		MOONCLI_OLLAMA_MODE: "balanced",
		MOONCLI_OLLAMA_NUM_CTX: "8192",
		MOONCLI_OLLAMA_NUM_BATCH: "512",
		MOONCLI_OLLAMA_LOW_VRAM: "true",
		MOONCLI_OLLAMA_KEEP_ALIVE: "30m",
	},
	quality: {
		MOONCLI_OLLAMA_MODE: "quality",
		MOONCLI_OLLAMA_NUM_CTX: "12288",
		MOONCLI_OLLAMA_NUM_BATCH: "256",
		MOONCLI_OLLAMA_LOW_VRAM: "false",
		MOONCLI_OLLAMA_KEEP_ALIVE: "1h",
	},
} as const;

type Profile = keyof typeof PROFILE_VALUES;

interface OllamaModelTag {
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

function printUsage(): void {
	console.log(`${chalk.bold("Kullanım:")}
  mooncli ollama doctor
  mooncli ollama profile <turbo|balanced|quality>

${chalk.bold("Profil etkisi:")}
  turbo     Düşük RAM, hızlı cevap, 4K context
  balanced  Varsayılan optimum, 8K context
  quality   Daha uzun çıktı, daha yüksek RAM, 12K context

Çalıştır: Ctrl + E`);
}

function printProfile(profile: Profile): void {
	const values = PROFILE_VALUES[profile];
	console.log(chalk.bold(`Ollama profili: ${profile}`));
	console.log(chalk.dim("PowerShell:"));
	console.log(psSetCommand(values));
	console.log(chalk.dim("Bash:"));
	console.log(bashSetCommand(values));
	console.log(chalk.green("Bu oturumda Mooncli Ollama istekleri bu profile göre optimize edilir."));
	console.log(chalk.dim("Çalıştır: Ctrl + E"));
}

async function printDoctor(): Promise<void> {
	console.log(chalk.bold("Mooncli Ollama Doctor"));
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

	const activeProfile = process.env.MOONCLI_OLLAMA_MODE || "balanced";
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
