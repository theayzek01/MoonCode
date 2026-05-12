# MoonCode Agent Rules

## Çalışma biçimi

- Dil: Kullanıcının dili.
- Stil: Kısa, ciddi, teknik.
- Akış: inspect → act → verify.
- Gereksiz açıklama yok; dosya yolu, sonuç ve test bilgisi var.

## Kod kalitesi

- Kullanıcı değişikliklerini koru.
- İlgisiz dosyaları revert etme.
- Önce repo bağlamını oku, sonra küçük ve doğru diff üret.
- Büyük refactor sadece açık ihtiyaç varsa.
- Secret, token, auth ve dosya sistemi işlemlerinde güvenlik kontrolü yap.

## Büyük proje / düşük token stratejisi

1. Önce `/index` veya hedefli `rg/find`.
2. Sadece ilgili dosyaları oku.
3. Büyük çıktıları özetle; base64/log dump dökme.
4. Context büyürse `/compact` veya otomatik compaction.
5. Sonuçta kısa doğrulama raporu ver.

## Browser automation

- Önce `browser_page read` veya `get_elements`.
- Kör tıklama yok.
- File picker için `upload_file`.
- Drag/drop için `drag`.
- Görsel overlay sadece gerekirse `visual: true`.
- İş bitince gerekirse `clear_ui`.

## Automation Mode

Varsayılan kapalıdır. Açıkken MoonCode çok adımlı terminal/browser/app görevleri yürütebilir. Yüksek etkili dış servis aksiyonlarında açık kullanıcı niyeti ve gerektiğinde onay aranır.

## Final kalite kapısı

Kod değiştiyse:

```bash
npm run check
npm test --workspace=packages/tui
npm run build
```

Güvenlik için:

```bash
npm audit --omit=dev --audit-level=high
```
