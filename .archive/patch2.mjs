import fs from 'fs';
let code = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf-8');

const comboboxLogic = `
        const slashCommands = [
            { cmd: '/help', desc: 'Get started with MoonCode' },
            { cmd: '/compact', desc: 'Compact memory & context' },
            { cmd: '/clear', desc: 'Clear the context' },
            { cmd: '/snapshot', desc: 'Take a workspace snapshot' },
            { cmd: '/model', desc: 'Change current model' }
        ];
        
        const slashCommandsMenu = document.getElementById('slash-commands');
        let commandIndex = -1;

        promptInput.addEventListener('input', (e) => {
            const val = promptInput.value;
            if (val.startsWith('/')) {
                const query = val.substring(1).toLowerCase();
                const filtered = slashCommands.filter(c => c.cmd.substring(1).toLowerCase().startsWith(query));
                
                if (filtered.length > 0) {
                    slashCommandsMenu.innerHTML = filtered.map((c, i) => \`
                        <div class="px-4 py-2 flex justify-between items-center cursor-pointer \${i === commandIndex ? 'bg-blue-600/20 text-blue-400' : 'hover:bg-white/5'} transition-colors" data-cmd="\${c.cmd}">
                            <span class="font-bold">\${c.cmd}</span>
                            <span class="text-textSecondary text-xs">\${c.desc}</span>
                        </div>
                    \`).join('');
                    slashCommandsMenu.classList.remove('hidden');
                    
                    slashCommandsMenu.querySelectorAll('div').forEach((el, idx) => {
                        el.addEventListener('click', () => {
                            promptInput.value = el.getAttribute('data-cmd') + ' ';
                            slashCommandsMenu.classList.add('hidden');
                            promptInput.focus();
                        });
                    });
                } else {
                    slashCommandsMenu.classList.add('hidden');
                }
            } else {
                slashCommandsMenu.classList.add('hidden');
            }
        });

        promptInput.addEventListener('keydown', (e) => {
            if (!slashCommandsMenu.classList.contains('hidden')) {
                const items = slashCommandsMenu.querySelectorAll('div');
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    commandIndex = (commandIndex + 1) % items.length;
                    promptInput.dispatchEvent(new Event('input'));
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    commandIndex = (commandIndex - 1 + items.length) % items.length;
                    promptInput.dispatchEvent(new Event('input'));
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (commandIndex >= 0 && items[commandIndex]) {
                        items[commandIndex].click();
                    }
                    return;
                } else if (e.key === 'Escape') {
                    slashCommandsMenu.classList.add('hidden');
                }
            } else {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendPrompt();
                }
            }
        });
`;

code = code.replace(/promptInput\.addEventListener\('keydown', \(e\) => \{[\s\S]*?\}\);/, comboboxLogic);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', code);
