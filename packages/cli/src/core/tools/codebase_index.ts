// @ts-nocheck

import type { EngineTool } from "moon-engine";
import { Type } from "typebox";
import { buildIndex } from "../codebase-index/index.js";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const codebaseIndexSchema = Type.Object({
	force: Type.Optional(Type.Boolean({ description: "Yeniden dizin oluşturmaya zorla (Force re-indexing)" })),
});

export function createCodebaseIndexToolDefinition(cwd: string): ToolDefinition<typeof codebaseIndexSchema, any, any> {
	return {
		name: "codebase_index",
		label: "codebase_index",
		description:
			"Indexes the codebase for semantic search / RAG. Call this tool when codebase files have changed significantly and you want to refresh the index.",
		promptSnippet: "Index the codebase to update search capabilities",
		parameters: codebaseIndexSchema,
		async execute(_id, { force }, signal) {
			if (signal?.aborted) throw new Error("aborted");
			const index = await buildIndex(cwd, force === true);
			return {
				content: [
					{
						type: "text",
						text: `Codebase indexed successfully: ${index.fileCount} files, ${index.chunkCount} chunks.`,
					},
				],
			};
		},
		renderCall(args, theme) {
			return {
				render: () => [theme.fg("toolTitle", `Codebase Indexing (force=${!!args?.force})`)],
				invalidate: () => {},
			};
		},
	};
}

export function createCodebaseIndexTool(cwd: string): EngineTool<typeof codebaseIndexSchema> {
	return wrapToolDefinition(createCodebaseIndexToolDefinition(cwd));
}
