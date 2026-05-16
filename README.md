<div align="center">
  <img src="assets/Moon-cli-banner.png" alt="MoonCode" width="100%" />
  
  <br />

  <p align="center">
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/VectorDB-FF4500?style=for-the-badge&logo=databricks&logoColor=white" />
    <img src="https://img.shields.io/badge/Hardened-Security-blue?style=for-the-badge" />
  </p>
</div>

```diff
@@ SİSTEM BAŞLATILIYOR @@
+ MoonCode Mühendislik İstasyonu [v2026.2.0]
+ Durum: Çevrimiçi, Tam Otonom
- Eski Nesil IDE'ler: Devre Dışı
```

## [ GENEL BAKIŞ ]

MoonCode, standart kodlama asistanlarının sınırlarını aşan, son derece optimize edilmiş, otonom bir AI mühendislik terminalidir. Derin depo (repository) anlayışı, vektör tabanlı semantik filtreleme ve paralel ajan yürütme mimarisi ile doğrudan iş akışınıza entegre olur.

Sadece kod önermekle kalmaz. Tüm kod tabanını okur, testleri yazar, derleme işlemini gerçekleştirir, hata loglarını (stack trace) analiz eder ve gerekli yamaları otonom olarak uygular.

---

## [ MİMARİ ]

Sistem, yürütme motorunun her zaman hafif kalmasını ve yoğun LLM operasyonları sırasında bile arayüzün akıcı olmasını sağlayan "decoupled" (ayrıştırılmış) bir monorepo yapısı üzerinde çalışır.

```json
{
  "packages": {
    "core": "Sinir merkezi. VectorDB, Denetim Yönetimi ve Native FFI Köprülerini işler.",
    "engine": "Yürütme beyni. Swarm (Sürü) mimarisini yönetir ve Meta-Evrim döngüsünü çalıştırır.",
    "cli": "Yüksek performanslı arayüz. Tarayıcı Köprü Sunucusu ve yerel ortam bağlamaları.",
    "tui": "Diferansiyel render katmanı. Sürekli veri akışında terminalin titremesini engeller."
  }
}
```

---

## [ BENCHMARK & METRİKLER ]

Standart yapay zeka araçları, tüm dosyaları LLM'e göndererek devasa bir bağlam (context) israfı yaratır. MoonCode, **Semantik Bağlam Sıkıştırma (Context Compaction)** uygulayarak yalnızca VectorDB'den ilgili işlevsel parçaları çeker.

```diff
> PERFORMANS KARŞILAŞTIRMASI <

  [ Metrik ]                [ MoonCode ]         [ Claude Code ]      [ Cursor ]
! Token Harcaması           Optimize (-%80)      Tüm Dosya            Kısmi
! Otonom Düzeltme           Sonsuz Döngü         Sınırlı              Yok
! Çalışma Ortamı            Native Terminal      Node.js              Electron IDE
! Bağlam Motoru             Vector DB            Temel Arama          İndeksli
```

> **Verimlilik Notu:** 2000 satırlık bir dosyada tek bir fonksiyonu değiştirmek, MoonCode ile token maliyetinin çok küçük bir kısmına denk gelir. Sistem AST (Soyut Sözdizimi Ağacı) haritasını çıkarır, parçaları vektörize eder ve yalnızca düzenleme için gereken kesin bağımlılıkları LLM'e gönderir.

---

## [ KURULUM ]

Mühendislik istasyonunu yerel makinenizde başlatmak için aşağıdaki derleme sekansını çalıştırın. Node.js >= 20.0.0 gerektirir.

```bash
> Repoyu klonla
$ git clone https://github.com/theayzek01/MoonCode.git
$ cd MoonCode

> Çekirdek motoru derle
$ npm install
$ npm run build

> Global ortama bağla
$ npm install -g ./packages/cli

> İstasyonu başlat
$ mooncode
```

---

## [ KOMUT PROTOKOLLERİ ]

İstasyona giriş yaptıktan sonra, yürütme akışını slash (/) komutları ile kontrol edersiniz.

* `/swarm` | Karmaşık görevleri paralelleştirmek için çoklu ajan kümesini (Mimar, Kodlayıcı, İnceleyici) devreye sokar.
* `/fix`   | Otonom kendi kendini iyileştirme döngüsünü tetikler. Derleyici hatalarını tarar ve onarır.
* `/evolve`| MoonCode'un kendi mimarisini yeniden yapılandırmasına (refactor) olanak tanıyan meta-evrim motorunu etkinleştirir.
* `/index` | Mevcut depo için semantik VectorDB indeksini sıfırdan oluşturur.
* `/browser`| Web etkileşimi için MoonCode Chrome Eklentisine olan bağlantıyı yönetir.

---

## [ TELEMETRİ & GÜVENLİK ]

Kurumsal düzeydeki operasyonlar mutlak şeffaflık gerektirir. MoonCode, katı bir yerel denetim iziyle çalışır. Her LLM kararı, dosya değişikliği ve terminal komutu yürütmesi, dahili `AuditManager` aracılığıyla güvenli bir şekilde günlüğe kaydedilir. Hiçbir veri gizlice dışarı aktarılmaz.

---

## [ AĞ & TOPLULUK ]

Çekirdek ekiple ve diğer mühendislerle bağlantı kurun:

* **[ Discord ]**  <https://discord.gg/kanser>
* **[ Instagram ]** <https://instagram.com/theayzek01>

---

<div align="center">
  <img src="assets/Moon-cli-logo.png" alt="MoonCode Logo" width="60" />
  <br />
  <code>[ Hızlı hareket et. Sorunları çöz. Moon kal. ]</code>
  <br />
  <br />
  <sub>MIT License | Copyright (c) 2026 Ozen (theayzek01)</sub>
</div>
