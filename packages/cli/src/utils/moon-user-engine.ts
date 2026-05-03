// @ts-nocheck
export function getMooncliUserEngine(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `Mooncli/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
