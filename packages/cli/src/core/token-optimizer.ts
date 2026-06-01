export interface TokenOptimizeResult {
	optimizedText: string;
	wasOptimized: boolean;
	reductionChars: number;
}

export interface PromptCapsuleResult extends TokenOptimizeResult {
	capsuleApplied: boolean;
}

const REPEATED_WHITESPACE = /[ \t]{3,}/g;
const REPEATED_BLANK_LINES = /\n{3,}/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;
// Boş HTML comment'leri temizle
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
// Satır sonu noktalamasını normalize et
const REDUNDANT_PUNCTUATION = /([.!?]){3,}/g;
const ANSI_ESCAPE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
// Also strip OSC sequences (terminal title, hyperlinks, etc.)
const OSC_ESCAPE = /\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g;
const STACK_TRACE_LINE = /^\s*at\s+.+(?:\(|file:|[A-Za-z]:\\|\/).*/;
const JSONISH_BLOCK = /^\s*[[{][\s\S]*[\]}]\s*$/;
// Repeated log lines (e.g. "[INFO] processing file X" × 100)
const REPEATED_LOG_LINE_THRESHOLD = 5;
const CAPSULE_MIN_CHARS = 12_000;
const CAPSULE_MAX_RAW_CHARS = 6_000;
const CAPSULE_MAX_LINES = 80;
// Note: TOOL_OUTPUT_BLOCK is created fresh per call (global regex with lastIndex would cause bugs across repeated calls)

// Trim long tool output blocks — head/tail strategy
function trimLongToolBlock(block: string): string {
	const lines = block.split("\n");
	// 40 satır altı dokunma
	if (lines.length <= 40) return block;
	const HEAD = 20;
	const TAIL = 10;
	const head = lines.slice(0, HEAD).join("\n");
	const tail = lines.slice(-TAIL).join("\n");
	const trimmed = lines.length - HEAD - TAIL;
	return `${head}\n...[${trimmed} lines trimmed]...\n${tail}`;
}

// Uzun satırları kırp (tek satırlık devasa output'lar için)
function trimStackTraces(text: string, maxFrames = 8): string {
	const lines = text.split("\n");
	let frames = 0;
	return lines
		.filter((line) => {
			if (!STACK_TRACE_LINE.test(line)) {
				frames = 0;
				return true;
			}
			frames++;
			return frames <= maxFrames;
		})
		.join("\n");
}

function compactJsonish(text: string): string {
	if (!JSONISH_BLOCK.test(text) || text.length > 200_000) return text;
	try {
		return JSON.stringify(JSON.parse(text));
	} catch {
		return text;
	}
}

function trimLongLines(text: string, maxLen = 500): string {
	return text
		.split("\n")
		.map((line) => {
			if (line.length <= maxLen) return line;
			return `${line.slice(0, maxLen)}…[+${line.length - maxLen} chars]`;
		})
		.join("\n");
}

export function optimizePromptText(text: string): TokenOptimizeResult {
	const originalLength = text.length;

	let normalized = text
		.replace(/\r\n/g, "\n")
		.replace(HTML_COMMENTS, "")
		.replace(ANSI_ESCAPE, "")
		.replace(OSC_ESCAPE, "")
		.replace(TRAILING_WHITESPACE, "")
		.replace(REPEATED_WHITESPACE, " ")
		.replace(REPEATED_BLANK_LINES, "\n\n")
		.replace(REDUNDANT_PUNCTUATION, (_, p) => p);

	normalized = trimStackTraces(normalized);
	normalized = deduplicateLogLines(normalized);

	// Tool output bloklarini kirp (fresh regex per call - global stateful regex'te lastIndex bug'i)
	const toolBlockRe = /```(?:json|bash|shell|text|plain|output|log)?\n([\s\S]*?)```/g;
	normalized = normalized.replace(toolBlockRe, (_full, inner: string) => {
		const compacted = compactJsonish(inner.trim());
		const trimmedInner = trimLongLines(trimLongToolBlock(compacted));
		return `\`\`\`\n${trimmedInner}\n\`\`\``;
	});

	normalized = compactJsonish(normalized);

	normalized = normalized.trim();

	if (normalized === text) {
		return { optimizedText: text, wasOptimized: false, reductionChars: 0 };
	}
	return {
		optimizedText: normalized,
		wasOptimized: true,
		reductionChars: Math.max(0, originalLength - normalized.length),
	};
}

function uniqueLimited(items: string[], limit: number): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of items) {
		const normalized = item.trim();
		if (!normalized || seen.has(normalized)) continue;
		seen.add(normalized);
		out.push(normalized);
		if (out.length >= limit) break;
	}
	return out;
}

