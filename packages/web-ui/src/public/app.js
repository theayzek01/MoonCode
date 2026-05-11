const $ = (s) => document.querySelector(s);
let current = null;

const root = document.documentElement;
const themeKey = "mooncli-theme";
const defaultTheme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
root.dataset.theme = localStorage.getItem(themeKey) || defaultTheme;

const setMouse = (x, y) => {
  root.style.setProperty("--mx-px", `${x}px`);
  root.style.setProperty("--my-px", `${y}px`);
  root.style.setProperty("--mx", `${(x / window.innerWidth) * 100}%`);
  root.style.setProperty("--my", `${(y / window.innerHeight) * 100}%`);
  const live = $("#liveMouse");
  if (live) live.textContent = `Mouse: x:${Math.round(x)} y:${Math.round(y)}`;
};

window.addEventListener("mousemove", (e) => setMouse(e.clientX, e.clientY), { passive: true });
setMouse(window.innerWidth / 2, window.innerHeight / 2);

$("#themeToggle")?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  localStorage.setItem(themeKey, root.dataset.theme);
});

async function loadSessions() {
  const sessions = await fetch("/api/sessions").then((r) => r.json());
  $("#sessions").innerHTML =
    sessions
      .map(
        (s) => `<div class="session" data-id="${s.id}"><b>${s.id}</b><br><span class="muted">${s.cwd || ""}</span><br><span class="muted">${new Date(s.modified).toLocaleString()} · ${s.messages} entries</span></div>`,
      )
      .join("") || '<p class="muted panel">Session yok</p>';

  document.querySelectorAll(".session").forEach((el) => {
    el.onclick = () => loadSession(el.dataset.id);
  });
}

function textOf(c) {
  if (!c) return "";
  if (typeof c === "string") return c;
  if (Array.isArray(c)) return c.map(textOf).join("\n");
  if (c.type === "text") return c.text || "";
  return JSON.stringify(c, null, 2);
}

async function loadSession(id) {
  current = id;
  document.querySelectorAll(".session").forEach((e) => e.classList.toggle("active", e.dataset.id === id));
  const data = await fetch(`/api/session/${encodeURIComponent(id)}`).then((r) => r.json());
  $("#stats").textContent = JSON.stringify(data.stats, null, 2);
  $("#chat").innerHTML = data.entries
    .filter((e) => e.role || e.type)
    .map(
      (e) => `<div class="msg"><div class="role">${e.role || e.type}</div><pre>${escapeHtml(textOf(e.content || e.message || e.text || e))}</pre></div>`,
    )
    .join("");
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[m]);
}

loadSessions();
setInterval(loadSessions, 5000);
