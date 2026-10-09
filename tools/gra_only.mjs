// Keeps only the Gra's reading in the phrase explanations: drops parenthetical citations and sentences
// that report other commentators (Rashi, Radak, Metzudot, Malbim, Abarbanel, Targum, Mishnah ...).
// usage: node tools/gra_only.mjs   (rewrites src/content/parts4x.js in place)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OTHER = /רש״י|רש"י|רד״ק|רד"ק|מצודת|מצודות|מלבי״ם|מלבי"ם|אברבנאל|אברבנל|תרגום יונתן|בתרגום|תרגום|ת״י|ראב״ע|רלב״ג|רמב״ם|רמב״ן|משנה|מנחות|ערכין|מדות ב|מידות ג|JPS|הסכמת/;
const GRA = /הגר״א|הספר/;
const stripOne = (e) => {
  let t = e.replace(/\s*\(([^()]*)\)/g, (m, inner) => (OTHER.test(inner) && !GRA.test(inner) ? '' : m));
  const sents = t.split(/(?<=[.׃])\s+/).filter(Boolean);
  const keep = [];
  for (let s of sents) {
    if (OTHER.test(s)) {
      if (!GRA.test(s)) continue;
      // mixed sentence: keep only the clauses (split at ';') that do not name others
      const cl = s.split(/;\s*/).filter((c) => !OTHER.test(c) || GRA.test(c));
      if (!cl.length) continue;
      s = cl.join('; ');
      if (!/[.׃]$/.test(s)) s += '.';
    }
    keep.push(s);
  }
  let out = keep.join(' ').replace(/\s+([,.;])/g, '$1').trim();
  return out;
};
const q = (s) => JSON.stringify(s);
const fmt = (p) => {
  const f = [`w: ${q(p.w)}`, `h: ${q(p.h)}`, `e: ${q(p.e)}`];
  for (const k of ['t', 'm', 'a', 'fit', 'ctx']) if (p[k] !== undefined) f.push(`${k}: ${q(p[k]).replace(/","/g, '", "')}`);
  for (const k of ['v', 'fx']) if (p[k] !== undefined) f.push(`${k}: ${q(p[k])}`);
  for (const k of ['d', 'cut']) if (p[k] !== undefined) f.push(`${k}: ${q(p[k])}`);
  return `    { ${f.join(',\n      ')} },`;
};
let touched = 0, short = 0, total = 0;
for (const ch of [40, 41, 42, 43, 44]) {
  const mod = await import(pathToFileURL(path.join(root, `src/content/parts${ch}.js`)).href + `?t=${Date.now()}`);
  const P = mod[`P${ch}`];
  const out = [`// Parts of Ezekiel ${ch} – see parts.js for the format.`, `export const P${ch} = {`];
  for (const n of Object.keys(P).map(Number).sort((a, b) => a - b)) {
    out.push(`  ${n}: [`);
    for (const p of P[n]) {
      total++;
      const e2 = stripOne(p.e);
      let e = p.e;
      if (e2.length >= 40) { if (e2 !== p.e) touched++; e = e2; } else short++;
      out.push(fmt({ ...p, e }));
    }
    out.push('  ],');
  }
  out.push('};', '');
  fs.writeFileSync(path.join(root, `src/content/parts${ch}.js`), out.join('\n'));
}
console.log({ total, touched, keptOriginalBecauseTooShort: short });
