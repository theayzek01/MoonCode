// @ts-nocheck
import { type Component, truncateToWidth, visibleWidth } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

function sanitizeStatusText(text: string): string {
	return text
		.replace(/[\r\n\t]/g, " ")
		.replace(/ +/g, " ")
		.trim();
}

function formatTokens(count: number): string {
	if (count < 1000) return count.toString();
	if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
	if (count < 1000000) return `${Math.round(count / 1000)}k`;
	if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
	return `${Math.round(count / 1000000)}M`;
}

function compactPath(cwd: string, width: number): string {
	if (visibleWidth(cwd) <= width) return cwd;
	const parts = cwd.replace(/\\/g, "/").split("/").filter(Boolean);
	if (parts.length <= 2) return truncateToWidth(cwd, width, "…");
	const tail = parts.slice(-2).join("/");
	const prefix = cwd.startsWith("~") ? "~/…/" : "…/";
	return truncateToWidth(`${prefix}${tail}`, width, "…");
}

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
		let totalInput = 0;
		let totalOutput = 0;
		let totalCost = 0;

		for (const entry of this.session.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				totalInput += entry.message.usage.input;
				totalOutput += entry.message.usage.output;
				totalCost += entry.message.usage.cost.total;
			}
		}

		const contextUsage = this.session.getContextUsage();
		const contextWindow = contextUsage?.contextWindow ?? state.model?.contextWindow ?? 0;
		const contextPercentValue = contextUsage?.percent ?? 0;
		const contextPercent = contextUsage?.percent !== null ? `${contextPercentValue.toFixed(1)}%` : "?";
		const contextText = `${contextPercent}/${formatTokens(contextWindow)}${this.autoCompactEnabled ? " auto" : ""}`;
		const coloredContext =
			contextPercentValue > 90
				? theme.fg("error", contextText)
				: contextPercentValue > 70
					? theme.fg("warning", contextText)
					: theme.fg("muted", contextText);

		// ── Row 1: cwd · git:branch · session ──────────────────────────────
		let cwd = this.session.sessionManager.getCwd();
		const home = process.env.HOME || process.env.USERPROFILE;
		if (home && cwd.startsWith(home)) cwd = `~${cwd.slice(home.length)}`;
		cwd = compactPath(cwd, Math.max(22, Math.floor(width * 0.55)));
		const branch = this.footerData.getGitBranch();
		const sessionName = this.session.sessionManager.getSessionName();

		const row1Parts = [
			theme.fg("dim", "◇ ") + theme.fg("text", cwd),
			branch && theme.fg("dim", "◈ ") + theme.fg("muted", truncateToWidth(branch, 14, "…")),
			sessionName && theme.fg("dim", "» ") + theme.fg("muted", truncateToWidth(sessionName, 18, "…")),
		].filter(Boolean);
		const row1 = truncateToWidth((row1Parts as string[]).join(theme.fg("dim", "  ")), width, "…");

		// ── Row 2: pulse · model · think · ctx · running ─────────────────
		const activeToolNames = this.session.getActiveToolNames();
		let modelName = state.model?.id || "no-model";
		const provider = state.model?.provider;

		// Clean up redundant prefix if model name already starts with provider name
		if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			modelName = modelName.slice(provider.length + 1);
		} else if (provider && modelName.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			modelName = modelName.slice(provider.length + 1);
		}

		const model =
			provider && this.footerData.getAvailableProviderCount() > 1 ? `${provider}/${modelName}` : modelName;

		// Thinking indicator with level-based colour
		const thinkingLevel = state.thinkingLevel || "off";
		const thinkingColor =
			thinkingLevel === "high" || thinkingLevel === "xhigh"
				? "accent"
				: thinkingLevel === "low" || thinkingLevel === "minimal"
					? "muted"
					: "dim";
		const thinking = state.model?.reasoning ? theme.fg(thinkingColor, `THINK:${thinkingLevel}`) : undefined;

		const isActive = !!activeToolNames.length;
		const pulse = isActive ? (Math.floor(Date.now() / 500) % 2 === 0 ? "●" : "○") : "◆";

		const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
		const memText = `${memUsage.toFixed(0)}MB`;

		const automation = this.session.getAutomationEnabled?.() ? theme.fg("warning", "AUTO") : undefined;
		const browserStatus = this.session.getBrowserBridgeStatus();
		const browserIndicator = browserStatus.clients > 0 ? theme.fg("success", "WEB") : undefined;
		const designIndicator = this.session.isDesignModeActive?.() ? theme.fg("accent", "DESIGN") : undefined;
		const costPart = totalCost
			? `$${totalCost.toFixed(3)}`
			: this.session.modelRegistry.isUsingOAuth(state.model)
				? "sub"
				: undefined;

		const contextBarLength = 10;
		const contextFilled = Math.round((contextPercentValue / 100) * contextBarLength);
		const contextBar =
			theme.fg("dim", "[") +
			theme.fg("accent", "■".repeat(contextFilled)) +
			theme.fg("dim", "□".repeat(contextBarLength - contextFilled)) +
			theme.fg("dim", "]");

		const runningPart = activeToolNames.length ? theme.fg("warning", `RUN ×${activeToolNames.length}`) : undefined;

		const row2Parts = [
			theme.fg("accent", pulse),
			designIndicator,
			browserIndicator,
			theme.fg("muted", "MODEL ") +
				theme.fg("text", truncateToWidth(model, Math.max(20, Math.floor(width * 0.4)), "…")),
			automation,
			thinking,
			`${theme.fg("muted", "CTX ") + contextBar} ${coloredContext}`,
			runningPart,
		].filter(Boolean);
		const row2 = truncateToWidth((row2Parts as string[]).join(theme.fg("dim", "  •  ")), width, "…");

		// ── Row 3: tokens · cost · mem · extension statuses ──────────────
		const row3Parts: string[] = [];
		if (totalInput || totalOutput) {
			row3Parts.push(theme.fg("dim", `${formatTokens(totalInput)}i / ${formatTokens(totalOutput)}o`));
		}
		if (costPart) {
			row3Parts.push(theme.fg("muted", "COST ") + theme.fg("dim", costPart));
		}
		row3Parts.push(theme.fg("muted", "MEM ") + theme.fg("dim", memText));

		const extensionStatuses = this.footerData.getExtensionStatuses();
		if (extensionStatuses.size > 0) {
			const statusLine = Array.from(extensionStatuses.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, text]) => sanitizeStatusText(text))
				.join("  ");
			row3Parts.push(theme.fg("dim", statusLine));
		}

		const row3 = truncateToWidth(row3Parts.join(theme.fg("dim", "  •  ")), width, "…");

		return [row1, row2, row3];
	}
}
