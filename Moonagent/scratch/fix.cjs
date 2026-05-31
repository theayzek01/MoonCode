const fs = require('fs');
const path = require('path');

function replaceInFile(filePath, replacements) {
    let content = fs.readFileSync(filePath, 'utf8');
    let changed = false;
    for (const [search, replace] of replacements) {
        if (search instanceof RegExp) {
            if (search.test(content)) {
                content = content.replace(search, replace);
                changed = true;
            }
        } else {
            if (content.includes(search)) {
                content = content.split(search).join(replace);
                changed = true;
            }
        }
    }
    if (changed) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

function walk(dir, callback) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filepath = path.join(dir, file);
        if (fs.statSync(filepath).isDirectory()) {
            if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
                walk(filepath, callback);
            }
        } else {
            callback(filepath);
        }
    }
}

const versionReplacements = [
    [/2026-v46/g, '1.26-v2'],
    [/2026\.0\.0-beta1/g, '1.26-v2'],
    [/v2026-3/g, '1.26-v2'],
    [/2026-v30/g, '1.26-v2'],
    [/v46/g, '1.26-v2']
];

const nameReplacements = [
    [/MoonCode/g, 'MoonAgent'],
    [/MOONCODE/g, 'MOONAGENT'],
    [/\? MoonCode Otonom/g, '? MoonAgent Otonom'],
    [/\? MOONCODE HUB/g, '? MOONAGENT HUB'],
    [/mooncode /g, 'moonagent ']
];

// Update package.json files
walk(__dirname, (filepath) => {
    if (filepath.endsWith('package.json')) {
        replaceInFile(filepath, versionReplacements);
    }
});

// Update CLI source files
walk(path.join(__dirname, 'packages/cli/src'), (filepath) => {
    if (filepath.endsWith('.ts')) {
        replaceInFile(filepath, [...versionReplacements, ...nameReplacements]);
    }
});

// Also update docs and README
walk(path.join(__dirname, 'docs'), (filepath) => {
    if (filepath.endsWith('.html') || filepath.endsWith('.js') || filepath.endsWith('.md') || filepath.endsWith('.css')) {
        replaceInFile(filepath, [...versionReplacements, ...nameReplacements]);
    }
});
replaceInFile(path.join(__dirname, 'README.md'), [...versionReplacements, ...nameReplacements]);
