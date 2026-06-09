// @ts-nocheck
import { type ChildProcessWithoutNullStreams, spawn } from "node:child_process";
import type { EngineTool } from "../types.js";

export interface McpServerConfig {
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
	cwd?: string;
	autoStart?: boolean;
}

type PendingRequest = {
	resolve: (value: any) => void;
	reject: (error: Error) => void;
	timeout: NodeJS.Timeout;
};

class HeaderStdioMcpClient {
	private proc?: ChildProcessWithoutNullStreams;
	private buffer = Buffer.alloc(0);
	private nextId = 1;
	private pending = new Map<number, PendingRequest>();
	private initialized = false;

	constructor(private config: McpServerConfig) {}

	get name(): string {
		return this.config.name;
	}

	async connect(): Promise<void> {
		this.start();
		if (this.initialized) return;

		await this.request("initialize", {
			protocolVersion: "2024-11-05",
			capabilities: { tools: {} },
			clientInfo: { name: "MoonCode-MCP-Manager", version: "1.0.0" },
		});
		this.notify("notifications/initialized", {});
		this.initialized = true;
	}

	async listTools(): Promise<{ tools: any[] }> {
		await this.connect();
		return await this.request("tools/list", {});
	}

	async callTool(params: { name: string; arguments?: any }): Promise<any> {
		await this.connect();
		return await this.request("tools/call", params, 45_000);
	}

	async close(): Promise<void> {
		for (const pending of this.pending.values()) {
			clearTimeout(pending.timeout);
			pending.reject(new Error(`MCP server ${this.name} closed`));
		}
		this.pending.clear();
		if (this.proc && !this.proc.killed) {
			this.proc.kill();
		}
		this.proc = undefined;
		this.initialized = false;
	}

	private start(): void {
		if (this.proc && !this.proc.killed) return;

		this.proc = spawn(this.config.command, this.config.args ?? [], {
			cwd: this.config.cwd,
			env: { ...process.env, ...(this.config.env ?? {}) },
			stdio: ["pipe", "pipe", "pipe"],
			windowsHide: true,
		});

		this.proc.stdout.on("data", (chunk) => this.read(chunk));
		this.proc.stderr.on("data", (chunk) => {
			const text = chunk.toString().trim();
			if (text) console.error(`[MCP:${this.name}] ${text}`);
		});
		this.proc.on("exit", (code) => {
			const error = new Error(`MCP server ${this.name} exited with code ${code}`);
			for (const pending of this.pending.values()) {
				clearTimeout(pending.timeout);
				pending.reject(error);
			}
			this.pending.clear();
			this.proc = undefined;
			this.initialized = false;
		});
	}

	private request(method: string, params: any = {}, timeoutMs = 10_000): Promise<any> {
		this.start();
		const id = this.nextId++;
		this.write({ jsonrpc: "2.0", id, method, params });

		return new Promise((resolve, reject) => {
			const timeout = setTimeout(() => {
				this.pending.delete(id);
				reject(new Error(`Timed out waiting for ${this.name}:${method}`));
			}, timeoutMs);
			this.pending.set(id, { resolve, reject, timeout });
		});
	}

	private notify(method: string, params: any = {}): void {
		this.start();
		this.write({ jsonrpc: "2.0", method, params });
	}

	private write(message: any): void {
		const body = Buffer.from(JSON.stringify(message), "utf8");
		this.proc!.stdin.write(Buffer.from(`Content-Length: ${body.length}\r\n\r\n`, "ascii"));
		this.proc!.stdin.write(body);
	}

	private read(chunk: Buffer): void {
		this.buffer = Buffer.concat([this.buffer, chunk]);
		while (true) {
			const headerEnd = this.buffer.indexOf("\r\n\r\n");
			if (headerEnd === -1) return;

			const header = this.buffer.subarray(0, headerEnd).toString("ascii");
			const match = /content-length:\s*(\d+)/i.exec(header);
			if (!match) {
				this.buffer = this.buffer.subarray(headerEnd + 4);
				continue;
			}

			const length = Number(match[1]);
			const bodyStart = headerEnd + 4;
			const bodyEnd = bodyStart + length;
			if (this.buffer.length < bodyEnd) return;

			const body = this.buffer.subarray(bodyStart, bodyEnd).toString("utf8");
			this.buffer = this.buffer.subarray(bodyEnd);
			this.handleMessage(JSON.parse(body));
		}
	}

	private handleMessage(message: any): void {
		if (!message || !("id" in message)) return;
		const pending = this.pending.get(Number(message.id));
		if (!pending) return;

		this.pending.delete(Number(message.id));
		clearTimeout(pending.timeout);
		if (message.error) {
			pending.reject(new Error(message.error.message || "MCP request failed"));
		} else {
			pending.resolve(message.result);
		}
	}
}

export class McpManager {
	private clients: Map<string, HeaderStdioMcpClient> = new Map();

