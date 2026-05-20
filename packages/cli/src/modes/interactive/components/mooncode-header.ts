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

	private applyGradient(text: string): string {
		const lines = text.split("\n");
		// Premium Neon Purple to Electric Cyan gradient
		const color1 = { r: 192, g: 132, b: 252 }; // Luminous Purple (#c084fc)
		const color2 = { r: 34, g: 211, b: 238 }; // Electric Cyan (#22d3ee)

		const maxLen = Math.max(...lines.map((l) => l.length));

		return lines
			.map((line) => {
				let result = "";
				for (let i = 0; i < line.length; i++) {
					const char = line[i];
					if (
						char === " " ||
						char === "╚" ||
						char === "═" ||
						char === "╝" ||
						char === "╔" ||
						char === "╗" ||
						char === "║"
					) {
						const t = i / Math.max(1, maxLen - 1);
						const r = Math.round(color1.r + (color2.r - color1.r) * t);
						const g = Math.round(color1.g + (color2.g - color1.g) * t);
						const b = Math.round(color1.b + (color2.b - color1.b) * t);
						result += `\x1b[38;2;${r};${g};${b}m${char}\x1b[39m`;
						continue;
					}

					const t = i / Math.max(1, maxLen - 1);
					const r = Math.round(color1.r + (color2.r - color1.r) * t);
					const g = Math.round(color1.g + (color2.g - color1.g) * t);
					const b = Math.round(color1.b + (color2.b - color1.b) * t);

					result += `\x1b[38;2;${r};${g};${b}m${char}\x1b[39m`;
				}
				return result;
			})
			.join("\n");
	}

	override render(width: number): string[] {
		if (this.cachedLines && this.cachedWidth === width) {
			return this.cachedLines;
		}

		// Resolve current logoMode configuration
		let logoMode = "auto";
		if (this.session?.settingsManager) {
			logoMode = this.session.settingsManager.getLogoMode();
		}

		// Auto compact logic: compact if there are chat entries
		if (logoMode === "auto") {
			const entries = this.session?.sessionManager?.getEntries() || [];
			if (entries.length > 0) {
				logoMode = "compact";
			} else {
				logoMode = "hero";
			}
		}

		if (logoMode === "off") {
			this.cachedWidth = width;
			this.cachedLines = [];
			return [];
		}

		const lines: string[] = [];

		if (logoMode === "minimal") {
			const minimalText = theme.fg("accent", "✦ MoonCode ") + theme.fg("dim", `v${VERSION}`);
			lines.push(minimalText);
			lines.push(theme.fg("dim", "─".repeat(width)));
			this.cachedWidth = width;
			this.cachedLines = lines;
			return lines;
		}

		if (logoMode === "compact") {
			// Compact persistent header: MoonCode · v2026-10 · project/branch
			const cwd = this.session?.sessionManager?.getCwd() || "";
			const project = cwd ? path.basename(cwd) : "";
			const branch = this.footerData?.getGitBranch() || "";
			const projBranch = project && branch ? `${project}/${branch}` : project || branch;

			const parts = [
				theme.bold(theme.fg("accent", "MOONCODE")),
				theme.fg("dim", `v${VERSION}`),
				projBranch ? theme.fg("muted", projBranch) : undefined,
			].filter(Boolean);

			const headerText = parts.join(theme.fg("dim", "  ·  "));
			lines.push(` ${headerText}`);
			lines.push(theme.fg("dim", "─".repeat(width)));
			this.cachedWidth = width;
			this.cachedLines = lines;
			return lines;
		}

		// Hero logo state (Logo mode "hero")
		const asciiLogo = [
			" ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗ ██████╗  ██████╗ ██████╗ ███████╗",
			" ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║██╔════╝ ██╔═══██╗██╔══██╗██╔════╝",
			" ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║██║      ██║   ██║██║  ██║█████╗  ",
			" ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║██║      ██║   ██║██║  ██║██╔══╝  ",
			" ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║╚██████╗╚██████╔╝██████╔╝███████╗",
			" ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝ ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝",
		].join("\n");

		lines.push(this.applyGradient(asciiLogo));
		lines.push("");

		const versionText =
			" " +
			theme.fg("dim", "✦ ") +
			theme.fg("accent", `VERSION ${VERSION}`) +
			theme.fg("dim", " ✦ ") +
			theme.fg("success", "INTELLIGENT RUNTIME ACTIVE");
		lines.push(versionText);
		lines.push("");
		lines.push(theme.fg("dim", "─".repeat(width)));

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	setExpanded(): void {}
}
