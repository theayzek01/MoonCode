import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

const regex = /if \(data\.type === 'message_start' \|\| data\.type === 'message_update' \|\| data\.type === 'message_end' \|\| data\.type === 'tool_execution_start' \|\| data\.type === 'tool_execution_update' \|\| data\.type === 'tool_execution_end'\) \{\n\s*loadHistory\(\);\n\s*\}/g;

const repl = `if (data.type === 'message_update') {
				if (data.message && data.message.text !== undefined) {
					const div = getOrCreateAiMessageBlock(data.message.id);
					let rawText = data.message.text;
					// Thinking gözüksün: replace <think> tags with markdown blockquotes or custom divs
					rawText = rawText.replace(/<think>([\s\S]*?)(<\/think>|$)/g, function(match, p1) {
						return '<div class="opacity-50 border-l-2 border-cyan-500/50 pl-4 py-2 my-4 bg-cyan-950/10 italic text-sm"><div class="font-bold text-xs text-cyan-500 mb-1">Thinking...</div>' + p1 + '</div>';
					});
					
					// Instead of loadHistory which is slow, update text immediately!
					div.querySelector('.text-content').innerHTML = marked.parse(rawText);
					scrollToBottom();
				}
			} else if (data.type === 'message_start' || data.type === 'message_end' || data.type.startsWith('tool_')) {
				loadHistory();
			}`;

const newText = text.replace(regex, repl);
fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', newText);
