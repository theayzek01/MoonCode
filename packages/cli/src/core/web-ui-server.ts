// @ts-nocheck
import {
	createReadStream,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	rmSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEngineDir, getSessionsDir } from "../config.js";

const INDEX_HTML = `
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode Premium Dashboard</title>
  <link rel="stylesheet" href="/style.css" />
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
</head>
<body>
  <div id="app">
    <header class="topbar">
      <div class="logo">
        <div class="logo-circle"></div>
        <b>MoonCode</b>
        <span class="version-tag">2026-pre18</span>
      </div>
      <nav class="nav-links">
        <button id="tab-sessions" class="nav-btn">Session History</button>
        <button id="tab-designer" class="nav-btn active">Theme Designer</button>
      </nav>
    </header>

    <div id="sessions-view" class="tab-content">
      <div class="workspace-grid">
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2>Active Sessions</h2>
            <p class="hint">Select the session you want to inspect</p>
          </div>
          <div id="sessions"></div>
        </aside>

        <main class="chat-area">
          <div id="chat" class="panel empty">Please select a session from the left panel.</div>
        </main>

        <section class="stats-panel">
          <h2>Telemetry and Statistics</h2>
          <pre id="stats">-</pre>
        </section>
      </div>
    </div>

    <div id="designer-view" class="tab-content active">
      <div class="designer-grid">
        <aside class="designer-controls card">
          <h3>Preset Styles</h3>
          <div class="preset-buttons">
            <button class="preset-btn active" data-preset="brutalist">Neo Brutalist</button>
            <button class="preset-btn" data-preset="minimalist">Zen Minimalist</button>
            <button class="preset-btn" data-preset="editorial">High Editorial</button>
            <button class="preset-btn" data-preset="softwarm">Soft Warm</button>
            <button class="preset-btn" data-preset="techutility">Tech Utility</button>
          </div>

          <h3 style="margin-top: 24px;">Fine HSL Controls</h3>
          <div class="slider-group">
            <div class="slider-label"><span>Hue</span><span id="hue-val">160°</span></div>
            <input type="range" id="hue" min="0" max="360" value="160" class="slider" />
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>Saturation</span><span id="sat-val">60%</span></div>
            <input type="range" id="sat" min="0" max="100" value="60" class="slider" />
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>Lightness</span><span id="light-val">50%</span></div>
            <input type="range" id="light" min="10" max="90" value="50" class="slider" />
          </div>

          <div class="color-palette-preview">
            <h4>Generated Color Palette</h4>
            <div class="palette-swatches">
              <div class="swatch bg" title="Background">bg</div>
              <div class="swatch panel" title="Panel">pnl</div>
              <div class="swatch primary" title="Primary Accent">pri</div>
              <div class="swatch secondary" title="Secondary Accent">sec</div>
              <div class="swatch border" title="Border / Divider">bor</div>
            </div>
          </div>
        </aside>

        <main class="designer-preview card">
          <div class="preview-header">
            <h3>Live Component Preview</h3>
            <span class="preview-badge">Interactive Panel</span>
          </div>

          <div class="preview-container" id="preview-frame">
            <div class="preview-card">
              <span class="p-badge">Featured Component</span>
              <h2 class="p-title">MoonCode Design System</h2>
              <p class="p-text">This preview shows the generated HSL variables being applied to components in real time. Drag the sliders or select a preset to see the palette update instantly.</p>

              <div class="p-alert">
                <span class="p-alert-icon">✦</span>
                <span class="p-alert-text">Theme color values synchronized successfully.</span>
              </div>

              <div class="p-actions">
                <button class="p-btn primary">Interact</button>
                <button class="p-btn secondary">Dismiss</button>
              </div>
            </div>
          </div>
        </main>

        <section class="designer-export card">
          <h3>MoonCode AI Prompt</h3>
          <p class="hint">Copy this prompt into MoonCode to ask it to apply the selected design across your project.</p>
          <div class="code-container">
            <button class="copy-btn" id="copy-theme-btn">Copy Prompt</button>
            <textarea id="prompt-code" readonly style="width: 100%; height: 280px; background: #000000; color: #10b981; border: 1px solid var(--line); border-radius: 8px; padding: 12px; font-family: 'JetBrains Mono', monospace; font-size: 12px; resize: none; outline: none;"></textarea>
          </div>
        </section>
      </div>
    </div>
  </div>
  <script src="/app.js"></script>
</body>
</html>

`;

const STYLE_CSS = `:root {
  color-scheme: dark;
  --bg: #050608;
  --bg2: #090b10;
  --panel: rgba(15, 18, 25, .78);
  --panel2: #11151d;
  --line: rgba(255,255,255,.1);
  --line2: rgba(255,255,255,.16);
  --fg: #f3f5f7;
  --muted: #8d96a3;
  --muted2: #626b78;
  --green: #8bf6b5;
  --green2: #1ed77d;
  --shadow: 0 26px 90px rgba(0,0,0,.52);
  --radius: 22px;
  font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background:
    radial-gradient(circle at 24% -10%, rgba(30,215,125,.22), transparent 34rem),
    radial-gradient(circle at 88% 4%, rgba(100,140,255,.18), transparent 30rem),
    linear-gradient(180deg, #080a0f 0%, var(--bg) 44%, #030405 100%);
  color: var(--fg);
  min-height: 100vh;
  overflow-x: hidden;
}
body::before {
  content: "";
  position: fixed;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(rgba(255,255,255,.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.025) 1px, transparent 1px);
  background-size: 44px 44px;
  mask-image: linear-gradient(to bottom, #000, transparent 76%);
}
.grain {
  position: fixed;
  inset: 0;
  pointer-events: none;
  opacity: .18;
  background-image: radial-gradient(circle at 1px 1px, rgba(255,255,255,.28) 1px, transparent 0);
  background-size: 3px 3px;
  mix-blend-mode: overlay;
}
a { color: inherit; text-decoration: none; }
button { font: inherit; }
.shell { width: min(1160px, calc(100% - 32px)); margin: 0 auto; }
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  height: 72px;
  padding: 0 max(16px, calc((100vw - 1160px) / 2));
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid transparent;
  transition: background .18s ease, border-color .18s ease;
}
.topbar.scrolled { background: rgba(5,6,8,.74); border-color: var(--line); backdrop-filter: blur(18px); }
.brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 740; letter-spacing: -.03em; }
.mark { width: 34px; height: 34px; border: 1px solid var(--line); border-radius: 11px; display: grid; place-items: center; background: #0d1017; overflow: hidden; }
.mark img { width: 24px; height: 24px; object-fit: contain; }
.mark img[src=""] { display: none; }
.version { color: var(--green); border: 1px solid rgba(139,246,181,.22); background: rgba(139,246,181,.08); padding: 3px 8px; border-radius: 999px; font-size: 11px; letter-spacing: 0; }
.nav { display: flex; align-items: center; gap: 4px; }
.nav a, .menu { color: var(--muted); border: 1px solid transparent; border-radius: 999px; padding: 9px 13px; font-size: 14px; background: transparent; }
.nav a:hover, .menu:hover { color: var(--fg); background: rgba(255,255,255,.055); border-color: var(--line); }
.nav .github { color: var(--fg); border-color: var(--line); background: rgba(255,255,255,.045); }
.menu { display: none; }
.hero { min-height: calc(100vh - 72px); padding: 78px 0 56px; display: grid; grid-template-columns: minmax(0,1fr) minmax(360px,.72fr); gap: 56px; align-items: center; }
.label { margin: 0 0 16px; color: var(--green); font: 700 12px/1.4 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; letter-spacing: .12em; }
h1, h2, p { margin-top: 0; }
h1 { max-width: 820px; margin-bottom: 24px; font-size: clamp(54px, 8vw, 112px); line-height: .88; letter-spacing: -.082em; font-weight: 780; }
h2 { margin-bottom: 18px; font-size: clamp(34px, 5vw, 66px); line-height: .96; letter-spacing: -.064em; font-weight: 760; }
.lead, .body-text { max-width: 680px; color: var(--muted); font-size: clamp(17px, 2vw, 21px); line-height: 1.62; letter-spacing: -.018em; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 32px; }
.button { display: inline-flex; align-items: center; justify-content: center; min-height: 46px; padding: 0 18px; border-radius: 999px; border: 1px solid var(--line); font-weight: 680; }
.button.primary { background: var(--fg); color: #050608; border-color: var(--fg); }
.button.ghost { background: rgba(255,255,255,.045); color: var(--fg); }
.notes { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 36px; }
.notes span, .pill { color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 8px 11px; background: rgba(255,255,255,.035); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.terminal { border: 1px solid var(--line2); border-radius: var(--radius); background: linear-gradient(180deg, rgba(18,22,31,.92), rgba(8,10,14,.96)); box-shadow: var(--shadow); overflow: hidden; transform: rotate(1deg); }
.terminal-head { height: 48px; display: flex; align-items: center; gap: 8px; padding: 0 16px; border-bottom: 1px solid var(--line); color: var(--muted); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.terminal-head span { width: 10px; height: 10px; border-radius: 50%; background: #ff5f57; }
.terminal-head span:nth-child(2) { background: #febc2e; }
.terminal-head span:nth-child(3) { background: #28c840; }
.terminal-head b { margin-left: 8px; font-weight: 500; }
.terminal-body { padding: 22px; font: 13px/1.65 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.terminal-body em { color: var(--green); font-style: normal; }
.muted { color: var(--muted); }
.run { display: grid; grid-template-columns: 78px 1fr auto; gap: 10px; align-items: center; margin: 10px 0; padding: 12px; border: 1px solid var(--line); border-radius: 14px; background: rgba(0,0,0,.2); }
.run span { color: var(--green); }
.run strong { color: #dbe2e8; font-weight: 520; }
.run i { color: var(--muted2); font-style: normal; }
#terminal-note { margin-top: 18px; min-height: 120px; padding: 16px; border: 1px solid var(--line); border-radius: 16px; background: #05070a; color: #caefd8; white-space: pre-wrap; }
.brand-strip { padding: 18px; border: 1px solid var(--line); border-radius: 24px; background: rgba(255,255,255,.028); display: flex; align-items: center; justify-content: center; min-height: 110px; }
.brand-strip img { max-width: min(520px, 90%); max-height: 74px; opacity: .92; object-fit: contain; filter: drop-shadow(0 16px 38px rgba(0,0,0,.38)); }
.section { padding: 108px 0 0; }
.section-title { max-width: 760px; margin-bottom: 34px; }
.section-title.row { max-width: none; display: flex; align-items: end; justify-content: space-between; gap: 18px; }
.cards { display: grid; gap: 14px; }
.cards.four { grid-template-columns: repeat(4, minmax(0,1fr)); }
.card, .timeline div, .session-list, .chat-panel, .code-card { border: 1px solid var(--line); border-radius: var(--radius); background: linear-gradient(180deg, rgba(255,255,255,.055), rgba(255,255,255,.026)); box-shadow: inset 0 1px 0 rgba(255,255,255,.055); }
.card { min-height: 230px; padding: 22px; }
.card b { display: block; margin-bottom: 62px; font-size: 18px; letter-spacing: -.035em; }
.card p, .timeline p { color: var(--muted); line-height: 1.58; margin-bottom: 0; }
.split { display: grid; grid-template-columns: .88fr 1.12fr; gap: 44px; align-items: start; }
.timeline { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 14px; }
.timeline div { padding: 22px; min-height: 178px; }
.timeline span { color: var(--green); font: 12px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.timeline b { display: block; margin: 44px 0 8px; font-size: 20px; letter-spacing: -.04em; }
.session-grid { display: grid; grid-template-columns: 360px 1fr; gap: 14px; min-height: 540px; }
.session-list, .chat-panel { overflow: hidden; }
.session-list { max-height: 640px; overflow-y: auto; }
.session-item { display: block; width: 100%; text-align: left; border: 0; border-bottom: 1px solid var(--line); background: transparent; color: var(--fg); padding: 15px; cursor: pointer; }
.session-item:hover, .session-item.active { background: rgba(255,255,255,.05); }
.session-item.active { box-shadow: inset 3px 0 0 var(--green2); }
.session-item b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; }
.session-item span { display: block; margin-top: 5px; color: var(--muted2); font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pad { padding: 16px; }
.chat-head { height: 54px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 0 16px; border-bottom: 1px solid var(--line); }
.chat-head b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.chat-head span { color: var(--muted2); font-size: 12px; }
#chat { height: calc(100% - 54px); overflow-y: auto; padding: 16px; }
.chat-empty { display: grid; place-items: center; color: var(--muted); min-height: 420px; }
.msg { margin-bottom: 12px; padding: 14px; border: 1px solid var(--line); border-radius: 16px; background: rgba(0,0,0,.18); }
.msg.user { border-left: 3px solid #7aa7ff; }
.msg.assistant { border-left: 3px solid var(--green2); }
.msg.system { opacity: .78; }
.role { margin-bottom: 8px; color: var(--muted2); font: 700 11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; text-transform: uppercase; letter-spacing: .08em; }
.msg pre { margin: 0; color: #dfe7ee; white-space: pre-wrap; word-break: break-word; font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
.install { display: grid; grid-template-columns: .65fr 1fr; gap: 32px; align-items: start; }
.code-card { position: relative; overflow: hidden; }
.code-card pre { margin: 0; padding: 26px; overflow-x: auto; color: #d7ffe4; font: 13px/1.7 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
#copy-install { position: absolute; right: 14px; top: 14px; border: 1px solid var(--line); border-radius: 999px; background: rgba(255,255,255,.07); color: var(--fg); padding: 8px 12px; cursor: pointer; }
.footer { display: flex; justify-content: space-between; gap: 16px; padding: 54px 0 46px; color: var(--muted2); font-size: 14px; }
.footer a:hover { color: var(--fg); }
@media (max-width: 960px) {
  .menu { display: inline-flex; }
  .nav { position: absolute; inset: 72px 16px auto; display: none; flex-direction: column; align-items: stretch; padding: 10px; border: 1px solid var(--line); border-radius: 18px; background: rgba(8,10,14,.96); backdrop-filter: blur(18px); }
  .nav.open { display: flex; }
  .nav a { border-radius: 12px; }
  .hero, .split, .session-grid, .install { grid-template-columns: 1fr; }
  .cards.four { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .terminal { transform: none; }
}
@media (max-width: 620px) {
  .topbar { height: 64px; }
  .word { display: none; }
  .hero { padding-top: 48px; }
  h1 { font-size: clamp(46px, 15vw, 70px); }
  .cards.four, .timeline { grid-template-columns: 1fr; }
  .card { min-height: auto; }
  .card b, .timeline b { margin-bottom: 16px; margin-top: 0; }
  .section { padding-top: 76px; }
  .section-title.row { align-items: start; flex-direction: column; }
  .run { grid-template-columns: 1fr; gap: 2px; }
  .footer { flex-direction: column; }
}`;

