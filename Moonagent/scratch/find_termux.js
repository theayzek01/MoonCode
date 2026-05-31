import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\ozenc\\mooncode\\packages\\tui\\src\\tui.ts', 'utf8');
const lines = content.split('\n');
lines.forEach((line, index) => {
  if (line.includes('isTermux') || line.includes('Termux')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
