# MoonCode

Terminal için yerel kod asistanı.

MoonCode; terminal odaklı çalışma, kalıcı oturumlar, Browser Bridge ve MCP desteğini tek yerde toplar. Hızlı, sade ve yerel kullanım için tasarlanmıştır.

Windows kurulumu için release paketindeki `setup.bat` dosyasını çalıştırabilirsin. Kurulum:

```bat
setup.bat install
```

## Özellikler

- Terminal tabanlı akış
- Kalıcı oturum desteği
- Browser Bridge
- MCP desteği
- TUI arayüz
- Yerel çalışma

## Başlangıç

```bash
npm install
npm run build
mooncode
```

## Temel Komutlar

- `/help` kısa yardım
- `/brain` bağlam ve öneriler
- `/autothink` otomatik düşünme
- `/browser` tarayıcı durumu
- `/mcp` MCP yönetimi
- `/doctor` sistem özeti

## Geliştirme

```bash
npm run check:ci
npm test
```

## Gereksinimler

- Node.js 20+
- Git

## Lisans

MIT
