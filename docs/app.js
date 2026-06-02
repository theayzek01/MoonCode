const docContent = document.getElementById("doc-content");
const pageTitle = document.getElementById("page-title");
const pageSummary = document.getElementById("page-summary");
const pageToc = document.getElementById("page-toc");
const editOnGitHub = document.getElementById("edit-on-github");
const docBottomNav = document.getElementById("doc-bottom-nav");
const searchInput = document.getElementById("doc-search");
const scrollTopButton = document.getElementById("scroll-top");
const themeToggler = document.getElementById("theme-toggler");
const langSelector = document.getElementById("lang-selector");
const hamburgerMenu = document.getElementById("hamburger-menu");
const leftSidebar = document.getElementById("left-sidebar");
const sidebarBackdrop = document.getElementById("sidebar-backdrop");
const sidebarLinks = [...document.querySelectorAll(".sidebar-link")];

// Theme & Language State Management (English-First by Default)
let currentTheme = localStorage.getItem("mooncode-docs-theme") || "dark";
let currentLang = localStorage.getItem("mooncode-docs-lang") || "en";

const docsOrder = [
  "INTRODUCTION.md",
  "MOONCODE_DEEP_DIVE.md",
  "ARCHITECTURE.md",
  "PROJECT_STRUCTURE.md",
  "PHILOSOPHY.md",
  "AGENTS.md",
  "QUALITY_GATE.md",
  "BENCHMARKS.md",
  "integrations/CODEX.md",
  "integrations/GITHUB_CLI.md",
  "integrations/ANTHROPIC.md",
  "integrations/ANTIGRAVITY.md",
  "integrations/BROWSER_CONTROL.md",
  "integrations/BLENDER_MCP.md",
];

