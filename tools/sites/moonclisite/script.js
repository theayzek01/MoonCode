const translations = {
  tr: {
    skip: "İçeriğe geç",
    menu: "Menü",
    "nav.overview": "Genel Bakış",
    "nav.capabilities": "Yetenekler",
    "nav.install": "Kurulum",
    "nav.docs": "Dokümanlar",
    "nav.github": "GitHub",
    "header.releases": "Yayınlar",
    "header.cta": "Başlayın",
    "hero.eyebrow": "Terminal öncelikli mühendislik",
    "hero.title": "MoonCode, kodu okuyup işi bitiren yerel geliştirme yardımcısıdır.",
    "hero.lead":
      "MoonCode workspace bağlamını anlar, tarayıcıyı kontrol eder, MCP sunucularıyla konuşur ve release akışını düzenli tutar. Ağır pazarlama dili yerine çalışan bir üretim aracı sunar.",
    "hero.primary": "Kurulumu gör",
    "hero.secondary": "Kaynağı aç",
    "hero.point1": "Workspace farkındalığı",
    "hero.point2": "Browser bridge",
    "hero.point3": "MCP bağlayıcıları",
    "hero.point4": "Windows, macOS, Linux",
    "status.title": "Sistem durumu",
    "status.workspace": "Workspace",
    "status.workspaceValue": "İndeksli ve aranabilir",
    "status.browser": "Browser bridge",
    "status.browserValue": "Eklentiye hazır",
    "status.release": "Yayın akışı",
    "status.releaseValue": "Çapraz platform",
    "status.language": "Dil",
    "status.languageValue": "TR / EN",
    "terminal.ok": "Hazır: browser bridge, MCP bağlayıcıları, audit kaydı.",
    "terminal.note": "Kırık görsel yok, sabit genişlik tuzağı yok.",
    "metric1.title": "Daha az sürtünme",
    "metric1.body": "Minimal istemler, cerrahi değişiklikler ve dar tool çağrıları asistanı işe odaklı tutar.",
    "metric2.title": "Daha fazla bağlam",
    "metric2.body": "Workspace indeksleme ve semantic search doğru dosyaları, satırları ve sembolleri hızla getirir.",
    "metric3.title": "Daha güvenli otomasyon",
    "metric3.body": "Policy, audit ve approval kapıları normal akışı bozmeden riskli eylemleri korur.",
    "metric4.title": "Gerçek yayınlar",
    "metric4.body": "Aynı kod tabanı Windows, macOS ve Linux için release notlarıyla birlikte paket üretir.",
    "sidebar.title": "Hızlı bağlantılar",
    "sidebar.link1": "Neden MoonCode?",
    "sidebar.link2": "Çalışma akışı",
    "sidebar.link3": "Platform desteği",
    "sidebar.link4": "MCP ve browser",
    "sidebar.link5": "Mobil deneyim",
    "content.kicker": "Dokümantasyon özeti",
    "content.title1": "Neden bu sürüm daha iyi?",
    "content.body1":
      "Eski site düzeni masaüstü ağırlıklıydı, bazı görseller yüklenmiyordu ve İngilizce görünümde bozuk karakterler oluşuyordu. Yeni sürüm bunları temizler: gerçek içerik, düzgün encoding ve kırılmayan responsive yerleşim.",
    "feature1.title": "Responsive yerleşim",
    "feature1.body":
      "Header, kartlar ve içerik blokları küçük ekranlarda tek kolona düşer; menü ve butonlar taşmaz.",
    "feature2.title": "Temiz dil değişimi",
    "feature2.body":
      "TR / EN metinler tek sözlük üzerinden yönetilir, böylece çeviri bozulunca sayfa dağılmaz.",
    "feature3.title": "Kırık varlık yok",
    "feature3.body":
      "Site, bulunmayan logo/banner görsellerine bağımlı değildir; yükleme sadece bu HTML, CSS ve JS ile çalışır.",
    "content.title2": "Çalışma akışı",
    "content.body2":
      "MoonCode terminalde kalır, ancak browser bridge, MCP, session yönetimi ve release araçlarıyla etrafındaki işleri de kontrol eder. Bu yüzden sadece bir sohbet kutusu gibi davranmaz.",
    "content.title3": "MCP, browser ve release güvenliği",
    "content.body3":
      "Browser bridge artık daha sabırlı ve daha net hata verir. MCP adaptörleri ise sabit tek platform varsayımlarından kurtulup farklı makinelerde daha tutarlı çalışacak şekilde toparlanır.",
    "callout.title": "Kısa kullanım notu",
    "callout.body":
      "Tarayıcı eklentisi yüklü değilse browser köprüsü uyarı verir; release için ise Windows, macOS ve Linux paketleri aynı akıştan çıkar.",
    "toc.title": "Bu sayfada",
    "toc.link1": "Neden MoonCode?",
    "toc.link2": "Çalışma akışı",
    "toc.link3": "Kurulum",
    "toc.link4": "Platformlar",
    "toc.link5": "Mobil deneyim",
    "install.kicker": "Kurulum ve yayın",
    "install.title": "Tek repo, üç platform, tek yayın çizgisi.",
    "install.body":
      "Kurulum yolunu sade tuttuk: repo klonla, bağımlılıkları yükle, derle ve başlat. Release tarafında da macOS, Linux ve Windows paketleri aynı akıştan çıkar.",
    "install.card1.title": "Başlangıç",
    "install.card2.title": "Windows yardımı",
    "install.card2.body":
      "`setup.bat` yönetici yetkisiyle daha sağlam kurulum, launcher onarımı ve PATH düzeni sağlar.",
    "install.card3.title": "Yayınlar",
    "install.card3.body":
      "Release sayfasından macOS, Linux ve Windows paketlerini indir; eski sürümler yerine yalnızca güncel yayınları kullan.",
    "mobile.kicker": "Mobil deneyim",
    "mobile.title": "Telefon ekranında da düzen bozulmaz.",
    "mobile.body":
      "Menü daralır, bloklar alt alta iner ve içerik okunur kalır. Yatay kaydırma, kesilmiş başlıklar ve taşan butonlar bu sürümde hedef dışı.",
    "mobile.check1": "Büyük metinler satıra sığacak şekilde ölçeklenir.",
    "mobile.check2": "Butonlar ve sekmeler küçük ekranlarda sarılır.",
    "mobile.check3": "Yan paneller mobilde tek kolon olur.",
    "footer.body":
      "Terminal-first engineering, now with cleaner docs and a mobile-safe layout.",
    "footer.back": "Yukarı çık",
  },
  en: {
    skip: "Skip to content",
    menu: "Menu",
    "nav.overview": "Overview",
    "nav.capabilities": "Capabilities",
    "nav.install": "Install",
    "nav.docs": "Docs",
    "nav.github": "GitHub",
    "header.releases": "Releases",
    "header.cta": "Get started",
    "hero.eyebrow": "Terminal-first engineering",
    "hero.title": "MoonCode is a local development assistant that reads the code and finishes the job.",
    "hero.lead":
      "MoonCode understands workspace context, controls the browser, speaks to MCP servers, and keeps the release flow tidy. It ships as a working production tool instead of a marketing page.",
    "hero.primary": "See install",
    "hero.secondary": "Open source",
    "hero.point1": "Workspace awareness",
    "hero.point2": "Browser bridge",
    "hero.point3": "MCP connectors",
    "hero.point4": "Windows, macOS, Linux",
    "status.title": "System status",
    "status.workspace": "Workspace",
    "status.workspaceValue": "Indexed and searchable",
    "status.browser": "Browser bridge",
    "status.browserValue": "Extension-ready",
    "status.release": "Release flow",
    "status.releaseValue": "Cross-platform",
    "status.language": "Language",
    "status.languageValue": "TR / EN",
    "terminal.ok": "Ready: browser bridge, MCP connectors, audit log.",
    "terminal.note": "No broken images, no fixed-width layout traps.",
    "metric1.title": "Less friction",
    "metric1.body":
      "Minimal prompts, surgical edits, and narrow tool calls keep the assistant focused on work.",
    "metric2.title": "More context",
    "metric2.body":
      "Workspace indexing and semantic search surface the right files, lines, and symbols faster.",
    "metric3.title": "Safer automation",
    "metric3.body":
      "Policy, audit, and approval gates protect risky actions without blocking the normal flow.",
    "metric4.title": "Real releases",
    "metric4.body":
      "The same codebase ships Windows, macOS, and Linux packages with release notes.",
    "sidebar.title": "Quick links",
    "sidebar.link1": "Why MoonCode?",
    "sidebar.link2": "Workflow",
    "sidebar.link3": "Platform support",
    "sidebar.link4": "MCP and browser",
    "sidebar.link5": "Mobile experience",
    "content.kicker": "Docs summary",
    "content.title1": "Why is this release better?",
    "content.body1":
      "The old site was desktop-heavy, some images did not load, and the English mode showed garbled characters. This update cleans that up: real content, proper encoding, and a responsive layout that does not break.",
    "feature1.title": "Responsive layout",
    "feature1.body":
      "The header, cards, and content blocks collapse into a single column on small screens, and buttons do not overflow.",
    "feature2.title": "Clean language switching",
    "feature2.body":
      "TR / EN text is managed through one dictionary so translations do not tear the page apart when they change.",
    "feature3.title": "No broken assets",
    "feature3.body":
      "The site does not depend on missing logo or banner images; it loads from this HTML, CSS, and JS alone.",
    "content.title2": "Workflow",
    "content.body2":
      "MoonCode stays terminal-first, but it also manages browser bridge flows, MCP tooling, session state, and release helpers. That makes it a workbench, not just a chat box.",
    "content.title3": "MCP, browser, and release safety",
    "content.body3":
      "The browser bridge now waits longer and fails more clearly. MCP adapters are also normalized so they behave more consistently across different machines.",
    "callout.title": "Quick usage note",
    "callout.body":
      "If the browser extension is missing, the browser bridge warns clearly; releases are produced from the same flow for Windows, macOS, and Linux.",
    "toc.title": "On this page",
    "toc.link1": "Why MoonCode?",
    "toc.link2": "Workflow",
    "toc.link3": "Install",
    "toc.link4": "Platforms",
    "toc.link5": "Mobile experience",
    "install.kicker": "Install and release",
    "install.title": "One repo, three platforms, one release line.",
    "install.body":
      "The setup path stays simple: clone the repo, install dependencies, build, and run. Releases come out of the same pipeline for macOS, Linux, and Windows.",
    "install.card1.title": "Getting started",
    "install.card2.title": "Windows helper",
    "install.card2.body":
      "`setup.bat` gives you a stronger install path, launcher repair, and PATH setup with admin privileges.",
    "install.card3.title": "Releases",
    "install.card3.body":
      "Grab macOS, Linux, and Windows packages from the Releases page, and prefer the latest release instead of older archives.",
    "mobile.kicker": "Mobile experience",
    "mobile.title": "The layout stays intact on a phone.",
    "mobile.body":
      "The menu collapses, panels stack, and the content remains readable. Horizontal scrolling, clipped headings, and overflowing buttons are out of scope here.",
    "mobile.check1": "Large text scales to fit the line.",
    "mobile.check2": "Buttons and tabs wrap on small screens.",
    "mobile.check3": "Side panels become one column on mobile.",
    "footer.body": "Terminal-first engineering, now with cleaner docs and a mobile-safe layout.",
    "footer.back": "Back to top",
  },
};

