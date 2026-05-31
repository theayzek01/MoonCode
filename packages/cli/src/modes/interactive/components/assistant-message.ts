// @ts-nocheck
import type { AssistantMessage } from "moon-core";
import { Container, Markdown, type MarkdownTheme, Spacer, Text } from "moon-tui";
import { getMarkdownTheme, theme } from "../theme/theme.js";

const OSC133_ZONE_START = "\x1b]133;A\x07";
const OSC133_ZONE_END = "\x1b]133;B\x07";
const OSC133_ZONE_FINAL = "\x1b]133;C\x07";

/**
 * Component that renders a complete assistant message
 */
export class AssistantMessageComponent extends Container {
	private contentContainer: Container;
	private hideThinkingBlock: boolean;
	private markdownTheme: MarkdownTheme;
	private hiddenThinkingLabel: string;
	private lastMessage?: AssistantMessage;
	private hasToolCalls = false;

	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(
		message?: AssistantMessage,
		hideThinkingBlock = false,
		markdownTheme: MarkdownTheme = getMarkdownTheme(),
		hiddenThinkingLabel = "Thinking...",
	) {
		super();

		this.hideThinkingBlock = hideThinkingBlock;
		this.markdownTheme = markdownTheme;
		this.hiddenThinkingLabel = hiddenThinkingLabel;

		// Container for text/thinking content
		this.contentContainer = new Container();
		this.addChild(this.contentContainer);

		if (message) {
			this.updateContent(message);
		}
	}

	override invalidate(): void {
		super.invalidate();
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	setHideThinkingBlock(hide: boolean): void {
		this.hideThinkingBlock = hide;
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	setHiddenThinkingLabel(label: string): void {
		this.hiddenThinkingLabel = label;
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	override render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const lines = super.render(width);
		if (this.hasToolCalls || lines.length === 0) {
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

	updateContent(message: AssistantMessage): void {
		this.lastMessage = message;
		this.cachedWidth = undefined;
		this.cachedLines = undefined;

		const hasVisibleContent = message.content.some(
			(c) => (c.type === "text" && c.text.trim()) || (c.type === "thinking" && c.thinking.trim()),
		);

		// Initialize label if needed
		if (hasVisibleContent && this.contentContainer.children.length === 0) {
			const dimGray = "\x1b[38;2;120;120;120m";
			const reset = "\x1b[39m";
			this.contentContainer.addChild(new Text(`${dimGray}moonagent ────${reset}`, 0, 0));
		}

		// Keep track of which content blocks we've rendered
		let childIndex = hasVisibleContent ? 1 : 0;

		for (let i = 0; i < message.content.length; i++) {
			const content = message.content[i];

			if (content.type === "text" && content.text.trim()) {
				const text = content.text.trim();
				let component = this.contentContainer.children[childIndex] as Markdown | undefined;

				if (!(component instanceof Markdown) || (component as any).isThinking) {
					// Need a new text Markdown component
					component = new Markdown(text, 0, 0, this.markdownTheme);
					this.contentContainer.children[childIndex] = component;
				} else {
					component.setText(text);
				}
				childIndex++;
			} else if (content.type === "thinking" && content.thinking.trim()) {
				const thinking = content.thinking.trim();

				if (this.hideThinkingBlock) {
					let component = this.contentContainer.children[childIndex] as Text | undefined;
					if (!(component instanceof Text)) {
						component = new Text(theme.italic(theme.fg("thinkingText", this.hiddenThinkingLabel)), 0, 0);
						this.contentContainer.children[childIndex] = component;
					}
					childIndex++;
				} else {
					let component = this.contentContainer.children[childIndex] as Markdown | undefined;
					if (!(component instanceof Markdown) || !(component as any).isThinking) {
						component = new Markdown(thinking, 0, 0, this.markdownTheme, {
							color: (text: string) => theme.fg("thinkingText", text),
							italic: true,
						});
						(component as any).isThinking = true;
						this.contentContainer.children[childIndex] = component;
					} else {
						component.setText(thinking);
					}
					childIndex++;
				}
			}
		}

		// Remove any extra children if content shrank
		if (this.contentContainer.children.length > childIndex) {
			this.contentContainer.children.splice(childIndex);
		}

		// Check if aborted - show after partial content
		// But only if there are no tool calls (tool execution components will show the error)
		const hasToolCalls = message.content.some((c) => c.type === "toolCall");
		this.hasToolCalls = hasToolCalls;
		if (!hasToolCalls) {
			if (message.stopReason === "aborted") {
				const abortMessage =
					message.errorMessage && message.errorMessage !== "Request was aborted"
						? message.errorMessage
						: "Operation cancelled";
				this.contentContainer.addChild(new Spacer(1));
				this.contentContainer.addChild(new Text(theme.fg("error", abortMessage), 0, 0));
			} else if (message.stopReason === "error") {
				const errorMsg = message.errorMessage || "Bilinmeyen hata";
				this.contentContainer.addChild(new Spacer(1));
				this.contentContainer.addChild(new Text(theme.fg("error", `Error: ${errorMsg}`), 0, 0));
			}
		}
	}
}
