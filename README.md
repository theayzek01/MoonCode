<p align="center">
  <a href="https://github.com/theayzek01/hodeuscli">
    <img alt="moodcli logosu" src="Moodcli.png" width="160">
  </a>
</p>
<p align="center">
  <a href="https://discord.com/invite/3cU7Bz4UPx"><img alt="Discord" src="https://img.shields.io/badge/discord-toplulugu-5865F2?style=flat-square&logo=discord&logoColor=white" /></a>
</p>
<p align="center">
  <a href="https://moodcli.dev">moodcli.dev</a>
</p>

---

Moodcli, minimal bir terminal kodlama aracidir. Moodcli'yi kendi is akislariniza gore uyarlayin, Moodcli'nin ic yapisini degistirmek zorunda kalmayin. TypeScript [Uzantilar](#extensions), [Yetenekler](#skills), [Istem Sablonlari](#prompt-templates) ve [Temalar](#themes) ile ozellestirin. Kendi paketlerinizi olusturup npm veya git uzerinden paylasin.

Moodcli guclu varsayilanlarla gelir ancak alt araclar (sub-engines) veya plan modu gibi siskin ozellikleri icermez. Bunun yerine, ihtiyaciniz olan ozellikleri Moodcli'ye yaptirabilir veya topluluk paketlerini yukleyebilirsiniz.

## Hizli Baslangic

```bash
npm install -g @moodcli/cli
```

API anahtari ile kimlik dogrula:

```bash
export ANTHROPIC_API_KEY=sk-ant-...
mood
```

Veya mevcut aboneligini kullan:

```bash
mood
/login  # Ardindan saglayiciyi secin
```

## Ozellikler

- **Moon Temasi**: Varsayilan olarak yumusak ve koyu estetik.
- **Sonnet 4.6 & Opus 4.6**: Antigravity ve Codex saglayicilari uzerinden en yeni modeller entegre edildi.
- **Turkce Yerellestirme**: Turk kullanicilar icin tamamen Turkceye cevrilmis TUI.
- **Hizli & Minimal**: Gereksiz siskinlik yok, sadece ihtiyaciniz olan araclar var.

## Gelistirme

```bash
npm install
npm run build
node dist/cli.js
```
