import * as THREE from 'three';
import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/**
 * The outer altar (43:13-17), after the book (the Gra's reading): THREE parts, one on top of the other.
 *   יסוד  = חיק = עזרה קטנה/תחתונה : 16 × 16, 2 high        (projects one cubit beyond the סובב on every side)
 *   סובב  = עזרה גדולה           : 14 × 14, 4 high        (its top edge carries the גבול, a half-cubit ledge hanging in the air: 15 × 15)
 *   הראל = אריאל                 : 12 × 12, 4 high INCLUDING the four horns (the horns alone are 1 cubit): body 3 + horns 1
 * Total height 10. The model keeps ONE nominal unit (1 "amah"); in the verses the stated measures are in small cubits (5 handbreadths)
 * except the 4-high סובב and the 4-high הראל, which are wide cubits (6 handbreadths): 58 handbreadths in all (the scene texts explain this).
 *
 * The ramp (כבש, "מעלותהו פנות קדים") stands SOUTH of the altar and is set toward the EAST side of the south face, not in the middle.
 * The book gives no size for it; it is drawn 8 wide and 32 long (like the כבש of the Mishnah, Middot 3:3 – and the plan, fig. p.14, draws it
 * about twice as long as the altar is wide), rising to the level of the סובב, the walkway on which the priests walk (fn. 8).
 */
export const ALTAR = {
  yesod: { w: 16, h: 2 },
  sovev: { w: 14, h: 4 },
  harel: { w: 12, h: 4, horn: 1 },
  ledge: 0.5,             // גבול – "זרת האחד"
  rampW: 8, rampL: 32,    // assumption (the book gives no size)
  rampX1: 7,              // the east edge of the ramp lines up with the east face of the סובב (x = +7); the west edge is at x = -1
};

