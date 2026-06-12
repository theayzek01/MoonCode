import fs from 'fs';

const filePath = 'c:/Users/ozenc/Desktop/mooncode/packages/cli/src/modes/web/web-ui.html';
let content = fs.readFileSync(filePath, 'utf8');

// replace the broken line
content = content.replace("if (statusBadge) {\r\nRUNNING' : 'CLOSED');", "if (statusBadge) {\r\n\t\t\tstatusBadge.textContent = connected ? 'CONNECTED' : (data.running ? 'RUNNING' : 'CLOSED');");
content = content.replace("if (statusBadge) {\nRUNNING' : 'CLOSED');", "if (statusBadge) {\n\t\t\tstatusBadge.textContent = connected ? 'CONNECTED' : (data.running ? 'RUNNING' : 'CLOSED');");

// Let's also translate the surrounding bridge texts
content = content.replace("label.textContent = connected ? 'Bridge ConnectedÄ±' : 'BridgeÃ¼';", "label.textContent = connected ? 'Bridge Connected' : 'Bridge';");
content = content.replace("`BaÄŸlÄ± â€” ${data.clients} tarayÄ±cÄ± istemcisi`", "`Connected — ${data.clients} browser client(s)`");
content = content.replace("'Sunucu Ã§alÄ±ÅŸÄ±yor, baÄŸlÄ± istemci yok' : 'BridgeÃ¼ sunucusu kapalÄ±'", "'Server running, no connected client' : 'Bridge server closed'");
content = content.replace("label.textContent = 'BridgeÃ¼';", "label.textContent = 'Bridge';");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed successfully.');