const docsMeta = new Map([
  [
    "INTRODUCTION.md",
    {
      tr: {
        title: "MoonAgent Nedir?",
        summary: "MoonAgent'un felsefesi, yapısı ve diğer asistanlarla karşılaştırması.",
        linkLabel: "Giriş"
      },
      en: {
        title: "What is MoonAgent?",
        summary: "Philosophy, structure and comparison with other assistants.",
        linkLabel: "Introduction"
      }
    }
  ],
  [
    "MOONCODE_DEEP_DIVE.md",
    {
      tr: {
        title: "MoonCode Derinlemesine Bakış",
        summary: "MoonCode'un nasıl yapılandırıldığı; çalışma zamanı, araçlar, TUI, MCP ve Browser Bridge bileşenlerinin nasıl çalıştığına dair eksiksiz referans kılavuzu.",
        linkLabel: "Derinlemesine Bakış"
      },
      en: {
        title: "MoonCode Deep Dive",
        summary: "The full reference for how MoonCode is structured and how the runtime, tools, TUI, MCP, and Browser Bridge fit together.",
        linkLabel: "Deep Dive"
      }
    }
  ],
  [
    "ARCHITECTURE.md",
    {
      tr: {
        title: "Mimari",
        summary: "Çalışma alanları, çalışma zamanı akışı ve projedeki tasarım kurallarının kısa ve yapısal bir görünümü.",
        linkLabel: "Mimari"
      },
      en: {
        title: "Architecture",
        summary: "A shorter structural view of workspaces, runtime flow, and design rules across the repo.",
        linkLabel: "Architecture"
      }
    }
  ],
  [
    "PROJECT_STRUCTURE.md",
    {
      tr: {
        title: "Proje Yapısı",
        summary: "Depo yerleşimi ve her bir üst düzey alanın hangi sorumlulukları üstlendiğine dair detaylı bir harita.",
        linkLabel: "Proje Yapısı"
      },
      en: {
        title: "Project Structure",
        summary: "A map of the repository layout and what each top-level area is responsible for.",
        linkLabel: "Project Structure"
      }
    }
  ],
  [
    "PHILOSOPHY.md",
    {
      tr: {
        title: "Felsefe",
        summary: "MoonAgent'un terminal öncelikli ve otonom çalışma tarzının arkasındaki ürün zevki ve ilkeleri.",
        linkLabel: "Felsefe"
      },
      en: {
        title: "Philosophy",
        summary: "The product taste and operating principles behind MoonAgent's terminal-first behavior.",
        linkLabel: "Philosophy"
      }
    }
  ],
  [
    "AGENTS.md",
    {
      tr: {
        title: "Ajan Talimatları",
        summary: "MoonAgent'un bir kodlama oturumu içinde çalışma kalitesi, planlama ve yürütme süreçlerini nasıl ele aldığı.",
        linkLabel: "Ajan Talimatları"
      },
      en: {
        title: "Agent Instructions",
        summary: "How MoonCode thinks about work quality, planning, and execution inside a coding session.",
        linkLabel: "Agent Instructions"
      }
    }
  ],
  [
    "QUALITY_GATE.md",
    {
      tr: {
        title: "Kalite Kapısı",
        summary: "Değişikliklerin güvenli şekilde yayına alınmasını sağlayan ve hataları azaltan pratik kontroller listesi.",
        linkLabel: "Kalite Kapısı"
      },
      en: {
        title: "Quality Gate",
        summary: "The practical checks that keep changes shippable and reduce avoidable regressions.",
        linkLabel: "Quality Gate"
      }
    }
  ],
  [
    "BENCHMARKS.md",
    {
      tr: {
        title: "Benchmark Metrikleri",
        summary: "MoonCode'un modern rakiplerine karşı hız, performans ve yetenek analizleri.",
        linkLabel: "Benchmarks"
      },
      en: {
        title: "Benchmark Metrics",
        summary: "Speed, performance, and capability analysis of MoonCode against modern competitors.",
        linkLabel: "Benchmarks"
      }
    }
  ],
  [
    "integrations/CODEX.md",
    {
      tr: { title: "Codex", summary: "OpenAI Codex modelleri entegrasyonu.", linkLabel: "Codex" },
      en: { title: "Codex", summary: "OpenAI Codex models integration.", linkLabel: "Codex" }
    }
  ],
  [
    "integrations/GITHUB_CLI.md",
    {
      tr: { title: "Github CLI", summary: "Github CLI aracı entegrasyonu.", linkLabel: "Github CLI" },
      en: { title: "Github CLI", summary: "Github CLI tool integration.", linkLabel: "Github CLI" }
    }
  ],
  [
    "integrations/ANTHROPIC.md",
    {
      tr: { title: "Anthropic", summary: "Anthropic Claude modelleri entegrasyonu.", linkLabel: "Anthropic" },
      en: { title: "Anthropic", summary: "Anthropic Claude models integration.", linkLabel: "Anthropic" }
    }
  ],
  [
    "integrations/ANTIGRAVITY.md",
    {
      tr: {
        title: "Antigravity Entegrasyonu",
        summary: "MoonCode ekosisteminin Antigravity tarafındaki entegrasyonuna ve model uyumluluğuna dair teknik notlar.",
        linkLabel: "Antigravity"
      },
      en: {
        title: "Antigravity",
        summary: "Integration notes for the Antigravity side of the MoonCode ecosystem.",
        linkLabel: "Antigravity"
      }
    }
  ],
  [
    "integrations/BROWSER_CONTROL.md",
    {
      tr: {
        title: "Browser Kontrol",
        summary: "MoonCode'un Browser Bridge ile tarayıcıları nasıl kontrol ettiği.",
        linkLabel: "Browser Kontrol"
      },
      en: {
        title: "Browser Control",
        summary: "How MoonCode controls browsers using Browser Bridge.",
        linkLabel: "Browser Control"
      }
    }
  ],
  [
    "integrations/BLENDER_MCP.md",
    {
      tr: {
        title: "Blender MCP",
        summary: "MoonCode'un Blender ile MCP üzerinden nasıl haberleştiği ve nasıl kurulduğu.",
        linkLabel: "Blender MCP"
      },
      en: {
        title: "Blender MCP",
        summary: "How MoonCode communicates with Blender via MCP and installation details.",
        linkLabel: "Blender MCP"
      }
    }
  ]
]);

