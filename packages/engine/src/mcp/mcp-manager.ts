// @ts-nocheck
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
// StdioClientTransport is imported dynamically to avoid browser crashes
import type { EngineTool } from "../types.js";

export interface McpServerConfig {
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
}

export class McpManager {
	private clients: Map<string, Client> = new Map();

	public getClients(): Map<string, Client> {
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

		const transportPath = "@modelcontextprotocol/sdk/client/stdio.js";
		const { StdioClientTransport } = await import(transportPath);

		for (const config of this.configs) {
			try {
				const transport = new StdioClientTransport({
					command: config.command,
					args: config.args || [],
					env: { ...process.env, ...(config.env || {}) } as any,
				});

				const client = new Client(
					{ name: "Mooncli-MCP-Manager", version: "1.0.0" },
					{ capabilities: { tools: {} } },
				);

				await client.connect(transport);
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
				const tools = response.tools.map((tool) => ({
					name: `${serverName}_${tool.name}`,
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

						const content = result.content.map((c: any) => {
							if (c.type === "text") {
								return {
									type: "text",
									text: this.compactMcpText(serverName, tool.name, c.text),
								};
							}
							if (c.type === "image") {
								const data = c.data ?? c.base64 ?? c.source;
								const mimeType = c.mimeType ?? c.mime_type ?? c.mediaType ?? "image/png";
								const safeMimeType = /^image\/(png|jpe?g|gif|webp)$/i.test(mimeType) ? mimeType : "image/png";
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
				}));
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
