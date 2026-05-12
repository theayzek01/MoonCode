// @ts-nocheck
/**
 * Main entry point for the coding engine CLI.
 *
 * This file handles CLI argument parsing and translates them into
 * createEngineSession() options. The SDK does the heavy lifting.
 */

import { resolve } from "node:path";
import { createInterface } from "node:readline";
import chalk from "chalk";
import { type ImageContent, modelsAreEqual } from "moon-core";
import { ProcessTerminal, setKeybindings, TUI } from "moon-tui";
import { type Args, type Mode, parseArgs, printHelp } from "./cli/args.js";
import { processFileArguments } from "./cli/file-processor.js";
import { buildInitialMessage } from "./cli/initial-message.js";
import { listModels } from "./cli/list-models.js";
import { selectSession } from "./cli/session-picker.js";
import { ENV_SESSION_DIR, expandTildePath, getEngineDir, VERSION } from "./config.js";
import { formatNoModelsAvailableMessage } from "./core/auth-guidance.js";
import { AuthStorage } from "./core/auth-storage.js";
import { getBrowserBridgeStatus, startBrowserBridgeServer } from "./core/browser-bridge-server.js";
import { type CreateEngineSessionRuntimeFactory, createEngineSessionRuntime } from "./core/engine-session-runtime.js";
import {
	createEngineSessionFromServices,
	createEngineSessionServices,
	type EngineSessionRuntimeDiagnostic,
} from "./core/engine-session-services.js";
import { exportFromFile } from "./core/export-html/index.js";
import type { ExtensionFactory } from "./core/extensions/types.js";
import { KeybindingsManager } from "./core/keybindings.js";
import type { ModelRegistry } from "./core/model-registry.js";
import { normalizeProviderId, resolveCliModel, resolveModelScope, type ScopedModel } from "./core/model-resolver.js";
import { checkModelAvailability, handleOllamaCommand, pullModel } from "./core/ollama-optimizer.js";
import { restoreStdout, takeOverStdout } from "./core/output-guard.js";
import type { CreateEngineSessionOptions } from "./core/sdk.js";
import {
	formatMissingSessionCwdPrompt,
	getMissingSessionCwdIssue,
	MissingSessionCwdError,
	type SessionCwdIssue,
} from "./core/session-cwd.js";
import { SessionManager } from "./core/session-manager.js";
import { SettingsManager } from "./core/settings-manager.js";
import { printTimings, resetTimings, time } from "./core/timings.js";
import { runMigrations, showDeprecationWarnings } from "./migrations.js";
import { InteractiveMode, runHeadlessMode, runPrintMode, runRpcMode } from "./modes/index.js";
import { ExtensionSelectorComponent } from "./modes/interactive/components/extension-selector.js";
import { initTheme, stopThemeWatcher } from "./modes/interactive/theme/theme.js";
import { handleConfigCommand, handlePackageCommand } from "./package-manager-cli.js";
import { printDoctor } from "./utils/doctor.js";
import { isLocalPath } from "./utils/paths.js";

/**
 * Read all content from piped stdin.
 * Returns undefined if stdin is a TTY (interactive terminal).
 */
async function readPipedStdin(): Promise<string | undefined> {
	// If stdin is a TTY, we're running interactively - don't read stdin
	if (process.stdin.isTTY) {
		return undefined;
	}

	return new Promise((resolve) => {
		let data = "";
		process.stdin.setEncoding("utf8");
		process.stdin.on("data", (chunk) => {
			data += chunk;
		});
		process.stdin.on("end", () => {
			resolve(data.trim() || undefined);
		});
		process.stdin.resume();
	});
}

function collectSettingsDiagnostics(
	settingsManager: SettingsManager,
	context: string,
): EngineSessionRuntimeDiagnostic[] {
	return settingsManager.drainErrors().map(({ scope, error }) => ({
		type: "warning",
		message: `(${context}, ${scope} settings) ${error.message}`,
	}));
}

