// @ts-nocheck
import * as path from "node:path";
import { Container, Text } from "moon-tui";
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

		// Color Definitions from the Visual Prompt:
		const steelBlue = (str: string) => `\x1b[38;2;95;158;160m${str}\x1b[39m`;
		const darkGray = (str: string) => `\x1b[38;2;85;85;85m${str}\x1b[39m`;
		const dimGray = (str: string) => `\x1b[38;2;120;120;120m${str}\x1b[39m`;
		const veryDimGray = (str: string) => `\x1b[38;2;70;70;70m${str}\x1b[39m`;
		const titleBarBg = (str: string) => `\x1b[48;2;24;29;34m${str}\x1b[49m`; // #181d22
		const terminalBg = (str: string) => `\x1b[48;2;11;13;15m${str}\x1b[49m`;  // #0b0d0f

		const lines: string[] = [];

		// ZONE 1: Title Bar (#181d22)
		const badge = steelBlue(" [M] ");
		const tabName = " MoonCode v2026-18 ";
		const activeTab = `\x1b[48;2;11;13;15m${steelBlue("│")}${tabName}${steelBlue("│")}\x1b[49m`; 

		const windowControls = " ─ ▢  \x1b[38;2;180;70;70m✕\x1b[39m "; 
		const leftPart = badge + activeTab;
		const leftVisWidth = 5 + tabName.length + 2; 
		const rightVisWidth = 8; 

		const paddingLength = Math.max(0, width - leftVisWidth - rightVisWidth);
		const titleBarRow = titleBarBg(leftPart + " ".repeat(paddingLength) + windowControls);
		lines.push(titleBarRow);

		// Razor-thin top accent line in steel blue
		const underBadge = steelBlue("─".repeat(5));
		const underTab = " ".repeat(tabName.length + 2); 
		const underRest = steelBlue("─".repeat(Math.max(0, width - 5 - tabName.length - 2)));
		lines.push(terminalBg(underBadge + underTab + underRest));

		// ZONE 2: Terminal Body Header (Pure near-black canvas #0b0d0f)
		const glowingDot = steelBlue(" • ");
		const brandName = steelBlue("MoonCode");
		const versionStr = darkGray(" v2026-18");
		const tagline = darkGray(" — En minimal. En akıllı. En az token.");
		lines.push(terminalBg(`${glowingDot}${brandName}${versionStr}${tagline}`));

		// Command navigation row
		const cmdNav = [
			`${steelBlue("/index")} ${dimGray("dizinle")}`,
			`${steelBlue("/browser")} ${dimGray("tarayıcı")}`,
			`${steelBlue("/compact")} ${dimGray("sıkıştır")}`,
			`${steelBlue("/diff")} ${dimGray("farklar")}`,
			`${steelBlue("/ship")} ${dimGray("gönder")}`,
		].join(darkGray(" • "));
		lines.push(terminalBg(`  ${cmdNav}`));

		const helpHint = veryDimGray("  Klavye kısayolları ve komut listesi için /help yazabilirsiniz.");
		lines.push(terminalBg(helpHint));
		lines.push(terminalBg("")); 

		this.cachedWidth = width;
		this.cachedLines = lines;
		return lines;
	}

	setExpanded(): void {}
}
