import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\ozenc\\mooncode\\packages\\tui\\test\\editor.test.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('stripVTControlCharacters')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
