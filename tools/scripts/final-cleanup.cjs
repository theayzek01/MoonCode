const fs = require('fs');
const path = require('path');

const rootDir = process.cwd();

const replacements = [
    { old: '@moodcli/core', new: '@moodcli/core' },
    { old: '@moodcli/engine', new: '@moodcli/engine' },
    { old: '@moodcli/cli', new: '@moodcli/cli' },
    { old: 'cli', new: 'cli' },
    { old: 'Zeki Yardimci', new: 'Zeki Yardimci' },
    { old: 'Zeki kodlama yardimcisi', new: 'Zeki kodlama yardimcisi' },
];

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'node_modules' || file === '.git' || file === 'dist') continue;
            walk(fullPath);
        } else {
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
                console.log(`Updated: ${fullPath}`);
            }
        }
    }
}

// 1. Dosya iceriklerini guncelle
walk(rootDir);

// 2. Klasorleri yeniden adlandir (Windows'ta dikkatli olmali)
const renames = [
    { from: 'packages/ai', to: 'packages/core' },
    { from: 'packages/agent', to: 'packages/engine' },
    { from: 'packages/cli', to: 'packages/cli' }
];

for (const r of renames) {
    const fromPath = path.join(rootDir, r.from);
    const toPath = path.join(rootDir, r.to);
    if (fs.existsSync(fromPath)) {
        fs.renameSync(fromPath, toPath);
        console.log(`Renamed directory: ${r.from} -> ${r.to}`);
    }
}

console.log('Final cleanup done!');
