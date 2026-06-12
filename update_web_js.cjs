const fs = require('fs');
const file = 'packages/cli/src/modes/web/web-mode.ts';
let code = fs.readFileSync(file, 'utf8');

// Replace appendUserMessage
code = code.replace(
    /function appendUserMessage\(text\) \{[\s\S]*?scrollToBottom\(\);\n\t\t\t\t\}/,
    `function appendUserMessage(text, id) {
					if (document.getElementById('turn-' + id)) return;
					const div = document.createElement('div');
					div.id = 'turn-' + id;
					div.className = 'max-w-4xl mx-auto w-full flex justify-end mb-4';
					div.innerHTML = \`
						<div class="bg-surface border border-border rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] text-sm text-textPrimary whitespace-pre-wrap shadow-sm">
							\${escapeHtml(text)}
						</div>
					\`;
					chatContainer.appendChild(div);
					scrollToBottom();
				}`
);

// Replace loadHistory
code = code.replace(
    /async function loadHistory\(\) \{[\s\S]*?setTimeout\(scrollToBottom, 100\);\n\t\t\t\t\} catch\(e\) \{\}\n\t\t\t\t\}/,
    `async function loadHistory() {
					try {
						const res = await fetch('/api/history');
						const history = await res.json();
						history.forEach(turn => {
							if (turn.role === 'user') {
								appendUserMessage(turn.text, turn.id);
							} else if (turn.role === 'assistant') {
								const div = getOrCreateAiMessageBlock(turn.id);
								if (turn.text) div.querySelector('.text-content').innerHTML = marked.parse(turn.text);
								turn.tools.forEach((tool, index) => {
									let toolDiv = document.getElementById('tool-' + turn.id + '-' + tool.name + '-' + index);
									if (!toolDiv) {
										toolDiv = document.createElement('div');
										toolDiv.id = 'tool-' + turn.id + '-' + tool.name + '-' + index;
										div.querySelector('.tools-container').appendChild(toolDiv);
									}
									renderTool(toolDiv, tool);
								});
								div.querySelector('.thinking-indicator').classList.add('hidden');
							}
						});
					} catch(e) {}
				}`
);

// Replace evtSource.onmessage
code = code.replace(
    /evtSource\.onmessage = function\(event\) \{[\s\S]*?scrollToBottom\(\);\n\t\t\t\t\t\}\n\t\t\t\t\};/,
    `evtSource.onmessage = function(event) {
					const data = JSON.parse(event.data);

					if (data.type === 'engine_start') {
						isGenerating = true;
						updateUIState();
						scrollToBottom();
					}
					
					if (data.type === 'engine_end') {
						isGenerating = false;
						updateUIState();
						refreshStatus();
						loadHistory();
					}

					if (data.type === 'message_update' || data.type === 'message_start' || data.type === 'tool_execution_start' || data.type === 'tool_execution_end') {
						loadHistory(); // Re-sync state from server
					}
				};`
);

fs.writeFileSync(file, code);
