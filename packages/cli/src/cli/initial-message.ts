import chalk from "chalk";

export function buildInitialMessage(): { text: string } {
	const blue = chalk.hex("#7ab7ff");
	const dim = chalk.hex("#6f7a8f");
	const bright = chalk.hex("#e9eef8").bold;
	const bar = blue("=".repeat(52));

	const text = [
		"",
		blue("                          MOONCODE"),
		"",
		bright("Fast coding agent. Clean tools. Quiet output."),
		bright("Terminal coding agent with MCP, Browser Bridge, and DreamKernel."),
		"",
		`      ${bar}`,
		`${dim("/help  |  /models  |  /mcp  |  /login  |  Ctrl+C")}`,
		"",
	].join("\n");

	return { text };
}
