<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
</div>

# MoonCode / Autonomous AI Station

MoonCode, terminalden ayrılmadan proje geliştirmenizi sağlayan otonom bir mühendislik istasyonudur. Sadece kod yazmakla kalmaz; repo bağlamını yönetir, testleri koşturu ve hataları otonom olarak düzeltir.

---

### [ Hızlı Başlangıç ]

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

npm install
npm run build
npm install -g ./packages/cli

mooncode
```

---

### [ Neden MoonCode? (Benchmark) ]

Diğer araçlar (Cursor, Claude Code, Windsurf) genellikle tüm dosyaları LLM'e basarak kredi tüketir. MoonCode ise **Semantic Context Filtering** kullanır.

| Özellik | MoonCode | Claude Code | Diğerleri |
|:---|:---:|:---:|:---:|
| **Token Tasarrufu** | %50 - %80 | %0 (Full Context) | %10-20 |
| **Self-Correction** | Otonom Loop | Sınırlı | Yok |
| **Bağlam Yönetimi** | VectorDB Search | Full Read | Basic Search |
| **Hız** | Native Bridge | Node.js | Electron (Ağır) |

**Verimlilik Notu:** Claude Code, büyük bir dosyada tek bir satırı değiştirmek için dosyanın tamamını tekrar tekrar okur. MoonCode ise sadece ilgili "chunk"ları VectorDB'den çeker. 1000 satırlık bir projede MoonCode ile yapacağınız bir işlem, Claude Code'a göre ortalama 5 kat daha az maliyetlidir.

---

### [ Temel Yetenekler ]

- **→ Self-Correction Loop:** Yazılan kodun testlerden geçtiğinden emin olana kadar otonom olarak hatayı bulur ve düzeltir. Durmanı gerektirmez.
- **→ Swarm Intelligence:** Bir işi verdiğinde arkada Architect, Coder ve Reviewer ajanları paralel çalışır. Sen kahveni içerken onlar işi bitirir.
- **→ Semantic Filter:** Repo'ndaki binlerce dosya arasında kaybolmaz. VectorDB kullanarak sadece o anki görevle alakalı kod parçalarını hafızasına alır.
- **→ Browser Bridge:** Terminalden çıkmadan web'de araştırma yapar, YouTube videolarını analiz eder veya bir web arayüzünü test eder.

---

### [ Komut Rehberi ]

- ` /swarm ` - Devasa işleri parçalara bölerek çözmek için sürüyü çağırır.
- ` /fix   ` - Projedeki hataları bulur ve otonom "verify-and-fix" döngüsünü başlatır.
- ` /evolve` - MoonCode'un kendi mimarisini analiz edip iyileştirme önerdiği çekirdek döngü.
- ` /index ` - Projeyi ilk defa açtığında semantik indeksleme yaparak hızı artırır.
- ` /browser ` - Chrome eklentisiyle olan canlı bağlantıyı yönetir.

---

### [ İletişim ]

Sorun varsa veya ekibe katılmak istersen:

- **👾 Discord:** [discord.gg/kanser](https://discord.gg/kanser)
- **📸 Instagram:** [@theayzek01](https://instagram.com/theayzek01)

---

<div align="center">
  <img src="assets/Moon-cli-logo.png" alt="MoonCode Logo" width="60" />
  <br />
  <b>Hızlı hareket et. Sorunları çöz. Moon kal.</b>
</div>

---

MIT © 2026 Ozen (theayzek01)


