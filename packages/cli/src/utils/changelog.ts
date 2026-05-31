// @ts-nocheck
import { existsSync, readFileSync } from "fs";

export interface ChangelogEntry {
	major: number;
	minor: number;
	patch: number;
	content: string;
}

export function parseVersion(version: string): { major: number; minor: number; patch: number } {
	// Match digits in the format like (\d+)[.-]v?(\d+)(?:[.-](\d+))? (e.g. 2026-v31, 2026.31.0, 0.72.2)
	const match = version.match(/(\d+)[.-]v?(\d+)(?:[.-](\d+))?/);
	if (match) {
		return {
			major: parseInt(match[1], 10),
			minor: parseInt(match[2], 10),
			patch: match[3] ? parseInt(match[3], 10) : 0,
		};
	}

	const parts = version
		.replace(/[^0-9.]/g, ".")
		.split(".")
		.map(Number)
		.filter((n) => !Number.isNaN(n));
	return {
		major: parts[0] || 0,
		minor: parts[1] || 0,
		patch: parts[2] || 0,
	};
}

/**
 * Parse changelog entries from CHANGELOG.md
 * Scans for ## lines and collects content until next ## or EOF
 */
export function parseChangelog(changelogPath: string): ChangelogEntry[] {
	if (!existsSync(changelogPath)) {
		return [];
	}

	try {
		const content = readFileSync(changelogPath, "utf-8");
		const lines = content.split("\n");
		const entries: ChangelogEntry[] = [];

		let currentLines: string[] = [];
		let currentVersion: { major: number; minor: number; patch: number } | null = null;

		for (const line of lines) {
			// Check if this is a version header (## [x.y.z] ...)
			if (line.startsWith("## ")) {
				// Save previous entry if exists
				if (currentVersion && currentLines.length > 0) {
					entries.push({
						...currentVersion,
						content: currentLines.join("\n").trim(),
					});
				}

				// Try to parse version from this line
				const versionMatch = line.match(/##\s+\[?([^\]\s]+)\]?/);
				if (versionMatch && /\d/.test(versionMatch[1])) {
					const parsed = parseVersion(versionMatch[1]);
					currentVersion = {
						major: parsed.major,
						minor: parsed.minor,
						patch: parsed.patch,
					};
					currentLines = [line];
				} else {
					// Reset if we can't parse version
					currentVersion = null;
					currentLines = [];
				}
			} else if (currentVersion) {
				// Collect lines for current version
				currentLines.push(line);
			}
		}

		// Save last entry
		if (currentVersion && currentLines.length > 0) {
			entries.push({
				...currentVersion,
				content: currentLines.join("\n").trim(),
			});
		}

		return entries;
	} catch (error) {
		console.error(`Warning: Could not parse changelog: ${error}`);
		return [];
	}
}

/**
 * Compare versions. Returns: -1 if v1 < v2, 0 if v1 === v2, 1 if v1 > v2
 */
export function compareVersions(
	v1: ChangelogEntry | { major: number; minor: number; patch: number },
	v2: ChangelogEntry | { major: number; minor: number; patch: number },
): number {
	if (v1.major !== v2.major) return v1.major - v2.major;
	if (v1.minor !== v2.minor) return v1.minor - v2.minor;
	return v1.patch - v2.patch;
}

/**
 * Get entries newer than lastVersion
 */
export function getNewEntries(entries: ChangelogEntry[], lastVersion: string): ChangelogEntry[] {
	const last = parseVersion(lastVersion);
	return entries.filter((entry) => compareVersions(entry, last) > 0);
}

// Re-export getChangelogPath from paths.ts for convenience
export { getChangelogPath } from "../config.js";
