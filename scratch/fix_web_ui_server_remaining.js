import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/core/web-ui-server.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace("Copyndı", "Copied");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced Copyndı successfully.');
