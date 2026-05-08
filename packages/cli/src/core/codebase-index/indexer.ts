// @ts-nocheck

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, type Stats, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, relative, resolve } from "node:path";
import { getEngineDir } from "../../config.js";

// Desteklenen dosya uzantıları - gereksiz şeyleri indexleme
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

// Bunları hiç tarama
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
const CHUNK_SIZE = 40; // satır
const CHUNK_OVERLAP = 8; // overlap satır sayısı
const MAX_FILE_SIZE = 512 * 1024; // 512KB üstü dosyaları atla
const MAX_FILES = 5000; // max dosya sayısı

export interface CodeChunk {
	filePath: string;
	startLine: number;
	endLine: number;
	content: string;
	symbols: string[];
}

export interface CodebaseIndex {
	projectHash: string;
	timestamp: number;
	fileCount: number;
	chunkCount: number;
	chunks: CodeChunk[];
	// dosya path → son modified timestamp
	fileTimestamps: Record<string, number>;
}

// Basit symbol extraction - regex based, hızlı ve "yeterince iyi"
function extractSymbols(content: string, ext: string): string[] {
	const symbols: string[] = [];
	const lines = content.split("\n");

	for (const line of lines) {
		const trimmed = line.trim();

		// TS/JS
		if ([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].includes(ext)) {
			// function declarations
			const fnMatch = trimmed.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/);
			if (fnMatch) symbols.push(fnMatch[1]);

			// class declarations
			const classMatch = trimmed.match(/(?:export\s+)?class\s+(\w+)/);
			if (classMatch) symbols.push(classMatch[1]);

			// interface/type
			const ifMatch = trimmed.match(/(?:export\s+)?(?:interface|type)\s+(\w+)/);
			if (ifMatch) symbols.push(ifMatch[1]);

			// const/let/var exports
			const constMatch = trimmed.match(/(?:export\s+)?(?:const|let|var)\s+(\w+)/);
			if (constMatch) symbols.push(constMatch[1]);

			// method declarations (class methods)
			const methodMatch = trimmed.match(/^\s*(?:async\s+)?(\w+)\s*\(/);
			if (
				methodMatch &&
				!["if", "for", "while", "switch", "catch", "return", "new", "throw"].includes(methodMatch[1])
			) {
				symbols.push(methodMatch[1]);
			}
		}

		// Python
		if (ext === ".py") {
			const pyFnMatch = trimmed.match(/^(?:async\s+)?def\s+(\w+)/);
			if (pyFnMatch) symbols.push(pyFnMatch[1]);
			const pyClassMatch = trimmed.match(/^class\s+(\w+)/);
			if (pyClassMatch) symbols.push(pyClassMatch[1]);
		}

		// Go
		if (ext === ".go") {
			const goFnMatch = trimmed.match(/^func\s+(?:\(\w+\s+\*?\w+\)\s+)?(\w+)/);
			if (goFnMatch) symbols.push(goFnMatch[1]);
			const goTypeMatch = trimmed.match(/^type\s+(\w+)/);
			if (goTypeMatch) symbols.push(goTypeMatch[1]);
		}

		// Rust
		if (ext === ".rs") {
			const rsFnMatch = trimmed.match(/^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)/);
			if (rsFnMatch) symbols.push(rsFnMatch[1]);
			const rsStructMatch = trimmed.match(/^(?:pub\s+)?struct\s+(\w+)/);
			if (rsStructMatch) symbols.push(rsStructMatch[1]);
		}
	}

	return [...new Set(symbols)];
}

// .gitignore parse - çok basit, yeterli seviye
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
	const parts = relativePath.split(/[\\/]/);
	// dir-level ignore
	for (const part of parts) {
		if (IGNORE_DIRS.has(part)) return true;
	}
	// file-level ignore
	const fileName = basename(relativePath);
	if (IGNORE_FILES.has(fileName)) return true;
	if (fileName.startsWith(".")) return true;

	// basit gitignore pattern matching
	for (const pattern of gitignorePatterns) {
		const clean = pattern.replace(/\/$/, "");
		if (parts.includes(clean)) return true;
		if (fileName === clean) return true;
		// glob yok, basit tutuyoruz
	}
	return false;
}

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
				// Dockerfile gibi uzantısız dosyalar
				if (!ext && !["dockerfile", "makefile", "rakefile", "gemfile"].includes(entry.toLowerCase())) continue;
				if (ext && !CODE_EXTENSIONS.has(ext)) continue;
				files.push(fullPath);
			}
		}
	}

	walk(cwd);
	return files;
}

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

	// Küçük dosyalar tek chunk
	if (lines.length <= CHUNK_SIZE * 1.5) {
		const symbols = extractSymbols(content, ext);
		chunks.push({
			filePath: relPath,
			startLine: 1,
			endLine: lines.length,
			content: content,
			symbols,
		});
		return chunks;
	}

	// Sliding window ile chunk'la
	for (let i = 0; i < lines.length; i += CHUNK_SIZE - CHUNK_OVERLAP) {
		const start = i;
		const end = Math.min(i + CHUNK_SIZE, lines.length);
		const chunkLines = lines.slice(start, end);
		const chunkContent = chunkLines.join("\n");
		const symbols = extractSymbols(chunkContent, ext);

		chunks.push({
			filePath: relPath,
			startLine: start + 1,
			endLine: end,
			content: chunkContent,
			symbols,
		});

		if (end >= lines.length) break;
	}

	return chunks;
}

function getProjectHash(cwd: string): string {
	return createHash("md5").update(resolve(cwd)).digest("hex").slice(0, 12);
}

function getIndexPath(cwd: string): string {
	const indexDir = join(getEngineDir(), "codebase-index");
	if (!existsSync(indexDir)) mkdirSync(indexDir, { recursive: true });
	return join(indexDir, `${getProjectHash(cwd)}.json`);
}

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

// Incremental: sadece değişen dosyaları yeniden indexle
export function buildIndex(cwd: string, force = false): CodebaseIndex {
	const gitignorePatterns = loadGitignorePatterns(cwd);
	const files = collectFiles(cwd, gitignorePatterns);
	const projectHash = getProjectHash(cwd);

	// Cached index varsa incremental güncelle
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

		// Dosya değişmediyse eski chunk'ları kullan
		if (!force && oldTimestamps[relPath] === mtime && oldChunksByFile.has(relPath)) {
			allChunks.push(...oldChunksByFile.get(relPath)!);
		} else {
			const chunks = chunkFile(file, cwd);
			allChunks.push(...chunks);
		}
	}

	const index: CodebaseIndex = {
		projectHash,
		timestamp: Date.now(),
		fileCount: files.length,
		chunkCount: allChunks.length,
		chunks: allChunks,
		fileTimestamps: newTimestamps,
	};

	// Kaydet
	try {
		writeFileSync(getIndexPath(cwd), JSON.stringify(index), "utf-8");
	} catch {
		// sessizce geç, cache'siz de çalışır
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
