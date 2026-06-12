import fs from 'fs';

const files = [
  'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/components/settings-selector.ts',
  'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/components/scoped-models-selector.ts'
];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  console.log(`=== ${filePath} ===`);
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (/[şığüçöŞİĞÜÇÖ]/.test(line)) {
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
