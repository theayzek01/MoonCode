const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/cli/src/modes/web/web-mode.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('profile: sm.getProfile(),', 'compactionProfile: sm.getCompactionProfile(),');
content = content.replace("if(k === 'profile') sm.setProfile(v);", '');
content = content.replace("if(k === 'theme') sm.setTheme(v);", "if(k === 'theme') sm.setTheme(v as string);");
content = content.replace("if(k === 'enableToolBasedCompaction') sm.setCompactionEnabled(v);", "if(k === 'enableToolBasedCompaction') sm.setCompactionEnabled(v as boolean);");

fs.writeFileSync(file, content);

const fileUi = path.join(__dirname, 'packages/cli/src/modes/web/web-ui.html');
let contentUi = fs.readFileSync(fileUi, 'utf8');
contentUi = contentUi.replace(/<label class="text-textPrimary">Profile<\/label>.*?<\/select>/s, '');
fs.writeFileSync(fileUi, contentUi);
