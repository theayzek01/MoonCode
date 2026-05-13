// @ts-nocheck
/**
 * CLI argument parsing and help display
 */

import chalk from "chalk";
import type { ThinkingLevel } from "moon-engine";
import { APP_NAME, CONFIG_DIR_NAME } from "../config.js";
import type { ExtensionFlag } from "../core/extensions/types.js";

export type Mode = "text" | "json" | "rpc";

export interface Args {
	provider?: string;
	headless?: boolean;
	timeout?: number;
	outputFormat?: "json" | "text";
	model?: string;
	apiKey?: string;
	systemPrompt?: string;
	appendSystemPrompt?: string[];
	thinking?: ThinkingLevel;
	continue?: boolean;
	resume?: boolean;
	help?: boolean;
	version?: boolean;
	mode?: Mode;
	noSession?: boolean;
	session?: string;
	fork?: string;
	sessionDir?: string;
	models?: string[];
	tools?: string[];
	noTools?: boolean;
	noBuiltinTools?: boolean;
	extensions?: string[];
	noExtensions?: boolean;
	print?: boolean;
	export?: string;
	noSkills?: boolean;
	skills?: string[];
	promptTemplates?: string[];
	noPromptTemplates?: boolean;
	themes?: string[];
	noThemes?: boolean;
	noContextFiles?: boolean;
	listModels?: string | true;
	offline?: boolean;
	verbose?: boolean;
	messages: string[];
	fileArgs: string[];
	/** Unknown flags (potentially extension flags) - map of flag name to value */
	unknownFlags: Map<string, boolean | string>;
	diagnostics: Array<{ type: "warning" | "error"; message: string }>;
}

const VALID_THINKING_LEVELS = ["off", "minimal", "low", "medium", "high", "xhigh"] as const;

export function isValidThinkingLevel(level: string): level is ThinkingLevel {
	return VALID_THINKING_LEVELS.includes(level as ThinkingLevel);
}

export function parseArgs(args: string[]): Args {
	const result: Args = {
		messages: [],
		fileArgs: [],
		unknownFlags: new Map(),
		diagnostics: [],
	};

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];

		if (arg === "--help" || arg === "-h") {
			result.help = true;
		} else if (arg === "--version" || arg === "-v") {
			result.version = true;
		} else if (arg === "--headless") {
			result.headless = true;
		} else if (arg === "--timeout" && i + 1 < args.length) {
			result.timeout = Number(args[++i]);
		} else if (arg === "--output-format" && i + 1 < args.length) {
			const value = args[++i];
			if (value === "json" || value === "text") result.outputFormat = value;
		} else if (arg === "--mode" && i + 1 < args.length) {
			const mode = args[++i];
			if (mode === "text" || mode === "json" || mode === "rpc") {
				result.mode = mode;
			}
		} else if (arg === "--continue" || arg === "-c") {
			result.continue = true;
		} else if (arg === "--resume" || arg === "-r") {
			result.resume = true;
		} else if (arg === "--provider" && i + 1 < args.length) {
			result.provider = args[++i];
		} else if (arg === "--model" && i + 1 < args.length) {
			result.model = args[++i];
		} else if (arg === "--api-key" && i + 1 < args.length) {
			result.apiKey = args[++i];
		} else if (arg === "--system-prompt" && i + 1 < args.length) {
			result.systemPrompt = args[++i];
		} else if (arg === "--append-system-prompt" && i + 1 < args.length) {
			result.appendSystemPrompt = result.appendSystemPrompt ?? [];
			result.appendSystemPrompt.push(args[++i]);
		} else if (arg === "--no-session") {
			result.noSession = true;
		} else if (arg === "--session" && i + 1 < args.length) {
			result.session = args[++i];
		} else if (arg === "--fork" && i + 1 < args.length) {
			result.fork = args[++i];
		} else if (arg === "--session-dir" && i + 1 < args.length) {
			result.sessionDir = args[++i];
		} else if (arg === "--models" && i + 1 < args.length) {
			result.models = args[++i].split(",").map((s) => s.trim());
		} else if (arg === "--no-tools" || arg === "-nt") {
			result.noTools = true;
		} else if (arg === "--no-builtin-tools" || arg === "-nbt") {
			result.noBuiltinTools = true;
		} else if ((arg === "--tools" || arg === "-t") && i + 1 < args.length) {
			result.tools = args[++i]
				.split(",")
				.map((s) => s.trim())
				.filter((name) => name.length > 0);
		} else if (arg === "--thinking" && i + 1 < args.length) {
			const level = args[++i];
			if (isValidThinkingLevel(level)) {
				result.thinking = level;
			} else {
				result.diagnostics.push({
					type: "warning",
					message: `Invalid thinking level "${level}". Valid values: ${VALID_THINKING_LEVELS.join(", ")}`,
				});
			}
		} else if (arg === "--print" || arg === "-p") {
			result.print = true;
		} else if (arg === "--export" && i + 1 < args.length) {
			result.export = args[++i];
		} else if ((arg === "--extension" || arg === "-e") && i + 1 < args.length) {
			result.extensions = result.extensions ?? [];
			result.extensions.push(args[++i]);
		} else if (arg === "--no-extensions" || arg === "-ne") {
			result.noExtensions = true;
		} else if (arg === "--skill" && i + 1 < args.length) {
			result.skills = result.skills ?? [];
			result.skills.push(args[++i]);
		} else if (arg === "--prompt-template" && i + 1 < args.length) {
			result.promptTemplates = result.promptTemplates ?? [];
			result.promptTemplates.push(args[++i]);
		} else if (arg === "--theme" && i + 1 < args.length) {
			result.themes = result.themes ?? [];
			result.themes.push(args[++i]);
		} else if (arg === "--no-skills" || arg === "-ns") {
			result.noSkills = true;
		} else if (arg === "--no-prompt-templates" || arg === "-np") {
			result.noPromptTemplates = true;
		} else if (arg === "--no-themes") {
			result.noThemes = true;
		} else if (arg === "--no-context-files" || arg === "-nc") {
			result.noContextFiles = true;
		} else if (arg === "--list-models") {
			// Check if next arg is a search pattern (not a flag or file arg)
			if (i + 1 < args.length && !args[i + 1].startsWith("-") && !args[i + 1].startsWith("@")) {
				result.listModels = args[++i];
			} else {
				result.listModels = true;
			}
		} else if (arg === "--verbose") {
			result.verbose = true;
		} else if (arg === "--offline") {
			result.offline = true;
		} else if (arg.startsWith("@")) {
			result.fileArgs.push(arg.slice(1)); // Remove @ prefix
		} else if (arg.startsWith("--")) {
			const eqIndex = arg.indexOf("=");
			if (eqIndex !== -1) {
				result.unknownFlags.set(arg.slice(2, eqIndex), arg.slice(eqIndex + 1));
			} else {
				const flagName = arg.slice(2);
				const next = args[i + 1];
				if (next !== undefined && !next.startsWith("-") && !next.startsWith("@")) {
					result.unknownFlags.set(flagName, next);
					i++;
				} else {
					result.unknownFlags.set(flagName, true);
				}
			}
		} else if (arg.startsWith("-") && !arg.startsWith("--")) {
			result.diagnostics.push({ type: "error", message: `Unknown option: ${arg}` });
		} else if (!arg.startsWith("-")) {
			result.messages.push(arg);
		}
	}

	return result;
}

