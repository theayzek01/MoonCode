import * as os from "node:os";
import chalk from "chalk";

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

export function buildInitialMessage(): { text: string } {
	const blue = chalk.hex("#7ab7ff");
	const dim = chalk.hex("#6f7a8f");
	const bright = chalk.hex("#e9eef8").bold;
	const bar = blue("=".repeat(52));

	const text = [
		"",
		blue("                          MOONCODE"),
		"",
		bright(`${getGreeting()}, ${getDisplayName()}.`),
		"",
		`      ${bar}`,
		`${dim("/help  |  /brain  |  /autothink  |  /mcp  |  /login")}`,
		"",
	].join("\n");

	return { text };
}
