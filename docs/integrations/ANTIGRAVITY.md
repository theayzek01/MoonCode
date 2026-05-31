# Antigravity Integration

MoonAgent features native integration with Antigravity through the highly optimized `google-antigravity` API adapter and `antigravity` provider. This integration allows senior developers and agentic systems to exploit Google's robust sandbox environments and state-of-the-art reasoning architectures.

All mappings and limits are structurally verified against `marcodiniz/ag-local-bridge` technical specifications.

---

## Canonical Model Registry

Ensure you utilize the exact canonical IDs listed below for perfect compatibility with local bridge proxies and routing layers. Short patterns (e.g., `sonnet-4-6`) will still be resolved via fuzzy model matching.

| Canonical Model ID | Display / Provider Target | Context Window | Output Limit | Primary Purpose |
| :--- | :--- | :--- | :--- | :--- |
| `antigravity-gemini-3-5-flash-medium` | Gemini 3.5 Flash (Medium) | 1,048,576 | 65,536 | High-throughput tasks & fast refactoring |
| `antigravity-gemini-3-5-flash-high` | Gemini 3.5 Flash (High) | 1,048,576 | 65,536 | Complex refactoring requiring reasoning |
| `antigravity-gemini-3-5-flash-low` | Gemini 3.5 Flash (Low) | 1,048,576 | 65,536 | Rapid syntax fixes and simple analysis |
| `antigravity-gemini-3-1-pro-low` | Gemini 3.1 Pro (Low) | 1,048,576 | 65,535 | Low-effort thinking / coding workflows |
| `antigravity-gemini-3-1-pro-high` | Gemini 3.1 Pro (High) | 1,048,576 | 65,535 | High-effort logic and deep bug-hunting |
| `antigravity-claude-sonnet-4-6-thinking`| Claude Sonnet 4.6 (Thinking) | 200,000 | 64,000 | Production-grade software development |
| `antigravity-claude-opus-4-6-thinking`  | Claude Opus 4.6 (Thinking) | 200,000 | 64,000 | Architectural design and complex math |
| `antigravity-gpt-oss-120b-medium` | GPT-OSS 120B (Medium) | 128,000 | 16,384 | Standard local text tasks and prompt checks |

---

## Technical Integration Rules

- **Default Routing Target**: If no model is explicitly specified, `antigravity-claude-sonnet-4-6-thinking` acts as the primary driver.
- **Provider Envelope**: All models execute under the `antigravity` provider envelope.
- **API Translation**: The underlying `google-antigravity` adapter strips the `antigravity-` prefix before formatting payload streams to the upstream Google sandbox proxy.
- **Claude Interleaved Thinking**: Claude models routed through this provider automatically enforce the `thinking-2025-01-31,interleaved-thinking-2025-05-14` beta headers to cleanly parse thought chains.

---

## Production CLI Usage Examples

### 1. Launching the Interactive TUI
Launch the workspace directly using Claude Sonnet 4.6 as the primary agentic engine:
```bash
moonagent --provider antigravity --model antigravity-claude-sonnet-4-6-thinking
```

### 2. Autonomous Task Execution
Execute an autonomous codebase fix with deep reasoning via Gemini 3.5 Flash (High):
```bash
moonagent "fix connection leaks in src/db.ts and verify using npm run test" --model antigravity-gemini-3-5-flash-high
```

### 3. Quick System Information
Query the active bridge connection, model mappings, and configuration state:
```bash
moonagent --info
```

#### Expected System Verification Output:
```text
[MoonAgent 1.26-v2] - Local Coding Environment Status
-----------------------------------------------
Active Provider: Antigravity (google-antigravity)
Connected Bridge: OK (Port: 11434, Status: active)
Selected Model: antigravity-claude-sonnet-4-6-thinking

Available Antigravity Models:
  * Gemini 3.5 Flash (Medium)  [antigravity-gemini-3-5-flash-medium]
  * Gemini 3.5 Flash (High)    [antigravity-gemini-3-5-flash-high]
  * Gemini 3.5 Flash (Low)     [antigravity-gemini-3-5-flash-low]
  * Gemini 3.1 Pro (Low)       [antigravity-gemini-3-1-pro-low]
  * Gemini 3.1 Pro (High)      [antigravity-gemini-3-1-pro-high]
  * Claude Sonnet 4.6          [antigravity-claude-sonnet-4-6-thinking]
  * Claude Opus 4.6            [antigravity-claude-opus-4-6-thinking]
  * GPT-OSS 120B (Medium)      [antigravity-gpt-oss-120b-medium]

Verification Status: Handshake success. Local sandbox ready.
```

---

## Core Verification Suite
Run the test harness to verify correct configuration, payload mapping, and sanitization flows:
```bash
# Test Antigravity specific model constraints
npm run test --workspace=packages/core -- antigravity-models.test.ts

# Test fuzzy resolver and bridge routing logic
npm run test --workspace=packages/cli -- model-resolver.test.ts

# Run the complete CI quality gate
npm run check:ci
```
