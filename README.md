<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="128" height="128" alt="MoonCode Logo" />

<h1>MoonCode</h1>

<p><strong>Gelişmiş Otonom Kodlama Ortamı ve CLI Asistanı</strong></p>

<p>
  <a href="https://github.com/theayzek01/MoonCode"><img src="https://img.shields.io/badge/GitHub-Repository-181717?style=flat-square&logo=github" alt="GitHub"></a>
  <img src="https://img.shields.io/badge/Node.js-%3E%3D18.0.0-339933?style=flat-square&logo=nodedotjs" alt="Node.js">
  <img src="https://img.shields.io/badge/License-MIT-00599C?style=flat-square" alt="License">
</p>

</div>

---

## ⚡ Genel Bakış

MoonCode, doğrudan çalışma alanınızda (workspace) çalışan, profesyonel düzeyde otonom bir kodlama asistanı ve IDE'dir. Terminal komutları, tarayıcı testleri ve kod düzenleme süreçlerini tek bir platformda birleştirerek, bağlam (context) şişkinliği yaratmadan eksiksiz bir geliştirici ortamı sunar.

## 🚀 Temel Özellikler

*   **🎛️ IDE Odaklı Arayüz**
    Yüzen "sohbet uygulaması" balonlarına veda edin. Sıfır boşluklu (flush panel), alta sabitlenmiş (docked) katı bir düzen. VS Code / Cursor felsefesine sadık, tamamen profesyonel Web UI.
*   **🧠 Çoklu Model Motoru**
    Claude 3.7 Sonnet, Gemini 2.5 Pro, GPT-4o, DeepSeek V3/R1 gibi sektör lideri modeller arasında doğrudan API veya OpenRouter üzerinden anında geçiş yapın.
*   **🌐 Browser Bridge (Tarayıcı Otonomisi)**
    Sunucunuzu ayağa kaldırır, tarayıcıyı açar, sayfalarda gezinir ve yaptığı işi görsel olarak teyit etmek için DOM yapılarını okur.
*   **💾 Gelişmiş Bağlam Yönetimi (Context)**
    Session Forking (Oturum Dallandırma), yerel JSONL geçmiş kaydı ve yüksek performanslı **Session Compaction (Sıkıştırma)** mekanizması. Devasa projelerde token limitine takılmayı ve yavaşlamayı önler.
*   **⌨️ Komut Paleti (Command Palette)**
    Hızlı geliştirici iş akışları için yerleşik kısayollar: `/build`, `/test`, `/review`, `/compact`.

---

## ⚙️ Kurulum

### Hızlı Kurulum (Windows)

```bat
setup.bat install
```

### Manuel Kurulum ve Derleme

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode

# Bağımlılıkları yükleyin
npm install

# Projeyi derleyin
npm run build

# Global olarak sisteme kurun
npm install -g .
```

---

## 💻 Kullanım

Modern IDE arayüzünü başlatmak için terminalinizde:
```bash
mooncode web
```

Sadece CLI üzerinden kullanmak için:
```bash
mooncode
```

---

## 🤝 Katkıda Bulunma

MoonCode açık kaynaklı bir projedir. Katkılarınızı bekliyoruz:
1. Projeyi forklayın
2. Kendi feature branch'inizi oluşturun (`git checkout -b feature/YeniOzellik`)
3. Değişikliklerinizi commit'leyin (`git commit -m 'feat: Yeni özellik eklendi'`)
4. Branch'inize push'layın (`git push origin feature/YeniOzellik`)
5. Bir Pull Request açın

## 📄 Lisans

Bu proje **MIT Lisansı** altında lisanslanmıştır. Dilediğiniz gibi kullanabilir ve geliştirebilirsiniz.
