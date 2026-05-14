# Antigravity Integration

MoonCode supports Antigravity through the `google-antigravity` API adapter and `antigravity` provider.

Reference checked: `marcodiniz/ag-local-bridge` model map and README.

## Public Model IDs

Use these IDs in MoonCode:

| Model ID | Notes | Context | Max output |
|---|---:|---:|---:|
| `antigravity-claude-sonnet-4-6` | default, Claude Sonnet 4.6 Thinking | 200k | 64k |
| `antigravity-claude-opus-4-6-thinking` | Claude Opus 4.6 Thinking | 200k | 64k |
| `antigravity-gemini-3-flash` | Gemini 3 Flash | 1,048,576 | 65,536 |
| `antigravity-gemini-3.1-pro-high` | Gemini 3.1 Pro, high thinking | 1,048,576 | 65,535 |
| `antigravity-gemini-3.1-pro-low` | Gemini 3.1 Pro, low thinking | 1,048,576 | 65,535 |
| `antigravity-gpt-oss-120b` | GPT-OSS 120B Medium | 128k | 16,384 |

Short user patterns such as `claude-sonnet-4-6` still resolve by fuzzy matching, but the canonical IDs keep compatibility with Antigravity bridge tooling.

## Provider Rules

- default model: `antigravity-claude-sonnet-4-6`
- visible provider: `antigravity`
- API adapter: `google-antigravity`
- Cloud Code Assist payload model strips the `antigravity-` prefix before sending upstream
- Claude Antigravity models need the interleaved-thinking beta header

## Verification

Run:

```bash
npm run test --workspace=packages/core -- antigravity-models.test.ts
npm run test --workspace=packages/cli -- model-resolver.test.ts
npm run check:ci
```
