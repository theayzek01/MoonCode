const fs = require('fs');
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

if (!text.includes('if (prompt.startsWith("/clear"))')) {
	const inject = `
		if (method === "POST" && url.pathname === "/api/prompt") {
			let body = "";
			req.on("data", chunk => body += chunk);
			req.on("end", async () => {
				try {
					const { prompt } = JSON.parse(body);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));

					// COMMAND INTERCEPTION FOR WEB MODE
					let handled = false;
					const cmd = prompt.trim().toLowerCase();
					if (cmd === "/clear") {
						this.runtime.session.clearHistory();
						handled = true;
					} else if (cmd === "/compact") {
						this.runtime.session.compactHistory("manual");
						handled = true;
					} else if (cmd === "/test") {
						this.runtime.session.prompt("Run the test suite and fix the errors.");
						handled = true;
					} else if (cmd === "/build") {
						this.runtime.session.prompt("Build the project.");
						handled = true;
					} else if (cmd === "/lint") {
						this.runtime.session.prompt("Run linter and fix the issues.");
						handled = true;
					} else if (cmd === "/ship") {
						this.runtime.session.prompt("Ship the current changes (branch, commit, push, PR).");
						handled = true;
					}
					
					if (!handled) {
						this.runtime.session.prompt(prompt).catch(console.error);
					}
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}
`;
	text = text.replace(/if \(method === "POST" && url.pathname === "\/api\/prompt"\) {[\s\S]*?return;\n\t\t}/, inject);
	fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
}
