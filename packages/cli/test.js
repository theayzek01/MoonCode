
// ─── MARKED SETUP ────────────────────────────────────────────────────────
const renderer = new marked.Renderer();

renderer.code = function(token) {
	const code = typeof token === 'object' ? (token.text || '') : (token || '');
	const lang = typeof token === 'object' ? (token.lang || 'text') : 'text';
	const escaped = code.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
	const highlighted = (hljs && hljs.getLanguage(lang))
		? hljs.highlight(code, { language: lang, ignoreIllegals: true }).value
		: escaped;
	const id = 'code-' + Math.random().toString(36).substr(2, 8);
	return `
		<div class="code-block">
			<div class="code-header">
				<div class="lang-badge">
					<span class="material-symbols-rounded" style="font-size:14px;">code</span>
					${lang}
				</div>
				<div class="code-actions">
					<button onclick="runCode(this)" title="Çalıştır" style="display:none;" id="run-${id}">
						<span class="material-symbols-rounded" style="font-size:15px;">play_arrow</span>
					</button>
					<button onclick="downloadCode(this, '${lang}')" title="İndir">
						<span class="material-symbols-rounded" style="font-size:15px;">download</span>
					</button>
					<button onclick="copyCode(this)" title="Kopyala">
						<span class="material-symbols-rounded" style="font-size:15px;">content_copy</span>
					</button>
				</div>
			</div>
			<pre id="${id}"><code class="language-${lang}">${highlighted}</code></pre>
		</div>`;
};

renderer.codespan = function(token) {
	const code = typeof token === 'object' ? (token.text || '') : (token || '');
	return `<code>${code}</code>`;
};

marked.setOptions({ renderer, breaks: true, gfm: true });

// ─── STATE ────────────────────────────────────────────────────────────────
const chatInner = document.getElementById('chat-inner');
const chatContainer = document.getElementById('chat-container');
const promptInput = document.getElementById('prompt-input');
const sendBtn = document.getElementById('send-btn');
const stopBtn = document.getElementById('stop-btn');
let authUrl = 'http://127.0.0.1:3131';
let currentAssistantMsgId = null;
let isGenerating = false;
let attachedFiles = [];
let currentTheme = localStorage.getItem('mc-theme') || 'mooncode';
let allCommands = [];
let filteredCmds = [];
let cmdIndex = -1;
let availableCommands = [];
let filteredCommands = [];
let acIndex = -1;

// ─── THEME ────────────────────────────────────────────────────────────────
function setTheme(theme) {
	currentTheme = theme;
	document.documentElement.setAttribute('data-theme', theme);
	localStorage.setItem('mc-theme', theme);
	document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
	const card = document.getElementById('theme-' + theme);
	if (card) card.classList.add('active');

	// Update hljs theme for light
	const hljsLink = document.getElementById('hljs-theme');
	if (hljsLink) {
		hljsLink.href = theme === 'light'
			? 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css'
			: 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css';
	}
	closeModal('themeModal');
	toast('Tema değiştirildi', 'success');
}
// Apply saved theme on load
document.documentElement.setAttribute('data-theme', currentTheme);
setTimeout(() => {
	document.querySelectorAll('.theme-card').forEach(c => c.classList.remove('active'));
	const card = document.getElementById('theme-' + currentTheme);
	if (card) card.classList.add('active');
}, 100);

// ─── TOAST ────────────────────────────────────────────────────────────────
function toast(msg, type = 'info', duration = 3000) {
	const container = document.getElementById('toast-container');
	const el = document.createElement('div');
	el.className = `toast ${type}`;
	const icons = { success: 'check_circle', error: 'error', info: 'info', warning: 'warning' };
	const colors = { success: 'var(--accent2)', error: '#ff6464', info: 'var(--accent)', warning: '#f6c177' };
	el.innerHTML = `
		<span class="material-symbols-rounded" style="font-size:18px;color:${colors[type] || colors.info};flex-shrink:0;">${icons[type] || 'info'}</span>
		<span style="flex:1;">${msg}</span>
		<button onclick="this.parentElement.remove()" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0;display:flex;">
			<span class="material-symbols-rounded" style="font-size:16px;">close</span>
		</button>`;
	container.appendChild(el);
	setTimeout(() => {
		el.classList.add('out');
		setTimeout(() => el.remove(), 300);
	}, duration);
}

