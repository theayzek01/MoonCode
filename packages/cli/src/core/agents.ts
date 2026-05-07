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
		focus: "projeyi anlar, hedefe ve kabul kriterlerine cevirir, gorevleri boler",
		useWhen: "her agent calismasinda",
	},
	{
		id: "architect",
		name: "Mimar Agent",
		department: "engineering",
		focus: "dosya yapisi, veri akisi, sinirlar, teknik borc ve entegrasyon riskleri",
		useWhen: "multi-file degisiklik, yeni ozellik, refactor veya mimari karar varsa",
	},
	{
		id: "backend",
		name: "Backend Agent",
		department: "engineering",
		focus: "database, API, validasyon, auth, guvenlik ve server-side is kurallari",
		useWhen: "server, database, auth, provider, CLI runtime veya tool davranisi degisiyorsa",
	},
	{
		id: "frontend",
		name: "Frontend Agent",
		department: "product",
		focus: "TUI/Web UI akis, state, bos/yukleniyor/hata halleri ve kullanici etkilesimi",
		useWhen: "kullanici arayuzu, komut yardimi, layout veya interaksiyon degisiyorsa",
	},
	{
		id: "uiux",
		name: "UI/UX Agent",
		department: "product",
		focus: "gorsel hiyerarsi, okunabilirlik, premium his, kullanimi kolay ve net deneyim",
		useWhen: "ekranda gorunen herhangi bir akış, metin, tasarim veya mikro deneyim varsa",
	},
	{
		id: "test",
		name: "Test Agent",
		department: "quality",
		focus: "regresyon, edge case, test plani, manuel dogrulama ve kalite kapisi",
		useWhen: "kod degisimi yapildiginda veya hata cozuldugunde",
	},
	{
		id: "security",
		name: "Security Agent",
		department: "quality",
		focus: "secret sizintisi, injection, path traversal, izinler ve hassas veri riskleri",
		useWhen: "dosya sistemi, komut calistirma, auth, network veya kullanici girdisi varsa",
	},
	{
		id: "devops",
		name: "DevOps Agent",
		department: "delivery",
		focus: "kurulum, build/check komutlari, deploy notlari, dosya yapisi ve operasyonel guvenilirlik",
		useWhen: "paketleme, CI, release, ortam degiskeni, kurulum veya calistirma akisi varsa",
	},
	{
		id: "code-reviewer",
		name: "Code Reviewer Agent",
		department: "quality",
		focus: "kod kalitesi, tutarlilik, okunabilirlik, eksik edge case ve entegrasyon hatalari",
		useWhen: "her implementasyonun sonunda",
	},
	{
		id: "integrator",
		name: "Integrator Agent",
		department: "delivery",
		focus: "tum parcalari tek tutarli cozumde birlestirir; son diff ve final cevabi temizler",
		useWhen: "her agent calismasinin sonunda",
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
	if (verbosity === "quiet") {
		return "Agent yorumlarini kullaniciya dokme; ekip calismasini tamamen icerde tut, final cevabi normal ve kisa ver.";
	}
	if (verbosity === "verbose") {
		return "Gerektiginde kisa bir Agent Board goster: secilen roller, yapilacak is, riskler ve dogrulama. Yine de sahte toplantı diyalogu yazma.";
	}
	return "Sadece faydaliysa 2-5 satirlik kisa bir Agent Board goster; basit islerde hic gostermeden direkt uygula.";
}

export function buildCodingAgentsPrompt(settings: CodingAgentsSettings | undefined): string {
	if (!settings) {
		return "";
	}

	const mode = normalizeMode(settings.mode, settings.enabled);
	const enabled = settings?.enabled ?? mode !== "off";
	if (!enabled || mode === "off") {
		return "";
	}

	const verbosity = normalizeVerbosity(settings?.verbosity);
	const agentLines = DEFAULT_CODING_AGENT_PROFILES.map(
		(agent) => `- ${agent.name}: ${agent.focus}. Kullan: ${agent.useWhen}.`,
	).join("\n");

	return `

## Agent System (Company Mode)

Bu modda tek kisi gibi davranma; kodlama islerini kucuk bir yazilim sirketi disipliniyle yonet. Bu bir roleplay degil, kalite ve organizasyon katmani.

Mode: ${mode}
Visibility: ${verbosity}

Aktivasyon:
- auto: Agent sistemini kompleks, multi-file, UI+backend, mimari, bugfix, test, guvenlik veya belirsiz islerde kullan; basit sorularda direkt cevap ver.
- always: Uygulama/kodlama islerinde agent sistemini her zaman kullan.

Ekip:
${agentLines}

Calisma sekli:
1. Patron istegi kabul kriterlerine cevirir, kapsami daraltir ve hangi ajanlarin gerekli oldugunu secer.
2. Secilen uzmanlar kendi alanindan riski ve uygulanacak parcayi belirler.
3. Implementasyon tek tutarli diff olarak yapilir; parcalar kopuk kalmaz.
4. Test, Security, DevOps ve Code Reviewer kalite kapisindan gecirir.
5. Integrator parcalari birlestirir; Patron son karari verip tek temiz proje halinde teslim eder.

Kurallar:
- Ajanlari uzun uzun konusturma, sahte toplantı transcript'i yazma.
- Kullanici ozellikle istemediyse her role ayri cevap verme; tek net cozum uret.
- Her kod isinde once repo baglamini oku, sonra uygula, sonra mumkun olan kontrolu calistir.
- Frontend/backend/test/guvenlik ayrimi varsa bunlari ayni kalite kapisindan gecir.
- Eksik bilgi varsa Patron en kritik soruyu sorar; tahminle ilerlenebiliyorsa makul varsayimi belirtip devam eder.
- ${getVisibilityInstruction(verbosity)}`;
}

