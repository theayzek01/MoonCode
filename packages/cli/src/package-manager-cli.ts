// @ts-nocheck
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import chalk from "chalk";
import { spawn } from "child_process";
import { selectConfig } from "./cli/config-selector.js";
import {
	APP_NAME,
	getEngineDir,
	getSelfUpdateCommand,
	getSelfUpdateUnavailableInstruction,
	PACKAGE_NAME,
	type SelfUpdateCommand,
	VERSION,
} from "./config.js";
import { DefaultPackageManager } from "./core/package-manager.js";
import { SettingsManager } from "./core/settings-manager.js";
import { shouldUseWindowsShell } from "./utils/child-process.js";
import { getLatestMoonCodeVersion, isNewerPackageVersion } from "./utils/version-check.js";

export type PackageCommand = "install" | "remove" | "update" | "list";

type UpdateTarget = { type: "all" } | { type: "self" } | { type: "extensions"; source?: string };

interface PackageCommandOptions {
	command: PackageCommand;
	source?: string;
	updateTarget?: UpdateTarget;
	local: boolean;
	force: boolean;
	help: boolean;
	invalidOption?: string;
	invalidArgument?: string;
	missingOptionValue?: string;
	conflictingOptions?: string;
}

function reportSettingsErrors(settingsManager: SettingsManager, context: string): void {
	const errors = settingsManager.drainErrors();
	for (const { scope, error } of errors) {
		console.error(chalk.yellow(`Warning (${context}, ${scope} ayarları): ${error.message}`));
		if (error.stack) {
			console.error(chalk.dim(error.stack));
		}
	}
}

function getPackageCommandUsage(command: PackageCommand): string {
	switch (command) {
		case "install":
			return `${APP_NAME} install <source> [-l]`;
		case "remove":
			return `${APP_NAME} remove <source> [-l]`;
		case "update":
			return `${APP_NAME} update [source|self|Moon] [--self] [--extensions] [--extension <source>] [--force]`;
		case "list":
			return `${APP_NAME} list`;
	}
}

function printPackageCommandHelp(command: PackageCommand): void {
	switch (command) {
		case "install":
			console.log(`${chalk.bold("Kullanım:")}
  ${getPackageCommandUsage("install")}

Bir paket yükle ve ayarlara ekle.

Seçenekler:
  -l, --local    Projeye özel yükle (.mooncode/settings.json)

Örnekler:
  ${APP_NAME} install npm:@foo/bar
  ${APP_NAME} install git:github.com/user/repo
  ${APP_NAME} install git:git@github.com:user/repo
  ${APP_NAME} install https://github.com/user/repo
  ${APP_NAME} install ssh://git@github.com/user/repo
  ${APP_NAME} install ./yerel/yol
`);
			return;

		case "remove":
			console.log(`${chalk.bold("Kullanım:")}
  ${getPackageCommandUsage("remove")}

Bir paketi ve kaynağını ayarlardan kaldır.
Alternatif: ${APP_NAME} uninstall <kaynak> [-l]

Seçenekler:
  -l, --local    Proje ayarlarından kaldır (.mooncode/settings.json)

Örnekler:
  ${APP_NAME} remove npm:@foo/bar
  ${APP_NAME} uninstall npm:@foo/bar
`);
			return;

		case "update":
			console.log(`${chalk.bold("Kullanım:")}
  ${getPackageCommandUsage("update")}

Moon'u ve yüklü paketleri güncelle.

Seçenekler:
  --self                  Sadece Moon'u güncelle
  --extensions            Sadece yüklü paketleri güncelle
  --extension <kaynak>    Sadece bir paketi güncelle
  --force                 Mevcut sürüm güncel olsa bile Moon'u yeniden yükle

Kısa formlar:
  ${APP_NAME} update                Moon'u ve tüm eklentileri güncelle
  ${APP_NAME} update <kaynak>       Bir paketi güncelle
  ${APP_NAME} update Moon             Sadece Moon'u güncelle (self de alternatif olarak çalışır)
`);
			return;

		case "list":
			console.log(`${chalk.bold("Kullanım:")}
  ${getPackageCommandUsage("list")}

Kullanıcı ve proje ayarlarında yüklü olan paketleri listele.
`);
			return;
	}
}

