// @ts-nocheck
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { getSessionsDir } from "../config.js";

const INDEX_HTML = `<!doctype html>
<html lang="tr">
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
        <span class="version-tag">v2.1 Premium</span>
      </div>
      <nav class="nav-links">
        <button id="tab-sessions" class="nav-btn active">Oturum Geçmişi</button>
        <button id="tab-designer" class="nav-btn">Tema Tasarımcısı</button>
      </nav>
    </header>

    <!-- Sessions Tab Content -->
    <div id="sessions-view" class="tab-content active">
      <div class="workspace-grid">
        <aside class="sidebar">
          <div class="sidebar-header">
            <h2>Aktif Oturumlar</h2>
            <p class="hint">İncelemek istediğiniz oturumu seçin</p>
          </div>
          <div id="sessions"></div>
        </aside>
        
        <main class="chat-area">
          <div id="chat" class="panel empty">Lütfen sol panelden bir oturum seçin.</div>
        </main>
        
        <section class="stats-panel">
          <h2>Telemetri ve İstatistikler</h2>
          <pre id="stats">-</pre>
        </section>
      </div>
    </div>

    <!-- Designer Tab Content -->
    <div id="designer-view" class="tab-content">
      <div class="designer-grid">
        <aside class="designer-controls card">
          <h3>Hazır Stil Şablonları</h3>
          <div class="preset-buttons">
            <button class="preset-btn active" data-preset="brutalist">Neo Brutalist</button>
            <button class="preset-btn" data-preset="minimalist">Zen Minimalist</button>
            <button class="preset-btn" data-preset="editorial">High Editorial</button>
            <button class="preset-btn" data-preset="softwarm">Soft Warm</button>
            <button class="preset-btn" data-preset="techutility">Tech Utility</button>
          </div>

          <h3 style="margin-top: 24px;">HSL İnce Renk Ayarları</h3>
          <div class="slider-group">
            <div class="slider-label"><span>Ana Renk Tonu (Hue)</span><span id="hue-val">160°</span></div>
            <input type="range" id="hue" min="0" max="360" value="160" class="slider" />
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>Doygunluk (Saturation)</span><span id="sat-val">60%</span></div>
            <input type="range" id="sat" min="0" max="100" value="60" class="slider" />
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>Aydınlık (Lightness)</span><span id="light-val">50%</span></div>
            <input type="range" id="light" min="10" max="90" value="50" class="slider" />
          </div>

          <div class="color-palette-preview">
            <h4>Üretilen Renk Paleti</h4>
            <div class="palette-swatches">
              <div class="swatch bg" title="Arka Plan">bg</div>
              <div class="swatch panel" title="Panel">pnl</div>
              <div class="swatch primary" title="Birincil Vurgu">pri</div>
              <div class="swatch secondary" title="İkincil Vurgu">sec</div>
              <div class="swatch border" title="Kenarlık/Çizgi">bor</div>
            </div>
          </div>
        </aside>

        <main class="designer-preview card">
          <div class="preview-header">
            <h3>Bileşen Canlı Önizlemesi</h3>
            <span class="preview-badge">Etkileşimli Panel</span>
          </div>
          
          <div class="preview-container" id="preview-frame">
            <div class="preview-card">
              <span class="p-badge">Öne Çıkan Bileşen</span>
              <h2 class="p-title">MoonCode Tasarım Sistemi</h2>
              <p class="p-text">Bu önizleme, üretilen HSL değişkenlerinin gerçek zamanlı olarak bileşenlere uygulanmasını gösterir. Değerleri değiştirmek için kaydırıcıları sürükleyebilir veya hazır şablonları seçebilirsiniz.</p>
              
              <div class="p-alert">
                <span class="p-alert-icon">✦</span>
                <span class="p-alert-text">Tema renk değerleri başarıyla senkronize edildi.</span>
              </div>

              <div class="p-actions">
                <button class="p-btn primary">Etkileşime Geç</button>
                <button class="p-btn secondary">Kapat</button>
              </div>
            </div>
          </div>
        </main>

        <section class="designer-export card">
          <h3>Tema Dışa Aktarım Kodu</h3>
          <p class="hint">Apache-2.0 Lisanslı CSS Değişkenleri</p>
          <div class="code-container">
            <button class="copy-btn" id="copy-theme-btn">CSS'i Kopyala</button>
            <pre id="theme-code"></pre>
          </div>
        </section>
      </div>
    </div>
  </div>
  <script src="/app.js"></script>
</body>
</html>`;

