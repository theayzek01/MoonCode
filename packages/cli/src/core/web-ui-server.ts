// @ts-nocheck
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { getSessionsDir } from "../config.js";

const INDEX_HTML = `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Hodeus Dashboard</title><link rel="stylesheet" href="/style.css" /></head>
<body><div id="app"><header class="topbar"><div><b>Hodeus</b><span>workspace dashboard</span></div><nav><span>sessions</span><span>chat</span><span>stats</span></nav></header><aside><h1>Sessions</h1><p class="hint">Geçmiş oturumlardan birini seç.</p><div id="sessions"></div></aside><main><div id="chat" class="panel empty">Oturum seç</div></main><section><h2>Stats</h2><pre id="stats">-</pre></section></div><script src="/app.js"></script></body>
</html>`;

const STYLE_CSS = `:root{color-scheme:dark;--bg:#0b0f17;--panel:#111827;--panel2:#0f1520;--line:#243044;--fg:#e5edf7;--muted:#8b9bb0;--accent:#8fd6bd}*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:14px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace}#app{display:grid;grid-template-columns:300px 1fr 280px;grid-template-rows:auto 1fr;gap:12px;height:100vh;padding:12px}.topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border:1px solid var(--line);border-radius:10px;background:var(--panel2)}.topbar b{font-size:16px}.topbar span{margin-left:10px;color:var(--muted)}nav{display:flex;gap:14px}nav span{margin:0;color:var(--muted)}aside,main,section{border:1px solid var(--line);border-radius:10px;background:var(--panel);overflow:auto}h1,h2{font-size:14px;margin:14px 14px 4px}.hint{margin:0 14px 12px;color:var(--muted)}.session{padding:10px 14px;border-top:1px solid var(--line);cursor:pointer}.session:hover,.session.active{background:#172033}.session b{font-weight:600}.muted{color:var(--muted)}.panel{padding:16px}.empty{color:var(--muted)}.msg{margin:0 0 10px;padding:12px;border:1px solid var(--line);border-radius:8px;background:#0c121d}.role{color:var(--accent);font-weight:600;font-size:12px;text-transform:uppercase;letter-spacing:.06em}pre{white-space:pre-wrap;margin:12px;color:var(--fg)}#stats{color:var(--muted)}@media(max-width:1000px){#app{grid-template-columns:1fr;height:auto}.topbar{display:block}nav{margin-top:8px}aside,main,section{min-height:220px}}`;

const APP_JS = `const $=s=>document.querySelector(s);let current=null;async function loadSessions(){const sessions=await fetch('/api/sessions').then(r=>r.json());$('#sessions').innerHTML=sessions.map(s=>\`<div class="session" data-id="\${s.id}"><b>\${s.id}</b><br><span class="muted">\${s.cwd||''}</span><br><span class="muted">\${new Date(s.modified).toLocaleString()} · \${s.messages} entries</span></div>\`).join('')||'<p class="muted panel">Session yok</p>';document.querySelectorAll('.session').forEach(el=>el.onclick=()=>loadSession(el.dataset.id));}function textOf(c){if(!c)return'';if(typeof c==='string')return c;if(Array.isArray(c))return c.map(textOf).join('\\n');if(c.type==='text')return c.text||'';return JSON.stringify(c,null,2)}async function loadSession(id){current=id;document.querySelectorAll('.session').forEach(e=>e.classList.toggle('active',e.dataset.id===id));const data=await fetch('/api/session/'+encodeURIComponent(id)).then(r=>r.json());$('#stats').textContent=JSON.stringify(data.stats,null,2);$('#chat').innerHTML=data.entries.filter(e=>e.role||e.type).map(e=>\`<div class="msg"><div class="role">\${e.role||e.type}</div><pre>\${escapeHtml(textOf(e.content||e.message||e.text||e))}</pre></div>\`).join('');}function escapeHtml(s){return String(s).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))}loadSessions();setInterval(loadSessions,5000);`;

