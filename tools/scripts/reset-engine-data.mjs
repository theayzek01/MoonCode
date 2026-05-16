import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const engineDir = path.join(os.homedir(), ".Mooncli", "engine");
const targets = ["sessions", "memory-signals.json", "codebase-index"];

if (!fs.existsSync(engineDir)) {
  console.log(`Engine dir not found: ${engineDir}`);
  process.exit(0);
}

for (const rel of targets) {
  const p = path.join(engineDir, rel);
  if (!fs.existsSync(p)) {
    console.log(`skip ${p}`);
    continue;
  }
  fs.rmSync(p, { recursive: true, force: true });
  console.log(`removed ${p}`);
}

fs.mkdirSync(path.join(engineDir, "sessions"), { recursive: true });
console.log("recreated sessions directory");
console.log("Engine data reset complete.");
