import type { Api, Model } from "../types.js";
/** Workers Core direct endpoint. */
export declare const CLOUDFLARE_WORKERS_Core_BASE_URL =
	"https://api.cloudflare.com/client/v4/accounts/{CLOUDFLARE_ACCOUNT_ID}/ai/v1";
/** Core Gateway Unified API. https://developers.cloudflare.com/ai-gateway/usage/unified-api/ */
export declare const CLOUDFLARE_Core_GATEWAY_COMPAT_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/compat";
/** Core Gateway → OpenAI passthrough. Used until /compat supports /v1/responses. */
export declare const CLOUDFLARE_Core_GATEWAY_OpenAI_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/openai";
/** Core Gateway → Anthropic passthrough. */
export declare const CLOUDFLARE_Core_GATEWAY_ANTHROPIC_BASE_URL =
	"https://gateway.ai.cloudflare.com/v1/{CLOUDFLARE_ACCOUNT_ID}/{CLOUDFLARE_GATEWAY_ID}/anthropic";
export declare function isCloudflareProvider(provider: string): boolean;
/** Substitute `{VAR}` placeholders in a Cloudflare baseUrl from process.env. */
export declare function resolveCloudflareBaseUrl(model: Model<Api>): string;
//# sourceMappingURL=cloudflare.d.ts.map
