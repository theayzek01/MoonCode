// @ts-nocheck
import { Text, visibleWidth } from "moon-tui";
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

function rule(width: number): string {
	return theme.fg("borderMuted", "─".repeat(Math.max(1, width)));
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
		super("", options.paddingX ?? 1, options.paddingY ?? 0);
		this.expanded = options.expanded ?? false;
		this.refresh();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.refresh();
	}

	dispose(): void {}

	private build(width = 88): string {
		const inner = Math.max(46, Math.min(104, width - 2));
		const frames = ["◐", "◓", "◑", "◒"];
		const frame = frames[Math.floor(Date.now() / 900) % frames.length];
		const title = `${theme.fg("accent", frame)} ${theme.bold(APP_TITLE)} ${theme.fg("dim", `v${this.options.version}`)}`;
		const subtitle = theme.fg("muted", "serious terminal coding workspace");
		const quick = [
			hint("/index", "haritala"),
			hint("/browser", "tarayıcı"),
			hint("/compact", "bağlamı küçült"),
			hint("/diff", "kontrol"),
			hint("/ship", "yayınla"),
		].join(theme.fg("dim", "  ·  "));
		const statusLine = `${theme.fg("dim", "logic")}${theme.fg("borderMuted", " ─ ")}${theme.fg("muted", "inspect → act → verify")}${theme.fg("borderMuted", " ─ ")}${theme.fg("dim", "minimal")}`;

		const compact = [
			`${title}  ${subtitle}`,
			rule(inner),
			statusLine,
			quick,
			theme.fg("muted", `Yardım: /  ·  detay: ${keyText("app.tools.expand" as AppKeybinding)}`),
		];

		if (!this.expanded) return compact.map((line) => padAnsi(line, inner)).join("\n");

		const expanded = [
			...compact,
			"",
			theme.bold("Ciddi çalışma akışı"),
			`${theme.fg("dim", "1.")} ${hint("/index", "kod tabanını hazırla")}`,
			`${theme.fg("dim", "2.")} Normal yaz: ${theme.fg("muted", "ne yapmak istediğini anlat")}`,
			`${theme.fg("dim", "3.")} ${hint("/browser", "Chrome eklenti bağlantısını kontrol et")}`,
			`${theme.fg("dim", "4.")} ${hint("/diff", "son değişiklikleri kontrol et")}`,
			`${theme.fg("dim", "5.")} ${hint("/ship", "branch/commit/push/PR akışı")}`,
			"",
			theme.bold("Kısayollar"),
			this.options.expandedInstructions,
		];
		return expanded.map((line) => padAnsi(line, inner)).join("\n");
	}

	render(width: number): string[] {
		this.setText(this.build(width));
		return super.render(width);
	}

	private refresh(): void {
		this.setText(this.build());
	}
}
