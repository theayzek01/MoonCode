// @ts-nocheck

import type { EngineTool } from "moon-engine";
import { Type } from "typebox";
import type { ToolDefinition } from "../extensions/types.js";
import { wrapToolDefinition } from "./tool-definition-wrapper.js";

const dreamKernelSchema = Type.Object({
	task: Type.String({ description: "Current task, failure, or behavior to compile into a reflex" }),
	trace: Type.Optional(Type.String({ description: "Optional compact task trace: tool calls, errors, decisions, outcome" })),
});

function bullet(lines: string[]): string {
	return lines.map((line) => `- ${line}`).join("\n");
}

export function createDreamKernelToolDefinition(): ToolDefinition<typeof dreamKernelSchema, any, any> {
	return {
		name: "dream_kernel",
		label: "dream_kernel",
		description:
			"Compiles task traces into compact reflex behavior. Use instead of RAG when the goal is better future behavior, fewer tokens, or avoiding repeated mistakes.",
		promptSnippet: "DreamKernel reflex compiler: produce behavior programs from task traces, not retrieved text.",
		parameters: dreamKernelSchema,
		async execute(_id, { task, trace }) {
			const normalizedTask = String(task || "").trim();
			const normalizedTrace = String(trace || "").trim();
			const reflex = {
				trigger: normalizedTask.slice(0, 180),
				conditions: [
					"Benzer görev tekrarlandığında önce mevcut durumu doğrula",
					"Araç varsa varsayma, tool listesi ve runtime durumunu kontrol et",
					"Gereksiz bağlam okuma yerine en kısa kanıt zincirini kullan",
				],
				actions: [
					"Önce başarısızlık sınırını çıkar",
					"En küçük uygulanabilir düzeltmeyi yap",
					"Build/test ile doğrula",
					"Sonucu kısa ve kullanıcı dilinde raporla",
				],
				guards: [
					"Kullanıcının açık isteğiyle çelişen refactor yapma",
					"Tool aktif değilse bağlıymış gibi konuşma",
					"Token maliyeti artıyorsa özetle ve daralt",
				],
			};

			return {
				content: [
					{
						type: "text",
						text: [
							"DreamKernel Reflex",
							"",
							`Task: ${normalizedTask || "(empty)"}`,
							normalizedTrace ? `Trace: ${normalizedTrace.slice(0, 1200)}` : "",
							"",
							"Trigger:",
							`- ${reflex.trigger || "general task"}`,
							"",
							"Conditions:",
							bullet(reflex.conditions),
							"",
							"Actions:",
							bullet(reflex.actions),
							"",
							"Guards:",
							bullet(reflex.guards),
						]
							.filter(Boolean)
							.join("\n"),
					},
				],
			};
		},
		renderCall(args, theme) {
			return {
				render: () => [theme.fg("toolTitle", `DreamKernel: ${args?.task ?? "reflex compile"}`)],
				invalidate: () => {},
			};
		},
	};
}

export function createDreamKernelTool(): EngineTool<typeof dreamKernelSchema> {
	return wrapToolDefinition(createDreamKernelToolDefinition());
}
