const BRIDGE_URL = "ws://127.0.0.1:3133/ws";
const VERSION = "10.5.2026";
const HEARTBEAT_INTERVAL_MS = 20000;

let socket;
let reconnectTimer;
let heartbeatTimer;

setBadge(false, "starting");
connect();
chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("hodeus-bridge-reconnect", { periodInMinutes: 0.5 });
  connect();
});
chrome.action.onClicked.addListener(connect);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "hodeus-bridge-reconnect") connect();
});
chrome.alarms.create("hodeus-bridge-reconnect", { periodInMinutes: 0.5 });

function connect() {
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    updateBadgeFromSocket();
    return;
  }
  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);
  setBadge(false, "connecting");
  socket = new WebSocket(BRIDGE_URL);

  socket.onopen = () => {
    setBadge(true, "connected");
    sendHello();
    heartbeatTimer = setInterval(() => {
      send({ type: "ping", time: Date.now() });
    }, HEARTBEAT_INTERVAL_MS);
  };

  socket.onmessage = async (event) => {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch {
      return;
    }
    if (message.type !== "command" || !message.id) return;

    try {
      const result = await executeCommand(message.action, message.args || {});
      send({ type: "result", id: message.id, ok: true, result });
    } catch (error) {
      send({ type: "result", id: message.id, ok: false, error: error?.message || String(error) });
    }
  };

  socket.onclose = scheduleReconnect;
  socket.onerror = scheduleReconnect;
}

function scheduleReconnect() {
  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);
  setBadge(false, "disconnected");
  reconnectTimer = setTimeout(connect, 2000);
}

function sendHello() {
  send({
    type: "hello",
    extensionId: chrome.runtime.id,
    version: VERSION,
    capabilities: ["tabs", "page", "debugger", "screenshot", "scroll", "console_logs", "read_dom", "hover", "press_key", "get_elements"]
  });
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message));
  }
}

function updateBadgeFromSocket() {
  setBadge(socket?.readyState === WebSocket.OPEN, socket?.readyState === WebSocket.OPEN ? "connected" : "connecting");
}

function setBadge(connected, title) {
  chrome.action.setBadgeText({ text: connected ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: connected ? "#22c55e" : "#ef4444" });
  chrome.action.setTitle({ title: `Moon Browser Bridge: ${title}` });
}

async function executeCommand(action, args) {
  if (action === "tabs") return executeTabs(args);
  if (action === "page") return executePage(args);
  throw new Error(`Unknown browser action: ${action}`);
}

async function executeTabs(args) {
  const action = args.action;
  if (action === "list") {
    const tabs = await chrome.tabs.query({});
    return tabs.map(tabSummary);
  }
  if (action === "active") {
    return tabSummary(await getActiveTab());
  }
  if (action === "open") {
    if (!args.url) throw new Error("open requires url");
    return tabSummary(await chrome.tabs.create({ url: args.url, active: args.active !== false }));
  }
  if (action === "close") {
    const tabId = requireTabId(args);
    await chrome.tabs.remove(tabId);
    return { closed: tabId };
  }
  if (action === "focus") {
    const tabId = requireTabId(args);
    const tab = await chrome.tabs.get(tabId);
    await chrome.tabs.update(tabId, { active: true });
    if (tab.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true });
    return tabSummary(await chrome.tabs.get(tabId));
  }
  if (action === "reload") {
    const tabId = args.tabId === undefined ? (await getActiveTab()).id : requireTabId(args);
    await chrome.tabs.reload(tabId);
    return { reloaded: tabId };
  }
  if (action === "navigate") {
    const tabId = args.tabId === undefined ? (await getActiveTab()).id : requireTabId(args);
    if (!args.url) throw new Error("navigate requires url");
    return tabSummary(await chrome.tabs.update(tabId, { url: args.url, active: args.active !== false }));
  }
  throw new Error(`Unknown tabs action: ${action}`);
}

