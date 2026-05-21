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
  <meta name="theme-color" content="#050608" />
  <meta name="description" content="MoonCode; terminalde çalışan, Türkçe öncelikli kodlama ajanı." />
  <title>MoonCode — Terminal coding agent</title>
  <link rel="stylesheet" href="/style.css" />
</head>
<body>
  <div class="grain" aria-hidden="true"></div>
  <header class="topbar" data-header>
    <a class="brand" href="#top" aria-label="MoonCode">
      <span class="mark"><img src="/assets/Mooncodewhitelogo.png" alt="" /></span>
      <span class="word">MoonCode</span>
      <span class="version">2026.11</span>
    </a>
    <button class="menu" type="button" aria-expanded="false" aria-controls="nav">Menü</button>
    <nav id="nav" class="nav" aria-label="Ana menü">
      <a href="#urun">Ürün</a>
      <a href="#akis">Akış</a>
      <a href="#oturumlar">Oturumlar</a>
      <a href="#kurulum">Kurulum</a>
      <a class="github" href="https://github.com/theayzek01/mooncode" target="_blank" rel="noreferrer">GitHub</a>
    </nav>
  </header>

  <main id="top">
    <section class="hero shell">
      <div class="hero-copy">
        <p class="label">MOONCODE / LOCAL AGENT</p>
        <h1>Repo içinde sessiz, hızlı ve kontrollü çalışır.</h1>
        <p class="lead">MoonCode terminalden çalışan Türkçe öncelikli kodlama ajanı. Dosyaları seçerek okur, küçük patch üretir, sonucu doğrular ve gereksiz çıktı basmadan işi kapatır.</p>
        <div class="actions">
          <a class="button primary" href="#kurulum">Kur</a>
          <a class="button ghost" href="#oturumlar">Canlı oturumları gör</a>
        </div>
        <div class="notes" aria-label="Öne çıkanlar">
          <span>/index gerektiğinde</span>
          <span>browser bridge</span>
          <span>minimal patch</span>
        </div>
      </div>

      <aside class="terminal" aria-label="MoonCode terminal önizlemesi">
        <div class="terminal-head"><span></span><span></span><span></span><b>mooncode</b></div>
        <div class="terminal-body">
          <p><em>$</em> mooncode</p>
          <p class="muted">workspace: C:/Users/ozenc/OneDrive/Desktop/mooncode</p>
          <div class="run"><span>inspect</span><strong>package graph, git state</strong><i>ok</i></div>
          <div class="run"><span>index</span><strong>only when context is needed</strong><i>ready</i></div>
          <div class="run"><span>patch</span><strong>exact replacements, user changes safe</strong><i>done</i></div>
          <pre id="terminal-note">özet: incelendi → düzenlendi → doğrulandı</pre>
        </div>
      </aside>
    </section>

    <section class="brand-strip shell" aria-label="MoonCode logo">
      <img src="/assets/MooncodeWhiteBanner.png" alt="MoonCode" />
    </section>

    <section class="section shell" id="urun">
      <div class="section-title">
        <p class="label">ÜRÜN</p>
        <h2>Gösteriş değil, çalışma disiplini.</h2>
      </div>
      <div class="cards four">
        <article class="card"><b>Seçici bağlam</b><p>Tüm projeyi modele doldurmak yerine ilgili dosyaları ve sembolleri hedefler.</p></article>
        <article class="card"><b>Türkçe akış</b><p>Komutlar, raporlar ve hata açıklamaları doğal Türkçe geliştirici diliyle gelir.</p></article>
        <article class="card"><b>Browser kontrolü</b><p>Bağlı Chrome sekmesini okuyabilir, tıklayabilir, form doldurabilir ve UI doğrulayabilir.</p></article>
        <article class="card"><b>Az gürültü</b><p>Terminali şişiren uzun dökümler yerine kısa plan, patch ve sonuç raporu verir.</p></article>
      </div>
    </section>

    <section class="section shell split" id="akis">
      <div>
        <p class="label">AKIŞ</p>
        <h2>MoonCode önce bakar, sonra dokunur.</h2>
        <p class="body-text">Standart döngü basit: mevcut değişiklikleri koru, gereken dosyayı oku, en küçük güvenli düzenlemeyi yap ve mümkünse test/build ile doğrula.</p>
      </div>
      <div class="timeline">
        <div><span>01</span><b>Inspect</b><p>Git durumu, dosya yapısı ve ilgili kaynaklar.</p></div>
        <div><span>02</span><b>Patch</b><p>Nokta atışı düzenleme; rastgele refactor yok.</p></div>
        <div><span>03</span><b>Verify</b><p>Komut, tarayıcı veya statik kontrol ile kanıt.</p></div>
        <div><span>04</span><b>Report</b><p>Kısa, net, kullanılabilir sonuç.</p></div>
      </div>
    </section>

    <section class="section shell sessions" id="oturumlar">
      <div class="section-title row">
        <div>
          <p class="label">DASHBOARD</p>
          <h2>Yerel oturum arşivi.</h2>
        </div>
        <span id="session-status" class="pill">yükleniyor</span>
      </div>
      <div class="session-grid">
        <aside class="session-list" id="sessions-list"><p class="muted pad">Oturumlar yükleniyor…</p></aside>
        <article class="chat-panel">
          <div class="chat-head"><b id="chat-title">Oturum seç</b><span>son 60 kayıt</span></div>
          <div id="chat" class="chat-empty">Soldan bir oturum seçince konuşma burada açılır.</div>
        </article>
      </div>
    </section>

    <section class="section shell install" id="kurulum">
      <div>
        <p class="label">KURULUM</p>
        <h2>Repo’dan çalıştır.</h2>
      </div>
      <div class="code-card">
        <button id="copy-install" type="button">Kopyala</button>
        <pre id="install-code">git clone https://github.com/theayzek01/mooncode.git
cd mooncode
npm install
npm run build
cd packages/cli && npm link
mooncode</pre>
      </div>
    </section>
  </main>

  <footer class="footer shell">
    <span>MoonCode 2026.11</span>
    <a href="https://github.com/theayzek01/mooncode" target="_blank" rel="noreferrer">github.com/theayzek01/mooncode</a>
  </footer>

  <script src="/app.js"></script>
