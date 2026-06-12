#!/bin/bash
cat << 'INNER_EOF' > modify_web.js
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'packages/cli/src/modes/web/web-mode.ts');
let content = fs.readFileSync(file, 'utf8');

content = content.replace('res.end(JSON.stringify(this.runtime.session.settingsManager.getSettings()));', `
			const sm = this.runtime.session.settingsManager;
			res.end(JSON.stringify({
				theme: sm.getTheme(),
				profile: sm.getProfile(),
				enableToolBasedCompaction: sm.getCompactionEnabled()
			}));
`);

content = content.replace('this.runtime.session.settingsManager.set(k, v);', `
								const sm = this.runtime.session.settingsManager;
								if(k === 'theme') sm.setTheme(v);
								if(k === 'profile') sm.setProfile(v);
								if(k === 'enableToolBasedCompaction') sm.setCompactionEnabled(v);
`);

fs.writeFileSync(file, content);
INNER_EOF
node modify_web.js
