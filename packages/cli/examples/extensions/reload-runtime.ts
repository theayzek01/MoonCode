/**
 * Reload Runtime Extension
 *
 * Demonstrates ctx.reload() from ExtensionCommandContext and an Provider-callable
 * tool that queues a follow-up command to trigger reload.
 */

import type { ExtensionAPI } from "moodcli";
import { Type } from "typebox";

export default function (moodcli: ExtensionAPI) {
	// Command entrypoint for reload.
	// Treat reload as terminal for this handler.
	moodcli.registerCommand("reload-runtime", {
		description: "Reload extensions, skills, prompts, and themes",
		handler: async (_args, ctx) => {
			await ctx.reload();
			return;
		},
	});

	// Provider-callable tool. Tools get ExtensionContext, so they cannot call ctx.reload() directly.
	// Instead, queue a follow-up user command that executes the command above.
	moodcli.registerTool({
		name: "reload_runtime",
		label: "Reload Runtime",
		description: "Reload extensions, skills, prompts, and themes",
		parameters: Type.Object({}),
		async execute() {
			moodcli.sendUserMessage("/reload-runtime", { deliverAs: "followUp" });
			return {
				content: [{ type: "text", text: "Queued /reload-runtime as a follow-up command." }],
				details: {},
			};
		},
	});
}
