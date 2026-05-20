// @ts-nocheck
import { Container, Markdown, type MarkdownTheme, Text } from "moon-tui";
import { getMarkdownTheme, theme } from "../theme/theme.js";

const OSC133_ZONE_START = "\x1b]133;A\x07";
const OSC133_ZONE_END = "\x1b]133;B\x07";
const OSC133_ZONE_FINAL = "\x1b]133;C\x07";

/**
 * Component that renders a user message in a highly elegant, minimal way.
 */
export class UserMessageComponent extends Container {
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(text: string, markdownTheme: MarkdownTheme = getMarkdownTheme()) {
		super();
		this.addChild(new Text(theme.bold(theme.fg("success", "◆ You")), 1, 0));
		this.addChild(
			new Markdown(text, 1, 0, markdownTheme, {
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
		const lines = super.render(width);
		if (lines.length === 0) {
			this.cachedWidth = width;
			this.cachedLines = lines;
			return lines;
		}

		const result = [...lines];
		result[0] = OSC133_ZONE_START + result[0];
		result[result.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + result[result.length - 1];
		this.cachedWidth = width;
		this.cachedLines = result;
		return result;
	}
}
