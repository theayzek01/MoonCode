# Mooncli

Minimal, hızlı ve kurumsal odaklı terminal kod asistanı.

## Sürüm
- **12.05.2026-v2**

## Kurulum
```bash
npm install -g mooncli
mooncli --version
```

## Hızlı Başlangıç
```bash
mooncli
```

## Temel Komutlar
```bash
mooncli --help
mooncli --version
mooncli --continue
mooncli browser-bridge
```

## Uzun Sohbet Stabilitesi
Mooncli otomatik compaction destekler.

`~/.Mooncli/engine/settings.json` içinde:
```json
{
  "compaction": {
    "profile": "aggressive",
    "enabled": true
  }
}
```

Profil seçenekleri:
- `aggressive`: erken toparlama, uzun oturum için önerilir
- `balanced`: varsayılan dengeli mod
- `off`: kapalı

## Tarayıcı Köprüsü (Chrome Extension)
Dizin:
- `packages/cli/browser-extension/chrome`

Yükleme:
1. `chrome://extensions`
2. Developer mode aç
3. **Load unpacked** ile klasörü seç

## Lisans
MIT
