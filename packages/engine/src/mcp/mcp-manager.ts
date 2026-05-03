// @ts-nocheck
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
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

	async initialize(): Promise<void> {
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
						const result = await client.callTool({
							name: tool.name,
							arguments: args,
						});

						return {
							content: result.content.map((c: any) => {
								if (c.type === "text") {
									return { type: "text", text: c.text };
								}
								if (c.type === "image") {
									return { type: "image", source: c.data, mediaType: c.mimeType };
								}
								return { type: "text", text: JSON.stringify(c) };
							}),
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