const uiTranslations = {
  tr: {
    searchPlaceholder: "Dokümantasyonda ara... (Ctrl K)",
    usingTitle: "MoonAgent Kullanımı",
    usingDesc: "Terminal öncelikli dokümantasyon ve çalışma zamanı referansı",
    latestTitle: "Son dökümantasyon derlemesi · 2026.0.0-beta2",
    gettingStartedGroup: "Başlangıç",
    coreGuidesGroup: "Temel Kılavuzlar",
    integrationsGroup: "Entegrasyonlar",
    navDocs: "Belgeler",
    navArch: "Mimari",
    navStruct: "Yapı",
    heroKicker: "Dökümantasyon",
    footerDesc: "MCP, Browser Bridge, özel TUI ve aşamalı Blender iş akışlarına sahip minimal terminal kodlama ajanı.",
    footerColDocs: "Dökümantasyon",
    footerColResources: "Kaynaklar",
    footerColAbout: "Kurumsal",
    railTitle: "Bu Sayfada",
    editOnGithub: "Bu sayfayı GitHub'da düzenleyin",
    scrollTop: "Yukarı Git",
    loadingText: "Dokümantasyon yükleniyor...",
    noSectionMap: "Bölüm haritası yok",
    nextLabel: "Sonraki",
    prevLabel: "Önceki",
    failedToLoad: "Dokümantasyon yüklenemedi."
  },
  en: {
    searchPlaceholder: "Search documentation... (Ctrl K)",
    usingTitle: "Using MoonCode",
    usingDesc: "Terminal-first documentation and runtime reference",
    latestTitle: "Latest docs build · 2026.0.0-beta2",
    gettingStartedGroup: "Getting Started",
    coreGuidesGroup: "Core Guides",
    integrationsGroup: "Integrations",
    navDocs: "Docs",
    navArch: "Architecture",
    navStruct: "Structure",
    heroKicker: "Documentation",
    footerDesc: "Minimal terminal coding agent with MCP, Browser Bridge, custom TUI, and staged Blender workflows.",
    footerColDocs: "Docs",
    footerColResources: "Resources",
    footerColAbout: "About",
    railTitle: "On this page",
    editOnGithub: "Edit this page on GitHub",
    scrollTop: "Scroll to top",
    loadingText: "Loading documentation...",
    noSectionMap: "No section map",
    nextLabel: "Next",
    prevLabel: "Previous",
    failedToLoad: "Failed to load documentation."
  }
};

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

// Maps client-side request path to correct bilingual filename on disk without 404 errors
function getLocalizedDocPath(docPath, lang) {
  const englishBaseDocs = [
    "ARCHITECTURE.md",
    "PROJECT_STRUCTURE.md",
    "QUALITY_GATE.md",
    "integrations/ANTIGRAVITY.md"
  ];
  
  const singleLanguageDocs = [
    "INTRODUCTION.md",
    "integrations/CODEX.md",
    "integrations/GITHUB_CLI.md",
    "integrations/ANTHROPIC.md",
    "integrations/BROWSER_CONTROL.md"
  ];

  if (singleLanguageDocs.includes(docPath)) {
    return docPath;
  }
  
  if (lang === "en") {
    if (englishBaseDocs.includes(docPath)) {
      return docPath;
    }
    return docPath.replace(/\.md$/, ".en.md");
  } else {
    if (englishBaseDocs.includes(docPath)) {
      return docPath.replace(/\.md$/, ".tr.md");
    }
    return docPath;
  }
}