function reportDiagnostics(diagnostics: readonly EngineSessionRuntimeDiagnostic[]): void {
	for (const diagnostic of diagnostics) {
		const color = diagnostic.type === "error" ? chalk.red : diagnostic.type === "warning" ? chalk.yellow : chalk.dim;
		const prefix = diagnostic.type === "error" ? "Hata: " : diagnostic.type === "warning" ? "Uyarı: " : "";
		console.error(color(`${prefix}${diagnostic.message}`));
	}
}

function isTruthyEnvFlag(value: string | undefined): boolean {
	if (!value) return false;
	return value === "1" || value.toLowerCase() === "true" || value.toLowerCase() === "yes";
}

type AppMode = "interactive" | "print" | "json" | "rpc" | "headless";

function resolveAppMode(parsed: Args, stdinIsTTY: boolean): AppMode {
	if (parsed.headless) {
		return "headless";
	}
	if (parsed.mode === "rpc") {
		return "rpc";
	}
	if (parsed.mode === "json") {
		return "json";
	}
	if (parsed.print || !stdinIsTTY) {
		return "print";
	}
	return "interactive";
}

function toPrintOutputMode(appMode: AppMode): Exclude<Mode, "rpc"> {
	return appMode === "json" ? "json" : "text";
}

async function prepareInitialMessage(
	parsed: Args,
	autoResizeImages: boolean,
	stdinContent?: string,
): Promise<{
	initialMessage?: string;
	initialImages?: ImageContent[];
}> {
	if (parsed.fileArgs.length === 0) {
		return buildInitialMessage({ parsed, stdinContent });
	}

	const { text, images } = await processFileArguments(parsed.fileArgs, { autoResizeImages });
	return buildInitialMessage({
		parsed,
		fileText: text,
		fileImages: images,
		stdinContent,
	});
}

/** Result from resolving a session argument */
type ResolvedSession =
	| { type: "path"; path: string } // Direct file path
	| { type: "local"; path: string } // Found in current project
	| { type: "global"; path: string; cwd: string } // Found in different project
	| { type: "not_found"; arg: string }; // Not found anywhere

/**
 * Resolve a session argument to a file path.
 * If it looks like a path, use as-is. Otherwise try to match as session ID prefix.
 */
async function resolveSessionPath(sessionArg: string, cwd: string, sessionDir?: string): Promise<ResolvedSession> {
	// If it looks like a file path, use as-is
	if (sessionArg.includes("/") || sessionArg.includes("\\") || sessionArg.endsWith(".jsonl")) {
		return { type: "path", path: sessionArg };
	}

	// Try to match as session ID in current project first
	const localSessions = await SessionManager.list(cwd, sessionDir);
	const localMatches = localSessions.filter((s) => s.id.startsWith(sessionArg));

	if (localMatches.length >= 1) {
		return { type: "local", path: localMatches[0].path };
	}

	// Try global search across all projects
	const allSessions = await SessionManager.listAll();
	const globalMatches = allSessions.filter((s) => s.id.startsWith(sessionArg));

	if (globalMatches.length >= 1) {
		const match = globalMatches[0];
		return { type: "global", path: match.path, cwd: match.cwd };
	}

	// Not found anywhere
	return { type: "not_found", arg: sessionArg };
}

/** Prompt user for yes/no confirmation */
async function promptConfirm(message: string): Promise<boolean> {
	return new Promise((resolve) => {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});
		rl.question(`${message} [y/N] `, (answer) => {
			rl.close();
			resolve(
				answer.toLowerCase() === "y" ||
					answer.toLowerCase() === "yes" ||
					answer.toLowerCase() === "e" ||
					answer.toLowerCase() === "evet",
			);
		});
	});
}

function validateForkFlags(parsed: Args): void {
	if (!parsed.fork) return;

	const conflictingFlags = [
		parsed.session ? "--session" : undefined,
		parsed.continue ? "--continue" : undefined,
		parsed.resume ? "--resume" : undefined,
		parsed.noSession ? "--no-session" : undefined,
	].filter((flag): flag is string => flag !== undefined);

	if (conflictingFlags.length > 0) {
		console.error(chalk.red(`Error: --fork cannot be combined with ${conflictingFlags.join(", ")}`));
		process.exit(1);
	}
}

