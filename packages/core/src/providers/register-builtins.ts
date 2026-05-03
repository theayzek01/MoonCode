import { clearApiProviders, registerApiProvider } from "../api-registry.js";
import type {
	Api,
	AssistantMessage,
	AssistantMessageEvent,
	Context,
	Model,
	SimpleStreamOptions,
	StreamFunction,
	StreamOptions,
} from "../types.js";
import { AssistantMessageEventStream } from "../utils/event-stream.js";
import type { BedrockOptions } from "./amazon-bedrock.js";
import type { AnthropicOptions } from "./anthropic.js";
import type { AzureOpenCoreResponsesOptions } from "./azure-openai-responses.js";
import type { GoogleOptions } from "./google.js";
import type { GoogleGeminiCliOptions } from "./google-antigravity.js";
import type { GoogleVertexOptions } from "./google-vertex.js";
import type { MistralOptions } from "./mistral.js";
import type { OpenCoreCodexResponsesOptions } from "./openai-codex-responses.js";
import type { OpenCoreCompletionsOptions } from "./openai-completions.js";
import type { OpenCoreResponsesOptions } from "./openai-responses.js";

interface LazyProviderModule<
	TApi extends Api,
	TOptions extends StreamOptions,
	TSimpleOptions extends SimpleStreamOptions,
> {
	stream: (model: Model<TApi>, context: Context, options?: TOptions) => AsyncIterable<AssistantMessageEvent>;
	streamSimple: (
		model: Model<TApi>,
		context: Context,
		options?: TSimpleOptions,
	) => AsyncIterable<AssistantMessageEvent>;
}

interface AnthropicProviderModule {
	streamAnthropic: StreamFunction<"anthropic-messages", AnthropicOptions>;
	streamSimpleAnthropic: StreamFunction<"anthropic-messages", SimpleStreamOptions>;
}

interface AzureOpenCoreResponsesProviderModule {
	streamAzureOpenCoreResponses: StreamFunction<"azure-openai-responses", AzureOpenCoreResponsesOptions>;
	streamSimpleAzureOpenCoreResponses: StreamFunction<"azure-openai-responses", SimpleStreamOptions>;
}

interface GoogleProviderModule {
	streamGoogle: StreamFunction<"google-generative-ai", GoogleOptions>;
	streamSimpleGoogle: StreamFunction<"google-generative-ai", SimpleStreamOptions>;
}

interface GoogleVertexProviderModule {
	streamGoogleVertex: StreamFunction<"google-vertex", GoogleVertexOptions>;
	streamSimpleGoogleVertex: StreamFunction<"google-vertex", SimpleStreamOptions>;
}

interface MistralProviderModule {
	streamMistral: StreamFunction<"mistral-conversations", MistralOptions>;
	streamSimpleMistral: StreamFunction<"mistral-conversations", SimpleStreamOptions>;
}

interface OpenCoreCodexResponsesProviderModule {
	streamOpenCoreCodexResponses: StreamFunction<"openai-codex-responses", OpenCoreCodexResponsesOptions>;
	streamSimpleOpenCoreCodexResponses: StreamFunction<"openai-codex-responses", SimpleStreamOptions>;
}

interface OpenCoreCompletionsProviderModule {
	streamOpenCoreCompletions: StreamFunction<"openai-completions", OpenCoreCompletionsOptions>;
	streamSimpleOpenCoreCompletions: StreamFunction<"openai-completions", SimpleStreamOptions>;
}

interface OpenCoreResponsesProviderModule {
	streamOpenCoreResponses: StreamFunction<"openai-responses", OpenCoreResponsesOptions>;
	streamSimpleOpenCoreResponses: StreamFunction<"openai-responses", SimpleStreamOptions>;
}

interface BedrockProviderModule {
	streamBedrock: (
		model: Model<"bedrock-converse-stream">,
		context: Context,
		options?: BedrockOptions,
	) => AsyncIterable<AssistantMessageEvent>;
	streamSimpleBedrock: (
		model: Model<"bedrock-converse-stream">,
		context: Context,
		options?: SimpleStreamOptions,
	) => AsyncIterable<AssistantMessageEvent>;
}

const importNodeOnlyProvider = (specifier: string): Promise<unknown> => import(specifier);

let anthropicProviderModulePromise:
	| Promise<LazyProviderModule<"anthropic-messages", AnthropicOptions, SimpleStreamOptions>>
	| undefined;
