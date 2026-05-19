// @ts-nocheck
import { type Component, truncateToWidth, visibleWidth } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

/**
 * Premium single-row elegant Status Bar.
 * Prioritizes signal over noise and collapses responsively on smaller terminals.
 */
export class FooterComponent implements Component {
	private autoCompactEnabled = true;
	private getExecutingToolNames?: () => string[];
	private cachedEntryCount = -1;
	private cachedCostTotal = 0;
	private cachedHasEdits = false;
	private cachedHasBash = false;
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

	setAutoCompactEnabled(enabled: boolean): void {
		this.autoCompactEnabled = enabled;
	}

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
			this.cachedHasEdits = false;
			this.cachedHasBash = false;
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
				} else if (entry.type === "toolCall") {
					const tool = entry.toolName;
					if (tool === "edit" || tool === "write") this.cachedHasEdits = true;
					if (tool === "bash" || tool === "git_ship") this.cachedHasBash = true;
				}
			}
		}

		const totalCost = this.cachedCostTotal;

		const contextUsage = this.session.getContextUsage();
		const contextPercentValue = contextUsage?.percent ?? 0;
		const contextPercent = contextUsage?.percent !== null ? `${contextPercentValue.toFixed(0)}%` : "?";

		const branch = this.footerData.getGitBranch();
		const activeToolNames = this.getExecutingToolNames ? this.getExecutingToolNames() : [];
		let modelName = state.model?.id || "no-model";
		const provider = state.model?.provider;

		// Calculate dynamic Effort level and Phase
		let hasEdits = this.cachedHasEdits;
		let hasBash = this.cachedHasBash;
		const hasErrors = this.cachedHasErrors;

		if (activeToolNames.includes("edit") || activeToolNames.includes("write")) hasEdits = true;
		if (activeToolNames.includes("bash")) hasBash = true;

		let effort = "S0";
		if (hasErrors) {
			effort = "S4";
		} else if (hasBash) {
			effort = "S3";
		} else if (hasEdits) {
			effort = "S2";
		} else if (entries.length > 2) {
			effort = "S1";
		}

		let phaseLabel = "done";
		let phaseIcon = "✓";
		let phaseColor = "success";

		if (entries.length === 0) {
			phaseLabel = "IDLE";
			phaseIcon = "◽";
			phaseColor = "muted";
		} else if (this.session.isStreaming) {
			phaseLabel = "PLANNING";
			phaseIcon = "⬡";
			phaseColor = "accent";
		} else if (activeToolNames.length > 0) {
			const tool = activeToolNames[0];
			if (
				tool === "read" ||
				tool === "find" ||
				tool === "grep" ||
				tool === "ls" ||
				tool === "view_file" ||
				tool === "list_dir"
			) {
				phaseLabel = "READING";
				phaseIcon = "◈";
				phaseColor = "muted";
			} else if (
				tool === "edit" ||
				tool === "write" ||
				tool === "replace_file_content" ||
				tool === "multi_replace_file_content" ||
				tool === "write_to_file"
			) {
				phaseLabel = "EDITING";
				phaseIcon = "⬥";
				phaseColor = "accent";
			} else if (tool === "bash" || tool === "run_command") {
				if (hasErrors) {
					phaseLabel = "REPAIRING";
					phaseIcon = "⚒";
					phaseColor = "warning";
				} else {
					phaseLabel = "VERIFYING";
					phaseIcon = "⚙";
					phaseColor = "success";
				}
			} else {
				phaseLabel = "RUNNING";
				phaseIcon = "▲";
				phaseColor = "warning";
			}
		} else if (this.session.isCompacting) {
			phaseLabel = "CLASSIFYING";
			phaseIcon = "☷";
			phaseColor = "muted";
		} else if (hasErrors) {
			phaseLabel = "BLOCKED";
			phaseIcon = "✖";
			phaseColor = "error";
		} else {
			phaseLabel = "DONE";
			phaseIcon = "✓";
			phaseColor = "success";
		}

		// Clean up redundant prefix
		if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			modelName = modelName.slice(provider.length + 1);
		} else if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			modelName = modelName.slice(provider.length + 1);
		}

		// Thinking status & colors
		const thinkingLevel = state.thinkingLevel || "off";
		const thinkingColor = thinkingLevel === "high" || thinkingLevel === "xhigh" ? "accent" : "muted";
		const thinkingText = state.model?.reasoning ? `THINK ${thinkingLevel}` : undefined;

		// Memory usage
		const memUsage = process.memoryUsage().rss / 1024 / 1024;
		const memText = `RSS ${memUsage.toFixed(0)}MB`;

		// Format cost nicely (always display it)
		const costColor = totalCost > 0 ? "success" : "dim";
		const costText = `◆ COST $${totalCost.toFixed(2)}`;

		// Build parts with clean hierarchy
		const parts: string[] = [];

		// 1. Web Connection Indicator (WEB ON / WEB OFF)
		const hasBrowser = this.session.getBrowserBridgeStatus().clients > 0;
		const modeText = hasBrowser ? "● WEB" : "○ WEB";
		const modeColor = hasBrowser ? "success" : "error";
		parts.push(theme.bold(theme.fg(modeColor, modeText)));

		// 2. Effort Level
		parts.push(theme.fg("accent", `✦ ${effort}`));

		// 3. Current Phase
		parts.push(theme.fg(phaseColor as ThemeColor, `${phaseIcon} ${phaseLabel}`));

		// 4. Git Branch (if available)
		if (branch) {
			parts.push(theme.fg("muted", `⎇ ${truncateToWidth(branch, 12, "…")}`));
		}

		// 5. Model (Rendered fully, no truncation)
		parts.push(theme.fg("accent", "⚙ ") + theme.fg("text", modelName));

		// 6. Thinking state
		if (thinkingText) {
			parts.push(theme.fg(thinkingColor, `⚛ ${thinkingText.toUpperCase()}`));
		}

		// 7. Context Usage
		const ctxText = this.autoCompactEnabled ? `${contextPercent} auto` : contextPercent;
		parts.push(theme.fg("muted", "☷ CTX ") + theme.fg("text", ctxText));

		// 8. Running tasks count
		if (activeToolNames.length > 0) {
			parts.push(theme.fg("warning", `⚙ RUN ×${activeToolNames.length}`));
		}

		// 9. Cost (Always visible)
		parts.push(theme.fg(costColor, costText));

		// 10. Memory Usage
		parts.push(theme.fg("dim", `⛁ ${memText}`));

		// Join everything with modern premium vertical separator
		const separator = theme.fg("dim", " │ ");
		const separatorWidth = 3; // " │ " visible length is 3

		// Multi-row responsive wrapping algorithm
		const lines: string[][] = [[]];
		let currentLineVisWidth = 0;

		for (const part of parts) {
			const partWidth = visibleWidth(part);
			const currentLineParts = lines[lines.length - 1];

			if (currentLineParts.length === 0) {
				currentLineParts.push(part);
				currentLineVisWidth = partWidth;
			} else {
				// Check if adding this part with separator fits in width (leaving a small 2-char margin)
				if (currentLineVisWidth + separatorWidth + partWidth > width - 2) {
					lines.push([part]);
					currentLineVisWidth = partWidth;
				} else {
					currentLineParts.push(part);
					currentLineVisWidth += separatorWidth + partWidth;
				}
			}
		}

		const renderedLines = lines.map((lineParts) => {
			const lineText = ` ${lineParts.join(separator)}`;
			const lineVisWidth = visibleWidth(lineText);
			if (lineVisWidth < width) {
				return lineText + " ".repeat(width - lineVisWidth);
			}
			if (lineVisWidth > width) {
				return truncateToWidth(lineText, width);
			}
			return lineText;
		});

		return renderedLines;
	}
}
