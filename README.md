<div align="center">
  <img src="assets/MooncodeWhiteBanner.png" alt="MoonAgent banner" width="100%" />
  <p>
    <strong>MoonAgent (1.29-v2)</strong><br />
    Terminal odaklı, kendi kararlarını alabilen, "Browser Bridge" (İzole Tarayıcı) ve "Antigravity" zeka modelleriyle donatılmış efsanevi otonom kodlama asistanı.
  </p>
  <p>
    <img src="https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=nodedotjs&logoColor=white" alt="Node.js" />
    <img src="https://img.shields.io/badge/TUI-Custom-111827?style=flat" alt="Custom TUI" />
    <img src="https://img.shields.io/badge/Browser-Bridge-0F766E?style=flat" alt="Browser Bridge" />
    <img src="https://img.shields.io/badge/MCP-Blender%20Ready-2563EB?style=flat" alt="Blender MCP" />
    <img src="https://img.shields.io/badge/Docs-GitHub%20Pages-1D4ED8?style=flat" alt="Docs Site" />
    <img src="https://img.shields.io/badge/Antigravity-1.27--v2-8B5CF6?style=flat" alt="Antigravity 1.29-v2" />
  </p>
  <p>
    <a href="https://theayzek01.github.io/MoonCode/"><strong>Dokümantasyon Sitesi</strong></a>
    ·
    <a href="docs/MOONAGENT_DEEP_DIVE.md"><strong>Derinlemesine İnceleme</strong></a>
    ·
    <a href="docs/integrations/BROWSER_CONTROL.md"><strong>Browser Bridge</strong></a>
    ·
    <a href="docs/README.md"><strong>Docs İndeksi</strong></a>
  </p>
</div>

---

## MoonAgent Nedir?

MoonAgent, ekrandaki gereksiz gürültüde boğulmadan gerçek işler başarmak isteyenler için tasarlanmış **terminal öncelikli** (terminal-first) bir otonom kodlama asistanıdır.

Standart LLM kılıfına sarılmış chatbotlardan ziyade, şu basit ideolojiyi takip eder:

- Dar kapsamlı ama net analiz et
- Yapılabilecek en doğru ve en küçük değişikliği yap
- Gerçek bir terminal testi/komutu ile doğrula
- Token kullanımını (maliyet ve hızı) kontrol altında tut

MoonAgent, sadece gösterişli bir chatbot olmaya çalışmaz. Custom TUI (Terminal Arayüzü), İzole Tarayıcı Kontrolü (Isolated Browser), MCP entegrasyonları ve saatler süren uzun soluklu çalışma yeteneğiyle tam bir mühendislik ortamı sunar.

---

## Geliştiriciler Neden MoonAgent Kullanıyor?

<table>
  <tr>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/15.%20Search.png" width="16" height="16" alt="Search icon" />
      <strong> Odaklı Repo Çalışması</strong><br />
      Daha az okur, daha iyi arar. Projeyi bozacak geniş çaplı ve yıkıcı değişikliklerden kaçınır.
    </td>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Computer%20Systems/1.%20Pointer.png" width="16" height="16" alt="Pointer icon" />
      <strong> Gerçek Araç Orkestrasyonu</strong><br />
      Terminal (Shell), Tarayıcı (Browser), Git, MCP ve lokal proje komutlarını tek bir oturumda mükemmel bir uyumla yönetir.
    </td>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/5.%20Refresh.png" width="16" height="16" alt="Refresh icon" />
      <strong> Canlı Terminal İş Akışı</strong><br />
      Statik, tek seferlik bir "prompt" kutusu yerine aktif, canlı bir TUI (Terminal User Interface) seansı üzerine kuruludur.
    </td>
  </tr>
  <tr>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Browser/7.%20Download.png" width="16" height="16" alt="Download icon" />
      <strong> Doğrulama İşin Bir Parçasıdır</strong><br />
      Kodu sadece yazıp bırakmaz; derler (build), test eder, hataları okur ve her şeyi bizzat terminal çıktısına bakarak düzeltir.
    </td>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Social/4.%20Chat.png" width="16" height="16" alt="Chat icon" />
      <strong> Daha Az Laf, Daha Çok İş</strong><br />
      Sadece gösteriş amaçlı uzun cümleler yerine, gerçek geliştirme sürecinde okunabilir kalması için optimize edilmiş kısa çıktılar verir.
    </td>
    <td valign="top" width="33%">
      <img src="packages/cli/browser-extension/chrome/icons/Computer%20Systems/15.%20Wait.png" width="16" height="16" alt="Wait icon" />
      <strong> Uzun Çalışma Oturumları</strong><br />
      Oturum sıkıştırma (session compaction), token disiplini ve adım adım çalışma (staged work) özellikleri sayesinde saatlerce çökmeden çalışır.
    </td>
  </tr>
</table>

---

## Rakiplerinden Farkı Ne?

