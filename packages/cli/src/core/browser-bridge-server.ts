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

const DEFAULT_PORT = 3132;
const MAX_FRAME_BYTES = 10 * 1024 * 1024;

let server: Server | undefined;
let port = DEFAULT_PORT;
let startupError: string | undefined;
const clients = new Map<string, BrowserBridgeClient>();
const pendingCommands = new Map<string, PendingCommand>();

export function startBrowserBridgeServer(options: { port?: number; keepAlive?: boolean } = {}): BrowserBridgeStatus {
	port = options.port ?? Number(process.env.MOONCLI_BROWSER_BRIDGE_PORT || DEFAULT_PORT);
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
	});
	server.listen(port, "127.0.0.1");
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
	startBrowserBridgeServer();
	const client = getLatestClient();
	if (!client) {
		throw new Error(
			`No Chrome extension connected. Load packages/cli/browser-extension/chrome in Chrome and keep Hodeus running. Bridge: ws://127.0.0.1:${port}/ws`,
		);
	}

	const id = randomUUID();
	const timeoutMs = options.timeoutMs ?? 30_000;
	const message: BrowserCommandMessage = { type: "command", id, action, args };

	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			pendingCommands.delete(id);
			reject(new Error(`Browser command timed out: ${action}`));
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

function getLatestClient(): BrowserBridgeClient | undefined {
	return Array.from(clients.values()).sort((a, b) => b.lastSeen - a.lastSeen)[0];
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

	(socket as Duplex & { unref?: () => void }).unref?.();

	const id = randomUUID();
	const client: BrowserBridgeClient = {
		id,
		socket,
		lastSeen: Date.now(),
		send(message) {
			socket.write(encodeServerFrame(JSON.stringify(message)));
		},
	};
	clients.set(id, client);

	let buffer = Buffer.alloc(0);
	socket.on("data", (chunk) => {
		buffer = Buffer.concat([buffer, chunk]);
		while (true) {
			const parsed = decodeClientFrame(buffer);
			if (!parsed) return;
			buffer = buffer.subarray(parsed.bytes);
			if (parsed.opcode === 8) {
				socket.end();
				return;
			}
			if (parsed.opcode === 9) {
				socket.write(encodeServerFrame(parsed.payload, 10));
				continue;
			}
			if (parsed.opcode !== 1) continue;
			handleClientMessage(client, parsed.payload.toString("utf8"));
		}
	});
	socket.on("close", () => clients.delete(id));
	socket.on("error", () => clients.delete(id));
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

	if (message.type === "ping") {
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
	return origin === undefined || origin.startsWith("chrome-extension://") || origin.startsWith("moz-extension://");
}

function decodeClientFrame(buffer: Buffer): { opcode: number; payload: Buffer; bytes: number } | undefined {
	if (buffer.length < 2) return undefined;
	const first = buffer[0];
	const second = buffer[1];
	const opcode = first & 0x0f;
	const masked = (second & 0x80) !== 0;
	let length = second & 0x7f;
	let offset = 2;

	if (length === 126) {
		if (buffer.length < offset + 2) return undefined;
		length = buffer.readUInt16BE(offset);
		offset += 2;
	} else if (length === 127) {
		if (buffer.length < offset + 8) return undefined;
		const longLength = buffer.readBigUInt64BE(offset);
		if (longLength > BigInt(MAX_FRAME_BYTES)) throw new Error("WebSocket frame too large");
		length = Number(longLength);
		offset += 8;
	}
	if (length > MAX_FRAME_BYTES) throw new Error("WebSocket frame too large");
	if (!masked) throw new Error("Client WebSocket frame is not masked");
	if (buffer.length < offset + 4 + length) return undefined;

	const mask = buffer.subarray(offset, offset + 4);
	offset += 4;
	const payload = Buffer.from(buffer.subarray(offset, offset + length));
	for (let i = 0; i < payload.length; i++) {
		payload[i] ^= mask[i % 4];
	}
	return { opcode, payload, bytes: offset + length };
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