function extractPathHints(text: string): string[] {
	const pathLike =
		/(?:[A-Za-z]:\\[^\s"'`<>|]+|\.{0,2}\/[^\s"'`<>|]+|[\w.-]+\/[\w./-]+\.[A-Za-z0-9]{1,8}|[\w.-]+\\[\w.\\-]+\.[A-Za-z0-9]{1,8})/g;
	return uniqueLimited(text.match(pathLike) ?? [], 32);
}

function extractCommandHints(text: string): string[] {
	const lines = text.split("\n");
	return uniqueLimited(
		lines
			.map((line) => line.trim())
			.filter((line) => /^(?:[$>]\s*)?(?:npm|pnpm|yarn|bun|node|python|pytest|vitest|cargo|go|git|rg|grep|tsc|eslint|blender)\b/i.test(line))
			.map((line) => line.replace(/^[$>]\s*/, "")),
		24,
	);
}

function extractErrorHints(text: string): string[] {
	const lines = text.split("\n");
	return uniqueLimited(
		lines.filter((line) => /\b(error|exception|failed|failure|traceback|timeout|eacces|enoent|cannot find|expected|received)\b/i.test(line)),
		24,
	);
}

function summarizeCodeFences(text: string): string[] {
	const summaries: string[] = [];
	const fenceRe = /```([A-Za-z0-9_+.-]*)\n([\s\S]*?)```/g;
	let match: RegExpExecArray | null;
	while ((match = fenceRe.exec(text)) && summaries.length < 16) {
		const lang = match[1] || "text";
		const body = match[2] ?? "";
		const lines = body.split("\n");
		const firstSignal = lines.find((line) => line.trim().length > 0)?.trim() ?? "";
		summaries.push(`${lang}: ${lines.length} lines, ${body.length} chars${firstSignal ? `, starts: ${firstSignal.slice(0, 120)}` : ""}`);
	}
	return summaries;
}

function summarizeLongPrompt(text: string): string {
	const normalized = optimizePromptText(text).optimizedText;
	const lines = normalized.split("\n");
	const head = lines.slice(0, Math.min(30, lines.length)).join("\n");
	const tail = lines.slice(-Math.min(30, lines.length)).join("\n");
	const pathHints = extractPathHints(normalized);
	const commandHints = extractCommandHints(normalized);
	const errorHints = extractErrorHints(normalized);
	const codeFences = summarizeCodeFences(normalized);

	const capsule = [
		"[MoonCode Capsule/Razor]",
		`Original: ${text.length} chars, ${text.split("\n").length} lines. Compressed before model input to reduce repeated/log-heavy context.`,
		pathHints.length ? `Paths:\n- ${pathHints.join("\n- ")}` : "",
		commandHints.length ? `Commands:\n- ${commandHints.join("\n- ")}` : "",
		errorHints.length ? `Errors/signals:\n- ${errorHints.join("\n- ")}` : "",
		codeFences.length ? `Code fences:\n- ${codeFences.join("\n- ")}` : "",
		"Head:",
		head,
		"Tail:",
		tail,
	]
		.filter(Boolean)
		.join("\n");

	const rawTail =
		normalized.length > CAPSULE_MAX_RAW_CHARS
			? normalized.slice(-CAPSULE_MAX_RAW_CHARS)
			: normalized;
	const trimmedRawTail = rawTail.split("\n").slice(-CAPSULE_MAX_LINES).join("\n");
	return `${capsule}\n\n[Recent raw tail preserved]\n${trimmedRawTail}`;
}

export function optimizePromptForIntentCapsule(text: string): PromptCapsuleResult {
	const base = optimizePromptText(text);
	const optimized = base.optimizedText;
	const shouldCapsule =
		optimized.length > CAPSULE_MIN_CHARS ||
		optimized.split("\n").length > 260 ||
		/```[\s\S]{8000,}```/.test(optimized);

	if (!shouldCapsule) {
		return { ...base, capsuleApplied: false };
	}

	const capsule = summarizeLongPrompt(optimized).trim();
	if (capsule.length >= optimized.length) {
		return { ...base, capsuleApplied: false };
	}
	return {
		optimizedText: capsule,
		wasOptimized: true,
		reductionChars: Math.max(0, text.length - capsule.length),
		capsuleApplied: true,
	};
}

/**
 * Local/Ollama modeller için agresif token kısıtması.
 * Context window küçük olduğu için daha sert kırpar.
 */
export function optimizeForLocalModel(text: string, maxChars = 6000): TokenOptimizeResult {
	const base = optimizePromptText(text);
	const working = base.optimizedText;

	if (working.length <= maxChars) {
		return base;
	}

	// Fazlaysa ortayı sil, head + tail bırak
	const head = Math.floor(maxChars * 0.65);
	const tail = maxChars - head;
	const trimmed = `${working.slice(0, head)}\n\n...[context trimmed, ${working.length - maxChars} chars skipped]...\n\n${working.slice(-tail)}`;

	return {
		optimizedText: trimmed,
		wasOptimized: true,
		reductionChars: Math.max(0, text.length - trimmed.length),
	};
}

/**
 * Deduplicate repeated log/output lines.
 * If the same pattern appears more than THRESHOLD times consecutively,
 * collapse into first + count + last.
 */
function deduplicateLogLines(text: string): string {
	const lines = text.split("\n");
	if (lines.length < REPEATED_LOG_LINE_THRESHOLD * 2) return text;

	const result: string[] = [];
	let prevPattern = "";
	let repeatCount = 0;
	let firstLine = "";
	let lastLine = "";

	for (const line of lines) {
		// Normalize numbers/hashes/timestamps to detect patterns
		const pattern = line
			.replace(/\d{2,}/g, "N")
			.replace(/[0-9a-f]{8,}/gi, "H")
			.trim();

		if (pattern === prevPattern && pattern.length > 5) {
			repeatCount++;
			lastLine = line;
		} else {
			if (repeatCount >= REPEATED_LOG_LINE_THRESHOLD) {
				result.push(firstLine);
				result.push(`  ...[${repeatCount - 1} similar lines]...`);
				if (lastLine !== firstLine) result.push(lastLine);
			} else {
				// Flush accumulated lines
				for (let i = 0; i < repeatCount; i++) {
					result.push(lastLine || firstLine);
				}
			}
			prevPattern = pattern;
			repeatCount = 1;
			firstLine = line;
			lastLine = line;
		}
	}

	// Flush remaining
	if (repeatCount >= REPEATED_LOG_LINE_THRESHOLD) {
		result.push(firstLine);
		result.push(`  ...[${repeatCount - 1} similar lines]...`);
		if (lastLine !== firstLine) result.push(lastLine);
	} else {
		for (let i = 0; i < repeatCount; i++) {
			result.push(lastLine || firstLine);
		}
	}

	return result.join("\n");
}
