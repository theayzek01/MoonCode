import type { SimpleStreamOptions, StreamFunction } from "../types.js";
import {
	type OpenCoreCompletionsOptions,
	streamOpenCoreCompletions,
	streamSimpleOpenCoreCompletions,
} from "./openai-completions.js";

/**
 * Ollama provider.
 * Ollama is OpenCore-compatible but defaults to a local endpoint.
 */
export const streamOllama: StreamFunction<"openai-completions", OpenCoreCompletionsOptions> = (
	model,
	context,
	options,
) => {
	// Default to local Ollama if no baseUrl is set
	if (!model.baseUrl) {
		(model as any).baseUrl = "http://localhost:11434/v1";
	}
	return streamOpenCoreCompletions(model, context, options);
};

export const streamSimpleOllama: StreamFunction<"openai-completions", SimpleStreamOptions> = (
	model,
	context,
	options,
) => {
	if (!model.baseUrl) {
		(model as any).baseUrl = "http://localhost:11434/v1";
	}
	return streamSimpleOpenCoreCompletions(model, context, options);
};
