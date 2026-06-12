import fs from 'fs';

// 1. thinking-selector.ts
const thinkingPath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/components/thinking-selector.ts';
if (fs.existsSync(thinkingPath)) {
  let content = fs.readFileSync(thinkingPath, 'utf8');
  content = content.replace('"Düşünme kapalı"', '"Thinking off"');
  content = content.replace('"Çok kısa düşünme (~1k token)"', '"Very short thinking (~1k tokens)"');
  content = content.replace('"Hafif düşünme (~2k token)"', '"Light thinking (~2k tokens)"');
  content = content.replace('"Orta düşünme (~8k token)"', '"Medium thinking (~8k tokens)"');
  content = content.replace('"Derin düşünme (~16k token)"', '"Deep thinking (~16k tokens)"');
  content = content.replace('"Maksimum düşünme (~32k token)"', '"Maximum thinking (~32k tokens)"');
  fs.writeFileSync(thinkingPath, content, 'utf8');
  console.log('Fixed thinking-selector.ts');
}

// 2. scoped-models-selector.ts
const modelsPath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/components/scoped-models-selector.ts';
if (fs.existsSync(modelsPath)) {
  let content = fs.readFileSync(modelsPath, 'utf8');
  content = content.replace('"Model Yapılandırması"', '"Model Configuration"');
  content = content.replace('Sadece bu oturum için. Ayarlara kaydetmek için', 'For this session only. To save to settings, press');
  content = content.replace('değiştir', 'select');
  content = content.replace('sağlayıcı', 'provider');
  content = content.replace('sırala', 'reorder');
  content = content.replace('"  Eşleşen model bulunamadı"', '"  No matching model found"');
  content = content.replace('Sağlayıcı:', 'Provider:');
  content = content.replace('Bağlam:', 'Context:');
  content = content.replace('Düşünme:', 'Thinking:');
  content = content.replace('? "Var" : "Yok"', '? "Yes" : "No"');
  fs.writeFileSync(modelsPath, content, 'utf8');
  console.log('Fixed scoped-models-selector.ts');
}

