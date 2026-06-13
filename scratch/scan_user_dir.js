import { readdirSync, statSync } from 'fs';
import { join } from 'path';

const userDir = 'C:\\Users\\ozenc';

try {
  const files = readdirSync(userDir);
  console.log('--- Scanning User Directory for unusual hidden folders/files ---');
  for (const file of files) {
    const fullPath = join(userDir, file);
    try {
      const stats = statSync(fullPath);
      // We check for hidden or unusual folders/files
      const isHidden = file.startsWith('.') || file.toLowerCase() === 'appdata' || file.toLowerCase().includes('ntuser') || file.toLowerCase() === 'intel';
      if (!isHidden) {
        console.log(`- ${file} (${stats.isDirectory() ? 'Directory' : 'File'})`);
      }
    } catch (e) {
      // ignore individual stat errors
    }
  }
} catch (err) {
  console.error(err);
}
