<div align="center">

<img src="https://i.hizliresim.com/q2e03b9.png" width="140" height="140" alt="MoonCode Logo" />

<h1>MoonCode v26.3</h1>

<p>
  <strong>Terminal için yerel, otonom, hızlı ve zeki kodlama asistanı.</strong>
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
Artık sadece terminal odaklı bir araç değil, <em>Time-Travel Debugging</em>, <em>Multi-Agent Swarm</em>, <em>Semantic RAG</em> ve <em>Long-Term Style Memory</em> destekleyen otonom bir AI iş arkadaşı.

<br/>
<br/>

<a href="https://theayzek01.github.io/MoonCode/">
  <strong>Canlı Dokümantasyonu Aç</strong>
</a>

</div>

---

## MoonCode Nedir?

MoonCode, geliştiriciler için terminal içinde çalışan **otonom bir kodlama asistanıdır**. Local-first yaklaşımı ile gizliliği ön planda tutar, terminal akışını bozmaz ve doğrudan kod yazıp hataları düzeltebilir.

Yeni özellikleri sayesinde sadece sorduğun sorulara cevap veren bir chat botundan fazlasıdır: Kod yazış stilini öğrenir, hataları zamanda geri alarak onarır ve alt ajanlarla takım halinde çalışır.

> Daha otonom.
> Daha geniş hafıza.
> Daha yerel ve kontrollü geliştirme deneyimi.

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
mooncode
```

---

## 🔥 Yeni Özellikler (v26.3)

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:history.svg?color=white" width="30" height="30" alt="Time Travel" />
    </td>
    <td>
      <strong>Time-Travel Debugging</strong><br/>
      Hata yapmaktan korkma! Ajan kod üzerinde tehlikeli işlemler yapmadan önce otomatik <code>snapshot</code> alır. Kod bozulursa, hata öncesine geri dönüp başka bir yol dener. (Ctrl+Z'nin otonom hali)
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:brain.svg?color=white" width="30" height="30" alt="Style Memory" />
    </td>
    <td>
      <strong>Long-Term Style Memory</strong><br/>
      Kullanıcının yazdığı kodu, favori kütüphanelerini, adlandırma standartlarını (örn. "Tailwind sevmez, Vanilla CSS sever") öğrenip kalıcı profiline işler. Kodlar tamamen senin elinden çıkmış gibi görünür.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:network.svg?color=white" width="30" height="30" alt="Swarm" />
    </td>
    <td>
      <strong>Multi-Agent Swarm (IPC)</strong><br/>
      Sadece tek bir yapay zeka ile sınırlı değilsin. Ana ajan, işi parçalara böler, "Researcher" ajanını internete bağlar, "Coder" ajanıyla IPC üzerinden iletişim kurarak paralel geliştirme sağlar.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:text-search.svg?color=white" width="30" height="30" alt="Semantic RAG" />
    </td>
    <td>
      <strong>Semantic RAG (Vektör Arama)</strong><br/>
      Kelime tabanlı aramaya veda et. <code>@xenova/transformers</code> kullanarak 100% lokal vektör (Embedding) veritabanı oluşturur. "Ödeme işlemcisi neredeydi?" dediğinde dosyayı anlamsal olarak bulup getirir.
    </td>
  </tr>
</table>

## Temel Özellikler

<table>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:console-line.svg?color=white" width="30" height="30" alt="Terminal" />
    </td>
    <td>
      <strong>TUI Arayüzü & Terminal Akışı</strong><br/>
      Komut satırından ayrılmadan, okunabilir metin düzeni, kaydırılabilir loglar, terminali tıkamayan native Alternate Screen Buffer desteği.
    </td>
  </tr>
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:bridge.svg?color=white" width="30" height="30" alt="Browser Bridge" />
    </td>
    <td>
      <strong>Browser Bridge</strong><br/>
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
  <tr>
    <td align="center" width="72">
      <img src="https://api.iconify.design/mdi:shield-lock-outline.svg?color=white" width="30" height="30" alt="Local First" />
    </td>
    <td>
      <strong>Lokal ve Güvenli</strong><br/>
      Varsayılan olarak Ollama (gemma4 vs.) yerel modellerini kullanır, ancak ihtiyaç anında Anthropic, OpenAI veya Gemini gibi bulut API'larına da geçebilir. Kodun senin bilgisayarında kalır.
    </td>
  </tr>
</table>

---

## Temel Komutlar (TUI)

TUI içerisinde `/` yazarak veya sohbet sırasında tetikleyebileceğiniz ana komutlar:

<table>
  <tr>
    <th align="left">Komut</th>
    <th align="left">Açıklama</th>
  </tr>
  <tr>
    <td><code>/help</code></td>
    <td>Hızlı yardım menüsünü açar.</td>
  </tr>
  <tr>
    <td><code>/brain</code></td>
    <td>Bağlamı, hafıza haritasını ve ajan önerilerini gösterir.</td>
  </tr>
  <tr>
    <td><code>/autothink</code></td>
    <td>Otomatik düşünme modunu (Otonomi) açar veya kapatır.</td>
  </tr>
  <tr>
    <td><code>/browser</code></td>
    <td>Browser Bridge bağlantı durumunu test eder.</td>
  </tr>
  <tr>
    <td><code>/mcp</code></td>
    <td>Model Context Protocol sunucularını yönetir.</td>
  </tr>
  <tr>
    <td><code>/doctor</code></td>
    <td>Sistem durumunu, ajan Swarm'larını ve ortam değişkenlerini raporlar.</td>
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
  <tr>
    <td>
      <img src="https://api.iconify.design/mdi:google-chrome.svg?color=white" width="18" height="18" alt="Browser Bridge" />
      Browser Bridge eklentisi
    </td>
    <td>
      <code>packages/cli/browser-extension/chrome</code>
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
Terminal içinde daha sakin, daha hızlı, daha akıllı ve daha yerel bir kodlama deneyimi.

</div>
