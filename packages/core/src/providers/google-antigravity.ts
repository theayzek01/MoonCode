// @ts-nocheck
/**
 * Google Gemini CLI / Antigravity provider.
 * Shared implementation for both google-gemini-cli and google-antigravity providers.
 * Uses the Cloud Code Assist API endpoint to access Gemini and Claude models.
 */

import type { Content, ThinkingConfig } from "@google/genai";
import { calculateCost } from "../models.js";
import type {
	Api,
	AssistantMessage,
	Context,
	Model,
	SimpleStreamOptions,
	StreamFunction,
	StreamOptions,
	TextContent,
	ThinkingBudgets,
	ThinkingContent,
	ThinkingLevel,
	ToolCall,
} from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import { sanitizeSurrogates } from "../utils/sanitize-unicode.js";
import {
	convertMessages,
	convertTools,
	type GoogleThinkingLevel,
	isThinkingPart,
	mapStopReasonString,
	mapToolChoice,
	retainThoughtSignature,
} from "./google-shared.js";
import { buildBaseOptions, clampReasoning } from "./simple-options.js";

export interface GoogleGeminiCliOptions extends StreamOptions {
	toolChoice?: "auto" | "none" | "any";
	/**
	 * Thinking/reasoning configuration.
	 * - Gemini 2.x models: use `budgetTokens` to set the thinking budget
	 * - Gemini 3 models (gemini-3-pro-*, gemini-3-flash-*): use `level` instead
	 *
	 * When using `streamSimple`, this is handled automatically based on the model.
	 */
	thinking?: {
		enabled: boolean;
		/** Thinking budget in tokens. Use for Gemini 2.x models. */
		budgetTokens?: number;
		/** Thinking level. Use for Gemini 3 models (LOW/HIGH for Pro, MINIMAL/LOW/MEDIUM/HIGH for Flash). */
		level?: GoogleThinkingLevel;
	};
	projectId?: string;
}

const DEFAULT_ENDPOINT = "https://cloudcode-pa.googleapis.com";
const ANTIGRAVITY_DCoreLY_ENDPOINT = "https://daily-cloudcode-pa.sandbox.googleapis.com";
const ANTIGRAVITY_AUTOPUSH_ENDPOINT = "https://autopush-cloudcode-pa.sandbox.googleapis.com";
const ANTIGRAVITY_ENDPOINT_FALLBACKS = [
	ANTIGRAVITY_DCoreLY_ENDPOINT,
	ANTIGRAVITY_AUTOPUSH_ENDPOINT,
	DEFAULT_ENDPOINT,
] as const;
// Headers for Gemini CLI (prod endpoint)
const GEMINI_CLI_HEADERS = {
	"User-Agent": "google-cloud-sdk vscode_cloudshelleditor/0.1",
	"X-Goog-Api-Client": "gl-node/22.17.0",
	"Client-Metadata": JSON.stringify({
		ideType: "IDE_UNSPECIFIED",
		platform: "PLATFORM_UNSPECIFIED",
		pluginType: "GEMINI",
	}),
};

// Headers for Antigravity (sandbox endpoint) - requires specific User-Agent
const DEFAULT_ANTIGRAVITY_VERSION = "1.28.0";

function getAntigravityHeaders(requestId?: string) {
	const version = process.env.PI_AI_ANTIGRAVITY_VERSION || DEFAULT_ANTIGRAVITY_VERSION;
	return {
		"User-Agent": `antigravity/${version} darwin/arm64`,
		...(requestId ? { "X-Request-Id": requestId } : {}),
	};
}

// Antigravity system instruction (compact version from CLIProxyAPI).
const _ANTIGRAVITY_SYSTEM_INSTRUCTION =
	"You are Antigravity, a powerful engineic Core coding assistant designed by the Google Deepmind team working on Advanced Engineic Coding." +
	"You are pair programming with a USER to solve their coding task. The task may require creating a new codebase, modifying or debugging an existing codebase, or simply answering a question." +
	"**Absolute paths only**" +
	"**Proactiveness**";

// Counter for generating unique tool call IDs
let toolCallCounter = 0;

// Retry configuration
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000;
const MAX_EMPTY_STREAM_RETRIES = 5;
const EMPTY_STREAM_BASE_DELAY_MS = 1000;
const CLAUDE_THINKING_BETA_HEADER = "thinking-2025-01-31,interleaved-thinking-2025-05-14";

/**
 * Extract retry delay from Gemini error response (in milliseconds).
 * Checks headers first (Retry-After, x-ratelimit-reset, x-ratelimit-reset-after),
 * then parses body patterns like:
 * - "Your quota will reset after 39s"
 * - "Your quota will reset after 18h31m10s"
 * - "Please retry in Xs" or "Please retry in Xms"
 * - "retryDelay": "34.074824224s" (JSON field)
 */
