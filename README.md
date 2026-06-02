# MoonCode

Local coding assistant for the terminal.

MoonCode brings terminal-first workflows, persistent sessions, Browser Bridge, and MCP support into one place. It is designed to be fast, quiet, and local by default.

Live docs site: [https://theayzek01.github.io/MoonCode/](https://theayzek01.github.io/MoonCode/)

## Release Bundle

Release archives unpack to this layout:

```text
MoonAgent/
  setup.bat
  setup.sh
  setup.ps1
  MoonCode/
```

From a release bundle, run the platform-specific setup script:

```bat
setup.bat install
```

```bash
bash setup.sh install
```

```powershell
.\setup.ps1 install
```

For a source checkout, you can still use:

```bash
npm run setup
```

## Features

- Terminal-based workflow
- Persistent sessions
- Browser Bridge
- MCP support
- TUI interface
- Local-first operation

## Getting Started

```bash
npm install
npm run build
mooncode
```

## Documentation

- Live site: [theayzek01.github.io/MoonCode](https://theayzek01.github.io/MoonCode/)
- Repo: [github.com/theayzek01/MoonCode](https://github.com/theayzek01/MoonCode)
- Browser Bridge extension: [`packages/cli/browser-extension/chrome`](packages/cli/browser-extension/chrome)
- Deep dive notes: [`docs/MOONCODE_DEEP_DIVE.md`](docs/MOONCODE_DEEP_DIVE.md)

## Core Commands

- `/help` for quick help
- `/brain` for context and suggestions
- `/autothink` to toggle automatic thinking
- `/browser` for browser status
- `/mcp` for MCP management
- `/doctor` for a system summary

## Development

```bash
npm run check:ci
npm test
```

## Requirements

- Node.js 20+
- Git

## License

MIT
