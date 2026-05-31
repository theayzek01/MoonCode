function renderIconLibrary() {
  const root = document.getElementById("icon-library");
  const icons = window.MOON_ICON_LIBRARY || [];
  if (!root || root.dataset.ready === "1" || icons.length === 0) return;

  const groups = icons.reduce((acc, icon) => {
    (acc[icon.category] ||= []).push(icon);
    return acc;
  }, {});

  root.innerHTML = Object.entries(groups).map(([category, items]) => `
    <article class="icon-group">
      <h2>${category}</h2>
      <div class="icon-grid">
        ${items.map(icon => `<span class="icon-tile" title="${icon.name}"><img src="${icon.path}" alt=""></span>`).join("")}
      </div>
    </article>
  `).join("");
  root.dataset.ready = "1";
}

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

      const capIcons = {
        tabs: "icons/Browser/10. New Tab or Add.png",
        page: "icons/Browser/6. Home.png",
        debugger: "icons/Computer Systems/1. Pointer.png",
        scroll: "icons/Browser/4. Arrow Down.png",
        smart_scroll: "icons/Browser/3. Arrow Up.png",
        mouse: "icons/Computer Systems/2. Hand Pointer.png",
        canvas_info: "icons/Paint/8. Rect Select.png",
        canvas_draw: "icons/Paint/1. Pen.png",
        console_logs: "icons/Computer Systems/7. Alert.png",
        screenshot: "icons/Social/8. Camera.png",
        read_dom: "icons/Browser/15. Search.png",
        hover: "icons/Computer Systems/3. Hand Hover.png",
        drag: "icons/Computer Systems/4. Hand Grab.png",
        upload_file: "icons/Browser/7. Download.png",
        press_key: "icons/Computer Systems/1. Pointer.png",
        get_elements: "icons/Paint/10. Circ Select.png",
        evaluate: "icons/Video/1. Play.png",
        clear_ui: "icons/Paint/2. Eraser.png"
      };

      let capHtml = "";
      if (isActive && capabilities.length > 0) {
        capHtml = `
          <div class="caps">
            ${capabilities.map(cap => `<span class="cap-tag"><img src="${capIcons[cap] || 'icons/Browser/15. Search.png'}" alt="">${cap}</span>`).join('')}
          </div>
        `;
      }

      const statusText = isActive ? "AKTİF" : (conn.status === "connecting" ? "BAĞLANIYOR" : "TARANIYOR");

      const terminateBtnHtml = isActive
        ? `<button class="terminate-btn" data-port="${conn.port}">Oturumu Sonlandır</button>`
        : '';

      card.innerHTML = `
        <div class="card-header">
          <img class="node-icon" src="${isActive ? 'icons/Computer Systems/8. Wifi Excellent.png' : 'icons/Computer Systems/11. No Wifi.png'}" alt="">
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

renderIconLibrary();
setInterval(refresh, 1500);
refresh();
