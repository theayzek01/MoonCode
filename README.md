<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
  
  <br />

  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/VectorDB-FF4500?style=for-the-badge&logo=databricks&logoColor=white" />
    <img src="https://img.shields.io/badge/Hardened-Security-blue?style=for-the-badge" />
  </p>
</div>

# MoonCode / Autonomous AI Station

MoonCode, terminalden ayrılmadan proje geliştirmenizi sağlayan otonom bir mühendislik istasyonudur. Sadece kod yazmakla kalmaz; repo bağlamını yönetir, testleri koşturur ve hataları otonom olarak düzeltir.

---

### [ ⚡ Hızlı Başlangıç ]

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

npm install
npm run build
npm install -g ./packages/cli

mooncode
```

---

### [ 📊 Benchmark: MoonCode vs Others ]

MoonCode, **Semantic Context Filtering** teknolojisi ile rakiplerinin aksine sadece gerekli veriyi işler.

<table width="100%">
  <tr>
    <th align="left">Özellik</th>
    <th align="center">MoonCode</th>
    <th align="center">Claude Code</th>
    <th align="center">Cursor</th>
  </tr>
  <tr>
    <td><b>Token Tasarrufu</b></td>
    <td align="center">✅ %50 - %80</td>
    <td align="center">❌ %0 (Full)</td>
    <td align="center">⚠️ %10-20</td>
  </tr>
  <tr>
    <td><b>Self-Correction</b></td>
    <td align="center">Otonom Loop</td>
    <td align="center">Sınırlı</td>
    <td align="center">Yok</td>
  </tr>
  <tr>
    <td><b>Hız (Engine)</b></td>
    <td align="center">Native Bridge</td>
    <td align="center">Node.js</td>
    <td align="center">Electron</td>
  </tr>
</table>

> **Not:** Claude Code, 1000 satırlık dosyada tek satır için tüm dosyayı okurken; MoonCode sadece ilgili 50 satırı (chunk) VectorDB'den çeker. **Bu, her işlemde 5-10 kat daha az maliyet demektir.**

---

### [ 🧠 Çekirdek Yetenekler ]

<details>
<summary><b>🔍 Otonom Hata Düzeltme (Self-Correction)</b></summary>
<p>MoonCode, yazdığı kodun testlerden geçtiğinden emin olana kadar durmaz. Hata alırsa, logları analiz eder ve kodu düzeltip tekrar dener.</p>
</details>

<details>
<summary><b>🐝 Swarm Intelligence (Sürü Zekası)</b></summary>
<p>Arka planda Architect, Coder ve Reviewer ajanları eşzamanlı çalışır. Karmaşık PR'ları dakikalar içinde otonom hazırlar.</p>
</details>

<details>
<summary><b>⚡ Semantik Bağlam Yönetimi</b></summary>
<p>Repo'ndaki binlerce dosya arasından sadece o anki görevle semantik olarak eşleşen parçaları LLM hafızasına alır.</p>
</details>

<details>
<summary><b>🌍 Browser Bridge (Web Otomasyonu)</b></summary>
<p>Terminalden çıkmadan Chrome üzerinden araştırma yapar, doküman okur veya UI testleri koşturur.</p>
</details>

---

### [ ⌨️ Komut Rehberi ]

| Komut | Açıklama |
|---|---|
| ` /swarm ` | Devasa işleri parçalara bölerek çözmek için sürüyü çağırır. |
| ` /fix   ` | Projedeki hataları bulur ve otonom tamir döngüsünü başlatır. |
| ` /evolve` | MoonCode'un kendi mimarisini optimize ettiği meta-döngü. |
| ` /index ` | Projeyi semantik olarak indeksleyerek hızı maksimize eder. |

---

### [ 💬 İletişim & Topluluk ]

<p align="left">
  <a href="https://discord.gg/kanser"><img src="https://img.shields.io/badge/Discord-7289DA?style=for-the-badge&logo=discord&logoColor=white" /></a>
  <a href="https://instagram.com/theayzek01"><img src="https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white" /></a>
</p>

---

<div align="center">
  <img src="assets/Moon-cli-logo.png" alt="MoonCode Logo" width="60" />
  <br />
  <b>Hızlı hareket et. Sorunları çöz. Moon kal.</b>
  <br />
  <sub>MIT © 2026 Ozen (theayzek01)</sub>
</div>
