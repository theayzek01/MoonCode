import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { getEngineDir } from "../config.js";

export interface MemorySignal {
	timestamp: string;
	text: string;
	tag: "preference" | "workflow";
}

const MEMORY_FILE = join(getEngineDir(), "memory-signals.json");

export function shouldPersistMemorySignal(text: string): boolean {
	const normalized = text.toLowerCase();
	if (normalized.length < 24) return false;
	return /tercih|preference|always|her zaman|workflow|akis/i.test(normalized);
}

export function persistMemorySignal(text: string): void {
	const tag: MemorySignal["tag"] = /tercih|preference|always|her zaman/i.test(text) ? "preference" : "workflow";
	const next: MemorySignal = { timestamp: new Date().toISOString(), text, tag };
	const all = loadMemorySignals();
	all.push(next);
	const deduped = dedupeSignals(all).slice(-200);
	if (!existsSync(dirname(MEMORY_FILE))) mkdirSync(dirname(MEMORY_FILE), { recursive: true });
	writeFileSync(MEMORY_FILE, `${JSON.stringify(deduped, null, 2)}\n`, "utf-8");
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
	const seen = new Set<string>();
	const out: MemorySignal[] = [];
	for (const s of signals) {
		const key = `${s.tag}:${s.text.trim().toLowerCase()}`;
		if (seen.has(key)) continue;
		seen.add(key);
		out.push(s);
	}
	return out;
}

export function getMemoryPreface(limit = 5): string {
	const items = loadMemorySignals().slice(-limit);
	if (items.length === 0) return "";
	const lines = items.map((s) => `- [${s.tag}] ${s.text}`);
	return `User memory signals:\n${lines.join("\n")}\n`;
}
