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

		// Premium ASCII Art with Gradient
		const asciiLogo = [
			" █▀▄▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀ █▀▀█ █▀▀▄ █▀▀",
			" █─▀─█ █──█ █──█ █──█ █── █──█ █──█ █▀▀",
			" ▀───▀ ▀▀▀▀ ▀▀▀▀ ▀──▀ ▀▀▀ ▀▀▀▀ ▀▀▀─ ▀▀▀",
		].join("\n");

		this.addChild(new Text(this.applyGradient(asciiLogo), 1, 0));

		this.addChild(new Spacer(1));
		this.divider = new Text("", 0, 0);
		this.addChild(this.divider);
	}

	private applyGradient(text: string): string {
		const lines = text.split("\n");
		const color1 = { r: 0, g: 242, b: 254 }; // Cyan
		const color2 = { r: 240, g: 147, b: 251 }; // Purple

		const maxLen = Math.max(...lines.map((l) => l.length));

		return lines
			.map((line) => {
				let result = "";
				for (let i = 0; i < line.length; i++) {
					const char = line[i];
					if (char === " ") {
						result += char;
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
