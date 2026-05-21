// @ts-nocheck
import { type Component, truncateToWidth, visibleWidth } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

/** Single-row status bar. Signal only. */
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

		const activeToolNames = this.getExecutingToolNames ? this.getExecutingToolNames() : [];
		const branch = this.footerData.getGitBranch();
		const contextUsage = this.session.getContextUsage();
		const contextPercent = contextUsage?.percent !== null ? `${(contextUsage?.percent ?? 0).toFixed(0)}%` : "?";
		const provider = state.model?.provider;
		let modelName = state.model?.id || "no-model";

		if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			modelName = modelName.slice(provider.length + 1);
		} else if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			modelName = modelName.slice(provider.length + 1);
		}

		const phase = this.getPhase(activeToolNames);
		const hasBrowser = (this.session.getBrowserBridgeStatus?.().clients ?? 0) > 0;
		const parts = [
			theme.fg(hasBrowser ? "success" : "muted", hasBrowser ? "web:on" : "web:off"),
			theme.fg(phase.color, phase.label),
			branch ? theme.fg("muted", `git:${truncateToWidth(branch, 12, "...")}`) : undefined,
			theme.fg("accent", "model:") + theme.fg("text", truncateToWidth(modelName, 24, "...")),
			theme.fg("muted", "ctx:") + theme.fg("text", contextPercent),
			this.cachedCostTotal > 0 ? theme.fg("success", `$${this.cachedCostTotal.toFixed(3)}`) : undefined,
		].filter(Boolean);

		const lineText = ` ${parts.join(theme.fg("dim", " | "))}`;
		const lineVisWidth = visibleWidth(lineText);
		let renderedLine = lineText;
		if (lineVisWidth < width) {
			renderedLine = lineText + " ".repeat(width - lineVisWidth);
		} else if (lineVisWidth > width) {
			renderedLine = truncateToWidth(lineText, width);
		}

		return [renderedLine];
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
