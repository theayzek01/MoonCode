const BRIDGE_URL = "ws://127.0.0.1:3133/ws";
const VERSION = "1.34.0-browser-pro";
const HEARTBEAT_INTERVAL_MS = 30000;
const RECONNECT_DELAY_MS = 3000;
const COMMAND_TIMEOUT_MS = 12000;
const MAX_TABS_RETURNED = 80;
const ALARM_NAME = "mooncode-bridge-reconnect";

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
      const result = await withTimeout(executeCommand(message.action, message.args || {}), COMMAND_TIMEOUT_MS, message.action);
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
    capabilities: ["tabs", "page", "debugger", "screenshot", "scroll", "smart_scroll",
      "console_logs", "read_dom", "hover", "drag", "upload_file", "press_key", "get_elements", "evaluate", "clear_ui"]
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
  chrome.action.setTitle({ title: `MoonCode Browser Bridge: ${title}` });
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
    return tabs.slice(0, MAX_TABS_RETURNED).map(tabSummary);
  }
  if (action === "active") {
    return tabSummary(await getActiveTab());
  }
  if (action === "open") {
    if (!args.url) throw new Error("open requires url");
    const tab = await chrome.tabs.create({ url: args.url, active: args.active !== false });
    return tabSummary(tab);
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
    await chrome.tabs.update(tabId, { url: args.url, active: args.active !== false });
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
  assertScriptableTab(tab);

  // Only script actions need the document to be ready. Avoid blocking lightweight actions.
  if (!["screenshot", "wait"].includes(action)) await waitForTabReady(tabId, 2500);

  if (action === "scroll") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (direction, amount) => {
        const val = Math.max(1, Math.min(Number(amount) || 500, 5000));
        const before = { x: window.scrollX, y: window.scrollY };

        const isScrollable = (el) => {
          if (!el || el === document.body || el === document.documentElement) return false;
          const st = getComputedStyle(el);
          const canY = /(auto|scroll|overlay)/.test(st.overflowY) && el.scrollHeight > el.clientHeight + 2;
          const canX = /(auto|scroll|overlay)/.test(st.overflowX) && el.scrollWidth > el.clientWidth + 2;
          return canY || canX;
        };
        const center = document.elementFromPoint(window.innerWidth / 2, window.innerHeight / 2);
        let target = center;
        while (target && !isScrollable(target)) target = target.parentElement;

        const scrollTarget = target || window;
        if (direction === "up") scrollTarget.scrollBy?.(0, -val);
        else if (direction === "down") scrollTarget.scrollBy?.(0, val);
        else if (direction === "left") scrollTarget.scrollBy?.(-val, 0);
        else if (direction === "right") scrollTarget.scrollBy?.(val, 0);
        else if (direction === "top") target ? (target.scrollTop = 0) : window.scrollTo(window.scrollX, 0);
        else if (direction === "bottom") target ? (target.scrollTop = target.scrollHeight) : window.scrollTo(window.scrollX, document.documentElement.scrollHeight || document.body.scrollHeight);
        else throw new Error(`Unknown scroll direction: ${direction}`);

        return {
          scrolled: true,
          direction,
          target: target ? cssPath(target) : "window",
          before,
          after: target ? { x: target.scrollLeft, y: target.scrollTop } : { x: window.scrollX, y: window.scrollY }
        };

        function cssPath(el) {
          if (!el || !el.tagName) return "window";
          if (el.id) return `#${CSS.escape(el.id)}`;
          const cls = String(el.className || "").trim().split(/\s+/).filter(Boolean).slice(0, 2).map(c => `.${CSS.escape(c)}`).join("");
          return `${el.tagName.toLowerCase()}${cls}`;
        }
      },
      args: [args.direction || "down", args.amount || 500]
    });
    return result?.result;
  }

  if (action === "console_logs") {
    return getConsoleLogs(tabId);
  }

  if (action === "read_dom") {
    const maxChars = Math.max(300, Math.min(Number.isFinite(Number(args.maxChars)) ? Number(args.maxChars) : 3500, 9000));
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (limit) => {
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

        let visited = 0;
        const walk = (node, depth = 0) => {
          if (++visited > 900 || depth > 10) return "";
          if (node.nodeType === 3) {
            const text = node.textContent.trim();
            return text.length > 2 ? text : "";
          }
          if (node.nodeType !== 1) return "";

          const tag = node.tagName.toLowerCase();
          if (["script", "style", "noscript", "svg", "path", "head", "meta", "link"].includes(tag)) return "";
          if (!isVisible(node)) return "";

          const children = Array.from(node.childNodes).slice(0, 80)
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
            .slice(0, limit)
        };
      },
      args: [maxChars]
    });
    return result?.result;
  }

  if (action === "read") {
    const maxChars = Math.max(300, Math.min(Number.isFinite(Number(args.maxChars)) ? Number(args.maxChars) : 3000, 9000));
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (limit) => {
        const selection = String(window.getSelection?.() || "").trim();
        const visibleText = [];
        const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, {
          acceptNode(node) {
            const value = node.nodeValue?.replace(/\s+/g, " ").trim();
            if (!value || value.length < 2) return NodeFilter.FILTER_REJECT;
            const parent = node.parentElement;
            if (!parent || ["SCRIPT", "STYLE", "NOSCRIPT", "SVG"].includes(parent.tagName)) return NodeFilter.FILTER_REJECT;
            const style = getComputedStyle(parent);
            if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
          }
        });
        let total = 0;
        while (walker.nextNode() && total < limit + 400) {
          const value = walker.currentNode.nodeValue.replace(/\s+/g, " ").trim();
          visibleText.push(value);
          total += value.length + 1;
        }
        const text = visibleText.join("\n");
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
    const maxElements = Math.max(1, Math.min(Number.isFinite(Number(args.maxElements)) ? Number(args.maxElements) : 40, 80));
    const showLabels = args.showLabels === true;
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (maxElements, showLabels) => {
        document.querySelectorAll(".moon-label").forEach(el => el.remove());
        if (window.__moon_labels_cleanup) clearTimeout(window.__moon_labels_cleanup);

        const selectors = 'a, button, input, select, textarea, [role="button"], [role="link"], [role="checkbox"], [role="menuitem"], [onclick], [tabindex]:not([tabindex="-1"])';
        const interactive = Array.from(document.querySelectorAll(selectors));
        let idCounter = 1;
        const map = [];

        for (const el of interactive) {
          const rect = el.getBoundingClientRect();
          const style = window.getComputedStyle(el);

          // Visibility: include partially visible controls so edge UI is not missed.
          const inViewport = rect.width > 4 && rect.height > 4
            && rect.bottom >= 0 && rect.right >= 0
            && rect.top <= window.innerHeight
            && rect.left <= window.innerWidth;

          if (!inViewport) continue;
          if (style.display === "none" || style.visibility === "hidden") continue;
          if (parseFloat(style.opacity) < 0.1) continue;
          if (style.pointerEvents === "none") continue;

          const id = idCounter++;
          el.setAttribute("data-moon-id", String(id));

          if (showLabels) {
            const label = document.createElement("div");
            label.className = "moon-label";
            label.textContent = String(id);
            label.style.cssText = [
              "position:fixed",
              `top:${Math.max(0, Math.min(rect.top, window.innerHeight - 18))}px`,
              `left:${Math.max(0, Math.min(rect.left, window.innerWidth - 28))}px`,
              "transform:translate(-2px,-2px)",
              "background:rgba(31,41,55,0.86)",
              "color:#f8fafc",
              "font-size:10px",
              "font-weight:700",
              "padding:1px 5px",
              "border-radius:999px",
              "z-index:2147483647",
              "pointer-events:none",
              "border:1px solid rgba(255,255,255,0.22)",
              "box-shadow:0 3px 10px rgba(0,0,0,0.18)",
              "line-height:1.25",
              "font-family:ui-monospace,SFMono-Regular,Menlo,monospace"
            ].join(";");
            (document.body || document.documentElement).appendChild(label);
          }

          map.push({
            id,
            tag: el.tagName.toLowerCase(),
            text: (el.textContent?.trim() || el.value || "").replace(/\s+/g, " ").slice(0, 60),
            placeholder: el.placeholder || undefined,
            type: el.type || undefined,
            ariaLabel: el.getAttribute("aria-label") || undefined,
            title: el.title || undefined,
            disabled: !!el.disabled || el.getAttribute("aria-disabled") === "true",
            rect: { x: Math.round(rect.left), y: Math.round(rect.top), w: Math.round(rect.width), h: Math.round(rect.height) }
          });

          if (map.length >= maxElements) break;
        }
        if (showLabels) {
          window.__moon_labels_cleanup = setTimeout(() => {
            document.querySelectorAll(".moon-label").forEach(el => el.remove());
          }, 10000);
        }
        return map;
      },
      args: [maxElements, showLabels]
    });
    return result?.result;
  }

  if (action === "click") {
    if (!args.selector) throw new Error("click requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    if (args.visual === true) await injectOverlay(tabId, `Clicking ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, visual) => {
        const el = document.querySelector(selector);
        if (!el) return { clicked: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        await new Promise(r => setTimeout(r, 20));
        const rect = el.getBoundingClientRect();
        if (visual && window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2, rect.top + rect.height / 2, "hand");
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup"]) {
          el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy }));
        }
        if (typeof el.click === "function") el.click();
        else el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, view: window, clientX: cx, clientY: cy }));
        return { clicked: true, selector, text: el.textContent?.trim().slice(0, 120) || "" };
      },
      args: [selector, args.visual === true]
    });
    return result?.result;
  }

  if (action === "hover") {
    if (!args.selector) throw new Error("hover requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    if (args.visual === true) await injectOverlay(tabId, `Hovering ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, visual) => {
        const el = document.querySelector(selector);
        if (!el) return { hovered: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        await new Promise(r => setTimeout(r, 20));
        const rect = el.getBoundingClientRect();
        if (visual && window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2, rect.top + rect.height / 2, "arrow");
        for (const type of ["pointerover", "pointerenter", "mouseover", "mouseenter"]) {
          el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window }));
        }
        return { hovered: true, selector };
      },
      args: [selector, args.visual === true]
    });
    return result?.result;
  }

  if (action === "type") {
    if (!args.selector) throw new Error("type requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    if (args.visual === true) await injectOverlay(tabId, `Typing into ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, text, append, visual) => {
        const el = document.querySelector(selector);
        if (!el) return { typed: false, reason: "selector not found" };
        el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        await new Promise(r => setTimeout(r, 20));
        const rect = el.getBoundingClientRect();
        if (visual && window.__moon_move_cursor) await window.__moon_move_cursor(rect.left + rect.width / 2, rect.top + rect.height / 2, "type");
        el.focus?.();
        const nextValue = append ? (("value" in el ? el.value : el.textContent) || "") + text : text;
        if ("value" in el) {
          const proto = el instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
          setter ? setter.call(el, nextValue) : (el.value = nextValue);
        } else if (el.isContentEditable) {
          el.textContent = nextValue;
        } else {
          el.textContent = nextValue;
        }
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: text }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { typed: true, selector, length: text.length };
      },
      args: [selector, args.text ?? "", args.append === true, args.visual === true]
    });
    return result?.result;
  }

  if (action === "drag") {
    if (!args.selector || !args.targetSelector) throw new Error("drag requires selector and targetSelector");
    const selector = await resolveSelector(tabId, args.selector);
    const targetSelector = await resolveSelector(tabId, args.targetSelector);
    if (args.visual === true) await injectOverlay(tabId, `Dragging ${selector}`);
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: async (selector, targetSelector, visual) => {
        const source = document.querySelector(selector);
        const target = document.querySelector(targetSelector);
        if (!source) return { dragged: false, reason: "source not found" };
        if (!target) return { dragged: false, reason: "target not found" };
        source.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        target.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        await new Promise(r => setTimeout(r, 30));
        const dataTransfer = new DataTransfer();
        const s = source.getBoundingClientRect();
        const t = target.getBoundingClientRect();
        if (visual && window.__moon_move_cursor) {
          await window.__moon_move_cursor(s.left + s.width / 2, s.top + s.height / 2, "hand");
          await window.__moon_move_cursor(t.left + t.width / 2, t.top + t.height / 2, "hand");
        }
        source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer }));
        target.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer }));
        target.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer }));
        target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
        source.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer }));
        return { dragged: true, selector, targetSelector };
      },
      args: [selector, targetSelector, args.visual === true]
    });
    return result?.result;
  }

  if (action === "upload_file") {
    if (!args.selector) throw new Error("upload_file requires selector");
    const selector = await resolveSelector(tabId, args.selector);
    const files = Array.isArray(args.filePaths) ? args.filePaths.map(String) : args.filePath ? [String(args.filePath)] : [];
    if (files.length === 0) throw new Error("upload_file requires filePath or filePaths");
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { ready: false, reason: "selector not found" };
        if (el.tagName !== "INPUT" || el.type !== "file") return { ready: false, reason: "selector is not input[type=file]" };
        el.scrollIntoView({ behavior: "instant", block: "center", inline: "center" });
        return { ready: true, multiple: !!el.multiple };
      },
      args: [selector]
    });
    if (!result?.result?.ready) return { uploaded: false, selector, reason: result?.result?.reason || "input not ready" };
    const didAttach = await attachDebugger(tabId);
    try {
      await chrome.debugger.sendCommand({ tabId }, "DOM.enable", {});
      const doc = await chrome.debugger.sendCommand({ tabId }, "DOM.getDocument", { depth: -1, pierce: true });
      const found = await chrome.debugger.sendCommand({ tabId }, "DOM.querySelector", { nodeId: doc.root.nodeId, selector });
      if (!found.nodeId) throw new Error("file input not found by debugger");
      await chrome.debugger.sendCommand({ tabId }, "DOM.setFileInputFiles", { nodeId: found.nodeId, files });
    } finally {
      if (didAttach) await detachDebugger(tabId);
    }
    const [after] = await chrome.scripting.executeScript({
      target: { tabId },
      func: (selector) => {
        const el = document.querySelector(selector);
        if (!el) return { changed: false };
        el.dispatchEvent(new Event("input", { bubbles: true }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
        return { changed: true, files: el.files?.length || 0 };
      },
      args: [selector]
    });
    return { uploaded: true, selector, files: files.length, page: after?.result };
  }

  if (action === "clear_ui") {
    const [result] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        document.querySelectorAll(".moon-label,#mooncode-overlay,#moon-visual-cursor,#mooncode-banner,#mooncode-bar,#mooncode-style").forEach(el => el.remove());
        if (window.__mooncode_hide) clearTimeout(window.__mooncode_hide);
        if (window.__moon_labels_cleanup) clearTimeout(window.__moon_labels_cleanup);
        return { cleared: true };
      }
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
    const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: "jpeg", quality: 70 });
    return { tabId, dataUrl, format: "jpeg", quality: 70 };
  }

  if (action === "evaluate") {
    if (!args.script) throw new Error("evaluate requires script");
    return evaluateInPage(tabId, String(args.script));
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

async function evaluateInPage(tabId, expression) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (source) => {
      try {
        const value = await (0, eval)(source);
        return { ok: true, value: makeSerializable(value) };
      } catch (error) {
        return { ok: false, error: error?.message || String(error) };
      }
    },
    args: [expression]
  });
  const payload = result?.result;
  if (!payload?.ok) throw new Error(payload?.error || "Evaluation error");
  return payload.value;
}

