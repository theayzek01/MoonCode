const fs = require('fs');
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');
text = text.replace(
	/const slashCommands = \[\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\},\s*\{[^\}]+\}\s*\];/,
	`let slashCommands: any[] = []; fetch('/api/commands').then(r => r.json()).then(cmds => { slashCommands = cmds; }).catch(() => {});`
);
fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
