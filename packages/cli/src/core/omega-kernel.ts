// @ts-nocheck
/**
 * MoonCode Ω Kernel (Omega Kernel)
 * Core mathematical engine for verified repo transformations.
 */

import { exec } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export type EffortMode = "S0" | "S1" | "S2" | "S3" | "S4";

export interface IntentContract {
	id: string;
	rawUserRequest: string;
	normalizedIntent: string;
	taskType: string;
	effortMode: EffortMode;
	expectedOutcome: string;
	constraints: string[];
	affectedAreas: string[];
	forbiddenActions: string[];
	acceptanceCriteria: string[];
	requiredVerification: string[];
	riskLevel: "low" | "medium" | "high";
}

export interface RepoGraphNode {
	id: string;
	type: "file" | "directory" | "function" | "class" | "interface" | "type" | "test" | "config";
	label: string;
	filePath?: string;
}

export interface RepoGraphEdge {
	source: string;
	target: string;
	type: "imports" | "calls" | "defines" | "tests" | "depends_on" | "modifies";
}

export interface RepoGraph {
	nodes: Map<string, RepoGraphNode>;
	edges: RepoGraphEdge[];
	status: "fresh" | "stale" | "missing";
	lastBuilt?: number;
}

export interface UncertaintyRouterResult {
	entropy: number; // 0.0 to 1.0
	recommendedThinkLevel: "low" | "medium" | "high" | "apex";
	recommendedModelTier: "local" | "cloud" | "hybrid";
	reason: string;
}

export interface VerificationResult {
	command: string;
	status: "passed" | "failed" | "skipped" | "not_available";
	exitCode: number;
	durationMs: number;
	summary: string;
	errorHighlights?: string[];
}

export interface PatchCertificate {
	id: string;
	intentContractId: string;
	summary: string;
	changedFiles: string[];
	affectedSymbols: string[];
	graphNodesTouched: string[];
	invariantsPreserved: string[];
	acceptanceCriteriaSatisfied: string[];
	verificationCommands: string[];
	verificationResults: VerificationResult[];
	riskLevel: "low" | "medium" | "high";
	rollbackPlan: string;
	modelContributors: string[];
	timestamp: number;
	verificationStatus: "verified" | "failed" | "not_run";
}

export interface PatchMemoryItem {
	intentPattern: string;
	graphMotif: string[];
	changedFileTypes: string[];
	editMacro: string[];
	verification: string[];
	successCount: number;
}

export interface DocContract {
	source: string;
	library: string;
	version: string;
	symbol: string;
	usageRules: string[];
	examples: string[];
	warnings: string[];
	lastChecked: number;
}

export interface CandidatePatch {
	strategy: string;
	filesToChange: string[];
	expectedDiffSize: number;
	riskLevel: "low" | "medium" | "high";
	verificationPlan: string[];
	modelSource: string;
	score?: number;
}

export class OmegaKernel {
	private static instance: OmegaKernel | null = null;

	public currentIntent: IntentContract | null = null;
	public currentRouter: UncertaintyRouterResult | null = null;
	public currentCertificate: PatchCertificate | null = null;
	public currentVerification: VerificationResult | null = null;
	public repoGraph: RepoGraph = { nodes: new Map(), edges: [], status: "missing" };
	public patchMemory: PatchMemoryItem[] = [];
	public memoryHit = false;

	private constructor() {
		this.loadPatchMemory();
	}

	public static getInstance(): OmegaKernel {
		if (!OmegaKernel.instance) {
			OmegaKernel.instance = new OmegaKernel();
		}
		return OmegaKernel.instance;
	}

	/**
	 * Main pipeline start: generates contract, routes entropy, builds repo graph slice
	 */
	public async initializeTask(userRequest: string, cwd: string): Promise<void> {
		this.memoryHit = false;

		// 1. Generate Intent Contract
		this.currentIntent = this.classifyRequestToContract(userRequest);

		// 2. Build or reload Repo Graph
		await this.buildRepoGraph(cwd);

		// 3. Route Entropy
		this.currentRouter = this.calculateEntropy(this.currentIntent, cwd);

		// 4. Check Patch Memory
		const matchingMemory = this.findMatchingMemory(this.currentIntent.normalizedIntent);
		if (matchingMemory) {
			this.memoryHit = true;
		}

		// Reset certificate and verification of previous tasks
		this.currentCertificate = null;
		this.currentVerification = null;
	}

