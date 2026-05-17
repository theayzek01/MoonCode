import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	unlinkSync,
	writeFileSync,
} from "fs";
import { join } from "path";
import type { ExtensionFactory, ToolExecutionStartEvent } from "../../src/core/extensions/index.js";

/**
 * Shadow Git Extension v1.2 (Premium)
 *
 * Automatically backs up files right before the AI modifies them.
 * Provides a /rewind command to restore files with a single click.
 */
const shadowGitExtension: ExtensionFactory = (api) => {
	api.on("session_start", async (_event, ctx) => {
		ctx.ui.setStatus("shadow", "◆ Shadow: Active");
	});

	// Auto-cleanup: Keep only last 100 snapshots
	const cleanupShadows = (shadowDir: string) => {
		try {
			const files = readdirSync(shadowDir)
				.filter((f) => f.endsWith(".json"))
				.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
			if (files.length > 100) {
				files.slice(100).forEach((f) => {
					const ts = f.replace(".json", "");
					unlinkSync(join(shadowDir, f));
					const bak = join(shadowDir, `${ts}.bak`);
					if (existsSync(bak)) unlinkSync(bak);
				});
			}
		} catch (_e) {}
	};

	const getDiff = (oldContent: string, newContent: string, theme: any): string => {
		const oldLines = oldContent.split("\n");
		const newLines = newContent.split("\n");
		const diff: string[] = [];
		let i = 0,
			j = 0;
		while (i < oldLines.length || j < newLines.length) {
			if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
				i++;
				j++;
			} else if (j < newLines.length && (i >= oldLines.length || !oldLines.slice(i).includes(newLines[j]))) {
				diff.push(theme.fg("success", `+ ${newLines[j]}`));
				j++;
			} else {
				diff.push(theme.fg("error", `- ${oldLines[i]}`));
				i++;
			}
			if (diff.length > 50) {
				diff.push(theme.fg("dim", "... (diff truncated)"));
				break;
			}
		}
		return diff.join("\n");
	};

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
					if (!existsSync(shadowDir)) mkdirSync(shadowDir, { recursive: true });

					cleanupShadows(shadowDir);

					const timestamp = Date.now();
					const backupPath = join(shadowDir, `${timestamp}.bak`);
					const metadataPath = join(shadowDir, `${timestamp}.json`);

					copyFileSync(targetFile, backupPath);
					writeFileSync(
						metadataPath,
						JSON.stringify({ timestamp, originalPath: targetFile, fileName: targetFile }),
					);
				} catch (_e) {}
			}
		}
	});

	api.registerCommand("rewind", {
		description: "Shadow-Git: Interactive restoration with Diff",
		execute: async (context) => {
			const shadowDir = join(process.cwd(), ".mooncode", "shadow");
			if (!existsSync(shadowDir)) {
				context.ui.notify("No shadows found.", "warning");
				return;
			}

			const files = readdirSync(shadowDir)
				.filter((f) => f.endsWith(".json"))
				.sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
			if (files.length === 0) return;

			const options = files.slice(0, 15).map((file) => {
				const meta = JSON.parse(readFileSync(join(shadowDir, file), "utf-8"));
				const time = new Date(meta.timestamp).toLocaleTimeString();
				return `[${time}] ${meta.fileName}`;
			});

			options.push("---", "Clear All Shadows", "Cancel");
			const choice = await context.ui.select("◆ Select Shadow to Restore", options);
			if (!choice || choice === "Cancel" || choice === "---") return;

			if (choice === "Clear All Shadows") {
				if (await context.ui.confirm("Clear All?", "This will delete all snapshots.")) {
					for (const f of readdirSync(shadowDir)) {
						unlinkSync(join(shadowDir, f));
					}
					context.ui.notify("Shadows purged.", "success");
				}
				return;
			}

			const metaFile = files[options.indexOf(choice)];
			const meta = JSON.parse(readFileSync(join(shadowDir, metaFile), "utf-8"));
			const bakPath = join(shadowDir, metaFile.replace(".json", ".bak"));

			if (existsSync(bakPath) && existsSync(meta.originalPath)) {
				const current = readFileSync(meta.originalPath, "utf-8");
				const shadow = readFileSync(bakPath, "utf-8");
				const diff = getDiff(current, shadow, context.ui.theme);

				if (diff) {
					context.ui.notify(`Diff for ${meta.fileName}:\n${diff}`, "info");
				}

				if (await context.ui.confirm("Restore?", `Rollback ${meta.fileName}?`)) {
					copyFileSync(bakPath, meta.originalPath);
					context.ui.notify("✓ Restored successfully.", "success");
				}
			}
		},
	});
};

export default shadowGitExtension;
