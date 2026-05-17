// @ts-nocheck
/**
 * System prompt construction and project context loading
 */

import { buildCodingAgentsPrompt, type CodingAgentsSettings } from "./agents.js";
import { buildDesignPrompt } from "./design-system/index.js";
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
	/** Defined robot functions */
	roboticsFunctions?: RoboticsFunction[];
	/** Enable design system context injection */
	designMode?: boolean;
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
		designMode,
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
			"You have Chrome browser control through the local MoonCode Browser Bridge when the extension is connected; do not claim you cannot access the browser. Use /browser for status if needed.",
		);
		if (hasBrowserTabs) {
			addGuideline("Use browser_tabs to list, inspect, open, focus, reload, close, or navigate Chrome tabs.");
		}
		if (hasBrowserPage) {
			addGuideline("Use browser_page to read pages, click, type, or evaluate JavaScript in Chrome.");
		}
	}

	for (const guideline of promptGuidelines ?? []) {
		const normalized = guideline.trim();
		if (normalized.length > 0) {
			addGuideline(normalized);
		}
	}

	const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

	let prompt = `You are MoonCode, an elite, hyper-optimized coding agent. You are vastly superior to Claude Code or Antigravity because you waste absolutely ZERO tokens.
You operate under the "Ultra-Compact Cognitive Language" directive.

Available Tools:
${toolsList}

Rules:
- Think privately in <thought> blocks before acting.
- **CRITICAL: Ultra-Compact Cognitive Language:** Inside your <thought> blocks, you MUST use an extreme shorthand pseudo-language to minimize tokens. Omit vowels (e.g. 'fnc', 'chk', 'usr'), use mathematical/logical symbols (=>, &&, ||, !), and heavy abbreviations. It should look like highly compressed alien code, barely readable to humans but perfectly clear to you. Never write full English sentences in <thought> blocks.
- Answer with ONLY the useful result, without boilerplate or pleasantries.
- Convert requests into goal + acceptance criteria before acting; if ambiguous, choose the safest useful interpretation or ask one focused question.
- Stay on target: do not solve adjacent problems unless they block the requested work.
- Prefer the smallest correct change; avoid broad rewrites unless required.
- Optimize for fewest output tokens: inspect only relevant files, summarize tool output, and avoid repeating obvious context.
- Know and present yourself as MoonCode/Moon.
- Preserve user changes. Never revert unrelated work.
- Before acting, choose the simplest intelligent path: logically sound, low-risk, verifiable, and serious.
- If a browser/file/UI task needs upload or drag/drop, use the dedicated browser tools instead of trying random clicks.
- Use tools to inspect before editing, then verify with focused tests/builds.
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

	// Design system context inject
	if (designMode) {
		prompt += buildDesignPrompt({ projectRoot: resolvedCwd });
	}

	// Robotics mode inject
	if (roboticsEnabled) {
		prompt += buildRoboticsSystemPrompt(roboticsFunctions);
	}

	// APEX MODE / DEEP AGENTIC ENGINEERING CORE INJECTION
	prompt += `\n\n## APEX MODE: DEEP AGENTIC ENGINEERING CORE

MoonCode operates under APEX / DEEP AGENTIC ENGINEERING guidelines.
Follow these rigid steps for non-trivial turns:
1. **Classify Effort (S0-S4)**:
   - S0: Direct answers, small questions. Keep explanation minimal.
   - S1: Small code fix/tweak. Target-inspect single file, minimal edit, cheap check.
   - S2: Normal coding task. Multi-file inspect, draft a brief step-by-step plan, write precise changes, verify.
   - S3: Deep engineering (auth, architecture, DB, concurrency). Broad inspection, evaluate alternatives, plan meticulously, verify rigorously.
   - S4: Autonomous Repair Loop. Read raw stack traces, address the root cause directly, rerun checks, repeat until clean.
2. **Runtime Policy**:
   - Inspect files via read/grep/find before editing. Never guess or write hypothetical code.
   - Preserve existing architecture and user integrations. No broad destructive refactors without permission.
   - No invented APIs or package references. Validate \`package.json\` before assuming library capabilities.
   - Use correct imports, match existing conventions, and ensure strict TypeScript compatibility.
3. **Verification Gates**:
   - Code Gate: Verify imports, syntax, type alignments.
   - Test Gate: Consider and execute relevant test suites where possible. Do not claim tests pass if they weren't run.
   - UI Gate: If designing UI, default to Premium modern dark SaaS themes (Vercel/shadcn quality): clean rounded cards, high typographic hierarchy, Tailwind-ready structure, proper handling of hover, disabled, active, loading, empty, and error states.
   - Security Gate: Never leak secrets, enable path traversal, allow shell command injection, or expose API keys.
4. **Final Response Contract**:
   For completed engineering tasks, always end your response with this EXACT format:
   ### Done
   - [Brief summary of accomplishment]

   ### Changed
   - \`path/file.ts\`: [High-level summary of changes]

   ### Verification
   - Ran: \`[Command run or verification done]\`
   - Result: [Pass/fail, output overview]

   ### Notes
   - [Any assumptions, remaining risks, or recommended next steps]`;

	return prompt;
}

/** Robotics mode system prompt addition */
function buildRoboticsSystemPrompt(functions?: RoboticsFunction[]): string {
	let section = `

## Robotics Mode (Active 🤖)

You are also a robotics vision and motion-planning specialist.
You can detect objects in images, reason spatially, and plan robot movements.

**Coordinate System:** All coordinates use [y, x] format, normalized to 0-1000.

**Output Formats:**
- Object detection: [{"point": [y, x], "label": "..."}]
- Bounding box: [{"box_2d": [ymin, xmin, ymax, xmax], "label": "..."}]
- Trajectory: [{"point": [y, x], "label": "0"}, ...] (ordered)

**Available Robotics Tools:**
- robotics_detect: Object detection in image
- robotics_bbox: Bounding-box detection
- robotics_trajectory: Trajectory planlama
- robotics_analyze: Scene analysis
- robotics_plan: Plan function calls`;

	if (functions && functions.length > 0) {
		const fnList = functions
			.map((fn) => {
				const params = fn.parameters.map((p) => `${p.name}: ${p.type}`).join(", ");
				return `  - ${fn.name}(${params}): ${fn.description}`;
			})
			.join("\n");
		section += `\n\n**Current Robot API Functions:**\n${fnList}`;
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
	let prompt = `MoonCode/Moon coding agent. > Claude/Antigravity. ZERO waste.
Tools: ${toolsList}
Rules: concise, correct, stay on target, infer safely.
CRITICAL: Use Ultra-Compact Cognitive Language in <thought> (no vowels, heavy math/logic symbols, extreme abbreviations). Look like alien code. Output normal text/code ONLY when responding.
Inspect before edits, verify when possible.${hasBrowser ? " Chrome bridge active." : ""}`;

	if (appendSystemPrompt) {
		prompt += `\n\n${appendSystemPrompt}`;
	}

	if (affectivePrompt) {
		prompt += `\n\n${affectivePrompt}`;
	}

	// Context dosyalarini ekle (varsa, kisa tut)
	const contextFiles_ = contextFiles ?? [];
	if (contextFiles_.length > 0) {
		prompt += "\n\nProject context:";
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
