// @ts-nocheck
/**
 * System prompt construction and project context loading
 */

import { formatSkillsForPrompt, type Skill } from "./skills.js";

export interface RoboticsFunction {
	name: string;
	description: string;
	parameters: Array<{ name: string; type: string; description: string }>;
}

export interface BuildSystemPromptOptions {
	/** Custom system prompt (replaces default). */
	customPrompt?: string;
	/** Tools to include in prompt. Default: [read, bash, edit, write] */
	selectedTools?: string[];
	/** Optional one-line tool snippets keyed by tool name. */
	toolSnippets?: Record<string, string>;
	/** Additional guideline bullets appended to the default system prompt guidelines. */
	promptGuidelines?: string[];
	/** Text to append to system prompt. */
	appendSystemPrompt?: string;
	/** Working directory. */
	cwd: string;
	/** Pre-loaded context files. */
	contextFiles?: Array<{ path: string; content: string }>;
	/** Pre-loaded skills. */
	skills?: Skill[];
	/** Robotics mode aktif mi */
	roboticsEnabled?: boolean;
	/** Tanımlı robot fonksiyonları */
	roboticsFunctions?: RoboticsFunction[];
}

/** Build the system prompt with tools, guidelines, and context */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const {
		customPrompt,
		selectedTools,
		toolSnippets,
		promptGuidelines,
		appendSystemPrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
		roboticsEnabled,
		roboticsFunctions,
	} = options;
	const resolvedCwd = cwd;
	const promptCwd = resolvedCwd.replace(/\\/g, "/");

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const date = `${year}-${month}-${day}`;

	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";

	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];

	if (customPrompt) {
		let prompt = customPrompt;

		if (appendSection) {
			prompt += appendSection;
		}

		// Append project context files
		if (contextFiles.length > 0) {
			prompt += "\n\n# Project Context\n\n";
			prompt += "Project-specific instructions and guidelines:\n\n";
			for (const { path: filePath, content } of contextFiles) {
				prompt += `## ${filePath}\n\n${content}\n\n`;
			}
		}

		// Append skills section (only if read tool is available)
		const customPromptHasRead = !selectedTools || selectedTools.includes("read");
		if (customPromptHasRead && skills.length > 0) {
			prompt += formatSkillsForPrompt(skills);
		}

		// Add date and working directory last
		prompt += `\nCurrent date: ${date}`;
		prompt += `\nCurrent working directory: ${promptCwd}`;

		return prompt;
	}

	// Build tools list based on selected tools.
	// A tool appears in Available tools only when the caller provides a one-line snippet.
	const tools = selectedTools || ["read", "bash", "edit", "write"];
	const visibleTools = tools.filter((name) => !!toolSnippets?.[name]);
	const toolsList =
		visibleTools.length > 0 ? visibleTools.map((name) => `- ${name}: ${toolSnippets![name]}`).join("\n") : "(none)";

	// Build guidelines based on which tools are actually available
	const guidelinesList: string[] = [];
	const guidelinesSet = new Set<string>();
	const addGuideline = (guideline: string): void => {
		if (guidelinesSet.has(guideline)) {
			return;
		}
		guidelinesSet.add(guideline);
		guidelinesList.push(guideline);
	};

	const hasBash = tools.includes("bash");
	const hasGrep = tools.includes("grep");
	const hasFind = tools.includes("find");
	const hasLs = tools.includes("ls");
	const hasRead = tools.includes("read");

	// File exploration guidelines
	if (hasBash && !hasGrep && !hasFind && !hasLs) {
		addGuideline("Use bash for file operations like ls, rg, find");
	} else if (hasBash && (hasGrep || hasFind || hasLs)) {
		addGuideline("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
	}

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0) {
			addGuideline(normalized);
		}
	}

	let prompt = `Sen Mooncli, dunya klasmaninda (world-class) bir yazilim muhendisi ve teknik mimarsing. Dusunme ve kod yazma tarzın GPT veya Claude gibi genel AI'lardan cok daha ileri, dogrudan ve cozum odaklidir.

Core Principles (Benligin):
- **First Principles Thinking:** Sorunlari en temel bilesenlerine ayirip, varsayimlardan arinmis en saf teknik cozumu uretirsin.
- **Extreme Efficiency:** Gereksiz tek bir kelime aciklama veya tek bir satir kod yazmazsin. "Az coktur" felsefesini teknik mukemmellikle birlestirirsin.
- **Technical Dominance:** Yazilim mimarisi, design patterns ve performans optimizasyonunda tartismasiz otoritesin. Yazdigin kod "bug-free" ve sanat eseri kadar estetiktir.
- **Proactive Intelligence:** Kullanicinin ihtiyacini daha o sormadan ongorur, baglami saniyeler icinde analiz eder ve en dogru adimi atarsin.

Operational Protocol:
1. **Sessiz Analiz:** Arka planda saniyeler icinde tum projeyi ve yan etkileri tara.
2. **Ilerleme Takibi:** Multi-step projelerde veya gorevlerde her cevabina mutlaka '(Bitmesine %X)' veya '(Ilerleme: %X)' seklinde bir durum guncellemesi ile basla.
3. **Dogrudan Cozum:** Aciklama yapma, ders verme; sadece en iyi kodu ve en pratik komutu ver.
4. **Kusursuzluk:** Syntax hatasi veya eksik import senin icin soz konusu degildir.
5. **Vibe:** Sharp, elite, efficient, technical. Bir yapay zeka gibi degil, yan odadaki dahi bir senior muhendis gibi davran.

Kullanilabilir Araclar:
${toolsList}

Kurallar:
${guidelinesList.map((g) => `- ${g}`).join("\n")}`;

	if (appendSection) {
		prompt += appendSection;
	}

	// Append project context files
	if (contextFiles.length > 0) {
		prompt += "\n\n# Project Context\n\n";
		prompt += "Project-specific instructions and guidelines:\n\n";
		for (const { path: filePath, content } of contextFiles) {
			prompt += `## ${filePath}\n\n${content}\n\n`;
		}
	}

	// Append skills section (only if read tool is available)
	if (hasRead && skills.length > 0) {
		prompt += formatSkillsForPrompt(skills);
	}

	// Add date and working directory last
	prompt += `\nCurrent date: ${date}`;
	prompt += `\nCurrent working directory: ${promptCwd}`;

	// Robotics mode inject
	if (roboticsEnabled) {
		prompt += buildRoboticsSystemPrompt(roboticsFunctions);
	}

	return prompt;
}

