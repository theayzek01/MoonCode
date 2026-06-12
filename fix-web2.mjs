import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

text = text.replace(
	/scrollToBottom\(\);\n\s*\} catch\(e\) \{\}/g,
	`scrollToBottom();\n } catch(e) {}\n isFetchingHistory = false;\n if (historyNeedsUpdate) { loadHistory(); }`
);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
