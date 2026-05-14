<div align="center">
  <img src="https://raw.githubusercontent.com/theayzek01/MoonCode/main/assets/Moon-cli-banner.png?v=20260512" alt="MoonCode Banner" width="100%" />

  <h1>MoonCode</h1>
  <p>Serious terminal coding agent: inspect → act → verify.</p>

  [![Version](https://img.shields.io/badge/version-1.34.0-d08a7a.svg?style=for-the-badge)](#)
  [![License](https://img.shields.io/badge/license-MIT-a8b58f.svg?style=for-the-badge)](#)
  [![Platform](https://img.shields.io/badge/platform-Windows_|_macOS_|_Linux-d0a36f.svg?style=for-the-badge)](#)
</div>

---

## MoonCode nedir?

MoonCode; terminalden çalışan, repo bağlamını anlayan, dosya düzenleyen, test çalıştıran ve Chrome Browser Bridge ile tarayıcıyı kontrol edebilen kurumsal/minimal kodlama aracıdır.

Öncelik sırası:

1. **Mantıklı aksiyon**: En basit değil; en basit, en akıllı, en düşük riskli ve doğrulanabilir yol.
2. **Az token**: Büyük projelerde index/search, dar okuma ve otomatik compaction.
3. **Ciddi çıktı**: Gereksiz laf yok; sonuç, dosya yolu, test bilgisi.
4. **Browser automation**: Sekme, DOM, click/type, drag/drop, file upload, screenshot, console log.

## Kurulum

GitHub'dan direkt kurulum:

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode
npm install
npm run build
npm install -g ./packages/cli
mooncode --version
mooncode

# eski komut alias'ı da çalışır
mooncli
```

Güncelleme:

```bash
mooncode update
# veya
mooncli update
```

## Temel komutlar

| Komut | Açıklama |
|---|---|
| `mooncode` | Etkileşimli TUI başlatır |
| `mooncode --help` | Yardım ve flag listesi |
| `mooncode --continue` | Son oturumu devam ettirir |
| `mooncode browser-bridge` | Chrome Browser Bridge sunucusunu başlatır |
| `mooncode update` / `mooncli update` | GitHub’dan son sürümü çekip global kurulumu yeniler |
| `/browser` | Bridge durumunu gösterir |
| `/automation on\|off` | Kapsamlı otomasyon modunu aç/kapat |
| `/index` | Büyük repo için hızlı arama indeksi oluşturur |
| `/compact` | Oturumu manuel sıkıştırır |

## Uzun sohbetlerde otomatik compaction

MoonCode uzun konuşmalarda bağlamı otomatik küçültür. Ayar dosyası:

```json
{
  "compaction": {
    "enabled": true,
    "profile": "balanced"
  }
}
```

Daha agresif token tasarrufu için:

```json
{
  "compaction": {
    "enabled": true,
    "profile": "aggressive"
  }
}
```

## Antigravity

MoonCode Antigravity model IDs are aligned with `ag-local-bridge`:

- `antigravity-claude-sonnet-4-6` varsayılan modeldir.
- `antigravity-claude-opus-4-6-thinking`
- `antigravity-gemini-3-flash`
- `antigravity-gemini-3.1-pro-high`
- `antigravity-gemini-3.1-pro-low`
- `antigravity-gpt-oss-120b`

Detay: [`docs/integrations/ANTIGRAVITY.md`](docs/integrations/ANTIGRAVITY.md)

## Chrome Browser Bridge

1. Chrome'da `chrome://extensions` aç.
2. **Developer mode** aç.
3. **Load unpacked** seç.
4. `packages/cli/browser-extension/chrome` klasörünü yükle.
5. Terminalde `mooncode browser-bridge` çalıştır.

Bridge araçları:

- `browser_tabs`: sekme listele/aç/kapat/odakla/yenile/navigate et.
- `browser_page`: `read`, `read_dom`, `get_elements`, `click`, `type`, `drag`, `upload_file`, `scroll`, `screenshot`, `console_logs`, `clear_ui`.
- `scroll`: en yakın scrollable alanı hedefler; `up/down/left/right/top/bottom` destekler.

Varsayılan çıktılar token dostudur. Daha fazla veri gerekirse `maxChars` veya `maxElements` verilir. Overlay/etiketler varsayılan kapalıdır; yalnızca istenirse gösterilir.

## Agent davranışı

MoonCode kendini **MoonCode / Moon** olarak tanır.

- Kısa ve net konuşur.
- Kullanıcının dilinde cevap verir.
- Kod işinde önce inceler, sonra değiştirir, sonra doğrular.
- Dosya yollarını açık yazar.
- Gereksiz uzun rapor üretmez.

## Automation Mode

Varsayılan kapalıdır. Açmak için:

```bash
/automation on
```

Açıkken footer’da model yanında `automation` görünür. MoonCode; tarayıcı, terminal ve dosya işlemlerini çok adımlı şekilde yürütebilir. Büyük projelerde önce index/search kullanır, dar okuma yapar ve context büyürse compaction ile token tüketimini düşürür.

## Dokümantasyon

- [`docs/README.md`](docs/README.md)
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
- [`docs/QUALITY_GATE.md`](docs/QUALITY_GATE.md)
- [`SECURITY.md`](SECURITY.md)

## Final kalite kapısı

```bash
npm run check:ci
npm run test --workspace=packages/tui
npm run build
npm run security:audit
```

## Tasarım dili

MoonCode TUI; koyu bordo, sıcak amber ve yumuşak kontrastlardan oluşan kendi paletini kullanır. Hedef: uzun terminal seanslarında göz yormayan ama premium hissettiren, sade ve ciddi bir arayüz.

## Lisans

MIT
