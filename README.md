<div align="center">

<img src="https://api.iconify.design/mdi:moon-waning-crescent.svg?color=white" width="72" height="72" alt="MoonCode Icon" />

<h1>MoonCode</h1>

<p>
  <strong>Terminal için yerel, hızlı ve sessiz kodlama asistanı.</strong>
</p>

<p>
  <em>“Bütün ümidim gençliktir.”</em><br/>
  <strong>~ Mustafa Kemal Atatürk</strong>
</p>

<br/>

<p>
  <a href="https://theayzek01.github.io/MoonCode/">
    <img src="https://img.shields.io/badge/Docs-Live%20Site-ffffff?style=for-the-badge&labelColor=0d1117&color=ffffff" alt="Live Docs" />
  </a>
  <a href="https://github.com/theayzek01/MoonCode">
    <img src="https://img.shields.io/badge/GitHub-MoonCode-ffffff?style=for-the-badge&logo=github&logoColor=white&labelColor=0d1117&color=ffffff" alt="GitHub Repo" />
  </a>
  <img src="https://img.shields.io/badge/Node.js-20%2B-ffffff?style=for-the-badge&logo=node.js&logoColor=white&labelColor=0d1117&color=ffffff" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/License-MIT-ffffff?style=for-the-badge&labelColor=0d1117&color=ffffff" alt="MIT License" />
</p>

</div>

---

## MoonCode Nedir?

**MoonCode**, terminal odaklı çalışan yerel bir kodlama asistanıdır.

Terminal-first çalışma akışlarını, kalıcı oturumları, **Browser Bridge** desteğini ve **MCP** entegrasyonunu tek bir yerde toplar.

Varsayılan olarak **yerel**, **sessiz**, **hızlı** ve geliştirici dostu çalışacak şekilde tasarlanmıştır.

> Kod yazarken dikkatinizi dağıtmadan, terminal içinde güçlü bir yardımcı deneyimi sunar.

---

## Canlı Dokümantasyon

<div align="center">

<a href="https://theayzek01.github.io/MoonCode/">
  <img src="https://api.iconify.design/mdi:web.svg?color=white" width="34" height="34" alt="Website Icon" />
</a>

<br/>

<a href="https://theayzek01.github.io/MoonCode/">
  <strong>MoonCode Canlı Dokümantasyon Sitesi</strong>
</a>

</div>

---

## Windows Kurulumu

Windows’ta bir release paketinden kurulum yapmak için:

```bat
setup.bat install
```

---

## Özellikler

<table>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:console-line.svg?color=white" width="32" height="32" alt="Terminal Icon" />
    </td>
    <td>
      <strong>Terminal tabanlı çalışma akışı</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:content-save-outline.svg?color=white" width="32" height="32" alt="Session Icon" />
    </td>
    <td>
      <strong>Kalıcı oturumlar</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:bridge.svg?color=white" width="32" height="32" alt="Bridge Icon" />
    </td>
    <td>
      <strong>Browser Bridge desteği</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:connection.svg?color=white" width="32" height="32" alt="MCP Icon" />
    </td>
    <td>
      <strong>MCP desteği</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:view-dashboard-outline.svg?color=white" width="32" height="32" alt="TUI Icon" />
    </td>
    <td>
      <strong>TUI arayüzü</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:shield-lock-outline.svg?color=white" width="32" height="32" alt="Local First Icon" />
    </td>
    <td>
      <strong>Yerel öncelikli çalışma</strong>
    </td>
  </tr>
</table>

---

## Başlangıç

Projeyi yerel ortamınızda çalıştırmak için:

```bash
npm install
npm run build
mooncode
```

---

## Dokümantasyon

<table>
  <tr>
    <th align="left">Kaynak</th>
    <th align="left">Bağlantı</th>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:web.svg?color=white" width="18" height="18" alt="Docs Icon" />
      Canlı site
    </td>
    <td>
      <a href="https://theayzek01.github.io/MoonCode/">theayzek01.github.io/MoonCode</a>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:github.svg?color=white" width="18" height="18" alt="GitHub Icon" />
      GitHub repo
    </td>
    <td>
      <a href="https://github.com/theayzek01/MoonCode">github.com/theayzek01/MoonCode</a>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:google-chrome.svg?color=white" width="18" height="18" alt="Chrome Icon" />
      Browser Bridge eklentisi
    </td>
    <td>
      <code>packages/cli/browser-extension/chrome</code>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:file-document-outline.svg?color=white" width="18" height="18" alt="Document Icon" />
      Detaylı inceleme notları
    </td>
    <td>
      <code>docs/MOONCODE_DEEP_DIVE.md</code>
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
    <td>Hızlı yardım menüsünü açar</td>
  </tr>
  <tr>
    <td><code>/brain</code></td>
    <td>Bağlam ve önerileri gösterir</td>
  </tr>
  <tr>
    <td><code>/autothink</code></td>
    <td>Otomatik düşünme modunu açar veya kapatır</td>
  </tr>
  <tr>
    <td><code>/browser</code></td>
    <td>Tarayıcı durumunu gösterir</td>
  </tr>
  <tr>
    <td><code>/mcp</code></td>
    <td>MCP yönetimini açar</td>
  </tr>
  <tr>
    <td><code>/doctor</code></td>
    <td>Sistem özetini gösterir</td>
  </tr>
</table>

---

## Geliştirme

Geliştirme ve test komutları:

```bash
npm run check:ci
npm test
```

---

## Gereksinimler

<table>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:nodejs.svg?color=white" width="32" height="32" alt="Node.js Icon" />
    </td>
    <td>
      <strong>Node.js 20+</strong>
    </td>
  </tr>
  <tr>
    <td align="center" width="80">
      <img src="https://api.iconify.design/mdi:git.svg?color=white" width="32" height="32" alt="Git Icon" />
    </td>
    <td>
      <strong>Git</strong>
    </td>
  </tr>
</table>

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır.

<div align="center">

<br/>

<img src="https://api.iconify.design/mdi:moon-waning-crescent.svg?color=white" width="42" height="42" alt="MoonCode Icon" />

<br/>
<br/>

<strong>MoonCode</strong> — Terminal içinde daha sakin, daha hızlı ve daha yerel bir kodlama deneyimi.

</div>
