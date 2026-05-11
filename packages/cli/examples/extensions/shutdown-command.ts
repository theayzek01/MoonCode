/**
 * Shutdown Command Extension
 *
 * Adds a /quit command that allows extensions to trigger clean shutdown.
 * Demonstrates how extensions can use ctx.shutdown() to exit Mooncli cleanly.
 */

import type { ExtensionAPI } from "Mooncli";
import { Type } from "typebox";

export default function (Mooncli: ExtensionAPI) {
	// Register a /quit command that cleanly exits Mooncli
	Mooncli.registerCommand("quit", {
		description: "Exit Mooncli cleanly",
		handler: async (_args, ctx) => {
			ctx.shutdown();
		},
	});

	// You can also create a tool that shuts down after completing work
	Mooncli.registerTool({
		name: "finish_and_exit",
		label: "Finish and Exit",
		description: "Complete a task and exit Mooncli",
		parameters: Type.Object({}),
		async execute(_toolCallId, _params, _signal, _onUpdate, ctx) {
			// Do any final work here...
			// Request graceful shutdown (deferred until engine is idle)
			ctx.shutdown();

			// This return is sent to the Provider before shutdown occurs
			return {
				content: [{ type: "text", text: "Shutdown requested. Exiting after this response." }],
				details: {},
			};
		},
	});

	// You could also create a more complex tool with parameters
	Mooncli.registerTool({
		name: "deploy_and_exit",
		label: "Deploy and Exit",
		description: "Deploy the application and exit Mooncli",
		parameters: Type.Object({
			environment: Type.String({ description: "Target environment (e.g., production, staging)" }),
		}),
		async execute(_toolCallId, params, _signal, onUpdate, ctx) {
			onUpdate?.({ content: [{ type: "text", text: `Deploying to ${params.environment}...` }], details: {} });

			// Example deployment logic
			// const result = await Mooncli.exec("npm", ["run", "deploy", params.environment], { signal });

			// On success, request graceful shutdown
			onUpdate?.({ content: [{ type: "text", text: "Deployment complete, exiting..." }], details: {} });
			ctx.shutdown();

			return {
				content: [{ type: "text", text: "Done! Shutdown requested." }],
				details: { environment: params.environment },
			};
		},
	});
}
