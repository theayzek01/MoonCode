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

	constructor(
		message?: AssistantMessage,
		hideThinkingBlock = false,
		markdownTheme: MarkdownTheme = getMarkdownTheme(),
		hiddenThinkingLabel = "Düşünülüyor...",
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
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	setHideThinkingBlock(hide: boolean): void {
		this.hideThinkingBlock = hide;
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	setHiddenThinkingLabel(label: string): void {
		this.hiddenThinkingLabel = label;
		if (this.lastMessage) {
			this.updateContent(this.lastMessage);
		}
	}

	override render(width: number): string[] {
		const lines = super.render(width);
		if (this.hasToolCalls || lines.length === 0) {
			return lines;
		}

		lines[0] = OSC133_ZONE_START + lines[0];
		lines[lines.length - 1] = OSC133_ZONE_END + OSC133_ZONE_FINAL + lines[lines.length - 1];
		return lines;
	}

	updateContent(message: AssistantMessage): void {
		this.lastMessage = message;

		const hasVisibleContent = message.content.some(
			(c) => (c.type === "text" && c.text.trim()) || (c.type === "thinking" && c.thinking.trim()),
		);

		// Initialize spacer if needed
		if (hasVisibleContent && this.contentContainer.children.length === 0) {
			this.contentContainer.addChild(new Spacer(1));
		}

		// Keep track of which content blocks we've rendered
		let childIndex = hasVisibleContent ? 1 : 0;

		for (let i = 0; i < message.content.length; i++) {
			const content = message.content[i];
			const hasVisibleContentAfter = message.content
				.slice(i + 1)
				.some((c) => (c.type === "text" && c.text.trim()) || (c.type === "thinking" && c.thinking.trim()));

			if (content.type === "text" && content.text.trim()) {
				const text = content.text.trim();
				let component = this.contentContainer.children[childIndex] as Markdown | undefined;

				if (!(component instanceof Markdown) || (component as any).isThinking) {
					// Need a new text Markdown component
					component = new Markdown(text, 1, 0, this.markdownTheme);
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
						component = new Text(theme.italic(theme.fg("thinkingText", this.hiddenThinkingLabel)), 1, 0);
						this.contentContainer.children[childIndex] = component;
					}
					childIndex++;
				} else {
					let component = this.contentContainer.children[childIndex] as Markdown | undefined;
					if (!(component instanceof Markdown) || !(component as any).isThinking) {
						component = new Markdown(thinking, 1, 0, this.markdownTheme, {
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

				if (hasVisibleContentAfter) {
					if (!(this.contentContainer.children[childIndex] instanceof Spacer)) {
						this.contentContainer.children.splice(childIndex, 0, new Spacer(1));
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
						: "İşlem iptal edildi";
				if (hasVisibleContent) {
					this.contentContainer.addChild(new Spacer(1));
				} else {
					this.contentContainer.addChild(new Spacer(1));
				}
				this.contentContainer.addChild(new Text(theme.fg("error", abortMessage), 1, 0));
			} else if (message.stopReason === "error") {
				const errorMsg = message.errorMessage || "Bilinmeyen hata";
				this.contentContainer.addChild(new Spacer(1));
				this.contentContainer.addChild(new Text(theme.fg("error", `Hata: ${errorMsg}`), 1, 0));
			}
		}
	}
}
