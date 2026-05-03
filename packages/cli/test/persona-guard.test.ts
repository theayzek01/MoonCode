import { strict as assert } from "node:assert";
import { describe, it } from "node:test";
import { assertNoPersonaLeak } from "../src/core/tools/persona-guard.js";

describe("persona guard", () => {
	it("allows regular code content", () => {
		assert.doesNotThrow(() => assertNoPersonaLeak("export const ok = true;\n"));
	});

	it("blocks persona tokens in content", () => {
		assert.throws(() => assertNoPersonaLeak("// sude burada\nconst x = 1;\n"), /persona guard/i);
	});
});
