export function getMoodcliUserAgent(version: string): string {
	const runtime = process.versions.bun ? `bun/${process.versions.bun}` : `node/${process.version}`;
	return `moodcli/${version} (${process.platform}; ${runtime}; ${process.arch})`;
}
