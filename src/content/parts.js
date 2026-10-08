// Per-verse "parts": every verse is split into consecutive phrases and each phrase is explained on its own.
// Part: { w: phrase (unpointed, words separated by spaces – must tile the verse exactly),
//         h: short heading, e: explanation incl. the measurement,
//         t: focus tags ({at} = the verse's gate), m: measure ids, a: anchor ids,
//         fit/v/d/cut/ctx/fx: optional camera / display overrides }
import { tokenize } from '../ui/hebrew.js';
import { P40 } from './parts40.js';
import { P41 } from './parts41.js';
import { P42 } from './parts42.js';
import { P43 } from './parts43.js';
import { P44 } from './parts44.js';

export const PARTS = {};
for (const [ch, P] of [[40, P40], [41, P41], [42, P42], [43, P43], [44, P44]]) {
  for (const [n, list] of Object.entries(P)) PARTS[`${ch}:${n}`] = list;
}

/** token index → part index for a tokenized verse (ketiv tokens ride with the previous part) */
export function mapTokens(tokens, parts) {
  const map = new Array(tokens.length).fill(0);
  if (!parts || !parts.length) return map;
  let p = 0, left = parts[0].w.split(' ').length;
  tokens.forEach((t, i) => {
    if (t.ketiv || !t.key) { map[i] = p; return; }
    while (left <= 0 && p < parts.length - 1) { p++; left = parts[p].w.split(' ').length; }
    map[i] = p;
    left--;
  });
  return map;
}

/** the unpointed words of a verse that count for part tiling (ketiv excluded) */
export const tilingWords = (he) => tokenize(he).filter((t) => !t.ketiv && t.key).map((t) => t.key).join(' ').split(' ').filter(Boolean);
