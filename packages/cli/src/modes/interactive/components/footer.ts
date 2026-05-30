// @ts-nocheck
import { type Component, truncateToWidth, visibleWidth } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

function shortenPath(filePath: string): string {
	if (!filePath) return ".";
	const parts = filePath.split(/[/\\]/);
	if (parts.length <= 3) return filePath;
	return `.../${parts.slice(-3).join("/")}`;
}

/** Double-row professional TUI footer with Status Bar & Browser Bar */
export class FooterComponent implements Component {
	private getExecutingToolNames?: () => string[];
	private cachedEntryCount = -1;
	private cachedCostTotal = 0;
	private cachedHasErrors = false;

	constructor(
		private session: EngineSession,
		private footerData: ReadonlyFooterDataProvider,
		getExecutingToolNames?: () => string[],
	) {
		this.getExecutingToolNames = getExecutingToolNames;
	}

	setSession(session: EngineSession): void {
		this.session = session;
		this.invalidate();
	}

	setAutoCompactEnabled(_enabled: boolean): void {}

	invalidate(): void {
		this.cachedEntryCount = -1;
	}

	dispose(): void {}

	render(width: number): string[] {
		const state = this.session.state;
		const entries = this.session.sessionManager?.getEntries() || [];

		if (entries.length !== this.cachedEntryCount) {
			this.cachedEntryCount = entries.length;
			this.cachedCostTotal = 0;
			this.cachedHasErrors = false;

			for (const entry of entries) {
				if (entry.type === "message" && entry.message.role === "assistant") {
					const costValue = entry.message.usage?.cost?.total;
					if (typeof costValue === "number" && Number.isFinite(costValue)) {
						this.cachedCostTotal += costValue;
					}
					if (entry.message.stopReason === "error") {
						this.cachedHasErrors = true;
					}
				}
			}
		}

		// Current model name
		const provider = state.model?.provider;
		let modelName = state.model?.id || "no-model";
		if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			modelName = modelName.slice(provider.length + 1);
		} else if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			modelName = modelName.slice(provider.length + 1);
		}

		// Color Definitions:
		const steelBlueText = (str: string) => `\x1b[38;2;95;158;160m${str}\x1b[39m`;
		const skyBlueText = (str: string) => `\x1b[38;2;135;206;235m${str}\x1b[39m`;
		const sageGreenText = (str: string) => `\x1b[38;2;140;180;145m${str}\x1b[39m`;
		const mutedGrayText = (str: string) => `\x1b[38;2;160;160;160m${str}\x1b[39m`;
		const dimGrayText = (str: string) => `\x1b[38;2;110;110;110m${str}\x1b[39m`;
		const darkGrayText = (str: string) => `\x1b[38;2;80;80;80m${str}\x1b[39m`;

		// Background styles for Status Bar (slightly lighter than Pure Black body, e.g. #181d22)
		const statusBarBg = (str: string) => `\x1b[48;2;24;29;34m${str}\x1b[49m`;
		// Background styles for Browser Bar (Darkest bar at the bottom, e.g. #080a0c)
		const browserBarBg = (str: string) => `\x1b[48;2;8;10;12m${str}\x1b[49m`;

		// 1. STATUS BAR (Row 1)
		const rawCwd = this.session.sessionManager?.getCwd() || ".";
		const currentPath = ` ${shortenPath(rawCwd)}`;

		const thinkingBadgeText = `think:${state.thinkingLevel || "low"}`;
		const thinkingBadge = `\x1b[48;2;25;35;45m\x1b[38;2;95;158;160m[ ${thinkingBadgeText} ]\x1b[49m`;

		const contextUsage = this.session.getContextUsage();
		const contextPercent = contextUsage?.percent !== null ? `${(contextUsage?.percent ?? 0).toFixed(0)}%` : "0%";
		const tokenUsage = `ctx:${contextPercent}`;

		const rightParts = [
			modelName,
			thinkingBadge,
			tokenUsage
		];
		const rightJoined = rightParts.join("  ");
		const rightJoinedVisWidth = modelName.length + thinkingBadgeText.length + 4 + tokenUsage.length + 4; 

		const leftVisWidth = currentPath.length;
		const row1Padding = Math.max(0, width - leftVisWidth - rightJoinedVisWidth);
		const statusBarLine = statusBarBg(mutedGrayText(currentPath) + " ".repeat(row1Padding) + dimGrayText(rightJoined) + " ");

		// 2. BROWSER BAR (Row 2 - Darkest bar)
		const globeIcon = " 🌐";
		const browserTag = skyBlueText(" browser");
		const hasBrowser = (this.session.getBrowserBridgeStatus?.().clients ?? 0) > 0;
		const browserStatus = hasBrowser ? sageGreenText("connected") : dimGrayText("disconnected");

		const activeToolNames = this.getExecutingToolNames ? this.getExecutingToolNames() : [];
		const toolCount = `tools:${activeToolNames.length || this.session.getActiveToolNames().length}`;
		const costText = `cost:$${this.cachedCostTotal.toFixed(3)}`;

		const browserParts = [
			browserStatus,
			costText,
			toolCount
		];
		const browserRight = browserParts.join(darkGrayText(" • "));
		const browserRightVisWidth = (hasBrowser ? 9 : 12) + costText.length + toolCount.length + 6;

		const browserLeft = `${globeIcon} ${browserTag}`;
		const browserLeftVisWidth = 2 + 1 + 8;
		const row2Padding = Math.max(0, width - browserLeftVisWidth - browserRightVisWidth);
		const browserBarLine = browserBarBg(browserLeft + " ".repeat(row2Padding) + browserRight + " ");

		return [statusBarLine, browserBarLine];
	}

	private getPhase(activeToolNames: string[]): { label: string; color: string } {
		if (this.session.isCompacting) return { label: "compact", color: "muted" };
		if (this.cachedHasErrors) return { label: "blocked", color: "error" };
		if (this.session.isStreaming) return { label: "thinking", color: "accent" };
		if (activeToolNames.length === 0) return { label: "idle", color: "muted" };

		const tool = activeToolNames[0];
		if (["read", "find", "grep", "ls", "view_file", "list_dir"].includes(tool)) {
			return { label: "read", color: "muted" };
		}
		if (["edit", "write", "replace_file_content", "multi_replace_file_content", "write_to_file"].includes(tool)) {
			return { label: "edit", color: "accent" };
		}
		if (["bash", "run_command"].includes(tool)) {
			return { label: "verify", color: "success" };
		}
		return { label: "run", color: "warning" };
	}
}
