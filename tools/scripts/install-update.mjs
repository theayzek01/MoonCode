import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const scriptName = isWindows ? "setup.bat" : "setup.sh";
const scriptPath = join(root, scriptName);

if (!existsSync(scriptPath)) {
	console.error(`Could not find ${scriptName} in the current repository root.`);
	process.exit(1);
}

const command = isWindows ? "cmd" : "bash";
const args = isWindows ? ["/c", scriptPath, "install"] : [scriptPath, "install"];

const result = spawnSync(command, args, {
	cwd: root,
	stdio: "inherit",
	shell: false,
});

process.exit(result.status ?? 1);
