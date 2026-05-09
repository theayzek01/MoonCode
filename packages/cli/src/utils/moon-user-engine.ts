// @ts-nocheck
export function getHodeusUserEngine(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `Hodeus/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