	public getClients(): Map<string, HeaderStdioMcpClient> {
		return this.clients;
	}

	constructor(private configs: McpServerConfig[]) {}

	private compactMcpText(serverName: string, toolName: string, text: string): string {
		const normalized = text.replace(/\r\n/g, "\n").trim();
		if (!normalized) {
			return text;
		}

		if (serverName !== "blender") {
			return normalized;
		}

		if (toolName === "execute_blender_code") {
			const lines = normalized
				.split("\n")
				.map((line) => line.trimEnd())
				.filter((line) => line.length > 0);

			const obviousNarration = lines.filter(
				(line) =>
					/^(Gece moduna|Gunduz moduna|Day mode|Night mode|Kamera|Işık|Isik|Lighting|Render ayarı|Render ayari|Sinematik)/i.test(
						line,
					) && !/[{[]/.test(line),
			);

			const resultStart = lines.findIndex(
				(line) =>
					line.startsWith("{") ||
					line.startsWith("[") ||
					line.includes('"materials_count"') ||
					line.includes('"objects"') ||
					line.includes('"scene"'),
			);

			const relevantLines =
				resultStart >= 0 ? [...obviousNarration.slice(0, 4), ...lines.slice(resultStart)] : lines.slice(-24);
			const compact = relevantLines.join("\n");
			if (compact.length <= 2200) {
				return compact;
			}
			return `${compact.slice(0, 700)}\n... [blender result compacted] ...\n${compact.slice(-1200)}`;
		}

		if (normalized.length > 2200) {
			return `${normalized.slice(0, 700)}\n... [mcp result compacted] ...\n${normalized.slice(-1200)}`;
		}

		return normalized;
	}

	async initialize(): Promise<void> {
		if (typeof window !== "undefined") {
			console.warn("[MCP] Stdio transport is not supported in the browser environment.");
			return;
		}

		for (const config of this.configs) {
			try {
				const client = new HeaderStdioMcpClient(config);
				await client.connect();
				this.clients.set(config.name, client);
				console.log(`[MCP] Connected to ${config.name}`);
			} catch (error) {
				console.error(`[MCP] Failed to connect to ${config.name}:`, error);
			}
		}
	}

	async getAllTools(): Promise<EngineTool<any>[]> {
		const allTools: EngineTool<any>[] = [];

		for (const [serverName, client] of this.clients) {
			try {
				const response = await client.listTools();
				const tools = response.tools.map((tool) => {
					const exposedName = tool.name.startsWith(`${serverName}_`) ? tool.name : `${serverName}_${tool.name}`;
					return {
						name: exposedName,
						label: `${serverName}: ${tool.name}`,
						description: tool.description || "",
						parameters: tool.inputSchema,
						execute: async (_toolCallId: string, args: any) => {
							let result: any;
							try {
								result = await client.callTool({
									name: tool.name,
									arguments: args,
								});
							} catch (error) {
								const message = error instanceof Error ? error.message : String(error);
								return {
									content: [
										{
											type: "text",
											text: `[MCP ${serverName}/${tool.name} failed] ${message}`,
										},
									],
									isError: true,
									details: { error: message, serverName, toolName: tool.name },
									terminate: false,
								};
							}

							const content = (result.content ?? []).map((c: any) => {
								if (c.type === "text") {
									return {
										type: "text",
										text: this.compactMcpText(serverName, tool.name, c.text),
									};
								}
								if (c.type === "image") {
									const data = c.data ?? c.base64 ?? c.source;
									const mimeType = c.mimeType ?? c.mime_type ?? c.mediaType ?? "image/png";
									const safeMimeType = /^image\/(png|jpe?g|gif|webp)$/i.test(mimeType)
										? mimeType
										: "image/png";
									if (data) {
										return { type: "image", data, mimeType: safeMimeType };
									}
									return { type: "text", text: "[MCP image omitted: missing image data]" };
								}
								return { type: "text", text: JSON.stringify(c) };
							});
							const textOutput = content
								.filter((c: any) => c.type === "text" && typeof c.text === "string")
								.map((c: any) => c.text)
								.join("\n");
							const isError =
								Boolean((result as any).isError) ||
								/Error executing code|Communication error with Blender|Traceback|Exception:/i.test(textOutput);

							return {
								content,
								isError,
								details: result,
								terminate: (result as any).terminate || false,
							};
						},
					};
				});
				allTools.push(...tools);
			} catch (error) {
				console.error(`[MCP] Failed to list tools for ${serverName}:`, error);
			}
		}

		return allTools;
	}

	async dispose(): Promise<void> {
		for (const client of this.clients.values()) {
			try {
				await client.close();
			} catch (_error) {
				// Ignore
			}
		}
		this.clients.clear();
	}

	async restart(): Promise<void> {
		await this.dispose();
		await this.initialize();
	}
}
