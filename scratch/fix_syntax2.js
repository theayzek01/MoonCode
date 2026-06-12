import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

// Replace the broken line and translations
content = content.replace("toast(`Oturum ${ext.toUpperCase()} olarak indirildi`, 'success');", "toast(`Session exported as ${ext.toUpperCase()}`, 'success');");
content = content.replace("toast('Export errorÄ±', 'error');", "toast('Export error', 'error');");
content = content.replace("Import errorÄ±', 'error');", "toast('Import error', 'error');");
content = content.replace("toast('Sadece .jsonl dosyalarÄ± desteklenir', 'error');", "toast('Only .jsonl files are supported', 'error');");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed successfully.');
