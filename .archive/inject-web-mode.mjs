import fs from "node:fs";

const content = `import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createServer } from "node:http";
import { exec } from "node:child_process";
import type { EngineSessionRuntime } from "../../core/engine-session-runtime.js";
import { type InteractiveModeOptions } from "../interactive/interactive-mode.js";

export class WebMode {
	private runtime: EngineSessionRuntime;
	private options: InteractiveModeOptions;
	private clients: Set<any> = new Set();
	private unsubscribe?: () => void;

	constructor(runtime: EngineSessionRuntime, options: InteractiveModeOptions) {
		this.runtime = runtime;
		this.options = options;
	}

	async init() {}

	async run() {
		console.log("Starting MoonCode Web UI...");

		// Broadcast engine events to SSE clients
		this.unsubscribe = this.runtime.session.subscribe((event) => {
			const data = JSON.stringify(event);
			for (const client of this.clients) {
				client.write(\`data: \${data}\n\n\`);
			}
		});

		const server = createServer(async (req, res) => {
			res.setHeader("Access-Control-Allow-Origin", "*");
			if (req.method === "OPTIONS") {
				res.writeHead(200, {
					"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
					"Access-Control-Allow-Headers": "Content-Type",
				});
				return res.end();
			}

			if (req.url === "/") {
				res.writeHead(200, { "Content-Type": "text/html" });
				res.end(this.getHtmlTemplate());
			} else if (req.url === "/api/history") {
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(JSON.stringify({
					cwd: this.runtime.cwd,
					messages: this.runtime.session.engine.state.messages,
				}));
			} else if (req.url === "/api/stream") {
				res.writeHead(200, {
					"Content-Type": "text/event-stream",
					"Cache-Control": "no-cache",
					"Connection": "keep-alive",
				});
				this.clients.add(res);
				req.on("close", () => this.clients.delete(res));
			} else if (req.url === "/api/send" && req.method === "POST") {
				let body = "";
				req.on("data", chunk => body += chunk.toString());
				req.on("end", async () => {
					try {
						const { text } = JSON.parse(body);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ status: "ok" }));
						await this.runtime.session.prompt(text);
					} catch (err: any) {
						res.writeHead(500);
						res.end(JSON.stringify({ error: err.message }));
					}
				});
			} else {
				res.writeHead(404);
				res.end("Not Found");
			}
		});

		const PORT = 3000;
		server.listen(PORT, async () => {
			console.log(\`\nWeb UI is running at: http://localhost:\${PORT}\nPress Ctrl+C to stop.\`);
			exec(\`\${process.platform === "win32" ? "start" : process.platform === "darwin" ? "open" : "xdg-open"} http://localhost:\${PORT}\`);
		});

		return new Promise(() => {});
	}

	private getHtmlTemplate() {
		return \`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MoonCode</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" rel="stylesheet" />
    <style>
        body { font-family: 'Inter', sans-serif; background-color: #FAFAFA; color: #111111; }
        pre, code { font-family: 'JetBrains Mono', monospace; }
        .material-symbols-outlined { font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .prose pre { background-color: #F8F9FA; border: 1px solid #E5E7EB; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; }
        .prose p { margin-bottom: 0.75rem; }
        .prose code { background-color: #F3F4F6; padding: 0.125rem 0.25rem; border-radius: 0.25rem; font-size: 0.875em; }
        .prose pre code { background-color: transparent; padding: 0; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .message-bubble { animation: fadeIn 0.3s ease-out forwards; }
    </style>
</head>
<body class="h-screen w-full flex overflow-hidden antialiased">
    <div class="w-64 border-r border-gray-200 bg-[#F7F7F7] flex flex-col transition-all duration-300">
        <div class="h-14 flex items-center px-4 border-b border-gray-200/60 justify-between">
            <span class="font-medium tracking-tight text-gray-800">MoonCode</span>
        </div>
        <div class="flex-1 overflow-y-auto py-2 px-2 space-y-1 scrollbar-hide">
            <div class="text-xs font-medium text-gray-400 px-2 py-2 tracking-wider">SESSIONS</div>
            <button class="w-full text-left px-2 py-1.5 rounded-md bg-white border border-gray-200 shadow-sm text-sm text-gray-700 flex items-center gap-2">
                <span class="material-symbols-outlined text-gray-400 text-[18px]">chat_bubble</span>
                <span class="truncate">Current Workspace</span>
            </button>
        </div>
    </div>
    <div class="flex-1 flex flex-col bg-white">
        <div class="h-14 border-b border-gray-100 flex items-center justify-between px-6">
            <div class="flex items-center gap-2 text-sm text-gray-500">
                <span class="material-symbols-outlined text-gray-400">folder</span>
                <span id="cwd-display" class="truncate max-w-md">Loading...</span>
            </div>
            <div class="flex items-center gap-3">
                <div id="status-indicator" class="px-3 py-1 rounded-full bg-gray-100 text-xs font-medium text-gray-600 flex items-center gap-1">
                    <span class="material-symbols-outlined text-[16px]">bolt</span> Ready
                </div>
            </div>
        </div>
        <div id="chat-container" class="flex-1 overflow-y-auto p-6 scrollbar-hide flex flex-col gap-8 max-w-4xl mx-auto w-full pb-32"></div>
        <div class="absolute bottom-0 left-64 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent">
            <div class="max-w-4xl mx-auto w-full relative bg-white border border-gray-200 rounded-xl shadow-sm focus-within:ring-2 focus-within:ring-gray-100 focus-within:border-gray-300 transition-all">
                <textarea id="message-input" placeholder="Ask MoonCode..." class="w-full max-h-48 min-h-[56px] py-4 pl-4 pr-12 bg-transparent resize-none outline-none text-sm text-gray-800 placeholder-gray-400" rows="1"></textarea>
                <button id="send-btn" class="absolute bottom-3 right-3 p-1.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center justify-center">
                    <span class="material-symbols-outlined text-[18px]">arrow_upward</span>
                </button>
            </div>
        </div>
    </div>
    <script>
        marked.setOptions({
            highlight: function(code, lang) {
                const language = hljs.getLanguage(lang) ? lang : 'plaintext';
                return hljs.highlight(code, { language }).value;
            }
        });

        const chatContainer = document.getElementById('chat-container');
        const messageInput = document.getElementById('message-input');
        const cwdDisplay = document.getElementById('cwd-display');
        const statusIndicator = document.getElementById('status-indicator');

        let activeAssistantMsg = null;
        let activeText = "";

        function createBubble(role, content) {
            const div = document.createElement('div');
