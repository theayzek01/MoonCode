<div align="center">

<img src="Mooncli.png" alt="Mooncli" width="140" />

# Mooncli

**An agentic coding assistant that lives in your terminal.**

Multi-provider · Multi-model · MCP-ready · Local-first · Open source

[![npm](https://img.shields.io/npm/v/mooncli?style=flat-square&color=0ea5e9&label=npm)](https://www.npmjs.com/package/mooncli)
[![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=flat-square)](LICENSE)
[![Discord](https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white)](https://discord.com/invite/3cU7Bz4UPx)

</div>

---

## What it does

Mooncli is a terminal-based coding agent. You ask it to build features, fix bugs, or refactor code — it reads your files, reasons about the codebase, makes changes, and runs commands. All inside your terminal, without leaving the keyboard.

It connects to over 20 AI providers (cloud and local) and treats your project as the source of truth, not a conversation in a browser tab.

---

## Providers supported

| Category | Providers |
|---|---|
| Cloud | Anthropic, OpenAI, Google Gemini, DeepSeek, Mistral, xAI, Groq, Cerebras, ZAI, MiniMax, Kimi, Fireworks, HuggingFace, OpenRouter, Vercel AI Gateway, Amazon Bedrock, Azure OpenAI, GitHub Copilot |
| Local | **Ollama** (any model), OpenAI-compatible endpoints |

---

## Getting started

```bash
npm install -g mooncli
mooncli
```

Set your API key for any provider:

```bash
# Gemini (free tier available)
export GEMINI_API_KEY=your_key

# Anthropic
export ANTHROPIC_API_KEY=your_key

# Or use Ollama locally — no key needed
ollama pull qwen2.5-coder:7b
mooncli --provider ollama
```

You can also log in interactively inside the terminal with `/login`.

---

## Key features

**Agent system** — Mooncli uses a company-style orchestration layer: Patron (orchestrator), Architect, Backend, Frontend, Security, Test, DevOps, and Integrator agents collaborate on complex tasks. Enable with `/agentmode on`.

**Plan mode** — `/plan` switches to read-only mode. The model analyzes and proposes changes without touching any files. Review the plan, then run `/plan off` to execute.

**Context window monitor** — `/context` shows how much of the context window is in use, in real time. Compaction happens automatically when needed, or manually with `/compact`.

**Ollama / local model optimization** — When using a local model, Mooncli automatically compresses the system prompt and applies optimal `num_ctx`, `num_batch`, and `keep_alive` settings. Profiles: `turbo` (8K), `balanced` (16K), `quality` (32K).

**MCP support** — Connect external tools, databases, and APIs via the Model Context Protocol. Managed with `/mcp`.

**Skills** — Drop a `.md` file into your project to teach the model your conventions, stack, or design system. Loaded automatically.

**Extensions** — Extend the runtime with custom tools, commands, themes, and slash commands.

**Themes** — Built-in themes: `moon`, `neon`, `brutal`, and more. Switch with `--theme`.

---

## Inside the terminal

```
/model           switch model mid-session
/plan            read-only planning mode
/context         token usage monitor
/compact         compress context manually
/agentmode on    enable company-style agents
/workspace       show agent workspace
/init            create MOON.md for this project
/fork            branch session from a previous message
/export          export session as HTML or JSONL
/mcp             show connected MCP servers
```

---

## Ollama quick start

```bash
# Install Ollama
curl -fsSL https://ollama.com/install.sh | sh

# Pull a coding model
ollama pull qwen2.5-coder:7b

# Run with balanced profile (16K context)
MOONCLI_OLLAMA_MODE=balanced mooncli --provider ollama
```

---

## Project layout

```
packages/
  cli/       Terminal runtime, interactive TUI, slash commands
  core/      Providers, model definitions, auth
  engine/    Orchestration loop, tool execution, compaction
  tui/       Terminal UI component library
  web-ui/    Web dashboard (optional)
```

---

## Development

```bash
git clone https://github.com/theayzek01/hodeuscli
cd hodeuscli
npm install
npm run check     # lint + typecheck
```

---

## License

MIT — see [LICENSE](LICENSE).
