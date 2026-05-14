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

function joinMuted(parts: Array<string | undefined | false>): string {
	return parts.filter(Boolean).join(theme.fg("dim", " · "));
}

function fitPair(left: string, right: string, width: number): string {
	const leftWidth = visibleWidth(left);
	const rightWidth = visibleWidth(right);
	if (leftWidth + rightWidth + 2 <= width) {
		return `${left}${" ".repeat(width - leftWidth - rightWidth)}${right}`;
	}
	const rightMax = Math.max(0, width - leftWidth - 2);
	if (rightMax > 8) return `${left}  ${truncateToWidth(right, rightMax, "")}`;
	return truncateToWidth(left, width, theme.fg("dim", "..."));
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

		let cwd = this.session.sessionManager.getCwd();
		const home = process.env.HOME || process.env.USERPROFILE;
		if (home && cwd.startsWith(home)) cwd = `~${cwd.slice(home.length)}`;
		cwd = compactPath(cwd, Math.max(18, Math.floor(width * 0.38)));
		const branch = this.footerData.getGitBranch();
		const sessionName = this.session.sessionManager.getSessionName();
		const location = joinMuted([
			cwd,
			branch && `git:${truncateToWidth(branch, 18, "…")}`,
			sessionName && truncateToWidth(sessionName, 24, "…"),
		]);

		const activeToolNames = this.session.getActiveToolNames();
		const modelName = state.model?.id || "no-model";
		const model =
			state.model?.provider && this.footerData.getAvailableProviderCount() > 1
				? `${state.model.provider}/${modelName}`
				: modelName;
		const thinking = state.model?.reasoning ? `think:${state.thinkingLevel || "off"}` : undefined;
		const automation = this.session.getAutomationEnabled?.() ? theme.fg("warning", "automation") : undefined;
		const browserStatus = this.session.getBrowserBridgeStatus();
		const browserIndicator = browserStatus.clients > 0 ? theme.fg("success", "🌐 browser") : undefined;

		const usage = joinMuted([
			browserIndicator,
			totalInput || totalOutput ? `tok ${formatTokens(totalInput)}/${formatTokens(totalOutput)}` : undefined,
			totalCost
				? `$${totalCost.toFixed(3)}`
				: this.session.modelRegistry.isUsingOAuth(state.model)
					? "sub"
					: undefined,
			`tools ${activeToolNames.length}`,
		]);

		const left = theme.fg("muted", location || "workspace");
		const right = joinMuted([
			theme.fg("muted", truncateToWidth(model, Math.max(18, Math.floor(width * 0.32)), "…")),
			automation,
			thinking,
			coloredContext,
		]);
		const divider = theme.fg("borderMuted", "─".repeat(Math.max(1, width)));
		const lines = [divider, fitPair(left, right, width)];
		if (usage && width >= 72) lines.push(theme.fg("dim", truncateToWidth(usage, width, "…")));

		const extensionStatuses = this.footerData.getExtensionStatuses();
		if (extensionStatuses.size > 0) {
			const statusLine = Array.from(extensionStatuses.entries())
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([, text]) => sanitizeStatusText(text))
				.join("  ");
			lines.push(truncateToWidth(theme.fg("dim", statusLine), width, theme.fg("dim", "...")));
		}

		return lines;
	}
}