export function printHelp(extensionFlags?: ExtensionFlag[]): void {
	const extensionFlagsText =
		extensionFlags && extensionFlags.length > 0
			? `\n${chalk.bold("Extension CLI Flags:")}\n${extensionFlags
					.map((flag) => {
						const value = flag.type === "string" ? " <value>" : "";
						const description = flag.description ?? `${flag.extensionPath} registered by`;
						return `  --${flag.name}${value}`.padEnd(30) + description;
					})
					.join("\n")}\n`
			: "";
	console.log(`${chalk.bold(APP_NAME)} - Minimal coding agent with read, bash, edit, and write tools

${chalk.bold("Usage:")}
  ${APP_NAME} [options] [@files...] [messages...]

${chalk.bold("Commands:")}
  ${APP_NAME} install <source> [-l]      Install an extension source and add it to settings
  ${APP_NAME} remove <source> [-l]       Remove an extension source from settings
  ${APP_NAME} uninstall <source> [-l]    Alias for remove
  ${APP_NAME} update [source|self|Moon]  Update MoonCode and installed extensions
  ${APP_NAME} list                       List installed extensions
  ${APP_NAME} config                     Open the package-source TUI
  ${APP_NAME} doctor                     Diagnose install, PATH, version, and updates
  ${APP_NAME} ollama doctor              Check local Ollama connection and models
  ${APP_NAME} ollama profile <profile>   Print Ollama speed/RAM profile commands
  ${APP_NAME} browser-bridge             Run only the Chrome extension bridge server
  echo '{"type":"prompt","text":"Fix lint"}' | ${APP_NAME} --headless --timeout 120
  ${APP_NAME} <command> --help           Show help for install/remove/update/list

${chalk.bold("Options:")}
  --provider <name>              Provider name (default: google)
  --model <pattern>              Model pattern or ID; supports "provider/id" and optional ":<thinking>"
  --api-key <key>                API key (defaults to provider environment variables)
  --system-prompt <text>         System prompt (default: coding-agent prompt)
  --append-system-prompt <text>  Append text or file content to the system prompt
  --mode <mode>                  Output mode: text (default), json, or rpc
  --headless                     CI/headless JSON stdin/stdout mode
  --timeout <sec>                Headless timeout in seconds
  --output-format <json|text>    Headless output format
  --print, -p                    Non-interactive mode: run prompt and exit
  --continue, -c                 Continue previous session
  --resume, -r                   Pick a session to resume
  --session <path|id>            Use a specific session file or partial UUID
  --fork <path|id>               Fork a specific session into a new session
  --session-dir <dir>            Session storage/search directory
  --no-session                   Do not save the session
  --models <patterns>            Comma-separated model patterns for Ctrl+P cycling
                                 Supports globs (anthropic/*, *sonnet*) and fuzzy matching
  --no-tools, -nt                Disable all tools by default
  --no-builtin-tools, -nbt       Disable built-in tools but keep plugin/custom tools enabled
  --tools, -t <tools>            Comma-separated allowlist of tool names
  --thinking <level>             Thinking level: off, minimal, low, medium, high, xhigh
  --extension, -e <path>         Load an extension file
  --no-extensions, -ne           Disable extension discovery
  --skill <path>                 Load a skill file or directory
  --no-skills, -ns               Disable skill discovery and loading
  --prompt-template <path>       Load a prompt-template file or directory
  --no-prompt-templates, -np     Disable prompt-template discovery and loading
  --theme <path>                 Load a theme file or directory
  --no-themes                    Disable theme discovery and loading
  --no-context-files, -nc        Disable AGENTS.md and CLAUDE.md discovery/loading
  --export <file>                Export a session file to HTML and exit
  --list-models [search]         List available models, optionally filtered
  --verbose                      Force verbose startup
  --offline                      Disable startup network operations
  --help, -h                     Show this help
  --version, -v                  Show version

Extensions may register extra flags, for example --plan from plan-mode.${extensionFlagsText}

${chalk.bold("Examples:")}
  # Interactive mode
  ${APP_NAME}

  # Interactive mode with an initial prompt
  ${APP_NAME} "List all .ts files in src/"

  # Include files in the first message
  ${APP_NAME} @prompt.md @image.png "What color is the sky?"

  # Non-interactive mode
  ${APP_NAME} -p "List all .ts files in src/"

  # Multiple messages
  ${APP_NAME} "Read package.json" "Which dependencies do we have?"

  # Continue previous session
  ${APP_NAME} --continue "What did we discuss?"

  # Quick-start a local Ollama model
  ${APP_NAME} olm qwen2.5-coder:7b "Help me refactor this code"

  # Prepare low-RAM / high-speed Ollama profile
  ${APP_NAME} ollama profile turbo

  # Use another model
  ${APP_NAME} --provider openai --model gpt-4o-mini "Help me refactor this code"

  # Use a provider-prefixed model
  ${APP_NAME} --model openai/gpt-4o "Help me refactor this code"

  # Use a thinking-level shortcut
  ${APP_NAME} --model sonnet:high "Solve this complex issue"

  # Limit model cycling
  ${APP_NAME} --models claude-sonnet,claude-haiku,gpt-4o

  # Limit by provider glob
  ${APP_NAME} --models "github-copilot/*"

  # Cycle models with fixed thinking levels
  ${APP_NAME} --models sonnet:high,haiku:low

  # Start with a specific thinking level
  ${APP_NAME} --thinking high "Solve this complex issue"

  # Read-only mode
  ${APP_NAME} --tools read,grep,find,ls -p "Review the code in src/"

  # Export a session file to HTML
  ${APP_NAME} --export ~/${CONFIG_DIR_NAME}/engine/sessions/--path--/session.jsonl
  ${APP_NAME} --export session.jsonl output.html

${chalk.bold("Environment Variables:")}
  ANTHROPIC_API_KEY                - Anthropic Claude API key
  ANTHROPIC_OAUTH_TOKEN            - Anthropic OAuth token
  OpenAI_API_KEY                   - OpenAI GPT API key
  AZURE_OpenAI_API_KEY             - Azure OpenAI API key
  AZURE_OpenAI_BASE_URL            - Azure OpenAI/Cognitive Services base URL
  AZURE_OpenAI_RESOURCE_NAME       - Azure OpenAI resource name
  AZURE_OpenAI_API_VERSION         - Azure OpenAI API version (default: v1)
  AZURE_OpenAI_DEPLOYMENT_NAME_MAP - Azure OpenAI model=deployment map
  DEEPSEEK_API_KEY                 - DeepSeek API key
  GEMINI_API_KEY                   - Google Gemini API key
  GROQ_API_KEY                     - Groq API key
  CEREBRAS_API_KEY                 - Cerebras API key
  XCore_API_KEY                    - xCore Grok API key
  FIREWORKS_API_KEY                - Fireworks API key
  OPENROUTER_API_KEY               - OpenRouter API key
`);
}
