import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getEngineDir } from "../config.js";

export interface MemorySignal {
	timestamp: string;
	text: string;
	tag: "preference" | "workflow";
	weight?: number; // 1-10 önem skoru, varsayılan 5
}

const MEMORY_FILE = join(getEngineDir(), "memory-signals.json");
const MAX_SIGNALS = 80;
const MIN_TEXT_LEN = 20;
const MAX_TEXT_LEN = 400;

const SIGNAL_PATTERNS = /tercih|preference|always|her zaman|workflow|akis|daima|istiyorum|yapma|kullan|tercih et/i;

export function shouldPersistMemorySignal(text: string): boolean {
	const normalized = text.toLowerCase().trim();
	if (normalized.length < MIN_TEXT_LEN) return false;
	if (normalized.length > 2000) return false;
	return SIGNAL_PATTERNS.test(normalized);
}

export function persistMemorySignal(text: string): void {
	const tag: MemorySignal["tag"] = /tercih|preference|always|her zaman|daima|istiyorum/i.test(text)
		? "preference"
		: "workflow";

	const trimmedText = text.length > MAX_TEXT_LEN ? `${text.slice(0, MAX_TEXT_LEN)}…` : text;

	const next: MemorySignal = {
		timestamp: new Date().toISOString(),
		text: trimmedText,
		tag,
		weight: 5,
	};

	const all = loadMemorySignals();
	all.push(next);

	const deduped = dedupeSignals(all);
	const sorted = deduped.sort((a, b) => (b.weight ?? 5) - (a.weight ?? 5));
	const final = sorted.slice(0, MAX_SIGNALS);

	// Atomic write: write to temp file then rename to avoid corrupt reads
	const dir = dirname(MEMORY_FILE);
	if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

	const tmp = `${MEMORY_FILE}.tmp`;
	try {
		writeFileSync(tmp, `${JSON.stringify(final, null, 2)}\n`, "utf-8");
		renameSync(tmp, MEMORY_FILE);
	} catch (_err) {
		// If rename failed, still try direct write as fallback
		try {
			writeFileSync(MEMORY_FILE, `${JSON.stringify(final, null, 2)}\n`, "utf-8");
		} catch {
			// Silent: memory signals are non-critical
		}
	}
}

export function loadMemorySignals(): MemorySignal[] {
	if (!existsSync(MEMORY_FILE)) return [];
	try {
		const raw = readFileSync(MEMORY_FILE, "utf-8");
		const parsed = JSON.parse(raw) as MemorySignal[];
		return Array.isArray(parsed) ? parsed : [];
	} catch {
		return [];
	}
}

function dedupeSignals(signals: MemorySignal[]): MemorySignal[] {
	const seen = new Map<string, MemorySignal>();
	for (const s of signals) {
		const key = `${s.tag}:${s.text.slice(0, 80).trim().toLowerCase()}`;
		const existing = seen.get(key);
		if (!existing) {
			seen.set(key, s);
		} else {
			const existingWeight = existing.weight ?? 5;
			seen.set(key, {
				...s,
				timestamp: s.timestamp > existing.timestamp ? s.timestamp : existing.timestamp,
				weight: Math.min(10, existingWeight + 1),
			});
		}
	}
	return Array.from(seen.values());
}

/**
 * Memory preface oluşturur. Local modeller için `compact` mod çok daha kısa çıktı verir.
 */
export function getMemoryPreface(limit = 8, compact = false): string {
	const items = loadMemorySignals()
		.sort((a, b) => (b.weight ?? 5) - (a.weight ?? 5))
		.slice(0, limit);

	if (items.length === 0) return "";

	if (compact) {
		const lines = items.map((s) => `[${s.tag[0].toUpperCase()}] ${s.text}`);
		return `User preferences:\n${lines.join("\n")}\n`;
	}

	const lines = items.map((s) => `- [${s.tag}] ${s.text}`);
	return `User memory signals:\n${lines.join("\n")}\n`;
}
