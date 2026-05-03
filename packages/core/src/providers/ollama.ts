// @ts-nocheck
import type { SimpleStreamOptions, StreamFunction } from "../types.js";
import {
	type OpenAICompletionsOptions,
	streamOpenAICompletions,
	streamSimpleOpenAICompletions,
} from "./openai-completions.js";

/**
 * Ollama provider.
 * Ollama is OpenAI-compatible but defaults to a local endpoint.
 */
export const streamOllama: StreamFunction<"openai-completions", OpenAICompletionsOptions> = (
	model,
	context,
	options,
) => {
	// Default to local Ollama if no baseUrl is set
	if (!model.baseUrl) {
		(model as any).baseUrl = "http://localhost:11434/v1";
	}
	return streamOpenAICompletions(model, context, options);
};

export const streamSimpleOllama: StreamFunction<"openai-completions", SimpleStreamOptions> = (
	model,
	context,
	options,
) => {
	if (!model.baseUrl) {
		(model as any).baseUrl = "http://localhost:11434/v1";
	}
	return streamSimpleOpenAICompletions(model, context, options);
};
