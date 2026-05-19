function updateUI() {
  chrome.runtime.sendMessage({ type: "get_status" }, (response) => {
    if (!response) return;

    const statusEl = document.getElementById("overall-status");
    const countEl = document.getElementById("active-count");
    const listEl = document.getElementById("port-list");

    const activePorts = response.connections.filter(c => c.status === "connected");
    
    statusEl.textContent = activePorts.length > 0 ? "Connected" : "Offline";
    statusEl.className = `value ${activePorts.length > 0 ? "connected" : "offline"}`;
    countEl.textContent = activePorts.length;

    listEl.innerHTML = "";
    response.connections.forEach(conn => {
      const item = document.createElement("div");
      item.className = "port-item";
      
      const statusBadge = conn.status === "connected" 
        ? '<span class="port-badge active">Active</span>' 
        : '<span class="port-badge scanning">Scanning</span>';

      item.innerHTML = `
        <span>Port ${conn.port}</span>
        ${statusBadge}
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

// Update UI every second when popup is open
setInterval(updateUI, 750);
updateUI();
