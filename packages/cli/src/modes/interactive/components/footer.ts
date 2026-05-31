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
	return `\x1b[38;2;96;210;255m${s}\x1b[39m`;
}
function dim(s: string): string {
	return `\x1b[38;2;104;110;124m${s}\x1b[39m`;
}
function muted(s: string): string {
	return `\x1b[38;2;186;192;206m${s}\x1b[39m`;
}
function sage(s: string): string {
	return `\x1b[38;2;102;220;148m${s}\x1b[39m`;
}
function coral(s: string): string {
	return `\x1b[38;2;255;126;134m${s}\x1b[39m`;
}
function bg1(s: string): string {
	return `\x1b[48;2;15;22;33m${s}\x1b[49m`;
}
function bg2(s: string): string {
	return `\x1b[48;2;12;16;25m${s}\x1b[49m`;
}

function shortenPath(p: string): string {
	if (!p) return ".";
	const parts = p.split(/[/\\]/);
	return parts.length <= 2 ? p : `.../${parts.slice(-2).join("/")}`;
}

export class FooterComponent implements Component {
	private getExecutingToolNames?: () => string[];
	private costTotal = 0;
	private lastEntryCount = -1;
	private taskStartTime?: number;
	private refreshTimer?: NodeJS.Timeout;

	constructor(
		private session: EngineSession,
		_footerData: ReadonlyFooterDataProvider,
		getExecutingToolNames?: () => string[],
		private requestRender?: () => void,
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
	dispose(): void {
		if (this.refreshTimer) {
			clearInterval(this.refreshTimer);
			this.refreshTimer = undefined;
		}
	}

	render(width: number): string[] {
		const state = this.session.state;
		const entries = this.session.sessionManager?.getEntries() ?? [];

		if (entries.length !== this.lastEntryCount) {
			this.lastEntryCount = entries.length;
			this.costTotal = 0;
			for (const entry of entries) {
				if (entry.type === "message" && entry.message.role === "assistant") {
					const cost = entry.message.usage?.cost?.total;
					if (typeof cost === "number" && Number.isFinite(cost)) this.costTotal += cost;
				}
			}
		}

		const activeTools = this.getExecutingToolNames?.() ?? [];
		const isBashActive = (this.session as any).isBashRunning;
		const isLongTaskActive =
			activeTools.some((tool) => ["edit", "multiedit", "agent", "browser_page", "browser_tabs"].includes(tool)) ||
			isBashActive;

		if (isLongTaskActive && !this.taskStartTime) {
			this.taskStartTime = Date.now();
			if (!this.refreshTimer) {
				this.refreshTimer = setInterval(() => this.requestRender?.(), 1000);
				if (this.refreshTimer.unref) this.refreshTimer.unref();
			}
		}
		if (!isLongTaskActive && this.taskStartTime) {
			this.taskStartTime = undefined;
			if (this.refreshTimer) {
				clearInterval(this.refreshTimer);
				this.refreshTimer = undefined;
			}
		}

		let eta = "";
		if (this.taskStartTime) {
			const elapsedSec = Math.floor((Date.now() - this.taskStartTime) / 1000);
			const remainingSec = Math.max(5, 240 - elapsedSec);
			const mins = Math.floor(remainingSec / 60);
			const secs = remainingSec % 60;
			const timeLabel = mins > 0 ? `${mins} dk ${secs} sn` : `${secs} sn`;
			const color =
				remainingSec <= 60
					? "\x1b[38;2;34;197;94m"
					: remainingSec <= 180
						? "\x1b[38;2;255;165;0m"
						: "\x1b[38;2;255;76;92m";
			eta = `${color}ETA ${timeLabel}\x1b[39m`;
		}

		const provider = state.model?.provider ?? "";
		let model = state.model?.id ?? "no-model";
		if (model.toLowerCase().startsWith(`${provider.toLowerCase()}-`)) model = model.slice(provider.length + 1);
		else if (model.toLowerCase().startsWith(`${provider.toLowerCase()}/`)) model = model.slice(provider.length + 1);

		const ctxUsage = this.session.getContextUsage?.();
		const ctxPct = ctxUsage?.percent != null ? `${ctxUsage.percent.toFixed(0)}%` : "0%";
		const thinkLevel = state.thinkingLevel ?? "low";
		const cwd = this.session.sessionManager?.getCwd() ?? ".";
		const pathStr = ` ${shortenPath(cwd)} `;
		const streaming = this.session.isStreaming;
		const compacting = (this.session as any).isCompacting;
		const phase = compacting ? steel("compact") : streaming ? coral("thinking") : dim("idle");

		if (width < 55) {
			const narrowDir = ` dir ${shortenPath(cwd).split("/").pop()} `;
			const rightPart = eta || phase;
			const gap = Math.max(1, width - vw(narrowDir) - vw(rightPart) - 1);
			return [bg1(`${muted(narrowDir)}${pad(gap)}${rightPart} `)];
		}

		const right1Parts =
			width >= 85 ? [muted(model), dim(`think:${thinkLevel}`), dim(`ctx:${ctxPct}`), phase] : [muted(model), phase];
		const right1 = right1Parts.join(dim("  |  "));
		const pad1 = Math.max(1, width - vw(pathStr) - vw(right1) - 1);
		const row1 = bg1(`${muted(pathStr) + pad(pad1) + right1} `);

		const clients = (this.session as any).getBrowserBridgeStatus?.()?.clients ?? 0;
		const browserStatus = clients > 0 ? sage("on connected") : dim("off disconnected");
		const toolNames = (this.session as any).getActiveToolNames?.() ?? [];
		const hasBlender = toolNames.some((tool: string) => tool.startsWith("blender_"));
		const toolCount = activeTools.length || toolNames.length;
		const toolStr = hasBlender ? sage(`tools:${toolCount} + blender`) : dim(`tools:${toolCount}`);
		const costStr = dim(`$${this.costTotal.toFixed(3)}`);

		const left2 = steel(" browser ") + dim("| ") + browserStatus;
		const right2Parts = [costStr, toolStr];
		if (eta) right2Parts.unshift(eta);
		const right2 = right2Parts.join(dim("  |  "));
		const pad2 = Math.max(1, width - vw(left2) - vw(right2) - 1);
		const row2 = bg2(`${left2 + pad(pad2) + right2} `);

		return [row1, row2];
	}
}
