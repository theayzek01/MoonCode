import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

const HTML = `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>MoonCode</title>
	<script src="https://cdn.tailwindcss.com"></script>
	<script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
	<style>
        :root { --bg: oklch(12% 0.006 260); --surface: oklch(17% 0.008 260); --fg: oklch(96% 0.004 260); --muted: oklch(66% 0.01 260); --border: oklch(27% 0.008 260); --accent: oklch(68% 0.14 245); }
        body { font-family: 'Inter', sans-serif; background-color: var(--bg); color: var(--fg); margin: 0; padding: 0; height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        .bg-surface { background-color: var(--surface); }
        .border-border { border-color: var(--border); }
        .text-textPrimary { color: var(--fg); }
        .text-textSecondary { color: var(--muted); }
        
        .material-symbols-rounded { font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 20; font-size: 20px; }

        .thinking-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: .5; } }

        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--muted); }

		.glass-input { background: rgba(25, 25, 25, 0.6); backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px); border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.3); }
        .prose pre { background-color: #0d0d0d !important; border: 1px solid var(--border); border-radius: 0.5rem; }
        .prose code { color: #e5e7eb; background: rgba(255,255,255,0.1); padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
        .prose pre code { background: none; padding: 0; }
        .prose p { margin-top: 0.5em; margin-bottom: 0.5em; }
	</style>
</head>
<body class="antialiased">
	<div class="h-14 border-b border-border bg-surface flex items-center justify-between px-4 shrink-0 z-10 relative">
		<div class="flex items-center gap-3">
			<div class="w-8 h-8 rounded bg-cyan-600/20 flex items-center justify-center text-cyan-400"><span class="material-symbols-rounded">dark_mode</span></div>
			<span class="font-semibold text-textPrimary tracking-tight">MoonCode</span>
			<div class="h-4 w-[1px] bg-border mx-2"></div>
			<div id="status-indicator" class="flex items-center gap-2 text-xs text-textSecondary bg-white/5 px-2.5 py-1.5 rounded-md border border-white/5 cursor-pointer hover:bg-white/10 transition" onclick="openModal('modelModal')">
				<span class="material-symbols-rounded !text-[16px]">model_training</span>
				<span id="model-display">Loading...</span>
			</div>
            <div id="cwd-display" class="text-xs text-textSecondary max-w-[200px] truncate flex items-center gap-1 opacity-70">
                <span class="material-symbols-rounded !text-[14px]">folder</span><span>Workspace</span>
            </div>
		</div>
		<div class="flex items-center gap-3 text-xs">
            <div id="token-usage" class="text-textSecondary opacity-70 font-mono">IN: 0 | OUT: 0</div>
            <button onclick="openModal('settingsModal')" class="w-8 h-8 rounded flex items-center justify-center hover:bg-white/10 text-textSecondary transition">
                <span class="material-symbols-rounded">settings</span>
            </button>
		</div>
	</div>

	<div id="chat-container" class="flex-1 overflow-y-auto p-4 md:p-6 pb-40 space-y-6">
		<div class="max-w-4xl mx-auto w-full text-center py-10 opacity-50">
			<div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-cyan-900/30 text-cyan-400 mb-4"><span class="material-symbols-rounded !text-3xl">auto_awesome</span></div>
			<h2 class="text-lg font-medium text-textPrimary">How can I help you today?</h2>
			<p class="text-sm text-textSecondary mt-1">Press <kbd class="px-1.5 py-0.5 bg-white/10 rounded">Enter</kbd> to send, <kbd class="px-1.5 py-0.5 bg-white/10 rounded">Shift+Enter</kbd> for new line.</p>
		</div>
	</div>

	<div class="absolute bottom-0 left-0 w-full p-4 md:p-6 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent pointer-events-none">
		<div class="max-w-4xl mx-auto relative pointer-events-auto">
			<div class="glass-input rounded-2xl flex flex-col p-2 transition-all focus-within:border-cyan-500/50">
				<textarea id="prompt-input" rows="1" class="w-full bg-transparent text-textPrimary p-3 outline-none resize-none max-h-[200px] text-sm" placeholder="Type a message or /command..."></textarea>
				<div class="flex justify-between items-center px-2 pb-1 pt-1">
					<div class="flex gap-2">
                        <button class="text-textSecondary hover:text-textPrimary transition p-1 rounded hover:bg-white/10 flex items-center gap-1 text-xs" onclick="openModal('reasoningModal')">
                            <span class="material-symbols-rounded !text-[16px]">psychology</span>
                            <span id="reasoning-display">Level: Auto</span>
                        </button>
					</div>
					<div class="flex gap-2">
						<button id="cancel-btn" class="hidden h-8 px-3 rounded bg-red-950/30 text-red-400 hover:bg-red-950/50 border border-red-900/50 transition items-center gap-1.5 text-xs font-medium"><span class="material-symbols-rounded !text-[14px]">stop_circle</span> Stop</button>
						<button id="send-btn" class="h-8 w-8 rounded bg-cyan-600 text-white hover:bg-cyan-500 flex items-center justify-center transition shadow-lg shadow-cyan-900/20"><span class="material-symbols-rounded !text-[18px]">arrow_upward</span></button>
					</div>
				</div>
			</div>
		</div>
	</div>

    <div id="modalOverlay" class="hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 opacity-0 transition-opacity duration-200">
        <div id="settingsModal" class="hidden w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="p-4 border-b border-border flex justify-between items-center"><h3 class="font-semibold text-textPrimary flex items-center gap-2"><span class="material-symbols-rounded">settings</span> Settings</h3><button onclick="closeModal()" class="text-textSecondary hover:text-white"><span class="material-symbols-rounded">close</span></button></div>
            <div class="p-4 space-y-4 text-sm text-textSecondary"><div>Settings configuration will be available here. Coming soon.</div></div>
        </div>
        <div id="modelModal" class="hidden w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="p-4 border-b border-border flex justify-between items-center"><h3 class="font-semibold text-textPrimary flex items-center gap-2"><span class="material-symbols-rounded">model_training</span> Select Model</h3><button onclick="closeModal()" class="text-textSecondary hover:text-white"><span class="material-symbols-rounded">close</span></button></div>
            <div class="p-4 max-h-[60vh] overflow-y-auto space-y-2" id="modelListContainer"><div class="text-center text-textSecondary py-4">Loading models...</div></div>
        </div>
        <div id="reasoningModal" class="hidden w-full max-w-xs bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden transform scale-95 transition-transform duration-200">
            <div class="p-4 border-b border-border flex justify-between items-cente
