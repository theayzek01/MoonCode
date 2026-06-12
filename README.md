<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="140" height="140" alt="MoonCode Logo" />

<h1>MoonCode v26.3</h1>

<p>
  <strong>Hem Terminal hem de Tarayıcı üzerinden erişilebilen otonom, hızlı ve zeki kodlama asistanı.</strong>
</p>

<p>
  <em>“Ey yükselen yeni kuşak! Gelecek sizindir.”</em><br/>
  <strong>~ Mustafa Kemal Atatürk</strong>
</p>

<br/>

<p>
  <a href="https://theayzek01.github.io/MoonCode/">
    <img src="https://img.shields.io/badge/DOCS-LIVE%20SITE-ffffff?style=for-the-badge&labelColor=111111&color=ffffff" alt="Live Docs" />
  </a>
  <a href="https://github.com/theayzek01/MoonCode">
    <img src="https://img.shields.io/badge/GITHUB-MOONCODE-ffffff?style=for-the-badge&logo=github&logoColor=white&labelColor=111111&color=ffffff" alt="GitHub Repo" />
  </a>
  <img src="https://img.shields.io/badge/NODE.JS-20%2B-ffffff?style=for-the-badge&logo=node.js&logoColor=white&labelColor=111111&color=ffffff" alt="Node.js 20+" />
  <img src="https://img.shields.io/badge/LICENSE-MIT-ffffff?style=for-the-badge&labelColor=111111&color=ffffff" alt="MIT License" />
</p>

</div>

---

<div align="center">

<strong>MoonCode V26.3 Dev Güncellemesi!</strong><br/>
Artık sadece terminal odaklı bir araç değil! <strong>Yepyeni, modern Web Arayüzü</strong>, <em>Gelişmiş Proje Yönetimi</em>, <em>Dahili Terminal Entegrasyonu</em>, <em>Multi-Model Desteği</em> ve kişiselleştirilebilir temalarla sınırları aşan bir AI iş arkadaşı.

<br/>
<br/>

<a href="https://theayzek01.github.io/MoonCode/">
  <strong>Canlı Dokümantasyonu Aç</strong>
</a>

</div>

---

## MoonCode Nedir?

MoonCode, geliştiriciler için çalışan **otonom bir kodlama asistanıdır**. İster terminalinden istersen de yepyeni web arayüzünden çalışarak kod yazabilir, hataları düzeltebilir ve terminal komutlarını senin için çalıştırabilir.

Yeni web arayüzü sayesinde tüm projelerini tek bir ekrandan yönetebilir, ChatGPT veya Claude arayüzüne benzeyen ancak **tamamen senin bilgisayarına entegre** bir deneyim yaşayabilirsin.

> Daha otonom.
> Daha geniş hafıza.
> Modern ve kullanışlı bir Web Arayüzü.

---

## Kurulum

### Hızlı Kurulum

Release paketinden kurulum yapmak için:

```bat
setup.bat install
```

### Geliştirici (Kaynak Koddan) Kurulumu

```bash
git clone https://github.com/theayzek01/MoonCode.git
cd MoonCode
npm install
npm run build
mooncode web
```

*(Not: Tarayıcı arayüzü için `mooncode web` veya terminal arayüzü için `mooncode` komutunu kullanabilirsiniz.)*

---

