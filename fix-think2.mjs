import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

text = text.replace(/<think>\(\[sS\]\*\?\)\(<\/think>\|\$\)/g, '<think>([\\s\\S]*?)(<\\/think>|$)');
text = text.replace(/Thinking\./g, 'Thinking...');

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
