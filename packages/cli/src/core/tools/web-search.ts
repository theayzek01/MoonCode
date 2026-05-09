// @ts-nocheck
import type { EngineTool } from "hodeus-engine";
import { Text } from "hodeus-tui";
import { type Static, Type } from "typebox";
import type { Theme } from "../../modes/interactive/theme/theme.js";
import type { ToolDefinition, ToolRenderResultOptions } from "../extensions/types.js";
import { str } from "./render-utils.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const webSearchSchema = Type.Object({
	query: Type.String({ description: "Search query to look up on the web" }),
});

export type WebSearchToolInput = Static<typeof webSearchSchema>;

export interface WebSearchToolDetails {
	query: string;
	resultsCount: number;
}

function formatWebSearchCall(args: { query: string } | undefined, theme: Theme): string {
	const query = str(args?.query);
	return (
		theme.fg("toolTitle", theme.bold("web_search")) +
		" " +
		(query === null ? theme.fg("error", "<invalid query>") : theme.fg("accent", `"${query}"`))
	);
}

function formatWebSearchResult(
	result: {
		content: Array<{ type: string; text?: string }>;
		details?: WebSearchToolDetails;
	},
	_options: ToolRenderResultOptions,
	theme: Theme,
): string {
	const output = result.content.find((c) => c.type === "text")?.text || "";
	if (!output) return theme.fg("muted", "\nNo results found.");

	const lines = output.split("\n");
	return `\n${lines.map((line) => theme.fg("toolOutput", line)).join("\n")}`;
}

export function createWebSearchToolDefinition(): ToolDefinition<
	typeof webSearchSchema,
	WebSearchToolDetails | undefined
> {
	return {
		name: "web_search",
		label: "web_search",
		description: "Search the web for information using DuckDuckGo. Returns snippets and URLs.",
		promptSnippet: "Search the web for information",
		parameters: webSearchSchema,
		async execute(_toolCallId, { query }, signal) {
			if (signal?.aborted) throw new Error("Operation aborted");

			try {
				const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
				const response = await fetch(url, {
					headers: {
						"User-Agent":
							"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
					},
					signal,
				});

				if (!response.ok) {
					throw new Error(`Search failed with status ${response.status}`);
				}

				const html = await response.text();

				// Basic scraping logic for DDG HTML version
				const results: Array<{ title: string; snippet: string; url: string }> = [];
				const resultRegex = /<div class="result__body">([\s\S]*?)<\/div>/g;
				let match: RegExpExecArray | null = resultRegex.exec(html);

				while (match !== null && results.length < 8) {
					const body = match[1];
					const titleMatch = /<a class="result__a"[\s\S]*?>([\s\S]*?)<\/a>/.exec(body);
					const snippetMatch = /<a class="result__snippet"[\s\S]*?>([\s\S]*?)<\/a>/.exec(body);
					const urlMatch = /<a class="result__url"[\s\S]*?>([\s\S]*?)<\/a>/.exec(body);

					if (titleMatch && snippetMatch) {
						const title = titleMatch[1].replace(/<[^>]*>?/gm, "").trim();
						const snippet = snippetMatch[1].replace(/<[^>]*>?/gm, "").trim();
						const link = urlMatch ? urlMatch[1].replace(/<[^>]*>?/gm, "").trim() : "";

						results.push({ title, snippet, url: link });
					}

					match = resultRegex.exec(html);
				}

				if (results.length === 0) {
					return {
						content: [{ type: "text", text: "No results found." }],
						details: { query, resultsCount: 0 },
					};
				}

				const formattedOutput = results
					.map((r, i) => `${i + 1}. ${r.title}\n   ${r.snippet}\n   URL: ${r.url}`)
					.join("\n\n");

				return {
					content: [{ type: "text", text: formattedOutput }],
					details: { query, resultsCount: results.length },
				};
			} catch (err) {
				throw new Error(`Web search error: ${err instanceof Error ? err.message : String(err)}`);
			}
		},
		renderCall(args, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatWebSearchCall(args, theme));
			return text;
		},
		renderResult(result, options, theme, context) {
			const text = (context.lastComponent as Text | undefined) ?? new Text("", 0, 0);
			text.setText(formatWebSearchResult(result, options, theme));
			return text;
		},
	};
}

export function createWebSearchTool(): EngineTool<typeof webSearchSchema> {
	return wrapToolDefinition(createWebSearchToolDefinition());
}
