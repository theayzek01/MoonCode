// @ts-nocheck
import type { CodebaseIndex, CodeChunk } from "./indexer.js";
import { buildIndex, loadCachedIndex } from "./indexer.js";

export interface SearchResult {
	filePath: string;
	startLine: number;
	endLine: number;
	content: string;
	symbols: string[];
	score: number;
}

// TF-IDF benzeri basit scoring
function tokenize(text: string): string[] {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 1);
}

// camelCase ve snake_case'i parçala
function expandTokens(tokens: string[]): string[] {
	const expanded: string[] = [];
	for (const token of tokens) {
		expanded.push(token);
		// camelCase split
		const camelParts = token
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.toLowerCase()
			.split(" ");
		if (camelParts.length > 1) expanded.push(...camelParts);
		// snake_case split
		const snakeParts = token.split("_").filter(Boolean);
		if (snakeParts.length > 1) expanded.push(...snakeParts);
	}
	return [...new Set(expanded)];
}

function scoreChunk(chunk: CodeChunk, queryTokens: string[], expandedQuery: string[]): number {
	let score = 0;
	const contentLower = chunk.content.toLowerCase();
	const symbolsLower = chunk.symbols.map((s) => s.toLowerCase());

	// Exact query match (tam kelime geçiyorsa)
	const fullQuery = queryTokens.join(" ");
	if (contentLower.includes(fullQuery)) {
		score += 10;
	}

	// Token bazlı scoring
	const chunkTokens = new Set(expandTokens(tokenize(chunk.content)));

	for (const qt of expandedQuery) {
		// Token content'te geçiyor mu
		if (chunkTokens.has(qt)) {
			score += 1;
		}
		// Symbol'de exact match (çok değerli)
		if (symbolsLower.includes(qt)) {
			score += 5;
		}
		// Symbol partial match
		for (const sym of symbolsLower) {
			if (sym.includes(qt) || qt.includes(sym)) {
				score += 2;
			}
		}
	}

	// Dosya adında query geçiyorsa bonus
	const fileNameLower = chunk.filePath.toLowerCase();
	for (const qt of expandedQuery) {
		if (fileNameLower.includes(qt)) {
			score += 3;
		}
	}

	return score;
}

export function searchIndex(index: CodebaseIndex, query: string, limit = 10): SearchResult[] {
	const queryTokens = tokenize(query);
	if (queryTokens.length === 0) return [];

	const expandedQuery = expandTokens(queryTokens);

	const scored: Array<{ chunk: CodeChunk; score: number }> = [];

	for (const chunk of index.chunks) {
		const score = scoreChunk(chunk, queryTokens, expandedQuery);
		if (score > 0) {
			scored.push({ chunk, score });
		}
	}

	// Score'a göre sırala, en yüksek önce
	scored.sort((a, b) => b.score - a.score);

	// Aynı dosyanın çok fazla chunk'ını döndürme - dosya başına max 3
	const fileCount = new Map<string, number>();
	const results: SearchResult[] = [];

	for (const { chunk, score } of scored) {
		if (results.length >= limit) break;
		const count = fileCount.get(chunk.filePath) ?? 0;
		if (count >= 3) continue;
		fileCount.set(chunk.filePath, count + 1);

		results.push({
			filePath: chunk.filePath,
			startLine: chunk.startLine,
			endLine: chunk.endLine,
			content: chunk.content,
			symbols: chunk.symbols,
			score,
		});
	}

	return results;
}

// Ana arama fonksiyonu - lazy indexing
export function searchProject(cwd: string, query: string, limit = 10): SearchResult[] {
	let index = loadCachedIndex(cwd);

	// Index yoksa veya 10 dakikadan eskiyse yeniden oluştur
	const MAX_AGE = 10 * 60 * 1000;
	if (!index || Date.now() - index.timestamp > MAX_AGE) {
		index = buildIndex(cwd);
	}

	return searchIndex(index, query, limit);
}

// Sonuçları agent-friendly formata çevir
export function formatSearchResults(results: SearchResult[]): string {
	if (results.length === 0) {
		return "Eşleşen sonuç bulunamadı.";
	}

	const lines: string[] = [];
	for (const r of results) {
		const symbolInfo = r.symbols.length > 0 ? ` [${r.symbols.slice(0, 5).join(", ")}]` : "";
		lines.push(`📄 ${r.filePath}:${r.startLine}-${r.endLine}${symbolInfo} (score: ${r.score})`);

		// Content'in ilk 15 satırını göster
		const preview = r.content.split("\n").slice(0, 15).join("\n");
		lines.push(preview);
		lines.push("---");
	}

	return lines.join("\n");
}
