import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/**
 * Geometry that exists only for alternative readings ("שיטות"), hidden until a verse card selects it.
 *  - variant.mount3000 : the Temple Mount as 500 REEDS = 3000 cubits per side (Rashi, Malbim, Abarbanel, the Gra; 42:16-20)
 *  - variant.altar32   : the Second-Temple altar of Mishnah Middot 3:1 (32 × 32) for comparison with 43:13-17
 */
export function buildVariants(c) {
  const b = c.b;

  // ---- 30 chambers according to the Malbim (40:17-18): a raised pavement 34 long × 6 deep beside each gate,
  //      chambers 4 deep on it – 5 per side, three storeys → 30 per gate (and 30 at ground level in all)
  const Rr = 250, Ho = Y.outer;
  for (const gt of [{ k: 'E', x: Rr, z: 0, ang: Math.PI }, { k: 'N', x: 0, z: -Rr, ang: -Math.PI / 2 }, { k: 'S', x: 0, z: Rr, ang: Math.PI / 2 }]) {
    for (const s of [-1, 1]) {
      const id = `variant.lish.${gt.k}.${s > 0 ? 'R' : 'L'}`;
      b.push(gt.x, Ho, gt.z, gt.ang);
      const v0 = s > 0 ? 12.5 : -46.5, v1 = s > 0 ? 46.5 : -12.5;
      b.box(`${id}.pave`, M.stone, 6, 0, v0, 12, 2.2, v1);
      for (let f = 0; f < 3; f++) {
        for (let i = 0; i < 5; i++) {
          const a = (s > 0 ? 12.5 : -46.5) + i * 6.8;
          b.room(`${id}.cham`, M.wall, { x0: 6, x1: 10, z0: a, z1: a + 6.8, y0: 2.2 + f * 7, h: 6.2, t: 0.7, doors: [{ side: 'x1', c: a + 3.4, w: 2.4, h: 4.8 }] });
          b.box(`${id}.cham`, M.roof, 6, 2.2 + f * 7 + 6.2, a, 10, 2.2 + (f + 1) * 7, a + 6.8);
        }
      }
      if (gt.k === 'E' && s > 0) {
        c.measure('variant.m.lish.len', '34 אמה', [11, 2.6, 12.5], [11, 2.6, 46.5]);
        c.measure('variant.m.lish.dep', '6 אמות', [6, 2.6, 49], [12, 2.6, 49]);
        c.measure('variant.m.lish.room', '5 לשכות מכל צד', [10.8, 22.6, 12.5], [10.8, 22.6, 46.5]);
      }
      b.pop();
    }
  }

  // ---- Temple Mount of 500 reeds
  const R = 1500, T = 6, H = 6;
  b.box('variant.mount3000.slab', M.floor, -R, -1.4, -R, R, -0.05, R);
  b.box('variant.mount3000.wall', M.wall, -R, 0, -R, -R + T, H, R);                 // west
  b.box('variant.mount3000.wall', M.wall, R - T, 0, -R, R, H, -40);                 // east (gap for the gate)
  b.box('variant.mount3000.wall', M.wall, R - T, 0, 40, R, H, R);
  b.box('variant.mount3000.wall', M.wall, -R + T, 0, -R, R - T, H, -R + T);         // north
  b.box('variant.mount3000.wall', M.wall, -R + T, 0, R - T, R - T, H, R);           // south
  // the east gate of the mount (42:15) – two gate towers
  for (const z of [-40, 34]) b.box('variant.mount3000.wall', M.stone, R - 20, 0, z, R, 26, z + 6);
  for (const [x, z] of [[-R, -R], [R - 30, -R], [-R, R - 30], [R - 30, R - 30]]) b.box('variant.mount3000.wall', M.stoneDark, x, 0, z, x + 30, 22, z + 30);
  // a ghost outline of the 500-cubit precinct inside it, for scale
  for (const [x0, z0, x1, z1] of [[-250, -250, 250, -246], [-250, 246, 250, 250], [-250, -250, -246, 250], [246, -250, 250, 250]]) b.box('variant.mount3000.inner', M.gold, x0, 0.05, z0, x1, 8, z1);

  const m = (id, label, a, bb, kind) => c.measure(`variant.m.${id}`, label, a, bb, kind);
  m('E', '500 קנים = 3000 אמה', [R + 20, 8, -R], [R + 20, 8, R]);
  m('N', '500 קנים = 3000 אמה', [-R, 8, -R - 20], [R, 8, -R - 20]);
  m('S', '500 קנים = 3000 אמה', [-R, 8, R + 20], [R, 8, R + 20]);
  m('W', '500 קנים = 3000 אמה', [-R - 20, 8, -R], [-R - 20, 8, R]);
  m('in', '500 אמה', [-250, 12, 280], [250, 12, 280]);
  c.anchor('variant.mount.a', [0, 40, 700], 'חצר הבית (500 אמה)');
  c.anchor('variant.mount.b', [R - 100, 60, 0], 'שער הר הבית המזרחי');

  // ---- Second-Temple altar, Mishnah Middot 3:1: 32 / 30 / 28 / 26 / 24 (the way the Sages read the same verses, book fn. 10:
  //      "12 אמה" = from the middle in each direction -> 24 for the place of the fire; with the horn cubit and the priests' walking cubit 28,
  //      with the base 30 and 32). Total height 10 (1 + 5 + 3 + 1), the same as the Gra's altar.
  b.push(0, Y.inner, 0, 0);
  const tier = (name, size, y0, y1) => b.box(`variant.altar32.${name}`, M.altar, -size / 2, y0, -size / 2, size / 2, y1, size / 2);
  // יסוד – 1 high, set back 1 → 30. "והיסוד היה מהלך על פני כל הצפון ועל פני כל המערב, ואוכל בדרום אמה אחת ובמזרח אמה אחת" (3:1; book fn. 9):
  // in the Second Temple the base did not go all round the altar – on the south and the east it is flush with the 30 (in the Gra's reading it does)
  b.box('variant.altar32.yesod', M.altar, -16, 0, -16, 15, 1, 15);
  tier('t30', 30, 1, 6);         // up 5, set back 1 → סובב 28 (a one-cubit walkway at height 6)
  tier('t28', 28, 6, 9);         // up 3 → the level of the horns and of the fire
  b.box('variant.altar32.top', M.iron, -12, 9, -12, 12, 9.12, 12);   // המערכה 24 × 24 (the horn cubit and the walking cubit lie outside it)
  for (const [x, z] of [[-13.5, -13.5], [13.5, -13.5], [-13.5, 13.5], [13.5, 13.5]]) {
    b.boxC('variant.altar32.horns', M.bronze, x, 9.36, z, 1, 0.72, 1);   // the horns, one cubit high (to height 10)
    b.boxC('variant.altar32.horns', M.bronze, x, 9.86, z, 0.62, 0.28, 0.62);
  }
  b.push(0, 0, 0, -Math.PI / 2);
  b.steps('variant.altar32.ramp', M.altar, 47, 15, -8, 8, 0, 0.1875, 32); // כבש 32 × 16, to the south (3:3), up to the sovev (6)
  b.pop();
  for (const [x, z, h] of [[0, 0, 3], [-2.5, 1.5, 2.2], [2.2, -1.8, 2.4], [1.6, 2.6, 1.7]]) b.cone('variant.altar32.fire', M.fire, x, 9.12, z, 1.3, h, 7);
  const a = (id, label, p, q, kind) => c.measure(`variant.m.alt.${id}`, label, p, q, kind);
  // widths along the west face, heights at the south-west corner (as for the Gra's altar)
  a('v32', '32 אמה', [-17.4, 1.1, -16], [-17.4, 1.1, 16]);
  a('v30', '30 אמה', [-16.4, 6.1, -15], [-16.4, 6.1, 15]);
  a('v28', '28 אמה', [-15.4, 9.1, -14], [-15.4, 9.1, 14]);
  a('v26', '26 אמה', [-14.4, 9.1, -13], [-14.4, 9.1, 13]);
  a('v24', '24 אמה', [-13.4, 9.2, -12], [-13.4, 9.2, 12]);
  a('h1', 'אמה', [-16.7, 0, 16.7], [-16.7, 1, 16.7], 'v');
  a('h5', '5 אמות', [-15.7, 1, 15.7], [-15.7, 6, 15.7], 'v');
  a('h3', '3 אמות', [-14.7, 6, 14.7], [-14.7, 9, 14.7], 'v');
  a('hh1', 'אמה', [-13.7, 9, 13.7], [-13.7, 10, 13.7], 'v');
  a('h10', '10 אמות', [-18.8, 0, 18.8], [-18.8, 10, 18.8], 'v');
  a('ramp', '32 אמה', [9, 0.3, 15], [9, 0.3, 47]);        // the כבש of the Mishnah: 32 long (south of the altar) ...
  a('rampW', '16 אמה', [-8, 0.3, 48.4], [8, 0.3, 48.4]);  // ... and 16 wide
  c.anchor('variant.altar.a', [0, 14, 0], 'מזבח בית שני – 32×32');
  b.pop();
}
