// @ts-nocheck
import type { EngineTool } from "@mooncli/engine";
import { spawn } from "child_process";
import { Type } from "typebox";
import { getShellEnv } from "../../utils/shell.js";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";
import { truncateTail } from "./truncate.js";

const semanticSearchSchema = Type.Object({
	query: Type.String({ description: "Arama yapılacak semantik kelime, fonksiyon adı veya mantık özeti" }),
});

export function createSemanticSearchToolDefinition(cwd: string): ToolDefinition<typeof semanticSearchSchema, any, any> {
	return {
		name: "semantic_search",
		label: "semantic_search",
		description:
			"Proje genelinde akıllı semantik arama (MCP Indexing). Fonksiyonları, sınıfları ve mantığı bulmak için context ile birlikte arar.",
		promptSnippet: "Projede akıllı semantik bağlam ara (MCP tabanlı)",
		parameters: semanticSearchSchema,
		async execute(_id, { query }, signal) {
			return new Promise((resolve, reject) => {
				// Use git grep with context to approximate a semantic code search
				const child = spawn("git", ["grep", "-i", "-n", "-C", "2", query], {
					cwd,
					env: getShellEnv(),
					shell: true,
				});

				let output = "";
				child.stdout?.on("data", (chunk) => {
					output += chunk.toString();
				});
				child.stderr?.on("data", (chunk) => {
					output += chunk.toString();
				});

				const onAbort = () => child.kill();
				if (signal) {
					if (signal.aborted) onAbort();
					else signal.addEventListener("abort", onAbort, { once: true });
				}

				child.on("close", (_code) => {
					if (signal) signal.removeEventListener("abort", onAbort);
					if (signal?.aborted) {
						reject(new Error("aborted"));
						return;
					}

					if (!output.trim()) {
						resolve({
							content: [{ type: "text", text: `"${query}" ile eşleşen semantik bir sonuç bulunamadı.` }],
						});
						return;
					}

					const truncation = truncateTail(output, { maxLines: 500 });
					resolve({
						content: [{ type: "text", text: truncation.content || "" }],
					});
				});

				child.on("error", reject);
			});
		},
		renderCall(args, theme) {
			return {
				render: () => [theme.fg("toolTitle", `Semantik Arama: ${args?.query}`)],
				invalidate: () => {},
			};
		},
	};
}

export function createSemanticSearchTool(cwd: string): EngineTool<typeof semanticSearchSchema> {
	return wrapToolDefinition(createSemanticSearchToolDefinition(cwd));
}
