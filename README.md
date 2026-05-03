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
