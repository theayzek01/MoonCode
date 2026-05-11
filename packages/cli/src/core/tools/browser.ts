import type { EngineTool } from "moon-engine";
import { Text } from "moon-tui";
import { type Static, Type } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.js";
import { sendBrowserCommand } from "../browser-bridge-server.js";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const browserTabsSchema = Type.Object({
	action: Type.Union([
		Type.Literal("list"),
		Type.Literal("active"),
		Type.Literal("open"),
		Type.Literal("close"),
		Type.Literal("focus"),
		Type.Literal("reload"),
		Type.Literal("navigate"),
	]),
	tabId: Type.Optional(Type.Number({ description: "Chrome tab id for tab-specific actions" })),
	url: Type.Optional(Type.String({ description: "URL for open/navigate actions" })),
	active: Type.Optional(Type.Boolean({ description: "Whether a new tab should be active" })),
});

const browserPageSchema = Type.Object({
	action: Type.Union([
		Type.Literal("read"),
		Type.Literal("read_dom"),
		Type.Literal("click"),
		Type.Literal("type"),
		Type.Literal("hover"),
		Type.Literal("press_key"),
		Type.Literal("get_elements"),
		Type.Literal("screenshot"),
		Type.Literal("evaluate"),
		Type.Literal("scroll"),
		Type.Literal("console_logs"),
		Type.Literal("wait"),
	]),
	tabId: Type.Optional(Type.Number({ description: "Chrome tab id. Defaults to active tab." })),
	selector: Type.Optional(Type.String({ description: "CSS selector for click/type/hover actions" })),
	text: Type.Optional(Type.String({ description: "Text to type" })),
	append: Type.Optional(Type.Boolean({ description: "Append to existing value instead of replacing (type action)" })),
	key: Type.Optional(Type.String({ description: "Key name for press_key action (e.g. Enter, Tab, Escape)" })),
	modifiers: Type.Optional(Type.Array(Type.String(), { description: "Modifier keys: ctrl, shift, alt, meta" })),
	script: Type.Optional(Type.String({ description: "JavaScript expression for evaluate action" })),
	maxChars: Type.Optional(Type.Number({ description: "Maximum characters for read action" })),
	direction: Type.Optional(
		Type.Union([Type.Literal("up"), Type.Literal("down"), Type.Literal("top"), Type.Literal("bottom")], {
			description: "Direction for scroll action",
		}),
	),
	amount: Type.Optional(Type.Number({ description: "Pixels to scroll" })),
	ms: Type.Optional(Type.Number({ description: "Milliseconds to wait (max 15000)" })),
});

export type BrowserTabsToolInput = Static<typeof browserTabsSchema>;
export type BrowserPageToolInput = Static<typeof browserPageSchema>;

export interface BrowserToolDetails {
	action: string;
	connected: boolean;
}

function formatBrowserCall(name: string, action: string | undefined, theme: Theme): string {
	return `${theme.fg("toolTitle", theme.bold(name))} ${theme.fg("accent", action ?? "<missing action>")}`;
}

function formatBrowserResult(
	result: { content: Array<{ type: string; text?: string }>; details?: BrowserToolDetails },
	_options: ToolRenderResultOptions,
	theme: Theme,
): string {
	const output = result.content.find((part) => part.type === "text")?.text ?? "";
	return output ? `\n${theme.fg("toolOutput", output)}` : theme.fg("muted", "\nNo browser output.");
}

export function createBrowserTabsToolDefinition(): ToolDefinition<typeof browserTabsSchema, BrowserToolDetails> {
	return {
		name: "browser_tabs",
		label: "browser_tabs",
		description:
			"Control Chrome tabs through the Mooncli Chrome extension. Actions: list, active, open, close, focus, reload, navigate.",
		promptSnippet: "Control connected Chrome tabs",
		promptGuidelines: [
			"Use browser_tabs to inspect or change Chrome tabs when the user asks for browser control.",
			"Use browser_page read before interacting with an unfamiliar page unless the user gave an exact target.",
		],
		parameters: browserTabsSchema,
		executionMode: "sequential",
		async execute(_toolCallId, params, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			validateTabsParams(params);
			const result = await sendBrowserCommand("tabs", params as Record<string, unknown>);
			return {
				content: [{ type: "text", text: stringifyResult(result) }],
				details: { action: params.action, connected: true },
			};
		},
		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatBrowserCall("browser_tabs", args?.action, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatBrowserResult(result, options, theme));
			return text;
		},
	};
}

export function createBrowserPageToolDefinition(): ToolDefinition<typeof browserPageSchema, BrowserToolDetails> {
	return {
		name: "browser_page",
		label: "browser_page",
		description:
			"Read or operate the current Chrome page through the Mooncli Chrome extension. Actions: read, read_dom, click, type, hover, press_key, get_elements, screenshot, evaluate, scroll, console_logs, wait.",
		promptSnippet: "Read or operate the connected Chrome page",
		promptGuidelines: [
			"Use browser_page read to get page title, URL, selection, and visible text.",
			"Use browser_page read_dom for a structured view of interactive page elements.",
			"Use browser_page get_elements to see numbered interactive elements; then reference them by #id.",
			"Use browser_page scroll to navigate through long pages.",
			"Use browser_page press_key with key=Enter/Tab/Escape and optional modifiers=[ctrl,shift].",
			"Use browser_page wait to pause between actions (ms, max 15000).",
			"Use browser_page console_logs to debug JavaScript errors or see page logs.",
			"For browser_page evaluate, prefer short JavaScript expressions and return serializable data.",
		],
		parameters: browserPageSchema,
		executionMode: "sequential",
		async execute(_toolCallId, params, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			validatePageParams(params);
			const result = await sendBrowserCommand("page", params as Record<string, unknown>, { timeoutMs: 45_000 });
			return {
				content: [{ type: "text", text: stringifyResult(result) }],
				details: { action: params.action, connected: true },
			};
		},
		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatBrowserCall("browser_page", args?.action, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatBrowserResult(result, options, theme));
			return text;
		},
	};
}

export function createBrowserTabsTool(): EngineTool<typeof browserTabsSchema, BrowserToolDetails> {
	return wrapToolDefinition(createBrowserTabsToolDefinition());
}

export function createBrowserPageTool(): EngineTool<typeof browserPageSchema, BrowserToolDetails> {
	return wrapToolDefinition(createBrowserPageToolDefinition());
}

function validateTabsParams(params: BrowserTabsToolInput): void {
	if ((params.action === "open" || params.action === "navigate") && !params.url) {
		throw new Error(`browser_tabs ${params.action} requires url`);
	}
	if (["close", "focus"].includes(params.action) && params.tabId === undefined) {
		throw new Error(`browser_tabs ${params.action} requires tabId`);
	}
}

function validatePageParams(params: BrowserPageToolInput): void {
	const requiresSelector = ["click", "type", "hover"] as const;
	if (requiresSelector.includes(params.action as (typeof requiresSelector)[number]) && !params.selector) {
		throw new Error(`browser_page ${params.action} requires selector`);
	}
	if (params.action === "type" && params.text === undefined) {
		throw new Error("browser_page type requires text");
	}
	if (params.action === "press_key" && !params.key) {
		throw new Error("browser_page press_key requires key");
	}
	if (params.action === "evaluate" && !params.script) {
		throw new Error("browser_page evaluate requires script");
	}
}

function stringifyResult(value: unknown): string {
	const json = JSON.stringify(value, null, 2) ?? "null";
	const MAX = 24_000;
	return json.length > MAX ? `${json.slice(0, MAX)}\n... [${json.length - MAX} chars truncated] ...` : json;
}
