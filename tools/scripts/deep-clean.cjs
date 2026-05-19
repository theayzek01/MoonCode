const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const replacements = [
    { old: 'Agent', new: 'Engine' },
    { old: 'agent', new: 'engine' },
    { old: 'AI', new: 'Core' },
    { old: 'LLM', new: 'Provider' },
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
            walk(fullPath);
        } else {
            if (file.endsWith('.ts') || file.endsWith('.json') || file.endsWith('.md')) {
                let content = fs.readFileSync(fullPath, 'utf8');
                let changed = false;
                for (const r of replacements) {
                    if (content.includes(r.old)) {
                        content = content.split(r.old).join(r.new);
                        changed = true;
                    }
                }
                if (changed) {
                    fs.writeFileSync(fullPath, content);
                }
            }
        }
    }
}

walk(rootDir);

// Rename files containing "agent"
function renameFiles(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
            renameFiles(fullPath);
        } else {
            if (file.toLowerCase().includes('agent')) {
                const newName = file.replace(/agent/g, 'engine').replace(/Agent/g, 'Engine');
                const newPath = path.join(dir, newName);
                fs.renameSync(fullPath, newPath);
                console.log(`Renamed file: ${file} -> ${newName}`);
            }
        }
    }
}

renameFiles(rootDir);
console.log('Deep AI clean done!');