## 🔥 Yeni Özellikler (v26.3)

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:web.svg?color=white" width="30" height="30" alt="Web UI" />
    </td>
    <td>
      <strong>Modern Web Arayüzü (Web UI)</strong><br/>
      Terminalin kısıtlamalarından kurtulun! MoonCode artık <code>mooncode web</code> komutuyla yerel bir web sunucusu başlatır ve tüm projelerinizi modern, şık bir arayüzden yönetmenizi sağlar.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:folder-multiple.svg?color=white" width="30" height="30" alt="Projects" />
    </td>
    <td>
      <strong>Gelişmiş Proje Sistemi</strong><br/>
      Web arayüzünde dilediğiniz klasörü proje olarak ekleyebilir, her proje için ayrı oturumlar (chat geçmişleri) açabilir ve projeler arasında kolayca geçiş yapabilirsiniz.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:console.svg?color=white" width="30" height="30" alt="Terminal" />
    </td>
    <td>
      <strong>Dahili Canlı Terminal</strong><br/>
      Arayüzden hiç ayrılmadan komut satırına erişin! Alt kısımdan açılabilen "MoonCode Terminal" paneli ile anlık olarak komut çalıştırabilir (npm, git vs.) ve çıktıları anlık takip edebilirsiniz.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:brain.svg?color=white" width="30" height="30" alt="Multi-Model" />
    </td>
    <td>
      <strong>Çoklu Yapay Zeka (Multi-Model) Desteği</strong><br/>
      Kullanıcı ayarlarına gidin ve anında modelinizi değiştirin: <em>Claude 3.7 Sonnet</em>, <em>Gemini 2.5 Pro</em>, <em>DeepSeek V3/R1</em>, <em>GPT-4o</em> ve dahası! Ajanın yetki seviyesini belirleyerek (Admin/Normal/Read-Only) güvenliğinizi sağlayın.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:history.svg?color=white" width="30" height="30" alt="Time Travel" />
    </td>
    <td>
      <strong>Time-Travel Debugging & Hafıza</strong><br/>
      Eski mesajları silebilir, düzenleyebilir, sabitleyebilirsiniz. MoonCode kod profilinizi zamanla öğrenir ve sizin stilinizde kodlar yazar.
    </td>
  </tr>
</table>

## Temel Özellikler

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:palette.svg?color=white" width="30" height="30" alt="Themes" />
    </td>
    <td>
      <strong>Dinamik Temalar</strong><br/>
      Karanlık mod yetmedi mi? Ayarlardan <em>Mooncode</em>, <em>Ocean</em>, <em>Dark</em> veya <em>Light</em> temalarından birini seçin, tüm editör renkleri (Highlight.js dahil) anında değişsin.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:bridge.svg?color=white" width="30" height="30" alt="Browser Bridge" />
    </td>
    <td>
      <strong>Browser Bridge & Otonomi</strong><br/>
      Otonom ajan interneti senin gibi gezer. Chrome eklentisiyle birlikte çalışıp doküman okuyabilir, hata mesajlarını Google'da araştırabilir.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:connection.svg?color=white" width="30" height="30" alt="MCP" />
    </td>
    <td>
      <strong>MCP Desteği</strong><br/>
      Model Context Protocol (MCP) sayesinde her türlü veritabanına, harici araçlara ve API'lara sorunsuz eklenebilir.
    </td>
  </tr>
</table>

---

## Temel Komutlar

MoonCode size hem Terminal (TUI) hem de Web (GUI) deneyimi sunar:

<table>
  <tr>
    <th align="left">Komut</th>
    <th align="left">Açıklama</th>
  </tr>
  <tr>
    <td><code>mooncode web</code></td>
    <td>Yeni ve modern web arayüzünü başlatır (Önerilen). <code>http://localhost:3131</code> üzerinden erişilir.</td>
  </tr>
  <tr>
    <td><code>mooncode</code></td>
    <td>Klasik TUI arayüzü üzerinden terminalin içinde başlatır.</td>
  </tr>
</table>

---

## Dokümantasyon

<table>
  <tr>
    <th align="left">Kaynak</th>
    <th align="left">Bağlantı</th>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:web.svg?color=white" width="18" height="18" alt="Docs" />
      Canlı site
    </td>
    <td>
      <a href="https://theayzek01.github.io/MoonCode/">theayzek01.github.io/MoonCode</a>
    </td>
  </tr>
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:github.svg?color=white" width="18" height="18" alt="GitHub" />
      GitHub repo
    </td>
    <td>
      <a href="https://github.com/theayzek01/MoonCode">github.com/theayzek01/MoonCode</a>
    </td>
  </tr>
</table>

---

## Geliştirme ve Katkı

Projeyi derlemek ve yerel test yapmak isterseniz:

```bash
npm run clean
npm run build
npm test
```

---

## Lisans

Bu proje **MIT Lisansı** ile lisanslanmıştır. Gönül rahatlığıyla kullanabilir, kopyalayabilir ve değiştirebilirsiniz.

---

<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="72" height="72" alt="MoonCode Logo" />

<br/>
<br/>

<strong>MoonCode</strong><br/>
İster terminalde, ister web'de... Sınırları aşan yerel ve akıllı kodlama deneyimi.

</div>
