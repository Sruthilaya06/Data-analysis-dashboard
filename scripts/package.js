import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const distDir = path.join(rootDir, 'dist');
const singleHtmlPath = path.join(rootDir, 'DataAnalysisDashboard.html');
const distHtmlPath = path.join(distDir, 'DataAnalysisDashboard.html');
const readmePath = path.join(rootDir, 'README.txt');
const distReadmePath = path.join(distDir, 'README.txt');

console.log('=============================================================');
console.log('  DATA ANALYSIS DASHBOARD - PHASE 2.4 SINGLE-FILE PACKAGER');
console.log('=============================================================');

// 1. Verify dist/index.html exists
const builtHtmlPath = path.join(distDir, 'index.html');
if (!fs.existsSync(builtHtmlPath)) {
  console.error('[ERROR] dist/index.html not found. Please run "vite build" first.');
  process.exit(1);
}

// 2. Read Vite singlefile HTML output
let htmlContent = fs.readFileSync(builtHtmlPath, 'utf8');

// Ensure script is executed in standard deferred mode for 100% universal file:// compatibility in Chrome & Edge
// This completely circumvents any browser module CORS restrictions on local file:// URLs.
htmlContent = htmlContent.replace(/<script\s+type="module"\s+crossorigin>/gi, '<script defer>');

// 3. Write DataAnalysisDashboard.html to root and dist
fs.writeFileSync(singleHtmlPath, htmlContent, 'utf8');
fs.writeFileSync(distHtmlPath, htmlContent, 'utf8');

// Copy README.txt into dist
if (fs.existsSync(readmePath)) {
  fs.copyFileSync(readmePath, distReadmePath);
}

// 4. Clean up any temporary or extraneous files from dist (e.g. copied sample CSVs, old bat/ps1)
const filesInDist = fs.readdirSync(distDir);
for (const file of filesInDist) {
  if (file !== 'DataAnalysisDashboard.html' && file !== 'README.txt' && file !== 'index.html') {
    const p = path.join(distDir, file);
    try {
      fs.rmSync(p, { recursive: true, force: true });
    } catch (_) {}
  }
}

// Also clean up any legacy DataAnalysisDashboard/ multi-file directory from Phase 2.3 if present
const legacyFolder = path.join(rootDir, 'DataAnalysisDashboard');
if (fs.existsSync(legacyFolder) && fs.statSync(legacyFolder).isDirectory()) {
  try {
    fs.rmSync(legacyFolder, { recursive: true, force: true });
  } catch (_) {}
}

// 5. Measure exact file sizes
const htmlStats = fs.statSync(singleHtmlPath);
const readmeStats = fs.existsSync(readmePath) ? fs.statSync(readmePath) : { size: 0 };
const totalBytes = htmlStats.size + readmeStats.size;

const htmlKB = (htmlStats.size / 1024).toFixed(2);
const readmeKB = (readmeStats.size / 1024).toFixed(2);
const totalKB = (totalBytes / 1024).toFixed(2);
const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
const MAX_LIMIT_BYTES = 2 * 1024 * 1024; // 2 MB = 2,097,152 bytes

console.log('\n[PHASE 2.4 SINGLE-FILE DISTRIBUTION AUDIT]');
console.log('-------------------------------------------------------------');
console.log('File Name'.padEnd(35) + 'Bytes'.padStart(12) + 'KB'.padStart(12));
console.log('-------------------------------------------------------------');
console.log('DataAnalysisDashboard.html'.padEnd(35) + htmlStats.size.toString().padStart(12) + `${htmlKB} KB`.padStart(12));
console.log('README.txt'.padEnd(35) + readmeStats.size.toString().padStart(12) + `${readmeKB} KB`.padStart(12));
console.log('-------------------------------------------------------------');
console.log('TOTAL DISTRIBUTION SIZE:'.padEnd(35) + totalBytes.toString().padStart(12) + `${totalKB} KB`.padStart(12) + ` (${totalMB} MB)`);
console.log('MAX ALLOWED LIMIT:'.padEnd(35) + '2,097,152'.padStart(12) + '2,048.00 KB'.padStart(12) + ' (2.000 MB)');
console.log('-------------------------------------------------------------');

if (totalBytes <= MAX_LIMIT_BYTES) {
  const headroomBytes = MAX_LIMIT_BYTES - totalBytes;
  const headroomKB = (headroomBytes / 1024).toFixed(2);
  console.log(`\n[SUCCESS] Single-file distribution strictly below 2 MB limit!`);
  console.log(`Remaining Headroom: ${headroomBytes.toLocaleString()} bytes (${headroomKB} KB)\n`);
} else {
  console.error(`\n[FAIL] Package exceeds 2 MB limit by ${totalBytes - MAX_LIMIT_BYTES} bytes!`);
  process.exit(1);
}
