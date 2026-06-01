<div align="center">
  <img src="assets/MooncodeWhiteBanner.png" alt="MoonCode" width="100%" />

  <h1>MoonCode</h1>
  <p><b>2026-v36</b> - fast local coding agent, polished TUI, browser control, account panel, and on-demand MCP.</p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-%3E%3D20-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/Version-2026--v36-6750A4?style=for-the-badge" alt="Version" />
    <img src="https://img.shields.io/badge/MCP-On%20Demand-0F766E?style=for-the-badge" alt="MCP" />
  </p>
</div>

---

## What It Is

MoonCode is a terminal-first coding agent for real project work. It reads less, patches tighter, verifies faster, and keeps the workspace under your control.

The goal is simple: open a repo, ask for the change, and get a clean result without the terminal turning into a wall of noise.

## Highlights

- Fast TUI with compact rendering, reduced context waste, and fewer long-output stalls.
- `/login` and `/panel` open the local Material-style account control panel.
- Multiple accounts per provider with active-account switching, usage notes, and quota labels.
- `/mcp` opens a local MCP control panel for download/start/stop/status.
- Blender MCP is no longer auto-started on launch.
- Scratch/TurboWarp MCP support through SCMCP.
- Browser extension with persistent visual cursor, page overlays, screenshots, mouse/canvas tools, and tab cleanup.
- Token-saving prompt mode for smaller or cheaper models.
- Git workflow helpers for branch, commit, push, and PR flow.

## Install

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode
npm install
npm run build
cd packages/cli
npm link
```

Run it inside any project:

```bash
mooncode
```

If Windows still opens an old MoonAgent/MoonCode build, relink this checkout:

```bash
cd C:\Users\ozenc\OneDrive\Desktop\mooncode\packages\cli
npm link
where mooncode
mooncode --version
```

## Main Commands

| Command | What it does |
| --- | --- |
| `/login` | Opens the local login/account panel. |
| `/panel` | Opens the full account and control panel. |
| `/mcp` | Opens the MCP manager for Blender, Scratch/TurboWarp, and future MCP servers. |
| `/browser` | Checks Chrome bridge status and browser control. |
| `/index` | Builds/searches the project map when needed. |
| `/compact` | Shrinks long context without losing the working thread. |
| `/ship` | Commit, push, and PR workflow. |

## MCP

MoonCode keeps MCP off by default. Start servers only when you need them.

- Open `/mcp`.
- Download or start Blender MCP from the panel.
- Start Scratch/TurboWarp MCP from the panel.
- Stop servers from the same page when the task is done.

Scratch/TurboWarp needs the SCMCP Chrome extension loaded separately:

```text
C:\Users\ozenc\OneDrive\Desktop\scmcp\extension
```

Default Scratch MCP command:

```powershell
node C:\Users\ozenc\OneDrive\Desktop\scmcp\server\scratch-mcp.js
```

## Browser Extension

Extension path:

```text
packages/cli/browser-extension/chrome
```

The extension supports tab control, DOM reads, screenshots, click/type/drag/mouse actions, canvas drawing, upload flows, overlays, and cleanup. After browser-heavy jobs, MoonCode can close temporary tabs with `browser_tabs cleanup`.

## Development

```bash
npm run build
npm run test --workspace=packages/cli
```

Useful focused checks:

```bash
npm run build --workspace=packages/engine
npm run build --workspace=packages/cli
npm run test --workspace=packages/cli -- token-optimizer.test.ts system-prompt.test.ts fast-auto-thinking.test.ts
```

## Links

- Discord: [discord.gg/kanser](https://discord.gg/kanser)
- Instagram: [@theayzek01](https://instagram.com/theayzek01)
- Deep dive: [docs/MOONCODE_DEEP_DIVE.md](docs/MOONCODE_DEEP_DIVE.md)

## License

MIT
