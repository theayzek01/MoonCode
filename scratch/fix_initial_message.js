import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/cli/initial-message.ts';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace('"arkadaş"', '"friend"');
content = content.replace('"Günaydın"', '"Good morning"');
content = content.replace('"Tünaydın"', '"Good afternoon"');
content = content.replace('"İyi akşamlar"', '"Good evening"');
content = content.replace('"İyi geceler"', '"Good night"');
content = content.replace('dim("MoonCode hazır. Düşünüyorum, kontrol ediyorum, kısa info önerileri sunuyorum."),', 'dim("MoonCode is ready. Thinking, checking, offering short info suggestions."),');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed initial-message.ts');
