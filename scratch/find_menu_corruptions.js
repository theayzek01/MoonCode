import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const words = ['Hesab', 'Aktar', 'Ã', 'Ã', 'kÄ±Å', 'giriÅŸ', 'GiriÅŸ'];
lines.forEach((line, idx) => {
  if (words.some(w => line.includes(w))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
