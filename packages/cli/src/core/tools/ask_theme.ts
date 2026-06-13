// @ts-nocheck

import type { EngineTool } from "moon-engine";
import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const askThemeSchema = Type.Object({
	prompt: Type.Optional(Type.String({ description: "Optional context or description of the project (e.g. 'E-commerce website', 'Mobile fitness tracker')." })),
});

export type AskThemeInput = Static<typeof askThemeSchema>;

export function createAskThemeToolDefinition(): ToolDefinition<typeof askThemeSchema, undefined, any> {
	return {
		name: "ask_theme",
		label: "ask theme",
		description:
			"Present the user with an interactive design theme configuration wizard (Palette, Style cards, Fonts, Icons) and block until selections are made or auto-generated.",
		promptSnippet: "Ask the user to configure the UI theme/styling preference for the project.",
		parameters: askThemeSchema,
		async execute(_toolCallId, { prompt }, signal, _onUpdate, ctx) {
			if (!ctx.hasUI) {
				throw new Error("Cannot ask theme: UI is not available in the current context.");
			}

			// We pass a special prefix in ctx.ui.select to trigger the ask_theme wizard on the frontend
			const selection = await ctx.ui.select(`__ask_theme__:${prompt || ""}`, ["Submit"], { signal });

			if (selection === undefined) {
				throw new Error("User cancelled or timeout occurred while waiting for theme selection.");
			}

			try {
				const parsed = JSON.parse(selection);
				return {
					content: [{ type: "text", text: `Theme configuration selected: ${JSON.stringify(parsed, null, 2)}` }],
					details: parsed,
				};
			} catch (e) {
				return {
					content: [{ type: "text", text: `Theme configuration selected (raw): ${selection}` }],
					details: selection,
				};
			}
		},
	};
}

export function createAskThemeTool(): EngineTool<typeof askThemeSchema> {
	return wrapToolDefinition(createAskThemeToolDefinition());
}
