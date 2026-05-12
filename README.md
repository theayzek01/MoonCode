<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode Banner" width="100%" />

  <h1>MoonCode</h1>
  <p>MoonCode motoru üzerine kurulu, sade ve ciddi terminal coding agent.</p>

  [![Version](https://img.shields.io/badge/version-11.40.0-blue.svg?style=for-the-badge)](#)
  [![License](https://img.shields.io/badge/license-MIT-green.svg?style=for-the-badge)](#)
  [![Platform](https://img.shields.io/badge/platform-Windows_|_macOS_|_Linux-lightgray.svg?style=for-the-badge)](#)
</div>

---

## MoonCode nedir?

MoonCode; terminalden çalışan, dosyaları okuyup düzenleyebilen, komut çalıştırabilen ve Chrome Browser Bridge ile tarayıcıyı kontrol edebilen kurumsal/minimal kodlama asistanıdır.

Öncelik sırası:

1. **Doğru değişiklik**: Önce repo bağlamını okur, sonra küçük ve güvenli diff üretir.
2. **Az token**: Uzun sohbetlerde otomatik compaction/summarization ile bağlamı küçültür.
3. **Sade cevap**: Gereksiz açıklama yerine sonuç, dosya yolu ve test bilgisini verir.
4. **Tarayıcı kontrolü**: Sekme listeleme, sayfa okuma, tıklama, yazma, ekran görüntüsü ve konsol loglarını destekler.

## Kurulum

```bash
npm install -g mooncode
mooncode --version
mooncode
```

Geliştirme modunda:

```bash
npm install
npm run build
npm start
```

## Temel komutlar

| Komut | Açıklama |
|---|---|
| `mooncode` | Etkileşimli TUI başlatır |
| `mooncode --help` | Yardım ve flag listesi |
| `mooncode --continue` | Son oturumu devam ettirir |
| `mooncode browser-bridge` | Chrome Browser Bridge sunucusunu başlatır |
| `/browser` | Bridge durumunu gösterir |

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

## Chrome Browser Bridge

1. Chrome'da `chrome://extensions` aç.
2. **Developer mode** aç.
3. **Load unpacked** seç.
4. `packages/cli/browser-extension/chrome` klasörünü yükle.
5. Terminalde `mooncode browser-bridge` çalıştır.

Bridge araçları:

- `browser_tabs`: sekme listele/aç/kapat/odakla/yenile/navigate et.
- `browser_page`: sayfa oku, DOM özetle, elementleri numaralandır, tıkla, yaz, scroll, screenshot, console log oku.

Token tasarrufu için `browser_page read` varsayılan olarak kısa ve temiz metin döndürür. Daha fazla metin gerekirse `maxChars` ver.

## Agent davranışı

MoonCode kendini **MoonCode / Moon** olarak tanır.

- Kısa ve net konuşur.
- Kullanıcının dilinde cevap verir.
- Kod işinde önce inceler, sonra değiştirir, sonra doğrular.
- Dosya yollarını açık yazar.
- Gereksiz uzun rapor üretmez.

## Lisans

MIT
