import { describe, expect, it } from "vitest";
import { assertNoPersonaLeak } from "../src/core/tools/persona-guard.js";

describe("persona guard", () => {
	it("allows regular code content", () => {
		expect(() => assertNoPersonaLeak("export const ok = true;\n")).not.toThrow();
	});

	it("blocks persona tokens in content", () => {
		expect(() => assertNoPersonaLeak("// sude burada\nconst x = 1;\n")).toThrow(/persona guard/i);
	});
});
