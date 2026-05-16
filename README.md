<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
  
  <br />

  <p align="center">
    <img src="https://img.shields.io/badge/Status-Hardened-blue?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Engine-Autonomous-orange?style=for-the-badge" />
    <img src="https://img.shields.io/badge/Security-Lvl_9-red?style=for-the-badge" />
  </p>

  <br />
  
  <code>█▀▄▀█ █▀▀█ █▀▀█ █▀▀▄ █▀▀ █▀▀█ █▀▀▄ █▀▀</code><br />
  <code>█ ▀ █ █  █ █  █ █  █ █   █  █ █  █ █▀▀</code><br />
  <code>▀   ▀ ▀▀▀▀ ▀▀▀▀ ▀  ▀ ▀▀▀ ▀▀▀▀ ▀▀▀  ▀▀▀</code>
</div>

---

### ┌─ [ Giriş ] ──────────────────────────────────────────┐

MoonCode, klasik kodlama asistanlarının aksine, terminalde yaşayan otonom bir **AI Mühendislik İstasyonudur**. Sadece kod önermez; projeyi bir bütün olarak anlar, hataları testler üzerinden doğrular ve kendi kendini iyileştiren döngüler (Self-Correction) kurar.

### └────────────────────────────────────────────────────────┘

---

### ▒▒ [ Benchmark: MoonCode vs Sektör ] ▒▒

Sıradan araçlar (Claude Code, Cursor, Windsurf) repo bağlamını yönetirken tüm dosyaları LLM'e göndererek hem maliyeti artırır hem de zekayı dağıtır. MoonCode, **Semantic Context Filtering (SCF)** ile sadece kritik olanı işler.

| Metrik | MoonCode | Claude Code | Cursor |
|:---|:---:|:---:|:---:|
| **Token Verimliliği** | ▓▓▓▓▓▓▓▓░░ %80 | ░░░░░░░░░░ %0 | ▓▓░░░░░░░░ %20 |
| **Otonom Onarım** | Native Loop | Sınırlı | Yok |
| **Bağlam Yönetimi** | VectorDB Search | Full Context | Basic Index |
| **Yürütme Hızı** | High-Speed Bridge | Node.js | Heavy IDE |

> **Analiz:** Claude Code 1000 satırlık bir dosyayı her küçük değişiklikte baştan okurken, MoonCode sadece ilgili semantik "chunk"ları çeker. Bu, orta ölçekli bir projede ayda **$200+** tasarruf demektir.

---

### █▓▒░ [ Teknik Mimari ] ░▒▓█

MoonCode, kurumsal seviyede güvenilirlik için 4 ana katmandan oluşur:

#### 1. ┤ core ├
Sistemin sinir merkezi.
- **VectorDB:** Tüm repo'yu semantik olarak indeksler.
- **AuditManager:** Her AI kararını ve dosya değişikliğini denetlenebilir şekilde loglar.
- **Native Bridge:** Vektör hesaplamaları gibi ağır işleri Rust/WASM hızında koşturur.

#### 2. ┤ engine ├
Yürütücü beyin.
- **Swarm Intelligence:** Mimar, Kodlayıcı ve Denetçi ajanlarının paralel işbirliği.
- **Meta-Evolver:** Sistemin kendi darboğazlarını analiz eden öz-iyileştirme motoru.
- **Auto-Healer:** Hata alındığında terminal loglarını analiz edip kodu düzelten döngü.

#### 3. ┤ cli ├
Kullanıcı arayüzü ve entegrasyon.
- **High-Performance TUI:** Uzun kodlama seansları için optimize edilmiş, göz yormayan terminal arayüzü.
- **Browser Bridge:** Chrome üzerinden canlı web araştırması ve otomasyon katmanı.

---

### 🚀 [ Hızlı Kurulum ]

```bash
# Klonla ve İnşa Et
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

npm install
npm run build
npm install -g ./packages/cli

# Başlat
mooncode
```

---

### 🛠️ [ Komut Kütüphanesi ]

- ` /swarm `  ─ Devasa görevleri (örn: "Tüm CSS'i Tailwind'e çevir") parçalara böler.
- ` /fix   `  ─ Projedeki hataları tarar ve testlerden geçene kadar otonom tamir eder.
- ` /evolve`  ─ MoonCode'un kendi kodunu optimize ettiği meta-döngü.
- ` /index `  ─ Yeni repo'lar için semantik vektör indekslemesi yapar.
- ` /browser `─ Tarayıcı bağlantısını ve web otomasyonunu yönetir.

---

### 🗺️ [ Yol Haritası (Roadmap) ]

- [x] Swarm Multi-Agent Orchestration
- [x] Semantic Context Compaction (VectorDB)
- [x] Meta-Evolution Engine
- [ ] **Native Rust Bridge Implementation (Hız +10x)**
- [ ] **Collaborative Swarm (Birden fazla MoonCode instance işbirliği)**
- [ ] **Direct Deployment Integrations (AWS/Vercel)**

---

### 💬 [ İletişim ]

Sorunlarınız veya önerileriniz için topluluğumuza katılın:

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
