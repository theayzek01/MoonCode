<p align="center">
  <a href="https://mooncli.dev">
    <img alt="Mooncli" src="Mooncli.png" width="180">
  </a>
</p>

<h1 align="center">Mooncli</h1>

<p align="center">
  Modern, fast, extensible AI coding assistant for terminal workflows.
</p>

<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://mooncli.dev"><img alt="Website" src="https://img.shields.io/badge/website-mooncli.dev-blue?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/mooncli"><img alt="NPM Version" src="https://img.shields.io/npm/v/mooncli?style=flat-square&color=cb3837" /></a>
</p>

---

## Highlights

- MCP-ready architecture
- Rich interactive TUI
- Multiple provider support (Gemini CLI, Codex, OpenRouter, Ollama, and more)
- Robotics mode (vision + planning)
- Discord integration from terminal
- Extensions, skills, prompts, themes

## Install

```bash
npm install -g mooncli
```

Run:

```bash
mooncli
```

## Authentication

Use `/login` in interactive mode, or set environment variables.

Example:

```bash
export GEMINI_API_KEY=your_key
mooncli
```

Provider docs:

- `docs/providers.md`
- `docs/models.md`

## Discord Integration

Mooncli can manage your Discord bot directly.

Commands:

- `/discord <bot_token>`: Validate and save token, then reload tools
- `/discord`: Show current Discord connection summary
- `/discord botinfo`: Fetch bot identity, status, and guild summary
- `/discord off`: Disable Discord integration and unload Discord tools

When connected, footer shows `Discord bagli`.

## Robotics Mode

Basic commands:

- `/robotics enable`
- `/robotics status`
- `/robotics detect`
- `/robotics plan <instruction>`

See implementation details in `packages/cli/src/core/robotics`.

## Development

```bash
npm install
npm run build
node packages/cli/dist/cli.js
```

Useful:

- `npm --prefix packages/cli run build`
- `npm --prefix packages/cli test`

## Project Docs

- `docs/extensions.md`
- `docs/skills.md`
- `docs/themes.md`
- `docs/prompts.md`

---

Built by the Mooncli team.
