import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.toLowerCase().includes('toggle') && line.toLowerCase().includes('user')) {
    console.log(`${idx + 1}: ${line}`);
  }
});
console.log('Done checking.');
