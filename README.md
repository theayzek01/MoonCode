# MoonCode

Terminal için yerel kod asistanı.

<p align="center">
  <img src="packages/cli/src/modes/interactive/assets/logo.png" alt="MoonCode" width="96" />
</p>

<p align="center">
  <img src="packages/cli/browser-extension/chrome/icon.png" alt="Browser Bridge" width="40" />
  <img src="packages/cli/browser-extension/chrome/icons/Browser/15.%20Search.png" alt="Search" width="40" />
  <img src="packages/cli/browser-extension/chrome/icons/Computer%20Systems/1.%20Pointer.png" alt="Pointer" width="40" />
  <img src="packages/cli/browser-extension/chrome/icons/Browser/5.%20Refresh.png" alt="Refresh" width="40" />
  <img src="packages/cli/browser-extension/chrome/icons/Browser/7.%20Download.png" alt="Download" width="40" />
  <img src="packages/cli/browser-extension/chrome/icons/Social/4.%20Chat.png" alt="Chat" width="40" />
</p>

## Kısa Bakış

- Terminal odaklı çalışma
- Kalıcı oturumlar
- Browser Bridge
- MCP desteği
- TUI arayüzü

## Başlatma

```bash
npm install
npm run build
mooncode
```

## Temel Komutlar

- `/help` yardım
- `/brain` bellek ve öneriler
- `/autothink` otomatik düşünme
- `/browser` tarayıcı durumu
- `/mcp` MCP yönetimi
- `/doctor` sistem özeti

## Geliştirme

```bash
npm run check:ci
npm test
```

## Browser Bridge

Chrome eklentisi:

- [`packages/cli/browser-extension/chrome`](packages/cli/browser-extension/chrome)

Kurulum notları:

- `mooncode browser-bridge` çalıştır
- Chrome'da `chrome://extensions` aç
- Developer mode'u aç
- `Load unpacked` ile eklentiyi yükle

## Lisans

MIT
