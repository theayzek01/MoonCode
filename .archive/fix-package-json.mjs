import fs from 'fs';
let text = fs.readFileSync('packages/cli/package.json', 'utf8');

if (!text.includes('src/modes/web/web-ui.html')) {
    text = text.replace('src/modes/interactive/assets/*.png dist/modes/interactive/assets/', 'src/modes/interactive/assets/*.png dist/modes/interactive/assets/ && shx mkdir -p dist/modes/web && shx cp src/modes/web/web-ui.html dist/modes/web/');
    fs.writeFileSync('packages/cli/package.json', text);
}
