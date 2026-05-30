// @ts-nocheck
/**
 * Interactive mode for the coding engine.
 * Handles TUI rendering and user interaction, delegating business logic to EngineSession.
 */

import * as crypto from "node:crypto";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { spawn, spawnSync } from "child_process";
import {
	type AssistantMessage,
	getProviders,
	type ImageContent,
	type Message,
	type Model,
	type OAuthProviderId,
} from "moon-core";
import type { EngineMessage } from "moon-engine";
import type {
	AutocompleteItem,
	AutocompleteProvider,
	EditorComponent,
	Keybinding,
	KeyId,
	MarkdownTheme,
	OverlayHandle,
	OverlayOptions,
	SlashCommand,
} from "moon-tui";
import {
	CombinedAutocompleteProvider,
	type Component,
	Container,
	fuzzyFilter,
	Loader,
	type LoaderIndicatorOptions,
	Markdown,
	matchesKey,
	ProcessTerminal,
	Spacer,
	setKeybindings,
	Text,
	TruncatedText,
	TUI,
	visibleWidth,
} from "moon-tui";
import { buildInitialMessage } from "../../cli/initial-message.js";
import {
	APP_NAME,
	APP_TITLE,
	getAuthPath,
	getDebugLogPath,
	getDocsPath,
	getEngineDir,
	getPackageDir,
	getShareViewerUrl,
	VERSION,
} from "../../config.js";
import { renderCodingAgentsWorkspace } from "../../core/agents.js";
import { type EngineSession, type EngineSessionEvent, parseSkillBlock } from "../../core/engine-session.js";
import { type EngineSessionRuntime, SessionImportFileNotFoundError } from "../../core/engine-session-runtime.js";
import type {
	AutocompleteProviderFactory,
	EditorFactory,
	ExtensionCommandContext,
	ExtensionContext,
	ExtensionRunner,
	ExtensionUIContext,
	ExtensionUIDialogOptions,
	ExtensionWidgetOptions,
} from "../../core/extensions/index.js";
import { FooterDataProvider, type ReadonlyFooterDataProvider } from "../../core/footer-data-provider.js";
import { type AppKeybinding, KeybindingsManager } from "../../core/keybindings.js";
import { createCompactionSummaryMessage } from "../../core/messages.js";
import { defaultModelPerProvider, findExactModelReferenceMatch, resolveModelScope } from "../../core/model-resolver.js";
import { OmegaKernel } from "../../core/omega-kernel.js";
import { DefaultPackageManager } from "../../core/package-manager.js";
import { BUILT_IN_PROVIDER_DISPLAY_NAMES } from "../../core/provider-display-names.js";
import type { ResourceDiagnostic } from "../../core/resource-loader.js";
import { formatMissingSessionCwdPrompt, MissingSessionCwdError } from "../../core/session-cwd.js";
import { type SessionContext, SessionManager } from "../../core/session-manager.js";
import { BUILTIN_SLASH_COMMANDS } from "../../core/slash-commands.js";
import type { SourceInfo } from "../../core/source-info.js";
import { isInstallTelemetryEnabled } from "../../core/telemetry.js";
import type { TruncationResult } from "../../core/tools/truncate.js";
import { handlePackageCommand } from "../../package-manager-cli.js";
import { getChangelogPath, getNewEntries, parseChangelog } from "../../utils/changelog.js";
import { copyToClipboard } from "../../utils/clipboard.js";
import { extensionForImageMimeType, readClipboardImage } from "../../utils/clipboard-image.js";
import { parseGitUrl } from "../../utils/git.js";
import { getMoonCodeUserEngine } from "../../utils/moon-user-engine.js";
import { killTrackedDetachedChildren } from "../../utils/shell.js";
import { ensureTool, getToolPath } from "../../utils/tools-manager.js";
import { checkForNewMoonCodeVersion } from "../../utils/version-check.js";
import { ArminComponent } from "./components/armin.js";
import { AssistantMessageComponent } from "./components/assistant-message.js";
import { BashExecutionComponent } from "./components/bash-execution.js";
import { BorderedLoader } from "./components/bordered-loader.js";
import { BranchSummaryMessageComponent } from "./components/branch-summary-message.js";
import { CompactionSummaryMessageComponent } from "./components/compaction-summary-message.js";
import { CountdownTimer } from "./components/countdown-timer.js";
import { CustomEditor } from "./components/custom-editor.js";
import { CustomMessageComponent } from "./components/custom-message.js";
import { DaxnutsComponent } from "./components/daxnuts.js";
import { DynamicBorder } from "./components/dynamic-border.js";
import { EarendilAnnouncementComponent } from "./components/earendil-announcement.js";
import { ExtensionEditorComponent } from "./components/extension-editor.js";
import { ExtensionInputComponent } from "./components/extension-input.js";
import { ExtensionSelectorComponent } from "./components/extension-selector.js";
import { FooterComponent } from "./components/footer.js";
import { keyHint, keyText, rawKeyHint } from "./components/keybinding-hints.js";
import { LoginDialogComponent } from "./components/login-dialog.js";
import { McpSelectorComponent } from "./components/mcp-selector.js";
import { MetricsChartComponent } from "./components/metrics-chart.js";
import { ModelSelectorComponent } from "./components/model-selector.js";
import { MoonCodeHeaderComponent } from "./components/mooncode-header.js";
import { type AuthSelectorProvider, OAuthSelectorComponent } from "./components/oauth-selector.js";
import { RoadmapComponent, type RoadmapStep } from "./components/roadmap.js";
import { ScopedModelsSelectorComponent } from "./components/scoped-models-selector.js";
import { SessionSelectorComponent } from "./components/session-selector.js";
import { SettingsSelectorComponent } from "./components/settings-selector.js";
import { SkillInvocationMessageComponent } from "./components/skill-invocation-message.js";
import { ToolExecutionComponent } from "./components/tool-execution.js";
import { TreeSelectorComponent } from "./components/tree-selector.js";
import { UserMessageComponent } from "./components/user-message.js";
import { UserMessageSelectorComponent } from "./components/user-message-selector.js";
// WorkspacePanelComponent removed — right panel disabled
import {
	getAvailableThemes,
	getAvailableThemesWithPaths,
	getEditorTheme,
	getMarkdownTheme,
	getThemeByName,
	initTheme,
	onThemeChange,
	setRegisteredThemes,
	setTheme,
	setThemeInstance,
	stopThemeWatcher,
	Theme,
	type ThemeColor,
	theme,
} from "./theme/theme.js";

/** Interface for components that can be expanded/collapsed */
interface Expandable {
	setExpanded(expanded: boolean): void;
}

function isExpandable(obj: unknown): obj is Expandable {
	return typeof obj === "object" && obj !== null && "setExpanded" in obj && typeof obj.setExpanded === "function";
}

class VirtualizedChatContainer extends Container {
	private cachedHeight?: number;
	staticOverhead = 10;

	override render(width: number): string[] {
		const terminalHeight = process.stdout.rows || 40;
		const maxVisible = Math.max(10, Math.min(terminalHeight - this.staticOverhead, 300));

		if (
			this.enableCaching &&
			this.cachedLines &&
			this.cachedWidth === width &&
			this.cachedHeight === terminalHeight
		) {
			return this.cachedLines;
		}

		let lines: string[] = [];
		if (this.children.length === 0) {
			lines = super.render(width) || [];
		} else {
			let hiddenChildren = 0;
			for (let i = this.children.length - 1; i >= 0; i--) {
				const child = this.children[i];
				if (!child) continue;
				const childLines = child.render(width) || [];
				if (lines.length === 0 && childLines.length > maxVisible) {
					lines.unshift(...childLines.slice(-maxVisible));
					hiddenChildren = i;
					break;
				}
				if (lines.length + childLines.length > maxVisible) {
					hiddenChildren = i + 1;
					break;
				}
				lines.unshift(...childLines);
			}
			if (hiddenChildren > 0) {
				lines.unshift(
					theme.fg(
						"dim",
						`… ${hiddenChildren} older chat item(s) hidden for terminal speed. Full session context is still preserved.`,
					),
				);
			}
		}

		// Fill remaining space so composer stays pinned to bottom
		while (lines.length < maxVisible) lines.unshift('');

		if (this.enableCaching) {
			this.cachedWidth = width;
			this.cachedHeight = terminalHeight;
			this.cachedLines = lines;
		}
		return lines;
	}
}

class ExpandableText extends Text implements Expandable {
	constructor(
		private readonly getCollapsedText: () => string,
		private readonly getExpandedText: () => string,
		expanded = false,
		paddingX = 0,
		paddingY = 0,
	) {
		super(expanded ? getExpandedText() : getCollapsedText(), paddingX, paddingY);
	}

	setExpanded(expanded: boolean): void {
		this.setText(expanded ? this.getExpandedText() : this.getCollapsedText());
	}
}

type CompactionQueuedMessage = {
	text: string;
	mode: "steer" | "followUp";
};

const ANTHROPIC_SUBSCRIPTION_AUTH_WARNING =
	"Anthropic abonelik yetkilendirmesi aktif. Ucuncu taraf kullanimi ek ucrete tabidir ve jeton basina ucretlendirilir. Ayarlari su adresten yonetebilirsiniz: https://claude.ai/settings/usage.";

function isAnthropicSubscriptionAuthKey(apiKey: string | undefined): boolean {
	return typeof apiKey === "string" && apiKey.startsWith("sk-ant-oat");
}

function isUnknownModel(model: Model<any> | undefined): boolean {
	return !!model && model.provider === "unknown" && model.id === "unknown" && model.api === "unknown";
}

function hasDefaultModelProvider(providerId: string): providerId is keyof typeof defaultModelPerProvider {
	return providerId in defaultModelPerProvider;
}

const BEDROCK_PROVIDER_ID = "amazon-bedrock";
const MOON_WORKING_FRAMES = ["·", "•", "●", "•"];

const BUILT_IN_MODEL_PROVIDERS = new Set<string>(getProviders());

export function isApiKeyLoginProvider(
	providerId: string,
	oauthProviderIds: ReadonlySet<string>,
	builtInProviderIds: ReadonlySet<string> = BUILT_IN_MODEL_PROVIDERS,
): boolean {
	if (oauthProviderIds.has(providerId)) {
		return false;
	}
	if (BUILT_IN_PROVIDER_DISPLAY_NAMES[providerId]) {
		return true;
	}
	if (builtInProviderIds.has(providerId)) {
		return false;
	}
	return true;
}

/**
 * Options for InteractiveMode initialization.
 */
export interface InteractiveModeOptions {
	/** Providers that were migrated to auth.json (shows warning) */
	migratedProviders?: string[];
	/** Warning message if session model couldn't be restored */
	modelFallbackMessage?: string;
	/** Initial message to send on startup (can include @file content) */
	initialMessage?: string;
	/** Images to attach to the initial message */
	initialImages?: ImageContent[];
	/** Additional messages to send after the initial message */
	initialMessages?: string[];
	/** Force verbose startup (overrides quietStartup setting) */
	verbose?: boolean;
}

export class InteractiveMode {
	private runtimeHost: EngineSessionRuntime;
	private ui: TUI;
	private chatContainer: Container;
	private pendingMessagesContainer: Container;
	private statusContainer: Container;
	private roadmap: RoadmapComponent;
	private defaultEditor: CustomEditor;
	private editor: EditorComponent;
	private editorComponentFactory: EditorFactory | undefined;
	private autocompleteProvider: AutocompleteProvider | undefined;
	private autocompleteProviderWrappers: AutocompleteProviderFactory[] = [];
	private fdPath: string | undefined;
	private editorContainer: Container;
	private footer: FooterComponent;
	private footerDataProvider: FooterDataProvider;
	// workspacePanel removed
	// Stored so the same manager can be injected into custom editors, selectors, and extension UI.
	private keybindings: KeybindingsManager;
	private version: string;
	private isInitialized = false;
	private initPromise: Promise<void> | undefined;
	private onInputCallback?: (text: string) => void;
	private isSubmitting = false;
	private loadingAnimation: Loader | undefined = undefined;
	private workingMessage: string | undefined = undefined;
	private workingVisible = true;
	private workingIndicatorOptions: LoaderIndicatorOptions | undefined = undefined;
	private readonly defaultWorkingMessage = "Hazirlaniyor...";
	private readonly defaultHiddenThinkingLabel = "Thinking...";
	private hiddenThinkingLabel = this.defaultHiddenThinkingLabel;

	private lastSigintTime = 0;
	private lastEscapeTime = 0;
	private changelogMarkdown: string | undefined = undefined;
	private startupNoticesShown = false;
	private anthropicSubscriptionWarningShown = false;

	// Status line tracking (for mutating immediately-sequential status updates)
	private lastStatusSpacer: Spacer | undefined = undefined;
	private lastStatusText: Text | undefined = undefined;

	// Streaming message tracking
	private streamingComponent: AssistantMessageComponent | undefined = undefined;
	private streamingMessage: AssistantMessage | undefined = undefined;

	// Tool execution tracking: toolCallId -> component
	private pendingTools = new Map<string, ToolExecutionComponent>();

	// Tool output expansion state
	private toolOutputExpanded = false;

	// Thinking block visibility state
	private hideThinkingBlock = false;

	// Skill commands: command name -> skill file path
	private skillCommands = new Map<string, string>();

	// Engine subscription unsubscribe function
	private unsubscribe?: () => void;
	private signalCleanupHandlers: Array<() => void> = [];

	// Track if editor is in bash mode (text starts with !)
	private isBashMode = false;

	// Plan Mode: read-only analiz modu (write/edit/bash tool'lari devre disi)
	private isPlanMode = false;

	// Track current bash execution component
	private bashComponent: BashExecutionComponent | undefined = undefined;

	// Track pending bash components (shown in pending area, moved to chat on submit)
	private pendingBashComponents: BashExecutionComponent[] = [];

	// Auto-compaction state
	private autoCompactionLoader: Loader | undefined = undefined;
	private autoCompactionEscapeHandler?: () => void;

	// Roadmap state
	private currentSteps: RoadmapStep[] = [];

	// Auto-retry state
	private retryLoader: Loader | undefined = undefined;
	private retryCountdown: CountdownTimer | undefined = undefined;
	private retryEscapeHandler?: () => void;

	// Messages queued while compaction is running
	private compactionQueuedMessages: CompactionQueuedMessage[] = [];

	// Shutdown state
	private shutdownRequested = false;
	private webUiProcess: any = undefined;
	private editorActionListenerRegistered = false;

	// Extension UI state
	private extensionSelector: ExtensionSelectorComponent | undefined = undefined;
	private extensionInput: ExtensionInputComponent | undefined = undefined;
	private extensionEditor: ExtensionEditorComponent | undefined = undefined;
	private activeMetricsChart: MetricsChartComponent | undefined = undefined;
	private extensionTerminalInputUnsubscribers = new Set<() => void>();

	// Extension widgets (components rendered above/below the editor)
	private extensionWidgetsAbove = new Map<string, Component & { dispose?(): void }>();
	private extensionWidgetsBelow = new Map<string, Component & { dispose?(): void }>();
	private widgetContainerAbove!: Container;
	private widgetContainerBelow!: Container;

	// Custom footer from extension (undefined = use built-in footer)
	private customFooter: (Component & { dispose?(): void }) | undefined = undefined;

	// Header container that holds the built-in or custom header
	private headerContainer: Container;

	// Built-in header (logo + keybinding hints + changelog)
	private builtInHeader: Component | undefined = undefined;

	// Custom header from extension (undefined = use built-in header)
	private customHeader: (Component & { dispose?(): void }) | undefined = undefined;

	// Main chat layout
	private mainLayout!: Container;
	private chatAndPendingContainer!: Container;

	// Zen Mode state
	private isZenMode = false;

	// Convenience accessors
	private get session(): EngineSession {
		return this.runtimeHost.session;
	}
	private get engine() {
		return this.session.engine;
	}
	private get sessionManager() {
		return this.session.sessionManager;
	}
	private get settingsManager() {
		return this.session.settingsManager;
	}

	constructor(
		runtimeHost: EngineSessionRuntime,
		private options: InteractiveModeOptions = {},
	) {
		this.runtimeHost = runtimeHost;
		this.runtimeHost.setBeforeSessionInvalidate(() => {
			this.resetExtensionUI();
		});
		this.runtimeHost.setRebindSession(async () => {
			await this.rebindCurrentSession();
		});
		this.version = VERSION;
		process.env.PI_TUI_MODE = "1";
		this.ui = new TUI(new ProcessTerminal(), this.settingsManager.getShowHardwareCursor());
		this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
		this.headerContainer = new Container();
		this.chatContainer = new VirtualizedChatContainer();
		this.chatContainer.enableCaching = true;
		this.pendingMessagesContainer = new Container();
		this.statusContainer = new Container();
		this.widgetContainerAbove = new Container();
		this.widgetContainerBelow = new Container();
		this.keybindings = KeybindingsManager.create();
		setKeybindings(this.keybindings);
		const editorPaddingX = this.settingsManager.getEditorPaddingX();
		const autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
		this.defaultEditor = new CustomEditor(this.ui, getEditorTheme(), this.keybindings, {
			paddingX: editorPaddingX,
			autocompleteMaxVisible,
		});
		this.editor = this.defaultEditor;
		this.editorContainer = new Container();
		this.editorContainer.addChild(this.editor as Component);
		this.footerDataProvider = new FooterDataProvider(this.sessionManager.getCwd());
		this.footer = new FooterComponent(this.session, this.footerDataProvider, () => {
			const active = Array.from(this.pendingTools.values()).map((comp) => comp.getToolName());
			if (this.bashComponent) {
				active.push("bash");
			}
			return active;
		});
		this.footer.setAutoCompactEnabled(this.session.autoCompactionEnabled);

		// Load hide thinking block setting
		this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();

		// Register themes from resource loader and initialize
		setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
		initTheme(this.settingsManager.getTheme(), true);
	}

	private getAutocompleteSourceTag(sourceInfo?: SourceInfo): string | undefined {
		if (!sourceInfo) {
			return undefined;
		}

		const scopePrefix = sourceInfo.scope === "user" ? "u" : sourceInfo.scope === "project" ? "p" : "t";
		const source = sourceInfo.source.trim();

		if (source === "auto" || source === "local" || source === "cli") {
			return scopePrefix;
		}

		if (source.startsWith("npm:")) {
			return `${scopePrefix}:${source}`;
		}

		const gitSource = parseGitUrl(source);
		if (gitSource) {
			const ref = gitSource.ref ? `@${gitSource.ref}` : "";
			return `${scopePrefix}:git:${gitSource.host}/${gitSource.path}${ref}`;
		}

		return scopePrefix;
	}

	private prefixAutocompleteDescription(description: string | undefined, sourceInfo?: SourceInfo): string | undefined {
		const sourceTag = this.getAutocompleteSourceTag(sourceInfo);
		if (!sourceTag) {
			return description;
		}
		return description ? `[${sourceTag}] ${description}` : `[${sourceTag}]`;
	}

	private getBuiltInCommandConflictDiagnostics(extensionRunner: ExtensionRunner): ResourceDiagnostic[] {
		const builtinNames = new Set(BUILTIN_SLASH_COMMANDS.map((command) => command.name));
		return extensionRunner
			.getRegisteredCommands()
			.filter((command) => builtinNames.has(command.name))
			.map((command) => ({
				type: "warning" as const,
				message:
					command.invocationName === command.name
						? `Uzantı komutu '/${command.name}' yerleşik etkileşimli komutla çakışıyor. Otomatik tamamlamada atlanıyor.`
						: `Uzantı komutu '/${command.name}' yerleşik etkileşimli komutla çakışıyor. '/${command.invocationName}' olarak kullanılabilir.`,
				path: command.sourceInfo.path,
			}));
	}

	private createBaseAutocompleteProvider(): AutocompleteProvider {
		// Define commands for autocomplete
		const slashCommands: SlashCommand[] = BUILTIN_SLASH_COMMANDS.map((command) => ({
			name: command.name,
			description: command.description,
		}));

		const modelsCommand = slashCommands.find((command) => command.name === "models");
		if (modelsCommand) {
			modelsCommand.getArgumentCompletions = (prefix: string): AutocompleteItem[] | null => {
				// Get available models (scoped or from registry)
				const models =
					this.session.scopedModels.length > 0
						? this.session.scopedModels.map((s) => s.model)
						: this.session.modelRegistry.getAvailable();

				if (models.length === 0) return null;

				// Create items with provider/id format
				const items = models.map((m) => ({
					id: m.id,
					provider: m.provider,
					label: `${m.provider}/${m.id}`,
				}));

				// Fuzzy filter by model ID + provider (allows "opus anthropic" to match)
				const filtered = fuzzyFilter(items, prefix, (item) => `${item.id} ${item.provider}`);

				if (filtered.length === 0) return null;

				return filtered.map((item) => ({
					value: item.label,
					label: item.id,
					description: item.provider,
				}));
			};
		}

		// Convert prompt templates to SlashCommand format for autocomplete
		const templateCommands: SlashCommand[] = this.session.promptTemplates.map((cmd) => ({
			name: cmd.name,
			description: this.prefixAutocompleteDescription(cmd.description, cmd.sourceInfo),
			...(cmd.argumentHint && { argumentHint: cmd.argumentHint }),
		}));

		// Convert extension commands to SlashCommand format
		const builtinCommandNames = new Set(slashCommands.map((c) => c.name));
		const extensionCommands: SlashCommand[] = this.session.extensionRunner
			.getRegisteredCommands()
			.filter((cmd) => !builtinCommandNames.has(cmd.name))
			.map((cmd) => ({
				name: cmd.invocationName,
				description: this.prefixAutocompleteDescription(cmd.description, cmd.sourceInfo),
				getArgumentCompletions: cmd.getArgumentCompletions,
			}));

		// Build skill commands from session.skills (if enabled)
		this.skillCommands.clear();
		const skillCommandList: SlashCommand[] = [];
		if (this.settingsManager.getEnableSkillCommands()) {
			for (const skill of this.session.resourceLoader.getSkills().skills) {
				const commandName = `skill:${skill.name}`;
				this.skillCommands.set(commandName, skill.filePath);
				skillCommandList.push({
					name: commandName,
					description: this.prefixAutocompleteDescription(skill.description, skill.sourceInfo),
				});
			}
		}

		return new CombinedAutocompleteProvider(
			[...slashCommands, ...templateCommands, ...extensionCommands, ...skillCommandList],
			this.sessionManager.getCwd(),
			this.fdPath,
		);
	}

	private setupAutocompleteProvider(): void {
		let provider = this.createBaseAutocompleteProvider();
		for (const wrapProvider of this.autocompleteProviderWrappers) {
			provider = wrapProvider(provider);
		}

		this.autocompleteProvider = provider;
		this.defaultEditor.setAutocompleteProvider(provider);
		if (this.editor !== this.defaultEditor) {
			this.editor.setAutocompleteProvider?.(provider);
		}
	}

