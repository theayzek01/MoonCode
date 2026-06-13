import { readdirSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';

const projectDirs = [
  'C:\\Users\\ozenc\\Desktop\\02-Projeler',
  'C:\\Users\\ozenc\\Projeler'
];

function analyzeProject(path) {
  const result = {
    path,
    name: path.split('\\').pop(),
    type: 'Unknown',
    desc: 'No description available.',
    mainFiles: []
  };

  try {
    const files = readdirSync(path);
    result.mainFiles = files.filter(f => !f.startsWith('.') && f !== 'node_modules' && f !== 'dist');

    // Detect type
    if (files.includes('package.json')) {
      result.type = 'Node.js / JS / TS';
      try {
        const pkg = JSON.parse(readFileSync(join(path, 'package.json'), 'utf8'));
        if (pkg.description) result.desc = pkg.description;
        if (pkg.name) result.name = pkg.name;
      } catch (e) {}
    } else if (files.includes('requirements.txt') || files.some(f => f.endsWith('.py'))) {
      result.type = 'Python';
    } else if (files.includes('index.html')) {
      result.type = 'Static Web';
    } else if (files.includes('Cargo.toml')) {
      result.type = 'Rust';
    } else if (files.includes('build.gradle') || files.includes('pom.xml')) {
      result.type = 'Java / Gradle';
    } else if (files.some(f => f.endsWith('.sln') || f.endsWith('.csproj'))) {
      result.type = 'C# / .NET';
    }

    // Read README.md for description
    const readmeFile = files.find(f => f.toLowerCase() === 'readme.md');
    if (readmeFile) {
      try {
        const content = readFileSync(join(path, readmeFile), 'utf8');
        const firstLine = content.split('\n').find(l => l.trim().length > 0);
        if (firstLine) {
          result.desc = firstLine.replace(/^#+\s*/, '').trim();
        }
      } catch (e) {}
    }
  } catch (e) {
    return null;
  }

  return result;
}

console.log('--- Analyzing Projects ---');
const analysis = [];
for (const dir of projectDirs) {
  if (!existsSync(dir)) continue;
  const folders = readdirSync(dir);
  for (const folder of folders) {
    const fullPath = join(dir, folder);
    const analyzed = analyzeProject(fullPath);
    if (analyzed) {
      analysis.push(analyzed);
    }
  }
}

console.log(JSON.stringify(analysis, null, 2));
