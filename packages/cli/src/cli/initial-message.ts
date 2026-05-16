// @ts-nocheck
import os from "node:os";
import chalk from "chalk";
import { APP_TITLE, VERSION } from "../config.js";

export function buildInitialMessage(): { text: string } {
	const platform = os.platform();
	const arch = os.arch();
	const release = os.release();
	const cpu = os.cpus()[0]?.model || "Unknown CPU";
	const totalMem = `${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB`;

	const accent = chalk.hex("#D08A7A");
	const dim = chalk.gray;
	const bold = chalk.bold;

	const logo = `
   ${accent("")}  ${bold(APP_TITLE.toUpperCase())}
   ${dim(`Version ${VERSION}`)}
	`;

	const sysInfo = [
		`${dim("Software:")}  MoonCode Engine v${VERSION}`,
		`${dim("Hardware:")}  ${cpu} (${arch})`,
		`${dim("Memory:")}    ${totalMem} unified`,
		`${dim("System:")}    ${platform} ${release}`,
	].join("\n   ");

	const divider = dim("─".repeat(40));

	const introText = `
${logo}
   ${sysInfo}

   ${divider}
   ${accent("●")} ${bold("MOONCODE - HYPER-INTELLIGENCE MODE")}
   ${dim("Optimized for all models (Low/High Latency)")}
   ${dim("Type")} ${accent("/")} ${dim("to see all 40+ commands")}
	`;

	return { text: introText };
}
