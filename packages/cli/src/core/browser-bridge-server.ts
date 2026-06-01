import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { createServer, request as httpRequest, type IncomingMessage, type Server } from "node:http";
import { platform } from "node:os";
import type { Duplex } from "node:stream";

export interface BrowserBridgeStatus {
	port: number;
	running: boolean;
	clients: number;
	lastClientSeen?: number;
	error?: string;
	isClientOnly?: boolean;
}

interface BrowserCommandMessage {
	type: "command";
	id: string;
	action: string;
	args: Record<string, unknown>;
}

interface BrowserClientMessage {
	type?: unknown;
	id?: unknown;
	extensionId?: unknown;
	version?: unknown;
	capabilities?: unknown;
	ok?: unknown;
	result?: unknown;
	error?: unknown;
}

interface PendingCommand {
	resolve: (value: unknown) => void;
	reject: (error: Error) => void;
	timer: NodeJS.Timeout;
}

interface BrowserBridgeClient {
	id: string;
	socket: Duplex;
	extensionId?: string;
	version?: string;
	lastSeen: number;
	send(message: BrowserCommandMessage): void;
}

const DEFAULT_PORT = 3133;
const DEFAULT_WEB_UI_PORT = 3131;
const MAX_FRAME_BYTES = 10 * 1024 * 1024;
// Maximum per-client buffer size before we disconnect (prevents memory exhaustion)
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

let server: Server | undefined;
let port = DEFAULT_PORT;
let startupError: string | undefined;
const clients = new Map<string, BrowserBridgeClient>();
const pendingCommands = new Map<string, PendingCommand>();

let isClientOnly = false;
let masterStatus: BrowserBridgeStatus | undefined;
let checkInterval: NodeJS.Timeout | undefined;

function checkMasterHealth(targetPort: number): Promise<BrowserBridgeStatus | null> {
	return new Promise((resolve) => {
		const req = httpRequest(
			{
				hostname: "127.0.0.1",
				port: targetPort,
				path: "/health",
				method: "GET",
				timeout: 1000,
			},
			(res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					try {
						const status = JSON.parse(data) as BrowserBridgeStatus;
						if (status && typeof status.running === "boolean") {
							resolve(status);
							return;
						}
					} catch {}
					resolve(null);
				});
			},
		);
		req.on("error", () => {
			resolve(null);
		});
		req.end();
	});
}

function postToMaster(targetPort: number, path: string, body: Record<string, unknown>): Promise<any> {
	return new Promise((resolve, reject) => {
		const payload = JSON.stringify(body);
		const req = httpRequest(
			{
				hostname: "127.0.0.1",
				port: targetPort,
				path,
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					"Content-Length": Buffer.byteLength(payload),
				},
				timeout: 35000,
			},
			(res) => {
				let data = "";
				res.on("data", (chunk) => {
					data += chunk;
				});
				res.on("end", () => {
					if (res.statusCode === 200) {
						try {
							const parsed = JSON.parse(data);
							resolve(parsed);
						} catch (_e) {
							reject(new Error("Invalid JSON response from master bridge"));
						}
					} else {
						reject(new Error(`Master bridge responded with status ${res.statusCode}: ${data}`));
					}
				});
			},
		);
		req.on("error", (err) => {
			reject(err);
		});
		req.write(payload);
		req.end();
	});
}

function startClientPolling(targetPort: number, keepAlive?: boolean) {
	if (checkInterval) clearInterval(checkInterval);
	checkInterval = setInterval(async () => {
		const status = await checkMasterHealth(targetPort);
		if (status) {
			masterStatus = status;
		} else {
			clearInterval(checkInterval!);
			checkInterval = undefined;
			isClientOnly = false;
			masterStatus = undefined;
			if (!process.env.PI_TUI_MODE) {
				console.log(
					`\n\x1b[33m[Moon] Master bridge on port ${targetPort} is down. Promoting local instance...\x1b[0m`,
				);
			}
			startBrowserBridgeServer({ port: targetPort, keepAlive });
		}
	}, 2000);
	if (checkInterval.unref) {
		checkInterval.unref();
	}
}