// ─── MODAL ────────────────────────────────────────────────────────────────
function openModal(id) {
	document.getElementById(id).classList.add('active');
	if (id === 'modelModal') loadModels();
	if (id === 'settingsModal') loadSettings();
	if (id === 'bridgeModal') refreshBridgeStatus();
}
function closeModal(id) {
	if (id) document.getElementById(id)?.classList.remove('active');
	else document.querySelectorAll('.modal-overlay').forEach(el => el.classList.remove('active'));
}
function overlayClose(e, id) {
	if (e.target === e.currentTarget) closeModal(id);
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────
let sidebarOpen = true;
function toggleSidebar() {
	sidebarOpen = !sidebarOpen;
	const sb = document.getElementById('sidebar');
	if (sidebarOpen) sb.classList.remove('collapsed');
	else sb.classList.add('collapsed');
}

// ─── SEARCH ───────────────────────────────────────────────────────────────
let searchActive = false;
function toggleSearch() {
	searchActive = !searchActive;
	const bar = document.getElementById('search-bar');
	if (searchActive) {
		bar.classList.add('active');
		document.getElementById('search-input').focus();
	} else {
		bar.classList.remove('active');
		document.getElementById('search-input').value = '';
		searchChat('');
	}
}

function searchChat(query) {
	const count = document.getElementById('search-count');
	if (!query.trim()) { count.textContent = ''; return; }
	const nodes = chatInner.querySelectorAll('.assistant-content,.user-bubble');
	let matches = 0;
	nodes.forEach(n => {
		const text = n.textContent;
		if (text.toLowerCase().includes(query.toLowerCase())) matches++;
	});
	count.textContent = matches ? `${matches} sonuç` : 'Bulunamadı';
}

// ─── EXPORT ───────────────────────────────────────────────────────────────
function exportChat() {
	const rows = chatInner.querySelectorAll('.msg-row');
	let md = `# MoonCode Sohbet Dışa Aktarma\n\n_${new Date().toLocaleString('tr-TR')}_\n\n---\n\n`;
	rows.forEach(row => {
		const isUser = row.classList.contains('user');
		const bubble = row.querySelector('.user-bubble, .assistant-content');
		if (!bubble) return;
		md += `**${isUser ? '👤 Kullanıcı' : '🤖 MoonCode'}**\n\n${bubble.textContent.trim()}\n\n---\n\n`;
	});
	const blob = new Blob([md], { type: 'text/markdown' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url; a.download = `mooncode-${Date.now()}.md`; a.click();
	URL.revokeObjectURL(url);
	toast('Sohbet dışa aktarıldı', 'success');
}

// ─── INSERT PROMPT ────────────────────────────────────────────────────────
function insertPrompt(text) {
	promptInput.value = text;
	promptInput.focus();
	autoResize();
}

// ─── FILE ATTACH ──────────────────────────────────────────────────────────
function handleFileAttach(input) {
	const files = Array.from(input.files);
	files.forEach(f => { if (!attachedFiles.find(x => x.name === f.name)) attachedFiles.push(f); });
	renderAttachments();
	input.value = '';
}

function renderAttachments() {
	const preview = document.getElementById('attachment-preview');
	if (!attachedFiles.length) { preview.classList.add('hidden'); return; }
	preview.classList.remove('hidden');
	preview.innerHTML = attachedFiles.map((f, i) => `
		<span class="file-chip">
			<span class="material-symbols-rounded" style="font-size:14px;color:var(--accent);">description</span>
			${f.name}
			<button onclick="removeFile(${i})" style="background:none;border:none;cursor:pointer;color:var(--muted);padding:0;display:flex;">
				<span class="material-symbols-rounded" style="font-size:13px;">close</span>
			</button>
		</span>`).join('');
}

function removeFile(i) {
	attachedFiles.splice(i, 1);
	renderAttachments();
}

// ─── TEXTAREA AUTO RESIZE ─────────────────────────────────────────────────
function autoResize() {
	promptInput.style.height = 'auto';
	promptInput.style.height = Math.min(promptInput.scrollHeight, 200) + 'px';
}
promptInput.addEventListener('input', () => {
	autoResize();
	const len = promptInput.value.length;
	const cc = document.getElementById('char-count');
	cc.textContent = len > 50 ? len.toLocaleString() : '';
	handleAutocomplete();
});

// ─── INPUT AREA PADDING ───────────────────────────────────────────────────
const inputArea = document.getElementById('input-area');
function updateChatPadding() {
	chatContainer.style.paddingBottom = (inputArea.offsetHeight + 8) + 'px';
}
updateChatPadding();
new ResizeObserver(updateChatPadding).observe(inputArea);

// ─── AUTOCOMPLETE ─────────────────────────────────────────────────────────
const autocompleteEl = document.getElementById('autocomplete');

function handleAutocomplete() {
	const val = promptInput.value;
	if (!val.startsWith('/')) { hideAutocomplete(); return; }
	const q = val.slice(1).toLowerCase();
	filteredCommands = availableCommands.filter(c => c.cmd.slice(1).toLowerCase().startsWith(q));
	if (!filteredCommands.length) { hideAutocomplete(); return; }
	acIndex = -1;
	renderAutocomplete();
	autocompleteEl.classList.remove('hidden');
}

function renderAutocomplete() {
	autocompleteEl.innerHTML = filteredCommands.map((c, i) => `
		<div class="ac-item ${i === acIndex ? 'active' : ''}" onclick="selectCommand('${c.cmd}')">
			<span class="material-symbols-rounded" style="font-size:16px;color:var(--accent);flex-shrink:0;">bolt</span>
			<div style="overflow:hidden;">
				<div class="ac-cmd">${c.cmd}</div>
				<div class="ac-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.desc}</div>
			</div>
		</div>`).join('');
}

function hideAutocomplete() {
	autocompleteEl.classList.add('hidden');
	acIndex = -1;
}

function selectCommand(cmd) {
	promptInput.value = cmd + ' ';
	hideAutocomplete();
	promptInput.focus();
}

// ─── COMMAND PALETTE ──────────────────────────────────────────────────────
const paletteCommands = [
	{ icon: 'add', title: 'Yeni Sohbet', desc: 'Sohbeti temizle', action: () => newChat(), kbd: 'Ctrl+N' },
	{ icon: 'construction', title: 'Derle', desc: 'Projeyi derle', action: () => { closeModal('cmd-palette'); insertPrompt('/build'); sendMessage(); } },
	{ icon: 'science', title: 'Test Çalıştır', desc: 'Test paketini çalıştır', action: () => { closeModal('cmd-palette'); insertPrompt('/test'); sendMessage(); } },
	{ icon: 'rate_review', title: 'Kod Review', desc: 'Kodu gözden geçir', action: () => { closeModal('cmd-palette'); insertPrompt('/review'); sendMessage(); } },
	{ icon: 'content_cut', title: 'Sıkıştır', desc: 'Bağlamı sıkıştır', action: () => { closeModal('cmd-palette'); insertPrompt('/compact'); sendMessage(); } },
	{ icon: 'commit', title: 'Diff Göster', desc: 'Git değişiklikleri göster', action: () => { closeModal('cmd-palette'); insertPrompt('/diff'); sendMessage(); } },
	{ icon: 'rocket_launch', title: 'Ship', desc: 'Değişiklikleri push et', action: () => { closeModal('cmd-palette'); insertPrompt('/ship'); sendMessage(); } },
	{ icon: 'search', title: 'Sohbette Ara', desc: 'Ctrl+F', action: () => { closeModal('cmd-palette'); toggleSearch(); } },
	{ icon: 'download', title: 'Dışa Aktar', desc: 'Sohbeti markdown olarak indir', action: () => { closeModal('cmd-palette'); exportChat(); } },
	{ icon: 'palette', title: 'Tema Seç', desc: '6 farklı tema', action: () => { closeModal('cmd-palette'); openModal('themeModal'); } },
	{ icon: 'smart_toy', title: 'Model Seç', desc: 'AI modeli değiştir', action: () => { closeModal('cmd-palette'); openModal('modelModal'); } },
	{ icon: 'settings', title: 'Ayarlar', desc: 'Uygulama ayarları', action: () => { closeModal('cmd-palette'); openModal('settingsModal'); } },
	{ icon: 'keyboard', title: 'Kısayollar', desc: 'Tüm kısayolları göster', action: () => { closeModal('cmd-palette'); openModal('shortcutsModal'); } },
	{ icon: 'restart_alt', title: 'Sıfırla', desc: 'Oturumu sıfırla', action: () => { closeModal('cmd-palette'); fetch('/api/reset',{method:'POST'}); newChat(); toast('Oturum sıfırlandı','info'); } },
];

function openCmdPalette() {
	openModal('cmd-palette');
	document.getElementById('cmd-input').value = '';
	filterCommands('');
	setTimeout(() => document.getElementById('cmd-input').focus(), 50);
}

function filterCommands(q) {
	filteredCmds = q
		? paletteCommands.filter(c => c.title.toLowerCase().includes(q.toLowerCase()) || c.desc.toLowerCase().includes(q.toLowerCase()))
		: paletteCommands;
	cmdIndex = -1;
	renderCmdList();
}

function renderCmdList() {
	document.getElementById('cmd-list').innerHTML = filteredCmds.map((c, i) => `
		<div class="cmd-item ${i === cmdIndex ? 'active' : ''}" onclick="filteredCmds[${i}].action()">
			<span class="material-symbols-rounded cmd-icon" style="font-size:18px;">${c.icon}</span>
			<div style="flex:1;overflow:hidden;">
				<div class="cmd-title">${c.title}</div>
				<div class="cmd-desc" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${c.desc}</div>
			</div>
			${c.kbd ? `<div class="cmd-kbd"><kbd>${c.kbd}</kbd></div>` : ''}
		</div>`).join('');
}

function cmdKeydown(e) {
	if (e.key === 'ArrowDown') {
		e.preventDefault();
		cmdIndex = Math.min(cmdIndex + 1, filteredCmds.length - 1);
		renderCmdList();
	} else if (e.key === 'ArrowUp') {
		e.preventDefault();
		cmdIndex = Math.max(cmdIndex - 1, -1);
		renderCmdList();
	} else if (e.key === 'Enter') {
		e.preventDefault();
		if (cmdIndex >= 0 && filteredCmds[cmdIndex]) filteredCmds[cmdIndex].action();
		else if (document.getElementById('cmd-input').value.trim()) {
			const txt = document.getElementById('cmd-input').value.trim();
			closeModal('cmd-palette');
			insertPrompt(txt);
			sendMessage();
		}
	} else if (e.key === 'Escape') {
		closeModal('cmd-palette');
	}
}

// ─── GLOBAL KEYBOARD SHORTCUTS ───────────────────────────────────────────
document.addEventListener('keydown', (e) => {
	if (e.ctrlKey || e.metaKey) {
		if (e.key === 'k') { e.preventDefault(); openCmdPalette(); }
		else if (e.key === 'b') { e.preventDefault(); toggleSidebar(); }
		else if (e.key === 'f') { e.preventDefault(); toggleSearch(); }
		else if (e.key === 'n') { e.preventDefault(); newChat(); }
	}
	if (e.key === 'Escape') {
		if (document.querySelector('.modal-overlay.active')) {
			document.querySelectorAll('.modal-overlay.active').forEach(el => el.classList.remove('active'));
		} else if (isGenerating) {
			interruptGeneration();
		}
		if (searchActive) toggleSearch();
	}
});

promptInput.addEventListener('keydown', (e) => {
	// Autocomplete navigation
	if (!autocompleteEl.classList.contains('hidden') && filteredCommands.length > 0) {
		if (e.key === 'ArrowDown') { e.preventDefault(); acIndex = (acIndex+1)%filteredCommands.length; renderAutocomplete(); return; }
		if (e.key === 'ArrowUp') { e.preventDefault(); acIndex = (acIndex-1+filteredCommands.length)%filteredCommands.length; renderAutocomplete(); return; }
		if (e.key === 'Enter' && acIndex >= 0) { e.preventDefault(); selectCommand(filteredCommands[acIndex].cmd); return; }
		if (e.key === 'Escape') { e.preventDefault(); hideAutocomplete(); return; }
	}
	if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

chatContainer.addEventListener('scroll', () => {
	const scrollBtn = document.getElementById('scroll-btn');
	if (scrollBtn) {
		const nearBottom = chatContainer.scrollHeight - chatContainer.scrollTop - chatContainer.clientHeight < 120;
		scrollBtn.classList.toggle('hidden', nearBottom);
	}
});

// ─── APPEND TO CHAT ───────────────────────────────────────────────────────
function appendToChat(el) {
	const indicator = document.getElementById('global-indicator');
	if (indicator) chatInner.insertBefore(el, indicator);
	else chatInner.appendChild(el);
	chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ─── SET GENERATING STATE ─────────────────────────────────────────────────
function setGeneratingState(generating) {
	isGenerating = generating;
	sendBtn.classList.toggle('hidden', generating);
	stopBtn.classList.toggle('hidden', !generating);

	let indicator = document.getElementById('global-indicator');
	if (generating && !indicator) {
		indicator = document.createElement('div');
		indicator.id = 'global-indicator';
		indicator.className = 'msg-row assistant';
		indicator.innerHTML = `
			<div style="display:flex;align-items:center;gap:8px;color:var(--muted);font-size:0.78rem;padding:4px 0;">
				<span class="material-symbols-rounded thinking-pulse" style="font-size:16px;color:var(--accent);">psychology</span>
				<span class="thinking-pulse">Düşünüyor...</span>
			</div>`;
		chatInner.appendChild(indicator);
		chatContainer.scrollTop = chatContainer.scrollHeight;
	} else if (!generating && indicator) {
		indicator.remove();
	}
}

// ─── APPEND MESSAGE ───────────────────────────────────────────────────────
function appendMessage(role, content, id = null, pinned = false) {
	// Remove empty state
	const emptyState = document.getElementById('empty-state');
	if (emptyState) emptyState.remove();

	const row = document.createElement('div');
	row.className = `msg-row ${role} msg-enter${pinned ? ' pinned-message' : ''}`;
	row.id = id || ('msg-' + Date.now() + Math.random().toString(36).substr(2,5));

	const timeStr = new Date().toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' });
	const pinIcon = 'push_pin';
	const pinStyle = pinned ? 'color:var(--accent);font-variation-settings:\'FILL\' 1;' : '';

	if (role === 'user') {
		const text = typeof content === 'string' ? content : '';
		// preserve newlines as <br> but escape HTML
		const safeHtml = escapeHtml(text).replace(/\n/g, '<br>');
		row.innerHTML = `
			<div class="user-bubble">${safeHtml}</div>
			<div style="display:flex;align-items:center;gap:6px;">
				<span style="font-size:0.65rem;color:var(--muted);opacity:0.6;">${timeStr}</span>
				<div class="action-bar" style="margin-top:0;">
					<button onclick="copyText(this.closest('.msg-row').querySelector('.user-bubble').textContent)" title="Kopyala">
						<span class="material-symbols-rounded" style="font-size:15px;">content_copy</span>
					</button>
					<button onclick="editMsg('${row.id}')" title="Düzenle">
						<span class="material-symbols-rounded" style="font-size:15px;">edit</span>
					</button>
					<button onclick="deleteMsg('${row.id}')" title="Sil">
						<span class="material-symbols-rounded" style="font-size:15px;">delete</span>
					</button>
					<button onclick="togglePin('${row.id}')" title="Sabitle" class="pin-btn">
						<span class="material-symbols-rounded" style="font-size:15px;${pinStyle}">${pinIcon}</span>
					</button>
				</div>
			</div>`;
	} else {
		row.innerHTML = `
			<div class="assistant-content prose" id="inner-${row.id}"></div>
			<div style="display:flex;align-items:center;gap:6px;margin-top:2px;">
				<span style="font-size:0.65rem;color:var(--muted);opacity:0.6;">${timeStr}</span>
				<div class="action-bar" style="margin-top:0;">
					<button onclick="copyText(document.getElementById('inner-${row.id}').innerText)" title="Kopyala">
						<span class="material-symbols-rounded" style="font-size:15px;">content_copy</span>
					</button>
					<button onclick="shareMsg('${row.id}')" title="Payla\u015f">
						<span class="material-symbols-rounded" style="font-size:15px;">share</span>
					</button>
					<button onclick="likeMsg('${row.id}', true)" title="Be\u011fen">
						<span class="material-symbols-rounded" style="font-size:15px;">thumb_up</span>
					</button>
					<button onclick="likeMsg('${row.id}', false)" title="Be\u011fenme">
						<span class="material-symbols-rounded" style="font-size:15px;">thumb_down</span>
					</button>
					<button onclick="deleteMsg('${row.id}')" title="Sil">
						<span class="material-symbols-rounded" style="font-size:15px;">delete</span>
					</button>
					<button onclick="togglePin('${row.id}')" title="Sabitle" class="pin-btn">
						<span class="material-symbols-rounded" style="font-size:15px;${pinStyle}">${pinIcon}</span>
					</button>
				</div>
			</div>`;
		if (content) updateMessage(row.id, content);
	}

	appendToChat(row);
	return row.id;
}

// ─── UPDATE MESSAGE ───────────────────────────────────────────────────────
const thinkingStartTimes = new Map(); // msgId -> timestamp when thinking started

function updateMessage(id, content, isStreaming = false) {
	const inner = document.getElementById('inner-' + id);
	if (!inner) return;

	let text = '', thinking = '';
	if (typeof content === 'string') {
		text = content;
	} else if (Array.isArray(content)) {
		content.forEach(c => {
			if (c.type === 'text') text += c.text || '';
			else if (c.type === 'thinking') thinking += c.thinking || '';
		});
	}

	let html = '';
	if (thinking.trim()) {
		// Track timing
		if (!thinkingStartTimes.has(id)) thinkingStartTimes.set(id, Date.now());
		const elapsed = Math.round((Date.now() - thinkingStartTimes.get(id)) / 1000);
		const charCount = thinking.length;

		// While streaming → open (not collapsed), after done → collapsed
		const collapsedClass = isStreaming ? '' : 'collapsed';
		const streamingClass = isStreaming ? 'streaming' : '';
		const pulseClass = isStreaming ? 'thinking-pulse' : '';
		const metaText = isStreaming
			? `${charCount.toLocaleString()} karakter`
			: `${elapsed}s · ${charCount.toLocaleString()} karakter`;

		// Preserve collapsed state if user manually toggled
		const existingBlock = inner.querySelector('.thinking-block');
		const userCollapsed = existingBlock && !isStreaming
			? existingBlock.classList.contains('collapsed')
			: !isStreaming; // default: collapsed after done
		const finalCollapsed = isStreaming ? '' : (userCollapsed ? 'collapsed' : '');

		html += `
			<div class="thinking-block ${finalCollapsed} ${streamingClass}">
				<div class="thinking-summary" onclick="this.parentElement.classList.toggle('collapsed')">
					<span style="display:flex;align-items:center;gap:7px;">
						<span class="material-symbols-rounded ${pulseClass}" style="font-size:16px;">psychology</span>
						<span>${isStreaming ? 'Düşünüyor...' : 'Düşünce Süreci'}</span>
					</span>
					<span class="thinking-meta">
						<span>${metaText}</span>
						<span class="material-symbols-rounded thinking-chevron" style="font-size:16px;color:var(--muted);">expand_more</span>
					</span>
				</div>
				<div class="thinking-body">${escapeHtml(thinking)}</div>
			</div>`;
	} else if (!isStreaming) {
		// Clean up timing when no thinking in final message
		thinkingStartTimes.delete(id);
	}
	html += marked.parse(text || '');

	// Smart update: preserve thinking block collapse state
	const existingThinking = inner.querySelector('.thinking-block');
	const wasCollapsed = existingThinking ? existingThinking.classList.contains('collapsed') : true;
	inner.innerHTML = html;

	// Restore user's collapse preference if they manually changed it during stream
	if (!isStreaming) {
		const newBlock = inner.querySelector('.thinking-block');
		if (newBlock) {
			// stays collapsed (default after done)
			newBlock.classList.add('collapsed');
		}
		thinkingStartTimes.delete(id);
	} else if (isStreaming) {
		const newBlock = inner.querySelector('.thinking-block');
		if (newBlock) {
			// RAF-based smooth auto-scroll during stream
			const body = newBlock.querySelector('.thinking-body');
			if (body) requestAnimationFrame(() => { body.scrollTop = body.scrollHeight; });
		}
	}

	// ── KaTeX math rendering ──────────────────────────────────────────
	if (typeof katex !== 'undefined') {
		// Block math: $$...$$
		inner.querySelectorAll('p, div, li, td').forEach(el => {
			el.innerHTML = el.innerHTML.replace(/\$\$([\s\S]+?)\$\$/g, (_, expr) => {
				try {
					return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
				} catch(e) { return _; }
			});
			// Inline math: $...$
			el.innerHTML = el.innerHTML.replace(/(?<!\$)\$(?!\$)([^\n$]+?)(?<!\$)\$(?!\$)/g, (_, expr) => {
				try {
					return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
				} catch(e) { return _; }
			});
		});
	}
	chatContainer.scrollTop = chatContainer.scrollHeight;
}

// ─── TOOL RENDER ──────────────────────────────────────────────────────────
function renderTool(toolCallId, name, args, status, result) {
	let el = document.getElementById('tool-' + toolCallId);
	if (!el) {
		el = document.createElement('div');
		el.id = 'tool-' + toolCallId;
		el.className = 'tool-enter';
		appendToChat(el);
	}
	el.className = `msg-row assistant tool-enter`;

	const statusClass = status === 'running' ? 'running' : (status === 'error' ? 'error' : 'done');
	const statusLabel = status === 'running' ? 'Çalışıyor' : (status === 'error' ? 'Hata' : 'Tamamlandı');
	const fmtArgs = formatToolValue(args);
	const fmtResult = formatToolValue(result);
	const hasBody = fmtArgs || fmtResult;

	el.innerHTML = `
		<div class="tool-card ${statusClass}">
			<div class="tool-header" onclick="this.nextElementSibling.classList.toggle('hidden')" style="${hasBody ? '' : 'cursor:default;'}">
				<span class="tool-status-dot"></span>
				<span class="material-symbols-rounded" style="font-size:15px;color:var(--muted);">${statusClass === 'running' ? 'hourglass_top' : statusClass === 'error' ? 'error' : 'check_circle'}</span>
				<span class="tool-name">${name || 'tool'}</span>
				<span style="margin-left:auto;font-size:0.7rem;color:var(--muted);">${statusLabel}</span>
				${hasBody ? '<span class="material-symbols-rounded" style="font-size:14px;color:var(--muted);">expand_more</span>' : ''}
			</div>
			${hasBody ? `
			<div class="tool-body ${status !== 'running' ? 'hidden' : ''}">
				${fmtArgs ? `<div class="tool-section"><div class="tool-section-label">Girdi</div><pre>${escapeHtml(fmtArgs)}</pre></div>` : ''}
				${fmtResult ? `<div class="tool-section result"><div class="tool-section-label">Çıktı</div><pre>${escapeHtml(fmtResult)}</pre></div>` : ''}
			</div>` : ''}
		</div>`;
}

function formatToolValue(val) {
	if (!val) return '';
	if (typeof val === 'string') return val.trim();
	if (Array.isArray(val)) return val.map(formatToolValue).filter(Boolean).join('\n');
	if (val.type === 'text') return val.text || '';
	if (val.content) return formatToolValue(val.content);
	try { return JSON.stringify(val, null, 2); } catch(e) { return String(val); }
}

// ─── SEND MESSAGE ─────────────────────────────────────────────────────────
sendBtn.addEventListener('click', sendMessage);

async function sendMessage() {
	const text = promptInput.value.trim();
	if (!text || isGenerating) return;
	promptInput.value = '';
	autoResize();
	document.getElementById('char-count').textContent = '';
	hideAutocomplete();

	if (text === '/login' || text === '/logout') {
		window.open(authUrl + '/login', '_blank');
		return;
	}

	appendMessage('user', text);
	setGeneratingState(true);

	try {
		const res = await fetch('/api/prompt', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ prompt: text })
		});
		syncMessageIds();
		if (!res.ok) {
			setGeneratingState(false);
			appendMessage('assistant', 'Hata: ' + await res.text());
		}
	} catch(e) {
		setGeneratingState(false);
		appendMessage('assistant', 'Bağlantı hatası: sunucuya ulaşılamıyor.');
	}
}

// ─── INTERRUPT ────────────────────────────────────────────────────────────
async function interruptGeneration() {
	try {
		await fetch('/api/interrupt', { method: 'POST' });
		setGeneratingState(false);
		toast('Durduruldu', 'info');
	} catch(e) {}
}

// ─── NEW CHAT ─────────────────────────────────────────────────────────────
function newChat() {
	currentAssistantMsgId = null;
	chatInner.innerHTML = `
		<div id="empty-state">
			<div class="empty-orb" style="background:none;border:none;">
				<img src="/assets/Mooncodewhitelogo.png" alt="MoonCode" style="width:68px;height:68px;border-radius:18px;object-fit:cover;filter:drop-shadow(0 0 20px rgba(108,143,255,0.4));" onerror="this.style.display='none'">
			</div>
			<h2 style="font-size:1.3rem;font-weight:600;margin:0 0 8px;">Bugün nasıl yardımcı olabilirim?</h2>
			<p style="color:var(--muted);font-size:0.85rem;margin:0 0 28px;max-width:400px;line-height:1.6;">Kodunuzu yazın, hata ayıklayın, refactor yapın veya sıfırdan proje başlatın.</p>
			<div style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;">
				<button onclick="insertPrompt('Kodumu incele ve iyileştirme öner')" class="badge-btn" style="padding:8px 14px;border-radius:10px;">
					<span class="material-symbols-rounded" style="font-size:15px;color:var(--accent);">code_blocks</span>
					Kod incele
				</button>
				<button onclick="insertPrompt('/build')" class="badge-btn" style="padding:8px 14px;border-radius:10px;">
					<span class="material-symbols-rounded" style="font-size:15px;color:var(--accent2);">construction</span>
					Derle
				</button>
				<button onclick="insertPrompt('/test')" class="badge-btn" style="padding:8px 14px;border-radius:10px;">
					<span class="material-symbols-rounded" style="font-size:15px;color:var(--accent);">science</span>
					Test çalıştır
				</button>
				<button onclick="insertPrompt('/review')" class="badge-btn" style="padding:8px 14px;border-radius:10px;">
					<span class="material-symbols-rounded" style="font-size:15px;color:var(--accent2);">rate_review</span>
					Kod review
				</button>
			</div>
		</div>`;
	closeModal('cmd-palette');
}

// ─── LOAD MODELS ──────────────────────────────────────────────────────────
const providerColors = {
	google: '#4285f4', anthropic: '#d4956a', openai: '#10a37f',
	mistral: '#ff7000', cohere: '#39d353', default: '#6c8fff'
};

async function loadModels() {
	const list = document.getElementById('model-list');
	list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:0.82rem;">Yükleniyor...</div>';
	try {
		const res = await fetch('/api/models');
		const models = await res.json();
		if (!models.length) { list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Model bulunamadı</div>'; return; }
		
		const grouped = {};
		models.forEach(m => { if (!grouped[m.provider]) grouped[m.provider] = []; grouped[m.provider].push(m); });
		
		list.innerHTML = Object.entries(grouped).map(([provider, mods]) => `
			<div style="margin-bottom:12px;">
				<div style="font-size:0.68rem;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;color:var(--muted);padding:4px 6px;margin-bottom:4px;">${provider}</div>
				${mods.map(m => `
					<div class="model-item" onclick="setModel('${m.provider}','${m.id}')">
						<div class="model-icon" style="background:${providerColors[provider] || providerColors.default}22;color:${providerColors[provider] || providerColors.default};">
							${m.name.slice(0,2).toUpperCase()}
						</div>
						<div style="overflow:hidden;">
							<div style="font-size:0.82rem;font-weight:500;color:var(--fg);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</div>
							<div style="font-size:0.7rem;color:var(--muted);font-family:'JetBrains Mono',monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.id}</div>
						</div>
					</div>`).join('')}
			</div>`).join('');
	} catch(e) {
		list.innerHTML = '<div style="text-align:center;padding:20px;color:#ff6464;font-size:0.82rem;">Modeller yüklenemedi</div>';
	}
}

async function setModel(provider, id) {
	await fetch('/api/set-model', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ provider, model: id })
	});
	const name = id.split('/').pop() || id;
	document.getElementById('model-display').textContent = name;
	document.getElementById('input-model-badge').textContent = name;
	closeModal('modelModal');
	toast(`Model: ${name}`, 'success');
}

// ─── REASONING ────────────────────────────────────────────────────────────
const reasoningLabels = { none: 'Kapalı', low: 'Düşük', medium: 'Orta', high: 'Yüksek' };

async function setReasoning(level) {
	await fetch('/api/set-thinking', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ level })
	});
	document.getElementById('reasoning-display').textContent = 'Düşünme: ' + (reasoningLabels[level] || level);
	['none','low','medium','high'].forEach(l => document.getElementById('r-'+l)?.classList.remove('selected'));
	document.getElementById('r-'+level)?.classList.add('selected');
	closeModal('reasoningModal');
	toast(`Düşünme seviyesi: ${reasoningLabels[level]}`, 'info');
}

