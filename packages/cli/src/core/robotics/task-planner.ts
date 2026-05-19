// @ts-nocheck
/**
 * Görev planlama - doğal dil komutunu robot fonksiyon çağrılarına dönüştürür.
 */

import { existsSync, readFileSync } from "node:fs";
import type { OllamaVision } from "./ollama-vision.js";
import { fillPrompt, ROBOTICS_PROMPTS } from "./prompts.js";

// ============================================================================
// Types
// ============================================================================

export interface RobotFunction {
	name: string;
	description: string;
	parameters: Array<{
		name: string;
		type: "number" | "boolean" | "string";
		description: string;
	}>;
}

export interface PlannedAction {
	function: string;
	args: unknown[];
	reasoning?: string;
}

export interface TaskPlanResult {
	actions: PlannedAction[];
	rawResponse: string;
	durationMs: number;
}

// ============================================================================
// TaskPlanner
// ============================================================================

export class TaskPlanner {
	private vision: OllamaVision;
	private functions: RobotFunction[];

	constructor(vision: OllamaVision, functions: RobotFunction[] = []) {
		this.vision = vision;
		this.functions = functions;
	}

	/**
	 * Doğal dil komutunu robot API çağrılarına dönüştür.
	 * imageBase64 opsiyonel - sahne görseli varsa daha iyi plan yapıyor.
	 */
	async planTask(instruction: string, imageBase64?: string): Promise<TaskPlanResult> {
		const start = Date.now();

		if (this.functions.length === 0) {
			throw new Error("Robot fonksiyonlari tanimlanmamis. /robotics functions <path> ile yukleyin.");
		}

		const functionDefinitions = this.formatFunctionDefs();
		const prompt = fillPrompt(ROBOTICS_PROMPTS.TASK_PLAN, {
			functionDefinitions,
			instruction,
		});

		let rawResponse: string;
		if (imageBase64) {
			rawResponse = await this.vision.generate(prompt, imageBase64, { temperature: 0.3 });
		} else {
			// görüntü yoksa 1x1 siyah piksel gönder (Ollama vision model görüntü ister)
			const blankPixel =
				"iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
			rawResponse = await this.vision.generate(prompt, blankPixel, { temperature: 0.3 });
		}

		const actions = this.parseActionResponse(rawResponse);

		return {
			actions,
			rawResponse,
			durationMs: Date.now() - start,
		};
	}

	/**
	 * Fonksiyon listesini güncelle.
	 */
	setFunctions(functions: RobotFunction[]): void {
		this.functions = functions;
	}

	getFunctions(): RobotFunction[] {
		return this.functions;
	}

	/**
	 * JSON dosyasından fonksiyon tanımlarını yükle.
	 * Format: { functions: RobotFunction[] }
	 * veya direkt RobotFunction[]
	 */
	static loadFunctions(filePath: string): RobotFunction[] {
		if (!existsSync(filePath)) {
			throw new Error(`Robot fonksiyon dosyasi bulunamadi: ${filePath}`);
		}

		const raw = readFileSync(filePath, "utf-8");
		const parsed = JSON.parse(raw);

		const arr = Array.isArray(parsed) ? parsed : (parsed.functions ?? []);

		if (!Array.isArray(arr) || arr.length === 0) {
			throw new Error("Gecersiz robot fonksiyon dosyasi formati");
		}

		return arr as RobotFunction[];
	}

	/**
	 * Örnek mock robot API'si üretir (test için).
	 */
	static mockPickAndPlaceFunctions(): RobotFunction[] {
		return [
			{
				name: "move",
				description: "Kolu belirtilen koordinata taşır",
				parameters: [
					{ name: "x", type: "number", description: "X koordinatı (normalize 0-1000)" },
					{ name: "y", type: "number", description: "Y koordinatı (normalize 0-1000)" },
					{
						name: "high",
						type: "boolean",
						description: "true = kolunu kaldır (engel aşma), false = yüzeye indir",
					},
				],
			},
			{
				name: "setGripperState",
				description: "Gripper durumunu ayarlar",
				parameters: [{ name: "opened", type: "boolean", description: "true = aç, false = kapat" }],
			},
			{
				name: "returnToOrigin",
				description: "Robotu başlangıç pozisyonuna döndürür",
				parameters: [],
			},
		];
	}

	// ===== Private =====

	private formatFunctionDefs(): string {
		return this.functions
			.map((fn) => {
				const params = fn.parameters.map((p) => `  ${p.name} (${p.type}): ${p.description}`).join("\n");
				return `def ${fn.name}(${fn.parameters.map((p) => p.name).join(", ")}):\n  # ${fn.description}\n${params}`;
			})
			.join("\n\n");
	}

	private parseActionResponse(raw: string): PlannedAction[] {
		let cleaned = raw.trim();

		// JSON array'i bul
		const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
		if (codeBlockMatch) cleaned = codeBlockMatch[1].trim();

		// [{ ... }] kısmını çek
		const startIdx = cleaned.indexOf("[");
		const endIdx = cleaned.lastIndexOf("]");
		if (startIdx === -1 || endIdx === -1) return [];

		try {
			const arr = JSON.parse(cleaned.slice(startIdx, endIdx + 1)) as Array<{
				function?: string;
				args?: unknown[];
				reasoning?: string;
			}>;

			return arr
				.filter((item) => item.function)
				.map((item) => ({
					function: item.function!,
					args: item.args ?? [],
					reasoning: item.reasoning,
				}));
		} catch {
			return [];
		}
	}
}
