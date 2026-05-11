const { execSync } = require('child_process');
try {
  const output = execSync('npm run build', { cwd: 'C:/Users/ozenc/OneDrive/Desktop/Mooncli2/mooncli', encoding: 'utf-8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.error("ERROR:");
  console.error(e.stdout);
  console.error(e.stderr);
}