	private showStartupNoticesIfNeeded(): void {
		if (this.startupNoticesShown) {
			return;
		}
		this.startupNoticesShown = true;

		if (!this.changelogMarkdown) {
			return;
		}

		if (this.chatContainer.children.length > 0) {
			this.chatContainer.addChild(new Spacer(1));
		}
		this.chatContainer.addChild(new DynamicBorder());
		if (this.settingsManager.getCollapseChangelog()) {
			const versionMatch = this.changelogMarkdown.match(/##\s+\[?(\d+\.\d+\.\d+)\]?/);
			const latestVersion = versionMatch ? versionMatch[1] : this.version;
			const condensedText = `v${latestVersion} sürümüne güncellendi. Tüm değişiklikleri görmek için ${theme.bold("/changelog")} komutunu kullanın.`;
			this.chatContainer.addChild(new Text(condensedText, 1, 0));
		} else {
			this.chatContainer.addChild(new Text(theme.bold(theme.fg("accent", "Yenilikler")), 1, 0));
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(
				new Markdown(this.changelogMarkdown.trim(), 1, 0, this.getMarkdownThemeWithSettings()),
			);
			this.chatContainer.addChild(new Spacer(1));
		}
		this.chatContainer.addChild(new DynamicBorder());
	}

	async init(): Promise<void> {
		if (this.isInitialized) return;
		if (this.initPromise) return this.initPromise;

		this.initPromise = this.doInit();
		return this.initPromise;
	}

	private async doInit(): Promise<void> {
		this.registerSignalHandlers();

		// Load changelog (only show new entries, skip for resumed sessions)
		this.changelogMarkdown = this.getChangelogForDisplay();

		// Do not block startup on helper downloads. Use what already exists, then
		// warm missing tools in the background for autocomplete/search.
		this.fdPath = getToolPath("fd") ?? undefined;
		void Promise.all([ensureTool("fd", true), ensureTool("rg", true)])
			.then(([fdPath]) => {
				if (fdPath && fdPath !== this.fdPath) {
					this.fdPath = fdPath;
					this.setupAutocompleteProvider();
				}
			})
			.catch(() => {
				// Tool downloads are best-effort; grep/find will report if invoked and unavailable.
			});

		// Add header container
		// this.ui.addChild(this.headerContainer); // Removed from here, added before mainLayout

		// Add header with keybindings from config (unless silenced)
		if (this.options.verbose || !this.settingsManager.getQuietStartup()) {
			// Build startup instructions using keybinding hint helpers
			const hint = (keybinding: AppKeybinding, description: string) => keyHint(keybinding, description);

			const _expandedInstructions = [
				hint("app.interrupt", "islemi durdurmak icin"),
				hint("app.clear", "ekrani temizlemek icin"),
				rawKeyHint(`${keyText("app.clear")} iki kez`, "cikmak icin"),
				hint("app.exit", "cikmak icin (bosken)"),
				hint("app.suspend", "arka plana atmak icin"),
				keyHint("tui.editor.deleteToLineEnd", "satir sonunu silmek icin"),
				hint("app.thinking.cycle", "dusunme modunu degistirmek icin"),
				rawKeyHint(
					`${keyText("app.model.cycleForward")}/${keyText("app.model.cycleBackward")}`,
					"modelleri degistirmek icin",
				),
				hint("app.model.select", "model secmek icin"),
				hint("app.tools.expand", "araclari genisletmek icin"),
				hint("app.thinking.toggle", "dusunme detaylarini gormek icin"),
				hint("app.editor.external", "harici editorde acmak icin"),
				rawKeyHint("/", "komut listesi icin"),
				rawKeyHint("!", "bash komutu calistirmak icin"),
				rawKeyHint("!!", "baglamsiz bash calistirmak icin"),
				hint("app.message.followUp", "mesaji siraya eklemek icin"),
				hint("app.message.dequeue", "siradaki mesajlari duzenlemek icin"),
				hint("app.clipboard.pasteImage", "pano'dan resim eklemek icin"),
				rawKeyHint("dosyalari surukleyin", "projeye eklemek icin"),
			].join("\n");

			const _compactInstructions = [
				hint("app.interrupt", "durdur"),
				rawKeyHint(`${keyText("app.clear")}/${keyText("app.exit")}`, "temizle/cik"),
				rawKeyHint("/", "komutlar"),
				rawKeyHint("!", "bash"),
				hint("app.tools.expand", "yardim"),
			].join(theme.fg("dim", " • "));

			this.builtInHeader = new MoonCodeHeaderComponent(this.session, this.footerDataProvider);

			// Setup UI layout
			this.headerContainer.addChild(this.builtInHeader);
		} else {
			// Minimal header when silenced
			this.builtInHeader = new Text("", 0, 0);
			this.headerContainer.addChild(this.builtInHeader);
		}

		this.roadmap = new RoadmapComponent();

		// Main chat layout container
		this.chatAndPendingContainer = new Container();
		this.chatAndPendingContainer.addChild(this.chatContainer);
		this.chatAndPendingContainer.addChild(this.pendingMessagesContainer);

		// Flex container for Chat + Roadmap
		this.mainLayout = new Container();
		this.mainLayout.setStyle({ flexDirection: "row" });

		// Set fixed width for roadmap (chatAndPending will flex automatically)
		this.roadmap.setStyle({ width: 45, minWidth: 45, border: "left" });

		this.refreshLayout();

		this.setupKeyHandlers();
		this.setupEditorSubmitHandler();

		// Start the UI before initializing extensions so session_start handlers can use interactive dialogs
		this.ui.start();
		this.isInitialized = true;

		// Initialize extensions first so resources are shown before messages
		await this.rebindCurrentSession();

		// Render initial messages AFTER showing loaded resources
		this.renderInitialMessages();

		// Set up theme file watcher
		onThemeChange(() => {
			this.ui.invalidate();
			this.updateEditorBorderColor();
			this.ui.requestRender();
		});

		// Set up git branch watcher (uses provider instead of footer)
		this.footerDataProvider.onBranchChange(() => {
			this.ui.requestRender();
		});

		// Initialize available provider count for footer display
		await this.updateAvailableProviderCount();

		this.isInitialized = true;
		this.initPromise = undefined;
	}

	private toggleZenMode(): void {
		this.isZenMode = !this.isZenMode;
		this.refreshLayout();
		this.showStatus(this.isZenMode ? "🧘‍♂️ Zen Modu Aktif (Kapatmak için /zen)" : " Zen Modu Kapatıldı");
	}

	private refreshLayout(): void {
		this.ui.children = [];
		if (!this.isZenMode) {
			this.ui.addChild(this.headerContainer);
		}

		// Update main layout contents
		this.mainLayout.clear();
		this.mainLayout.addChild(this.chatAndPendingContainer);
		if (this.currentSteps.length > 0 && !this.isZenMode) {
			this.mainLayout.addChild(this.roadmap);
		}

		this.ui.addChild(this.mainLayout);
		if (!this.isZenMode) {
			this.ui.addChild(this.statusContainer);
		}
		this.renderWidgets();
		this.ui.addChild(this.widgetContainerAbove);
		this.ui.addChild(this.widgetContainerBelow);
		if (!this.isZenMode) {
			this.ui.addChild(this.customFooter ?? this.footer);
		}
		// Keep composer as the final child so its bottom border stays pinned to the last terminal row.
		this.ui.addChild(this.editorContainer);
		this.ui.setFocus(this.editor);
		this.ui.requestRender();
	}

	/**
	 * Update terminal title with session name and cwd.
	 */
	private updateTerminalTitle(): void {
		const cwdBasename = path.basename(this.sessionManager.getCwd());
		const sessionName = this.sessionManager.getSessionName();
		if (sessionName) {
			this.ui.terminal.setTitle(`${APP_TITLE} - ${sessionName} - ${cwdBasename}`);
		} else {
			this.ui.terminal.setTitle(`${APP_TITLE} - ${cwdBasename}`);
		}
	}

	/**
	 * Run the interactive mode. This is the main entry point.
	 * Initializes the UI, shows warnings, processes initial messages, and starts the interactive loop.
	 */
	async run(): Promise<void> {
		await this.init();

		// Start version check asynchronously
		checkForNewMoonCodeVersion(this.version).then((newVersion) => {
			if (newVersion) {
				this.showNewVersionNotification(newVersion);
			}
		});

		// Start package update check asynchronously
		this.checkForPackageUpdates().then((updates) => {
			if (updates.length > 0) {
				this.showPackageUpdateNotification(updates);
			}
		});

		// Check tmux keyboard setup asynchronously
		this.checkTmuxKeyboardSetup().then((warning) => {
			if (warning) {
				this.showWarning(warning);
			}
		});

		// Show startup warnings
		const { migratedProviders, modelFallbackMessage, initialMessage, initialImages, initialMessages } = this.options;

		if (migratedProviders && migratedProviders.length > 0) {
			this.showWarning(`Kimlik bilgileri auth.json dosyasına taşındı: ${migratedProviders.join(", ")}`);
		}

		const modelsJsonError = this.session.modelRegistry.getError();
		if (modelsJsonError) {
			this.showError(`models.json hatası: ${modelsJsonError}`);
		}

		if (modelFallbackMessage) {
			this.showWarning(modelFallbackMessage);
		}

		void this.maybeWarnAboutAnthropicSubscriptionAuth();

		// Process initial messages
		if (initialMessage) {
			try {
				await this.session.prompt(initialMessage, { images: initialImages });
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
				this.showError(errorMessage);
			}
		}

		if (initialMessages) {
			for (const message of initialMessages) {
				try {
					await this.session.prompt(message);
				} catch (error: unknown) {
					const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
					this.showError(errorMessage);
				}
			}
		}

		// Main interactive loop
		while (true) {
			const userInput = await this.getUserInput();
			try {
				let promptInput = userInput;
				const lowerInput = userInput.toLowerCase();
				const videoEditIntentTerms = [
					"video edit",
					"video düzenle",
					"videoyu düzenle",
					"videoyu kes",
					"video kes",
					"klip kes",
					"kurgu yap",
					"montaj yap",
					"video yap",
					"short yap",
					"shorts yap",
					"short videosu",
					"tiktok videosu",
					"reels yap",
					"altyazı ekle",
					"otomatik altyazı",
					"seslendirme ekle",
					"glitch efekti",
					"vhs efekti",
					"cinematic video",
					"ffmpeg",
					"render video",
					"videoeditle",
				];
				const photoEditIntentTerms = [
					"fotoğraf düzenle",
					"fotoğrafı düzenle",
					"fotoğraf edit",
					"photo edit",
					"resim düzenle",
					"resmi düzenle",
					"resmi editle",
					"görsel düzenle",
					"görsel editle",
					"photoeditle",
					"yüzdeki leke",
					"lekeleri temizle",
					"leke temizle",
					"cildi yumuşat",
					"cilt yumuşat",
					"cildi doğal",
					"gözleri netleştir",
					"portre gibi",
					"profesyonel portre",
					"retouch",
					"rötuş",
					"arka planı sil",
					"background remove",
					"obje kaldır",
					"nesne kaldır",
					"inpaint",
					"upscale",
					"görseli kaydet",
					"png olarak",
					"jpg olarak",
				];
				const hasImageFileHint =
					/\b(png|jpe?g|webp|gif|bmp|tiff?)\b/i.test(userInput) ||
					lowerInput.includes("foto") ||
					lowerInput.includes("resim") ||
					lowerInput.includes("görsel");
				const hasVideoFileHint =
					/\b(mp4|mov|mkv|webm|avi|m4v)\b/i.test(userInput) ||
					lowerInput.includes("video") ||
					lowerInput.includes("klip");
				const isVideo =
					videoEditIntentTerms.some((term) => lowerInput.includes(term)) ||
					(hasVideoFileHint &&
						/\b(kes|cut|trim|split|altyazı|short|reels|render|efekt|filter|filtre)\b/i.test(userInput));
				const isPhoto =
					photoEditIntentTerms.some((term) => lowerInput.includes(term)) ||
					(hasImageFileHint &&
						/\b(leke|cilt|yüz|goz|göz|portre|retouch|rötuş|arka plan|obje|nesne|upscale|netleştir|yumuşat|temizle|renk|lut|kontrast|parlaklık)\b/i.test(
							userInput,
						));

				if (isVideo) {
					await this.handleVideoEditCommand();
					promptInput = `[Sistem: Kullanıcının talebi üzerine MoonCode Video Studio tarayıcıda otomatik olarak açıldı. Lütfen kullanıcıya video düzenleme konusunda nasıl yardımcı olabileceğini sor ve rehberlik et. Dosya konumları, kesme/cut, efektler, keyframe, altyazı vb. işlemler yapabileceğini ve Browser Bridge üzerinden tarayıcı sekmesini kontrol edebildiğini belirt.]\n\n${userInput}`;
				} else if (isPhoto) {
					await this.handlePhotoEditCommand();
					promptInput = `[Sistem: Kullanıcının mesajı profesyonel fotoğraf düzenleme/retouch niyeti taşıyor; MoonCode Photo Studio tarayıcıda otomatik açıldı. Komut yazmasını bekleme. Önce klasördeki uygun görsel dosyayı bul (png/jpg/webp vb.), sonra Photo Studio ve Browser Bridge üzerinden yükleme/işlem akışını yürüt. İstenen işlem örn. yüz lekesi temizleme, cilt yumuşatma, göz netleştirme, profesyonel portre, arka plan/obje kaldırma, LUT/curves/upscale/export olabilir. Gerekirse yalnızca eksik dosya yolu veya export hedefi sor.]\n\n${userInput}`;
				}

				await this.session.prompt(promptInput);
			} catch (error: unknown) {
				const errorMessage = error instanceof Error ? error.message : "Bilinmeyen bir hata oluştu";
				this.showError(errorMessage);
			}
		}
	}

	private async checkForPackageUpdates(): Promise<string[]> {
		if (process.env.MOON_OFFLINE) {
			return [];
		}

		try {
			const packageManager = new DefaultPackageManager({
				cwd: this.sessionManager.getCwd(),
				engineDir: getEngineDir(),
				settingsManager: this.settingsManager,
			});
			const updates = await packageManager.checkForAvailableUpdates();
			return updates.map((update) => update.displayName);
		} catch {
			return [];
		}
	}

	private async checkTmuxKeyboardSetup(): Promise<string | undefined> {
		if (!process.env.TMUX) return undefined;

		const runTmuxShow = (option: string): Promise<string | undefined> => {
			return new Promise((resolve) => {
				const proc = spawn("tmux", ["show", "-gv", option], {
					stdio: ["ignore", "pipe", "ignore"],
				});
				let stdout = "";
				const timer = setTimeout(() => {
					proc.kill();
					resolve(undefined);
				}, 2000);

				proc.stdout?.on("data", (data) => {
					stdout += data.toString();
				});
				proc.on("error", () => {
					clearTimeout(timer);
					resolve(undefined);
				});
				proc.on("close", (code) => {
					clearTimeout(timer);
					resolve(code === 0 ? stdout.trim() : undefined);
				});
			});
		};

		const [extendedKeys, extendedKeysFormat] = await Promise.all([
			runTmuxShow("extended-keys"),
			runTmuxShow("extended-keys-format"),
		]);

		// If we couldn't query tmux (timeout, sandbox, etc.), don't warn
		if (extendedKeys === undefined) return undefined;

		if (extendedKeys !== "on" && extendedKeys !== "always") {
			return "tmux extended-keys is off. Modified Enter keys may not work. Add `set -g extended-keys on` to ~/.tmux.conf and restart tmux.";
		}

		if (extendedKeysFormat === "xterm") {
			return "tmux extended-keys-format is xterm. Moon works best with csi-u. Add `set -g extended-keys-format csi-u` to ~/.tmux.conf and restart tmux.";
		}

		return undefined;
	}

	/**
	 * Get changelog entries to display on startup.
	 * Only shows new entries since last seen version, skips for resumed sessions.
	 */
	private getChangelogForDisplay(): string | undefined {
		// Skip changelog for resumed/continued sessions (already have messages)
		if (this.session.state.messages.length > 0) {
			return undefined;
		}

		const lastVersion = this.settingsManager.getLastChangelogVersion();
		const changelogPath = getChangelogPath();
		const entries = parseChangelog(changelogPath);

		if (!lastVersion) {
			// Fresh install - record the version, send telemetry, don't show changelog
			this.settingsManager.setLastChangelogVersion(VERSION);
			this.reportInstallTelemetry(VERSION);
			return undefined;
		}

		const newEntries = getNewEntries(entries, lastVersion);
		if (newEntries.length > 0) {
			this.settingsManager.setLastChangelogVersion(VERSION);
			this.reportInstallTelemetry(VERSION);
			return newEntries.map((e) => e.content).join("\n\n");
		}

		return undefined;
	}

	private reportInstallTelemetry(version: string): void {
		if (process.env.MOON_OFFLINE) {
			return;
		}

		if (!isInstallTelemetryEnabled(this.settingsManager)) {
			return;
		}

		void fetch(`https://github.com/theayzek01/MoonCode/api/report-install?version=${encodeURIComponent(version)}`, {
			method: "POST",
			headers: {
				"User-Engine": getMoonCodeUserEngine(version),
			},
			signal: AbortSignal.timeout(5000),
		})
			.then(() => undefined)
			.catch(() => undefined);
	}

	private getMarkdownThemeWithSettings(): MarkdownTheme {
		return {
			...getMarkdownTheme(),
			codeBlockIndent: this.settingsManager.getCodeBlockIndent(),
		};
	}

	// =========================================================================
	// Extension System
	// =========================================================================

	private formatDisplayPath(p: string): string {
		const home = os.homedir();
		let result = p;

		// Replace home directory with ~
		if (result.startsWith(home)) {
			result = `~${result.slice(home.length)}`;
		}

		return result;
	}

	private formatExtensionDisplayPath(path: string): string {
		let result = this.formatDisplayPath(path);
		result = result.replace(/\/index\.ts$/, "").replace(/\/index\.js$/, "");
		return result;
	}

	private formatContextPath(p: string): string {
		const cwd = path.resolve(this.sessionManager.getCwd());
		const absolutePath = path.isAbsolute(p) ? path.resolve(p) : path.resolve(cwd, p);
		const relativePath = path.relative(cwd, absolutePath);
		const isInsideCwd =
			relativePath === "" ||
			(!relativePath.startsWith("..") &&
				!relativePath.startsWith(`..${path.sep}`) &&
				!path.isAbsolute(relativePath));

		if (isInsideCwd) {
			return relativePath || ".";
		}

		return this.formatDisplayPath(absolutePath);
	}

	private getStartupExpansionState(): boolean {
		return this.options.verbose || this.toolOutputExpanded;
	}

	/**
	 * Get a short path relative to the package root for display.
	 */
	private getShortPath(fullPath: string, sourceInfo?: SourceInfo): string {
		const baseDir = sourceInfo?.baseDir;
		if (baseDir && this.isPackageSource(sourceInfo)) {
			const relativePath = path.relative(path.resolve(baseDir), path.resolve(fullPath));
			if (
				relativePath &&
				relativePath !== "." &&
				!relativePath.startsWith("..") &&
				!relativePath.startsWith(`..${path.sep}`) &&
				!path.isAbsolute(relativePath)
			) {
				return relativePath.replace(/\\/g, "/");
			}
		}

		const source = sourceInfo?.source ?? "";
		const npmMatch = fullPath.match(/node_modules\/(@?[^/]+(?:\/[^/]+)?)\/(.*)/);
		if (npmMatch && source.startsWith("npm:")) {
			return npmMatch[2];
		}

		const gitMatch = fullPath.match(/git\/[^/]+\/[^/]+\/(.*)/);
		if (gitMatch && source.startsWith("git:")) {
			return gitMatch[1];
		}

		return this.formatDisplayPath(fullPath);
	}

	private getCompactPathLabel(resourcePath: string, sourceInfo?: SourceInfo): string {
		const shortPath = this.getShortPath(resourcePath, sourceInfo);
		const normalizedPath = shortPath.replace(/\\/g, "/");
		const segments = normalizedPath.split("/").filter((segment) => segment.length > 0 && segment !== "~");
		if (segments.length > 0) {
			return segments[segments.length - 1]!;
		}
		return shortPath;
	}

	private getCompactPackageSourceLabel(sourceInfo?: SourceInfo): string {
		const source = sourceInfo?.source ?? "";
		if (source.startsWith("npm:")) {
			return source.slice("npm:".length) || source;
		}

		const gitSource = parseGitUrl(source);
		if (gitSource) {
			return gitSource.path || source;
		}

		return source;
	}

	private getCompactExtensionLabel(resourcePath: string, sourceInfo?: SourceInfo): string {
		if (!this.isPackageSource(sourceInfo)) {
			return this.getCompactPathLabel(resourcePath, sourceInfo);
		}

		const sourceLabel = this.getCompactPackageSourceLabel(sourceInfo);
		if (!sourceLabel) {
			return this.getCompactPathLabel(resourcePath, sourceInfo);
		}

		const shortPath = this.getShortPath(resourcePath, sourceInfo).replace(/\\/g, "/");
		const packagePath = shortPath.startsWith("extensions/") ? shortPath.slice("extensions/".length) : shortPath;
		const parsedPath = path.posix.parse(packagePath);

		if (parsedPath.name === "index") {
			return !parsedPath.dir || parsedPath.dir === "." ? sourceLabel : `${sourceLabel}:${parsedPath.dir}`;
		}

		return `${sourceLabel}:${packagePath}`;
	}

	private getCompactDisplayPathSegments(resourcePath: string): string[] {
		return this.formatDisplayPath(resourcePath)
			.replace(/\\/g, "/")
			.split("/")
			.filter((segment) => segment.length > 0 && segment !== "~");
	}

	private getCompactNonPackageExtensionLabel(
		resourcePath: string,
		index: number,
		allPaths: Array<{ path: string; segments: string[] }>,
	): string {
		const segments = allPaths[index]?.segments;
		if (!segments || segments.length === 0) {
			return this.getCompactPathLabel(resourcePath);
		}

		for (let segmentCount = 1; segmentCount <= segments.length; segmentCount += 1) {
			const candidate = segments.slice(-segmentCount).join("/");
			const isUnique = allPaths.every((item, itemIndex) => {
				if (itemIndex === index) {
					return true;
				}
				return item.segments.slice(-segmentCount).join("/") !== candidate;
			});

			if (isUnique) {
				return candidate;
			}
		}

		return segments.join("/");
	}

	private getCompactExtensionLabels(extensions: Array<{ path: string; sourceInfo?: SourceInfo }>): string[] {
		const nonPackageExtensions = extensions
			.map((extension) => {
				const segments = this.getCompactDisplayPathSegments(extension.path);
				const lastSegment = segments[segments.length - 1];
				if (segments.length > 1 && (lastSegment === "index.ts" || lastSegment === "index.js")) {
					segments.pop();
				}
				return {
					path: extension.path,
					sourceInfo: extension.sourceInfo,
					segments,
				};
			})
			.filter((extension) => !this.isPackageSource(extension.sourceInfo));

		return extensions.map((extension) => {
			if (this.isPackageSource(extension.sourceInfo)) {
				return this.getCompactExtensionLabel(extension.path, extension.sourceInfo);
			}

			const nonPackageIndex = nonPackageExtensions.findIndex((item) => item.path === extension.path);
			if (nonPackageIndex === -1) {
				return this.getCompactPathLabel(extension.path, extension.sourceInfo);
			}

			return this.getCompactNonPackageExtensionLabel(extension.path, nonPackageIndex, nonPackageExtensions);
		});
	}

	private getDisplaySourceInfo(sourceInfo?: SourceInfo): {
		label: string;
		scopeLabel?: string;
		color: "accent" | "muted";
	} {
		const source = sourceInfo?.source ?? "local";
		const scope = sourceInfo?.scope ?? "project";
		if (source === "local") {
			if (scope === "user") {
				return { label: "user", color: "muted" };
			}
			if (scope === "project") {
				return { label: "project", color: "muted" };
			}
			if (scope === "temporary") {
				return { label: "path", scopeLabel: "temp", color: "muted" };
			}
			return { label: "path", color: "muted" };
		}

		if (source === "cli") {
			return { label: "path", scopeLabel: scope === "temporary" ? "temp" : undefined, color: "muted" };
		}

		const scopeLabel =
			scope === "user" ? "user" : scope === "project" ? "project" : scope === "temporary" ? "temp" : undefined;
		return { label: source, scopeLabel, color: "accent" };
	}

	private getScopeGroup(sourceInfo?: SourceInfo): "user" | "project" | "path" {
		const source = sourceInfo?.source ?? "local";
		const scope = sourceInfo?.scope ?? "project";
		if (source === "cli" || scope === "temporary") return "path";
		if (scope === "user") return "user";
		if (scope === "project") return "project";
		return "path";
	}

	private isPackageSource(sourceInfo?: SourceInfo): boolean {
		const source = sourceInfo?.source ?? "";
		return source.startsWith("npm:") || source.startsWith("git:");
	}

	private buildScopeGroups(items: Array<{ path: string; sourceInfo?: SourceInfo }>): Array<{
		scope: "user" | "project" | "path";
		paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
		packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
	}> {
		const groups: Record<
			"user" | "project" | "path",
			{
				scope: "user" | "project" | "path";
				paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
				packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
			}
		> = {
			user: { scope: "user", paths: [], packages: new Map() },
			project: { scope: "project", paths: [], packages: new Map() },
			path: { scope: "path", paths: [], packages: new Map() },
		};

		for (const item of items) {
			const groupKey = this.getScopeGroup(item.sourceInfo);
			const group = groups[groupKey];
			const source = item.sourceInfo?.source ?? "local";

			if (this.isPackageSource(item.sourceInfo)) {
				const list = group.packages.get(source) ?? [];
				list.push(item);
				group.packages.set(source, list);
			} else {
				group.paths.push(item);
			}
		}

		return [groups.project, groups.user, groups.path].filter(
			(group) => group.paths.length > 0 || group.packages.size > 0,
		);
	}

	private formatScopeGroups(
		groups: Array<{
			scope: "user" | "project" | "path";
			paths: Array<{ path: string; sourceInfo?: SourceInfo }>;
			packages: Map<string, Array<{ path: string; sourceInfo?: SourceInfo }>>;
		}>,
		options: {
			formatPath: (item: { path: string; sourceInfo?: SourceInfo }) => string;
			formatPackagePath: (item: { path: string; sourceInfo?: SourceInfo }, source: string) => string;
		},
	): string {
		const lines: string[] = [];

		for (const group of groups) {
			lines.push(`  ${theme.fg("accent", group.scope)}`);

			const sortedPaths = [...group.paths].sort((a, b) => a.path.localeCompare(b.path));
			for (const item of sortedPaths) {
				lines.push(theme.fg("dim", `    ${options.formatPath(item)}`));
			}

			const sortedPackages = Array.from(group.packages.entries()).sort(([a], [b]) => a.localeCompare(b));
			for (const [source, items] of sortedPackages) {
				lines.push(`    ${theme.fg("mdLink", source)}`);
				const sortedPackagePaths = [...items].sort((a, b) => a.path.localeCompare(b.path));
				for (const item of sortedPackagePaths) {
					lines.push(theme.fg("dim", `      ${options.formatPackagePath(item, source)}`));
				}
			}
		}

		return lines.join("\n");
	}

	private findSourceInfoForPath(p: string, sourceInfos: Map<string, SourceInfo>): SourceInfo | undefined {
		const exact = sourceInfos.get(p);
		if (exact) return exact;

		let current = p;
		while (current.includes("/")) {
			current = current.substring(0, current.lastIndexOf("/"));
			const parent = sourceInfos.get(current);
			if (parent) return parent;
		}

		return undefined;
	}

	private formatPathWithSource(p: string, sourceInfo?: SourceInfo): string {
		if (sourceInfo) {
			const shortPath = this.getShortPath(p, sourceInfo);
			const { label, scopeLabel } = this.getDisplaySourceInfo(sourceInfo);
			const labelText = scopeLabel ? `${label} (${scopeLabel})` : label;
			return `${labelText} ${shortPath}`;
		}
		return this.formatDisplayPath(p);
	}

	private formatDiagnostics(diagnostics: readonly ResourceDiagnostic[], sourceInfos: Map<string, SourceInfo>): string {
		const lines: string[] = [];

		// Group collision diagnostics by name
		const collisions = new Map<string, ResourceDiagnostic[]>();
		const otherDiagnostics: ResourceDiagnostic[] = [];

		for (const d of diagnostics) {
			if (d.type === "collision" && d.collision) {
				const list = collisions.get(d.collision.name) ?? [];
				list.push(d);
				collisions.set(d.collision.name, list);
			} else {
				otherDiagnostics.push(d);
			}
		}

		// Format collision diagnostics grouped by name
		for (const [name, collisionList] of collisions) {
			const first = collisionList[0]?.collision;
			if (!first) continue;
			lines.push(theme.fg("warning", `  "${name}" collision:`));
			lines.push(
				theme.fg(
					"dim",
					`    ${theme.fg("success", "✓")} ${this.formatPathWithSource(first.winnerPath, this.findSourceInfoForPath(first.winnerPath, sourceInfos))}`,
				),
			);
			for (const d of collisionList) {
				if (d.collision) {
					lines.push(
						theme.fg(
							"dim",
							`    ${theme.fg("warning", "✗")} ${this.formatPathWithSource(d.collision.loserPath, this.findSourceInfoForPath(d.collision.loserPath, sourceInfos))} (skipped)`,
						),
					);
				}
			}
		}

		for (const d of otherDiagnostics) {
			if (d.path) {
				const formattedPath = this.formatPathWithSource(d.path, this.findSourceInfoForPath(d.path, sourceInfos));
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `  ${formattedPath}`));
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `    ${d.message}`));
			} else {
				lines.push(theme.fg(d.type === "error" ? "error" : "warning", `  ${d.message}`));
			}
		}

		return lines.join("\n");
	}

	private showLoadedResources(options?: {
		extensions?: Array<{ path: string; sourceInfo?: SourceInfo }>;
		force?: boolean;
		showDiagnosticsWhenQuiet?: boolean;
	}): void {
		const showListing = options?.force || this.options.verbose || !this.settingsManager.getQuietStartup();
		const showDiagnostics = showListing || options?.showDiagnosticsWhenQuiet === true;
		if (!showListing && !showDiagnostics) {
			return;
		}

		const sectionHeader = (name: string, color: ThemeColor = "mdHeading") => theme.fg(color, `[${name}]`);
		const formatCompactList = (items: string[], options?: { sort?: boolean }): string => {
			const labels = items.map((item) => item.trim()).filter((item) => item.length > 0);
			if (options?.sort !== false) {
				labels.sort((a, b) => a.localeCompare(b));
			}
			return theme.fg("dim", `  ${labels.join(", ")}`);
		};
		const addLoadedSection = (
			name: string,
			collapsedBody: string,
			expandedBody = collapsedBody,
			color: ThemeColor = "mdHeading",
		): void => {
			const section = new ExpandableText(
				() => `${sectionHeader(name, color)}\n${collapsedBody}`,
				() => `${sectionHeader(name, color)}\n${expandedBody}`,
				this.getStartupExpansionState(),
				0,
				0,
			);
			this.chatContainer.addChild(section);
			this.chatContainer.addChild(new Spacer(1));
		};

		const skillsResult = this.session.resourceLoader.getSkills();
		const promptsResult = this.session.resourceLoader.getPrompts();
		const themesResult = this.session.resourceLoader.getThemes();
		const extensions =
			options?.extensions ??
			this.session.resourceLoader.getExtensions().extensions.map((extension) => ({
				path: extension.path,
				sourceInfo: extension.sourceInfo,
			}));
		const sourceInfos = new Map<string, SourceInfo>();
		for (const extension of extensions) {
			if (extension.sourceInfo) {
				sourceInfos.set(extension.path, extension.sourceInfo);
			}
		}
		for (const skill of skillsResult.skills) {
			if (skill.sourceInfo) {
				sourceInfos.set(skill.filePath, skill.sourceInfo);
			}
		}
		for (const prompt of promptsResult.prompts) {
			if (prompt.sourceInfo) {
				sourceInfos.set(prompt.filePath, prompt.sourceInfo);
			}
		}
		for (const loadedTheme of themesResult.themes) {
			if (loadedTheme.sourcePath && loadedTheme.sourceInfo) {
				sourceInfos.set(loadedTheme.sourcePath, loadedTheme.sourceInfo);
			}
		}

		if (showListing) {
			const contextFiles = this.session.resourceLoader.getEnginesFiles().enginesFiles;
			if (contextFiles.length > 0) {
				this.chatContainer.addChild(new Spacer(1));
				const contextList = contextFiles
					.map((f) => theme.fg("dim", `  ${this.formatDisplayPath(f.path)}`))
					.join("\n");
				const contextCompactList = formatCompactList(
					contextFiles.map((contextFile) => this.formatContextPath(contextFile.path)),
					{ sort: false },
				);
				addLoadedSection("Context", contextCompactList, contextList);
			}

			const skills = skillsResult.skills;
			if (skills.length > 0) {
				const groups = this.buildScopeGroups(
					skills.map((skill) => ({ path: skill.filePath, sourceInfo: skill.sourceInfo })),
				);
				const skillList = this.formatScopeGroups(groups, {
					formatPath: (item) => this.formatDisplayPath(item.path),
					formatPackagePath: (item) => this.getShortPath(item.path, item.sourceInfo),
				});
				const skillCompactList = formatCompactList(skills.map((skill) => skill.name));
				addLoadedSection("Skills", skillCompactList, skillList);
			}

			const templates = this.session.promptTemplates;
			if (templates.length > 0) {
				const groups = this.buildScopeGroups(
					templates.map((template) => ({ path: template.filePath, sourceInfo: template.sourceInfo })),
				);
				const templateByPath = new Map(templates.map((t) => [t.filePath, t]));
				const templateList = this.formatScopeGroups(groups, {
					formatPath: (item) => {
						const template = templateByPath.get(item.path);
						return template ? `/${template.name}` : this.formatDisplayPath(item.path);
					},
					formatPackagePath: (item) => {
						const template = templateByPath.get(item.path);
						return template ? `/${template.name}` : this.formatDisplayPath(item.path);
					},
				});
				const promptCompactList = formatCompactList(templates.map((template) => `/${template.name}`));
				addLoadedSection("Prompts", promptCompactList, templateList);
			}

			if (extensions.length > 0) {
				const groups = this.buildScopeGroups(extensions);
				const extList = this.formatScopeGroups(groups, {
					formatPath: (item) => this.formatExtensionDisplayPath(item.path),
					formatPackagePath: (item) =>
						this.formatExtensionDisplayPath(this.getShortPath(item.path, item.sourceInfo)),
				});
				const extensionCompactList = formatCompactList(this.getCompactExtensionLabels(extensions));
				addLoadedSection("Extensions", extensionCompactList, extList, "mdHeading");
			}

			// Show loaded themes (excluding built-in)
			const loadedThemes = themesResult.themes;
			const customThemes = loadedThemes.filter((t) => t.sourcePath);
			if (customThemes.length > 0) {
				const groups = this.buildScopeGroups(
					customThemes.map((loadedTheme) => ({
						path: loadedTheme.sourcePath!,
						sourceInfo: loadedTheme.sourceInfo,
					})),
				);
				const themeList = this.formatScopeGroups(groups, {
					formatPath: (item) => this.formatDisplayPath(item.path),
					formatPackagePath: (item) => this.getShortPath(item.path, item.sourceInfo),
				});
				const themeCompactList = formatCompactList(
					customThemes.map(
						(loadedTheme) =>
							loadedTheme.name ?? this.getCompactPathLabel(loadedTheme.sourcePath!, loadedTheme.sourceInfo),
					),
				);
				addLoadedSection("Themes", themeCompactList, themeList);
			}
		}

		if (showDiagnostics) {
			const skillDiagnostics = skillsResult.diagnostics;
			if (skillDiagnostics.length > 0) {
				const warningLines = this.formatDiagnostics(skillDiagnostics, sourceInfos);
				this.chatContainer.addChild(
					new Text(`${theme.fg("warning", "[Yetenek çakışmaları]")}\n${warningLines}`, 0, 0),
				);
				this.chatContainer.addChild(new Spacer(1));
			}

			const promptDiagnostics = promptsResult.diagnostics;
			if (promptDiagnostics.length > 0) {
				const warningLines = this.formatDiagnostics(promptDiagnostics, sourceInfos);
				this.chatContainer.addChild(
					new Text(`${theme.fg("warning", "[İstem çakışmaları]")}\n${warningLines}`, 0, 0),
				);
				this.chatContainer.addChild(new Spacer(1));
			}

			const extensionDiagnostics: ResourceDiagnostic[] = [];
			const extensionErrors = this.session.resourceLoader.getExtensions().errors;
			if (extensionErrors.length > 0) {
				for (const error of extensionErrors) {
					extensionDiagnostics.push({ type: "error", message: error.error, path: error.path });
				}
			}

			const commandDiagnostics = this.session.extensionRunner.getCommandDiagnostics();
			extensionDiagnostics.push(...commandDiagnostics);
			extensionDiagnostics.push(...this.getBuiltInCommandConflictDiagnostics(this.session.extensionRunner));

			const shortcutDiagnostics = this.session.extensionRunner.getShortcutDiagnostics();
			extensionDiagnostics.push(...shortcutDiagnostics);

			if (extensionDiagnostics.length > 0) {
				const warningLines = this.formatDiagnostics(extensionDiagnostics, sourceInfos);
				this.chatContainer.addChild(
					new Text(`${theme.fg("warning", "[Uzantı sorunları]")}\n${warningLines}`, 0, 0),
				);
				this.chatContainer.addChild(new Spacer(1));
			}

			const themeDiagnostics = themesResult.diagnostics;
			if (themeDiagnostics.length > 0) {
				const warningLines = this.formatDiagnostics(themeDiagnostics, sourceInfos);
				this.chatContainer.addChild(
					new Text(`${theme.fg("warning", "[Tema çakışmaları]")}\n${warningLines}`, 0, 0),
				);
				this.chatContainer.addChild(new Spacer(1));
			}
		}
	}

	/**
	 * Initialize the extension system with TUI-based UI context.
	 */
	private async bindCurrentSessionExtensions(): Promise<void> {
		const uiContext = this.createExtensionUIContext();
		await this.session.bindExtensions({
			uiContext,
			commandContextActions: {
				waitForIdle: () => this.session.engine.waitForIdle(),
				newSession: async (options) => {
					if (this.loadingAnimation) {
						this.loadingAnimation.stop();
						this.loadingAnimation = undefined;
					}
					this.statusContainer.clear();
					try {
						const result = await this.runtimeHost.newSession(options);
						if (!result.cancelled) {
							this.renderCurrentSessionState();
							this.ui.requestRender();
						}
						return result;
					} catch (error: unknown) {
						return this.handleFatalRuntimeError("Failed to create session", error);
					}
				},
				fork: async (entryId, options) => {
					try {
						const result = await this.runtimeHost.fork(entryId, options);
						if (!result.cancelled) {
							this.renderCurrentSessionState();
							this.editor.setText(result.selectedText ?? "");
							this.showStatus("Yeni oturuma çatallandı");
						}
						return { cancelled: result.cancelled };
					} catch (error: unknown) {
						return this.handleFatalRuntimeError("Failed to fork session", error);
					}
				},
				navigateTree: async (targetId, options) => {
					const result = await this.session.navigateTree(targetId, {
						summarize: options?.summarize,
						customInstructions: options?.customInstructions,
						replaceInstructions: options?.replaceInstructions,
						label: options?.label,
					});
					if (result.cancelled) {
						return { cancelled: true };
					}

					this.chatContainer.clear();
					this.renderInitialMessages();
					if (result.editorText && !this.editor.getText().trim()) {
						this.editor.setText(result.editorText);
					}
					this.showStatus("Seçilen noktaya gidildi");
					void this.flushCompactionQueue({ willRetry: false });
					return { cancelled: false };
				},
				switchSession: async (sessionPath, options) => {
					return this.handleResumeSession(sessionPath, options);
				},
				reload: async () => {
					await this.handleReloadCommand();
				},
			},
			shutdownHandler: () => {
				this.shutdownRequested = true;
				if (!this.session.isStreaming) {
					void this.shutdown();
				}
			},
			onError: (error) => {
				this.showExtensionError(error.extensionPath, error.error, error.stack);
			},
		});

		setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
		this.setupAutocompleteProvider();

		const extensionRunner = this.session.extensionRunner;
		this.setupExtensionShortcuts(extensionRunner);
		this.showLoadedResources({ force: false, showDiagnosticsWhenQuiet: true });
		this.showStartupNoticesIfNeeded();
	}

	private applyRuntimeSettings(): void {
		this.footer.setSession(this.session);
		// workspacePanel removed
		this.footer.setAutoCompactEnabled(this.session.autoCompactionEnabled);
		this.footerDataProvider.setCwd(this.sessionManager.getCwd());
		this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
		this.ui.setShowHardwareCursor(this.settingsManager.getShowHardwareCursor());
		this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
		const editorPaddingX = this.settingsManager.getEditorPaddingX();
		const autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
		this.defaultEditor.setPaddingX(editorPaddingX);
		this.defaultEditor.setAutocompleteMaxVisible(autocompleteMaxVisible);
		if (this.editor !== this.defaultEditor) {
			this.editor.setPaddingX?.(editorPaddingX);
			this.editor.setAutocompleteMaxVisible?.(autocompleteMaxVisible);
		}
	}

	private async rebindCurrentSession(): Promise<void> {
		this.unsubscribe?.();
		this.unsubscribe = undefined;
		this.applyRuntimeSettings();
		await this.bindCurrentSessionExtensions();
		this.subscribeToEngine();
		await this.updateAvailableProviderCount();
		this.updateEditorBorderColor();
		this.updateTerminalTitle();
	}

	private async handleFatalRuntimeError(prefix: string, error: unknown): Promise<never> {
		const message = error instanceof Error ? error.message : String(error);
		this.showError(`${prefix}: ${message}`);
		stopThemeWatcher();
		this.stop();
		process.exit(1);
	}

	private renderCurrentSessionState(): void {
		this.chatContainer.clear();
		this.pendingMessagesContainer.clear();
		this.compactionQueuedMessages = [];
		this.streamingComponent = undefined;
		this.streamingMessage = undefined;
		this.pendingTools.clear();
		this.renderInitialMessages();
	}

	/**
	 * Get a registered tool definition by name (for custom rendering).
	 */
	private getRegisteredToolDefinition(toolName: string) {
		return this.session.getToolDefinition(toolName);
	}

	/**
	 * Set up keyboard shortcuts registered by extensions.
	 */
	private setupExtensionShortcuts(extensionRunner: ExtensionRunner): void {
		const shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
		if (shortcuts.size === 0) return;

		// Create a context for shortcut handlers
		const createContext = (): ExtensionContext => ({
			ui: this.createExtensionUIContext(),
			hasUI: true,
			cwd: this.sessionManager.getCwd(),
			sessionManager: this.sessionManager,
			modelRegistry: this.session.modelRegistry,
			model: this.session.model,
			isIdle: () => !this.session.isStreaming,
			signal: this.session.engine.signal,
			abort: () => this.session.abort(),
			hasPendingMessages: () => this.session.pendingMessageCount > 0,
			shutdown: () => {
				this.shutdownRequested = true;
			},
			getContextUsage: () => this.session.getContextUsage(),
			compact: (options) => {
				void (async () => {
					try {
						const result = await this.session.compact(options?.customInstructions);
						options?.onComplete?.(result);
					} catch (error) {
						const err = error instanceof Error ? error : new Error(String(error));
						options?.onError?.(err);
					}
				})();
			},
			getSystemPrompt: () => this.session.systemPrompt,
		});

		// Set up the extension shortcut handler on the default editor
		this.defaultEditor.onExtensionShortcut = (data: string) => {
			for (const [shortcutStr, shortcut] of shortcuts) {
				// Cast to KeyId - extension shortcuts use the same format
				if (matchesKey(data, shortcutStr as KeyId)) {
					// Run handler async, don't block input
					Promise.resolve(shortcut.handler(createContext())).catch((err) => {
						this.showError(`Shortcut handler error: ${err instanceof Error ? err.message : String(err)}`);
					});
					return true;
				}
			}
			return false;
		};
	}

	/**
	 * Set extension status text in the footer.
	 */
	private setExtensionStatus(key: string, text: string | undefined): void {
		this.footerDataProvider.setExtensionStatus(key, text);
		this.ui.requestRender();
	}

	private getWorkingLoaderMessage(): string {
		return this.workingMessage ?? this.defaultWorkingMessage;
	}

	private createWorkingLoader(): Loader {
		return new Loader(
			this.ui,
			(spinner) => theme.fg("accent", spinner),
			(text) => theme.fg("muted", text),
			this.getWorkingLoaderMessage(),
			this.workingIndicatorOptions ?? { frames: MOON_WORKING_FRAMES, intervalMs: 180 },
		);
	}

	private setWorkingMessage(message: string | undefined): void {
		this.workingMessage = message;
		if (this.loadingAnimation) {
			this.loadingAnimation.setMessage(message ?? this.defaultWorkingMessage);
		}
	}

	private stopWorkingLoader(): void {
		if (this.loadingAnimation) {
			this.loadingAnimation.stop();
			this.loadingAnimation = undefined;
		}
		this.statusContainer.clear();
	}

	private setWorkingVisible(visible: boolean): void {
		this.workingVisible = visible;
		if (!visible) {
			this.stopWorkingLoader();
			this.ui.requestRender();
			return;
		}
		if (this.session.isStreaming && !this.loadingAnimation) {
			this.statusContainer.clear();
			this.loadingAnimation = this.createWorkingLoader();
			this.statusContainer.addChild(this.loadingAnimation);
		}
		this.ui.requestRender();
	}

	private setWorkingIndicator(options?: LoaderIndicatorOptions): void {
		this.workingIndicatorOptions = options;
		this.loadingAnimation?.setIndicator(options);
		this.ui.requestRender();
	}

	private setHiddenThinkingLabel(label?: string): void {
		this.hiddenThinkingLabel = label ?? this.defaultHiddenThinkingLabel;
		for (const child of this.chatContainer.children) {
			if (child instanceof AssistantMessageComponent) {
				child.setHiddenThinkingLabel(this.hiddenThinkingLabel);
			}
		}
		if (this.streamingComponent) {
			this.streamingComponent.setHiddenThinkingLabel(this.hiddenThinkingLabel);
		}
		this.ui.requestRender();
	}

	/**
	 * Set an extension widget (string array or custom component).
	 */
	private setExtensionWidget(
		key: string,
		content: string[] | ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined,
		options?: ExtensionWidgetOptions,
	): void {
		const placement = options?.placement ?? "aboveEditor";
		const removeExisting = (map: Map<string, Component & { dispose?(): void }>) => {
			const existing = map.get(key);
			if (existing?.dispose) existing.dispose();
			map.delete(key);
		};

		removeExisting(this.extensionWidgetsAbove);
		removeExisting(this.extensionWidgetsBelow);

		if (content === undefined) {
			this.renderWidgets();
			return;
		}

		let component: Component & { dispose?(): void };

		if (Array.isArray(content)) {
			// Wrap string array in a Container with Text components
			const container = new Container();
			for (const line of content.slice(0, InteractiveMode.MAX_WIDGET_LINES)) {
				container.addChild(new Text(line, 1, 0));
			}
			if (content.length > InteractiveMode.MAX_WIDGET_LINES) {
				container.addChild(new Text(theme.fg("muted", "... (widget kesildi)"), 1, 0));
			}
			component = container;
		} else {
			// Factory function - create component
			component = content(this.ui, theme);
		}

		const targetMap = placement === "belowEditor" ? this.extensionWidgetsBelow : this.extensionWidgetsAbove;
		targetMap.set(key, component);
		this.renderWidgets();
	}

	private clearExtensionWidgets(): void {
		for (const widget of this.extensionWidgetsAbove.values()) {
			widget.dispose?.();
		}
		for (const widget of this.extensionWidgetsBelow.values()) {
			widget.dispose?.();
		}
		this.extensionWidgetsAbove.clear();
		this.extensionWidgetsBelow.clear();
		this.renderWidgets();
	}

	private resetExtensionUI(): void {
		if (this.extensionSelector) {
			this.hideExtensionSelector();
		}
		if (this.extensionInput) {
			this.hideExtensionInput();
		}
		if (this.extensionEditor) {
			this.hideExtensionEditor();
		}
		this.ui.hideOverlay();
		this.clearExtensionTerminalInputListeners();
		this.setExtensionFooter(undefined);
		this.setExtensionHeader(undefined);
		this.clearExtensionWidgets();
		this.footerDataProvider.clearExtensionStatuses();
		this.footer.invalidate();
		this.autocompleteProviderWrappers = [];
		this.setCustomEditorComponent(undefined);
		this.setupAutocompleteProvider();
		this.defaultEditor.onExtensionShortcut = undefined;
		this.updateTerminalTitle();
		this.workingMessage = undefined;
		this.workingVisible = true;
		this.setWorkingIndicator();
		if (this.loadingAnimation) {
			this.loadingAnimation.setMessage(`${this.defaultWorkingMessage} (durdurmak için ${keyText("app.interrupt")})`);
		}
		this.setHiddenThinkingLabel();
	}

	// Maximum total widget lines to prevent viewport overflow
	private static readonly MAX_WIDGET_LINES = 10;

	/**
	 * Render all extension widgets to the widget container.
	 */
	private renderWidgets(): void {
		if (!this.widgetContainerAbove || !this.widgetContainerBelow) return;
		this.renderWidgetContainer(this.widgetContainerAbove, this.extensionWidgetsAbove, true, true);
		this.renderWidgetContainer(this.widgetContainerBelow, this.extensionWidgetsBelow, false, false);
		this.ui.requestRender();
	}

	private renderWidgetContainer(
		container: Container,
		widgets: Map<string, Component & { dispose?(): void }>,
		spacerWhenEmpty: boolean,
		leadingSpacer: boolean,
	): void {
		container.clear();

		if (widgets.size === 0) {
			if (spacerWhenEmpty) {
				container.addChild(new Spacer(1));
			}
			return;
		}

		if (leadingSpacer) {
			container.addChild(new Spacer(1));
		}
		for (const component of widgets.values()) {
			container.addChild(component);
		}
	}

	/**
	 * Set a custom footer component, or restore the built-in footer.
	 */
	private setExtensionFooter(
		factory:
			| ((tui: TUI, thm: Theme, footerData: ReadonlyFooterDataProvider) => Component & { dispose?(): void })
			| undefined,
	): void {
		// Dispose existing custom footer
		if (this.customFooter?.dispose) {
			this.customFooter.dispose();
		}

		if (factory) {
			// Create custom footer, passing the data provider. refreshLayout places it above the composer.
			this.customFooter = factory(this.ui, theme, this.footerDataProvider);
		} else {
			// Restore built-in footer
			this.customFooter = undefined;
		}

		this.refreshLayout();
	}

	/**
	 * Set a custom header component, or restore the built-in header.
	 */
	private setExtensionHeader(factory: ((tui: TUI, thm: Theme) => Component & { dispose?(): void }) | undefined): void {
		// Header may not be initialized yet if called during early initialization
		if (!this.builtInHeader) {
			return;
		}

		// Dispose existing custom header
		if (this.customHeader?.dispose) {
			this.customHeader.dispose();
		}

		// Find the index of the current header in the header container
		const currentHeader = this.customHeader || this.builtInHeader;
		const index = this.headerContainer.children.indexOf(currentHeader);

		if (factory) {
			// Create and add custom header
			this.customHeader = factory(this.ui, theme);
			if (isExpandable(this.customHeader)) {
				this.customHeader.setExpanded(this.toolOutputExpanded);
			}
			if (index !== -1) {
				this.headerContainer.children[index] = this.customHeader;
			} else {
				// If not found (e.g. builtInHeader was never added), add at the top
				this.headerContainer.children.unshift(this.customHeader);
			}
		} else {
			// Restore built-in header
			this.customHeader = undefined;
			if (isExpandable(this.builtInHeader)) {
				this.builtInHeader.setExpanded(this.toolOutputExpanded);
			}
			if (index !== -1) {
				this.headerContainer.children[index] = this.builtInHeader;
			}
		}

		this.ui.requestRender();
	}

	private addExtensionTerminalInputListener(
		handler: (data: string) => { consume?: boolean; data?: string } | undefined,
	): () => void {
		const unsubscribe = this.ui.addInputListener(handler);
		this.extensionTerminalInputUnsubscribers.add(unsubscribe);
		return () => {
			unsubscribe();
			this.extensionTerminalInputUnsubscribers.delete(unsubscribe);
		};
	}

	private clearExtensionTerminalInputListeners(): void {
		for (const unsubscribe of this.extensionTerminalInputUnsubscribers) {
			unsubscribe();
		}
		this.extensionTerminalInputUnsubscribers.clear();
	}

	/**
	 * Create the ExtensionUIContext for extensions.
	 */
	private createExtensionUIContext(): ExtensionUIContext {
		return {
			select: (title, options, opts) => this.showExtensionSelector(title, options, opts),
			confirm: (title, message, opts) => this.showExtensionConfirm(title, message, opts),
			input: (title, placeholder, opts) => this.showExtensionInput(title, placeholder, opts),
			notify: (message, type) => this.showExtensionNotify(message, type),
			onTerminalInput: (handler) => this.addExtensionTerminalInputListener(handler),
			setStatus: (key, text) => this.setExtensionStatus(key, text),
			setWorkingMessage: (message) => this.setWorkingMessage(message),
			setWorkingVisible: (visible) => this.setWorkingVisible(visible),
			setWorkingIndicator: (options) => this.setWorkingIndicator(options),
			setHiddenThinkingLabel: (label) => this.setHiddenThinkingLabel(label),
			setWidget: (key, content, options) => this.setExtensionWidget(key, content, options),
			setFooter: (factory) => this.setExtensionFooter(factory),
			setHeader: (factory) => this.setExtensionHeader(factory),
			setTitle: (title) => this.ui.terminal.setTitle(title),
			custom: (factory, options) => this.showExtensionCustom(factory, options),
			pasteToEditor: (text) => this.editor.handleInput(`\x1b[200~${text}\x1b[201~`),
			setEditorText: (text) => this.editor.setText(text),
			getEditorText: () => this.editor.getExpandedText?.() ?? this.editor.getText(),
			editor: (title, prefill) => this.showExtensionEditor(title, prefill),
			addAutocompleteProvider: (factory) => {
				this.autocompleteProviderWrappers.push(factory);
				this.setupAutocompleteProvider();
			},
			setEditorComponent: (factory) => this.setCustomEditorComponent(factory),
			getEditorComponent: () => this.editorComponentFactory,
			get theme() {
				return theme;
			},
			getAllThemes: () => getAvailableThemesWithPaths(),
			getTheme: (name) => getThemeByName(name),
			setTheme: (themeOrName) => {
				if (themeOrName instanceof Theme) {
					setThemeInstance(themeOrName);
					this.ui.requestRender();
					return { success: true };
				}
				const result = setTheme(themeOrName, true);
				if (result.success) {
					if (this.settingsManager.getTheme() !== themeOrName) {
						this.settingsManager.setTheme(themeOrName);
					}
					this.ui.requestRender();
				}
				return result;
			},
			getToolsExpanded: () => this.toolOutputExpanded,
			setToolsExpanded: (expanded) => this.setToolsExpanded(expanded),
		};
	}

	/**
	 * Show a selector for extensions.
	 */
	private showExtensionSelector(
		title: string,
		options: string[],
		opts?: ExtensionUIDialogOptions,
	): Promise<string | undefined> {
		return new Promise((resolve) => {
			if (opts?.signal?.aborted) {
				resolve(undefined);
				return;
			}

			const onAbort = () => {
				this.hideExtensionSelector();
				resolve(undefined);
			};
			opts?.signal?.addEventListener("abort", onAbort, { once: true });

			this.extensionSelector = new ExtensionSelectorComponent(
				title,
				options,
				(option) => {
					opts?.signal?.removeEventListener("abort", onAbort);
					this.hideExtensionSelector();
					resolve(option);
				},
				() => {
					opts?.signal?.removeEventListener("abort", onAbort);
					this.hideExtensionSelector();
					resolve(undefined);
				},
				{ tui: this.ui, timeout: opts?.timeout },
			);

			this.editorContainer.clear();
			this.editorContainer.addChild(this.extensionSelector);
			this.ui.setFocus(this.extensionSelector);
			this.ui.requestRender();
		});
	}

	/**
	 * Hide the extension selector.
	 */
	private hideExtensionSelector(): void {
		this.extensionSelector?.dispose();
		this.editorContainer.clear();
		this.editorContainer.addChild(this.editor);
		this.extensionSelector = undefined;
		this.ui.setFocus(this.editor);
		this.ui.requestRender();
	}

	/**
	 * Show a confirmation dialog for extensions.
	 */
	private async showExtensionConfirm(
		title: string,
		message: string,
		opts?: ExtensionUIDialogOptions,
	): Promise<boolean> {
		const result = await this.showExtensionSelector(`${title}\n${message}`, ["Evet", "Hayır"], opts);
		return result === "Evet";
	}

	private async promptForMissingSessionCwd(error: MissingSessionCwdError): Promise<string | undefined> {
		const confirmed = await this.showExtensionConfirm(
			"Oturum çalışma dizini bulunamadı",
			formatMissingSessionCwdPrompt(error.issue),
		);
		return confirmed ? error.issue.fallbackCwd : undefined;
	}

	/**
	 * Show a text input for extensions.
	 */
	private showExtensionInput(
		title: string,
		placeholder?: string,
		opts?: ExtensionUIDialogOptions,
	): Promise<string | undefined> {
		return new Promise((resolve) => {
			if (opts?.signal?.aborted) {
				resolve(undefined);
				return;
			}

			const onAbort = () => {
				this.hideExtensionInput();
				resolve(undefined);
			};
			opts?.signal?.addEventListener("abort", onAbort, { once: true });

			this.extensionInput = new ExtensionInputComponent(
				title,
				placeholder,
				(value) => {
					opts?.signal?.removeEventListener("abort", onAbort);
					this.hideExtensionInput();
					resolve(value);
				},
				() => {
					opts?.signal?.removeEventListener("abort", onAbort);
					this.hideExtensionInput();
					resolve(undefined);
				},
				{ tui: this.ui, timeout: opts?.timeout },
			);

			this.editorContainer.clear();
			this.editorContainer.addChild(this.extensionInput);
			this.ui.setFocus(this.extensionInput);
			this.ui.requestRender();
		});
	}

	/**
	 * Hide the extension input.
	 */
	private hideExtensionInput(): void {
		this.extensionInput?.dispose();
		this.editorContainer.clear();
		this.editorContainer.addChild(this.editor);
		this.extensionInput = undefined;
		this.ui.setFocus(this.editor);
		this.ui.requestRender();
	}

	/**
	 * Show a multi-line editor for extensions (with Ctrl+G support).
	 */
	private showExtensionEditor(title: string, prefill?: string): Promise<string | undefined> {
		return new Promise((resolve) => {
			this.extensionEditor = new ExtensionEditorComponent(
				this.ui,
				this.keybindings,
				title,
				prefill,
				(value) => {
					this.hideExtensionEditor();
					resolve(value);
				},
				() => {
					this.hideExtensionEditor();
					resolve(undefined);
				},
			);

			this.editorContainer.clear();
			this.editorContainer.addChild(this.extensionEditor);
			this.ui.setFocus(this.extensionEditor);
			this.ui.requestRender();
		});
	}

	/**
	 * Hide the extension editor.
	 */
	private hideExtensionEditor(): void {
		this.editorContainer.clear();
		this.editorContainer.addChild(this.editor);
		this.extensionEditor = undefined;
		this.ui.setFocus(this.editor);
		this.ui.requestRender();
	}

	/**
	 * Set a custom editor component from an extension.
	 * Pass undefined to restore the default editor.
	 */
	private setCustomEditorComponent(factory: EditorFactory | undefined): void {
		this.editorComponentFactory = factory;

		// Save text from current editor before switching
		const currentText = this.editor.getText();

		this.editorContainer.clear();

		if (factory) {
			// Create the custom editor with tui, theme, and keybindings
			const newEditor = factory(this.ui, getEditorTheme(), this.keybindings);

			// Wire up callbacks from the default editor
			newEditor.onSubmit = this.defaultEditor.onSubmit;
			newEditor.onChange = this.defaultEditor.onChange;

			// Copy text from previous editor
			newEditor.setText(currentText);

			// Copy appearance settings if supported
			if (newEditor.borderColor !== undefined) {
				newEditor.borderColor = this.defaultEditor.borderColor;
			}
			if (newEditor.setPaddingX !== undefined) {
				newEditor.setPaddingX(this.defaultEditor.getPaddingX());
			}

			// Set autocomplete if supported
			if (newEditor.setAutocompleteProvider && this.autocompleteProvider) {
				newEditor.setAutocompleteProvider(this.autocompleteProvider);
			}

			// If extending CustomEditor, copy app-level handlers
			// Use duck typing since instanceof fails across jiti module boundaries
			const customEditor = newEditor as unknown as Record<string, unknown>;
			if ("actionHandlers" in customEditor && customEditor.actionHandlers instanceof Map) {
				if (!customEditor.onEscape) {
					customEditor.onEscape = () => this.defaultEditor.onEscape?.();
				}
				if (!customEditor.onCtrlD) {
					customEditor.onCtrlD = () => this.defaultEditor.onCtrlD?.();
				}
				if (!customEditor.onPasteImage) {
					customEditor.onPasteImage = () => this.defaultEditor.onPasteImage?.();
				}
				if (!customEditor.onExtensionShortcut) {
					customEditor.onExtensionShortcut = (data: string) => this.defaultEditor.onExtensionShortcut?.(data);
				}
				// Copy action handlers (clear, suspend, model switching, etc.)
				for (const [action, handler] of this.defaultEditor.actionHandlers) {
					(customEditor.actionHandlers as Map<string, () => void>).set(action, handler);
				}
			}

			this.editor = newEditor;
		} else {
			// Restore default editor with text from custom editor
			this.defaultEditor.setText(currentText);
			this.editor = this.defaultEditor;
		}

		this.editorContainer.addChild(this.editor as Component);
		this.ui.setFocus(this.editor as Component);
		this.ui.requestRender();
	}

	/**
	 * Show a notification for extensions.
	 */
	private showExtensionNotify(message: string, type?: "info" | "warning" | "error"): void {
		if (type === "error") {
			this.showError(message);
		} else if (type === "warning") {
			this.showWarning(message);
		} else {
			this.showStatus(message);
		}
	}

	/** Show a custom component with keyboard focus. Overlay mode renders on top of existing content. */
	private async showExtensionCustom<T>(
		factory: (
			tui: TUI,
			theme: Theme,
			keybindings: KeybindingsManager,
			done: (result: T) => void,
		) => (Component & { dispose?(): void }) | Promise<Component & { dispose?(): void }>,
		options?: {
			overlay?: boolean;
			overlayOptions?: OverlayOptions | (() => OverlayOptions);
			onHandle?: (handle: OverlayHandle) => void;
		},
	): Promise<T> {
		const savedText = this.editor.getText();
		const isOverlay = options?.overlay ?? false;

		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.editor.setText(savedText);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		return new Promise((resolve, reject) => {
			let component: Component & { dispose?(): void };
			let closed = false;

			const close = (result: T) => {
				if (closed) return;
				closed = true;
				if (isOverlay) this.ui.hideOverlay();
				else restoreEditor();
				// Note: both branches above already call requestRender
				resolve(result);
				try {
					component?.dispose?.();
				} catch {
					/* ignore dispose errors */
				}
			};

			Promise.resolve(factory(this.ui, theme, this.keybindings, close))
				.then((c) => {
					if (closed) return;
					component = c;
					if (isOverlay) {
						// Resolve overlay options - can be static or dynamic function
						const resolveOptions = (): OverlayOptions | undefined => {
							if (options?.overlayOptions) {
								const opts =
									typeof options.overlayOptions === "function"
										? options.overlayOptions()
										: options.overlayOptions;
								return opts;
							}
							// Fallback: use component's width property if available
							const w = (component as { width?: number }).width;
							return w ? { width: w } : undefined;
						};
						const handle = this.ui.showOverlay(component, resolveOptions());
						// Expose handle to caller for visibility control
						options?.onHandle?.(handle);
					} else {
						this.editorContainer.clear();
						this.editorContainer.addChild(component);
						this.ui.setFocus(component);
						this.ui.requestRender();
					}
				})
				.catch((err) => {
					if (closed) return;
					if (!isOverlay) restoreEditor();
					reject(err);
				});
		});
	}

	/**
	 * Show an extension error in the UI.
	 */
	private showExtensionError(extensionPath: string, error: string, stack?: string): void {
		const errorMsg = `Extension "${extensionPath}" error: ${error}`;
		const errorText = new Text(theme.fg("error", errorMsg), 1, 0);
		this.chatContainer.addChild(errorText);
		if (stack) {
			// Show stack trace in dim color, indented
			const stackLines = stack
				.split("\n")
				.slice(1) // Skip first line (duplicates error message)
				.map((line) => theme.fg("dim", `  ${line.trim()}`))
				.join("\n");
			if (stackLines) {
				this.chatContainer.addChild(new Text(stackLines, 1, 0));
			}
		}
		this.ui.requestRender();
	}

	// =========================================================================
	// Key Handlers
	// =========================================================================

	private setupKeyHandlers(): void {
		// Set up handlers on defaultEditor - they use this.editor for text access
		// so they work correctly regardless of which editor is active
		this.defaultEditor.onEscape = () => {
			if (this.session.isStreaming) {
				this.restoreQueuedMessagesToEditor({ abort: true });
			} else if (this.session.isBashRunning) {
				this.session.abortBash();
			} else if (this.isBashMode) {
				this.editor.setText("");
				this.isBashMode = false;
				this.updateEditorBorderColor();
			} else if (!this.editor.getText().trim()) {
				// Double-escape with empty editor triggers /tree, /fork, or nothing based on setting
				const action = this.settingsManager.getDoubleEscapeAction();
				if (action !== "none") {
					const now = Date.now();
					if (now - this.lastEscapeTime < 500) {
						if (action === "tree") {
							this.showTreeSelector();
						} else {
							this.showUserMessageSelector();
						}
						this.lastEscapeTime = 0;
					} else {
						this.lastEscapeTime = now;
					}
				}
			}
		};

		// Register app action handlers
		this.defaultEditor.onAction("app.clear", () => this.handleCtrlC());
		this.defaultEditor.onCtrlD = () => this.handleCtrlD();
		this.defaultEditor.onAction("app.suspend", () => this.handleCtrlZ());
		this.defaultEditor.onAction("app.thinking.cycle", () => this.cycleThinkingLevel());
		this.defaultEditor.onAction("app.model.cycleForward", () => this.cycleModel("forward"));
		this.defaultEditor.onAction("app.model.cycleBackward", () => this.cycleModel("backward"));

		// Global debug handler on TUI (works regardless of focus)
		this.ui.onDebug = () => this.handleDebugCommand();
		this.defaultEditor.onAction("app.model.select", () => this.showModelSelector());
		this.defaultEditor.onAction("app.tools.expand", () => this.toggleToolOutputExpansion());
		this.defaultEditor.onAction("app.thinking.toggle", () => this.toggleThinkingBlockVisibility());
		this.defaultEditor.onAction("app.editor.external", () => this.openExternalEditor());
		this.defaultEditor.onAction("app.message.followUp", () => this.handleFollowUp());
		this.defaultEditor.onAction("app.message.dequeue", () => this.handleDequeue());
		this.defaultEditor.onAction("app.message.executeBash", () => this.handleExecuteLastBash());
		this.defaultEditor.onAction("app.session.new", () => this.handleClearCommand());
		this.defaultEditor.onAction("app.session.tree", () => this.showTreeSelector());
		this.defaultEditor.onAction("app.session.fork", () => this.showUserMessageSelector());
		this.defaultEditor.onAction("app.session.resume", () => this.showSessionSelector());

		this.defaultEditor.onChange = (text: string) => {
			const wasBashMode = this.isBashMode;
			this.isBashMode = text.trimStart().startsWith("!");
			if (wasBashMode !== this.isBashMode) {
				this.updateEditorBorderColor();
			}
		};

		// Handle clipboard image paste (triggered on Ctrl+V)
		this.defaultEditor.onPasteImage = () => {
			this.handleClipboardImagePaste();
		};
	}

	private async handleClipboardImagePaste(): Promise<void> {
		try {
			const image = await readClipboardImage();
			if (!image) {
				return;
			}

			// Write to temp file
			const tmpDir = os.tmpdir();
			const ext = extensionForImageMimeType(image.mimeType) ?? "png";
			const fileName = `Moon-clipboard-${crypto.randomUUID()}.${ext}`;
			const filePath = path.join(tmpDir, fileName);
			fs.writeFileSync(filePath, Buffer.from(image.bytes));

			// Insert file path directly
			this.editor.insertTextAtCursor?.(filePath);
			this.ui.requestRender();
		} catch {
			// Silently ignore clipboard errors (may not have permission, etc.)
		}
	}

	private setupEditorSubmitHandler(): void {
		this.defaultEditor.onSubmit = async (text: string) => {
			if (this.isSubmitting) return;
			this.isSubmitting = true;
			try {
				text = text.trim();
				if (!text) return;

				// Handle commands
				if (text === "/status") {
					this.editor.setText("");
					await this.handleStatusDiagnosticsCommand();
					return;
				}
				if (text === "/help") {
					this.editor.setText("");
					this.handleHelpCommand();
					return;
				}
				if (text === "/metrics") {
					if (this.activeMetricsChart) {
						this.activeMetricsChart.stop();
						this.chatContainer.removeChild(this.activeMetricsChart);
					}
					// Mock data generation for now
					const memData = Array.from({ length: 40 }, () => Math.random() * 50 + 50);
					const tokenData = Array.from({ length: 40 }, () => Math.random() * 1000);
					this.activeMetricsChart = new MetricsChartComponent(memData, tokenData);
					this.chatContainer.addChild(this.activeMetricsChart);
					this.ui.requestRender();
					this.editor.setText("");
					return;
				}
				if (text === "/zen") {
					this.toggleZenMode();
					this.editor.setText("");
					return;
				}
				if (text === "/settings") {
					this.showSettingsSelector();
					this.editor.setText("");
					return;
				}
				if (text === "/mcp") {
					this.handleMcpCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/scoped-models") {
					this.editor.setText("");
					await this.showModelsSelector();
					return;
				}
				if (text === "/models" || text.startsWith("/models ")) {
					const searchTerm = text.startsWith("/models ") ? text.slice(8).trim() : undefined;
					this.editor.setText("");
					await this.handleModelsCommand(searchTerm);
					return;
				}
				if (text === "/export" || text.startsWith("/export ")) {
					await this.handleExportCommand(text);
					this.editor.setText("");
					return;
				}
				if (text === "/import" || text.startsWith("/import ")) {
					await this.handleImportCommand(text);
					this.editor.setText("");
					return;
				}
				if (text === "/share") {
					await this.handleShareCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/copy") {
					await this.handleCopyCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/name" || text.startsWith("/name ")) {
					this.handleNameCommand(text);
					this.editor.setText("");
					return;
				}
				if (text === "/session") {
					this.handleSessionCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/changelog") {
					this.handleChangelogCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/hotkeys") {
					this.handleHotkeysCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/fork") {
					this.showUserMessageSelector();
					this.editor.setText("");
					return;
				}
				if (text === "/swarm" || text.startsWith("/swarm ")) {
					const arg = text.startsWith("/swarm ") ? text.slice(7).trim() : "";
					this.editor.setText("");
					await this.handleSwarmCommand(arg);
					return;
				}
				if (text === "/fix" || text.startsWith("/fix ")) {
					const arg = text.startsWith("/fix ") ? text.slice(5).trim() : "";
					this.editor.setText("");
					await this.handleFixCommand(arg);
					return;
				}
				if (text === "/evolve") {
					this.editor.setText("");
					await this.handleEvolveCommand();
					return;
				}
				if (text === "/clone") {
					this.editor.setText("");
					await this.handleCloneCommand();
					return;
				}
				if (text === "/tree") {
					this.showTreeSelector();
					this.editor.setText("");
					return;
				}
				if (text === "/login") {
					this.showOAuthSelector("login");
					this.editor.setText("");
					return;
				}
				if (text === "/logout") {
					this.showOAuthSelector("logout");
					this.editor.setText("");
					return;
				}
				if (text === "/new") {
					this.editor.setText("");
					await this.handleClearCommand();
					return;
				}
				if (text === "/compact" || text.startsWith("/compact ")) {
					const customInstructions = text.startsWith("/compact ") ? text.slice(9).trim() : undefined;
					this.editor.setText("");
					await this.handleCompactCommand(customInstructions);
					return;
				}
				if (text === "/reload") {
					this.editor.setText("");
					await this.handleReloadCommand();
					return;
				}
				if (text === "/agentmode" || text.startsWith("/agentmode ")) {
					const args = text.startsWith("/agentmode ") ? text.slice(11).trim() : "";
					this.editor.setText("");
					this.handleAgentModeCommand(args);
					return;
				}
				if (text === "/agents" || text.startsWith("/agents ")) {
					const args = text.startsWith("/agents ") ? text.slice(8).trim() : "";
					this.editor.setText("");
					this.handleAgentsCommand(args);
					return;
				}
				if (text === "/workspace") {
					this.editor.setText("");
					this.handleWorkspaceCommand();
					return;
				}
				if (text === "/mood" || text.startsWith("/mood ")) {
					const args = text.startsWith("/mood ") ? text.slice(6).trim() : "";
					this.editor.setText("");
					this.handleMoodCommand(args);
					return;
				}
				if (text === "/browser") {
					this.editor.setText("");
					this.handleBrowserCommand();
					return;
				}
				if (text === "/interface") {
					this.editor.setText("");
					await this.handleInterfaceCommand();
					return;
				}
				if (text === "/videoedit") {
					this.editor.setText("");
					await this.handleVideoEditCommand();
					return;
				}
				if (text === "/photoedit") {
					this.editor.setText("");
					await this.handlePhotoEditCommand();
					return;
				}
				if (text === "/robotics" || text.startsWith("/robotics ")) {
					const args = text.startsWith("/robotics ") ? text.slice(10).trim() : "";
					this.editor.setText("");
					await this.handleRoboticsCommand(args);
					return;
				}
				if (text === "/discord" || text.startsWith("/discord ")) {
					const args = text.startsWith("/discord ") ? text.slice(9).trim() : "";
					this.editor.setText("");
					await this.handleDiscordCommand(args);
					return;
				}
				if (text === "/telegram" || text.startsWith("/telegram ")) {
					const args = text.startsWith("/telegram ") ? text.slice(10).trim() : "";
					this.editor.setText("");
					await this.handleTelegramCommand(args);
					return;
				}
				if (
					text === "/update" ||
					text.startsWith("/update ") ||
					text === "/upgrade" ||
					text.startsWith("/upgrade ")
				) {
					const args = text.startsWith("/upgrade ")
						? text.slice(9).trim()
						: text.startsWith("/update ")
							? text.slice(8).trim()
							: "";
					this.editor.setText("");
					await this.handleUpdateCommand(args);
					return;
				}
				if (text === "/impmodel" || text.startsWith("/impmodel ")) {
					// Redirect to /ollama pull <model>
					const args = text.startsWith("/impmodel ") ? text.slice(10).trim() : "";
					this.editor.setText("");
					await this.handleOllamaSlashCommand(args ? `pull ${args}` : "models");
					return;
				}
				if (text === "/index" || text.startsWith("/index ")) {
					this.editor.setText("");
					await this.handleIndexCommand(text.startsWith("/index ") ? text.slice(7).trim() : "");
					return;
				}
				if (text === "/ship" || text.startsWith("/ship ")) {
					this.editor.setText("");
					await this.handleShipCommand(text.startsWith("/ship ") ? text.slice(6).trim() : "");
					return;
				}
				if (text === "/git" || text.startsWith("/git ")) {
					this.editor.setText("");
					await this.handleGitCommand(text.startsWith("/git ") ? text.slice(5).trim() : "status");
					return;
				}
				if (text === "/ollama" || text.startsWith("/ollama ")) {
					this.editor.setText("");
					await this.handleOllamaSlashCommand(text.startsWith("/ollama ") ? text.slice(8).trim() : "models");
					return;
				}
				if (text === "/diff") {
					this.editor.setText("");
					await this.handleDiffCommand();
					return;
				}
				if (text === "/web" || text.startsWith("/web ")) {
					this.editor.setText("");
					await this.handleWebCommand();
					return;
				}
				if (text === "/marketplace" || text.startsWith("/marketplace ")) {
					this.editor.setText("");
					await this.handleMarketplaceCommand(text.startsWith("/marketplace ") ? text.slice(13).trim() : "");
					return;
				}
				if (text === "/debug") {
					this.handleDebugCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/arminsayshi") {
					this.handleArminSaysHi();
					this.editor.setText("");
					return;
				}
				if (text === "/dementedelves") {
					this.handleDementedDelves();
					this.editor.setText("");
					return;
				}
				if (text === "/resume") {
					this.showSessionSelector();
					this.editor.setText("");
					return;
				}
				if (text === "/quit") {
					this.editor.setText("");
					await this.shutdown();
					return;
				}
				if (text === "/context") {
					this.handleContextCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/hub") {
					this.handleHubCommand();
					this.editor.setText("");
					return;
				}
				if (text === "/plan" || text.startsWith("/plan ")) {
					const arg = text.startsWith("/plan ") ? text.slice(6).trim() : "";
					this.editor.setText("");
					this.handlePlanCommand(arg);
					return;
				}
				if (text === "/autothink" || text.startsWith("/autothink ")) {
					const arg = text.startsWith("/autothink ") ? text.slice(11).trim() : "";
					this.editor.setText("");
					this.handleAutoThinkCommand(arg);
					return;
				}
				if (text === "/routing" || text.startsWith("/routing ")) {
					const arg = text.startsWith("/routing ") ? text.slice(9).trim() : "";
					this.editor.setText("");
					this.handleRoutingCommand(arg);
					return;
				}
				if (text === "/automation" || text.startsWith("/automation ")) {
					const arg = text.startsWith("/automation ") ? text.slice(12).trim() : "";
					this.editor.setText("");
					this.handleAutomationCommand(arg);
					return;
				}
				if (text === "/init") {
					this.editor.setText("");
					await this.handleInitCommand();
					return;
				}

				// Handle bash command (! for normal, !! for excluded from context)
				if (text.startsWith("!")) {
					const isExcluded = text.startsWith("!!");
					const command = isExcluded ? text.slice(2).trim() : text.slice(1).trim();
					if (command) {
						if (this.session.isBashRunning) {
							this.showWarning("Bir bash komutu zaten çalışıyor. Cancel etmek için önce Esc tuşuna basın.");
							this.editor.setText(text);
							return;
						}
						this.editor.addToHistory?.(text);
						await this.handleBashCommand(command, isExcluded);
						this.isBashMode = false;
						this.updateEditorBorderColor();
						return;
					}
				}

				// Queue input during compaction (extension commands execute immediately)
				if (this.session.isCompacting) {
					if (this.isExtensionCommand(text)) {
						this.editor.addToHistory?.(text);
						this.editor.setText("");
						await this.session.prompt(text);
					} else {
						this.queueCompactionMessage(text, "steer");
					}
					return;
				}

				// If streaming, use prompt() with steer behavior
				// This handles extension commands (execute immediately), prompt template expansion, and queueing
				if (this.session.isStreaming) {
					this.editor.addToHistory?.(text);
					this.editor.setText("");
					await this.session.prompt(text, { streamingBehavior: "steer" });
					this.updatePendingMessagesDisplay();
					this.ui.requestRender();
					return;
				}

				// Normal message submission
				// First, move any pending bash components to chat
				this.flushPendingBashComponents();

				// Initialize task in Omega Kernel
				const kernel = OmegaKernel.getInstance();
				await kernel.initializeTask(text, this.sessionManager.getCwd());

				if (this.onInputCallback) {
					this.onInputCallback(text);
				}
				this.editor.addToHistory?.(text);
			} finally {
				this.isSubmitting = false;
			}
		};
	}

	private subscribeToEngine(): void {
		this.unsubscribe = this.session.subscribe(async (event) => {
			await this.handleEvent(event);
		});
	}

	private async handleEvent(event: EngineSessionEvent): Promise<void> {
		if (!this.isInitialized) {
			await this.init();
		}

		this.chatContainer.invalidate();
		this.updateWorkingMessageContextually?.(event);
		this.footer.invalidate();

		switch (event.type) {
			case "engine_start":
				if (this.settingsManager.getShowTerminalProgress()) {
					this.ui.terminal.setProgress(true);
				}
				// Restore main escape handler if retry handler is still active
				// (retry success event fires later, but we need main handler now)
				if (this.retryEscapeHandler) {
					this.defaultEditor.onEscape = this.retryEscapeHandler;
					this.retryEscapeHandler = undefined;
				}
				if (this.retryCountdown) {
					this.retryCountdown.dispose();
					this.retryCountdown = undefined;
				}
				if (this.retryLoader) {
					this.retryLoader.stop();
					this.retryLoader = undefined;
				}
				this.stopWorkingLoader();
				if (this.workingVisible) {
					this.loadingAnimation = this.createWorkingLoader();
					this.statusContainer.addChild(this.loadingAnimation);
				}
				this.ui.requestRender();
				break;

			case "queue_update":
				this.updatePendingMessagesDisplay();
				this.ui.requestRender();
				break;

			case "session_info_changed":
				this.updateTerminalTitle();
				this.footer.invalidate();
				this.ui.requestRender();
				break;

			case "thinking_level_changed":
				this.footer.invalidate();
				this.updateEditorBorderColor();
				break;

			case "message_start":
				if (event.message.role === "custom") {
					this.addMessageToChat(event.message);
					this.ui.requestRender();
				} else if (event.message.role === "user") {
					this.addMessageToChat(event.message);
					this.updatePendingMessagesDisplay();
					this.ui.requestRender();
				} else if (event.message.role === "assistant") {
					if (this.chatContainer.children.length > 0) {
						this.chatContainer.addChild(new Spacer(1));
					}
					this.streamingComponent = new AssistantMessageComponent(
						undefined,
						this.hideThinkingBlock,
						this.getMarkdownThemeWithSettings(),
						this.hiddenThinkingLabel,
					);
					this.streamingMessage = event.message;
					this.chatContainer.addChild(this.streamingComponent);
					this.streamingComponent.updateContent(this.streamingMessage);
					this.ui.requestRender();
				}
				break;

			case "message_update":
				if (this.streamingComponent && event.message.role === "assistant") {
					this.streamingMessage = event.message;
					this.streamingComponent.updateContent(this.streamingMessage);

					// Parse roadmap steps from message text (markdown checklist)
					const messageText = this.streamingMessage.content.find((c) => c.type === "text")?.text || "";
					if (messageText) {
						const taskMatches = [...messageText.matchAll(/[-*]\s*\[([ x/])\]\s*(.+)/g)];
						if (taskMatches.length > 0) {
							this.currentSteps = taskMatches.map((match, i) => {
								const state = match[1].toLowerCase();
								const label = match[2].trim();
								let status: "pending" | "active" | "completed" = "pending";
								if (state === "x") status = "completed";
								else if (state === "/") status = "active";

								return {
									id: `step-${i}`,
									label,
									status,
								};
							});
							this.roadmap.setSteps(this.currentSteps);
							this.roadmap.setEta(
								Math.ceil(this.currentSteps.filter((s) => s.status !== "completed").length * 2),
							);
							this.refreshLayout();
						}
					}

					for (const content of this.streamingMessage.content) {
						if (content.type === "toolCall") {
							if (!this.pendingTools.has(content.id)) {
								const component = new ToolExecutionComponent(
									content.name,
									content.id,
									content.arguments,
									{
										showImages: this.settingsManager.getShowImages(),
										imageWidthCells: this.settingsManager.getImageWidthCells(),
									},
									this.getRegisteredToolDefinition(content.name),
									this.ui,
									this.sessionManager.getCwd(),
								);
								component.setExpanded(this.toolOutputExpanded);
								this.chatContainer.addChild(component);
								this.pendingTools.set(content.id, component);
							} else {
								const component = this.pendingTools.get(content.id);
								if (component) {
									component.updateArgs(content.arguments);
								}
							}
						}
					}
					this.ui.requestRender();
				}
				break;

			case "message_end":
				if (event.message.role === "user") break;
				if (this.streamingComponent && event.message.role === "assistant") {
					this.streamingMessage = event.message;
					let errorMessage: string | undefined;
					if (this.streamingMessage.stopReason === "aborted") {
						const retryAttempt = this.session.retryAttempt;
						errorMessage =
							retryAttempt > 0
								? `Aborted after ${retryAttempt} retry attempt${retryAttempt > 1 ? "s" : ""}`
								: "Operation aborted";
						this.streamingMessage.errorMessage = errorMessage;
					}
					this.streamingComponent.updateContent(this.streamingMessage);

					if (this.streamingMessage.stopReason === "aborted" || this.streamingMessage.stopReason === "error") {
						if (!errorMessage) {
							errorMessage = this.streamingMessage.errorMessage || "Error";
						}
						for (const [, component] of this.pendingTools.entries()) {
							component.updateResult({
								content: [{ type: "text", text: errorMessage }],
								isError: true,
							});
						}
						this.pendingTools.clear();
					} else {
						// Args are now complete - trigger diff computation for edit tools
						for (const [, component] of this.pendingTools.entries()) {
							component.setArgsComplete();
						}
					}
					this.streamingComponent = undefined;
					this.streamingMessage = undefined;
					this.footer.invalidate();
				}
				this.ui.requestRender();
				break;

			case "tool_execution_start": {
				let component = this.pendingTools.get(event.toolCallId);
				if (!component) {
					component = new ToolExecutionComponent(
						event.toolName,
						event.toolCallId,
						event.args,
						{
							showImages: this.settingsManager.getShowImages(),
							imageWidthCells: this.settingsManager.getImageWidthCells(),
						},
						this.getRegisteredToolDefinition(event.toolName),
						this.ui,
						this.sessionManager.getCwd(),
					);
					component.setExpanded(this.toolOutputExpanded);
					this.chatContainer.addChild(component);
					this.pendingTools.set(event.toolCallId, component);
				}
				component.markExecutionStarted();

				// Update roadmap step based on tool name
				const activeStepIndex = this.currentSteps.findIndex((s) => s.status === "active");
				if (activeStepIndex !== -1 && this.currentSteps[activeStepIndex]) {
					this.roadmap.updateStepStatus(this.currentSteps[activeStepIndex].id, "active");
				}

				this.ui.requestRender();
				break;
			}

			case "tool_execution_update": {
				const component = this.pendingTools.get(event.toolCallId);
				if (component) {
					component.updateResult({ ...event.partialResult, isError: false }, true);
					this.ui.requestRender();
				}
				break;
			}

			case "tool_execution_end": {
				const component = this.pendingTools.get(event.toolCallId);
				if (component) {
					component.updateResult({ ...event.result, isError: event.isError });
					this.pendingTools.delete(event.toolCallId);

					// Move to next roadmap step
					const activeIndex = this.currentSteps.findIndex((s) => s.status === "active");
					if (activeIndex !== -1) {
						this.currentSteps[activeIndex].status = "completed";
						this.roadmap.updateStepStatus(this.currentSteps[activeIndex].id, "completed");

						if (this.currentSteps[activeIndex + 1]) {
							this.currentSteps[activeIndex + 1].status = "active";
							this.roadmap.updateStepStatus(this.currentSteps[activeIndex + 1].id, "active");
						}

						const remaining = this.currentSteps.filter((s) => s.status !== "completed").length;
						this.roadmap.setEta(Math.ceil(remaining * 0.5));
					}

					this.ui.requestRender();
				}
				break;
			}

			case "engine_end": {
				if (this.settingsManager.getShowTerminalProgress()) {
					this.ui.terminal.setProgress(false);
				}
				if (this.loadingAnimation) {
					this.loadingAnimation.stop();
					this.loadingAnimation = undefined;
					this.statusContainer.clear();
				}
				if (this.streamingComponent) {
					this.chatContainer.removeChild(this.streamingComponent);
					this.streamingComponent = undefined;
					this.streamingMessage = undefined;
				}
				this.pendingTools.clear();

				// Trigger verification and certificate creation in Omega Kernel asynchronously
				const oKernel = OmegaKernel.getInstance();
				if (oKernel.currentIntent && oKernel.currentIntent.effortMode !== "S0") {
					const cwd = this.sessionManager.getCwd();
					oKernel
						.verifyTask(cwd)
						.then((verResult) => {
							oKernel.buildPatchCertificate("", [], verResult);
							this.ui.requestRender();
						})
						.catch(() => {});
				}

				// Clear roadmap for next task
				this.currentSteps = [];
				this.roadmap.setSteps([]);
				this.roadmap.setEta(0);

				await this.checkShutdownRequested();

				this.ui.requestRender();
				break;
			}

			case "compaction_start": {
				if (this.settingsManager.getShowTerminalProgress()) {
					this.ui.terminal.setProgress(true);
				}
				// Keep editor active; submissions are queued during compaction.
				this.autoCompactionEscapeHandler = this.defaultEditor.onEscape;
				this.defaultEditor.onEscape = () => {
					this.session.abortCompaction();
				};
				this.statusContainer.clear();
				if (event.reason === "manual") {
					const cancelHint = `(${keyText("app.interrupt")} to cancel)`;
					this.autoCompactionLoader = new Loader(
						this.ui,
						(spinner) => theme.fg("accent", spinner),
						(text) => theme.fg("muted", text),
						`Compacting context... ${cancelHint}`,
					);
					this.statusContainer.addChild(this.autoCompactionLoader);
				}
				this.ui.requestRender();
				break;
			}

			case "compaction_end": {
				if (this.settingsManager.getShowTerminalProgress()) {
					this.ui.terminal.setProgress(false);
				}
				if (this.autoCompactionEscapeHandler) {
					this.defaultEditor.onEscape = this.autoCompactionEscapeHandler;
					this.autoCompactionEscapeHandler = undefined;
				}
				if (this.autoCompactionLoader) {
					this.autoCompactionLoader.stop();
					this.autoCompactionLoader = undefined;
					this.statusContainer.clear();
				}
				if (event.aborted) {
					if (event.reason === "manual") {
						this.showError("Sıkıştırma iptal edildi");
					} else {
						this.showStatus("Otomatik sıkıştırma iptal edildi");
					}
				} else if (event.result) {
					this.chatContainer.clear();
					this.rebuildChatFromMessages();
					this.addMessageToChat(
						createCompactionSummaryMessage(
							event.result.summary,
							event.result.tokensBefore,
							new Date().toISOString(),
						),
					);
					this.footer.invalidate();
				} else if (event.errorMessage) {
					if (event.reason === "manual") {
						this.showError(event.errorMessage);
					} else {
						this.chatContainer.addChild(new Spacer(1));
						this.chatContainer.addChild(new Text(theme.fg("error", event.errorMessage), 1, 0));
					}
				}
				void this.flushCompactionQueue({ willRetry: event.willRetry });
				this.ui.requestRender();
				break;
			}

			case "auto_retry_start": {
				// Set up escape to abort retry
				this.retryEscapeHandler = this.defaultEditor.onEscape;
				this.defaultEditor.onEscape = () => {
					this.session.abortRetry();
				};
				// Show retry indicator
				this.statusContainer.clear();
				this.retryCountdown?.dispose();
				const retryMessage = (seconds: number) =>
					`Yeniden deneniyor (${event.attempt}/${event.maxAttempts}), ${seconds}s içinde... (cancel: ${keyText("app.interrupt")})`;
				this.retryLoader = new Loader(
					this.ui,
					(spinner) => theme.fg("warning", spinner),
					(text) => theme.fg("muted", text),
					retryMessage(Math.ceil(event.delayMs / 1000)),
				);
				this.retryCountdown = new CountdownTimer(
					event.delayMs,
					this.ui,
					(seconds) => {
						this.retryLoader?.setMessage(retryMessage(seconds));
					},
					() => {
						this.retryCountdown = undefined;
					},
				);
				this.statusContainer.addChild(this.retryLoader);
				this.ui.requestRender();
				break;
			}

			case "auto_retry_end": {
				// Restore escape handler
				if (this.retryEscapeHandler) {
					this.defaultEditor.onEscape = this.retryEscapeHandler;
					this.retryEscapeHandler = undefined;
				}
				if (this.retryCountdown) {
					this.retryCountdown.dispose();
					this.retryCountdown = undefined;
				}
				// Stop loader
				if (this.retryLoader) {
					this.retryLoader.stop();
					this.retryLoader = undefined;
					this.statusContainer.clear();
				}
				// Show error only on final failure (success shows normal response)
				if (!event.success) {
					this.showError(
						`Yeniden deneme ${event.attempt} denemeden sonra başarısız oldu: ${event.finalError || "Bilinmeyen hata"}`,
					);
				}
				this.ui.requestRender();
				break;
			}
		}
	}

	/** Extract text content from a user message */
	private getUserMessageText(message: Message): string {
		if (message.role !== "user") return "";
		const textBlocks =
			typeof message.content === "string"
				? [{ type: "text", text: message.content }]
				: message.content.filter((c: { type: string }) => c.type === "text");
		return textBlocks.map((c) => (c as { text: string }).text).join("");
	}

	private updateWorkingMessageContextually(event: EngineSessionEvent): void {
		switch (event.type) {
			case "engine_start":
				this.setWorkingMessage("Hazirlaniyor...");
				break;
			case "message_update":
				if (event.message.role === "assistant") {
					const assistantMsg = event.message as AssistantMessage;
					const content = assistantMsg.content;

					// Check for tool calls first (highest priority)
					const hasToolCall = content.some((c) => c.type === "toolCall");
					if (hasToolCall) {
						const lastTool = content.filter((c) => c.type === "toolCall").pop() as ToolCall;
						if (lastTool) {
							this.setWorkingMessage(`${lastTool.name} hazirlaniyor...`);
							return;
						}
					}

					// Check for thinking/reasoning
					const isThinking = content.some((c) => c.type === "thinking");
					const hasText = content.some((c) => c.type === "text" && c.text.trim().length > 0);

					if (isThinking && !hasText) {
						this.setWorkingMessage("Dusunuyor...");
						return;
					}

					// Default to writing code if there's text or we're just generally responding
					this.setWorkingMessage("Kodu yaziyor...");
				}
				break;
			case "tool_execution_start":
				this.setWorkingMessage(`${event.toolName} calistiriliyor...`);
				break;
			case "engine_end":
				this.setWorkingMessage(undefined);
				this.notifyCompletion();
				break;
		}
	}

	private notifyCompletion(): void {
		// Terminal bell for quick background/other-tab awareness.
		process.stdout.write("\u0007");

		const spacer = new Spacer(1);
		const text = new Text(theme.fg("success", "◈ İşlem tamamlandı."), 1, 0);
		this.chatContainer.addChild(spacer);
		this.chatContainer.addChild(text);
		this.lastStatusSpacer = spacer;
		this.lastStatusText = text;
		this.ui.requestRender();
	}

	/**
	 * Show a status message in the chat.
	 *
	 * If multiple status messages are emitted back-to-back (without anything else being added to the chat),
	 * we update the previous status line instead of appending new ones to avoid log spam.
	 */
	private showStatus(message: string): void {
		const children = this.chatContainer.children;
		const last = children.length > 0 ? children[children.length - 1] : undefined;
		const secondLast = children.length > 1 ? children[children.length - 2] : undefined;

		if (last && secondLast && last === this.lastStatusText && secondLast === this.lastStatusSpacer) {
			this.lastStatusText.setText(theme.fg("dim", message));
			this.ui.requestRender();
			return;
		}

		const spacer = new Spacer(1);
		const text = new Text(theme.fg("dim", message), 1, 0);
		this.chatContainer.addChild(spacer);
		this.chatContainer.addChild(text);
		this.lastStatusSpacer = spacer;
		this.lastStatusText = text;
		this.ui.requestRender();
	}

	private addMessageToChat(message: EngineMessage, options?: { populateHistory?: boolean }): void {
		switch (message.role) {
			case "bashExecution": {
				const component = new BashExecutionComponent(message.command, this.ui, message.excludeFromContext);
				if (message.output) {
					component.appendOutput(message.output);
				}
				component.setComplete(
					message.exitCode,
					message.cancelled,
					message.truncated ? ({ truncated: true } as TruncationResult) : undefined,
					message.fullOutputPath,
				);
				this.chatContainer.addChild(component);
				break;
			}
			case "custom": {
				if (message.display) {
					const renderer = this.session.extensionRunner.getMessageRenderer(message.customType);
					const component = new CustomMessageComponent(message, renderer, this.getMarkdownThemeWithSettings());
					component.setExpanded(this.toolOutputExpanded);
					this.chatContainer.addChild(component);
				}
				break;
			}
			case "compactionSummary": {
				this.chatContainer.addChild(new Spacer(1));
				const component = new CompactionSummaryMessageComponent(message, this.getMarkdownThemeWithSettings());
				component.setExpanded(this.toolOutputExpanded);
				this.chatContainer.addChild(component);
				break;
			}
			case "branchSummary": {
				this.chatContainer.addChild(new Spacer(1));
				const component = new BranchSummaryMessageComponent(message, this.getMarkdownThemeWithSettings());
				component.setExpanded(this.toolOutputExpanded);
				this.chatContainer.addChild(component);
				break;
			}
			case "user": {
				const textContent = this.getUserMessageText(message);
				if (textContent) {
					if (this.chatContainer.children.length > 0) {
						this.chatContainer.addChild(new Spacer(1));
					}
					const skillBlock = parseSkillBlock(textContent);
					if (skillBlock) {
						// Render skill block (collapsible)
						const component = new SkillInvocationMessageComponent(
							skillBlock,
							this.getMarkdownThemeWithSettings(),
						);
						component.setExpanded(this.toolOutputExpanded);
						this.chatContainer.addChild(component);
						// Render user message separately if present
						if (skillBlock.userMessage) {
							const userComponent = new UserMessageComponent(
								skillBlock.userMessage,
								this.getMarkdownThemeWithSettings(),
							);
							this.chatContainer.addChild(userComponent);
						}
					} else {
						const userComponent = new UserMessageComponent(textContent, this.getMarkdownThemeWithSettings());
						this.chatContainer.addChild(userComponent);
					}
					if (options?.populateHistory) {
						this.editor.addToHistory?.(textContent);
					}
				}
				break;
			}
			case "assistant": {
				if (this.chatContainer.children.length > 0) {
					this.chatContainer.addChild(new Spacer(1));
				}
				const assistantComponent = new AssistantMessageComponent(
					message,
					this.hideThinkingBlock,
					this.getMarkdownThemeWithSettings(),
					this.hiddenThinkingLabel,
				);
				this.chatContainer.addChild(assistantComponent);
				break;
			}
			case "toolResult": {
				// Tool results are rendered inline with tool calls, handled separately
				break;
			}
			default: {
				const _exhaustive: never = message;
			}
		}
	}

	/**
	 * Render session context to chat. Used for initial load and rebuild after compaction.
	 * @param sessionContext Session context to render
	 * @param options.updateFooter Update footer state
	 * @param options.populateHistory Add user messages to editor history
	 */
	private renderSessionContext(
		sessionContext: SessionContext,
		options: { updateFooter?: boolean; populateHistory?: boolean } = {},
	): void {
		this.pendingTools.clear();

		if (options.updateFooter) {
			this.footer.invalidate();
			this.updateEditorBorderColor();
		}

		for (const message of sessionContext.messages) {
			// Assistant messages need special handling for tool calls
			if (message.role === "assistant") {
				this.addMessageToChat(message);
				// Render tool call components
				for (const content of message.content) {
					if (content.type === "toolCall") {
						const component = new ToolExecutionComponent(
							content.name,
							content.id,
							content.arguments,
							{
								showImages: this.settingsManager.getShowImages(),
								imageWidthCells: this.settingsManager.getImageWidthCells(),
							},
							this.getRegisteredToolDefinition(content.name),
							this.ui,
							this.sessionManager.getCwd(),
						);
						component.setExpanded(this.toolOutputExpanded);
						this.chatContainer.addChild(component);

						if (message.stopReason === "aborted" || message.stopReason === "error") {
							let errorMessage: string;
							if (message.stopReason === "aborted") {
								const retryAttempt = this.session.retryAttempt;
								errorMessage =
									retryAttempt > 0 ? `${retryAttempt} denemeden sonra iptal edildi` : "Operation cancelled";
							} else {
								errorMessage = message.errorMessage || "Error";
							}
							component.updateResult({ content: [{ type: "text", text: errorMessage }], isError: true });
						} else {
							this.pendingTools.set(content.id, component);
						}
					}
				}
			} else if (message.role === "toolResult") {
				// Match tool results to pending tool components
				const component = this.pendingTools.get(message.toolCallId);
				if (component) {
					component.updateResult(message);
					this.pendingTools.delete(message.toolCallId);
				}
			} else {
				// All other messages use standard rendering
				this.addMessageToChat(message, options);
			}
		}

		this.pendingTools.clear();
		this.ui.requestRender();
	}

	renderInitialMessages(): void {
		// macOS Style Intro
		const intro = buildInitialMessage();
		if (intro?.text && this.session.isNewSession) {
			this.chatContainer.addChild(new Text(intro.text, 0, 1));
			this.chatContainer.addChild(new DynamicBorder());
		}

		// Get aligned messages and entries from session context
		const context = this.sessionManager.buildSessionContext();
		this.renderSessionContext(context, {
			updateFooter: true,
			populateHistory: true,
		});

		// Show compaction info if session was compacted
		const allEntries = this.sessionManager.getEntries();
		const compactionCount = allEntries.filter((e) => e.type === "compaction").length;
		if (compactionCount > 0) {
			const times = compactionCount === 1 ? "1 time" : `${compactionCount} times`;
			this.showStatus(`Oturum ${times} kez sikistirildi`);
		}
	}

	async getUserInput(): Promise<string> {
		return new Promise((resolve) => {
			this.onInputCallback = (text: string) => {
				this.onInputCallback = undefined;
				resolve(text);
			};
		});
	}

	private rebuildChatFromMessages(): void {
		this.chatContainer.clear();
		const context = this.sessionManager.buildSessionContext();
		this.renderSessionContext(context);
	}

	// =========================================================================
	// Key handlers
	// =========================================================================

	private handleCtrlC(): void {
		const now = Date.now();
		if (now - this.lastSigintTime < 500) {
			void this.shutdown();
		} else {
			this.clearEditor();
			this.lastSigintTime = now;
		}
	}

	private handleCtrlD(): void {
		// Diff preview shortcut; if there is no diff, keep the old empty-editor exit behavior.
		void (async () => {
			try {
				const { getFullDiff } = await import("../../core/git-utils.js");
				const diff = await getFullDiff(this.sessionManager.getCwd());
				if (diff && diff !== "No diff.") {
					await this.handleDiffCommand();
					return;
				}
			} catch {}
			await this.shutdown();
		})();
	}

	/**
	 * Gracefully shutdown the engine.
	 * Stops the TUI before emitting shutdown events so extension UI cleanup cannot
	 * repaint the final frame while the process is exiting.
	 */
	private isShuttingDown = false;

	private async shutdown(): Promise<void> {
		if (this.isShuttingDown) return;
		this.isShuttingDown = true;
		this.unregisterSignalHandlers();

		// Drain any in-flight Kitty key release events before stopping.
		// This prevents escape sequences from leaking to the parent shell over slow SSH.
		await this.ui.terminal.drainInput(1000);

		this.stop();
		await this.runtimeHost.dispose();
		process.exit(0);
	}

	/**
	 * Check if shutdown was requested and perform shutdown if so.
	 */
	private async checkShutdownRequested(): Promise<void> {
		if (!this.shutdownRequested) return;
		await this.shutdown();
	}

	private registerSignalHandlers(): void {
		this.unregisterSignalHandlers();

		const signals: NodeJS.Signals[] = ["SIGTERM"];
		if (process.platform !== "win32") {
			signals.push("SIGHUP");
		}

		for (const signal of signals) {
			const handler = () => {
				killTrackedDetachedChildren();
				void this.shutdown();
			};
			process.on(signal, handler);
			this.signalCleanupHandlers.push(() => process.off(signal, handler));
		}
	}

	private unregisterSignalHandlers(): void {
		for (const cleanup of this.signalCleanupHandlers) {
			cleanup();
		}
		this.signalCleanupHandlers = [];
	}

	private handleCtrlZ(): void {
		if (process.platform === "win32") {
			this.showStatus("Arka plana alma Windows'ta desteklenmiyor");
			return;
		}

		// Keep the event loop alive while suspended. Without this, stopping the TUI
		// can leave Node with no ref'ed handles, causing the process to exit on fg
		// before the SIGCONT handler gets a chance to restore the terminal.
		const suspendKeepAlive = setInterval(() => {}, 2 ** 30);

		// Ignore SIGINT while suspended so Ctrl+C in the terminal does not
		// kill the backgrounded process. The handler is removed on resume.
		const ignoreSigint = () => {};
		process.on("SIGINT", ignoreSigint);

		// Set up handler to restore TUI when resumed
		process.once("SIGCONT", () => {
			clearInterval(suspendKeepAlive);
			process.removeListener("SIGINT", ignoreSigint);
			this.ui.start();
			this.ui.requestRender(true);
		});

		try {
			// Stop the TUI (restore terminal to normal mode)
			this.ui.stop();

			// Send SIGTSTP to process group (pid=0 means all processes in group)
			process.kill(0, "SIGTSTP");
		} catch (error) {
			clearInterval(suspendKeepAlive);
			process.removeListener("SIGINT", ignoreSigint);
			throw error;
		}
	}

	private async handleFollowUp(): Promise<void> {
		const text = (this.editor.getExpandedText?.() ?? this.editor.getText()).trim();
		if (!text) return;

		// Queue input during compaction (extension commands execute immediately)
		if (this.session.isCompacting) {
			if (this.isExtensionCommand(text)) {
				this.editor.addToHistory?.(text);
				this.editor.setText("");
				await this.session.prompt(text);
			} else {
				this.queueCompactionMessage(text, "followUp");
			}
			return;
		}

		// Alt+Enter queues a follow-up message (waits until engine finishes)
		// This handles extension commands (execute immediately), prompt template expansion, and queueing
		if (this.session.isStreaming) {
			this.editor.addToHistory?.(text);
			this.editor.setText("");
			await this.session.prompt(text, { streamingBehavior: "followUp" });
			this.updatePendingMessagesDisplay();
			this.ui.requestRender();
		}
		// If not streaming, Alt+Enter acts like regular Enter (trigger onSubmit)
		else if (this.editor.onSubmit) {
			this.editor.setText("");
			this.editor.onSubmit(text);
		}
	}

	private handleDequeue(): void {
		const restored = this.restoreQueuedMessagesToEditor();
		if (restored === 0) {
			this.showStatus("Geri yuklenecek kuyruklanmis mesaj yok");
		} else {
			this.showStatus(`${restored} kuyruklanmis mesaj editoru geri yuklendi`);
		}
	}

	private updateEditorBorderColor(): void {
		if (this.isBashMode) {
			this.editor.borderColor = theme.getBashModeBorderColor();
		} else {
			const level = this.session.thinkingLevel || "off";
			this.editor.borderColor = theme.getThinkingBorderColor(level);
		}
		this.ui.requestRender();
	}

	private cycleThinkingLevel(): void {
		const newLevel = this.session.cycleThinkingLevel();
		if (newLevel === undefined) {
			this.showStatus("Mevcut model dusunmeyi desteklemiyor");
		} else {
			this.footer.invalidate();
			this.updateEditorBorderColor();
			this.showStatus(`Dusunme seviyesi: ${newLevel}`);
		}
	}

	private async cycleModel(direction: "forward" | "backward"): Promise<void> {
		try {
			const result = await this.session.cycleModel(direction);
			if (result === undefined) {
				const msg = this.session.scopedModels.length > 0 ? "Only one model in scope" : "Only one model available";
				this.showStatus(msg);
			} else {
				this.footer.invalidate();
				this.updateEditorBorderColor();
				const thinkingStr =
					result.model.reasoning && result.thinkingLevel !== "off" ? ` (thinking: ${result.thinkingLevel})` : "";
				this.showStatus(`${result.model.name || result.model.id} modeline gecildi${thinkingStr}`);
				void this.maybeWarnAboutAnthropicSubscriptionAuth(result.model);
			}
		} catch (error) {
			this.showError(error instanceof Error ? error.message : String(error));
		}
	}

	private toggleToolOutputExpansion(): void {
		this.setToolsExpanded(!this.toolOutputExpanded);
	}

	private setToolsExpanded(expanded: boolean): void {
		this.toolOutputExpanded = expanded;
		const activeHeader = this.customHeader ?? this.builtInHeader;
		if (isExpandable(activeHeader)) {
			activeHeader.setExpanded(expanded);
		}
		for (const child of this.chatContainer.children) {
			if (isExpandable(child)) {
				child.setExpanded(expanded);
			}
		}
		this.ui.requestRender();
	}

	private toggleThinkingBlockVisibility(): void {
		this.hideThinkingBlock = !this.hideThinkingBlock;
		this.settingsManager.setHideThinkingBlock(this.hideThinkingBlock);

		// Rebuild chat from session messages
		this.chatContainer.clear();
		this.rebuildChatFromMessages();

		// If streaming, re-add the streaming component with updated visibility and re-render
		if (this.streamingComponent && this.streamingMessage) {
			this.streamingComponent.setHideThinkingBlock(this.hideThinkingBlock);
			this.streamingComponent.updateContent(this.streamingMessage);
			this.chatContainer.addChild(this.streamingComponent);
		}

		this.showStatus(`Dusunme bloklari: ${this.hideThinkingBlock ? "gizli" : "gorunur"}`);
	}

	private openExternalEditor(): void {
		// Determine editor (respect $VISUAL, then $EDITOR)
		const editorCmd = process.env.VISUAL || process.env.EDITOR;
		if (!editorCmd) {
			this.showWarning("Düzenleyici yapılandırılmamış. $VISUAL veya $EDITOR ortam değişkenini ayarlayın.");
			return;
		}

		const currentText = this.editor.getExpandedText?.() ?? this.editor.getText();
		const tmpFile = path.join(os.tmpdir(), `Moon-editor-${Date.now()}.Moon.md`);

		try {
			// Write current content to temp file
			fs.writeFileSync(tmpFile, currentText, "utf-8");

			// Stop TUI to release terminal
			this.ui.stop();

			// Split by space to support editor arguments (e.g., "code --wait")
			const [editor, ...editorArgs] = editorCmd.split(" ");

			// Spawn editor synchronously with inherited stdio for interactive editing
			const result = spawnSync(editor, [...editorArgs, tmpFile], {
				stdio: "inherit",
				shell: process.platform === "win32",
			});

			// On successful exit (status 0), replace editor content
			if (result.status === 0) {
				const newContent = fs.readFileSync(tmpFile, "utf-8").replace(/\n$/, "");
				this.editor.setText(newContent);
			}
			// On non-zero exit, keep original text (no action needed)
		} finally {
			// Clean up temp file
			try {
				fs.unlinkSync(tmpFile);
			} catch {
				// Ignore cleanup errors
			}

			// Restart TUI
			this.ui.start();
			// Force full re-render since external editor uses alternate screen
			this.ui.requestRender(true);
		}
	}

	// =========================================================================
	// UI helpers
	// =========================================================================

	clearEditor(): void {
		this.editor.setText("");
		this.ui.requestRender();
	}

	showError(errorMessage: string): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(theme.fg("error", `Error: ${errorMessage}`), 1, 0));
		this.ui.requestRender();
	}

	showWarning(warningMessage: string): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(theme.fg("warning", `Warning: ${warningMessage}`), 1, 0));
		this.ui.requestRender();
	}

	showNewVersionNotification(newVersion: string): void {
		const action = theme.fg("accent", `${APP_NAME} update`);
		const updateInstruction =
			theme.fg("muted", `Yeni sürüm ${newVersion} mevcut. Güncellemek için şunu çalıştırın: `) + action;
		const changelogUrl = theme.fg(
			"accent",
			"https://github.com/theayzek01/MoonCode/blob/main/packages/cli/CHANGELOG.md",
		);
		const changelogLine = theme.fg("muted", "Değişiklik Günlüğü: ") + changelogUrl;

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder((text) => theme.fg("warning", text)));
		this.chatContainer.addChild(
			new Text(
				`${theme.bold(theme.fg("warning", "Güncelleme Mevcut"))}\n${updateInstruction}\n${changelogLine}`,
				1,
				0,
			),
		);
		this.chatContainer.addChild(new DynamicBorder((text) => theme.fg("warning", text)));
		this.ui.requestRender();
	}

	showPackageUpdateNotification(packages: string[]): void {
		const action = theme.fg("accent", `${APP_NAME} update`);
		const updateInstruction =
			theme.fg("muted", "Paket güncellemeleri mevcut. Güncellemek için şunu çalıştırın: ") + action;
		const packageLines = packages.map((pkg) => `- ${pkg}`).join("\n");

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder((text) => theme.fg("warning", text)));
		this.chatContainer.addChild(
			new Text(
				`${theme.bold(theme.fg("warning", "Paket Güncellemeleri Mevcut"))}\n${updateInstruction}\n${theme.fg("muted", "Paketler:")}\n${packageLines}`,
				1,
				0,
			),
		);
		this.chatContainer.addChild(new DynamicBorder((text) => theme.fg("warning", text)));
		this.ui.requestRender();
	}

	/**
	 * Get all queued messages (read-only).
	 * Combines session queue and compaction queue.
	 */
	private getAllQueuedMessages(): { steering: string[]; followUp: string[] } {
		return {
			steering: [
				...this.session.getSteeringMessages(),
				...this.compactionQueuedMessages.filter((msg) => msg.mode === "steer").map((msg) => msg.text),
			],
			followUp: [
				...this.session.getFollowUpMessages(),
				...this.compactionQueuedMessages.filter((msg) => msg.mode === "followUp").map((msg) => msg.text),
			],
		};
	}

	/**
	 * Clear all queued messages and return their contents.
	 * Clears both session queue and compaction queue.
	 */
	private clearAllQueues(): { steering: string[]; followUp: string[] } {
		const { steering, followUp } = this.session.clearQueue();
		const compactionSteering = this.compactionQueuedMessages
			.filter((msg) => msg.mode === "steer")
			.map((msg) => msg.text);
		const compactionFollowUp = this.compactionQueuedMessages
			.filter((msg) => msg.mode === "followUp")
			.map((msg) => msg.text);
		this.compactionQueuedMessages = [];
		return {
			steering: [...steering, ...compactionSteering],
			followUp: [...followUp, ...compactionFollowUp],
		};
	}

	private updatePendingMessagesDisplay(): void {
		this.pendingMessagesContainer.clear();
		const { steering: steeringMessages, followUp: followUpMessages } = this.getAllQueuedMessages();
		if (steeringMessages.length > 0 || followUpMessages.length > 0) {
			this.pendingMessagesContainer.addChild(new Spacer(1));
			for (const message of steeringMessages) {
				const text = theme.fg("dim", `Yönlendirme: ${message}`);
				this.pendingMessagesContainer.addChild(new TruncatedText(text, 1, 0));
			}
			for (const message of followUpMessages) {
				const text = theme.fg("dim", `Takip: ${message}`);
				this.pendingMessagesContainer.addChild(new TruncatedText(text, 1, 0));
			}
			const dequeueHint = this.getAppKeyDisplay("app.message.dequeue");
			const hintText = theme.fg("dim", `↳ Tüm kuyruğa alınmış mesajları düzenlemek için ${dequeueHint}`);
			this.pendingMessagesContainer.addChild(new TruncatedText(hintText, 1, 0));
		}
	}

	private restoreQueuedMessagesToEditor(options?: { abort?: boolean; currentText?: string }): number {
		const { steering, followUp } = this.clearAllQueues();
		const allQueued = [...steering, ...followUp];
		if (allQueued.length === 0) {
			this.updatePendingMessagesDisplay();
			if (options?.abort) {
				this.engine.abort();
			}
			return 0;
		}
		const queuedText = allQueued.join("\n\n");
		const currentText = options?.currentText ?? this.editor.getText();
		const combinedText = [queuedText, currentText].filter((t) => t.trim()).join("\n\n");
		this.editor.setText(combinedText);
		this.updatePendingMessagesDisplay();
		if (options?.abort) {
			this.engine.abort();
		}
		return allQueued.length;
	}

	private queueCompactionMessage(text: string, mode: "steer" | "followUp"): void {
		this.compactionQueuedMessages.push({ text, mode });
		this.editor.addToHistory?.(text);
		this.editor.setText("");
		this.updatePendingMessagesDisplay();
		this.showStatus("Sıkıştırma sonrası için mesaj kuyruklandı");
	}

	private isExtensionCommand(text: string): boolean {
		if (!text.startsWith("/")) return false;

		const extensionRunner = this.session.extensionRunner;

		const spaceIndex = text.indexOf(" ");
		const commandName = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
		return !!extensionRunner.getCommand(commandName);
	}

	private async flushCompactionQueue(options?: { willRetry?: boolean }): Promise<void> {
		if (this.compactionQueuedMessages.length === 0) {
			return;
		}

		const queuedMessages = [...this.compactionQueuedMessages];
		this.compactionQueuedMessages = [];
		this.updatePendingMessagesDisplay();

		const restoreQueue = (error: unknown) => {
			this.session.clearQueue();
			this.compactionQueuedMessages = queuedMessages;
			this.updatePendingMessagesDisplay();
			this.showError(
				`Failed to send queued message${queuedMessages.length > 1 ? "s" : ""}: ${
					error instanceof Error ? error.message : String(error)
				}`,
			);
		};

		try {
			if (options?.willRetry) {
				// When retry is pending, queue messages for the retry turn
				for (const message of queuedMessages) {
					if (this.isExtensionCommand(message.text)) {
						await this.session.prompt(message.text);
					} else if (message.mode === "followUp") {
						await this.session.followUp(message.text);
					} else {
						await this.session.steer(message.text);
					}
				}
				this.updatePendingMessagesDisplay();
				return;
			}

			// Find first non-extension-command message to use as prompt
			const firstPromptIndex = queuedMessages.findIndex((message) => !this.isExtensionCommand(message.text));
			if (firstPromptIndex === -1) {
				// All extension commands - execute them all
				for (const message of queuedMessages) {
					await this.session.prompt(message.text);
				}
				return;
			}

			// Execute any extension commands before the first prompt
			const preCommands = queuedMessages.slice(0, firstPromptIndex);
			const firstPrompt = queuedMessages[firstPromptIndex];
			const rest = queuedMessages.slice(firstPromptIndex + 1);

			for (const message of preCommands) {
				await this.session.prompt(message.text);
			}

			// Send first prompt (starts streaming)
			const promptPromise = this.session.prompt(firstPrompt.text).catch((error) => {
				restoreQueue(error);
			});

			// Queue remaining messages
			for (const message of rest) {
				if (this.isExtensionCommand(message.text)) {
					await this.session.prompt(message.text);
				} else if (message.mode === "followUp") {
					await this.session.followUp(message.text);
				} else {
					await this.session.steer(message.text);
				}
			}
			this.updatePendingMessagesDisplay();
			void promptPromise;
		} catch (error) {
			restoreQueue(error);
		}
	}

	/** Move pending bash components from pending area to chat */
	private flushPendingBashComponents(): void {
		for (const component of this.pendingBashComponents) {
			this.pendingMessagesContainer.removeChild(component);
			this.chatContainer.addChild(component);
		}
		this.pendingBashComponents = [];
	}

	// =========================================================================
	// Selectors
	// =========================================================================

	/**
	 * Shows a selector component in place of the editor.
	 * @param create Factory that receives a `done` callback and returns the component and focus target
	 */
	private showSelector(create: (done: () => void) => { component: Component; focus: Component }): void {
		let isDone = false;
		const done = () => {
			if (isDone) return;
			isDone = true;
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
		};
		const { component, focus } = create(done);
		this.editorContainer.clear();
		this.editorContainer.addChild(component);
		this.ui.setFocus(focus);
		this.ui.requestRender();
	}

	private showSettingsSelector(): void {
		this.showSelector((done) => {
			const selector = new SettingsSelectorComponent(
				{
					autoCompact: this.session.autoCompactionEnabled,
					showImages: this.settingsManager.getShowImages(),
					imageWidthCells: this.settingsManager.getImageWidthCells(),
					autoResizeImages: this.settingsManager.getImageAutoResize(),
					blockImages: this.settingsManager.getBlockImages(),
					enableSkillCommands: this.settingsManager.getEnableSkillCommands(),
					steeringMode: this.session.steeringMode,
					followUpMode: this.session.followUpMode,
					transport: this.settingsManager.getTransport(),
					thinkingLevel: this.session.thinkingLevel,
					availableThinkingLevels: this.session.getAvailableThinkingLevels(),
					currentTheme: this.settingsManager.getTheme() || "dark",
					availableThemes: getAvailableThemes(),
					hideThinkingBlock: this.hideThinkingBlock,
					collapseChangelog: this.settingsManager.getCollapseChangelog(),
					enableInstallTelemetry: this.settingsManager.getEnableInstallTelemetry(),
					doubleEscapeAction: this.settingsManager.getDoubleEscapeAction(),
					treeFilterMode: this.settingsManager.getTreeFilterMode(),
					showHardwareCursor: this.settingsManager.getShowHardwareCursor(),
					editorPaddingX: this.settingsManager.getEditorPaddingX(),
					autocompleteMaxVisible: this.settingsManager.getAutocompleteMaxVisible(),
					quietStartup: this.settingsManager.getQuietStartup(),
					clearOnShrink: this.settingsManager.getClearOnShrink(),
					showTerminalProgress: this.settingsManager.getShowTerminalProgress(),
					warnings: this.settingsManager.getWarnings(),
				},
				{
					onAutoCompactChange: (enabled) => {
						this.session.setAutoCompactionEnabled(enabled);
						this.footer.setAutoCompactEnabled(enabled);
					},
					onShowImagesChange: (enabled) => {
						this.settingsManager.setShowImages(enabled);
						for (const child of this.chatContainer.children) {
							if (child instanceof ToolExecutionComponent) {
								child.setShowImages(enabled);
							}
						}
					},
					onImageWidthCellsChange: (width) => {
						this.settingsManager.setImageWidthCells(width);
						for (const child of this.chatContainer.children) {
							if (child instanceof ToolExecutionComponent) {
								child.setImageWidthCells(width);
							}
						}
					},
					onAutoResizeImagesChange: (enabled) => {
						this.settingsManager.setImageAutoResize(enabled);
					},
					onBlockImagesChange: (blocked) => {
						this.settingsManager.setBlockImages(blocked);
					},
					onEnableSkillCommandsChange: (enabled) => {
						this.settingsManager.setEnableSkillCommands(enabled);
						this.setupAutocompleteProvider();
					},
					onSteeringModeChange: (mode) => {
						this.session.setSteeringMode(mode);
					},
					onFollowUpModeChange: (mode) => {
						this.session.setFollowUpMode(mode);
					},
					onTransportChange: (transport) => {
						this.settingsManager.setTransport(transport);
						this.session.engine.transport = transport;
					},
					onThinkingLevelChange: (level) => {
						this.session.setThinkingLevel(level);
						this.footer.invalidate();
						this.updateEditorBorderColor();
					},
					onThemeChange: (themeName) => {
						const result = setTheme(themeName, true);
						this.settingsManager.setTheme(themeName);
						this.ui.invalidate();
						if (!result.success) {
							this.showError(`Failed to load theme "${themeName}": ${result.error}\nFell back to dark theme.`);
						}
					},
					onThemePreview: (themeName) => {
						const result = setTheme(themeName, true);
						if (result.success) {
							this.ui.invalidate();
							this.ui.requestRender();
						}
					},
					onHideThinkingBlockChange: (hidden) => {
						this.hideThinkingBlock = hidden;
						this.settingsManager.setHideThinkingBlock(hidden);
						for (const child of this.chatContainer.children) {
							if (child instanceof AssistantMessageComponent) {
								child.setHideThinkingBlock(hidden);
							}
						}
						this.chatContainer.clear();
						this.rebuildChatFromMessages();
					},
					onCollapseChangelogChange: (collapsed) => {
						this.settingsManager.setCollapseChangelog(collapsed);
					},
					onEnableInstallTelemetryChange: (enabled) => {
						this.settingsManager.setEnableInstallTelemetry(enabled);
					},
					onQuietStartupChange: (enabled) => {
						this.settingsManager.setQuietStartup(enabled);
					},
					onDoubleEscapeActionChange: (action) => {
						this.settingsManager.setDoubleEscapeAction(action);
					},
					onTreeFilterModeChange: (mode) => {
						this.settingsManager.setTreeFilterMode(mode);
					},
					onShowHardwareCursorChange: (enabled) => {
						this.settingsManager.setShowHardwareCursor(enabled);
						this.ui.setShowHardwareCursor(enabled);
					},
					onEditorPaddingXChange: (padding) => {
						this.settingsManager.setEditorPaddingX(padding);
						this.defaultEditor.setPaddingX(padding);
						if (this.editor !== this.defaultEditor && this.editor.setPaddingX !== undefined) {
							this.editor.setPaddingX(padding);
						}
					},
					onAutocompleteMaxVisibleChange: (maxVisible) => {
						this.settingsManager.setAutocompleteMaxVisible(maxVisible);
						this.defaultEditor.setAutocompleteMaxVisible(maxVisible);
						if (this.editor !== this.defaultEditor && this.editor.setAutocompleteMaxVisible !== undefined) {
							this.editor.setAutocompleteMaxVisible(maxVisible);
						}
					},
					onClearOnShrinkChange: (enabled) => {
						this.settingsManager.setClearOnShrink(enabled);
						this.ui.setClearOnShrink(enabled);
					},
					onShowTerminalProgressChange: (enabled) => {
						this.settingsManager.setShowTerminalProgress(enabled);
					},
					onWarningsChange: (warnings) => {
						this.settingsManager.setWarnings(warnings);
					},
					onCancel: () => {
						done();
						this.ui.requestRender();
					},
				},
			);
			return { component: selector, focus: selector.getSettingsList() };
		});
	}

	private async handleModelsCommand(searchTerm?: string): Promise<void> {
		if (!searchTerm) {
			this.showSingleModelSelector();
			return;
		}

		const model = await this.findExactModelMatch(searchTerm);
		if (model) {
			try {
				await this.session.setModel(model);
				this.footer.invalidate();
				this.updateEditorBorderColor();
				this.showStatus(`Model: ${model.id}`);
				void this.maybeWarnAboutAnthropicSubscriptionAuth(model);
				this.checkDaxnutsEasterEgg(model);
			} catch (error) {
				this.showError(error instanceof Error ? error.message : String(error));
			}
			return;
		}

		this.showSingleModelSelector(searchTerm);
	}

	private async findExactModelMatch(searchTerm: string): Promise<Model<any> | undefined> {
		const models = await this.getModelCandidates();
		return findExactModelReferenceMatch(searchTerm, models);
	}

	private async getModelCandidates(): Promise<Model<any>[]> {
		if (this.session.scopedModels.length > 0) {
			return this.session.scopedModels.map((scoped) => scoped.model);
		}

		this.session.modelRegistry.refresh();
		try {
			return await this.session.modelRegistry.getAvailable();
		} catch {
			return [];
		}
	}

	/** Update the footer's available provider count from current model candidates */
	private async updateAvailableProviderCount(): Promise<void> {
		const models = await this.getModelCandidates();
		const uniqueProviders = new Set(models.map((m) => m.provider));
		this.footerDataProvider.setAvailableProviderCount(uniqueProviders.size);
	}

	private async maybeWarnAboutAnthropicSubscriptionAuth(
		model: Model<any> | undefined = this.session.model,
	): Promise<void> {
		if (this.settingsManager.getWarnings().anthropicExtraUsage === false) {
			return;
		}
		if (this.anthropicSubscriptionWarningShown) {
			return;
		}
		if (!model || model.provider !== "anthropic") {
			return;
		}

		const storedCredential = this.session.modelRegistry.authStorage.get("anthropic");
		if (storedCredential?.type === "oauth") {
			this.anthropicSubscriptionWarningShown = true;
			this.showWarning(ANTHROPIC_SUBSCRIPTION_AUTH_WARNING);
			return;
		}

		try {
			const apiKey = await this.session.modelRegistry.getApiKeyForProvider(model.provider);
			if (!isAnthropicSubscriptionAuthKey(apiKey)) {
				return;
			}
			this.anthropicSubscriptionWarningShown = true;
			this.showWarning(ANTHROPIC_SUBSCRIPTION_AUTH_WARNING);
		} catch {
			// Ignore auth lookup failures for warning-only checks.
		}
	}

	private showSingleModelSelector(initialSearchInput?: string): void {
		this.showSelector((done) => {
			const selector = new ModelSelectorComponent(
				this.ui,
				this.session.model,
				this.settingsManager,
				this.session.modelRegistry,
				this.session.scopedModels,
				async (model) => {
					try {
						await this.session.setModel(model);
						this.footer.invalidate();
						this.updateEditorBorderColor();
						done();
						this.showStatus(`Model seçildi: ${model.id}`);
						void this.maybeWarnAboutAnthropicSubscriptionAuth(model);
						this.checkDaxnutsEasterEgg(model);
					} catch (error) {
						done();
						this.showError(error instanceof Error ? error.message : String(error));
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
				initialSearchInput,
			);
			return { component: selector, focus: selector };
		});
	}

	private async showModelsSelector(): Promise<void> {
		// Get all available models
		this.session.modelRegistry.refresh();
		const allModels = this.session.modelRegistry.getAvailable();

		if (allModels.length === 0) {
			this.showStatus("Kullanılabilir model yok");
			return;
		}

		// Check if session has scoped models (from previous session-only changes or CLI --models)
		const sessionScopedModels = this.session.scopedModels;
		const hasSessionScope = sessionScopedModels.length > 0;

		// Build enabled model IDs from session state or settings
		let currentEnabledIds: string[] | null = null;

		if (hasSessionScope) {
			// Use current session's scoped models
			currentEnabledIds = sessionScopedModels.map((scoped) => `${scoped.model.provider}/${scoped.model.id}`);
		} else {
			// Fall back to settings
			const patterns = this.settingsManager.getEnabledModels();
			if (patterns !== undefined && patterns.length > 0) {
				const scopedModels = await resolveModelScope(patterns, this.session.modelRegistry);
				currentEnabledIds = scopedModels.map((scoped) => `${scoped.model.provider}/${scoped.model.id}`);
			}
		}

		// Helper to update session's scoped models (session-only, no persist)
		const updateSessionModels = async (enabledIds: string[] | null) => {
			currentEnabledIds = enabledIds === null ? null : [...enabledIds];
			if (enabledIds && enabledIds.length > 0 && enabledIds.length < allModels.length) {
				const newScopedModels = await resolveModelScope(enabledIds, this.session.modelRegistry);
				this.session.setScopedModels(
					newScopedModels.map((sm) => ({
						model: sm.model,
						thinkingLevel: sm.thinkingLevel,
					})),
				);
			} else {
				// All enabled or none enabled = no filter
				this.session.setScopedModels([]);
			}
			await this.updateAvailableProviderCount();
			this.ui.requestRender();
		};

		this.showSelector((done) => {
			const selector = new ScopedModelsSelectorComponent(
				{
					allModels,
					enabledModelIds: currentEnabledIds,
				},
				{
					onChange: async (enabledIds) => {
						await updateSessionModels(enabledIds);
					},
					onPersist: (enabledIds) => {
						// Persist to settings
						const newPatterns =
							enabledIds === null || enabledIds.length === allModels.length
								? undefined // All enabled = clear filter
								: enabledIds;
						this.settingsManager.setEnabledModels(newPatterns ? [...newPatterns] : undefined);
						this.showStatus("Model seçimi ayarlara kaydedildi");
					},
					onCancel: () => {
						done();
						this.ui.requestRender();
					},
				},
			);
			return { component: selector, focus: selector };
		});
	}

	private showUserMessageSelector(): void {
		const userMessages = this.session.getUserMessagesForForking();

		if (userMessages.length === 0) {
			this.showStatus("Çatallanacak mesaj yok");
			return;
		}

		const initialSelectedId = userMessages[userMessages.length - 1]?.entryId;

		this.showSelector((done) => {
			const selector = new UserMessageSelectorComponent(
				userMessages.map((m) => ({ id: m.entryId, text: m.text })),
				async (entryId) => {
					try {
						const result = await this.runtimeHost.fork(entryId);
						if (result.cancelled) {
							done();
							this.ui.requestRender();
							return;
						}

						this.renderCurrentSessionState();
						this.editor.setText(result.selectedText ?? "");
						done();
						this.showStatus("Yeni oturuma çatallandı");
					} catch (error: unknown) {
						done();
						this.showError(error instanceof Error ? error.message : String(error));
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
				initialSelectedId,
			);
			return { component: selector, focus: selector.getMessageList() };
		});
	}

	private async handleCloneCommand(): Promise<void> {
		const leafId = this.sessionManager.getLeafId();
		if (!leafId) {
			this.showStatus("Henüz kopyalanacak bir şey yok");
			return;
		}

		try {
			const result = await this.runtimeHost.fork(leafId, { position: "at" });
			if (result.cancelled) {
				this.ui.requestRender();
				return;
			}

			this.renderCurrentSessionState();
			this.editor.setText("");
			this.showStatus("Yeni oturuma kopyalandı");
		} catch (error: unknown) {
			this.showError(error instanceof Error ? error.message : String(error));
		}
	}

	private showTreeSelector(initialSelectedId?: string): void {
		const tree = this.sessionManager.getTree();
		const realLeafId = this.sessionManager.getLeafId();
		const initialFilterMode = this.settingsManager.getTreeFilterMode();

		if (tree.length === 0) {
			this.showStatus("Oturumda girdi yok");
			return;
		}

		this.showSelector((done) => {
			const selector = new TreeSelectorComponent(
				tree,
				realLeafId,
				this.ui.terminal.rows,
				async (entryId) => {
					// Selecting the current leaf is a no-op (already there)
					if (entryId === realLeafId) {
						done();
						this.showStatus("Zaten bu noktadasınız");
						return;
					}

					// Ask about summarization
					done(); // Close selector first

					// Loop until user makes a complete choice or cancels to tree
					let wantsSummary = false;
					let customInstructions: string | undefined;

					// Check if we should skip the prompt (user preference to always default to no summary)
					if (!this.settingsManager.getBranchSummarySkipPrompt()) {
						while (true) {
							const summaryChoice = await this.showExtensionSelector("Dal özetlensin mi?", [
								"Özet yok",
								"Özetle",
								"Özel istem ile özetle",
							]);

							if (summaryChoice === undefined) {
								// User pressed escape - re-show tree selector with same selection
								this.showTreeSelector(entryId);
								return;
							}

							wantsSummary = summaryChoice !== "Özet yok";

							if (summaryChoice === "Özel istem ile özetle") {
								customInstructions = await this.showExtensionEditor("Özel özetleme talimatları");
								if (customInstructions === undefined) {
									// User cancelled - loop back to summary selector
									continue;
								}
							}

							// User made a complete choice
							break;
						}
					}

					// Set up escape handler and loader if summarizing
					let summaryLoader: Loader | undefined;
					const originalOnEscape = this.defaultEditor.onEscape;

					if (wantsSummary) {
						this.defaultEditor.onEscape = () => {
							this.session.abortBranchSummary();
						};
						this.chatContainer.addChild(new Spacer(1));
						summaryLoader = new Loader(
							this.ui,
							(spinner) => theme.fg("accent", spinner),
							(text) => theme.fg("muted", text),
							`Dal özetleniyor... (iptal etmek için ${keyText("app.interrupt")})`,
						);
						this.statusContainer.addChild(summaryLoader);
						this.ui.requestRender();
					}

					try {
						const result = await this.session.navigateTree(entryId, {
							summarize: wantsSummary,
							customInstructions,
						});

						if (result.aborted) {
							// Summarization aborted - re-show tree selector with same selection
							this.showStatus("Dal özetleme iptal edildi");
							this.showTreeSelector(entryId);
							return;
						}
						if (result.cancelled) {
							this.showStatus("Gezinti iptal edildi");
							return;
						}

						// Update UI
						this.chatContainer.clear();
						this.renderInitialMessages();
						if (result.editorText && !this.editor.getText().trim()) {
							this.editor.setText(result.editorText);
						}
						this.showStatus("Seçilen noktaya gidildi");
						void this.flushCompactionQueue({ willRetry: false });
					} catch (error) {
						this.showError(error instanceof Error ? error.message : String(error));
					} finally {
						if (summaryLoader) {
							summaryLoader.stop();
							this.statusContainer.clear();
						}
						this.defaultEditor.onEscape = originalOnEscape;
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
				(entryId, label) => {
					this.sessionManager.appendLabelChange(entryId, label);
					this.ui.requestRender();
				},
				initialSelectedId,
				initialFilterMode,
			);
			return { component: selector, focus: selector };
		});
	}

	private showSessionSelector(): void {
		this.showSelector((done) => {
			const selector = new SessionSelectorComponent(
				(onProgress) =>
					SessionManager.list(this.sessionManager.getCwd(), this.sessionManager.getSessionDir(), onProgress),
				SessionManager.listAll,
				async (sessionPath) => {
					done();
					await this.handleResumeSession(sessionPath);
				},
				() => {
					done();
					this.ui.requestRender();
				},
				() => {
					void this.shutdown();
				},
				() => this.ui.requestRender(),
				{
					renameSession: async (sessionFilePath: string, nextName: string | undefined) => {
						const next = (nextName ?? "").trim();
						if (!next) return;
						const mgr = SessionManager.open(sessionFilePath);
						mgr.appendSessionInfo(next);
					},
					showRenameHint: true,
					keybindings: this.keybindings,
				},

				this.sessionManager.getSessionFile(),
			);
			return { component: selector, focus: selector };
		});
	}

	private async handleResumeSession(
		sessionPath: string,
		options?: Parameters<ExtensionCommandContext["switchSession"]>[1],
	): Promise<{ cancelled: boolean }> {
		if (this.loadingAnimation) {
			this.loadingAnimation.stop();
			this.loadingAnimation = undefined;
		}
		this.statusContainer.clear();
		try {
			const result = await this.runtimeHost.switchSession(sessionPath, {
				withSession: options?.withSession,
			});
			if (result.cancelled) {
				return result;
			}
			this.renderCurrentSessionState();
			this.showStatus("Oturuma devam ediliyor");
			return result;
		} catch (error: unknown) {
			if (error instanceof MissingSessionCwdError) {
				const selectedCwd = await this.promptForMissingSessionCwd(error);
				if (!selectedCwd) {
					this.showStatus("Devam etme iptal edildi");
					return { cancelled: true };
				}
				const result = await this.runtimeHost.switchSession(sessionPath, {
					cwdOverride: selectedCwd,
					withSession: options?.withSession,
				});
				if (result.cancelled) {
					return result;
				}
				this.renderCurrentSessionState();
				this.showStatus("Mevcut calisma dizininde oturuma devam ediliyor");
				return result;
			}
			return this.handleFatalRuntimeError("Failed to resume session", error);
		}
	}

	private getLoginProviderOptions(authType?: "oauth" | "api_key"): AuthSelectorProvider[] {
		const authStorage = this.session.modelRegistry.authStorage;
		const oauthProviders = authStorage.getOAuthProviders();
		const oauthProviderIds = new Set(oauthProviders.map((provider) => provider.id));
		const options: AuthSelectorProvider[] = oauthProviders.map((provider) => ({
			id: provider.id,
			name: provider.name,
			authType: "oauth",
		}));

		const modelProviders = new Set(this.session.modelRegistry.getAll().map((model) => model.provider));
		for (const providerId of modelProviders) {
			if (!isApiKeyLoginProvider(providerId, oauthProviderIds)) {
				continue;
			}
			options.push({
				id: providerId,
				name: this.session.modelRegistry.getProviderDisplayName(providerId),
				authType: "api_key",
			});
		}

		const filteredOptions = authType ? options.filter((option) => option.authType === authType) : options;
		return filteredOptions.sort((a, b) => a.name.localeCompare(b.name));
	}

	private getLogoutProviderOptions(): AuthSelectorProvider[] {
		const authStorage = this.session.modelRegistry.authStorage;
		const options: AuthSelectorProvider[] = [];

		for (const providerId of authStorage.list()) {
			const credential = authStorage.get(providerId);
			if (!credential) {
				continue;
			}
			options.push({
				id: providerId,
				name: this.session.modelRegistry.getProviderDisplayName(providerId),
				authType: credential.type,
			});
		}

		return options.sort((a, b) => a.name.localeCompare(b.name));
	}

	private showLoginAuthTypeSelector(): void {
		const subscriptionLabel = "Abonelik kullan";
		const apiKeyLabel = "API anahtarı kullan";
		this.showSelector((done) => {
			const selector = new ExtensionSelectorComponent(
				"Kimlik doğrulama yöntemi seçin:",
				[subscriptionLabel, apiKeyLabel],
				(option) => {
					done();
					const authType = option === subscriptionLabel ? "oauth" : "api_key";
					this.showLoginProviderSelector(authType);
				},
				() => {
					done();
					this.ui.requestRender();
				},
			);
			return { component: selector, focus: selector };
		});
	}

	private showLoginProviderSelector(authType: "oauth" | "api_key"): void {
		const providerOptions = this.getLoginProviderOptions(authType);
		if (providerOptions.length === 0) {
			this.showStatus(
				authType === "oauth" ? "Abonelik sağlayıcısı bulunamadı." : "API anahtarı sağlayıcısı bulunamadı.",
			);
			return;
		}

		this.showSelector((done) => {
			const selector = new OAuthSelectorComponent(
				"login",
				this.session.modelRegistry.authStorage,
				providerOptions,
				async (providerId: string) => {
					done();

					const providerOption = providerOptions.find((provider) => provider.id === providerId);
					if (!providerOption) {
						return;
					}

					if (providerOption.authType === "oauth") {
						await this.showLoginDialog(providerOption.id, providerOption.name);
					} else if (providerOption.id === BEDROCK_PROVIDER_ID) {
						this.showBedrockSetupDialog(providerOption.id, providerOption.name);
					} else {
						await this.showApiKeyLoginDialog(providerOption.id, providerOption.name);
					}
				},
				() => {
					done();
					this.showLoginAuthTypeSelector();
				},
				(providerId) => this.session.modelRegistry.getProviderAuthStatus(providerId),
			);
			return { component: selector, focus: selector };
		});
	}

	private async showOAuthSelector(mode: "login" | "logout"): Promise<void> {
		if (mode === "login") {
			this.showLoginAuthTypeSelector();
			return;
		}

		const providerOptions = this.getLogoutProviderOptions();
		if (providerOptions.length === 0) {
			this.showStatus(
				"Kaldırılacak saklanmış kimlik bilgisi yok. /logout sadece /login ile kaydedilenleri kaldırır; ortam değişkenleri ve models.json ayarları değişmez.",
			);
			return;
		}

		this.showSelector((done) => {
			const selector = new OAuthSelectorComponent(
				mode,
				this.session.modelRegistry.authStorage,
				providerOptions,
				async (providerId: string) => {
					done();

					const providerOption = providerOptions.find((provider) => provider.id === providerId);
					if (!providerOption) {
						return;
					}

					try {
						this.session.modelRegistry.authStorage.logout(providerOption.id);
						this.session.modelRegistry.refresh();
						await this.updateAvailableProviderCount();
						const message =
							providerOption.authType === "oauth"
								? `${providerOption.name} oturumu kapatıldı`
								: `${providerOption.name} için saklanan API anahtarı kaldırıldı. Ortam değişkenleri ve models.json yapılandırması değişmedi.`;
						this.showStatus(message);
					} catch (error: unknown) {
						this.showError(`Logout failed: ${error instanceof Error ? error.message : String(error)}`);
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
			);
			return { component: selector, focus: selector };
		});
	}

	private async completeProviderAuthentication(
		providerId: string,
		providerName: string,
		authType: "oauth" | "api_key",
		previousModel: Model<any> | undefined,
	): Promise<void> {
		this.session.modelRegistry.refresh();

		const actionLabel =
			authType === "oauth" ? `${providerName} oturumu açıldı` : `${providerName} için API anahtarı kaydedildi`;

		let selectedModel: Model<any> | undefined;
		let selectionError: string | undefined;
		if (isUnknownModel(previousModel)) {
			const availableModels = this.session.modelRegistry.getAvailable();
			const providerModels = availableModels.filter((model) => model.provider === providerId);
			if (!hasDefaultModelProvider(providerId)) {
				selectionError = `${actionLabel}, ancak "${providerId}" sağlayıcısı için varsayılan model yapılandırılmamış. Model seçmek için /models komutunu kullanın.`;
			} else if (providerModels.length === 0) {
				selectionError = `${actionLabel}, ancak bu sağlayıcı için kullanılabilir model yok. Model seçmek için /models komutunu kullanın.`;
			} else {
				const defaultModelId = defaultModelPerProvider[providerId];
				selectedModel = providerModels.find((model) => model.id === defaultModelId);
				if (!selectedModel) {
					selectionError = `${actionLabel}, ancak varsayılan model "${defaultModelId}" mevcut değil. Model seçmek için /models komutunu kullanın.`;
				} else {
					try {
						await this.session.setModel(selectedModel);
					} catch (error: unknown) {
						selectedModel = undefined;
						const errorMessage = error instanceof Error ? error.message : String(error);
						selectionError = `${actionLabel}, ancak varsayılan model seçimi başarısız oldu: ${errorMessage}. Model seçmek için /models komutunu kullanın.`;
					}
				}
			}
		}

		await this.updateAvailableProviderCount();
		this.footer.invalidate();
		this.updateEditorBorderColor();
		if (selectedModel) {
			this.showStatus(
				`${actionLabel}. ${selectedModel.id} seçildi. Kimlik bilgileri şuraya kaydedildi: ${getAuthPath()}`,
			);
			void this.maybeWarnAboutAnthropicSubscriptionAuth(selectedModel);
			this.checkDaxnutsEasterEgg(selectedModel);
		} else {
			this.showStatus(`${actionLabel}. Kimlik bilgileri şuraya kaydedildi: ${getAuthPath()}`);
			if (selectionError) {
				this.showError(selectionError);
			} else {
				void this.maybeWarnAboutAnthropicSubscriptionAuth();
			}
		}
	}

	private showBedrockSetupDialog(providerId: string, providerName: string): void {
		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		const dialog = new LoginDialogComponent(
			this.ui,
			providerId,
			() => restoreEditor(),
			providerName,
			"Amazon Bedrock setup",
		);
		dialog.showInfo([
			theme.fg("text", "Amazon Bedrock, tek bir API anahtarı yerine AWS kimlik bilgilerini kullanır."),
			theme.fg(
				"text",
				"Bir AWS profili, IAM anahtarları, taşıyıcı jeton (bearer token) veya rol tabanlı kimlik bilgileri yapılandırın.",
			),
			theme.fg("muted", "Bakınız:"),
			theme.fg("accent", `  ${path.join(getDocsPath(), "providers.md")}`),
		]);

		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();
	}

	private async showApiKeyLoginDialog(providerId: string, providerName: string): Promise<void> {
		const previousModel = this.session.model;

		const dialog = new LoginDialogComponent(
			this.ui,
			providerId,
			(_success, _message) => {
				// Completion handled below
			},
			providerName,
		);

		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();

		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		try {
			const apiKey = (await dialog.showPrompt("API anahtarını girin:")).trim();
			if (!apiKey) {
				throw new Error("API anahtarı boş olamaz.");
			}

			this.session.modelRegistry.authStorage.set(providerId, { type: "api_key", key: apiKey });

			restoreEditor();
			await this.completeProviderAuthentication(providerId, providerName, "api_key", previousModel);
		} catch (error: unknown) {
			restoreEditor();
			const errorMsg = error instanceof Error ? error.message : String(error);
			if (errorMsg !== "Login cancelled") {
				this.showError(`Failed to save API key for ${providerName}: ${errorMsg}`);
			}
		}
	}

	private async showLoginDialog(providerId: string, providerName: string): Promise<void> {
		const providerInfo = this.session.modelRegistry.authStorage
			.getOAuthProviders()
			.find((provider) => provider.id === providerId);
		const previousModel = this.session.model;

		// Providers that use callback servers (can paste redirect URL)
		const usesCallbackServer = providerInfo?.usesCallbackServer ?? false;

		// Create login dialog component
		const dialog = new LoginDialogComponent(
			this.ui,
			providerId,
			(_success, _message) => {
				// Completion handled below
			},
			providerName,
		);

		// Show dialog in editor container
		this.editorContainer.clear();
		this.editorContainer.addChild(dialog);
		this.ui.setFocus(dialog);
		this.ui.requestRender();

		// Promise for manual code input (racing with callback server)
		let manualCodeResolve: ((code: string) => void) | undefined;
		let manualCodeReject: ((err: Error) => void) | undefined;
		const manualCodePromise = new Promise<string>((resolve, reject) => {
			manualCodeResolve = resolve;
			manualCodeReject = reject;
		});

		// Restore editor helper
		const restoreEditor = () => {
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			this.ui.requestRender();
		};

		try {
			await this.session.modelRegistry.authStorage.login(providerId as OAuthProviderId, {
				onAuth: (info: { url: string; instructions?: string }) => {
					dialog.showAuth(info.url, info.instructions);

					if (usesCallbackServer) {
						// Show input for manual paste, racing with callback
						dialog
							.showManualInput("Yönlendirme URL'sini aşağıya yapıştırın veya tarayıcıda girişi tamamlayın:")
							.then((value) => {
								if (value && manualCodeResolve) {
									manualCodeResolve(value);
									manualCodeResolve = undefined;
								}
							})
							.catch(() => {
								if (manualCodeReject) {
									manualCodeReject(new Error("Login cancelled"));
									manualCodeReject = undefined;
								}
							});
					} else if (providerId === "github-copilot") {
						// GitHub Copilot polls after onAuth
						dialog.showWaiting("Tarayıcı kimlik doğrulaması bekleniyor...");
					}
					// For Anthropic: onPrompt is called immediately after
				},

				onPrompt: async (prompt: { message: string; placeholder?: string }) => {
					return dialog.showPrompt(prompt.message, prompt.placeholder);
				},

				onProgress: (message: string) => {
					dialog.showProgress(message);
				},
				onInfo: (lines: string[]) => {
					dialog.showInfo(lines);
				},

				onManualCodeInput: () => manualCodePromise,

				signal: dialog.signal,
			});

			// Success
			restoreEditor();
			await this.completeProviderAuthentication(providerId, providerName, "oauth", previousModel);
		} catch (error: unknown) {
			restoreEditor();
			const errorMsg = error instanceof Error ? error.message : String(error);
			if (errorMsg !== "Login cancelled") {
				this.showError(`Giriş başarısız: ${providerName}: ${errorMsg}`);
			}
		}
	}

	// =========================================================================
	// Command handlers
	// =========================================================================

	private handleWorkspaceCommand(): void {
		const model = this.session.model;
		const text = renderCodingAgentsWorkspace(this.session.getAgentsSettings(), {
			activeTools: this.session.getActiveToolNames(),
			cwd: this.sessionManager.getCwd(),
			modelName: model?.name ?? model?.id,
		});
		this.chatContainer.addChild(new Text(text, 1, 0));
		this.ui.requestRender();
	}

	private handleBrowserCommand(): void {
		const status = this.session.getBrowserBridgeStatus();
		const extensionPath = path.join(getPackageDir(), "browser-extension", "chrome");
		const text = [
			"Chrome Browser Bridge",
			`Durum: ${status.running ? "calisiyor" : "kapali"}`,
			`Port: ${status.port}`,
			`Bagli eklenti: ${status.clients}`,
			...(status.lastClientSeen ? [`Son baglanti: ${new Date(status.lastClientSeen).toLocaleString()}`] : []),
			...(status.error ? [`Error: ${status.error}`] : []),
			"",
			"Kurulum:",
			"  1. Chrome > chrome://extensions",
			"  2. Developer mode ac",
			"  3. Load unpacked",
			`  4. Klasor: ${extensionPath}`,
			"",
			"Araçlar: browser_tabs, browser_page",
		].join("\n");
		this.chatContainer.addChild(new Text(text, 1, 0));
		this.ui.requestRender();
	}

	private async handleInterfaceCommand(): Promise<void> {
		try {
			const { getBrowserBridgeStatus } = await import("../../core/browser-bridge-server.js");
			const bridgeStatus = getBrowserBridgeStatus();
			let url = "http://127.0.0.1:3131";

			if (bridgeStatus.isClientOnly) {
				url = "http://127.0.0.1:3131";
			} else {
				if (!this.webUiProcess) {
					const server = await import("../../core/web-ui-server.js");
					this.webUiProcess = server.startWebUiServer({ port: 3131 });
				}
				url = this.webUiProcess.url || url;
			}

			const bridgeStatusText = bridgeStatus.running
				? `BAGLI (${bridgeStatus.clients} eklenti aktif)`
				: "BAĞLANTI BEKLENİYOR (Eklentiyi yükleyin)";

			const interfaceWelcome = [
				"┌────────────────────────────────────────────────────────┐",
				"│         ✦  M O O N C O D E   O S   I N T E R F A C E ✦  │",
				"├────────────────────────────────────────────────────────┤",
				"│  Entegre Geliştirici Arayüzü: MoonCode OS              │",
				"│  Yerel Adres: http://127.0.0.1:3131                    │",
				"│                                                        │",
				"│  Özellikler:                                           │",
				"│  • Otonom Ajan Yönetimi & Kod Çıktı Takibi             │",
				"│  • Canlı Workspace, CPU ve Bellek İzleyici             │",
				"│  • Gelişmiş CSS Tema Editörü (Realtime Sync)           │",
				"│                                                        │",
				`│  Browser Bridge Durumu: ${bridgeStatusText.padEnd(31)}│`,
				"└────────────────────────────────────────────────────────┘",
				"",
				"🚀 Yerel MoonCode OS varsayılan tarayıcınızda başlatılıyor...",
			].join("\n");

			this.chatContainer.addChild(new Text(interfaceWelcome, 1, 0));
			this.ui.requestRender();

			if (process.platform === "win32") {
				spawnSync("cmd", ["/c", `start "" "${url}"`], { stdio: "ignore", shell: true });
			} else if (process.platform === "darwin") {
				spawnSync("open", [url], { stdio: "ignore" });
			} else {
				spawnSync("xdg-open", [url], { stdio: "ignore" });
			}
		} catch (err: any) {
			this.showError(`MoonCode OS açma hatası: ${err.message}`);
		}
	}

	private registerEditorActionListener(server: any): void {
		if (this.editorActionListenerRegistered || !server?.editorActionsListeners) return;
		this.editorActionListenerRegistered = true;

		server.editorActionsListeners.add((data: { type: "video" | "photo"; action: string; params: any }) => {
			const editorName = data.type === "video" ? "Video Studio" : "Photo Studio";
			const payload = data.params || {};
			const compactState = JSON.stringify(payload.state || {}, null, 2).slice(0, 4000);
			const compactParams = JSON.stringify(payload.params || {}, null, 2).slice(0, 2000);
			const prompt = [
				`[Sistem: MoonCode ${editorName} tarayıcı arayüzünden profesyonel edit aksiyonu geldi.]`,
				`Editör: ${data.type}`,
				`Aksiyon: ${data.action}`,
				`Parametreler: ${compactParams}`,
				`Editör state özeti: ${compactState}`,
				"Kullanıcının istediği işlemi ciddi bir video/fotoğraf edit projesi gibi ele al. Gerekirse dosya yollarını sor; ffmpeg/ImageMagick/yerel araçlar veya mevcut tool'larla uygulanabilir net adımları çıkar; export/render hedefini belirt; tarayıcı editöründeki durumu dikkate al.",
			].join("\n");

			this.chatContainer.addChild(new Text(`↳ ${editorName} aksiyonu alındı: ${data.action}`, 1, 0));
			this.ui.requestRender();

			void this.session.prompt(prompt).catch((err: any) => {
				this.showError(`${editorName} aksiyon hatası: ${err?.message || err}`);
			});
		});
	}

	private async isEditorEndpointReady(url: string): Promise<boolean> {
		try {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), 1200);
			const res = await fetch(url, { signal: controller.signal });
			clearTimeout(timer);
			if (!res.ok) return false;
			const text = await res.text();
			return (
				text.includes("MoonCode Video Studio") ||
				text.includes("MoonCode Photo Studio") ||
				text.includes("MoonCode AI Video Studio") ||
				text.includes("MoonCode AI Photo Studio")
			);
		} catch {
			return false;
		}
	}

	private async ensureEditorServer(server: any, route: "/videoedit" | "/photoedit"): Promise<string> {
		const ports = [3131, 3132, 3133, 3134, 3135, 3136, 3137, 3138, 3139, 3140];

		if (this.webUiProcess?.url) {
			const url = `${this.webUiProcess.url}${route}`;
			if (await this.isEditorEndpointReady(url)) return url;
			try {
				this.webUiProcess.server?.close?.();
			} catch {}
			this.webUiProcess = undefined;
		}

		for (const port of ports) {
			try {
				const candidate = server.startWebUiServer({ port });
				await new Promise((resolve) => setTimeout(resolve, 180));
				const url = `${candidate.url}${route}`;
				if (await this.isEditorEndpointReady(url)) {
					this.webUiProcess = candidate;
					return url;
				}
				try {
					candidate.server?.close?.();
				} catch {}
			} catch {
				// Try next port.
			}
		}

		throw new Error(`${route} için çalışan MoonCode Web UI bulunamadı. 3131-3140 portlarını kontrol edin.`);
	}

	private openEditorUrl(url: string): void {
		if (process.platform === "win32") {
			spawnSync("cmd", ["/c", `start "" "${url}"`], { stdio: "ignore", shell: true });
		} else if (process.platform === "darwin") {
			spawnSync("open", [url], { stdio: "ignore" });
		} else {
			spawnSync("xdg-open", [url], { stdio: "ignore" });
		}
	}

	private async handleVideoEditCommand(): Promise<void> {
		try {
			const { getBrowserBridgeStatus } = await import("../../core/browser-bridge-server.js");
			const bridgeStatus = getBrowserBridgeStatus();
			const server = await import("../../core/web-ui-server.js");
			this.registerEditorActionListener(server);
			const url = await this.ensureEditorServer(server, "/videoedit");

			const bridgeStatusText = bridgeStatus.running
				? `BAGLI (${bridgeStatus.clients} eklenti aktif)`
				: "BAĞLANTI BEKLENİYOR (Eklentiyi yükleyin)";

			const videoWelcome = [
				"┌────────────────────────────────────────────────────────┐",
				"│       ✦  M O O N C O D E   V I D E O   S T U D I O  ✦  │",
				"├────────────────────────────────────────────────────────┤",
				"│  MoonCode Pro Video Editor / Yapay Zeka Stüdyosu       │",
				`│  Yerel Adres: ${url.padEnd(40)}│`,
				"│                                                        │",
				"│  Özellikler:                                           │",
				"│  • Çoklu Timeline (Kanallar), Split/Cut, Trim          │",
				"│  • Efektler & Filtreler (AI, Vintage, Glitch, Cinematic)│",
				"│  • Ses Ekleme, Background Music & Ses Efektleri         │",
				"│  • Shorts/TikTok (9:16) ve YouTube (16:9) Formatlama    │",
				"│  • Altyazı Ekleme, Metin Şablonları & Keyframe         │",
				"│                                                        │",
				`│  Browser Bridge Durumu: ${bridgeStatusText.padEnd(31)}│`,
				"└────────────────────────────────────────────────────────┘",
				"",
				"🚀 MoonCode Video Studio varsayılan tarayıcınızda başlatılıyor...",
			].join("\n");

			this.chatContainer.addChild(new Text(videoWelcome, 1, 0));
			this.ui.requestRender();
			this.openEditorUrl(url);
		} catch (err: any) {
			this.showError(`MoonCode Video Studio açma hatası: ${err.message}`);
		}
	}

	private async handlePhotoEditCommand(): Promise<void> {
		try {
			const { getBrowserBridgeStatus } = await import("../../core/browser-bridge-server.js");
			const bridgeStatus = getBrowserBridgeStatus();
			const server = await import("../../core/web-ui-server.js");
			this.registerEditorActionListener(server);
			const url = await this.ensureEditorServer(server, "/photoedit");

			const bridgeStatusText = bridgeStatus.running
				? `BAGLI (${bridgeStatus.clients} eklenti aktif)`
				: "BAĞLANTI BEKLENİYOR (Eklentiyi yükleyin)";

			const photoWelcome = [
				"┌────────────────────────────────────────────────────────┐",
				"│       ✦  M O O N C O D E   P H O T O   S T U D I O  ✦  │",
				"├────────────────────────────────────────────────────────┤",
				"│  MoonCode Pro Professional Photo/Graphic Suite         │",
				`│  Yerel Adres: ${url.padEnd(40)}│`,
				"│                                                        │",
				"│  Özellikler:                                           │",
				"│  • Katman Yönetimi (Layers), Opacity & Blend Modes    │",
				"│  • Smart Retouch, Renk Derecelendirme (LUTs/Curves)    │",
				"│  • AI Arka Plan Silme & Obje Kaldırma                  │",
				"│  • Profesyonel Filtreler, Işık & Kontrast Ayarları    │",
				"│  • Metin Katmanları, Brush Tool & Canvas Boyutlandırma│",
				"│                                                        │",
				`│  Browser Bridge Durumu: ${bridgeStatusText.padEnd(31)}│`,
				"└────────────────────────────────────────────────────────┘",
				"",
				"🚀 MoonCode Photo Studio varsayılan tarayıcınızda başlatılıyor...",
			].join("\n");

			this.chatContainer.addChild(new Text(photoWelcome, 1, 0));
			this.ui.requestRender();
			this.openEditorUrl(url);
		} catch (err: any) {
			this.showError(`MoonCode Photo Studio açma hatası: ${err.message}`);
		}
	}

	private handleMoodCommand(args: string): void {
		const parts = args.split(/\s+/).filter(Boolean);
		const cmd = parts[0]?.toLowerCase();

		if (!cmd || cmd === "status") {
			this.chatContainer.addChild(new Text(this.session.getAffectiveStatus(), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "explain") {
			this.chatContainer.addChild(new Text(this.session.getAffectiveExplanation(), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "help") {
			this.chatContainer.addChild(new Text(this.renderMoodHelp(), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "on" || cmd === "enable") {
			this.session.enableAffectiveMode();
			this.showStatus("Affective state layer acildi.");
			return;
		}

		if (cmd === "off" || cmd === "disable") {
			this.session.disableAffectiveMode();
			this.showStatus("Affective state layer kapatildi.");
			return;
		}

		if (cmd === "reset") {
			this.session.resetAffectiveState();
			this.showStatus("Affective state sifirlandi.");
			return;
		}

		if (cmd === "mode") {
			const mode = parts[1]?.toLowerCase();
			if (mode !== "subtle" && mode !== "active") {
				this.showError("Gecersiz mood mode. Kullanim: /mood mode subtle|active");
				return;
			}
			this.session.setAffectiveMode(mode);
			this.showStatus(`Affective mode guncellendi: ${mode}`);
			return;
		}

		this.showError(`Bilinmeyen mood komutu: ${cmd}`);
	}

	private renderMoodHelp(): string {
		return [
			"Affective State Layer",
			"Kalici ic durum sinyalleri cevap stratejisini etkiler: guven, sicaklik, merak, dikkat, yorgunluk, gerilim, odak.",
			"Bu bilinc iddiasi degildir; davranisi yoneten durumsal kontrol katmanidir.",
			"",
			"Komutlar:",
			"  /mood status",
			"  /mood explain",
			"  /mood on",
			"  /mood off",
			"  /mood mode subtle|active",
			"  /mood reset",
		].join("\n");
	}

	private handleAgentModeCommand(args: string): void {
		const mode = args.trim().toLowerCase();
		if (mode === "on") {
			this.session.enableAgentsMode();
			this.showStatus("Agent mode acildi. Artik kompleks islerde sirket gibi calisir.");
			return;
		}
		if (mode === "off") {
			this.session.disableAgentsMode();
			this.showStatus("Agent mode kapatildi.");
			return;
		}

		const settings = this.session.getAgentsSettings();
		const enabled = settings.enabled !== false && settings.mode !== "off";
		this.showStatus(`Kullanim: /agentmode on|off (su an: ${enabled ? "on" : "off"})`);
	}

	private handleAgentsCommand(args: string): void {
		const parts = args.split(/\s+/).filter(Boolean);
		const cmd = parts[0]?.toLowerCase();
		const settings = this.session.getAgentsSettings();

		if (!cmd || cmd === "help") {
			this.chatContainer.addChild(new Text(this.renderAgentsHelp(), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "status") {
			const enabled = settings.enabled !== false && settings.mode !== "off";
			this.chatContainer.addChild(
				new Text(
					[
						"Agent Sistemi",
						`Durum: ${enabled ? "acik" : "kapali"}`,
						`Mode: ${settings.mode ?? "auto"}`,
						`Gorunum: ${settings.verbosity ?? "summary"}`,
						"Kullanim: /agents enable | disable | mode auto|always|off | verbosity quiet|summary|verbose",
					].join("\n"),
					1,
					0,
				),
			);
			this.ui.requestRender();
			return;
		}

		if (cmd === "enable" || cmd === "on") {
			this.session.enableAgentsMode();
			this.showStatus("Agent sistemi acildi. Artik kompleks kod islerinde Patron + uzman ekip gibi ilerleyecek.");
			return;
		}

		if (cmd === "disable" || cmd === "off") {
			this.session.disableAgentsMode();
			this.showStatus("Agent sistemi kapatildi.");
			return;
		}

		if (cmd === "mode") {
			const mode = parts[1]?.toLowerCase();
			if (mode !== "auto" && mode !== "always" && mode !== "off") {
				this.showError("Gecersiz agent mode. Kullanim: /agents mode auto|always|off");
				return;
			}
			this.session.setAgentsMode(mode);
			this.showStatus(`Agent mode guncellendi: ${mode}`);
			return;
		}

		if (cmd === "verbosity" || cmd === "visible") {
			const verbosity = parts[1]?.toLowerCase();
			if (verbosity !== "quiet" && verbosity !== "summary" && verbosity !== "verbose") {
				this.showError("Gecersiz agent gorunumu. Kullanim: /agents verbosity quiet|summary|verbose");
				return;
			}
			this.session.setAgentsVerbosity(verbosity);
			this.showStatus(`Agent gorunumu guncellendi: ${verbosity}`);
			return;
		}

		this.showError(`Bilinmeyen agents komutu: ${cmd}`);
	}

	private renderAgentsHelp(): string {
		return [
			"Agent Sistemi",
			"MoonCode kod islerini kucuk bir yazilim sirketi gibi organize eder.",
			"Patron kapsami belirler; Mimar, Backend, Frontend, QA, Security ve Integrator kendi alanindan kontrol eder.",
			"",
			"Komutlar:",
			"  /agentmode on",
			"  /agentmode off",
			"  /workspace",
			"  /agents status",
			"  /agents enable",
			"  /agents disable",
			"  /agents mode auto|always|off",
			"  /agents verbosity quiet|summary|verbose",
			"",
			"Oneri: auto + summary. Basit islerde susar, kompleks projede ekip gibi calisir.",
		].join("\n");
	}

	private async handleRoboticsCommand(args: string): Promise<void> {
		const parts = args.split(" ");
		const cmd = parts[0]?.toLowerCase();

		const { RoboticsView } = await import("./components/robotics-view.js");
		const { VisionPipeline, ImageCapture } = await import("../../core/robotics/index.js");

		if (!cmd || cmd === "help") {
			const text = RoboticsView.renderHelp();
			this.chatContainer.addChild(new Text(text, 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "enable") {
			this.session.enableRoboticsMode();
			const config = this.settingsManager.getRoboticsSettings();
			const text = RoboticsView.renderBanner(config.visionModel || "unknown", config.visionBaseUrl || "unknown");
			this.chatContainer.addChild(new Text(text, 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "disable") {
			this.session.disableRoboticsMode();
			this.chatContainer.addChild(new Text(RoboticsView.renderSuccess("Robotics mode kapatildi."), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "status") {
			const config = this.settingsManager.getRoboticsSettings();
			const text = RoboticsView.renderStatus({
				enabled: config.enabled ?? false,
				visionModel: config.visionModel || "unknown",
				visionBaseUrl: config.visionBaseUrl || "unknown",
				outputOverlay: config.outputOverlay ?? true,
				robotApiFunctionsPath: config.robotApiFunctionsPath,
				lastImagePath: config.lastImagePath,
			});
			this.chatContainer.addChild(new Text(text, 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "model") {
			const model = parts[1];
			if (!model) {
				this.chatContainer.addChild(
					new Text(RoboticsView.renderError("Model adi gerekli: /robotics model <isim>"), 1, 0),
				);
				this.ui.requestRender();
				return;
			}
			this.settingsManager.setRoboticsSetting("visionModel", model);
			if (this.session.getRoboticsMode()) {
				// Re-enable to update tool definitions
				this.session.enableRoboticsMode();
			}
			this.chatContainer.addChild(new Text(RoboticsView.renderSuccess(`Vision modeli guncellendi: ${model}`), 1, 0));
			this.ui.requestRender();
			return;
		}

		if (cmd === "functions") {
			const fpath = parts.slice(1).join(" ");
			if (!fpath) {
				this.chatContainer.addChild(
					new Text(RoboticsView.renderError("Dosya yolu gerekli: /robotics functions <path>"), 1, 0),
				);
				this.ui.requestRender();
				return;
			}
			this.settingsManager.setRoboticsSetting("robotApiFunctionsPath", fpath);
			if (this.session.getRoboticsMode()) {
				this.session.enableRoboticsMode();
			}
			this.chatContainer.addChild(
				new Text(RoboticsView.renderSuccess(`Robot fonksiyon dosyasi guncellendi: ${fpath}`), 1, 0),
			);
			this.ui.requestRender();
			return;
		}

		if (cmd === "image") {
			const fpath = parts.slice(1).join(" ");
			if (!fpath) {
				this.chatContainer.addChild(
					new Text(RoboticsView.renderError("Dosya yolu gerekli: /robotics image <path>"), 1, 0),
				);
				this.ui.requestRender();
				return;
			}
			this.settingsManager.setRoboticsLastImagePath(fpath);
			this.chatContainer.addChild(new Text(RoboticsView.renderSuccess(`Son goruntu ayarlandi: ${fpath}`), 1, 0));
			this.ui.requestRender();
			return;
		}

		// Analysis commands (detect, bbox, trajectory, analyze, plan)
		const requiresImage = ["detect", "bbox", "trajectory", "analyze"].includes(cmd);
		const imagePath = this.settingsManager.getRoboticsLastImagePath();

		if (requiresImage && !imagePath) {
			this.chatContainer.addChild(
				new Text(RoboticsView.renderError("Once goruntu yukleyin: /robotics image <path>"), 1, 0),
			);
			this.ui.requestRender();
			return;
		}

		if (requiresImage || cmd === "plan") {
			const config = this.settingsManager.getRoboticsSettings();
			const pipeline = new VisionPipeline({
				model: config.visionModel,
				baseUrl: config.visionBaseUrl,
				drawOverlay: config.outputOverlay ?? true,
			});
			const capture = new ImageCapture();

			try {
				this.showWorking("Robotik gorus isleniyor...");
				let imageBytes: Buffer | undefined;

				if (imagePath && requiresImage) {
					if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
						imageBytes = await capture.fromUrl(imagePath);
					} else {
						imageBytes = capture.fromFile(imagePath);
					}
				}

				if (cmd === "detect") {
					const queryArgs = parts.slice(1).join(" ");
					const queries = queryArgs ? queryArgs.split(",").map((s) => s.trim()) : undefined;
					const result = await pipeline.detectObjects(imageBytes!, queries);
					const text = RoboticsView.renderDetectionResults(result.objects, result.durationMs);
					this.chatContainer.addChild(new Text(text, 1, 0));
				} else if (cmd === "bbox") {
					const result = await pipeline.detectBoundingBoxes(imageBytes!);
					const text = RoboticsView.renderDetectionResults(result.objects, result.durationMs);
					this.chatContainer.addChild(new Text(text, 1, 0));
				} else if (cmd === "trajectory") {
					const instruction = parts.slice(1).join(" ");
					if (!instruction) {
						throw new Error("Yorunge talimati gerekli. Ornek: /robotics trajectory duzenleyicinin icine");
					}
					const result = await pipeline.planTrajectory(imageBytes!, "nesne", instruction);
					const text = RoboticsView.renderTrajectory(result.trajectory, result.durationMs);
					this.chatContainer.addChild(new Text(text, 1, 0));
				} else if (cmd === "analyze") {
					const q = parts.slice(1).join(" ");
					if (q) {
						const result = await pipeline.freeformAnalyze(imageBytes!, q);
						this.chatContainer.addChild(
							new Text(`\n🤖 Analiz (${result.durationMs}ms):\n\n${result.response}\n`, 1, 0),
						);
					} else {
						const result = await pipeline.analyzeScene(imageBytes!);
						this.chatContainer.addChild(
							new Text(`\n🤖 Sahne Analizi (${result.durationMs}ms):\n\n${result.description}\n`, 1, 0),
						);
					}
				} else if (cmd === "plan") {
					const instruction = parts.slice(1).join(" ");
					if (!instruction) {
						throw new Error("Gorev talimati gerekli.");
					}
					const { TaskPlanner, OllamaVision } = await import("../../core/robotics/index.js");
					const vision = new OllamaVision(config.visionModel, config.visionBaseUrl);

					const fnPath = config.robotApiFunctionsPath;
					let fns = TaskPlanner.mockPickAndPlaceFunctions();
					if (fnPath) {
						const fs = await import("fs");
						const path = await import("path");
						if (fs.existsSync(path.resolve(fnPath))) {
							fns = TaskPlanner.loadFunctions(path.resolve(fnPath));
						}
					}

					const planner = new TaskPlanner(vision, fns);
					let base64: string | undefined;
					if (imagePath) {
						const imgBytes = imagePath.startsWith("http")
							? await capture.fromUrl(imagePath)
							: capture.fromFile(imagePath);
						base64 = capture.toBase64(imgBytes);
					}

					const result = await planner.planTask(instruction, base64);
					const text = RoboticsView.renderTaskPlan(result.actions, result.durationMs);
					this.chatContainer.addChild(new Text(text, 1, 0));
				}
			} catch (err: any) {
				this.chatContainer.addChild(new Text(RoboticsView.renderError(err.message), 1, 0));
			} finally {
				this.hideWorking();
				this.ui.requestRender();
			}
		} else {
			this.chatContainer.addChild(new Text(RoboticsView.renderError(`Bilinmeyen robotics komutu: ${cmd}`), 1, 0));
			this.ui.requestRender();
		}
	}

	private async handleDiscordCommand(args: string): Promise<void> {
		const normalizedArgs = args.trim().toLowerCase();

		if (normalizedArgs === "off") {
			this.settingsManager.setDiscordToken(undefined);
			this.showStatus("Discord baglantisi kapatildi.");
			this.showStatus("Oturum yenileniyor...");
			await this.handleReloadCommand();
			return;
		}

		if (normalizedArgs === "botinfo") {
			const token = this.settingsManager.getDiscordToken();
			if (!token) {
				this.showStatus("Discord tokeni ayarlanmamis.");
				this.showStatus("Kullanim: /discord <bot_token>");
				return;
			}
			this.showStatus("Discord bot bilgileri cekiliyor...");
			try {
				const { Client, GatewayIntentBits, PresenceUpdateStatus } = await import("discord.js");
				const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers] });
				await client.login(token);

				const user = client.user;
				const guildCount = client.guilds.cache.size;
				const guildsPreview = client.guilds.cache
					.map((g) => g.name)
					.slice(0, 10)
					.join(", ");
				const status = user?.presence?.status ?? PresenceUpdateStatus.Offline;

				const lines = [
					"Discord Bot Bilgisi",
					`Tag: ${user?.tag ?? "unknown"}`,
					`Bot ID: ${user?.id ?? "unknown"}`,
					`Durum: ${status}`,
					`Sunucu Sayisi: ${guildCount}`,
					`Olusturulma: ${user?.createdAt?.toISOString?.() ?? "unknown"}`,
					`Avatar: ${user?.displayAvatarURL?.() ?? "none"}`,
					`Sunucular (ilk 10): ${guildsPreview || "-"}`,
				];
				client.destroy();
				this.chatContainer.addChild(new Text(lines.join("\n"), 1, 0));
				this.ui.requestRender();
			} catch (err: any) {
				this.showStatus(`Error: Bot bilgileri alinamadi (${err.message})`);
			}
			return;
		}

		if (args) {
			this.showStatus("Token kontrol ediliyor...");
			try {
				const { Client, GatewayIntentBits } = await import("discord.js");
				const testClient = new Client({ intents: [GatewayIntentBits.Guilds] });
				await testClient.login(args);
				const botName = testClient.user?.tag || "Bot";
				testClient.destroy();

				this.settingsManager.setDiscordToken(args);
				this.showStatus(`Discord tokeni kaydedildi. (${botName} olarak baglanildi)`);
				this.showStatus("Oturum yenileniyor...");
				await this.handleReloadCommand();
			} catch (err: any) {
				this.showStatus(`Error: Gecersiz token veya baglanti sorunu (${err.message})`);
			}
			return;
		}

		const currentToken = this.settingsManager.getDiscordToken();
		if (currentToken) {
			this.showStatus(`Discord baglantisi aktif. (Token: ${currentToken.slice(0, 5)}...)`);
			this.showStatus("Tokeni degistirmek icin: /discord <yeni_token>");
			this.showStatus("Discord araclarini artik kullanabilirsiniz.");
		} else {
			this.showStatus("Discord tokeni ayarlanmamis.");
			this.showStatus("Kullanim: /discord <bot_token>");
		}
	}

	private async handleTelegramCommand(args: string): Promise<void> {
		const [subcommand, ...rest] = args.trim().split(/\s+/).filter(Boolean);
		const rootDir = process.cwd();
		const envPath = path.join(rootDir, ".env");

		if (!subcommand || subcommand === "help") {
			this.showStatus("Kullanım: /telegram login <bot_token> [chat_id]");
			this.showStatus("Chat id yoksa: bota /start yaz, sonra /telegram login <bot_token> tekrar çalıştır.");
			this.showStatus("Başlatmak için: /telegram start");
			return;
		}

		if (subcommand === "login") {
			const token = rest[0];
			let chatId = rest[1];
			if (!token) {
				this.showStatus("Kullanım: /telegram login <bot_token> [chat_id]");
				return;
			}

			this.showStatus("Telegram token kontrol ediliyor...");
			try {
				const meResponse = await fetch(`https://api.telegram.org/bot${token}/getMe`);
				const me = await meResponse.json();
				if (!me.ok) throw new Error(me.description ?? "token geçersiz");

				if (!chatId) {
					const updatesResponse = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
					const updates = await updatesResponse.json();
					chatId = String(updates.result?.find((u: any) => u.message?.chat?.id)?.message?.chat?.id ?? "");
				}

				if (!chatId) {
					this.showStatus(`Bot doğrulandı: @${me.result.username}`);
					this.showStatus("Şimdi Telegram'da botuna /start yaz, sonra aynı komutu tekrar çalıştır.");
					return;
				}

				this.upsertEnvFile(envPath, {
					TELEGRAM_BOT_TOKEN: token,
					TELEGRAM_ALLOWED_CHAT_IDS: chatId,
					MOON_REMOTE_ROOT: path.dirname(rootDir),
				});
				this.showStatus(`Telegram kaydedildi: @${me.result.username}, chat id ${chatId}`);
				this.showStatus("Remote'u açmak için: /telegram start");
			} catch (err: any) {
				this.showStatus(`Telegram login hatası: ${err.message}`);
			}
			return;
		}

		if (subcommand === "start") {
			if (!fs.existsSync(envPath)) {
				this.showStatus("Önce /telegram login <bot_token> çalıştır.");
				return;
			}
			const child = spawn(process.execPath, [path.join(rootDir, "scripts", "telegram-remote.mjs")], {
				cwd: rootDir,
				detached: true,
				stdio: "ignore",
				windowsHide: true,
			});
			child.unref();
			this.showStatus("Telegram remote arka planda başlatıldı. Telefondan /status yaz.");
			return;
		}

		if (subcommand === "status") {
			this.showStatus(
				fs.existsSync(envPath) ? "Telegram ayarı var. /telegram start ile açabilirsin." : "Telegram ayarı yok.",
			);
			return;
		}

		this.showStatus(`Bilinmeyen telegram komutu: ${subcommand}`);
	}

	private upsertEnvFile(filePath: string, values: Record<string, string>): void {
		const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : "";
		const lines = existing.split(/\r?\n/).filter((line) => line.trim() !== "");
		for (const [key, value] of Object.entries(values)) {
			const line = `${key}=${value}`;
			const index = lines.findIndex((item) => item.startsWith(`${key}=`));
			if (index >= 0) lines[index] = line;
			else lines.push(line);
		}
		fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
	}

	private async handleReloadCommand(): Promise<void> {
		if (this.session.isStreaming) {
			this.showWarning("Yeniden yüklemeden önce mevcut yanıtın bitmesini bekleyin.");
			return;
		}
		if (this.session.isCompacting) {
			this.showWarning("Yeniden yüklemeden önce sıkıştırmanın bitmesini bekleyin.");
			return;
		}

		this.resetExtensionUI();

		const reloadBox = new Container();
		const borderColor = (s: string) => theme.fg("border", s);
		reloadBox.addChild(new DynamicBorder(borderColor));
		reloadBox.addChild(new Spacer(1));
		reloadBox.addChild(
			new Text(
				theme.fg("muted", "Kısayollar, uzantılar, yetenekler, istemler ve temalar yeniden yükleniyor..."),
				1,
				0,
			),
		);
		reloadBox.addChild(new Spacer(1));
		reloadBox.addChild(new DynamicBorder(borderColor));

		const previousEditor = this.editor;
		this.editorContainer.clear();
		this.editorContainer.addChild(reloadBox);
		this.ui.setFocus(reloadBox);
		this.ui.requestRender(true);
		await new Promise((resolve) => process.nextTick(resolve));

		const dismissReloadBox = (editor: Component) => {
			this.editorContainer.clear();
			this.editorContainer.addChild(editor);
			this.ui.setFocus(editor);
			this.ui.requestRender();
		};

		try {
			await this.session.reload();
			this.keybindings.reload();
			const activeHeader = this.customHeader ?? this.builtInHeader;
			if (isExpandable(activeHeader)) {
				activeHeader.setExpanded(this.toolOutputExpanded);
			}
			setRegisteredThemes(this.session.resourceLoader.getThemes().themes);
			this.hideThinkingBlock = this.settingsManager.getHideThinkingBlock();
			const themeName = this.settingsManager.getTheme();
			const themeResult = themeName ? setTheme(themeName, true) : { success: true };
			if (!themeResult.success) {
				this.showError(`Failed to load theme "${themeName}": ${themeResult.error}\nFell back to dark theme.`);
			}
			const editorPaddingX = this.settingsManager.getEditorPaddingX();
			const autocompleteMaxVisible = this.settingsManager.getAutocompleteMaxVisible();
			this.defaultEditor.setPaddingX(editorPaddingX);
			this.defaultEditor.setAutocompleteMaxVisible(autocompleteMaxVisible);
			if (this.editor !== this.defaultEditor) {
				this.editor.setPaddingX?.(editorPaddingX);
				this.editor.setAutocompleteMaxVisible?.(autocompleteMaxVisible);
			}
			this.ui.setShowHardwareCursor(this.settingsManager.getShowHardwareCursor());
			this.ui.setClearOnShrink(this.settingsManager.getClearOnShrink());
			this.setupAutocompleteProvider();
			const runner = this.session.extensionRunner;
			this.setupExtensionShortcuts(runner);
			this.rebuildChatFromMessages();
			dismissReloadBox(this.editor as Component);
			this.showLoadedResources({
				force: false,
				showDiagnosticsWhenQuiet: true,
			});
			const modelsJsonError = this.session.modelRegistry.getError();
			if (modelsJsonError) {
				this.showError(`models.json error: ${modelsJsonError}`);
			}
			this.showStatus("Kisayollar, uzantilar, yetenekler, istemler ve temalar yeniden yuklendi");
		} catch (error) {
			dismissReloadBox(previousEditor as Component);
			this.showError(`Reload failed: ${error instanceof Error ? error.message : String(error)}`);
		}
	}

	private async handleIndexCommand(args: string): Promise<void> {
		const { buildIndex, getIndexStats } = await import("../../core/codebase-index/index.js");
		const cwd = this.sessionManager.getCwd();
		if (args === "status") {
			const stats = getIndexStats(cwd);
			this.showStatus(
				stats
					? `Index: ${stats.fileCount} dosya, ${stats.chunkCount} chunk, ${Math.round(stats.ageMs / 1000)}sn önce`
					: "Index yok.",
			);
			return;
		}
		this.showStatus("Index oluşturuluyor...");
		const index = buildIndex(cwd, args === "force");
		this.showStatus(`Index hazır: ${index.fileCount} dosya, ${index.chunkCount} chunk.`);
	}

	private async handleGitCommand(args: string): Promise<void> {
		const git = await import("../../core/git-utils.js");
		const cwd = this.sessionManager.getCwd();
		const [cmd, ...rest] = args.split(/\s+/).filter(Boolean);
		try {
			if (!cmd || cmd === "status") this.showStatus(await git.getGitStatus(cwd));
			else if (cmd === "commit")
				this.showStatus(await git.commitAll(cwd, rest.join(" ") || "chore: update via MoonCode"));
			else if (cmd === "branch")
				this.showStatus(`Branch: ${await git.createBranch(cwd, rest.join("-") || "mooncode/update")}`);
			else if (cmd === "push") this.showStatus(await git.pushBranch(cwd));
			else this.showStatus("Kullanım: /git status | /git commit <mesaj> | /git branch <ad> | /git push");
		} catch (err: any) {
			this.showError(`Git hata: ${err.message}`);
		}
	}

	private async handleShipCommand(args: string): Promise<void> {
		const { shipChanges } = await import("../../core/git-utils.js");
		try {
			this.showStatus("Ship başlıyor: branch + commit + push + PR...");
			const result = await shipChanges(this.sessionManager.getCwd(), { message: args || undefined });
			this.showStatus(
				[`Ship tamam: ${result.branch}`, result.diffStat, result.prUrl ? `PR: ${result.prUrl}` : ""]
					.filter(Boolean)
					.join("\n"),
			);
		} catch (err: any) {
			this.showError(`Ship hata: ${err.message}`);
		}
	}

	private async handleOllamaSlashCommand(args: string): Promise<void> {
		const ollama = await import("../../core/ollama-optimizer.js");
		const [cmd, ...rest] = args.split(/\s+/).filter(Boolean);
		try {
			if (!cmd || cmd === "models" || cmd === "list") {
				const models = await ollama.getLocalModels();
				this.showStatus(
					models.length
						? models.map((m: any) => `${m.name} (${m.details?.parameter_size || "?"})`).join("\n")
						: "Yerel model yok.",
				);
			} else if (cmd === "pull") {
				const model = rest.join(" ");
				if (!model) return this.showStatus("Kullanım: /ollama pull <model>");
				this.showStatus(`Model çekiliyor: ${model}`);
				await ollama.pullModel(
					model,
					(e: any) =>
						e.status &&
						this.showStatus(`${e.status}${e.total ? ` ${Math.round((e.completed / e.total) * 100)}%` : ""}`),
				);
				this.showStatus(`Model hazır: ${model}`);
			} else this.showStatus("Kullanım: /ollama models | /ollama pull <model>");
		} catch (err: any) {
			this.showError(`Ollama hata: ${err.message}`);
		}
	}

	private async handleDiffCommand(): Promise<void> {
		const { getFullDiff, getDiffSummary } = await import("../../core/git-utils.js");
		try {
			const stat = await getDiffSummary(this.sessionManager.getCwd());
			const diff = await getFullDiff(this.sessionManager.getCwd());
			this.showStatus(`${stat}\n\n${diff.slice(0, 12000)}`);
		} catch (err: any) {
			this.showError(`Diff hata: ${err.message}`);
		}
	}

	private async handleWebCommand(): Promise<void> {
		try {
			const { getBrowserBridgeStatus } = await import("../../core/browser-bridge-server.js");
			const bridgeStatus = getBrowserBridgeStatus();
			let url = "http://127.0.0.1:3131";

			if (bridgeStatus.isClientOnly) {
				this.showStatus(`Sunucu CLIENT-ONLY modunda. Ana Web-UI'a bağlanılıyor: ${url}`);
			} else {
				if (!this.webUiProcess) {
					const server = await import("../../core/web-ui-server.js");
					this.webUiProcess = server.startWebUiServer({ port: 3131 });
				}
				url = this.webUiProcess.url || url;
			}

			const opener = process.platform === "win32" ? "cmd" : process.platform === "darwin" ? "open" : "xdg-open";
			const args = process.platform === "win32" ? ["/c", "start", "", url] : [url];
			spawnSync(opener, args, { stdio: "ignore", shell: false });
			this.showStatus(`Web-UI açık: ${url}`);
		} catch (err: any) {
			this.showError(`Web-UI hata: ${err.message}`);
		}
	}

	private async handleMarketplaceCommand(args: string): Promise<void> {
		const marketplace = await import("../../core/marketplace.js");
		try {
			const [cmd, ...rest] = args.split(/\s+/).filter(Boolean);
			const entries = await marketplace.fetchRegistry();
			if (cmd === "install") {
				const name = rest.join(" ");
				const entry = entries.find((e: any) => e.name === name);
				if (!entry) return this.showStatus(`Marketplace entry bulunamadı: ${name}`);
				const pm = new DefaultPackageManager({
					cwd: this.sessionManager.getCwd(),
					engineDir: getEngineDir(),
					settingsManager: this.settingsManager,
				});
				await marketplace.installMarketplaceEntry(pm, entry);
				this.showStatus(`Kuruldu: ${entry.name}`);
				return;
			}
			const query = cmd === "search" ? rest.join(" ") : args;
			this.showStatus(marketplace.formatRegistryEntries(marketplace.searchRegistry(entries, query), 12));
		} catch (err: any) {
			this.showError(`Marketplace hata: ${err.message}`);
		}
	}

	private handleHelpCommand(): void {
		let info = `\n${theme.bold(theme.fg("accent", "╭─ MoonCode Premium Grouped Commands ──────────────────────╮"))}\n`;

		const categories = {
			"Session & Context": [
				{ name: "/new", desc: "Start a clean session" },
				{ name: "/resume", desc: "Resume saved session" },
				{ name: "/name", desc: "Rename session" },
				{ name: "/session", desc: "Show session info and stats" },
				{ name: "/context", desc: "Show context and token usage" },
				{ name: "/compact", desc: "Compress session context" },
				{ name: "/fork", desc: "Fork from a message" },
				{ name: "/clone", desc: "Clone session in current location" },
				{ name: "/tree", desc: "Navigate session tree" },
				{ name: "/export", desc: "Export session (.html or .jsonl)" },
				{ name: "/import", desc: "Import a session from JSONL" },
				{ name: "/share", desc: "Share session as a GitHub Gist" },
				{ name: "/copy", desc: "Copy the last response" },
			],
			"Model & Settings": [
				{ name: "/models", desc: "Select a model" },
				{ name: "/scoped-models", desc: "Edit quick-switch models" },
				{ name: "/settings", desc: "Open settings" },
				{ name: "/autothink", desc: "Toggle automatic thinking level" },
				{ name: "/login", desc: "Configure Provider API keys" },
			],
			Modes: [
				{ name: "/plan", desc: "Toggle plan mode" },
				{ name: "/automation", desc: "Toggle automation mode" },
				{ name: "/agentmode", desc: "Toggle agent mode" },
				{ name: "/zen", desc: "Toggle Zen mode (hide UI elements)" },
			],
			"Tools & Swarm": [
				{ name: "/init", desc: "Create project config files" },
				{ name: "/ship", desc: "Ship changes (branch/commit/push/PR)" },
				{ name: "/diff", desc: "Show git changes" },
				{ name: "/index", desc: "Index codebase for semantic search" },
				{ name: "/browser", desc: "Chrome extension status and control" },
				{ name: "/interface", desc: "Open MoonCode Special OpenClaw OS Interface" },
				{ name: "/videoedit", desc: "Open MoonCode Pro Video Studio (Browser)" },
				{ name: "/photoedit", desc: "Open MoonCode Pro Photo Editor (Browser)" },
				{ name: "/mcp", desc: "List connected MCP servers" },
				{ name: "/swarm", desc: "Trigger Multi-Agent Swarm" },
				{ name: "/fix", desc: "Run Autonomous Auto-Healer" },
				{ name: "/evolve", desc: "Trigger Meta-Evolution (Self-Improvement Loop)" },
			],
			"Diagnostics & System": [
				{ name: "/status", desc: "Show detailed runtime diagnostics panel" },
				{ name: "/metrics", desc: "Show system metrics and token usage" },
				{ name: "/update", desc: "Update MoonCode to latest version" },
				{ name: "/reload", desc: "Reload system components" },
				{ name: "/hotkeys", desc: "List keyboard shortcuts" },
				{ name: "/quit", desc: "Quit MoonCode" },
			],
		};

		for (const [catName, list] of Object.entries(categories)) {
			info += `  ${theme.bold(theme.fg("success", `[ ${catName} ]`))}\n`;
			for (const cmd of list) {
				const paddedName = cmd.name.padEnd(16);
				info += `    ${theme.fg("accent", paddedName)} ${theme.fg("text", cmd.desc)}\n`;
			}
			info += `\n`;
		}

		info += `${theme.bold(theme.fg("accent", "╰──────────────────────────────────────────────────────────╯"))}\n`;
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(info, 1, 0));
		this.ui.requestRender();
	}

	private async handleStatusDiagnosticsCommand(): Promise<void> {
		const stats = this.session.getSessionStats();
		const currentModel = this.session.model;
		const contextUsage = this.session.getContextUsage();
		const memUsage = process.memoryUsage().heapUsed / 1024 / 1024;
		const branch = this.footerDataProvider.getGitBranch() || "N/A";

		let totalCost = 0;
		for (const entry of this.session.sessionManager.getEntries()) {
			if (entry.type === "message" && entry.message.role === "assistant") {
				const costVal = entry.message.usage?.cost?.total;
				if (typeof costVal === "number" && Number.isFinite(costVal)) {
					totalCost += costVal;
				}
			}
		}

		let info = `\n${theme.bold(theme.fg("accent", "✦ MOONCODE CONTROL CENTER"))}\n\n`;

		info += `  ${theme.bold(theme.fg("success", "■ AGENT"))}\n`;
		info += `    Apex Mode:          ${theme.fg("accent", "Active")}\n`;
		info += `    DeepThink:          ${theme.fg("text", this.session.supportsThinking() ? "Enabled" : "Disabled")}\n`;
		info += `    AutoThink:          ${theme.fg("text", this.session.getAutoThinkEnabled() ? "Enabled" : "Disabled")}\n`;
		info += `    Thinking Level:     ${theme.fg("text", this.session.thinkingLevel || "N/A")}\n`;
		const activeTools = this.session.getActiveToolNames().join(", ") || "None";
		info += `    Active Tools:       ${theme.fg("text", activeTools)}\n\n`;

		// Omega Kernel Section
		const kernel = OmegaKernel.getInstance();
		info += `  ${theme.bold(theme.fg("success", "■ Ω KERNEL (MATHEMATICAL ENGINE)"))}\n`;
		info += `    Kernel State:       ${theme.fg("accent", "Ω Active")}\n`;
		info += `    Intent Contract:    ${theme.fg("text", kernel.currentIntent ? "Generated" : "None")}\n`;
		info += `    Effort Level:       ${theme.fg("text", kernel.currentIntent?.effortMode || "S0 (Direct)")}\n`;
		info += `    Entropy / Risk:     ${theme.fg("text", kernel.currentRouter ? `${kernel.currentRouter.entropy.toFixed(2)} (${kernel.currentIntent?.riskLevel || "low"} risk)` : "0.10 (low risk)")}\n`;
		info += `    Model Route:        ${theme.fg("text", kernel.currentRouter?.recommendedModelTier || "local")}\n`;
		info += `    Repo Graph State:   ${theme.fg("text", kernel.repoGraph.status || "fresh")}\n`;
		info += `    Patch Memory:       ${theme.fg("text", kernel.memoryHit ? "HIT (Edit macro retrieved)" : "MISS (Pattern indexed)")}\n`;
		info += `    Verification:       ${theme.fg("text", kernel.currentVerification?.status || "pending")}\n`;
		if (kernel.currentVerification?.errorHighlights) {
			info += `    Errors Detected:    ${theme.fg("error", kernel.currentVerification.errorHighlights.join(", "))}\n`;
		}
		info += `\n`;

		info += `  ${theme.bold(theme.fg("success", "■ MODEL & METRICS"))}\n`;
		info += `    Provider:           ${theme.fg("text", currentModel?.provider || "N/A")}\n`;
		info += `    Model:              ${theme.fg("text", currentModel?.id || "N/A")}\n`;
		const ctxLimit = currentModel?.contextWindow ? currentModel.contextWindow.toLocaleString() : "N/A";
		const ctxUsed = contextUsage ? `${contextUsage.percent.toFixed(1)}%` : "0%";
		info += `    Context Limit:      ${theme.fg("text", ctxLimit)}\n`;
		info += `    Context Used:       ${theme.fg("text", ctxUsed)}\n`;
		info += `    Total Cost:         ${theme.fg("accent", `$${totalCost.toFixed(3)}`)}\n\n`;

		info += `  ${theme.bold(theme.fg("success", "■ PROJECT & RUNTIME"))}\n`;
		info += `    Working Dir:        ${theme.fg("text", this.session.sessionManager.getCwd())}\n`;
		info += `    Git Branch:         ${theme.fg("text", branch)}\n`;
		info += `    Memory Heap:        ${theme.fg("text", `${memUsage.toFixed(1)} MB`)}\n`;
		const browserCount = this.session.getBrowserBridgeStatus().clients;
		info += `    Browser Bridge:     ${theme.fg("text", `${browserCount} client${browserCount === 1 ? "" : "s"} connected`)}\n`;
		info += `    Session Stats:      ${theme.fg("text", `${stats.userMessages} User / ${stats.assistantMessages} Assistant`)}\n`;

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(info, 1, 0));
		this.ui.requestRender();
	}

	private async handleUpdateCommand(args: string): Promise<void> {
		if (this.session.isStreaming || this.session.isCompacting) {
			this.showWarning("Guncelleme icin mevcut islemin bitmesini bekleyin.");
			return;
		}

		const parsedArgs = args ? args.split(/\s+/).filter(Boolean) : [];
		try {
			this.ui.stop();
			await handlePackageCommand(["update", ...parsedArgs]);
			console.log("\nDevam etmek icin bir tusa basin...");
			await this.ui.terminal.readKey();
		} catch (err: any) {
			const message = err instanceof Error ? err.message : String(err);
			console.error(`\nError: Guncelleme basarisiz (${message})`);
			console.log("Devam etmek icin bir tusa basin...");
			await this.ui.terminal.readKey();
		} finally {
			this.ui.start();
			this.ui.requestRender(true);
			this.showStatus("Guncelleme islemi tamamlandi. Degisiklikler icin /reload onerilir.");
		}
	}

	private async handleExportCommand(text: string): Promise<void> {
		const outputPath = this.getPathCommandArgument(text, "/export");

		try {
			if (outputPath?.endsWith(".jsonl")) {
				const filePath = this.session.exportToJsonl(outputPath);
				this.showStatus(`Oturum suraya aktarildi: ${filePath}`);
			} else {
				const filePath = await this.session.exportToHtml(outputPath);
				this.showStatus(`Oturum suraya aktarildi: ${filePath}`);
			}
		} catch (error: unknown) {
			this.showError(`Session export failed: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
		}
	}

	private getPathCommandArgument(text: string, command: "/export" | "/import"): string | undefined {
		if (text === command) {
			return undefined;
		}
		if (!text.startsWith(`${command} `)) {
			return undefined;
		}

		const argsString = text.slice(command.length + 1).trimStart();
		if (!argsString) {
			return undefined;
		}

		// Take the rest of the string as the path, allowing spaces.
		// If the user provided quotes, strip them so path.resolve works correctly.
		let path = argsString;
		if ((path.startsWith('"') && path.endsWith('"')) || (path.startsWith("'") && path.endsWith("'"))) {
			path = path.slice(1, -1);
		}
		return path;
	}

	private async handleImportCommand(text: string): Promise<void> {
		const inputPath = this.getPathCommandArgument(text, "/import");
		if (!inputPath) {
			this.showError("Kullanım: /import <dosya_yolu.jsonl>");
			return;
		}

		const confirmed = await this.showExtensionConfirm(
			"Oturumu içe aktar",
			`Mevcut oturum ${inputPath} ile değiştirilsin mi?`,
		);
		if (!confirmed) {
			this.showStatus("Ice aktarma iptal edildi");
			return;
		}

		try {
			if (this.loadingAnimation) {
				this.loadingAnimation.stop();
				this.loadingAnimation = undefined;
			}
			this.statusContainer.clear();
			const result = await this.runtimeHost.importFromJsonl(inputPath);
			if (result.cancelled) {
				this.showStatus("Ice aktarma iptal edildi");
				return;
			}
			this.renderCurrentSessionState();
			this.showStatus(`Oturum suradan ice aktarildi: ${inputPath}`);
		} catch (error: unknown) {
			if (error instanceof MissingSessionCwdError) {
				const selectedCwd = await this.promptForMissingSessionCwd(error);
				if (!selectedCwd) {
					this.showStatus("Ice aktarma iptal edildi");
					return;
				}
				const result = await this.runtimeHost.importFromJsonl(inputPath, selectedCwd);
				if (result.cancelled) {
					this.showStatus("Ice aktarma iptal edildi");
					return;
				}
				this.renderCurrentSessionState();
				this.showStatus(`Oturum suradan ice aktarildi: ${inputPath}`);
				return;
			}
			if (error instanceof SessionImportFileNotFoundError) {
				this.showError(`İçe aktarma başarısız: ${error.message}`);
				return;
			}
			await this.handleFatalRuntimeError("Oturum içe aktarılamadı", error);
		}
	}

	private async handleShareCommand(): Promise<void> {
		// Check if gh is available and logged in
		try {
			const authResult = spawnSync("gh", ["auth", "status"], { encoding: "utf-8" });
			if (authResult.status !== 0) {
				this.showError("GitHub CLI oturumu açılmamış. Önce 'gh auth login' komutunu çalıştırın.");
				return;
			}
		} catch {
			this.showError("GitHub CLI (gh) kurulu değil. https://cli.github.com/ adresinden kurun.");
			return;
		}

		// Export to a temp file
		const tmpFile = path.join(os.tmpdir(), "session.html");
		try {
			await this.session.exportToHtml(tmpFile);
		} catch (error: unknown) {
			this.showError(`Session export failed: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
			return;
		}

		// Show cancellable loader, replacing the editor
		const loader = new BorderedLoader(this.ui, theme, "Gist oluşturuluyor...");
		this.editorContainer.clear();
		this.editorContainer.addChild(loader);
		this.ui.setFocus(loader);
		this.ui.requestRender();

		const restoreEditor = () => {
			loader.dispose();
			this.editorContainer.clear();
			this.editorContainer.addChild(this.editor);
			this.ui.setFocus(this.editor);
			try {
				fs.unlinkSync(tmpFile);
			} catch {
				// Ignore cleanup errors
			}
		};

		// Create a secret gist asynchronously
		let proc: ReturnType<typeof spawn> | null = null;

		loader.onAbort = () => {
			proc?.kill();
			restoreEditor();
			this.showStatus("Paylaşım iptal edildi");
		};

		try {
			const result = await new Promise<{ stdout: string; stderr: string; code: number | null }>((resolve) => {
				proc = spawn("gh", ["gist", "create", "--public=false", tmpFile]);
				let stdout = "";
				let stderr = "";
				proc.stdout?.on("data", (data) => {
					stdout += data.toString();
				});
				proc.stderr?.on("data", (data) => {
					stderr += data.toString();
				});
				proc.on("close", (code) => resolve({ stdout, stderr, code }));
			});

			if (loader.signal.aborted) return;

			restoreEditor();

			if (result.code !== 0) {
				const errorMsg = result.stderr?.trim() || "Bilinmeyen hata";
				this.showError(`Gist oluşturulamadı: ${errorMsg}`);
				return;
			}

			// Extract gist ID from the URL returned by gh
			// gh returns something like: https://gist.github.com/username/GIST_ID
			const gistUrl = result.stdout?.trim();
			const gistId = gistUrl?.split("/").pop();
			if (!gistId) {
				this.showError("gh çıktısından gist ID'si alınamadı");
				return;
			}

			// Create the preview URL
			const previewUrl = getShareViewerUrl(gistId);
			this.showStatus(`Paylasim URL'si: ${previewUrl}\nGist: ${gistUrl}`);
		} catch (error: unknown) {
			if (!loader.signal.aborted) {
				restoreEditor();
				this.showError(`Gist oluşturulamadı: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
			}
		}
	}

	private async handleCopyCommand(): Promise<void> {
		const text = this.session.getLastAssistantText();
		if (!text) {
			this.showError("Henüz kopyalanacak bir mesaj yok.");
			return;
		}

		try {
			await copyToClipboard(text);
			this.showStatus("Son asistan mesajı panoya kopyalandı");
		} catch (error) {
			this.showError(error instanceof Error ? error.message : String(error));
		}
	}

	private handleExecuteLastBash(): void {
		const text = this.session.getLastAssistantText();
		if (!text) {
			this.showError("Henüz çalıştırılacak bir mesaj yok.");
			return;
		}

		// Find the last bash or sh code block
		const regex = /```(?:bash|sh)\n([\s\S]*?)```/gi;
		let lastMatch: RegExpExecArray | null = null;
		let match: RegExpExecArray | null;

		match = regex.exec(text);
		while (match !== null) {
			lastMatch = match;
			match = regex.exec(text);
		}

		if (lastMatch?.[1]) {
			const command = lastMatch[1].trim();
			if (command) {
				this.showStatus("Son bash komutu çalıştırılıyor...");
				this.handleBashCommand(command, false);
				return;
			}
		}

		this.showError("Son asistan mesajında bash kod bloğu bulunamadı.");
	}

	private handleNameCommand(text: string): void {
		const name = text.replace(/^\/name\s*/, "").trim();
		if (!name) {
			const currentName = this.sessionManager.getSessionName();
			if (currentName) {
				this.chatContainer.addChild(new Spacer(1));
				this.chatContainer.addChild(new Text(theme.fg("dim", `Oturum ismi: ${currentName}`), 1, 0));
			} else {
				this.showWarning("Kullanım: /name <isim>");
			}
			this.ui.requestRender();
			return;
		}

		this.session.setSessionName(name);
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(theme.fg("dim", `Oturum ismi ayarlandı: ${name}`), 1, 0));
		this.ui.requestRender();
	}

	private handleSessionCommand(): void {
		const stats = this.session.getSessionStats();
		const sessionName = this.sessionManager.getSessionName();

		let info = `${theme.bold("Oturum Bilgisi")}\n\n`;
		if (sessionName) {
			info += `${theme.fg("dim", "İsim:")} ${sessionName}\n`;
		}
		info += `${theme.fg("dim", "Dosya:")} ${stats.sessionFile ?? "Bellekte"}\n`;
		info += `${theme.fg("dim", "Kimlik:")} ${stats.sessionId}\n\n`;
		info += `${theme.bold("Mesajlar")}\n`;
		info += `${theme.fg("dim", "Kullanıcı:")} ${stats.userMessages}\n`;
		info += `${theme.fg("dim", "Asistan:")} ${stats.assistantMessages}\n`;
		info += `${theme.fg("dim", "Araç Çağrıları:")} ${stats.toolCalls}\n`;
		info += `${theme.fg("dim", "Araç Sonuçları:")} ${stats.toolResults}\n`;
		info += `${theme.fg("dim", "Toplam:")} ${stats.totalMessages}\n\n`;
		info += `${theme.bold("Jetonlar")}\n`;
		info += `${theme.fg("dim", "Giriş:")} ${stats.tokens.input.toLocaleString()}\n`;
		info += `${theme.fg("dim", "Çıkış:")} ${stats.tokens.output.toLocaleString()}\n`;
		if (stats.tokens.cacheRead > 0) {
			info += `${theme.fg("dim", "Önbellek Okuma:")} ${stats.tokens.cacheRead.toLocaleString()}\n`;
		}
		if (stats.tokens.cacheWrite > 0) {
			info += `${theme.fg("dim", "Önbellek Yazma:")} ${stats.tokens.cacheWrite.toLocaleString()}\n`;
		}
		info += `${theme.fg("dim", "Toplam:")} ${stats.tokens.total.toLocaleString()}\n`;

		if (stats.cost > 0) {
			info += `\n${theme.bold("Maliyet")}\n`;
			info += `${theme.fg("dim", "Toplam:")} ${stats.cost.toFixed(4)}`;
		}

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(info, 1, 0));
		this.ui.requestRender();
	}

	// -------------------------------------------------------------------------
	// /hub — MoonCode Dashboard
	// -------------------------------------------------------------------------
	private handleHubCommand(): void {
		const stats = this.session.getSessionStats();
		const model = this.session.model;
		const contextUsage = this.session.getContextUsage();
		const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
		const uptimeSec = Math.floor(process.uptime());
		const uptimeStr = uptimeSec >= 60 ? `${Math.floor(uptimeSec / 60)}m ${uptimeSec % 60}s` : `${uptimeSec}s`;
		const cwd = this.sessionManager.getCwd();
		const branch = this.footerDataProvider.getGitBranch();

		// Shadow-Git snapshot count
		const shadowDir = path.join(cwd, ".mooncode", "shadow");
		let shadowCount = 0;
		try {
			shadowCount = fs.readdirSync(shadowDir).filter((f) => f.endsWith(".bak")).length;
		} catch {}

		const ctxPct = contextUsage?.percent ?? 0;
		const barFilled = Math.round((ctxPct / 100) * 20);
		const ctxColor = ctxPct > 85 ? "error" : ctxPct > 65 ? "warning" : "accent";
		const ctxBar = theme.fg(ctxColor, "■".repeat(barFilled)) + theme.fg("dim", "□".repeat(20 - barFilled));

		const sep = theme.fg("dim", "─".repeat(50));
		const lbl = (l: string) => theme.fg("muted", l.padEnd(20));
		const v = (s: string) => theme.fg("text", s);
		const badge = (txt: string, c = "accent") => theme.bold(theme.fg(c as any, `[ ${txt} ]`));

		const info = [
			theme.bold(theme.fg("accent", "◆ MOONCODE HUB")),
			sep,
			`${lbl("Model")}${v(model ? `${model.provider}/${model.id}` : "—")}`,
			`${lbl("Proje")}${v(path.basename(cwd))}`,
			`${lbl("Branch")}${v(branch || "—")}`,
			sep,
			theme.bold("  Oturum"),
			`${lbl("  Mesajlar")}${v(`${stats.userMessages}u · ${stats.assistantMessages}a`)}`,
			`${lbl("  Token")}${v(stats.tokens.total.toLocaleString())}`,
			`${lbl("  Maliyet")}${v(stats.cost > 0 ? `$${stats.cost.toFixed(4)}` : "—")}`,
			sep,
			theme.bold("  Sistem"),
			`${lbl("  Bellek (heap)")}${v(`${memMB} MB`)}`,
			`${lbl("  Uptime")}${v(uptimeStr)}`,
			`${lbl("  Bağlam")}  ${ctxBar}  ${theme.fg("dim", `${ctxPct.toFixed(1)}%`)}`,
			sep,
			theme.bold("  Koruma"),
			`${lbl("  Shadow-Git")}${shadowCount > 0 ? badge(`${shadowCount} snapshot`, "accent") : badge("Aktif", "success")}`,
			`${lbl("  Plan Modu")}${this.isPlanMode ? badge("AÇIK", "warning") : theme.fg("dim", "kapalı")}`,
			sep,
			theme.fg("dim", "  Komutlar: /rewind  /context  /session  /diff  /plan  /compact"),
		].join("\n");

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(info, 1, 0));
		this.ui.requestRender();
	}

	// -------------------------------------------------------------------------
	// /context — Context window kullanim gosterge
	// -------------------------------------------------------------------------
	private handleContextCommand(): void {
		const stats = this.session.getSessionStats();
		const usage = stats.contextUsage;

		let info = `${theme.bold("Context Window Durumu")}\n\n`;

		if (usage) {
			const usedTokens = usage.inputTokens ?? stats.tokens.input;
			const maxTokens = usage.contextWindowSize;
			const usedPct = maxTokens > 0 ? Math.min(100, Math.round((usedTokens / maxTokens) * 100)) : 0;

			// Renk: %0-60 yesil, %60-85 sari, %85+ kirmizi
			const barColor: ThemeColor = usedPct >= 85 ? "error" : usedPct >= 60 ? "warning" : "success";
			const filledLen = Math.round((usedPct / 100) * 30);
			const bar = theme.fg(barColor, "█".repeat(filledLen)) + theme.fg("dim", "░".repeat(30 - filledLen));

			info += `${bar} ${theme.bold(`${usedPct}%`)}\n`;
			info += `${theme.fg("dim", "Kullanilan:")} ${usedTokens.toLocaleString()} / ${maxTokens.toLocaleString()} token\n`;
			info += `${theme.fg("dim", "Kalan:")}    ${(maxTokens - usedTokens).toLocaleString()} token\n\n`;
		} else {
			info += `${theme.fg("dim", "Giriş:")} ${stats.tokens.input.toLocaleString()} token\n`;
			info += `${theme.fg("dim", "Cikis:")} ${stats.tokens.output.toLocaleString()} token\n`;
			info += `${theme.fg("dim", "Toplam:")} ${stats.tokens.total.toLocaleString()} token\n\n`;
			info += `${theme.fg("muted", "Not: Tam context window bilgisi bu model icin mevcut degil")}\n`;
		}

		info += `${theme.bold("Mesajlar")}\n`;
		info += `${theme.fg("dim", "Kullanici:")} ${stats.userMessages}  ${theme.fg("dim", "Asistan:")} ${stats.assistantMessages}  ${theme.fg("dim", "Arac:")} ${stats.toolCalls}\n`;
		info += `\n${theme.fg("muted", "Ipucu: Context doluyorsa /compact ile sikistrabilirsin")}\n`;

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Text(info, 1, 0));
		this.ui.requestRender();
	}

	// -------------------------------------------------------------------------
	// /plan — Read-only analiz modu (Claude Code Plan Mode benzeri)
	// -------------------------------------------------------------------------
	private handlePlanCommand(arg: string): void {
		const enable = arg === "on" ? true : arg === "off" ? false : !this.isPlanMode;

		if (enable === this.isPlanMode) {
			this.showStatus(
				this.isPlanMode
					? "Plan modu zaten aktif. /plan off ile kapat."
					: "Plan modu zaten kapali. /plan on ile ac.",
			);
			return;
		}

		this.isPlanMode = enable;

		if (enable) {
			// Plan mode: write, edit, bash toollarini kaldir
			this.session.setActiveToolsByName(["read", "grep", "find", "ls", "browser_tabs", "browser_page"]);
			const msg =
				`${theme.bold(theme.fg("accent", "Plan Modu Aktif"))}\n\n` +
				`${theme.fg("dim", "Dosya yazma ve bash devre disi. Web erisimi sadece Browser Bridge uzerinden.")}\n` +
				`${theme.fg("dim", "Onay vermeden hicbir degisiklik yapilmayacak.")}\n\n` +
				`${theme.fg("muted", "/plan off ile normal moda don.")}\n`;
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(new Text(msg, 1, 0));
			this.showStatus("[PLAN] Plan modu aktif - model sadece okuyabilir");
		} else {
			// Normal moda don: tum toollar geri
			this.session.setActiveToolsByName([
				"read",
				"bash",
				"edit",
				"write",
				"grep",
				"find",
				"ls",
				"git_ship",
				"browser_tabs",
				"browser_page",
			]);
			const msg =
				`${theme.bold(theme.fg("success", "Normal Mod"))}\n\n` +
				`${theme.fg("dim", "Tum toollar yeniden aktif. Dosya yazma, bash, git_ship ve Browser Bridge kullanilabilir.")}\n`;
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(new Text(msg, 1, 0));
			this.showStatus("Plan modu kapandi - tum toollar aktif");
		}
		this.footer.invalidate();
		this.ui.requestRender();
	}

	// -------------------------------------------------------------------------
	// /init — MOON.md workspace belgesi olustur
	// -------------------------------------------------------------------------
	private handleAutoThinkCommand(arg: string): void {
		const normalized = arg.trim().toLowerCase();
		if (normalized === "on" || normalized === "true" || normalized === "1") {
			this.session.setAutoThinkEnabled(true);
			this.showStatus("AutoThink acildi. Detayli islerde xhigh, uygulama adimlarinda minimal/low kullanilacak.");
			return;
		}
		if (normalized === "off" || normalized === "false" || normalized === "0") {
			this.session.setAutoThinkEnabled(false);
			this.showStatus("AutoThink kapatildi. Dusunme seviyesi elle sectigin ayarda kalacak.");
			return;
		}
		this.showStatus(`Kullanim: /autothink on|off (su an: ${this.session.getAutoThinkEnabled() ? "on" : "off"})`);
	}

	private handleRoutingCommand(arg: string): void {
		const normalized = arg.trim().toLowerCase();
		if (normalized === "on" || normalized === "true" || normalized === "1") {
			this.session.setAutoEscalateModel(true);
			this.showStatus(
				"Model Routing acildi. Gemini/Ollama gibi hizli modeller kullanilirken, karmasik plan ve refactor islemlerinde otomatik olarak Claude'a gecilecek.",
			);
			return;
		}
		if (normalized === "off" || normalized === "false" || normalized === "0") {
			this.session.setAutoEscalateModel(false);
			this.showStatus("Model Routing kapatildi. Model gecisleri sadece manuel olarak yapilacak.");
			return;
		}

		const status = this.session.getAutoEscalateModel() ? "on" : "off";
		const smart = this.session.settingsManager.getSmartModel();
		const smartStr = smart ? `${smart.provider}/${smart.id}` : "yok";
		this.showStatus(`Kullanim: /routing on|off (su an: ${status}). Hedef premium model: ${smartStr}`);
	}
	private handleAutomationCommand(arg: string): void {
		const normalized = arg.trim().toLowerCase();
		if (normalized === "on" || normalized === "true" || normalized === "1") {
			this.session.setAutomationEnabled(true);
			this.showStatus("Automation acildi. Gorevini yaz: app/browser/terminal akisini mantikli sekilde yurutur.");
		} else if (normalized === "off" || normalized === "false" || normalized === "0") {
			this.session.setAutomationEnabled(false);
			this.showStatus("Automation kapatildi.");
		} else if (normalized === "confirm off") {
			this.session.setAutomationRequireConfirmation(false);
			this.showStatus("Automation onay modu kapali. Kritik islerde yine acik niyet aranir.");
		} else if (normalized === "confirm on") {
			this.session.setAutomationRequireConfirmation(true);
			this.showStatus("Automation onay modu acik.");
		} else {
			const enabled = this.session.getAutomationEnabled() ? "acik" : "kapali";
			const confirm = this.session.getAutomationRequireConfirmation() ? "acik" : "kapali";
			this.showStatus(`Automation: ${enabled} | onay: ${confirm} | /automation on|off|confirm on|confirm off`);
		}
		this.footer.invalidate();
		this.ui.requestRender();
	}

	private async handleInitCommand(): Promise<void> {
		const cwd = this.sessionManager.getCwd();
		const moonPath = path.join(cwd, "MOON.md");
		const agentsPath = path.join(cwd, "AGENTS.md");

		const targetPath = fs.existsSync(agentsPath) ? agentsPath : moonPath;
		const fileName = path.basename(targetPath);

		if (fs.existsSync(targetPath)) {
			this.showStatus(`${fileName} zaten mevcut - uzerine yazilmadi`);
			return;
		}

		const projectName = path.basename(cwd);
		const content = [
			`# ${projectName} — Proje Kurallari`,
			"",
			"## Genel Prensipler",
			"",
			"- Kodu kisa, okunabilir ve production-ready tut",
			"- Over-engineering ve gereksiz abstraction'dan kacin",
			"- Her degisiklikten once repo baglamini oku",
			"",
			"## Teknoloji Stack",
			"",
			"<!-- Proje teknolojilerini buraya ekle -->",
			"",
			"## UI Tasarim Varsayilani",
			"",
			"- Kullanici farkli bir stil istemedikce UI: shadcn/ui + Vercel dark SaaS + Linear/Raycast temizligi",
			"- Mevcut proje design system'i ve component convention'lari onceliklidir",
			"- Tailwind/Radix/Lucide varsa kullan; yoksa bagimlilik eklemeden ayni estetigi mevcut stack ile taklit et",
			"- Dark-first, near-black background, neutral cards, thin borders, muted text, strong headings, rounded-xl/2xl",
			"- Hover, focus-visible, disabled, loading, empty, error, active ve responsive state'leri dusun",
			"",
			"## Kod Standartlari",
			"",
			"<!-- Linting, formatting, test gereksinimleri -->",
			"",
			"## Dizin Yapisi",
			"",
			"<!-- Onemli dizinleri ve amaclarini acikla -->",
			"",
			"## Calistirmak icin",
			"",
			"```bash",
			"# Gelistirme",
			"npm run dev",
			"",
			"# Build",
			"npm run build",
			"",
			"# Kontrol",
			"npm run check",
			"```",
		].join("\n");

		try {
			fs.writeFileSync(targetPath, content, "utf-8");
			const msg =
				`${theme.bold(theme.fg("success", `${fileName} olusturuldu`))}\n\n` +
				`${theme.fg("dim", targetPath)}\n\n` +
				`${theme.fg("muted", "Proje kurallarin ve stack bilgini dosyaya ekle. Moon her oturumda okuyacak.")}\n`;
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(new Text(msg, 1, 0));
			this.ui.requestRender();
		} catch (err) {
			this.showError(`${fileName} olusturulamadi: ${err instanceof Error ? err.message : String(err)}`);
		}
	}

	private handleChangelogCommand(): void {
		const changelogPath = getChangelogPath();
		const allEntries = parseChangelog(changelogPath);

		const changelogMarkdown =
			allEntries.length > 0
				? allEntries
						.reverse()
						.map((e) => e.content)
						.join("\n\n")
				: "Değişiklik günlüğü kaydı bulunamadı.";

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder());
		this.chatContainer.addChild(new Text(theme.bold(theme.fg("accent", "Yenilikler")), 1, 0));
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Markdown(changelogMarkdown, 1, 1, this.getMarkdownThemeWithSettings()));
		this.chatContainer.addChild(new DynamicBorder());
		this.ui.requestRender();
	}

	/**
	 * Capitalize keybinding for display (e.g., "ctrl+c" -> "Ctrl+C").
	 */
	private capitalizeKey(key: string): string {
		return key
			.split("/")
			.map((k) =>
				k
					.split("+")
					.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
					.join("+"),
			)
			.join("/");
	}

	/**
	 * Get capitalized display string for an app keybinding action.
	 */
	private getAppKeyDisplay(action: AppKeybinding): string {
		return this.capitalizeKey(keyText(action));
	}

	/**
	 * Get capitalized display string for an editor keybinding action.
	 */
	private getEditorKeyDisplay(action: Keybinding): string {
		return this.capitalizeKey(keyText(action));
	}

	private handleHotkeysCommand(): void {
		// Navigation keybindings
		const cursorUp = this.getEditorKeyDisplay("tui.editor.cursorUp");
		const cursorDown = this.getEditorKeyDisplay("tui.editor.cursorDown");
		const cursorLeft = this.getEditorKeyDisplay("tui.editor.cursorLeft");
		const cursorRight = this.getEditorKeyDisplay("tui.editor.cursorRight");
		const cursorWordLeft = this.getEditorKeyDisplay("tui.editor.cursorWordLeft");
		const cursorWordRight = this.getEditorKeyDisplay("tui.editor.cursorWordRight");
		const cursorLineStart = this.getEditorKeyDisplay("tui.editor.cursorLineStart");
		const cursorLineEnd = this.getEditorKeyDisplay("tui.editor.cursorLineEnd");
		const jumpForward = this.getEditorKeyDisplay("tui.editor.jumpForward");
		const jumpBackward = this.getEditorKeyDisplay("tui.editor.jumpBackward");
		const pageUp = this.getEditorKeyDisplay("tui.editor.pageUp");
		const pageDown = this.getEditorKeyDisplay("tui.editor.pageDown");

		// Editing keybindings
		const submit = this.getEditorKeyDisplay("tui.input.submit");
		const newLine = this.getEditorKeyDisplay("tui.input.newLine");
		const deleteWordBackward = this.getEditorKeyDisplay("tui.editor.deleteWordBackward");
		const deleteWordForward = this.getEditorKeyDisplay("tui.editor.deleteWordForward");
		const deleteToLineStart = this.getEditorKeyDisplay("tui.editor.deleteToLineStart");
		const deleteToLineEnd = this.getEditorKeyDisplay("tui.editor.deleteToLineEnd");
		const yank = this.getEditorKeyDisplay("tui.editor.yank");
		const yankPop = this.getEditorKeyDisplay("tui.editor.yankPop");
		const undo = this.getEditorKeyDisplay("tui.editor.undo");
		const tab = this.getEditorKeyDisplay("tui.input.tab");

		// App keybindings
		const interrupt = this.getAppKeyDisplay("app.interrupt");
		const clear = this.getAppKeyDisplay("app.clear");
		const exit = this.getAppKeyDisplay("app.exit");
		const suspend = this.getAppKeyDisplay("app.suspend");
		const cycleThinkingLevel = this.getAppKeyDisplay("app.thinking.cycle");
		const cycleModelForward = this.getAppKeyDisplay("app.model.cycleForward");
		const selectModel = this.getAppKeyDisplay("app.model.select");
		const expandTools = this.getAppKeyDisplay("app.tools.expand");
		const toggleThinking = this.getAppKeyDisplay("app.thinking.toggle");
		const externalEditor = this.getAppKeyDisplay("app.editor.external");
		const cycleModelBackward = this.getAppKeyDisplay("app.model.cycleBackward");
		const followUp = this.getAppKeyDisplay("app.message.followUp");
		const dequeue = this.getAppKeyDisplay("app.message.dequeue");
		const pasteImage = this.getAppKeyDisplay("app.clipboard.pasteImage");

		let hotkeys = `
**Navigation**
| Key | Action |
|-----|--------|
| \`${cursorUp}\` / \`${cursorDown}\` / \`${cursorLeft}\` / \`${cursorRight}\` | Move cursor / browse history (Up when empty) |
| \`${cursorWordLeft}\` / \`${cursorWordRight}\` | Move by word |
| \`${cursorLineStart}\` | Start of line |
| \`${cursorLineEnd}\` | End of line |
| \`${jumpForward}\` | Jump forward to character |
| \`${jumpBackward}\` | Jump backward to character |
| \`${pageUp}\` / \`${pageDown}\` | Scroll by page |

**Editing**
| Key | Action |
|-----|--------|
| \`${submit}\` | Send message |
| \`${newLine}\` | New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""} |
| \`${deleteWordBackward}\` | Delete word backwards |
| \`${deleteWordForward}\` | Delete word forwards |
| \`${deleteToLineStart}\` | Delete to start of line |
| \`${deleteToLineEnd}\` | Delete to end of line |
| \`${yank}\` | Paste the most-recently-deleted text |
| \`${yankPop}\` | Cycle through the deleted text after pasting |
| \`${undo}\` | Undo |

**Other**
| Key | Action |
|-----|--------|
| \`${tab}\` | Path completion / accept autocomplete |
| \`${interrupt}\` | Cancel autocomplete / abort streaming |
| \`${clear}\` | Clear editor (first) / exit (second) |
| \`${exit}\` | Exit (when editor is empty) |
| \`${suspend}\` | Suspend to background |
| \`${cycleThinkingLevel}\` | Cycle thinking level |
| \`${cycleModelForward}\` / \`${cycleModelBackward}\` | Cycle models |
| \`${selectModel}\` | Open model selector |
| \`${expandTools}\` | Toggle tool output expansion |
| \`${toggleThinking}\` | Toggle thinking block visibility |
| \`${externalEditor}\` | Edit message in external editor |
| \`${followUp}\` | Queue follow-up message |
| \`${dequeue}\` | Restore queued messages |
| \`${pasteImage}\` | Paste image from clipboard |
| \`/\` | Slash commands |
| \`!\` | Run bash command |
| \`!!\` | Run bash command (excluded from context) |
`;

		// Add extension-registered shortcuts
		const extensionRunner = this.session.extensionRunner;
		const shortcuts = extensionRunner.getShortcuts(this.keybindings.getEffectiveConfig());
		if (shortcuts.size > 0) {
			hotkeys += `
**Uzantılar**
| Tuş | Eylem |
|-----|--------|
`;
			for (const [key, shortcut] of shortcuts) {
				const description = shortcut.description ?? shortcut.extensionPath;
				const keyDisplay = key.replace(/\b\w/g, (c) => c.toUpperCase());
				hotkeys += `| \`${keyDisplay}\` | ${description} |\n`;
			}
		}

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DynamicBorder());
		this.chatContainer.addChild(new Text(theme.bold(theme.fg("accent", "Klavye Kısayolları")), 1, 0));
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new Markdown(hotkeys.trim(), 1, 1, this.getMarkdownThemeWithSettings()));
		this.chatContainer.addChild(new DynamicBorder());
		this.ui.requestRender();
	}

	private async handleClearCommand(): Promise<void> {
		if (this.loadingAnimation) {
			this.loadingAnimation.stop();
			this.loadingAnimation = undefined;
		}
		this.statusContainer.clear();
		try {
			const result = await this.runtimeHost.newSession();
			if (result.cancelled) {
				return;
			}
			this.renderCurrentSessionState();
			this.chatContainer.addChild(new Spacer(1));
			this.chatContainer.addChild(new Text(`${theme.fg("accent", "✓ Yeni oturum başlatıldı")}`, 1, 1));
			this.ui.requestRender();
		} catch (error: unknown) {
			await this.handleFatalRuntimeError("Failed to create session", error);
		}
	}

	private handleDebugCommand(): void {
		const width = this.ui.terminal.columns;
		const height = this.ui.terminal.rows;
		const allLines = this.ui.render(width);

		const debugLogPath = getDebugLogPath();
		const debugData = [
			`Error ayıklama çıktısı: ${new Date().toISOString()}`,
			`Terminal: ${width}x${height}`,
			`Toplam satır: ${allLines.length}`,
			"",
			"=== Görünür genişliklere sahip tüm işlenmiş satırlar ===",
			...allLines.map((line, idx) => {
				const vw = visibleWidth(line);
				const escaped = JSON.stringify(line);
				return `[${idx}] (w=${vw}) ${escaped}`;
			}),
			"",
			"=== Motor mesajları (JSONL) ===",
			...this.session.messages.map((msg) => JSON.stringify(msg)),
			"",
		].join("\n");

		fs.mkdirSync(path.dirname(debugLogPath), { recursive: true });
		fs.writeFileSync(debugLogPath, debugData);

		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(
			new Text(
				`${theme.fg("accent", "✓ Error ayıklama günlüğü yazıldı")}\n${theme.fg("muted", debugLogPath)}`,
				1,
				1,
			),
		);
		this.ui.requestRender();
	}

	private handleArminSaysHi(): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new ArminComponent(this.ui));
		this.ui.requestRender();
	}

	private handleDementedDelves(): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new EarendilAnnouncementComponent());
		this.ui.requestRender();
	}

	private handleDaxnuts(): void {
		this.chatContainer.addChild(new Spacer(1));
		this.chatContainer.addChild(new DaxnutsComponent(this.ui));
		this.ui.requestRender();
	}

	private checkDaxnutsEasterEgg(model: { provider: string; id: string }): void {
		if (model.provider === "opencode" && model.id.toLowerCase().includes("kimi-k2.5")) {
			this.handleDaxnuts();
		}
	}

	private async handleBashCommand(command: string, excludeFromContext = false): Promise<void> {
		const extensionRunner = this.session.extensionRunner;

		// Emit user_bash event to let extensions intercept
		const eventResult = await extensionRunner.emitUserBash({
			type: "user_bash",
			command,
			excludeFromContext,
			cwd: this.sessionManager.getCwd(),
		});

		// If extension returned a full result, use it directly
		if (eventResult?.result) {
			const result = eventResult.result;

			// Create UI component for display
			this.bashComponent = new BashExecutionComponent(command, this.ui, excludeFromContext);
			if (this.session.isStreaming) {
				this.pendingMessagesContainer.addChild(this.bashComponent);
				this.pendingBashComponents.push(this.bashComponent);
			} else {
				this.chatContainer.addChild(this.bashComponent);
			}

			// Show output and complete
			if (result.output) {
				this.bashComponent.appendOutput(result.output);
			}
			this.bashComponent.setComplete(
				result.exitCode,
				result.cancelled,
				result.truncated ? ({ truncated: true, content: result.output } as TruncationResult) : undefined,
				result.fullOutputPath,
			);

			// Record the result in session
			this.session.recordBashResult(command, result, { excludeFromContext });
			this.bashComponent = undefined;
			this.ui.requestRender();
			return;
		}

		// Normal execution path (possibly with custom operations)
		const isDeferred = this.session.isStreaming;
		this.bashComponent = new BashExecutionComponent(command, this.ui, excludeFromContext);

		if (isDeferred) {
			// Show in pending area when engine is streaming
			this.pendingMessagesContainer.addChild(this.bashComponent);
			this.pendingBashComponents.push(this.bashComponent);
		} else {
			// Show in chat immediately when engine is idle
			this.chatContainer.addChild(this.bashComponent);
		}
		this.ui.requestRender();

		try {
			const result = await this.session.executeBash(
				command,
				(chunk) => {
					if (this.bashComponent) {
						this.bashComponent.appendOutput(chunk);
						this.ui.requestRender();
					}
				},
				{ excludeFromContext, operations: eventResult?.operations },
			);

			if (this.bashComponent) {
				this.bashComponent.setComplete(
					result.exitCode,
					result.cancelled,
					result.truncated ? ({ truncated: true, content: result.output } as TruncationResult) : undefined,
					result.fullOutputPath,
				);
			}

			// AUTO-FIX PROMPT
			if (result.exitCode !== 0 && result.exitCode !== undefined && !result.cancelled) {
				this.showStatus("⚠️ Komut hata verdi. Düzeltmek için Enter'a basın (Auto-Fix).");
				this.editor.setValue(
					`Az önce çalıştırdığım \`${command}\` komutu şu hatayı verdi:\n\n\`\`\`\n${result.output?.trim()}\n\`\`\`\n\nLütfen bu hatayı analiz et ve nasıl çözeceğimizi söyle.`,
				);
			}
		} catch (error) {
			if (this.bashComponent) {
				this.bashComponent.setComplete(undefined, false);
			}
			this.showError(`Bash komutu başarısız oldu: ${error instanceof Error ? error.message : "Bilinmeyen hata"}`);
			// AUTO-FIX PROMPT
			this.editor.setValue(`Lütfen az önce çalıştırdığım \`${command}\` komutunun hatasını düzelt.`);
			this.showStatus("Otomatik düzeltme (Auto-Fix) için Enter'a basabilirsiniz.");
		}

		this.bashComponent = undefined;
		this.ui.requestRender();
	}

	private async handleCompactCommand(customInstructions?: string): Promise<void> {
		const entries = this.sessionManager.getEntries();
		const messageCount = entries.filter((e) => e.type === "message").length;

		if (messageCount < 2) {
			this.showWarning("Sıkıştırılacak bir şey yok (henüz mesaj yok)");
			return;
		}

		if (this.loadingAnimation) {
			this.loadingAnimation.stop();
			this.loadingAnimation = undefined;
		}
		this.statusContainer.clear();

		try {
			await this.session.compact(customInstructions);
		} catch {
			// Ignore, will be emitted as an event
		}
	}

	stop(): void {
		if (this.webUiProcess) {
			try {
				if (process.platform === "win32") {
					spawn("taskkill", ["/F", "/T", "/PID", String(this.webUiProcess.pid)], { shell: true });
				} else {
					process.kill(-this.webUiProcess.pid);
				}
			} catch {
				// Ignore cleanup errors
			}
		}
		this.unregisterSignalHandlers();
		if (this.settingsManager.getShowTerminalProgress()) {
			this.ui.terminal.setProgress(false);
		}
		if (this.loadingAnimation) {
			this.loadingAnimation.stop();
			this.loadingAnimation = undefined;
		}
		this.clearExtensionTerminalInputListeners();
		if (this.builtInHeader && "dispose" in this.builtInHeader && typeof this.builtInHeader.dispose === "function") {
			this.builtInHeader.dispose();
		}
		this.footer.dispose();
		this.footerDataProvider.dispose();
		if (this.unsubscribe) {
			this.unsubscribe();
		}
		if (this.activeMetricsChart) {
			this.activeMetricsChart.stop();
			this.activeMetricsChart = undefined;
		}
		if (this.isInitialized) {
			this.ui.stop();
			this.isInitialized = false;
		}
	}

	private handleMcpCommand(): void {
		this.showMcpSelector();
	}

	private showMcpSelector(): void {
		const mcpManager = this.session.mcpManager;
		let statusMessage = "";
		const options = [{ id: "settings", name: "⚙️  Ayarları Düzenle", description: "settings.json dosyasını aç" }];

		if (!mcpManager) {
			statusMessage = "❌ MCP Manager oturumda yüklü değil. Ayarları kontrol edin.";
		} else {
			const clients = mcpManager.getClients();
			if (!clients || clients.size === 0) {
				statusMessage = "⚠️ Bağlı MCP sunucusu yok.";
			} else {
				statusMessage = `✅ ${clients.size} adet MCP sunucusu bağlı.`;
				options.push({ id: "restart", name: "🔄 Yeniden Başlat", description: "MCP Manager'ı yeniden yükle" });

				for (const name of clients.keys()) {
					options.push({ id: `server-${name}`, name: `✓ ${name}`, description: "Bağlı sunucu" });
				}
			}
		}

		this.showSelector((done) => {
			const selector = new McpSelectorComponent(
				options,
				statusMessage,
				async (optionId: string) => {
					done();

					if (optionId === "settings") {
						const { getSettingsPath } = await import("../../config.js");
						const { spawn } = await import("child_process");
						const settingsPath = getSettingsPath();

						// Try to open with OS default application
						const command =
							process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
						spawn(command, [settingsPath], { shell: true, detached: true });

						this.showStatus(
							`Ayarlar dosyası şurada açıldı: ${settingsPath}. Değişikliklerden sonra 'Yeniden Başlat' yapmayı unutmayın.`,
						);
						return;
					}

					if (optionId === "restart") {
						if (mcpManager) {
							this.showStatus("MCP Manager yeniden başlatılıyor...");
							await mcpManager.restart();
							this.showStatus("MCP Manager başarıyla yeniden başlatıldı.");
						}
						return;
					}

					// Just showing info for servers
					if (optionId.startsWith("server-")) {
						this.showStatus(`Sunucu: ${optionId.replace("server-", "")}`);
					}
				},
				() => {
					done();
					this.ui.requestRender();
				},
			);
			return { component: selector, focus: selector };
		});
	}

	private async handleSwarmCommand(task: string): Promise<void> {
		if (!task) {
			this.showError("Lütfen bir görev belirtin. Örn: /swarm Bir API endpoint yaz.");
			return;
		}
		this.showStatus("🤖 Swarm (Multi-Agent) Intelligence başlatılıyor...");

		try {
			// Dynamically import to avoid cyclic dependencies
			const { SwarmManager } = await import("moon-engine");

			const swarm = new SwarmManager(this.session.model, {
				streamFn: this.session.engine.streamFn,
				getApiKey: async (provider: string) => {
					return await this.session.modelRegistry.getApiKeyForProvider(provider);
				},
			});

			swarm.on("swarm:start", (data: any) => this.showStatus(`[Swarm] Başladı: ${data.taskDescription}`));
			swarm.on("agent:start", (data: any) => this.showStatus(`[Swarm Agent] ${data.role} çalışıyor...`));
			swarm.on("agent:complete", (data: any) => this.showStatus(`[Swarm Agent] ${data.role} tamamlandı.`));

			const result = await swarm.executeParallelTask(task, []);

			// Feed result back into editor or prompt
			this.editor.setText(result);
			this.ui.requestRender();
			this.showStatus("✅ Swarm görevi başarıyla tamamladı! Sonucu inceleyip gönderebilirsiniz.");
		} catch (error: any) {
			this.showError(`Swarm hatası: ${error.message || error}`);
		}
	}

	private async handleFixCommand(arg?: string): Promise<void> {
		this.showStatus("Auto-Healer başlatılıyor...");
		try {
			const { AutoHealer } = await import("moon-engine");
			const healer = new AutoHealer(this.session);
			await healer.run(arg);
			this.showStatus("Auto-Healer tamamlandı.");
		} catch (e: any) {
			this.showError(`Auto-Healer henüz tam yüklenmedi veya hata verdi: ${e.message}`);
		}
	}

	private async handleEvolveCommand(): Promise<void> {
		this.showStatus("🧬 Meta-Evolution Engine başlatılıyor...");
		try {
			const { MetaEvolver } = await import("moon-engine");
			const evolver = new MetaEvolver(this.session);
			await evolver.evolve();
			this.showStatus("🧬 Meta-Evolution döngüsü tetiklendi.");
		} catch (e: any) {
			this.showError(`Meta-Evolver yüklenemedi: ${e.message}`);
		}
	}
}
