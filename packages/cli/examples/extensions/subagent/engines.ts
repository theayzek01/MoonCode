/**
 * Engine discovery and configuration
 */

import { getEngineDir, parseFrontmatter } from "MoonCode";
import * as fs from "node:fs";
import * as path from "node:path";

export type EngineScope = "user" | "project" | "both";

export interface EngineConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	systemPrompt: string;
	source: "user" | "project";
	filePath: string;
}

export interface EngineDiscoveryResult {
	engines: EngineConfig[];
	projectEnginesDir: string | null;
}

function loadEnginesFromDir(dir: string, source: "user" | "project"): EngineConfig[] {
	const engines: EngineConfig[] = [];

	if (!fs.existsSync(dir)) {
		return engines;
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return engines;
	}

	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;

		const filePath = path.join(dir, entry.name);
		let content: string;
		try {
			content = fs.readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}

		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);

		if (!frontmatter.name || !frontmatter.description) {
			continue;
		}

		const tools = frontmatter.tools
			?.split(",")
			.map((t: string) => t.trim())
			.filter(Boolean);

		engines.push({
			name: frontmatter.name,
			description: frontmatter.description,
			tools: tools && tools.length > 0 ? tools : undefined,
			model: frontmatter.model,
			systemPrompt: body,
			source,
			filePath,
		});
	}

	return engines;
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function findNearestProjectEnginesDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".MoonCode", "engines");
		if (isDirectory(candidate)) return candidate;

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

export function discoverEngines(cwd: string, scope: EngineScope): EngineDiscoveryResult {
	const userDir = path.join(getEngineDir(), "engines");
	const projectEnginesDir = findNearestProjectEnginesDir(cwd);

	const userEngines = scope === "project" ? [] : loadEnginesFromDir(userDir, "user");
	const projectEngines =
		scope === "user" || !projectEnginesDir ? [] : loadEnginesFromDir(projectEnginesDir, "project");

	const engineMap = new Map<string, EngineConfig>();

	if (scope === "both") {
		for (const engine of userEngines) engineMap.set(engine.name, engine);
		for (const engine of projectEngines) engineMap.set(engine.name, engine);
	} else if (scope === "user") {
		for (const engine of userEngines) engineMap.set(engine.name, engine);
	} else {
		for (const engine of projectEngines) engineMap.set(engine.name, engine);
	}

	return { engines: Array.from(engineMap.values()), projectEnginesDir };
}

export function formatEngineList(engines: EngineConfig[], maxItems: number): { text: string; remaining: number } {
	if (engines.length === 0) return { text: "none", remaining: 0 };
	const listed = engines.slice(0, maxItems);
	const remaining = engines.length - listed.length;
	return {
		text: listed.map((a) => `${a.name} (${a.source}): ${a.description}`).join("; "),
		remaining,
	};
}
