import { truncateToWidth, visibleWidth } from "moon-tui";
import { type ThemeColor, theme } from "../theme/theme.js";

export type ToolFrameState = "running" | "success" | "error" | "cancelled" | "pending";

const BOX = {
	tl: "╭",
	tr: "╮",
	bl: "╰",
	br: "╯",
	h: "─",
	v: "│",
};

const STATE_PREFIX: Record<ToolFrameState, string> = {
	running: "⏳",
	pending: "⏳",
	success: "✅",
	error: "❌",
	cancelled: "⚠️",
};

const STATE_COLOR: Record<ToolFrameState, ThemeColor> = {
	running: "accent",
	pending: "dim",
	success: "success",
	error: "error",
	cancelled: "warning",
};

export function renderToolFrame(
	toolName: string,
	state: ToolFrameState,
	contentLines: string[],
	width: number,
): string[] {
	if (width < 10) return contentLines;

	const prefix = STATE_PREFIX[state];
	const prefixColor = STATE_COLOR[state];

	const header =
		theme.fg(prefixColor, "┌") +
		theme.bold(theme.fg("toolTitle", `  ${prefix} ${toolName}`));

	const body = contentLines
		.filter((l) => l.trim().length > 0)
		.slice(0, 20) // show up to 20 lines inside
		.map((line) => {
			return (
				theme.fg(prefixColor, "│ ") +
				theme.fg("dim", line)
			);
		});

	if (body.length === 0) {
		const emptyLine =
			theme.fg(prefixColor, "│ ") +
			theme.fg("dim", "...");
		return [header, emptyLine, theme.fg(prefixColor, "└")];
	}

	return [header, ...body, theme.fg(prefixColor, "└")];
}
