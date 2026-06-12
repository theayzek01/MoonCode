import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Command input
  { from: 'placeholder="Komut ara veya mesaj gÃ¶nder..."', to: 'placeholder="Search command or send message..."' },

  // Project explorer/context menu
  { from: '<span>Dosya Gezgininde aÃ§</span>', to: '<span>Open in File Explorer</span>' },
  { from: '<span>Projeyi yeniden adlandÄ±r</span>', to: '<span>Rename project</span>' },
  { from: '<span>Sohbetleri arÅŸivle</span>', to: '<span>Archive chats</span>' },
  { from: '<span>KaldÄ±r</span>', to: '<span>Remove</span>' },

  // Download code button
  { from: 'title="Ä°ndir"', to: 'title="Download"' },

  // Toasts and variables
  { from: "toast('Tema deÄŸiÅŸtirildi', 'success');", to: "toast('Theme changed', 'success');" },
  { from: "matches ? `${matches} sonuÃ§` : 'BulunamadÄ±'", to: "matches ? `${matches} result(s)` : 'No results found'" },
  { from: "let md = `# MoonCode Sohbet DÄ±ÅŸa Aktarma\\n\\n_${new Date().toLocaleString('tr-TR')}_\\n\\n---\\n\\n`;", to: "let md = `# MoonCode Chat Export\\n\\n_${new Date().toLocaleString('en-US')}_\\n\\n---\\n\\n`;" },
  { from: "let md = `# MoonCode Sohbet DÄ±ÅŸa Aktarma\\n\\n_${new Date().toLocaleString('tr-TR')}_\\n\\n---\\n\\n` ;", to: "let md = `# MoonCode Chat Export\\n\\n_${new Date().toLocaleString('en-US')}_\\n\\n---\\n\\n` ;" },
  { from: "${isUser ? 'ğŸ‘¤ KullanÄ±cÄ±' : 'ğŸ¤– MoonCode'}", to: "${isUser ? '👤 User' : '🤖 MoonCode'}" },
  { from: "toast('Sohbet dÄ±ÅŸa aktarÄ±ldÄ±', 'success');", to: "toast('Chat exported', 'success');" },

  // Command palette options
  { from: "{ icon: 'science', title: 'Test Ã‡alÄ±ÅŸtÄ±r', desc: 'Test paketini Ã§alÄ±ÅŸtÄ±r'", to: "{ icon: 'science', title: 'Run Test', desc: 'Run the test suite'" },
  { from: "{ icon: 'rate_review', title: 'Kod Review', desc: 'Kodu gÃ¶zden geÃ§ir'", to: "{ icon: 'rate_review', title: 'Code Review', desc: 'Review the code'" },
  { from: "{ icon: 'content_cut', title: 'SÄ±kÄ±ÅŸtÄ±r', desc: 'BaÄŸlamÄ± sÄ±kÄ±ÅŸtÄ±r'", to: "{ icon: 'content_cut', title: 'Compact', desc: 'Compact context'" },
  { from: "{ icon: 'commit', title: 'Diff GÃ¶ster', desc: 'Git deÄŸiÅŸiklikleri gÃ¶ster'", to: "{ icon: 'commit', title: 'Show Diff', desc: 'Show Git changes'" },
  { from: "{ icon: 'rocket_launch', title: 'Ship', desc: 'DeÄŸiŸiklikleri push et'", to: "{ icon: 'rocket_launch', title: 'Ship', desc: 'Push changes'" },
  { from: "{ icon: 'download', title: 'DÄ±ÅŸa Aktar', desc: 'Sohbeti markdown olarak indir'", to: "{ icon: 'download', title: 'Export', desc: 'Download chat as markdown'" },
  { from: "{ icon: 'palette', title: 'Tema SeÃ§', desc: '6 farklÄ± tema'", to: "{ icon: 'palette', title: 'Select Theme', desc: '6 different themes'" },
  { from: "{ icon: 'smart_toy', title: 'Model SeÃ§', desc: 'AI modeli deÄŸiÅŸtir'", to: "{ icon: 'smart_toy', title: 'Select Model', desc: 'Change AI model'" },
  { from: "{ icon: 'settings', title: 'Ayarlar', desc: 'Uygulama ayarlarÄ±'", to: "{ icon: 'settings', title: 'Settings', desc: 'Application settings'" },
  { from: "{ icon: 'keyboard', title: 'KÄ±sayollar', desc: 'TÃ¼m kÄ±sayollarÄ± gÃ¶ster'", to: "{ icon: 'keyboard', title: 'Shortcuts', desc: 'Show all shortcuts'" },
  { from: "{ icon: 'restart_alt', title: 'SÄ±fÄ±rla', desc: 'Oturumu sÄ±fÄ±rla', action: () => { closeModal('cmd-palette'); fetch('/api/reset',{method:'POST'}); newChat(); toast('Oturum sÄ±fÄ±rlandÄ±','info'); } }", to: "{ icon: 'restart_alt', title: 'Reset', desc: 'Reset session', action: () => { closeModal('cmd-palette'); fetch('/api/reset',{method:'POST'}); newChat(); toast('Session reset','info'); } }" },

  // Stream thinking process
  { from: "<span>${isStreaming ? 'DÃ¼ÅŸÃ¼nÃ¼yor...' : 'DÃ¼ÅŸÃ¼nce SÃ¼reci'}</span>", to: "<span>${isStreaming ? 'Thinking...' : 'Thinking Process'}</span>" },

  // Status label
  { from: "const statusLabel = status === 'running' ? 'Ã‡alÄ±ÅŸÄ±yor' : (status === 'error' ? 'Hata' : 'TamamlandÄ±');", to: "const statusLabel = status === 'running' ? 'Running' : (status === 'error' ? 'Error' : 'Completed');" },

  // Reasoning Labels & displays
  { from: "const reasoningLabels = { none: 'KapalÄ±', low: 'DÃ¼ÅŸÃ¼k', medium: 'Orta', high: 'Ã¼ksek' };", to: "const reasoningLabels = { none: 'Off', low: 'Low', medium: 'Medium', high: 'High' };" },
  { from: "document.getElementById('reasoning-display').textContent = 'DÃ¼ÅŸÃ¼nme: '", to: "document.getElementById('reasoning-display').textContent = 'Thinking: '" },
  { from: "toast(`DÃ¼ÅŸÃ¼nme seviyesi: ${reasoningLabels[level]}`, 'info');", to: "toast(`Thinking level: ${reasoningLabels[level]}`, 'info');" },
  { from: "toast('Ayarlar yÃ¼klenemedi', 'error');", to: "toast('Failed to load settings', 'error');" },
  { from: "toast('Ä°ndirildi', 'success', 1500);", to: "toast('Downloaded', 'success', 1500);" },
  { from: "toast('Copied to clipboardÄ±', 'info');", to: "toast('Copied to clipboard', 'info');" },
  { from: "toast('Sabitleme kaldÄ±rÄ±ldÄ±', 'info');", to: "toast('Unpinned', 'info');" },
  { from: "toast('Ä°ÅŸlem baÅŸarÄ±sÄ±z oldu', 'error');", to: "toast('Operation failed', 'error');" },
  { from: "toast('Directory change errorÄ±', 'error');", to: "toast('Directory change error', 'error');" },
  { from: "toast('Oturum dallandÄ±rÄ±ldÄ± â€” yeni dal aktif', 'success');", to: "toast('Session forked — new branch active', 'success');" },
  { from: "toast('Fork hatasÄ±', 'error');", to: "toast('Fork error', 'error');" },
  { from: "toast('Share errorÄ±', 'error');", to: "toast('Share error', 'error');" },
  { from: "toast('BaÄŸlantÄ± kopyalandÄ±', 'success');", to: "toast('Link copied', 'success');" },

  // Export / Import modal details
  { from: '<div class="modal-title"><span class="material-symbols-rounded" style="color:var(--accent);">import_export</span> DÄ±ÅŸa / Ä°Ã§e Aktar</div>', to: '<div class="modal-title"><span class="material-symbols-rounded" style="color:var(--accent);">import_export</span> Export / Import</div>' },
  { from: "<div style=\"font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px;\">DÄ±ÅŸa Aktar</div>", to: "<div style=\"font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px;\">Export</div>" },
  { from: 'JSONL (Ham)', to: 'JSONL (Raw)' },
  { from: 'HTML (GÃ¶rÃ¼nÃ¼m)', to: 'HTML (Formatted)' },
  { from: "<div style=\"font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px;\">Ä°Ã§e Aktar (JSONL)</div>", to: "<div style=\"font-size:0.72rem;font-weight:700;text-transform:uppercase;color:var(--muted);letter-spacing:0.08em;margin-bottom:8px;\">Import (JSONL)</div>" },
  { from: '<div style="font-size:0.82rem;font-weight:500;">DosyayÄ± buraya sÃ¼rÃ¼kleyin</div>', to: '<div style="font-size:0.82rem;font-weight:500;">Drag and drop file here</div>' },
  { from: '<div style="font-size:0.72rem;margin-top:4px;">veya tÄ±klayÄ±n â€” .jsonl dosyasÄ±</div>', to: '<div style="font-size:0.72rem;margin-top:4px;">or click to select — .jsonl file</div>' },

  // User Dropdown Fallback Items
  { from: '<div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">erel oturum</div>', to: '<div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">Local Session</div>' },
  { from: 'Oturumu DÄ±ÅŸa Aktar', to: 'Export Session' },
  { from: 'TarayÄ±cÄ± BridgeÃ¼sÃ¼', to: 'Browser Bridge' },

  // User Dropdown Active Items
  { from: 'HesabÄ± Ã¶net', to: 'Manage Account' },
  { from: 'DÄ±ÅŸa Aktar', to: 'Export' },
  { from: 'Ã‡Ä±kÄ±ÅŸ ap', to: 'Log Out' },
];

replacements.forEach(rep => {
  const oldContent = content;
  content = content.replaceAll(rep.from, rep.to);
  if (content !== oldContent) {
    console.log(`Successfully replaced: "${rep.from.substring(0, 40)}"`);
  } else {
    console.log(`Failed to replace (not found): "${rep.from.substring(0, 40)}"`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished final replacements.');
