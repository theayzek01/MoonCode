# Hodeus Browser Bridge Chrome Extension

Development install:

1. Start Hodeus, or run `Hodeus browser-bridge` to keep only the bridge server alive.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select this folder: `packages/cli/browser-extension/chrome`.
6. In Hodeus, run `/browser` to confirm the extension is connected. The extension badge shows `ON` when connected and `OFF` when disconnected. If it is disconnected, click the extension icon once to wake the service worker.

Tools exposed to Hodeus:

- `browser_tabs`: list, active, open, close, focus, reload, navigate.
- `browser_page`: read, click, type, screenshot, evaluate.

The bridge listens only on `127.0.0.1:3133` and accepts WebSocket connections from browser-extension origins.