const STYLE_CSS = `:root {
  --bg-h: 220;
  --bg-s: 15%;
  --bg-l: 7%;
  
  --bg: hsl(var(--bg-h), var(--bg-s), var(--bg-l));
  --panel: hsl(var(--bg-h), var(--bg-s), calc(var(--bg-l) + 5%));
  --panel-hover: hsl(var(--bg-h), var(--bg-s), calc(var(--bg-l) + 10%));
  --line: hsl(var(--bg-h), var(--bg-s), calc(var(--bg-l) + 12%));
  --fg: #f1f5f9;
  --muted: #94a3b8;
  --accent: #10b981;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--fg);
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  overflow: hidden;
}

::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--line);
  border-radius: 4px;
}

#app {
  display: grid;
  grid-template-rows: auto 1fr;
  height: 100vh;
  padding: 16px;
  gap: 16px;
}

.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 24px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo-circle {
  width: 14px;
  height: 14px;
  background: var(--accent);
  border-radius: 50%;
  box-shadow: 0 0 12px var(--accent);
  animation: pulse 2s infinite;
}
@keyframes pulse {
  0% { transform: scale(0.9); opacity: 0.8; }
  50% { transform: scale(1.1); opacity: 1; }
  100% { transform: scale(0.9); opacity: 0.8; }
}
.logo b {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 18px;
  letter-spacing: -0.02em;
}
.version-tag {
  background: rgba(16, 185, 129, 0.1);
  color: var(--accent);
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 20px;
  font-weight: 600;
}

.nav-links {
  display: flex;
  gap: 12px;
}
.nav-btn {
  background: transparent;
  border: 1px solid transparent;
  color: var(--muted);
  cursor: pointer;
  font-family: 'Outfit', sans-serif;
  font-weight: 500;
  font-size: 14px;
  padding: 6px 16px;
  border-radius: 8px;
  transition: all 0.2s ease;
}
.nav-btn:hover {
  color: var(--fg);
  background: rgba(255, 255, 255, 0.05);
}
.nav-btn.active {
  color: var(--fg);
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--line);
}

.tab-content {
  display: none;
  height: 100%;
  overflow: hidden;
}
.tab-content.active {
  display: grid;
  height: 100%;
}

.workspace-grid {
  display: grid;
  grid-template-columns: 320px 1fr 300px;
  height: 100%;
  gap: 16px;
  overflow: hidden;
}

.sidebar, .chat-area, .stats-panel {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid var(--line);
}
.sidebar-header h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--fg);
}
.hint {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--muted);
}

.session {
  padding: 14px;
  border-bottom: 1px solid var(--line);
  cursor: pointer;
  transition: background 0.2s ease;
}
.session:hover {
  background: var(--panel-hover);
}
.session.active {
  background: rgba(16, 185, 129, 0.05);
  border-left: 3px solid var(--accent);
}
.session b {
  font-family: 'Outfit', sans-serif;
  color: var(--fg);
  font-size: 13px;
}
.muted {
  font-size: 11px;
  color: var(--muted);
}

.chat-area {
  padding: 24px;
}
.panel.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--muted);
  height: 100%;
  font-size: 14px;
}

.msg {
  background: hsl(var(--bg-h), var(--bg-s), calc(var(--bg-l) + 3%));
  border: 1px solid var(--line);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}
.role {
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--accent);
  margin-bottom: 8px;
}
pre {
  margin: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  color: #e2e8f0;
}

.stats-panel {
  padding: 20px;
}
.stats-panel h2 {
  margin: 0 0 16px;
  font-size: 14px;
  color: var(--fg);
}
#stats {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--muted);
  overflow-x: auto;
}

.designer-grid {
  display: grid;
  grid-template-columns: 340px 1fr 340px;
  height: 100%;
  gap: 16px;
}

.card {
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 20px;
  overflow-y: auto;
}

.card h3 {
  margin: 0 0 16px;
  font-size: 15px;
  font-family: 'Outfit', sans-serif;
  font-weight: 600;
  color: var(--fg);
}

.preset-buttons {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}
.preset-btn {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid var(--line);
  color: var(--muted);
  padding: 10px 16px;
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  font-weight: 500;
  transition: all 0.2s ease;
}
.preset-btn:hover {
  background: var(--panel-hover);
  color: var(--fg);
}
.preset-btn.active {
  background: rgba(16, 185, 129, 0.08);
  border-color: var(--accent);
  color: var(--fg);
}

.slider-group {
  margin-bottom: 16px;
}
.slider-label {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: var(--muted);
  margin-bottom: 6px;
}
.slider {
  -webkit-appearance: none;
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: var(--line);
  outline: none;
}
.slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--accent);
  cursor: pointer;
  transition: transform 0.1s ease;
}
.slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.color-palette-preview {
  margin-top: 24px;
  border-top: 1px solid var(--line);
  padding-top: 16px;
}
.color-palette-preview h4 {
  margin: 0 0 12px;
  font-size: 13px;
  color: var(--muted);
}
.palette-swatches {
  display: flex;
  gap: 8px;
}
.swatch {
  flex: 1;
  height: 40px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  color: #fff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.5);
  border: 1px solid rgba(255,255,255,0.05);
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.preview-header h3 {
  margin: 0;
}
.preview-badge {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--line);
  color: var(--muted);
  font-size: 11px;
  padding: 4px 10px;
  border-radius: 20px;
  font-weight: 500;
}

.preview-container {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--p-bg, #0b0f17);
  border-radius: 12px;
  min-height: 340px;
  border: 1px solid var(--p-line, #243044);
  transition: all 0.3s ease;
}

.preview-card {
  background: var(--p-panel, #111827);
  border: 1px solid var(--p-line, #243044);
  padding: 24px;
  border-radius: var(--p-radius, 12px);
  width: 100%;
  max-width: 400px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.25);
  transition: all 0.3s ease;
}

.p-badge {
  background: rgba(255,255,255,0.05);
  color: var(--p-primary, #10b981);
  font-size: 11px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 20px;
  display: inline-block;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.p-title {
  margin: 0 0 8px;
  font-size: 20px;
  color: var(--p-fg, #fff);
  font-family: 'Outfit', sans-serif;
  font-weight: 700;
}

.p-text {
  margin: 0 0 16px;
  font-size: 13px;
  line-height: 1.6;
  color: var(--p-muted, #94a3b8);
}

.p-alert {
  background: var(--p-alert-bg, rgba(16, 185, 129, 0.05));
  border-left: 3px solid var(--p-primary, #10b981);
  padding: 10px 14px;
  border-radius: 6px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.p-alert-icon {
  color: var(--p-primary, #10b981);
  font-weight: 700;
}
.p-alert-text {
  font-size: 12px;
  color: var(--p-fg, #fff);
}

.p-actions {
  display: flex;
  gap: 10px;
}
.p-btn {
  flex: 1;
  padding: 10px 16px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;
}
.p-btn.primary {
  background: var(--p-primary, #10b981);
  color: var(--p-btn-fg, #fff);
}
.p-btn.primary:hover {
  opacity: 0.9;
}
.p-btn.secondary {
  background: transparent;
  border-color: var(--p-line, #243044);
  color: var(--p-muted, #94a3b8);
}
.p-btn.secondary:hover {
  background: var(--p-sec-bg);
  color: var(--p-fg);
}

.code-container {
  position: relative;
  height: calc(100% - 40px);
}
.copy-btn {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--accent);
  color: #fff;
  border: none;
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  font-size: 11px;
}
#theme-code {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  background: #070a0f;
  padding: 16px;
  border-radius: 8px;
  height: 100%;
  margin: 0;
  overflow: auto;
  border: 1px solid var(--line);
}
@media(max-width:1100px){
  #app { height: auto; overflow: auto; }
  .workspace-grid, .designer-grid {
    grid-template-columns: 1fr;
    height: auto;
  }
}`;

