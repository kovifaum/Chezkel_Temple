import { M } from '../engine/materials.js';
import { D, Y } from './dims.js';
import { buildGate } from './gate.js';

/** Inner court (החצר הפנימית = "עזרת ישראל ועזרה"): raised platform, wall, three gates, chambers, tables. */
export function buildInner(c) {
  const b = c.b;
  const Hi = Y.inner, Ho = Y.outer;
  const W = 56; // 50 + wall thickness 6

  // raised platform: court square, the wall ring, and the arms that carry the gates + shoulder chambers
  const base = (x0, z0, x1, z1) => b.box('ic.base', M.stoneDark, x0, Ho, z0, x1, Hi - 0.5, z1);
  const pave = (x0, z0, x1, z1, tag = 'ic.floor') => b.box(tag, M.floor, x0, Hi - 0.5, z0, x1, Hi, z1);
  base(-W, -W, W, W);
  base(W, -W, 100, W);         // east arm
  base(-W, -100, W, -W);       // north arm
  base(-W, W, W, 100);         // south arm
  pave(-50, -50, 50, 50);
  pave(W, -W, 100, W, 'ic.arm');
  pave(-W, -100, W, -W, 'ic.arm');
  pave(-W, W, W, 100, 'ic.arm');
  // inscribed square marking the 100×100 court
  for (const [x0, z0, x1, z1] of [[-50, -50, 50, -49.5], [-50, 49.5, 50, 50], [49.5, -50, 50, 50]]) b.box('ic.floor', M.stoneDark, x0, Hi, z0, x1, Hi + 0.15, z1);

  // wall ring around the court (6 thick); gaps at the three gates. West side is the house front.
  const WH = 12, g = 12.5;
  b.box('ic.wall', M.wall, 50, Hi, -W, W, Hi + WH, -g);   // east wall (x 50..56)
  b.box('ic.wall', M.wall, 50, Hi, g, W, Hi + WH, W);
  b.box('ic.wall', M.wall, -50, Hi, -W, -g, Hi + WH, -50); // north wall
  b.box('ic.wall', M.wall, g, Hi, -W, 50, Hi + WH, -50);
  b.box('ic.wall', M.wall, -50, Hi, 50, -g, Hi + WH, W);   // south wall
  b.box('ic.wall', M.wall, g, Hi, 50, 50, Hi + WH, W);

  // inner gates (40:28-37): the ulam faces the outer court, 8 steps lead up
  buildGate(c, { id: 'ig.E', x: 100, y0: Hi, z: 0, ang: Math.PI, kind: 'inner', steps: D.innerSteps });
  buildGate(c, { id: 'ig.N', x: 0, y0: Hi, z: -100, ang: -Math.PI / 2, kind: 'inner', steps: D.innerSteps });
  buildGate(c, { id: 'ig.S', x: 0, y0: Hi, z: 100, ang: Math.PI / 2, kind: 'inner', steps: D.innerSteps });

  // ---- chambers at the shoulders of the inner gates (40:44-46) ----
  b.push(0, Hi, 0, 0);
  const cham = (tag, x0, z0, x1, z1, door, h = 9) => {
    b.room(tag, M.wall, { x0, x1, z0, z1, y0: 0, h, t: 0.9, doors: Array.isArray(door) ? door : [door] });
    b.box(tag, M.roof, x0, h, z0, x1, h + 1, z1);
  };
  // north gate, east shoulder: singers' chambers A×3 and the priests who keep the house B. All faces are south ("פניהם דרך הדרום",
  // 40:44): A1 opens onto the court, A2 and A3 open south through B's north wall (one door each, as in the book's figure p.15),
  // and B opens south to the inner court.
  cham('ic.sing.A1', 13, -100, 30, -78, { side: 'z1', c: 21.5, w: 3, h: 6 });
  cham('ic.sing.A2', 30, -100, 42, -78, { side: 'z1', c: 36, w: 3, h: 6 });
  cham('ic.sing.A3', 42, -100, 54, -78, { side: 'z1', c: 48, w: 3, h: 6 });
  cham('ic.house', 28, -78, 54, -64, [
    { side: 'z1', c: 41, w: 3.5, h: 6 },
    { side: 'z0', c: 36, w: 3, h: 6 },
    { side: 'z0', c: 48, w: 3, h: 6 },
  ]);
  // east gate, north shoulder: sons of Zadok who keep the altar (door faces north)
  cham('ic.zadok', 58, -46, 100, -14, { side: 'z0', c: 78, w: 3.5, h: 6.5 }, 10);
  b.pop();

  // ---- north gate equipment (40:38-43), in the gate's own frame (local x = inward = world +z, local z = world −x)
  b.push(0, Hi, -100, -Math.PI / 2);
  const table = (tag, mat, u, v, sx, sy, sz, y0 = 0) => b.boxC(tag, mat, u, y0 + sy / 2, v, sx, sy, sz);
  // the 8 slaughter tables (40:39-41) stand *inside* the gate system, not in the court (book fn. 30; 40:40 "בהמשך לאולם השער, לצידו של
  // העולה לפנים השער"): four per side in the ulam hollow (local x 4..10, on the 0.3 threshold slab), thin bars across the passage as in
  // the book's figure (ב, p.14)
  for (const u of [4.6, 5.9, 8, 9.3]) for (const s of [-1, 1]) table('ig.N.tab', M.stoneDark, u, s * 3.3, 0.8, 1.3, 2.4, 0.3);
  // 4 hewn-stone tables 1½ × 1½ × 1 for the burnt-offering utensils, further in – the middle of the gate (40:42, figure ג)
  for (const u of [24.7, 29.3]) for (const s of [-1, 1]) table('ig.N.stone', M.stone, u, s * 2.5, 1.5, 1, 1.5);
  // hooks (שפתים), one handbreadth (1/6 cubit) long, fastened to the walls and jutting into the passage (40:43): on the solid stretches
  // of the chambers' passage-side walls (clear of the pilasters, the doors and the cross-corridor mouths), and on the ulam's inner faces
  const hk = 1 / 6;
  for (const u of [11.8, 16.3, 24.8, 29.3, 37.8, 42.3]) for (const s of [-1, 1]) b.boxC('ig.N.hook', M.iron, u, 4.4, s * (5 - hk / 2), 0.5, 0.4, hk);
  for (const u of [4, 8]) for (const s of [-1, 1]) b.boxC('ig.N.hook', M.iron, u, 4.4, s * (6 - hk / 2), 0.5, 0.4, hk);
  b.pop();

  const Z = -100;
  c.anchor('ig.N.tables8', [0, Hi + 3, Z + 6], '8 שולחנות לשחיטה');
  c.anchor('ig.N.stone4', [0, Hi + 3, Z + 27], '4 שולחנות גזית');
  c.anchor('ig.N.rinse', [0, Hi + 7, Z + 20.5], 'לשכות הדחת העולה – באילמות');
  c.anchor('ic.sing.a', [21, Hi + 11, -89], 'לשכות השרים');
  c.anchor('ic.house.a', [41, Hi + 11, -71], 'שומרי משמרת הבית');
  c.anchor('ic.zadok.a', [79, Hi + 12, -30], 'בני צדוק – שומרי המזבח');
  c.measure('ic.m.court', '100 אמה', [-50, Hi + 0.3, 56], [50, Hi + 0.3, 56]);
  c.measure('ic.m.courtZ', '100 אמה', [56, Hi + 0.3, -50], [56, Hi + 0.3, 50]);
  c.measure('ic.m.between', '100 אמה', [100, Y.outer + 0.5, 30], [200, Y.outer + 0.5, 30]);
  c.measure('ic.m.betweenN', '100 אמה', [30, Y.outer + 0.5, -100], [30, Y.outer + 0.5, -200]);
  c.measure('ic.m.betweenS', '100 אמה', [30, Y.outer + 0.5, 100], [30, Y.outer + 0.5, 200]);
  c.measure('ic.m.tab8', '1½ × 1½ × 1', [3.25, Hi + 1.4, Z + 24.7 - 0.75], [3.25, Hi + 1.4, Z + 24.7 + 0.75]);
}
