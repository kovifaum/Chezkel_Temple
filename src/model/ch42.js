import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/** The holy chambers of the priests, north and south of the gizra / binyan (42:1-14). */
export function buildChambers(c) {
  const b = c.b;
  b.push(0, Y.house, 0, 0);
  const SH = 8; // storey height
  for (const s of [-1, 1]) {
    const id = `lk.${s < 0 ? 'N' : 'S'}`;
    const zr = (a, bb) => [Math.min(s * a, s * bb), Math.max(s * a, s * bb)];
    // depth of each floor: floor1 40 + 10-cubit walk (42:4) · floors 2-3 are set back by the galleries (אתיקים, 42:5-6)
    const spans = [[55, 105], [55, 99], [55, 93]];
    for (let f = 0; f < 3; f++) {
      const y0 = f * SH;
      const [za, zb] = zr(spans[f][0], spans[f][1]);
      // floor slab / roof
      b.box(`${id}.f${f + 1}`, M.roof, -150, y0 + SH - 0.7, za, -50, y0 + SH, zb);
      // outer (north/south) wall and back wall towards the gizra
      const outer = zr(spans[f][1] - 0.8, spans[f][1]);
      b.box(`${id}.f${f + 1}`, M.house, -150, y0, outer[0], -50, y0 + SH - 0.7, outer[1]);
      const inner = zr(spans[f][0], spans[f][0] + 0.8);
      b.box(`${id}.f${f + 1}`, M.house, -150, y0, inner[0], -50, y0 + SH - 0.7, inner[1]);
      // end walls and dividers: 10 rooms of 10
      for (let i = 0; i <= 10; i++) {
        const x = -150 + i * 10;
        b.box(`${id}.f${f + 1}`, M.house, x - 0.4, y0, za, x + 0.4, y0 + SH - 0.7, zb);
      }
      // doors on the outer side (42:4 "ופתחיהם לצפון")
      for (let i = 0; i < 10; i++) {
        const x = -145 + i * 10;
        const dz = zr(spans[f][1] - 0.9, spans[f][1] + 0.05);
        b.box(`${id}.door`, M.wood, x - 1.4, y0, dz[0], x + 1.4, y0 + 5.5, dz[1]);
      }
      // gallery (אתיק) in front of floors 2 and 3
      if (f > 0) {
        const g0 = spans[f][1], g1 = spans[f - 1][1];
        const [ga, gb] = zr(g0, g1);
        b.box(`${id}.gal`, M.stoneDark, -150, y0 - 0.5, ga, -50, y0 + 0.3, gb);
        for (let x = -150; x <= -50; x += 10) b.box(`${id}.gal`, M.cedar, x - 0.3, y0, s > 0 ? g1 - 0.3 : -g1, x + 0.3, y0 + 2.2, s > 0 ? g1 : -g1 + 0.3);
      }
    }
    // the wall (גדר) 50 long in front, toward the outer court (42:7)
    b.box(`${id}.gader`, M.wall, -125, 0, s * 112, -75, 6, s * 113);
    c.measure(`${id}.m.gader`, '50 אמה', [-125, 6.4, s * 113.4], [-75, 6.4, s * 113.4]);

    const m = (n, label, a, bb, kind) => c.measure(`${id}.m.${n}`, label, a, bb, kind);
    m('len', '100 אמה', [-150, 0.6, s * 108], [-50, 0.6, s * 108]);
    m('wid', '50 אמה', [-152, 0.6, s * 55], [-152, 0.6, s * 105]);
    m('walk', '10 אמות', [-148, 0.6, s * 55], [-148, 0.6, s * 65]);
    m('floors', '3 קומות', [-153, 0, s * 103], [-153, 3 * SH, s * 103], 'v');
    m('door', 'פתחים לצפון', [-145, 6.4, s * 105], [-135, 6.4, s * 105], 'tag');
    c.anchor(`${id}.a`, [-100, 3 * SH + 3, s * 80], 'לשכות הקדש');
  }
  b.pop();
}
