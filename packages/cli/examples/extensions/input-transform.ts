/**
 * Input Transform Example - demonstrates the `input` event for intercepting user input.
 *
 * Start Hodeus with this extension:
 *   Hodeus -e ./examples/extensions/input-transform.ts
 *
 * Then type these inside Hodeus:
 *   ?quick What is TypeScript?  → "Respond briefly: What is TypeScript?"
 *   ping                        → "pong" (instant, no Provider)
 *   time                        → current time (instant, no Provider)
 */
import type { ExtensionAPI } from "Hodeus";

export default function (Hodeus: ExtensionAPI) {
	Hodeus.on("input", async (event, ctx) => {
		// Source-based logic: skip processing for extension-injected messages
		if (event.source === "extension") {
			return { action: "continue" };
		}

		// Transform: ?quick prefix for brief responses
		if (event.text.startsWith("?quick ")) {
			const query = event.text.slice(7).trim();
			if (!query) {
				ctx.ui.notify("Usage: ?quick <question>", "warning");
				return { action: "handled" };
			}
			return { action: "transform", text: `Respond briefly in 1-2 sentences: ${query}` };
		}

		// Handle: instant responses without Provider (extension shows its own feedback)
		if (event.text.toLowerCase() === "ping") {
			ctx.ui.notify("pong", "info");
			return { action: "handled" };
		}
		if (event.text.toLowerCase() === "time") {
			ctx.ui.notify(new Date().toLocaleString(), "info");
			return { action: "handled" };
		}

		return { action: "continue" };
	});
}
