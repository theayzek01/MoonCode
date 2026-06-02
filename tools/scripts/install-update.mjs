import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const isWindows = process.platform === "win32";
const npm = isWindows ? "npm.cmd" : "npm";

function run(command, args, options = {}) {
	const label = [command, ...args].join(" ");
	console.log(`\n> ${label}`);
	const result = spawnSync(command, args, {
		cwd: root,
		stdio: "inherit",
		shell: false,
		...options,
	});
	if (result.status !== 0) {
		process.exit(result.status ?? 1);
	}
}

if (!existsSync(join(root, "package.json")) || !existsSync(join(root, "packages", "cli", "package.json"))) {
	console.error("Run this from the MoonCode repository root.");
	process.exit(1);
}

if (existsSync(join(root, ".git"))) {
	run("git", ["fetch", "--all", "--prune"]);
	run("git", ["checkout", "launch/mooncode"]);
	run("git", ["pull", "--ff-only", "origin", "launch/mooncode"]);
}

run(npm, ["install"]);
run(npm, ["run", "build"]);
run(npm, ["install", "-g", isWindows ? ".\\packages\\cli" : "./packages/cli"]);
run("mooncode", ["--version"], { shell: isWindows });

console.log("\nMoonCode is ready. Start it with: mooncode");
