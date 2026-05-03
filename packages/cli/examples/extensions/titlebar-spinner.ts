/**
 * Titlebar Spinner Extension
 *
 * Shows a braille spinner animation in the terminal title while the engine is working.
 * Uses `ctx.ui.setTitle()` to update the terminal title via the extension API.
 *
 * Usage:
 *   moodcli --extension examples/extensions/titlebar-spinner.ts
 */

import path from "node:path";
import type { ExtensionAPI, ExtensionContext } from "moodcli";

const BRCoreLLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function getBaseTitle(moodcli: ExtensionAPI): string {
	const cwd = path.basename(process.cwd());
	const session = moodcli.getSessionName();
	return session ? `π - ${session} - ${cwd}` : `π - ${cwd}`;
}

export default function (moodcli: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let frameIndex = 0;

	function stopAnimation(ctx: ExtensionContext) {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		frameIndex = 0;
		ctx.ui.setTitle(getBaseTitle(moodcli));
	}

	function startAnimation(ctx: ExtensionContext) {
		stopAnimation(ctx);
		timer = setInterval(() => {
			const frame = BRCoreLLE_FRAMES[frameIndex % BRCoreLLE_FRAMES.length];
			const cwd = path.basename(process.cwd());
			const session = moodcli.getSessionName();
			const title = session ? `${frame} π - ${session} - ${cwd}` : `${frame} π - ${cwd}`;
			ctx.ui.setTitle(title);
			frameIndex++;
		}, 80);
	}

	moodcli.on("engine_start", async (_event, ctx) => {
		startAnimation(ctx);
	});

	moodcli.on("engine_end", async (_event, ctx) => {
		stopAnimation(ctx);
	});

	moodcli.on("session_shutdown", async (_event, ctx) => {
		stopAnimation(ctx);
	});
}
