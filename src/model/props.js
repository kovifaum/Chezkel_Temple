import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/** Low-poly human figure, feet at (x,y,z), facing local +x rotated by `rot` around Y. */
export function person(b, tag, x, y, z, rot, { robe = M.linen, skin = M.skin, turban = M.linen, scale = 1, sit = false } = {}) {
  b.push(x, y, z, rot);
  const s = scale;
  if (sit) {
    b.box(tag, robe, -0.6 * s, 0.9 * s, -0.55 * s, 0.7 * s, 1.7 * s, 0.55 * s);     // seat + thighs
    b.cyl(tag, robe, -0.1 * s, 0.9 * s, 0, 0.55 * s, 1.3 * s, 10, 0.42 * s);          // torso
    b.sphere(tag, skin, -0.1 * s, 2.55 * s, 0, 0.38 * s, 10, 8);
    b.cyl(tag, turban, -0.1 * s, 2.82 * s, 0, 0.42 * s, 0.28 * s, 10);
  } else {
    b.cyl(tag, robe, 0, 0, 0, 0.62 * s, 2.3 * s, 12, 0.46 * s);                       // robe
    b.cyl(tag, robe, 0, 2.3 * s, 0, 0.46 * s, 0.95 * s, 12, 0.36 * s);                // chest
    b.sphere(tag, skin, 0, 3.55 * s, 0, 0.38 * s, 10, 8);                             // head
    b.cyl(tag, turban, 0, 3.82 * s, 0, 0.43 * s, 0.3 * s, 10);                        // turban
    b.box(tag, robe, -0.15 * s, 2.6 * s, 0.38 * s, 0.15 * s, 3.1 * s, 0.7 * s);         // arms
    b.box(tag, robe, -0.15 * s, 2.6 * s, -0.7 * s, 0.15 * s, 3.1 * s, -0.38 * s);
  }
  b.pop();
}

/** measuring reed (קנה המדה) lying or standing: 6 cubits + a handbreadth (0.17 amah) */
export function reed(b, tag, x, y, z, rot, upright) {
  const L = 6.17;
  b.push(x, y, z, rot);
  if (upright) {
    b.box(tag, M.cedar, -0.12, 0, -0.12, 0.12, L, 0.12);
    for (let i = 1; i <= 6; i++) b.box(tag, M.gold, -0.15, i - 0.05, -0.15, 0.15, i + 0.05, 0.15);
  } else {
    b.box(tag, M.cedar, 0, 0, -0.12, L, 0.24, 0.12);
    for (let i = 1; i <= 6; i++) b.box(tag, M.gold, i - 0.05, -0.03, -0.15, i + 0.05, 0.27, 0.15);
  }
  b.pop();
}