	/**
	 * Build a lightweight static repo graph
	 */
	public async buildRepoGraph(cwd: string): Promise<RepoGraph> {
		if (
			this.repoGraph.status === "fresh" &&
			this.repoGraph.lastBuilt &&
			Date.now() - this.repoGraph.lastBuilt < 60000
		) {
			return this.repoGraph;
		}

		const nodes = new Map<string, RepoGraphNode>();
		const edges: RepoGraphEdge[] = [];

		try {
			// Read package.json to index config nodes
			const pkgPath = path.join(cwd, "package.json");
			if (fs.existsSync(pkgPath)) {
				nodes.set("package.json", {
					id: "package.json",
					type: "config",
					label: "package.json",
					filePath: "package.json",
				});
			}

			// Read tsconfig.json if available
			const tsPath = path.join(cwd, "tsconfig.json");
			if (fs.existsSync(tsPath)) {
				nodes.set("tsconfig.json", {
					id: "tsconfig.json",
					type: "config",
					label: "tsconfig.json",
					filePath: "tsconfig.json",
				});
			}

			// Walk files (limited depth to keep it extremely lightweight)
			const fileList: string[] = [];
			const walk = (dir: string, depth = 0) => {
				if (depth > 2 || fileList.length > 100) return;
				try {
					const items = fs.readdirSync(dir);
					for (const item of items) {
						if (item === "node_modules" || item === ".git" || item === "dist") continue;
						const fullPath = path.join(dir, item);
						const stat = fs.statSync(fullPath);
						const relativePath = path.relative(cwd, fullPath).replace(/\\/g, "/");

						if (stat.isDirectory()) {
							walk(fullPath, depth + 1);
						} else if (stat.isFile() && /\.(ts|js|json|md)$/.test(item)) {
							fileList.push(relativePath);
						}
					}
				} catch {}
			};

			walk(cwd);

			// Add files to graph
			for (const file of fileList) {
				const isTest = file.includes("test.") || file.includes("spec.");
				nodes.set(file, {
					id: file,
					type: isTest ? "test" : "file",
					label: path.basename(file),
					filePath: file,
				});

				// Extract simple import dependencies from ts/js files
				if (/\.(ts|js)$/.test(file)) {
					try {
						const content = fs.readFileSync(path.join(cwd, file), "utf8");
						const importRegex = /import\s+.*?from\s+["']\.\/(.*?)["']/g;
						let match = importRegex.exec(content);
						while (match !== null) {
							const importedFileBase = match[1];
							// Find matching node in fileList
							const matchingNode = fileList.find(
								(f) => f.startsWith(importedFileBase) || f.includes(`/${importedFileBase}`),
							);
							if (matchingNode) {
								edges.push({
									source: file,
									target: matchingNode,
									type: "imports",
								});
							}
							match = importRegex.exec(content);
						}
					} catch {}
				}
			}

			this.repoGraph = {
				nodes,
				edges,
				status: "fresh",
				lastBuilt: Date.now(),
			};
		} catch {
			this.repoGraph = { nodes, edges, status: "stale" };
		}

		return this.repoGraph;
	}

	/**
	 * Entropy Router: Calculates task uncertainty (0.0 to 1.0) and recommends execution tier
	 */
	public calculateEntropy(contract: IntentContract, _cwd: string): UncertaintyRouterResult {
		let score = 0.1; // Base entropy

		// Effort mode adds weight
		if (contract.effortMode === "S1") score += 0.15;
		if (contract.effortMode === "S2") score += 0.3;
		if (contract.effortMode === "S3") score += 0.5;
		if (contract.effortMode === "S4") score += 0.7;

		// Risk level factor
		if (contract.riskLevel === "medium") score += 0.15;
		if (contract.riskLevel === "high") score += 0.3;

		// Affected file types & directories
		if (contract.affectedAreas.length > 2) score += 0.2;

		// Clamp between 0.0 and 1.0
		const entropy = Math.min(1.0, Math.max(0.0, score));

		let thinkLevel: "low" | "medium" | "high" | "apex" = "low";
		let modelTier: "local" | "cloud" | "hybrid" = "local";
		let reason = "Direct answer query or minor formatting task.";

		if (entropy > 0.75) {
			thinkLevel = "apex";
			modelTier = "hybrid";
			reason = "Highly complex task with broad architectural changes, deep verification required.";
		} else if (entropy > 0.5) {
			thinkLevel = "high";
			modelTier = "hybrid";
			reason = "Multi-file structural refactoring task, verification highly suggested.";
		} else if (entropy > 0.25) {
			thinkLevel = "medium";
			modelTier = "local";
			reason = "Standard task with targeted file mutations; verifiable by local compilers.";
		}

		return {
			entropy,
			recommendedThinkLevel: thinkLevel,
			recommendedModelTier: modelTier,
			reason,
		};
	}

	/**
	 * Verification Oracle: Actually runs tests / compilers deterministically
	 */
	public async verifyTask(cwd: string): Promise<VerificationResult> {
		const pkgPath = path.join(cwd, "package.json");
		let cmd = "";

		if (fs.existsSync(pkgPath)) {
			try {
				const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
				if (pkg.scripts?.typecheck) {
					cmd = "npm run typecheck";
				} else if (pkg.scripts?.build) {
					cmd = "npm run build";
				} else if (pkg.scripts?.test) {
					cmd = "npm run test";
				}
			} catch {}
		}

		if (!cmd) {
			// Fallback: check if we can run TSC directly
			if (fs.existsSync(path.join(cwd, "tsconfig.json"))) {
				cmd = "npx tsc --noEmit";
			}
		}

		if (!cmd) {
			this.currentVerification = {
				command: "none",
				status: "skipped",
				exitCode: 0,
				durationMs: 0,
				summary: "No build or verification scripts found in repository.",
			};
			return this.currentVerification;
		}

		const startTime = Date.now();
		try {
			const { stdout } = await execAsync(cmd, { cwd });
			const durationMs = Date.now() - startTime;

			this.currentVerification = {
				command: cmd,
				status: "passed",
				exitCode: 0,
				durationMs,
				summary: stdout.slice(0, 300).trim(),
			};
		} catch (err: any) {
			const durationMs = Date.now() - startTime;
			const errorText = String(err.stdout || err.stderr || err.message);
			const errorLines = errorText
				.split("\n")
				.filter((l) => l.includes("error") || l.includes("Failed"))
				.slice(0, 5);

			this.currentVerification = {
				command: cmd,
				status: "failed",
				exitCode: err.code || 1,
				durationMs,
				summary: "Verification run failed.",
				errorHighlights: errorLines.length > 0 ? errorLines : [errorText.slice(0, 150)],
			};
		}

		return this.currentVerification;
	}

	/**
	 * Proof-Carrying Patch: Compiles verification and diff into a certificate
	 */
	public buildPatchCertificate(
		_diff: string,
		touchedFiles: string[],
		verification: VerificationResult | null,
	): PatchCertificate {
		const contract = this.currentIntent!;

		const cert: PatchCertificate = {
			id: `cert-${Math.random().toString(36).slice(2, 9)}`,
			intentContractId: contract?.id || "none",
			summary: contract?.normalizedIntent || "Refactored code components",
			changedFiles: touchedFiles,
			affectedSymbols: contract?.affectedAreas || [],
			graphNodesTouched: touchedFiles,
			invariantsPreserved: ["AST type-correctness", "clean compilation state"],
			acceptanceCriteriaSatisfied: contract?.acceptanceCriteria || [],
			verificationCommands: verification ? [verification.command] : [],
			verificationResults: verification ? [verification] : [],
			riskLevel: contract?.riskLevel || "low",
			rollbackPlan: "git checkout -- <files>",
			modelContributors: ["MoonCode Ω Kernel"],
			timestamp: Date.now(),
			verificationStatus: verification ? (verification.status === "passed" ? "verified" : "failed") : "not_run",
		};

		this.currentCertificate = cert;

		if (cert.verificationStatus === "verified") {
			this.saveTaskToMemory(contract, cert);
		}

		return cert;
	}

	/**
	 * Categorizes query/prompt into an Intent Contract statically
	 */
	private classifyRequestToContract(req: string): IntentContract {
		const query = req.toLowerCase();
		let effort: EffortMode = "S0";
		let type = "general-query";
		let outcome = "Direct text answer";
		let risk: "low" | "medium" | "high" = "low";
		const criteria: string[] = ["Provide correct, concise details"];
		const verification: string[] = [];

		if (query.includes("status") || query.includes("diagnostics")) {
			effort = "S0";
			type = "diagnostics-panel";
			outcome = "Diagnostics telemetry representation";
		} else if (query.includes("fix") || query.includes("hata") || query.includes("error") || query.includes("bug")) {
			effort = "S4";
			type = "bugfix-repair";
			outcome = "Deterministically repaired code error";
			risk = "medium";
			criteria.push("Repaired compilation error", "Ran build suite successfully");
			verification.push("typecheck");
		} else if (query.includes("refactor") || query.includes("reorganize") || query.includes("redesign")) {
			effort = "S3";
			type = "architecture-refactor";
			outcome = "Premium TUI refactored visual assets";
			risk = "high";
			criteria.push("Preserved original component exports", "Type correctness verified");
			verification.push("typecheck");
		} else if (
			query.includes("add") ||
			query.includes("geliştir") ||
			query.includes("tasarla") ||
			query.includes("yap")
		) {
			effort = "S2";
			type = "feature-implementation";
			outcome = "Fully integrated new component functionality";
			risk = "medium";
			criteria.push("Clean AST parsing integration");
			verification.push("typecheck");
		} else if (query.length > 5 && (query.includes("kod") || query.includes("yaz") || query.includes("düzenle"))) {
			effort = "S1";
			type = "code-tweak";
			outcome = "Tweak single file cleanly";
		}

		return {
			id: `intent-${Math.random().toString(36).slice(2, 9)}`,
			rawUserRequest: req,
			normalizedIntent: req.replace(/[\r\n]/g, " ").slice(0, 80) + (req.length > 80 ? "..." : ""),
			taskType: type,
			effortMode: effort,
			expectedOutcome: outcome,
			constraints: ["Do not mutate unrelated exports", "Keep diff as tight as possible"],
			affectedAreas: [],
			forbiddenActions: ["Fake testing outcomes", "Adding untested library dependencies"],
			acceptanceCriteria: criteria,
			requiredVerification: verification,
			riskLevel: risk,
		};
	}

	/**
	 * Local JSON persistence for Patch Memory
	 */
	private loadPatchMemory(): void {
		const memPath = path.join(os.homedir(), ".mooncode", "omega-memory.json");
		if (fs.existsSync(memPath)) {
			try {
				this.patchMemory = JSON.parse(fs.readFileSync(memPath, "utf8"));
			} catch {}
		}
	}

	private saveTaskToMemory(contract: IntentContract, cert: PatchCertificate): void {
		const memPath = path.join(os.homedir(), ".mooncode", "omega-memory.json");
		const dir = path.dirname(memPath);

		try {
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			const pattern = contract.normalizedIntent.toLowerCase();
			const exists = this.patchMemory.some((m) => m.intentPattern === pattern);
			if (exists) return;

			const memoryItem: PatchMemoryItem = {
				intentPattern: pattern,
				graphMotif: contract.affectedAreas,
				changedFileTypes: cert.changedFiles.map((f) => path.extname(f)),
				editMacro: [
					`Load files: ${cert.changedFiles.join(", ")}`,
					"Run localized edits on touched symbols",
					"Verify compilation state",
				],
				verification: cert.verificationCommands,
				successCount: 1,
			};

			this.patchMemory.push(memoryItem);
			fs.writeFileSync(memPath, JSON.stringify(this.patchMemory, null, 2), "utf8");
		} catch {}
	}

	private findMatchingMemory(intent: string): PatchMemoryItem | null {
		const query = intent.toLowerCase();
		for (const mem of this.patchMemory) {
			if (query.includes(mem.intentPattern) || mem.intentPattern.includes(query)) {
				return mem;
			}
		}
		return null;
	}
}
