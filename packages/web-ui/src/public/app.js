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
          <div class="role">Tool Result</div>
          <pre>${escapeHtml(contentStr)}</pre>
        </div>`;
      }
      const roleClass = role === 'user' ? 'user-msg' : 'assistant-msg';
      const roleName = role === 'user' ? 'User' : 'MoonCode';
      return `<div class="msg ${roleClass}">
        <div class="role">${roleName}</div>
        <pre>${escapeHtml(contentStr)}</pre>
      </div>`;
    }
    if (e.type === 'toolCall') {
      return `<div class="msg system-msg">
        <div class="role">Tool Executed: ${e.toolName}</div>
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
    'MOONCODE DETAILED THEME APPLICATION AND REFACTORING BRIEF',
    '======================================================================',
    '',
    'Hey MoonCode! Using the color palette, HSL matrix, and design rules below, refresh both the TUI (Terminal User Interface) and Web UI (Dashboard) across the project.',
    '',
    'Selected Style Preset: ' + preset.toUpperCase(),
    'HSL Settings: Hue: ' + h + '°, Saturation: ' + s + '%, Lightness: ' + l + '%',
    '',
    '[PRIMARY PALETTE AND VARIABLES]',
    '- Background: ' + bg,
    '- Card / Surface: ' + panel,
    '- Primary Accent: ' + primary,
    '- Secondary Background: ' + secBg,
    '- Border / Divider: ' + border,
    '- Foreground: ' + fg,
    '- Muted Text: ' + muted,
    '- Border Radius: ' + radius,
    '',
    '----------------------------------------------------------------------',
    'STEP 1: WEB UI INTEGRATION (WEB CLIENT & NEXTJS & TAILWIND)',
    '----------------------------------------------------------------------',
    '1. Add the variables below to the global CSS or Tailwind config. The CSS variable map should look like this:',
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
    '2. Map the interface elements (Sidebar, Chat Window, Settings Panels) to these colors.',
    '   - All cards and the main chat panel should use background-color: var(--card) and border: 1px solid var(--border).',
    '   - Use a slightly darker or brighter variation of var(--primary) for button hover states.',
    '   - Add a 3px var(--primary) indicator to the left or bottom edge of active menu items.',
    '',
    '----------------------------------------------------------------------',
    'STEP 2: TUI VISUAL ALIGNMENT',
    '----------------------------------------------------------------------',
    '1. Update the colors of monospace surfaces and borders in the terminal UI.',
    '2. In the TUI footer component (packages/cli/src/modes/interactive/components/footer.ts), color status labels and model names using the primary accent.',
    '3. Align the cursor and autocomplete colors in the input editor with this theme.',
    '',
    '----------------------------------------------------------------------',
    'STEP 3: PREMIUM DETAILS AND MICRO-INTERACTIONS',
    '----------------------------------------------------------------------',
    "- Set heading fonts to 'Outfit' or 'Plus Jakarta Sans', and code blocks to 'JetBrains Mono'.",
    '- Keep scrollbars very thin (6px). The thumb should match var(--border) and the track should remain transparent.',
    '- Apply a 2px var(--ring) outline/shadow effect whenever an input receives focus.',
    '',
    'Apply these changes to the relevant files (CSS, Tailwind files, CLI TUI files) with the smallest possible code surface and without breaking the current flow. When finished, list the files you updated.',
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
  $('#copy-theme-btn').textContent = 'Copied!';
  setTimeout(() => {
    $('#copy-theme-btn').textContent = originalText;
  }, 1500);
};

loadSessions();
setInterval(loadSessions, 5000);
