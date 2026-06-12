import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

text = text.replace(/Thinking\./g, 'Thinking...');

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