function parsePackageCommand(args: string[]): PackageCommandOptions | undefined {
	const [rawCommand, ...rest] = args;
	let command: PackageCommand | undefined;
	if (rawCommand === "uninstall") {
		command = "remove";
	} else if (rawCommand === "install" || rawCommand === "remove" || rawCommand === "update" || rawCommand === "list") {
		command = rawCommand;
	}
	if (!command) {
		return undefined;
	}

	let local = false;
	let force = false;
	let help = false;
	let invalidOption: string | undefined;
	let invalidArgument: string | undefined;
	let missingOptionValue: string | undefined;
	let conflictingOptions: string | undefined;
	let source: string | undefined;
	let selfFlag = false;
	let extensionsFlag = false;
	let extensionFlagSource: string | undefined;

	for (let index = 0; index < rest.length; index++) {
		const arg = rest[index];
		if (arg === "-h" || arg === "--help") {
			help = true;
			continue;
		}

		if (arg === "-l" || arg === "--local") {
			if (command === "install" || command === "remove") {
				local = true;
			} else {
				invalidOption = invalidOption ?? arg;
			}
			continue;
		}

		if (arg === "--self") {
			if (command === "update") {
				selfFlag = true;
			} else {
				invalidOption = invalidOption ?? arg;
			}
			continue;
		}

		if (arg === "--extensions") {
			if (command === "update") {
				extensionsFlag = true;
			} else {
				invalidOption = invalidOption ?? arg;
			}
			continue;
		}

		if (arg === "--force") {
			if (command === "update") {
				force = true;
			} else {
				invalidOption = invalidOption ?? arg;
			}
			continue;
		}

		if (arg === "--extension") {
			if (command !== "update") {
				invalidOption = invalidOption ?? arg;
				continue;
			}

			const value = rest[index + 1];
			if (!value || value.startsWith("-")) {
				missingOptionValue = missingOptionValue ?? arg;
			} else if (extensionFlagSource) {
				conflictingOptions = conflictingOptions ?? "--extension sadece bir kez sağlanabilir";
				index++;
			} else {
				extensionFlagSource = value;
				index++;
			}
			continue;
		}

		if (arg.startsWith("-")) {
			invalidOption = invalidOption ?? arg;
			continue;
		}

		if (!source) {
			source = arg;
		} else {
			invalidArgument = invalidArgument ?? arg;
		}
	}

	let updateTarget: UpdateTarget | undefined;
	if (command === "update") {
		if (extensionFlagSource) {
			if (selfFlag || extensionsFlag) {
				conflictingOptions =
					conflictingOptions ?? "--extension seçeneği --self veya --extensions ile birlikte kullanılamaz";
			}
			if (source) {
				conflictingOptions =
					conflictingOptions ?? "--extension seçeneği konumsal bir kaynakla birlikte kullanılamaz";
			}
			updateTarget = { type: "extensions", source: extensionFlagSource };
		} else if (source) {
			const sourceIsSelf = source === "self" || source === "Moon";
			if (sourceIsSelf) {
				updateTarget = extensionsFlag ? { type: "all" } : { type: "self" };
			} else {
				if (extensionsFlag || selfFlag) {
					conflictingOptions =
						conflictingOptions ??
						"konumsal güncelleme hedefleri --self veya --extensions ile birlikte kullanılamaz";
				}
				updateTarget = { type: "extensions", source };
			}
		} else if (selfFlag && extensionsFlag) {
			updateTarget = { type: "all" };
		} else if (selfFlag) {
			updateTarget = { type: "self" };
		} else if (extensionsFlag) {
			updateTarget = { type: "extensions" };
		} else {
			updateTarget = { type: "all" };
		}
	}

	return {
		command,
		source,
		updateTarget,
		local,
		force,
		help,
		invalidOption,
		invalidArgument,
		missingOptionValue,
		conflictingOptions,
	};
}

function updateTargetIncludesSelf(target: UpdateTarget): boolean {
	return target.type === "all" || target.type === "self";
}

function updateTargetIncludesExtensions(target: UpdateTarget): boolean {
	return target.type === "all" || target.type === "extensions";
}

function printSelfUpdateUnavailable(npmCommand?: string[]): void {
	console.error("hata: MoonCode bu kurulumu paket yöneticisiyle otomatik güncelleyemiyor.");
	console.error(getSelfUpdateUnavailableInstruction(PACKAGE_NAME, npmCommand));

	const entrypoint = process.argv[1];
	if (entrypoint) {
		console.error("");
		console.error(`MoonCode yürütülebilir dosyasının konumu: ${entrypoint}`);
	}
}

