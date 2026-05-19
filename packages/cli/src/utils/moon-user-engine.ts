// @ts-nocheck
export function getMoonUserEngine(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `Moon/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}

/** @deprecated Use getMoonUserEngine */
export function getMoonCodeUserEngine(version: string): string {
	return getMoonUserEngine(version);
}
