const fs = require('fs');
const path = require('path');
function walk(dir) {
  let results = [];
  try {
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
      if (file === 'node_modules' || file === '.git' || file === 'dist') return;
      file = path.resolve(dir, file);
      const stat = fs.statSync(file);
      if (stat && stat.isDirectory()) { 
        results = results.concat(walk(file));
      } else { 
        results.push(file);
      }
    });
  } catch (e) {
    results.push('Error reading ' + dir + ': ' + e.message);
  }
  return results;
}
fs.writeFileSync('C:\\Users\\ozenc\\OneDrive\\Desktop\\Mooncli2\\hodeuscli\\out.txt', walk('C:\\Users\\ozenc\\OneDrive\\Desktop\\Mooncli2\\hodeuscli\\packages').join('\n'));