| Alan | MoonAgent v1.29-v2 | Geleneksel CLI Ajanları (Cursor vs) |
| --- | --- | --- |
| **Düzenleme Stili** | Küçük, hedeflenmiş ve hatasız değişiklikler | Genellikle projeyi bozan geniş çaplı ve gürültülü yeniden yazımlar |
| **Bağlam (Context)** | Tasarımı gereği kompakt ve verimli | Çabucak şişer ve pahalılaşır |
| **Çalışma Yüzeyi** | TUI + Terminal + **İzole Tarayıcı** + MCP | Genellikle sadece shell veya sohbet arayüzü |
| **Tarayıcı Hakimiyeti** | Kendi özel Chrome penceresi, **Sanal Fare (Virtual Mouse)** ve otonom test | Genelde eksik veya sahte (mock) API çağrıları |
| **GitHub Entegrasyonu**| Kendi kendine commit atar, PR açar, inceleme (review) yapar | Sadece kod yazar, git işlemlerini insana bırakır |
| **Oturum Modeli** | Kalıcı (Persistent) ve operasyonel | Genellikle unutkan (stateless) veya sığ hafıza |

MoonAgent oldukça kararlı bir bakış açısına sahiptir: İşi pürüzsüz ve temiz bir şekilde bitirmeyi, "havalı" görünmeye tercih eder.

---

## Hızlı Başlangıç

### Klonla ve Kur (Tek Hamlede Kurulum)

Windows CMD (Komut İstemcisi) veya PowerShell'i açıp doğrudan aşağıdaki kodu yapıştırarak eskisini silip tamamen sıfırdan kurabilirsiniz:

```cmd
rmdir /s /q mooncode 2>nul & git clone https://github.com/theayzek01/mooncode.git && cd mooncode && npm install && npm run build && npm install -g ./packages/cli
```

### Çalıştır

```bash
mooncode
```

### Sık Kullanılan Geliştirici Komutları

| Komut | Amacı |
| --- | --- |
| `npm run build --workspace=packages/cli` | CLI paketini derler |
| `npm run build --workspace=packages/engine` | Engine paketini derler |
| `npm run test --workspace=packages/tui -- --runInBand` | TUI testlerini çalıştırır |
| `npm run check:browser-smoke` | Tarayıcı köprüsü sağlığını ve güvenlik kontrollerini yapar |
| `mooncode --version` | Yüklü olan CLI sürümünü gösterir |

---

## Temel Arayüz (TUI) Komutları

Terminale girdiğinizde kullanabileceğiniz efsanevi özellikler:

| Komut | Ne İşe Yarar? |
| --- | --- |
| `/help` | Komutları ve klavye kısayollarını gösterir |
| `/index` | Çok daha hedeflenmiş aramalar için tüm kod tabanının haritasını çıkarır |
| `/browser` | Tarayıcı köprüsünün bağlantısını ve durumunu kontrol eder |
| `/mcp` | Bağlı MCP sunucularını kontrol eder ve yeniden başlatır |
| `/compact` | Token maliyetini azaltmak için konuşma geçmişini (context) sıkıştırır |
| `/ship` | Değişiklikleri Git iş akışı üzerinden çok daha hızlı Github'a yollar |
| `/fix` | Tamamen otonom hata onarım modunu başlatır |

---

## Browser Bridge (İzole Tarayıcı) & MCP Mimarisi

MoonAgent, terminalin dışındaki dış dünyaya (tarayıcılar, araçlar, API'ler) müdahale etmeye başladığında asıl gücünü gösterir.

### Browser Bridge (v1.29-v2 ile yenilendi!)

- **Tamamen İzole Pencere:** Sen Chrome'da işlerine devam ederken MoonAgent kendine karanlık temalı, özel kenarlıklı bir popup pencere açarak sessizce işini yapar.
- **Sanal Fare (Virtual Mouse):** Arka planda ne tıkladığını, formu nasıl doldurduğunu izleyebileceğin bir sanal imleç barındırır.
- Görsel doğrulama (screenshot okuma) ve akıllı DOM-algılama teknolojisi.
- Detaylar için: [BROWSER_CONTROL.md](docs/integrations/BROWSER_CONTROL.md)

### MCP (Model Context Protocol)

- Dış araç sunucularıyla (tool servers) ajanın yeteneklerini sınırların ötesine taşır.
- Canlı uygulamalar, veritabanları veya özel çalışma zamanlarıyla iletişim kurar.
- Hangi aracın ne zaman kullanılacağını anlayacak kadar zekidir.

---

## Detaylı Dokümantasyonlar

MoonAgent'ın efsanevi mimarisini daha derinlemesine öğrenmek istiyorsan buraya alalım:

- [Dokümantasyon Web Sitesi](https://theayzek01.github.io/MoonCode/)
- [Genel Sistem Özeti](docs/INTRODUCTION.md)
- [Antigravity Modelleri](docs/integrations/ANTIGRAVITY.md)
- [Anthropic (Thinking) Modelleri](docs/integrations/ANTHROPIC.md)
- [Codex Entegrasyonu](docs/integrations/CODEX.md)
- [GitHub Otonom İşlemleri](docs/integrations/GITHUB_CLI.md)
- [Proje Mimarisi](docs/ARCHITECTURE.md)
- [Proje Klasör Yapısı](docs/PROJECT_STRUCTURE.md)

---

## Kimler İçin?

- Gerçek anlamda tüm vaktini terminalde geçiren "Hardcore" geliştiriciler.
- Gürültüden ve kalabalıktan uzak, temiz kodlama asistanı isteyen takımlar.
- Context (Token) maliyetini israf etmek istemeyenler.
- Hem tarayıcı testlerini yapıp hem de veritabanına sorgu atabilen entegre bir yapay zeka deneyimi arayanlar.

---

## Lisans

MIT