function printSelfUpdateFallback(command: SelfUpdateCommand): void {
	console.error(chalk.dim(`Eğer bu hata devam ederse, şu komutu kendiniz çalıştırın: ${command.display}`));
}

async function shouldRunSelfUpdate(force: boolean): Promise<boolean> {
	if (force) {
		return true;
	}

	let latestVersion: string | undefined;
	try {
		latestVersion = await getLatestMoonCodeVersion(VERSION);
	} catch {
		return true;
	}

	if (!latestVersion || isNewerPackageVersion(latestVersion, VERSION)) {
		return true;
	}

	console.log(chalk.green(`${APP_NAME} zaten güncel (v${VERSION})`));
	return false;
}

async function runCommand(command: string, args: string[], display: string, cwd?: string): Promise<void> {
	await new Promise<void>((resolve, reject) => {
		const child = spawn(command, args, {
			cwd,
			stdio: "inherit",
			shell: shouldUseWindowsShell(command),
		});
		child.on("error", reject);
		child.on("close", (code, signal) => {
			if (code === 0) resolve();
			else if (signal) reject(new Error(`${display} ${signal} sinyaliyle sonlandırıldı`));
			else reject(new Error(`${display} ${code ?? "bilinmeyen"} koduyla çıktı`));
		});
	});
}

async function runSelfUpdate(command: SelfUpdateCommand): Promise<void> {
	console.log(chalk.dim(`${APP_NAME}, ${command.display} ile güncelleniyor...`));
	await runCommand(command.command, command.args, command.display);
}

