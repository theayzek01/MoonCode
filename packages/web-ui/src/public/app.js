const PRESETS = {
  brutalist: {
    hue: 35, sat: 95, light: 55,
    css: (h, s, l) => `/*
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
  --p-primary: hsl(${h}, ${s}%, ${l}%);
  --p-primary-rgb: ${h}, ${s}%, ${l}%;
  --p-line: #ffffff;
  --p-radius: 0px;
  --p-sec-bg: #222222;
  --p-alert-bg: rgba(255, 255, 255, 0.05);
  --p-btn-fg: #000000;
}`
  },
  minimalist: {
    hue: 0, sat: 0, light: 70,
    css: (h, s, l) => `/*
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
  --p-primary: hsl(${h}, ${s}%, ${l}%);
  --p-primary-rgb: ${h}, ${s}%, ${l}%;
  --p-line: #27272a;
  --p-radius: 8px;
  --p-sec-bg: #18181b;
  --p-alert-bg: rgba(24, 24, 27, 0.5);
  --p-btn-fg: #09090b;
}`
  },
  editorial: {
    hue: 24, sat: 40, light: 45,
    css: (h, s, l) => `/*
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
  --p-primary: hsl(${h}, ${s}%, ${l}%);
  --p-primary-rgb: ${h}, ${s}%, ${l}%;
  --p-line: #2d2925;
  --p-radius: 4px;
  --p-sec-bg: #1e1b18;
  --p-alert-bg: rgba(45, 41, 37, 0.3);
  --p-btn-fg: #f5f2eb;
}`
  },
  softwarm: {
    hue: 30, sat: 50, light: 60,
    css: (h, s, l) => `/*
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
  --p-primary: hsl(${h}, ${s}%, ${l}%);
  --p-primary-rgb: ${h}, ${s}%, ${l}%;
  --p-line: #372e25;
  --p-radius: 16px;
  --p-sec-bg: #29221a;
  --p-alert-bg: rgba(55, 46, 37, 0.4);
  --p-btn-fg: #17120e;
}`
  },
  techutility: {
    hue: 200, sat: 75, light: 50,
    css: (h, s, l) => `/*
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
  --p-primary: hsl(${h}, ${s}%, ${l}%);
  --p-primary-rgb: ${h}, ${s}%, ${l}%;
  --p-line: #1c324e;
  --p-radius: 6px;
  --p-sec-bg: #0f2038;
  --p-alert-bg: rgba(28, 50, 78, 0.4);
  --p-btn-fg: #070e17;
}`
  }
};

const $=s=>document.querySelector(s);
let current=null;

async function loadSessions(){
  const sessions=await fetch('/api/sessions').then(r=>r.json());
  $('#sessions').innerHTML=sessions.map(s=>`<div class="session" data-id="${s.id}"><b>${s.id}</b><br><span class="muted">${s.cwd||''}</span><br><span class="muted">${new Date(s.modified).toLocaleString()} · ${s.messages} entries</span></div>`).join('')||'<p class="muted panel">No sessions</p>';
  document.querySelectorAll('.session').forEach(el=>el.onclick=()=>loadSession(el.dataset.id));
}

function textOf(c){
  if(!c)return'';
  if(typeof c==='string')return c;
  if(Array.isArray(c))return c.map(textOf).join('\n');
  if(c.type==='text')return c.text||'';
  return JSON.stringify(c,null,2);
}

async function loadSession(id){
  current=id;
  document.querySelectorAll('.session').forEach(e=>e.classList.toggle('active',e.dataset.id===id));
  const data=await fetch('/api/session/'+encodeURIComponent(id)).then(r=>r.json());
  $('#stats').textContent=JSON.stringify(data.stats,null,2);
  $('#chat').innerHTML=data.entries.map(e=>{
    if (e.type === 'message' && e.message) {
      const role = e.message.role;
      const contentStr = textOf(e.message.content || e.message.text || e.message);
      if (role === 'tool') {
        return `<div class="msg system-msg">
          <div class="role">Araç Sonucu</div>
          <pre>${escapeHtml(contentStr)}</pre>
        </div>`;
      }
      const roleClass = role === 'user' ? 'user-msg' : 'assistant-msg';
      const roleName = role === 'user' ? 'Kullanıcı' : 'MoonCode';
      return `<div class="msg ${roleClass}">
        <div class="role">${roleName}</div>
        <pre>${escapeHtml(contentStr)}</pre>
      </div>`;
    }
    if (e.type === 'toolCall') {
      return `<div class="msg system-msg">
        <div class="role">Araç Çalıştırıldı: ${e.toolName}</div>
        <pre>${escapeHtml(JSON.stringify(e.input, null, 2))}</pre>
      </div>`;
    }
    return '';
  }).filter(Boolean).join('');
}

function escapeHtml(s){
  return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]));
}

