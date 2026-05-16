<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
  
  <br>
  
  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/VectorDB-FF4500?style=for-the-badge&logo=databricks&logoColor=white" />
    <img src="https://img.shields.io/badge/Autonomous-Engine-blue?style=for-the-badge" />
  </p>
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
| **Çalışma Ortamı** | **✓** Native Terminal (Çok Hafif) | **✕** Ağır IDE (Electron) |
| **Sürü Zekası** | **✓** Paralel Ajanlar (Mimar, Coder) | **✕** Tekil Model |

<br>

### ◈ Token & Maliyet Karşılaştırması

MoonCode, standart bir yapay zeka gibi tüm dosyayı kopyalayıp LLM'e göndermez. **AST tabanlı Semantik Filtreleme** kullanarak sadece ilgili kod parçacıklarını (chunk) seçer.

<table width="100%">
  <tr>
    <th align="left">Metrik (2000 satırlık dosya)</th>
    <th align="center">MoonCode (VectorDB)</th>
    <th align="center">Geleneksel Araçlar (Full Context)</th>
  </tr>
  <tr>
    <td><b>Okunan Token (1 İstek)</b></td>
    <td align="center">~ 500 Token</td>
    <td align="center">~ 15.000 Token</td>
  </tr>
  <tr>
    <td><b>Maliyet (Yaklaşık)</b></td>
    <td align="center"><b>$0.001</b></td>
    <td align="center"><b>$0.045</b></td>
  </tr>
  <tr>
    <td><b>Tasarruf Oranı</b></td>
    <td align="center" colspan="2"><b>✓ Ortalama %96 Daha Ucuz</b></td>
  </tr>
</table>

<details>
<summary><b>🔍 Nasıl Bu Kadar Tasarruf Ediyor? (Tıkla ve İncele)</b></summary>
<p>
MoonCode, projenizi ilk açtığınızda bir harita çıkarır. Siz bir fonksiyonu değiştirmek istediğinizde, tüm projeyi LLM'e okutmak yerine sadece o fonksiyonu ve bağlı olduğu modülleri yapay zekaya verir. Bu sayede yapay zeka gereksiz verilerle yorulmaz, hızlanır ve maliyet sıfıra yaklaşır.
</p>
</details>

<br>

**◈ Gerçek Otonomi:** Hata mı çıktı? Kodu yazar, testi koşturur, hata alırsa logları okuyup tekrar dener. Sen sadece en son çıkan doğru koda onay verirsin.

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
