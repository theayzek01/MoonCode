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
		focus: "hedefi netleştirir, işi parçalara böler",
		useWhen: "her agent çalışmasında",
	},
	{
		id: "architect",
		name: "Architect Agent",
		department: "engineering",
		focus: "dosya yapısı, veri akışı, entegrasyon riski",
		useWhen: "multi-file/refactor/mimari karar",
	},
	{
		id: "backend",
		name: "Backend Agent",
		department: "engineering",
		focus: "API, validasyon, auth, server-side kurallar",
		useWhen: "server/provider/runtime değişiyorsa",
	},
	{
		id: "frontend",
		name: "Frontend Agent",
		department: "product",
		focus: "TUI/Web akışı, state, boş/yükleniyor/hata halleri",
		useWhen: "arayüz veya etkileşim değişiyorsa",
	},
	{
		id: "uiux",
		name: "UI/UX Agent",
		department: "product",
		focus: "okunabilirlik, sadelik, net deneyim",
		useWhen: "ekranda görünen her şeyde",
	},
	{
		id: "test",
		name: "Test Agent",
		department: "quality",
		focus: "regresyon, edge case, manuel doğrulama",
		useWhen: "kod değiştiğinde",
	},
	{
		id: "security",
		name: "Security Agent",
		department: "quality",
		focus: "secret, injection, path traversal, izinler",
		useWhen: "FS/network/auth/user input varsa",
	},
	{
		id: "devops",
		name: "DevOps Agent",
		department: "delivery",
		focus: "build, release, ortam, operasyon",
		useWhen: "kurulum/CI/deploy akışında",
	},
	{
		id: "code-reviewer",
		name: "Code Reviewer Agent",
		department: "quality",
		focus: "kalite, tutarlılık, eksik edge case",
		useWhen: "implementasyon sonunda",
	},
	{
		id: "integrator",
		name: "Integrator Agent",
		department: "delivery",
		focus: "parçaları tek tutarlı çözümde birleştirir",
		useWhen: "son teslimde",
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
	if (verbosity === "quiet") return "Agent yorumlarını kullanıcıya dökme; ekip çalışmasını içeride tut.";
	if (verbosity === "verbose") return "Gerekirse kısa Agent Board göster; sahte toplantı transcript'i yazma.";
	return "Sadece faydalıysa 2-5 satırlık kısa Agent Board göster.";
}

export function buildCodingAgentsPrompt(settings: CodingAgentsSettings | undefined): string {
	if (!settings) return "";
	const mode = normalizeMode(settings.mode, settings.enabled);
	const enabled = (settings.enabled ?? mode !== "off") && mode !== "off";
	if (!enabled) return "";
	const verbosity = normalizeVerbosity(settings.verbosity);
	const agentLines = DEFAULT_CODING_AGENT_PROFILES.map(
		(agent) => `- ${agent.name}: ${agent.focus}. Kullan: ${agent.useWhen}.`,
	).join("\n");

	return `

## Agent System (Company Mode)

Kodlama işlerini küçük bir yazılım şirketi disipliniyle yönet. Bu roleplay değil; kalite ve organizasyon katmanı.

Mode: ${mode}
Visibility: ${verbosity}

Aktivasyon:
- auto: Kompleks/multi-file/UI+backend/mimari/bugfix/test/güvenlik işlerinde kullan; basit sorularda direkt cevap ver.
- always: Uygulama/kodlama işlerinde her zaman kullan.

Ekip:
${agentLines}

Çalışma şekli:
1. İsteği hedef ve kabul kriterine çevir.
2. İşi doğru uzmanlara böl.
3. Tek tutarlı diff üret.
4. Test/güvenlik/review kalite kapısından geçir.
5. Son cevabı temiz ve kısa ver.

Kurallar:
- Ajanları uzun konuşturma.
- Her role ayrı cevap verme; tek net çözüm üret.
- Kod işinde önce repo bağlamını oku, sonra uygula, sonra kontrol çalıştır.
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
		bold("Mooncli workspace", colorEnabled),
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
