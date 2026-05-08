// @ts-nocheck
import { type Component, truncateToWidth, visibleWidth } from "@mooncli/tui";
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
		const branch = this.footerData.getGitBranch();
		const sessionName = this.session.sessionManager.getSessionName();
		const location = joinMuted([cwd, branch && `git:${branch}`, sessionName]);

		const activeToolNames = this.session.getActiveToolNames();
		const modelName = state.model?.id || "no-model";
		const model =
			state.model?.provider && this.footerData.getAvailableProviderCount() > 1
				? `${state.model.provider}/${modelName}`
				: modelName;
		const thinking = state.model?.reasoning ? `think:${state.thinkingLevel || "off"}` : undefined;
		const usage = joinMuted([
			totalInput ? `↑${formatTokens(totalInput)}` : undefined,
			totalOutput ? `↓${formatTokens(totalOutput)}` : undefined,
			totalCost
				? `$${totalCost.toFixed(3)}`
				: this.session.modelRegistry.isUsingOAuth(state.model)
					? "$0.000 sub"
					: undefined,
			`tools:${activeToolNames.length}`,
		]);

		const left = theme.fg("muted", location);
		const right = joinMuted([theme.fg("muted", model), thinking, coloredContext]);
		const lines = [fitPair(left, right, width), theme.fg("dim", usage)];

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
