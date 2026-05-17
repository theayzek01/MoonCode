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

		let phase = "done";
		if (entries.length === 0) {
			phase = "idle";
		} else if (this.session.isStreaming) {
			phase = "planning";
		} else if (activeToolNames.length > 0) {
			const tool = activeToolNames[0];
			if (tool === "read" || tool === "find" || tool === "grep" || tool === "ls") {
				phase = "reading";
			} else if (tool === "edit" || tool === "write") {
				phase = "editing";
			} else if (tool === "bash") {
				phase = hasErrors ? "repairing" : "verifying";
			} else {
				phase = "running";
			}
		} else if (this.session.isCompacting) {
			phase = "classifying";
		} else if (hasErrors) {
			phase = "blocked";
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

		// Format cost nicely
		let costText: string | undefined;
		if (this.session.modelRegistry?.isUsingOAuth?.(state.model)) {
			// Subscribtion/OAuth mode: Omit COST rendering bug "COST sub" completely
			costText = undefined;
		} else if (totalCost > 0) {
			costText = `COST $${totalCost.toFixed(3)}`;
		}

		// Build parts with clean hierarchy
		const parts: string[] = [];

		// 1. APEX Mode Indicator
		parts.push(theme.bold(theme.fg("success", "APEX")));

		// 2. Effort Level
		parts.push(theme.fg("accent", effort));

		// 3. Current Phase
		parts.push(theme.fg("muted", phase));

		// 4. Git Branch (if available)
		if (branch && width > 80) {
			parts.push(theme.fg("muted", truncateToWidth(branch, 12, "…")));
		}

		// 5. Model
		if (width > 60) {
			parts.push(theme.fg("text", truncateToWidth(modelName, 16, "…")));
		} else {
			parts.push(theme.fg("text", truncateToWidth(modelName, 10, "…")));
		}

		// 6. Thinking state
		if (thinkingText && width > 90) {
			parts.push(theme.fg(thinkingColor, thinkingText));
		}

		// 7. Context Usage
		const ctxText = this.autoCompactEnabled ? `${contextPercent} auto` : contextPercent;
		parts.push(theme.fg("muted", "CTX ") + theme.fg("text", ctxText));

		// 8. Running tasks count
		if (activeToolNames.length > 0) {
			parts.push(theme.fg("warning", `RUN ×${activeToolNames.length}`));
		}

		// 9. Cost
		if (costText && width > 95) {
			parts.push(theme.fg("dim", costText));
		}

		// 10. Memory Usage
		if (width > 110) {
			parts.push(theme.fg("dim", memText));
		}

		// Join everything with modern premium separators
		const separator = theme.fg("dim", "  ·  ");
		const statusLine = ` ${parts.join(separator)}`;

		const totalVisibleWidth = visibleWidth(statusLine);
		if (totalVisibleWidth < width) {
			return [statusLine + " ".repeat(width - totalVisibleWidth)];
		}

		return [truncateToWidth(statusLine, width, "…")];
	}
}
