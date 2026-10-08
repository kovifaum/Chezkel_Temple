// Validates src/content/parts4x.js: every verse is tiled by its parts, tags/measures/anchors exist,
// and every measure a verse scene shows is explained by at least one part.
// usage: node tools/validate_parts.mjs [--chapters=40,41] [--refs=tools/refs] [--quiet]
//        node tools/validate_parts.mjs --draft=/path/draft.js --range=40:1-12   (draft exports P = { verse: [parts] })
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3) || d;
const refs = path.resolve(arg('refs', path.join(root, 'tools/refs')));
const quiet = process.argv.includes('--quiet');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);

const { tokenize } = await imp('src/ui/hebrew.js');
const { SCENES } = await imp('src/content/scenes.js');
const parts = {};
const draft = arg('draft', '');
let only = arg('chapters', '40,41,42,43,44').split(',').map(Number);
let rangeSet = null;
if (draft) {
  const m = /^(\d+):(\d+)-(\d+)$/.exec(arg('range', ''));
  if (!m) { console.error('--draft needs --range=CH:FROM-TO'); process.exit(2); }
  const mod = await import(pathToFileURL(path.resolve(draft)).href + `?t=${Date.now()}`);
  for (const [n, list] of Object.entries(mod.P || {})) parts[`${m[1]}:${n}`] = list;
  only = [+m[1]];
  rangeSet = new Set(); for (let i = +m[2]; i <= +m[3]; i++) rangeSet.add(`${m[1]}:${i}`);
} else {
  for (const c of [40, 41, 42, 43, 44]) {
    const mod = await imp(`src/content/parts${c}.js`);
    for (const [n, list] of Object.entries(mod[`P${c}`])) parts[`${c}:${n}`] = list;
  }
}
const lines = (f) => fs.readFileSync(path.join(refs, f), 'utf8').split('\n').filter(Boolean);
const TAGS = lines('tags.txt');
const MEAS = new Set(lines('measures.txt').map((l) => l.split('\t')[0]));
const ANCH = new Set(lines('anchors.txt').map((l) => l.split('\t')[0]));
const tagOk = (t) => TAGS.some((x) => x === t || x.startsWith(t + '.'));

const problems = [];
let nParts = 0, nVerses = 0, nWithM = 0;
for (const ch of only) {
  const data = JSON.parse(fs.readFileSync(path.join(root, `data/ch${ch}.json`), 'utf8'));
  for (const v of data.verses) {
    const ref = `${ch}:${v.n}`;
    if (rangeSet && !rangeSet.has(ref)) continue;
    const P = parts[ref];
    const bad = (m) => problems.push(`${ref}: ${m}`);
    nVerses++;
    if (!P || !P.length) { bad('no parts'); continue; }
    const sc = SCENES[ref] || {};
    const at = sc.at || '';
    const want = tokenize(v.he).filter((t) => !t.ketiv && t.key).map((t) => t.key);
    const got = P.flatMap((p) => String(p.w || '').split(' ').filter(Boolean));
    if (want.join(' ') !== got.join(' ')) {
      let i = 0; while (i < want.length && want[i] === got[i]) i++;
      bad(`parts do not tile the verse; first mismatch at word ${i}: expected «${want[i] ?? '∅'}» got «${got[i] ?? '∅'}»`);
    }
    const res = (id) => id.replace('{at}', at);
    const covered = new Set();
    P.forEach((p, i) => {
      nParts++;
      const where = `${ref}#${i + 1}`;
      const b = (m) => problems.push(`${where}: ${m}`);
      if (!p.w) b('missing w');
      if (!p.h || p.h.length > 70) b('heading missing or >70 chars');
      if (!p.e || p.e.length < 25) b('explanation missing/too short');
      else if (p.e.length > 700) b('explanation too long (>700)');
      for (const t of p.t || []) {
        if (t.includes('{at}') && !at) { b(`tag ${t} uses {at} but the scene has no at`); continue; }
        if (!tagOk(res(t))) b(`unknown tag ${t}`);
      }
      for (const id of p.m || []) {
        if (id.includes('{at}') && !at) { b(`measure ${id} uses {at} but the scene has no at`); continue; }
        if (!MEAS.has(res(id))) b(`unknown measure ${id}`); else covered.add(res(id));
      }
      if ((p.m || []).length) nWithM++;
      for (const id of p.a || []) if (!ANCH.has(res(id))) b(`unknown anchor ${id}`);
    });
    for (const id of sc.m || []) if (MEAS.has(res(id)) && !covered.has(res(id))) bad(`scene measure ${id} not explained by any part`);
  }
}
if (!quiet || problems.length) console.log(problems.join('\n'));
console.log(`${nVerses} verses, ${nParts} parts (${nWithM} with measures), ${problems.length} problem(s)`);
process.exit(problems.length ? 1 : 0);
