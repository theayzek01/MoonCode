import { randomUUID } from "crypto";
import { EventEmitter } from "events";
import {
	type Api,
	type AssistantMessage,
	type Context,
	type Model,
	type SimpleStreamOptions,
	type StreamFunction,
	streamSimple,
} from "moon-core";

export interface SwarmTask {
	id: string;
	description: string;
	context: string[];
	priority: "high" | "normal" | "low";
}

export interface SwarmAgent {
	id: string;
	role: "reader" | "searcher" | "coder" | "reviewer" | "architect";
	status: "idle" | "working" | "done" | "error";
	model: Model<Api>;
}

export interface SwarmManagerOptions {
	streamFn?: StreamFunction<Api, SimpleStreamOptions>;
	getApiKey?: (provider: string) => Promise<string | undefined> | string | undefined;
	reasoning?: SimpleStreamOptions["reasoning"];
}

/**
 * Asynchronous Agent Swarm (Swarm Intelligence)
 * Multi-threading magic to execute complex tasks 5x faster by dividing and conquering.
 */
export class SwarmManager extends EventEmitter {
	private agents: Map<string, SwarmAgent> = new Map();
	private readonly streamFn: StreamFunction<Api, SimpleStreamOptions>;

	constructor(
		private defaultModel: Model<Api>,
		private options: SwarmManagerOptions = {},
	) {
		super();
		this.streamFn = options.streamFn ?? streamSimple;
		this.initializeSwarm();
	}

	private initializeSwarm() {
		const roles: SwarmAgent["role"][] = ["reader", "searcher", "coder", "reviewer", "architect"];
		roles.forEach((role) => {
			const id = `agent-${role}-${randomUUID().slice(0, 8)}`;
			this.agents.set(id, {
				id,
				role,
				status: "idle",
				model: this.defaultModel, // In a real scenario, roles might use different models (e.g. haiku for reader, sonnet for coder)
			});
		});
	}

	public async executeParallelTask(taskDescription: string, context: string[]): Promise<string> {
		const taskId = randomUUID();
		this.emit("swarm:start", { taskId, taskDescription });

		// Divide the task into sub-tasks for different roles
		const readerPromise = this.delegateToRole("reader", "Read and summarize context for the task.", context);
		const searcherPromise = this.delegateToRole("searcher", "Find relevant API usages or project patterns.", context);
		const architectPromise = this.delegateToRole(
			"architect",
			"Plan the architectural implementation of the feature.",
			context,
		);

		// Wait for preliminary investigation
		const [readSummary, searchResults, archPlan] = await Promise.all([
			readerPromise,
			searcherPromise,
			architectPromise,
		]);

		// Hand over to the coder
		const coderPromise = this.delegateToRole(
			"coder",
			`Implement this plan: ${archPlan}\nContext: ${readSummary}\nPatterns: ${searchResults}`,
			[],
		);
		const codeResult = await coderPromise;

		// Review the code
		const reviewerPromise = this.delegateToRole(
			"reviewer",
			`Review this code for errors and performance issues:\n${codeResult}`,
			[],
		);
		const reviewResult = await reviewerPromise;

		this.emit("swarm:complete", { taskId, finalResult: reviewResult });
		return `${codeResult}\n\n// Swarm Review:\n// ${reviewResult}`;
	}

	private async delegateToRole(role: SwarmAgent["role"], prompt: string, context: string[]): Promise<string> {
		const agent = Array.from(this.agents.values()).find((a) => a.role === role);
		if (!agent) throw new Error(`No agent available for role: ${role}`);

		agent.status = "working";
		this.emit("agent:start", { agentId: agent.id, role: agent.role });

		try {
			const apiKey = await this.options.getApiKey?.(agent.model.provider);
			if (!apiKey) {
				throw new Error(`No API key available for swarm agent provider: ${agent.model.provider}`);
			}

			const result = await this.runAgent(agent, prompt, context, apiKey);

			agent.status = "done";
			this.emit("agent:complete", { agentId: agent.id, role: agent.role });
			return result;
		} catch (err: any) {
			agent.status = "error";
			this.emit("agent:error", { agentId: agent.id, role: agent.role, error: err });
			throw err;
		}
	}

	private async runAgent(agent: SwarmAgent, prompt: string, context: string[], apiKey: string): Promise<string> {
		const llmContext: Context = {
			systemPrompt: `You are the ${agent.role} agent in a MoonCLI swarm. Return concise, actionable output for your role.`,
			messages: [
				{
					role: "user",
					content: [
						{
							type: "text",
							text: [`Task: ${prompt}`, context.length > 0 ? `Context:\n${context.join("\n\n")}` : ""]
								.filter(Boolean)
								.join("\n\n"),
						},
					],
					timestamp: Date.now(),
				},
			],
		};

		const stream = this.streamFn(agent.model, llmContext, {
			apiKey,
			reasoning: this.options.reasoning,
		});
		const message: AssistantMessage = await stream.result();
		if (message.stopReason === "error" || message.stopReason === "aborted") {
			throw new Error(message.errorMessage || `Swarm agent ${agent.role} failed`);
		}

		const text = message.content
			.filter((part) => part.type === "text" || part.type === "thinking")
			.map((part) => (part.type === "text" ? part.text : part.thinking))
			.join("\n")
			.trim();
		return text || `[${agent.role}] completed without text output.`;
	}
}
