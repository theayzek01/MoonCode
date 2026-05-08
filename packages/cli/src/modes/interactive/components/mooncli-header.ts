// @ts-nocheck
import { Text, type TUI, visibleWidth } from "@mooncli/tui";
import type { AppKeybinding } from "../../../core/keybindings.js";
import { theme } from "../theme/theme.js";
import { keyText } from "./keybinding-hints.js";

export interface MooncliHeaderOptions {
	version: string;
	compactInstructions: string;
	expandedInstructions: string;
	expanded?: boolean;
	paddingX?: number;
	paddingY?: number;
}

const ORBS = ["◐", "◓", "◑", "◒"];
const SCAN = ["▰▱▱▱▱▱▱", "▰▰▱▱▱▱▱", "▰▰▰▱▱▱▱", "▰▰▰▰▱▱▱", "▰▰▰▰▰▱▱", "▰▰▰▰▰▰▱", "▰▰▰▰▰▰▰"];
const SPARKS = ["✦", "✧", "◆", "◇", "✶", "✹"];
const FLOW = ["BRIEF", "PLAN", "AGENTS", "QUALITY", "SHIP"];
const CHIPS = ["RAG", "DIFF", "SHIP", "WEB", "CI", "OLLAMA", "MARKET"];

function padAnsi(line: string, width: number): string {
	return `${line}${" ".repeat(Math.max(0, width - visibleWidth(line)))}`;
}

function centerAnsi(line: string, width: number): string {
	const left = Math.max(0, Math.floor((width - visibleWidth(line)) / 2));
	return `${" ".repeat(left)}${line}`;
}

function chip(label: string, active: boolean): string {
	const color = active ? "success" : "muted";
	return theme.fg(color, active ? `▓ ${label}` : `░ ${label}`);
}

function commandHint(command: string, description: string): string {
	return `${theme.fg("accent", command)} ${theme.fg("muted", description)}`;
}

export class MooncliHeaderComponent extends Text {
	private frame = 0;
	private expanded: boolean;
	private timer?: NodeJS.Timeout;

	constructor(
		private tui: TUI,
		private options: MooncliHeaderOptions,
	) {
		super("", options.paddingX ?? 1, options.paddingY ?? 0);
		this.expanded = options.expanded ?? false;
		this.refresh();
		this.timer = setInterval(() => {
			this.frame = (this.frame + 1) % 10_000;
			this.refresh();
			this.tui.requestRender();
		}, 220);
		this.timer.unref?.();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.refresh();
	}

	dispose(): void {
		if (this.timer) clearInterval(this.timer);
		this.timer = undefined;
	}

	private build(width = 88): string {
		const inner = Math.max(54, Math.min(96, width - 4));
		const orb = ORBS[this.frame % ORBS.length];
		const spark = SPARKS[this.frame % SPARKS.length];
		const scan = SCAN[this.frame % SCAN.length];
		const activeFlow = this.frame % FLOW.length;
		const activeChip = this.frame % CHIPS.length;

		const title = `${theme.fg("accent", "▓▒░")} ${theme.bold("MOONCLI COMPANY WORKSPACE")} ${theme.fg("accent", "░▒▓")}`;
		const subtitle = `${theme.fg("muted", "agentic terminal · pixel ui · live coding floor")} ${theme.fg("dim", `v${this.options.version}`)}`;
		const top = theme.fg("borderAccent", `╔${"═".repeat(inner)}╗`);
		const bottom = theme.fg("borderAccent", `╚${"═".repeat(inner)}╝`);
		const sep = theme.fg("border", `╠${"═".repeat(inner)}╣`);
		const line = (body: string) =>
			`${theme.fg("borderAccent", "║")} ${padAnsi(body, inner - 2)} ${theme.fg("borderAccent", "║")}`;

		const moon = [
			`${theme.fg("dim", "      ░░░░      ")} ${theme.fg("accent", orb)} ${theme.fg("success", scan)}`,
			`${theme.fg("muted", "   ▒▒▓████▓▒▒   ")} ${theme.fg("warning", spark)} ${theme.fg("muted", "systems warming up")}`,
			`${theme.fg("accent", "  ▓██████████▓  ")} ${theme.fg("dim", "MCP · tools · sessions · workspace")}`,
			`${theme.fg("muted", "   ▒▒▓████▓▒▒   ")} ${theme.fg("success", "online")}`,
		];

		const flow = FLOW.map((part, index) => {
			const painted = index === activeFlow ? theme.fg("success", `▶ ${part}`) : theme.fg("muted", part);
			return painted;
		}).join(theme.fg("dim", "  ─  "));

		const chips = CHIPS.map((label, index) => chip(label, index === activeChip)).join(theme.fg("dim", "  "));
		const compact = [
			this.options.compactInstructions,
			`${theme.fg("muted", "quick:")} ${commandHint("/workspace", "company floor")} ${theme.fg("dim", "•")} ${commandHint("/diff", "preview")} ${theme.fg("dim", "•")} ${commandHint("/web", "dashboard")} ${theme.fg("dim", "•")} ${commandHint("/ship", "push")}`,
		].join("\n");

		const expanded = [
			this.options.expandedInstructions,
			"",
			`${theme.bold("Yeni paneller")}: ${commandHint("/index", "codebase RAG")}  ${commandHint("/ollama models", "local models")}  ${commandHint("/marketplace", "extensions")}`,
			`${theme.bold("Akış")}: brief → plan → agents → quality gate → integrator → ship`,
			`${theme.fg("muted", "ipucu:")} ${keyText("app.tools.expand" as AppKeybinding)} header detaylarını aç/kapatır`,
		].join("\n");

		const body = [
			top,
			line(centerAnsi(title, inner - 2)),
			line(centerAnsi(subtitle, inner - 2)),
			sep,
			...moon.map(line),
			line(""),
			line(flow),
			line(chips),
			sep,
			...(this.expanded ? expanded : compact).split("\n").map(line),
			bottom,
		];
		return body.join("\n");
	}

	render(width: number): string[] {
		this.setText(this.build(width));
		return super.render(width);
	}

	private refresh(): void {
		this.setText(this.build());
	}
}
