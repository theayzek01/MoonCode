// @ts-expect-error
import type { EngineTool } from "@mooncli/engine";
import { ChannelType, Client, GatewayIntentBits, type TextChannel } from "discord.js";
import type { ToolDefinition } from "../extensions/index.js";

let discordClient: Client | null = null;

async function getDiscordClient(token: string): Promise<Client> {
	if (discordClient) return discordClient;

	discordClient = new Client({
		intents: [
			GatewayIntentBits.Guilds,
			GatewayIntentBits.GuildMessages,
			GatewayIntentBits.MessageContent,
			GatewayIntentBits.GuildMembers,
		],
	});

	await discordClient.login(token);
	return discordClient;
}

export interface DiscordToolOptions {
	token?: string;
}

// List Guilds
export function createDiscordListGuildsTool(options?: DiscordToolOptions): EngineTool {
	return {
		name: "discord_list_guilds",
		description: "List all Discord servers (guilds) the bot is a member of.",
		parameters: {
			type: "object",
			properties: {},
		},
		execute: async () => {
			if (!options?.token)
				return {
					content: [{ type: "text", text: "Error: No Discord token provided. Use /discord command to set it." }],
				};
			const client = await getDiscordClient(options.token);
			const guilds = client.guilds.cache.map((g) => ({ id: g.id, name: g.name }));
			return {
				content: [{ type: "text", text: JSON.stringify(guilds, null, 2) }],
			};
		},
	};
}

// Get Channels
export function createDiscordGetChannelsTool(options?: DiscordToolOptions): EngineTool {
	return {
		name: "discord_get_channels",
		description: "Get all channels in a specific Discord server.",
		parameters: {
			type: "object",
			properties: {
				guildId: { type: "string", description: "The ID of the server." },
			},
			required: ["guildId"],
		},
		execute: async ({ guildId }: { guildId: string }) => {
			if (!options?.token) return { content: [{ type: "text", text: "Error: No Discord token provided." }] };
			const client = await getDiscordClient(options.token);
			const guild = client.guilds.cache.get(guildId);
			if (!guild) return { content: [{ type: "text", text: "Server not found." }] };
			const channels = guild.channels.cache.map((c) => ({ id: c.id, name: c.name, type: ChannelType[c.type] }));
			return {
				content: [{ type: "text", text: JSON.stringify(channels, null, 2) }],
			};
		},
	};
}

// Send Message
export function createDiscordSendMessageTool(options?: DiscordToolOptions): EngineTool {
	return {
		name: "discord_send_message",
		description: "Send a message to a Discord channel.",
		parameters: {
			type: "object",
			properties: {
				channelId: { type: "string", description: "The ID of the channel." },
				content: { type: "string", description: "The message content." },
			},
			required: ["channelId", "content"],
		},
		execute: async ({ channelId, content }: { channelId: string; content: string }) => {
			if (!options?.token) return { content: [{ type: "text", text: "Error: No Discord token provided." }] };
			const client = await getDiscordClient(options.token);
			const channel = client.channels.cache.get(channelId) as TextChannel;
			if (!channel) return { content: [{ type: "text", text: "Channel not found." }] };
			const message = await channel.send(content);
			return {
				content: [{ type: "text", text: `Message sent. ID: ${message.id}` }],
			};
		},
	};
}

// Manage Channel (Create/Delete)
export function createDiscordManageChannelTool(options?: DiscordToolOptions): EngineTool {
	return {
		name: "discord_manage_channel",
		description: "Create or delete a channel in a Discord server.",
		parameters: {
			type: "object",
			properties: {
				guildId: { type: "string", description: "The ID of the server." },
				action: { type: "string", enum: ["create", "delete"], description: "Action to perform." },
				name: { type: "string", description: "Name of the channel (required for create)." },
				type: {
					type: "string",
					enum: ["text", "voice", "category"],
					description: "Type of channel (default: text).",
				},
				channelId: { type: "string", description: "The ID of the channel to delete." },
			},
			required: ["guildId", "action"],
		},
		execute: async ({
			guildId,
			action,
			name,
			type,
			channelId,
		}: {
			guildId: string;
			action: "create" | "delete";
			name?: string;
			type?: "text" | "voice" | "category";
			channelId?: string;
		}) => {
			if (!options?.token) return { content: [{ type: "text", text: "Error: No Discord token provided." }] };
			const client = await getDiscordClient(options.token);
			const guild = client.guilds.cache.get(guildId);
			if (!guild) return { content: [{ type: "text", text: "Server not found." }] };

			if (action === "create") {
				if (!name) return { content: [{ type: "text", text: "Name is required for creation." }] };
				let discordType = ChannelType.GuildText;
				if (type === "voice") discordType = ChannelType.GuildVoice;
				if (type === "category") discordType = ChannelType.GuildCategory;

				const channel = await guild.channels.create({ name, type: discordType });
				return { content: [{ type: "text", text: `Channel created: ${channel.name} (${channel.id})` }] };
			} else if (action === "delete") {
				if (!channelId) return { content: [{ type: "text", text: "channelId is required for deletion." }] };
				const channel = guild.channels.cache.get(channelId);
				if (!channel) return { content: [{ type: "text", text: "Channel not found." }] };
				await channel.delete();
				return { content: [{ type: "text", text: `Channel deleted.` }] };
			}
			return { content: [{ type: "text", text: "Invalid action." }] };
		},
	};
}

export function createDiscordToolDefinitions(_options?: DiscordToolOptions): ToolDefinition[] {
	const dummyExecute = async () => ({ content: [] });
	return [
		{
			name: "discord_list_guilds",
			label: "Discord: List Servers",
			description: "List all Discord servers the bot is in.",
			parameters: { type: "object", properties: {}, required: [] },
			execute: dummyExecute,
		},
		{
			name: "discord_get_channels",
			label: "Discord: Get Channels",
			description: "Get all channels in a server.",
			parameters: {
				type: "object",
				properties: { guildId: { type: "string" } },
				required: ["guildId"],
			},
			execute: dummyExecute,
		},
		{
			name: "discord_send_message",
			label: "Discord: Send Message",
			description: "Send a message to a channel.",
			parameters: {
				type: "object",
				properties: { channelId: { type: "string" }, content: { type: "string" } },
				required: ["channelId", "content"],
			},
			execute: dummyExecute,
		},
		{
			name: "discord_manage_channel",
			label: "Discord: Manage Channels",
			description: "Manage channels (create/delete).",
			parameters: {
				type: "object",
				properties: {
					guildId: { type: "string" },
					action: { type: "string", enum: ["create", "delete"] },
					name: { type: "string" },
					type: { type: "string", enum: ["text", "voice", "category"] },
					channelId: { type: "string" },
				},
				required: ["guildId", "action"],
			},
			execute: dummyExecute,
		},
	];
}
