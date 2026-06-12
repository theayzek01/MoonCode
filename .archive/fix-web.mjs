import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

// Add overflow: hidden to body css
text = text.replace(
	/flex-direction: column;/,
	`flex-direction: column;\n overflow: hidden;`
);

// Implement queue for loadHistory
text = text.replace(
	/async function loadHistory\(\) \{/,
	`let isFetchingHistory = false;\nlet historyNeedsUpdate = false;\n\nasync function loadHistory() {\n if (isFetchingHistory) { historyNeedsUpdate = true; return; }\n isFetchingHistory = true; historyNeedsUpdate = false;`
);

text = text.replace(
	/scrollToBottom\(\);\n \} catch\(e\) \{\}/,
	`scrollToBottom();\n } catch(e) {}\n isFetchingHistory = false;\n if (historyNeedsUpdate) { loadHistory(); }`
);

// Make sure scrolling also happens nicely
text = text.replace(
	/function scrollToBottom\(\) \{/,
	`function scrollToBottom() {\n const isScrolledToBottom = chatContainer.scrollHeight - chatContainer.clientHeight <= chatContainer.scrollTop + 150;\n if (!isScrolledToBottom && isGenerating) return;\n`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
