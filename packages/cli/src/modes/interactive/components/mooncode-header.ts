import { Container } from "moon-tui";
import { VERSION } from "../../../config.js";

function stripAnsi(text: string): string {
	return text.replace(/\x1b\[[0-9;]*m/g, "");
}

function gradientText(text: string, phase: number): string {
	const stops = [
		[224, 242, 255],
		[134, 203, 255],
		[75, 143, 237],
		[31, 64, 128],
	];
	let out = "";
	for (let i = 0; i < text.length; i++) {
		const ch = text[i];
		if (ch === " ") {
			out += ch;
			continue;
		}
		const t = ((i + phase) % (text.length + 16)) / Math.max(1, text.length - 1);
		const scaled = Math.max(0, Math.min(stops.length - 1, t * (stops.length - 1)));
		const idx = Math.floor(scaled);
		const next = Math.min(stops.length - 1, idx + 1);
		const mix = scaled - idx;
		const [r1, g1, b1] = stops[idx];
		const [r2, g2, b2] = stops[next];
		const r = Math.round(r1 + (r2 - r1) * mix);
		const g = Math.round(g1 + (g2 - g1) * mix);
		const b = Math.round(b1 + (b2 - b1) * mix);
		out += `\x1b[38;2;${r};${g};${b}m${ch}`;
	}
	return `${out}\x1b[39m`;
}

export class MoonAgentHeaderComponent extends Container {
	constructor(_session?: unknown, _footerDataProvider?: unknown, _requestRender?: () => void) {
		super();
	}

	dispose(): void {}

	override render(width: number): string[] {
		const bg = (s: string) => `\x1b[48;2;9;14;24m${s}\x1b[49m`;
		const dim = (s: string) => `\x1b[38;2;98;112;138m${s}\x1b[39m`;
		const accent = gradientText(" MoonAgent ", 0);
		const left = ` ${accent}`;
		const rightText = ` ${VERSION} | /help | /index | /browser | /ship `;
		const right = dim(rightText);
		const leftW = stripAnsi(left).length;
		const rightW = stripAnsi(right).length;
		const gap = Math.max(1, width - leftW - rightW);
		const row1 = bg(`${left}${" ".repeat(gap)}${right}`);
		const row2 = `\x1b[38;2;18;44;86m${"-".repeat(Math.max(1, width))}\x1b[39m`;
		return [row1, row2];
	}

	setExpanded(): void {}
}