function forkSessionOrExit(sourcePath: string, cwd: string, sessionDir?: string): SessionManager {
	try {
		return SessionManager.forkFrom(sourcePath, cwd, sessionDir);
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		console.error(chalk.red(`Hata: ${message}`));
		process.exit(1);
	}
}

async function createSessionManager(
	parsed: Args,
	cwd: string,
	sessionDir: string | undefined,
	settingsManager: SettingsManager,
): Promise<SessionManager> {
	if (parsed.noSession) {
		return SessionManager.inMemory();
	}

	if (parsed.fork) {
		const resolved = await resolveSessionPath(parsed.fork, cwd, sessionDir);

		switch (resolved.type) {
			case "path":
			case "local":
			case "global":
				return forkSessionOrExit(resolved.path, cwd, sessionDir);

			case "not_found":
				console.error(chalk.red(`'${resolved.arg}' ile eşleşen oturum bulunamadı`));
				process.exit(1);
		}
	}

	if (parsed.session) {
		const resolved = await resolveSessionPath(parsed.session, cwd, sessionDir);

		switch (resolved.type) {
			case "path":
			case "local":
				return SessionManager.open(resolved.path, sessionDir);

			case "global": {
				console.log(chalk.yellow(`Oturum farklı bir projede bulundu: ${resolved.cwd}`));
				const shouldFork = await promptConfirm("Bu oturumu mevcut dizine çatallamak ister misiniz?");
				if (!shouldFork) {
					console.log(chalk.dim("İptal edildi."));
					process.exit(0);
				}
				return forkSessionOrExit(resolved.path, cwd, sessionDir);
			}

			case "not_found":
				console.error(chalk.red(`'${resolved.arg}' ile eşleşen oturum bulunamadı`));
				process.exit(1);
		}
	}

	if (parsed.resume) {
		initTheme(settingsManager.getTheme(), true);
		try {
			const selectedPath = await selectSession(
				(onProgress) => SessionManager.list(cwd, sessionDir, onProgress),
				SessionManager.listAll,
			);
			if (!selectedPath) {
				console.log(chalk.dim("Hiçbir oturum seçilmedi"));
				process.exit(0);
			}
			return SessionManager.open(selectedPath, sessionDir);
		} finally {
			stopThemeWatcher();
		}
	}

	if (parsed.continue) {
		return SessionManager.continueRecent(cwd, sessionDir);
	}

	return SessionManager.create(cwd, sessionDir);
}

