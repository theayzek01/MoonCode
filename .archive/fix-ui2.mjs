import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

text = text.replace(
	/<div class="max-w-4xl mx-auto relative group">/g,
	`<div class="max-w-4xl mx-auto relative group glass-panel rounded-2xl shadow-2xl codex-glow overflow-hidden">`
);

text = text.replace(
	/class="w-full bg-transparent text-textPrimary p-4 pb-14 outline-none resize-none"/,
	`class="w-full bg-transparent text-gray-100 p-5 pb-16 outline-none resize-none placeholder-gray-500 font-medium"`
);

text = text.replace(
	/class="h-9 w-9 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center justify-center text-white transition-colors disabled:opacity-50"/,
	`class="h-10 w-10 bg-cyan-600 hover:bg-cyan-500 rounded-xl flex items-center justify-center text-white transition-all disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.4)]"`
);

text = text.replace(
	/class="text-center mt-3 text-xs text-textSecondary font-mono"/,
	`class="text-center mt-4 text-[10px] text-gray-600 tracking-widest font-mono uppercase"`
);

text = text.replace(
	/<div class="max-w-4xl mx-auto relative group glass-panel rounded-2xl shadow-2xl codex-glow overflow-hidden">/,
	`<div class="max-w-4xl mx-auto relative glass-panel rounded-3xl shadow-2xl codex-glow overflow-hidden border border-gray-800">`
);

// I need to change "border-border/30 bg-bg-app" wrapper from my previous fix
text = text.replace(
	/<div class="shrink-0 p-4 sm:p-6 pt-2 bg-bg-app border-t border-border\/30">/,
	`<div class="shrink-0 p-4 sm:p-6 pt-4 bg-transparent relative z-10 before:absolute before:inset-0 before:bg-gradient-to-t before:from-[#030712] before:via-[#030712]/80 before:to-transparent before:-z-10">`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