export function extractRetryDelay(errorText: string, response?: Response | Headers): number | undefined {
	const normalizeDelay = (ms: number): number | undefined => (ms > 0 ? Math.ceil(ms + 1000) : undefined);

	const headers = response instanceof Headers ? response : response?.headers;
	if (headers) {
		const retryAfter = headers.get("retry-after");
		if (retryAfter) {
			const retryAfterSeconds = Number(retryAfter);
			if (Number.isFinite(retryAfterSeconds)) {
				const delay = normalizeDelay(retryAfterSeconds * 1000);
				if (delay !== undefined) {
					return delay;
				}
			}
			const retryAfterDate = new Date(retryAfter);
			const retryAfterMs = retryAfterDate.getTime();
			if (!Number.isNaN(retryAfterMs)) {
				const delay = normalizeDelay(retryAfterMs - Date.now());
				if (delay !== undefined) {
					return delay;
				}
			}
		}

		const rateLimitReset = headers.get("x-ratelimit-reset");
		if (rateLimitReset) {
			const resetSeconds = Number.parseInt(rateLimitReset, 10);
			if (!Number.isNaN(resetSeconds)) {
				const delay = normalizeDelay(resetSeconds * 1000 - Date.now());
				if (delay !== undefined) {
					return delay;
				}
			}
		}

		const rateLimitResetAfter = headers.get("x-ratelimit-reset-after");
		if (rateLimitResetAfter) {
			const resetAfterSeconds = Number(rateLimitResetAfter);
			if (Number.isFinite(resetAfterSeconds)) {
				const delay = normalizeDelay(resetAfterSeconds * 1000);
				if (delay !== undefined) {
					return delay;
				}
			}
		}
	}

	// Pattern 1: "Your quota will reset after ..." (formats: "18h31m10s", "10m15s", "6s", "39s")
	const durationMatch = errorText.match(/reset after (?:(\d+)h)?(?:(\d+)m)?(\d+(?:\.\d+)?)s/i);
	if (durationMatch) {
		const hours = durationMatch[1] ? parseInt(durationMatch[1], 10) : 0;
		const minutes = durationMatch[2] ? parseInt(durationMatch[2], 10) : 0;
		const seconds = parseFloat(durationMatch[3]);
		if (!Number.isNaN(seconds)) {
			const totalMs = ((hours * 60 + minutes) * 60 + seconds) * 1000;
			const delay = normalizeDelay(totalMs);
			if (delay !== undefined) {
				return delay;
			}
		}
	}

	// Pattern 2: "Please retry in X[ms|s]"
	const retryInMatch = errorText.match(/Please retry in ([0-9.]+)(ms|s)/i);
	if (retryInMatch?.[1]) {
		const value = parseFloat(retryInMatch[1]);
		if (!Number.isNaN(value) && value > 0) {
			const ms = retryInMatch[2].toLowerCase() === "ms" ? value : value * 1000;
			const delay = normalizeDelay(ms);
			if (delay !== undefined) {
				return delay;
			}
		}
	}

	// Pattern 3: "retryDelay": "34.074824224s" (JSON field in error details)
	const retryDelayMatch = errorText.match(/"retryDelay":\s*"([0-9.]+)(ms|s)"/i);
	if (retryDelayMatch?.[1]) {
		const value = parseFloat(retryDelayMatch[1]);
		if (!Number.isNaN(value) && value > 0) {
			const ms = retryDelayMatch[2].toLowerCase() === "ms" ? value : value * 1000;
			const delay = normalizeDelay(ms);
			if (delay !== undefined) {
				return delay;
			}
		}
	}

	return undefined;
}

export function needsClaudeThinkingBetaHeader(model: Model<"google-antigravity">): boolean {
	return false;
}

import { streamOpenAICompletions, streamSimpleOpenAICompletions } from "./openai-completions.js";

export const streamGoogleGeminiCli: StreamFunction<"google-antigravity", any> = (
	model: Model<"google-antigravity">,
	context: Context,
	options?: any,
): AssistantMessageEventStream => {
	const localBridgeModel = {
		...model,
		api: "openai-completions" as const,
		baseUrl: "http://localhost:11435/v1",
	};
	const bridgeOptions = {
		...options,
		apiKey: "local",
	};
	return streamOpenAICompletions(localBridgeModel as any, context, bridgeOptions);
};

export const streamSimpleGoogleGeminiCli: StreamFunction<"google-antigravity", any> = (
	model: Model<"google-antigravity">,
	context: Context,
	options?: any,
): AssistantMessageEventStream => {
	const localBridgeModel = {
		...model,
		api: "openai-completions" as const,
		baseUrl: "http://localhost:11435/v1",
	};
	const bridgeOptions = {
		...options,
		apiKey: "local",
	};
	return streamSimpleOpenAICompletions(localBridgeModel as any, context, bridgeOptions);
};

export function buildRequest(
	model: Model<"google-antigravity">,
	context: Context,
	projectId: string,
	options: any = {},
	isAntigravity = false,
): any {
	return {
		model: model.id,
		messages: [],
	};
}


