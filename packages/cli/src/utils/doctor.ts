// @ts-nocheck
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import chalk from "chalk";
import {
	APP_NAME,
	detectInstallMethod,
	getEngineDir,
	getPackageDir,
	getSelfUpdateCommand,
	getSelfUpdateUnavailableInstruction,
	PACKAGE_NAME,
	VERSION,
} from "../config.js";

function run(command: string, args: string[]): { status: number | null; stdout: string; stderr: string } {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		shell: process.platform === "win32",
	});
	return { status: result.status, stdout: result.stdout?.trim() ?? "", stderr: result.stderr?.trim() ?? "" };
}

function lines(text: string): string[] {
	return text
		.split(/\r?\n/)
		.map((x) => x.trim())
		.filter(Boolean);
}

function readPackageVersion(path: string): string | undefined {
	try {
		const pkgPath = join(path, "package.json");
		if (!existsSync(pkgPath)) return undefined;
		const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
		return typeof pkg.version === "string" ? pkg.version : undefined;
	} catch {
		return undefined;
	}
}

function resolveCommandCandidates(command: string): string[] {
	if (process.platform === "win32") {
		return lines(run("where", [command]).stdout);
	}
	return lines(run("which", ["-a", command]).stdout);
}

function unique<T>(items: T[]): T[] {
	return [...new Set(items)];
}

export function printDoctor(): void {
	const packageDir = getPackageDir();
	const packageVersion = readPackageVersion(packageDir);
	const method = detectInstallMethod();
	const selfUpdate = getSelfUpdateCommand(PACKAGE_NAME);
	const candidates = unique([
		...resolveCommandCandidates("mooncode"),
		...resolveCommandCandidates("moon"),
		...resolveCommandCandidates("mooncli"),
	]);

	console.log(chalk.bold(`${APP_NAME} Doctor`));
	console.log(
		`Version        : ${VERSION}${packageVersion && packageVersion !== VERSION ? ` (package.json: ${packageVersion})` : ""}`,
	);
	console.log(`Package        : ${PACKAGE_NAME}`);
	console.log(`Install method : ${method}`);
	console.log(`Runtime        : ${process.execPath}`);
	console.log(`Package dir    : ${packageDir}`);
	console.log(`Engine dir     : ${getEngineDir()}`);
	console.log(`Node           : ${process.version}`);
	console.log(`Platform       : ${process.platform} ${process.arch}`);

	console.log(chalk.bold("\nPATH üzerindeki mooncode/moon/mooncli adayları:"));
	if (candidates.length === 0) {
		console.log(chalk.yellow("  Bulunamadı. Terminal PATH ayarını kontrol et."));
	} else {
		for (const candidate of candidates) {
			const marker = candidate === process.argv[1] ? chalk.green("aktif") : "";
			console.log(`  - ${candidate}${marker ? ` ${marker}` : ""}`);
		}
	}

	console.log(chalk.bold("\nGüncelleme:"));
	if (selfUpdate) {
		console.log(`  ${selfUpdate.display}`);
	} else {
		console.log(`  ${getSelfUpdateUnavailableInstruction(PACKAGE_NAME)}`);
	}

	const activeDir = dirname(process.argv[1] || "");
	if (candidates.length > 1) {
		console.log(
			chalk.yellow(
				"\nWarning: PATH üzerinde birden fazla Moon bulundu. Eski sürüm görünüyorsa ilk sıradaki wrapper'ı kaldır veya PATH sırasını düzelt.",
			),
		);
	}
	if (packageVersion && packageVersion !== VERSION) {
		console.log(
			chalk.red(
				"\nWarning: Derlenmiş VERSION ile package.json sürümü farklı. `npm run build --workspace=packages/cli` çalıştır.",
			),
		);
	}
	console.log(chalk.dim(`\nAktif argv[1]: ${process.argv[1] || activeDir}`));
}