async function runGitHubSelfUpdate(npmCommand?: string[]): Promise<void> {
	const [npmBin = "npm", ...npmArgs] = npmCommand ?? [];
	const dir = await mkdtemp(join(tmpdir(), "mooncode-update-"));
	try {
		console.log(chalk.dim("MoonCode GitHub'dan indiriliyor..."));
		await runCommand(
			"git",
			["clone", "--depth", "1", "https://github.com/theayzek01/MoonCode.git", dir],
			"git clone",
		);
		await runCommand(npmBin, [...npmArgs, "install"], `${npmBin} install`, dir);
		await runCommand(npmBin, [...npmArgs, "run", "build"], `${npmBin} run build`, dir);
		// Eski global paketleri temizle; hata verirse devam et.
		try {
			await runCommand(npmBin, [...npmArgs, "uninstall", "-g", "mooncli"], `${npmBin} uninstall -g mooncli`);
		} catch {}
		try {
			await runCommand(npmBin, [...npmArgs, "uninstall", "-g", "mooncode"], `${npmBin} uninstall -g mooncode`);
		} catch {}
		await runCommand(
			npmBin,
			[...npmArgs, "install", "-g", join(dir, "packages", "cli")],
			`${npmBin} install -g packages/cli`,
		);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}

export async function handleConfigCommand(args: string[]): Promise<boolean> {
	if (args[0] !== "config") {
		return false;
	}

	const cwd = process.cwd();
	const engineDir = getEngineDir();
	const settingsManager = SettingsManager.create(cwd, engineDir);
	reportSettingsErrors(settingsManager, "config command");
	const packageManager = new DefaultPackageManager({ cwd, engineDir, settingsManager });
	const resolvedPaths = await packageManager.resolve();

	await selectConfig({
		resolvedPaths,
		settingsManager,
		cwd,
		engineDir,
	});

	process.exit(0);
}

export async function handlePackageCommand(args: string[]): Promise<boolean> {
	const options = parsePackageCommand(args);
	if (!options) {
		return false;
	}

	if (options.help) {
		printPackageCommandHelp(options.command);
		return true;
	}

	if (options.invalidOption) {
		console.error(chalk.red(`"${options.command}" için bilinmeyen seçenek: ${options.invalidOption}.`));
		console.error(
			chalk.dim(`"${APP_NAME} --help" veya "${getPackageCommandUsage(options.command)}" komutunu kullanın.`),
		);
		process.exitCode = 1;
		return true;
	}

	if (options.missingOptionValue) {
		console.error(chalk.red(`${options.missingOptionValue} için değer eksik.`));
		console.error(chalk.dim(`Kullanım: ${getPackageCommandUsage(options.command)}`));
		process.exitCode = 1;
		return true;
	}

	if (options.invalidArgument) {
		console.error(chalk.red(`Beklenmeyen argüman: ${options.invalidArgument}.`));
		console.error(chalk.dim(`Kullanım: ${getPackageCommandUsage(options.command)}`));
		process.exitCode = 1;
		return true;
	}

	if (options.conflictingOptions) {
		console.error(chalk.red(options.conflictingOptions));
		console.error(chalk.dim(`Kullanım: ${getPackageCommandUsage(options.command)}`));
		process.exitCode = 1;
		return true;
	}

	const source = options.source;
	if ((options.command === "install" || options.command === "remove") && !source) {
		console.error(chalk.red(`${options.command} kaynağı eksik.`));
		console.error(chalk.dim(`Kullanım: ${getPackageCommandUsage(options.command)}`));
		process.exitCode = 1;
		return true;
	}

	const cwd = process.cwd();
	const engineDir = getEngineDir();
	const settingsManager = SettingsManager.create(cwd, engineDir);
	reportSettingsErrors(settingsManager, "paket komutu");
	const selfUpdateNpmCommand = settingsManager.getGlobalSettings().npmCommand;

	const packageManager = new DefaultPackageManager({ cwd, engineDir, settingsManager });

	packageManager.setProgressCallback((event) => {
		if (event.type === "start") {
			process.stdout.write(chalk.dim(`${event.message}\n`));
		}
	});

	try {
		switch (options.command) {
			case "install":
				await packageManager.installAndPersist(source!, { local: options.local });
				console.log(chalk.green(`${source} yüklendi`));
				return true;

			case "remove": {
				const removed = await packageManager.removeAndPersist(source!, { local: options.local });
				if (!removed) {
					console.error(chalk.red(`${source} için eşleşen paket bulunamadı`));
					process.exitCode = 1;
					return true;
				}
				console.log(chalk.green(`${source} kaldırıldı`));
				return true;
			}

			case "list": {
				const configuredPackages = packageManager.listConfiguredPackages();
				const userPackages = configuredPackages.filter((pkg) => pkg.scope === "user");
				const projectPackages = configuredPackages.filter((pkg) => pkg.scope === "project");

				if (configuredPackages.length === 0) {
					console.log(chalk.dim("Yüklü paket bulunamadı."));
					return true;
				}

				const formatPackage = (pkg: (typeof configuredPackages)[number]) => {
					const display = pkg.filtered ? `${pkg.source} (filtrelendi)` : pkg.source;
					console.log(`  ${display}`);
					if (pkg.installedPath) {
						console.log(chalk.dim(`    ${pkg.installedPath}`));
					}
				};

				if (userPackages.length > 0) {
					console.log(chalk.bold("Kullanıcı paketleri:"));
					for (const pkg of userPackages) {
						formatPackage(pkg);
					}
				}

				if (projectPackages.length > 0) {
					if (userPackages.length > 0) console.log();
					console.log(chalk.bold("Proje paketleri:"));
					for (const pkg of projectPackages) {
						formatPackage(pkg);
					}
				}

				return true;
			}

			case "update": {
				const target = options.updateTarget ?? { type: "all" };
				if (updateTargetIncludesExtensions(target)) {
					const updateSource = target.type === "extensions" ? target.source : undefined;
					await packageManager.update(updateSource);
					if (updateSource) {
						console.log(chalk.green(`${updateSource} güncellendi`));
					} else {
						console.log(chalk.green("Paketler güncellendi"));
					}
				}
				if (updateTargetIncludesSelf(target)) {
					if (!(await shouldRunSelfUpdate(options.force))) {
						return true;
					}
					const selfUpdateCommand = getSelfUpdateCommand(PACKAGE_NAME, selfUpdateNpmCommand);
					try {
						if (selfUpdateCommand) await runSelfUpdate(selfUpdateCommand);
						else await runGitHubSelfUpdate(selfUpdateNpmCommand);
					} catch (error: unknown) {
						const message = error instanceof Error ? error.message : "Bilinmeyen paket komutu hatası";
						console.error(chalk.red(`Error: ${message}`));
						if (selfUpdateCommand) printSelfUpdateFallback(selfUpdateCommand);
						else printSelfUpdateUnavailable(selfUpdateNpmCommand);
						process.exitCode = 1;
						return true;
					}
					console.log(
						chalk.green(`${APP_NAME} güncellendi. Yeni terminalde 'mooncode' veya 'mooncli' çalıştırın.`),
					);
				}
				return true;
			}
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : "Bilinmeyen paket komutu hatası";
		console.error(chalk.red(`Error: ${message}`));
		process.exitCode = 1;
		return true;
	}
}