const DEPARTMENT_LABELS: Record<CodingAgentDepartment, string> = {
	leadership: "Leadership Office",
	engineering: "Engineering Floor",
	product: "Product Studio",
	quality: "Quality Gate",
	delivery: "Delivery Room",
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
	product: 201,
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

function paintStatus(text: string, enabled: boolean, colorEnabled: boolean): string {
	return ansi256(enabled ? 82 : 203, text, colorEnabled);
}

function workspaceRow(label: string, value: string, colorEnabled: boolean): string {
	return `║ ${ansi256(244, label.padEnd(15), colorEnabled)} ${value}`;
}

function pixelHeader(colorEnabled: boolean): string[] {
	const top = `┏${"━".repeat(62)}┓`;
	const mid = "┃  ▓▒░  Mooncli Company Workspace  ░▒▓                       ┃";
	const bot = `┗${"━".repeat(62)}┛`;
	return [
		ansi256(99, top, colorEnabled),
		ansi256(213, bold(mid, colorEnabled), colorEnabled),
		ansi256(99, bot, colorEnabled),
	];
}

export function renderCodingAgentsWorkspace(
	settings: CodingAgentsSettings | undefined,
	options: CodingWorkspaceRenderOptions = {},
): string {
	const colorEnabled = options.color ?? true;
	const mode = normalizeMode(settings?.mode, settings?.enabled);
	const enabled = (settings?.enabled ?? mode !== "off") && mode !== "off";
	const verbosity = normalizeVerbosity(settings?.verbosity);
	const agentStatus = enabled ? (mode === "always" ? "always-on" : "standby/auto") : "offline";
	const statusBadge = `[${agentStatus}]`;
	const lines: string[] = [
		...pixelHeader(colorEnabled),
		workspaceRow("Durum", paintStatus(enabled ? "acik" : "kapali", enabled, colorEnabled), colorEnabled),
		workspaceRow("Mode", ansi256(117, mode, colorEnabled), colorEnabled),
		workspaceRow("Gorunum", ansi256(177, verbosity, colorEnabled), colorEnabled),
	];

	if (options.modelName) {
		lines.push(workspaceRow("Model", ansi256(229, options.modelName, colorEnabled), colorEnabled));
	}
	if (options.cwd) {
		lines.push(workspaceRow("Workspace", ansi256(153, options.cwd, colorEnabled), colorEnabled));
	}
	if (options.activeTools && options.activeTools.length > 0) {
		lines.push(
			workspaceRow("Aktif tools", ansi256(120, String(options.activeTools.length), colorEnabled), colorEnabled),
		);
	}

	lines.push(
		ansi256(99, `╠${"═".repeat(62)}╣`, colorEnabled),
		`${ansi256(213, "▓", colorEnabled)} ${bold("Sirket Plani", colorEnabled)}`,
		`  ${ansi256(117, "BRIEF", colorEnabled)} ${dim("▸", colorEnabled)} ${ansi256(214, "PATRON PLAN", colorEnabled)} ${dim("▸", colorEnabled)} ${ansi256(201, "UZMAN AGENTLAR", colorEnabled)} ${dim("▸", colorEnabled)} ${ansi256(82, "QUALITY GATE", colorEnabled)} ${dim("▸", colorEnabled)} ${ansi256(141, "INTEGRATOR", colorEnabled)} ${dim("▸", colorEnabled)} ${ansi256(229, "SHIP", colorEnabled)}`,
		"",
	);

	for (const department of Object.keys(DEPARTMENT_LABELS) as CodingAgentDepartment[]) {
		const agents = DEFAULT_CODING_AGENT_PROFILES.filter((agent) => agent.department === department);
		if (agents.length === 0) continue;

		const departmentColor = DEPARTMENT_COLORS[department];
		lines.push(ansi256(departmentColor, `╔═ ${DEPARTMENT_LABELS[department]} ${"═".repeat(42)}`, colorEnabled));
		for (const agent of agents) {
			lines.push(
				`║ ${ansi256(departmentColor, "██", colorEnabled)} ${ansi256(244, statusBadge, colorEnabled)} ${bold(agent.name, colorEnabled)}`,
			);
			lines.push(`║    ${dim(agent.focus, colorEnabled)}`);
		}
		lines.push(ansi256(departmentColor, `╚${"═".repeat(62)}`, colorEnabled), "");
	}

	lines.push(
		`${ansi256(213, "▓", colorEnabled)} ${bold("Komutlar", colorEnabled)}`,
		`  ${ansi256(117, "/workspace", colorEnabled)}  ${ansi256(117, "/agents status", colorEnabled)}  ${ansi256(117, "/agents enable", colorEnabled)}  ${ansi256(117, "/agents mode auto|always|off", colorEnabled)}`,
	);
	return lines.join("\n").trimEnd();
}