// ─── SETTINGS TABS ────────────────────────────────────────────────────────
function switchSettingsTab(name, btn) {
	document.querySelectorAll('.stab').forEach(t => t.classList.remove('active'));
	document.querySelectorAll('.stab-panel').forEach(p => p.classList.remove('active'));
	if (btn) btn.classList.add('active');
	document.getElementById('stab-' + name)?.classList.add('active');
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────
async function loadSettings() {
	try {
		const res = await fetch('/api/settings');
		const s = await res.json();

		// General tab
		const themeEl = document.getElementById('set-theme');
		if (themeEl) themeEl.value = s.theme || 'mooncode';

		// Compaction tab
		const profileEl = document.getElementById('set-profile');
		if (profileEl) profileEl.value = s.compactionProfile || 'balanced';

		const reserveEl = document.getElementById('set-reserve');
		if (reserveEl) { reserveEl.value = s.reserveTokens || 1000; document.getElementById('reserve-val').textContent = s.reserveTokens || 1000; }

		const keepEl = document.getElementById('set-keep');
		if (keepEl) { keepEl.value = s.keepRecentTokens || 2000; document.getElementById('keep-val').textContent = s.keepRecentTokens || 2000; }

		const toolEl = document.getElementById('set-tool-compaction');
		if (toolEl) toolEl.checked = !!s.enableToolBasedCompaction;

		// Security tab — permission radio
		const permLevel = s.permissionLevel || 'ask';
		document.querySelectorAll('.perm-row').forEach(row => {
			const val = row.dataset.val;
			const active = val === permLevel;
			row.style.border = active ? '1px solid var(--accent)' : '1px solid var(--border)';
			row.style.background = active ? 'rgba(108,143,255,0.08)' : 'var(--surface2)';
			const radio = row.querySelector('input[type=radio]');
			if (radio) radio.checked = active;
			row.onclick = () => {
				document.querySelectorAll('.perm-row').forEach(r => {
					r.style.border = '1px solid var(--border)';
					r.style.background = 'var(--surface2)';
					const ri = r.querySelector('input[type=radio]'); if (ri) ri.checked = false;
				});
				row.style.border = '1px solid var(--accent)';
				row.style.background = 'rgba(108,143,255,0.08)';
				const ri = row.querySelector('input[type=radio]'); if (ri) ri.checked = true;
			};
			row.style.display = 'flex'; row.style.alignItems = 'center'; row.style.gap = '10px';
			row.style.padding = '8px 12px'; row.style.borderRadius = '10px'; row.style.cursor = 'pointer';
			row.style.transition = 'all 0.15s';
		});

	} catch(e) {
		toast('Ayarlar yüklenemedi', 'error');
	}
}

async function saveSettings() {
	const theme = document.getElementById('set-theme')?.value;
	const profile = document.getElementById('set-profile')?.value;
	const reserveTokens = Number(document.getElementById('set-reserve')?.value) || undefined;
	const keepRecentTokens = Number(document.getElementById('set-keep')?.value) || undefined;
	const toolCompaction = document.getElementById('set-tool-compaction')?.checked;
	const permOpt = document.querySelector('.perm-row input[type=radio]:checked');
	const permissionLevel = permOpt ? permOpt.value : undefined;
	try {
		await fetch('/api/settings', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ theme, compactionProfile: profile, enableToolBasedCompaction: toolCompaction, reserveTokens, keepRecentTokens, permissionLevel })
		});
		if (theme) setTheme(theme);
		closeModal('settingsModal');
		toast('Ayarlar kaydedildi', 'success');
	} catch(e) {
		toast('Ayarlar kaydedilemedi', 'error');
	}
}

