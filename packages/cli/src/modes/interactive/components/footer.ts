import type { Component } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";

function vw(s: string): number {
	return s.replace(/\x1b\[[^m]*m/g, "").replace(/[\uD800-\uDFFF]/g, "  ").length;
}

function pad(n: number): string {
	return n > 0 ? " ".repeat(n) : "";
}

function steel(s: string): string {
	return `\x1b[38;2;95;158;160m${s}\x1b[39m`;
}
function dim(s: string): string {
	return `\x1b[38;2;90;90;90m${s}\x1b[39m`;
}
function muted(s: string): string {
	return `\x1b[38;2;140;140;140m${s}\x1b[39m`;
}
function sage(s: string): string {
	return `\x1b[38;2;110;170;120m${s}\x1b[39m`;
}
function bg1(s: string): string {
	return `\x1b[48;2;18;22;28m${s}\x1b[49m`;
}
function bg2(s: string): string {
	return `\x1b[48;2;10;12;16m${s}\x1b[49m`;
}

function shortenPath(p: string): string {
	if (!p) return ".";
	const parts = p.split(/[/\\]/);
	return parts.length <= 2 ? p : `…/${parts.slice(-2).join("/")}`;
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

	setSession(s: EngineSession): void {
		this.session = s;
		this.invalidate();
	}
	setAutoCompactEnabled(_e: boolean): void {}
	invalidate(): void {
		this.lastEntryCount = -1;
	}
	dispose(): void {}

	render(width: number): string[] {
		const state = this.session.state;
		const entries = this.session.sessionManager?.getEntries() ?? [];

		// Recompute cost only when entries change
		if (entries.length !== this.lastEntryCount) {
			this.lastEntryCount = entries.length;
			this.costTotal = 0;
			for (const e of entries) {
				if (e.type === "message" && e.message.role === "assistant") {
					const c = e.message.usage?.cost?.total;
					if (typeof c === "number" && isFinite(c)) this.costTotal += c;
				}
			}
		}

		// Model name (strip provider prefix)
		const provider = state.model?.provider ?? "";
		let model = state.model?.id ?? "no-model";
		if (model.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) model = model.slice(provider.length + 1);
		else if (model.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) model = model.slice(provider.length + 1);

		// Context usage
		const ctxUsage = this.session.getContextUsage?.();
		const ctxPct = ctxUsage?.percent != null ? `${ctxUsage.percent.toFixed(0)}%` : "0%";

		// Thinking level
		const thinkLevel = state.thinkingLevel ?? "low";

		// ── ROW 1: status bar ──────────────────────────────────────────────
		const cwd = this.session.sessionManager?.getCwd() ?? ".";
		const pathStr = ` ${shortenPath(cwd)} `;

		const streaming = this.session.isStreaming;
		const compacting = (this.session as any).isCompacting;
		const phase = compacting ? steel("compact") : streaming ? steel("thinking") : dim("idle");

		const right1Parts = [muted(model), dim(`think:${thinkLevel}`), dim(`ctx:${ctxPct}`), phase];
		const right1 = right1Parts.join(dim("  ·  "));

		const left1W = vw(pathStr);
		const right1W = vw(right1);
		const pad1 = Math.max(1, width - left1W - right1W - 1);
		const row1 = bg1(muted(pathStr) + pad(pad1) + right1 + " ");

		// ── ROW 2: browser bar ─────────────────────────────────────────────
		const clients = (this.session as any).getBrowserBridgeStatus?.()?.clients ?? 0;
		const connected = clients > 0;
		const browserStatus = connected ? sage("● connected") : dim("○ disconnected");

		const activeTools = this.getExecutingToolNames?.() ?? [];
		const toolNames = (this.session as any).getActiveToolNames?.() ?? [];
		const toolCount = activeTools.length || toolNames.length;
		const toolStr = dim(`tools:${toolCount}`);
		const costStr = dim(`$${this.costTotal.toFixed(3)}`);

		const left2 = steel(" ⬡ browser ") + dim("│ ") + browserStatus;
		const right2 = [costStr, toolStr].join(dim("  ·  "));

		const left2W = vw(left2);
		const right2W = vw(right2);
		const pad2 = Math.max(1, width - left2W - right2W - 1);
		const row2 = bg2(left2 + pad(pad2) + right2 + " ");

		return [row1, row2];
	}
}
