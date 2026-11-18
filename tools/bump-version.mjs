// ═══════════════════════════════════════════════
// Cache-busting: stamps every local .js / .css reference with ?v=<version>
//
// The hosting server tells browsers to keep .js files for a YEAR, so a phone
// that once downloaded a broken file keeps using it. Changing the URL
// (?v=...) forces every browser to download the current file.
//
// Run before every upload to the hosting:
//     node tools/bump-version.mjs
// then upload ALL changed .html and .js files.
// ═══════════════════════════════════════════════

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const d = new Date();
const pad = (n) => String(n).padStart(2, '0');
const version = process.argv[2] ||
  `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}`;

const SKIP_DIRS = new Set(['.git', 'node_modules', 'supabase', 'tools', '.claude']);

function walk(dir, out = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) {
      if (!SKIP_DIRS.has(name)) walk(p, out);
    } else if (/\.(html|js)$/.test(name)) {
      out.push(p);
    }
  }
  return out;
}

// import ... from './x.js' · import './x.js' · export * from './x.js' · import('./x.js')
const MODULE_SPEC = /((?:\bfrom|\bimport)\s*\(?\s*)(['"])(\.{1,2}\/[^'"?#]+\.js)(?:\?v=[^'"]*)?\2/g;
// <script src="js/x.js"> · <link href="css/x.css">  (local files only)
const HTML_ATTR = /\b(src|href)="(?!https?:|\/\/|#|mailto:|tel:|data:)([^"?#]+\.(?:js|css))(?:\?v=[^"]*)?"/g;

let changed = 0;
for (const file of walk(root)) {
  const src = fs.readFileSync(file, 'utf8');
  let next = src.replace(MODULE_SPEC, (_m, pre, q, spec) => `${pre}${q}${spec}?v=${version}${q}`);
  if (file.endsWith('.html')) {
    next = next.replace(HTML_ATTR, (_m, attr, url) => `${attr}="${url}?v=${version}"`);
  }
  if (next !== src) {
    fs.writeFileSync(file, next);
    changed++;
    console.log('  updated', path.relative(root, file));
  }
}
console.log(`\nVersion ${version} applied to ${changed} files.`);