const languageButtons = [...document.querySelectorAll(".lang-btn")];
const menuToggle = document.getElementById("menu-toggle");
const siteNav = document.getElementById("site-nav");
const root = document.documentElement;

function readStoredLanguage() {
  try {
    return localStorage.getItem("mooncode-site-language");
  } catch {
    return null;
  }
}

function writeStoredLanguage(language) {
  try {
    localStorage.setItem("mooncode-site-language", language);
  } catch {
    // Ignore storage errors in private/incognito or restricted file contexts.
  }
}

function applyTranslation(language) {
  const copy = translations[language] || translations.tr;
  root.lang = language;
  root.dataset.language = language;
  document.title =
    language === "en"
      ? "MoonCode | Terminal-first engineering"
      : "MoonCode | Terminal-first engineering";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const key = element.getAttribute("data-i18n");
    const value = copy[key];
    if (!value) return;

    if (element.tagName === "INPUT" || element.tagName === "TEXTAREA") {
      element.placeholder = value;
      return;
    }

    element.textContent = value;
  });

  languageButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.lang === language);
    button.setAttribute("aria-pressed", button.dataset.lang === language ? "true" : "false");
  });
}

function setLanguage(language) {
  const normalized = language === "en" ? "en" : "tr";
  writeStoredLanguage(normalized);
  applyTranslation(normalized);
}

function getPreferredLanguage() {
  const stored = readStoredLanguage();
  if (stored === "en" || stored === "tr") return stored;
  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "tr";
}

languageButtons.forEach((button) => {
  button.addEventListener("click", () => setLanguage(button.dataset.lang));
});

if (menuToggle && siteNav) {
  menuToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
  });

  siteNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 760px)").matches) {
        siteNav.classList.remove("is-open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  applyTranslation(getPreferredLanguage());
});
