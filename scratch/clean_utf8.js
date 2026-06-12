import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
const buffer = fs.readFileSync(filePath);

// Convert to string using utf-8, replacing invalid sequences
const cleanHtml = buffer.toString('utf-8');

fs.writeFileSync(filePath, cleanHtml, 'utf-8');
console.log('File successfully rewritten to clean UTF-8');
