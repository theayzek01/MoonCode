import type { Component } from "moon-tui";
import { VERSION } from "../../../config.js";
import { getDevLevelState } from "../../../core/dev-level.js";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function widthOf(value: string): number {
	return value.replace(ANSI_RE, "").replace(/[\uD800-\uDFFF]/g, "  ").length;
}

function pad(count: number): string {
	return count > 0 ? " ".repeat(count) : "";
}

function steel(value: string): string {
	return `\x1b[38;2;95;158;160m${value}\x1b[39m`;
}

function dim(value: string): string {
	return `\x1b[38;2;90;90;90m${value}\x1b[39m`;
}

function muted(value: string): string {
	return `\x1b[38;2;140;140;140m${value}\x1b[39m`;
}

function sage(value: string): string {
	return `\x1b[38;2;110;170;120m${value}\x1b[39m`;
}

function bg1(value: string): string {
	return value;
}

function bg2(value: string): string {
	return value;
}

function shortenPath(value: string): string {
	if (!value) return ".";
	const parts = value.split(/[/\\]/);
	return parts.length <= 2 ? value : `.../${parts.slice(-2).join("/")}`;
}

function fitText(value: string, maxWidth: number): string {
	const plain = value.replace(ANSI_RE, "");
	if (plain.length <= maxWidth) return value;
	if (maxWidth <= 1) return "";
	return `${plain.slice(0, maxWidth - 1)}~`;
}

function joinParts(parts: string[]): string {
	return parts.filter(Boolean).join(dim("  |  "));
}

function renderLine(left: string, right: string, width: number, painter: (value: string) => string): string {
	const safeWidth = Math.max(1, width);
	const fittedRight = fitText(right, Math.max(0, safeWidth - 8));
	const rightWidth = widthOf(fittedRight);
	const fittedLeft = fitText(left, Math.max(0, safeWidth - rightWidth - 1));
	const gap = Math.max(1, safeWidth - widthOf(fittedLeft) - rightWidth - 1);
	return painter(`${fittedLeft}${pad(gap)}${fittedRight} `);
}

export class FooterComponent implements Component {
	private getExecutingToolNames?: () => string[];
	private costTotal = 0;
	private lastEntryCount = -1;

	constructor(
		private session: EngineSession,
		private _footerData: ReadonlyFooterDataProvider,
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
		this.lastEntryCount = -1;
	}

	dispose(): void {}

	render(width: number): string[] {
		const state = this.session.state;
		const entries = this.session.sessionManager?.getEntries() ?? [];

		if (entries.length !== this.lastEntryCount) {
			this.lastEntryCount = entries.length;
			this.costTotal = 0;
			for (const entry of entries) {
				if (entry.type === "message" && entry.message.role === "assistant") {
					const totalCost = entry.message.usage?.cost?.total;
					if (typeof totalCost === "number" && Number.isFinite(totalCost)) {
						this.costTotal += totalCost;
					}
				}
			}
		}

		const provider = state.model?.provider ?? "";
		let model = state.model?.id ?? "no-model";
		if (provider && model.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) {
			model = model.slice(provider.length + 1);
		} else if (provider && model.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) {
			model = model.slice(provider.length + 1);
		}

		const ctxUsage = this.session.getContextUsage?.();
		const ctxPct = ctxUsage?.percent != null ? `${ctxUsage.percent.toFixed(0)}%` : "0%";
		const thinkLevel = state.thinkingLevel ?? "off";
		const cwd = this.session.sessionManager?.getCwd() ?? ".";
		const compacting = Boolean((this.session as any).isCompacting);
		const streaming = this.session.isStreaming;
		const phase = compacting ? steel("compact") : streaming ? steel("run") : dim("idle");
		const browserClients = this.session.getBrowserBridgeStatus?.()?.clients ?? 0;
		const activeTools = this.getExecutingToolNames?.() ?? [];
		const toolNames = (this.session as any).getActiveToolNames?.() ?? [];
		const toolCount = activeTools.length || toolNames.length;
		const xpState = getDevLevelState();

		const layout = width < 92 ? "compact" : width < 132 ? "balanced" : "full";
		const showPath = layout !== "compact";
		const showVersion = layout === "full";
		const showCost = layout !== "compact";
		const showXpDetails = layout !== "compact";
		const barWidth = layout === "compact" ? 4 : layout === "balanced" ? 6 : 8;

		const pathLabel = muted(` ${shortenPath(cwd)} `);
		const modelLabel = muted(fitText(model, Math.max(8, Math.floor(width * 0.22))));
		const right1 = showPath
			? joinParts([
					modelLabel,
					showVersion ? muted(`v${VERSION}`) : "",
					dim(`think:${thinkLevel}`),
					sage(`ctx:${ctxPct}`),
					phase,
				])
			: joinParts([dim(`think:${thinkLevel}`), sage(`ctx:${ctxPct}`), phase]);
		const row1 = renderLine(showPath ? pathLabel : modelLabel, right1, width, bg1);

		const filledCount = Math.min(barWidth, Math.round((xpState.percent / 100) * barWidth));
		const emptyCount = Math.max(0, barWidth - filledCount);
		const progressBar = `[${"#".repeat(filledCount)}${"-".repeat(emptyCount)}]`;
		const levelLabel = `* LVL ${xpState.level} ${progressBar} ${xpState.percent}%`;
		const xpDetail = dim(`(${xpState.xp}/${xpState.neededXp} XP)`);
		const browserStatus = browserClients > 0 ? sage(`o browser:${browserClients}`) : dim("o browser:0");
		const toolLabel = toolCount > 0 ? muted(`tools:${toolCount}`) : dim("tools:0");
		const costLabel = showCost ? muted(`$${this.costTotal.toFixed(3)}`) : "";
		const notification = xpState.notification ? muted(` ${xpState.notification}`) : "";
		const left2 = showXpDetails ? `${muted(` ${levelLabel} `)}${xpDetail}${notification}` : muted(` ${fitText(levelLabel, Math.max(18, Math.floor(width * 0.38)))} `);
		const right2 = joinParts([browserStatus, toolLabel, costLabel]);
		const row2 = renderLine(left2, right2, width, bg2);

		return [row1, row2];
	}
}
