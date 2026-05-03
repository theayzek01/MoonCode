/**
 * Skills Configuration
 *
 * Skills provide specialized instructions loaded into the system prompt.
 * Discover, filter, merge, or replace them.
 */

import {
	createEngineSession,
	createSyntheticSourceInfo,
	DefaultResourceLoader,
	getEngineDir,
	SessionManager,
	type Skill,
} from "Mooncli";

// Or define custom skills inline
const customSkill: Skill = {
	name: "my-skill",
	description: "Custom project instructions",
	filePath: "/virtual/SKILL.md",
	baseDir: "/virtual",
	sourceInfo: createSyntheticSourceInfo("/virtual/SKILL.md", { source: "sdk" }),
	disableModelInvocation: false,
};

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	engineDir: getEngineDir(),
	skillsOverride: (current) => {
		const filteredSkills = current.skills.filter((s) => s.name.includes("browser") || s.name.includes("search"));
		return {
			skills: [...filteredSkills, customSkill],
			diagnostics: current.diagnostics,
		};
	},
});
await loader.reload();

// Discover all skills from cwd/.Mooncli/skills, ~/.Mooncli/engine/skills, etc.
const { skills: allSkills, diagnostics } = loader.getSkills();
console.log(
	"Discovered skills:",
	allSkills.map((s) => s.name),
);
if (diagnostics.length > 0) {
	console.log("Warnings:", diagnostics);
}

await createEngineSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});

console.log("Session created with filtered skills");
