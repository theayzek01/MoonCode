import fs from 'fs';
import path from 'path';

const searchDir = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive';

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walk(fullPath, results);
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(searchDir);
console.log(`Scanning ${files.length} files in interactive mode...`);

const turkishChars = /[şığüçöŞİĞÜÇÖ]/;

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  let found = false;
  lines.forEach((line, idx) => {
    if (turkishChars.test(line)) {
      if (!found) {
        console.log(`Found Turkish in ${filePath}:`);
        found = true;
      }
      console.log(`  Line ${idx + 1}: ${line.trim()}`);
    }
  });
});
console.log('Finished interactive scan.');
