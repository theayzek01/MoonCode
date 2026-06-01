import { DEFAULT_UI_STYLE_GUIDELINE } from "./design-system/index.js";

export type CodingAgentMode = "off" | "auto" | "always";
export type CodingAgentVerbosity = "quiet" | "summary" | "verbose";

export interface CodingAgentsSettings {
	enabled?: boolean;
	mode?: CodingAgentMode;
	verbosity?: CodingAgentVerbosity;
}

export type CodingAgentDepartment = "leadership" | "engineering" | "product" | "quality" | "delivery";

export interface CodingAgentProfile {
	id: string;
	name: string;
	department: CodingAgentDepartment;
	focus: string;
	useWhen: string;
}

export const DEFAULT_CODING_AGENT_PROFILES: readonly CodingAgentProfile[] = [
	{
		id: "patron",
		name: "Patron Agent / Orchestrator",
		department: "leadership",
		focus: "clarifies the goal and splits the work",
		useWhen: "every agent run",
	},
	{
		id: "architect",
		name: "Architect Agent",
		department: "engineering",
		focus: "file structure, data flow, integration risk",
		useWhen: "multi-file/refactor/architecture decisions",
	},
	{
		id: "backend",
		name: "Backend Agent",
		department: "engineering",
		focus: "API, validation, auth, server-side rules",
		useWhen: "when server/provider/runtime changes",
	},
	{
		id: "frontend",
		name: "Frontend Agent",
		department: "product",
		focus: "TUI/Web flow, state, responsive behavior, empty/loading/error states, default premium dark SaaS UI",
		useWhen: "when UI or interaction changes",
	},
	{
		id: "uiux",
		name: "UI/UX Agent",
		department: "product",
		focus: "readability, accessibility, shadcn/Vercel dark SaaS polish, clear experience",
		useWhen: "for everything visible on screen",
	},
	{
		id: "test",
		name: "Test Agent",
		department: "quality",
		focus: "regression, edge cases, manual verification",
		useWhen: "when code changes",
	},
	{
		id: "security",
		name: "Security Agent",
		department: "quality",
		focus: "secrets, injection, path traversal, permissions",
		useWhen: "when FS/network/auth/user input exists",
	},
	{
		id: "devops",
		name: "DevOps Agent",
		department: "delivery",
		focus: "build, release, environment, operations",
		useWhen: "for install/CI/deploy flow",
	},
	{
		id: "code-reviewer",
		name: "Code Reviewer Agent",
		department: "quality",
		focus: "quality, consistency, missing edge cases",
		useWhen: "at the end of implementation",
	},
	{
		id: "integrator",
		name: "Integrator Agent",
		department: "delivery",
		focus: "integrates parts into one coherent solution",
		useWhen: "at final delivery",
	},
];

function normalizeMode(mode: CodingAgentMode | undefined, enabled: boolean | undefined): CodingAgentMode {
	if (mode) return mode;
	return enabled === false ? "off" : "auto";
}

function normalizeVerbosity(verbosity: CodingAgentVerbosity | undefined): CodingAgentVerbosity {
	return verbosity ?? "summary";
}

function getVisibilityInstruction(verbosity: CodingAgentVerbosity): string {
	if (verbosity === "quiet") return "Do not expose agent commentary; keep teamwork internal.";
	if (verbosity === "verbose") return "Show a short Agent Board if useful; do not write fake meeting transcripts.";
	return "Show a short 2-5 line Agent Board only if useful.";
}

export function buildCodingAgentsPrompt(settings: CodingAgentsSettings | undefined): string {
	if (!settings) return "";
	const mode = normalizeMode(settings.mode, settings.enabled);
	const enabled = (settings.enabled ?? mode !== "off") && mode !== "off";
	if (!enabled) return "";
	const verbosity = normalizeVerbosity(settings.verbosity);
	const agentLines = DEFAULT_CODING_AGENT_PROFILES.map(
		(agent) => `- ${agent.name}: ${agent.focus}. Use: ${agent.useWhen}.`,
	).join("\n");

	return `

## Agent System (Company Mode)

Manage coding work with small-software-company discipline. This is not roleplay; it is a quality and organization layer.

Mode: ${mode}
Visibility: ${verbosity}

Activation:
- auto: Use for complex, multi-file, UI+backend, architecture, bugfix, test, or security work; answer simple requests directly.
- always: Always use for app/coding work.

Team:
${agentLines}

Workflow:
1. Convert the request into goals and acceptance criteria.
2. Split the work across the right specialists.
3. Produce one coherent diff.
4. Pass test, security, and review quality gates.
5. Give a clean, concise final answer.

Rules:
- Do not make agents verbose.
- Do not answer per role; produce one clear solution.
- For code work, inspect repo context first, then implement, then run checks.
- ${DEFAULT_UI_STYLE_GUIDELINE}
- ${getVisibilityInstruction(verbosity)}`;
}

