// @ts-nocheck
import { Container, Markdown, type MarkdownTheme, Text } from "moon-tui";
import { getMarkdownTheme, theme } from "../theme/theme.js";

const OSC133_ZONE_START = "\x1b]133;A\x07";
const OSC133_ZONE_END = "\x1b]133;B\x07";
const OSC133_ZONE_FINAL = "\x1b]133;C\x07";

/**
 * Component that renders a user message in a highly elegant, elevated input bar.
 */
export class UserMessageComponent extends Container {
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(text: string, markdownTheme: MarkdownTheme = getMarkdownTheme()) {
		super();
		this.addChild(new Text("you", 0, 0)); // keep dummy child for compatibility
		this.addChild(
			new Markdown(text, 0, 0, markdownTheme, {
				color: (content: string) => theme.fg("userMessageText", content),
			}),
		);
	}

	override invalidate(): void {
		super.invalidate();
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	override render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}
		
		const child = this.children[1] || this.children[0];
		const childLines = child ? child.render(width - 6) : []; 

		const steelBlueStripe = `\x1b[38;2;95;158;160m┃\x1b[39m`;
		const userMessageBgCode = `\x1b[48;2;28;34;39m`; // #1c2227 background
		const textWhiteCode = `\x1b[38;2;255;255;255m`;
		const resetCode = `\x1b[0m`;

		const lines: string[] = [];
		lines.push(""); // spacer above

		for (const line of childLines) {
			const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, "");
			const paddedLength = Math.max(0, width - 6 - cleanLine.length);
			const lineBg = `${userMessageBgCode}${textWhiteCode} ${cleanLine}${" ".repeat(paddedLength)} ${resetCode}`;
			lines.push(` ${steelBlueStripe} ${lineBg}`);
		}
		
		lines.push(""); // spacer below

		const result = [...lines];
		result[0] = OSC133_ZONE_START + result[0];
		result[result.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + result[result.length - 1];
		this.cachedWidth = width;
		this.cachedLines = result;
		return result;
	}
}
