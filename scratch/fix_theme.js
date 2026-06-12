import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/theme/theme.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('let errorMessage = `Geçersiz tema "${label}":\\n`;', 'let errorMessage = `Invalid theme "${label}":\\n`;');
content = content.replace('errorMessage += "\\nEksik gerekli renk tokenları:\\n";', 'errorMessage += "\\nMissing required color tokens:\\n";');
content = content.replace("errorMessage += '\\n\\nLütfen bu renkleri temanızın \"colors\" nesnesine ekleyin.';", "errorMessage += '\\n\\nPlease add these colors to your theme\\'s \"colors\" object.';");
content = content.replace('errorMessage += "\\nReferans değerler için yerleşik temalara (dark.json, light.json) bakın.";', 'errorMessage += "\\nSee built-in themes (dark.json, light.json) for reference values.";');
content = content.replace('errorMessage += `\\n\\nDiğer hatalar:\\n${otherErrors.join("\\n")}`;', 'errorMessage += `\\n\\nOther errors:\\n${otherErrors.join("\\n")}`;');
content = content.replace('[Çalıştır: ctrl+e]', '[Run: ctrl+e]');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed theme.ts');
