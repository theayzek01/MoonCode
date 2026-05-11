import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";

export interface DeveloperProfile {
	syntaxPreferences: string[];
	forbiddenPatterns: string[];
	architecturalStyle: string;
	customRules: string[];
}

/**
 * God-Mode Memory (Style Cloning)
 * Local vector-like persistent storage for the user's coding habits.
 * Remembers exact preferences across sessions so Mooncli perfectly mimics the user's style.
 */
export class MemoryProfile {
	private profilePath: string;
	private profile: DeveloperProfile;

	constructor(engineDir: string) {
		this.profilePath = join(engineDir, "developer-profile.json");
		this.profile = this.loadProfile();
	}

	private loadProfile(): DeveloperProfile {
		if (!existsSync(this.profilePath)) {
			return {
				syntaxPreferences: [],
				forbiddenPatterns: [],
				architecturalStyle: "Standard",
				customRules: [],
			};
		}
		try {
			return JSON.parse(readFileSync(this.profilePath, "utf-8"));
		} catch {
			return {
				syntaxPreferences: [],
				forbiddenPatterns: [],
				architecturalStyle: "Standard",
				customRules: [],
			};
		}
	}

	private saveProfile() {
		if (!existsSync(dirname(this.profilePath))) {
			mkdirSync(dirname(this.profilePath), { recursive: true });
		}
		writeFileSync(this.profilePath, JSON.stringify(this.profile, null, 2), "utf-8");
	}

	public addRule(category: keyof DeveloperProfile, rule: string) {
		if (Array.isArray(this.profile[category])) {
			if (!(this.profile[category] as string[]).includes(rule)) {
				(this.profile[category] as string[]).push(rule);
				this.saveProfile();
			}
		} else if (category === "architecturalStyle") {
			this.profile.architecturalStyle = rule;
			this.saveProfile();
		}
	}

	/**
	 * Injects the developer's exact coding style directly into the prompt context.
	 * This guarantees the LLM writes code the exact way the user wants it.
	 */
	public getPromptInjection(): string {
		let injection = `// Mooncli Developer Profile Injection\n`;
		injection += `// Follow these EXACT rules when generating code:\n\n`;

		if (this.profile.forbiddenPatterns.length > 0) {
			injection += `NEVER USE THESE PATTERNS:\n`;
			this.profile.forbiddenPatterns.forEach((p) => (injection += `- ${p}\n`));
			injection += `\n`;
		}

		if (this.profile.syntaxPreferences.length > 0) {
			injection += `SYNTAX PREFERENCES:\n`;
			this.profile.syntaxPreferences.forEach((p) => (injection += `- ${p}\n`));
			injection += `\n`;
		}

		if (this.profile.customRules.length > 0) {
			injection += `CUSTOM RULES:\n`;
			this.profile.customRules.forEach((p) => (injection += `- ${p}\n`));
			injection += `\n`;
		}

		injection += `Architectural Style: ${this.profile.architecturalStyle}\n`;
		return injection;
	}
}
