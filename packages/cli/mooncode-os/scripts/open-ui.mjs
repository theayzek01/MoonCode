#!/usr/bin/env node
/**
 * Reads ~/.mooncode/mooncode.json, builds the MoonCode OS claw client URL with
 * gateway+token in the URL fragment (so they never hit server logs), copies
 * to clipboard, and opens in the default browser.
 *
 * Mirrors `mooncode dashboard` for our plugin route.
 */
import { execSync, spawn } from "child_process";
import { existsSync, readFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const PREFIX = "[mooncodeos]";
const log = (msg) => console.log(`${PREFIX} ${msg}`);
const fail = (msg) => {
  console.error(`${PREFIX} ERROR: ${msg}`);
  process.exit(1);
};

const configPath = join(homedir(), ".mooncode", "mooncode.json");
if (!existsSync(configPath)) {
  fail(`MoonCode config not found at ${configPath}. Run \`mooncode onboard\` first.`);
}

let cfg;
try {
  cfg = JSON.parse(readFileSync(configPath, "utf8"));
} catch (err) {
  fail(`Could not parse mooncode config: ${err.message}`);
}

const port = cfg.gateway?.bind?.port ?? 18789;
const host = cfg.gateway?.bind?.host ?? "127.0.0.1";
const token = cfg.gateway?.auth?.token;

if (!token) {
  fail(
    `Gateway auth token not set in ${configPath}.\n` +
      `       Set one via \`mooncode config set gateway.auth.token <value>\` or re-run \`mooncode onboard\`.`,
  );
}

const gatewayWs = `ws://${host}:${port}`;
const httpOrigin = `http://${host}:${port}`;
const setupUrl = `${httpOrigin}/plugins/mooncodeos/setup#gateway=${encodeURIComponent(gatewayWs)}&token=${encodeURIComponent(token)}`;

console.log();
log(`Dashboard URL: ${setupUrl}`);

// Best-effort clipboard copy. Soft-fail if no clipboard tool exists.
const clipCmd =
  process.platform === "darwin"
    ? "pbcopy"
    : process.platform === "win32"
      ? "clip"
      : "wl-copy";
try {
  const cp = spawn(clipCmd, [], { stdio: ["pipe", "ignore", "ignore"] });
  cp.stdin.end(setupUrl);
  cp.on("error", () => {});
  log("Copied to clipboard.");
} catch {
  // No clipboard tool — user can copy from terminal output.
}

// Best-effort browser open. Soft-fail if it doesn't work.
const opener =
  process.platform === "darwin"
    ? "open"
    : process.platform === "win32"
      ? "start"
      : "xdg-open";
try {
  execSync(`${opener} "${setupUrl}"`, { stdio: "ignore" });
  log("Opened in your browser. Keep that tab to use OpenUI claw.");
} catch {
  log("Could not auto-open browser. Paste the URL above into your browser.");
}
console.log();
