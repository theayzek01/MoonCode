import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

// Replace main container and its absolute layout
text = text.replace(
	/<main class="flex-1 overflow-hidden relative flex flex-col">/g,
	`<main class="flex-1 overflow-hidden flex flex-col">`
);

text = text.replace(
	/<div id="chat-container" class="flex-1 overflow-y-auto p-4 sm:p-6 pb-32 flex flex-col gap-6">/g,
	`<div id="chat-container" class="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-6">`
);

text = text.replace(
	/<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-bg-app via-bg-app to-transparent p-4 sm:p-6 pb-6 pt-12">/g,
	`<div class="shrink-0 p-4 sm:p-6 pt-2 bg-bg-app border-t border-border/30">`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