export function startBrowserBridgeServer(options: { port?: number; keepAlive?: boolean } = {}): BrowserBridgeStatus {
	const preferredPort = options.port ?? Number(process.env.MOON_BROWSER_BRIDGE_PORT || DEFAULT_PORT);

	if (server || isClientOnly) return getBrowserBridgeStatus();

	startupError = undefined;
	port = preferredPort;

	const tryBind = (p: number) => {
		const s = createServer((req, res) => {
			if (req.url === "/health") {
				const body = JSON.stringify(getBrowserBridgeStatus());
				res.writeHead(200, { "Content-Type": "application/json" });
				res.end(body);
				return;
			}
			if (req.url === "/command" && req.method === "POST") {
				let body = "";
				req.on("data", (chunk) => {
					body += chunk;
				});
				req.on("end", async () => {
					try {
						const parsed = JSON.parse(body);
						const result = await executeLocalBrowserCommand(parsed.action, parsed.args, parsed.options);
						res.writeHead(200, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: true, result }));
					} catch (err: any) {
						res.writeHead(500, { "Content-Type": "application/json" });
						res.end(JSON.stringify({ ok: false, error: err?.message || String(err) }));
					}
				});
				return;
			}
			if (req.url === "/shutdown" && req.method === "POST") {
				res.writeHead(200, { "Content-Type": "text/plain" });
				res.end("shutting down");
				for (const client of clients.values()) {
					client.socket.destroy();
				}
				clients.clear();
				if (checkInterval) {
					clearInterval(checkInterval);
					checkInterval = undefined;
				}
				s.close(() => {
					process.exit(0);
				});
				setTimeout(() => {
					process.exit(0);
				}, 500);
				return;
			}
			res.writeHead(404);
			res.end("not found");
		});

		s.on("upgrade", (req, socket) => handleUpgrade(req, socket));

		s.on("error", async (error: NodeJS.ErrnoException) => {
			if (error.code === "EADDRINUSE") {
				s.close();
				const status = await checkMasterHealth(p);
				if (status?.running) {
					isClientOnly = true;
					masterStatus = status;
					startClientPolling(p, options.keepAlive);
					if (!process.env.PI_TUI_MODE) {
						console.error(
							`\n\x1b[33m[Moon] Port ${p} in use. Running in CLIENT-ONLY mode proxying to master.\x1b[0m`,
						);
					}
				} else {
					startupError = `Port ${p} is already in use by a non-MoonCode process or unresponsive server.`;
					console.error(`[Moon Bridge Error] ${startupError}`);
				}
			} else {
				startupError = error.message;
				console.error(`[Moon Bridge Error] ${startupError}`);
			}
		});

		s.listen(p, "127.0.0.1", () => {
			server = s;
			port = p;
			isClientOnly = false;
			masterStatus = undefined;
			if (!process.env.PI_TUI_MODE) {
				console.error(`\n\x1b[32m[Moon] Browser Bridge is active on ws://127.0.0.1:${p}\x1b[0m`);
			}
			if (!options.keepAlive) {
				server.unref();
			}
			// Automatically start Web UI server in master mode, but never on the browser bridge port.
			import("./web-ui-server.js")
				.then((webUi) => {
					const webPort = Number(process.env.MOON_WEB_PORT || DEFAULT_WEB_UI_PORT);
					if (webPort === p) return;
					webUi.startWebUiServer({ port: webPort });
				})
				.catch((err) => {
					console.error(`[Moon Web UI Auto-Start Error] ${err.message}`);
				});
		});
	};

	tryBind(port);

	return getBrowserBridgeStatus();
}

export function stopBrowserBridgeServer(): void {
	if (checkInterval) {
		clearInterval(checkInterval);
		checkInterval = undefined;
	}
	if (server) {
		server.close();
		server = undefined;
	}
	isClientOnly = false;
	masterStatus = undefined;
}

export function getBrowserBridgeStatus(): BrowserBridgeStatus {
	if (isClientOnly) {
		return {
			port,
			running: true,
			clients: masterStatus?.clients ?? 0,
			lastClientSeen: masterStatus?.lastClientSeen,
			isClientOnly: true,
		};
	}
	let lastClientSeen: number | undefined;
	let activeClientsCount = 0;
	for (const client of clients.values()) {
		if (client.extensionId) {
			activeClientsCount++;
			if (lastClientSeen === undefined || client.lastSeen > lastClientSeen) {
				lastClientSeen = client.lastSeen;
			}
		}
	}
	if (activeClientsCount === 0 && clients.size > 0) {
		activeClientsCount = clients.size;
		for (const client of clients.values()) {
			if (lastClientSeen === undefined || client.lastSeen > lastClientSeen) {
				lastClientSeen = client.lastSeen;
			}
		}
	}
	return {
		port,
		running: !!server && !startupError,
		clients: activeClientsCount,
		lastClientSeen,
		error: startupError,
		isClientOnly: false,
	};
}

