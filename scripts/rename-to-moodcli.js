import fs from 'node:fs';
import path from 'node:path';

const rootDir = 'c:/Users/ozenc/OneDrive/Desktop/Clidsa/Moodcli';
const extensions = ['.ts', '.tsx', '.js', '.json', '.md', '.html', '.css', '.sh', '.mjs'];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
            walk(fullPath);
        } else {
            if (extensions.includes(path.extname(fullPath))) {
                processFile(fullPath);
            }
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let original = content;

    // 1. Import aliases
    content = content.replace(/@mariozechner\/moodcli-/g, '@moodcli/');
    
    // 2. UI Components and Prefixes
    content = content.replace(/\bpi-/g, 'moodcli-');
    
    // 3. Config Dirs
    content = content.replace(/\/\.moodcli\b/g, '/.moodcli');
    content = content.replace(/~\/\.moodcli\b/g, '~/.moodcli');
    
    // 4. Domains
    content = content.replace(/\bpi\.dev\b/g, 'moodcli.dev');
    
    // 5. Brand names (Word boundary)
    content = content.replace(/\bPi\b/g, 'Moodcli');
    content = content.replace(/\bpi\b/g, 'moodcli'); 

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf-8');
        console.log(`Updated: ${filePath}`);
    }
}

console.log("Starting rename operation...");
walk(rootDir);
console.log("Done!");
