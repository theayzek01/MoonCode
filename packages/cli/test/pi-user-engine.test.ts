import { describe, expect, it } from "vitest";
import { getPiUserEngine } from "../src/utils/moodcli-user-engine.js";

describe("getPiUserEngine", () => {
	it("formats the user engine expected by moodcli.dev", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userEngine = getPiUserEngine("1.2.3");

		expect(userEngine).toBe(`moodcli/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userEngine).toMatch(/^moodcli\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
