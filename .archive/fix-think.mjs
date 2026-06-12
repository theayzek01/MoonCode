import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

text = text.replace(
	/if \(turn\.text\) div\.querySelector\('\.text-content'\)\.innerHTML = marked\.parse\((turn\.text)\);/g,
	`if (turn.text) {
					let rawText = turn.text;
					rawText = rawText.replace(/<think>([\s\S]*?)(<\/think>|$)/g, function(match, p1) {
						return '<div class="opacity-50 border-l-2 border-cyan-500/50 pl-4 py-2 my-4 bg-cyan-950/10 italic text-sm"><div class="font-bold text-xs text-cyan-500 mb-1">Thinking...</div>' + p1 + '</div>';
					});
					div.querySelector('.text-content').innerHTML = marked.parse(rawText);
				}`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
