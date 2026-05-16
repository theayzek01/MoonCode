import { existsSync, mkdirSync, copyFileSync, statSync, readdirSync, unlinkSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { ExtensionFactory, ToolExecutionStartEvent } from "../../src/core/extensions/index.js";

/**
 * Shadow Git Extension v1.2 (Premium)
 * 
 * Automatically backs up files right before the AI modifies them.
 * Provides a /rewind command to restore files with a single click.
 */
const shadowGitExtension: ExtensionFactory = (api) => {
	api.ui.setStatus("shadow", "☾ Shadow Protection: Active");

	api.on("tool_execution_start", async (event: ToolExecutionStartEvent) => {
		const { toolName, args } = event;
		
		const modifyingTools = ["replace_file_content", "multi_replace_file_content", "write_to_file", "edit_file"];
		
		if (modifyingTools.includes(toolName)) {
			const targetFile = (args.TargetFile || args.Target || args.AbsolutePath) as string;
			
			if (targetFile && existsSync(targetFile)) {
				try {
					if (!statSync(targetFile).isFile()) return;

					const cwd = process.cwd();
					const shadowDir = join(cwd, ".mooncode", "shadow");
					
					if (!existsSync(shadowDir)) {
						mkdirSync(shadowDir, { recursive: true });
					}

					// We store the original relative path too
					const timestamp = Date.now();
					const originalPath = targetFile;
					const backupFileName = `${timestamp}.bak`;
					const backupPath = join(shadowDir, backupFileName);
					
					// Store metadata
					const metadataPath = join(shadowDir, `${timestamp}.json`);
					const metadata = {
						timestamp,
						originalPath,
						fileName: targetFile
					};
					
					copyFileSync(targetFile, backupPath);
					writeFileSync(metadataPath, JSON.stringify(metadata));
				} catch (e) {
					// Silent fail
				}
			}
		}
	});

	api.registerCommand("history", {
		description: "Time Machine: Restore files from shadow snapshots",
		execute: async (context) => {
			const cwd = process.cwd();
			const shadowDir = join(cwd, ".mooncode", "shadow");
			
			if (!existsSync(shadowDir)) {
				context.ui.notify("No shadows exist yet.", "warning");
				return;
			}

			const files = readdirSync(shadowDir)
				.filter(f => f.endsWith(".json"))
				.sort((a, b) => {
					const timeA = parseInt(a.replace(".json", ""));
					const timeB = parseInt(b.replace(".json", ""));
					return timeB - timeA;
				});

			if (files.length === 0) {
				context.ui.notify("No shadow metadata found.", "info");
				return;
			}

			const options = files.slice(0, 10).map(file => {
				const metadata = JSON.parse(readFileSync(join(shadowDir, file), "utf-8"));
				const date = new Date(metadata.timestamp);
				const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}`;
				return `[${timeStr}] ${metadata.fileName}`;
			});

			options.push("Clear All Shadows");
			options.push("Cancel");

			const choice = await context.ui.select("Select a snapshot to RESTORE", options);
			
			if (!choice || choice === "Cancel") return;

			if (choice === "Clear All Shadows") {
				const confirm = await context.ui.confirm("Clear Shadows", "Are you sure?");
				if (confirm) {
					const all = readdirSync(shadowDir);
					all.forEach(f => unlinkSync(join(shadowDir, f)));
					context.ui.notify("Shadows cleared.", "success");
				}
				return;
			}

			const index = options.indexOf(choice);
			const metadataFile = files[index];
			const timestamp = metadataFile.replace(".json", "");
			const metadata = JSON.parse(readFileSync(join(shadowDir, metadataFile), "utf-8"));
			const backupPath = join(shadowDir, `${timestamp}.bak`);
			
			if (existsSync(backupPath)) {
				const restoreConfirm = await context.ui.confirm("Restore File", `Restore ${metadata.fileName} to its previous state?`);
				if (restoreConfirm) {
					copyFileSync(backupPath, metadata.originalPath);
					context.ui.notify(`✓ Successfully restored: ${metadata.fileName}`, "success");
				}
			}
		}
	});
};

export default shadowGitExtension;