const MIME: Record<string, string> = {
	".html": "text/html; charset=utf-8",
	".js": "text/javascript; charset=utf-8",
	".css": "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
};

function readJsonl(file: string): any[] {
	return readFileSync(file, "utf-8")
		.split(/\r?\n/)
		.filter(Boolean)
		.map((line) => {
			try {
				return JSON.parse(line);
			} catch {
				return { type: "parse_error", raw: line };
			}
		});
}

function listSessionFiles(): string[] {
	const dir = getSessionsDir();
	if (!existsSync(dir)) return [];
	const files: string[] = [];
	for (const project of readdirSync(dir)) {
		const p = join(dir, project);
		if (!statSync(p).isDirectory()) continue;
		for (const f of readdirSync(p)) if (f.endsWith(".jsonl")) files.push(join(p, f));
	}
	return files.sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
}

function send(res: ServerResponse, status: number, body: string, contentType: string): void {
	res.writeHead(status, { "Content-Type": contentType, "Access-Control-Allow-Origin": "*" });
	res.end(body);
}

function json(res: ServerResponse, data: unknown): void {
	send(res, 200, JSON.stringify(data), MIME[".json"]);
}

function serveEmbedded(res: ServerResponse, pathname: string): boolean {
	if (pathname === "/" || pathname === "/index.html") {
		send(res, 200, INDEX_HTML, MIME[".html"]);
		return true;
	}
	if (pathname === "/style.css") {
		send(res, 200, STYLE_CSS, MIME[".css"]);
		return true;
	}
	if (pathname === "/app.js") {
		send(res, 200, APP_JS, MIME[".js"]);
		return true;
	}
	return false;
}

function serveStaticFile(res: ServerResponse, root: string, pathname: string): void {
	const file = pathname === "/" ? join(root, "index.html") : resolve(root, `.${pathname}`);
	if (!file.startsWith(root) || !existsSync(file) || statSync(file).isDirectory()) {
		res.writeHead(404);
		res.end("not found");
		return;
	}
	res.writeHead(200, { "Content-Type": MIME[extname(file)] || "application/octet-stream" });
	createReadStream(file).pipe(res);
}

export function startWebUiServer(options: { port?: number; staticRoot?: string } = {}) {
	const port = options.port || Number(process.env.HODEUS_WEB_PORT || 3131);
	const server = createServer((req, res) => {
		const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
		if (url.pathname === "/api/sessions") {
			const sessions = listSessionFiles().map((file) => {
				const entries = readJsonl(file);
				const header = entries.find((e) => e.type === "session") || {};
				const st = statSync(file);
				return {
					id:
						header.id ||
						file
							.split(/[\\/]/)
							.pop()
							?.replace(/\.jsonl$/, ""),
					cwd: header.cwd,
					path: file,
					modified: st.mtimeMs,
					messages: entries.length - 1,
				};
			});
			return json(res, sessions);
		}
		if (url.pathname.startsWith("/api/session/")) {
			const id = decodeURIComponent(url.pathname.replace("/api/session/", ""));
			const file = listSessionFiles().find((f) => f.includes(id));
			if (!file) {
				res.writeHead(404);
				res.end("not found");
				return;
			}
			const entries = readJsonl(file);
			return json(res, { file, entries, stats: { entries: entries.length } });
		}
		if (url.pathname.startsWith("/api/stream/")) {
			res.writeHead(200, {
				"Content-Type": "text/event-stream",
				"Cache-Control": "no-cache",
				Connection: "keep-alive",
			});
			const timer = setInterval(() => res.write(`event: ping\ndata: ${Date.now()}\n\n`), 2000);
			req.on("close", () => clearInterval(timer));
			return;
		}
		if (options.staticRoot) return serveStaticFile(res, options.staticRoot, url.pathname);
		if (!serveEmbedded(res, url.pathname)) {
			res.writeHead(404);
			res.end("not found");
		}
	});
	server.listen(port, "127.0.0.1");
	return { server, url: `http://127.0.0.1:${port}` };
}
