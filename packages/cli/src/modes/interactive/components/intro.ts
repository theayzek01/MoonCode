/**
 * One-shot ASCII intro shown on first launch.
 * Renders for ~2.5s then self-removes from the chat container.
 */
export function buildIntroLines(width: number): string[] {
	const steel  = (s: string) => `\x1b[38;2;95;158;160m${s}\x1b[39m`;
	const dim    = (s: string) => `\x1b[38;2;80;80;80m${s}\x1b[39m`;
	const bright = (s: string) => `\x1b[38;2;200;220;225m${s}\x1b[39m`;
	const gold   = (s: string) => `\x1b[38;2;190;160;90m${s}\x1b[39m`;
	const red    = (s: string) => `\x1b[38;2;180;70;70m${s}\x1b[39m`;

	// Big ASCII logo (7 rows)
	const logo = [
		steel("  ███╗   ███╗ ██████╗  ██████╗ ███╗   ██╗") + dim("  ██████╗ ██████╗ ██████╗ ███████╗"),
		steel("  ████╗ ████║██╔═══██╗██╔═══██╗████╗  ██║") + dim(" ██╔════╝██╔═══██╗██╔══██╗██╔════╝"),
		steel("  ██╔████╔██║██║   ██║██║   ██║██╔██╗ ██║") + dim(" ██║     ██║   ██║██║  ██║█████╗  "),
		steel("  ██║╚██╔╝██║██║   ██║██║   ██║██║╚██╗██║") + dim(" ██║     ██║   ██║██║  ██║██╔══╝  "),
		steel("  ██║ ╚═╝ ██║╚██████╔╝╚██████╔╝██║ ╚████║") + dim(" ╚██████╗╚██████╔╝██████╔╝███████╗"),
		steel("  ╚═╝     ╚═╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═══╝") + dim("  ╚═════╝ ╚═════╝ ╚═════╝ ╚══════╝"),
	];

	// Turkish flag crescent + star (right side accent)
	const flag = [
		red("        ██████    "),
		red("      ██      ██  ") + gold(" ★"),
		red("     ██        █  "),
		red("      ██      ██  "),
		red("        ██████    "),
	];

	// Tagline
	const tagline = bright("  En minimal.  En akıllı.  En az token.  En sade.");
	const version = dim("  v2026-21  ·  github.com/theayzek01/MoonCode");
	const hint    = dim("  /help  ·  /index  ·  /browser  ·  /ship  ·  Ctrl+C çıkış");

	// Separator
	const sep = dim("  " + "─".repeat(Math.min(width - 4, 70)));

	return [
		"",
		...logo,
		"",
		sep,
		tagline,
		version,
		sep,
		hint,
		"",
	];
}