const APP_JS = `const PRESETS = {
  brutalist: {
    hue: 35, sat: 95, light: 55,
    css: (h, s, l) => \`/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
:root {
  --p-bg: #000000;
  --p-panel: #121212;
  --p-fg: #ffffff;
  --p-muted: #a0a0a0;
  --p-primary: hsl(\${h}, \${s}%, \${l}%);
  --p-primary-rgb: \${h}, \${s}%, \${l}%;
  --p-line: #ffffff;
  --p-radius: 0px;
  --p-sec-bg: #222222;
  --p-alert-bg: rgba(255, 255, 255, 0.05);
  --p-btn-fg: #000000;
}\`
  },
  minimalist: {
    hue: 0, sat: 0, light: 70,
    css: (h, s, l) => \`/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
:root {
  --p-bg: #09090b;
  --p-panel: #09090b;
  --p-fg: #fafafa;
  --p-muted: #71717a;
  --p-primary: hsl(\${h}, \${s}%, \${l}%);
  --p-primary-rgb: \${h}, \${s}%, \${l}%;
  --p-line: #27272a;
  --p-radius: 8px;
  --p-sec-bg: #18181b;
  --p-alert-bg: rgba(24, 24, 27, 0.5);
  --p-btn-fg: #09090b;
}\`
  },
  editorial: {
    hue: 24, sat: 40, light: 45,
    css: (h, s, l) => \`/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
:root {
  --p-bg: #0f0d0c;
  --p-panel: #161412;
  --p-fg: #f5f2eb;
  --p-muted: #a19a91;
  --p-primary: hsl(\${h}, \${s}%, \${l}%);
  --p-primary-rgb: \${h}, \${s}%, \${l}%;
  --p-line: #2d2925;
  --p-radius: 4px;
  --p-sec-bg: #1e1b18;
  --p-alert-bg: rgba(45, 41, 37, 0.3);
  --p-btn-fg: #f5f2eb;
}\`
  },
  softwarm: {
    hue: 30, sat: 50, light: 60,
    css: (h, s, l) => \`/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
:root {
  --p-bg: #17120e;
  --p-panel: #201b16;
  --p-fg: #fbf8f3;
  --p-muted: #baaf9f;
  --p-primary: hsl(\${h}, \${s}%, \${l}%);
  --p-primary-rgb: \${h}, \${s}%, \${l}%;
  --p-line: #372e25;
  --p-radius: 16px;
  --p-sec-bg: #29221a;
  --p-alert-bg: rgba(55, 46, 37, 0.4);
  --p-btn-fg: #17120e;
}\`
  },
  techutility: {
    hue: 200, sat: 75, light: 50,
    css: (h, s, l) => \`/*
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 */
:root {
  --p-bg: #070e17;
  --p-panel: #0a1424;
  --p-fg: #e2f1ff;
  --p-muted: #6b88a8;
  --p-primary: hsl(\${h}, \${s}%, \${l}%);
  --p-primary-rgb: \${h}, \${s}%, \${l}%;
  --p-line: #1c324e;
  --p-radius: 6px;
  --p-sec-bg: #0f2038;
  --p-alert-bg: rgba(28, 50, 78, 0.4);
  --p-btn-fg: #070e17;
}\`
  }
};

const $=s=>document.querySelector(s);
let current=null;

async function loadSessions(){
  const sessions=await fetch('/api/sessions').then(r=>r.json());
  $('#sessions').innerHTML=sessions.map(s=>\`<div class="session" data-id="\${s.id}"><b>\${s.id}</b><br><span class="muted">\${s.cwd||''}</span><br><span class="muted">\${new Date(s.modified).toLocaleString()} · \${s.messages} entries</span></div>\`).join('')||'<p class="muted panel">No sessions</p>';
  document.querySelectorAll('.session').forEach(el=>el.onclick=()=>loadSession(el.dataset.id));
}

function textOf(c){
  if(!c)return'';
  if(typeof c==='string')return c;
  if(Array.isArray(c))return c.map(textOf).join('\\n');
  if(c.type==='text')return c.text||'';
  return JSON.stringify(c,null,2);
}

async function loadSession(id){
  current=id;
  document.querySelectorAll('.session').forEach(e=>e.classList.toggle('active',e.dataset.id===id));
  const data=await fetch('/api/session/'+encodeURIComponent(id)).then(r=>r.json());
  $('#stats').textContent=JSON.stringify(data.stats,null,2);
  $('#chat').innerHTML=data.entries.filter(e=>e.role||e.type).map(e=>\`<div class="msg"><div class="role">\${e.role||e.type}</div><pre>\${escapeHtml(textOf(e.content||e.message||e.text||e))}</pre></div>\`).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function parseVariables(css) {
  const vars = {};
  const matches = css.match(/--p-[a-z0-9-]+:\\s*[^;\\n]+/g) || [];
  for (const m of matches) {
    const parts = m.split(':');
    if (parts.length === 2) {
      vars[parts[0].trim()] = parts[1].trim();
    }
  }
  return vars;
}

function getVal(css, name) {
  return parseVariables(css)[name] || '#fff';
}

function updateTheme() {
  const h = $('#hue').value;
  const s = $('#sat').value;
  const l = $('#light').value;

  $('#hue-val').textContent = h + '°';
  $('#sat-val').textContent = s + '%';
  $('#light-val').textContent = l + '%';

  const preset = document.querySelector('.preset-btn.active').dataset.preset;
  const code = PRESETS[preset].css(h, s, l);
  $('#theme-code').textContent = code;

  $('.swatch.bg').style.background = getVal(code, '--p-bg');
  $('.swatch.panel').style.background = getVal(code, '--p-panel');
  $('.swatch.primary').style.background = getVal(code, '--p-primary');
  $('.swatch.secondary').style.background = getVal(code, '--p-sec-bg');
  $('.swatch.border').style.background = getVal(code, '--p-line');

  const frame = $('#preview-frame');
  const vars = parseVariables(code);
  for (const [k, v] of Object.entries(vars)) {
    frame.style.setProperty(k, v);
  }
}

// Tab Events
$('#tab-sessions').onclick = () => {
  $('#tab-sessions').classList.add('active');
  $('#tab-designer').classList.remove('active');
  $('#sessions-view').classList.add('active');
  $('#designer-view').classList.remove('active');
};

$('#tab-designer').onclick = () => {
  $('#tab-designer').classList.add('active');
  $('#tab-sessions').classList.remove('active');
  $('#designer-view').classList.add('active');
  $('#sessions-view').classList.remove('active');
  updateTheme();
};

// Preset Events
document.querySelectorAll('.preset-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const preset = PRESETS[btn.dataset.preset];
    $('#hue').value = preset.hue;
    $('#sat').value = preset.sat;
    $('#light').value = preset.light;
    updateTheme();
  };
});

// Slider Events
['hue', 'sat', 'light'].forEach(id => {
  $('#' + id).oninput = updateTheme;
});

// Copy Action
$('#copy-theme-btn').onclick = () => {
  navigator.clipboard.writeText($('#theme-code').textContent);
  const originalText = $('#copy-theme-btn').textContent;
  $('#copy-theme-btn').textContent = 'Kopyalandı!';
  setTimeout(() => {
    $('#copy-theme-btn').textContent = originalText;
  }, 1500);
};

loadSessions();
setInterval(loadSessions, 5000);`;

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
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
	return false;
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

export function startWebUiServer(options: { port?: number; staticRoot?: string } = {}) {
	const port = options.port || Number(process.env.MOON_WEB_PORT || 3131);
	const server = createServer((req, res) => {
		const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
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
		if (options.staticRoot) return serveStaticFile(res, options.staticRoot, url.pathname);
		if (!serveEmbedded(res, url.pathname)) {
			res.writeHead(404);
			res.end("not found");
		}
	});
	server.on("error", (err: any) => {
		if (err.code === "EADDRINUSE") {
			if (!process.env.PI_TUI_MODE) {
				console.error(
					`\n\x1b[33m[Moon Web UI] Port ${port} is already in use. Dashboard may already be active.\x1b[0m`,
				);
			}
		} else {
			console.error(`\n\x1b[31m[Moon Web UI Error] ${err.message}\x1b[0m`);
		}
	});
	server.listen(port, "127.0.0.1");
	return { server, url: `http://127.0.0.1:${port}`, port };
}
