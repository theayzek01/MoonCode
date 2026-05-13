// @ts-nocheck
import { APP_NAME } from "../config.js";
import type { SourceInfo } from "./source-info.js";

export type SlashCommandSource = "extension" | "prompt" | "skill";

export interface SlashCommandInfo {
	name: string;
	description?: string;
	source: SlashCommandSource;
	sourceInfo: SourceInfo;
}

export interface BuiltinSlashCommand {
	name: string;
	description: string;
}

export const BUILTIN_SLASH_COMMANDS: ReadonlyArray<BuiltinSlashCommand> = [
	{ name: "settings", description: "Open settings" },
	{ name: "models", description: "Select a model" },
	{ name: "scoped-models", description: "Edit quick-switch models" },
	{ name: "export", description: "Export session (.html or .jsonl)" },
	{ name: "import", description: "Import a session from JSONL" },
	{ name: "share", description: "Share session as a private GitHub Gist" },
	{ name: "copy", description: "Copy the last response" },
	{ name: "name", description: "Rename session" },
	{ name: "session", description: "Show session info and stats" },
	{ name: "context", description: "Show context and token usage" },
	{ name: "plan", description: "Toggle plan mode" },
	{ name: "autothink", description: "Toggle automatic thinking level" },
	{ name: "automation", description: "Toggle automation mode" },
	{ name: "init", description: "Create project config files" },
	{ name: "changelog", description: "Show changelog" },
	{ name: "hotkeys", description: "List keyboard shortcuts" },
	{ name: "fork", description: "Fork from a message" },
	{ name: "clone", description: "Clone session in current location" },
	{ name: "tree", description: "Navigate session tree" },
	{ name: "login", description: "Provider login" },
	{ name: "logout", description: "Provider logout" },
	{ name: "new", description: "Start a new session" },
	{ name: "compact", description: "Compact session context" },
	{ name: "resume", description: "Resume another session" },
	{ name: "mcp", description: "List connected MCP servers" },
	{ name: "reload", description: "Reload system components" },
	{ name: "quit", description: `Quit ${APP_NAME}` },
	{ name: "agentmode", description: "Toggle agent mode" },
	{ name: "agents", description: "Agent management" },
	{ name: "workspace", description: "Show workspace and departments" },
	{ name: "mood", description: "Affective state layer" },
	{ name: "browser", description: "Chrome extension status and control" },
	{ name: "robotics", description: "Robotics control mode" },
	{ name: "discord", description: "Discord integration" },
	{ name: "telegram", description: "Telegram remote control" },
	{ name: "update", description: "Update MoonCode and packages" },
	{ name: "upgrade", description: "Upgrade to the latest version" },
	{ name: "impmodel", description: "Add a new model to Ollama" },
	{ name: "index", description: "Index codebase for semantic search" },
	{ name: "ship", description: "Ship changes (branch/PR)" },
	{ name: "git", description: "Git helper commands" },
	{ name: "ollama", description: "Ollama model management" },
	{ name: "diff", description: "Show git changes" },
	{ name: "web", description: "Open web UI" },
	{ name: "marketplace", description: "Extension and theme marketplace" },
];