// ─── USER MENU ────────────────────────────────────────────────────────────
let userMenuOpen = false;
function toggleUserMenu() {
	const dd = document.getElementById('user-dropdown');
	userMenuOpen = !userMenuOpen;
	dd.classList.toggle('hidden', !userMenuOpen);
}
document.addEventListener('click', (e) => {
	const dd = document.getElementById('user-dropdown');
	const btn = document.getElementById('user-menu-btn');
	const sbBtn = document.getElementById('sidebar-avatar')?.closest('.sidebar-item') || document.querySelector('[onclick="toggleUserMenu()"]');
	if (dd && !dd.contains(e.target) && !btn?.contains(e.target)) {
		dd.classList.add('hidden');
		userMenuOpen = false;
	}
});

function handleAuthAction() { window.open(authUrl + '/login', '_blank'); }

async function updateUserUI() {
	const renderDropdown = (html) => {
		const dd = document.getElementById('user-dropdown');
		if (dd) dd.innerHTML = html;
	};

	const fallbackContent = `
		<div style="padding:16px 12px;text-align:center;border-bottom:1px solid var(--border);margin-bottom:6px;">
			<span class="material-symbols-rounded" style="font-size:40px;color:var(--accent);opacity:0.6;">person</span>
			<div style="font-size:0.85rem;font-weight:600;margin-top:8px;">Mooncode</div>
			<div style="font-size:0.72rem;color:var(--muted);margin-top:2px;">Yerel oturum</div>
		</div>
		<div class="sidebar-item" onclick="openModal('settingsModal')" style="gap:10px;">
			<span class="material-symbols-rounded" style="font-size:16px;">settings</span>
			Ayarlar
		</div>
		<div class="sidebar-item" onclick="openModal('exportModal')" style="gap:10px;">
			<span class="material-symbols-rounded" style="font-size:16px;">download</span>
			Oturumu Dışa Aktar
		</div>
		<div class="sidebar-item" onclick="openModal('bridgeModal')" style="gap:10px;">
			<span class="material-symbols-rounded" style="font-size:16px;">cable</span>
			Tarayıcı Köprüsü
		</div>
		<div style="padding:8px 12px;margin-top:4px;border-top:1px solid var(--border);">
			<div id="user-dropdown-cwd" style="font-size:0.68rem;color:var(--muted);font-family:'JetBrains Mono',monospace;word-break:break-all;"></div>
		</div>`;

	// Always render fallback immediately so dropdown is never empty
	renderDropdown(fallbackContent);

	// Populate cwd from sidebar
	const cwdEl = document.getElementById('active-cwd-display');
	const ddCwd = document.getElementById('user-dropdown-cwd');
	if (cwdEl && ddCwd) ddCwd.textContent = cwdEl.textContent || '';

	try {
		const res = await fetch('/api/auth/status');
		if (!res.ok) return;
		const data = await res.json();
		const btn = document.getElementById('user-menu-btn');
		const sbName = document.getElementById('sidebar-name');
		const sbAvatar = document.getElementById('sidebar-avatar');

		if (data.isLoggedIn && data.account) {
			const init = data.account.initial || '?';
			if (btn) btn.innerHTML = `<span style="font-size:0.72rem;font-weight:700;">${init}</span>`;
			if (sbName) sbName.textContent = data.account.name;
			if (sbAvatar) sbAvatar.textContent = init;
			const userInitEl = document.getElementById('user-initial');
			if (userInitEl) userInitEl.textContent = init;

			renderDropdown(`
				<div style="padding:12px 12px 10px;border-bottom:1px solid var(--border);margin-bottom:6px;display:flex;align-items:center;gap:10px;">
					<div style="width:38px;height:38px;border-radius:50%;background:linear-gradient(135deg,var(--accent),var(--accent2));display:flex;align-items:center;justify-content:center;font-size:1rem;font-weight:700;color:#fff;flex-shrink:0;">${init}</div>
					<div>
						<div style="font-size:0.85rem;font-weight:600;color:var(--fg);">${data.account.name}</div>
						<div style="font-size:0.72rem;color:var(--muted);">${data.account.email}</div>
					</div>
				</div>
				<div class="sidebar-item" onclick="handleAuthAction()" style="gap:10px;">
					<span class="material-symbols-rounded" style="font-size:16px;">account_circle</span>
					Hesabı Yönet
				</div>
				<div class="sidebar-item" onclick="openModal('settingsModal')" style="gap:10px;">
					<span class="material-symbols-rounded" style="font-size:16px;">settings</span>
					Ayarlar
				</div>
				<div class="sidebar-item" onclick="openModal('exportModal')" style="gap:10px;">
					<span class="material-symbols-rounded" style="font-size:16px;">download</span>
					Dışa Aktar
				</div>
				<div class="sidebar-item" style="color:#ff6464;gap:10px;" onclick="handleAuthAction()">
					<span class="material-symbols-rounded" style="font-size:16px;">logout</span>
					Çıkış Yap
				</div>`);
		}
	} catch(e) {
		// fallback already rendered above, nothing to do
	}
}

