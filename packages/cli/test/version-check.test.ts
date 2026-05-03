import { afterEach, describe, expect, it, vi } from "vitest";
import {
	checkForNewMooncliVersion,
	comparePackageVersions,
	getLatestMooncliVersion,
	isNewerPackageVersion,
} from "../src/utils/version-check.js";

const originalSkipVersionCheck = process.env.MoonCLI_SKIP_VERSION_CHECK;
const originalOffline = process.env.MoonCLI_OFFLINE;

afterEach(() => {
	vi.unstubAllGlobals();
	if (originalSkipVersionCheck === undefined) {
		delete process.env.MoonCLI_SKIP_VERSION_CHECK;
	} else {
		process.env.MoonCLI_SKIP_VERSION_CHECK = originalSkipVersionCheck;
	}
	if (originalOffline === undefined) {
		delete process.env.MoonCLI_OFFLINE;
	} else {
		process.env.MoonCLI_OFFLINE = originalOffline;
	}
});

describe("version checks", () => {
	it("compares package versions", () => {
		expect(comparePackageVersions("0.70.6", "0.70.5")).toBeGreaterThan(0);
		expect(comparePackageVersions("0.70.5", "0.70.5")).toBe(0);
		expect(comparePackageVersions("0.70.4", "0.70.5")).toBeLessThan(0);
		expect(isNewerPackageVersion("0.70.5", "0.70.5")).toBe(false);
		expect(isNewerPackageVersion("0.70.6", "0.70.5")).toBe(true);
	});

	it("returns only newer versions", async () => {
		const fetchMock = vi.fn(async () => Response.json({ version: "1.2.3" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(checkForNewMooncliVersion("1.2.3")).resolves.toBeUndefined();
		await expect(checkForNewMooncliVersion("1.2.2")).resolves.toBe("1.2.3");
	});

	it("uses the Mooncli.dev version check api with a Mooncli user engine", async () => {
		const fetchMock = vi.fn(async () => Response.json({ version: "1.2.4" }));
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestMooncliVersion("1.2.3")).resolves.toBe("1.2.4");
		expect(fetchMock).toHaveBeenCalledWith(
			"https://Mooncli.dev/api/latest-version",
			expect.objectContaining({
				headers: expect.objectContaining({
					"User-Engine": expect.stringMatching(/^Mooncli\/1\.2\.3 /),
					accept: "application/json",
				}),
			}),
		);
	});

	it("skips api calls when version checks are disabled", async () => {
		process.env.MoonCLI_SKIP_VERSION_CHECK = "1";
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);

		await expect(getLatestMooncliVersion("1.2.3")).resolves.toBeUndefined();
		expect(fetchMock).not.toHaveBeenCalled();
	});
});
