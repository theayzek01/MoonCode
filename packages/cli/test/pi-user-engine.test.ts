import { describe, expect, it } from "vitest";
import { getHodeusUserEngine } from "../src/utils/moon-user-engine.js";

describe("getPiUserEngine", () => {
	it("formats the user engine expected by Hodeus.dev", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userEngine = getHodeusUserEngine("1.2.3");

		expect(userEngine).toBe(`Hodeus/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userEngine).toMatch(/^Hodeus\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
