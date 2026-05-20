# Agents

- ALWAYS use pnpm.

## MoonCode Types

MoonCode types come from the `mooncode` npm package via subpath exports:

- `import { definePluginEntry } from "mooncode/plugin-sdk/plugin-entry"`
- `import { ... } from "mooncode/plugin-sdk/core"` for API types and helpers
- Put `mooncode` in devDependencies/peerDependencies, NOT dependencies
- Plugins are loaded via jiti at runtime — the gateway provides the mooncode module
- Plugins can be raw .ts files (no build step required) since jiti handles TS

### Gateway protocol types (browser clients)

The `mooncode` package does **not** export gateway protocol types publicly — only `plugin-sdk/*` paths are available. For browser/frontend clients, copy the required constants and interfaces from the source:

- **Client IDs & Modes** (typed constants, use these instead of bare strings):
  [`src/gateway/protocol/client-info.ts`](https://github.com/mooncode/mooncode/blob/main/src/gateway/protocol/client-info.ts)
  — `GATEWAY_CLIENT_IDS`, `GATEWAY_CLIENT_MODES`
- **Protocol frame schemas** (TypeBox definitions for all RPC payloads):
  [`src/gateway/protocol/schema/protocol-schemas.ts`](https://github.com/mooncode/mooncode/blob/main/src/gateway/protocol/schema/protocol-schemas.ts)

In this repo these are inlined into `packages/mooncode-client/src/lib/gateway/types.ts` with a comment pointing back to the source.

## How plugin detection works

The Claw client appends `:mooncode-os` to its session key (e.g. `agent:main:main:mooncode-os`). The plugin's `before_prompt_build` hook checks for this suffix and, when present, prepends the OpenUI Lang system prompt. The agent then streams back component markup which the client renders in real time. Sessions from other clients are unaffected.

## Agents → Sessions → Threads mental model

**Agent** — a named AI persona defined in the MoonCode gateway config (e.g. `main`, `helper`). Returned by `agents.list`. Agents are fixed; you cannot create or delete them from a client.

**Session** — a persistent conversation channel addressed by a structured key:
```
agent:<agentId>:<channel>:<senderId?>
```
- `<channel>` is typically `main` for the operator's direct channel
- `<senderId>` is an optional suffix that scopes the session further (e.g. per-user, per-client)
- The gateway stores message history under this key
- Multiple clients can share a session (same key = same history) or have isolated sessions (different key = separate history)

**Thread** (OpenUI concept) — a client-side construct that maps 1:1 to a session key. In this app, each agent's `main` session is one thread. There is no "new thread" — the thread is the session, and the session is permanent.

**Current mapping in this codebase:**
```
Agent ID (from agents.list)
  → session key: agent:<id>:main:mooncode-os
    → one thread in the sidebar
      → chat.history fetches messages for that key
      → chat.send writes messages to that key
```

The `:mooncode-os` suffix makes Claw's session isolated from other clients. Removing it would make it shared (same history as `mooncode chat` CLI).

**Key rule:** one agent = one session key = one thread = one conversation. There is no concept of starting a "new chat" with an agent — you always continue the same session.

