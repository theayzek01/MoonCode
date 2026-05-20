<div align="center">
  <img src="assets/MooncodeWhiteBanner.png" alt="MoonCode Banner" width="100%" />

  <br />

  <p>
    <b>MoonCode</b><br />
    Terminal tabanlı otonom yazılım geliştirme asistanı
  </p>

  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" />
    <img src="https://img.shields.io/badge/CLI-000000?style=flat" />
    <img src="https://img.shields.io/badge/Version-2026--Pre16-blue?style=flat" />
  </p>
</div>

---

# MoonCode

MoonCode, terminal üzerinden çalışan otonom bir geliştirme asistanıdır.  
Kod tabanını analiz eder, ilgili dosyaları bulur, değişiklik önerileri üretir ve belirli görevleri ajan tabanlı iş akışlarıyla yürütebilir.

Özellikle büyük projelerde bağlamı daha verimli kullanmak, tekrar eden geliştirme adımlarını azaltmak ve terminalden çıkmadan kod üzerinde çalışmak için tasarlanmıştır.

---

## Özellikler

### Kod tabanı analizi

MoonCode, proje dosyalarını indeksleyerek görevle ilgili bölümleri daha hızlı bulmaya çalışır.  
Bu sayede her işlemde tüm dosyaları modele göndermek yerine, yalnızca gerekli bağlamı kullanmaya odaklanır.

### Otonom görev yürütme

Bazı görevlerde MoonCode tek seferlik cevap üretmek yerine süreci adımlara bölebilir:

- Dosyaları inceleme
- Hata veya eksik noktaları tespit etme
- Kod değişikliği önerme
- Gerekirse düzeltme döngüsü çalıştırma

### 3D, oyun ve grafik odaklı destek

MoonCode; Roblox, Lua, Three.js, WebGL ve benzeri 3D/grafik odaklı projelerde daha kaliteli yapı üretmeye odaklanır.

Amaç yalnızca çalışan kod üretmek değil; sahne yapısı, materyal kullanımı, mesh hiyerarşisi ve görsel detayları da dikkate alan çıktılar oluşturmaktır.

### Terminal arayüzü

MoonCode, terminal içinde çalışan özel bir TUI arayüzü sunar.

Arayüz; model durumu, görev ilerlemesi, bağlam kullanımı, maliyet bilgisi ve sistem durumunu tek ekranda takip etmeyi kolaylaştırır.

### Web köprüsü

MoonCode, gerektiğinde web üzerinden dokümantasyon veya kaynak araştırması yapabilecek şekilde yapılandırılabilir.  
Bu özellik, terminalden çıkmadan güncel bilgiye ulaşmayı ve geliştirme sürecine dahil etmeyi amaçlar.

---

## Kurulum

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

npm install
npm run build

cd packages/cli
npm link
````

Kurulumdan sonra herhangi bir projede şu komutla çalıştırabilirsiniz:

```bash
mooncode
```

---

## Komutlar

| Komut      | Açıklama                                                               |
| :--------- | :--------------------------------------------------------------------- |
| `/swarm`   | Büyük görevleri birden fazla ajana bölerek yürütür.                    |
| `/fix`     | Derleme, lint veya çalışma zamanı hatalarını bulup düzeltmeye çalışır. |
| `/evolve`  | MoonCode’un kendi kaynak kodu üzerinde iyileştirme süreci başlatır.    |
| `/index`   | Projenin semantik kod haritasını çıkarır.                              |
| `/browser` | Web araştırması veya dokümantasyon okuma modunu başlatır.              |

---

## Güncelleme

Yeni sürümü çekmek ve projeyi tekrar derlemek için:

```bash
git pull origin pr-branch

npm run clean
npm install
npm run build

cd packages/cli
npm link
```

---

## PATH sorunu

`mooncode` komutu bulunamıyorsa global npm yolu sistem PATH değişkenine eklenmemiş olabilir.

### Windows

```bash
npm config get prefix
```

Çıkan yolu kopyalayıp Windows ortam değişkenlerinde `Path` içine ekleyin.
Daha sonra yeni bir terminal açıp tekrar deneyin:

```bash
mooncode
```

### macOS / Linux

Bash kullanıyorsanız:

```bash
echo 'export PATH="'$(npm config get prefix)'/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Zsh kullanıyorsanız:

```bash
echo 'export PATH="'$(npm config get prefix)'/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

---

## Ekran görüntüsü

<div align="center">
  <img src="assets/Mooncode update.png" alt="MoonCode Terminal UI" width="90%" />
</div>

---

## Topluluk

* Discord: [discord.gg/kanser](https://discord.gg/kanser)
* Instagram: [@theayzek01](https://instagram.com/theayzek01)

---

## Lisans

MIT License
Copyright © 2026 Ayzek
