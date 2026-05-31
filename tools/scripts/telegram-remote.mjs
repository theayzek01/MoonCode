#!/usr/bin/env node
import { spawn } from "node:child_process";
import { createServer } from "node:http";
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
const queuePath = path.join(dataDir, "queue.json");

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
const webPort = Number(process.env.MOON_REMOTE_WEB_PORT ?? 8787);

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
	console.error("TELEGRAM_BOT_TOKEN eksik. /telegram login veya .env ile ayarla.");
	process.exit(1);
}

mkdirSync(dataDir, { recursive: true });
let state = loadState();
let queue = loadQueue();
let activeJob = null;
let offset = 0;

log("MoonCode Telegram Remote başladı");
startWebPanel();
void pollLoop();
void queueLoop();

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
	const text = String(message.text ?? message.caption ?? "").trim();

	if (!allowedChatIds.has(chatId)) {
		await send(chatId, `Yetkisiz chat id: ${chatId}\nBunu TELEGRAM_ALLOWED_CHAT_IDS içine eklemen gerekiyor.`);
		return;
	}

	if (message.voice || message.audio) {
		await send(chatId, "Sesli komut altyapısı hazır: Telegram dosyası algılandı. Transkripsiyon için sonraki stepsda local Whisper/Ollama bağlantısı eklenebilir. Şimdilik metin komut gönder.");
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
			return enqueue(chatId, "git status --short --branch", "git status");
		case "/logs":
			return send(chatId, tailLog());
		case "/queue":
			return send(chatId, queueText());
		case "/cancel":
			return send(chatId, cancelActiveJob());
		case "/task":
			return send(chatId, addTask(chatId, arg));
		case "/fix":
			return send(chatId, addFixJob(chatId, arg));
		case "/memory":
			return send(chatId, ensureProjectMemory());
		case "/web":
			return send(chatId, `Web panel: http://localhost:${webPort}`);
		case "/run":
			return enqueue(chatId, arg, "manual run");
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

function loadQueue() {
	if (!existsSync(queuePath)) return [];
	try {
		return JSON.parse(readFileSync(queuePath, "utf8"));
	} catch {
		return [];
	}
}

function saveQueue() {
	writeFileSync(queuePath, JSON.stringify(queue, null, 2));
}

function helpText() {
	return [
		"MoonCode Telegram Remote",
		"",
		"/status - servis durumu",
		"/projects - proje listele",
		"/cd <klasör> - aktif proje seç",
		"/git - git durumunu kuyruğa al",
		"/run <güvenli komut> - komut kuyruğa al",
		"/task <iş> - akıllı görev kaydet/kuyruğa al",
		"/fix [build|test|check] - otomatik doğrulama döngüsü",
		"/queue - çalışan/bekleyen işler",
		"/cancel - çalışan işi durdur",
		"/memory - proje hafızası oluştur/göster",
		"/web - local mobil panel adresi",
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
		`Kuyruk: ${queue.length} bekleyen${activeJob ? ", 1 çalışan" : ""}`,
		`Web: http://localhost:${webPort}`,
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
	if (!target.startsWith(projectRoot) || !existsSync(target) || !statSync(target).isDirectory()) return "Geçersiz klasör.";
	state.cwd = target;
	saveState();
	return `Aktif proje: ${state.cwd}\n${ensureProjectMemory()}`;
}

function addTask(chatId, text) {
	if (!text) return "Kullanım: /task <yapılacak iş>";
	const item = { id: jobId(), createdAt: new Date().toISOString(), chatId, cwd: state.cwd, text, type: "task" };
	writeFileSync(taskPath, `${JSON.stringify(item)}\n`, { flag: "a" });
	queue.push({ ...item, command: inferTaskCommand(text), status: "queued" });
	saveQueue();
	return `Görev kuyruğa alındı (#${item.id}):\n${text}`;
}

function addFixJob(chatId, target) {
	const mode = target || "check";
	const command = mode === "build" ? "npm run build" : mode === "test" ? "npm test" : "npm run check";
	queue.push({ id: jobId(), createdAt: new Date().toISOString(), chatId, cwd: state.cwd, text: `fix ${mode}`, type: "fix", command, status: "queued" });
	saveQueue();
	return `Fix kuyruğa alındı: ${command}`;
}

function inferTaskCommand(text) {
	const lower = text.toLowerCase();
	if (lower.includes("build")) return "npm run build";
	if (lower.includes("test")) return "npm test";
	if (lower.includes("check") || lower.includes("lint") || lower.includes("hata")) return "npm run check";
	return "git status --short --branch";
}

function enqueue(chatId, command, text) {
	if (!isSafeCommand(command)) return send(chatId, "Komut güvenlik filtresine takıldı veya izinli değil.");
	const item = { id: jobId(), createdAt: new Date().toISOString(), chatId, cwd: state.cwd, text, type: "command", command, status: "queued" };
	queue.push(item);
	saveQueue();
	return send(chatId, `Kuyruğa alındı (#${item.id}):\n${command}`);
}

async function queueLoop() {
	while (true) {
		if (!activeJob && queue.length > 0) {
			activeJob = queue.shift();
			saveQueue();
			await executeJob(activeJob);
			activeJob = null;
		}
		await sleep(750);
	}
}

async function executeJob(job) {
	try {
		await send(job.chatId, `Başladı #${job.id}: ${job.command}`);
		const result = await runCommand(job.command, job.cwd);
		await send(job.chatId, `Bitti #${job.id}\n${result}`);
	} catch (error) {
		await send(job.chatId, `Error #${job.id}: ${error.message}`);
	}
}

function queueText() {
	const active = activeJob ? `Çalışan: #${activeJob.id} ${activeJob.command}` : "Çalışan yok.";
	const waiting = queue.length ? queue.map((job) => `#${job.id} ${job.command}`).join("\n") : "Bekleyen yok.";
	return `${active}\n\nBekleyen:\n${waiting}`;
}

function cancelActiveJob() {
	if (!activeJob?.child) return "Cancel edilecek çalışan işlem yok.";
	activeJob.child.kill("SIGTERM");
	return `Cancel sinyali gönderildi: #${activeJob.id}`;
}

function ensureProjectMemory() {
	const moonDir = path.join(state.cwd, ".moon");
	mkdirSync(moonDir, { recursive: true });
	const files = {
		"memory.md": `# Proje Hafızası\n\n- Proje: ${path.basename(state.cwd)}\n- Son güncelleme: ${new Date().toISOString()}\n`,
		"rules.md": "# Kurallar\n\n- Küçük, güvenli ve test edilmiş değişiklik yap.\n- Secret/token dosyalarını commitleme.\n",
		"commands.json": JSON.stringify({ test: "npm test", build: "npm run build", check: "npm run check" }, null, 2),
		"project-profile.json": JSON.stringify({ name: path.basename(state.cwd), root: state.cwd, createdAt: new Date().toISOString() }, null, 2),
	};
	for (const [file, content] of Object.entries(files)) {
		const filePath = path.join(moonDir, file);
		if (!existsSync(filePath)) writeFileSync(filePath, `${content}\n`);
	}
	return `Proje hafızası hazır: ${moonDir}`;
}

function isSafeCommand(command) {
	if (!command || blockedPattern.test(command)) return false;
	return safeCommandPrefixes.some((prefix) => command === prefix.trim() || command.startsWith(prefix));
}

function runCommand(command, cwd = state.cwd) {
	return new Promise((resolve) => {
		const child = spawn(command, { cwd, shell: true, windowsHide: true });
		if (activeJob) activeJob.child = child;
		let output = "";
		const timer = setTimeout(() => child.kill("SIGTERM"), commandTimeoutMs);
		child.stdout.on("data", (data) => (output += data));
		child.stderr.on("data", (data) => (output += data));
		child.on("close", (code) => {
			clearTimeout(timer);
			const text = `exit=${code}\n${output || "çıktı yok"}`;
			log(text);
			resolve(trimOutput(text));
		});
	});
}

function startWebPanel() {
	const server = createServer((req, res) => {
		res.setHeader("content-type", "text/html; charset=utf-8");
		res.end(renderWebPanel());
	});
	server.listen(webPort, "127.0.0.1", () => log(`Web panel: http://localhost:${webPort}`));
}

function renderWebPanel() {
	return `<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>MoonCode Remote</title><style>body{font-family:system-ui;background:#0b0f17;color:#e8edf7;padding:24px}section{background:#121826;border:1px solid #273244;border-radius:14px;padding:16px;margin:12px 0}code,pre{white-space:pre-wrap;color:#9ddcff}.ok{color:#68e394}</style><h1>MoonCode Remote</h1><section><b class="ok">Aktif</b><br>Makine: ${escapeHtml(os.hostname())}<br>Proje: <code>${escapeHtml(state.cwd)}</code><br>Kuyruk: ${queue.length}</section><section><h2>Çalışan</h2><pre>${escapeHtml(activeJob ? `#${activeJob.id} ${activeJob.command}` : "Yok")}</pre></section><section><h2>Bekleyen</h2><pre>${escapeHtml(queue.map((j) => `#${j.id} ${j.command}`).join("\n") || "Yok")}</pre></section><section><h2>Son Log</h2><pre>${escapeHtml(tailLog())}</pre></section>`;
}

function escapeHtml(value) {
	return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
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

function jobId() {
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
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
		const value = trimmed.slice(equalsIndex + 1).trim().replace(/^[ '\"]|[ '\"]$/g, "");
		if (key && process.env[key] === undefined) process.env[key] = value;
	}
}