// ─── CODE ACTIONS ─────────────────────────────────────────────────────────
function copyCode(btn) {
	const pre = btn.closest('.code-block').querySelector('pre');
	if (!pre) return;
	navigator.clipboard.writeText(pre.textContent.trim());
	const icon = btn.querySelector('.material-symbols-rounded');
	if (icon) { icon.textContent = 'check'; setTimeout(() => icon.textContent = 'content_copy', 2000); }
	toast('Kopyalandı', 'success', 1500);
}

function downloadCode(btn, lang) {
	const pre = btn.closest('.code-block').querySelector('pre');
	if (!pre) return;
	const exts = { javascript:'js', typescript:'ts', python:'py', css:'css', html:'html', json:'json', bash:'sh', go:'go', rust:'rs', java:'java', cpp:'cpp', c:'c' };
	const ext = exts[lang] || 'txt';
	const blob = new Blob([pre.textContent.trim()], { type: 'text/plain' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a'); a.href = url; a.download = `code.${ext}`; a.click();
	URL.revokeObjectURL(url);
	toast('İndirildi', 'success', 1500);
}

function copyText(text) {
	navigator.clipboard.writeText(text);
	toast('Kopyalandı', 'success', 1500);
}

function shareMsg(id) {
	const el = document.getElementById('inner-' + id);
	if (!el) return;
	if (navigator.share) navigator.share({ text: el.innerText });
	else { navigator.clipboard.writeText(el.innerText); toast('Panoya kopyalandı', 'info'); }
}

function likeMsg(id, positive) {
	toast(positive ? 'Geri bildirim için teşekkürler!' : 'Geri bildirim alındı', 'info');
}

// ─── HISTORY ─────────────────────────────────────────────────────────────
async function loadHistory() {
	try {
		const res = await fetch('/api/history');
		const history = await res.json();
		if (!history?.length) return;
		chatInner.innerHTML = '';
		history.forEach(msg => {
			if (msg.role === 'user' || msg.role === 'assistant') {
				const content = msg.text || (Array.isArray(msg.content) ? msg.content : null);
				if (content || msg.role === 'assistant') {
					appendMessage(msg.role, content || '', msg.id, msg.pinned);
				}
			}
			if (msg.tools?.length) {
				msg.tools.forEach(t => renderTool(t.id, t.name, t.input, t.status === 'success' ? 'done' : 'running', t.output));
			}
		});
		updatePinnedBar();
	} catch(e) {}
}

// ─── INITIAL STATUS ───────────────────────────────────────────────────────
async function checkInitialStatus() {
	try {
		const res = await fetch('/api/status');
		const data = await res.json();
		if (data.isGenerating) setGeneratingState(true);
		if (data.authUrl) authUrl = data.authUrl;
		if (data.model) {
			const name = data.model.split('/').pop() || data.model;
			document.getElementById('model-display').textContent = name;
			document.getElementById('input-model-badge').textContent = name;
		}
		if (data.cwd) {
			document.getElementById('cwd-text').textContent = data.cwd.split(/[\\/]/).pop() || data.cwd;
		}
	} catch(e) {}
}

// ─── INIT SETTINGS ────────────────────────────────────────────────────────
async function initSettings() {
	try {
		const res = await fetch('/api/settings');
		const s = await res.json();
		if (s.thinkingLevel) {
			document.getElementById('reasoning-display').textContent = 'Düşünme: ' + (reasoningLabels[s.thinkingLevel] || s.thinkingLevel);
		}
	} catch(e) {}
}

// ─── FETCH COMMANDS ───────────────────────────────────────────────────────
async function fetchCommands() {
	try {
		const res = await fetch('/api/commands');
		availableCommands = await res.json();
	} catch(e) {}
}

// ─── SSE SETUP ────────────────────────────────────────────────────────────
const es = new EventSource('/events');
es.onmessage = (e) => {
	try {
		const data = JSON.parse(e.data);

		if (data.type === 'engine_start') {
			setGeneratingState(true);
			currentAssistantMsgId = null;

		} else if (data.type === 'engine_end') {
			setGeneratingState(false);
			currentAssistantMsgId = null;
			syncMessageIds();

		} else if (data.type === 'message_start' || data.type === 'message_update' || data.type === 'message_end') {
			if (!data.message || data.message.role !== 'assistant') return;

			if (data.type === 'message_start') {
				setGeneratingState(true);
				currentAssistantMsgId = 'msg-' + (data.message.id || Date.now() + Math.random().toString(36).substr(2,5));
				appendMessage('assistant', data.message.content, currentAssistantMsgId);

			} else if (data.type === 'message_update') {
				if (!currentAssistantMsgId) {
					currentAssistantMsgId = 'msg-' + (data.message.id || Date.now() + Math.random().toString(36).substr(2,5));
					appendMessage('assistant', data.message.content, currentAssistantMsgId);
				} else {
					updateMessage(currentAssistantMsgId, data.message.content, true);
				}

			} else if (data.type === 'message_end') {
				setGeneratingState(false);
				if (currentAssistantMsgId) updateMessage(currentAssistantMsgId, data.message.content, false);
				currentAssistantMsgId = null;
				syncMessageIds();
			}

		} else if (data.type === 'tool_execution_start' || data.type === 'tool_execution_step') {
			setGeneratingState(true);
			renderTool(data.toolCallId, data.toolName, data.args, 'running', null);

		} else if (data.type === 'tool_execution_end') {
			renderTool(data.toolCallId, data.toolName, data.args, 'done', data.result);

		} else if (data.type === 'clear_chat') {
			currentAssistantMsgId = null;
			newChat();
			setGeneratingState(false);

		} else if (data.type === 'state_update') {
			if (data.state?.model) {
				const name = data.state.model.split('/').pop() || data.state.model;
				document.getElementById('model-display').textContent = name;
				document.getElementById('input-model-badge').textContent = name;
			}
			if (data.state?.cwd) {
				const cwd = data.state.cwd;
				const short = cwd.split(/[\\/]/).pop() || cwd;
				document.getElementById('cwd-text').textContent = short;
				const activeCwd = document.getElementById('active-cwd-display');
				if (activeCwd) activeCwd.textContent = cwd;
			}
			if (data.state?.tokens) {
				document.getElementById('token-usage').textContent = `${(data.state.tokens.in||0).toLocaleString()} / ${(data.state.tokens.out||0).toLocaleString()}`;
			}
		}
	} catch(err) {
		console.error('SSE parse error', err);
	}
}

// ─── ESCAPE HTML ──────────────────────────────────────────────────────────
function escapeHtml(str) {
	return String(str)
		.replace(/&/g,'&amp;')
		.replace(/</g,'&lt;')
		.replace(/>/g,'&gt;')
		.replace(/"/g,'&quot;')
		.replace(/'/g,'&#39;');
}

// ─── ESCAPE JS STRING FOR TEMPLATE LITERALS ──────────────────────────────
function escapeJsString(str) {
	return str
		.replace(/\\/g, '\\\\')
		.replace(/`/g, '\\`')
		.replace(/\$/g, '\\$');
}

// ─── SYNC MESSAGE IDS WITH BACKEND ────────────────────────────────────────
async function syncMessageIds() {
	try {
		const res = await fetch('/api/history');
		const history = await res.json();
		const rows = chatInner.querySelectorAll('.msg-row');
		let histIdx = 0;
		for (let i = 0; i < rows.length; i++) {
			const row = rows[i];
			if (row.id === 'global-indicator' || row.querySelector('.tool-card')) continue;
			if (histIdx < history.length) {
				const histMsg = history[histIdx];
				row.id = histMsg.id;
				const inner = row.querySelector('.assistant-content');
				if (inner) {
					inner.id = 'inner-' + histMsg.id;
				}
				histIdx++;
			}
		}
		updatePinnedBar();
	} catch(e) {
		console.error('syncMessageIds error', e);
	}
}

// ─── UPDATE PINNED BAR ──────────────────────────────────────────────────
function updatePinnedBar() {
	const bar = document.getElementById('pinned-bar');
	const list = document.getElementById('pinned-list');
	if (!bar || !list) return;

	const pinnedRows = [];
	chatInner.querySelectorAll('.msg-row').forEach(row => {
		const pinBtn = row.querySelector('.pin-btn span');
		if (pinBtn && pinBtn.style.color.includes('var(--accent)')) {
			const textEl = row.querySelector('.user-bubble, .assistant-content');
			if (textEl) {
				let text = textEl.textContent.trim();
				if (text.length > 30) text = text.slice(0, 30) + '...';
				pinnedRows.push({ id: row.id, text });
			}
		}
	});

	if (pinnedRows.length === 0) {
		bar.classList.add('hidden');
		return;
	}

	bar.classList.remove('hidden');
	list.innerHTML = pinnedRows.map(p => `
		<div onclick="scrollToMessage('${p.id}')" style="display:inline-flex;align-items:center;gap:6px;background:var(--surface2);border:1px solid var(--border);border-radius:6px;padding:3px 8px;font-size:0.75rem;color:var(--fg);cursor:pointer;white-space:nowrap;max-width:200px;overflow:hidden;text-overflow:ellipsis;transition:all 0.15s;" onmouseover="this.style.borderColor='var(--accent)'" onmouseout="this.style.borderColor='var(--border)'">
			<span style="overflow:hidden;text-overflow:ellipsis;">${escapeHtml(p.text)}</span>
			<span onclick="event.stopPropagation(); togglePin('${p.id}')" class="material-symbols-rounded" style="font-size:12px;color:var(--muted);cursor:pointer;" onmouseover="this.style.color='#ff6464'" onmouseout="this.style.color='var(--muted)'">close</span>
		</div>
	`).join('');
}

// ─── SCROLL TO MESSAGE ───────────────────────────────────────────────────
function scrollToMessage(id) {
	const el = document.getElementById(id);
	if (!el) return;
	el.scrollIntoView({ behavior: 'smooth', block: 'center' });
	el.classList.add('pulse-highlight');
	setTimeout(() => el.classList.remove('pulse-highlight'), 2000);
}

// ─── TOGGLE PIN STATE ────────────────────────────────────────────────────
async function togglePin(id) {
	const row = document.getElementById(id);
	if (!row) return;
	const pinBtn = row.querySelector('.pin-btn span');
	if (!pinBtn) return;
	const currentlyPinned = pinBtn.style.color.includes('var(--accent)');
	const newPinned = !currentlyPinned;

	try {
		const res = await fetch('/api/history/pin', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, pinned: newPinned })
		});
		if (res.ok) {
			if (newPinned) {
				pinBtn.style.color = 'var(--accent)';
				pinBtn.style.fontVariationSettings = "'FILL' 1";
				row.classList.add('pinned-message');
				toast('Mesaj sabitlendi', 'success');
			} else {
				pinBtn.style.color = '';
				pinBtn.style.fontVariationSettings = '';
				row.classList.remove('pinned-message');
				toast('Sabitleme kaldırıldı', 'info');
			}
			updatePinnedBar();
		}
	} catch(e) {
		toast('İşlem başarısız oldu', 'error');
	}
}

// ─── DELETE MESSAGE ──────────────────────────────────────────────────────
async function deleteMsg(id) {
	const row = document.getElementById(id);
	if (!row) return;
	if (!confirm('Bu mesajı silmek istediğinize emin misiniz?')) return;

	try {
		const res = await fetch('/api/history/delete', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		if (res.ok) {
			const nextRow = row.nextElementSibling;
			if (row.classList.contains('user') && nextRow && nextRow.classList.contains('assistant') && !nextRow.querySelector('.tool-card')) {
				nextRow.remove();
			}
			row.remove();
			toast('Mesaj silindi', 'success');
			updatePinnedBar();
			
			if (chatInner.children.length === 0 || (chatInner.children.length === 1 && chatInner.children[0].id === 'global-indicator')) {
				newChat();
			}
		}
	} catch(e) {
		toast('Mesaj silinemedi', 'error');
	}
}

// ─── EDIT MESSAGE ────────────────────────────────────────────────────────
function editMsg(id) {
	const row = document.getElementById(id);
	if (!row) return;
	const bubble = row.querySelector('.user-bubble');
	if (!bubble) return;

	if (bubble.querySelector('textarea')) return;

	const originalText = bubble.innerText;

	bubble.innerHTML = `
		<textarea class="form-input" style="width:100%;background:var(--bg2);color:var(--fg);border:1px solid var(--border);border-radius:8px;padding:6px 10px;font-size:0.875rem;resize:vertical;" rows="2"></textarea>
		<div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px;">
			<button class="btn btn-ghost" style="padding:4px 8px;font-size:0.75rem;" onclick="cancelEdit('${id}', \`${escapeJsString(originalText)}\`)">İptal</button>
			<button class="btn btn-primary" style="padding:4px 8px;font-size:0.75rem;" onclick="saveEdit('${id}')">Kaydet</button>
		</div>
	`;
	const textarea = bubble.querySelector('textarea');
	textarea.value = originalText;
	textarea.focus();
}

function cancelEdit(id, originalText) {
	const row = document.getElementById(id);
	if (!row) return;
	const bubble = row.querySelector('.user-bubble');
	if (!bubble) return;
	bubble.innerHTML = escapeHtml(originalText).replace(/\n/g, '<br>');
}

async function saveEdit(id) {
	const row = document.getElementById(id);
	if (!row) return;
	const bubble = row.querySelector('.user-bubble');
	if (!bubble) return;
	const textarea = bubble.querySelector('textarea');
	if (!textarea) return;
	const newText = textarea.value.trim();
	if (!newText) return;

	try {
		const res = await fetch('/api/history/edit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id, text: newText })
		});
		if (res.ok) {
			bubble.innerHTML = escapeHtml(newText).replace(/\n/g, '<br>');
			toast('Mesaj güncellendi', 'success');
			updatePinnedBar();
		}
	} catch(e) {
		toast('Güncelleme başarısız oldu', 'error');
	}
}

// ─── DIRECTORY SELECTION ──────────────────────────────────────────────────
async function selectProjectDirectory() {
	try {
		const res = await fetch('/api/project/select-directory', { method: 'POST' });
		const data = await res.json();
		let selectedPath = data.path;
		
		if (!selectedPath) {
			selectedPath = prompt('Proje klasörünün tam yolunu girin:');
		}
		
		if (!selectedPath || !selectedPath.trim()) return;
		
		const createRes = await fetch('/api/session/create', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ cwd: selectedPath.trim() })
		});
		
		if (createRes.ok) {
			newChat();
			toast('Proje dizini değiştirildi', 'success');
			checkInitialStatus();
		} else {
			toast('Dizin değiştirilemedi', 'error');
		}
	} catch(e) {
		toast('Dizin değiştirme hatası', 'error');
	}
}

