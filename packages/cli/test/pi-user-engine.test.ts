import { describe, expect, it } from "vitest";
import { getPiUserEngine } from "../src/utils/Mooncli-user-engine.js";

describe("getPiUserEngine", () => {
	it("formats the user engine expected by Mooncli.dev", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userEngine = getPiUserEngine("1.2.3");

		expect(userEngine).toBe(`Mooncli/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userEngine).toMatch(/^Mooncli\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