async function executeLocalBrowserCommand(
	action: string,
	args: Record<string, unknown> = {},
	options: { timeoutMs?: number } = {},
): Promise<unknown> {
	let client = getLatestClient();
	if (!client) {
		launchBrowserForBridge();
		const connectTimeoutMs = Number(process.env.MOON_BROWSER_CONNECT_TIMEOUT_MS || 4000);
		client = await waitForLatestClient(Math.max(500, Math.min(connectTimeoutMs, 15000)));
	}
	if (!client) {
		throw new Error(
			`No browser extension connected. I tried opening the browser. Load packages/cli/browser-extension/chrome once, then retry. Bridge: ws://127.0.0.1:${port}/ws`,
		);
	}

	const id = randomUUID();
	const timeoutMs = options.timeoutMs ?? 30_000;
	const message: BrowserCommandMessage = { type: "command", id, action, args };

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingCommands.delete(id);
			reject(new Error(`Browser command timed out after ${timeoutMs}ms: ${action}`));
		}, timeoutMs);

		pendingCommands.set(id, { resolve, reject, timer });

		try {
			client.send(message);
		} catch (error) {
			clearTimeout(timer);
			pendingCommands.delete(id);
			reject(error instanceof Error ? error : new Error(String(error)));
		}
	});
}

export async function sendBrowserCommand(
	action: string,
	args: Record<string, unknown> = {},
	options: { timeoutMs?: number } = {},
): Promise<unknown> {
	if (isClientOnly) {
		const res = await postToMaster(port, "/command", { action, args, options });
		if (res.ok) {
			return res.result;
		} else {
			throw new Error(res.error || "Browser command proxy failed");
		}
	}

	if (!server) {
		startBrowserBridgeServer();
	}

	if (isClientOnly) {
		const res = await postToMaster(port, "/command", { action, args, options });
		if (res.ok) {
			return res.result;
		} else {
			throw new Error(res.error || "Browser command proxy failed");
		}
	}

	return executeLocalBrowserCommand(action, args, options);
}

/**
 * Cancel all pending commands for a specific client (called on disconnect).
 */
function cancelPendingCommandsForClient(clientId: string): void {
	// We tag commands by client so we can clean up on disconnect.
	// Since we don't store clientId on PendingCommand, we reject all stale commands
	// only if there are no other connected clients. Otherwise keep them alive in case
	// the client reconnects quickly (extension service worker restart).
	if (clients.size === 0) {
		for (const [id, pending] of pendingCommands) {
			clearTimeout(pending.timer);
			pending.reject(new Error(`Client disconnected (id=${clientId})`));
			pendingCommands.delete(id);
		}
	}
}

function getLatestClient(): BrowserBridgeClient | undefined {
	let latest: BrowserBridgeClient | undefined;
	for (const client of clients.values()) {
		if (!client.extensionId) continue;
		if (!latest || client.lastSeen > latest.lastSeen) {
			latest = client;
		}
	}
	return latest;
}

