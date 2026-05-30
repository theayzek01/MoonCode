// @ts-nocheck

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, type Stats, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { getEngineDir } from "../../config.js";

// Desteklenen dosya uzantıları
const CODE_EXTENSIONS = new Set([
	".ts",
	".tsx",
	".js",
	".jsx",
	".mjs",
	".cjs",
	".py",
	".rb",
	".go",
	".rs",
	".java",
	".kt",
	".swift",
	".c",
	".cpp",
	".h",
	".hpp",
	".cs",
	".vue",
	".svelte",
	".astro",
	".json",
	".yaml",
	".yml",
	".toml",
	".md",
	".mdx",
	".css",
	".scss",
	".less",
	".sh",
	".bash",
	".zsh",
	".sql",
	".graphql",
	".gql",
	".html",
	".xml",
	".dockerfile",
	".env",
]);

const IGNORE_DIRS = new Set([
	"node_modules",
	".git",
	"dist",
	"build",
	"out",
	".next",
	"coverage",
	".nyc_output",
	"__pycache__",
	".venv",
	"venv",
	".cache",
	".turbo",
	".vercel",
	".output",
	"vendor",
	"target",
	"bin",
	"obj",
]);

const IGNORE_FILES = new Set(["package-lock.json", "yarn.lock", "pnpm-lock.yaml", ".DS_Store", "thumbs.db"]);

// Chunk sabitleri
const CHUNK_SIZE = 50; // satır - daha büyük chunk = daha az chunk = daha küçük index
const CHUNK_OVERLAP = 5;
const MAX_FILE_SIZE = 512 * 1024;
const MAX_FILES = 5000;

/** Disk'te saklanan hafif chunk - content YOK, sadece metadata + BM25 term frekansları */
export interface CodeChunk {
	filePath: string;
	startLine: number;
	endLine: number;
	/** Çıkarılan sembol isimleri (fonksiyon, class, interface vs.) */
	symbols: string[];
	/** BM25 için term→frekans haritası (content saklanmıyor, token tasarrufu) */
	tf: Record<string, number>;
	/** Chunk'taki toplam token sayısı (BM25 dl parametresi) */
	termCount: number;
}

export interface CodebaseIndex {
	projectHash: string;
	timestamp: number;
	fileCount: number;
	chunkCount: number;
	chunks: CodeChunk[];
	fileTimestamps: Record<string, number>;
	/** IDF tablosu: term → log((N - df + 0.5) / (df + 0.5)) */
	idf: Record<string, number>;
	/** Ortalama chunk term sayısı (BM25 avgdl) */
	avgTermCount: number;
}

// ─── Tokenizer ────────────────────────────────────────────────────────────────

const STOP_WORDS = new Set([
	"the",
	"a",
	"an",
	"is",
	"it",
	"in",
	"of",
	"to",
	"and",
	"or",
	"for",
	"if",
	"be",
	"as",
	"at",
	"by",
	"do",
	"go",
	"no",
	"on",
	"so",
	"up",
	"we",
	"he",
	"she",
	"they",
	"from",
	"with",
	"this",
	"that",
	"not",
	"are",
	"was",
	"but",
	"have",
	"had",
	"has",
	"can",
	"will",
	"var",
	"let",
	"const",
	"return",
	"true",
	"false",
	"null",
	"undefined",
]);

