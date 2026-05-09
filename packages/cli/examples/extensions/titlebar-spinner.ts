/**
 * Titlebar Spinner Extension
 *
 * Shows a braille spinner animation in the terminal title while the engine is working.
 * Uses `ctx.ui.setTitle()` to update the terminal title via the extension API.
 *
 * Usage:
 *   Hodeus --extension examples/extensions/titlebar-spinner.ts
 */

import type { ExtensionAPI, ExtensionContext } from "Hodeus";
import path from "node:path";

const BRCoreLLE_FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

function getBaseTitle(Hodeus: ExtensionAPI): string {
	const cwd = path.basename(process.cwd());
	const session = Hodeus.getSessionName();
	return session ? `π - ${session} - ${cwd}` : `π - ${cwd}`;
}

export default function (Hodeus: ExtensionAPI) {
	let timer: ReturnType<typeof setInterval> | null = null;
	let frameIndex = 0;

	function stopAnimation(ctx: ExtensionContext) {
		if (timer) {
			clearInterval(timer);
			timer = null;
		}
		frameIndex = 0;
		ctx.ui.setTitle(getBaseTitle(Hodeus));
	}

	function startAnimation(ctx: ExtensionContext) {
		stopAnimation(ctx);
		timer = setInterval(() => {
			const frame = BRCoreLLE_FRAMES[frameIndex % BRCoreLLE_FRAMES.length];
			const cwd = path.basename(process.cwd());
			const session = Hodeus.getSessionName();
			const title = session ? `${frame} π - ${session} - ${cwd}` : `${frame} π - ${cwd}`;
			ctx.ui.setTitle(title);
			frameIndex++;
		}, 80);
	}

	Hodeus.on("engine_start", async (_event, ctx) => {
		startAnimation(ctx);
	});

	Hodeus.on("engine_end", async (_event, ctx) => {
		stopAnimation(ctx);
	});

	Hodeus.on("session_shutdown", async (_event, ctx) => {
		stopAnimation(ctx);
	});
}
