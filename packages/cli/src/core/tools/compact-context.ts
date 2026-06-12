import type { EngineSession } from "../engine-session.js";
import type { Tool } from "./index.js";

export function getCompactContextTool(session: EngineSession): Tool {
	return {
		name: "compact_context",
		label: "Sıkıştır",
		description:
			"Sıkıştırma aracı. Eğer context çok büyüdüyse veya geçmiş mesajlar ilgisizleştiyse eski mesajları tek bir özete sıkıştırarak token kullanımını azaltır. Sadece belirgin bir token baskısı varsa çağırın.",
		parameters: {
			type: "object",
			properties: {
				instructions: {
					type: "string",
					description:
						"İsteğe bağlı olarak, sıkıştırma (compaction) sırasında korunması gereken özel talimatlar (örneğin 'Şu dosyanın yolunu kesinlikle unutma').",
				},
			},
		},
		execute: async (toolCallId: string, params: unknown, signal?: AbortSignal) => {
			if (!signal) {
				return {
					content: [{ type: "text", text: "Hata: İptal sinyali (signal) eksik." }],
					details: { error: true },
				};
			}
			try {
				const typedParams = params as { instructions?: string };
				const result = await session.compact(typedParams.instructions);
				return {
					content: [
						{
							type: "text",
							text: `Sıkıştırma tamamlandı. Orijinal token: ${result.tokensBefore}. Yeni özet eklendi:\n${result.summary}`,
						},
					],
					details: result,
				};
			} catch (err: any) {
				return {
					content: [{ type: "text", text: `Sıkıştırma başarısız oldu: ${err.message}` }],
					details: { error: err.message },
				};
			}
		},
	};
}
