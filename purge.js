import { readFileSync, writeFileSync } from "fs";
import { join } from "path";

const files = [
    "tsconfig.release.json",
    "tsconfig.json",
    "packages/tui/README.md",
    "packages/cli/README.md",
    "packages/cli/src/utils/version-check.ts",
    "packages/cli/src/modes/interactive/interactive-mode.ts",
    "packages/cli/browser-extension/chrome/background.js"
];

for (const file of files) {
    const fullPath = join(process.cwd(), file);
    try {
        let content = readFileSync(fullPath, "utf-8");
        content = content.replace(/hodeus/g, "mooncli");
        content = content.replace(/Hodeus/g, "Mooncli");
        writeFileSync(fullPath, content, "utf-8");
        console.log(`Purged hodeus from ${file}`);
    } catch (e) {
        console.log(`Skipped ${file}`);
    }
}
