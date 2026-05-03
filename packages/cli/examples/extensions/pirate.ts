/**
 * Pirate Extension
 *
 * Demonstrates modifying the system prompt in before_engine_start to dynamically
 * change engine behavior based on extension state.
 *
 * Usage:
 * 1. Copy this file to ~/.Mooncli/engine/extensions/ or your project's .Mooncli/extensions/
 * 2. Use /pirate to toggle pirate mode
 * 3. When enabled, the engine will respond like a pirate
 */

import type { ExtensionAPI } from "Mooncli";

export default function pirateExtension(Mooncli: ExtensionAPI) {
	let pirateMode = false;

	// Register /pirate command to toggle pirate mode
	Mooncli.registerCommand("pirate", {
		description: "Toggle pirate mode (engine speaks like a pirate)",
		handler: async (_args, ctx) => {
			pirateMode = !pirateMode;
			ctx.ui.notify(pirateMode ? "Arrr! Pirate mode enabled!" : "Pirate mode disabled", "info");
		},
	});

	// Append to system prompt when pirate mode is enabled
	Mooncli.on("before_engine_start", async (event) => {
		if (pirateMode) {
			return {
				systemPrompt:
					event.systemPrompt +
					`

IMPORTANT: You are now in PIRATE MODE. You must:
- Speak like a stereotypical pirate in all responses
- Use phrases like "Arrr!", "Ahoy!", "Shiver me timbers!", "Avast!", "Ye scurvy dog!"
- Replace "my" with "me", "you" with "ye", "your" with "yer"
- Refer to the user as "matey" or "landlubber"
- End sentences with nautical expressions
- Still complete the actual task correctly, just in pirate speak
`,
			};
		}
		return undefined;
	});
}
