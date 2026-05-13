#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
loadDotEnv(path.join(root, ".env"));
const dataDir = path.join(root, ".moon-remote");
const statePath = path.join(dataDir, "state.json");
const logPath = path.join(dataDir, "remote.log");
const taskPath = path.join(dataDir, "tasks.jsonl");

const token = process.env.TELEGRAM_BOT_TOKEN;
const allowedChatIds = new Set(
  (process.env.TELEGRAM_ALLOWED_CHAT_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean),
);
const projectRoot = path.resolve(process.env.MOON_REMOTE_ROOT ?? root);
const commandTimeoutMs = Number(process.env.MOON_REMOTE_TIMEOUT_MS ?? 120_000);
const maxOutput = Number(process.env.MOON_REMOTE_MAX_OUTPUT ?? 3500);

const safeCommandPrefixes = [
  "npm test",
  "npm run test",
  "npm run build",
  "npm run check",
  "npm install",
  "git status",
  "git diff",
  "git log",
  "git pull",
  "node ",
];
const blockedPattern = /\b(rm\s+-rf|del\s+\/|format\b|shutdown\b|reboot\b|powershell\b|curl\b|wget\b|ssh\b|scp\b|sudo\b|chmod\b|chown\b)\b|[;&|`$<>]/i;

if (!token) {
  console.error("TELEGRAM_BOT_TOKEN eksik. .env veya ortam değişkeni olarak ekle.");
  process.exit(1);
}

mkdirSync(dataDir, { recursive: true });
let state = loadState();
let offset = 0;

log("MoonCode Telegram Remote başladı");
void pollLoop();

async function pollLoop() {
  while (true) {
    try {
      const updates = await telegram("getUpdates", { offset, timeout: 25, allowed_updates: ["message"] });
      for (const update of updates.result ?? []) {
        offset = update.update_id + 1;
        await handleMessage(update.message);
      }
    } catch (error) {
      log(`poll hata: ${error.message}`);
      await sleep(2500);
    }
  }
}

async function handleMessage(message) {
  if (!message?.chat?.id) return;
  const chatId = String(message.chat.id);
  const text = String(message.text ?? "").trim();

  if (!allowedChatIds.has(chatId)) {
    await send(chatId, `Yetkisiz chat id: ${chatId}\nBunu TELEGRAM_ALLOWED_CHAT_IDS içine eklemen gerekiyor.`);
    return;
  }

  if (!text) return;
  log(`${chatId}: ${text}`);

  const [command, ...rest] = text.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch (command) {
    case "/start":
    case "/help":
      return send(chatId, helpText());
    case "/status":
      return send(chatId, statusText());
    case "/projects":
      return send(chatId, listProjects());
    case "/cd":
      return send(chatId, setProject(arg));
    case "/pwd":
      return send(chatId, state.cwd);
    case "/git":
      return runAndSend(chatId, "git status --short --branch");
    case "/logs":
      return send(chatId, tailLog());
    case "/task":
      return send(chatId, addTask(arg));
    case "/run":
      return runAndSend(chatId, arg);
    default:
      return send(chatId, "Bilinmeyen komut. /help yaz.");
  }
}

function loadState() {
  if (existsSync(statePath)) return JSON.parse(readFileSync(statePath, "utf8"));
  const initial = { cwd: projectRoot };
  writeFileSync(statePath, JSON.stringify(initial, null, 2));
  return initial;
}

function saveState() {
  writeFileSync(statePath, JSON.stringify(state, null, 2));
}

function helpText() {
  return [
    "MoonCode Telegram Remote",
    "",
    "/status - servis durumu",
    "/projects - ana klasördeki projeler",
    "/cd <klasör> - aktif proje seç",
    "/pwd - aktif klasör",
    "/git - git durum",
    "/run <güvenli komut> - test/build/git/node çalıştır",
    "/task <iş> - görev kuyruğuna not ekle",
    "/logs - son loglar",
  ].join("\n");
}

function statusText() {
  return [
    "✅ MoonCode Remote aktif",
    `Makine: ${os.hostname()}`,
    `Platform: ${os.platform()} ${os.release()}`,
    `Node: ${process.version}`,
    `Aktif klasör: ${state.cwd}`,
    `Uptime: ${Math.round(process.uptime())} sn`,
  ].join("\n");
}

function listProjects() {
  const entries = readdirSync(projectRoot)
    .filter((name) => !name.startsWith("."))
    .map((name) => path.join(projectRoot, name))
    .filter((entry) => statSync(entry).isDirectory())
    .map((entry) => `- ${path.basename(entry)}`)
    .slice(0, 80);
  return entries.length ? entries.join("\n") : "Proje bulunamadı.";
}

function setProject(input) {
  if (!input) return "Kullanım: /cd <klasör>";
  const target = path.resolve(projectRoot, input);
  if (!target.startsWith(projectRoot) || !existsSync(target)) return "Geçersiz klasör.";
  state.cwd = target;
  saveState();
  return `Aktif proje: ${state.cwd}`;
}

function addTask(text) {
  if (!text) return "Kullanım: /task <yapılacak iş>";
  const item = { createdAt: new Date().toISOString(), cwd: state.cwd, text };
  writeFileSync(taskPath, `${JSON.stringify(item)}\n`, { flag: "a" });
  return `Görev kaydedildi:\n${text}`;
}

async function runAndSend(chatId, command) {
  if (!isSafeCommand(command)) return send(chatId, "Komut güvenlik filtresine takıldı veya izinli değil.");
  await send(chatId, `Çalışıyor:\n${command}`);
  const result = await runCommand(command);
  return send(chatId, trimOutput(result));
}

function isSafeCommand(command) {
  if (!command || blockedPattern.test(command)) return false;
  return safeCommandPrefixes.some((prefix) => command === prefix.trim() || command.startsWith(prefix));
}

function runCommand(command) {
  return new Promise((resolve) => {
    const child = spawn(command, { cwd: state.cwd, shell: true, windowsHide: true });
    let output = "";
    const timer = setTimeout(() => child.kill("SIGTERM"), commandTimeoutMs);
    child.stdout.on("data", (data) => (output += data));
    child.stderr.on("data", (data) => (output += data));
    child.on("close", (code) => {
      clearTimeout(timer);
      const text = `exit=${code}\n${output || "çıktı yok"}`;
      log(text);
      resolve(text);
    });
  });
}

function trimOutput(text) {
  return text.length > maxOutput ? `${text.slice(0, maxOutput)}\n...çıktı kısaltıldı` : text;
}

function tailLog() {
  if (!existsSync(logPath)) return "Log yok.";
  return trimOutput(readFileSync(logPath, "utf8").split("\n").slice(-80).join("\n"));
}

function log(text) {
  writeFileSync(logPath, `[${new Date().toISOString()}] ${text}\n`, { flag: "a" });
}

async function send(chatId, text) {
  await telegram("sendMessage", { chat_id: chatId, text: trimOutput(text), disable_web_page_preview: true });
}

async function telegram(method, body) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${method} HTTP ${response.status}`);
  const data = await response.json();
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadDotEnv(filePath) {
  if (!existsSync(filePath)) return;
  for (const line of readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const equalsIndex = trimmed.indexOf("=");
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}
