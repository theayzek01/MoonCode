import { describe, expect, it } from "vitest";
import { getMoonUserEngine } from "../src/utils/moon-user-engine.js";

describe("getMoonUserEngine", () => {
	it("formats the user engine expected by Mooncli.dev", () => {
		const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
		const userEngine = getMoonUserEngine("1.2.3");

		expect(userEngine).toBe(`Moon/1.2.3 (${process.platform}; ${runtime}; ${process.arch})`);
		expect(userEngine).toMatch(/^Moon\/[^\s()]+ \([^;()]+;\s*[^;()]+;\s*[^()]+\)$/);
	});
});
