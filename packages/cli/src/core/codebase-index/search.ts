// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { CodebaseIndex, CodeChunk } from "./indexer.js";
import { buildIndex, loadCachedIndex, tokenize } from "./indexer.js";

export interface SearchResult {
	filePath: string;
	startLine: number;
	endLine: number;
	/** Çıkarılan semboller */
	symbols: string[];
	/** BM25 skoru */
	score: number;
	/** Kısa kod snippet (3 satır) - tam içerik için read tool kullan */
	snippet: string;
}

// ─── BM25 ────────────────────────────────────────────────────────────────────
// k1 ve b parametreleri standart BM25 değerleri
const BM25_K1 = 1.5;
const BM25_B = 0.75;

function bm25Score(chunk: CodeChunk, queryTerms: string[], idf: Record<string, number>, avgdl: number): number {
	let score = 0;
	const dl = chunk.termCount;
	const norm = 1 - BM25_B + BM25_B * (dl / avgdl);

	for (const term of queryTerms) {
		const tf = chunk.tf[term] ?? 0;
		if (tf === 0) continue;
		const termIdf = idf[term] ?? 0;
		// BM25 TF saturation
		const tfSat = (tf * (BM25_K1 + 1)) / (tf + BM25_K1 * norm);
		score += termIdf * tfSat;
	}

	// Symbol exact match bonusu - çok değerli sinyal
	const symbolSet = new Set(chunk.symbols.map((s) => s.toLowerCase()));
	for (const term of queryTerms) {
		if (symbolSet.has(term)) score += 4;
	}

	// Dosya adı bonusu
	const fileNameLower = chunk.filePath.toLowerCase();
	for (const term of queryTerms) {
		if (fileNameLower.includes(term)) score += 1.5;
	}

	return score;
}

// ─── Snippet extraction (disk'ten oku, sadece lazım olunca) ───────────────────

function extractSnippet(cwd: string, chunk: CodeChunk, queryTerms: Set<string>): string {
	try {
		const absPath = join(cwd, chunk.filePath);
		const content = readFileSync(absPath, "utf-8");
		const lines = content.split("\n").slice(chunk.startLine - 1, chunk.endLine);

		// Query term'lerini içeren ilk satırı bul
		let bestLine = 0;
		for (let i = 0; i < lines.length; i++) {
			const lower = lines[i].toLowerCase();
			if ([...queryTerms].some((t) => lower.includes(t))) {
				bestLine = i;
				break;
			}
		}

		// 3 satır context
		const from = Math.max(0, bestLine - 1);
		const to = Math.min(lines.length, from + 3);
		return lines.slice(from, to).join("\n").trim();
	} catch {
		return "";
	}
}

// ─── Public search API ────────────────────────────────────────────────────────

export function searchIndex(index: CodebaseIndex, query: string, cwd: string, limit = 5): SearchResult[] {
	const queryTerms = tokenize(query);
	if (queryTerms.length === 0) return [];

	// Index eski formatta ise (idf yok) - graceful fallback
	if (!index.idf) {
		return legacySearch(index, query, cwd, limit);
	}

	const scored: Array<{ chunk: CodeChunk; score: number }> = [];

	for (const chunk of index.chunks) {
		const score = bm25Score(chunk, queryTerms, index.idf, index.avgTermCount ?? 100);
		if (score > 0) scored.push({ chunk, score });
	}

	scored.sort((a, b) => b.score - a.score);

	// Dosya başına max 2 chunk
	const fileCount = new Map<string, number>();
	const results: SearchResult[] = [];
	const querySet = new Set(queryTerms);

	for (const { chunk, score } of scored) {
		if (results.length >= limit) break;
		const count = fileCount.get(chunk.filePath) ?? 0;
		if (count >= 2) continue;
		fileCount.set(chunk.filePath, count + 1);

		results.push({
			filePath: chunk.filePath,
			startLine: chunk.startLine,
			endLine: chunk.endLine,
			symbols: chunk.symbols,
			score: Math.round(score * 100) / 100,
			snippet: extractSnippet(cwd, chunk, querySet),
		});
	}

	return results;
}

/** Eski index formatı için TF-IDF fallback */
function legacySearch(index: any, query: string, _cwd: string, limit: number): SearchResult[] {
	const queryTerms = tokenize(query);
	const querySet = new Set(queryTerms);

	const scored = index.chunks
		.map((chunk: any) => {
			const contentLower = (chunk.content ?? "").toLowerCase();
			let score = queryTerms.filter((t) => contentLower.includes(t)).length;
			score += chunk.symbols?.filter((s: string) => querySet.has(s.toLowerCase())).length * 3 ?? 0;
			return { chunk, score };
		})
		.filter((x: any) => x.score > 0)
		.sort((a: any, b: any) => b.score - a.score)
		.slice(0, limit);

	return scored.map(({ chunk, score }: any) => ({
		filePath: chunk.filePath,
		startLine: chunk.startLine,
		endLine: chunk.endLine,
		symbols: chunk.symbols ?? [],
		score,
		snippet: (chunk.content ?? "").split("\n").slice(0, 3).join("\n").trim(),
	}));
}

export function searchProject(cwd: string, query: string, limit = 5): SearchResult[] {
	let index = loadCachedIndex(cwd);
	const MAX_AGE = 10 * 60 * 1000;
	if (!index || Date.now() - index.timestamp > MAX_AGE) {
		index = buildIndex(cwd);
	}
	return searchIndex(index, query, cwd, limit);
}

/**
 * Token-minimal format:
 * - Sadece dosya:satır + semboller + 3 satır snippet
 * - Tam içerik gerekiyorsa agent read tool kullanmalı
 */
export function formatSearchResults(results: SearchResult[]): string {
	if (results.length === 0) return "No matching results.";

	const lines: string[] = [];
	for (const r of results) {
		const symInfo = r.symbols.length > 0 ? ` [${r.symbols.slice(0, 6).join(", ")}]` : "";
		lines.push(`${r.filePath}:${r.startLine}-${r.endLine}${symInfo}`);
		if (r.snippet) {
			lines.push(r.snippet);
		}
		lines.push("---");
	}

	return lines.join("\n");
}
