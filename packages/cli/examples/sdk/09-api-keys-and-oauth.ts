/**
 * API Keys and OAuth
 *
 * Configure API key resolution via AuthStorage and ModelRegistry.
 */

import { AuthStorage, createEngineSession, ModelRegistry, SessionManager } from "Mooncli";

// Default: AuthStorage uses ~/.Mooncli/engine/auth.json
// ModelRegistry loads built-in + custom models from ~/.Mooncli/engine/models.json
const authStorage = AuthStorage.create();
const modelRegistry = ModelRegistry.create(authStorage);

await createEngineSession({
	sessionManager: SessionManager.inMemory(),
	authStorage,
	modelRegistry,
});
console.log("Session with default auth storage and model registry");

// Custom auth storage location
const customAuthStorage = AuthStorage.create("/tmp/my-app/auth.json");
const customModelRegistry = ModelRegistry.create(customAuthStorage, "/tmp/my-app/models.json");

await createEngineSession({
	sessionManager: SessionManager.inMemory(),
	authStorage: customAuthStorage,
	modelRegistry: customModelRegistry,
});
console.log("Session with custom auth storage location");

// Runtime API key override (not persisted to disk)
authStorage.setRuntimeApiKey("anthropic", "sk-my-temp-key");
await createEngineSession({
	sessionManager: SessionManager.inMemory(),
	authStorage,
	modelRegistry,
});
console.log("Session with runtime API key override");

// No models.json - only built-in models
const simpleRegistry = ModelRegistry.inMemory(authStorage);
await createEngineSession({
	sessionManager: SessionManager.inMemory(),
	authStorage,
	modelRegistry: simpleRegistry,
});
console.log("Session with only built-in models");
