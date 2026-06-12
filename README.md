<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="160" height="160" alt="MoonCode Logo" style="filter: drop-shadow(0px 0px 20px rgba(108,143,255,0.6));" />

<h1 style="font-size: 3em; margin-bottom: 0;">MoonCode</h1>
<strong>Yeni Nesil Otonom Yapay Zeka Kodlama Asistanı (v26.3)</strong>

<br/>

*“Ey yükselen yeni kuşak! Gelecek sizindir.”*
**~ Mustafa Kemal Atatürk**

<br/>

<p align="center">
  <a href="https://theayzek01.github.io/MoonCode/"><img src="https://img.shields.io/badge/📖_Live_Docs-111111?style=for-the-badge&logoColor=white&color=0055ff" alt="Docs"></a>
  <a href="https://github.com/theayzek01/MoonCode"><img src="https://img.shields.io/badge/💻_GitHub-111111?style=for-the-badge&logo=github&logoColor=white" alt="GitHub"></a>
  <img src="https://img.shields.io/badge/Node.js-20+-111111?style=for-the-badge&logo=node.js&logoColor=white&color=43853d" alt="Node">
  <img src="https://img.shields.io/badge/License-MIT-111111?style=for-the-badge&color=blueviolet" alt="License">
</p>

---

![MoonCode Web UI Showcase](https://i.hizliresim.com/q2e03b9.png) <!-- GÖRSEL İÇİN YER TUTUCU, ANCAK LOGO DEĞERLENDİRİLDİ -->

<br/>

</div>

## 🌌 MoonCode Nedir?

MoonCode, yazılımcılar için özel olarak tasarlanmış, **tam otonom** ve **sınırları aşan** bir kodlama asistanıdır. Kodu sadece yazmakla kalmaz; terminal komutlarını çalıştırır, projenizi derler, hataları bulur, tarayıcınızı açıp test eder ve sizin yerinize commit atar. 

Devasa projelerde kaybolmaz, kendi hafıza yönetimi ile **Time-Travel Debugging** yapar ve birden fazla yapay zeka modelini (Gemini, Claude, DeepSeek, OpenAI) tek bir platformda ustalıkla yönetir.

> **Sıradan bir chatbot değil; takımınızdaki en yetenekli Senior Developer.**

---

## ✨ Neden MoonCode?

### 🌐 Yepyeni Büyüleyici Web Arayüzü (Web UI)
Artık terminalin siyah ekranına hapsolmak yok! `mooncode web` yazın ve tamamen yerel çalışan modern web arayüzüne geçin. 
- Gerçek zamanlı kod önizlemeleri ve Diff (fark) gösterimi
- Dinamik temalar (Mooncode, Ocean, Dark, Light)
- Command Palette (`Cmd/Ctrl+K`) ve özel klavye kısayolları
- Sürükle & Bırak ile anında resim/dosya yükleme

### 🧠 Multi-Model Zekası & Düşünme Kapasitesi (Thinking)
Favori modelinize bağlı kalmayın. İstediğiniz an ayarlar panelinden modelinizi değiştirin:
- **Google Gemini 2.5 Pro / 3.1 Pro**
- **Anthropic Claude 3.7 Sonnet (Thinking)**
- **OpenAI GPT-4o / o1 / o3-mini**
- **DeepSeek V3 / R1**
ve yüzlercesi! *İsterseniz sadece OpenRouter API key'inizi girin ve sonsuz olasılığa kapı açın.*

### 🚀 Browser Bridge (Tarayıcı Otonomisi)
MoonCode sadece kodunuzu okumakla kalmaz. Projenizi ayağa kaldırır (ör: `npm run dev`), tarayıcınızı kontrol eder, sayfada gezinir, hataları tespit eder ve hatta sizin için dökümantasyon okuyup kodunuza entegre eder!

### 📦 Gelişmiş Proje & Hafıza (Context) Yönetimi
Kod tabanınız devasa mı? Sorun değil!
- **Session Compaction:** Tek tıkla *(Compact tuşu)* MoonCode sohbet geçmişini yüksek sıkıştırma animasyonlarıyla harika bir şekilde özetler ve token limitine asla takılmazsınız.
- Birden fazla projeyi (Workspace) tek arayüzde yönetme
- "Chat History" ile geçmiş sohbetleri dallandırma (Fork) ve zaman yolculuğu.

---

## ⚡ Hızlı Başlangıç

### 1. Kolay Kurulum (Windows için)

Sadece saniyeler içinde çalıştırmak için:
```bat
setup.bat install
```

### 2. Geliştirici Kurulumu (Manuel)

Eğer kaynak koddan inşa etmek isterseniz (Tüm işletim sistemleri):

```bash
# Repoyu klonlayın
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

# Bağımlılıkları yükleyin
npm install

# Projeyi derleyin
npm run build

# Modern Web arayüzünü başlatın!
mooncode web
```

*(Sadece terminalde kalmak isterseniz `mooncode` komutunu çalıştırmanız yeterlidir.)*

---

## 🛠️ Temel Komutlar (Komut Paleti)

Arayüzde sohbet kısmına aşağıdaki komutları yazarak (veya `Ctrl+K` basarak) asistanı yönlendirin:

| Komut | Ne Yapar? |
| :--- | :--- |
| `/build` | Projenizdeki derleme (build) komutlarını bularak çalıştırır ve hataları çözer. |
| `/test` | Test süitini çalıştırır (Jest, Vitest, PyTest vb.) ve kırılan testleri onarır. |
| `/review` | Son yapılan değişiklikleri (Git diff) okur ve detaylı bir "Code Review" sunar. |
| `/ship` | Yaptığınız harika işleri toparlar, harika bir commit mesajı yazar ve Push'lar! |
| `/compact` | Aşırı iyi bir animasyon eşliğinde sohbeti sıkıştırır ve beynini rahatlatır. |

---

## 🎨 Temalar ve Özelleştirme

MoonCode, karanlık moddan sıkılanlar için birbirinden güzel 4 yerleşik tema sunar. Sağ üst köşedeki ayarlar ikonundan anında değiştirebilirsiniz:
- **Mooncode (Varsayılan):** Fütüristik uzay mavisi ve mor tonları.
- **Ocean:** Derin okyanus ferahlığı.
- **Dark:** Kod yazarken gözleri yormayan tam siyah deneyim.
- **Light:** Klasik ve temiz aydınlık mod.

---

## 🤝 Katkıda Bulunma (Contributing)

Siz de yeni ufuklara yelken açan bu projeye katkı sağlamak isterseniz PR'larınızı bekliyoruz!
1. Projeyi forklayın
2. Kendi branch'inizi oluşturun (`git checkout -b feature/HarikaOzellik`)
3. Değişiklikleri commit'leyin (`git commit -m 'feat: Harika özellik eklendi'`)
4. Branch'i push'layın (`git push origin feature/HarikaOzellik`)
5. Pull Request açın!

---

## 📜 Lisans

MoonCode tamamen özgürdür ve **MIT Lisansı** ile dağıtılmaktadır. Alın, kullanın, değiştirin, parçalayın ve daha iyisini yapın.

<br/>

<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="64" height="64" alt="MoonCode Logo" />
<br/>
<p style="font-size: 14px; color: gray;">Made with ❤️ by TheAyzek01 and the Open Source Community</p>

</div>
