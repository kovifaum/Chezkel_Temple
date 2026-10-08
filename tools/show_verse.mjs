// Prints everything needed to write the parts of a verse: unpointed words, English, the scene spec, Gra notes, commentaries.
// usage: node tools/show_verse.mjs 40:7 [40:8 ...] [--c]   (--c also prints Rashi/Radak/Metzudat/Malbim/Abarbanel)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const imp = (f) => import(pathToFileURL(path.join(root, f)).href);
const { tokenize } = await imp('src/ui/hebrew.js');
const { SCENES } = await imp('src/content/scenes.js');
const { GRA } = await imp('src/content/gra.js');
const { MISHNAH } = await imp('src/content/mishnah.js');
const strip = (h) => String(h || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const withC = process.argv.includes('--c');
for (const ref of process.argv.slice(2).filter((a) => /^\d+:\d+$/.test(a))) {
  const [ch, n] = ref.split(':').map(Number);
  const v = JSON.parse(fs.readFileSync(path.join(root, `data/ch${ch}.json`), 'utf8')).verses[n - 1];
  const toks = tokenize(v.he).filter((t) => !t.ketiv && t.key);
  console.log(`\n===== ${ref} =====`);
  console.log('WORDS:', toks.map((t, i) => `${i}:${t.key}`).join(' '));
  console.log('POINTED:', v.he);
  console.log('EN:', v.en);
  const sc = SCENES[ref] || {};
  console.log('SCENE:', JSON.stringify({ title: sc.title, at: sc.at, f: sc.f, fit: sc.fit, m: sc.m, a: sc.a, v: sc.v, cut: sc.cut, fx: sc.fx, txt: sc.txt, assume: sc.assume }));
  for (const [k, t] of GRA[ref] || []) console.log('GRA(book):', k, '–', strip(t));
  for (const m of MISHNAH[ref] || []) console.log('MISHNA:', m.h, '–', strip(m.t).slice(0, 300));
  if (withC) {
    const c = v.c || {};
    for (const k of ['rashi', 'radak', 'metzudatDavid', 'metzudatZion', 'malbim', 'abarbanel', 'targum']) if (c[k]) console.log(`${k.toUpperCase()}:`, strip(c[k]).slice(0, 900));
  }
}
