/**
 * Context Files (AGENTS.md)
 *
 * Context files provide project-specific instructions loaded into the system prompt.
 */

import { createEngineSession, DefaultResourceLoader, getEngineDir, SessionManager } from "MoonCode";

// Disable context files entirely by returning an empty list in enginesFilesOverride.
const loader = new DefaultResourceLoader({
	cwd: process.cwd(),
	engineDir: getEngineDir(),
	enginesFilesOverride: (current) => ({
		enginesFiles: [
			...current.enginesFiles,
			{
				path: "/virtual/AGENTS.md",
				content: `# Project Guidelines

## Code Style
- Use TypeScript strict mode
- No any types
- Prefer const over let`,
			},
		],
	}),
});
await loader.reload();

// Discover AGENTS.md files walking up from cwd
const discovered = loader.getEnginesFiles().enginesFiles;
console.log("Discovered context files:");
for (const file of discovered) {
	console.log(`  - ${file.path} (${file.content.length} chars)`);
}

await createEngineSession({
	resourceLoader: loader,
	sessionManager: SessionManager.inMemory(),
});

console.log(`Session created with ${discovered.length + 1} context files`);