const DEPARTMENT_LABELS: Record<CodingAgentDepartment, string> = {
	leadership: "Lead",
	engineering: "Engineering",
	product: "Product",
	quality: "Quality",
	delivery: "Delivery",
};

export interface CodingWorkspaceRenderOptions {
	activeTools?: readonly string[];
	modelName?: string;
	cwd?: string;
	color?: boolean;
}

const ANSI_RESET = "\u001b[0m";
const ANSI_BOLD = "\u001b[1m";
const ANSI_DIM = "\u001b[2m";

const DEPARTMENT_COLORS: Record<CodingAgentDepartment, number> = {
	leadership: 214,
	engineering: 45,
	product: 117,
	quality: 82,
	delivery: 141,
};

function ansi256(code: number, text: string, enabled: boolean): string {
	return enabled ? `\u001b[38;5;${code}m${text}${ANSI_RESET}` : text;
}

function bold(text: string, enabled: boolean): string {
	return enabled ? `${ANSI_BOLD}${text}${ANSI_RESET}` : text;
}

function dim(text: string, enabled: boolean): string {
	return enabled ? `${ANSI_DIM}${text}${ANSI_RESET}` : text;
}

function row(label: string, value: string, colorEnabled: boolean): string {
	return `${ansi256(244, label.padEnd(10), colorEnabled)} ${value}`;
}

export function renderCodingAgentsWorkspace(
	settings: CodingAgentsSettings | undefined,
	options: CodingWorkspaceRenderOptions = {},
): string {
	const colorEnabled = options.color ?? true;
	const mode = normalizeMode(settings?.mode, settings?.enabled);
	const enabled = (settings?.enabled ?? mode !== "off") && mode !== "off";
	const verbosity = normalizeVerbosity(settings?.verbosity);
	const status = enabled ? (mode === "always" ? "always" : "auto") : "off";
	const lines: string[] = [
		bold("MoonCode workspace", colorEnabled),
		dim("minimal company mode", colorEnabled),
		"",
		row("status", ansi256(enabled ? 82 : 203, status, colorEnabled), colorEnabled),
		row("view", ansi256(117, verbosity, colorEnabled), colorEnabled),
	];

	if (options.modelName) lines.push(row("model", ansi256(229, options.modelName, colorEnabled), colorEnabled));
	if (options.cwd) lines.push(row("cwd", ansi256(153, options.cwd, colorEnabled), colorEnabled));
	if (options.activeTools?.length)
		lines.push(row("tools", ansi256(120, String(options.activeTools.length), colorEnabled), colorEnabled));

	lines.push("", bold("Flow", colorEnabled), dim("brief → plan → implement → review → ship", colorEnabled), "");

	for (const department of Object.keys(DEPARTMENT_LABELS) as CodingAgentDepartment[]) {
		const agents = DEFAULT_CODING_AGENT_PROFILES.filter((agent) => agent.department === department);
		if (!agents.length) continue;
		const color = DEPARTMENT_COLORS[department];
		lines.push(ansi256(color, DEPARTMENT_LABELS[department], colorEnabled));
		for (const agent of agents) {
			lines.push(`  ${bold(agent.name.padEnd(12), colorEnabled)} ${dim(agent.focus, colorEnabled)}`);
		}
		lines.push("");
	}

	lines.push(
		bold("Useful commands", colorEnabled),
		`${ansi256(117, "/workspace", colorEnabled)}  ${ansi256(117, "/agents status", colorEnabled)}  ${ansi256(117, "/index status", colorEnabled)}  ${ansi256(117, "/diff", colorEnabled)}  ${ansi256(117, "/ship", colorEnabled)}`,
	);
	return lines.join("\n").trimEnd();
}
