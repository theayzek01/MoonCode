import type { Api, KnownProvider, Model, ModelThinkingLevel, Usage } from "./types.js";
export declare function getModel(provider: string, modelId: string): Model<any> | undefined;
export declare function getProviders(): KnownProvider[];
export declare function getModels(provider: string): Model<any>[];
export declare function calculateCost<TApi extends Api>(model: Model<TApi>, usage: Usage): Usage["cost"];
export declare function getSupportedThinkingLevels<TApi extends Api>(model: Model<TApi>): ModelThinkingLevel[];
export declare function clampThinkingLevel<TApi extends Api>(
	model: Model<TApi>,
	level: ModelThinkingLevel,
): ModelThinkingLevel;
/**
 * Check if two models are equal by comparing both their id and provider.
 * Returns false if either model is null or undefined.
 */
export declare function modelsAreEqual<TApi extends Api>(
	a: Model<TApi> | null | undefined,
	b: Model<TApi> | null | undefined,
): boolean;
//# sourceMappingURL=models.d.ts.map
