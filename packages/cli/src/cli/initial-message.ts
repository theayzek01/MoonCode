// @ts-nocheck
import os from "node:os";
import chalk from "chalk";

export function buildInitialMessage(): { text: string } {
	const platform = os.platform();
	const arch = os.arch();
	const release = os.release();
	const cpu = os.cpus()[0]?.model || "Unknown CPU";
	const totalMem = `${Math.round(os.totalmem() / (1024 * 1024 * 1024))}GB`;

	const cyan = chalk.hex("#05D5FF");
	const magenta = chalk.hex("#FF0099");
	const amber = chalk.hex("#FFB86C");
	const dim = chalk.gray;
	const bold = chalk.bold;

	const sysInfo = [
		`${cyan("◆")} ${bold("SOFTWARE")}  MoonAgent Hyper-Engine ${bold("1.26-v2")}`,
		`${cyan("◆")} ${bold("HARDWARE")}  ${cpu} (${arch})`,
		`${cyan("◆")} ${bold("RESOURCES")} ${totalMem} Unified Memory`,
		`${cyan("◆")} ${bold("RUNTIME")}   ${platform} ${release}`,
	].join("\n   ");

	const divider = dim("─".repeat(50));

	const introText = `
   ${magenta.bold("MOONAGENT OS [READY]")}
   ${dim("Establishing Neural Bridge...")}

   ${sysInfo}

   ${divider}
   ${magenta("●")} ${bold("CORE OBJECTIVES")}
   ${dim("1. Multi-Agent Coordination")}
   ${dim("2. Autonomous Problem Solving")}
   ${dim("3. Semantic Codebase Intelligence")}

   ${amber("»")} ${bold("HYPER-INTELLIGENCE MODE ACTIVE")}
   ${dim("Type")} ${cyan("/")} ${dim("for command pallete • Press")} ${cyan("Ctrl+Space")} ${dim("for autocomplete")}
	`;

	return { text: introText };
}
