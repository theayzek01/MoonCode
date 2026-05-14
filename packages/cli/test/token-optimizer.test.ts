import { describe, expect, test } from "vitest";
import { optimizePromptText } from "../src/core/token-optimizer.js";

describe("optimizePromptText", () => {
	test("strips ansi escapes and compacts json blocks", () => {
		const input = '\u001b[31mred\u001b[0m\n```json\n{\n  "a": 1,\n  "b": [2, 3]\n}\n```';
		const result = optimizePromptText(input);

		expect(result.wasOptimized).toBe(true);
		expect(result.optimizedText).not.toContain("\u001b[");
		expect(result.optimizedText).toContain('{"a":1,"b":[2,3]}');
	});

	test("limits repeated stack frames", () => {
		const frames = Array.from({ length: 20 }, (_, i) => `    at fn${i} (file:///x.ts:${i}:1)`).join("\n");
		const result = optimizePromptText(`Error: boom\n${frames}`);

		expect(result.optimizedText.match(/^\s*at /gm)?.length).toBeLessThanOrEqual(8);
	});
});
