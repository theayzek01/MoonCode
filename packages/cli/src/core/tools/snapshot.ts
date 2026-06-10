import { existsSync, mkdirSync, cpSync, rmSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Type, type Static } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import type { EngineTool } from "moon-engine";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const snapshotSchema = Type.Object({
	action: Type.String({ description: "Action to perform: 'create', 'restore', or 'list'" }),
	snapshotName: Type.Optional(Type.String({ description: "Name of the snapshot (optional for create, required for restore)" }))
});

export type SnapshotToolInput = Static<typeof snapshotSchema>;

export function createSnapshotToolDefinition(cwd: string): ToolDefinition<typeof snapshotSchema, undefined, any> {
	return {
		name: "snapshot",
		label: "snapshot",
		description: "Time-Travel Debugging: Create, restore, or list project snapshots. Use this to backup the workspace before risky operations, or to rollback when an error occurs.",
		promptSnippet: "Manage workspace snapshots",
		parameters: snapshotSchema,
		async execute(_toolCallId, { action, snapshotName }, signal, _onUpdate, ctx) {
			const mooncodeDir = join(cwd, ".mooncode");
			const snapshotsDir = join(mooncodeDir, "snapshots");

			if (!existsSync(mooncodeDir)) mkdirSync(mooncodeDir, { recursive: true });
			if (!existsSync(snapshotsDir)) mkdirSync(snapshotsDir, { recursive: true });

			const filterFunc = (src: string, dest: string) => {
				const ignores = ["node_modules", ".git", ".mooncode", "dist"];
				for (const ignore of ignores) {
					if (src.includes(`\\${ignore}\\`) || src.includes(`/${ignore}/`) || src.endsWith(`\\${ignore}`) || src.endsWith(`/${ignore}`)) {
						return false;
					}
				}
				return true;
			};

			let resultText = "";

			try {
				if (action === "create") {
					const name = snapshotName || `snap_${Date.now()}`;
					const targetDir = join(snapshotsDir, name);
					if (existsSync(targetDir)) {
						resultText = `Snapshot '${name}' already exists.`;
					} else {
						cpSync(cwd, targetDir, { recursive: true, filter: filterFunc });
						resultText = `Snapshot '${name}' created successfully at .mooncode/snapshots/${name}`;
					}
				} else if (action === "restore") {
					if (!snapshotName) {
						throw new Error("snapshotName is required for restore.");
					}
					const targetDir = join(snapshotsDir, snapshotName);
					if (!existsSync(targetDir)) {
						resultText = `Snapshot '${snapshotName}' not found.`;
					} else {
						const items = readdirSync(cwd);
						for (const item of items) {
							if (["node_modules", ".git", ".mooncode"].includes(item)) continue;
							rmSync(join(cwd, item), { recursive: true, force: true });
						}
						cpSync(targetDir, cwd, { recursive: true });
						resultText = `Workspace restored to snapshot '${snapshotName}'`;
					}
				} else if (action === "list") {
					const snaps = readdirSync(snapshotsDir);
					if (snaps.length === 0) {
						resultText = "No snapshots found.";
					} else {
						resultText = `Available snapshots:\n${snaps.join("\n")}`;
					}
				} else {
					throw new Error("Invalid action.");
				}
			} catch (err: any) {
				resultText = `Error executing snapshot action: ${err.message}`;
			}

			return {
				content: [{ type: "text", text: resultText }],
				details: undefined,
			};
		},
	};
}

export function createSnapshotTool(cwd: string): EngineTool<typeof snapshotSchema> {
	return wrapToolDefinition(createSnapshotToolDefinition(cwd));
}
