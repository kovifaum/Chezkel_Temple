import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/**
 * The altar (43:13-17) in the centre of the inner court.
 * Tiers (outside → in): חיק/base 18 (1 high) · עזרה תחתונה 16 (2) · עזרה גדולה 14 (4) · הראל 12 (4) · 4 horns (4).
 * Each tier is inset one cubit ("ורחב אמה").
 */
export function buildAltar(c) {
  const b = c.b;
  b.push(0, Y.inner, 0, 0);
  const tier = (name, size, y0, y1) => b.box(`altar.${name}`, M.altar, -size / 2, y0, -size / 2, size / 2, y1, size / 2);
  tier('hek', 18, 0, 1);
  tier('az1', 16, 1, 3);
  tier('az2', 14, 3, 7);
  tier('harel', 12, 7, 11);
  // trench (חיק) – a dark groove one cubit wide around the base
  for (const [x0, z0, x1, z1] of [[-10, -10, 10, -9], [-10, 9, 10, 10], [-10, -9, -9, 9], [9, -9, 10, 9]]) b.box('altar.hek', M.dark, x0, 0, z0, x1, 0.08, z1);
  // border (גבול) of half a cubit round the great azarah
  for (const [x0, z0, x1, z1] of [[-7, -7, 7, -6.5], [-7, 6.5, 7, 7], [-7, -6.5, -6.5, 6.5], [6.5, -6.5, 7, 6.5]]) b.box('altar.az2', M.stoneDark, x0, 7, z0, x1, 7.45, z1);
  // ariel – the hearth, 12 × 12 (43:16)
  b.box('altar.ariel', M.iron, -5.8, 11, -5.8, 5.8, 11.25, 5.8);
  // four horns, 4 high
  for (const [x, z] of [[-5.5, -5.5], [5.5, -5.5], [-5.5, 5.5], [5.5, 5.5]]) b.cyl('altar.horns', M.bronze, x, 11, z, 0.65, 4, 8, 0.28);
  // stairs facing east (43:17)
  b.steps('altar.steps', M.altar, 31, 6, -3, 3, 0, 0.5, 22);
  // sacrificial fire
  for (const [x, z, h] of [[0, 0, 3.4], [-2.2, 1.4, 2.4], [2.0, -1.8, 2.6], [1.6, 2.4, 1.8], [-2.0, -2.2, 2.1]]) b.cone('altar.fire', M.fire, x, 11.2, z, 1.2, h, 7);

  const m = (n, label, a, bb, kind) => c.measure(`altar.m.${n}`, label, a, bb, kind);
  m('b18', '18 אמה', [-9, 0.3, 11.5], [9, 0.3, 11.5]);
  m('b16', '16 אמה', [-8, 3.1, 10.5], [8, 3.1, 10.5]);
  m('b14', '14 אמה', [-7, 7.1, 9.5], [7, 7.1, 9.5]);
  m('b12', '12 אמה', [-6, 11.3, 8.5], [6, 11.3, 8.5]);
  m('h1', 'אמה', [-10.6, 0, 0], [-10.6, 1, 0], 'v');
  m('h2', '2 אמות', [-10.6, 1, 0], [-10.6, 3, 0], 'v');
  m('h4a', '4 אמות', [-10.6, 3, 0], [-10.6, 7, 0], 'v');
  m('h4b', '4 אמות', [-10.6, 7, 0], [-10.6, 11, 0], 'v');
  m('horn', '4 אמות', [-6.9, 11, -6.9], [-6.9, 15, -6.9], 'v');
  m('ledge', 'אמה', [-9, 1.05, -9.1], [-8, 1.05, -9.1]);
  c.anchor('altar.a', [0, 17, 0], 'המזבח');
  c.anchor('altar.ariel', [0, 14, 0], 'האריאל');
  b.pop();
}
