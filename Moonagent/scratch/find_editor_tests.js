import fs from 'fs';
const content = fs.readFileSync('C:\\Users\\ozenc\\mooncode\\packages\\tui\\test\\editor.test.ts', 'utf8');
const lines = content.split('\n');

// Find lines containing the test names
lines.forEach((line, index) => {
  if (line.includes('shows cursor at end of line before wrap') || line.includes('handles single word that fits exactly') || line.includes('handles editor resizes when preferredVisualCol')) {
    console.log(`${index + 1}: ${line.trim()}`);
  }
});
