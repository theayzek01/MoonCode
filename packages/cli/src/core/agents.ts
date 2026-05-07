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
}

export function renderCodingAgentsWorkspace(
	settings: CodingAgentsSettings | undefined,
	options: CodingWorkspaceRenderOptions = {},
): string {
	const mode = normalizeMode(settings?.mode, settings?.enabled);
	const enabled = (settings?.enabled ?? mode !== "off") && mode !== "off";
	const verbosity = normalizeVerbosity(settings?.verbosity);
	const agentStatus = enabled ? (mode === "always" ? "always-on" : "standby/auto") : "offline";
	const lines: string[] = [
		"Mooncli Company Workspace",
		"=========================",
		`Durum: ${enabled ? "acik" : "kapali"}`,
		`Mode: ${mode}`,
		`Gorunum: ${verbosity}`,
	];

	if (options.modelName) {
		lines.push(`Model: ${options.modelName}`);
	}
	if (options.cwd) {
		lines.push(`Workspace: ${options.cwd}`);
	}
	if (options.activeTools && options.activeTools.length > 0) {
		lines.push(`Aktif tool sayisi: ${options.activeTools.length}`);
	}

	lines.push(
		"",
		"Sirket Plani:",
		"  Brief -> Patron Plan -> Uzman Agentlar -> Quality Gate -> Integrator -> Ship",
		"",
	);

	for (const department of Object.keys(DEPARTMENT_LABELS) as CodingAgentDepartment[]) {
		const agents = DEFAULT_CODING_AGENT_PROFILES.filter((agent) => agent.department === department);
		if (agents.length === 0) continue;

		lines.push(`${DEPARTMENT_LABELS[department]}:`);
		for (const agent of agents) {
			lines.push(`  [${agentStatus}] ${agent.name}`);
			lines.push(`      ${agent.focus}`);
		}
		lines.push("");
	}

	lines.push("Komutlar:", "  /agents status", "  /agents enable", "  /agents mode auto|always|off");
	return lines.join("\n").trimEnd();
}
