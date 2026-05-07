import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getEngineDir } from "../config.js";

export interface MemorySignal {
	timestamp: string;
	text: string;
	tag: "preference" | "workflow";
	weight?: number; // 1-10 arası önem skoru, yoksa 5 varsayılan
}

const MEMORY_FILE = join(getEngineDir(), "memory-signals.json");
const MAX_SIGNALS = 80; // 200'den 80'e: context window için çok daha verimli
const MIN_TEXT_LEN = 20; // 24'ten 20'ye: kısa ama anlamlı sinyaller de yakalansın
const MAX_TEXT_LEN = 400; // Yeni: aşırı uzun sinyalleri kırp

const SIGNAL_PATTERNS = /tercih|preference|always|her zaman|workflow|akis|daima|istiyorum|yapma|kullan|tercih et/i;

export function shouldPersistMemorySignal(text: string): boolean {
	const normalized = text.toLowerCase().trim();
	if (normalized.length < MIN_TEXT_LEN) return false;
	if (normalized.length > 2000) return false; // Devasa text'leri sinyal olarak kaydetme
	return SIGNAL_PATTERNS.test(normalized);
}

export function persistMemorySignal(text: string): void {
	const tag: MemorySignal["tag"] = /tercih|preference|always|her zaman|daima|istiyorum/i.test(text)
		? "preference"
		: "workflow";

	// Metni makul uzunlukta tut
	const trimmedText = text.length > MAX_TEXT_LEN ? `${text.slice(0, MAX_TEXT_LEN)}…` : text;

	const next: MemorySignal = {
		timestamp: new Date().toISOString(),
		text: trimmedText,
		tag,
		weight: 5,
	};

	const all = loadMemorySignals();
	all.push(next);

	// Dedupe ve limit uygula - eski duplicate'ları at, yenileri tut
	const deduped = dedupeSignals(all);
	// Ağırlığa göre sırala, en önemlileri tut
	const sorted = deduped.sort((a, b) => (b.weight ?? 5) - (a.weight ?? 5));
	const final = sorted.slice(0, MAX_SIGNALS);

	if (!existsSync(dirname(MEMORY_FILE))) mkdirSync(dirname(MEMORY_FILE), { recursive: true });
	writeFileSync(MEMORY_FILE, `${JSON.stringify(final, null, 2)}\n`, "utf-8");
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
		// Benzerlik key'i: tag + ilk 80 karakter (tam metin değil)
		const key = `${s.tag}:${s.text.slice(0, 80).trim().toLowerCase()}`;
		const existing = seen.get(key);
		if (!existing) {
			seen.set(key, s);
		} else {
			// Aynı key için daha yeni olanı tut, weight'i yükselt (sık tekrar = önemli)
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
		// Ultra-short format for local models
		const lines = items.map((s) => `[${s.tag[0].toUpperCase()}] ${s.text}`);
		return `User preferences:\n${lines.join("\n")}\n`;
	}

	const lines = items.map((s) => `- [${s.tag}] ${s.text}`);
	return `User memory signals:\n${lines.join("\n")}\n`;
}
