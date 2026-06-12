import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  [/Proje klas.*?r.*?n.*?n tam yolunu girin:/g, "Enter the full path of the project folder:"],
  [/Proje dizini de.*?i.*?tirildi/g, "Project directory changed"],
  [/Dizin de.*?i.*?tirilemedi/g, "Could not change directory"],
  [/Dizin de.*?i.*?tirme hatas.*?/g, "Directory change error"],
  [/Kod panoya kopyaland.*? .*? terminale yap.*?t.*?r.*?n/g, "Code copied to clipboard - paste into terminal"],
  [/K.*?pr.*? Ba.*?l.*?/g, "Bridge Connected"],
  [/K.*?pr.*?/g, "Bridge"],
  [/Sunucu .*?al.*?y.*?yor, ba.*?l.*? istemci yok/g, "Server running, no connected client"],
  [/K.*?pr.*? sunucusu kapal.*?/g, "Bridge server closed"],
  [/BA.*?LI/g, "CONNECTED"],
  [/.*?ALI.*?IYOR/g, "RUNNING"],
  [/KAPALI/g, "CLOSED"],
  [/D.*?a aktarma ba.*?ar.*?s.*?z/g, "Export failed"],
  [/D.*?a aktarma hatas.*?/g, "Export error"],
  [/.*?e aktarma hatas.*?/g, "Import error"],
  [/Payla.*?m ba.*?ar.*?s.*?z/g, "Share failed"],
  [/GitHub token gerekli/g, "GitHub token required"],
  [/Payla.*?m hatas.*?/g, "Share error"],
  [/\?"\?\?"\?/g, ""], // Fix the weird comment block headers
  [/[\uFFFDǬY]/g, ""] // General fallback for broken characters inside HTML like 
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Deep translation complete!");