export function tokenize(text: string): string[] {
	const raw = text
		.toLowerCase()
		.replace(/[^a-z0-9_]/g, " ")
		.split(/\s+/)
		.filter((t) => t.length > 1 && !STOP_WORDS.has(t));

	// camelCase + snake_case expand
	const expanded: string[] = [];
	for (const t of raw) {
		expanded.push(t);
		const camel = t
			.replace(/([a-z])([A-Z])/g, "$1 $2")
			.toLowerCase()
			.split(" ");
		if (camel.length > 1) expanded.push(...camel);
		const snake = t.split("_").filter(Boolean);
		if (snake.length > 1) expanded.push(...snake);
	}
	return [...new Set(expanded)].filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

function buildTF(tokens: string[]): { tf: Record<string, number>; termCount: number } {
	const tf: Record<string, number> = {};
	for (const t of tokens) {
		tf[t] = (tf[t] ?? 0) + 1;
	}
	return { tf, termCount: tokens.length };
}

// ─── Symbol extraction ────────────────────────────────────────────────────────

function extractSymbols(content: string, ext: string): string[] {
	const symbols: string[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
			const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
			if (fnMatch) symbols.push(fnMatch[1]);
			const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
			if (classMatch) symbols.push(classMatch[1]);
			const ifMatch = trimmed.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);
			if (ifMatch) symbols.push(ifMatch[1]);
			const constMatch = trimmed.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)/);
			if (constMatch) symbols.push(constMatch[1]);
			const methodMatch = trimmed.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
			if (
				methodMatch &&
				!["if", "for", "while", "switch", "catch", "return", "new", "throw"].includes(methodMatch[1])
			) {
				symbols.push(methodMatch[1]);
			}
		}

		if (ext === ".py") {
			const pyFnMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
			if (pyFnMatch) symbols.push(pyFnMatch[1]);
			const pyClassMatch = trimmed.match(/^class\s+(\w+)/);
			if (pyClassMatch) symbols.push(pyClassMatch[1]);
		}

		if (ext === ".go") {
			const goFnMatch = trimmed.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/);
			if (goFnMatch) symbols.push(goFnMatch[1]);
			const goTypeMatch = trimmed.match(/^type\s+(\w+)/);
			if (goTypeMatch) symbols.push(goTypeMatch[1]);
		}

		if (ext === ".rs") {
			const rsFnMatch = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
			if (rsFnMatch) symbols.push(rsFnMatch[1]);
			const rsStructMatch = trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/);
			if (rsStructMatch) symbols.push(rsStructMatch[1]);
		}
	}

	return [...new Set(symbols)];
}

// ─── Gitignore ────────────────────────────────────────────────────────────────

function loadGitignorePatterns(cwd: string): string[] {
	const gitignorePath = join(cwd, ".gitignore");
	if (!existsSync(gitignorePath)) return [];
	try {
		return readFileSync(gitignorePath, "utf-8")
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l && !l.startsWith("#"));
	} catch {
		return [];
	}
}

function shouldIgnorePath(relativePath: string, gitignorePatterns: string[]): boolean {
	const parts = relativePath.split(/[/\\]/);
	for (const part of parts) {
		if (IGNORE_DIRS.has(part)) return true;
	}
	const fileName = basename(relativePath);
	if (IGNORE_FILES.has(fileName)) return true;
	if (fileName.startsWith(".")) return true;
	for (const pattern of gitignorePatterns) {
		const clean = pattern.replace(/\/$/, "");
		if (parts.includes(clean)) return true;
		if (fileName === clean) return true;
	}
	return false;
}

// ─── File collection ──────────────────────────────────────────────────────────

function collectFiles(cwd: string, gitignorePatterns: string[]): string[] {
	const files: string[] = [];

	function walk(dir: string) {
		if (files.length >= MAX_FILES) return;
		let entries: string[];
		try {
			entries = readdirSync(dir);
		} catch {
			return;
		}

		for (const entry of entries) {
			if (files.length >= MAX_FILES) return;
			const fullPath = join(dir, entry);
			const rel = relative(cwd, fullPath);

			if (shouldIgnorePath(rel, gitignorePatterns)) continue;

			let stat: Stats;
			try {
				stat = statSync(fullPath);
			} catch {
				continue;
			}

			if (stat.isDirectory()) {
				walk(fullPath);
			} else if (stat.isFile()) {
				if (stat.size > MAX_FILE_SIZE) continue;
				const ext = extname(entry).toLowerCase();
				if (!ext && !["dockerfile", "makefile", "rakefile", "gemfile"].includes(entry.toLowerCase())) continue;
				if (ext && !CODE_EXTENSIONS.has(ext)) continue;
				files.push(fullPath);
			}
		}
	}

	walk(cwd);
	return files;
}

// ─── Chunking (content'siz - sadece TF vektörü) ──────────────────────────────

function chunkFile(filePath: string, cwd: string): CodeChunk[] {
	let content: string;
	try {
		content = readFileSync(filePath, "utf-8");
	} catch {
		return [];
	}

	const lines = content.split("\n");
	if (lines.length === 0) return [];

	const ext = extname(filePath).toLowerCase();
	const relPath = relative(cwd, filePath).replace(/\\/g, "/");
	const chunks: CodeChunk[] = [];

	const makeChunk = (start: number, end: number): CodeChunk => {
		const chunkLines = lines.slice(start, end);
		const chunkContent = chunkLines.join("\n");
		const symbols = extractSymbols(chunkContent, ext);
		const tokens = tokenize(chunkContent);
		// symbol'leri token olarak da ekle - arama doğruluğunu artırır
		for (const sym of symbols) tokens.push(sym.toLowerCase());
		const { tf, termCount } = buildTF(tokens);
		return { filePath: relPath, startLine: start + 1, endLine: end, symbols, tf, termCount };
	};

	if (lines.length <= CHUNK_SIZE * 1.5) {
		chunks.push(makeChunk(0, lines.length));
		return chunks;
	}

	for (let i = 0; i < lines.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
		const start = i;
		const end = Math.min(i + CHUNK_SIZE, lines.length);
		chunks.push(makeChunk(start, end));
		if (end >= lines.length) break;
	}

	return chunks;
}