async function getConsoleLogs(tabId) {
  const [result] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      if (!window.__moon_console_hooked) {
        window.__moon_console_hooked = true;
        window.__moon_logs = window.__moon_logs || [];
        for (const level of ["log", "info", "warn", "error", "debug"]) {
          const original = console[level]?.bind(console);
          if (!original) continue;
          console[level] = (...items) => {
            try {
              window.__moon_logs.push({ level, time: new Date().toISOString(), text: items.map(String).join(" ").slice(0, 1000) });
              window.__moon_logs = window.__moon_logs.slice(-100);
            } catch { /* ignore */ }
            original(...items);
          };
        }
      }
      return { logs: (window.__moon_logs || []).slice(-100), count: (window.__moon_logs || []).length };
    }
  });
  return result?.result || { logs: [], count: 0 };
}

function makeSerializable(value) {
  if (value === undefined) return null;
  if (value === null || ["string", "number", "boolean"].includes(typeof value)) return value;
  try { return JSON.parse(JSON.stringify(value)); } catch { return String(value); }
}

function assertScriptableTab(tab) {
  const url = tab?.url || "";
  if (!url) return;
  if (/^(chrome|edge|brave|opera|vivaldi|about|devtools):/i.test(url)) {
    throw new Error(`This browser page cannot be automated by extensions: ${url}`);
  }
  if (/^chrome-extension:/i.test(url) && !url.startsWith(chrome.runtime.getURL(""))) {
    throw new Error("Cannot automate another extension page");
  }
}

