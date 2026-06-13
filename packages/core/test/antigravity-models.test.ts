import { describe, expect, test } from "vitest";
import { MODELS } from "../src/models.generated.js";
import { buildRequest, needsClaudeThinkingBetaHeader } from "../src/providers/google-antigravity.js";

const antigravityModels = MODELS.antigravity;

describe("Antigravity model metadata", () => {
	test("matches ag-local-bridge public model ids and limits", () => {
		expect(Object.keys(antigravityModels).sort()).toEqual([
			"antigravity-claude-opus-4-6-thinking",
			"antigravity-claude-sonnet-4-6",
			"antigravity-gemini-3-flash",
			"antigravity-gemini-3.1-pro-high",
			"antigravity-gemini-3.1-pro-low",
			"antigravity-gpt-oss-120b",
		]);
		expect(antigravityModels["antigravity-claude-opus-4-6-thinking"].maxTokens).toBe(64000);
		expect(antigravityModels["antigravity-gemini-3-flash"].contextWindow).toBe(1048576);
		expect(antigravityModels["antigravity-gemini-3-flash"].maxTokens).toBeGreaterThanOrEqual(65535);
	});

	test("maps prefixed public ids to model", () => {
		const request = buildRequest(
			antigravityModels["antigravity-claude-sonnet-4-6"],
			{ messages: [{ role: "user", content: [{ type: "text", text: "hi" }], timestamp: Date.now() }] },
			"moon-project",
			{},
			true,
		);

		expect(request.model).toBe("antigravity-claude-sonnet-4-6");
	});

	test("adds Claude thinking beta eligibility for antigravity provider ids", () => {
		expect(needsClaudeThinkingBetaHeader(antigravityModels["antigravity-claude-sonnet-4-6"])).toBe(false);
	});
});