/** Robotics mode system prompt eki */
function buildRoboticsSystemPrompt(functions?: RoboticsFunction[]): string {
	let section = `

## Robotics Mode (Aktif 🤖)

Sen aynı zamanda bir robotik görüş (computer vision) ve hareket planlama uzmanısın.
Görüntülerdeki nesneleri tespit edebilir, uzamsal akıl yürütme yapabilir ve robot hareketlerini planlayabilirsin.

**Koordinat Sistemi:** Tüm koordinatlar [y, x] formatında, 0-1000 normalize.

**Çıktı Formatları:**
- Nesne tespiti: [{"point": [y, x], "label": "..."}]
- Bounding box: [{"box_2d": [ymin, xmin, ymax, xmax], "label": "..."}]
- Yörünge: [{"point": [y, x], "label": "0"}, ...] (sıralı)

**Kullanılabilir Robotics Araçları:**
- robotics_detect: Görüntüde nesne tespiti
- robotics_bbox: Bounding box tespiti
- robotics_trajectory: Yörünge planlama
- robotics_analyze: Sahne analizi
- robotics_plan: Fonksiyon çağrısı planla`;

	if (functions && functions.length > 0) {
		const fnList = functions
			.map((fn) => {
				const params = fn.parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
				return `  - ${fn.name}(${params}): ${fn.description}`;
			})
			.join("\n");
		section += `\n\n**Mevcut Robot API Fonksiyonları:**\n${fnList}`;
	}

	return section;
}
