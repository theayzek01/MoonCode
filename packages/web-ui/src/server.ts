// @ts-nocheck
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { startWebUiServer as startCliWebUiServer } from "../../cli/src/core/web-ui-server.js";

const ROOT = resolve(fileURLToPath(new URL("./public", import.meta.url)));

export function startWebUiServer(options: { port?: number } = {}) {
	return startCliWebUiServer({ ...options, staticRoot: ROOT });
}

if (import.meta.url === `file://${process.argv[1]}`) {
	const { url } = startWebUiServer();
	console.log(`Mooncli Web-UI: ${url}`);
}
