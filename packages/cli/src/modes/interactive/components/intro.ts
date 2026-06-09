import type { Component } from "moon-tui";

const dim = (s: string) => `\x1b[38;2;70;70;70m${s}\x1b[39m`;
const muted = (s: string) => `\x1b[38;2;130;130;130m${s}\x1b[39m`;

export function buildIntroLines(width: number, _phase = 0): string[] {
	const pad = Math.max(0, Math.floor(width / 2) - 10);
	const indent = " ".repeat(pad);
	return ["", indent + muted("ryuko"), indent + dim("type to begin"), ""];
}

export class MoonCodeIntroComponent implements Component {
	invalidate(): void {}
	dispose(): void {}
	render(width: number): string[] {
		return buildIntroLines(width, 0);
	}
}
