// Merges reviewed chunk files (each exports P = { verse: [parts] }) into src/content/parts<ch>.js.
// usage: node tools/merge_parts.mjs <chapter> <chunk1.js> [<chunk2.js> ...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [ch, ...files] = process.argv.slice(2);
if (!ch || !files.length) { console.error('usage: node tools/merge_parts.mjs <chapter> <chunk.js>...'); process.exit(2); }
const merged = {};
for (const f of files) {
  const mod = await import(pathToFileURL(path.resolve(f)).href + `?t=${Date.now()}`);
  for (const [n, list] of Object.entries(mod.P)) merged[n] = list;
}
const keys = Object.keys(merged).map(Number).sort((a, b) => a - b);
const q = (s) => JSON.stringify(s);
const fmt = (p) => {
  const fields = [`w: ${q(p.w)}`, `h: ${q(p.h)}`, `e: ${q(p.e)}`];
  for (const k of ['t', 'm', 'a', 'fit', 'ctx']) if (p[k] !== undefined) fields.push(`${k}: ${q(p[k]).replace(/","/g, '", "').replace(/\[/g, '[').replace(/"\]/g, '"]')}`);
  for (const k of ['v', 'fx']) if (p[k] !== undefined) fields.push(`${k}: ${q(p[k])}`);
  for (const k of ['d', 'cut']) if (p[k] !== undefined) fields.push(`${k}: ${q(p[k])}`);
  return `    { ${fields.join(',\n      ')} },`;
};
const out = [`// Parts of Ezekiel ${ch} – see parts.js for the format.`, `export const P${ch} = {`];
for (const n of keys) out.push(`  ${n}: [`, ...merged[n].map(fmt), '  ],');
out.push('};', '');
fs.writeFileSync(path.join(root, `src/content/parts${ch}.js`), out.join('\n'));
console.log(`parts${ch}.js: ${keys.length} verses, ${keys.reduce((s, n) => s + merged[n].length, 0)} parts`);
