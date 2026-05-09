<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="Hodeus Banner" width="100%" />

  <br />

  [![npm](https://img.shields.io/npm/v/hodeus?style=for-the-badge&color=0ea5e9&labelColor=1e293b)](https://www.npmjs.com/package/hodeus)
  [![License: MIT](https://img.shields.io/badge/license-MIT-22c55e?style=for-the-badge&labelColor=1e293b)](LICENSE)
  [![Discord](https://img.shields.io/badge/discord-community-5865F2?style=for-the-badge&logo=discord&logoColor=white&labelColor=1e293b)](https://discord.com/invite/3cU7Bz4UPx)

  ### **Hodeus**
  *An agentic coding assistant that lives in your terminal.*

  **Multi-provider · Multi-model · MCP-ready · Local-first · Open source**

</div>

---

## ⚡ What is Hodeus?

Hodeus is a high-performance, terminal-based coding agent designed for developers who prefer staying in their flow. Unlike browser-based LLM chats, Hodeus treats your codebase as the source of truth—reading files, reasoning about architecture, and executing changes directly.

- **🚀 Keyboard-Centric:** No more context-switching to browser tabs.
- **🧠 Agentic Intelligence:** Sophisticated orchestration for complex multi-file tasks.
- **🔒 Local-First:** Full privacy with Ollama and local model support.
- **🛠️ Extensible:** Custom tools, skills, and themes to match your workflow.

---

## 🏗️ Supported Providers

Hodeus bridges the gap between cloud power and local privacy.

| Category | Providers |
| :--- | :--- |
| **Cloud** | Anthropic (Claude 3.5/3.7), OpenAI (o1/o3), Google Gemini, DeepSeek, Mistral, xAI, Groq, Cerebras, OpenRouter, AWS Bedrock, Azure, GitHub Copilot |
| **Local** | **Ollama** (Qwen2.5-Coder, Llama 3, etc.), OpenAI-compatible local endpoints |

---

## 🚀 Quick Start

Get up and running in seconds.

### Global Installation
```bash
# Install globally via npm
npm install -g hodeus

# Launch the interactive workspace
hodeus
```

### Local Development (Plug & Play)
```bash
# Clone the repository
git clone https://github.com/theayzek01/hodeuscli
cd hodeuscli

# Install and build (automatic)
npm install

# Run directly
npm start
```

---

## ✨ Key Features

### 🏢 Multi-Agent Orchestration
Enable a full "virtual company" with `/agentmode on`. Hodeus spawns specialized agents (Architect, Frontend, Backend, Security, Test) that collaborate under a Patron orchestrator to solve large-scale problems.

### 🗺️ Plan Mode
Switch to `/plan` for a read-only analysis. The model will scan your project and propose a detailed implementation plan without making any changes. Review it, refine it, then execute.

### 🌐 Chrome Browser Bridge
Full web interaction. Hodeus connects to a bundled Chrome extension, allowing the assistant to browse docs, test web apps, and interact with live pages through `/browser`.

### 🗜️ Context Management
Keep your sessions lean. Hodeus features automatic and manual context compaction (`/compact`) and a real-time token usage monitor (`/context`).

---

## ⌨️ Interactive Commands

| Command | Action |
| :--- | :--- |
| `/models` | Switch active model mid-session |
| `/agentmode` | Toggle multi-agent orchestration |
| `/plan` | Enter/Exit read-only planning mode |
| `/index` | Index codebase for semantic search |
| `/browser` | Verify Chrome bridge status |
| `/mcp` | Manage Model Context Protocol servers |
| `/context` | Monitor token & context window usage |
| `/export` | Export session to HTML or JSONL |
| `/mood` | Inspect the agent's affective state layer |

---

## 🛠️ Contribution

We love contributions! Whether it's adding a new provider, fixing a bug, or improving documentation.

```bash
# Run checks (lint + typecheck)
npm run check

# Build everything
npm run build

# Run CLI
node packages/cli/dist/cli.js
```

---

<div align="center">
  <p>Built with ❤️ by the Hodeus community.</p>
  <p>Released under the <a href="LICENSE">MIT License</a>.</p>
</div>
