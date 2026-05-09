/**
 * Extensions Configuration
 *
 * Extensions intercept engine events and can register custom tools.
 * They provide a unified system for extensions, custom tools, commands, and more.
 *
 * By default, extension files are discovered from:
 * - ~/.Hodeus/engine/extensions/
 * - <cwd>/.Hodeus/extensions/
 * - Paths specified in settings.json "extensions" array
 *
 * An extension is a TypeScript file that exports a default function:
 *   export default function (Hodeus: ExtensionAPI) { ... }
 */

import { createEngineSession, DefaultResourceLoader, getEngineDir, SessionManager } from "Hodeus";

// Extensions are discovered automatically from standard locations.
// You can also add paths via settings.json or DefaultResourceLoader options.

const resourceLoader = new DefaultResourceLoader({
	cwd: process.cwd(),
	engineDir: getEngineDir(),
	additionalExtensionPaths: ["./my-logging-extension.ts", "./my-safety-extension.ts"],
	extensionFactories: [
		(Hodeus) => {
			Hodeus.on("engine_start", () => {
				console.log("[Inline Extension] Engine starting");
			});
		},
	],
});
await resourceLoader.reload();

const { session } = await createEngineSession({
	resourceLoader,
	sessionManager: SessionManager.inMemory(),
});

session.subscribe((event) => {
	if (event.type === "message_update" && event.assistantMessageEvent.type === "text_delta") {
		process.stdout.write(event.assistantMessageEvent.delta);
	}
});

await session.prompt("List files in the current directory.");
console.log();

// Example extension file (./my-logging-extension.ts):
/*
import type { ExtensionAPI } from "Hodeus";

export default function (Hodeus: ExtensionAPI) {
	Hodeus.on("engine_start", async () => {
		console.log("[Extension] Engine starting");
	});

	Hodeus.on("tool_call", async (event) => {
		console.log(\`[Extension] Tool: \${event.toolName}\`);
		// Return { block: true, reason: "..." } to block execution
		return undefined;
	});

	Hodeus.on("engine_end", async (event) => {
		console.log(\`[Extension] Done, \${event.messages.length} messages\`);
	});

	// Register a custom tool
	Hodeus.registerTool({
		name: "my_tool",
		label: "My Tool",
		description: "Does something useful",
		parameters: Type.Object({
			input: Type.String(),
		}),
		execute: async (_toolCallId, params, _signal, _onUpdate, _ctx) => ({
			content: [{ type: "text", text: \`Processed: \${params.input}\` }],
			details: {},
		}),
	});

	// Register a command
	Hodeus.registerCommand("mycommand", {
		description: "Do something",
		handler: async (args, ctx) => {
			ctx.ui.notify(\`Command executed with: \${args}\`);
		},
	});
}
*/
