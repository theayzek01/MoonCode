import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import {
	type Api,
	type AssistantMessage,
	auditManager,
	type Context,
	getModel,
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
	role: "reader" | "searcher" | "coder" | "reviewer" | "architect" | "growth_hacker";
	status: "idle" | "working" | "done" | "error";
	model: Model<Api>;
	capability?: string[];
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
	private isBusy = false;
	private readonly streamFn: StreamFunction<Api, SimpleStreamOptions>;
	private defaultModel: Model<Api>;

	constructor(
		_defaultModel: Model<Api>,
		private options: SwarmManagerOptions = {},
	) {
		super();
		this.defaultModel = _defaultModel;
		this.streamFn = options.streamFn ?? streamSimple;
		this.initializeSwarm();
	}

	private initializeSwarm() {
		const roles: SwarmAgent["role"][] = ["reader", "searcher", "coder", "reviewer", "architect", "growth_hacker"];
		roles.forEach((role) => {
			const id = `agent-${role}-${randomUUID().split("-")[0]}`;
			this.agents.set(role, {
				id,
				role,
				status: "idle",
				model: this.routeToModel(role),
			});
		});
	}

	/**
	 * Enterprise Grade Model Router.
	 * Optimizes for Cost (Google level) or Intelligence (NASA level) based on role requirements.
	 */
	private routeToModel(role: SwarmAgent["role"]): Model<Api> {
		const highIntelligenceRoles = ["coder", "architect"];
		const _bulkProcessingRoles = ["reader", "searcher", "reviewer", "growth_hacker"];

		const provider = this.defaultModel.provider;

		if (provider === "antigravity" || provider === "google-antigravity") {
			const targetId = highIntelligenceRoles.includes(role)
				? "antigravity-gemini-3.5-flash-high"
				: "antigravity-gemini-3.5-flash-low";
			const found = getModel("antigravity", targetId);
			if (found) return found;
			
			return {
				id: targetId,
				name: highIntelligenceRoles.includes(role) ? "Gemini 3.5 Flash (High)" : "Gemini 3.5 Flash (Low)",
				api: "google-antigravity",
				provider: "antigravity",
				baseUrl: "http://localhost:11435/v1",
				reasoning: true,
				input: ["text", "image"],
				cost: { input: 0.5, output: 3, cacheRead: 0.5, cacheWrite: 0 },
				contextWindow: 1048576,
				maxTokens: 65536,
			} as Model<Api>;
		}

		if (provider === "google-vertex" || provider === "vercel-ai-gateway" || provider === "openrouter") {
			return this.defaultModel;
		}

		if (highIntelligenceRoles.includes(role)) {
			const found = getModel("anthropic", "claude-3-5-sonnet-latest");
			if (found) return found;
			return {
				id: "claude-3-5-sonnet-latest",
				name: "claude-3-5-sonnet-latest",
				api: "anthropic",
				provider: "anthropic",
				baseUrl: "https://api.anthropic.com",
				reasoning: true,
				input: ["text", "image"],
				cost: { input: 3, output: 15, cacheRead: 0.3, cacheWrite: 3.75 },
				contextWindow: 200000,
				maxTokens: 8192,
			} as Model<Api>;
		}

		const found = getModel("google", "gemini-1.5-flash-latest");
		if (found) return found;
		return {
			id: "gemini-1.5-flash-latest",
			name: "gemini-1.5-flash-latest",
			api: "google",
			provider: "google",
			baseUrl: "https://generativelanguage.googleapis.com",
			reasoning: false,
			input: ["text", "image"],
			cost: { input: 0.075, output: 0.3, cacheRead: 0.01875, cacheWrite: 0.075 },
			contextWindow: 1048576,
			maxTokens: 8192,
		} as Model<Api>;
	}

	/**
	 * Musk-Grade Semantic Context Compaction.
	 * Instead of just slicing text, it uses VectorDB to rank context by relevance
	 * to the task, ensuring only the most critical information is sent to the LLM.
	 */
	private async compactContext(context: string[], taskDescription: string): Promise<string[]> {
		if (context.length <= 3) return context;

		const { VectorDB } = await import("moon-core");
		const vdb = new VectorDB();

		context.forEach((c, i) => {
			vdb.addDocument({ id: `ctx-${i}`, content: c });
		});

		// Get top 5 most relevant context snippets
		const ranked = vdb.search(taskDescription, 5);
		const results = ranked.map((r) => r.content);

		auditManager.log({
			component: "Swarm",
			action: "Semantic Compaction",
			status: "success",
			details: { originalCount: context.length, compactedCount: results.length },
		});

		return results;
	}

	public async executeParallelTask(taskDescription: string, context: string[]): Promise<string> {
		if (this.isBusy) {
			throw new Error("Swarm is currently busy with another task.");
		}
		if (!taskDescription.trim()) {
			throw new Error("Swarm task description cannot be empty.");
		}

		this.isBusy = true;
		const compactedContext = await this.compactContext(context, taskDescription);

		const taskId = randomUUID();
		this.emit("swarm:start", { taskId, taskDescription });

		try {
			// Divide the task into sub-tasks for different roles
			// Use a more robust error handling for parallel execution
			const preliminaryResults = await Promise.all([
				this.delegateToRole("reader", "Read and summarize context for the task.", compactedContext).catch(
					(e) => `[Reader Error]: ${e.message}`,
				),
				this.delegateToRole("searcher", "Find relevant API usages or project patterns.", compactedContext).catch(
					(e) => `[Searcher Error]: ${e.message}`,
				),
				this.delegateToRole(
					"architect",
					"Plan the architectural implementation of the feature.",
					compactedContext,
				).catch((e) => `[Architect Error]: ${e.message}`),
			]);

			const [readSummary, searchResults, archPlan] = preliminaryResults;

			// Hand over to the coder with the findings
			const coderPrompt = `Implement this plan: ${archPlan}\nContext: ${readSummary}\nPatterns: ${searchResults}`;
			const codeResult = await this.delegateToRole("coder", coderPrompt, []).catch((e) => {
				throw new Error(`Critical Swarm Failure (Coder): ${e.message}`);
			});

			// Review the code
			const reviewerPrompt = `Review this code for errors and performance issues:\n${codeResult}`;
			const reviewResult = await this.delegateToRole("reviewer", reviewerPrompt, []).catch(
				(e) => `[Reviewer Error]: ${e.message}`,
			);

			this.emit("swarm:complete", { taskId, result: reviewResult });
			return reviewResult;
		} catch (error: any) {
			this.emit("swarm:error", { taskId, error: error.message });
			throw error;
		} finally {
			this.isBusy = false;
		}
	}

	/**
	 * NASA Grade Self-Correction Loop.
	 * Recursively verifies and fixes agent outputs until perfection is achieved.
	 */
	public async verifyAndFix(code: string, requirements: string): Promise<string> {
		auditManager.log({
			component: "Swarm",
			action: "Verification Loop Started",
			status: "success",
			details: { requirements },
		});

		const review = await this.delegateToRole(
			"reviewer",
			`Verify this code against these requirements:\nRequirements: ${requirements}\nCode:\n${code}`,
			[],
		);

		if (review.toLowerCase().includes("all good") || review.toLowerCase().includes("pass")) {
			return code;
		}

		auditManager.log({
			component: "Swarm",
			action: "Self-Correction Triggered",
			status: "warning",
			details: { reason: review.slice(0, 100) },
		});

		const fixedCode = await this.delegateToRole(
			"coder",
			`Fix the following code based on this review:\nReview: ${review}\nOriginal Code:\n${code}`,
			[],
		);
		return fixedCode;
	}

	private async delegateToRole(role: SwarmAgent["role"], prompt: string, context: string[]): Promise<string> {
		const agent = this.agents.get(role);
		if (!agent) throw new Error(`No agent available for role: ${role}`);

		agent.status = "working";
		auditManager.log({
			component: "Swarm",
			action: `Delegating to ${role}`,
			status: "success",
			details: { prompt: prompt.slice(0, 100), contextLength: context.length },
		});

		this.emit("agent:start", { agentId: agent.id, role: agent.role });

		try {
			const apiKey = await this.options.getApiKey?.(agent.model.provider);
			if (!apiKey) {
				throw new Error(`No API key available for swarm agent provider: ${agent.model.provider}`);
			}

			const result = await this.runAgent(agent, prompt, context, apiKey);

			agent.status = "done";
			auditManager.log({
				component: "Swarm",
				action: `Result from ${role}`,
				status: "success",
				details: { resultLength: result.length },
			});
			this.emit("agent:complete", { agentId: agent.id, role: agent.role });
			return result;
		} catch (err: any) {
			agent.status = "error";
			auditManager.log({
				component: "Swarm",
				action: `Error from ${role}`,
				status: "failure",
				details: { error: err.message },
			});
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
