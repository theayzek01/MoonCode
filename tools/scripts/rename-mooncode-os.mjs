import { promises as fs } from "node:fs";
import { join, extname } from "node:path";

async function walk(dir) {
	let results = [];
	const list = await fs.readdir(dir, { withFileTypes: true });
	for (const file of list) {
		const res = join(dir, file.name);
		if (file.isDirectory()) {
			results = results.concat(await walk(res));
		} else {
			results.push(res);
		}
	}
	return results;
}

const IGNORE_EXTENSIONS = new Set([".png", ".jpg", ".gif", ".ico", ".woff2", ".zip"]);

async function main() {
	const targetDir = join(process.cwd(), "packages", "cli", "mooncode-os");
	console.log(`Renaming openclaw to mooncode in: ${targetDir}`);
	const files = await walk(targetDir);

	let count = 0;
	for (const file of files) {
		if (file.includes("node_modules") || file.includes(".git") || file.includes(".github")) {
			continue;
		}
		const ext = extname(file).toLowerCase();
		if (IGNORE_EXTENSIONS.has(ext) || file.endsWith("pnpm-lock.yaml")) {
			continue;
		}

		try {
			const content = await fs.readFile(file, "utf8");
			let newContent = content
				.replace(/OpenClaw OS/g, "MoonCode OS")
				.replace(/openclaw-os/g, "mooncode-os")
				.replace(/OpenClaw/g, "MoonCode")
				.replace(/openclaw/g, "mooncode")
				.replace(/claw-client/g, "mooncode-client")
				.replace(/claw-plugin/g, "mooncode-plugin");

			if (content !== newContent) {
				await fs.writeFile(file, newContent, "utf8");
				console.log(`Renamed: ${file}`);
				count++;
			}
		} catch (err) {
			// Skip binary or unreadable files
		}
	}
	console.log(`Done! Renamed occurrences in ${count} files.`);
}

main().catch(console.error);