// ─── RUN CODE ─────────────────────────────────────────────────────────────
function runCode(btn) {
	const codeBlock = btn.closest('.code-block');
	if (!codeBlock) return;
	const pre = codeBlock.querySelector('pre');
	const code = pre ? pre.textContent.trim() : '';

	navigator.clipboard.writeText(code);
	toast('Kod panoya kopyalandı — terminale yapıştırın', 'info');
}

// ─── BROWSER BRIDGE ───────────────────────────────────────────────────────
async function refreshBridgeStatus() {
	try {
		const res = await fetch('/api/browser/status');
		const data = await res.json();
		// BrowserBridgeStatus: { running, clients, port, error? }
		const connected = data.running === true && (data.clients || 0) > 0;
		const pill = document.getElementById('bridge-pill');
		const label = document.getElementById('bridge-label');
		const statusText = document.getElementById('bridge-status-text');
		const statusBadge = document.getElementById('bridge-status-badge');
		const connInfo = document.getElementById('bridge-connected-info');

		if (pill) pill.className = 'bridge-pill' + (connected ? ' connected' : '');
		if (label) label.textContent = connected ? 'Köprü Bağlı' : 'Köprü';
		if (statusText) statusText.textContent = connected
			? `Bağlı — ${data.clients} tarayıcı istemcisi`
			: data.running ? 'Sunucu çalışıyor, bağlı istemci yok' : 'Köprü sunucusu kapalı';
		if (statusBadge) {
			statusBadge.textContent = connected ? 'BAĞLI' : (data.running ? 'ÇALIŞIYOR' : 'KAPALI');
			statusBadge.style.color = connected ? '#4ade80' : (data.running ? 'var(--accent)' : 'var(--muted)');
			statusBadge.style.borderColor = connected ? '#4ade8040' : 'var(--border)';
		}
		if (connInfo) connInfo.classList.toggle('hidden', !connected);
	} catch(e) {
		const label = document.getElementById('bridge-label');
		if (label) label.textContent = 'Köprü';
	}
}

