# MoonCode Slash Commands & Features

Bu kılavuz, MoonCode'un sahip olduğu tüm yerleşik eğik çizgi (slash) komutlarını, işlevlerini ve ne amaçla kullanıldıklarını içerir.

---

## 1. Oturum Yönetimi (Session Management)

- **/new**
  - *Açıklama:* Mevcut oturumu kapatır ve tamamen temiz yeni bir oturum başlatır.
- **/resume**
  - *Açıklama:* Daha önce kaydedilmiş farklı bir oturumu listeler ve seçerek kaldığınız yerden devam etmenizi sağlar.
- **/name [yeni_isim]**
  - *Açıklama:* Aktif oturumun adını değiştirir. Oturum geçmişinde kolayca bulabilmeniz için isimlendirme yapmanızı sağlar.
- **/session**
  - *Açıklama:* Mevcut oturuma ait detaylı istatistikleri (mesaj sayısı, kullanılan tokenlar vb.) gösterir.
- **/context**
  - *Açıklama:* Güncel bağlam (context) doluluk oranını ve detaylı token kullanım analizini raporlar.
- **/compact**
  - *Açıklama:* Oturum bağlamını sıkıştırır. Geçmiş mesajlardaki gereksiz detayları özetleyerek bağlam sınırını (context limit) rahatlatır.
- **/fork**
  - *Açıklama:* Belirli bir mesaj adımından yeni bir oturum dalı (branch) oluşturur. Farklı alternatif yollar denemek için idealdir.
- **/clone**
  - *Açıklama:* Mevcut oturumu birebir kopyalayarak yeni bir oturum oluşturur.
- **/tree**
  - *Açıklama:* Oturumun geçmiş dallanma yapısını görselleştirir ve dallar arasında gezinmenizi sağlar.
- **/export [format]**
  - *Açıklama:* Oturumu `.html` veya `.jsonl` formatında dışa aktarır. HTML çıktısı şık bir sohbet görünümü sunar.
- **/import [dosya_yolu]**
  - *Açıklama:* `.jsonl` formatındaki eski bir oturum dosyasını MoonCode içerisine aktararak yükler.
- **/share**
  - *Açıklama:* Mevcut oturumu anonim bir GitHub Gist olarak paylaşmanızı sağlayan hızlı bir bağlantı oluşturur.
- **/copy**
  - *Açıklama:* Asistanın (MoonCode) verdiği son yanıtı doğrudan panonuza (clipboard) kopyalar.

---

## 2. Model ve Ayarlar (Model & Settings)

- **/models**
  - *Açıklama:* Kullanılabilir tüm LLM modellerini listeler ve aralarında hızlıca geçiş yapmanızı sağlar.
- **/scoped-models**
  - *Açıklama:* Sadece sık kullandığınız modelleri içeren hızlı geçiş listesini (quick-switch) düzenlemenizi sağlar.
- **/settings**
  - *Açıklama:* MoonCode'un genel ayarlar panelini açar (tema, onay modları, otomasyon sınırları vb.).
- **/autothink [on|off]**
  - *Açıklama:* Otomatik düşünme derinliğini (auto thinking level) açar veya kapatır. Açık olduğunda zorlu işlerde modeli derin düşünmeye zorlar.
- **/login**
  - *Açıklama:* Model sağlayıcılarının (OpenAI, Anthropic vb.) API anahtarlarını girmek ve doğrulamak için kimlik doğrulama panelini açar.

---

## 3. Çalışma Modları (Modes)

- **/plan [on|off]**
  - *Açıklama:* Salt okunur analiz (Plan) modunu açıp kapatır. Aktifken dosya yazma ve bash çalıştırma engellenir, model sadece kod okuyabilir ve analiz yapar.
- **/automation [on|off]**
  - *Açıklama:* Otomasyon modunu yönetir. Aktifken MoonCode tarayıcı ve terminal akışlarını tamamen otonom şekilde yürütebilir.
- **/agentmode**
  - *Açıklama:* Çoklu ajan (multi-agent) yapısının davranış ve katı kurallarını aktifleştirir veya kapatır.
- **/zen**
  - *Açıklama:* Terminal arayüzündeki fazlalıkları gizleyerek sade, minimalist bir sohbet görünümü (Zen Modu) sunar.

---

## 4. Araçlar ve Entegrasyonlar (Tools & Integration)

- **/init**
  - *Açıklama:* Bulunulan dizinde projeye özel `MOON.md` veya `AGENTS.md` konfigürasyon dosyalarını oluşturur.
- **/ship**
  - *Açıklama:* Git entegrasyonunu tetikler; sırasıyla branch açar, değişiklikleri commit'ler, push'lar ve Pull Request (PR) oluşturur.
- **/diff**
  - *Açıklama:* Git üzerinde yapılmış olan güncel kod değişikliklerini terminal içinde renkli olarak listeler.
- **/index**
  - *Açıklama:* Kod tabanını tarayarak semantik arama (vector search) için indeks oluşturur veya var olan indeksi yeniler.
- **/browser**
  - *Açıklama:* MoonCode Chrome Tarayıcı Köprüsü'nün bağlantı durumunu kontrol eder ve tarayıcıyı komutla yönetmenizi sağlar.
- **/mcp**
  - *Açıklama:* Sisteme bağlı olan Model Context Protocol (MCP) sunucularını ve sağladıkları araçları listeler.
- **/swarm**
  - *Açıklama:* Çoklu otonom ajan swarm (oğul) yapısını tetikleyerek karmaşık mimari görevleri paylaştırır.
- **/fix**
  - *Açıklama:* Autonomous Auto-Healer (Otomatik İyileştirme) döngüsünü başlatarak derleme veya test hatalarını kendi kendine çözer.
- **/evolve**
  - *Açıklama:* Meta-Evrim döngüsünü başlatır; MoonCode'un kendi kodunu analiz edip kendi kendini geliştirmesini sağlar.

---

## 5. Eklenti ve Tema Pazarı (Extensions & Marketplace)

- **/marketplace**
  - *Açıklama:* MoonCode için geliştirilmiş topluluk eklentilerini (extension) ve görsel temaları keşfedip kurabileceğiniz mağazayı açar.
- **/agents**
  - *Açıklama:* Proje içindeki özel rol tanımlı alt ajanların listesini ve aktif durumlarını yönetir.

---

## 6. Güncelleme ve Sistem (System)

- **/update**
  - *Açıklama:* MoonCode terminal istemcisini internet üzerinden en son kararlı sürüme günceller.
- **/ollama**
  - *Açıklama:* Yerel makinenizde çalışan Ollama modellerinin yüklenmesini, silinmesini ve listelenmesini sağlar.
- **/hotkeys**
  - *Açıklama:* TUI arayüzündeki tüm kısayol tuş kombinasyonlarını ve klavye haritasını listeler.
- **/changelog**
  - *Açıklama:* MoonCode sürümleriyle birlikte gelen yenilikleri ve hata düzeltmelerini kronolojik olarak gösterir.
- **/reload**
  - *Açıklama:* Eklenti, yapılandırma ve sistem bileşenlerini oturumu kapatmadan yeniden yükler.
- **/hub**
  - *Açıklama:* MoonCode Dashboard panelini ve aktif projeler merkezini açar.
- **/metrics**
  - *Açıklama:* Bellek tüketimi, CPU yükü, ağ gecikmesi ve token maliyeti gibi detaylı sistem metriklerini canlı grafiklerle gösterir.
- **/quit**
  - *Açıklama:* MoonCode terminal arayüzünden güvenli bir şekilde çıkış yapar.
