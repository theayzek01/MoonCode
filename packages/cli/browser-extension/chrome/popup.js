function updateUI() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    if (!response) return;

    const statusEl = document.getElementById("overall-status");
    const listEl = document.getElementById("port-list");

    const activePorts = response.connections.filter(c => c.status === "connected");
    
    statusEl.textContent = activePorts.length > 0 ? "Bağlı" : "Bağlantı Yok";
    statusEl.className = `badge-status ${activePorts.length > 0 ? "connected" : "offline"}`;

    listEl.innerHTML = "";
    response.connections.forEach(conn => {
      const item = document.createElement("div");
      item.className = "port-item";
      
      const isActive = conn.status === "connected";
      const statusBadge = isActive 
        ? '<span class="port-badge active">Aktif</span>' 
        : '<span class="port-badge scanning">Taranıyor</span>';

      const closeBtn = isActive
        ? `<button class="close-port-btn" data-port="${conn.port}">Sonlandır</button>`
        : '';

      item.innerHTML = `
        <span>Port :${conn.port}</span>
        <div style="display:flex;align-items:center;gap:8px;">
          ${statusBadge}
          ${closeBtn}
        </div>
      `;
      listEl.appendChild(item);
    });
  });
}

document.getElementById("reconnect-btn").addEventListener("click", () => {
  chrome.runtime.sendMessage({ type: "reconnect_all" });
  setTimeout(updateUI, 250);
});

document.getElementById("dashboard-btn").addEventListener("click", () => {
  chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
});

document.getElementById("close-all-btn").addEventListener("click", () => {
  if (confirm("Tüm aktif MoonCode terminal oturumlarını kapatmak istediğinize emin misiniz?")) {
    chrome.runtime.sendMessage({ type: "close_all_sessions" });
    setTimeout(updateUI, 250);
  }
});

// Event delegation for individual close buttons
document.getElementById("port-list").addEventListener("click", (e) => {
  if (e.target.classList.contains("close-port-btn")) {
    const port = Number(e.target.getAttribute("data-port"));
    if (confirm(`Port :${port} üzerindeki MoonCode terminal oturumunu sonlandırmak istediğinize emin misiniz?`)) {
      chrome.runtime.sendMessage({ type: "close_port", port });
      setTimeout(updateUI, 250);
    }
  }
});

// Update UI every second when popup is open
setInterval(updateUI, 750);
updateUI();