function buildSessionOptions(
	parsed: Args,
	scopedModels: ScopedModel[],
	hasExistingSession: boolean,
	modelRegistry: ModelRegistry,
	settingsManager: SettingsManager,
): {
	options: CreateEngineSessionOptions;
	cliThinkingFromModel: boolean;
	diagnostics: EngineSessionRuntimeDiagnostic[];
} {
	const options: CreateEngineSessionOptions = {};
	const diagnostics: EngineSessionRuntimeDiagnostic[] = [];
	let cliThinkingFromModel = false;
	const canonicalCliProvider = normalizeProviderId(parsed.provider);

	// Model from CLI
	// - supports --provider <name> --model <pattern>
	// - supports --model <provider>/<pattern>
	if (parsed.model) {
		const resolved = resolveCliModel({
			cliProvider: canonicalCliProvider,
			cliModel: parsed.model,
			modelRegistry,
		});
		if (resolved.warning) {
			diagnostics.push({ type: "warning", message: resolved.warning });
		}
		if (resolved.error) {
			diagnostics.push({ type: "error", message: resolved.error });
		}
		if (resolved.model) {
			options.model = resolved.model;
			// Allow "--model <pattern>:<thinking>" as a shorthand.
			// Explicit --thinking still takes precedence (applied later).
			if (!parsed.thinking && resolved.thinkingLevel) {
				options.thinkingLevel = resolved.thinkingLevel;
				cliThinkingFromModel = true;
			}
		}
	}

	if (!options.model && scopedModels.length > 0 && !hasExistingSession) {
		// Check if saved default is in scoped models - use it if so, otherwise first scoped model
		const savedProvider = normalizeProviderId(settingsManager.getDefaultProvider());
		const savedModelId = settingsManager.getDefaultModel();
		const savedModel = savedProvider && savedModelId ? modelRegistry.find(savedProvider, savedModelId) : undefined;
		const savedInScope = savedModel ? scopedModels.find((sm) => modelsAreEqual(sm.model, savedModel)) : undefined;

		if (savedInScope) {
			options.model = savedInScope.model;
			// Use thinking level from scoped model config if explicitly set
			if (!parsed.thinking && savedInScope.thinkingLevel) {
				options.thinkingLevel = savedInScope.thinkingLevel;
			}
		} else {
			options.model = scopedModels[0].model;
			// Use thinking level from first scoped model if explicitly set
			if (!parsed.thinking && scopedModels[0].thinkingLevel) {
				options.thinkingLevel = scopedModels[0].thinkingLevel;
			}
		}
	}

	// Thinking level from CLI (takes precedence over scoped model thinking levels set above)
	if (parsed.thinking) {
		options.thinkingLevel = parsed.thinking;
	}

	// Scoped models for Ctrl+P cycling
	// Keep thinking level undefined when not explicitly set in the model pattern.
	// Undefined means "inherit current session thinking level" during cycling.
	if (scopedModels.length > 0) {
		options.scopedModels = scopedModels.map((sm) => ({
			model: sm.model,
			thinkingLevel: sm.thinkingLevel,
		}));
	}

	// API key from CLI - set in authStorage
	// (handled by caller before createEngineSession)

	// Tools
	if (parsed.noTools) {
		options.noTools = "all";
	} else if (parsed.noBuiltinTools) {
		options.noTools = "builtin";
	}
	if (parsed.tools) {
		options.tools = [...parsed.tools];
	}

	return { options, cliThinkingFromModel, diagnostics };
}

function resolveCliPaths(cwd: string, paths: string[] | undefined): string[] | undefined {
	return paths?.map((value) => (isLocalPath(value) ? resolve(cwd, value) : value));
}

async function promptForMissingSessionCwd(
	issue: SessionCwdIssue,
	settingsManager: SettingsManager,
): Promise<string | undefined> {
	initTheme(settingsManager.getTheme());
	setKeybindings(KeybindingsManager.create());

	return new Promise((resolve) => {
		const ui = new TUI(new ProcessTerminal(), settingsManager.getShowHardwareCursor());
		ui.setClearOnShrink(settingsManager.getClearOnShrink());

		let settled = false;
		const finish = (result: string | undefined) => {
			if (settled) {
				return;
			}
			settled = true;
			ui.stop();
			resolve(result);
		};

		const selector = new ExtensionSelectorComponent(
			formatMissingSessionCwdPrompt(issue),
			["Devam Et", "İptal"],
			(option) => finish(option === "Devam Et" ? issue.fallbackCwd : undefined),
			() => finish(undefined),
			{ tui: ui },
		);
		ui.addChild(selector);
		ui.setFocus(selector);
		ui.start();
	});
}

export interface MainOptions {
	extensionFactories?: ExtensionFactory[];
}

