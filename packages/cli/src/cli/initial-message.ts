import chalk from "chalk";

export function buildInitialMessage(): { text: string } {
	const blue = chalk.hex("#7ab7ff");
	const dim = chalk.hex("#6f7a8f");
	const bright = chalk.hex("#e9eef8").bold;
	const bar = blue("=".repeat(52));

	const text = [
		"",
		blue("                          MOONAGENT"),
		"",
		bright("Minimal agent. Strong taste. Small tokens. Sharp output."),
		bright("Terminal coding agent with MCP, Browser Bridge, and tools."),
		"",
		`      ${bar}`,
		`      ${dim("1.26-v2  |  github.com/theayzek01/MoonAgent")}`,
		`      ${bar}`,
		`${dim("/help  |  /index  |  /browser  |  /ship  |  Ctrl+C")}`,
		"",
	].join("\n");

	return { text };
}
