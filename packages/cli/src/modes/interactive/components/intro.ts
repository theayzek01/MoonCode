import * as os from "node:os";
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

function getDisplayName(): string {
	const envName = process.env.MOONCODE_USER_NAME || process.env.USERNAME || process.env.USER || os.userInfo().username;
	return envName?.trim() || "arkadaş";
}

function getGreeting(): string {
	const hour = new Date().getHours();
	if (hour >= 5 && hour < 11) return "Günaydın";
	if (hour >= 11 && hour < 17) return "Tünaydın";
	if (hour >= 17 && hour < 22) return "İyi akşamlar";
	return "İyi geceler";
}

function buildWordmark(width: number, tick: number): string {
	const palette: Array<[number, number, number]> = [
		[255, 255, 255],
		[220, 220, 220],
		[160, 160, 160],
		[100, 100, 100],
		[40, 40, 40],
	];
	const word = "MOONCODE";
	const phase = tick % 90;
	return center(gradient(word, phase, palette), width);
}

export function buildIntroLines(width: number, phase = 0): string[] {
	const dim = (s: string) => `\x1b[38;2;100;100;100m${s}\x1b[39m`;
	const soft = (s: string) => `\x1b[38;2;180;180;180m${s}\x1b[39m`;
	const glow = (s: string) => `\x1b[1m\x1b[38;2;255;255;255m${s}\x1b[39m\x1b[22m`;
	const safeWidth = Math.max(24, Math.min(width, 104));
	const lineWidth = Math.max(24, Math.min(safeWidth - 12, 78));
	const rule = center(
		gradient("─".repeat(lineWidth), phase / 2, [
			[30, 30, 30],
			[160, 160, 160],
			[255, 255, 255],
		]),
		width,
	);
	const wordmark = buildWordmark(width, phase);
	const greeting = center(glow(`${getGreeting()}, ${getDisplayName()}.`), width);
	const tip = center(dim("İpucu: /brain, /autothink, /mcp, /doctor"), width);

	return ["", wordmark, greeting, "", rule, tip, ""];
}

export class MoonCodeIntroComponent implements Component {
	invalidate(): void {}

	dispose(): void {}

	render(width: number): string[] {
		return buildIntroLines(width, 0);
	}
}