const APP_JS = `const $ = (selector) => document.querySelector(selector);
const header = $('[data-header]');
const nav = $('#nav');
const menu = $('.menu');
const statusEl = $('#session-status');
const sessionsEl = $('#sessions-list');
const chatEl = $('#chat');
const chatTitle = $('#chat-title');
let activeSession = null;
let lastSessionSignature = '';

function syncHeader() {
  if (header) header.classList.toggle('scrolled', window.scrollY > 8);
}
window.addEventListener('scroll', syncHeader, { passive: true });
syncHeader();

if (menu && nav) {
  menu.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menu.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded', 'false');
    }
  });
}

const installButton = $('#copy-install');
if (installButton) {
  installButton.addEventListener('click', async () => {
    const code = $('#install-code')?.textContent || '';
    try {
      await navigator.clipboard.writeText(code.trim());
      const old = installButton.textContent;
      installButton.textContent = 'Copyndı';
      setTimeout(() => { installButton.textContent = old; }, 1300);
    } catch {
      installButton.textContent = 'Seçip kopyala';
    }
  });
}

const terminalLines = [
  'özet: incelendi → düzenlendi → doğrulandı',
  'kural: user changes korunur, destructive işlem sorulur',
  'browser: the active tab is read and the UI result is checked',
  'index: sadece gerektiğinde repo haritası çıkarılır'
];
let terminalIndex = 0;
setInterval(() => {
  const note = $('#terminal-note');
  if (!note) return;
  terminalIndex = (terminalIndex + 1) % terminalLines.length;
  note.textContent = terminalLines[terminalIndex];
}, 3200);

function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

function textOf(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) return content.map(textOf).filter(Boolean).join(String.fromCharCode(10));
  if (content.type === 'text') return content.text || '';
  if (typeof content.text === 'string') return content.text;
  try { return JSON.stringify(content, null, 2); } catch { return String(content); }
}

function compact(text, limit = 6000) {
  const value = String(text || '');
  if (value.length <= limit) return value;
  return value.slice(0, limit) + String.fromCharCode(10) + '… kırpıldı';
}

async function loadSessions(force = false) {
  if (!sessionsEl || document.hidden) return;
  try {
    const sessions = await fetch('/api/sessions', { cache: 'no-store' }).then((response) => response.json());
    const signature = sessions.map((session) => session.id + ':' + session.modified + ':' + session.messages).join('|');
    if (!force && signature === lastSessionSignature) return;
    lastSessionSignature = signature;
    if (statusEl) statusEl.textContent = sessions.length ? sessions.length + ' oturum' : 'oturum yok';
    if (!sessions.length) {
      sessionsEl.innerHTML = '<p class="muted pad">Henüz kaydedilmiş oturum yok.</p>';
      return;
    }
    sessionsEl.innerHTML = sessions.map((session) => {
      const id = escapeHtml(session.id || 'session');
      const cwd = escapeHtml(session.cwd || 'cwd yok');
      const time = session.modified ? new Date(session.modified).toLocaleString('tr-TR') : '';
      const active = session.id === activeSession ? ' active' : '';
      return '<button class="session-item' + active + '" data-id="' + id + '"><b>' + id + '</b><span>' + cwd + '</span><span>' + time + ' · ' + (session.messages || 0) + ' kayıt</span></button>';
    }).join('');
  } catch {
    if (statusEl) statusEl.textContent = 'bağlantı yok';
    sessionsEl.innerHTML = '<p class="muted pad">Oturum API okunamadı.</p>';
  }
}

async function loadSession(id) {
  if (!id || !chatEl) return;
  activeSession = id;
  document.querySelectorAll('.session-item').forEach((item) => item.classList.toggle('active', item.dataset.id === id));
  if (chatTitle) chatTitle.textContent = id;
  chatEl.className = '';
  chatEl.innerHTML = '<p class="muted pad">Oturum açılıyor…</p>';
  try {
    const data = await fetch('/api/session/' + encodeURIComponent(id), { cache: 'no-store' }).then((response) => response.json());
    const entries = Array.isArray(data.entries) ? data.entries.slice(-60) : [];
    chatEl.innerHTML = entries.map(renderEntry).filter(Boolean).join('') || '<p class="muted pad">Bu oturumda gösterilecek kayıt yok.</p>';
    chatEl.scrollTop = chatEl.scrollHeight;
  } catch {
    chatEl.innerHTML = '<p class="muted pad">Oturum okunamadı.</p>';
  }
}

function renderEntry(entry) {
  if (entry.type === 'message' && entry.message) {
    const role = entry.message.role || 'system';
    const className = role === 'user' ? 'user' : role === 'assistant' ? 'assistant' : 'system';
    const label = role === 'user' ? 'Kullanıcı' : role === 'assistant' ? 'MoonCode' : role;
    const content = compact(textOf(entry.message.content || entry.message.text || entry.message));
    return '<div class="msg ' + className + '"><div class="role">' + escapeHtml(label) + '</div><pre>' + escapeHtml(content) + '</pre></div>';
  }
  if (entry.type === 'toolCall') {
    return '<div class="msg system"><div class="role">tool · ' + escapeHtml(entry.toolName || '') + '</div><pre>' + escapeHtml(compact(JSON.stringify(entry.input || {}, null, 2), 3000)) + '</pre></div>';
  }
  if (entry.type === 'toolResult') {
    return '<div class="msg system"><div class="role">tool result</div><pre>' + escapeHtml(compact(textOf(entry.output || entry.result || entry), 3000)) + '</pre></div>';
  }
  return '';
}

if (sessionsEl) {
  sessionsEl.addEventListener('click', (event) => {
    const item = event.target.closest('.session-item');
    if (item) loadSession(item.dataset.id);
  });
  loadSessions(true);
  setInterval(() => loadSessions(false), 7500);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loadSessions(true); });
}`;

const APP_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode — Web Studio</title>
  <link rel="stylesheet" href="/app.css" />
