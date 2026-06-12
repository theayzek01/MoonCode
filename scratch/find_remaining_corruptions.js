import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
const content = fs.readFileSync(filePath, 'utf8');
const lines = content.split('\n');

const corruptedSignatures = [
  'Ã', 'Å', 'Ä', 'â', 'Â', '±', 'º', '¼', '½', '¾', '¿', '°', '¹', '²', '³'
];

lines.forEach((line, idx) => {
  const hasCorrupted = corruptedSignatures.some(sig => line.includes(sig));
  // Filter out style or common CSS characters if necessary, but keep it simple
  if (hasCorrupted && !line.includes('class=') && !line.includes('style=')) {
    // Only print lines that are likely UI text or javascript strings
    if (line.includes('textContent') || line.includes('placeholder') || line.includes('title') || line.includes('toast') || line.includes('<span') || line.includes('<div') || line.includes('label') || line.includes('inner') || line.includes('button') || line.includes('function') || line.includes('let ') || line.includes('const ') || line.includes('var ')) {
      console.log(`${idx + 1}: ${line.trim()}`);
    }
  }
});
console.log('Done scanning.');
