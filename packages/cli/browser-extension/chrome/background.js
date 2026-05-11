const BRIDGE_URL = "ws://127.0.0.1:3133/ws";
const VERSION = "11.05.2026";
const HEARTBEAT_INTERVAL_MS = 15000;
const RECONNECT_DELAY_MS = 3000;
const ALARM_NAME = "mooncli-bridge-reconnect";

let socket = null;
let reconnectTimer = null;
let heartbeatTimer = null;
let isConnecting = false;
let debuggerAttachedTabs = new Set();

// ── Init ──────────────────────────────────────────────────────────────────────
setBadge(false, "starting");
connect();
chrome.runtime.onStartup.addListener(connect);
chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 1 });
  connect();
});
chrome.action.onClicked.addListener(() => {
  if (socket?.readyState !== WebSocket.OPEN) connect();
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME && socket?.readyState !== WebSocket.OPEN) connect();
});

// ── Connection ────────────────────────────────────────────────────────────────
function connect() {
  if (isConnecting) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    updateBadgeFromSocket();
    return;
  }

  isConnecting = true;
  clearTimeout(reconnectTimer);
  clearInterval(heartbeatTimer);
  setBadge(false, "connecting");

  try {
    socket = new WebSocket(BRIDGE_URL);
  } catch (e) {
    isConnecting = false;
    scheduleReconnect();
    return;
  }

  socket.onopen = () => {
    isConnecting = false;
    setBadge(true, "connected");
    sendHello();
    heartbeatTimer = setInterval(() => {
      if (socket?.readyState === WebSocket.OPEN) {
        send({ type: "ping", time: Date.now() });
      } else {
        clearInterval(heartbeatTimer);
      }
    }, HEARTBEAT_INTERVAL_MS);
  };

  socket.onmessage = async (event) => {
    let message;
    try { message = JSON.parse(event.data); } catch { return; }

    if (message.type === "pong") return;
    if (message.type !== "command" || !message.id) return;

    try {
      const result = await executeCommand(message.action, message.args || {});
      send({ type: "result", id: message.id, ok: true, result });
    } catch (error) {
      send({ type: "result", id: message.id, ok: false, error: error?.message || String(error) });
    }
  };

  socket.onclose = (event) => {
    isConnecting = false;
    clearInterval(heartbeatTimer);
    setBadge(false, "disconnected");
    scheduleReconnect(event.code);
  };

  socket.onerror = () => {
    isConnecting = false;
    // onclose fires next, let that handle reconnect
  };
}

function scheduleReconnect(code) {
  clearTimeout(reconnectTimer);
  // 1000 = normal close; reconnect sooner, otherwise back off
  const delay = (code === 1000) ? 1000 : RECONNECT_DELAY_MS;
  reconnectTimer = setTimeout(connect, delay);
}

function sendHello() {
  send({
    type: "hello",
    extensionId: chrome.runtime.id,
    version: VERSION,
    capabilities: ["tabs", "page", "debugger", "screenshot", "scroll",
      "console_logs", "read_dom", "hover", "press_key", "get_elements", "evaluate"]
  });
}

function send(message) {
  if (socket?.readyState === WebSocket.OPEN) {
    try { socket.send(JSON.stringify(message)); } catch { /* ignore */ }
  }
}

function updateBadgeFromSocket() {
  const ok = socket?.readyState === WebSocket.OPEN;
  setBadge(ok, ok ? "connected" : "connecting");
}

function setBadge(connected, title) {
  chrome.action.setBadgeText({ text: connected ? "ON" : "OFF" });
  chrome.action.setBadgeBackgroundColor({ color: connected ? "#22c55e" : "#ef4444" });
  chrome.action.setTitle({ title: `Moon Browser Bridge: ${title}` });
}