</body>
</html>`;

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
      installButton.textContent = 'Kopyalandı';
      setTimeout(() => { installButton.textContent = old; }, 1300);
    } catch {
      installButton.textContent = 'Seçip kopyala';
    }
  });
}

const terminalLines = [
  'özet: incelendi → düzenlendi → doğrulandı',
  'kural: user changes korunur, destructive işlem sorulur',
  'browser: aktif sekme okunur, UI sonucu kontrol edilir',
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
const VIDEOEDIT_HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode Pro Video Studio</title>
  <style>
    :root {
      --bg: #0b0d12;
      --surface: #121620;
      --surface-hover: #1b212f;
      --border: #222a3a;
      --fg: #f3f5f7;
      --muted: #8d96a3;
      --accent: #1ed77d;
      --accent-dim: rgba(30, 215, 125, 0.15);
      --red: #ff5f56;
      --purple: #bf5af2;
      --blue: #0a84ff;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      height: 48px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
      letter-spacing: -0.02em;
    }
    .brand img {
      width: 18px;
      height: 18px;
    }
    .badge {
      font-size: 10px;
      background: var(--accent-dim);
      color: var(--accent);
      padding: 2px 6px;
      border-radius: 99px;
      border: 1px solid rgba(30, 215, 125, 0.3);
      font-weight: 600;
    }
    .main-layout {
      display: grid;
      grid-template-columns: 320px 1fr 300px;
      height: calc(100vh - 48px - 220px);
      border-bottom: 1px solid var(--border);
    }
    .panel {
      background: var(--surface);
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }
    .panel-header {
      height: 36px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding: 0 12px;
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      justify-content: space-between;
    }
    .panel-content {
      padding: 12px;
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    /* Timeline Panel */
    .timeline-container {
      height: 220px;
      background: var(--bg);
      display: flex;
      flex-direction: column;
      user-select: none;
    }
    .timeline-toolbar {
      height: 36px;
      border-bottom: 1px solid var(--border);
      background: var(--surface);
      display: flex;
      align-items: center;
      padding: 0 12px;
      justify-content: space-between;
      gap: 10px;
    }
    .timeline-tools {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .btn {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--fg);
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 4px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      font-weight: 500;
      transition: background 0.15s, border-color 0.15s;
    }
    .btn:hover {
      background: var(--border);
      border-color: var(--muted);
    }
    .btn.primary {
      background: var(--accent);
      color: #0b0d12;
      border-color: var(--accent);
    }
    .btn.primary:hover {
      background: #19b569;
    }
    .btn.danger {
      background: rgba(255, 95, 86, 0.15);
      color: #ff5f56;
      border-color: rgba(255, 95, 86, 0.3);
    }
    .btn.danger:hover {
      background: rgba(255, 95, 86, 0.25);
    }
    .tracks-area {
      flex: 1;
      overflow-x: auto;
      overflow-y: auto;
      position: relative;
      background: #08090d;
    }
    .ruler {
      height: 24px;
      background: #0d1017;
      border-bottom: 1px solid var(--border);
      position: sticky;
      top: 0;
      z-index: 10;
    }
    .track {
      height: 40px;
      border-bottom: 1px solid #171d29;
      display: flex;
      align-items: center;
      padding-left: 100px;
      position: relative;
    }
    .track-label {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 100px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      align-items: center;
      padding-left: 8px;
      font-size: 10px;
      font-weight: 600;
      color: var(--muted);
      z-index: 5;
    }
    .track-content {
      display: flex;
      align-items: center;
      height: 100%;
      position: relative;
      flex: 1;
    }
    .clip {
      position: absolute;
      height: 30px;
      background: rgba(10, 132, 255, 0.25);
      border: 1px solid #0a84ff;
      border-radius: 4px;
      display: flex;
      align-items: center;
      padding: 0 8px;
      font-size: 10px;
      color: #fff;
      cursor: pointer;
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
    }
    .clip.selected {
      border-color: #ff5f56;
      box-shadow: 0 0 0 1px #ff5f56;
      background: rgba(255, 95, 86, 0.2);
    }
    .clip.audio {
      background: rgba(191, 90, 242, 0.25);
      border-color: #bf5af2;
    }
    .clip.text {
      background: rgba(30, 215, 125, 0.25);
      border-color: #1ed77d;
    }
    .clip.effect {
      background: rgba(255, 214, 10, 0.25);
      border-color: #ffd60a;
    }
    .playhead {
      position: absolute;
      top: 0;
      bottom: 0;
      width: 2px;
      background: #ff5f56;
      z-index: 20;
      pointer-events: none;
    }
    .playhead-handle {
      position: absolute;
      top: 0;
      width: 10px;
      height: 10px;
      background: #ff5f56;
      border-radius: 50%;
      transform: translateX(-4px);
    }
    /* Preview Player */
    .preview-panel {
      border-left: 1px solid var(--border);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      background: #08090d;
      justify-content: center;
      align-items: center;
      position: relative;
    }
    .canvas-container {
      width: 100%;
      max-width: 520px;
      aspect-ratio: 16/9;
      background: #000;
      position: relative;
      border: 1px solid var(--border);
      border-radius: 8px;
      overflow: hidden;
    }
    .canvas-container.ratio-9-16 {
      aspect-ratio: 9/16;
      max-width: 260px;
    }
    .canvas-container.ratio-1-1 {
      aspect-ratio: 1/1;
      max-width: 320px;
    }
    canvas {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .player-controls {
      margin-top: 16px;
      display: flex;
      align-items: center;
      gap: 16px;
      background: var(--surface);
      padding: 8px 20px;
      border-radius: 99px;
      border: 1px solid var(--border);
    }
    /* Tabs & Library */
    .tabs {
      display: flex;
      border-bottom: 1px solid var(--border);
    }
    .tab {
      flex: 1;
      text-align: center;
      padding: 8px 0;
      font-size: 11px;
      color: var(--muted);
      cursor: pointer;
      border-bottom: 2px solid transparent;
    }
    .tab.active {
      color: var(--fg);
      border-bottom-color: var(--accent);
      font-weight: 600;
    }
    /* Properties & AI console */
    .property-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
    }
    .property-label {
      color: var(--muted);
    }
    .property-value {
      font-weight: 500;
    }
    .slider {
      width: 100%;
      accent-color: var(--accent);
    }
    .ai-logs {
      background: #07090e;
      border: 1px solid var(--border);
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 10px;
      color: #92e0b5;
      height: 150px;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .dropzone {
      border: 2px dashed var(--border);
      border-radius: 8px;
      padding: 24px;
      text-align: center;
      color: var(--muted);
      cursor: pointer;
      font-size: 11px;
      transition: background 0.15s, border-color 0.15s;
    }
    .dropzone:hover {
      background: var(--surface-hover);
      border-color: var(--accent);
    }
    /* Render Dialog */
    .modal {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.8);
      z-index: 100;
      place-items: center;
    }
    .modal-content {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 24px;
      width: 320px;
      text-align: center;
    }
    .progress-bar {
      height: 8px;
      background: #1d2433;
      border-radius: 4px;
      overflow: hidden;
      margin: 16px 0;
    }
    .progress-fill {
      height: 100%;
      background: var(--accent);
      width: 0%;
      transition: width 0.1s linear;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="badge">PRO</span>
      <span>MoonCode Pro Video Studio</span>
    </div>
    <div style="display: flex; gap: 8px; align-items: center;">
      <span id="bridge-status" style="font-size: 11px; color: var(--muted);">Browser Bridge: Bağlantı Yok</span>
      <button class="btn primary" id="btn-export" data-action="export">Export Video</button>
    </div>
  </header>

  <div class="main-layout">
    <!-- Sol Panel: Medya, Efektler vb. -->
    <div class="panel">
      <div class="tabs">
        <div class="tab active" data-tab="media">Medya</div>
        <div class="tab" data-tab="effects">Efektler</div>
        <div class="tab" data-tab="subtitles">Altyazı & Ses</div>
      </div>
      <div class="panel-content" id="tab-media">
        <div class="dropzone" id="dropzone">
          📁 Dosyaları Sürükleyin veya Tıklayın<br>
          <span style="font-size: 9px; opacity: 0.7;">MP4, MOV, MP3, PNG desteklenir</span>
          <input type="file" id="file-input" style="display: none;" multiple>
        </div>
        <div class="property-row">
          <span class="property-label">URL'den Video Yükle:</span>
        </div>
        <input type="text" id="url-input" placeholder="Video veya görsel URL yapıştır..." style="background:#07090e; border:1px solid var(--border); color:#fff; font-size:11px; padding:6px; border-radius:4px;">
        <button class="btn" id="btn-load-url" style="width:100%;">URL Yükle</button>
        
        <div style="margin-top: 10px;">
          <span style="font-size:11px; font-weight:600; color:var(--muted)">Medya Listesi</span>
          <div id="media-list" style="display:flex; flex-direction:column; gap:4px; margin-top:6px;">
            <!-- Dinamik yüklenecek -->
          </div>
        </div>
      </div>

      <div class="panel-content" id="tab-effects" style="display: none;">
        <span style="font-size:11px; font-weight:600; color:var(--muted)">CapCut AI Efektler</span>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
          <button class="btn effect-preset" data-preset="glitch">Glitch Art</button>
          <button class="btn effect-preset" data-preset="vhs">VHS Retro</button>
          <button class="btn effect-preset" data-preset="cinematic">AI Cinematic</button>
          <button class="btn effect-preset" data-preset="hologram">Hologram</button>
          <button class="btn effect-preset" data-preset="matrix">Matrix Stream</button>
          <button class="btn effect-preset" data-preset="nightvision">Night Vision</button>
          <button class="btn effect-preset" data-preset="thermal">Thermal</button>
          <button class="btn effect-preset" data-preset="soundwave">Sound Wave</button>
        </div>
        
        <span style="font-size:11px; font-weight:600; color:var(--muted); margin-top: 12px;">Geçişler (Transitions)</span>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 6px;">
          <button class="btn transition-preset" data-preset="fade">Fade Out/In</button>
          <button class="btn transition-preset" data-preset="zoom">Cross Zoom</button>
          <button class="btn transition-preset" data-preset="slide">Slide Left</button>
          <button class="btn transition-preset" data-preset="glitch-trans">Glitch Jump</button>
        </div>
      </div>

      <div class="panel-content" id="tab-subtitles" style="display: none;">
        <button class="btn primary" id="btn-ai-captions" style="width:100%;">🎙️ AI Otomatik Altyazı Üret</button>
        
        <div style="border-top:1px solid var(--border); margin-top:12px; padding-top:12px;">
          <span style="font-size:11px; font-weight:600; color:var(--muted)">AI Asistan Seslendirme (TTS)</span>
          <textarea id="tts-text" placeholder="Okunacak metni girin..." style="width:100%; background:#07090e; border:1px solid var(--border); color:#fff; font-size:11px; padding:6px; border-radius:4px; height:60px; margin-top:6px; resize:none;"></textarea>
          <div style="display:flex; justify-content:space-between; margin-top:6px; align-items:center;">
            <select id="tts-voice" style="background:#121620; border:1px solid var(--border); color:#fff; font-size:11px; padding:4px; border-radius:4px;">
              <option value="ahmet">Ahmet (Erkek)</option>
              <option value="ayse">Ayşe (Kadın)</option>
              <option value="can">Can (Genç)</option>
            </select>
            <button class="btn" id="btn-generate-tts">Sesi Ekle</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Orta Panel: Video Player -->
    <div class="preview-panel">
      <div class="canvas-container" id="player-container">
        <canvas id="preview-canvas"></canvas>
        <div id="subtitles-overlay" style="position:absolute; bottom:10%; left:5%; right:5%; text-align:center; color:#fff; text-shadow:0 2px 4px rgba(0,0,0,0.8); font-size:16px; font-weight:bold; pointer-events:none;"></div>
      </div>
      <div class="player-controls">
        <button class="btn" id="btn-prev" style="padding:4px 6px;">⏮</button>
        <button class="btn" id="btn-play" style="padding:4px 10px; font-weight:bold;">PLAY</button>
        <button class="btn" id="btn-next" style="padding:4px 6px;">⏭</button>
        <span id="player-time" style="font-family:monospace; font-size:11px;">00:00.00 / 00:10.00</span>
        <select id="aspect-ratio" style="background:#121620; border:1px solid var(--border); color:#fff; font-size:11px; padding:4px; border-radius:4px;">
          <option value="16-9">YouTube (16:9)</option>
          <option value="9-16">Shorts/TikTok (9:16)</option>
          <option value="1-1">Kare (1:1)</option>
        </select>
      </div>
    </div>

    <!-- Sağ Panel: Properties & Agent Log -->
    <div class="panel">
      <div class="panel-header">
        <span>ÖZELLİKLER & AYARLAR</span>
      </div>
      <div class="panel-content">
        <div id="no-selection" style="text-align:center; color:var(--muted); font-size:11px; padding:20px 0;">
          Düzenlemek için timeline'dan bir klip seçin
        </div>
        <div id="clip-properties" style="display:none; flex-direction:column; gap:10px;">
          <div class="property-row">
            <span class="property-label">Klip İsmi:</span>
            <span class="property-value" id="prop-name">-</span>
          </div>
          <div class="property-row">
            <span class="property-label">Süre:</span>
            <span class="property-value" id="prop-duration">-</span>
          </div>
          <div>
            <span class="property-label" style="font-size:10px;">Hız (Speed): <b id="speed-val">1.0x</b></span>
            <input type="range" class="slider" id="prop-speed" min="0.25" max="10" step="0.25" value="1">
          </div>
          <div>
            <span class="property-label" style="font-size:10px;">Ses Düzeyi (Volume): <b id="volume-val">100%</b></span>
            <input type="range" class="slider" id="prop-volume" min="0" max="100" value="100">
          </div>
          <div style="display:flex; gap:6px; margin-top:6px;">
            <button class="btn danger" id="btn-delete-clip" style="flex:1;">Klibi Sil</button>
          </div>
        </div>

        <div style="border-top:1px solid var(--border); margin-top:10px; padding-top:12px; display:flex; flex-direction:column; gap:8px;">
          <span style="font-size:11px; font-weight:600; color:var(--muted)">AI Command Bridge & Log</span>
          <div class="ai-logs" id="ai-logs">Sistem aktif. Yapay Zeka komutları bekleniyor...</div>
        </div>
      </div>
    </div>
  </div>

  <!-- Timeline Alanı -->
  <div class="timeline-container">
    <div class="timeline-toolbar">
      <div class="timeline-tools">
        <button class="btn" id="btn-split" data-action="split">✂️ Böl (Split)</button>
        <button class="btn" id="btn-clear-timeline">🧹 Temizle</button>
        <button class="btn" id="btn-add-text">📝 Yazı Ekle</button>
      </div>
      <div style="display:flex; align-items:center; gap:8px;">
        <span style="font-size:10px; color:var(--muted)">Timeline Zoom:</span>
        <input type="range" class="slider" id="timeline-zoom" min="1" max="10" value="5" style="width:80px;">
      </div>
    </div>
    <div class="tracks-area" id="tracks-area">
      <div class="ruler" id="timeline-ruler"></div>
      <div class="playhead" id="playhead"><div class="playhead-handle"></div></div>
      
      <!-- Video Track -->
      <div class="track">
        <div class="track-label">🎞️ Track 1 (Video)</div>
        <div class="track-content" id="track-video"></div>
      </div>
      
      <!-- Audio Track -->
      <div class="track">
        <div class="track-label">🎵 Track 2 (Audio)</div>
        <div class="track-content" id="track-audio"></div>
      </div>
      
      <!-- Text Track -->
      <div class="track">
        <div class="track-label">✍️ Track 3 (Text)</div>
        <div class="track-content" id="track-text"></div>
      </div>

      <!-- Effect Track -->
      <div class="track">
        <div class="track-label">✨ Track 4 (Effects)</div>
        <div class="track-content" id="track-effects"></div>
      </div>
    </div>
  </div>

  <!-- Exporting Modal -->
  <div class="modal" id="export-modal">
    <div class="modal-content">
      <h3 style="margin-top:0; font-size:16px;">Video Render Ediliyor</h3>
      <p style="font-size:12px; color:var(--muted);" id="render-status">Yapay zeka efektleri uygulanıyor ve kareler birleştiriliyor...</p>
      <div class="progress-bar">
        <div class="progress-fill" id="export-progress"></div>
      </div>
      <div style="display:flex; gap:8px; justify-content:center; margin-top:12px;">
        <button class="btn" id="btn-cancel-render">İptal Et</button>
        <a class="btn primary" id="btn-download-render" style="display:none;" download="mooncode_render.mp4">💾 İndir</a>
      </div>
    </div>
  </div>

  <script>
    // Video Editor State
    const state = {
      duration: 10.0, // Toplam 10 saniye default
      currentTime: 0.0,
      isPlaying: false,
      selectedClipId: null,
      zoom: 5,
      aspectRatio: '16-9',
      clips: [
        { id: 'v1', name: 'Giriş_Klibi.mp4', type: 'video', track: 'video', start: 0, duration: 4.5, speed: 1.0, volume: 100, filter: 'none' },
        { id: 'v2', name: 'Oyun_Ici_Kayit.mp4', type: 'video', track: 'video', start: 4.5, duration: 5.5, speed: 1.0, volume: 80, filter: 'none' },
        { id: 'a1', name: 'Fon_Muzigi.mp3', type: 'audio', track: 'audio', start: 0.5, duration: 9.0, speed: 1.0, volume: 40 },
        { id: 't1', name: 'Abone Ol & Beğen', type: 'text', track: 'text', start: 1.5, duration: 3.0 }
      ],
      mediaLibrary: [
        { name: 'Giriş_Klibi.mp4', type: 'video' },
        { name: 'Oyun_Ici_Kayit.mp4', type: 'video' },
        { name: 'Fon_Muzigi.mp3', type: 'audio' }
      ]
    };

    const canvas = document.getElementById('preview-canvas');
    const ctx = canvas.getContext('2d');
    const logsEl = document.getElementById('ai-logs');

    function log(message) {
      const time = new Date().toLocaleTimeString();
      logsEl.innerHTML += '\\n[' + time + '] ' + message;
      logsEl.scrollTop = logsEl.scrollHeight;
    }

    // Connect and listen for browser extension commands
    function initBridge() {
      // Check bridge availability
      log("Bridge bağlantısı kuruluyor...");
      document.getElementById('bridge-status').innerText = "Browser Bridge: AKTİF";
      document.getElementById('bridge-status').style.color = "var(--accent)";
    }

    // Render Canvas Frame
    function renderFrame() {
      const w = canvas.width = canvas.clientWidth;
      const h = canvas.height = canvas.clientHeight;
      
      // Clear
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, w, h);

      // Draw grid backgrounds for aesthetic
      ctx.strokeStyle = '#151b26';
      ctx.lineWidth = 1;
      for(let i=0; i<w; i+=40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for(let j=0; j<h; j+=40) {
        ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(w, j); ctx.stroke();
      }

      // Find active clips at currentTime
      const activeClips = state.clips.filter(c => state.currentTime >= c.start && state.currentTime <= (c.start + c.duration));
      
      // Draw background or mock video
      const activeVideo = activeClips.find(c => c.track === 'video');
      if (activeVideo) {
        // Mock video render
        ctx.save();
        
        // Filter application preview
        if (activeVideo.filter === 'glitch') {
          ctx.fillStyle = 'rgba(255,0,80,0.15)';
          ctx.fillRect(10, 10, w-20, h-20);
          ctx.fillStyle = 'rgba(0,255,240,0.15)';
          ctx.fillRect(-10, -10, w+20, h+20);
          ctx.fillStyle = '#111520';
          ctx.font = 'bold 36px Courier New';
          ctx.fillText("⚡ GLITCH EFFECT", w/2 - 140, h/2);
        } else if (activeVideo.filter === 'vhs') {
          ctx.fillStyle = '#1c1f26';
          ctx.fillRect(0, 0, w, h);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(0, h/3 + Math.sin(state.currentTime*5)*30); ctx.lineTo(w, h/3 + Math.sin(state.currentTime*5)*30); ctx.stroke();
          ctx.fillStyle = '#fff';
          ctx.font = '20px Courier New';
          ctx.fillText("PLAY ▶ 00:0" + Math.floor(state.currentTime), 30, 40);
        } else if (activeVideo.filter === 'cinematic') {
          ctx.fillStyle = '#181b28';
          ctx.fillRect(0, 0, w, h);
          // Cinematic bars
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, w, h*0.15);
          ctx.fillRect(0, h*0.85, w, h*0.15);
        } else {
          ctx.fillStyle = '#1b2333';
          ctx.fillRect(30, 30, w-60, h-60);
        }

        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText(activeVideo.name, w/2 - 60, h/2 - 20);
        ctx.fillText("Time: " + state.currentTime.toFixed(2) + "s (Speed: " + activeVideo.speed + "x)", w/2 - 80, h/2 + 10);
        
        ctx.restore();
      } else {
        ctx.fillStyle = '#333';
        ctx.font = '14px sans-serif';
        ctx.fillText("Medya Yok", w/2 - 40, h/2);
      }

      // Draw effects overlay
      const activeEffect = activeClips.find(c => c.track === 'effects');
      if (activeEffect) {
        ctx.fillStyle = 'rgba(255, 214, 10, 0.15)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffd60a';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText("✨ AI Effect: " + activeEffect.name, 20, h - 30);
      }

      // Draw active text
      const activeText = activeClips.find(c => c.track === 'text');
      const subtitlesOverlay = document.getElementById('subtitles-overlay');
      if (activeText) {
        subtitlesOverlay.innerText = activeText.name;
      } else {
        subtitlesOverlay.innerText = "";
      }
    }

    // Timeline Rendering
    function renderTimeline() {
      const ruler = document.getElementById('timeline-ruler');
      const width = ruler.clientWidth;
      ruler.innerHTML = '';
      
      // Ruler ticks
      const step = 100 / state.zoom;
      for (let i = 0; i <= state.duration; i += 0.5) {
        const tick = document.createElement('div');
        tick.style.position = 'absolute';
        tick.style.left = (i * step * 10) + 'px';
        tick.style.fontSize = '9px';
        tick.style.color = 'var(--muted)';
        tick.style.borderLeft = '1px solid var(--border)';
        tick.style.height = i % 1 === 0 ? '12px' : '6px';
        tick.style.paddingLeft = '3px';
        if (i % 1 === 0) tick.innerText = i + 's';
        ruler.appendChild(tick);
      }

      // Playhead Position
      const playhead = document.getElementById('playhead');
      const pxPosition = (state.currentTime * step * 10) + 100; // 100px label offset
      playhead.style.left = pxPosition + 'px';

      // Update Time Display
      document.getElementById('player-time').innerText = 
        formatTime(state.currentTime) + ' / ' + formatTime(state.duration);

      // Render Clips
      const tracks = {
        video: document.getElementById('track-video'),
        audio: document.getElementById('track-audio'),
        text: document.getElementById('track-text'),
        effects: document.getElementById('track-effects')
      };

      // Clear tracks
      Object.values(tracks).forEach(el => {
        if (el) el.innerHTML = '';
      });

      state.clips.forEach(clip => {
        const trackEl = tracks[clip.track];
        if (!trackEl) return;

        const clipEl = document.createElement('div');
        clipEl.className = 'clip ' + clip.type + (state.selectedClipId === clip.id ? ' selected' : '');
        clipEl.style.left = (clip.start * step * 10) + 'px';
        clipEl.style.width = (clip.duration * step * 10) + 'px';
        clipEl.innerText = clip.name + (clip.filter && clip.filter !== 'none' ? ' [' + clip.filter + ']' : '');
        clipEl.onclick = (e) => {
          e.stopPropagation();
          selectClip(clip.id);
        };
        trackEl.appendChild(clipEl);
      });
    }

    function formatTime(s) {
      const min = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      const ms = Math.floor((s % 1) * 100);
      return (min < 10 ? '0' : '') + min + ':' + (sec < 10 ? '0' : '') + sec + '.' + (ms < 10 ? '0' : '') + ms;
    }

    function selectClip(id) {
      state.selectedClipId = id;
      const clip = state.clips.find(c => c.id === id);
      const propsEl = document.getElementById('clip-properties');
      const noSelectEl = document.getElementById('no-selection');

      if (clip) {
        propsEl.style.display = 'flex';
        noSelectEl.style.display = 'none';
        document.getElementById('prop-name').innerText = clip.name;
        document.getElementById('prop-duration').innerText = clip.duration.toFixed(2) + 's';
        
        const speedInput = document.getElementById('prop-speed');
        speedInput.value = clip.speed || 1.0;
        document.getElementById('speed-val').innerText = (clip.speed || 1.0) + 'x';
        
        const volInput = document.getElementById('prop-volume');
        volInput.value = clip.volume !== undefined ? clip.volume : 100;
        document.getElementById('volume-val').innerText = (clip.volume !== undefined ? clip.volume : 100) + '%';
      } else {
        propsEl.style.display = 'none';
        noSelectEl.style.display = 'block';
      }
      renderTimeline();
      renderFrame();
    }

    // Playback loop
    let lastTime = 0;
    function updatePlay(time) {
      if (!state.isPlaying) return;
      if (!lastTime) lastTime = time;
      const delta = (time - lastTime) / 1000;
      lastTime = time;

      state.currentTime += delta;
      if (state.currentTime >= state.duration) {
        state.currentTime = 0;
      }
      renderTimeline();
      renderFrame();
      requestAnimationFrame(updatePlay);
    }

    // UI Events
    document.getElementById('btn-play').onclick = () => {
      state.isPlaying = !state.isPlaying;
      document.getElementById('btn-play').innerText = state.isPlaying ? 'PAUSE' : 'PLAY';
      if (state.isPlaying) {
        lastTime = 0;
        requestAnimationFrame(updatePlay);
      }
    };

    document.getElementById('btn-split').onclick = () => {
      splitSelectedClip();
    };

    function splitSelectedClip() {
      if (!state.selectedClipId) {
        log("Hata: Bölmek için önce bir klip seçmelisiniz.");
        return;
      }
      const clip = state.clips.find(c => c.id === state.selectedClipId);
      if (!clip) return;

      const splitPoint = state.currentTime;
      if (splitPoint <= clip.start || splitPoint >= (clip.start + clip.duration)) {
        log("Hata: Oynatma kafası seçili klibin sınırları içinde değil.");
        return;
      }

      const origDuration = clip.duration;
      const firstDuration = splitPoint - clip.start;
      const secondDuration = origDuration - firstDuration;

      // Update original clip
      clip.duration = firstDuration;

      // Add second clip
      const newClip = {
        ...clip,
        id: 'c_' + Math.random().toString(36).substr(2, 9),
        name: clip.name + ' (Kopya)',
        start: splitPoint,
        duration: secondDuration
      };

      state.clips.push(newClip);
      log("Makas uygulandı: " + clip.name + " ikiye bölündü.");
      selectClip(clip.id);
    }

    // Tab Switch
    document.querySelectorAll('.tab').forEach(tab => {
      tab.onclick = () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const target = tab.dataset.tab;
        document.getElementById('tab-media').style.display = target === 'media' ? 'flex' : 'none';
        document.getElementById('tab-effects').style.display = target === 'effects' ? 'flex' : 'none';
        document.getElementById('tab-subtitles').style.display = target === 'subtitles' ? 'flex' : 'none';
      };
    });

    // Zoom timeline
    document.getElementById('timeline-zoom').oninput = (e) => {
      state.zoom = parseInt(e.target.value);
      renderTimeline();
    };

    // Aspect Ratio
    document.getElementById('aspect-ratio').onchange = (e) => {
      state.aspectRatio = e.target.value;
      const player = document.getElementById('player-container');
      player.className = 'canvas-container';
      if (state.aspectRatio === '9-16') player.classList.add('ratio-9-16');
      if (state.aspectRatio === '1-1') player.classList.add('ratio-1-1');
      renderFrame();
    };

    // AI Subtitles Emulator
    document.getElementById('btn-ai-captions').onclick = () => {
      log("Yapay zeka ses analizi başlatılıyor...");
      setTimeout(() => {
        state.clips = state.clips.filter(c => c.track !== 'text'); // Eski yazıları sil
        state.clips.push(
          { id: 't_ai1', name: '✦ MoonCode AI ile Kodlama Çok Hızlı ✦', type: 'text', track: 'text', start: 0, duration: 3.5 },
          { id: 't_ai2', name: 'Browser Bridge Entegrasyonu Aktif Edildi', type: 'text', track: 'text', start: 3.5, duration: 4 },
          { id: 't_ai3', name: 'CapCut\\'dan Fazla Efekt İle Hazır!', type: 'text', track: 'text', start: 7.5, duration: 2.5 }
        );
        log("AI Altyazı üretimi tamamlandı! 3 altyazı eklendi.");
        renderTimeline();
        renderFrame();
      }, 1500);
    };

    // TTS Generator
    document.getElementById('btn-generate-tts').onclick = () => {
      const text = document.getElementById('tts-text').value.trim();
      const voice = document.getElementById('tts-voice').value;
      if (!text) return;

      log("AI TTS Sesi üretiliyor: '" + text + "' (Ses: " + voice + ")");
      setTimeout(() => {
        state.clips.push({
          id: 'a_tts_' + Math.random().toString(36).substr(2, 9),
          name: '🎙️ TTS: ' + text.substr(0, 15) + '...',
          type: 'audio',
          track: 'audio',
          start: state.currentTime,
          duration: 3.0,
          speed: 1.0,
          volume: 100
        });
        log("Ses klibi timeline'a eklendi.");
        renderTimeline();
      }, 800);
    };

    // Delete Clip
    document.getElementById('btn-delete-clip').onclick = () => {
      if (state.selectedClipId) {
        state.clips = state.clips.filter(c => c.id !== state.selectedClipId);
        log("Klip silindi.");
        selectClip(null);
      }
    };

    // Properties sliders
    document.getElementById('prop-speed').oninput = (e) => {
      const val = parseFloat(e.target.value);
      document.getElementById('speed-val').innerText = val + 'x';
      if (state.selectedClipId) {
        const clip = state.clips.find(c => c.id === state.selectedClipId);
        if (clip) {
          clip.speed = val;
          renderFrame();
        }
      }
    };

    document.getElementById('prop-volume').oninput = (e) => {
      const val = parseInt(e.target.value);
      document.getElementById('volume-val').innerText = val + '%';
      if (state.selectedClipId) {
        const clip = state.clips.find(c => c.id === state.selectedClipId);
        if (clip) {
          clip.volume = val;
        }
      }
    };

    // Effect presets
    document.querySelectorAll('.effect-preset').forEach(btn => {
      btn.onclick = () => {
        const preset = btn.dataset.preset;
        if (state.selectedClipId) {
          const clip = state.clips.find(c => c.id === state.selectedClipId);
          if (clip && clip.track === 'video') {
            clip.filter = preset;
            log(clip.name + " klibine " + preset.toUpperCase() + " efekti uygulandı.");
            selectClip(clip.id);
          } else {
            log("Efekt uygulamak için bir video klibi seçmelisiniz.");
          }
        } else {
          // Efekt klibi olarak timeline'a ekle
          state.clips.push({
            id: 'eff_' + Math.random().toString(36).substr(2, 9),
            name: preset.toUpperCase(),
            type: 'effect',
            track: 'effects',
            start: state.currentTime,
            duration: 3.0
          });
          log("Timeline'a " + preset.toUpperCase() + " efekti yerleştirildi.");
          renderTimeline();
          renderFrame();
        }
      };
    });

    // Clear Timeline
    document.getElementById('btn-clear-timeline').onclick = () => {
      state.clips = [];
      log("Timeline temizlendi.");
      selectClip(null);
    };

    // Add text clip manually
    document.getElementById('btn-add-text').onclick = () => {
      state.clips.push({
        id: 't_m_' + Math.random().toString(36).substr(2, 9),
        name: 'Yeni Metin Katmanı',
        type: 'text',
        track: 'text',
        start: state.currentTime,
        duration: 3.0
      });
      log("Timeline'a yeni metin katmanı eklendi.");
      renderTimeline();
    };

    // Export Animation
    document.getElementById('btn-export').onclick = () => {
      const modal = document.getElementById('export-modal');
      const progress = document.getElementById('export-progress');
      const statusText = document.getElementById('render-status');
      const dlBtn = document.getElementById('btn-download-render');
      
      modal.style.display = 'grid';
      dlBtn.style.display = 'none';
      progress.style.width = '0%';
      statusText.innerText = "Yapay zeka efektleri uygulanıyor ve video render ediliyor...";

      let percent = 0;
      const interval = setInterval(() => {
        percent += 4;
        progress.style.width = percent + '%';
        if (percent >= 100) {
          clearInterval(interval);
          statusText.innerText = "Render başarıyla tamamlandı! Dosya indirilmeye hazır.";
          dlBtn.style.display = 'inline-flex';
        }
      }, 100);
    };

    document.getElementById('btn-cancel-render').onclick = () => {
      document.getElementById('export-modal').style.display = 'none';
    };

    // Click on timeline area to move playhead
    const timelineRuler = document.getElementById('timeline-ruler');
    timelineRuler.onclick = (e) => {
      const rect = timelineRuler.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const step = 100 / state.zoom;
      state.currentTime = Math.max(0, Math.min(state.duration, clickX / (step * 10)));
      renderTimeline();
      renderFrame();
    };

    // Expose API for external automation / Browser Bridge control
    window.videoEditor = {
      getState: () => state,
      addClip: (clip) => {
        state.clips.push({
          id: 'c_' + Math.random().toString(36).substr(2, 9),
          ...clip
        });
        log("API aracılığıyla klip eklendi: " + clip.name);
        renderTimeline();
        renderFrame();
      },
      splitClip: () => {
        splitSelectedClip();
      },
      setPlaybackTime: (time) => {
        state.currentTime = Math.max(0, Math.min(state.duration, time));
        renderTimeline();
        renderFrame();
      },
      applyFilterToSelected: (filter) => {
        if(state.selectedClipId) {
          const clip = state.clips.find(c => c.id === state.selectedClipId);
          if(clip) {
            clip.filter = filter;
            log("API ile filtre uygulandı: " + filter);
            selectClip(clip.id);
          }
        }
      },
      exportVideo: () => {
        document.getElementById('btn-export').click();
      }
    };

    initBridge();
    renderTimeline();
    renderFrame();
  </script>
</body>
</html>`;

