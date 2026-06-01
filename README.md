<div align="center">
  <img src="assets/MooncodeWhiteBanner.png" alt="MoonCode banner" width="100%" />

  <h1>MoonCode</h1>

  <p>
    Terminal-first coding agent. Small tokens, sharp edits, real tools.
  </p>

  <p>
    <img src="https://img.shields.io/badge/version-2026--v36-16a34a?style=for-the-badge" alt="Version 2026-v36" />
    <img src="https://img.shields.io/badge/Node.js-20+-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js 20+" />
    <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/MCP-ready-111827?style=for-the-badge" alt="MCP ready" />
  </p>

  <p>
    <a href="https://theayzek01.github.io/MoonCode/"><strong>Docs</strong></a>
    ·
    <a href="docs/README.md"><strong>Docs index</strong></a>
    ·
    <a href="docs/integrations/BROWSER_CONTROL.md"><strong>Browser Bridge</strong></a>
    ·
    <a href="docs/integrations/BLENDER_MCP.md"><strong>MCP Control</strong></a>
  </p>
</div>

---

## What Is MoonCode?

MoonCode is a local terminal agent for people who want the assistant close to the repo, the shell, the browser, and external MCP tools.

It is built around a simple loop:

- inspect only what matters
- make small, reversible edits
- run the real command that proves the change
- keep token use under control

MoonCode is not a landing-page chatbot wrapped around a shell. It is a working CLI with a custom TUI, Browser Bridge, MCP control panel, persistent sessions, and repo-aware workflows.

---

## Highlights

<table>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/15.%20Search.png" width="40" height="40" alt="Search" /><br />
      <strong>Repo-Aware Work</strong><br />
      Reads narrowly, searches fast, and avoids wide rewrites when a surgical fix is enough.
    </td>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Computer%20Systems/1.%20Pointer.png" width="40" height="40" alt="Pointer" /><br />
      <strong>Real Tool Control</strong><br />
      Coordinates shell commands, file edits, git, browser automation, and MCP tools in one session.
    </td>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/5.%20Refresh.png" width="40" height="40" alt="Refresh" /><br />
      <strong>Live TUI</strong><br />
      Keeps work visible while commands run, tools stream, and the agent moves through a task.
    </td>
  </tr>
  <tr>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/7.%20Download.png" width="40" height="40" alt="Download" /><br />
      <strong>Build-Test-Fix Loop</strong><br />
      Designed to run the command, read the failure, patch the cause, and verify again.
    </td>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Social/4.%20Chat.png" width="40" height="40" alt="Chat" /><br />
      <strong>Short Output</strong><br />
      Gives useful progress without flooding the terminal with filler.
    </td>
    <td width="33%" valign="top">
      <img src="packages/cli/browser-extension/chrome/icons/Computer%20Systems/15.%20Wait.png" width="40" height="40" alt="Wait" /><br />
      <strong>Long Sessions</strong><br />
      Uses compaction and staged work so big tasks can survive more than one prompt.
    </td>
  </tr>
</table>

---

## Local Control Panels

MoonCode keeps noisy setup and account work out of the main terminal:

- `/login` opens a dark provider login panel with API key and subscription flows.
- `/mcp` opens the MCP control panel for Blender, Scratch/TurboWarp, custom servers, and market links.
- `/session` opens the local session browser.
- `/brain` opens the memory/reflex view, and `/clearbrain` clears persisted memory signals.

The old direct Blender/Scratch commands are folded into `/mcp` so tool setup is managed from one place.

---

## Install

MoonCode is a monorepo. Install from the repository root, then install the CLI package globally.

### Windows CMD

Use `npm.cmd` on Windows. It avoids PowerShell execution-policy issues with `npm.ps1`.

```cmd
git clone https://github.com/theayzek01/mooncode.git
cd mooncode
npm.cmd install
npm.cmd run build
npm.cmd install -g .\packages\cli
mooncode --version
```

### PowerShell

```powershell
git clone https://github.com/theayzek01/mooncode.git
cd mooncode
npm.cmd install
npm.cmd run build
npm.cmd install -g .\packages\cli
mooncode --version
```

### macOS / Linux

```bash
git clone https://github.com/theayzek01/mooncode.git
cd mooncode
npm install
npm run build
npm install -g ./packages/cli
mooncode --version
```

---

## Update

From an existing clone:

```bash
git pull
npm install
npm run build
npm install -g ./packages/cli
mooncode --version
```

On Windows, use the same commands with `npm.cmd`:

```cmd
git pull
npm.cmd install
npm.cmd run build
npm.cmd install -g .\packages\cli
mooncode --version
```

---

## Fix A Broken Global Install

If `mooncode` fails with:

```text
Cannot find module ...\node_modules\mooncode\dist\cli.js
```

the global command points to an old or half-installed package. Reinstall it from a successful build:

```cmd
cd %USERPROFILE%\mooncode
npm.cmd install
npm.cmd run build
npm.cmd uninstall -g mooncode
npm.cmd install -g .\packages\cli
mooncode --version
```

If npm fails with:

```text
npm error Invalid tag name "^1.29-v2"
```

you are on a bad/stale checkout or lockfile where a display label was accidentally used as an npm version. A valid npm version looks like `1.29.2`, not `1.29-v2`.

Fix it by pulling the latest repository and reinstalling:

```cmd
cd %USERPROFILE%\mooncode
git pull
npm.cmd cache verify
npm.cmd install
npm.cmd run build
npm.cmd install -g .\packages\cli
```

If it still appears, search for the invalid string:

```cmd
findstr /s /n /i "1.29-v2" package.json package-lock.json packages\*.json
```

Replace dependency ranges like `^1.29-v2` with a valid version such as `*` for local workspaces or `^1.29.2` for published packages.

---

## Common Commands

| Command | Purpose |
| --- | --- |
| `mooncode` | Start the interactive TUI |
| `mooncode --version` | Print the installed CLI version |
| `/help` | Show commands and shortcuts |
| `/index` | Build a project map for sharper search |
| `/browser` | Check Browser Bridge state |
| `/mcp` | Inspect or restart MCP servers |
| `/compact` | Compress conversation context |
| `/ship` | Run the git shipping flow |

---

## Browser Bridge And MCP

MoonCode can work beyond plain files when the tools are available.

| Capability | What It Does |
| --- | --- |
| Browser Bridge | Opens and controls an isolated browser window for testing, screenshots, and web tasks |
| MCP | Connects external tool servers such as Blender MCP |
| GitHub tooling | Supports branch, commit, push, and review workflows through local git/GitHub tools |
| Session memory | Keeps persistent sessions under the MoonCode config directory |

For deeper setup notes, see:

- [Browser Bridge](docs/integrations/BROWSER_CONTROL.md)
- [Blender MCP](docs/integrations/BLENDER_MCP.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Project structure](docs/PROJECT_STRUCTURE.md)

---

## MoonCode Compared

| Area | MoonCode | Typical CLI Agent |
| --- | --- | --- |
| Editing style | Smaller staged edits | Often larger one-shot rewrites |
| Context use | Tries to stay compact | Can grow noisy quickly |
| Work surface | Terminal, TUI, browser, MCP | Usually shell plus chat |
| Verification | Build/test commands are part of the loop | Often left to the user |
| Session model | Persistent local sessions | Often short-lived or stateless |

---

## Requirements

- Node.js 20 or newer
- Git
- npm
- Optional: Blender with Blender MCP enabled
- Optional: GitHub CLI for richer GitHub flows

---

## License

MIT