// ── Command dispatcher ────────────────────────────────────────────────────────
async function executeCommand(action, args) {
  if (action === "tabs") return executeTabs(args);
  if (action === "page") return executePage(args);
  throw new Error(`Unknown browser action: ${action}`);
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
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
    await chrome.tabs.update(tabId, { url: args.url });
    if (args.active !== false) await chrome.tabs.update(tabId, { active: true });
    return tabSummary(await chrome.tabs.get(tabId));
  }
  throw new Error(`Unknown tabs action: ${action}`);
}

// ── Page ──────────────────────────────────────────────────────────────────────
async function executePage(args) {
  const action = args.action;
  const tab = args.tabId === undefined
    ? await getActiveTab()
    : await chrome.tabs.get(Number(args.tabId));
  const tabId = tab.id;
  if (tabId === undefined) throw new Error("No target tab id");

  // Wait for tab to be ready before injecting scripts
  await waitForTabReady(tabId);

  if (action === "scroll") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (direction, amount) => {
        const val = amount || 500;
        if (direction === "up")     window.scrollBy(0, -val);
        else if (direction === "down")   window.scrollBy(0, val);
        else if (direction === "top")    window.scrollTo(0, 0);
        else if (direction === "bottom") window.scrollTo(0, document.body.scrollHeight);
        return { scrolled: true, direction, position: window.scrollY };
      },
      args: [args.direction || "down", args.amount || 500]
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
          const tag = el.tagName.toLowerCase();
          const role = el.getAttribute("role") || "";
          return ["a", "button", "input", "select", "textarea"].includes(tag)
            || el.hasAttribute("onclick")
            || ["button", "link", "checkbox", "menuitem", "tab", "radio"].includes(role);
        };

        const isVisible = (el) => {
          const st = window.getComputedStyle(el);
          return st.display !== "none"
            && st.visibility !== "hidden"
            && parseFloat(st.opacity) > 0;
        };

        const walk = (node, depth = 0) => {
          if (depth > 15) return "";
          if (node.nodeType === 3) {
            const text = node.textContent.trim();
            return text.length > 2 ? text : "";
          }
          if (node.nodeType !== 1) return "";

          const tag = node.tagName.toLowerCase();
          if (["script", "style", "noscript", "svg", "path", "head", "meta", "link"].includes(tag)) return "";
          if (!isVisible(node)) return "";

          const children = Array.from(node.childNodes)
            .map(c => walk(c, depth + 1))
            .filter(Boolean)
            .join(" ");

          if (isInteractive(node)) {
            const label = node.getAttribute("aria-label") || node.title || node.placeholder || children || "";
            const href = node.getAttribute("href") || "";
            return `\n[${tag.toUpperCase()}${href ? " href=" + href : ""}: ${label.slice(0, 80)}]\n`;
          }
          if (["h1","h2","h3","h4"].includes(tag)) return `\n## ${children}\n`;
          if (tag === "p" && children.length > 10) return `\n${children}\n`;
          return children;
        };

        return {
          url: location.href,
          title: document.title,
          content: walk(document.body)
            .replace(/\s{3,}/g, " ")
            .replace(/\n{3,}/g, "\n\n")
            .trim()
            .slice(0, 12000)
        };
      }
    });
    return result?.result;
  }

  if (action === "read") {
    const maxChars = Number.isFinite(Number(args.maxChars)) ? Number(args.maxChars) : 12000;
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (limit) => {
        const selection = String(window.getSelection?.() || "");
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

  if (action === "get_elements") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.querySelectorAll(".moon-label").forEach(el => el.remove());

        const selectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [onclick], [tabindex]:not([tabindex="-1"])';
        const interactive = Array.from(document.querySelectorAll(selectors));
        let idCounter = 1;
        const map = [];

        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          // Strict visibility: must be in viewport, visible, and have size
          const inViewport = rect.width > 4 && rect.height > 4
            && rect.top >= -2 && rect.left >= -2
            && rect.bottom <= (window.innerHeight + 2)
            && rect.right <= (window.innerWidth + 2);

          if (!inViewport) continue;
          if (style.display === "none" || style.visibility === "hidden") continue;
          if (parseFloat(style.opacity) < 0.1) continue;
          if (style.pointerEvents === "none") continue;

          const id = idCounter++;
          el.setAttribute("data-moon-id", String(id));

          const label = document.createElement("div");
          label.className = "moon-label";
          label.textContent = String(id);
          label.style.cssText = [
            "position:fixed",
            `top:${rect.top}px`,
            `left:${rect.left}px`,
            "background:#fbbf24",
            "color:#000",
            "font-size:10px",
            "font-weight:bold",
            "padding:1px 4px",
            "border-radius:3px",
            "z-index:2147483647",
            "pointer-events:none",
            "border:1px solid rgba(0,0,0,0.6)",
            "line-height:1.4",
            "font-family:monospace"
          ].join(";");
          document.body.appendChild(label);

          map.push({
            id,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent?.trim() || el.value || "").slice(0, 40),
            placeholder: el.placeholder || undefined,
            type: el.type || undefined,
            ariaLabel: el.getAttribute("aria-label") || undefined
          });

          if (map.length >= 100) break;
        }
        return map;
      }
    });
    return result?.result;
  }

  if (action === "click") {
    if (!args.selector) throw new Error("click requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    await injectOverlay(tabId, `Clicking ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { clicked: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 120));
        const rect = el.getBoundingClientRect();
        if (window.__moon_move_cursor) {
          await window.__moon_move_cursor(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            "hand"
          );
        }
        el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent("mouseup",   { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent("click",     { bubbles: true, cancelable: true, view: window }));
        return { clicked: true, selector, text: el.textContent?.trim().slice(0, 200) || "" };
      },
      args: [selector]
    });
    return result?.result;
  }

  if (action === "hover") {
    if (!args.selector) throw new Error("hover requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    await injectOverlay(tabId, `Hovering ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { hovered: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 80));
        const rect = el.getBoundingClientRect();
        if (window.__moon_move_cursor) {
          await window.__moon_move_cursor(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            "arrow"
          );
        }
        el.dispatchEvent(new MouseEvent("mouseover",  { bubbles: true, cancelable: true, view: window }));
        el.dispatchEvent(new MouseEvent("mouseenter", { bubbles: true, cancelable: true, view: window }));
        return { hovered: true, selector };
      },
      args: [selector]
    });
    return result?.result;
  }

  if (action === "type") {
    if (!args.selector) throw new Error("type requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    await injectOverlay(tabId, `Typing into ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, text, append) => {
        const el = document.querySelector(selector);
        if (!el) return { typed: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        await new Promise(r => setTimeout(r, 80));
        const rect = el.getBoundingClientRect();
        if (window.__moon_move_cursor) {
          await window.__moon_move_cursor(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
            "type"
          );
        }
        el.focus?.();

        // Support both native inputs and contenteditable
        if ("value" in el) {
          el.value = append ? (el.value + text) : text;
        } else if (el.isContentEditable) {
          el.textContent = append ? (el.textContent + text) : text;
        } else {
          el.textContent = text;
        }

        el.dispatchEvent(new InputEvent("input",  { bubbles: true, inputType: "insertText", data: text }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { typed: true, selector, length: text.length };
      },
      args: [selector, args.text ?? "", args.append === true]
    });
    return result?.result;
  }

  if (action === "press_key") {
    if (!args.key) throw new Error("press_key requires key");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (key, modifiers) => {
        const target = document.activeElement || document.body;
        const opts = {
          key,
          bubbles: true,
          cancelable: true,
          ctrlKey:  modifiers.includes("ctrl"),
          shiftKey: modifiers.includes("shift"),
          altKey:   modifiers.includes("alt"),
          metaKey:  modifiers.includes("meta")
        };
        target.dispatchEvent(new KeyboardEvent("keydown",  opts));
        target.dispatchEvent(new KeyboardEvent("keypress", opts));
        target.dispatchEvent(new KeyboardEvent("keyup",    opts));

        // Handle Enter on forms and submit buttons
        if (key === "Enter" && target.tagName === "INPUT") {
          const form = target.closest("form");
          if (form) {
            const submit = form.querySelector('[type="submit"]');
            if (submit) submit.click();
            else form.submit?.();
          }
        }
        return { pressed: key };
      },
      args: [args.key, args.modifiers || []]
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

  if (action === "wait") {
    const ms = Math.min(Number(args.ms) || 1000, 15000);
    await new Promise(r => setTimeout(r, ms));
    return { waited: ms };
  }

  throw new Error(`Unknown page action: ${action}`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function resolveSelector(tabId, selector) {
  // If selector looks like a moon numeric id (#123), resolve to data attribute
  if (/^#\d+$/.test(selector)) {
    const id = selector.slice(1);
    const [res] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (id) => {
        const el = document.querySelector(`[data-moon-id="${id}"]`);
        return el ? `[data-moon-id="${id}"]` : null;
      },
      args: [id]
    });
    return res?.result || selector;
  }
  return selector;
}

async function waitForTabReady(tabId, timeoutMs = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") return;
    } catch { return; }
    await new Promise(r => setTimeout(r, 200));
  }
}

