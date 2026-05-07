<p align="center">
  <img src="Mooncli.png" alt="Mooncli logo" width="180" />
</p>

<h1 align="center">Mooncli</h1>

<p align="center"><strong>AI-first terminal coding assistant with TUI, Web UI, MCP, extensions, and multi-provider support.</strong></p>

<p align="center">
  <a href="https://mooncli.dev"><img alt="Website" src="https://img.shields.io/badge/website-mooncli.dev-0ea5e9?style=for-the-badge" /></a>
  <a href="https://www.npmjs.com/package/mooncli"><img alt="npm" src="https://img.shields.io/npm/v/mooncli?style=for-the-badge&color=cb3837" /></a>
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=for-the-badge&logo=discord&logoColor=white" /></a>
</p>

## Why Mooncli

- Fast terminal-native workflow
- Rich interactive TUI + modern Web UI (`/webui`)
- MCP-ready architecture
- Multiple model providers (Gemini CLI, Codex, OpenRouter, Ollama, and more)
- Extensions, skills, themes, prompts
- Company-style Agent System for complex coding tasks
- Robotics and Discord integrations

## Quick Start

```bash
npm install -g mooncli
mooncli
```

## Install & Update (Easy)

Install:

```bash
npm install -g mooncli
```

Update from terminal (outside Mooncli):

```bash
mooncli update
```

Update from inside Mooncli interactive session:

```text
/update
```

If your install path is permission-protected, run with admin/sudo once for global update.

## Authentication

Use `/login` in interactive mode, or set provider keys directly.

```bash
export GEMINI_API_KEY=your_key
mooncli
```

## Core Commands

- `/webui`: open the web dashboard
- `/agentmode on|off`: toggle the company-style coding Agent System
- `/workspace`: show the company-style agent workspace
- `mooncli olm <model>`: Ollama quick alias
- `/discord <bot_token>`: connect Discord bot
- `/robotics enable`: enable robotics mode

## Development

```bash
npm install
npm run check
npm run build
npm run test
node packages/cli/dist/cli.js
```

## Documentation

- `CONTRIBUTING.md`
- `PHILOSOPHY.md`
- `PROJECT_LOG.md`
- `docs/providers.md`
- `docs/models.md`
- `docs/extensions.md`
- `docs/skills.md`
- `docs/themes.md`
- `docs/prompts.md`

## Project Structure

- `packages/cli`: command and interactive runtime
- `packages/core`: providers, models, core utilities
- `packages/engine`: execution and orchestration
- `packages/tui`: terminal UI components
- `packages/web-ui`: web dashboard

## License

MIT - see `LICENSE`.
