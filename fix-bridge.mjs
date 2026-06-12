import { readFileSync, writeFileSync } from "fs";
const file = "packages/cli/src/core/browser-bridge-server.ts";
let content = readFileSync(file, "utf8");
content = content.replace(/\/\/ Automatically start Web UI[\s\S]*?\}\);/m, "// Web UI removed");
writeFileSync(file, content);
