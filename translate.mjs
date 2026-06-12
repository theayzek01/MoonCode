import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  // Welcome Modal
  [/MoonCode'a Ho.*? Geldin/g, "Welcome to MoonCode"],
  [/En geli.*?mi.*? yapay zeka destekli kodlama asistan.*?nla tan.*?\.\s*<br>.*?te bilmen gereken birka.*? .*?ey:/g, "Meet your advanced AI coding assistant.<br>Here is what you need to know:"],
  [/Haf.*?za ve .*?renme/g, "Memory & Learning"],
  [/Mesajlar.*? be.*?endi.*?inde, tarz.*?n.*? .*?renir ve sana g.*?re kod yazar\./g, "Likes teach it your coding style so it adapts to you."],
  [/G.*?l.*? Sa.*?lay.*?c.*?lar/g, "Powerful Providers"],
  [/Ollama, GitLab Duo, Anthropic ve daha fazlas.*?\.\.\. Hepsi yerle.*?ik!/g, "Ollama, GitLab Duo, Anthropic, and more... Built-in!"],
  [/Komutlar/g, "Commands"],
  [/\/build, \/lint, \/test gibi komutlarla projeni an.*?nda y.*?net\./g, "Instantly manage projects with /build, /lint, /test."],
  [/>\s*Ba.*?la\s*</g, ">Get Started<"],

  // Main UI
  [/Bug.*?n nas.*?l yard.*?mc.*? olabilirim\?/g, "How can I help you today?"],
  [/Kodunuzu yaz.*?n, hata ay.*?klay.*?n, refactor yap.*?n veya s.*?f.*?rdan proje ba.*?lat.*?n\./g, "Write code, debug, refactor, or start a project from scratch."],
  [/>\s*Kod incele\s*</g, ">Code Review<"],
  [/>\s*Derle\s*</g, ">Build<"],
  [/>\s*Test A.*?la.*?\s*</g, ">Run Tests<"],
  [/>\s*Kod review\s*</g, ">Code Review<"],
  [/MoonCode'a mesaj yaz.*?n.*? \(Enter = g.*?nder, Shift\+Enter = yeni sat.*?r\)/g, "Message MoonCode... (Enter = send, Shift+Enter = new line)"],
  [/MoonCode yapay zeka hatalar yapabilir\. Kritik bilgileri do.*?rulay.*?n\./g, "MoonCode AI can make mistakes. Verify critical information."],
  
  // Sidebar & Topbar
  [/>\s*Yeni Sohbet\s*</g, ">New Chat<"],
  [/>\s*Proje Dizini Se.*?\s*</g, ">Select Project Directory<"],
  [/>\s*AKT.*?F PROJE D.*?Z.*?N.*?\s*</g, ">ACTIVE PROJECT DIRECTORY<"],
  [/>\s*Ayarlar\s*</g, ">Settings<"],
  [/>\s*Tema\s*</g, ">Theme<"],
  [/>\s*K.*?sayollar\s*</g, ">Shortcuts<"],
  [/>\s*D.*?nme: Kapal.*?\s*</g, ">Thinking: Off<"],
  [/>\s*D.*?nme: A.*?k\s*</g, ">Thinking: On<"],
  [/>\s*Aktar\s*</g, ">Import<"],
  [/>\s*Payla.*?\s*</g, ">Share<"],

  // Tooltips and Buttons
  [/title="Kopyala"/g, 'title="Copy"'],
  [/title="D.*?zenle"/g, 'title="Edit"'],
  [/title="Sil"/g, 'title="Delete"'],
  [/title="Sabitle"/g, 'title="Pin"'],
  [/title="Payla.*?"/g, 'title="Share"'],
  [/title="Be.*?en"/g, 'title="Like"'],
  [/title="Be.*?enme"/g, 'title="Dislike"'],
  [/>\s*.*?ptal\s*</g, ">Cancel<"],
  [/>\s*Kaydet\s*</g, ">Save<"],

  // Toasts
  [/Panoya kopyaland.*?/g, "Copied to clipboard"],
  [/'Kopyaland.*?'/g, "'Copied'"],
  [/'Kopyaland.*? \(Fallback\)'/g, "'Copied (Fallback)'"],
  [/'Geri bildirim i.*?in te.*?ekk.*?rler! \(.*?\)'/g, "'Thanks for the feedback! (Learned)'"],
  [/'Geri bildirim al.*?nd.*?'/g, "'Feedback received'"],
  [/'Geri bildirim kaydedilemedi\.'/g, "'Failed to save feedback.'"],
  [/'Mesaj g.*?ncellendi'/g, "'Message updated'"],
  [/'G.*?ncelleme ba.*?ar.*?s.*?z oldu'/g, "'Update failed'"],
  [/'Mesaj.*? silmek istedi.*?inize emin misiniz\?'/g, "'Are you sure you want to delete this message?'"],
  [/'Mesaj silindi'/g, "'Message deleted'"],
  [/'Silme i.*?lemi ba.*?ar.*?s.*?z oldu'/g, "'Deletion failed'"],
  [/'Oturum dalland.*?r.*?ld.*? - yeni dal aktif'/g, "'Session forked - new branch active'"],
  [/'Fork ba.*?ar.*?s.*?z oldu'/g, "'Fork failed'"],
  [/'Oturum ba.*?ar.*?yla i.*?e aktar.*?ld.*?'/g, "'Session successfully imported'"],
  [/'.*?e aktarma ba.*?ar.*?s.*?z oldu'/g, "'Import failed'"],
  [/'Ge.*?mi.*? silindi'/g, "'History cleared'"],
  [/'Ba.*?lant.*? koptu, yeniden ba.*?lan.*?l.*?yor\.\.\.'/g, "'Connection lost, reconnecting...'"],
  [/'Ba.*?lant.*? sa.*?land.*?'/g, "'Connection restored'"],
  [/'API hatas.*?'/g, "'API error'"],

  // Missing fallbacks
  [/D.*?zenle/g, "Edit"],
  [/G.*?ncelle/g, "Update"]
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Translation complete!");
