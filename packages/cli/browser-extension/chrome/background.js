const BRIDGE_URL = "ws://127.0.0.1:3133/ws";
const VERSION = "9.0.5";
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
  chrome.action.setTitle({ title: `Hodeus Browser Bridge: ${title}` });
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
        const walk = (node) => {
          if (node.nodeType === 3) return node.textContent.trim();
          if (node.nodeType !== 1) return "";
          const tag = node.tagName.toLowerCase();
          if (["script", "style", "noscript"].includes(tag)) return "";
          
          let children = Array.from(node.childNodes).map(walk).filter(x => x).join(" ");
          if (["h1", "h2", "h3"].includes(tag)) return `\n# ${children}\n`;
          if (tag === "a") return `[${children}](${node.href})`;
          if (tag === "button") return `[BUTTON: ${children}]`;
          if (tag === "input") return `[INPUT: ${node.type} ${node.placeholder || ""}]`;
          return children;
        };
        return {
          url: location.href,
          title: document.title,
          content: walk(document.body).replace(/\s+/g, " ").slice(0, 15000)
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
    injectOverlay(tabId, `Clicking ${args.selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { clicked: false, reason: "selector not found" };
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window }));
        return { clicked: true, selector, text: element.textContent?.trim().slice(0, 200) || "" };
      },
      args: [args.selector]
    });
    return result?.result;
  }

  if (action === "hover") {
    if (!args.selector) throw new Error("hover requires selector");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const element = document.querySelector(selector);
        if (!element) return { hovered: false, reason: "selector not found" };
        element.dispatchEvent(new MouseEvent("mouseover", { bubbles: true, cancelable: true, view: window }));
        return { hovered: true, selector };
      },
      args: [args.selector]
    });
    return result?.result;
  }

  if (action === "type") {
    if (!args.selector) throw new Error("type requires selector");
    injectOverlay(tabId, `Typing into ${args.selector}`);
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
        const elements = Array.from(document.querySelectorAll('a, button, input, select, textarea, [role="button"], [onclick]'));
        return elements.map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().slice(0, 50),
          id: el.id,
          class: el.className,
          placeholder: el.placeholder,
          type: el.type,
          role: el.getAttribute('role'),
          isVisible: el.offsetWidth > 0 && el.offsetHeight > 0
        })).filter(el => el.isVisible);
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

async function injectOverlay(tabId, message = "Hodeus Controlling") {
  chrome.scripting.executeScript({
    target: { tabId },
    func: (msg) => {
      const id = "hodeus-overlay";
      let overlay = document.getElementById(id);
      if (!overlay) {
        overlay = document.createElement("div");
        overlay.id = id;
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
    },
    args: [message]
  });
}
