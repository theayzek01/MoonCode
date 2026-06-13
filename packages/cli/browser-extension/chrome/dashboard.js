function refresh() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    if (!response) return;

    const grid = document.getElementById("nodes-grid");
    const activeNodesEl = document.getElementById("active-nodes");
    const totalClientsEl = document.getElementById("total-clients");
    
    const activeConns = response.connections.filter(c => c.status === "connected");
    activeNodesEl.textContent = activeConns.length;
    totalClientsEl.textContent = response.totalClients || 0;
    
    grid.innerHTML = "";

    response.connections.forEach(conn => {
      const isActive = conn.status === "connected";
      const card = document.createElement("div");
      card.className = `node-card ${isActive ? 'active' : ''}`;
      
      const info = conn.info || {};
      const version = info.version || "---";
      const capabilities = info.capabilities || [];

      let capHtml = "";
      if (isActive && capabilities.length > 0) {
        capHtml = `
          <div class="caps">
            ${capabilities.slice(0, 8).map(cap => `<span class="cap-tag">${cap}</span>`).join('')}
          </div>
        `;
      }

      const statusText = isActive ? "AKTİF" : (conn.status === "connecting" ? "BAĞLANIYOR" : "TARANIYOR");

      const terminateBtnHtml = isActive
        ? `<button class="terminate-btn" data-port="${conn.port}">Oturumu Sonlandır</button>`
        : '';

      card.innerHTML = `
        <div class="card-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isActive ? 'var(--green)' : 'var(--text-muted)'}" stroke-width="2.5"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect><line x1="6" y1="6" x2="6.01" y2="6"></line><line x1="6" y1="18" x2="6.01" y2="18"></line></svg>
          <span class="port-id">:${conn.port}</span>
        </div>
        <div class="node-info">
          <div class="info-row">
            <span class="info-key">DURUM</span>
            <span class="info-val" style="color: ${isActive ? 'var(--green)' : 'var(--red)'}">${statusText}</span>
          </div>
          <div class="info-row">
            <span class="info-key">SÜRÜM</span>
            <span class="info-val">${version}</span>
          </div>
          <div class="info-row">
            <span class="info-key">TİP</span>
            <span class="info-val">BRIDGE_NODE</span>
          </div>
        </div>
        ${capHtml}
        ${terminateBtnHtml}
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
  }, 800);
});

// Event delegation for individual terminate buttons in dashboard grid
document.getElementById("nodes-grid").addEventListener("click", (e) => {
  if (e.target.classList.contains("terminate-btn")) {
    const port = Number(e.target.getAttribute("data-port"));
    if (confirm(`Port :${port} üzerindeki MoonCode terminal oturumunu sonlandırmak istediğinize emin misiniz?`)) {
      chrome.runtime.sendMessage({ type: "close_port", port });
      setTimeout(refresh, 250);
    }
  }
});

setInterval(refresh, 1500);
refresh();