let azureOpenCoreResponsesProviderModulePromise:
	| Promise<LazyProviderModule<"azure-openai-responses", AzureOpenCoreResponsesOptions, SimpleStreamOptions>>
	| undefined;
let googleProviderModulePromise:
	| Promise<LazyProviderModule<"google-generative-ai", GoogleOptions, SimpleStreamOptions>>
	| undefined;
let googleVertexProviderModulePromise:
	| Promise<LazyProviderModule<"google-vertex", GoogleVertexOptions, SimpleStreamOptions>>
	| undefined;
let mistralProviderModulePromise:
	| Promise<LazyProviderModule<"mistral-conversations", MistralOptions, SimpleStreamOptions>>
	| undefined;
let openCoreCodexResponsesProviderModulePromise:
	| Promise<LazyProviderModule<"openai-codex-responses", OpenCoreCodexResponsesOptions, SimpleStreamOptions>>
	| undefined;
let openCoreCompletionsProviderModulePromise:
	| Promise<LazyProviderModule<"openai-completions", OpenCoreCompletionsOptions, SimpleStreamOptions>>
	| undefined;
let openCoreResponsesProviderModulePromise:
	| Promise<LazyProviderModule<"openai-responses", OpenCoreResponsesOptions, SimpleStreamOptions>>
	| undefined;
let googleAntigravityProviderModulePromise:
	| Promise<LazyProviderModule<"google-antigravity", GoogleGeminiCliOptions, SimpleStreamOptions>>
	| undefined;
let bedrockProviderModuleOverride:
	| LazyProviderModule<"bedrock-converse-stream", BedrockOptions, SimpleStreamOptions>
	| undefined;
let bedrockProviderModulePromise:
	| Promise<LazyProviderModule<"bedrock-converse-stream", BedrockOptions, SimpleStreamOptions>>
	| undefined;

export function setBedrockProviderModule(module: BedrockProviderModule): void {
	bedrockProviderModuleOverride = {
		stream: module.streamBedrock,
		streamSimple: module.streamSimpleBedrock,
	};
}

function forwardStream(target: AssistantMessageEventStream, source: AsyncIterable<AssistantMessageEvent>): void {
	(async () => {
		for await (const event of source) {
			target.push(event);
		}
		target.end();
	})();
}

function createLazyLoadErrorMessage<TApi extends Api>(model: Model<TApi>, error: unknown): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			totalTokens: 0,
			cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
		},
		stopReason: "error",
		errorMessage: error instanceof Error ? error.message : String(error),
		timestamp: Date.now(),
	};
}

function createLazyStream<TApi extends Api, TOptions extends StreamOptions, TSimpleOptions extends SimpleStreamOptions>(
	loadModule: () => Promise<LazyProviderModule<TApi, TOptions, TSimpleOptions>>,
): StreamFunction<TApi, TOptions> {
	return (model, context, options) => {
		const outer = new AssistantMessageEventStream();

		loadModule()
			.then((module) => {
				const inner = module.stream(model, context, options);
				forwardStream(outer, inner);
			})
			.catch((error) => {
				const message = createLazyLoadErrorMessage(model, error);
				outer.push({ type: "error", reason: "error", error: message });
				outer.end(message);
			});

		return outer;
	};
}

function createLazySimpleStream<
	TApi extends Api,
	TOptions extends StreamOptions,
	TSimpleOptions extends SimpleStreamOptions,
>(loadModule: () => Promise<LazyProviderModule<TApi, TOptions, TSimpleOptions>>): StreamFunction<TApi, TSimpleOptions> {
	return (model, context, options) => {
		const outer = new AssistantMessageEventStream();

		loadModule()
			.then((module) => {
				const inner = module.streamSimple(model, context, options);
				forwardStream(outer, inner);
			})
			.catch((error) => {
				const message = createLazyLoadErrorMessage(model, error);
				outer.push({ type: "error", reason: "error", error: message });
				outer.end(message);
			});

		return outer;
	};
}

function loadAnthropicProviderModule(): Promise<
	LazyProviderModule<"anthropic-messages", AnthropicOptions, SimpleStreamOptions>
> {
	anthropicProviderModulePromise ||= import("./anthropic.js").then((module) => {
		const provider = module as AnthropicProviderModule;
		return {
			stream: provider.streamAnthropic,
			streamSimple: provider.streamSimpleAnthropic,
		};
	});
	return anthropicProviderModulePromise;
}

