const HIGHLIGHT_CAPS = new Set(["evaluate", "canvas_draw", "canvas_design", "block_code", "screenshot", "persistent_ui"]);
const manifest = chrome.runtime.getManifest();
const EXTENSION_VERSION = manifest.version_name || manifest.version || "dev";

function timeSince(ts) {
  if (!ts) return "—";
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s önce`;
  if (s < 3600) return `${Math.floor(s / 60)}dk önce`;
  return `${Math.floor(s / 3600)}sa önce`;
}

function refresh() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    if (!response) return;

    const grid = document.getElementById("nodes-grid");
    const activeNodesEl = document.getElementById("active-nodes");
    const totalClientsEl = document.getElementById("total-clients");
    const versionEl = document.getElementById("dashboard-version");

    if (versionEl) versionEl.textContent = EXTENSION_VERSION;

    const activeConns = response.connections.filter((c) => c.status === "connected");
    activeNodesEl.textContent = activeConns.length;
    totalClientsEl.textContent = response.totalClients || 0;

    if (response.connections.every((c) => c.status !== "connected")) {
      grid.innerHTML = `
        <div class="empty">
          <img src="icons/Computer Systems/11. No Wifi.png" alt="">
          <h3>Bağlı oturum yok</h3>
          <p>MoonCode CLI'ı başlatın ve eklentiyi Chrome'a yükleyin.<br>Bağlantı kurulunca kartlar burada görünür.</p>
        </div>`;
      return;
    }

    grid.innerHTML = "";
    response.connections.forEach((conn) => {
      const isActive = conn.status === "connected";
      const info = conn.info || {};
      const caps = info.capabilities || [];
      const status = isActive ? "AKTİF" : conn.status === "connecting" ? "BAĞLANIYOR" : "TARANIYOR";

      const card = document.createElement("div");
      card.className = `node-card${isActive ? " active" : ""}`;

      const capHtml =
        isActive && caps.length > 0
          ? `<div class="caps">${caps.slice(0, 12)
              .map((c) => `<span class="cap-tag${HIGHLIGHT_CAPS.has(c) ? " highlight" : ""}">${c}</span>`)
              .join("")}</div>`
          : "";

      const terminateHtml = isActive
        ? `<button class="terminate-btn" data-port="${conn.port}">
             <img src="icons/Browser/9. Close or Multiply.png" alt="">
             Oturumu Sonlandır
           </button>`
        : "";

      card.innerHTML = `
        <div class="status-dot ${isActive ? "active" : "offline"}"></div>
        <div class="card-head">
          <img class="card-icon" src="icons/Computer Systems/${isActive ? "8. Wifi Excellent.png" : "11. No Wifi.png"}" alt="">
          <span class="port-id">:${conn.port}</span>
          <span class="card-status-text ${isActive ? "active" : "offline"}">${status}</span>
        </div>
        <div class="info-row"><span class="info-key">Sürüm</span><span class="info-val">${info.version || "—"}</span></div>
        <div class="info-row"><span class="info-key">Extension ID</span><span class="info-val" style="font-size:10px">${(info.extensionId || "—").slice(0, 16)}…</span></div>
        <div class="info-row"><span class="info-key">Son görülme</span><span class="info-val">${timeSince(info.connectedAt)}</span></div>
        <div class="info-row"><span class="info-key">Yetenek</span><span class="info-val">${caps.length}</span></div>
        ${capHtml}
        ${terminateHtml}
      `;
      grid.appendChild(card);
    });
  });
}

document.getElementById("refresh-btn").addEventListener("click", () => {
  const icon = document.getElementById("sync-icon");
  icon.classList.add("spinning");
  chrome.runtime.sendMessage({ type: "reconnect_all" });
  setTimeout(() => {
    icon.classList.remove("spinning");
    refresh();
  }, 750);
});

document.getElementById("close-all-btn").addEventListener("click", () => {
  if (confirm("Tüm aktif MoonCode terminal oturumlarını kapatmak istediğinize emin misiniz?")) {
    chrome.runtime.sendMessage({ type: "close_all_sessions" });
    setTimeout(refresh, 300);
  }
});

document.getElementById("nodes-grid").addEventListener("click", (e) => {
  const btn = e.target.closest(".terminate-btn");
  if (!btn) return;
  const port = Number(btn.getAttribute("data-port"));
  if (confirm(`Port :${port} üzerindeki oturumu sonlandırmak istediğinize emin misiniz?`)) {
    chrome.runtime.sendMessage({ type: "close_port", port });
    setTimeout(refresh, 300);
  }
});

setInterval(refresh, 1500);
refresh();