function getCurrentDoc() {
  const raw = decodeURIComponent(window.location.hash.replace(/^#/, "").trim());
  if (!raw) return "INTRODUCTION.md";
  const docPath = raw.split("::")[0];
  return docsMeta.has(docPath) ? docPath : "INTRODUCTION.md";
}

function setActiveSidebar(docPath) {
  for (const link of sidebarLinks) {
    const hashPath = decodeURIComponent(link.getAttribute("href").replace(/^#/, ""));
    link.classList.toggle("active", hashPath === docPath);
  }
}

function translateUi(lang) {
  const t = uiTranslations[lang];
  searchInput.placeholder = t.searchPlaceholder;
  document.getElementById("sidebar-card-1-title").textContent = t.usingTitle;
  document.getElementById("sidebar-card-1-desc").textContent = t.usingDesc;
  document.getElementById("sidebar-card-2-title").textContent = t.latestTitle;
  document.getElementById("group-title-getting-started").textContent = t.gettingStartedGroup;
  document.getElementById("group-title-core-guides").textContent = t.coreGuidesGroup;
  document.getElementById("group-title-integrations").textContent = t.integrationsGroup;
  document.getElementById("nav-docs-tab").textContent = t.navDocs;
  document.getElementById("nav-arch-tab").textContent = t.navArch;
  document.getElementById("nav-struct-tab").textContent = t.navStruct; // sync to link
  document.getElementById("doc-hero-kicker").textContent = t.heroKicker;
  document.getElementById("footer-desc").textContent = t.footerDesc;
  document.getElementById("footer-col-1-title").textContent = t.footerColDocs;
  document.getElementById("footer-col-2-title").textContent = t.footerColResources;
  document.getElementById("footer-col-3-title").textContent = t.footerColAbout;
  document.getElementById("right-rail-title").textContent = t.railTitle;
  editOnGitHub.textContent = t.editOnGithub;
  scrollTopButton.textContent = t.scrollTop;

  // Translate sidebar links link-labels
  for (const link of sidebarLinks) {
    const hashPath = decodeURIComponent(link.getAttribute("href").replace(/^#/, ""));
    const meta = docsMeta.get(hashPath);
    if (meta && meta[lang]) {
      const labelEl = link.querySelector(".link-label");
      if (labelEl) labelEl.textContent = meta[lang].linkLabel;
    }
  }
}

function updatePageHeader(docPath) {
  const meta = docsMeta.get(docPath);
  const langMeta = meta ? meta[currentLang] : null;
  pageTitle.textContent = langMeta?.title ?? "MoonCode Docs";
  pageSummary.textContent = langMeta?.summary ?? "";
  document.title = `${langMeta?.title ?? "MoonCode Docs"} - MoonCode Docs`;
  editOnGitHub.href = `https://github.com/theayzek01/mooncode/blob/launch/mooncode/docs/${docPath}`;
}

function buildToc() {
  pageToc.innerHTML = "";
  const headings = [...docContent.querySelectorAll("h2, h3")];
  const t = uiTranslations[currentLang];

  if (!headings.length) {
    const empty = document.createElement("span");
    empty.className = "toc-link";
    empty.textContent = t.noSectionMap;
    pageToc.appendChild(empty);
    return;
  }

  for (const heading of headings) {
    if (!heading.id) {
      heading.id = slugify(heading.textContent || "section");
    }
    const link = document.createElement("a");
    link.href = `#${getCurrentDoc()}::${heading.id}`;
    link.className = `toc-link ${heading.tagName.toLowerCase() === "h3" ? "level-3" : "level-2"}`;
    link.dataset.targetId = heading.id;
    link.textContent = heading.textContent || "";
    pageToc.appendChild(link);
  }
}

function buildBottomNav(docPath) {
  const index = docsOrder.indexOf(docPath);
  const prev = index > 0 ? docsOrder[index - 1] : null;
  const next = index >= 0 && index < docsOrder.length - 1 ? docsOrder[index + 1] : null;
  const t = uiTranslations[currentLang];

  docBottomNav.innerHTML = "";

  if (prev) {
    const meta = docsMeta.get(prev);
    const langMeta = meta ? meta[currentLang] : null;
    const link = document.createElement("a");
    link.className = "bottom-link prev";
    link.href = `#${prev}`;
    link.innerHTML = `<small>${t.prevLabel}</small><strong>${escapeHtml(langMeta?.title ?? prev)}</strong>`;
    docBottomNav.appendChild(link);
  } else {
    const spacer = document.createElement("div");
    docBottomNav.appendChild(spacer);
  }

  if (next) {
    const meta = docsMeta.get(next);
    const langMeta = meta ? meta[currentLang] : null;
    const link = document.createElement("a");
    link.className = "bottom-link next";
    link.href = `#${next}`;
    link.innerHTML = `<small>${t.nextLabel}</small><strong>${escapeHtml(langMeta?.title ?? next)}</strong>`;
    docBottomNav.appendChild(link);
  }
}

function setHeadingIds() {
  const headings = [...docContent.querySelectorAll("h1, h2, h3")];
  const used = new Set();

  for (const heading of headings) {
    const base = slugify(heading.textContent || "section");
    let id = base;
    let attempt = 2;
    while (used.has(id) || !id) {
      id = `${base || "section"}-${attempt++}`;
    }
    used.add(id);
    heading.id = id;
  }
}

// TOC dynamic highlighting
function updateTocHighlight() {
  const tocLinks = [...pageToc.querySelectorAll(".toc-link[data-target-id]")];
  if (!tocLinks.length) return;

  let activeId = tocLinks[0].dataset.targetId;
  for (const link of tocLinks) {
    const target = document.getElementById(link.dataset.targetId);
    if (!target) continue;
    const top = target.getBoundingClientRect().top;
    if (top <= 160) {
      activeId = link.dataset.targetId;
    }
  }

  for (const link of tocLinks) {
    link.classList.toggle("active", link.dataset.targetId === activeId);
  }
}

function applySearchFilter(query) {
  const normalized = query.trim().toLowerCase();
  for (const link of sidebarLinks) {
    const label = link.querySelector(".link-label")?.textContent || "";
    const visible = !normalized || label.toLowerCase().includes(normalized);
    link.toggleAttribute("data-search-hidden", !visible);
  }
}

let loadedDocPath = null;
let loadedLang = null;

async function loadDoc(docPath) {
  setActiveSidebar(docPath);
  translateUi(currentLang);
  updatePageHeader(docPath);
  
  const headingFromHash = decodeURIComponent(window.location.hash.split("::")[1] || "");

  if (loadedDocPath === docPath && loadedLang === currentLang) {
    if (headingFromHash) {
      const target = document.getElementById(headingFromHash);
      if (target) {
        requestAnimationFrame(() => {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 88;
          window.scrollTo({ top, behavior: "smooth" });
        });
      }
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    updateTocHighlight();
    return;
  }

  // Instantly reset viewport scroll to top when navigation transitions across different documents
  window.scrollTo({ top: 0, behavior: "instant" });

  loadedDocPath = docPath;
  loadedLang = currentLang;

  docContent.classList.remove("loaded");
  const t = uiTranslations[currentLang];
  docContent.innerHTML = `<div class="loading">${t.loadingText}</div>`;

  const localizedPath = getLocalizedDocPath(docPath, currentLang);

  try {
    const response = await fetch(localizedPath, { cache: "no-cache" });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const markdown = await response.text();
    let html = window.marked.parse(markdown, {
      mangle: false,
      headerIds: false,
    });
    
    // Auto-inject high-performance lazy loading for all embedded images
    html = html.replace(/<img /g, '<img loading="lazy" ');

    docContent.innerHTML = html;
    setHeadingIds();
    buildToc();
    buildBottomNav(docPath);
    updateTocHighlight();
    
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Trigger premium soft fade-in & slide-up visual layout transition
    requestAnimationFrame(() => {
      docContent.classList.add("loaded");
    });

    if (headingFromHash) {
      const target = document.getElementById(headingFromHash);
      if (target) {
        requestAnimationFrame(() => {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 88;
          window.scrollTo({ top, behavior: "smooth" });
        });
      }
    }
  } catch (error) {
    docContent.innerHTML = `
      <div class="error-box">
        <strong>${t.failedToLoad}</strong>
        <p>${escapeHtml(String(error))}</p>
      </div>
    `;
    pageToc.innerHTML = "";
    docBottomNav.innerHTML = "";
  }
}

function syncFromHash() {
  const docPath = getCurrentDoc();
  loadDoc(docPath);
}

// Search Listeners
searchInput.addEventListener("input", () => applySearchFilter(searchInput.value));
searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    searchInput.value = "";
    applySearchFilter("");
    searchInput.blur();
  }
});

document.addEventListener("keydown", (event) => {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
});

scrollTopButton.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: "smooth" });
});

