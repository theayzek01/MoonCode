// @ts-nocheck
/**
 * Ollama Vision API wrapper.
 * /api/generate endpoint'i üzerinden görüntü + prompt gönderir.
 */

export interface OllamaVisionOptions {
	temperature?: number;
	num_predict?: number;
	top_p?: number;
	format?: "json";
}

export interface OllamaGenerateResponse {
	model: string;
	response: string;
	done: boolean;
	total_duration?: number;
	eval_count?: number;
}

export class OllamaVision {
	private model: string;
	private baseUrl: string;

	constructor(model = "qwen2.5-vl:7b", baseUrl = "http://localhost:11434") {
		this.model = model;
		this.baseUrl = baseUrl.replace(/\/$/, "");
	}

	/**
	 * Ollama'ya resim + prompt gönder, ham text dön.
	 * Streaming'i bekliyoruz (done: true olana kadar).
	 */
	async generate(prompt: string, imageBase64: string, options?: OllamaVisionOptions): Promise<string> {
		const body: Record<string, unknown> = {
			model: this.model,
			prompt,
			images: [imageBase64],
			stream: false,
			options: {
				temperature: options?.temperature ?? 0.1,
				num_predict: options?.num_predict ?? 4096,
				top_p: options?.top_p ?? 0.9,
			},
		};

		if (options?.format) {
			body.format = options.format;
		}

		const response = await fetch(`${this.baseUrl}/api/generate`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body),
		});

		if (!response.ok) {
			const errorText = await response.text().catch(() => "bilinmeyen hata");
			throw new Error(`Ollama API hatasi (${response.status}): ${errorText}`);
		}

		const data = (await response.json()) as OllamaGenerateResponse;
		return data.response;
	}

	/**
	 * JSON formatında çıktı al ve parse et.
	 * Ollama bazen json'u markdown code block'a sarıyor, onu da handle ediyoruz.
	 */
	async generateJSON<T = unknown>(
		prompt: string,
		imageBase64: string,
		options?: Omit<OllamaVisionOptions, "format">,
	): Promise<T> {
		const raw = await this.generate(prompt, imageBase64, { ...options, format: "json" });
		return this.parseJSON<T>(raw);
	}

	/**
	 * Modelin çalışıp çalışmadığını kontrol et.
	 */
	async healthCheck(): Promise<boolean> {
		try {
			const res = await fetch(`${this.baseUrl}/api/tags`);
			if (!res.ok) return false;
			const data = (await res.json()) as { models?: Array<{ name: string }> };
			const models = data.models ?? [];
			return models.some((m) => m.name.startsWith(this.model.split(":")[0]));
		} catch {
			return false;
		}
	}

	/**
	 * Mevcut modeli değiştir.
	 */
	setModel(model: string): void {
		this.model = model;
	}

	getModel(): string {
		return this.model;
	}

	// json parse - bazen model ```json ... ``` şeklinde sarıyor
	private parseJSON<T>(raw: string): T {
		let cleaned = raw.trim();

		// markdown code block'u soy
		const codeBlockMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
		if (codeBlockMatch) {
			cleaned = codeBlockMatch[1].trim();
		}

		try {
			return JSON.parse(cleaned) as T;
		} catch {
			// son çare: ilk [ veya { ile başlayan yeri bul
			const startIdx = Math.min(
				cleaned.indexOf("[") === -1 ? Infinity : cleaned.indexOf("["),
				cleaned.indexOf("{") === -1 ? Infinity : cleaned.indexOf("{"),
			);
			if (startIdx !== Infinity) {
				const bracket = cleaned[startIdx];
				const closeBracket = bracket === "[" ? "]" : "}";
				const endIdx = cleaned.lastIndexOf(closeBracket);
				if (endIdx > startIdx) {
					return JSON.parse(cleaned.slice(startIdx, endIdx + 1)) as T;
				}
			}
			throw new Error(`Ollama ciktisi JSON olarak parse edilemedi: ${raw.slice(0, 200)}`);
		}
	}
}
