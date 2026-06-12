import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

const replacements = [
  [/Ylem baYarsz oldu/g, "Operation failed"],
  [/Import error/g, "Import error"],
  [/BridgeǬ/g, "Bridge"],
  [/Sunucu alYyor, baYl istemci yok/g, "Server is running, no connected client"],
  [/BridgeǬ sunucusu kapal/g, "Bridge server closed"],
  [/"\?"\?"\?/g, ""],
  [/\uFFFD/g, ""], // wipe out replacement characters
  [/Ǭ/g, ""],
  [/Y/g, ""]
];

replacements.forEach(([regex, replacement]) => {
  content = content.replace(regex, replacement);
});

fs.writeFileSync(filePath, content, 'utf8');
console.log("Deep replacement done!");
