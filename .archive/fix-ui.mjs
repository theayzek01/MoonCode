import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

// Update Root Colors for Codex look
text = text.replace(
	/:root \{([\s\S]*?)\}/,
	`:root {
			--bg-app: #030712; /* Tailwind gray-950 */
			--bg-surface: #111827; /* Tailwind gray-900 */
			--border: #1f2937; /* Tailwind gray-800 */
			--text-primary: #f9fafb;
			--text-secondary: #9ca3af;
			--accent: #06b6d4; /* Cyan-500 */
			--accent-glow: rgba(6, 182, 212, 0.15);
		}`
);

// Add custom scrollbar and glow to styles
text = text.replace(
	/<\/style>/,
	`
		::-webkit-scrollbar { width: 8px; height: 8px; }
		::-webkit-scrollbar-track { background: transparent; }
		::-webkit-scrollbar-thumb { background: #374151; border-radius: 4px; }
		::-webkit-scrollbar-thumb:hover { background: #4b5563; }
		
		.codex-glow {
			box-shadow: 0 0 20px var(--accent-glow);
		}
		
		.glass-panel {
			background: rgba(17, 24, 39, 0.6);
			backdrop-filter: blur(12px);
			-webkit-backdrop-filter: blur(12px);
			border: 1px solid rgba(255, 255, 255, 0.05);
		}
	</style>`
);

// Transparent Text Input (Input Container)
text = text.replace(
	/<div class="shrink-0 p-4 sm:p-6 pt-2 bg-bg-app border-t border-border\/30">/,
	`<div class="shrink-0 p-4 sm:p-6 pt-4 bg-transparent relative z-10 before:absolute before:inset-0 before:bg-gradient-to-t before:from-[#030712] before:to-transparent before:-z-10">`
);

// The actual textarea
text = text.replace(
	/<textarea id="prompt-input" rows="1" class="w-full bg-surface border border-border\/50 rounded-xl px-4 py-3 pr-12 text-sm focus:outline-none focus:border-accent\/50 focus:ring-1 focus:ring-accent\/50 resize-none overflow-hidden transition-all text-textPrimary placeholder-textSecondary"/,
	`<textarea id="prompt-input" rows="1" class="w-full glass-panel rounded-2xl px-5 py-4 pr-14 text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 resize-none overflow-hidden transition-all text-textPrimary placeholder-textSecondary shadow-lg codex-glow"`
);

// The send button
text = text.replace(
	/<button id="send-btn" class="absolute right-2 bottom-2 p-2 rounded-lg bg-accent text-white hover:bg-accent\/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">/,
	`<button id="send-btn" class="absolute right-3 bottom-3 p-2 rounded-xl bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.3)] disabled:opacity-50 disabled:cursor-not-allowed transition-all">`
);

// Tool Card UI (Codex Design)
text = text.replace(
	/container.className = `text-xs font-mono border rounded-lg overflow-hidden transition-colors \${isError \? 'border-red-900\/50 bg-red-900\/10' : 'border-border bg-surface'}`;/,
	`container.className = \`text-xs font-mono border rounded-xl overflow-hidden transition-all shadow-sm \${
				isError ? 'border-red-900/50 bg-red-950/20' : 
				isRunning ? 'border-cyan-900/50 bg-cyan-950/10 codex-glow' : 
				'border-gray-800 bg-gray-900/50 hover:border-gray-700'
			}\`;`
);

text = text.replace(
	/<div class="px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-white\/5" onclick="this.nextElementSibling.classList.toggle\('hidden'\)">/g,
	`<div class="px-4 py-2.5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors" onclick="this.nextElementSibling.classList.toggle('hidden')">`
);

text = text.replace(
	/if \(isRunning\) statusIcon = '<span class="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"><\/span>';\n\s*else if \(isError\) statusIcon = '<span class="w-2 h-2 bg-red-500 rounded-full"><\/span>';\n\s*else statusIcon = '<span class="w-2 h-2 bg-green-500 rounded-full"><\/span>';/,
	`if (isRunning) statusIcon = '<div class="relative flex h-2.5 w-2.5"><span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span><span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span></div>';
			else if (isError) statusIcon = '<span class="w-2.5 h-2.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.5)]"></span>';
			else statusIcon = '<span class="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.5)]"></span>';`
);

text = text.replace(
	/<span class="font-semibold text-textPrimary">\${tool.name}<\/span>/,
	`<span class="font-bold text-gray-200 tracking-wide">\${tool.name}</span>`
);

text = text.replace(
	/<div class="hidden border-t border-border\/50">/g,
	`<div class="hidden border-t border-gray-800">`
);

text = text.replace(
	/<div class="p-3 bg-black\/20 text-textSecondary whitespace-pre-wrap break-all">\${escapeHtml\(tool.output\)}<\/div>/g,
	`<div class="p-4 bg-black/40 text-gray-400 whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">\${escapeHtml(tool.output || 'No output')}</div>`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