// Theme Selector
function applyTheme(theme) {
  document.body.classList.toggle("light-theme", theme === "light");
  localStorage.setItem("mooncode-docs-theme", theme);
  currentTheme = theme;
}

themeToggler.addEventListener("click", () => {
  const nextTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(nextTheme);
});

// Language Selector
function applyLanguage(lang) {
  currentLang = lang;
  localStorage.setItem("mooncode-docs-lang", lang);
  
  // Update Selector active class
  const btns = langSelector.querySelectorAll(".lang-btn");
  btns.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === lang);
  });
  
  // Reload doc with new language
  const docPath = getCurrentDoc();
  loadDoc(docPath);
}

langSelector.addEventListener("click", (event) => {
  const btn = event.target.closest(".lang-btn");
  if (btn) {
    applyLanguage(btn.dataset.lang);
  }
});

// Mobile Sliding Sidebar Drawer Toggler
function toggleMobileMenu(open) {
  leftSidebar.classList.toggle("open", open);
  sidebarBackdrop.classList.toggle("open", open);
  hamburgerMenu.classList.toggle("open", open);
}

hamburgerMenu.addEventListener("click", () => {
  const open = !leftSidebar.classList.contains("open");
  toggleMobileMenu(open);
});

sidebarBackdrop.addEventListener("click", () => toggleMobileMenu(false));

// Close mobile menu on clicking any sidebar links
sidebarLinks.forEach(link => {
  link.addEventListener("click", () => {
    toggleMobileMenu(false);
  });
});

// Bootstrapping Init
applyTheme(currentTheme);
window.addEventListener("hashchange", syncFromHash);
window.addEventListener("scroll", updateTocHighlight, { passive: true });
syncFromHash();
if (window.lucide) {
  window.lucide.createIcons();
}
