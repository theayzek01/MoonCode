/**
 * File Trigger Extension
 *
 * Watches a trigger file and injects its contents into the conversation.
 * Useful for external systems to send messages to the engine.
 *
 * Usage:
 *   echo "Run the tests" > /tmp/engine-trigger.txt
 */

import type { ExtensionAPI } from "MoonCode";
import * as fs from "node:fs";

export default function (MoonCode: ExtensionAPI) {
	MoonCode.on("session_start", async (_event, ctx) => {
		const triggerFile = "/tmp/engine-trigger.txt";

		fs.watch(triggerFile, () => {
			try {
				const content = fs.readFileSync(triggerFile, "utf-8").trim();
				if (content) {
					MoonCode.sendMessage(
						{
							customType: "file-trigger",
							content: `External trigger: ${content}`,
							display: true,
						},
						{ triggerTurn: true }, // triggerTurn - get Provider to respond
					);
					fs.writeFileSync(triggerFile, ""); // Clear after reading
				}
			} catch {
				// File might not exist yet
			}
		});

		if (ctx.hasUI) {
			ctx.ui.notify(`Watching ${triggerFile}`, "info");
		}
	});
}
