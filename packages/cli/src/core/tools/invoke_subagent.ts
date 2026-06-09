// @ts-nocheck

import type { EngineTool } from "moon-engine";
import { Engine } from "moon-engine";
import { type Static, Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { createCodingTools } from "./index.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const invokeSubagentSchema = Type.Object({
	TaskName: Type.String({ description: "Short human-readable name of the task." }),
	Task: Type.String({ description: "Detailed task description/prompt for the sub-agent." }),
	Context: Type.Optional(Type.String({ description: "Additional context to pass to the sub-agent." })),
});

export type InvokeSubagentInput = Static<typeof invokeSubagentSchema>;

export function createInvokeSubagentToolDefinition(
	cwd: string,
): ToolDefinition<typeof invokeSubagentSchema, undefined, any> {
	return {
		name: "invoke_subagent",
		label: "invoke subagent",
		description:
			"Spawn a new sub-agent to perform a task. The sub-agent runs independently in the background and returns its result.",
		promptSnippet: "Delegate a complex task to a sub-agent",
		parameters: invokeSubagentSchema,
		async execute(_toolCallId, { TaskName, Task, Context }, _signal, onUpdate, ctx) {
			if (!ctx.model) {
				throw new Error("No model available to spawn sub-agent.");
			}

			// Report that the agent has started
			if (onUpdate) {
				onUpdate({
					content: [{ type: "text", text: `[Sub-agent '${TaskName}' spawned. Waiting for completion...]` }],
					details: undefined,
				});
			}

			// Instantiate a new Engine to act as the sub-agent
			const engine = new Engine({
				initialState: {
					model: ctx.model,
					systemPrompt: `You are a MoonCode sub-agent assigned the task: ${TaskName}\n\nTask Details:\n${Task}\n\nContext:\n${Context ?? "None"}\n\n${ctx.getSystemPrompt()}`,
					tools: createCodingTools(cwd),
				},
			});

			try {
				await engine.prompt(Task);

				// Await completion
				await engine.waitForIdle();

				const finalMessages = engine.state.messages;
				const assistantMessages = finalMessages.filter((m) => m.role === "assistant");
				const finalOutput =
					assistantMessages.length > 0
						? assistantMessages[assistantMessages.length - 1].content
								.filter((c) => c.type === "text")
								.map((c) => c.text)
								.join("\n")
						: "Task completed with no text output.";

				return {
					content: [{ type: "text", text: `Sub-agent completed task '${TaskName}'.\n\nResult:\n${finalOutput}` }],
					details: undefined,
				};
			} catch (err: any) {
				throw new Error(`Sub-agent failed: ${err.message}`);
			}
		},
	};
}

export function createInvokeSubagentTool(cwd: string): EngineTool<typeof invokeSubagentSchema> {
	return wrapToolDefinition(createInvokeSubagentToolDefinition(cwd));
}