// ─── SESSION FORK ─────────────────────────────────────────────────────────
async function forkSession() {
	const btn = document.querySelector('[onclick="forkSession()"]');
	if (btn) btn.disabled = true;
	try {
		// Get last message ID for fork point
		const rows = chatInner.querySelectorAll('.msg-row:not([id="global-indicator"])');
		const lastRow = rows[rows.length - 1];
		const id = lastRow ? lastRow.id : undefined;

		const res = await fetch('/api/session/fork', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id })
		});
		const data = await res.json();
		if (data.success) {
			toast('Oturum dallandırıldı — yeni dal aktif', 'success');
			loadHistory();
		} else {
			toast('Fork başarısız oldu', 'error');
		}
	} catch(e) {
		toast('Fork hatası', 'error');
	} finally {
		if (btn) btn.disabled = false;
	}
}

// ─── SESSION EXPORT ───────────────────────────────────────────────────────
async function exportSession(format) {
	try {
		const res = await fetch(`/api/session/export?format=${format}`);
		if (!res.ok) { toast('Dışa aktarma başarısız', 'error'); return; }
		const blob = await res.blob();
		const ext = format === 'html' ? 'html' : 'jsonl';
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `mooncode-session-${Date.now()}.${ext}`;
		a.click();
		URL.revokeObjectURL(url);
		closeModal('exportModal');
		toast(`Oturum ${ext.toUpperCase()} olarak indirildi`, 'success');
	} catch(e) {
		toast('Dışa aktarma hatası', 'error');
	}
}