function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); }
    );
  });
}

async function attachDebugger(tabId) {
  if (debuggerAttachedTabs.has(tabId)) return false;
  await chrome.debugger.attach({ tabId }, "1.3");
  debuggerAttachedTabs.add(tabId);
  return true;
}

async function detachDebugger(tabId) {
  try { await chrome.debugger.detach({ tabId }); } catch { /* already detached */ }
  debuggerAttachedTabs.delete(tabId);
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

async function injectOverlay(tabId, message = "MoonCode controlling") {
  const arrowUrl = chrome.runtime.getURL("cursors/arrow.cur");
  const handUrl  = chrome.runtime.getURL("cursors/hand.cur");
  const typeUrl  = chrome.runtime.getURL("cursors/ibeam.cur");

  await chrome.scripting.executeScript({
    target: { tabId },
    func: (msg, arrowUrl, handUrl, typeUrl) => {
      const OVERLAY_ID = "mooncode-overlay";
      const CURSOR_ID  = "moon-visual-cursor";
      const BANNER_ID  = "mooncode-banner";

      // ── Banner ────────────────────────────────────────────────────────────
      let banner = document.getElementById(BANNER_ID);
      if (!banner) {
        banner = document.createElement("div");
        banner.id = BANNER_ID;
        banner.style.cssText = [
          "position:fixed",
          "top:10px",
          "right:10px",
          "background:linear-gradient(135deg,rgba(42,29,32,0.90),rgba(27,21,23,0.86))",
          "color:#eadbd5",
          "padding:6px 10px",
          "border-radius:999px",
          "font-family:'Inter',system-ui,sans-serif",
          "font-size:12px",
          "font-weight:600",
          "z-index:2147483647",
          "border:1px solid rgba(208,138,122,0.35)",
          "box-shadow:0 10px 26px rgba(0,0,0,0.26),0 0 28px rgba(208,138,122,0.10)",
          "backdrop-filter:blur(8px)",
          "display:flex",
          "align-items:center",
          "gap:8px",
          "transition:opacity 0.3s",
          "pointer-events:none"
        ].join(";");

        const dot = document.createElement("span");
        dot.id = "mooncode-dot";
        dot.style.cssText = "display:inline-block;width:8px;height:8px;background:#d08a7a;border-radius:50%;box-shadow:0 0 10px #d08a7a;flex-shrink:0;";
        banner.appendChild(dot);

        const txt = document.createElement("span");
        txt.id = "mooncode-txt";
        banner.appendChild(txt);

        (document.body || document.documentElement).appendChild(banner);
      }

      // Add pulse bar (once)
      if (!document.getElementById("mooncode-bar")) {
        const bar = document.createElement("div");
        bar.id = "mooncode-bar";
        bar.style.cssText = "position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,#3a2628,#d08a7a,#d6b08a);z-index:2147483646;pointer-events:none;";
        (document.documentElement || document.body).appendChild(bar);
        if (!document.getElementById("mooncode-style")) {
          const s = document.createElement("style");
          s.id = "mooncode-style";
          s.textContent = "@keyframes mooncode-pulse{0%,100%{opacity:1}50%{opacity:0.3}}#mooncode-bar{animation:mooncode-pulse 1.8s ease-in-out infinite;}";
          document.head.appendChild(s);
        }
      }

      // Update message
      const txtEl = document.getElementById("mooncode-txt");
      if (txtEl) txtEl.textContent = msg;

      // Clear previous auto-hide timer
      if (window.__mooncode_hide) clearTimeout(window.__mooncode_hide);
      banner.style.opacity = "1";

      window.__mooncode_hide = setTimeout(() => {
        const b = document.getElementById(BANNER_ID);
        const bar = document.getElementById("mooncode-bar");
        if (b) b.style.opacity = "0";
        setTimeout(() => {
          b?.remove();
          bar?.remove();
          document.getElementById("mooncode-style")?.remove();
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
        (document.body || document.documentElement).appendChild(cursor);
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
