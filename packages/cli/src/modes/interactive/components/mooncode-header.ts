// @ts-nocheck
import { Text, truncateToWidth, visibleWidth } from "moon-tui";
import { APP_TITLE } from "../../../config.js";
import type { AppKeybinding } from "../../../core/keybindings.js";
import { theme } from "../theme/theme.js";
import { keyText } from "./keybinding-hints.js";

export interface MoonCodeHeaderOptions {
	version: string;
	compactInstructions: string;
	expandedInstructions: string;
	expanded?: boolean;
	paddingX?: number;
	paddingY?: number;
}

function padAnsi(line: string, width: number): string {
	return `${line}${" ".repeat(Math.max(0, width - visibleWidth(line)))}`;
}

function lineFit(line: string, width: number): string {
	return padAnsi(truncateToWidth(line, width, theme.fg("dim", "…")), width);
}

function pill(text: string, color: "accent" | "muted" | "dim" = "muted"): string {
	return `${theme.fg("borderMuted", "[")}${theme.fg(color, text)}${theme.fg("borderMuted", "]")}`;
}

function hint(command: string, description: string): string {
	return `${theme.fg("accent", command)} ${theme.fg("muted", description)}`;
}

export class MoonCodeHeaderComponent extends Text {
	private expanded: boolean;

	constructor(
		_tui: unknown,
		private options: MoonCodeHeaderOptions,
	) {
		super("", options.paddingX ?? 0, options.paddingY ?? 0);
		this.expanded = options.expanded ?? false;
		this.refresh();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.refresh();
	}

	dispose(): void {}

	private build(width = 88): string {
		const inner = Math.max(44, Math.min(110, width - 2));
		const frames = ["◜", "◠", "◝", "◞", "◡", "◟"];
		const frame = frames[Math.floor(Date.now() / 140) % frames.length];
		const top = `${theme.fg("borderMuted", "╭")}${theme.fg("borderMuted", "─".repeat(inner))}${theme.fg("borderMuted", "╮")}`;
		const bottom = `${theme.fg("borderMuted", "╰")}${theme.fg("borderMuted", "─".repeat(inner))}${theme.fg("borderMuted", "╯")}`;
		const brand = `${theme.fg("accent", frame)} ${theme.bold(APP_TITLE)} ${theme.fg("dim", `v${this.options.version}`)}`;
		const mode = `${pill("logic", "dim")} ${pill("act", "accent")} ${pill("verify", "dim")}`;
		const commands = [
			hint("/", "komut"),
			hint("/index", "harita"),
			hint("/browser", "web"),
			hint("/diff", "kontrol"),
			hint("/ship", "yayın"),
		].join(theme.fg("dim", "   "));

		const lines = [
			top,
			`${theme.fg("borderMuted", "│")}${lineFit(`${brand}  ${theme.fg("dim", "serious terminal workspace")}  ${mode}`, inner)}${theme.fg("borderMuted", "│")}`,
			`${theme.fg("borderMuted", "│")}${lineFit(commands, inner)}${theme.fg("borderMuted", "│")}`,
		];

		if (this.expanded) {
			const more = [
				"",
				`${theme.bold("Akış")}  iste → küçük değiştir → test et → ship`,
				this.options.expandedInstructions,
				theme.fg("muted", `Kapat/aç: ${keyText("app.tools.expand" as AppKeybinding)}`),
			];
			for (const line of more)
				lines.push(`${theme.fg("borderMuted", "│")}${lineFit(line, inner)}${theme.fg("borderMuted", "│")}`);
		}

		lines.push(bottom);
		return lines.join("\n");
	}

	render(width: number): string[] {
		this.setText(this.build(width));
		return super.render(width);
	}

	private refresh(): void {
		this.setText(this.build());
	}
}
