import type { Component } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { VERSION } from "../../../config.js";

const ANSI_RE = /\x1b\[[0-9;]*m/g;

function widthOf(value: string): number {
	return value.replace(ANSI_RE, "").length;
}

function pad(count: number): string {
	return count > 0 ? " ".repeat(count) : "";
}

function rgb(r: number, g: number, b: number, value: string): string {
	return `\x1b[38;2;${r};${g};${b}m${value}\x1b[39m`;
}

function bg(r: number, g: number, b: number, value: string): string {
	return `\x1b[48;2;${r};${g};${b}m${value}\x1b[49m`;
}

const color = {
	primary: (value: string) => rgb(255, 142, 83, value),
	secondary: (value: string) => rgb(133, 218, 185, value),
	text: (value: string) => rgb(228, 232, 238, value),
	muted: (value: string) => rgb(126, 135, 148, value),
	dim: (value: string) => rgb(78, 86, 98, value),
	panel: (value: string) => bg(12, 15, 20, value),
	panelAlt: (value: string) => bg(18, 22, 29, value),
};

function fit(value: string, maxWidth: number): string {
	const plain = value.replace(ANSI_RE, "");
	if (plain.length <= maxWidth) return value;
	if (maxWidth <= 1) return "";
	return `${plain.slice(0, maxWidth - 1)}~`;
}

function shortenPath(value: string): string {
	if (!value) return ".";
	const parts = value.split(/[/\\]/).filter(Boolean);
	if (parts.length <= 2) return value;
	return `.../${parts.slice(-2).join("/")}`;
}

function compactModel(session: EngineSession): string {
	const provider = session.state.model?.provider ?? "";
	const id = session.state.model?.id ?? "no-model";
	const prefix = provider ? `${provider}/` : "";
	return id.toLowerCase().startsWith(prefix.toLowerCase()) ? id.slice(prefix.length) : id;
}

function renderRule(width: number): string {
	return color.dim(" " + "-".repeat(Math.max(0, width - 2)) + " ");
}

function renderStatusLine(left: string, right: string, width: number, painter: (value: string) => string): string {
	const leftWidth = widthOf(left);
	const rightWidth = widthOf(right);
	const gap = Math.max(1, width - leftWidth - rightWidth);
	return painter(left + pad(gap) + right);
}

export class MoonCodeHeaderComponent implements Component {
	private expanded = false;
	private unsubscribeBranch?: () => void;

	constructor(
		private session: EngineSession,
		private footerData: ReadonlyFooterDataProvider,
	) {
		this.unsubscribeBranch = footerData.onBranchChange?.(() => this.invalidate());
	}

	setSession(session: EngineSession): void {
		this.session = session;
		this.invalidate();
	}

	setExpanded(expanded: boolean): void {
		this.expanded = expanded;
		this.invalidate();
	}

	invalidate(): void {}

	dispose(): void {
		this.unsubscribeBranch?.();
		this.unsubscribeBranch = undefined;
	}

	render(width: number): string[] {
		const safeWidth = Math.max(24, width);
		const cwd = shortenPath(this.session.sessionManager?.getCwd?.() ?? process.cwd());
		const branch = this.footerData.getGitBranch?.();
		const branchLabel = branch ? `git:${branch}` : "no-git";
		const model = compactModel(this.session);
		const thinking = this.session.state.thinkingLevel ?? "off";
		const ctx = this.session.getContextUsage?.();
		const ctxLabel = ctx?.percent != null ? `ctx:${ctx.percent.toFixed(0)}%` : "ctx:0%";
		const mode = this.session.isStreaming ? "run" : "ready";
		const providers = this.footerData.getAvailableProviderCount?.() ?? 0;
		const extensionStatuses = [...(this.footerData.getExtensionStatuses?.() ?? new Map()).values()];

		if (safeWidth < 72) {
			const left = color.primary(" mooncode ") + color.muted(fit(cwd, Math.max(8, safeWidth - 36)));
			const right = color.secondary(mode);
			return [renderStatusLine(left, right, safeWidth, color.panel)];
		}

		const logo = color.primary(" moon") + color.secondary("code ");
		const title = color.text("open tui console");
		const right = [color.muted(`v${VERSION}`), color.muted(branchLabel), color.secondary(mode)].join(color.dim("  |  "));
		const top = renderStatusLine(`${logo}${title}`, right, safeWidth, color.panel);

		const left = color.muted(` ${fit(cwd, Math.max(12, Math.floor(safeWidth * 0.38)))}`);
		const mid = [color.text(model), color.muted(`think:${thinking}`), color.muted(ctxLabel)].join(color.dim("  /  "));
		const right2 = color.muted(`providers:${providers}`);
		const budget = safeWidth - widthOf(left) - widthOf(right2) - 4;
		const center = fit(mid, Math.max(10, budget));
		const second = renderStatusLine(`${left}  ${center}`, right2, safeWidth, color.panelAlt);

		if (!this.expanded && extensionStatuses.length === 0) {
			return [top, second];
		}

		const hints = color.dim(" /help /model /session /theme    tab:agent  ctrl+c:exit");
		const status =
			extensionStatuses.length > 0 ? color.muted(" " + extensionStatuses.join("  |  ")) : color.muted(" extensions: idle");
		return [top, second, renderRule(safeWidth), fit(hints, safeWidth), fit(status, safeWidth)];
	}
}
