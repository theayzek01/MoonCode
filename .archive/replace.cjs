const fs = require('fs');
const file = 'packages/cli/src/modes/web/web-mode.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /function appendUserMessage\(text\) \{[\s\S]*?scrollToBottom\(\);\s*\}/,
    "function appendUserMessage(text, id) {\n" +
    "\t\t\t\t\tif (document.getElementById('turn-' + id)) return;\n" +
    "\t\t\t\t\tconst div = document.createElement('div');\n" +
    "\t\t\t\t\tdiv.id = 'turn-' + id;\n" +
    "\t\t\t\t\tdiv.className = 'max-w-4xl mx-auto w-full flex justify-end mb-4';\n" +
    "\t\t\t\t\tdiv.innerHTML = `\n" +
    "\t\t\t\t\t\t<div class=\"bg-surface border border-border rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] text-sm text-textPrimary whitespace-pre-wrap shadow-sm\">\n" +
    "\t\t\t\t\t\t\t${escapeHtml(text)}\n" +
    "\t\t\t\t\t\t</div>\n" +
    "\t\t\t\t\t`;\n" +
    "\t\t\t\t\tchatContainer.appendChild(div);\n" +
    "\t\t\t\t\tscrollToBottom();\n" +
    "\t\t\t\t}"
);

code = code.replace(
    /const evtSource = new EventSource\("\/api\/stream"\);\s*evtSource\.onmessage = function\(event\) \{[\s\S]*?scrollToBottom\(\);\s*\}\s*;/g,
    "const evtSource = new EventSource(\"/api/stream\");\n" +
    "\t\t\t\tevtSource.onmessage = function(event) {\n" +
    "\t\t\t\t\tconst data = JSON.parse(event.data);\n" +
    "\t\t\t\t\tif (data.type === 'engine_start') {\n" +
    "\t\t\t\t\t\tisGenerating = true;\n" +
    "\t\t\t\t\t\tupdateUIState();\n" +
    "\t\t\t\t\t\tscrollToBottom();\n" +
    "\t\t\t\t\t}\n" +
    "\t\t\t\t\tif (data.type === 'engine_end') {\n" +
    "\t\t\t\t\t\tisGenerating = false;\n" +
    "\t\t\t\t\t\tupdateUIState();\n" +
    "\t\t\t\t\t\trefreshStatus();\n" +
    "\t\t\t\t\t\tloadHistory();\n" +
    "\t\t\t\t\t}\n" +
    "\t\t\t\t\tif (data.type === 'message_update' || data.type === 'message_start' || data.type === 'tool_execution_start' || data.type === 'tool_execution_end' || data.type === 'tool_execution_update') {\n" +
    "\t\t\t\t\t\tloadHistory();\n" +
    "\t\t\t\t\t}\n" +
    "\t\t\t\t};"
);

code = code.replace(
    /async function loadHistory\(\) \{[\s\S]*?setTimeout\(scrollToBottom, 100\);\s*\} catch\(e\) \{\}\s*\}/,
    "async function loadHistory() {\n" +
    "\t\t\t\t\ttry {\n" +
    "\t\t\t\t\t\tconst res = await fetch('/api/history');\n" +
    "\t\t\t\t\t\tconst history = await res.json();\n" +
    "\t\t\t\t\t\thistory.forEach(turn => {\n" +
    "\t\t\t\t\t\t\tif (turn.role === 'user') {\n" +
    "\t\t\t\t\t\t\t\tappendUserMessage(turn.text, turn.id);\n" +
    "\t\t\t\t\t\t\t} else if (turn.role === 'assistant') {\n" +
    "\t\t\t\t\t\t\t\tconst div = getOrCreateAiMessageBlock(turn.id);\n" +
    "\t\t\t\t\t\t\t\tif (turn.text) div.querySelector('.text-content').innerHTML = marked.parse(turn.text);\n" +
    "\t\t\t\t\t\t\t\tturn.tools.forEach((tool, index) => {\n" +
    "\t\t\t\t\t\t\t\t\tlet toolDiv = document.getElementById('tool-' + turn.id + '-' + index);\n" +
    "\t\t\t\t\t\t\t\t\tif (!toolDiv) {\n" +
    "\t\t\t\t\t\t\t\t\t\ttoolDiv = document.createElement('div');\n" +
    "\t\t\t\t\t\t\t\t\t\ttoolDiv.id = 'tool-' + turn.id + '-' + index;\n" +
    "\t\t\t\t\t\t\t\t\t\tdiv.querySelector('.tools-container').appendChild(toolDiv);\n" +
    "\t\t\t\t\t\t\t\t\t}\n" +
    "\t\t\t\t\t\t\t\t\trenderTool(toolDiv, tool);\n" +
    "\t\t\t\t\t\t\t\t});\n" +
    "\t\t\t\t\t\t\t\tif (turn.status === 'complete' && !isGenerating) {\n" +
    "\t\t\t\t\t\t\t\t\tdiv.querySelector('.thinking-indicator').classList.add('hidden');\n" +
    "\t\t\t\t\t\t\t\t} else {\n" +
    "\t\t\t\t\t\t\t\t\tdiv.querySelector('.thinking-indicator').classList.remove('hidden');\n" +
    "\t\t\t\t\t\t\t\t}\n" +
    "\t\t\t\t\t\t\t}\n" +
    "\t\t\t\t\t\t});\n" +
    "\t\t\t\t\t\tscrollToBottom();\n" +
    "\t\t\t\t\t} catch(e) {}\n" +
    "\t\t\t\t}"
);

fs.writeFileSync(file, code);
