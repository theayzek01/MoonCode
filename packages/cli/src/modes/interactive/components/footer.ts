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

	constructor(
		private session: EngineSession,
		private footerData: ReadonlyFooterDataProvider,
	) {}

	setSession(session: EngineSession): void {
		this.session = session;
	}

	setAutoCompactEnabled(enabled: boolean): void {
		this.autoCompactEnabled = enabled;
	}

	invalidate(): void {}
	dispose(): void {}

	render(width: number): string[] {
		const state = this.session.state;
		let totalCost = 0;

		for (const entry of this.session.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const costValue = entry.message.usage?.cost?.total;
				if (typeof costValue === "number" && Number.isFinite(costValue)) {
					totalCost += costValue;
				}
			}
		}

		const contextUsage = this.session.getContextUsage();
		const contextPercentValue = contextUsage?.percent ?? 0;
		const contextPercent = contextUsage?.percent !== null ? `${contextPercentValue.toFixed(0)}%` : "?";

		const branch = this.footerData.getGitBranch();
		const activeToolNames = this.session.getActiveToolNames();
		let modelName = state.model?.id || "no-model";
		const provider = state.model?.provider;

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
		const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
		const memText = `MEM ${memUsage.toFixed(0)}MB`;

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

		// 2. Git Branch (if available)
		if (branch && width > 70) {
			parts.push(theme.fg("muted", truncateToWidth(branch, 12, "…")));
		}

		// 3. Model
		if (width > 60) {
			parts.push(theme.fg("muted", "MODEL ") + theme.fg("text", truncateToWidth(modelName, 16, "…")));
		} else {
			parts.push(theme.fg("text", truncateToWidth(modelName, 10, "…")));
		}

		// 4. Thinking state
		if (thinkingText && width > 85) {
			parts.push(theme.fg(thinkingColor, thinkingText));
		}

		// 5. Context Usage
		const ctxText = this.autoCompactEnabled ? `${contextPercent} auto` : contextPercent;
		parts.push(theme.fg("muted", "CTX ") + theme.fg("text", ctxText));

		// 6. Running tasks count
		if (activeToolNames.length > 0) {
			parts.push(theme.fg("warning", `RUN ×${activeToolNames.length}`));
		}

		// 7. Cost
		if (costText && width > 95) {
			parts.push(theme.fg("dim", costText));
		}

		// 8. Memory Usage
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