</head>
<body>
  <div class="app-layout">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="brand">
          <span class="logo-emoji">🌝</span>
          <div class="brand-text">
            <h2>MoonCode</h2>
            <span>Web Studio</span>
          </div>
        </div>
      </div>
      <div class="session-search">
        <div class="search-wrapper">
          <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" class="search-icon"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input type="text" id="search-input" placeholder="Sessionsda ara..." />
        </div>
      </div>
      <div class="sessions-list" id="sessions-list">
        <!-- JS ile dolacak -->
      </div>
    </aside>

    <main class="chat-container">
      <header class="chat-header">
        <div class="active-session-info">
          <span class="status-indicator live"></span>
          <h3 id="active-session-name">Oturum Seçin</h3>
        </div>
        <div class="header-actions">
          <button class="btn btn-secondary" id="btn-unlock-tui">
            <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2" fill="none" style="margin-right: 6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            TUI'a Dön
          </button>
        </div>
      </header>

      <div class="messages-viewport" id="messages-viewport">
        <!-- JS ile dolacak (messages-content wrapper ile sarmalanacak) -->
        <div class="messages-content">
          <div class="welcome-screen">
            <span class="moon-mascot">🌝</span>
            <h1>Merhaba! Ben MoonCode.</h1>
            <p>Sol menüden canlı veya geçmiş bir oturum seçerek başlayın. Repo içerisindeki tüm akışı buradan izleyebilir ve yönlendirebilirsiniz.</p>
          </div>
        </div>
      </div>

      <footer class="input-bar">
        <div class="input-container">
          <form id="message-form" class="message-form">
            <textarea id="message-input" placeholder="MoonCode'a bir şeyler yazın... [Enter ile gönderir, Shift+Enter yeni satır]" rows="1"></textarea>
            <button type="submit" class="btn btn-primary" id="btn-send">
              <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            </button>
          </form>
          <div class="input-footer-text">MoonCode otonom bir geliştirme asistanıdır · v${VERSION}</div>
        </div>
      </footer>
    </main>
  </div>

  <div class="modal-overlay" id="unlock-modal">
    <div class="modal-card">
      <span class="modal-icon">🔓</span>
      <h2>TUI Kilidi Açıldı!</h2>
      <p>Terminalinize güvenle geri dönebilirsiniz. Bu tarayıcı sekmesini kapatabilirsiniz.</p>
      <button class="btn btn-primary" style="width: 100%; margin-top: 12px;" onclick="document.getElementById('unlock-modal').style.display='none'">Harika!</button>
    </div>
  </div>

  <script src="/app-client.js"></script>
</body>
</html>`;

const APP_CSS = `:root {
  --bg: #0d0f14;
  --sidebar-bg: #090b0f;
  --surface: #161922;
  --surface-hover: #1f2330;
  --surface-active: #242938;
  --border: #222736;
  --border-light: rgba(255,255,255,0.05);
  --border-hover: #2e3449;
  --fg: #f1f3f6;
  --muted: #8e96a7;
  --muted-dark: #586175;
  --accent: #58cc02;
  --accent-hover: #62e002;
  --accent-rose: #ff4766;
  --green: #58cc02;
  --green-light: rgba(88,204,2,0.12);
  --blue: #3b82f6;
  --blue-light: rgba(59,130,246,0.12);
  --yellow: #eab308;
  --yellow-light: rgba(234,179,8,0.06);
  --radius-lg: 16px;
  --radius-md: 12px;
  --radius-sm: 8px;
  --radius-xs: 6px;
  --shadow: 0 12px 40px rgba(0,0,0,0.3);
  --font-body: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  height: 100vh;
  overflow: hidden;
  font-family: var(--font-body);
}

.app-layout {
  display: grid;
  grid-template-columns: 300px minmax(0, 1fr);
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.sidebar {
  background: var(--sidebar-bg);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  height: 100%;
}

.sidebar-header {
  padding: 24px;
  border-bottom: 1px solid var(--border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-emoji {
  font-size: 32px;
  animation: bounce 3s infinite ease-in-out;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-4px); }
}

.brand-text h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.brand-text span {
  font-size: 12px;
  color: var(--accent);
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.session-search {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
}

.search-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--muted-dark);
  pointer-events: none;
}

.session-search input {
  width: 100%;
  padding: 10px 12px 10px 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: rgba(0,0,0,0.2);
  color: var(--fg);
  font-size: 14px;
  outline: none;
  transition: all 0.2s;
}

.session-search input:focus {
  border-color: var(--accent);
  background: rgba(0,0,0,0.3);
  box-shadow: 0 0 0 2px rgba(88, 204, 2, 0.15);
}

.sessions-list {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.session-card {
  padding: 14px 16px;
  border-radius: var(--radius-md);
  border: 1px solid transparent;
  background: rgba(255,255,255,0.01);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.session-card:hover {
  background: var(--surface-hover);
  border-color: var(--border-light);
}

.session-card.active {
  background: var(--surface);
  border-color: var(--border);
  box-shadow: var(--shadow);
}

.session-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.session-card b {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--fg);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.session-card-time {
  font-size: 11px;
  color: var(--muted-dark);
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.session-card-cwd {
  font-size: 12px;
  color: var(--muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-mono);
}

.chat-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
  position: relative;
  min-width: 0;
}

.chat-header {
  height: 72px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border);
  background: rgba(13,15,20,0.8);
  backdrop-filter: blur(16px);
  z-index: 10;
}

.active-session-info {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--muted-dark);
  flex-shrink: 0;
}

.status-indicator.live {
  background: var(--accent);
  box-shadow: 0 0 8px var(--accent);
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.15); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}

.active-session-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 650;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages-viewport {
  flex: 1;
  overflow-y: auto;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.messages-content {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
  min-height: 100%;
}

.welcome-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin: auto;
  text-align: center;
  max-width: 480px;
  padding: 40px 20px;
}

.moon-mascot {
  font-size: 64px;
  margin-bottom: 20px;
  animation: float 4s infinite ease-in-out;
  display: block;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-screen h1 {
  font-size: 26px;
  margin: 0 0 16px;
  font-weight: 750;
  letter-spacing: -0.02em;
}

.welcome-screen p {
  color: var(--muted);
  font-size: 15px;
  line-height: 1.6;
  margin: 0;
}

.msg-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 100%;
}

.msg-wrapper.user {
  align-items: flex-end;
}

.msg-wrapper.assistant {
  align-items: flex-start;
}

.msg-card {
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  font-size: 15px;
  line-height: 1.6;
  width: 100%;
  word-break: break-word;
  overflow-wrap: break-word;
  box-sizing: border-box;
}

.msg-wrapper.user .msg-card {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
  border-top-right-radius: 4px;
  max-width: 80%;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.msg-wrapper.assistant .msg-card {
  background: transparent;
  color: var(--fg);
  border: none;
  padding: 0;
  border-radius: 0;
  box-shadow: none;
}

.msg-author {
  font-size: 11px;
  font-weight: 750;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted-dark);
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
}

.msg-author-avatar {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 12px;
  background: var(--surface);
  border: 1px solid var(--border);
}

.msg-wrapper.user .msg-author {
  align-self: flex-end;
}

.thinking-card {
  background: var(--yellow-light);
  border: 1px solid rgba(234, 179, 8, 0.15);
  border-radius: var(--radius-md);
  margin: 8px 0;
  overflow: hidden;
  width: 100%;
}

.thinking-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
  user-select: none;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--yellow);
  transition: background 0.2s;
}

.thinking-header:hover {
  background: rgba(234, 179, 8, 0.04);
}

.thinking-content {
  padding: 16px;
  font-size: 13.5px;
  color: #d97706;
  line-height: 1.6;
  border-top: 1px solid rgba(234, 179, 8, 0.08);
  white-space: pre-wrap;
  font-family: var(--font-mono);
  background: rgba(0, 0, 0, 0.15);
}

.tool-card {
  background: var(--blue-light);
  border: 1px solid rgba(59, 130, 246, 0.18);
  border-radius: var(--radius-md);
  margin: 8px 0;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
}

.tool-header {
  padding: 12px 16px;
  font-weight: 600;
  color: #60a5fa;
  background: rgba(59, 130, 246, 0.03);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.tool-body {
  padding: 14px;
  border-top: 1px solid rgba(59, 130, 246, 0.1);
  background: rgba(0,0,0,0.2);
}

.tool-body pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--font-mono);
  font-size: 13px;
  color: #93c5fd;
}

.tool-result-card {
  background: var(--green-light);
  border: 1px solid rgba(88, 204, 2, 0.12);
  border-radius: var(--radius-md);
  margin: 8px 0;
  font-size: 13px;
  width: 100%;
  overflow: hidden;
}

.tool-result-header {
  padding: 10px 16px;
  font-weight: 600;
  color: #34d399;
  background: rgba(88, 204, 2, 0.03);
}

.tool-result-body {
  padding: 14px;
  border-top: 1px solid rgba(88, 204, 2, 0.08);
  background: rgba(0,0,0,0.2);
}

.tool-result-body pre {
  margin: 0;
  white-space: pre-wrap;
  font-family: var(--font-mono);
  font-size: 13px;
  color: #a7f3d0;
}

.code-block {
  background: #090b10;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  margin: 16px 0;
  overflow: hidden;
  max-width: 100%;
}

.code-header {
  padding: 8px 16px;
  background: #141722;
  border-bottom: 1px solid var(--border);
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--muted);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.code-block pre {
  margin: 0;
  overflow: auto;
}

.code-block code {
  display: block;
  padding: 16px;
  overflow-x: auto;
  font-family: var(--font-mono);
  font-size: 13.5px;
  line-height: 1.5;
  color: #e2e8f0;
}

.code-inline {
  background: rgba(255,255,255,0.06);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: #fca5a5;
}

.copy-code-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--muted);
  font-size: 11px;
  padding: 4px 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.copy-code-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--fg);
  border-color: var(--border-hover);
}

