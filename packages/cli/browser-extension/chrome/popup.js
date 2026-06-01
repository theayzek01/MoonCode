function updateUI() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    if (!response) return;

    const statusEl = document.getElementById("overall-status");
    const listEl   = document.getElementById("port-list");
    const countEl  = document.getElementById("client-count");

    const activePorts = response.connections.filter(c => c.status === "connected");
    const total = response.totalClients || 0;

    statusEl.textContent = activePorts.length > 0 ? "Bağlı" : "Bağlantı Yok";
    statusEl.className = `badge ${activePorts.length > 0 ? "on" : "off"}`;
    countEl.textContent = `${total} istemci`;

    listEl.innerHTML = "";
    response.connections.forEach(conn => {
      const isActive = conn.status === "connected";
      const row = document.createElement("div");
      row.className = "port-row";

      const iconSrc = isActive
        ? "icons/Computer Systems/8. Wifi Excellent.png"
        : "icons/Computer Systems/11. No Wifi.png";

      row.innerHTML = `
        <img class="port-icon" src="${iconSrc}" alt="">
        <span class="port-label">:${conn.port}</span>
        <span class="port-badge ${isActive ? "active" : "scanning"}">${isActive ? "Aktif" : "Taranıyor"}</span>
        ${isActive ? `<button class="close-btn" data-port="${conn.port}" title="Sonlandır">✕</button>` : ""}
      `;
      listEl.appendChild(row);
    });
  });
}

document.getElementById("reconnect-btn").addEventListener("click", () => {
  const icon = document.getElementById("refresh-icon");
  icon.style.transform = "rotate(180deg)";
  icon.style.transition = "transform 0.5s";
  setTimeout(() => { icon.style.transform = ""; }, 550);
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
  if (e.target.classList.contains("close-btn")) {
    const port = Number(e.target.getAttribute("data-port"));
    if (confirm(`Port :${port} üzerindeki oturumu sonlandırmak istediğinize emin misiniz?`)) {
      chrome.runtime.sendMessage({ type: "close_port", port });
      setTimeout(updateUI, 300);
    }
  }
});

setInterval(updateUI, 800);
updateUI();
