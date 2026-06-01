/**
 * Compact startup intro matching the classic MoonAgent terminal face.
 */
export function buildIntroLines(width: number): string[] {
	const blue = (s: string) => `\x1b[38;2;122;183;255m${s}\x1b[39m`;
	const dim = (s: string) => `\x1b[38;2;111;122;143m${s}\x1b[39m`;
	const bright = (s: string) => `\x1b[38;2;233;238;248m${s}\x1b[39m`;
	const line = "=".repeat(Math.min(Math.max(width - 12, 24), 52));

	return [
		"",
		blue("                          MOONAGENT"),
		"",
		bright("Minimal agent. Strong taste. Small tokens. Sharp output."),
		bright("Terminal coding agent with MCP, Browser Bridge, and tools."),
		"",
		`      ${blue(line)}`,
		`      ${dim("1.26-v2  |  github.com/theayzek01/MoonAgent")}`,
		`      ${blue(line)}`,
		dim("/help  |  /index  |  /browser  |  /ship  |  Ctrl+C"),
		"",
	];
}
