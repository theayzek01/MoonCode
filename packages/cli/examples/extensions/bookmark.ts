/**
 * Entry bookmarking example.
 *
 * Shows setLabel to mark entries with labels for easy navigation in /tree.
 * Labels appear in the tree view and help you find important points.
 *
 * Usage: /bookmark [label] - bookmark the last assistant message
 */

import type { ExtensionAPI } from "Mooncli";

export default function (Mooncli: ExtensionAPI) {
	Mooncli.registerCommand("bookmark", {
		description: "Bookmark last message (usage: /bookmark [label])",
		handler: async (args, ctx) => {
			const label = args.trim() || `bookmark-${Date.now()}`;

			// Find the last assistant message entry
			const entries = ctx.sessionManager.getEntries();
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				if (entry.type === "message" && entry.message.role === "assistant") {
					Mooncli.setLabel(entry.id, label);
					ctx.ui.notify(`Bookmarked as: ${label}`, "info");
					return;
				}
			}

			ctx.ui.notify("No assistant message to bookmark", "warning");
		},
	});

	// Remove bookmark
	Mooncli.registerCommand("unbookmark", {
		description: "Remove bookmark from last labeled entry",
		handler: async (_args, ctx) => {
			const entries = ctx.sessionManager.getEntries();
			for (let i = entries.length - 1; i >= 0; i--) {
				const entry = entries[i];
				const label = ctx.sessionManager.getLabel(entry.id);
				if (label) {
					Mooncli.setLabel(entry.id, undefined);
					ctx.ui.notify(`Removed bookmark: ${label}`, "info");
					return;
				}
			}
			ctx.ui.notify("No bookmarked entry found", "warning");
		},
	});
}
