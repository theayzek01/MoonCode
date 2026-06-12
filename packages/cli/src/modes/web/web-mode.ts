import { exec } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import fs from "fs";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { EngineSessionRuntime } from "../../core/engine-session-runtime.js";
import type { InteractiveModeOptions } from "../interactive/interactive-mode.js";
import { getEngineDir } from "../../config.js";
import { buildSessionInfo, SessionManager } from "../../core/session-manager.js";

export class WebMode {
	private runtime: EngineSessionRuntime;
	private options: InteractiveModeOptions;
	private clients: ServerResponse[] = [];
	private server: ReturnType<typeof createServer> | null = null;
	private port: number = 0;
	private pinnedMessageIds: Set<string> = new Set();
	private logBuffer: string[] = [];

	constructor(runtime: EngineSessionRuntime, options: InteractiveModeOptions) {
		this.runtime = runtime;
		this.options = options;
	}

	async init() {
		this.hookConsole();
		this.runtime.session.subscribe((event) => {
			this.broadcastEvent(event);
			this.broadcastEvent(this.getStateUpdateEvent());
		});
	}

	private hookConsole() {
		const originalWrite = process.stdout.write;
		process.stdout.write = (chunk: any, encoding?: any, callback?: any): boolean => {
			const str = chunk.toString();
			this.logBuffer.push(str);
			if (this.logBuffer.length > 200) this.logBuffer.shift();
			this.broadcastEvent({ type: "terminal_log", data: str });
			return originalWrite.call(process.stdout, chunk, encoding, callback);
		};
		const originalErrWrite = process.stderr.write;
		process.stderr.write = (chunk: any, encoding?: any, callback?: any): boolean => {
			const str = chunk.toString();
			this.logBuffer.push(str);
			if (this.logBuffer.length > 200) this.logBuffer.shift();
			this.broadcastEvent({ type: "terminal_log", data: str });
			return originalErrWrite.call(process.stderr, chunk, encoding, callback);
		};
	}

	private getStateUpdateEvent() {
		try {
			const stats = this.runtime.session.getSessionStats();
			return {
				type: "state_update",
				state: {
					model: this.runtime.session.model?.id || "Unknown Model",
					cwd: this.runtime.cwd,
					tokens: {
						in: stats.tokens.input,
						out: stats.tokens.output,
					},
				},
			};
		} catch (e) {
			return {
				type: "state_update",
				state: {
					model: this.runtime.session.model?.id || "Unknown Model",
					cwd: this.runtime.cwd,
					tokens: { in: 0, out: 0 },
				},
			};
		}
	}

	private broadcastEvent(event: any) {
		try {
			const removeCircular = (obj: any, seen = new WeakSet()): any => {
				if (typeof obj !== "object" || obj === null) return obj;
				if (seen.has(obj)) return "[Circular]";
				seen.add(obj);
				if (Array.isArray(obj)) {
					const newArr = obj.map((item) => removeCircular(item, seen));
					seen.delete(obj);
					return newArr;
				}
				const newObj: any = {};
				for (const [key, value] of Object.entries(obj)) {
					newObj[key] = removeCircular(value, seen);
				}
				seen.delete(obj);
				return newObj;
			};

			const safeEvent = removeCircular(event);
			const dataStr = JSON.stringify(safeEvent);
			const data = `data: ${dataStr}\n\n`;
			for (const client of this.clients) {
				try {
					client.write(data);
				} catch (e) {}
			}
		} catch (e) {
			console.error("Broadcast stringify error:", e);
		}
	}

	private webUiServerInstance: any = null;

	async run() {
		console.log("Starting Web Interface...");
		try {
			const serverModule = await import("../../core/web-ui-server.js");
			this.webUiServerInstance = serverModule.startWebUiServer({ port: 3131 });
			console.log(`Web UI Auth Server started at: ${this.webUiServerInstance.url}`);
		} catch (e) {
			console.error("Failed to start Web UI Auth Server:", e);
		}

		this.server = createServer((req, res) => this.handleRequest(req, res));

		return new Promise<void>((resolve, reject) => {
			this.server!.listen(0, "127.0.0.1", () => {
				const address = this.server!.address() as any;
				this.port = address.port;
				const url = `http://127.0.0.1:${this.port}`;
				console.log(`\nMoonCode Web UI running at: ${url}`);

				const startCmd =
					process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open";
				exec(`${startCmd} ${url}`);
			});
		});
	}

