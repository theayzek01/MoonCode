/**
 * Prompt Templates
 *
 * File-based templates that inject content when invoked with /templatename.
 */

import {
	createEngineSession,
	createSyntheticSourceInfo,
	DefaultResourceLoader,
	getEngineDir,
	type PromptTemplate,
	SessionManager,
} from "MoonCode";

// Define custom templates
const deployTemplate: PromptTemplate = {
	name: "deploy",
	description: "Deploy the application",
	filePath: "/virtual/prompts/deploy.md",
	sourceInfo: createSyntheticSourceInfo("/virtual/prompts/deploy.md", { source: "sdk" }),
	content: `# Deploy Instructions

1. Build: npm run build
2. Test: npm test
3. Deploy: npm run deploy`,
};

const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	engineDir: getEngineDir(),
	promptsOverride: (current) => ({
		prompts: [...current.prompts, deployTemplate],
		diagnostics: current.diagnostics,
	}),
});
await loader.reload();

// Discover templates from cwd/.MoonCode/prompts/ and ~/.MoonCode/engine/prompts/
const discovered = loader.getPrompts().prompts;
console.log("Discovered prompt templates:");
for (const template of discovered) {
	console.log(`  /${template.name}: ${template.description}`);
}

await createEngineSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});

console.log(`Session created with ${discovered.length + 1} prompt templates`);
