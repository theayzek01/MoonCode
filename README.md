<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="Mooncli Banner" width="100%" />

  <h1>Mooncli</h1>
  <p>Minimalist, blazing fast, and enterprise-ready terminal coding assistant.</p>

  [![Version](https://img.shields.io/badge/version-Beta_1.5-blue.svg?style=for-the-badge)](#)
  [![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](#)
  [![Platform](https://img.shields.io/badge/platform-Windows_|_macOS_|_Linux-lightgray.svg?style=for-the-badge)](#)
</div>

---

## 🚀 Features

- **Antigravity Engine**: Direct access to Google DeepMind's Gemini 3.1 Pro, Claude 4.6 (Thinking), and GPT-OSS 120B through an enterprise OAuth bridge.
- **Minimalist TUI**: A terminal interface designed for maximum focus and zero distractions.
- **Enterprise Stability**: Automatic context compaction (`aggressive`, `balanced`, `off`) ensures long chat sessions never crash or lose context.
- **Browser Bridge**: Seamless Chrome extension integration for interacting with your browser directly from the terminal.

## 📦 Installation

Install globally via npm:

```bash
npm install -g mooncli
mooncli --version
```

## 💻 Quick Start

Start your coding session instantly:

```bash
mooncli
```

### Common Commands

| Command | Description |
|---|---|
| `mooncli --help` | View all available commands and flags |
| `mooncli --continue` | Resume your previous coding session seamlessly |
| `mooncli browser-bridge` | Initialize the Chrome extension bridge |

## ⚙️ Configuration

Mooncli supports automatic compaction for long-running stability. Configure it in `~/.Mooncli/engine/settings.json`:

```json
{
  "compaction": {
    "profile": "aggressive",
    "enabled": true
  }
}
```

## 🔗 Browser Bridge (Chrome Extension)

To install the browser bridge:
1. Open `chrome://extensions` in your browser.
2. Enable **Developer mode**.
3. Click **Load unpacked** and select the `packages/cli/browser-extension/chrome` directory.

## 📄 License

This project is licensed under the MIT License.
