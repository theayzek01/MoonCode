import { watch, statSync } from "fs";
import { join } from "path";
import type { ExtensionFactory } from "../../packages/cli/src/core/extensions/index.js";

const watcherExtension: ExtensionFactory = (api) => {
	let isWatching = false;
	let watcher: any = null;
	let lastNotifyTime = 0;

	const startWatching = (context: any) => {
		if (isWatching) return;
		isWatching = true;
		context.ui.setStatus("watcher", "👁️ Watcher: Active");
		
		const cwd = process.cwd();
		// A simple recursive fs.watch wrapper for demonstration
		try {
			watcher = watch(cwd, { recursive: true }, async (eventType, filename) => {
				try {
					if (!filename) return;
					
					// Ignore hidden folders and common noise
					if (filename.includes("node_modules") || filename.includes(".git") || filename.includes(".mooncode")) return;
					if (filename.endsWith(".ts") || filename.endsWith(".js") || filename.endsWith(".tsx")) {
						
						// Throttle notifications to max 1 per 5 seconds
						const now = Date.now();
						if (now - lastNotifyTime < 5000) return;
						lastNotifyTime = now;
						
						context.ui.notify(`File changed: ${filename}`, "info");
						
						// Ask the user if they want to analyze it
						const shouldAnalyze = await context.ui.confirm("Watcher Alert", `Do you want to analyze the changes in ${filename}?`);
						
						if (shouldAnalyze) {
							// Provide context into the chat
							context.ui.pasteToEditor(`Review the recent changes in ${filename}`);
						}
					}
				} catch (err) {
					// Ignore errors such as UI confirm cancellation
				}
			});
		} catch (e) {
			context.ui.notify("Error starting watcher", "error");
		}
	};

	const stopWatching = (context: any) => {
		if (!isWatching) return;
		isWatching = false;
		if (watcher) {
			watcher.close();
			watcher = null;
		}
		context.ui.setStatus("watcher", " Watcher: Stopped");
	};

	api.registerCommand("watch", {
		description: "Toggle Auto-Pilot Watcher mode",
		execute: async (context) => {
			if (isWatching) {
				stopWatching(context);
				context.ui.notify("Watcher stopped.", "success");
			} else {
				startWatching(context);
				context.ui.notify("Watcher started. Monitoring for file saves...", "success");
			}
		}
	});
};

export default watcherExtension;
