const fs = require('fs');
const file = 'packages/cli/src/modes/web/web-mode.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
    /div\.innerHTML = `\n\t\t\t\t\t\t<div class="bg-surface border border-border rounded-2xl rounded-tr-sm px-5 py-3 max-w-\[80%\] text-sm text-textPrimary whitespace-pre-wrap shadow-sm">\n\t\t\t\t\t\t\t\$\{escapeHtml\(text\)\}\n\t\t\t\t\t\t<\/div>\n\t\t\t\t\t`;/,
    "div.innerHTML = \`\n\t\t\t\t\t\t<div class=\"bg-surface border border-border rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] text-sm text-textPrimary whitespace-pre-wrap shadow-sm\">\n\t\t\t\t\t\t\t\${escapeHtml(text)}\n\t\t\t\t\t\t</div>\n\t\t\t\t\t\`;"
);

fs.writeFileSync(file, code);
