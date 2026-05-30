import { Container } from "moon-tui";

export class MoonCodeHeaderComponent extends Container {
	private _cachedWidth?: number;
	private _cachedLines?: string[];

	override invalidate(): void {
		super.invalidate();
		this._cachedWidth = undefined;
		this._cachedLines = undefined;
	}

	override render(width: number): string[] {
		if (this._cachedLines && this._cachedWidth === width) return this._cachedLines;

		const bg = (s: string) => `\x1b[48;2;18;22;28m${s}\x1b[49m`;
		const steel = (s: string) => `\x1b[38;2;95;158;160m${s}\x1b[39m`;
		const dim = (s: string) => `\x1b[38;2;90;90;90m${s}\x1b[39m`;

		// Row 1: title bar
		const left = steel(" ◆ MoonCode");
		const right = dim(" v2026-21 · /help · /index · /browser · /ship ");
		const leftW = 12;
		const rightW = right.replace(/\x1b\[[^m]*m/g, "").length;
		const pad = Math.max(0, width - leftW - rightW);
		const row1 = bg(left + " ".repeat(pad) + right);

		// Row 2: thin separator
		const row2 = `\x1b[38;2;30;38;48m${"▔".repeat(width)}\x1b[39m`;

		this._cachedWidth = width;
		this._cachedLines = [row1, row2];
		return this._cachedLines;
	}

	setExpanded(): void {}
}
