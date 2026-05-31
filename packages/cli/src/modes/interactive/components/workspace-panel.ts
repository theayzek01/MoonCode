// @ts-nocheck
import * as fs from "node:fs";
import * as path from "node:path";
import { type Component, truncateToWidth } from "moon-tui";
import type { EngineSession } from "../../../core/engine-session.js";

const reset = "\x1b[39m";
const bold = (s: string) => `\x1b[1m${s}\x1b[22m`;
const cyan = (s: string) => `\x1b[38;2;98;220;255m${s}${reset}`;
const coral = (s: string) => `\x1b[38;2;255;126;134m${s}${reset}`;
const green = (s: string) => `\x1b[38;2;112;220;150m${s}${reset}`;
const gold = (s: string) => `\x1b[38;2;236;198;96m${s}${reset}`;
const dim = (s: string) => `\x1b[38;2;120;126;140m${s}${reset}`;
const border = (s: string) => `\x1b[38;2;70;78;94m${s}${reset}`;

export class WorkspacePanelComponent implements Component {
	constructor(private session: EngineSession) {}

	setSession(session: EngineSession): void {
		this.session = session;
	}

	invalidate(): void {}
	dispose(): void {}

	private listFiles(cwd: string, max = 7): string[] {
		try {
			return fs
				.readdirSync(cwd, { withFileTypes: true })
				.filter((entry) => !entry.name.startsWith(".") && entry.name !== "node_modules" && entry.name !== "dist")
				.sort((a, b) => Number(b.isDirectory()) - Number(a.isDirectory()) || a.name.localeCompare(b.name))
				.slice(0, max)
				.map((entry) => `${entry.isDirectory() ? ">" : "-"} ${entry.name}${entry.isDirectory() ? "/" : ""}`);
		} catch {
			return ["folder read failed"];
		}
	}

	render(width: number): string[] {
		if (width < 24) return [];
		const cwd = this.session.sessionManager.getCwd();
		const activeTools = this.session.getActiveToolNames();
		const hasBlender = activeTools.some((tool) => tool.startsWith("blender_"));
		const inner = Math.max(12, width - 2);
		const line = (text = "") => `${border("|")}${truncateToWidth(text, inner, "...").padEnd(inner)}${border("|")}`;
		const separator = `${border("|")}${border("-".repeat(inner))}${border("|")}`;
		const toolLabel = activeTools.length ? `${activeTools.length} tools${hasBlender ? " + blender" : ""}` : "idle";

		return [
			`${border("+")}${border("-".repeat(inner))}${border("+")}`,
			line(`${cyan("*")} ${bold("moon panel")}`),
			line(dim(path.basename(cwd) || cwd)),
			separator,
			line(coral("files")),
			...this.listFiles(cwd).map((file) => line(file.startsWith(">") ? coral(file) : dim(file))),
			separator,
			line(gold("live")),
			line(activeTools.length ? green(toolLabel) : dim(toolLabel)),
			`${border("+")}${border("-".repeat(inner))}${border("+")}`,
		];
	}
}
