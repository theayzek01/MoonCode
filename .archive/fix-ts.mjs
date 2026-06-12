import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');
text = text.replace(
	/const skills = this\.runtime\.session\.skillsManager\?\.getSkills\(\) \|\| \[\];/g,
	`const skills: any[] = [];`
);
text = text.replace(
	/skills\.forEach\(s => cmds\.push\(\{ cmd: '\/' \+ s\.name, desc: s\.description \|\| 'Yetenek komutu' \}\)\);/g,
	``
);
fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
