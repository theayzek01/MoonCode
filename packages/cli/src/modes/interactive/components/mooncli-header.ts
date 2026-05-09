// @ts-nocheck
import { Text, visibleWidth } from "@mooncli/tui";
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

function padAnsi(line: string, width: number): string {
	return `${line}${" ".repeat(Math.max(0, width - visibleWidth(line)))}`;
}

function rule(width: number): string {
	return theme.fg("borderMuted", "─".repeat(Math.max(1, width)));
}

function hint(command: string, description: string): string {
	return `${theme.fg("accent", command)} ${theme.fg("muted", description)}`;
}

export class MooncliHeaderComponent extends Text {
	private expanded: boolean;

	constructor(
		_tui: unknown,
		private options: MooncliHeaderOptions,
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
		const inner = Math.max(46, Math.min(96, width - 2));
		const title = `${theme.bold("Mooncli")} ${theme.fg("dim", `v${this.options.version}`)}`;
		const subtitle = theme.fg("muted", "minimal agentic workspace");
		const quick = [
			hint("/models", "model seç"),
			hint("/index", "projeyi tara"),
			hint("/browser", "Chrome bridge"),
			hint("/diff", "değişiklikleri gör"),
			hint("/ship", "yayınla"),
		].join(theme.fg("dim", "  ·  "));

		const compact = [
			`${title}  ${subtitle}`,
			rule(inner),
			quick,
			theme.fg("muted", `Yardım: /  ·  detay: ${keyText("app.tools.expand" as AppKeybinding)}`),
		];

		if (!this.expanded) return compact.map((line) => padAnsi(line, inner)).join("\n");

		const expanded = [
			...compact,
			"",
			theme.bold("Başlangıç akışı"),
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