function loadAzureOpenCoreResponsesProviderModule(): Promise<
	LazyProviderModule<"azure-openai-responses", AzureOpenCoreResponsesOptions, SimpleStreamOptions>
> {
	azureOpenCoreResponsesProviderModulePromise ||= import("./azure-openai-responses.js").then((module) => {
		const provider = module as AzureOpenCoreResponsesProviderModule;
		return {
			stream: provider.streamAzureOpenCoreResponses,
			streamSimple: provider.streamSimpleAzureOpenCoreResponses,
		};
	});
	return azureOpenCoreResponsesProviderModulePromise;
}

function loadGoogleProviderModule(): Promise<
	LazyProviderModule<"google-generative-ai", GoogleOptions, SimpleStreamOptions>
> {
	googleProviderModulePromise ||= import("./google.js").then((module) => {
		const provider = module as GoogleProviderModule;
		return {
			stream: provider.streamGoogle,
			streamSimple: provider.streamSimpleGoogle,
		};
	});
	return googleProviderModulePromise;
}

function loadGoogleVertexProviderModule(): Promise<
	LazyProviderModule<"google-vertex", GoogleVertexOptions, SimpleStreamOptions>
> {
	googleVertexProviderModulePromise ||= import("./google-vertex.js").then((module) => {
		const provider = module as GoogleVertexProviderModule;
		return {
			stream: provider.streamGoogleVertex,
			streamSimple: provider.streamSimpleGoogleVertex,
		};
	});
	return googleVertexProviderModulePromise;
}

function loadMistralProviderModule(): Promise<
	LazyProviderModule<"mistral-conversations", MistralOptions, SimpleStreamOptions>
> {
	mistralProviderModulePromise ||= import("./mistral.js").then((module) => {
		const provider = module as MistralProviderModule;
		return {
			stream: provider.streamMistral,
			streamSimple: provider.streamSimpleMistral,
		};
	});
	return mistralProviderModulePromise;
}

function loadOpenCoreCodexResponsesProviderModule(): Promise<
	LazyProviderModule<"openai-codex-responses", OpenCoreCodexResponsesOptions, SimpleStreamOptions>
> {
	openCoreCodexResponsesProviderModulePromise ||= import("./openai-codex-responses.js").then((module) => {
		const provider = module as OpenCoreCodexResponsesProviderModule;
		return {
			stream: provider.streamOpenCoreCodexResponses,
			streamSimple: provider.streamSimpleOpenCoreCodexResponses,
		};
	});
	return openCoreCodexResponsesProviderModulePromise;
}

function loadOpenCoreCompletionsProviderModule(): Promise<
	LazyProviderModule<"openai-completions", OpenCoreCompletionsOptions, SimpleStreamOptions>
> {
	openCoreCompletionsProviderModulePromise ||= import("./openai-completions.js").then((module) => {
		const provider = module as OpenCoreCompletionsProviderModule;
		return {
			stream: provider.streamOpenCoreCompletions,
			streamSimple: provider.streamSimpleOpenCoreCompletions,
		};
	});
	return openCoreCompletionsProviderModulePromise;
}

function loadOpenCoreResponsesProviderModule(): Promise<
	LazyProviderModule<"openai-responses", OpenCoreResponsesOptions, SimpleStreamOptions>
> {
	openCoreResponsesProviderModulePromise ||= import("./openai-responses.js").then((module) => {
		const provider = module as OpenCoreResponsesProviderModule;
		return {
			stream: provider.streamOpenCoreResponses,
			streamSimple: provider.streamSimpleOpenCoreResponses,
		};
	});
	return openCoreResponsesProviderModulePromise;
}

function loadGoogleAntigravityProviderModule(): Promise<
	LazyProviderModule<"google-antigravity", GoogleGeminiCliOptions, SimpleStreamOptions>
> {
	googleAntigravityProviderModulePromise ||= import("./google-antigravity.js").then((module) => {
		const provider = module as any;
		return {
			stream: provider.streamGoogleGeminiCli,
			streamSimple: provider.streamSimpleGoogleGeminiCli,
		};
	});
	return googleAntigravityProviderModulePromise;
}

function loadBedrockProviderModule(): Promise<
	LazyProviderModule<"bedrock-converse-stream", BedrockOptions, SimpleStreamOptions>
