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

	const titleText = ` ${prefix} ${toolName} `;
	const titleVisible = visibleWidth(titleText);
	
	const topLineWidth = Math.max(0, width - 2 - titleVisible - 2);
	const header = 
		theme.fg(prefixColor, BOX.tl + BOX.h) +
		theme.bold(theme.fg("toolTitle", titleText)) +
		theme.fg(prefixColor, BOX.h.repeat(topLineWidth) + BOX.tr);

	const innerWidth = width - 4; // 2 for left border, 2 for right border padding
	
	const body = contentLines
		.filter((l) => l.trim().length > 0)
		.slice(0, 20) // show up to 20 lines inside the box
		.map((line) => {
			const truncated = visibleWidth(line) > innerWidth ? truncateToWidth(line, innerWidth) : line;
			const padCount = Math.max(0, innerWidth - visibleWidth(truncated));
			return theme.fg(prefixColor, `${BOX.v} `) + theme.fg("dim", truncated) + " ".repeat(padCount) + theme.fg(prefixColor, ` ${BOX.v}`);
		});

	const bottomLine = theme.fg(prefixColor, BOX.bl + BOX.h.repeat(Math.max(0, width - 2)) + BOX.br);

	if (body.length === 0) {
		const emptyLine = theme.fg(prefixColor, `${BOX.v} `) + theme.fg("dim", "...") + " ".repeat(Math.max(0, innerWidth - 3)) + theme.fg(prefixColor, ` ${BOX.v}`);
		return [header, emptyLine, bottomLine];
	}

	return [header, ...body, bottomLine];
}
