import { truncateToWidth, visibleWidth } from "moon-tui";
import { type ThemeColor, theme } from "../theme/theme.js";

export type ToolFrameState = "running" | "success" | "error" | "cancelled" | "pending";

const TOOL_COLOR: Record<string, ThemeColor> = {
	bash: "warning",
	edit: "error",
	write: "success",
	read: "accent",
	grep: "mdCode",
	find: "borderAccent",
	ls: "muted",
	semantic_search: "thinkingText",
	codebase_index: "accent",
	git_ship: "success",
	browser_tabs: "borderAccent",
	browser_page: "borderAccent",
};

const TOOL_LABEL: Record<string, string> = {
	bash: "$ Bash",
	edit: "~ Edit",
	write: "+ Write",
	read: "= Read",
	grep: "? Grep",
	find: "@ Find",
	ls: "# List",
	semantic_search: "S Search",
	codebase_index: "I Index",
	git_ship: "G Git Ship",
	browser_tabs: "T Browser Tabs",
	browser_page: "P Browser Page",
};

function toolColor(toolName: string, state: ToolFrameState): ThemeColor {
	if (state === "error") return "error";
	if (state === "cancelled") return "warning";
	return TOOL_COLOR[toolName] ?? "toolTitle";
}

function stateLabel(state: ToolFrameState): string {
	switch (state) {
		case "running":
		case "pending":
			return "run";
		case "success":
			return "ok";
		case "error":
			return "err";
		case "cancelled":
			return "stop";
	}
}

function stateColor(state: ToolFrameState): ThemeColor {
	switch (state) {
		case "running":
		case "pending":
			return "dim";
		case "success":
			return "success";
		case "error":
			return "error";
		case "cancelled":
			return "warning";
	}
}

export function renderToolFrame(
	toolName: string,
	state: ToolFrameState,
	contentLines: string[],
	width: number,
): string[] {
	if (width < 8) return contentLines;

	const colorKey = toolColor(toolName, state);
	const border = (text: string) => theme.fg(colorKey, text);
	const muted = (text: string) => theme.fg("dim", text);
	const label = TOOL_LABEL[toolName] ?? toolName;
	const status = stateLabel(state);
	const title = ` ${label} `;
	const badge = `[${status}]`;
	const titleWidth = visibleWidth(title);
	const badgeWidth = visibleWidth(badge);
	const minChromeWidth = 2 + titleWidth + badgeWidth + 1;
	const fillWidth = Math.max(1, width - minChromeWidth);
	const top =
		border("+-") +
		theme.bold(theme.fg(colorKey, title)) +
		muted("-".repeat(fillWidth)) +
		theme.bold(theme.fg(stateColor(state), badge)) +
		border("+");
	const bottom = border("+") + muted("-".repeat(Math.max(1, width - 2))) + border("+");
	const side = border("|");
	const innerWidth = Math.max(1, width - 2);
	const body = contentLines.length > 0 ? contentLines : [""];
	const framed = body.map((line) => {
		const bodyLine = visibleWidth(line) > innerWidth ? truncateToWidth(line, innerWidth) : line;
		const pad = Math.max(0, innerWidth - visibleWidth(bodyLine));
		return side + bodyLine + " ".repeat(pad) + side;
	});

	return [top, ...framed, bottom];
}
