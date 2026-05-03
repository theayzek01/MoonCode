<p align="center">
  <a href="https://moodcli.dev">
    <img alt="moodcli logo" src="https://moodcli.dev/logo.svg" width="128">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
</p>
<p align="center">
  <a href="https://moodcli.dev">moodcli.dev</a>
</p>

---

Moodcli is a minimal terminal coding harness. Adapt Moodcli to your workflows, not the other way around, without having to fork and modify Moodcli internals. Extend it with TypeScript [Extensions](#extensions), [Skills](#skills), [Prompt Templates](#prompt-templates), and [Themes](#themes). Put your extensions, skills, prompt templates, and themes in [Moodcli Packages](#moodcli-packages) and share them with others via npm or git.

Moodcli ships with powerful defaults but skips features like sub agents and plan mode. Instead, you can ask Moodcli to build what you want or install a third party Moodcli package that matches your workflow.

## Quick Start

```bash
npm install -g @moodcli/coding-agent
```

Authenticate with an API key:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
mood
```

Or use your existing subscription:

```bash
mood
/login  # Then select provider
```

## Features

- **Moon Theme**: Smooth, dark aesthetics by default.
- **Sonnet 4.6 & Opus 4.6**: Integrated support for the latest models via Antigravity and Codex providers.
- **Turkish Localization**: Fully translated TUI for Turkish users.
- **Fast & Minimal**: No bloat, just the tools you need.

## Development

```bash
npm install
npm run build
node dist/cli.js
```
