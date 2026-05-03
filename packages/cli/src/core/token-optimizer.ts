export interface TokenOptimizeResult {
	optimizedText: string;
	wasOptimized: boolean;
	reductionChars: number;
}

const REPEATED_WHITESPACE = /\s{3,}/g;
const REPEATED_BLANK_LINES = /\n{3,}/g;
const TOOL_OUTPUT_BLOCK = /```(?:bash|shell|text)?\n([\s\S]*?)```/g;

function trimLongToolBlock(block: string): string {
	const lines = block.split("\n");
	if (lines.length <= 60) return block;
	const head = lines.slice(0, 35).join("\n");
	const tail = lines.slice(-15).join("\n");
	return `${head}\n...[trimmed ${lines.length - 50} lines]...\n${tail}`;
}

export function optimizePromptText(text: string): TokenOptimizeResult {
	const originalLength = text.length;
	let normalized = text
		.replace(/\r\n/g, "\n")
		.replace(REPEATED_WHITESPACE, "  ")
		.replace(REPEATED_BLANK_LINES, "\n\n");
	normalized = normalized.replace(
		TOOL_OUTPUT_BLOCK,
		(_full, inner: string) => `\`\`\`\n${trimLongToolBlock(inner)}\n\`\`\``,
	);
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
