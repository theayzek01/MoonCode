# Mooncli Browser Bridge Chrome Extension

Development install:

1. Start Mooncli.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder: `packages/cli/browser-extension/chrome`.
6. In Mooncli, run `/browser` to confirm the extension is connected. If it is disconnected, click the extension icon once to wake the service worker.

Tools exposed to Mooncli:

- `browser_tabs`: list, active, open, close, focus, reload, navigate.
- `browser_page`: read, click, type, screenshot, evaluate.

The bridge listens only on `127.0.0.1:3132` and accepts WebSocket connections from browser-extension origins.