.table-container {
  overflow-x: auto;
  margin: 16px 0;
  border-radius: var(--radius-md);
  border: 1px solid var(--border);
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

th {
  background: var(--surface);
  padding: 10px 14px;
  font-weight: 600;
  text-align: left;
  border-bottom: 2px solid var(--border);
}

td {
  padding: 10px 14px;
  border-bottom: 1px solid var(--border);
}

tr:last-child td {
  border-bottom: none;
}

.input-bar {
  padding: 24px 16px;
  border-top: 1px solid var(--border);
  background: linear-gradient(180deg, transparent 0%, var(--bg) 20%);
  position: sticky;
  bottom: 0;
  z-index: 5;
}

.input-container {
  max-width: 800px;
  width: 100%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.message-form {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 24px;
  padding: 10px 14px 10px 22px;
  transition: all 0.2s ease-in-out;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.message-form:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(88, 204, 2, 0.15);
  background: var(--surface-hover);
}

.message-form textarea {
  flex: 1;
  background: transparent;
  border: none;
  color: var(--fg);
  font-size: 15px;
  line-height: 1.5;
  outline: none;
  resize: none;
  padding: 6px 0;
  max-height: 180px;
  font-family: inherit;
}

.input-footer-text {
  font-size: 11px;
  color: var(--muted-dark);
  text-align: center;
  margin-top: 4px;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  border: 1px solid transparent;
  outline: none;
  user-select: none;
}

.btn:active {
  transform: scale(0.97);
}

.btn-primary {
  background: var(--accent);
  color: #090a10;
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 2px 8px rgba(88, 204, 2, 0.2);
}

.btn-primary:hover {
  background: var(--accent-hover);
  box-shadow: 0 4px 12px rgba(88, 204, 2, 0.35);
}

.btn-secondary {
  background: var(--surface);
  color: var(--fg);
  border: 1px solid var(--border);
}

.btn-secondary:hover {
  background: var(--surface-hover);
  border-color: var(--border-hover);
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(5,5,8,0.85);
  backdrop-filter: blur(12px);
  z-index: 100;
  display: none;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: 36px;
  text-align: center;
  max-width: 420px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes popIn {
  from { transform: scale(0.9) translateY(10px); opacity: 0; }
  to { transform: scale(1) translateY(0); opacity: 1; }
}

.modal-icon {
  font-size: 48px;
  margin-bottom: 16px;
  display: block;
}

.modal-card h2 {
  margin: 0 0 12px;
  font-size: 20px;
  font-weight: 750;
}

.modal-card p {
  color: var(--muted);
  font-size: 14.5px;
  line-height: 1.6;
  margin: 0 0 24px;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--border-hover);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--muted-dark);
}
`;

const APP_CLIENT_JS = `const $ = (s) => document.querySelector(s);
let activeSessionId = null;
let currentSessionData = null;
let pollTimer = null;
let sessionsList = [];

function escapeHtml(text) {
  if (!text) return "";
  return String(text).replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));
}

function parseMarkdown(text) {
  if (!text) return "";

  const codeBlocks = [];
  let html = text.replace(/\`\`\`(\\w*)\\n([\\s\\S]*?)\`\`\`/g, (match, lang, code) => {
    const id = \`__CODE_BLOCK_\${codeBlocks.length}__\`;
    const escapedCode = escapeHtml(code);
    codeBlocks.push(
      '<div class="code-block">' +
        '<div class="code-header">' +
          '<span>' + escapeHtml(lang || "code") + '</span>' +
          '<button class="copy-code-btn" onclick="navigator.clipboard.writeText(decodeURIComponent(\\'' + encodeURIComponent(code) + '\\')).then(() => { this.innerText = \\'Copyndı\\'; setTimeout(() => this.innerText = \\'Copy\\', 1200); })">Copy</button>' +
        '</div>' +
        '<pre><code>' + escapedCode + '</code></pre>' +
      '</div>'
    );
    return id;
  });

  html = html.replace(/(?:^|\\n)(\\|[^\\n]+\\|\\r?\\n\\|[ \\t]*[-:|]+\\|[ \\t]*[\\s\\S]*?)(?=\\n\\n|\\n[^\\n|]|$)/g, (match, tableRaw) => {
    const lines = tableRaw.trim().split("\\n");
    if (lines.length < 2) return match;
    const headerRow = lines[0].split("|").slice(1, -1).map(c => c.trim());
    const bodyRows = lines.slice(2).map(line => line.split("|").slice(1, -1).map(c => c.trim()));

    let tableHtml = '<div class="table-container"><table><thead><tr>';
    headerRow.forEach(h => { tableHtml += '<th>' + escapeHtml(h) + '</th>'; });
    tableHtml += '</tr></thead><tbody>';
    bodyRows.forEach(row => {
      if (row.every(cell => cell === '')) return;
      tableHtml += '<tr>';
      row.forEach(cell => { tableHtml += '<td>' + escapeHtml(cell) + '</td>'; });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  html = escapeHtml(html);

  codeBlocks.forEach((block, idx) => {
    html = html.replace(\`__CODE_BLOCK_\${idx}__\`, block);
  });

  html = html.replace(/\\*\\*([^\\*]+)\\*\\*/g, '<strong>$1</strong>');
  html = html.replace(/\\*([^\\*]+)\\*/g, '<em>$1</em>');
  html = html.replace(/\`([^\`\\n]+)\`/g, '<code class="code-inline">$1</code>');

  html = html.split("\\n").map(p => '<p>' + p.replace(/\\n/g, '<br>') + '</p>').join("");

  return html;
}

function textOf(content) {
  if (!content) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(c => textOf(c)).join("\\n");
  if (content.type === "text") return content.text || "";
  if (content.type === "thinking") return content.thinking || "";
  try { return JSON.stringify(content); } catch { return String(content); }
}

async function loadSessions() {
  try {
    const res = await fetch("/api/sessions", { cache: "no-store" });
    const sessions = await res.json();
    sessionsList = sessions;
    renderSessions();
  } catch (err) {
    console.error("Sessions load error:", err);
  }
}

function renderSessions() {
  const query = ($("#search-input")?.value || "").toLowerCase().trim();
  const listEl = $("#sessions-list");
  if (!listEl) return;

  const filtered = sessionsList.filter(s => {
    return s.id.toLowerCase().includes(query) || (s.cwd || "").toLowerCase().includes(query);
  });

  if (filtered.length === 0) {
    listEl.innerHTML = '<p class="muted pad" style="font-size:13px; text-align:center; padding:32px 16px;">Oturum bulunamadı.</p>';
    return;
  }

  let html = "";
  filtered.forEach(s => {
    const activeClass = s.id === activeSessionId ? "active" : "";
    const dateStr = new Date(s.modified).toLocaleTimeString("tr-TR", { hour: '2-digit', minute: '2-digit' });
    html += \`
      <div class="session-card \${activeClass}" data-id="\${s.id}">
        <div class="session-card-header">
          <b>\${escapeHtml(s.id)}</b>
          <span class="session-card-time">\${dateStr}</span>
        </div>
        <span class="session-card-cwd">\${escapeHtml(s.cwd)}</span>
      </div>
    \`;
  });
  listEl.innerHTML = html;
}

async function loadSession(id, isPoll = false) {
  if (!id) return;
  try {
    const res = await fetch(\`/api/session/\${encodeURIComponent(id)}\`, { cache: "no-store" });
    const data = await res.json();
    currentSessionData = data;

    $("#active-session-name").textContent = id;

    const viewport = $("#messages-viewport");
    if (!viewport) return;

    const entries = data.entries || [];
    let html = "";

    entries.forEach(entry => {
      if (entry.type === "message") {
        const role = entry.message.role;
        if (role === "toolResult") return;

        const isUser = role === "user";
        const content = entry.message.content || entry.message;
        const textParts = Array.isArray(content) ? content : [content];

        let msgHtml = "";
        let thinkingHtml = "";

        textParts.forEach(part => {
          if (part.type === "text" || typeof part === "string" || part.text) {
            msgHtml += parseMarkdown(textOf(part));
          } else if (part.type === "thinking" && part.thinking.trim()) {
            thinkingHtml += \`
              <div class="thinking-card">
                <div class="thinking-header" onclick="this.nextElementSibling.style.display = this.nextElementSibling.style.display === 'none' ? 'block' : 'none'">
                  <span>💡 Düşünce Zinciri (Genişletmek için tıklayın)</span>
                  <span>▼</span>
                </div>
                <div class="thinking-content" style="display: none;">\\\${escapeHtml(part.thinking)}</div>
              </div>
            \`;
          }
        });

        if (msgHtml.trim() || thinkingHtml.trim()) {
          const wrapperClass = isUser ? "user" : "assistant";
          const avatar = isUser ? "👤" : "🌝";
          const authorLabel = isUser ? "Kullanıcı" : "MoonCode";

          html += \`
            <div class="msg-wrapper \${wrapperClass}">
              <div class="msg-author">
                <span class="msg-author-avatar">\\\${avatar}</span>
                <span>\\\${authorLabel}</span>
              </div>
              \\\${thinkingHtml}
              <div class="msg-card">
                \\\${msgHtml}
              </div>
            </div>
          \`;
        }
      } else if (entry.type === "toolCall") {
        html += \`
          <div class="tool-card">
            <div class="tool-header">
              <span>🛠️ Tool Çağrısı: <b>\\\${escapeHtml(entry.toolName)}</b></span>
              <span>Aktif</span>
            </div>
            <div class="tool-body">
              <pre><code>\\\${escapeHtml(JSON.stringify(entry.input || {}, null, 2))}</code></pre>
            </div>
          </div>
        \`;
      } else if (entry.type === "toolResult") {
        html += \`
          <div class="tool-result-card">
            <div class="tool-result-header">
              <span>✅ Tool Sonucu</span>
            </div>
            <div class="tool-result-body">
              <pre><code>\\\${escapeHtml(textOf(entry.output || entry.result || entry))}</code></pre>
            </div>
          </div>
        \`;
      }
    });

    const wasAtBottom = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 60;
    viewport.innerHTML = html ? \`<div class="messages-content">\${html}</div>\` : \`
      <div class="messages-content">
        <div class="welcome-screen">
          <span class="moon-mascot">🌝</span>
          <h1>Oturum Boş</h1>
          <p>Henüz bu oturumda kaydedilmiş bir mesaj yok. CLI üzerinden konuşma başlattığınızda burada anlık olarak akacaktır.</p>
        </div>
      </div>
    \`;

    if (!isPoll || wasAtBottom) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  } catch (err) {
    console.error("Session load error:", err);
  }
}

async function init() {
  try {
    const res = await fetch("/api/active-session");
    const data = await res.json();
    if (data.activeSessionId) {
      activeSessionId = data.activeSessionId;
    }
  } catch {}

  await loadSessions();
  if (activeSessionId) {
    await loadSession(activeSessionId);
  }

  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(() => {
    if (activeSessionId) {
      loadSession(activeSessionId, true);
    }
    loadSessions();
  }, 1000);
}

$("#sessions-list").addEventListener("click", (e) => {
  const card = e.target.closest(".session-card");
  if (card) {
    activeSessionId = card.dataset.id;
    const activeCard = $(".session-card.active");
    if (activeCard) activeCard.classList.remove("active");
    card.classList.add("active");
    loadSession(activeSessionId);
  }
});

$("#search-input")?.addEventListener("input", renderSessions);

$("#btn-unlock-tui").addEventListener("click", async () => {
  try {
    await fetch("/api/unlock", { method: "POST" });
    $("#unlock-modal").style.display = "flex";
  } catch (err) {
    alert("TUI kilidi açma hatası: " + err.message);
  }
});

$("#message-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = $("#message-input");
  const text = input.value.trim();
  if (!text) return;

  input.value = "";
  input.disabled = true;
  $("#btn-send").disabled = true;

  try {
    const res = await fetch("/api/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text })
    });
    const data = await res.json();
    if (!data.ok) {
      alert("Gönderim hatası: " + data.error);
    }
  } catch (err) {
    alert("Gönderim bağlantı hatası: " + err.message);
  } finally {
    input.disabled = false;
    $("#btn-send").disabled = false;
    input.focus();
    if (activeSessionId) {
      loadSession(activeSessionId);
    }
  }
});

$("#message-input").addEventListener("input", function() {
  this.style.height = "auto";
  this.style.height = (this.scrollHeight - 16) + "px";
});

$("#message-input").addEventListener("keydown", function(e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#message-form").dispatchEvent(new Event("submit"));
  }
});

init();
`;

const _webUiDir = dirname(fileURLToPath(import.meta.url));
const VIDEOEDIT_HTML: string = readFileSync(join(_webUiDir, "videoedit.html"), "utf-8");
const PHOTOEDIT_HTML: string = readFileSync(join(_webUiDir, "photoedit.html"), "utf-8");

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".png": "image/png",
	".jpg": "image/jpeg",
	".jpeg": "image/jpeg",
	".webp": "image/webp",
	".svg": "image/svg+xml",
	".ico": "image/x-icon",
};

function readJsonl(file: string): any[] {
	return readFileSync(file, "utf-8")
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line);
			} catch {
				return { type: "parse_error", raw: line };
			}
		});
}

