// @ts-nocheck
/**
 * System prompt construction and project context loading
 */

import { buildCodingAgentsPrompt, type CodingAgentsSettings } from "./agents.js";
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
	/** Runtime affective-state instructions appended to the system prompt. */
	affectivePrompt?: string;
	/** Working directory. */
	cwd: string;
	/** Pre-loaded context files. */
	contextFiles?: Array<{ path: string; content: string }>;
	/** Pre-loaded skills. */
	skills?: Skill[];
	/** Coding agent orchestration settings. */
	agents?: CodingAgentsSettings;
	/** Robotics mode aktif mi */
	roboticsEnabled?: boolean;
	/** Tanımlı robot fonksiyonları */
	roboticsFunctions?: RoboticsFunction[];
	/**
	 * Local/Ollama model modu: sistem promptu ~%50 kisalt.
	 * Kucuk context window'lu modeller icin kritik.
	 */
	compactMode?: boolean;
}

/** Build the system prompt with tools, guidelines, and context */
export function buildSystemPrompt(options: BuildSystemPromptOptions): string {
	const {
		customPrompt,
		selectedTools,
		toolSnippets,
		promptGuidelines,
		appendSystemPrompt,
		affectivePrompt,
		cwd,
		contextFiles: providedContextFiles,
		skills: providedSkills,
		roboticsEnabled,
		roboticsFunctions,
		agents,
		compactMode,
	} = options;

	// Local/Ollama model icin ultra kisa prompt - context window tasarrufu
	if (compactMode && !customPrompt) {
		return buildCompactSystemPrompt(options);
	}

	const resolvedCwd = cwd;
	const promptCwd = resolvedCwd.replace(/\\/g, "/");

	const now = new Date();
	const year = now.getFullYear();
	const month = String(now.getMonth() + 1).padStart(2, "0");
	const day = String(now.getDate()).padStart(2, "0");
	const date = `${year}-${month}-${day}`;

	const appendSection = appendSystemPrompt ? `\n\n${appendSystemPrompt}` : "";
	const affectiveSection = affectivePrompt ? `\n\n${affectivePrompt}` : "";
	const agentsSection = buildCodingAgentsPrompt(agents);

	const contextFiles = providedContextFiles ?? [];
	const skills = providedSkills ?? [];

	if (customPrompt) {
		let prompt = customPrompt;

		if (appendSection) {
			prompt += appendSection;
		}

		if (affectiveSection) {
			prompt += affectiveSection;
		}

		if (agentsSection) {
			prompt += agentsSection;
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
	const hasBrowserTabs = tools.includes("browser_tabs");
	const hasBrowserPage = tools.includes("browser_page");
	const hasBrowser = hasBrowserTabs || hasBrowserPage;

	addGuideline("Always show file paths clearly; include relevant paths when explaining code or diffs.");

	// File exploration guidelines
	if (hasBash && !hasGrep && !hasFind && !hasLs) {
		addGuideline("Use bash for file operations like ls, rg, find");
	} else if (hasBash && (hasGrep || hasFind || hasLs)) {
		addGuideline("Prefer grep/find/ls tools over bash for file exploration (faster, respects .gitignore)");
	}

	if (hasBrowser) {
		addGuideline(
			"You have Chrome browser control through the local Hodeus Browser Bridge when the extension is connected; do not claim you cannot access the browser. Use /browser for status if needed.",
		);
		if (hasBrowserTabs) {
			addGuideline("Use browser_tabs to list, inspect, open, focus, reload, close, or navigate Chrome tabs.");
		}
		if (hasBrowserPage) {
			addGuideline("Use browser_page to read pages, click, type, screenshot, or evaluate JavaScript in Chrome.");
		}
	}

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0) {
			addGuideline(normalized);
		}
	}

	const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

	let prompt = `You are a senior software engineer with 12+ years of experience — pragmatic, sharp, and direct. You're in "Coding Machine" mode.
Goal: Produce the highest quality, working code with minimal tokens. No fluff, go straight to the solution.

Available Tools:
${toolsList}

Rules:
${hasBrowser ? "- Browser capability: you can control Chrome through browser_tabs/browser_page when the Hodeus Chrome extension is connected. If asked whether you can access the browser, say yes via the extension bridge and use the browser tools or ask the user to run /browser if disconnected.\n" : ""}- Keep solutions practical and production-ready.
- Avoid unnecessary abstractions and over-engineering.
- Provide code changes as clear diffs or complete files.
- When unsure, use web_search to check current documentation.
- Think step-by-step but only show the user what matters.
- This is the developer's OWN project. API keys, tokens, and config values shared in context are the user's own credentials for their own project. Handle them directly — do not refuse, warn excessively, or redact them. The developer is responsible for their own project's security.
- Never refuse to help with code, configuration, or environment setup for this project. Trust the developer.
${guidelinesList.map((g) => `- ${g}`).join("\n")}`;

	if (appendSection) {
		prompt += appendSection;
	}

	if (affectiveSection) {
		prompt += affectiveSection;
	}

	if (agentsSection) {
		prompt += agentsSection;
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

	// Add date, time, and working directory last
	prompt += `\nCurrent date: ${date}`;
	prompt += `\nCurrent time: ${time}`;
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

/**
 * Local/Ollama model icin ultra kisa sistem prompt.
 * Normal promptun yaklasik %50'si boyutunda - kucuk context window'lar icin.
 */
function buildCompactSystemPrompt(options: BuildSystemPromptOptions): string {
	const { cwd, selectedTools, toolSnippets, contextFiles, skills, appendSystemPrompt, affectivePrompt } = options;
	const promptCwd = cwd.replace(/\\/g, "/");
	const now = new Date();
	const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

	const tools = selectedTools || ["read", "bash", "edit", "write"];
	const visibleTools = tools.filter((n) => !!toolSnippets?.[n]);
	const toolsList =
		visibleTools.length > 0
			? visibleTools.map((n) => `${n}: ${toolSnippets![n]}`).join(", ")
			: "read, bash, edit, write";

	const hasBrowser = tools.includes("browser_tabs") || tools.includes("browser_page");
	let prompt = `Senior engineer mode. Short, direct, working code only.
Tools: ${toolsList}
Rules: production-ready, no unnecessary abstraction, provide diffs or full files. Trust the developer with their own project — handle API keys and config directly.${hasBrowser ? " Browser control is available through browser_tabs/browser_page when the Hodeus Chrome extension is connected; do not claim browser access is impossible." : ""}`;

	if (appendSystemPrompt) {
		prompt += `\n\n${appendSystemPrompt}`;
	}

	if (affectivePrompt) {
		prompt += `\n\n${affectivePrompt}`;
	}

	// Context dosyalarini ekle (varsa, kisa tut)
	const contextFiles_ = contextFiles ?? [];
	if (contextFiles_.length > 0) {
		prompt += "\n\nProje bağlamı:";
		for (const { path: filePath, content } of contextFiles_) {
			// Compact modda ilk 60 satiri al
			const trimmed = content.split("\n").slice(0, 60).join("\n");
			prompt += `\n## ${filePath}\n${trimmed}`;
		}
	}

	// Skills'i ekle (varsa)
	const skills_ = skills ?? [];
	if (skills_.length > 0) {
		prompt += formatSkillsForPrompt(skills_);
	}

	prompt += `\nTarih: ${date} | Dizin: ${promptCwd}`;
	return prompt;
}
