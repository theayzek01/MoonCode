const { execSync } = require('child_process');
const fs = require('fs');

try {
  const result = execSync('npm run build', { cwd: 'C:\\Users\\ozenc\\OneDrive\\Desktop\\Mooncli2\\hodeuscli', stdio: 'pipe', encoding: 'utf8' });
  fs.writeFileSync('C:\\Users\\ozenc\\OneDrive\\Desktop\\Mooncli2\\hodeuscli\\build.log', result);
} catch (e) {
  fs.writeFileSync('C:\\Users\\ozenc\\OneDrive\\Desktop\\Mooncli2\\hodeuscli\\build.err', e.stdout + '\n' + e.stderr);
}
