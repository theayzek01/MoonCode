import { readFileSync, writeFileSync, readdirSync, statSync } from "fs";
import { join } from "path";

function walk(dir) {
    let results = [];
    const list = readdirSync(dir);
    for (const file of list) {
        const path = join(dir, file);
        const stat = statSync(path);
        if (stat && stat.isDirectory()) {
            if (file !== "node_modules" && file !== "dist" && file !== ".git") {
                results = results.concat(walk(path));
            }
        } else {
            if (path.endsWith(".ts") || path.endsWith(".js") || path.endsWith(".json") || path.endsWith(".md") || path.endsWith(".html")) {
                results.push(path);
            }
        }
    }
    return results;
}

const files = walk(process.cwd());

for (const file of files) {
    let content = readFileSync(file, "utf8");
    let newContent = content
        .replace(/MOON_/g, "MOON_")
        .replace(/Mooncli/g, "Mooncli")
        .replace(/mooncli/g, "mooncli")
        .replace(/mooncli-/g, "mooncli-");
    
    // Some specific fixups
    newContent = newContent.replace(/moon-core/g, "moon-core");
    newContent = newContent.replace(/moon-engine/g, "moon-engine");
    newContent = newContent.replace(/moon-tui/g, "moon-tui");

    if (content !== newContent) {
        writeFileSync(file, newContent, "utf8");
        console.log("Updated", file);
    }
}
