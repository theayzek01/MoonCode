<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
</div>

<br>

# ✦ MoonCode

MoonCode, terminalden çıkmadan bütün projeyi yönetmeni sağlayan otonom bir mühendislik asistanıdır. 

Sadece kod yazıp bırakmaz; projeni okur, testleri çalıştırır, hataları bulur ve sen onay verene kadar düzeltir. 

<br>

---

<br>

## ❖ Neden MoonCode?

Piyasada bir sürü AI aracı var (Cursor, Claude Code, Windsurf vb.). MoonCode'un onlardan farkı ne?

<br>

| Özellik | MoonCode | Diğer Araçlar |
| :--- | :--- | :--- |
| **Otonomi** | **✓** Tam Otonom (Kendi test eder, düzeltir) | **✕** Sadece Kod Önerir |
| **Bağlam (Context)** | **✓** Semantik Filtre (Sadece ilgili kodu okur) | **✕** Tüm Dosyayı Gönderir |
| **Maliyet (Token)** | **✓** Ortalama %80 daha ucuz | **✕** Sürekli limit doldurur |
| **Çalışma Ortamı** | **✓** Native Terminal (Çok Hafif) | **✕** Ağır IDE (Electron) |

<br>

**◈ Gerçek Otonomi:** Hata mı çıktı? Kodu yazar, testi koşturur, hata alırsa logları okuyup tekrar dener. Sen sadece en son çıkan doğru koda onay verirsin.

**◈ Token Tasarrufu:** 2000 satırlık bir dosyada tek satır değiştirmek için tüm dosyayı yapay zekaya göndermez. Sadece ilgili 50 satırı (chunk) VectorDB'den çeker.

<br>

---

<br>

## ❖ Kurulum

Sadece birkaç komutla çalışmaya hazır:

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

npm install
npm run build
npm install -g ./packages/cli
```

<br>

---

<br>

## ❖ Nasıl Kullanılır?

Terminale sadece `mooncode` yazman yeterli.

**1 ▹ İsteğini söyle:** Örn: _"Kullanıcı giriş sistemini yaz ve testlerini ekle."_
**2 ▹ Arkanı yaslan:** MoonCode dosyaları tarar, plan yapar ve kodu yazar.
**3 ▹ Onayla:** Ekrana gelen değişiklikleri kontrol et, mantıklıysa terminalden onayla ve dosyalarına işlensin.

<br>

### ✧ İstasyon Komutları

Yapay zekayı yönlendirmek için terminalden bu komutları kullanabilirsin:

| Komut | Yetenek | Açıklama |
| :--- | :--- | :--- |
| **`/swarm`** | **❖** Sürü Zekası | Büyük işleri mimar, coder ve reviewer ajanlarına bölerek paralel çözdürür. |
| **`/fix`** | **⚙** Otonom Tamir | Projedeki derleme veya linter hatalarını bulur ve tamamen düzelene kadar loop'a girer. |
| **`/evolve`**| **⌬** Meta-Evrim | MoonCode'un kendi kaynak kodunu okuyup kendini geliştirmesini sağlar. |
| **`/index`** | **☷** Vektör Dizini | Hızı 10 kat artırmak için projenin AST tabanlı anlamsal (semantic) haritasını çıkarır. |
| **`/browser`**| **◧** Web Köprüsü | Terminalden çıkmadan webt'te araştırma yapmasını veya döküman okumasını sağlar. |

<br>

---

<br>

## ❖ İletişim & Topluluk

Projeyle ilgili bir sorun yaşarsan, fikir vermek istersen veya sadece muhabbet etmek istersen buradayız:

* **Discord:** [discord.gg/kanser](https://discord.gg/kanser)
* **Instagram:** [@theayzek01](https://instagram.com/theayzek01)

<br>

---

<br>

<div align="center">
  <img src="assets/Moon-cli-logo.png" alt="MoonCode Logo" width="60" />
  <br><br>
  <b>Hızlı hareket et. Sorunları çöz. Moon kal.</b>
  <br><br>
  <sub>MIT License | Copyright (c) 2026 Ozen (theayzek01)</sub>
</div>