function listSessionFiles(): string[] {
	const dir = getSessionsDir();
	if (!existsSync(dir)) return [];
	const files: string[] = [];
	for (const project of readdirSync(dir)) {
		const p = join(dir, project);
		if (!statSync(p).isDirectory()) continue;
		for (const f of readdirSync(p)) if (f.endsWith(".jsonl")) files.push(join(p, f));
	}
	return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function send(res: ServerResponse, status: number, body: string, contentType: string): void {
	res.writeHead(status, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
	res.end(body);
}

function json(res: ServerResponse, data: unknown): void {
	send(res, 200, JSON.stringify(data), MIME[".json"]);
}

function serveEmbedded(res: ServerResponse, pathname: string): boolean {
	if (pathname === "/" || pathname === "/index.html") {
		send(res, 200, INDEX_HTML, MIME[".html"]);
		return true;
	}
	if (pathname === "/style.css") {
		send(res, 200, STYLE_CSS, MIME[".css"]);
		return true;
	}
	if (pathname === "/app.js") {
		send(res, 200, APP_JS, MIME[".js"]);
		return true;
	}
	if (pathname === "/app" || pathname === "/app/index.html" || pathname === "/app/") {
		send(res, 200, APP_HTML, MIME[".html"]);
		return true;
	}
	if (pathname === "/app.css") {
		send(res, 200, APP_CSS, MIME[".css"]);
		return true;
	}
	if (pathname === "/app-client.js") {
		send(res, 200, APP_CLIENT_JS, MIME[".js"]);
		return true;
	}
	if (pathname === "/videoedit" || pathname === "/videoedit/index.html" || pathname === "/videoedit/") {
		send(res, 200, VIDEOEDIT_HTML, MIME[".html"]);
		return true;
	}
	if (pathname === "/photoedit" || pathname === "/photoedit/index.html" || pathname === "/photoedit/") {
		send(res, 200, PHOTOEDIT_HTML, MIME[".html"]);
		return true;
	}
	return false;
}

function serveAsset(res: ServerResponse, pathname: string): boolean {
	if (!pathname.startsWith("/assets/")) return false;
	const root = resolve(process.cwd(), "assets");
	const file = resolve(root, `.${decodeURIComponent(pathname.replace("/assets", ""))}`);
	if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) return false;
	res.writeHead(200, { "Content-Type": MIME[extname(file).toLowerCase()] || "application/octet-stream" });
	createReadStream(file).pipe(res);
	return true;
}

function serveStaticFile(res: ServerResponse, root: string, pathname: string): void {
	const file = pathname === "/" ? join(root, "index.html") : resolve(root, `.${pathname}`);
	if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
		res.writeHead(404);
		res.end("not found");
		return;
	}
	res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
	createReadStream(file).pipe(res);
}

export const editorActionsListeners = new Set<
	(data: { type: "video" | "photo"; action: string; params: any; state?: any }) => void
>();

export const webUiMessageListeners = new Set<(message: string) => void>();
export const webUiUnlockListeners = new Set<() => void>();
export const webUiAuthActionListeners = new Set<(action: any) => void | Promise<void>>();
export const webUiMcpActionListeners = new Set<(action: any) => void | Promise<void>>();
export let activeSessionId: string | null = null;
let authPanelStateProvider: (() => unknown) | undefined;
let mcpPanelStateProvider: (() => unknown) | undefined;
let authPanelOAuthEvent: any = null;

export function setAuthPanelStateProvider(provider: (() => unknown) | undefined): void {
	authPanelStateProvider = provider;
}

export function setMcpPanelStateProvider(provider: (() => unknown) | undefined): void {
	mcpPanelStateProvider = provider;
}

export function setAuthPanelOAuthEvent(event: any): void {
	authPanelOAuthEvent = { ...event, createdAt: Date.now() };
}

export function setActiveSessionId(id: string | null): void {
	activeSessionId = id;
}

