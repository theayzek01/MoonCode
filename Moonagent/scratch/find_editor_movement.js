import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\ozenc\\mooncode\\packages\\tui\\src\\components\\editor.ts', 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('moveCursorUp') || line.includes('moveCursorDown') || line.includes('handleInput') || line.includes('cursorCol')) {
    if (index >= 900 && index <= 1600) {
      console.log(`${index + 1}: ${line.trim()}`);
    }
  }
});
