import { createHash, randomUUID } from "node:crypto";
import { createServer, type IncomingMessage, type Server } from "node:http";
import type { Duplex } from "node:stream";

export interface BrowserBridgeStatus {
	port: number;
	running: boolean;
	clients: number;
	lastClientSeen?: number;
	error?: string;
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
const MAX_FRAME_BYTES = 10 * 1024 * 1024;
// Maximum per-client buffer size before we disconnect (prevents memory exhaustion)
const MAX_BUFFER_BYTES = 20 * 1024 * 1024;

let server: Server | undefined;
let port = DEFAULT_PORT;
let startupError: string | undefined;
const clients = new Map<string, BrowserBridgeClient>();
const pendingCommands = new Map<string, PendingCommand>();

export function startBrowserBridgeServer(options: { port?: number; keepAlive?: boolean } = {}): BrowserBridgeStatus {
	port = options.port ?? Number(process.env.MOON_BROWSER_BRIDGE_PORT || DEFAULT_PORT);
	if (server) return getBrowserBridgeStatus();

	startupError = undefined;
	server = createServer((req, res) => {
		if (req.url === "/health") {
			const body = JSON.stringify(getBrowserBridgeStatus());
			res.writeHead(200, { "Content-Type": "application/json" });
			res.end(body);
			return;
		}
		res.writeHead(404);
		res.end("not found");
	});

	server.on("upgrade", (req, socket) => handleUpgrade(req, socket));
	server.on("error", (error: NodeJS.ErrnoException) => {
		startupError = error.code === "EADDRINUSE" ? `Port ${port} is already in use` : error.message;
		console.error(`[Moon Bridge Error] ${startupError}`);
	});

	server.listen(port, "127.0.0.1", () => {
		console.log(`\n\x1b[32m[Moon] Browser Bridge is active on ws://127.0.0.1:${port}\x1b[0m\n`);
	});

	if (!options.keepAlive) {
		server.unref();
	}
	return getBrowserBridgeStatus();
}

export function getBrowserBridgeStatus(): BrowserBridgeStatus {
	let lastClientSeen: number | undefined;
	for (const client of clients.values()) {
		if (lastClientSeen === undefined || client.lastSeen > lastClientSeen) {
			lastClientSeen = client.lastSeen;
		}
	}
	return {
		port,
		running: !!server && !startupError,
		clients: clients.size,
		lastClientSeen,
		error: startupError,
	};
}

export async function sendBrowserCommand(
	action: string,
	args: Record<string, unknown> = {},
	options: { timeoutMs?: number } = {},
): Promise<unknown> {
	// Only start server if not already running
	if (!server) {
		startBrowserBridgeServer();
	}

	const client = getLatestClient();
	if (!client) {
		throw new Error(
			`No Chrome extension connected. Load packages/cli/browser-extension/chrome in Chrome and keep Moon running. Bridge: ws://127.0.0.1:${port}/ws`,
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
		if (!latest || client.lastSeen > latest.lastSeen) {
			latest = client;
		}
	}
	return latest;
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
		client.extensionId = typeof message.extensionId === "string" ? message.extensionId : undefined;
		client.version = typeof message.version === "string" ? message.version : undefined;
		return;
	}

	// Extension heartbeat — already handled in data handler via lastSeen; nothing else to do
	if (message.type === "ping" || message.type === "pong") {
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

function isAllowedExtensionOrigin(origin: string | undefined): boolean {
	return (
		origin === undefined ||
		origin.startsWith("chrome-extension://") ||
		origin.startsWith("moz-extension://") ||
		origin.startsWith("ms-browser-extension://")
	);
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

	const payload = Buffer.allocUnsafe(payloadLen);
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
