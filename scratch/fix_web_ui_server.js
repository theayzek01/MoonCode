import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/core/web-ui-server.ts';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  { from: "this.innerText = \\'Copyndı\\'", to: "this.innerText = \\'Copied\\'" },
  { from: "Oturum bulunamadı.", to: "No sessions found." },
  { from: 'const authorLabel = isUser ? "Kullanıcı" : "MoonCode";', to: 'const authorLabel = isUser ? "User" : "MoonCode";' },
  { from: '<span>Aktif</span>', to: '<span>Active</span>' },
  { from: '<span>✅ Tool Sonucu</span>', to: '<span>✅ Tool Result</span>' },
  { from: '<h1>Oturum Boş</h1>', to: '<h1>Session Empty</h1>' },
  { from: '<p>Henüz bu oturumda kaydedilmiş bir mesaj yok. CLI üzerinden konuşma başlattığınızda burada anlık olarak akacaktır.</p>', to: '<p>There are no messages in this session yet. When you start a conversation via CLI, it will flow here in real-time.</p>' },
  { from: 'alert("TUI kilidi açma hatası: " + err.message);', to: 'alert("TUI unlock error: " + err.message);' },
  { from: 'alert("Gönderim hatası: " + data.error);', to: 'alert("Send error: " + data.error);' },
  { from: 'alert("Gönderim bağlantı hatası: " + err.message);', to: 'alert("Send connection error: " + err.message);' },
  { from: '<span>💡 Düşünce Zinciri (Genişletmek için tıklayın)</span>', to: '<span>💡 Thought Chain (Click to expand)</span>' },
];

replacements.forEach(rep => {
  const old = content;
  content = content.replace(rep.from, rep.to);
  if (content !== old) {
    console.log(`Replaced: ${rep.from.substring(0, 40)}`);
  } else {
    console.log(`Not found: ${rep.from.substring(0, 40)}`);
  }
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Finished fixing web-ui-server.ts.');