async function evaluateWithDebugger(tabId, expression) {
  const target = { tabId };
  const alreadyAttached = debuggerAttachedTabs.has(tabId);
  let attached = false;

  try {
    if (!alreadyAttached) {
      await chrome.debugger.attach(target, "1.3");
      debuggerAttachedTabs.add(tabId);
      attached = true;
    }
    const response = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    });
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Evaluation error");
    }
    return response.result?.value ?? response.result ?? null;
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
        debuggerAttachedTabs.delete(tabId);
      } catch { /* already detached */ }
    }
  }
}

async function getConsoleLogs(tabId) {
  const target = { tabId };
  const alreadyAttached = debuggerAttachedTabs.has(tabId);
  let attached = false;
  const logs = [];

  try {
    if (!alreadyAttached) {
      await chrome.debugger.attach(target, "1.3");
      debuggerAttachedTabs.add(tabId);
      attached = true;
    }

    // Collect via Runtime instead of deprecated Log domain
    const response = await chrome.debugger.sendCommand(target, "Runtime.evaluate", {
      expression: `(function(){
        const logs = window.__moon_logs || [];
        return JSON.stringify(logs.slice(-100));
      })()`,
      returnByValue: true,
      userGesture: false
    });

    if (response.result?.value) {
      try {
        const parsed = JSON.parse(response.result.value);
        logs.push(...parsed);
      } catch { /* ignore parse errors */ }
    }

    return { logs, count: logs.length };
  } catch (e) {
    return { logs: [], error: e.message };
  } finally {
    if (attached) {
      try {
        await chrome.debugger.detach(target);
        debuggerAttachedTabs.delete(tabId);
      } catch { /* already detached */ }
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
  const id = Number(args.tabId);
  if (!Number.isFinite(id)) throw new Error("tabId must be a number");
  return id;
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

// Overlay is injected once and reused; message updates in-place
const overlayInjectedTabs = new Set();

async function injectOverlay(tabId, message = "Moon Controlling") {
  const arrowUrl = chrome.runtime.getURL("cursors/arrow.cur");
  const handUrl  = chrome.runtime.getURL("cursors/hand.cur");
  const typeUrl  = chrome.runtime.getURL("cursors/ibeam.cur");

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, arrowUrl, handUrl, typeUrl) => {
      const OVERLAY_ID = "mooncli-overlay";
      const CURSOR_ID  = "moon-visual-cursor";
      const BANNER_ID  = "mooncli-banner";

      // ── Banner ────────────────────────────────────────────────────────────
      let banner = document.getElementById(BANNER_ID);
      if (!banner) {
        banner = document.createElement("div");
        banner.id = BANNER_ID;
        banner.style.cssText = [
          "position:fixed",
          "top:12px",
          "right:12px",
          "background:rgba(15,23,42,0.92)",
          "color:#fff",
          "padding:7px 14px",
          "border-radius:10px",
          "font-family:'Inter',system-ui,sans-serif",
          "font-size:13px",
          "font-weight:500",
          "z-index:2147483647",
          "border:1px solid #0ea5e9",
          "box-shadow:0 8px 20px rgba(0,0,0,0.35)",
          "backdrop-filter:blur(8px)",
          "display:flex",
          "align-items:center",
          "gap:8px",
          "transition:opacity 0.3s",
          "pointer-events:none"
        ].join(";");

        const dot = document.createElement("span");
        dot.id = "mooncli-dot";
        dot.style.cssText = "display:inline-block;width:8px;height:8px;background:#0ea5e9;border-radius:50%;box-shadow:0 0 8px #0ea5e9;flex-shrink:0;";
        banner.appendChild(dot);

        const txt = document.createElement("span");
        txt.id = "mooncli-txt";
        banner.appendChild(txt);

        document.body.appendChild(banner);
      }

      // Add pulse bar (once)
      if (!document.getElementById("mooncli-bar")) {
        const bar = document.createElement("div");
        bar.id = "mooncli-bar";
        bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:3px;background:#0ea5e9;z-index:2147483646;pointer-events:none;";
        document.body.appendChild(bar);
        if (!document.getElementById("mooncli-style")) {
          const s = document.createElement("style");
          s.id = "mooncli-style";
          s.textContent = "@keyframes mooncli-pulse{0%,100%{opacity:1}50%{opacity:0.3}}#mooncli-bar{animation:mooncli-pulse 1.8s ease-in-out infinite;}";
          document.head.appendChild(s);
        }
      }

      // Update message
      const txtEl = document.getElementById("mooncli-txt");
      if (txtEl) txtEl.textContent = msg;

      // Clear previous auto-hide timer
      if (window.__mooncli_hide) clearTimeout(window.__mooncli_hide);
      banner.style.opacity = "1";

      window.__mooncli_hide = setTimeout(() => {
        const b = document.getElementById(BANNER_ID);
        const bar = document.getElementById("mooncli-bar");
        if (b) b.style.opacity = "0";
        setTimeout(() => {
          b?.remove();
          bar?.remove();
          document.getElementById("mooncli-style")?.remove();
        }, 300);
      }, 6000);

      // ── Cursor ────────────────────────────────────────────────────────────
      let cursor = document.getElementById(CURSOR_ID);
      if (!cursor) {
        cursor = document.createElement("img");
        cursor.id = CURSOR_ID;
        cursor.src = arrowUrl;
        cursor.style.cssText = [
          "position:fixed",
          `top:${window.innerHeight / 2}px`,
          `left:${window.innerWidth / 2}px`,
          "width:28px",
          "height:28px",
          "pointer-events:none",
          "z-index:2147483647",
          "transition:top 0.35s cubic-bezier(.4,0,.2,1),left 0.35s cubic-bezier(.4,0,.2,1)",
          "will-change:top,left"
        ].join(";");
        document.body.appendChild(cursor);
      }

      window.__moon_move_cursor = (x, y, type = "arrow") => new Promise((resolve) => {
        const cur = document.getElementById(CURSOR_ID);
        if (!cur) { resolve(); return; }
        cur.src = type === "hand" ? handUrl : type === "type" ? typeUrl : arrowUrl;
        // Use fixed positioning (no scrollY offset needed)
        cur.style.top  = y + "px";
        cur.style.left = x + "px";
        setTimeout(resolve, 380);
      });
    },
    args: [message, arrowUrl, handUrl, typeUrl]
  });
}