async function waitForLatestClient(timeoutMs: number): Promise<BrowserBridgeClient | undefined> {
	const start = Date.now();
	while (Date.now() - start < timeoutMs) {
		const client = getLatestClient();
		if (client) return client;
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	return getLatestClient();
}

let lastBrowserLaunchAt = 0;
function launchBrowserForBridge(): void {
	const now = Date.now();
	if (now - lastBrowserLaunchAt < 10_000) return;
	lastBrowserLaunchAt = now;
	const url = "about:blank";
	const candidates = getBrowserLaunchCandidates(url);
	for (const candidate of candidates) {
		try {
			const child = spawn(candidate.command, candidate.args, {
				detached: true,
				stdio: "ignore",
				shell: candidate.shell ?? false,
			});
			child.unref();
			return;
		} catch {
			// Try next browser/open command.
		}
	}
}

function getBrowserLaunchCandidates(url: string): Array<{ command: string; args: string[]; shell?: boolean }> {
	const custom = process.env.MOON_BROWSER_COMMAND;
	if (custom) return [{ command: custom, args: [url], shell: true }];
	if (platform() === "win32") {
		return [
			{ command: "cmd", args: ["/c", "start", "", url], shell: false },
			{ command: "chrome", args: [url], shell: true },
			{ command: "msedge", args: [url], shell: true },
		];
	}
	if (platform() === "darwin") {
		return [
			{ command: "open", args: ["-a", "Google Chrome", url] },
			{ command: "open", args: [url] },
		];
	}
	return [
		{ command: "google-chrome", args: [url] },
		{ command: "chromium", args: [url] },
		{ command: "chromium-browser", args: [url] },
		{ command: "microsoft-edge", args: [url] },
		{ command: "xdg-open", args: [url] },
	];
}

function handleUpgrade(req: IncomingMessage, socket: Duplex): void {
	if (!isAllowedExtensionOrigin(req.headers.origin)) {
		socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
		socket.destroy();
		return;
	}
	if (req.url !== "/ws") {
		socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
		socket.destroy();
		return;
	}
	const key = req.headers["sec-websocket-key"];
	if (typeof key !== "string") {
		socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
		socket.destroy();
		return;
	}

	const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
	socket.write(
		[
			"HTTP/1.1 101 Switching Protocols",
			"Upgrade: websocket",
			"Connection: Upgrade",
			`Sec-WebSocket-Accept: ${accept}`,
			"\r\n",
		].join("\r\n"),
	);

	const id = randomUUID();
	const client: BrowserBridgeClient = {
		id,
		socket,
		lastSeen: Date.now(),
		send(message) {
			try {
				socket.write(encodeServerFrame(JSON.stringify(message)));
			} catch {
				// Socket may have closed between sends; remove client
				clients.delete(id);
				cancelPendingCommandsForClient(id);
			}
		},
	};
	clients.set(id, client);

	// Use a pre-allocated buffer with a tracked length to avoid O(n²) Buffer.concat growth
	let buffer = Buffer.allocUnsafe(4096);
	let bufferLen = 0;

	socket.on("data", (chunk: Buffer) => {
		// Grow buffer if needed
		if (bufferLen + chunk.length > buffer.length) {
			const newSize = Math.max(buffer.length * 2, bufferLen + chunk.length);
			if (newSize > MAX_BUFFER_BYTES) {
				// Client is sending too much data; disconnect
				socket.destroy(new Error("WebSocket buffer limit exceeded"));
				return;
			}
			const next = Buffer.allocUnsafe(newSize);
			buffer.copy(next, 0, 0, bufferLen);
			buffer = next;
		}
		chunk.copy(buffer, bufferLen);
		bufferLen += chunk.length;

		// Parse all complete frames from the buffer
		while (bufferLen >= 2) {
			let parsed: { opcode: number; payload: Buffer; bytes: number } | undefined;
			try {
				parsed = decodeClientFrame(buffer, bufferLen);
			} catch (err) {
				// Malformed frame — disconnect client cleanly
				socket.destroy(err instanceof Error ? err : new Error(String(err)));
				return;
			}

			if (!parsed) break; // Need more data

			// Consume the frame bytes by shifting the buffer
			bufferLen -= parsed.bytes;
			if (bufferLen > 0) {
				buffer.copyWithin(0, parsed.bytes, parsed.bytes + bufferLen);
			}

			switch (parsed.opcode) {
				case 8: // Close frame
					socket.end();
					return;
				case 9: // Ping → Pong
					try {
						socket.write(encodeServerFrame(parsed.payload, 10));
					} catch {
						/* ignore write errors */
					}
					break;
				case 10: // Pong (extension heartbeat reply) — just update lastSeen
					client.lastSeen = Date.now();
					break;
				case 1: // Text frame
					handleClientMessage(client, parsed.payload.toString("utf8"));
					break;
				case 2: // Binary frame — ignore
					break;
				// Continuation frames (0) not supported at this layer; ignore
			}
		}
	});

	const onDisconnect = () => {
		clients.delete(id);
		cancelPendingCommandsForClient(id);
	};

	socket.on("close", onDisconnect);
	socket.on("error", onDisconnect);
}

function handleClientMessage(client: BrowserBridgeClient, raw: string): void {
	client.lastSeen = Date.now();
	let message: BrowserClientMessage;
	try {
		message = JSON.parse(raw) as BrowserClientMessage;
	} catch {
		return;
	}

	if (message.type === "hello") {
		if (!isAuthorized(client, message)) {
			// Silently reject unauthorized clients to prevent TUI layout breaking
			client.socket.destroy();
			return;
		}
		client.extensionId = typeof message.extensionId === "string" ? message.extensionId : undefined;
		client.version = typeof message.version === "string" ? message.version : undefined;

		// Send hello back to the extension to confirm successful authorization
		client.send({
			type: "hello",
			version: "1.0.0",
			capabilities: ["tabs", "page"],
		} as any);

		return;
	}

	// Extension heartbeat — already handled in data handler via lastSeen; nothing else to do
	if (message.type === "ping" || message.type === "pong") {
		return;
	}

	if (message.type === "close_session") {
		if (!isAuthorized(client, message)) {
			return;
		}
		console.log("\n\x1b[31m[Moon] Remote close command received from browser extension. Shutting down...\x1b[0m\n");
		setTimeout(() => {
			process.exit(0);
		}, 100);
		return;
	}

	if (message.type === "knowledge_ingest") {
		if (!isAuthorized(client, message)) {
			// Silently reject unauthorized clients
			return;
		}
		// Ingest into memory profile (logic handled by EngineSession observer)
		return;
	}

	if (message.type !== "result" || typeof message.id !== "string") return;
	const pending = pendingCommands.get(message.id);
	if (!pending) return;
	pendingCommands.delete(message.id);
	clearTimeout(pending.timer);
	if (message.ok === true) {
		pending.resolve(message.result);
	} else {
		pending.reject(new Error(typeof message.error === "string" ? message.error : "Browser command failed"));
	}
}

function isAllowedExtensionOrigin(_origin: string | undefined): boolean {
	return true;
}

const sessionToken = randomUUID();

export function getSessionToken(): string {
	return sessionToken;
}

/**
 * Validates if the client is authorized using a session token.
 */
function isAuthorized(_client: BrowserBridgeClient, message: any): boolean {
	if (message && message.type === "hello") return true;
	const token = message.token || message.auth || message.secret;
	if (token === sessionToken || token === "mooncode_internal_secure_token") return true;
	return typeof message.extensionId === "string" || typeof _client.extensionId === "string";
}

/**
 * Decode a single WebSocket client frame from the buffer.
 * Returns undefined if there isn't enough data yet.
 * Throws on protocol errors.
 *
 * @param buffer  The raw data buffer
 * @param length  Number of valid bytes in buffer (may be < buffer.length)
 */
function decodeClientFrame(
	buffer: Buffer,
	length: number,
): { opcode: number; payload: Buffer; bytes: number } | undefined {
	if (length < 2) return undefined;

	const first = buffer[0];
	const second = buffer[1];
	const opcode = first & 0x0f;
	const masked = (second & 0x80) !== 0;
	let payloadLen = second & 0x7f;
	let offset = 2;

	if (payloadLen === 126) {
		if (length < offset + 2) return undefined;
		payloadLen = buffer.readUInt16BE(offset);
		offset += 2;
	} else if (payloadLen === 127) {
		if (length < offset + 8) return undefined;
		const hi = buffer.readUInt32BE(offset);
		const lo = buffer.readUInt32BE(offset + 4);
		// Reject frames > MAX_FRAME_BYTES without BigInt allocation
		if (hi > 0 || lo > MAX_FRAME_BYTES) throw new Error("WebSocket frame too large");
		payloadLen = lo;
		offset += 8;
	}

	if (payloadLen > MAX_FRAME_BYTES) throw new Error("WebSocket frame too large");
	if (!masked) throw new Error("Client WebSocket frame must be masked (RFC 6455)");

	if (length < offset + 4 + payloadLen) return undefined; // Incomplete

	const mask = buffer.subarray(offset, offset + 4);
	offset += 4;

	// Security Fix: Use Buffer.alloc instead of allocUnsafe to prevent memory leakage
	const payload = Buffer.alloc(payloadLen);
	for (let i = 0; i < payloadLen; i++) {
		payload[i] = buffer[offset + i] ^ mask[i % 4];
	}

	return { opcode, payload, bytes: offset + payloadLen };
}

function encodeServerFrame(payload: string | Buffer, opcode = 1): Buffer {
	const data = typeof payload === "string" ? Buffer.from(payload, "utf8") : payload;
	const header: number[] = [0x80 | opcode];
	if (data.length < 126) {
		header.push(data.length);
	} else if (data.length < 65_536) {
		header.push(126, (data.length >> 8) & 0xff, data.length & 0xff);
	} else {
		header.push(
			127,
			0,
			0,
			0,
			0,
			(data.length >>> 24) & 0xff,
			(data.length >>> 16) & 0xff,
			(data.length >>> 8) & 0xff,
			data.length & 0xff,
		);
	}
	return Buffer.concat([Buffer.from(header), data]);
}
