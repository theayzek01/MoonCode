const manifest = chrome.runtime.getManifest();
const EXTENSION_VERSION = manifest.version_name || manifest.version || "dev";
const PORT_START = 3133;
const PORT_COUNT = 10;

const HIGHLIGHT_STATUS = {
  connected: "active",
  connecting: "connecting",
  scanning: "scanning",
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function setStatus(statusEl, noteEl, text, kind, note) {
  statusEl.textContent = text;
  statusEl.className = `badge ${kind}`;
  noteEl.textContent = note;
}

function emptyState(text) {
  return `
    <div class="empty-state">${escapeHtml(text)}</div>
  `;
}

function renderPortRow(conn) {
  const isActive = conn.status === "connected";
  const isConnecting = conn.status === "connecting";
  const iconSrc = isActive
    ? "icons/Computer Systems/8. Wifi Excellent.png"
    : "icons/Computer Systems/11. No Wifi.png";

  const badgeClass = isActive ? "active" : isConnecting ? "connecting" : "scanning";
  const badgeText = isActive ? "Aktif" : isConnecting ? "Bağlanıyor" : "Taranıyor";

  return `
    <div class="port-row">
      <img class="port-icon" src="${iconSrc}" alt="">
      <span class="port-label">:${escapeHtml(conn.port)}</span>
      <span class="port-badge ${badgeClass}">${badgeText}</span>
      ${isActive ? `<button class="close-btn" data-port="${escapeHtml(conn.port)}" title="Sonlandır">✕</button>` : ""}
    </div>
  `;
}

function updateUI() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    const statusEl = document.getElementById("overall-status");
    const listEl = document.getElementById("port-list");
    const countEl = document.getElementById("client-count");
    const noteEl = document.getElementById("status-note");
    const versionEl = document.getElementById("extension-version");

    versionEl.textContent = EXTENSION_VERSION;

    if (!response) {
      setStatus(
        statusEl,
        noteEl,
        "Bağlantı Yok",
        "off",
        "MoonCode CLI çalışmıyorsa önce köprüyü başlatın. Tarama otomatik olarak yeniden dener.",
      );
      countEl.textContent = "0 istemci";
      listEl.innerHTML = emptyState("Köprü durumunu okuyamadık. MoonCode çalışınca portlar burada görünür.");
      return;
    }

    const connections = Array.isArray(response.connections) ? response.connections : [];
    const active = connections.filter((c) => c.status === "connected");
    const connecting = connections.filter((c) => c.status === "connecting");
    const scanning = connections.filter((c) => c.status === "scanning");
    const total = response.totalClients || 0;

    countEl.textContent = `${total} istemci`;

    if (active.length > 0) {
      setStatus(
        statusEl,
        noteEl,
        "Bağlı",
        "on",
        `${active.length} port bağlı · MoonCode ile tarayıcı köprüsü çalışıyor.`,
      );
    } else if (connecting.length > 0) {
      setStatus(
        statusEl,
        noteEl,
        "Bağlanıyor",
        "waiting",
        "Bridge aranıyor. MoonCode CLI açıldığında eklenti otomatik olarak yeniden bağlanır.",
      );
    } else {
      setStatus(
        statusEl,
        noteEl,
        "Bağlantı Yok",
        "off",
        "MoonCode CLI veya browser-bridge çalışmadığı için aktif port görünmüyor.",
      );
    }

    const visible = [...active, ...connecting];
    if (visible.length === 0) {
      listEl.innerHTML = emptyState(
        scanning.length > 0
          ? "Köprü başlatıldığında portlar buraya düşer. Şu an arka planda tarama devam ediyor."
          : "Aktif bir bağlantı yok. MoonCode CLI ve browser bridge başlatıldığında burası dolacak.",
      );
      return;
    }

    listEl.innerHTML = visible.map(renderPortRow).join("");
  });
}

document.getElementById("reconnect-btn").addEventListener("click", () => {
  const icon = document.getElementById("refresh-icon");
  icon.style.transform = "rotate(180deg)";
  icon.style.transition = "transform 0.5s";
  setTimeout(() => {
    icon.style.transform = "";
  }, 550);
  chrome.runtime.sendMessage({ type: "reconnect_all" });
  setTimeout(updateUI, 300);
});

document.getElementById("dashboard-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

document.getElementById("close-all-btn").addEventListener("click", () => {
  if (confirm("Tüm aktif MoonCode terminal oturumlarını kapatmak istediğinize emin misiniz?")) {
    chrome.runtime.sendMessage({ type: "close_all_sessions" });
    setTimeout(updateUI, 300);
  }
});

document.getElementById("port-list").addEventListener("click", (e) => {
  const btn = e.target.closest(".close-btn");
  if (!btn) return;
  const port = Number(btn.getAttribute("data-port"));
  if (confirm(`Port :${port} üzerindeki oturumu sonlandırmak istediğinize emin misiniz?`)) {
    chrome.runtime.sendMessage({ type: "close_port", port });
    setTimeout(updateUI, 300);
  }
});

setInterval(updateUI, 1200);
updateUI();
