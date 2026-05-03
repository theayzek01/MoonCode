/**
 * Core modules shared between all run modes.
 */

export {
	EngineSession,
	type EngineSessionConfig,
	type EngineSessionEvent,
	type EngineSessionEventListener,
	type ModelCycleResult,
	type PromptOptions,
	type SessionStats,
} from "./engine-session.js";
export {
	EngineSessionRuntime,
	type CreateEngineSessionRuntimeFactory,
	type CreateEngineSessionRuntimeResult,
	createEngineSessionRuntime,
} from "./engine-session-runtime.js";
export {
	type EngineSessionRuntimeDiagnostic,
	type EngineSessionServices,
	type CreateEngineSessionFromServicesOptions,
	type CreateEngineSessionServicesOptions,
	createEngineSessionFromServices,
	createEngineSessionServices,
} from "./engine-session-services.js";
export { type BashExecutorOptions, type BashResult, executeBashWithOperations } from "./bash-executor.js";
export type { CompactionResult } from "./compaction/index.js";
export { createEventBus, type EventBus, type EventBusController } from "./event-bus.js";
// Extensions system
export {
	type EngineEndEvent,
	type EngineStartEvent,
	type EngineToolResult,
	type EngineToolUpdateCallback,
	type BeforeEngineStartEvent,
	type BeforeEngineStartEventResult,
	type BuildSystemPromptOptions,
	type ContextEvent,
	defineTool,
	discoverAndLoadExtensions,
	type ExecOptions,
	type ExecResult,
	type Extension,
	type ExtensionAPI,
	type ExtensionCommandContext,
	type ExtensionContext,
	type ExtensionError,
	type ExtensionEvent,
	type ExtensionFactory,
	type ExtensionFlag,
	type ExtensionHandler,
	ExtensionRunner,
	type ExtensionShortcut,
	type ExtensionUIContext,
	type LoadExtensionsResult,
	type MessageRenderer,
	type RegisteredCommand,
	type SessionBeforeCompactEvent,
	type SessionBeforeForkEvent,
	type SessionBeforeSwitchEvent,
	type SessionBeforeTreeEvent,
	type SessionCompactEvent,
	type SessionShutdownEvent,
	type SessionStartEvent,
	type SessionTreeEvent,
	type ToolCallEvent,
	type ToolCallEventResult,
	type ToolDefinition,
	type ToolRenderResultOptions,
	type ToolResultEvent,
	type TurnEndEvent,
	type TurnStartEvent,
	type WorkingIndicatorOptions,
} from "./extensions/index.js";
export { createSyntheticSourceInfo } from "./source-info.js";
