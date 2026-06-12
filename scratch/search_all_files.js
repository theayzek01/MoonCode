import fs from 'fs';
import path from 'path';

const searchDir = 'c:/Users/ozenc/Desktop/mooncode/packages';

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (!file.includes('node_modules') && !file.includes('dist') && !file.includes('.git')) {
        walk(fullPath, results);
      }
    } else {
      if (file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.html')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk(searchDir);
console.log(`Scanning ${files.length} files...`);

const targets = ['DÄ¼', 'dÃ¼', 'DÃ¼ÅŸ', 'dÃ¼ÅŸ', 'Düşün', 'düşün', 'DÄ¼ÅÅ¼nÃ¼lÃ¼yor'];

files.forEach(filePath => {
  const content = fs.readFileSync(filePath, 'utf8');
  targets.forEach(target => {
    if (content.includes(target)) {
      console.log(`Found target "${target}" in ${filePath}`);
      // Find line numbers
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (line.includes(target)) {
          console.log(`  Line ${idx + 1}: ${line.trim()}`);
        }
      });
    }
  });
});
console.log('Done scanning all files.');