// ─── SESSION IMPORT ───────────────────────────────────────────────────────
async function importSessionData(content) {
	try {
		const res = await fetch('/api/session/import', {
			method: 'POST',
			headers: { 'Content-Type': 'text/plain' },
			body: content
		});
		const data = await res.json();
		if (data.success) {
			closeModal('exportModal');
			toast('Oturum başarıyla içe aktarıldı', 'success');
			loadHistory();
		} else {
			toast('İçe aktarma başarısız oldu', 'error');
		}
	} catch(e) {
		toast('İçe aktarma hatası', 'error');
	}
}

function handleImportFile(input) {
	const file = input.files[0];
	if (!file) return;
	const reader = new FileReader();
	reader.onload = (e) => importSessionData(e.target.result);
	reader.readAsText(file);
}

function handleImportDrop(event) {
	event.preventDefault();
	document.getElementById('drop-zone')?.classList.remove('drag-over');
	const file = event.dataTransfer.files[0];
	if (!file || !file.name.endsWith('.jsonl')) { toast('Sadece .jsonl dosyaları desteklenir', 'error'); return; }
	const reader = new FileReader();
	reader.onload = (e) => importSessionData(e.target.result);
	reader.readAsText(file);
}

// ─── SESSION SHARE ────────────────────────────────────────────────────────
async function shareSession() {
	const btn = document.getElementById('share-btn');
	if (btn) { btn.disabled = true; btn.querySelector('.material-symbols-rounded').textContent = 'hourglass_top'; }
	try {
		const res = await fetch('/api/session/share', { method: 'POST' });
		const data = await res.json();
		if (data.success && data.url) {
			document.getElementById('share-url-input').value = data.url;
			document.getElementById('share-open-link').href = data.url;
			openModal('shareModal');
		} else {
			toast('Paylaşım başarısız: ' + (data.error || 'GitHub token gerekli'), 'error');
		}
	} catch(e) {
		toast('Paylaşım hatası', 'error');
	} finally {
		if (btn) { btn.disabled = false; btn.querySelector('.material-symbols-rounded').textContent = 'share'; }
	}
}

function copyShareUrl() {
	const input = document.getElementById('share-url-input');
	if (!input) return;
	navigator.clipboard.writeText(input.value);
	toast('Bağlantı kopyalandı', 'success');
}

// ─── PERIODIC BRIDGE POLL ─────────────────────────────────────────────────
setInterval(refreshBridgeStatus, 15000);

// ─── INIT ─────────────────────────────────────────────────────────────────
checkInitialStatus();
loadHistory();
updateUserUI();
fetchCommands();
initSettings();
refreshBridgeStatus();
setInterval(updateUserUI, 8000);

// Sidebar starts open on wide screens
if (window.innerWidth < 768) toggleSidebar();