export function buildProps(c) {
  const b = c.b;
  const o = Y.outer, i = Y.inner;
  // the man with the flax cord and the reed – standing in the east gate (40:3)
  person(b, 'prop.guide', 240, o, -3, Math.PI * 0.5, { robe: M.bronze, skin: M.bronze, turban: M.bronze, scale: 1.0 });
  // reed: standing in the passage beside the wall (one reed high) and lying across the wall's thickness (one reed thick)
  reed(b, 'prop.reed.v', 246, o, 4.2, 0, true);
  reed(b, 'prop.reed.h', 244, o + 6.2, 8.5, 0, false);
  c.measure('prop.m.reed', '6 אמות + טפח', [244, o + 7.1, 8.5], [250.17, o + 7.1, 8.5]);
  c.measure('prop.m.reedV', '6 אמות + טפח', [245.3, o, 4.2], [245.3, o + 6.17, 4.2], 'v');
  // flax cord (פתיל פשתים) coiled on the floor
  b.cyl('prop.cord', M.linen, 242.5, o, 2.2, 1.0, 0.4, 16);
  b.cyl('prop.cord', M.linen, 242.5, o + 0.4, 2.2, 0.8, 0.3, 16);
  // the prince sitting in the east gate's ulam (44:3)
  person(b, 'prop.prince', 205.5, o, -3.5, -Math.PI / 2, { robe: M.curtain, scale: 1.0, sit: true });
  b.box('prop.prince', M.wood, 203.8, o, -5.2, 205.2, o + 1.6, -1.8);
  b.box('prop.prince', M.linen, 204.2, o + 1.6, -4.6, 204.9, o + 1.85, -2.4);
  // priests (linen) in the inner court, between altar and house (44:15-19)
  [[-26, 7, 0.3], [-26, -7, -0.3], [18, -13, 1.1], [18, 13, -1.1], [31, 0, Math.PI]].forEach(([x, z, r]) => person(b, 'prop.priest', x, i, z, r, { scale: 1 }));
  // Levites at the gates (44:10-14)
  [[62, -8, i], [62, 8, i], [113, -9, o], [113, 9, o], [-9, -113, o], [9, -113, o], [-9, 113, o], [9, 113, o]].forEach(([x, z, y]) => person(b, 'prop.levite', x, y, z, 0, { robe: M.plaster, scale: 1 }));
  // forbidden-entrance rings above the inner gates (44:5-9)
  for (const [x, z] of [[100, 0], [0, -100], [0, 100]]) {
    b.cyl('prop.noentry', M.forbidden, x, i + 22, z, 4.2, 0.5, 28);
    b.cyl('prop.noentry', M.dark, x, i + 22.05, z, 3.3, 0.6, 28);
  }
  // offerings at the altar (43:19-27): bulls
  const bull = (x, z, r) => {
    b.push(x, i, z, r);
    b.box('prop.bull', M.plaster, -1.8, 1.0, -0.8, 1.8, 2.8, 0.8);
    b.box('prop.bull', M.plaster, 1.6, 1.8, -0.55, 2.9, 3.1, 0.55);
    for (const [lx, lz] of [[-1.4, -0.55], [-1.4, 0.35], [1.1, -0.55], [1.1, 0.35]]) b.box('prop.bull', M.plaster, lx, 0, lz, lx + 0.4, 1.1, lz + 0.4);
    b.box('prop.bull', M.dark, 2.6, 3.0, -0.6, 2.8, 3.5, -0.3);
    b.box('prop.bull', M.dark, 2.6, 3.0, 0.3, 2.8, 3.5, 0.6);
    b.pop();
  };
  bull(26, 8, Math.PI);
  bull(26, -8, Math.PI);
  // salt heap (43:24)
  b.cone('prop.salt', M.linen, 17, i, 13, 1.8, 1.7, 10);
  b.cone('prop.salt', M.linen, 19.5, i, 14, 1.2, 1.1, 10);
  // law of the priests, as small symbolic props in the inner court (44:21-31)
  const ring = (tag, x, z) => { b.cyl(tag, M.forbidden, x, i, z, 2.3, 0.18, 24); b.cyl(tag, M.floor, x, i + 0.02, z, 1.75, 0.2, 24); };
  // wine (44:21) – forbidden to a priest entering the inner court
  ring('prop.wine', 34, 18);
  b.cyl('prop.wine', M.bronze, 34, i + 0.1, 18, 0.75, 1.8, 14, 0.5);
  b.cyl('prop.wine', M.curtain, 34, i + 1.9, 18, 0.45, 0.25, 12);
  // the dead (44:25-27) – impurity: a bier outside the inner gate
  ring('prop.grave', 38, -26);
  b.box('prop.grave', M.linen, 36.4, i + 0.15, -27, 39.6, i + 0.7, -25);
  // carrion (44:31)
  ring('prop.carrion', 38, 28);
  b.box('prop.carrion', M.dark, 36.9, i + 0.2, 27.2, 39.1, i + 0.9, 28.8);
  b.box('prop.carrion', M.dark, 38.5, i + 0.6, 27.2, 39.6, i + 1.2, 28.0);
  // first fruits and terumah (44:30): baskets and loaves
  for (const [x, z] of [[44, 12], [46.5, 14.4], [43, 15]]) { b.box('prop.fruit', M.cedar, x - 1, i, z - 1, x + 1, i + 1.1, z + 1); b.sphere('prop.fruit', M.curtain, x, i + 1.2, z, 0.8, 8, 6); }
  b.box('prop.fruit', M.wood, 41.5, i, 8.5, 43.5, i + 0.9, 10.5);
  b.box('prop.fruit', M.linen, 41.7, i + 0.9, 8.7, 43.3, i + 1.2, 10.3);
}
