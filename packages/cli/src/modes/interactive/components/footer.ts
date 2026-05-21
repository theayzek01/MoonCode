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

		let effort = "FAST";
		if (hasErrors) {
			effort = "REPAIR";
		} else if (hasBash) {
			effort = "DEEP";
		} else if (hasEdits) {
			effort = "BALANCED";
		} else if (entries.length > 2) {
			effort = "FAST";
		}

		let phaseLabel = "DONE";
		let _phaseIcon = "[OK]";
		let _phaseColor = "success";

		if (entries.length === 0) {
			phaseLabel = "IDLE";
			_phaseIcon = "[-] ";
			_phaseColor = "muted";
		} else if (this.session.isStreaming) {
			phaseLabel = "PLAN";
			_phaseIcon = "[?] ";
			_phaseColor = "accent";
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
				phaseLabel = "READ";
				_phaseIcon = "[R] ";
				_phaseColor = "muted";
			} else if (
				tool === "edit" ||
				tool === "write" ||
				tool === "replace_file_content" ||
				tool === "multi_replace_file_content" ||
				tool === "write_to_file"
			) {
				phaseLabel = "EDIT";
				_phaseIcon = "[E] ";
				_phaseColor = "accent";
			} else if (tool === "bash" || tool === "run_command") {
				if (hasErrors) {
					phaseLabel = "REPAIR";
					_phaseIcon = "[!] ";
					_phaseColor = "warning";
				} else {
					phaseLabel = "VERIFY";
					_phaseIcon = "[V] ";
					_phaseColor = "success";
				}
			} else {
				phaseLabel = "RUN";
				_phaseIcon = "[*] ";
				_phaseColor = "warning";
			}
		} else if (this.session.isCompacting) {
			phaseLabel = "COMPACT";
			_phaseIcon = "[C] ";
			_phaseColor = "muted";
		} else if (hasErrors) {
			phaseLabel = "BLOCKED";
			_phaseIcon = "[X] ";
			_phaseColor = "error";
		} else {
			phaseLabel = "DONE";
			_phaseIcon = "[OK]";
			_phaseColor = "success";
		}

		// Clean up redundant prefix
		if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			modelName = modelName.slice(provider.length + 1);
		} else if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			modelName = modelName.slice(provider.length + 1);
		}

		// Thinking status & colors
		const thinkingLevel = state.thinkingLevel || "off";
		const _thinkingColor = thinkingLevel === "high" || thinkingLevel === "xhigh" ? "accent" : "muted";
		const _thinkingText = state.model?.reasoning ? `THINK ${thinkingLevel}` : undefined;

		// Memory usage
		const memUsage = process.memoryUsage().rss / 1024 / 1024;
		const memText = `RSS ${memUsage.toFixed(0)}MB`;

		// Format cost nicely (always display it)
		const costColor = totalCost > 0 ? "success" : "dim";
		const costText = `spend:$${totalCost.toFixed(3)}`;

		// Build parts with clean hierarchy
		const parts: string[] = [];

		// 1. Web Connection Indicator (WEB ON / WEB OFF)
		const hasBrowser = this.session.getBrowserBridgeStatus().clients > 0;
		const modeText = hasBrowser ? "WEB:ON" : "WEB:OFF";
		const modeColor = hasBrowser ? "success" : "error";
		parts.push(theme.bold(theme.fg(modeColor, modeText)));

		// 2. Effort Level & Current Phase
		parts.push(theme.fg("accent", `[${effort} · ${phaseLabel}]`));

		// 3. Git Branch (if available)
		if (branch) {
			parts.push(theme.fg("muted", `git:${truncateToWidth(branch, 12, "...")}`));
		}

		// 4. Model (Rendered fully, no truncation)
		parts.push(theme.fg("accent", "model:") + theme.fg("text", modelName));

		// 5. Context Usage
		parts.push(theme.fg("muted", "ctx:") + theme.fg("text", contextPercent));

		// 6. Cost (Always visible)
		parts.push(theme.fg(costColor, costText));

		// 7. Memory Usage
		parts.push(theme.fg("dim", `mem:${memText}`));

		// Join everything with modern premium vertical separator
		const separator = theme.fg("dim", " · ");
		const _separatorWidth = 3; // " · " visible length is 3

		// Single-row minimal renderer
		const lineText = ` ${parts.join(separator)}`;
		const lineVisWidth = visibleWidth(lineText);
		let renderedLine = lineText;
		if (lineVisWidth < width) {
			renderedLine = lineText + " ".repeat(width - lineVisWidth);
		} else if (lineVisWidth > width) {
			renderedLine = truncateToWidth(lineText, width);
		}

		return [renderedLine];
	}
}
