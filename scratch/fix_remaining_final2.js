import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replaceAll("{ icon: 'rocket_launch', title: 'Ship', desc: 'DeÄŸiÅŸiklikleri push et'", "{ icon: 'rocket_launch', title: 'Ship', desc: 'Push changes'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed final remaining.');