	private async handleRequest(req: IncomingMessage, res: ServerResponse) {
		const method = req.method;
		const url = new URL(req.url || "/", `http://127.0.0.1:${this.port}`);

		res.setHeader("Access-Control-Allow-Origin", "*");

		if (method === "GET" && url.pathname === "/") {
			res.setHeader("Content-Type", "text/html");
			res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
			res.setHeader("Pragma", "no-cache");
			res.setHeader("Expires", "0");
			res.end(this.getHtmlTemplate());
			return;
		}

		// Serve static assets from the project's assets/ directory
		if (method === "GET" && url.pathname.startsWith("/assets/")) {
			const fileName = url.pathname.slice("/assets/".length);
			// Prevent path traversal
			if (fileName.includes("..") || fileName.includes("/")) {
				res.statusCode = 400; res.end("Bad Request"); return;
			}
			const _filename2 = fileURLToPath(import.meta.url);
			const _dirname2 = dirname(_filename2);
			// Try the package assets dir, then walk up to project root assets/
			const candidates = [
				path.join(_dirname2, '../../../../assets', fileName),
				path.join(_dirname2, '../../../../../assets', fileName),
				path.join(process.cwd(), 'assets', fileName),
			];
			let served = false;
			for (const candidate of candidates) {
				if (fs.existsSync(candidate)) {
					const ext = path.extname(fileName).toLowerCase();
					const mime: Record<string,string> = { '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.svg':'image/svg+xml', '.gif':'image/gif', '.webp':'image/webp' };
					res.setHeader("Content-Type", mime[ext] || 'application/octet-stream');
					res.setHeader("Cache-Control", "public, max-age=3600");
					res.end(fs.readFileSync(candidate));
					served = true;
					break;
				}
			}
			if (!served) { res.statusCode = 404; res.end("Not Found"); }
			return;
		}

		if (method === "GET" && (url.pathname === "/api/stream" || url.pathname === "/events")) {
			res.setHeader("Content-Type", "text/event-stream");
			res.setHeader("Cache-Control", "no-cache");
			res.setHeader("Connection", "keep-alive");
			this.clients.push(res);
			try {
				const stats = this.runtime.session.getSessionStats();
				const initialState = {
					type: "state_update",
					state: {
						model: this.runtime.session.model?.id || "Unknown Model",
						cwd: this.runtime.cwd,
						tokens: {
							in: stats.tokens.input,
							out: stats.tokens.output,
						},
					},
				};
				res.write("data: " + JSON.stringify(initialState) + "\n\n");
				for (const log of this.logBuffer) {
					res.write("data: " + JSON.stringify({ type: "terminal_log", data: log }) + "\n\n");
				}
			} catch (e) {}

			req.on("close", () => {
				this.clients = this.clients.filter((client) => client !== res);
			});
			return;
		}

		if (method === "GET" && url.pathname === "/api/commands") {
			res.setHeader("Content-Type", "application/json");

			const templates = this.runtime.session.promptTemplates || [];
			const skills: any[] = [];
			const extensions = this.runtime.session.extensionRunner?.getRegisteredCommands() || [];

			const cmds = [
				{ cmd: "/help", desc: "Yardım menüsünü gösterir" },
				{ cmd: "/clear", desc: "Sohbet geçmişini temizler" },
				{ cmd: "/compact", desc: "Sohbet bağlamını sıkıştırır" },
				{ cmd: "/snapshot", desc: "Proje durumunu kaydeder" },
				{ cmd: "/model", desc: "Modeli değiştirir" },
				{ cmd: "/diff", desc: "Değişiklikleri gösterir" },
				{ cmd: "/ship", desc: "Değişiklikleri uzak sunucuya gönderir" },
				{ cmd: "/reset", desc: "Ajanı başlangıç durumuna sıfırlar" },
				{ cmd: "/review", desc: "Kodu gözden geçirir" },
				{ cmd: "/test", desc: "Testleri çalıştırır" },
				{ cmd: "/build", desc: "Projeyi derler" },
				{ cmd: "/lint", desc: "Lint taraması yapar" },
				{ cmd: "/exit", desc: "Çıkış yapar" },
				{ cmd: "/models", desc: "Mevcut modelleri listeler" },
				{ cmd: "/provider", desc: "Sağlayıcıyı değiştirir" },
			];

			templates.forEach((t) => cmds.push({ cmd: "/" + t.name, desc: t.description || "Şablon komutu" }));

			extensions.forEach((e) => cmds.push({ cmd: "/" + e.name, desc: e.description || "Eklenti komutu" }));

			// Deduplicate by cmd
			const uniqueCmds = Array.from(new Map(cmds.map((item) => [item.cmd, item])).values());

			res.end(JSON.stringify(uniqueCmds));
			return;
		}

		if (method === "GET" && url.pathname === "/api/status") {
			res.setHeader("Content-Type", "application/json");
			const stats = this.runtime.session.getSessionStats();
			res.end(
				JSON.stringify({
					cwd: this.runtime.cwd,
					model: this.runtime.session.model?.id || "Unknown Model",
					usage: stats.tokens,
					isGenerating: this.runtime.session.isStreaming,
					authUrl: this.webUiServerInstance ? this.webUiServerInstance.url : "http://127.0.0.1:3131",
				}),
			);
			return;
		}

		if (method === "GET" && url.pathname === "/api/history") {
			res.setHeader("Content-Type", "application/json");
			const messages = this.runtime.session.engine.state.messages || [];

			const mapped = messages.map((m: any, index: number) => {
				if (!m.id) {
					m.id = `msg-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`;
				}
				return {
					id: m.id,
					role: m.role,
					text:
						typeof m.content === "string"
							? m.content
							: m.content && m.content.map
								? m.content.map((c: any) => c.text).join("")
								: "",
					tools: (m.toolInvocations || []).map((t: any) => ({
						id: t.toolCallId,
						name: t.toolName,
						status: t.state === "result" ? "success" : t.state === "error" ? "error" : "running",
						input: typeof t.args === "string" ? t.args : JSON.stringify(t.args || {}),
						output: typeof t.result === "string" ? t.result : JSON.stringify(t.result || ""),
					})),
					status: "complete",
					pinned: this.pinnedMessageIds.has(m.id),
				};
			});
			res.end(JSON.stringify(mapped));
			return;
		}

		if (method === "POST" && url.pathname === "/api/prompt") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { prompt } = JSON.parse(body);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));

					// COMMAND INTERCEPTION FOR WEB MODE
					let handled = false;
					const cmd = prompt.trim().toLowerCase();
					if (cmd === "/clear") {
						this.runtime.session.engine.reset();
						this.broadcastEvent({ type: "clear_chat" });
						handled = true;
					} else if (cmd === "/compact") {
						this.runtime.session.compact();
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

		if (method === "POST" && url.pathname === "/api/history/delete") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { id } = JSON.parse(body);
					const messages = this.runtime.session.engine.state.messages || [];
					const index = messages.findIndex((m: any) => m.id === id);
					if (index !== -1) {
						const msg = messages[index];
						if (msg.role === "user" && index + 1 < messages.length && messages[index + 1].role === "assistant") {
							messages.splice(index, 2);
						} else {
							messages.splice(index, 1);
						}
						this.pinnedMessageIds.delete(id);
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ success: true }));
					} else {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: "Message not found" }));
					}
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/history/edit") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { id, text } = JSON.parse(body);
					const messages = this.runtime.session.engine.state.messages || [];
					const msg: any = messages.find((m: any) => m.id === id);
					if (msg) {
						if (typeof msg.content === "string") {
							msg.content = text;
						} else if (Array.isArray(msg.content)) {
							const textBlock = msg.content.find((c: any) => c.type === "text");
							if (textBlock) {
								textBlock.text = text;
							} else {
								msg.content = [{ type: "text", text }];
							}
						} else {
							msg.content = text;
						}
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ success: true }));
					} else {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: "Message not found" }));
					}
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/history/pin") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { id, pinned } = JSON.parse(body);
					if (pinned) {
						this.pinnedMessageIds.add(id);
					} else {
						this.pinnedMessageIds.delete(id);
					}
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "GET" && url.pathname === "/api/sessions") {
			res.setHeader("Content-Type", "application/json");
			try {
				const sessionsDir = join(getEngineDir(), "sessions");
				const projects: Record<string, any> = {};
				if (fs.existsSync(sessionsDir)) {
					const dirs = fs.readdirSync(sessionsDir);
					for (const dir of dirs) {
						const fullDir = join(sessionsDir, dir);
						if (fs.statSync(fullDir).isDirectory()) {
							const files = fs.readdirSync(fullDir).filter(f => f.endsWith(".jsonl"));
							const projectSessions = [];
							let projectCwd = "";
							for (const file of files) {
								const filePath = join(fullDir, file);
								const info = await buildSessionInfo(filePath);
								if (info) {
									projectSessions.push({
										id: info.id,
										path: info.path,
										name: info.name || info.firstMessage || "Başlıksız Sohbet",
										created: info.created,
										modified: info.modified,
										messageCount: info.messageCount,
									});
									if (!projectCwd) {
										projectCwd = info.cwd;
									}
								}
							}
							if (!projectCwd) {
								const decoded = dir.replace(/^--/, "").replace(/--$/, "").replace(/-/g, path.sep);
								if (process.platform === "win32" && decoded.match(/^[a-zA-Z]/)) {
									projectCwd = decoded.charAt(0) + ":" + decoded.slice(1);
								} else {
									projectCwd = decoded;
								}
							}
							const projectName = path.basename(projectCwd) || projectCwd;
							projects[projectCwd] = {
								cwd: projectCwd,
								name: projectName,
								sessions: projectSessions.sort((a: any, b: any) => new Date(b.modified).getTime() - new Date(a.modified).getTime()),
							};
						}
					}
				}
				res.end(JSON.stringify(Object.values(projects)));
			} catch (e: any) {
				res.statusCode = 500;
				res.end(JSON.stringify({ error: e.message }));
			}
			return;
		}

		if (method === "POST" && url.pathname === "/api/session/switch") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { path: filePath } = JSON.parse(body);
					if (fs.existsSync(filePath)) {
						await this.runtime.switchSession(filePath);
						res.setHeader("Content-Type", "application/json");
						res.end(JSON.stringify({ success: true }));
					} else {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: "Session file not found" }));
					}
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/session/create") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { cwd } = JSON.parse(body);
					const sessionDir = this.runtime.session.sessionManager.getSessionDir();
					const sm = SessionManager.create(cwd, sessionDir);
					sm.newSession();
					await this.runtime.switchSession(sm.getSessionFile()!);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true, path: sm.getSessionFile() }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/project/open-explorer") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { cwd } = JSON.parse(body);
					const startCmd = process.platform === "win32" ? "explorer" : process.platform === "darwin" ? "open" : "xdg-open";
					exec(`${startCmd} "${cwd}"`);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/project/delete") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { cwd } = JSON.parse(body);
					const safePath = `--${cwd.replace(/^[/\\]/, "").replace(/[/\\:]/g, "-")}--`;
					const projectDir = join(getEngineDir(), "sessions", safePath);
					if (fs.existsSync(projectDir)) {
						fs.rmSync(projectDir, { recursive: true, force: true });
					}
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/terminal/input") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { command } = JSON.parse(body);
					process.stdout.write(`\n$ ${command}\n`);
					exec(command, { cwd: this.runtime.cwd }, (error, stdout, stderr) => {
						if (stdout) process.stdout.write(stdout);
						if (stderr) process.stderr.write(stderr);
						if (error) process.stderr.write(`Error: ${error.message}\n`);
					});
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/reset") {
			this.runtime.session.engine.reset();
			this.broadcastEvent({ type: "clear_chat" });
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ success: true }));
			return;
		}

		if (method === "POST" && url.pathname === "/api/interrupt") {
			this.runtime.session.abort();
			res.setHeader("Content-Type", "application/json");
			res.end(JSON.stringify({ success: true }));
			return;
		}

		if (method === "GET" && url.pathname === "/api/models") {
			res.setHeader("Content-Type", "application/json");
			try {
				const models = await this.runtime.session.modelRegistry.getAvailable();
				res.end(JSON.stringify(models));
			} catch (e) {
				res.statusCode = 500;
				res.end(JSON.stringify({ error: "Failed" }));
			}

			return;
		}

		if (method === "POST" && url.pathname === "/api/set-model") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const { provider, model: modelId } = JSON.parse(body);
					const modelObj = this.runtime.session.modelRegistry.find(provider, modelId);
					if (!modelObj) {
						res.statusCode = 404;
						res.end(JSON.stringify({ error: "Model not found" }));
						return;
					}
					await this.runtime.session.setModel(modelObj);
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e: any) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: e.message }));
				}
			});
			return;
		}

		if (method === "POST" && url.pathname === "/api/set-thinking") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				const { level } = JSON.parse(body);
				this.runtime.session.settingsManager.setDefaultThinkingLevel(level as any);
				res.setHeader("Content-Type", "application/json");
				res.end(JSON.stringify({ success: true }));
			});
			return;
		}

		if (method === "GET" && url.pathname === "/api/auth/status") {
			res.setHeader("Content-Type", "application/json");
			const authStorage = this.runtime.session.modelRegistry.authStorage;
			const accounts = authStorage.listManagedAccounts();
			const activeAccount = accounts.find((a) => a.active);
			res.end(
				JSON.stringify({
					isLoggedIn: !!activeAccount,
					account: activeAccount
						? {
								name: activeAccount.label || activeAccount.provider,
								email: activeAccount.quotaLabel || `${activeAccount.provider} account`,
								initial: (activeAccount.label || activeAccount.provider).charAt(0).toUpperCase(),
							}
						: null,
				}),
			);
			return;
		}

		if (method === "GET" && url.pathname === "/api/settings") {
			res.setHeader("Content-Type", "application/json");

			const sm = this.runtime.session.settingsManager;
			res.end(
				JSON.stringify({
					theme: sm.getTheme(),
					compactionProfile: sm.getCompactionProfile(),
					enableToolBasedCompaction: sm.getCompactionEnabled(),
					thinkingLevel: sm.getDefaultThinkingLevel(),
					permissionLevel: sm.getPermissionLevel(),
				}),
			);

			return;
		}

		if (method === "POST" && url.pathname === "/api/settings") {
			let body = "";
			req.on("data", (chunk) => (body += chunk));
			req.on("end", async () => {
				try {
					const updates = JSON.parse(body);
					const sm = this.runtime.session.settingsManager;
					for (const [k, v] of Object.entries(updates)) {
						if (k === "theme") sm.setTheme(v as string);
						if (k === "enableToolBasedCompaction") sm.setCompactionEnabled(v as boolean);
						if (k === "permissionLevel") sm.setPermissionLevel(v as any);
					}
					res.setHeader("Content-Type", "application/json");
					res.end(JSON.stringify({ success: true }));
				} catch (e) {
					res.statusCode = 500;
					res.end(JSON.stringify({ error: "Invalid settings" }));
				}
			});
			return;
		}

		res.statusCode = 404;
		res.end("Not Found");
	}

	private getHtmlTemplate() {
		const _filename = fileURLToPath(import.meta.url);
		const _dirname = dirname(_filename);
		return fs.readFileSync(path.join(_dirname, "web-ui.html"), "utf8");
	}
}
