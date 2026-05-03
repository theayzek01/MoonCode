<p align="center">
  <a href="https://mooncli.dev">
    <img alt="Mooncli" src="Mooncli.png" width="200">
  </a>
</p>

<h1 align="center">🌙 M O O N C L I</h1>

<p align="center">
  <strong>Terminalinizdeki Zihin Sarayı.</strong><br>
  Modern, hızlı ve tamamen özelleştirilebilir bir AI kodlama asistanı.
</p>

<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-community-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
  <a href="https://mooncli.dev"><img alt="Website" src="https://img.shields.io/badge/website-mooncli.dev-blue?style=flat-square" /></a>
  <a href="https://www.npmjs.com/package/mooncli"><img alt="NPM Version" src="https://img.shields.io/npm/v/mooncli?style=flat-square&color=cb3837" /></a>
</p>

---

**Mooncli**, geliştiriciler için tasarlanmış minimal ama güçlü bir terminal asistanıdır. Kod yazma sürecinizi hızlandırmak için tasarlanmış olan Mooncli, **Model Context Protocol (MCP)** desteği ile harici servislerle (GitHub, Docker, Spotify vb.) kusursuz bir şekilde entegre olur.

### ✨ Neden Mooncli?

*   **MCP Entegrasyonu:** Dünyanın ilk MCP destekli CLI araçlarından biri. Gmail'den GitHub'a kadar tüm uygulamalarınızı AI'a bağlayın.
*   **Premium TUI:** Ay temalı, göz yormayan, modern ve estetik bir terminal arayüzü.
*   **Gelişmiş Modeller:** Claude 3.5 Sonnet, Opus 4.6 ve daha fazlası; Antigravity motoru ile emrinizde.
*   **🤖 Robotics Mode:** Yerel Ollama VLM (Vision Language Model) entegrasyonu ile terminalden robotik kontrol, nesne tespiti ve görev planlama.
*   **Tamamen Özelleştirilebilir:** Kendi [Uzantılarınızı](docs/extensions.md), [Yeteneklerinizi](docs/skills.md) ve [Temalarınızı](docs/themes.md) oluşturun.
*   **Hızlı & Hafif:** Node.js ve TypeScript ile optimize edilmiş çekirdek; sıfır şişkinlik, maksimum verim.

### 🚀 Hızlı Başlangıç

```bash
npm install -g mooncli
```

Ardından asistanınızı başlatın:

```bash
mooncli
```

### 🛠️ Yapılandırma

API anahtarlarınızı çevre değişkeni olarak ayarlayabilir veya interaktif modda `/login` komutunu kullanabilirsiniz:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
mooncli
```

### 🔌 MCP Sunucularını Bağlama

`.mooncli/settings.json` dosyanıza favori MCP sunucularınızı ekleyin:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "..." }
    }
  }
}
```

### 🤖 Robotics Mode (Yeni!)

Mooncli artık yerel VLM modelleri (Ollama üzerinden) ile gerçek zamanlı robotik görev planlama ve görüntü analizi desteği sunuyor.

1.  **Gereksinimler:** [Ollama](https://ollama.com/) kurun ve bir vision modeli çekin (`ollama pull qwen2.5-vl:7b`). Kamera desteği için sisteminizde `ffmpeg` yüklü olmalıdır.
2.  **Etkinleştirme:** Terminalde `/robotics enable` yazın.
3.  **Robot Fonksiyonları:** Robotunuzun API fonksiyonlarını içeren bir JSON dosyası oluşturun ve `/robotics functions robot_functions.json` ile tanıtın.
4.  **Komutlar:**
    *   `/robotics detect`: Nesne tespiti ve koordinat alma.
    *   `/robotics plan "mavi küpü sepete koy"`: Doğal dili robot API çağrılarına dönüştürme.
    *   `/robotics trajectory`: Robot kolu için yörünge planlama.

### 🎮 Discord Integration (Yeni!)

Mooncli artik Discord botunuzu yonetmenizi sagliyor. Sunucu duzenleme, kanal acma ve mesaj gonderme gibi islemleri AI yardimiyla yapabilirsiniz.

1. **Baglanti:** `/discord <bot_token>` komutu ile bot tokeninizi girin.
2. **Yonetim:** Artik botunuza Discord ile ilgili talimatlar verebilirsiniz:
    - "Su sunucudaki kanallari listele."
    - "Destek isminde yeni bir text kanali ac."
    - "Genel kanalina 'Mooncli ile baglandim!' mesaji gonder."
3. **Guvenlik:** Tokeniniz yerel ayarlarınızda guvenli bir sekilde saklanir.

---

### 📊 Gerçek Zamanlı İlerleme Takibi

Mooncli artık karmaşık projelerde veya çok adımlı görevlerde otomatik olarak ilerleme durumunu bildirir.
- **Nasıl Çalışır?**: Bot, her işlem adımında terminale `(Bitmesine %X)` veya `(İlerleme: %X)` şeklinde bir not düşer.
- **Faydası**: Uzun süren kod yazma veya refactor işlemlerinde botun ne aşamada olduğunu anlık olarak görebilirsiniz.

### 🤝 Katkıda Bulunma

Geliştirme ortamını kurmak için:

```bash
npm install
npm run build
node packages/cli/dist/cli.js
```

---

<p align="center">
  Düşün, Kodla, Mükemmelleştir. <br>
  Made with 🌙 by Mooncli Team.
</p>
