const BRIDGE_URL = "ws://127.0.0.1:3132/ws";
const VERSION = "0.1.1";
const HEARTBEAT_INTERVAL_MS = 20000;

let socket;
let reconnectTimer;
let heartbeatTimer;

setBadge(false, "starting");
connect();
chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create("mooncli-bridge-reconnect", { periodInMinutes: 0.5 });
  connect();
});
chrome.action.onClicked.addListener(connect);
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "mooncli-bridge-reconnect") connect();
});
chrome.alarms.create("mooncli-bridge-reconnect", { periodInMinutes: 0.5 });

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
  reconnectTimer = setTimeout(connect, 1000);
}

function sendHello() {
  send({
    type: "hello",
    extensionId: chrome.runtime.id,
    version: VERSION,
    capabilities: ["tabs", "page", "debugger", "screenshot", "scroll", "console_logs", "read_dom"]
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
  chrome.action.setBadgeBackgroundColor({ color: connected ? "#16a34a" : "#dc2626" });
  chrome.action.setTitle({ title: `Mooncli Browser Bridge: ${title}` });
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

    return result?.result;
  }
  
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
        // Basit bir markdown benzeri çıktı oluştur
        const walk = (node) => {
          if (node.nodeType === 3) return node.textContent.trim();
          if (node.nodeType !== 1) return "";
          let children = Array.from(node.childNodes).map(walk).join(" ");
          const tag = node.tagName.toLowerCase();
          if (["h1", "h2", "h3"].includes(tag)) return `\n# ${children}\n`;
          if (tag === "a") return `[${children}](${node.href})`;
          if (tag === "button") return `[BUTTON: ${children}]`;
          if (tag === "input") return `[INPUT: ${node.type} ${node.placeholder || ""}]`;
          return children;
        };
        return {
          url: location.href,
          content: walk(document.body).replace(/\s+/g, " ").slice(0, 15000)
        };
      }
    });
    return result?.result;
  }

  if (action === "read") {
    // Mevcut read koduna ek olarak overlay inject et (her okumada kontrol bizde olduğunu gösterelim)
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
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { clicked: false, reason: "selector not found" };
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { clicked: true, selector, text: element.textContent?.trim().slice(0, 200) || "" };
      },
      args: [args.selector]
    });
    return result?.result;
  }

  if (action === "type") {
    if (!args.selector) throw new Error("type requires selector");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector, text) => {
        const element = document.querySelector(selector);
        if (!element) return { typed: false, reason: "selector not found" };
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
      } catch {
        // ignore detach failures
      }
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
    audible: tab.audible,
    muted: tab.mutedInfo?.muted,
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
    // Bir süre beklemiyoruz, sadece mevcutları almaya çalışıyoruz (aslında Log.enable sonrası gelmeli)
    // Ama debugger'da Runtime.getConsoleMessages daha garantidir
    const response = await chrome.debugger.sendCommand(target, "Runtime.getConsoleMessages");
    return response.messages || [];
  } finally {
    await chrome.debugger.detach(target);
  }
}

async function injectOverlay(tabId) {
  chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (document.getElementById("mooncli-overlay")) return;
      const overlay = document.createElement("div");
      overlay.id = "mooncli-overlay";
      overlay.innerHTML = `
        <div style="position: fixed; top: 0; left: 0; right: 0; height: 4px; background: #3b82f6; z-index: 999999; animation: pulse 2s infinite;"></div>
        <div style="position: fixed; top: 10px; right: 10px; background: rgba(30, 41, 59, 0.9); color: white; padding: 8px 12px; border-radius: 8px; font-family: sans-serif; font-size: 12px; z-index: 999999; border: 1px solid #3b82f6; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);">
          <span style="display: inline-block; width: 8px; height: 8px; background: #3b82f6; border-radius: 50%; margin-right: 8px;"></span>
          Mooncli Controlling
        </div>
        <style>
          @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
        </style>
      `;
      document.body.appendChild(overlay);
      // 10 saniye sonra kaldır
      setTimeout(() => overlay.remove(), 10000);
    }
  });
}
