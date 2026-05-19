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
		expect(antigravityModels["antigravity-gemini-3-flash"].maxTokens).toBe(65536);
		expect(antigravityModels["antigravity-gpt-oss-120b"].contextWindow).toBe(128000);
		expect(antigravityModels["antigravity-gpt-oss-120b"].maxTokens).toBe(16384);
	});

	test("maps prefixed public ids to Cloud Code Assist model ids", () => {
		const request = buildRequest(
			antigravityModels["antigravity-claude-sonnet-4-6"],
			{ messages: [{ role: "user", content: [{ type: "text", text: "hi" }] }] },
			"moon-project",
			{},
			true,
		);

		expect(request.model).toBe("claude-sonnet-4-6");
		expect(request.requestType).toBe("engine");
		expect(request.userAgent).toBe("antigravity");
	});

	test("adds Claude thinking beta eligibility for antigravity provider ids", () => {
		expect(needsClaudeThinkingBetaHeader(antigravityModels["antigravity-claude-sonnet-4-6"])).toBe(true);
		expect(needsClaudeThinkingBetaHeader(antigravityModels["antigravity-gemini-3-flash"])).toBe(false);
	});
});
