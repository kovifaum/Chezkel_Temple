import { M } from '../engine/materials.js';
import { D, Y } from './dims.js';
import { buildGate } from './gate.js';
import { makeDoor } from './doors.js';

const R = D.mount / 2; // 250

/** Outer court (החצר החיצונה = "עזרת נשים" in the book): platform, wall, three gates, pavements with 30 chambers. */
export function buildOuter(c) {
  const b = c.b;
  const H = Y.outer;

  // platform (7 steps above the ground) and paving
  b.box('court.base', M.stoneDark, -R, -10, -R, R, H - 0.5, R);
  b.box('court.pave', M.floor, -R, H - 0.5, -R, R, H, R);

  // wall: one reed thick, one reed high (40:5); gaps where the three gates stand (E, N, S)
  const T = D.wallT, WH = D.wallH, g = 12.5;
  b.box('court.wall', M.wall, -R, H, -R, -R + T, H + WH, R); // west
  b.box('court.wall', M.wall, R - T, H, -R, R, H + WH, -g);  // east
  b.box('court.wall', M.wall, R - T, H, g, R, H + WH, R);
  b.box('court.wall', M.wall, -R + T, H, -R, -g, H + WH, -R + T); // north
  b.box('court.wall', M.wall, g, H, -R, R - T, H + WH, -R + T);
  b.box('court.wall', M.wall, -R + T, H, R - T, -g, H + WH, R); // south
  b.box('court.wall', M.wall, g, H, R - T, R - T, H + WH, R);
  // coping
  for (const [x0, z0, x1, z1] of [[-R, -R, -R + T, R]]) b.box('court.wall', M.stoneDark, x0 - 0.3, H + WH, z0 - 0.3, x1 + 0.3, H + WH + 0.5, z1 + 0.3);

  // the three outer gates (40:6-27): east, north, south
  buildGate(c, { id: 'og.E', x: R, y0: H, z: 0, ang: Math.PI, kind: 'outer', steps: D.outerSteps });
  buildGate(c, { id: 'og.N', x: 0, y0: H, z: -R, ang: -Math.PI / 2, kind: 'outer', steps: D.outerSteps });
  buildGate(c, { id: 'og.S', x: 0, y0: H, z: R, ang: Math.PI / 2, kind: 'outer', steps: D.outerSteps });

  // pavements ("רצפה") beside the gates, each carrying 30 chambers: 3 floors × 10 rooms (40:17-18)
  const gates = [
    { k: 'E', x: R, z: 0, ang: Math.PI },
    { k: 'N', x: 0, z: -R, ang: -Math.PI / 2 },
    { k: 'S', x: 0, z: R, ang: Math.PI / 2 },
  ];
  for (const gt of gates) {
    for (const s of [-1, 1]) {
      const id = `lp.${gt.k}.${s > 0 ? 'R' : 'L'}`;
      b.push(gt.x, H, gt.z, gt.ang);
      // pavement: 44 deep (the wall's inner face to the end of the gate length)
      const v0 = s > 0 ? 12.5 : -112.5, v1 = s > 0 ? 112.5 : -12.5;
      b.box(`${id}.pave`, M.stone, 6, 0, v0, 50, 0.35, v1);
      // border strips
      b.box(`${id}.pave`, M.stoneDark, 6, 0, v0, 50, 0.45, v0 + 0.5);
      b.box(`${id}.pave`, M.stoneDark, 6, 0, v1 - 0.5, 50, 0.45, v1);
      b.box(`${id}.pave`, M.stoneDark, 49.5, 0, v0, 50, 0.45, v1);
      // 3 floors of 10 rooms, stepping back
      const depth = [20, 16, 12];
      for (let f = 0; f < 3; f++) {
        const y = 0.35 + f * 8;
        for (let i = 0; i < 10; i++) {
          const a = s > 0 ? 12.5 + i * 10 : -112.5 + i * 10;
          b.room(`${id}.cham`, M.wall, {
            x0: 6, x1: 6 + depth[f], z0: a, z1: a + 10, y0: y, h: 7, t: 0.8,
            doors: [{ side: 'x1', c: a + 5, w: 3, h: 5.5 }],
          });
          b.box(`${id}.cham`, M.roof, 6, y + 7, a, 6 + depth[f], y + 8, a + 10);
        }
      }
      // measures
      const m = (n, label, A, B, kind) => c.measure(`${id}.m.${n}`, label, A, B, kind);
      const sv = s > 0 ? 1 : -1;
      m('depth', '44 אמה', [6, 0.7, sv * 116], [50, 0.7, sv * 116]);
      m('len', '100 אמה', [52, 0.7, s > 0 ? 12.5 : -112.5], [52, 0.7, s > 0 ? 112.5 : -12.5]);
      m('room', '10 אמות', [6 + depth[0] + 1.5, 0.7, s > 0 ? 12.5 : -22.5], [6 + depth[0] + 1.5, 0.7, s > 0 ? 22.5 : -12.5]);
      m('floors', '3 קומות', [6 + depth[0] + 1.5, 0.35, s > 0 ? 22.5 : -22.5], [6 + depth[0] + 1.5, 24.35, s > 0 ? 22.5 : -22.5], 'v');
      c.anchor(`${id}.a`, [20, 12, sv * 60], '30 לשכות');
      b.pop();
    }
  }

  // doors of the outer east gate (shut in 44:1-3), hinged on the passage jambs inside the wall thickness
  const doors = {}, doorMeshes = [];
  const d1 = makeDoor({ x: R - 3, y: H, z: -5, w: 5, h: 5.8, sgn: +1, tag: 'og.E.door' });
  const d2 = makeDoor({ x: R - 3, y: H, z: 5, w: 5, h: 5.8, sgn: -1, tag: 'og.E.door' });
  doors.eastN = d1.piv; doors.eastS = d2.piv;
  doorMeshes.push(...d1.meshes, ...d2.meshes);
  // the whole precinct: 500 × 500 (42:20 reading as 500 cubits)
  c.measure('court.m.E', '500 אמה', [R + 8, H, -R], [R + 8, H, R]);
  c.measure('court.m.S', '500 אמה', [-R, H, R + 8], [R, H, R + 8]);
  c.measure('court.m.W', '500 אמה', [-R - 8, H, -R], [-R - 8, H, R]);
  c.measure('court.m.N', '500 אמה', [-R, H, -R - 8], [R, H, -R - 8]);
  return { doors, doorMeshes };
}
