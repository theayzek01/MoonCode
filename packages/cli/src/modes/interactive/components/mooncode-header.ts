import { Container, Spacer, Text } from "moon-tui";
import { theme } from "../theme/theme.js";

export interface MoonCodeHeaderOptions {
	version: string;
	compactInstructions: string;
	expandedInstructions: string;
	expanded?: boolean;
	paddingX?: number;
	paddingY?: number;
}

export class MoonCodeHeaderComponent extends Container {
	private divider: Text;

	constructor() {
		super();

		// Modern block ASCII Logo
		const asciiLogo = [
			" ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗ ██████╗  ██████╗ ██████╗ ███████╗",
			" ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗██╔══██╗██╔════╝",
			" ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║██║      ██║   ██║██║  ██║█████╗  ",
			" ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║██║      ██║   ██║██║  ██║██╔══╝  ",
			" ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗",
			" ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
		].join("\n");

		this.addChild(new Text(this.applyGradient(asciiLogo), 1, 0));

		const versionText = theme.fg("dim", " ✦ ") + theme.fg("accent", "VERSION 2026-3") + theme.fg("dim", " ✦ ");
		this.addChild(new Text(versionText, 1, 0));

		this.addChild(new Spacer(1));
		this.divider = new Text("", 0, 0);
		this.addChild(this.divider);
	}

	private applyGradient(text: string): string {
		const lines = text.split("\n");
		// Premium Cyberpunk Palette (Cyan to Magenta)
		const color1 = { r: 5, g: 213, b: 255 }; // Electric Cyan
		const color2 = { r: 255, g: 0, b: 153 }; // Deep Magenta

		const maxLen = Math.max(...lines.map((l) => l.length));

		return lines
			.map((line) => {
				let result = "";
				for (let i = 0; i < line.length; i++) {
					const char = line[i];
					if (
						char === " " ||
						char === "╚" ||
						char === "═" ||
						char === "╝" ||
						char === "╔" ||
						char === "╗" ||
						char === "║"
					) {
						// Keep boxes and symbols slightly dimmed or use specific gradient
						const t = i / Math.max(1, maxLen - 1);
						const r = Math.round(color1.r + (color2.r - color1.r) * t);
						const g = Math.round(color1.g + (color2.g - color1.g) * t);
						const b = Math.round(color1.b + (color2.b - color1.b) * t);
						result += `\x1b[38;2;${r};${g};${b}m${char}\x1b[39m`;
						continue;
					}

					const t = i / Math.max(1, maxLen - 1);
					const r = Math.round(color1.r + (color2.r - color1.r) * t);
					const g = Math.round(color1.g + (color2.g - color1.g) * t);
					const b = Math.round(color1.b + (color2.b - color1.b) * t);

					result += `\x1b[38;2;${r};${g};${b}m${char}\x1b[39m`;
				}
				return result;
			})
			.join("\n");
	}

	override render(width: number): string[] {
		this.divider.setText(theme.fg("dim", "─".repeat(width)));
		return super.render(width);
	}

	setExpanded(): void {}
}