export function buildAltar(c) {
  const b = c.b;
  const A = ALTAR;
  const yTop = A.yesod.h;                       // 2  – top of the יסוד
  const sTop = yTop + A.sovev.h;                // 6  – top of the סובב (the walkway)
  const hTop = sTop + A.harel.h;                // 10 – top of the horns
  const hearth = hTop - A.harel.horn;           // 9  – the 12×12 place of the fire
  b.push(0, Y.inner, 0, 0);
  const box = (name, mat, w, y0, y1) => b.box(`altar.${name}`, mat, -w / 2, y0, -w / 2, w / 2, y1, w / 2);

  box('yesod', M.altar, A.yesod.w, 0, yTop);          // 16 × 16 × 2   (חיק)
  box('sovev', M.altar, A.sovev.w, yTop, sTop);       // 14 × 14 × 4   (עזרה גדולה)
  box('harel', M.altar, A.harel.w, sTop, hearth);     // 12 × 12 × 3   (+ horns = 4)

  // גבול – a half-cubit ledge round the top edge of the סובב, hanging in the air (no support under it): 15 × 15 with the ledge
  const L = A.sovev.w / 2, G = L + A.ledge, tl = 0.3;
  for (const [x0, z0, x1, z1] of [[-G, -G, G, -L], [-G, L, G, G], [-G, -L, -L, L], [L, -L, G, L]]) b.box('altar.ledge', M.stoneDark, x0, sTop - tl, z0, x1, sTop, z1);

  // אריאל – the hearth (the place of the fire) on the top of the הראל, 12 × 12
  b.box('altar.ariel', M.iron, -A.harel.w / 2, hearth, -A.harel.w / 2, A.harel.w / 2, hearth + 0.12, A.harel.w / 2);
  // four horns, one cubit high, at the four corners ("ומהאריאל ולמעלה הקרנות ארבע")
  const H = A.harel.w / 2;
  for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
    const cx = sx * (H - 0.5), cz = sz * (H - 0.5);
    b.boxC('altar.horns', M.bronze, cx, hearth + 0.36, cz, 1, 0.72, 1);
    b.boxC('altar.horns', M.bronze, cx, hearth + 0.86, cz, 0.62, 0.28, 0.62);
  }
  // the fire of the altar
  for (const [x, z, h] of [[0, 0, 3.4], [-2.2, 1.4, 2.4], [2.0, -1.8, 2.6], [1.6, 2.4, 1.8], [-2.0, -2.2, 2.1]]) b.cone('altar.fire', M.fire, x, hearth + 0.12, z, 1.2, h, 7);

  // the ramp (מעלותהו פנות קדים): south of the altar (+z), toward the east side; a wedge rising to the level of the סובב
  {
    const z0 = L, x1 = A.rampX1;                   // the head of the ramp touches the south face of the סובב (the ledge hangs over it)
    const shape = new THREE.Shape([new THREE.Vector2(0, 0), new THREE.Vector2(A.rampL, 0), new THREE.Vector2(0, sTop)]);
    const g = new THREE.ExtrudeGeometry(shape, { depth: A.rampW, bevelEnabled: false });
    g.rotateY(-Math.PI / 2);                      // profile x -> +z (south), extrusion -> -x
    g.translate(x1, 0, z0);
    b._add('altar.ramp', M.altar, g);
  }

  // ---- dimension lines (in the altar's own frame). The scenes look from the south-west ("isoW"): the widths run along the west face
  // (the 15 with the ledge along the south face), the heights stand along the west face and at the north-west corner, and the small
  // projections are drawn across the top surface they belong to. (Stand-alone lines in different places, so that labels do not collide.)
  const m = (n, label, p, q, kind) => c.measure(`altar.m.${n}`, label, p, q, kind);
  m('b16', '16 אמה', [-9.6, yTop + 0.1, -8], [-9.6, yTop + 0.1, 8]);               // יסוד
  m('b14', '14 אמה', [-8.4, sTop + 0.1, -7], [-8.4, sTop + 0.1, 7]);               // סובב
  m('b15', '15 אמה עם הגבול', [-7.5, sTop + 0.1, 8.7], [7.5, sTop + 0.1, 8.7]);     // סובב + גבול (along the south face, over the head of the ramp)
  m('b12', '12 אמה', [-7.2, hearth + 0.1, -6], [-7.2, hearth + 0.1, 6]);           // הראל / אריאל
  m('p1', 'אמה', [-8, yTop + 0.1, 5.5], [-7, yTop + 0.1, 5.5]);                          // the יסוד beyond the סובב
  m('s1', 'אמה', [-7, sTop + 0.1, 3], [-6, sTop + 0.1, 3]);                          // the סובב beyond the הראל (the walkway)
  m('ledge', 'חצי אמה', [-7.5, sTop + 0.15, -3], [-7, sTop + 0.15, -3]);               // the גבול
  m('h2', '2 אמות', [-8.6, 0, -6.5], [-8.6, yTop, -6.5], 'v');
  m('h4a', '4 אמות', [-7.6, yTop, -4.5], [-7.6, sTop, -4.5], 'v');
  m('h4b', '4 אמות', [-6.6, sTop, -2.5], [-6.6, hTop, -2.5], 'v');
  m('horn', 'אמה', [-6.6, hearth, 2.2], [-6.6, hTop, 2.2], 'v');
  m('h10', '10 אמות', [-9.8, 0, -9.8], [-9.8, hTop, -9.8], 'v');

  c.anchor('altar.a', [0, hTop + 3.2, 0], 'המזבח');
  c.anchor('altar.ariel', [0, hTop + 1.4, 0], 'האריאל (ההראל)');
  c.anchor('altar.yesod', [-8.2, 1.2, 4], 'היסוד – החיק');
  c.anchor('altar.sovev', [-7.2, 4.2, 3], 'הסובב – העזרה הגדולה');
  c.anchor('altar.ledge', [-7.6, sTop + 0.4, -5], 'הגבול');
  c.anchor('altar.ramp', [3, 3.2, L + A.rampL * 0.45], 'מעלותיו – הכבש');
  b.pop();
}
