import fs from 'fs';
let text = fs.readFileSync('packages/cli/src/modes/web/web-mode.ts', 'utf8');

const regex = /private getHtmlTemplate\(\) \{[\s\S]*?\}\n\}/;
text = text.replace(regex, `private getHtmlTemplate() {
    return fs.readFileSync(path.join(__dirname, 'web-ui.html'), 'utf8');
}`);

// Inject import fs, path if needed
if (!text.includes('import fs')) {
    text = "import fs from 'fs';\nimport path from 'path';\n" + text;
}

const apiInject = `
        if (method === "GET" && url.pathname === "/api/models") {
            res.setHeader("Content-Type", "application/json");
            const models = this.runtime.session.engine.models.getModels().filter(m => m.tools);
            res.end(JSON.stringify(models));
            return;
        }

        if (method === "POST" && url.pathname === "/api/set-model") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                const { model } = JSON.parse(body);
                this.runtime.session.setModel(model);
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true }));
            });
            return;
        }

        if (method === "POST" && url.pathname === "/api/set-thinking") {
            let body = "";
            req.on("data", chunk => body += chunk);
            req.on("end", async () => {
                const { level } = JSON.parse(body);
                this.runtime.session.settingsManager.updateSettings({ thinking_level: level });
                res.setHeader("Content-Type", "application/json");
                res.end(JSON.stringify({ success: true }));
            });
            return;
        }
`;
text = text.replace(/if \(method === "POST" && url\.pathname === "\/api\/interrupt"\) \{[\s\S]*?return;\n\t\t\}/, `if (method === "POST" && url.pathname === "/api/interrupt") {
            this.runtime.session.abort();
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ success: true }));
            return;
        }
${apiInject}`);

fs.writeFileSync('packages/cli/src/modes/web/web-mode.ts', text);
