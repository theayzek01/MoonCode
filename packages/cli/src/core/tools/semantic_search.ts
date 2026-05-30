// @ts-nocheck

import { spawn } from "child_process";
import type { EngineTool } from "moon-engine";
import { Type } from "typebox";
import { getShellEnv } from "../../utils/shell.js";
import { formatSearchResults, searchProject } from "../codebase-index/index.js";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";
import { truncateTail } from "./truncate.js";

const semanticSearchSchema = Type.Object({
	query: Type.String({ description: "Semantic keyword, function name, or logic summary to search for" }),
});

// git grep fallback - index hazır değilse veya hata olursa
function gitGrepFallback(cwd: string, query: string, signal?: AbortSignal): Promise<string> {
	return new Promise((resolve, reject) => {
		const child = spawn("git", ["grep", "-i", "-n", "-C", "1", query], {
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

		child.on("close", () => {
			if (signal) signal.removeEventListener("abort", onAbort);
			if (signal?.aborted) {
				reject(new Error("aborted"));
				return;
			}
			resolve(output);
		});
		child.on("error", reject);
	});
}

export function createSemanticSearchToolDefinition(cwd: string): ToolDefinition<typeof semanticSearchSchema, any, any> {
	return {
		name: "semantic_search",
		label: "semantic_search",
		description:
			"BM25 semantic codebase search. Returns file:line locations and symbols. Use read tool for full content.",
		promptSnippet: "Search semantic project context (BM25 RAG)",
		parameters: semanticSearchSchema,
		async execute(_id, { query }, signal) {
			if (signal?.aborted) throw new Error("aborted");

			try {
				// BM25 semantic RAG - limit 5, snippet-only (az token)
				const results = searchProject(cwd, query, 5);

				if (results.length > 0) {
					const formatted = formatSearchResults(results);
					const truncation = truncateTail(formatted, { maxLines: 80 });
					return {
						content: [{ type: "text", text: truncation.content || "" }],
					};
				}

				// RAG sonuç bulamadıysa git grep fallback (kısa)
				const grepOutput = await gitGrepFallback(cwd, query, signal);
				if (!grepOutput.trim()) {
					return {
						content: [{ type: "text", text: `"${query}" matched no results.` }],
					};
				}
				const truncation = truncateTail(grepOutput, { maxLines: 80 });
				return {
					content: [{ type: "text", text: truncation.content || "" }],
				};
			} catch (err) {
				if (err instanceof Error && err.message === "aborted") throw err;

				try {
					const grepOutput = await gitGrepFallback(cwd, query, signal);
					if (!grepOutput.trim()) {
						return { content: [{ type: "text", text: `"${query}" matched no results.` }] };
					}
					const truncation = truncateTail(grepOutput, { maxLines: 80 });
					return { content: [{ type: "text", text: truncation.content || "" }] };
				} catch {
					return {
						content: [
							{ type: "text", text: `Search error: ${err instanceof Error ? err.message : String(err)}` },
						],
					};
				}
			}
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
