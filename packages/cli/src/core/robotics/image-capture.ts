// @ts-nocheck
/**
 * Görüntü yakalama - dosya, URL, veya webcam'den.
 */

import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname, resolve } from "node:path";

const SUPPORTED_FORMATS = new Set([".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"]);

export class ImageCapture {
	/**
	 * Dosyadan oku, base64 olarak döndür.
	 */
	fromFile(filePath: string): Buffer {
		const resolved = resolve(filePath);
		if (!existsSync(resolved)) {
			throw new Error(`Dosya bulunamadi: ${resolved}`);
		}
		const ext = extname(resolved).toLowerCase();
		if (!SUPPORTED_FORMATS.has(ext)) {
			throw new Error(`Desteklenmeyen format: ${ext}. Desteklenen: ${[...SUPPORTED_FORMATS].join(", ")}`);
		}
		return readFileSync(resolved);
	}

	/**
	 * URL'den indir.
	 */
	async fromUrl(url: string): Promise<Buffer> {
		const res = await fetch(url);
		if (!res.ok) {
			throw new Error(`Goruntu indirilemedi (${res.status}): ${url}`);
		}
		const arrayBuffer = await res.arrayBuffer();
		return Buffer.from(arrayBuffer);
	}

	/**
	 * Webcam'den tek kare yakala (ffmpeg gerekli).
	 * Windows: dshow, Linux: v4l2, Mac: avfoundation
	 */
	fromWebcam(device?: string): Buffer {
		const platform = process.platform;
		const tmpPath = resolve(process.cwd(), ".MoonCode-capture-tmp.jpg");

		let cmd: string;
		if (platform === "win32") {
			const dev = device || "video=Integrated Camera";
			cmd = `ffmpeg -y -f dshow -i "${dev}" -frames:v 1 -q:v 2 "${tmpPath}" 2>nul`;
		} else if (platform === "darwin") {
			const dev = device || "0";
			cmd = `ffmpeg -y -f avfoundation -i "${dev}" -frames:v 1 -q:v 2 "${tmpPath}" 2>/dev/null`;
		} else {
			const dev = device || "/dev/video0";
			cmd = `ffmpeg -y -f v4l2 -i "${dev}" -frames:v 1 -q:v 2 "${tmpPath}" 2>/dev/null`;
		}

		try {
			execSync(cmd, { timeout: 10000 });
		} catch {
			throw new Error("Webcam'den goruntu alinamadi. ffmpeg yuklu mu? Cihaz adi dogru mu?");
		}

		if (!existsSync(tmpPath)) {
			throw new Error("Webcam capture basarisiz: dosya olusturulamadi");
		}

		const buf = readFileSync(tmpPath);
		// temp dosyayı sil
		try {
			const { unlinkSync } = require("node:fs");
			unlinkSync(tmpPath);
		} catch {
			// olsun
		}
		return buf;
	}

	/**
	 * Buffer'ı base64'e çevir (Ollama'ya göndermek için).
	 */
	toBase64(imageBytes: Buffer): string {
		return imageBytes.toString("base64");
	}

	/**
	 * MIME type tahmin et.
	 */
	getMimeType(filePath: string): string {
		const ext = extname(filePath).toLowerCase();
		const mimeMap: Record<string, string> = {
			".jpg": "image/jpeg",
			".jpeg": "image/jpeg",
			".png": "image/png",
			".webp": "image/webp",
			".bmp": "image/bmp",
			".gif": "image/gif",
		};
		return mimeMap[ext] || "image/jpeg";
	}
}
