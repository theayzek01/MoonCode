import { describe, expect, test } from "vitest";
import { MODELS } from "../src/models.generated.js";
import { buildRequest, needsClaudeThinkingBetaHeader } from "../src/providers/google-antigravity.js";

const antigravityModels = MODELS.antigravity;

describe("Antigravity model metadata", () => {
	test("matches ag-local-bridge public model ids and limits", () => {
		expect(Object.keys(antigravityModels).sort()).toEqual([
			"antigravity-claude-opus-4-6-thinking",
			"antigravity-claude-sonnet-4-6",
			"antigravity-gemini-3.1-pro-high",
			"antigravity-gemini-3.1-pro-low",
			"antigravity-gemini-3.5-flash-low",
		]);
		expect(antigravityModels["antigravity-claude-opus-4-6-thinking"].maxTokens).toBe(64000);
		expect(antigravityModels["antigravity-gemini-3.5-flash-low"].contextWindow).toBe(1048576);
		expect(antigravityModels["antigravity-gemini-3.5-flash-low"].maxTokens).toBeGreaterThanOrEqual(65535);
	});

	test("maps prefixed public ids to Cloud Code Assist model ids", () => {
		const request = buildRequest(
			antigravityModels["antigravity-claude-sonnet-4-6"],
			{ messages: [{ role: "user", content: [{ type: "text", text: "hi" }], timestamp: Date.now() }] },
			"moon-project",
			{},
			true,
		);

		expect(request.model).toBe("claude-sonnet-4-6");
		expect(request.requestType).toBe("engine");
		expect(request.userAgent).toBe("antigravity");
	});

	test("maps gemini 3.1 pro high and low to their correct cloud code assist ids", () => {
		const requestHigh = buildRequest(
			antigravityModels["antigravity-gemini-3.1-pro-high"],
			{ messages: [{ role: "user", content: [{ type: "text", text: "hi" }], timestamp: Date.now() }] },
			"moon-project",
			{},
			true,
		);
		expect(requestHigh.model).toBe("gemini-3.1-pro-high");

		const requestLow = buildRequest(
			antigravityModels["antigravity-gemini-3.1-pro-low"],
			{ messages: [{ role: "user", content: [{ type: "text", text: "hi" }], timestamp: Date.now() }] },
			"moon-project",
			{},
			true,
		);
		expect(requestLow.model).toBe("gemini-3.1-pro-low");
	});

	test("adds Claude thinking beta eligibility for antigravity provider ids", () => {
		expect(needsClaudeThinkingBetaHeader(antigravityModels["antigravity-claude-sonnet-4-6"])).toBe(true);
		expect(needsClaudeThinkingBetaHeader(antigravityModels["antigravity-gemini-3.5-flash-low"])).toBe(false);
	});
});
