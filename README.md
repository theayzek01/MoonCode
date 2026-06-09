<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="140" height="140" alt="MoonCode Logo" />

<h1>MoonCode</h1>

<p>
  <strong>Terminal için yerel, hızlı ve sessiz kodlama asistanı.</strong>
</p>

<p>
  <em>“Ey yükselen yeni kuşak! Gelecek sizindir.”</em><br/>
  <strong>~ Mustafa Kemal Atatürk</strong>
</p>

<br/>

<p>
  <a href="https://theayzek01.github.io/MoonCode/">
    <img src="https://img.shields.io/badge/DOCS-LIVE%20SITE-ffffff?style=for-the-badge&labelColor=111111&color=ffffff" alt="Live Docs" />
  </a>
  <a href="https://github.com/theayzek01/MoonCode">
    <img src="https://img.shields.io/badge/GITHUB-MOONCODE-ffffff?style=for-the-badge&logo=github&logoColor=white&labelColor=111111&color=ffffff" alt="GitHub Repo" />
  </a>
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-ffffff?style=for-the-badge&logo=node.js&logoColor=white&labelColor=111111&color=ffffff" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/LICENSE-MIT-ffffff?style=for-the-badge&labelColor=111111&color=ffffff" alt="MIT License" />
</p>

</div>

---

<div align="center">

<strong>MoonCode</strong>, terminal-first çalışma akışlarını, kalıcı oturumları, Browser Bridge’i ve MCP desteğini tek bir yerde toplayan yerel bir kodlama asistanıdır.

<br/>
<br/>

<a href="https://theayzek01.github.io/MoonCode/">
  <strong>Canlı Dokümantasyonu Aç</strong>
</a>

</div>

---

## MoonCode Nedir?

MoonCode, geliştiriciler için terminal içinde çalışan yerel bir kodlama asistanıdır.

Hızlı, sessiz ve local-first bir deneyim sunmak için tasarlanmıştır.
Terminal odaklı çalışma akışlarını korur, oturumları kalıcı hale getirir ve Browser Bridge ile MCP desteğini aynı çatı altında toplar.

> Daha az dikkat dağınıklığı.
> Daha hızlı terminal akışı.
> Daha yerel ve kontrollü geliştirme deneyimi.

---

## Kurulum

### Windows

Release paketinden kurulum yapmak için:

```bat
setup.bat install
```

### Geliştirici Kurulumu

```bash
npm install
npm run build
mooncode
```

---

## Özellikler

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:console-line.svg?color=white" width="30" height="30" alt="Terminal" />
    </td>
    <td>
      <strong>Terminal tabanlı çalışma akışı</strong><br/>
      Komut satırından ayrılmadan geliştirme deneyimi.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:content-save-outline.svg?color=white" width="30" height="30" alt="Persistent Sessions" />
    </td>
    <td>
      <strong>Kalıcı oturumlar</strong><br/>
      Çalışma bağlamını koruyan uzun ömürlü oturum yapısı.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:bridge.svg?color=white" width="30" height="30" alt="Browser Bridge" />
    </td>
    <td>
      <strong>Browser Bridge</strong><br/>
      Tarayıcı tarafındaki iş akışlarını terminal deneyimine bağlar.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:connection.svg?color=white" width="30" height="30" alt="MCP" />
    </td>
    <td>
      <strong>MCP desteği</strong><br/>
      Harici araçlar ve bağlam sağlayıcılarla genişletilebilir yapı.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:view-dashboard-outline.svg?color=white" width="30" height="30" alt="TUI" />
    </td>
    <td>
      <strong>TUI arayüzü</strong><br/>
      Terminal içinde daha okunabilir ve düzenli kullanım.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:shield-lock-outline.svg?color=white" width="30" height="30" alt="Local First" />
    </td>
    <td>
      <strong>Local-first çalışma</strong><br/>
      Varsayılan olarak yerel, kontrollü ve sessiz bir deneyim.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:robot-outline.svg?color=white" width="30" height="30" alt="Sub-agents" />
    </td>
    <td>
      <strong>Gelişmiş Alt Ajanlar (Sub-agents)</strong><br/>
      Bağımsız ve paralel çalışabilen, TUI üzerinden izlenebilir (Ctrl+O) görev yöneticisi alt ajanlar.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:toolbox-outline.svg?color=white" width="30" height="30" alt="Advanced Tools" />
    </td>
    <td>
      <strong>Genişletilmiş Tool Seti</strong><br/>
      bash (Terminal komutları), edit/read/write (Gelişmiş dosya işlemleri), codebase_index (Proje içi akıllı arama) ve tarayıcı araçları (browser_tabs, browser_page).
    </td>
  </tr>
</table>

---

## Temel Komutlar

<table>
  <tr>
    <th align="left">Komut</th>
    <th align="left">Açıklama</th>
  </tr>
  <tr>
    <td><code>/help</code></td>
    <td>Hızlı yardım menüsünü açar.</td>
  </tr>
  <tr>
    <td><code>/brain</code></td>
    <td>Bağlamı ve önerileri gösterir.</td>
  </tr>
  <tr>
    <td><code>/autothink</code></td>
    <td>Otomatik düşünme modunu açar veya kapatır.</td>
  </tr>
  <tr>
    <td><code>/browser</code></td>
    <td>Tarayıcı bağlantı durumunu gösterir.</td>
  </tr>
  <tr>
    <td><code>/mcp</code></td>
    <td>MCP yönetim ekranını açar.</td>
  </tr>
  <tr>
    <td><code>/doctor</code></td>
    <td>Sistem ve proje durum özetini gösterir.</td>
  </tr>
</table>

---

## Dokümantasyon

<table>
  <tr>
    <th align="left">Kaynak</th>
    <th align="left">Bağlantı</th>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:web.svg?color=white" width="18" height="18" alt="Docs" />
      Canlı site
    </td>
    <td>
      <a href="https://theayzek01.github.io/MoonCode/">theayzek01.github.io/MoonCode</a>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:github.svg?color=white" width="18" height="18" alt="GitHub" />
      GitHub repo
    </td>
    <td>
      <a href="https://github.com/theayzek01/MoonCode">github.com/theayzek01/MoonCode</a>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:google-chrome.svg?color=white" width="18" height="18" alt="Browser Bridge" />
      Browser Bridge eklentisi
    </td>
    <td>
      <code>packages/cli/browser-extension/chrome</code>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:file-document-outline.svg?color=white" width="18" height="18" alt="Deep Dive" />
      Detaylı inceleme notları
    </td>
    <td>
      <code>docs/MOONCODE_DEEP_DIVE.md</code>
    </td>
  </tr>
</table>

---

## Geliştirme

Projeyi kontrol etmek ve testleri çalıştırmak için:

```bash
npm run check:ci
npm test
```

---

## Gereksinimler

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:nodejs.svg?color=white" width="30" height="30" alt="Node.js" />
    </td>
    <td>
      <strong>Node.js 20+</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:git.svg?color=white" width="30" height="30" alt="Git" />
    </td>
    <td>
      <strong>Git</strong>
    </td>
  </tr>
</table>

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır.

---

<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="72" height="72" alt="MoonCode Logo" />

<br/>
<br/>

<strong>MoonCode</strong><br/>
Terminal içinde daha sakin, daha hızlı ve daha yerel bir kodlama deneyimi.

</div>
