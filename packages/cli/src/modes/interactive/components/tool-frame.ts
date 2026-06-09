import { truncateToWidth, visibleWidth } from "moon-tui";
import { type ThemeColor, theme } from "../theme/theme.js";

export type ToolFrameState = "running" | "success" | "error" | "cancelled" | "pending";

// Minimal prefix symbols — no box-drawing, no animations
const STATE_PREFIX: Record<ToolFrameState, string> = {
	running: "·",
	pending: "·",
	success: "✓",
	error: "✗",
	cancelled: "–",
};

const STATE_COLOR: Record<ToolFrameState, ThemeColor> = {
	running: "dim",
	pending: "dim",
	success: "success",
	error: "error",
	cancelled: "warning",
};

const TOOL_SHORT: Record<string, string> = {
	bash: "$",
	edit: "~",
	write: "+",
	read: "=",
	grep: "?",
	find: "@",
	ls: "#",
	semantic_search: "S",
	codebase_index: "I",
	git_ship: "G",
	browser_tabs: "T",
	browser_page: "P",
};

export function renderToolFrame(
	toolName: string,
	state: ToolFrameState,
	contentLines: string[],
	width: number,
): string[] {
	if (width < 4) return contentLines;

	const prefix = STATE_PREFIX[state];
	const prefixColor = STATE_COLOR[state];
	const short = TOOL_SHORT[toolName] ?? toolName.slice(0, 8);

	// Header: "· bash  path/to/file"  — no borders
	const header =
		theme.fg(prefixColor, prefix) + theme.fg("dim", " ") + theme.fg("toolTitle", short) + theme.fg("dim", " ");

	const headerVisible = visibleWidth(header);
	const maxContent = Math.max(1, width - headerVisible);

	// Body lines: indented 2 spaces, no boxing
	const indent = "  ";
	const innerWidth = Math.max(1, width - indent.length);

	if (contentLines.length === 0) return [header];

	const body = contentLines
		.filter((l) => l.trim().length > 0)
		.slice(0, 12) // cap lines to keep display compact
		.map((line) => {
			const truncated = visibleWidth(line) > innerWidth ? truncateToWidth(line, innerWidth) : line;
			return indent + theme.fg("dim", truncated);
		});

	// First content line on same row as header if short
	const firstLine = contentLines.find((l) => l.trim().length > 0) ?? "";
	const firstTrunc = visibleWidth(firstLine) > maxContent ? truncateToWidth(firstLine, maxContent) : firstLine;

	if (body.length <= 1) {
		return [header + theme.fg("dim", firstTrunc)];
	}

	return [header + theme.fg("dim", firstTrunc), ...body.slice(1)];
}