> {
	if (bedrockProviderModuleOverride) {
		return Promise.resolve(bedrockProviderModuleOverride);
	}
	bedrockProviderModulePromise ||= importNodeOnlyProvider("./amazon-bedrock.js").then((module) => {
		const provider = module as BedrockProviderModule;
		return {
			stream: provider.streamBedrock,
			streamSimple: provider.streamSimpleBedrock,
		};
	});
	return bedrockProviderModulePromise;
}

export const streamAnthropic = createLazyStream(loadAnthropicProviderModule);
export const streamSimpleAnthropic = createLazySimpleStream(loadAnthropicProviderModule);
export const streamAzureOpenCoreResponses = createLazyStream(loadAzureOpenCoreResponsesProviderModule);
export const streamSimpleAzureOpenCoreResponses = createLazySimpleStream(loadAzureOpenCoreResponsesProviderModule);
export const streamGoogle = createLazyStream(loadGoogleProviderModule);
export const streamSimpleGoogle = createLazySimpleStream(loadGoogleProviderModule);
export const streamGoogleVertex = createLazyStream(loadGoogleVertexProviderModule);
export const streamSimpleGoogleVertex = createLazySimpleStream(loadGoogleVertexProviderModule);
export const streamMistral = createLazyStream(loadMistralProviderModule);
export const streamSimpleMistral = createLazySimpleStream(loadMistralProviderModule);
export const streamOpenCoreCodexResponses = createLazyStream(loadOpenCoreCodexResponsesProviderModule);
export const streamSimpleOpenCoreCodexResponses = createLazySimpleStream(loadOpenCoreCodexResponsesProviderModule);
export const streamOpenCoreCompletions = createLazyStream(loadOpenCoreCompletionsProviderModule);
export const streamSimpleOpenCoreCompletions = createLazySimpleStream(loadOpenCoreCompletionsProviderModule);
export const streamOpenCoreResponses = createLazyStream(loadOpenCoreResponsesProviderModule);
export const streamSimpleOpenCoreResponses = createLazySimpleStream(loadOpenCoreResponsesProviderModule);
export const streamGoogleAntigravity = createLazyStream(loadGoogleAntigravityProviderModule);
export const streamSimpleGoogleAntigravity = createLazySimpleStream(loadGoogleAntigravityProviderModule);
const streamBedrockLazy = createLazyStream(loadBedrockProviderModule);
const streamSimpleBedrockLazy = createLazySimpleStream(loadBedrockProviderModule);

export function registerBuiltInApiProviders(): void {
	registerApiProvider({
		api: "anthropic-messages",
		stream: streamAnthropic,
		streamSimple: streamSimpleAnthropic,
	});

	registerApiProvider({
		api: "openai-completions",
		stream: streamOpenCoreCompletions,
		streamSimple: streamSimpleOpenCoreCompletions,
	});

	registerApiProvider({
		api: "mistral-conversations",
		stream: streamMistral,
		streamSimple: streamSimpleMistral,
	});

	registerApiProvider({
		api: "openai-responses",
		stream: streamOpenCoreResponses,
		streamSimple: streamSimpleOpenCoreResponses,
	});

	registerApiProvider({
		api: "google-antigravity",
		stream: streamGoogleAntigravity,
		streamSimple: streamSimpleGoogleAntigravity,
	});

	registerApiProvider({
		api: "azure-openai-responses",
		stream: streamAzureOpenCoreResponses,
		streamSimple: streamSimpleAzureOpenCoreResponses,
	});

	registerApiProvider({
		api: "openai-codex-responses",
		stream: streamOpenCoreCodexResponses,
		streamSimple: streamSimpleOpenCoreCodexResponses,
	});

	registerApiProvider({
		api: "google-generative-ai",
		stream: streamGoogle,
		streamSimple: streamSimpleGoogle,
	});

	registerApiProvider({
		api: "google-vertex",
		stream: streamGoogleVertex,
		streamSimple: streamSimpleGoogleVertex,
	});

	registerApiProvider({
		api: "bedrock-converse-stream",
		stream: streamBedrockLazy,
		streamSimple: streamSimpleBedrockLazy,
	});
}

export function resetApiProviders(): void {
	clearApiProviders();
	registerBuiltInApiProviders();
}

registerBuiltInApiProviders();
