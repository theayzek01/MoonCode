// @ts-nocheck

import * as path from "node:path";
import { Container, Text } from "moon-tui";
import { VERSION } from "../../../config.js";
import type { EngineSession } from "../../../core/engine-session.js";
import type { ReadonlyFooterDataProvider } from "../../../core/footer-data-provider.js";
import { theme } from "../theme/theme.js";

export class MoonCodeHeaderComponent extends Container {
	private divider: Text;
	private session?: EngineSession;
	private footerData?: ReadonlyFooterDataProvider;
	private cachedWidth?: number;
	private cachedLines?: string[];

	constructor(session?: EngineSession, footerData?: ReadonlyFooterDataProvider) {
		super();
		this.session = session;
		this.footerData = footerData;

		this.divider = new Text("", 0, 0);
		this.addChild(this.divider);
	}

	override invalidate(): void {
		super.invalidate();
		this.cachedWidth = undefined;
		this.cachedLines = undefined;
	}

	override render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		const cwd = this.session?.sessionManager?.getCwd() || "";
		const project = cwd ? path.basename(cwd) : "";
		const branch = this.footerData?.getGitBranch() || "";
		const location = project && branch ? `${project}/${branch}` : project || branch;
		const parts = [
			theme.bold(theme.fg("accent", "MoonCode")),
			theme.fg("dim", `v${VERSION}`),
			location ? theme.fg("muted", location) : undefined,
		].filter(Boolean);

		const lines = [` ${parts.join(theme.fg("dim", " | "))}`, theme.fg("dim", "-".repeat(Math.max(0, width)))];
		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	setExpanded(): void {}
}
