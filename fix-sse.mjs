import fs from 'fs';

const filePath = 'packages/cli/src/modes/web/web-mode.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newOnMessage = `evtSource.onmessage = function(event) {
      const data = JSON.parse(event.data);
      
      if (data.type === 'turn_start') {
        isGenerating = true;
        updateUIState();
        scrollToBottom();
      }

      if (data.type === 'message_start' || data.type === 'message_update' || data.type === 'message_end' || data.type === 'tool_execution_start' || data.type === 'tool_execution_update' || data.type === 'tool_execution_end') {
        const msg = data.message;
        if (msg && msg.role === 'assistant') {
          const div = getOrCreateAiMessageBlock(msg.id);
          div.querySelector('.thinking-indicator').classList.remove('hidden');
          
          let textContent = typeof msg.content === "string" ? msg.content : (msg.content && msg.content.map ? msg.content.map(c => c.text).join("") : "");
          div.querySelector('.text-content').innerHTML = marked.parse(textContent);
          
          const toolsContainer = div.querySelector('.tools-container');
          const tools = msg.toolInvocations || [];
          tools.forEach((tl, index) => {
            const toolId = msg.id + '-' + index;
            let toolDiv = document.getElementById('tool-' + toolId);
            if (!toolDiv) {
              toolDiv = document.createElement('div');
              toolDiv.id = 'tool-' + toolId;
              toolsContainer.appendChild(toolDiv);
            }
            renderTool(toolDiv, {
              id: toolId,
              name: tl.toolName,
              status: tl.state === "result" ? "success" : (tl.state === "error" ? "error" : "running"),
              input: typeof tl.args === "string" ? tl.args : JSON.stringify(tl.args || {}),
              output: typeof tl.result === "string" ? tl.result : JSON.stringify(tl.result || "")
            });
          });
          scrollToBottom();
        } else if (!msg && data.toolCallId) {
           // We might get tool_execution_start without a message property but we can just reload history
           loadHistory();
        }
      }

      if (data.type === 'turn_end' || data.type === 'engine_end') {
        isGenerating = false;
        updateUIState();
        document.querySelectorAll('.thinking-indicator').forEach(el => el.classList.add('hidden'));
        refreshStatus();
        loadHistory();
      }
    };`;

code = code.replace(/evtSource\.onmessage \= function\(event\) \{[\s\S]*?(?=function escapeHtml)/, newOnMessage + '\n\n    ');

fs.writeFileSync(filePath, code);