export async function main(args: string[], options?: MainOptions) {
	resetTimings();

	if (args[0] === "browser-bridge") {
		const status = startBrowserBridgeServer({ keepAlive: true });
		console.log(`MoonCode Browser Bridge listening on ws://127.0.0.1:${status.port}/ws`);
		console.log(`Health: http://127.0.0.1:${status.port}/health`);
		process.on("SIGINT", () => process.exit(0));
		await new Promise(() => {});
		return;
	}

	if (args[0] === "doctor") {
		printDoctor();
		return;
	}

	startBrowserBridgeServer();

	const offlineMode = args.includes("--offline") || isTruthyEnvFlag(process.env.PI_OFFLINE);
	if (offlineMode) {
		process.env.PI_OFFLINE = "1";
		process.env.PI_SKIP_VERSION_CHECK = "1";
	}

	if (await handlePackageCommand(args)) {
		return;
	}

	if (await handleConfigCommand(args)) {
		return;
	}

	if (await handleOllamaCommand(args)) {
		return;
	}

	if (args[0] === "olm" && args[1]) {
		const modelName = args[1];
		args.splice(0, 2, "--provider", "ollama", "--model", modelName);
	}

	const parsed = parseArgs(args);
	if (parsed.diagnostics.length > 0) {
		for (const d of parsed.diagnostics) {
			const color = d.type === "error" ? chalk.red : chalk.yellow;
			console.error(color(`${d.type === "error" ? "Hata" : "Uyarı"}: ${d.message}`));
		}
		if (parsed.diagnostics.some((d) => d.type === "error")) {
			process.exit(1);
		}
	}
	time("parseArgs");
	let appMode = resolveAppMode(parsed, process.stdin.isTTY);
	const shouldTakeOverStdout = appMode !== "interactive";
	if (shouldTakeOverStdout) {
		takeOverStdout();
	}

	if (parsed.version) {
		if (parsed.verbose) {
			console.log(`${VERSION} (${process.argv[1]})`);
		} else {
			console.log(VERSION);
		}
		process.exit(0);
	}

	if (parsed.messages.length === 1 && parsed.messages[0] === "browser-status") {
		console.log(JSON.stringify(getBrowserBridgeStatus(), null, 2));
		process.exit(0);
	}

	if (parsed.provider === "ollama" && parsed.model && !parsed.headless) {
		try {
			const available = await checkModelAvailability(parsed.model);
			if (!available && (await promptConfirm(`Ollama model yok: ${parsed.model}. Çekeyim mi?`))) {
				await pullModel(parsed.model, (event) => {
					const pct = event.total ? ` ${Math.round((event.completed / event.total) * 100)}%` : "";
					if (event.status) process.stderr.write(`\r${event.status}${pct}     `);
				});
				process.stderr.write("\n");
			}
		} catch {
			// Ollama kapalıysa normal hata akışına bırak.
		}
	}

	if (parsed.export) {
		let result: string;
		try {
			const outputPath = parsed.messages.length > 0 ? parsed.messages[0] : undefined;
			result = await exportFromFile(parsed.export, outputPath);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : "Oturum dışa aktarılamadı";
			console.error(chalk.red(`Hata: ${message}`));
			process.exit(1);
		}
		console.log(`Şuraya aktarıldı: ${result}`);
		process.exit(0);
	}

	if (parsed.mode === "rpc" && parsed.fileArgs.length > 0) {
		console.error(chalk.red("Hata: @dosya argümanları RPC modunda desteklenmez"));
		process.exit(1);
	}

	validateForkFlags(parsed);

	// Run migrations (pass cwd for project-local migrations)
	const { migratedAuthProviders: migratedProviders, deprecationWarnings } = runMigrations(process.cwd());
	time("runMigrations");

	const cwd = process.cwd();
	const engineDir = getEngineDir();
	const startupSettingsManager = SettingsManager.create(cwd, engineDir);
	reportDiagnostics(collectSettingsDiagnostics(startupSettingsManager, "startup session lookup"));

	// Decide the final runtime cwd before creating cwd-bound runtime services.
	// --session and --resume may select a session from another project, so project-local
	// settings, resources, provider registrations, and models must be resolved only after
	// the target session cwd is known. The startup-cwd settings manager is used only for
	// sessionDir lookup during session selection.
	const envSessionDir = process.env[ENV_SESSION_DIR];
	const sessionDir =
		parsed.sessionDir ??
		(envSessionDir ? expandTildePath(envSessionDir) : undefined) ??
		startupSettingsManager.getSessionDir();
	let sessionManager = await createSessionManager(parsed, cwd, sessionDir, startupSettingsManager);
	const missingSessionCwdIssue = getMissingSessionCwdIssue(sessionManager, cwd);
	if (missingSessionCwdIssue) {
		if (appMode === "interactive") {
			const selectedCwd = await promptForMissingSessionCwd(missingSessionCwdIssue, startupSettingsManager);
			if (!selectedCwd) {
				process.exit(0);
			}
			sessionManager = SessionManager.open(missingSessionCwdIssue.sessionFile!, sessionDir, selectedCwd);
		} else {
			console.error(chalk.red(new MissingSessionCwdError(missingSessionCwdIssue).message));
			process.exit(1);
		}
	}
	time("createSessionManager");

	const resolvedExtensionPaths = resolveCliPaths(cwd, parsed.extensions);
	const resolvedSkillPaths = resolveCliPaths(cwd, parsed.skills);
	const resolvedPromptTemplatePaths = resolveCliPaths(cwd, parsed.promptTemplates);
	const resolvedThemePaths = resolveCliPaths(cwd, parsed.themes);
	const authStorage = AuthStorage.create();
	const createRuntime: CreateEngineSessionRuntimeFactory = async ({
		cwd,
		engineDir,
		sessionManager,
		sessionStartEvent,
	}) => {
		const services = await createEngineSessionServices({
			cwd,
			engineDir,
			authStorage,
			extensionFlagValues: parsed.unknownFlags,
			resourceLoaderOptions: {
				additionalExtensionPaths: resolvedExtensionPaths,
				additionalSkillPaths: resolvedSkillPaths,
				additionalPromptTemplatePaths: resolvedPromptTemplatePaths,
				additionalThemePaths: resolvedThemePaths,
				noExtensions: parsed.noExtensions,
				noSkills: parsed.noSkills,
				noPromptTemplates: parsed.noPromptTemplates,
				noThemes: parsed.noThemes,
				noContextFiles: parsed.noContextFiles,
				systemPrompt: parsed.systemPrompt,
				appendSystemPrompt: parsed.appendSystemPrompt,
				extensionFactories: options?.extensionFactories,
			},
		});
		const { settingsManager, modelRegistry, resourceLoader } = services;
		const diagnostics: EngineSessionRuntimeDiagnostic[] = [
			...services.diagnostics,
			...collectSettingsDiagnostics(settingsManager, "runtime oluşturma"),
			...resourceLoader.getExtensions().errors.map(({ path, error }) => ({
				type: "error" as const,
				message: `"${path}" eklentisi yüklenemedi: ${error}`,
			})),
		];

		const modelPatterns = parsed.models ?? settingsManager.getEnabledModels();
		const scopedModels =
			modelPatterns && modelPatterns.length > 0 ? await resolveModelScope(modelPatterns, modelRegistry) : [];
		const {
			options: sessionOptions,
			cliThinkingFromModel,
			diagnostics: sessionOptionDiagnostics,
		} = buildSessionOptions(
			parsed,
			scopedModels,
			sessionManager.buildSessionContext().messages.length > 0,
			modelRegistry,
			settingsManager,
		);
		diagnostics.push(...sessionOptionDiagnostics);

		if (parsed.apiKey) {
			if (!sessionOptions.model) {
				diagnostics.push({
					type: "error",
					message:
						"--api-key için --model, --provider/--model veya --models aracılığıyla bir model belirtilmelidir",
				});
			} else {
				authStorage.setRuntimeApiKey(sessionOptions.model.provider, parsed.apiKey);
			}
		}

		const created = await createEngineSessionFromServices({
			services,
			sessionManager,
			sessionStartEvent,
			model: sessionOptions.model,
			thinkingLevel: sessionOptions.thinkingLevel,
			scopedModels: sessionOptions.scopedModels,
			tools: sessionOptions.tools,
			noTools: sessionOptions.noTools,
			customTools: sessionOptions.customTools,
		});
		const cliThinkingOverride = parsed.thinking !== undefined || cliThinkingFromModel;
		if (created.session.model && cliThinkingOverride) {
			created.session.setThinkingLevel(created.session.thinkingLevel);
		}

		return {
			...created,
			services,
			diagnostics,
		};
	};
	time("createRuntime");
	const runtime = await createEngineSessionRuntime(createRuntime, {
		cwd: sessionManager.getCwd(),
		engineDir,
		sessionManager,
	});
	const { services, session, modelFallbackMessage } = runtime;
	const { settingsManager, modelRegistry, resourceLoader } = services;

	if (parsed.help) {
		const extensionFlags = resourceLoader
			.getExtensions()
			.extensions.flatMap((extension) => Array.from(extension.flags.values()));
		printHelp(extensionFlags);
		process.exit(0);
	}

	if (parsed.listModels !== undefined) {
		const searchPattern = typeof parsed.listModels === "string" ? parsed.listModels : undefined;
		await listModels(modelRegistry, searchPattern);
		process.exit(0);
	}

	// Read piped stdin content (if any) - skip for RPC mode which uses stdin for JSON-RPC
	let stdinContent: string | undefined;
	if (appMode !== "rpc" && appMode !== "headless") {
		stdinContent = await readPipedStdin();
		if (stdinContent !== undefined && appMode === "interactive") {
			appMode = "print";
		}
	}
	time("readPipedStdin");

	const { initialMessage, initialImages } = await prepareInitialMessage(
		parsed,
		settingsManager.getImageAutoResize(),
		stdinContent,
	);
	time("prepareInitialMessage");
	initTheme(settingsManager.getTheme(), appMode === "interactive");
	time("initTheme");

	// Show deprecation warnings in interactive mode
	if (appMode === "interactive" && deprecationWarnings.length > 0) {
		await showDeprecationWarnings(deprecationWarnings);
	}

	const scopedModels = [...session.scopedModels];
	time("resolveModelScope");
	reportDiagnostics(runtime.diagnostics);
	if (runtime.diagnostics.some((diagnostic) => diagnostic.type === "error")) {
		process.exit(1);
	}
	time("createEngineSession");

	if (appMode !== "interactive" && !session.model) {
		console.error(chalk.red(formatNoModelsAvailableMessage()));
		process.exit(1);
	}

	const startupBenchmark = isTruthyEnvFlag(process.env.PI_STARTUP_BENCHMARK);
	if (startupBenchmark && appMode !== "interactive") {
		console.error(chalk.red("Hata: PI_STARTUP_BENCHMARK sadece etkileşimli modu destekler"));
		process.exit(1);
	}

	if (appMode === "rpc") {
		printTimings();
		await runRpcMode(runtime);
	} else if (appMode === "headless") {
		const exitCode = await runHeadlessMode(runtime, {
			timeoutSeconds: parsed.timeout,
			outputFormat: parsed.outputFormat,
		});
		stopThemeWatcher();
		restoreStdout();
		if (exitCode !== 0) process.exitCode = exitCode;
		return;
	} else if (appMode === "interactive") {
		if (scopedModels.length > 0 && (parsed.verbose || !settingsManager.getQuietStartup())) {
			const modelList = scopedModels
				.map((sm) => {
					const thinkingStr = sm.thinkingLevel ? `:${sm.thinkingLevel}` : "";
					return `${sm.model.id}${thinkingStr}`;
				})
				.join(", ");
			console.log(chalk.dim(`Model kapsamı: ${modelList} ${chalk.gray("(Döngü için Ctrl+P)")}`));
		}

		const interactiveMode = new InteractiveMode(runtime, {
			migratedProviders,
			modelFallbackMessage,
			initialMessage,
			initialImages,
			initialMessages: parsed.messages,
			verbose: parsed.verbose,
		});
		if (startupBenchmark) {
			await interactiveMode.init();
			time("interactiveMode.init");
			printTimings();
			interactiveMode.stop();
			stopThemeWatcher();
			if (process.stdout.writableLength > 0) {
				await new Promise<void>((resolve) => process.stdout.once("drain", resolve));
			}
			if (process.stderr.writableLength > 0) {
				await new Promise<void>((resolve) => process.stderr.once("drain", resolve));
			}
			return;
		}

		printTimings();
		await interactiveMode.run();
	} else {
		printTimings();
		const exitCode = await runPrintMode(runtime, {
			mode: toPrintOutputMode(appMode),
			messages: parsed.messages,
			initialMessage,
			initialImages,
		});
		stopThemeWatcher();
		restoreStdout();
		if (exitCode !== 0) {
			process.exitCode = exitCode;
		}
		return;
	}
}
