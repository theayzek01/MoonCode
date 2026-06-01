import type { Component } from "moon-tui";
import { visibleWidth } from "moon-tui";

function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function gradient(text: string, phase: number, palette: Array<[number, number, number]>): string {
	if (!text) return text;
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === " ") {
			out += ch;
			continue;
		}
		const t = (i + phase) / Math.max(1, text.length - 1);
		const scaled = Math.max(0, Math.min(palette.length - 1, t * (palette.length - 1)));
		const idx = Math.floor(scaled);
		const next = Math.min(palette.length - 1, idx + 1);
		const blend = scaled - idx;
		const [r1, g1, b1] = palette[idx];
		const [r2, g2, b2] = palette[next];
		const r = Math.round(r1 + (r2 - r1) * blend);
		const g = Math.round(g1 + (g2 - g1) * blend);
		const b = Math.round(b1 + (b2 - b1) * blend);
		out += `\x1b[38;2;${r};${g};${b}m${ch}`;
	}
	return `${out}\x1b[39m`;
}

function center(line: string, width: number): string {
	const pad = Math.max(0, Math.floor((width - visibleWidth(stripAnsi(line))) / 2));
	return `${" ".repeat(pad)}${line}`;
}

function buildWordmark(width: number, tick: number): string {
	const palette: Array<[number, number, number]> = [
		[255, 238, 238],
		[255, 150, 150],
		[220, 44, 56],
		[95, 16, 24],
	];
	const word = "MOONCODE";
	const phase = tick % 90;
	return center(gradient(word, phase, palette), width);
}

export function buildIntroLines(width: number, phase = 0): string[] {
	const dim = (s: string) => `\x1b[38;2;136;96;100m${s}\x1b[39m`;
	const soft = (s: string) => `\x1b[38;2;255;190;190m${s}\x1b[39m`;
	const glow = (s: string) => `\x1b[1m\x1b[38;2;255;238;238m${s}\x1b[39m\x1b[22m`;
	const lineWidth = Math.max(24, Math.min(width - 8, 92));
	const rule = center(
		gradient("=".repeat(lineWidth), phase / 2, [
			[80, 18, 26],
			[210, 42, 54],
			[255, 175, 175],
		]),
		width,
	);
	const wordmark = buildWordmark(width, phase);
	const title = center(glow("Fast coding agent. Clean tools. Quiet output."), width);
	const sub = center(soft("MCP, Browser Bridge, sessions, and DreamKernel reflexes"), width);

	return [
		"",
		wordmark,
		"",
		title,
		sub,
		"",
		rule,
		center(dim("/help  |  /models  |  /mcp  |  /login  |  Ctrl+C exit"), width),
		"",
	];
}

export class MoonCodeIntroComponent implements Component {
	invalidate(): void {}

	dispose(): void {}

	render(width: number): string[] {
		return buildIntroLines(width, 0);
	}
}
