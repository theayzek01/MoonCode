import fs from 'fs';
let code = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf-8');

const regex = /slashCommandsMenu\.innerHTML \= filtered\.map\(\(c, i\) => `[\s\S]*?`\)\.join\(''\);/g;

code = code.replace(regex, "slashCommandsMenu.innerHTML = filtered.map((c, i) => '<div class=\"px-4 py-2 flex justify-between items-center cursor-pointer ' + (i === commandIndex ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5') + ' transition-colors\" data-cmd=\"' + c.cmd + '\"><span class=\"font-bold\">' + c.cmd + '</span><span class=\"text-textSecondary text-xs\">' + c.desc + '</span></div>').join('');");

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', code);
