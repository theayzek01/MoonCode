/**
 * Bash Spawn Hook Example
 *
 * Adjusts command, cwd, and env before execution.
 *
 * Usage:
 *   moodcli -e ./bash-spawn-hook.ts
 */

import type { ExtensionAPI } from "moodcli";
import { createBashTool } from "moodcli";

export default function (moodcli: ExtensionAPI) {
	const cwd = process.cwd();

	const bashTool = createBashTool(cwd, {
		spawnHook: ({ command, cwd, env }) => ({
			command: `source ~/.profile\n${command}`,
			cwd,
			env: { ...env, PI_SPAWN_HOOK: "1" },
		}),
	});

	moodcli.registerTool({
		...bashTool,
		execute: async (id, params, signal, onUpdate, _ctx) => {
			return bashTool.execute(id, params, signal, onUpdate);
		},
	});
}