// 3. settings-selector.ts
const settingsPath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/interactive/components/settings-selector.ts';
if (fs.existsSync(settingsPath)) {
  let content = fs.readFileSync(settingsPath, 'utf8');
  content = content.replace('"Düşünce yok"', '"No thinking"');
  content = content.replace('"Çok kısa düşünme (~1k token)"', '"Very short thinking (~1k tokens)"');
  content = content.replace('"Hafif düşünme (~2k token)"', '"Light thinking (~2k tokens)"');
  content = content.replace('"Orta seviye düşünme (~8k token)"', '"Medium thinking (~8k tokens)"');
  content = content.replace('"Derin düşünme (~16k token)"', '"Deep thinking (~16k tokens)"');
  content = content.replace('"Maksimum düşünme (~32k token)"', '"Maximum thinking (~32k tokens)"');
  
  content = content.replace('"Anthropic ek kullanım"', '"Anthropic extra usage"');
  content = content.replace('"Anthropic abonelik yetkilendirmesi ek ücretli kullanım yapabileceğinde uyar"', '"Warn when Anthropic subscription authorization can make extra paid usage"');
  content = content.replace('"  Seçmek için Enter · Geri dönmek için Esc"', '"  Enter to select · Esc to return"');
  content = content.replace('"Otomatik sıkıştırma"', '"Automatic compaction"');
  content = content.replace('"Bağlam çok büyüdüğünde otomatik olarak özetle/sıkıştır"', '"Automatically summarize/compact when context gets too large"');
  content = content.replace('"Yönlendirme modu"', '"Routing mode"');
  content = content.replace('"Akış sırasında Enter tuşu yönlendirme mesajlarını sıraya alır. \'one-at-a-time\': birini gönder, yanıt bekle. \'all\': hepsini birden gönder."', '"Enter key during stream queues routing messages. \'one-at-a-time\': send one, wait for response. \'all\': send all at once."');
  content = content.replace('"Alt+Enter tuşu motor durana kadar takip mesajlarını sıraya alır. \'one-at-a-time\': birini gönder, yanıt bekle. \'all\': hepsini birden gönder."', '"Alt+Enter key queues follow-up messages until engine stops. \'one-at-a-time\': send one, wait for response. \'all\': send all at once."');
  content = content.replace('"Taşıma protokolü"', '"Transport protocol"');
  content = content.replace('"Birden fazla protokolü destekleyen sağlayıcılar için tercih edilen yöntem"', '"Preferred method for providers supporting multiple protocols"');
  content = content.replace('"Düşünceleri gizle"', '"Hide thoughts"');
  content = content.replace('"Asistan yanıtlarındaki düşünme bloklarını gizle"', '"Hide thinking blocks in assistant responses"');
  content = content.replace('"Değişim günlüğünü daralt"', '"Collapse changelog"');
  content = content.replace('"Güncellemelerden sonra özet değişim günlüğünü göster"', '"Show summary changelog after updates"');
  content = content.replace('"Sessiz başlangıç"', '"Quiet start"');
  content = content.replace('"Başlangıçta ayrıntılı çıktıları devre dışı bırak"', '"Disable verbose output at startup"');
  content = content.replace('"Güncellemelerden sonra anonim bir sürüm/güncelleme bildirimi gönder"', '"Send an anonymous version/update notification after updates"');
  content = content.replace('"Çift Escape eylemi"', '"Double Escape action"');
  content = content.replace('"Editör boşken Escape tuşuna iki kez basıldığındaki eylem"', '"Action when Escape key is pressed twice while editor is empty"');
  content = content.replace('"Ağaç filtre modu"', '"Tree filter mode"');
  content = content.replace('" /tree komutu açıldığındaki varsayılan filtre"', '"Default filter when /tree command is opened"');
  content = content.replace('"Bireysel uyarıları etkinleştir veya devre dışı bırak"', '"Enable or disable individual warnings"');
  content = content.replace('"yapılandır"', '"configure"');
  content = content.replace('"Düşünme seviyesi"', '"Thinking level"');
  content = content.replace('"Düşünme yeteneğine sahip modeller için akıl yürütme derinliği"', '"Reasoning depth for models capable of thinking"');
  content = content.replace('"Düşünme Seviyesi"', '"Thinking Level"');
  content = content.replace('"Düşünme yeteneğine sahip modeller için akıl yürütme derinliğini seçin"', '"Select reasoning depth for thinking-capable models"');
  content = content.replace('"Arayüz için renk teması"', '"Color theme for the UI"');
  content = content.replace('"Renk temasını seçin"', '"Select color theme"');
  content = content.replace('"Resimleri göster"', '"Show images"');
  content = content.replace('"Resimleri terminalde satır içi olarak işle"', '"Render images inline in the terminal"');
  content = content.replace('"Resim genişliği"', '"Image width"');
  content = content.replace('"Terminal hücrelerinde tercih edilen satır içi resim genişliği"', '"Preferred inline image width in terminal cells"');
  content = content.replace('"Resimleri otomatik boyutlandır"', '"Auto-resize images"');
  content = content.replace('"Daha iyi model uyumluluğu için büyük resimleri maksimum 2000x2000 olarak boyutlandır"', '"Resize large images to maximum 2000x2000 for better model compatibility"');
  content = content.replace('"Resimlerin sağlayıcılara gönderilmesini engelle"', '"Prevent images from being sent to providers"');
  content = content.replace('"Yetenek komutları"', '"Skill commands"');
  content = content.replace('"Yetenekleri /skill:isim komutları olarak kaydet"', '"Save skills as /skill:name commands"');
  content = content.replace('"Donanım imlecini göster"', '"Show hardware cursor"');
  content = content.replace('"Donanım imlecini göster"', '"Show hardware cursor"');
  content = content.replace('"Donanım imlecini göster"', '"Show hardware cursor"');
  content = content.replace('"IME desteği için imleci konumlandırırken terminal imlecini de göster"', '"Show terminal cursor when positioning cursor for IME support"');
  content = content.replace('"Editör dolgusu"', '"Editor padding"');
  content = content.replace('"Giriş editörü için yatay dolgu (0-3)"', '"Horizontal padding for input editor (0-3)"');
  content = content.replace('"Otomatik tamamlama maks. öğe"', '"Autocomplete max items"');
  content = content.replace('"Otomatik tamamlama açılır menüsünde görünecek maks. öğe (3-20)"', '"Max items to appear in autocomplete dropdown (3-20)"');
  content = content.replace('"İçerik daraldığında boş satırları temizle (titremeye neden olabilir)"', '"Clear empty lines when content shrinks (may cause flickering)"');
  content = content.replace('"Terminal sekme çubuğunda OSC 9;4 ilerleme göstergelerini göster"', '"Show OSC 9;4 progress indicators in terminal tab bar"');
  
  fs.writeFileSync(settingsPath, content, 'utf8');
  console.log('Fixed settings-selector.ts');
}
