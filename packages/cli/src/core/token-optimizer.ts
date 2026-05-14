export interface TokenOptimizeResult {
	optimizedText: string;
	wasOptimized: boolean;
	reductionChars: number;
}

const REPEATED_WHITESPACE = /[ \t]{3,}/g;
const REPEATED_BLANK_LINES = /\n{3,}/g;
const TRAILING_WHITESPACE = /[ \t]+$/gm;
// Boş HTML comment'leri temizle
const HTML_COMMENTS = /<!--[\s\S]*?-->/g;
// Satır sonu noktalamasını normalize et
const REDUNDANT_PUNCTUATION = /([.!?]){3,}/g;
const ANSI_ESCAPE = /\x1b\[[0-?]*[ -/]*[@-~]/g;
const STACK_TRACE_LINE = /^\s*at\s+.+(?:\(|file:|[A-Za-z]:\\|\/).*/;
const JSONISH_BLOCK = /^\s*[[{][\s\S]*[\]}]\s*$/;
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
		.replace(TRAILING_WHITESPACE, "")
		.replace(REPEATED_WHITESPACE, " ")
		.replace(REPEATED_BLANK_LINES, "\n\n")
		.replace(REDUNDANT_PUNCTUATION, (_, p) => p);

	normalized = trimStackTraces(normalized);

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
