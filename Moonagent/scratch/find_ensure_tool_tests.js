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
    } else if (file.endsWith('.ts') || file.endsWith('.js')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('ensureTool')) {
        console.log(`Found in test file: ${fullPath}`);
      }
    }
  });
}

searchDir('C:\\Users\\ozenc\\mooncode\\packages\\cli\\test');
