import fs from 'fs';

const filePath = 'packages/cli/src/modes/web/web-mode.ts';
let code = fs.readFileSync(filePath, 'utf8');

const newBroadcast = `private broadcastEvent(event: any) {
		try {
			const cache = new Set();
			const dataStr = JSON.stringify(event, (key, value) => {
				if (typeof value === 'object' && value !== null) {
					if (cache.has(value)) return '[Circular]';
					cache.add(value);
				}
				return value;
			});
			const data = \`data: \${dataStr}\n\n\`;
			for (const client of this.clients) {
				try {
					client.write(data);
				} catch(e) {}
			}
		} catch (e) {
			console.error("Broadcast stringify error:", e);
		}
	}`;

code = code.replace(/private broadcastEvent\(event: any\) \{[\s\S]*?\}\n/, newBroadcast + '\n');

fs.writeFileSync(filePath, code);