// ─── IDF computation ──────────────────────────────────────────────────────────

function buildIDF(chunks: CodeChunk[]): Record<string, number> {
	const N = chunks.length;
	const df: Record<string, number> = {};
	for (const chunk of chunks) {
		for (const term of Object.keys(chunk.tf)) {
			df[term] = (df[term] ?? 0) + 1;
		}
	}
	const idf: Record<string, number> = {};
	for (const [term, freq] of Object.entries(df)) {
		// BM25 IDF formülü
		idf[term] = Math.log((N - freq + 0.5) / (freq + 0.5) + 1);
	}
	return idf;
}

// ─── Index paths ──────────────────────────────────────────────────────────────

function getProjectHash(cwd: string): string {
	return createHash("md5").update(resolve(cwd)).digest("hex").slice(0, 12);
}

function getIndexPath(cwd: string): string {
	const indexDir = join(getEngineDir(), "codebase-index");
	if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true });
	return join(indexDir, `${getProjectHash(cwd)}.json`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function loadCachedIndex(cwd: string): CodebaseIndex | null {
	const indexPath = getIndexPath(cwd);
	if (!existsSync(indexPath)) return null;
	try {
		const raw = readFileSync(indexPath, "utf-8");
		return JSON.parse(raw) as CodebaseIndex;
	} catch {
		return null;
	}
}

/** Incremental build: sadece değişen dosyaları yeniden indexle */
export function buildIndex(cwd: string, force = false): CodebaseIndex {
	const gitignorePatterns = loadGitignorePatterns(cwd);
	const files = collectFiles(cwd, gitignorePatterns);
	const projectHash = getProjectHash(cwd);

	const cached = force ? null : loadCachedIndex(cwd);
	const oldTimestamps = cached?.fileTimestamps ?? {};
	const oldChunksByFile = new Map<string, CodeChunk[]>();

	if (cached) {
		for (const chunk of cached.chunks) {
			const existing = oldChunksByFile.get(chunk.filePath) ?? [];
			existing.push(chunk);
			oldChunksByFile.set(chunk.filePath, existing);
		}
	}

	const newTimestamps: Record<string, number> = {};
	const allChunks: CodeChunk[] = [];

	for (const file of files) {
		const relPath = relative(cwd, file).replace(/\\/g, "/");
		let mtime: number;
		try {
			mtime = statSync(file).mtimeMs;
		} catch {
			continue;
		}
		newTimestamps[relPath] = mtime;

		if (!force && oldTimestamps[relPath] === mtime && oldChunksByFile.has(relPath)) {
			allChunks.push(...oldChunksByFile.get(relPath)!);
		} else {
			allChunks.push(...chunkFile(file, cwd));
		}
	}

	// IDF ve avgdl hesapla
	const idf = buildIDF(allChunks);
	const avgTermCount = allChunks.length > 0 ? allChunks.reduce((s, c) => s + c.termCount, 0) / allChunks.length : 1;

	const index: CodebaseIndex = {
		projectHash,
		timestamp: Date.now(),
		fileCount: files.length,
		chunkCount: allChunks.length,
		chunks: allChunks,
		fileTimestamps: newTimestamps,
		idf,
		avgTermCount,
	};

	try {
		writeFileSync(getIndexPath(cwd), JSON.stringify(index), "utf-8");
	} catch {
		// sessizce geç
	}

	return index;
}

export function getIndexStats(
	cwd: string,
): { indexed: boolean; fileCount: number; chunkCount: number; ageMs: number } | null {
	const cached = loadCachedIndex(cwd);
	if (!cached) return null;
	return {
		indexed: true,
		fileCount: cached.fileCount,
		chunkCount: cached.chunkCount,
		ageMs: Date.now() - cached.timestamp,
	};
}