function parseVariables(css) {
  const vars = {};
  const matches = css.match(/--p-[a-z0-9-]+:\s*[^;\n]+/g) || [];
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

function generatePrompt(preset, h, s, l, code) {
  const bg = getVal(code, '--p-bg');
  const panel = getVal(code, '--p-panel');
  const primary = getVal(code, '--p-primary');
  const secBg = getVal(code, '--p-sec-bg');
  const border = getVal(code, '--p-line');
  const radius = getVal(code, '--p-radius') || '8px';
  const fg = getVal(code, '--p-fg') || '#ffffff';
  const muted = getVal(code, '--p-muted') || '#a0a0a0';
  const nl = String.fromCharCode(10);

  const lines = [
    '======================================================================',
    'MOONCODE DETAYLI TEMA UYGULAMA VE REFAKTÖR YÖNERGESİ (PREMIUM TASARIM SİSTEMİ)',
    '======================================================================',
    '',
    'Hey MoonCode! Aşağıdaki renk kodlarını, HSL matrisini ve gelişmiş tasarım kurallarını baz alarak projemizin hem TUI (Terminal User Interface) hem de Web UI (Dashboard) arayüzlerini baştan aşağı yenilemeni istiyorum.',
    '',
    'Seçilen Stil Şablonu: ' + preset.toUpperCase(),
    'HSL Ayarları: Hue: ' + h + '°, Saturation: ' + s + '%, Lightness: ' + l + '%',
    '',
    '[BİRİNCİL RENK PALETİ VE DEĞİŞKENLER]',
    '- Arka Plan (Background): ' + bg,
    '- Panel Rengi (Card/Surface): ' + panel,
    '- Birincil Vurgu Rengi (Primary Accent): ' + primary,
    '- İkincil Panel (Secondary BG): ' + secBg,
    '- Kenarlık Çizgisi (Border/Divider): ' + border,
    '- Yazı Rengi (Foreground): ' + fg,
    '- İkincil Yazı Rengi (Muted Text): ' + muted,
    '- Köşe Yumuşatma Çapı (Border Radius): ' + radius,
    '',
    '----------------------------------------------------------------------',
    'ADIM 1: WEB ARAYÜZÜ (WEB CLIENT & NEXTJS & TAILWIND) ENTEGRASYONU',
    '----------------------------------------------------------------------',
    '1. Global CSS veya Tailwind Config dosyasına yukarıdaki renk değişkenlerini entegre et. CSS değişken tanımları şu şekilde olmalıdır:',
    ':root {',
    '  --background: ' + bg + ';',
    '  --card: ' + panel + ';',
    '  --card-foreground: ' + fg + ';',
    '  --popover: ' + panel + ';',
    '  --popover-foreground: ' + fg + ';',
    '  --primary: ' + primary + ';',
    '  --primary-foreground: ' + bg + ';',
    '  --secondary: ' + secBg + ';',
    '  --secondary-foreground: ' + fg + ';',
    '  --muted: ' + secBg + ';',
    '  --muted-foreground: ' + muted + ';',
    '  --accent: ' + primary + ';',
    '  --accent-foreground: ' + bg + ';',
    '  --destructive: oklch(63.7% 0.237 25.33);',
    '  --border: ' + border + ';',
    '  --input: ' + border + ';',
    '  --ring: ' + primary + ';',
    '  --radius: ' + radius + ';',
    '}',
    '',
    '2. Arayüz elemanlarını (Sidebar, Chat Window, Settings Panels) bu renklerle eşleştir.',
    '   - Tüm kartlar ve ana sohbet kutusu background-color: var(--card) ve border: 1px solid var(--border) ile sınırlandırılmalıdır.',
    '   - Butonların hover efektlerinde var(--primary) renginin %10 daha koyu veya parlak versiyonunu kullan.',
    '   - Aktif menü öğelerinin soluna veya altına 3px kalınlığında var(--primary) çizgisi ekle.',
    '',
    '----------------------------------------------------------------------',
    'ADIM 2: TUI (TERMINAL USER INTERFACE) GÖRSEL UYUMU',
    '----------------------------------------------------------------------',
    '1. Terminal ekranındaki monospace çizimlerin ve çerçevelerin renklerini güncelle.',
    '2. TUI Footer (Alt durum çubuğu) bileşeninde (packages/cli/src/modes/interactive/components/footer.ts) yer alan durum etiketlerini ve model isimlerini bu birincil vurgu rengine göre boya.',
    '3. Giriş satırındaki (input editor) cursor ve komut tamamlama (autocomplete) yazı renklerini bu temayla uyumlu hale getir.',
    '',
    '----------------------------------------------------------------------',
    'ADIM 3: PREMIUM DETAYLAR VE MİKRO-ETKİLEŞİMLER',
    '----------------------------------------------------------------------',
    "- Yazı tiplerini başlıklar için 'Outfit' veya 'Plus Jakarta Sans', kod blokları için ise 'JetBrains Mono' olarak ayarla.",
    '- Kaydırma çubuklarını (Scrollbar) son derece ince (6px) yap. Kaydırma çubuğu thumb rengi var(--border) ile uyumlu olmalı, arka planı ise şeffaf kalmalıdır.',
    '- Tüm input alanlarına focus olunduğunda 2px genişliğinde var(--ring) outline/shadow efekti uygula.',
    '',
    'Lütfen tüm bu değişiklikleri ilgili dosyalara (CSS, Tailwind dosyaları, CLI TUI dosyaları) en az kod değişikliğiyle ve mevcut çalışma mantığını bozmadan, son derece temiz ve profesyonel bir şekilde uygula. İşlem bittiğinde hangi dosyaları güncellediğini liste halinde bildir.',
  ];

  return lines.join(nl);
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
  $('#prompt-code').value = generatePrompt(preset, h, s, l, code);

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
  navigator.clipboard.writeText($('#prompt-code').value);
  const originalText = $('#copy-theme-btn').textContent;
  $('#copy-theme-btn').textContent = 'Kopyalandı!';
  setTimeout(() => {
    $('#copy-theme-btn').textContent = originalText;
  }, 1500);
};

loadSessions();
setInterval(loadSessions, 5000);