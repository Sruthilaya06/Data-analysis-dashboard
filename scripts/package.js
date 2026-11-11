import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const packageDir = path.join(rootDir, 'DataAnalysisDashboard');

console.log('=============================================================');
console.log('  DATA ANALYSIS DASHBOARD - OFFLINE PACKAGE BUILDER');
console.log('=============================================================');

// 1. Verify dist exists
if (!fs.existsSync(distDir)) {
  console.error('[ERROR] dist/ directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// 2. Prepare clean package directory
if (fs.existsSync(packageDir)) {
  fs.rmSync(packageDir, { recursive: true, force: true });
}
fs.mkdirSync(packageDir, { recursive: true });
const packageAssetsDir = path.join(packageDir, 'assets');
fs.mkdirSync(packageAssetsDir, { recursive: true });

// 3. Copy production assets from dist
// Index HTML
fs.copyFileSync(path.join(distDir, 'index.html'), path.join(packageDir, 'index.html'));

// Favicon
if (fs.existsSync(path.join(distDir, 'favicon.svg'))) {
  fs.copyFileSync(path.join(distDir, 'favicon.svg'), path.join(packageDir, 'favicon.svg'));
}

// Copy JS & CSS from dist/assets
const distAssets = path.join(distDir, 'assets');
if (fs.existsSync(distAssets)) {
  const assetFiles = fs.readdirSync(distAssets);
  for (const file of assetFiles) {
    fs.copyFileSync(path.join(distAssets, file), path.join(packageAssetsDir, file));
  }
}

// 4. Copy launcher files
fs.copyFileSync(path.join(rootDir, 'Launch_Dashboard.bat'), path.join(packageDir, 'Launch_Dashboard.bat'));
fs.copyFileSync(path.join(rootDir, 'server.ps1'), path.join(packageDir, 'server.ps1'));
fs.copyFileSync(path.join(rootDir, 'README.txt'), path.join(packageDir, 'README.txt'));

// Also copy Launch_Dashboard.bat and server.ps1 into dist/ for convenience
fs.copyFileSync(path.join(rootDir, 'Launch_Dashboard.bat'), path.join(distDir, 'Launch_Dashboard.bat'));
fs.copyFileSync(path.join(rootDir, 'server.ps1'), path.join(distDir, 'server.ps1'));
fs.copyFileSync(path.join(rootDir, 'README.txt'), path.join(distDir, 'README.txt'));

// 5. Measure every file and calculate total package size
function scanDirectory(dir, relPrefix = '') {
  const items = fs.readdirSync(dir, { withFileTypes: true });
  const results = [];
  for (const item of items) {
    const fullPath = path.join(dir, item.name);
    const relPath = path.join(relPrefix, item.name);
    if (item.isDirectory()) {
      results.push(...scanDirectory(fullPath, relPath));
    } else {
      const stats = fs.statSync(fullPath);
      results.push({
        path: relPath.replace(/\\/g, '/'),
        bytes: stats.size,
        kb: (stats.size / 1024).toFixed(2)
      });
    }
  }
  return results;
}

const packageFiles = scanDirectory(packageDir);
let totalBytes = 0;

console.log('\n[PACKAGE CONTENTS & FILE SIZES]');
console.log('-------------------------------------------------------------');
console.log(
  'File Path'.padEnd(42) +
  'Bytes'.padStart(10) +
  'KB'.padStart(10)
);
console.log('-------------------------------------------------------------');

packageFiles.forEach(f => {
  totalBytes += f.bytes;
  console.log(
    f.path.padEnd(42) +
    f.bytes.toString().padStart(10) +
    `${f.kb} KB`.padStart(10)
  );
});

const totalKB = (totalBytes / 1024).toFixed(2);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
const MAX_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB = 2,097,152 bytes

console.log('-------------------------------------------------------------');
console.log(
  'TOTAL PORTABLE PACKAGE SIZE:'.padEnd(42) +
  totalBytes.toString().padStart(10) +
  `${totalKB} KB`.padStart(10) +
  ` (${totalMB} MB)`
);
console.log(`MAX ALLOWED LIMIT:                        2,097,152   2,048.00 KB (2.000 MB)`);
console.log('-------------------------------------------------------------');

if (totalBytes <= MAX_LIMIT_BYTES) {
  const headroomBytes = MAX_LIMIT_BYTES - totalBytes;
  const headroomKB = (headroomBytes / 1024).toFixed(2);
  console.log(`\n[SUCCESS] Package size strictly compliant!`);
  console.log(`Headroom under 2 MB: ${headroomBytes.toLocaleString()} bytes (${headroomKB} KB)\n`);
} else {
  console.error(`\n[FAIL] Package exceeds 2 MB limit by ${totalBytes - MAX_LIMIT_BYTES} bytes!`);
  process.exit(1);
}