const PHOTOEDIT_HTML = `<!doctype html>
<html lang="tr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>MoonCode Pro Photo Editor</title>
  <style>
    :root {
      --bg: #090a0f;
      --surface: #10141f;
      --surface-hover: #1b2132;
      --border: #222c3e;
      --fg: #f3f5f7;
      --muted: #8d96a3;
      --accent: #1ed77d;
      --accent-dim: rgba(30, 215, 125, 0.15);
      --purple: #bf5af2;
    }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      display: flex;
      flex-direction: column;
      height: 100vh;
      overflow: hidden;
    }
    header {
      height: 48px;
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 16px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 700;
      font-size: 14px;
    }
    .badge {
      font-size: 10px;
      background: var(--accent-dim);
      color: var(--accent);
      padding: 2px 6px;
      border-radius: 99px;
      border: 1px solid rgba(30, 215, 125, 0.3);
      font-weight: 600;
    }
    .workspace {
      display: flex;
      flex: 1;
      height: calc(100vh - 48px);
      overflow: hidden;
    }
    /* Toolbar on the left */
    .toolbar {
      width: 48px;
      background: var(--surface);
      border-right: 1px solid var(--border);
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 12px 0;
      gap: 8px;
    }
    .tool-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: 1px solid transparent;
      background: transparent;
      color: var(--muted);
      cursor: pointer;
      display: grid;
      place-items: center;
      font-size: 14px;
      transition: all 0.15s;
    }
    .tool-btn:hover, .tool-btn.active {
      color: var(--fg);
      background: var(--surface-hover);
      border-color: var(--border);
    }
    .tool-btn.active {
      color: var(--accent);
      border-color: var(--accent);
    }
    /* Canvas Area */
    .canvas-container {
      flex: 1;
      background: #050608;
      background-image: radial-gradient(rgba(255,255,255,.05) 1px, transparent 0);
      background-size: 16px 16px;
      display: grid;
      place-items: center;
      overflow: auto;
      position: relative;
      padding: 24px;
    }
    .canvas-wrapper {
      position: relative;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
      border: 1px solid var(--border);
    }
    canvas {
      display: block;
      background: #fff;
    }
    /* Sidebar on the right */
    .sidebar {
      width: 300px;
      background: var(--surface);
      border-left: 1px solid var(--border);
      display: flex;
      flex-direction: column;
    }
    .section {
      border-bottom: 1px solid var(--border);
      padding: 12px;
    }
    .section-title {
      font-size: 11px;
      font-weight: 600;
      color: var(--muted);
      margin-bottom: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn {
      background: var(--surface-hover);
      border: 1px solid var(--border);
      color: var(--fg);
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 4px;
      cursor: pointer;
      font-weight: 500;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all 0.15s;
    }
    .btn:hover {
      background: var(--border);
    }
    .btn.primary {
      background: var(--accent);
      color: #0b0d12;
      border-color: var(--accent);
    }
    .btn.primary:hover {
      background: #1cb86c;
    }
    .slider-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    .slider-row {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }
    .slider-header {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      color: var(--muted);
    }
    .slider {
      width: 100%;
      accent-color: var(--accent);
    }
    /* Layer items */
    .layer-list {
      display: flex;
      flex-direction: column;
      gap: 4px;
      max-height: 150px;
      overflow-y: auto;
    }
    .layer-item {
      background: #090a0f;
      border: 1px solid var(--border);
      padding: 6px 8px;
      border-radius: 4px;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
    }
    .layer-item.active {
      border-color: var(--accent);
      background: var(--accent-dim);
    }
    /* Console log */
    .console-log {
      flex: 1;
      background: #050608;
      margin: 8px;
      border-radius: 6px;
      padding: 8px;
      font-family: monospace;
      font-size: 10px;
      color: #72e0a5;
      overflow-y: auto;
      white-space: pre-wrap;
    }
    .curves-graph {
      width: 100%;
      height: 100px;
      background: #090a0f;
      border: 1px solid var(--border);
      border-radius: 4px;
      margin-top: 6px;
      position: relative;
    }
  </style>
</head>
<body>
  <header>
    <div class="brand">
      <span class="badge">PRO</span>
      <span>MoonCode Pro Photo Suite</span>
    </div>
    <div style="display:flex; gap:10px; align-items:center;">
      <span id="bridge-status" style="font-size:11px; color:var(--muted);">Browser Bridge: Bağlantı Yok</span>
      <button class="btn primary" id="btn-export">Export Image</button>
    </div>
  </header>

  <div class="workspace">
    <!-- Sol Toolbar -->
    <div class="toolbar">
      <button class="tool-btn active" id="tool-select" title="Seç (Move Tool)">➔</button>
      <button class="tool-btn" id="tool-brush" title="Fırça (Brush Tool)">🖌️</button>
      <button class="tool-btn" id="tool-crop" title="Kırp (Crop Tool)">✂️</button>
      <button class="tool-btn" id="tool-text" title="Metin (Text Tool)">T</button>
      <button class="tool-btn" id="tool-blur" title="Blur">💧</button>
    </div>

    <!-- Canvas -->
    <div class="canvas-container">
      <div class="canvas-wrapper">
        <canvas id="editor-canvas" width="600" height="400"></canvas>
      </div>
    </div>

    <!-- Sağ Sidebar -->
    <div class="sidebar">
      <div class="section">
        <div class="section-title">
          <span>KATMANLAR (LAYERS)</span>
          <button class="btn" id="btn-add-layer" style="padding:2px 6px; font-size:9px;">+ Ekle</button>
        </div>
        <div class="layer-list" id="layer-list"></div>
      </div>

      <div class="section">
        <div class="section-title">RENK AYARLARI & CURVES</div>
        <div class="slider-group">
          <div class="slider-row">
            <div class="slider-header"><span>Parlaklık (Brightness)</span><span id="val-bright">0%</span></div>
            <input type="range" class="slider" id="adjust-bright" min="-100" max="100" value="0">
          </div>
          <div class="slider-row">
            <div class="slider-header"><span>Kontrast (Contrast)</span><span id="val-contrast">0%</span></div>
            <input type="range" class="slider" id="adjust-contrast" min="-100" max="100" value="0">
          </div>
          <div class="slider-row">
            <div class="slider-header"><span>Doygunluk (Saturation)</span><span id="val-saturation">0%</span></div>
            <input type="range" class="slider" id="adjust-saturation" min="-100" max="100" value="0">
          </div>
        </div>
        
        <span style="font-size:10px; color:var(--muted)">Curves (Eğriler)</span>
        <div class="curves-graph">
          <svg width="100%" height="100%" style="stroke: #222c3e; stroke-width: 1;">
            <line x1="0" y1="100" x2="100%" y2="0" stroke="var(--accent)" stroke-width="2" />
            <circle cx="50%" cy="50%" r="4" fill="var(--accent)" />
          </svg>
        </div>
      </div>

      <div class="section">
        <div class="section-title">AI MAGIC TOOLS</div>
        <div style="display:flex; flex-direction:column; gap:6px;">
          <button class="btn" id="btn-ai-bg-remove">✨ AI Arka Plan Temizleyici</button>
          <button class="btn" id="btn-ai-retouch">🧠 Smart Retouch & İyileştir</button>
          <select id="select-lut" style="background:#10141f; border:1px solid var(--border); color:#fff; font-size:11px; padding:6px; border-radius:4px;">
            <option value="none">Renk Filtresi (LUT) Seçin</option>
            <option value="cyberpunk">Cyberpunk Neon</option>
            <option value="tealorange">Teal & Orange (Sinematik)</option>
            <option value="monochrome">Drama Monochrome</option>
            <option value="warmvintage">Warm Vintage</option>
          </select>
        </div>
      </div>

      <div style="flex:1; display:flex; flex-direction:column; min-height:100px;">
        <span style="font-size:11px; font-weight:600; color:var(--muted); padding: 8px 12px 0 12px;">AI LOGS</span>
        <div class="console-log" id="log-console">Görsel stüdyosu hazır. Yapay Zeka girdileri dinleniyor...</div>
      </div>
    </div>
  </div>

  <script>
    const canvas = document.getElementById('editor-canvas');
    const ctx = canvas.getContext('2d');
    const logConsole = document.getElementById('log-console');

    function log(msg) {
      const time = new Date().toLocaleTimeString();
      logConsole.innerHTML += '\\n[' + time + '] ' + msg;
      logConsole.scrollTop = logConsole.scrollHeight;
    }

    // Photo State
    const state = {
      activeTool: 'select',
      selectedLayerId: 'l1',
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0
      },
      lut: 'none',
      layers: [
        { id: 'l1', name: 'Background (Arka Plan)', type: 'image', color: '#131924', visible: true },
        { id: 'l2', name: 'MoonCode AI Logo', type: 'image', color: 'var(--accent)', visible: true },
        { id: 'l3', name: 'Metin Katmanı (Başlık)', type: 'text', text: '✦ MOONCODE SUITE ✦', x: 120, y: 180, size: 30, color: '#ffffff', visible: true }
      ]
    };

    function init() {
      document.getElementById('bridge-status').innerText = "Browser Bridge: AKTİF";
      document.getElementById('bridge-status').style.color = "var(--accent)";
      render();
      updateLayerList();
    }

    function render() {
      // Clear canvas
      ctx.fillStyle = '#1a1f2c';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw Layers
      state.layers.forEach(layer => {
        if (!layer.visible) return;
        
        ctx.save();
        if (layer.id === 'l1') {
          ctx.fillStyle = layer.color;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#222c3e';
          ctx.lineWidth = 1;
          for(let i=0; i<canvas.width; i+=50) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
          }
        } else if (layer.id === 'l2') {
          ctx.fillStyle = layer.color;
          ctx.beginPath();
          ctx.arc(300, 200, 80, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#000000';
          ctx.font = '24px monospace';
          ctx.fillText("🌙", 285, 210);
        } else if (layer.type === 'text') {
          ctx.fillStyle = layer.color;
          ctx.font = 'bold ' + layer.size + 'px sans-serif';
          ctx.fillText(layer.text, layer.x, layer.y);
        }
        
        if (state.selectedLayerId === layer.id) {
          ctx.strokeStyle = 'var(--accent)';
          ctx.lineWidth = 2;
          if (layer.id === 'l1') {
            ctx.strokeRect(2, 2, canvas.width-4, canvas.height-4);
          } else if (layer.id === 'l2') {
            ctx.strokeRect(220, 120, 160, 160);
          } else if (layer.type === 'text') {
            ctx.strokeRect(layer.x - 5, layer.y - layer.size, 380, layer.size + 10);
          }
        }
        ctx.restore();
      });

      applyFiltersAndLut();
    }

    function applyFiltersAndLut() {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      const bright = state.adjustments.brightness;
      const contrast = (state.adjustments.contrast + 100) / 100;
      const factor = (259 * (contrast * 255 + 255)) / (255 * (259 - contrast * 255));

      for (let i = 0; i < data.length; i += 4) {
        if(bright !== 0) {
          data[i] += bright;
          data[i+1] += bright;
          data[i+2] += bright;
        }

        if(state.adjustments.contrast !== 0) {
          data[i] = factor * (data[i] - 128) + 128;
          data[i+1] = factor * (data[i+1] - 128) + 128;
          data[i+2] = factor * (data[i+2] - 128) + 128;
        }

        if (state.lut === 'cyberpunk') {
          data[i] = data[i] * 1.2;
          data[i+1] = data[i+1] * 0.8;
          data[i+2] = data[i+2] * 1.5;
        } else if (state.lut === 'tealorange') {
          data[i] = data[i] * 1.3;
          data[i+1] = data[i+1] * 1.1;
          data[i+2] = data[i+2] * 0.9;
        } else if (state.lut === 'monochrome') {
          const v = 0.2126 * data[i] + 0.7152 * data[i+1] + 0.0722 * data[i+2];
          data[i] = v; data[i+1] = v; data[i+2] = v;
        } else if (state.lut === 'warmvintage') {
          data[i] = data[i] * 1.1;
          data[i+2] = data[i+2] * 0.8;
        }
      }
      ctx.putImageData(imgData, 0, 0);
    }

    function updateLayerList() {
      const list = document.getElementById('layer-list');
      list.innerHTML = '';
      state.layers.forEach(layer => {
        const item = document.createElement('div');
        item.className = 'layer-item' + (state.selectedLayerId === layer.id ? ' active' : '');
        item.onclick = () => selectLayer(layer.id);
        
        const label = document.createElement('span');
        label.innerText = layer.name;
        
        const visibility = document.createElement('span');
        visibility.innerText = layer.visible ? '👁️' : '🕶️';
        visibility.style.cursor = 'pointer';
        visibility.onclick = (e) => {
          e.stopPropagation();
          layer.visible = !layer.visible;
          log((layer.visible ? 'Görünür' : 'Gizli') + " yapıldı: " + layer.name);
          render();
          updateLayerList();
        };

        item.appendChild(label);
        item.appendChild(visibility);
        list.appendChild(item);
      });
    }

    function selectLayer(id) {
      state.selectedLayerId = id;
      updateLayerList();
      render();
    }

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTool = btn.id.replace('tool-', '');
        log("Araç seçildi: " + state.activeTool.toUpperCase());
      };
    });

    document.getElementById('btn-add-layer').onclick = () => {
      const id = 'l_' + Math.random().toString(36).substr(2, 9);
      state.layers.unshift({
        id: id,
        name: 'Yeni Metin Katmanı ' + (state.layers.length + 1),
        type: 'text',
        text: 'Metin Girin',
        x: 100 + Math.random()*100,
        y: 100 + Math.random()*100,
        size: 24,
        color: '#ffffff',
        visible: true
      });
      log("Katman eklendi.");
      selectLayer(id);
    };

    document.getElementById('adjust-bright').oninput = (e) => {
      const val = parseInt(e.target.value);
      state.adjustments.brightness = val;
      document.getElementById('val-bright').innerText = (val > 0 ? '+' : '') + val + '%';
      render();
    };

    document.getElementById('adjust-contrast').oninput = (e) => {
      const val = parseInt(e.target.value);
      state.adjustments.contrast = val;
      document.getElementById('val-contrast').innerText = (val > 0 ? '+' : '') + val + '%';
      render();
    };

    document.getElementById('adjust-saturation').oninput = (e) => {
      const val = parseInt(e.target.value);
      state.adjustments.saturation = val;
      document.getElementById('val-saturation').innerText = (val > 0 ? '+' : '') + val + '%';
      render();
    };

    document.getElementById('select-lut').onchange = (e) => {
      state.lut = e.target.value;
      log("Renk Filtresi (LUT) uygulandı: " + state.lut.toUpperCase());
      render();
    };

    document.getElementById('btn-ai-bg-remove').onclick = () => {
      log("AI Nesne segmentasyonu başlatılıyor...");
      setTimeout(() => {
        const bg = state.layers.find(l => l.id === 'l1');
        if (bg) {
          bg.visible = false;
          log("AI Arka Plan Temizlendi! Arka plan katmanı gizlendi ve şeffaf yapıldı.");
          render();
          updateLayerList();
        }
      }, 1000);
    };

    document.getElementById('btn-ai-retouch').onclick = () => {
      log("AI Smart Retouch uygulanıyor. Cilt düzeltme, keskinlik ve ışık dengele...");
      setTimeout(() => {
        state.adjustments.brightness = 10;
        state.adjustments.contrast = 15;
        document.getElementById('adjust-bright').value = 10;
        document.getElementById('adjust-contrast').value = 15;
        document.getElementById('val-bright').innerText = '+10%';
        document.getElementById('val-contrast').innerText = '+15%';
        log("Retouch tamamlandı! Parlaklık +10%, Kontrast +15% artırıldı.");
        render();
      }, 1200);
    };

    document.getElementById('btn-export').onclick = () => {
      log("Görsel dışa aktarılıyor...");
      const link = document.createElement('a');
      link.download = 'mooncode_image.png';
      link.href = canvas.toDataURL();
      link.click();
      log("Görsel başarıyla PNG olarak indirildi!");
    };

    window.photoEditor = {
      getState: () => state,
      addLayer: (layer) => {
        state.layers.unshift({
          id: 'l_' + Math.random().toString(36).substr(2, 9),
          visible: true,
          ...layer
        });
        log("API ile katman eklendi.");
        updateLayerList();
        render();
      },
      setAdjustments: (bright, contrast, sat) => {
        state.adjustments.brightness = bright;
        state.adjustments.contrast = contrast;
        state.adjustments.saturation = sat;
        
        document.getElementById('adjust-bright').value = bright;
        document.getElementById('adjust-contrast').value = contrast;
        document.getElementById('adjust-saturation').value = sat;
        
        document.getElementById('val-bright').innerText = (bright > 0 ? '+' : '') + bright + '%';
        document.getElementById('val-contrast').innerText = (contrast > 0 ? '+' : '') + contrast + '%';
        document.getElementById('val-saturation').innerText = (sat > 0 ? '+' : '') + sat + '%';
        
        log("API ile Renk Ayarları güncellendi.");
        render();
      },
      applyLut: (lutName) => {
        state.lut = lutName;
        document.getElementById('select-lut').value = lutName;
        log("API ile LUT uygulandı: " + lutName);
        render();
      },
      removeBackground: () => {
        document.getElementById('btn-ai-bg-remove').click();
      },
      exportPhoto: () => {
        document.getElementById('btn-export').click();
      }
    };

    init();
  </script>
</body>
</html>`;

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
		if (serveAsset(res, url.pathname)) return;
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
