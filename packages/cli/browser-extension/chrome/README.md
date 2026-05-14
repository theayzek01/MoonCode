# MoonCode Browser Bridge

Chrome extension for local MoonCode browser automation.

## Install

1. Run `mooncode browser-bridge`.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select `packages/cli/browser-extension/chrome`.
6. Run `/browser` in MoonCode. Badge `ON` means connected.

## Tools

- `browser_tabs`: list, active, open, close, focus, reload, navigate.
- `browser_page`: read, read_dom, get_elements, click, hover, type, drag, upload_file, press_key, scroll, screenshot, evaluate, console_logs, wait, clear_ui.
- `scroll`: up, down, left, right, top, bottom. It prefers the nearest scrollable container around the viewport center before falling back to window scrolling.

## Design goals

- Low token output by default.
- No visual noise unless `visual` or `showLabels` is requested.
- File upload via Chrome debugger `DOM.setFileInputFiles`.
- Safer script injection: browser internal pages and other extension pages are rejected.
- Local-only bridge: `127.0.0.1:3133`, extension-origin WebSocket only.
- Smart scroll avoids jumping pages to the top while working inside nested app panels.

## Troubleshooting

- If badge is `OFF`, start `mooncode browser-bridge` and click the extension icon once.
- If Chrome was closed, MoonCode tries to open the browser before failing.
- Use `browser_page clear_ui` to remove temporary labels/overlays.