const AUTH_PANEL_HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode Control Panel</title>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    :root {
      color-scheme: dark;
      --md-sys-color-primary: #5ae7a6;
      --md-sys-color-on-primary: #05110b;
      --md-sys-color-primary-container: #103624;
      --md-sys-color-secondary-container: #111815;
      --md-sys-color-surface: #030504;
      --md-sys-color-surface-container: #07100b;
      --md-sys-color-surface-container-high: #0c1410;
      --md-sys-color-outline: #1e3a2d;
      --md-sys-color-on-surface: #edf6ef;
      --md-sys-color-on-surface-variant: #8ea398;
      --radius: 18px;
      font-family: Inter, "Segoe UI", system-ui, sans-serif;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: radial-gradient(circle at top left, rgba(86,232,166,.09) 0, transparent 30%), linear-gradient(180deg, #010201, #050805 56%, #020403); color: var(--md-sys-color-on-surface); }
    .app { min-height: 100vh; display: grid; grid-template-columns: 280px 1fr; }
    aside { background: rgba(6, 10, 8, .88); backdrop-filter: blur(18px); padding: 24px 16px; border-right: 1px solid #11241a; }
    .brand { display: flex; align-items: center; gap: 12px; padding: 8px 12px 24px; font-weight: 700; font-size: 22px; }
    .mark { width: 38px; height: 38px; border-radius: 12px; background: linear-gradient(135deg,#5ae7a6,#0d7b4a); color: #05110b; display: grid; place-items: center; box-shadow: 0 0 28px rgba(90,231,166,.16); }
    nav button { width: 100%; border: 0; background: transparent; color: var(--md-sys-color-on-surface-variant); border-radius: 999px; padding: 14px 18px; text-align: left; font: inherit; cursor: pointer; display: flex; align-items: center; gap: 10px; }
    nav button.active { background: rgba(90,231,166,.08); color: var(--md-sys-color-on-surface); font-weight: 700; }
    main { padding: 28px; max-width: 1320px; width: 100%; }
    .top { display: flex; justify-content: space-between; gap: 16px; align-items: start; margin-bottom: 24px; }
    h1 { font-size: clamp(28px, 4vw, 48px); line-height: 1; margin: 0 0 10px; letter-spacing: 0; }
    .sub { color: var(--md-sys-color-on-surface-variant); margin: 0; max-width: 720px; }
    .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 16px; }
    .card { background: linear-gradient(180deg, rgba(10, 17, 13, .96), rgba(4, 8, 6, .98)); border-radius: var(--radius); padding: 22px; border: 1px solid #173122; box-shadow: 0 20px 50px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.03); }
    .hero { grid-column: span 8; min-height: 210px; background: linear-gradient(135deg, rgba(10,18,13,.98), rgba(4,7,5,.98)); }
    .side { grid-column: span 4; }
    .full { grid-column: 1 / -1; }
    .stat { display: grid; gap: 8px; }
    .stat b { font-size: 34px; }
    .actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 22px; }
    .btn { border: 0; border-radius: 999px; padding: 12px 18px; font-weight: 800; cursor: pointer; background: linear-gradient(135deg,#5ae7a6,#1db46f); color: var(--md-sys-color-on-primary); box-shadow: 0 12px 30px rgba(29,180,111,.18); transition: transform .18s ease, filter .18s ease; }
    .btn:hover { transform: translateY(-1px); filter: brightness(1.08); }
    .btn.secondary { background: rgba(255,255,255,.03); color: var(--md-sys-color-on-surface); border: 1px solid #18291f; }
    .btn.ghost { background: transparent; color: var(--md-sys-color-primary); border: 1px solid #233d2e; }
    table { width: 100%; border-collapse: collapse; overflow: hidden; }
    th, td { text-align: left; padding: 14px 10px; border-bottom: 1px solid #15261d; vertical-align: middle; }
    th { color: var(--md-sys-color-on-surface-variant); font-size: 12px; text-transform: uppercase; letter-spacing: .08em; }
    .pill { display: inline-flex; align-items: center; gap: 8px; padding: 7px 11px; border-radius: 999px; background: rgba(90,231,166,.09); font-size: 13px; }
    .muted { color: var(--md-sys-color-on-surface-variant); }
    .form { display: grid; gap: 14px; max-width: 760px; }
    select, input { width: 100%; border: 1px solid #22382d; border-radius: 14px; padding: 14px; background: #050906; color: var(--md-sys-color-on-surface); font: inherit; outline-color: var(--md-sys-color-primary); }
    .choice-grid,.provider-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px}
    .choice,.provider-card{border:1px solid #183022;background:rgba(4,10,7,.96);border-radius:22px;padding:20px;text-align:left;color:inherit;cursor:pointer;transition:.22s ease;min-height:188px}
    .choice:hover,.provider-card:hover{transform:translateY(-2px);border-color:#5ae7a6;box-shadow:0 18px 45px rgba(29,180,111,.12)}
    nav svg{width:18px;height:18px}.choice svg,.provider-card svg{width:28px;height:28px;color:#5ae7a6;margin-bottom:16px}
    .slide{animation:slideIn .28s ease both}@keyframes slideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
    .oauth-box { display: none; gap: 10px; padding: 16px; border-radius: 18px; background: #050907; border: 1px solid #214033; }
    .oauth-box.show { display: grid; }
    .oauth-url { word-break: break-all; color: var(--md-sys-color-primary); font-size: 13px; }
    label { display: grid; gap: 6px; font-weight: 650; }
    .hidden { display: none; }
    .toast { position: fixed; right: 22px; bottom: 22px; background: #1d1b20; color: white; padding: 14px 18px; border-radius: 16px; opacity: 0; transform: translateY(12px); transition: .18s; }
    .toast.show { opacity: 1; transform: translateY(0); }
    @media (max-width: 860px) {
      .app { grid-template-columns: 1fr; }
      aside { position: sticky; top: 0; z-index: 5; border-right: 0; border-bottom: 1px solid #143323; }
      nav { display: flex; overflow: auto; gap: 8px; }
      nav button { white-space: nowrap; width: auto; }
      .hero, .side { grid-column: 1 / -1; }
      main { padding: 18px; }
    }
  </style>
</head>
<body>
  <div class="app">
    <aside>
      <div class="brand"><span class="mark">M</span><span>MoonCode</span></div>
      <nav>
        <button class="active" data-tab="overview"><i data-lucide="layout-dashboard"></i> Control</button>
        <button data-tab="login"><i data-lucide="log-in"></i> Login</button>
        <button data-tab="accounts"><i data-lucide="users"></i> Accounts</button>
        <button data-tab="providers"><i data-lucide="plug"></i> Providers</button>
      </nav>
    </aside>
    <main>
      <section id="overview" class="tab">
        <div class="top"><div><h1>Control panel</h1><p class="sub">Manage accounts, provider status, usage notes, and login flows from one local dashboard.</p></div><button class="btn secondary" onclick="refresh()">Refresh</button></div>
        <div class="grid">
          <article class="card hero"><h2>Fast login</h2><p class="muted">Start subscription or API-key login here. OAuth URLs stay inside this panel and open automatically.</p><div class="actions"><button class="btn" onclick="showTab('login')">Open login</button><button class="btn secondary" onclick="showTab('login','api_key')">Use API key</button></div></article>
          <article class="card side stat"><span class="muted">Accounts</span><b id="statAccounts">0</b><span id="statActive" class="pill">none active</span></article>
          <article class="card side stat"><span class="muted">Providers</span><b id="statProviders">0</b><span class="muted">registry</span></article>
          <article class="card side stat"><span class="muted">Available models</span><b id="statModels">0</b><span class="muted">auth unlocked</span></article>
        </div>
      </section>
      <section id="login" class="tab hidden">
        <div class="top"><div><h1>Sign in</h1><p class="sub">Choose a provider, then complete either OAuth or API-key login. Everything stays inside this panel.</p></div></div>
        <div class="card form slide">
          <div class="muted">Two ways in. Pick one, choose a provider, finish in one place.</div>
          <div id="methodGrid" class="choice-grid">
            <button class="choice" onclick="chooseAuth('api_key')"><i data-lucide="key-round"></i><h2>API key</h2><p class="muted">Add a key, label it, save it locally.</p></button>
            <button class="choice" onclick="chooseAuth('oauth')"><i data-lucide="badge-check"></i><h2>Subscription</h2><p class="muted">Open the provider flow and return here.</p></button>
          </div>
          <input id="authType" type="hidden" value="oauth" />
          <div id="providerStep" class="hidden slide">
            <h2>Provider</h2>
            <p class="muted">Pick the account source you want MoonCode to use.</p>
            <div id="providerCards" class="provider-grid"></div>
          </div>
          <input id="provider" type="hidden" />
          <label id="labelWrap" class="hidden">Account label<input id="label" placeholder="Work, personal, or test" /></label>
          <label id="keyWrap" class="hidden">API key<input id="apiKey" type="password" autocomplete="off" placeholder="sk-..." /></label>
          <div id="oauthBox" class="oauth-box"><b>Login link</b><span id="oauthText" class="muted">Waiting for the provider URL.</span><a id="oauthLink" class="oauth-url" target="_blank" rel="noreferrer"></a></div>
          <div class="actions"><button class="btn" onclick="submitLogin()">Continue</button><button class="btn ghost" onclick="showTab('login')">Back</button></div>
        </div>
      </section>
      <section id="accounts" class="tab hidden">
        <div class="top"><div><h1>Accounts</h1><p class="sub">The active account is applied as provider credentials. Last use, use count, and quota notes stay here.</p></div></div>
        <article class="card full"><table><thead><tr><th>Active</th><th>Label</th><th>Provider</th><th>Type</th><th>Last used</th><th>Uses</th><th>Quota</th><th></th></tr></thead><tbody id="accountsTable"></tbody></table></article>
      </section>
      <section id="providers" class="tab hidden">
        <div class="top"><div><h1>Providers</h1><p class="sub">Model registry and authentication status.</p></div></div>
        <article class="card full"><table><thead><tr><th>Provider</th><th>Name</th><th>OAuth</th><th>API key</th><th>Status</th><th>Models</th></tr></thead><tbody id="providersTable"></tbody></table></article>
      </section>
    </main>
  </div>
  <div id="toast" class="toast"></div>
  <script>
    let state = { providers: [], accounts: [], models: { total: 0, available: 0 } };
    const tabs = [...document.querySelectorAll('.tab')];
    const nav = [...document.querySelectorAll('nav button')];
    function showTab(id, authType) {
      tabs.forEach(t => t.classList.toggle('hidden', t.id !== id));
      nav.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
      if (authType) document.getElementById('authType').value = authType;
      if (id === 'login' && !authType) {
        document.getElementById('methodGrid').classList.remove('hidden');
        document.getElementById('providerStep').classList.add('hidden');
        document.getElementById('provider').value = '';
        document.getElementById('labelWrap').classList.add('hidden');
        document.getElementById('keyWrap').classList.add('hidden');
        document.getElementById('oauthBox').classList.remove('show');
      }
      renderProviderOptions();
      if (window.lucide) lucide.createIcons();
    }
    nav.forEach(b => b.onclick = () => showTab(b.dataset.tab));
    function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2600); }
    function fmt(ts) { return ts ? new Date(ts).toLocaleString() : 'never'; }
    function providerIcon(id) {
      if (id.includes('anthropic')) return 'sparkles';
      if (id.includes('antigravity')) return 'orbit';
      if (id.includes('openai') || id.includes('chatgpt')) return 'bot';
      if (id.includes('github')) return 'github';
      if (id.includes('ollama')) return 'server';
      return 'plug';
    }
    function prettyProvider(p) {
      const id = p.id.toLowerCase();
      if (id.includes('anthropic')) return 'Anthropic';
      if (id.includes('antigravity')) return 'Antigravity';
      if (id.includes('openai') || id.includes('chatgpt')) return 'ChatGPT';
      if (id.includes('github')) return 'GitHub Copilot';
      if (id.includes('ollama')) return 'Ollama';
      return p.name;
    }
    function chooseAuth(type) {
      document.getElementById('authType').value = type;
      document.getElementById('provider').value = '';
      document.getElementById('labelWrap').classList.add('hidden');
      document.getElementById('keyWrap').classList.add('hidden');
      document.getElementById('oauthBox').classList.remove('show');
      document.getElementById('methodGrid').classList.add('hidden');
      document.getElementById('providerStep').classList.remove('hidden');
      renderProviderOptions();
    }
    async function action(payload) {
      const res = await fetch('/api/auth-panel/action', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || 'action failed');
      toast(json.message || 'Done');
      await refresh();
    }
    let oauthPollTimer = 0;
    async function pollOAuth(providerId) {
      clearInterval(oauthPollTimer);
      const box = document.getElementById('oauthBox');
      const text = document.getElementById('oauthText');
      const link = document.getElementById('oauthLink');
      box.classList.add('show');
      text.textContent = 'Waiting for login URL...';
      link.textContent = '';
      link.removeAttribute('href');
      oauthPollTimer = setInterval(async () => {
        try {
          const res = await fetch('/api/auth-panel/oauth-event?providerId=' + encodeURIComponent(providerId) + '&t=' + Date.now());
          const event = await res.json();
          if (event && event.error) {
            clearInterval(oauthPollTimer);
            text.textContent = event.error;
            return;
          }
          if (!event || !event.url) return;
          clearInterval(oauthPollTimer);
          text.textContent = event.instructions || 'Redirecting to provider login...';
          link.href = event.url;
          link.textContent = event.url;
          setTimeout(() => { window.location.href = event.url; }, 250);
        } catch (_) {}
      }, 700);
    }
    function renderProviderOptions() {
      const type = document.getElementById('authType').value;
      const hasProvider = Boolean(document.getElementById('provider').value);
      document.getElementById('labelWrap').classList.toggle('hidden', !hasProvider);
      document.getElementById('keyWrap').classList.toggle('hidden', type !== 'api_key' || !hasProvider);
      const providers = state.providers.filter(p => type === 'oauth' ? p.supportsOAuth : p.supportsApiKey);
      document.getElementById('providerCards').innerHTML = providers.map(p => '<button class="provider-card" onclick="selectProvider(\\'' + p.id + '\\')"><i data-lucide="' + providerIcon(p.id) + '"></i><h3>' + prettyProvider(p) + '</h3><p class="muted">' + p.id + '</p></button>').join('');
      if (window.lucide) lucide.createIcons();
    }
    function selectProvider(id) {
      document.getElementById('provider').value = id;
      renderProviderOptions();
      if (document.getElementById('authType').value === 'oauth') submitLogin();
    }
    async function submitLogin() {
      const authType = document.getElementById('authType').value;
      const providerId = document.getElementById('provider').value;
      const label = document.getElementById('label').value;
      const apiKey = document.getElementById('apiKey').value;
      if (!providerId) return toast('Select provider');
      if (authType === 'api_key' && !apiKey.trim()) return toast('Enter API key');
      if (authType === 'oauth') pollOAuth(providerId);
      try {
        await action({ action: authType === 'oauth' ? 'oauth_login' : 'save_api_key', providerId, label, apiKey });
        document.getElementById('apiKey').value = '';
      } catch (error) {
        clearInterval(oauthPollTimer);
        const message = error && error.message ? error.message : String(error);
        if (authType === 'oauth') {
          document.getElementById('oauthBox').classList.add('show');
          document.getElementById('oauthText').textContent = message;
        }
        toast(message);
      }
    }
    async function setActive(id) { await action({ action: 'set_active', accountId: id }); }
    async function removeAccount(id) { if (confirm('Remove this account?')) await action({ action: 'remove_account', accountId: id }); }
    function render() {
      document.getElementById('statAccounts').textContent = state.accounts.length;
      document.getElementById('statProviders').textContent = state.providers.length;
      document.getElementById('statModels').textContent = state.models.available || 0;
      const active = state.accounts.filter(a => a.active).map(a => a.provider + ': ' + a.label).join(', ');
      document.getElementById('statActive').textContent = active || 'none active';
      renderProviderOptions();
      document.getElementById('accountsTable').innerHTML = state.accounts.map(a => '<tr><td>' + (a.active ? '<span class="pill">active</span>' : '') + '</td><td><b>' + a.label + '</b><div class="muted">' + a.id + '</div></td><td>' + a.provider + '</td><td>' + a.type + '</td><td>' + fmt(a.lastUsedAt) + '</td><td>' + (a.useCount || 0) + '</td><td>' + (a.quotaLabel || 'no note') + '</td><td><button class="btn secondary" onclick="setActive(\\'' + a.id + '\\')">Make active</button> <button class="btn ghost" onclick="action({action:\\'next_account\\',providerId:\\'' + a.provider + '\\'})">Next</button> <button class="btn ghost" onclick="removeAccount(\\'' + a.id + '\\')">Remove</button></td></tr>').join('') || '<tr><td colspan="8" class="muted">No accounts yet. Add one from Login.</td></tr>';
      document.getElementById('providersTable').innerHTML = state.providers.map(p => '<tr><td>' + p.id + '</td><td><b>' + p.name + '</b></td><td>' + (p.supportsOAuth ? 'yes' : '-') + '</td><td>' + (p.supportsApiKey ? 'yes' : '-') + '</td><td>' + (p.auth.configured ? '<span class="pill">configured</span>' : '<span class="muted">' + (p.auth.source || 'empty') + '</span>') + '</td><td>' + p.modelCount + '</td></tr>').join('');
    }
    async function refresh() {
      const res = await fetch('/api/auth-panel');
      state = await res.json();
      render();
    }
    if (location.pathname === '/login') showTab('login');
    if (window.lucide) lucide.createIcons();
    refresh().catch(e => toast(e.message));
  </script>
</body>
</html>`;

const MCP_PANEL_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode MCP Control</title>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    :root{color-scheme:dark;--bg:#020503;--panel:#07110b;--panel2:#0d1b12;--line:#1d412c;--fg:#eafff2;--muted:#8db29c;--green:#56f0a4;--green2:#19b96b;--red:#ff5667;font-family:Inter,Roboto,"Segoe UI",system-ui,sans-serif}
    *{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 18% 0,#123d26 0,transparent 34%),linear-gradient(180deg,#020503,#07100b 55%,#010302);color:var(--fg)}
    .wrap{max-width:1320px;margin:0 auto;padding:30px}.hero{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:22px}.eyebrow{color:var(--green);font-weight:800;letter-spacing:.12em;text-transform:uppercase;font-size:12px}
    h1{font-size:clamp(34px,5vw,64px);line-height:.95;margin:8px 0 10px;letter-spacing:0}.sub{color:var(--muted);max-width:740px;margin:0}.grid{display:grid;grid-template-columns:repeat(12,1fr);gap:16px}.card{background:linear-gradient(180deg,rgba(16,34,23,.92),rgba(6,13,9,.95));border:1px solid var(--line);border-radius:22px;padding:20px;box-shadow:0 24px 70px rgba(0,0,0,.34),inset 0 1px 0 rgba(110,255,178,.08)}
    .wide{grid-column:span 8}.side{grid-column:span 4}.full{grid-column:1/-1}.toolbar{display:flex;gap:10px;flex-wrap:wrap}.btn{border:0;border-radius:999px;padding:12px 16px;font-weight:850;cursor:pointer;background:linear-gradient(135deg,var(--green),var(--green2));color:#021108;display:inline-flex;align-items:center;gap:8px}.btn.secondary{background:#12261a;color:var(--fg);border:1px solid var(--line)}.btn.danger{background:#301018;color:#ffdce1;border:1px solid #6b1f2d}
    .server-grid,.market-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.server,.market{border:1px solid var(--line);background:#07120c;border-radius:18px;padding:16px}.server h3,.market h3{margin:10px 0 6px}.status{display:inline-flex;padding:6px 10px;border-radius:999px;background:#102c1d;color:var(--green);font-size:12px;font-weight:800}.muted{color:var(--muted)}textarea,input{width:100%;background:#040906;color:var(--fg);border:1px solid var(--line);border-radius:14px;padding:12px;font:inherit}textarea{min-height:150px;resize:vertical}.row{display:grid;gap:10px;margin-top:12px}.toast{position:fixed;right:22px;bottom:22px;background:#102016;border:1px solid var(--line);border-radius:16px;padding:14px 16px;opacity:0;transform:translateY(10px);transition:.18s}.toast.show{opacity:1;transform:none}@media(max-width:860px){.wrap{padding:18px}.wide,.side{grid-column:1/-1}.hero{display:block}}
  </style>
</head>
<body>
  <div class="wrap">
    <section class="hero">
      <div><div class="eyebrow">MCP Control</div><h1>Connect tools without terminal noise.</h1><p class="sub">Manage Blender, Scratch/TurboWarp, and custom MCP servers from one local panel. Install, connect, restart, and add configs without dumping setup logs into the TUI.</p></div>
      <div class="toolbar"><button class="btn secondary" onclick="refresh()"><i data-lucide="refresh-cw"></i>Refresh</button><button class="btn" onclick="action({action:'restart'})"><i data-lucide="rotate-cw"></i>Restart manager</button></div>
    </section>
    <div class="grid">
      <article class="card wide"><h2>Installed providers</h2><div id="servers" class="server-grid"></div></article>
      <article class="card side"><h2>Runtime</h2><p class="muted" id="runtime">Loading...</p><div class="toolbar"><button class="btn" onclick="action({action:'connect_builtin',name:'blender'})"><i data-lucide="box"></i>Connect Blender</button><button class="btn" onclick="action({action:'connect_builtin',name:'scratch'})"><i data-lucide="blocks"></i>Connect Scratch</button></div></article>
      <article class="card full"><h2>MCP Market</h2><p class="muted">Search public registries, review the server, then paste a trusted config below. MoonCode keeps install decisions explicit for security.</p><div class="market-grid">
        <a class="market" href="https://mcp.so/?tab=latest" target="_blank" rel="noreferrer"><i data-lucide="store"></i><h3>MCP.so</h3><p class="muted">Large third-party MCP server directory.</p></a>
        <a class="market" href="https://mcpmarket.com/search" target="_blank" rel="noreferrer"><i data-lucide="shopping-bag"></i><h3>MCP Market</h3><p class="muted">Browse categories and search MCP servers.</p></a>
      </div></article>
      <article class="card full"><h2>Add custom MCP</h2><div class="row"><input id="customName" placeholder="Server name, e.g. postgres" /><textarea id="customConfig" placeholder='{"command":"npx","args":["-y","@modelcontextprotocol/server-filesystem","C:\\\\Users\\\\ozenc"]}'></textarea><button class="btn" onclick="addCustom()"><i data-lucide="plus"></i>Add and connect</button></div></article>
    </div>
  </div>
  <div id="toast" class="toast"></div>
  <script>
    let state={servers:[],clients:[],tools:0,error:null};
    function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');setTimeout(()=>el.classList.remove('show'),2400)}
    async function action(payload){const res=await fetch('/api/mcp-panel/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const json=await res.json();if(!json.ok)throw new Error(json.error||'Action failed');toast(json.message||'Done');await refresh()}
    async function addCustom(){const name=document.getElementById('customName').value.trim();let config;try{config=JSON.parse(document.getElementById('customConfig').value)}catch{toast('Invalid JSON config');return}await action({action:'add_custom',name,config})}
    async function refresh(){state=await fetch('/api/mcp-panel',{cache:'no-store'}).then(r=>r.json());document.getElementById('runtime').textContent=(state.clients.length||0)+' connected servers · '+(state.tools||0)+' MCP tools';document.getElementById('servers').innerHTML=state.servers.map(s=>'<div class="server"><span class="status">'+(s.connected?'connected':'ready')+'</span><h3>'+s.name+'</h3><p class="muted">'+s.command+' '+(s.args||[]).join(' ')+'</p><div class="toolbar"><button class="btn secondary" onclick="action({action:\\'connect\\',name:\\''+s.name+'\\'})"><i data-lucide="plug-zap"></i>Connect</button><button class="btn danger" onclick="action({action:\\'remove\\',name:\\''+s.name+'\\'})"><i data-lucide="trash-2"></i>Remove</button></div></div>').join('')||'<p class="muted">No MCP servers configured yet.</p>';if(window.lucide)lucide.createIcons()}
    refresh();if(window.lucide)lucide.createIcons();
  </script>
</body>
</html>`;

function getBrainFiles() {
	return {
		memorySignals: join(getEngineDir(), "memory-signals.json"),
		learning: join(getEngineDir(), "learning-experience.json"),
	};
}

function readJsonFileSafe(file: string): unknown {
	if (!existsSync(file)) return [];
	try {
		return JSON.parse(readFileSync(file, "utf-8"));
	} catch {
		return [];
	}
}

const BRAIN_PANEL_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode Brain</title>
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <style>
    :root{color-scheme:dark;--bg:#020503;--panel:#07110b;--line:#1d412c;--fg:#eafff2;--muted:#8db29c;--green:#56f0a4;--red:#ff5667;font-family:Inter,Roboto,"Segoe UI",system-ui,sans-serif}
    *{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top left,#143f29,transparent 35%),linear-gradient(180deg,#020503,#07100b);color:var(--fg)}.wrap{max-width:1180px;margin:0 auto;padding:32px}h1{font-size:clamp(36px,6vw,72px);line-height:.92;margin:8px 0}.sub{color:var(--muted);max-width:760px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.card{background:linear-gradient(180deg,rgba(16,34,23,.92),rgba(6,13,9,.95));border:1px solid var(--line);border-radius:22px;padding:20px}.full{grid-column:1/-1}.btn{border:0;border-radius:999px;padding:12px 16px;font-weight:850;cursor:pointer;background:linear-gradient(135deg,var(--green),#18b96a);color:#021108;display:inline-flex;gap:8px;align-items:center}.btn.danger{background:#301018;color:#ffdce1;border:1px solid #6b1f2d}.toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}textarea{width:100%;min-height:360px;background:#040906;color:var(--fg);border:1px solid var(--line);border-radius:16px;padding:14px;font:13px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}.muted{color:var(--muted)}@media(max-width:860px){.grid{grid-template-columns:1fr}.wrap{padding:18px}}
  </style>
</head>
<body>
  <main class="wrap">
    <p class="muted">DreamKernel / Memory</p>
    <h1>Brain control</h1>
    <p class="sub">Review, edit, or clear persisted memory signals and learned task traces. This keeps long sessions lighter without touching project files.</p>
    <div class="toolbar"><button class="btn" onclick="save()"><i data-lucide="save"></i>Save changes</button><button class="btn danger" onclick="clearBrain()"><i data-lucide="trash-2"></i>Clear brain</button><button class="btn" onclick="load()"><i data-lucide="refresh-cw"></i>Refresh</button></div>
    <section class="grid">
      <article class="card"><h2>Memory signals</h2><p class="muted" id="memoryPath"></p><textarea id="memory"></textarea></article>
      <article class="card"><h2>Learning traces</h2><p class="muted" id="learningPath"></p><textarea id="learning"></textarea></article>
    </section>
  </main>
  <script>
    async function load(){const s=await fetch('/api/brain-panel',{cache:'no-store'}).then(r=>r.json());memory.value=JSON.stringify(s.memorySignals,null,2);learning.value=JSON.stringify(s.learning,null,2);memoryPath.textContent=s.files.memorySignals;learningPath.textContent=s.files.learning;if(window.lucide)lucide.createIcons()}
    async function save(){let payload;try{payload={memorySignals:JSON.parse(memory.value||'[]'),learning:JSON.parse(learning.value||'[]')}}catch{alert('Invalid JSON');return}await fetch('/api/brain-panel/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'save',...payload})});await load()}
    async function clearBrain(){if(!confirm('Clear all persisted brain memory?'))return;await fetch('/api/brain-panel/action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'clear'})});await load()}
    load();
  </script>
</body>
</html>`;

export function startWebUiServer(options: { port?: number; staticRoot?: string } = {}) {
	const requestedPort = options.port ?? Number(process.env.MOON_WEB_PORT || 3131);
	const server = createServer((req, res) => {
		const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

		// Allow CORS preflight requests
		if (req.method === "OPTIONS") {
			res.writeHead(200, {
				"Access-Control-Allow-Origin": "*",
				"Access-Control-Allow-Methods": "POST, GET, OPTIONS",
				"Access-Control-Allow-Headers": "Content-Type",
			});
			res.end();
			return;
		}

		if (
			req.method === "POST" &&
			(url.pathname === "/api/videoedit/action" || url.pathname === "/api/photoedit/action")
		) {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", () => {
				try {
					const params = JSON.parse(body);
					const type = url.pathname.includes("videoedit") ? "video" : "photo";
					const actionName = params.action || "unknown";

					for (const listener of editorActionsListeners) {
						try {
							listener({ type, action: actionName, params, state: params.state });
						} catch (e) {
							console.error("[TUI Action Listener Error]", e);
						}
					}

					res.writeHead(200, {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					});
					res.end(JSON.stringify({ ok: true, message: `Action '${actionName}' sent to TUI agent.` }));
				} catch (err: any) {
					res.writeHead(400, {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": "*",
					});
					res.end(JSON.stringify({ ok: false, error: err.message }));
				}
			});
			return;
		}

		if (url.pathname === "/api/active-session") {
			return json(res, { activeSessionId });
		}
		if (url.pathname === "/api/auth-panel") {
			return json(
				res,
				authPanelStateProvider ? authPanelStateProvider() : { providers: [], accounts: [], models: {} },
			);
		}
		if (url.pathname === "/api/mcp-panel") {
			return json(res, mcpPanelStateProvider ? mcpPanelStateProvider() : { servers: [], clients: [], tools: 0 });
		}
		if (url.pathname === "/api/brain-panel") {
			const files = getBrainFiles();
			return json(res, {
				files,
				memorySignals: readJsonFileSafe(files.memorySignals),
				learning: readJsonFileSafe(files.learning),
			});
		}
		if (url.pathname === "/api/auth-panel/oauth-event") {
			const providerId = url.searchParams.get("providerId");
			if (providerId && authPanelOAuthEvent?.providerId && authPanelOAuthEvent.providerId !== providerId) {
				return json(res, {});
			}
			return json(res, authPanelOAuthEvent || {});
		}
		if (req.method === "POST" && url.pathname === "/api/auth-panel/action") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", async () => {
				try {
					const data = JSON.parse(body || "{}");
					if (data?.action === "oauth_login" && webUiAuthActionListeners.size === 0) {
						setAuthPanelOAuthEvent({
							providerId: data.providerId,
							error: "Auth panel is not connected to the running TUI session. Reopen /login from MoonCode.",
						});
						return json(res, {
							ok: false,
							error: "Auth panel is not connected to the running TUI session. Reopen /login from MoonCode.",
						});
					}
					for (const listener of webUiAuthActionListeners) {
						if (data?.action === "oauth_login") {
							setAuthPanelOAuthEvent({
								providerId: data.providerId,
								status: "pending",
								instructions: "Preparing provider login...",
							});
							Promise.resolve(listener(data)).catch((error) =>
								setAuthPanelOAuthEvent({ providerId: data.providerId, error: error?.message || String(error) }),
							);
						} else {
							await listener(data);
						}
					}
					return json(res, {
						ok: true,
						message: data?.action === "oauth_login" ? "Preparing login in this panel." : "Done.",
					});
				} catch (err: any) {
					return json(res, { ok: false, error: err.message });
				}
			});
			return;
		}
		if (req.method === "POST" && url.pathname === "/api/mcp-panel/action") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", async () => {
				try {
					const data = JSON.parse(body || "{}");
					for (const listener of webUiMcpActionListeners) {
						await listener(data);
					}
					return json(res, { ok: true, message: "MCP action complete." });
				} catch (err: any) {
					return json(res, { ok: false, error: err.message });
				}
			});
			return;
		}
		if (req.method === "POST" && url.pathname === "/api/brain-panel/action") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", async () => {
				try {
					const data = JSON.parse(body || "{}");
					const files = getBrainFiles();
					mkdirSync(dirname(files.memorySignals), { recursive: true });
					if (data?.action === "clear") {
						for (const file of Object.values(files)) rmSync(file, { force: true });
						return json(res, { ok: true });
					}
					if (data?.action === "save") {
						writeFileSync(files.memorySignals, `${JSON.stringify(data.memorySignals || [], null, 2)}\n`, "utf-8");
						writeFileSync(files.learning, `${JSON.stringify(data.learning || [], null, 2)}\n`, "utf-8");
						return json(res, { ok: true });
					}
					return json(res, { ok: false, error: "Unknown brain action." });
				} catch (err: any) {
					return json(res, { ok: false, error: err.message });
				}
			});
			return;
		}
		if (req.method === "POST" && url.pathname === "/api/message") {
			let body = "";
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", () => {
				try {
					const data = JSON.parse(body);
					const msg = data.message || "";
					if (msg.trim()) {
						for (const listener of webUiMessageListeners) {
							listener(msg);
						}
						return json(res, { ok: true });
					}
					return json(res, { ok: false, error: "Mesaj boş olamaz." });
				} catch (err: any) {
					return json(res, { ok: false, error: err.message });
				}
			});
			return;
		}
		if (req.method === "POST" && url.pathname === "/api/unlock") {
			for (const listener of webUiUnlockListeners) {
				listener();
			}
			return json(res, { ok: true });
		}

		if (url.pathname === "/api/sessions") {
			const sessions = listSessionFiles().map((file) => {
				const entries = readJsonl(file);
				const header = entries.find((e) => e.type === "session") || {};
				const st = statSync(file);
				return {
					id:
						header.id ||
						file
							.split(/[\\/]/)
							.pop()
							?.replace(/\.jsonl$/, ""),
					cwd: header.cwd,
					path: file,
					modified: st.mtimeMs,
					messages: entries.length - 1,
				};
			});
			return json(res, sessions);
		}
		if (url.pathname.startsWith("/api/session/")) {
			const id = decodeURIComponent(url.pathname.replace("/api/session/", ""));
			const file = listSessionFiles().find((f) => f.includes(id));
			if (!file) {
				res.writeHead(404);
				res.end("not found");
				return;
			}
			const entries = readJsonl(file);
			return json(res, { file, entries, stats: { entries: entries.length } });
		}
		if (url.pathname.startsWith("/api/stream/")) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			});
			const timer = setInterval(() => res.write(`event: ping\ndata: ${Date.now()}\n\n`), 2000);
			req.on("close", () => clearInterval(timer));
			return;
		}
		if (url.pathname === "/panel" || url.pathname === "/login") {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(AUTH_PANEL_HTML);
			return;
		}
		if (url.pathname === "/mcp") {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(MCP_PANEL_HTML);
			return;
		}
		if (url.pathname === "/session") {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(APP_HTML);
			return;
		}
		if (url.pathname === "/brain") {
			res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
			res.end(BRAIN_PANEL_HTML);
			return;
		}
		if (serveAsset(res, url.pathname)) return;
		if (options.staticRoot) return serveStaticFile(res, options.staticRoot, url.pathname);
		if (!serveEmbedded(res, url.pathname)) {
			res.writeHead(404);
			res.end("not found");
		}
	});
	server.on("error", (err: any) => {
		if (err.code === "EADDRINUSE") {
			server.listen(0, "127.0.0.1");
		} else {
			console.error(`\n\x1b[31m[Moon Web UI Error] ${err.message}\x1b[0m`);
		}
	});
	server.listen(requestedPort, "127.0.0.1");
	return {
		server,
		get url() {
			const address = server.address() as AddressInfo | null;
			const activePort = address?.port || requestedPort;
			return `http://127.0.0.1:${activePort}`;
		},
		get port() {
			const address = server.address() as AddressInfo | null;
			return address?.port || requestedPort;
		},
	};
}
