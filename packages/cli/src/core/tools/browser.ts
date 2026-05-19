import { existsSync } from "node:fs";
import { resolve } from "node:path";
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
		Type.Literal("drag"),
		Type.Literal("mouse"),
		Type.Literal("canvas_info"),
		Type.Literal("canvas_draw"),
		Type.Literal("upload_file"),
		Type.Literal("press_key"),
		Type.Literal("get_elements"),
		Type.Literal("evaluate"),
		Type.Literal("scroll"),
		Type.Literal("console_logs"),
		Type.Literal("screenshot"),
		Type.Literal("wait"),
		Type.Literal("clear_ui"),
	]),
	tabId: Type.Optional(Type.Number({ description: "Chrome tab id. Defaults to active tab." })),
	selector: Type.Optional(
		Type.String({ description: "CSS selector for click/type/hover/upload_file/drag source actions" }),
	),
	targetSelector: Type.Optional(Type.String({ description: "CSS selector for drag target" })),
	x: Type.Optional(Type.Number({ description: "Viewport X coordinate for mouse actions" })),
	y: Type.Optional(Type.Number({ description: "Viewport Y coordinate for mouse actions" })),
	toX: Type.Optional(Type.Number({ description: "Target viewport X coordinate for mouse drag/move" })),
	toY: Type.Optional(Type.Number({ description: "Target viewport Y coordinate for mouse drag/move" })),
	button: Type.Optional(Type.String({ description: "Mouse button: left, right, middle, or none" })),
	clickCount: Type.Optional(Type.Number({ description: "Mouse click count" })),
	steps: Type.Optional(Type.Number({ description: "Mouse movement interpolation steps" })),
	points: Type.Optional(
		Type.Array(Type.Array(Type.Number()), {
			description: "Canvas draw points as [x,y] pairs, relative to canvas unless absolute=true",
		}),
	),
	color: Type.Optional(
		Type.String({ description: "Canvas draw color when page supports injected 2D drawing fallback" }),
	),
	width: Type.Optional(Type.Number({ description: "Canvas draw stroke width" })),
	absolute: Type.Optional(Type.Boolean({ description: "Treat canvas_draw points as viewport coordinates" })),
	text: Type.Optional(Type.String({ description: "Text to type" })),
	filePath: Type.Optional(Type.String({ description: "Local file path for upload_file" })),
	filePaths: Type.Optional(Type.Array(Type.String(), { description: "Local file paths for upload_file" })),
	visual: Type.Optional(Type.Boolean({ description: "Show temporary visual overlay/cursor for actions" })),
	showLabels: Type.Optional(
		Type.Boolean({ description: "Show visual labels for get_elements (default false; IDs still work)" }),
	),
	maxElements: Type.Optional(Type.Number({ description: "Maximum elements returned by get_elements" })),
	append: Type.Optional(Type.Boolean({ description: "Append to existing value instead of replacing (type action)" })),
	key: Type.Optional(Type.String({ description: "Key name for press_key action (e.g. Enter, Tab, Escape)" })),
	modifiers: Type.Optional(Type.Array(Type.String(), { description: "Modifier keys: ctrl, shift, alt, meta" })),
	script: Type.Optional(Type.String({ description: "JavaScript expression for evaluate action" })),
	maxChars: Type.Optional(Type.Number({ description: "Maximum characters for read action" })),
	direction: Type.Optional(
		Type.Union(
			[
				Type.Literal("up"),
				Type.Literal("down"),
				Type.Literal("left"),
				Type.Literal("right"),
				Type.Literal("top"),
				Type.Literal("bottom"),
			],
			{
				description: "Direction for scroll action",
			},
		),
	),
	amount: Type.Optional(Type.Number({ description: "Pixels to scroll" })),
	ms: Type.Optional(Type.Number({ description: "Milliseconds to wait (max 15000)" })),
	format: Type.Optional(Type.Union([Type.Literal("png"), Type.Literal("jpeg")], { description: "Screenshot format" })),
	quality: Type.Optional(Type.Number({ description: "JPEG screenshot quality, 1-100" })),
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
			"Control Chrome tabs through the MoonCode Chrome extension. Actions: list, active, open, close, focus, reload, navigate.",
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
			"Read or operate the current Chrome page through the MoonCode Chrome extension. Actions: read, read_dom, click, type, hover, drag, mouse, canvas_info, canvas_draw, upload_file, press_key, get_elements, evaluate, scroll, console_logs, screenshot, wait, clear_ui.",
		promptSnippet: "Read or operate the connected Chrome page",
		promptGuidelines: [
			"Use browser_page read to get page title, URL, selection, and visible text.",
			"Use browser_page read_dom for a structured view of interactive page elements.",
			"Use browser_page get_elements to get numbered interactive elements; labels are hidden by default to keep pages clean, but #id still works.",
			"Use browser_page upload_file with a local absolute filePath when a site needs a file picker/input.",
			"Use browser_page drag with selector and targetSelector for DOM drag/drop interactions.",
			"Use browser_page mouse with viewport coordinates for canvas/block editors/games/drawing when DOM selectors are not enough.",
			"Use browser_page canvas_info then canvas_draw for canvas design work; keep points small and deliberate to avoid loops/token waste.",
			"Prefer small maxChars/maxElements values to reduce token usage; only request more when needed.",
			"Use browser_page scroll to navigate through long pages; it targets the nearest scrollable area around the viewport center when possible.",
			"Use browser_page press_key with key=Enter/Tab/Escape and optional modifiers=[ctrl,shift].",
			"Use browser_page wait to pause between actions (ms, max 15000).",
			"Use browser_page console_logs to debug JavaScript errors or see page logs.",
			"Use browser_page screenshot when visual state matters; it returns an image block to the model, not just text.",
			"For browser_page evaluate, prefer short JavaScript expressions and return serializable data.",
		],
		parameters: browserPageSchema,
		executionMode: "sequential",
		async execute(_toolCallId, params, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");
			validatePageParams(params);
			const commandParams = normalizeBrowserPageParams(params);
			const result = await sendBrowserCommand("page", commandParams, { timeoutMs: 30_000 });
			return {
				content: formatBrowserCommandResult(result),
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
	const requiresSelector = ["click", "type", "hover", "upload_file"] as const;
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
	if (params.action === "drag" && (!params.selector || !params.targetSelector)) {
		throw new Error("browser_page drag requires selector and targetSelector");
	}
	if (params.action === "mouse" && (params.x === undefined || params.y === undefined)) {
		throw new Error("browser_page mouse requires x and y");
	}
	if (params.action === "canvas_draw" && (!params.points || params.points.length < 2)) {
		throw new Error("browser_page canvas_draw requires at least two points");
	}
	if (params.action === "upload_file" && !params.filePath && (!params.filePaths || params.filePaths.length === 0)) {
		throw new Error("browser_page upload_file requires filePath or filePaths");
	}
}

function normalizeBrowserPageParams(params: BrowserPageToolInput): Record<string, unknown> {
	if (params.action !== "upload_file") {
		return params as Record<string, unknown>;
	}
	const rawPaths = params.filePaths?.length ? params.filePaths : params.filePath ? [params.filePath] : [];
	const filePaths = rawPaths.map((filePath) => resolve(filePath));
	const missing = filePaths.filter((filePath) => !existsSync(filePath));
	if (missing.length > 0) {
		throw new Error(`browser_page upload_file file not found: ${missing.join(", ")}`);
	}
	return { ...(params as Record<string, unknown>), filePaths, filePath: filePaths[0] };
}

function formatBrowserCommandResult(
	value: unknown,
): Array<{ type: "text"; text: string } | { type: "image"; data: string; mimeType: string }> {
	const record = value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
	const screenshot = record?.screenshot as Record<string, unknown> | undefined;
	if (screenshot && typeof screenshot.data === "string" && typeof screenshot.mimeType === "string") {
		const textPayload = {
			...record,
			screenshot: {
				...screenshot,
				data: `[image data omitted: ${screenshot.data.length} chars]`,
			},
		};
		return [
			{ type: "text", text: stringifyResult(textPayload) },
			{ type: "image", data: screenshot.data, mimeType: screenshot.mimeType },
		];
	}
	return [{ type: "text", text: stringifyResult(value) }];
}

function stringifyResult(value: unknown): string {
	const json =
		JSON.stringify(
			value,
			(_key, nestedValue) => {
				if (typeof nestedValue === "string") {
					if (nestedValue.startsWith("data:image/")) {
						return `[image data omitted: ${nestedValue.length} chars]`;
					}
					if (nestedValue.length > 4000) {
						return `${nestedValue.slice(0, 4000)}\n... [${nestedValue.length - 4000} chars truncated] ...`;
					}
				}
				return nestedValue;
			},
			2,
		) ?? "null";
	const MAX = 8_000;
	return json.length > MAX ? `${json.slice(0, MAX)}\n... [${json.length - MAX} chars truncated] ...` : json;
}
