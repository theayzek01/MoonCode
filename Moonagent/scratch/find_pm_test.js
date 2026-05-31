import fs from 'fs';
import path from 'path';

function searchDir(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (file === 'node_modules' || file === '.git' || file === 'dist') return;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('temporary git sources')) {
        console.log(`Found package-manager test: ${fullPath}`);
      }
    }
  });
}

searchDir('C:\\Users\\ozenc\\mooncode\\packages\\cli\\test');
