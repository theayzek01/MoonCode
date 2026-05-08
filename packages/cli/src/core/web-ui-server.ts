// @ts-nocheck
import { createReadStream, existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { extname, join, resolve } from "node:path";
import { getSessionsDir } from "../config.js";

const INDEX_HTML = `<!doctype html>
<html lang="tr">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><title>Mooncli Dashboard</title><link rel="stylesheet" href="/style.css" /></head>
<body><div class="stars"></div><div id="app"><header class="topbar"><div class="brand"><span class="orb">◐</span><b>MOONCLI</b><small>company workspace</small></div><div class="pipeline"><span>BRIEF</span><i></i><span>PLAN</span><i></i><span>AGENTS</span><i></i><span>QUALITY</span><i></i><span>SHIP</span></div></header><aside><h1>Sessions</h1><div id="sessions"></div></aside><main><div id="chat" class="panel">Oturum seç</div></main><section><h2>Stats</h2><div class="cards"><div class="card">RAG<br><b>online</b></div><div class="card">DIFF<br><b>ready</b></div><div class="card">SHIP<br><b>armed</b></div></div><pre id="stats">-</pre></section></div><script src="/app.js"></script></body>
</html>`;

const STYLE_CSS = `:root{color-scheme:dark;--bg:#060912;--panel:#101827dd;--line:#2a3a54;--fg:#e9f2ff;--muted:#8fa3bf;--acc:#79f2c0;--pink:#ff77d9;--blue:#70b7ff;--warn:#ffd166}*{box-sizing:border-box}body{margin:0;min-height:100vh;background:radial-gradient(circle at 8% 0,#203150,#060912 42%),linear-gradient(135deg,#060912,#0a0f1d);color:var(--fg);font:14px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;overflow:hidden}.stars{position:fixed;inset:0;pointer-events:none;background-image:radial-gradient(#ffffff55 1px,transparent 1px);background-size:34px 34px;mask-image:linear-gradient(#000,transparent);animation:drift 18s linear infinite}@keyframes drift{to{transform:translateY(34px)}}#app{display:grid;grid-template-columns:300px 1fr 280px;grid-template-rows:auto 1fr;gap:12px;height:100vh;padding:12px}.topbar{grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;padding:12px 16px;border:1px solid var(--line);border-radius:16px;background:linear-gradient(90deg,#101827ee,#111b2fee);box-shadow:0 0 0 2px #0006,0 18px 60px #0009}.brand{display:flex;align-items:baseline;gap:10px}.brand b{font-size:20px;color:var(--acc);text-shadow:0 0 18px #79f2c066}.brand small{color:var(--muted)}.orb{color:var(--pink);animation:spin 2s steps(4) infinite}@keyframes spin{to{transform:rotate(360deg)}}.pipeline{display:flex;align-items:center;gap:8px;color:var(--muted)}.pipeline span{padding:4px 8px;border:1px solid #334862;border-radius:8px;background:#0b1220}.pipeline span:nth-child(5){color:var(--pink);box-shadow:0 0 22px #ff77d933}.pipeline i{width:30px;height:2px;background:linear-gradient(90deg,var(--acc),transparent);animation:pulse 1.2s infinite}@keyframes pulse{50%{opacity:.35}}aside,main,section{background:var(--panel);border:1px solid var(--line);box-shadow:0 0 0 2px #0006,0 18px 60px #0008;border-radius:16px;overflow:auto;backdrop-filter:blur(12px)}h1{margin:14px;color:var(--acc);text-shadow:2px 2px #000}h2{margin:14px;color:var(--pink)}.session{position:relative;padding:12px 14px;border-top:1px solid var(--line);cursor:pointer;transition:.16s ease}.session:before{content:'▓';color:var(--muted);margin-right:6px}.session:hover,.session.active{background:#1d2b42;transform:translateX(4px)}.session.active:before{color:var(--acc)}.muted{color:var(--muted)}.panel{padding:16px}.msg{margin:10px 0;padding:12px;border:1px solid var(--line);border-radius:12px;background:#0b1220;box-shadow:inset 3px 0 #263a57;animation:pop .18s ease-out}.msg:nth-child(odd){box-shadow:inset 3px 0 var(--pink)}@keyframes pop{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}.role{color:var(--acc);font-weight:700;text-transform:uppercase;letter-spacing:.08em}pre{white-space:pre-wrap;margin:12px}.cards{display:grid;grid-template-columns:1fr;gap:8px;margin:0 12px}.card{padding:12px;border:1px solid var(--line);border-radius:12px;background:linear-gradient(135deg,#0b1220,#14213a);color:var(--muted)}.card b{color:var(--acc)}.diff-add{color:#7ee787}.diff-del{color:#ff7b72}@media(max-width:1000px){body{overflow:auto}#app{grid-template-columns:1fr;height:auto}.topbar{display:block}.pipeline{margin-top:10px;flex-wrap:wrap}aside,main,section{min-height:220px}}`;

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
	const port = options.port || Number(process.env.MOONCLI_WEB_PORT || 3131);
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
