import type { ExtensionAPI } from "MoonCode";
import { appendFileSync } from "node:fs";
import { join } from "node:path";

export default function (MoonCode: ExtensionAPI) {
	const logFile = join(process.cwd(), ".MoonCode", "provider-payload.log");

	MoonCode.on("before_provider_request", (event) => {
		appendFileSync(logFile, `${JSON.stringify(event.payload, null, 2)}\n\n`, "utf8");

		// Optional: replace the payload instead of only logging it.
		// return { ...event.payload, temperature: 0 };
	});

	MoonCode.on("after_provider_response", (event) => {
		appendFileSync(logFile, `[${event.status}] ${JSON.stringify(event.headers)}\n\n`, "utf8");
	});
}