async function executePage(args) {
  const action = args.action;
  const tab = args.tabId === undefined ? await getActiveTab() : await chrome.tabs.get(Number(args.tabId));
  const tabId = tab.id;
  if (tabId === undefined) throw new Error("No target tab id");

  const resolveSelector = async (selector) => {
    if (selector.startsWith("#") && !isNaN(selector.slice(1))) {
      const id = selector.slice(1);
      const [res] = await chrome.scripting.executeScript({
        target: { tabId },
        func: (id) => {
          const el = document.querySelector(`[data-moon-id="${id}"]`);
          return el ? `[data-moon-id="${id}"]` : null;
        },
        args: [id]
      });
      return res.result || selector;
    }
    return selector;
  };

  if (action === "scroll") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (direction, amount) => {
        const val = amount || 500;
        if (direction === "up") window.scrollBy(0, -val);
        else if (direction === "down") window.scrollBy(0, val);
        else if (direction === "top") window.scrollTo(0, 0);
        else if (direction === "bottom") window.scrollTo(0, document.body.scrollHeight);
        return { scrolled: true, direction, position: window.scrollY };
      },
      args: [args.direction || "down", args.amount]
    });
    return result?.result;
  }

  if (action === "console_logs") {
    return getConsoleLogs(tabId);
  }

  if (action === "read_dom") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        const isInteractive = (el) => {
          const role = el.getAttribute("role");
          return ["a", "button", "input", "select", "textarea"].includes(el.tagName.toLowerCase()) || 
                 el.hasAttribute("onclick") || 
                 ["button", "link", "checkbox", "menuitem"].includes(role);
        };

        const walk = (node, depth = 0) => {
          if (depth > 10) return ""; // Limit depth to save tokens
          if (node.nodeType === 3) {
            const text = node.textContent.trim();
            return text.length > 2 ? text : "";
          }
          if (node.nodeType !== 1) return "";
          
          const tag = node.tagName.toLowerCase();
          if (["script", "style", "noscript", "svg", "path"].includes(tag)) return "";
          
          // Check if visible
          const style = window.getComputedStyle(node);
          if (style.display === "none" || style.visibility === "hidden") return "";

          let children = Array.from(node.childNodes)
            .map(c => walk(c, depth + 1))
            .filter(x => x)
            .join(" ");

          if (isInteractive(node)) {
            const label = node.getAttribute("aria-label") || node.title || children || node.placeholder || "";
            return `\n[${tag.toUpperCase()}: ${label.slice(0, 50)}]\n`;
          }

          if (["h1", "h2", "h3"].includes(tag)) return `\n# ${children}\n`;
          
          // If a div/section has no interactive children and small text, maybe collapse it?
          // For now, just return children to keep structure flat and token-efficient
          return children;
        };

        return {
          url: location.href,
          title: document.title,
          content: walk(document.body).replace(/\s+/g, " ").replace(/\n\s*\n/g, "\n").slice(0, 8000)
        };
      }
    });
    return result?.result;
  }

  if (action === "read") {
    injectOverlay(tabId);
    const maxChars = Number.isFinite(args.maxChars) ? Number(args.maxChars) : 12000;
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (limit) => {
        const selection = String(globalThis.getSelection?.() || "");
        const text = document.body?.innerText || "";
        return {
          title: document.title,
          url: location.href,
          selection,
          text: text.slice(0, limit),
          truncated: text.length > limit
        };
      },
      args: [maxChars]
    });
    return result?.result;
  }

  if (action === "click") {
    if (!args.selector) throw new Error("click requires selector");
    const selector = await resolveSelector(args.selector);
    await injectOverlay(tabId, `Clicking ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { clicked: false, reason: "selector not found" };
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        if (window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY, "hand");
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { clicked: true, selector, text: element.textContent?.trim().slice(0, 200) || "" };
      },
      args: [args.selector]
    });
    return result?.result;
  }

  if (action === "hover") {
    if (!args.selector) throw new Error("hover requires selector");
    const selector = await resolveSelector(args.selector);
    await injectOverlay(tabId, `Hovering ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { hovered: false, reason: "selector not found" };
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        if (window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY, "arrow");
        element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
        return { hovered: true, selector };
      },
      args: [args.selector]
    });
    return result?.result;
  }

  if (action === "type") {
    if (!args.selector) throw new Error("type requires selector");
    const selector = await resolveSelector(args.selector);
    await injectOverlay(tabId, `Typing into ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, text) => {
        const element = document.querySelector(selector);
        if (!element) return { typed: false, reason: "selector not found" };
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const rect = element.getBoundingClientRect();
        if (window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2 + window.scrollX, rect.top + rect.height / 2 + window.scrollY, "type");
        element.focus?.();
        if ("value" in element) element.value = text;
        else element.textContent = text;
        element.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
        element.dispatchEvent(new Event("change", { bubbles: true }));
        return { typed: true, selector };
      },
      args: [args.selector, args.text ?? ""]
    });
    return result?.result;
  }

  if (action === "press_key") {
    if (!args.key) throw new Error("press_key requires key");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (key) => {
        const opts = { key, bubbles: true, cancelable: true };
        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", opts));
        document.activeElement.dispatchEvent(new KeyboardEvent("keypress", opts));
        document.activeElement.dispatchEvent(new KeyboardEvent("keyup", opts));
        return { pressed: key };
      },
      args: [args.key]
    });
    return result?.result;
  }

  if (action === "get_elements") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        // Cleanup old labels
        document.querySelectorAll(".moon-label").forEach(el => el.remove());
        
        const interactive = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [onclick]'));
        let idCounter = 1;
        const map = [];

        interactive.forEach(el => {
          const rect = el.getBoundingClientRect();
          const isVisible = rect.width > 0 && rect.height > 0 && 
                           rect.top >= 0 && rect.left >= 0 &&
                           rect.bottom <= window.innerHeight && rect.right <= window.innerWidth &&
                           window.getComputedStyle(el).visibility !== 'hidden';
          
          if (!isVisible) return;

          const id = idCounter++;
          el.setAttribute("data-moon-id", id);
          
          // Draw label
          const label = document.createElement("div");
          label.className = "moon-label";
          label.textContent = id;
          label.style.position = "absolute";
          label.style.top = (rect.top + window.scrollY) + "px";
          label.style.left = (rect.left + window.scrollX) + "px";
          label.style.background = "#fbbf24";
          label.style.color = "#000";
          label.style.fontSize = "10px";
          label.style.fontWeight = "bold";
          label.style.padding = "1px 3px";
          label.style.borderRadius = "3px";
          label.style.zIndex = "2147483647";
          label.style.pointerEvents = "none";
          label.style.border = "1px solid #000";
          document.body.appendChild(label);

          map.push({
            id,
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().slice(0, 30),
            placeholder: el.placeholder || undefined,
            type: el.type || undefined
          });
        });
        return map.slice(0, 80); // Strict limit for speed
      }
    });
    return result?.result;
  }

  if (action === "screenshot") {
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "png" });
    return { tabId, dataUrl };
  }

  if (action === "evaluate") {
    if (!args.script) throw new Error("evaluate requires script");
    return evaluateWithDebugger(tabId, String(args.script));
  }

  throw new Error(`Unknown page action: ${action}`);
}

async function evaluateWithDebugger(tabId, expression) {
  const target = { tabId };
  let attached = false;
  try {
    await chrome.debugger.attach(target, "1.3");
    attached = true;
    const response = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.text || "Runtime.evaluate failed");
    }
    return response.result?.value ?? response.result ?? null;
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
      } catch { }
    }
  }
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("No active Chrome tab found");
  return tab;
}

function requireTabId(args) {
  if (args.tabId === undefined) throw new Error("tabId is required");
  return Number(args.tabId);
}

function tabSummary(tab) {
  if (!tab) return undefined;
  return {
    id: tab.id,
    windowId: tab.windowId,
    active: tab.active,
    pinned: tab.pinned,
    title: tab.title,
    url: tab.url,
    status: tab.status
  };
}

async function getConsoleLogs(tabId) {
  const target = { tabId };
  await chrome.debugger.attach(target, "1.3");
  try {
    await chrome.debugger.sendCommand(target, "Log.enable");
    const response = await chrome.debugger.sendCommand(target, "Runtime.getConsoleMessages");
    return response.messages || [];
  } finally {
    await chrome.debugger.detach(target);
  }
}

async function injectOverlay(tabId, message = "Moon Controlling") {
  const arrowUrl = chrome.runtime.getURL("cursors/arrow.cur");
  const handUrl = chrome.runtime.getURL("cursors/hand.cur");
  const typeUrl = chrome.runtime.getURL("cursors/ibeam.cur");

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, arrowUrl, handUrl, typeUrl) => {
      const overlayId = "hodeus-overlay";
      let overlay = document.getElementById(overlayId);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = overlayId;
        document.body.appendChild(overlay);
      }
      overlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; height: 4px; background: #0ea5e9; z-index: 999999; animation: hodeus-pulse 2s infinite;"></div>
        <div style="position: fixed; top: 10px; right: 10px; background: rgba(15, 23, 42, 0.9); color: white; padding: 8px 16px; border-radius: 12px; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; z-index: 999999; border: 1px solid #0ea5e9; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.2), 0 4px 6px -4px rgb(0 0 0 / 0.2); backdrop-filter: blur(8px); display: flex; align-items: center; gap: 10px;">
          <span style="display: inline-block; width: 10px; height: 10px; background: #0ea5e9; border-radius: 50%; box-shadow: 0 0 10px #0ea5e9;"></span>
          ${msg}
        </div>
        <style>
          @keyframes hodeus-pulse { 0% { opacity: 1; } 50% { opacity: 0.4; } 100% { opacity: 1; } }
        </style>
      `;
      setTimeout(() => { if (overlay) overlay.remove(); }, 10000);

      // Setup custom cursor
      const cursorId = "moon-visual-cursor";
      let cursor = document.getElementById(cursorId);
      if (!cursor) {
        cursor = document.createElement("img");
        cursor.id = cursorId;
        cursor.src = arrowUrl;
        cursor.style.position = "absolute";
        cursor.style.top = `${window.innerHeight / 2}px`;
        cursor.style.left = `${window.innerWidth / 2}px`;
        cursor.style.width = "32px";
        cursor.style.height = "32px";
        cursor.style.pointerEvents = "none";
        cursor.style.zIndex = "1000000";
        cursor.style.transition = "top 0.5s ease-out, left 0.5s ease-out";
        document.body.appendChild(cursor);
      }

      window.__moon_move_cursor = function(x, y, type = "arrow") {
        return new Promise((resolve) => {
          let cursor = document.getElementById(cursorId);
          if (cursor) {
            cursor.src = type === "hand" ? handUrl : type === "type" ? typeUrl : arrowUrl;
            cursor.style.top = y + "px";
            cursor.style.left = x + "px";
            setTimeout(resolve, 500); // wait for animation
          } else {
            resolve();
          }
        });
      };
    },
    args: [message, arrowUrl, handUrl, typeUrl]
  });
}
