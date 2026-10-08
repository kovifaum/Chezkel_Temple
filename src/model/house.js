import { M } from '../engine/materials.js';
import { Y } from './dims.js';
import { palm, cherub, sealedWindow } from './decor.js';
import { makeDoor } from './doors.js';

/**
 * The house (הבית) – ch. 41, as drawn on p.18 of the book. Frame: world x/z, y relative to the house floor.
 * East = +x (front, ulam), west = −x.
 *   total length 100 = 3 + 11 + 6 + 40 + 4 + 20 + 6 + 4 + 5 + 1
 *   chamber block width 70 = 5 + 4 + 5 + 5 + 6 + 20 + 6 + 5 + 5 + 4 + 5
 */
export const HOUSE_H = 100;
const ULAM_H = 50;

export function buildHouse(c) {
  const b = c.b;
  b.push(0, Y.house, 0, 0);
  const T = 'house';

  // ---- platform ("מוסדות", 6 high, 41:8) carrying house + gizra + binyan + the chambers of ch. 42
  b.box(`${T}.plinth`, M.stoneDark, -170, -6, -105, -50, -0.5, 105);
  b.box(`${T}.gizra`, M.floor, -170, -0.5, -105, -50, 0, 105);
  // gizra: the 20-cubit separate place around the house (41:12)
  const gz = (x0, z0, x1, z1) => b.box(`${T}.gizra`, M.stone, x0, 0, z0, x1, 0.3, z1);
  gz(-170, -55, -150, 55); gz(-150, -55, -70, -35); gz(-150, 35, -70, 55);
  for (const [x0, z0, x1, z1] of [[-170, -55, -169.6, 55], [-150, -55, -149.6, 55]]) b.box(`${T}.gizra`, M.stoneDark, x0, 0, z0, x1, 0.4, z1);
  // ten steps up to the ulam (40:49)
  b.steps(`${T}.steps`, M.stone, -40, -50, -10, 10, -6, 0.6, 10);

  // ---- floors
  b.box(`${T}.floor`, M.wood, -134, -0.3, -10, -70, 0, 10);       // KK + heichal
  b.box(`${T}.floor`, M.floor, -64, -0.3, -10, -50, 0, 10);       // ulam
  b.box(`${T}.mynach`, M.stone, -140, 0, 16, -50, 0.25, 21);      // מנח, south
  b.box(`${T}.mynach`, M.stone, -140, 0, -21, -50, 0.25, -16);    // מנח, north

  // ---- heichal + KK shell (walls to HOUSE_H)
  const wall = (tag, x0, z0, x1, z1, y0 = 0, y1 = HOUSE_H, mat = M.house) => b.box(`${T}.${tag}`, mat, x0, y0, z0, x1, y1, z1);
  wall('walls', -140, 10, -64, 16);            // south side wall (6)
  wall('walls', -140, -16, -64, -10);          // north side wall (6)
  wall('walls', -140, -16, -134, 16);          // west wall of KK (6)
  // KK | heichal wall (4) with a 7-wide opening; the jambs (ails) bulge 2 into the heichal: 4 + 2 = 6 (41:3)
  wall('walls', -114, 3.5, -110, 10); wall('walls', -114, -10, -110, -3.5);
  wall('walls', -114, -3.5, -110, 3.5, 16, HOUSE_H);
  wall('walls', -110, 3.5, -108, 6, 0, 16); wall('walls', -110, -6, -108, -3.5, 0, 16);
  // heichal front wall (6) with a 10-wide opening, jambs 5 (41:1-2)
  wall('walls', -70, 5, -64, 10); wall('walls', -70, -10, -64, -5);
  wall('walls', -70, -5, -64, 5, 22, HOUSE_H);
  // ceiling over heichal+KK interior (40 high) and roof
  b.box(`${T}.roof`, M.roof, -134, 40, -10, -70, 43, 10);
  b.box(`${T}.roof`, M.roof, -140, HOUSE_H, -16, -64, HOUSE_H + 3, 16);
  b.box(`${T}.roof`, M.stoneDark, -140.6, HOUSE_H + 3, -16.6, -63.4, HOUSE_H + 4, 16.6);

  // ---- ulam (porch): 20 × 11 interior, front wall 3 with a 14-wide opening (40:48-49)
  wall('ulam', -64, 10, -50, 16, 0, ULAM_H);
  wall('ulam', -64, -16, -50, -10, 0, ULAM_H);
  wall('ulam', -53, 7, -50, 10, 0, ULAM_H); wall('ulam', -53, -10, -50, -7, 0, ULAM_H);
  wall('ulam', -53, -7, -50, 7, 30, ULAM_H);
  b.box(`${T}.ulam`, M.roof, -64, ULAM_H, -16, -50, ULAM_H + 2.5, 16);
  b.box(`${T}.ulam`, M.stoneDark, -64.5, ULAM_H + 2.5, -16.5, -49.5, ULAM_H + 3.2, 16.5);
  // jambs of the ulam bulge 2 into the court: 3 (wall) + 2 = 5 (40:48)
  b.box(`${T}.ulam`, M.house, -50, 0, 7, -48, 30, 10); b.box(`${T}.ulam`, M.house, -50, 0, -10, -48, 30, -7);
  // two pillars beside the posts (40:49)
  for (const s of [-1, 1]) {
    b.cyl(`${T}.ulam`, M.bronze, -48.9, -0.6, s * 8.6, 1.1, 34, 20);
    b.cyl(`${T}.ulam`, M.bronze, -48.9, 33.4, s * 8.6, 1.5, 1.2, 20);
    b.sphere(`${T}.ulam`, M.bronze, -48.9, 35.2, s * 8.6, 1.5, 16, 10);
  }
  // palms on the ulam pilasters (41:26)
  for (const s of [-1, 1]) {
    b.push(-51.4, 0, s * 8.6, -Math.PI / 2);
    palm(b, `${T}.carve`, 0, 8, 0.05, 11);
    b.pop();
  }
  sealedWindow(b, `${T}.win`, -57, 10, 16, 3, 5, 1);
  sealedWindow(b, `${T}.win`, -57, 10, -16, 3, 5, -1);

  // ---- בית החליפות wings flanking the ulam (p.18: 5+19+5 wide, 6+11+3 long)
  for (const s of [-1, 1]) {
    const z0 = s > 0 ? 21 : -50, z1 = s > 0 ? 50 : -21;
    b.room(`${T}.hlf`, M.house, {
      x0: -70, x1: -50, z0, z1, y0: 0, h: 14, t: 5, tx0: 6, tx1: 3,
      tz0: s > 0 ? 5 : 5, tz1: 5,
      doors: [{ side: s > 0 ? 'z0' : 'z1', c: -58.5, w: 4, h: 8 }],
    });
    b.box(`${T}.hlf`, M.roof, -70, 14, z0, -50, 15, z1);
  }

  // ---- side chambers (צלעות): 3 floors × (5 cells N + 5 cells S) + west cell = 33 (41:5-6)
  const cellXs = [-137, -124, -111, -98, -85]; // each cell 8 long
  const storeyH = 10;
  for (const s of [-1, 1]) {
    const Z = (z) => s * z;
    const zr = (a, bb) => [Math.min(Z(a), Z(bb)), Math.max(Z(a), Z(bb))];
    for (let f = 0; f < 3; f++) {
      const y0 = f * storeyH;
      const part = [21, 26 - f]; // partition thins upward → cells widen 4 / 5 / 6 (41:7)
      const cellZ = [26 - f, 30];
      // outer wall
      let [za, zb] = zr(30, 35);
      b.box(`${T}.cham`, M.house, -149, y0, za, -70, y0 + storeyH, zb);
      // dividers between cells
      for (let k = 0; k <= 5; k++) {
        const x0 = k === 0 ? -144 : cellXs[k - 1] + 8, x1 = k === 5 ? -70 : cellXs[k];
        [za, zb] = zr(cellZ[0], 30);
        b.box(`${T}.cham`, M.house, x0, y0, za, x1, y0 + storeyH, zb);
      }
      // inner partition with a door per cell onto the mynach
      [za, zb] = zr(part[0], part[1]);
      let cur = -144;
      for (const cx of cellXs) {
        const d0 = cx + 2.5, d1 = cx + 5.5;
        b.box(`${T}.cham`, M.house, cur, y0, za, d0, y0 + storeyH, zb);
        b.box(`${T}.cham`, M.house, d0, y0 + 6.5, za, d1, y0 + storeyH, zb);
        cur = d1;
      }
      b.box(`${T}.cham`, M.house, cur, y0, za, -70, y0 + storeyH, zb);
      // floor/ceiling slab
      [za, zb] = zr(21, 35);
      b.box(`${T}.cham`, M.roof, -149, y0 + storeyH - 0.8, za, -70, y0 + storeyH, zb);
    }
  }
  // west cell (תא מערבי), 4 wide, 3 floors, spanning between the two blocks (p.18)
  for (let f = 0; f < 3; f++) {
    const y0 = f * storeyH;
    b.box(`${T}.cham`, M.house, -149, y0, -35, -144, y0 + storeyH, 35);
    b.box(`${T}.cham`, M.house, -149, y0 + storeyH - 0.8, -35, -140, y0 + storeyH, 35);
  }
  b.box(`${T}.cham`, M.plaster, -150, 0, -35, -149, 3 * storeyH, 35);
  b.box(`${T}.cham`, M.roof, -150.5, 3 * storeyH, -35.5, -69.5, 3 * storeyH + 0.8, 35.5);

  // ---- interior: wainscot of wood (שחיף עץ, 41:16), cherubim & palms (41:18-20), sealed windows
  const paneled = (x0, z0, x1, z1) => b.box(`${T}.panel`, M.cedar, x0, 0, z0, x1, 11, z1);
  paneled(-110, -10, -70, -9.7); paneled(-110, 9.7, -70, 10);
  paneled(-134, -10, -114, -9.7); paneled(-134, 9.7, -114, 10);
  paneled(-134, -10, -133.7, 10);
  const run = (cx, cz, len, rot, y = 14, s = 1.6) => {
    b.push(cx, y, cz, rot);
    const n = Math.floor(len / 9);
    const start = -((n - 1) * 9) / 2;
    for (let i = 0; i < n; i++) {
      cherub(b, `${T}.carve`, start + i * 9, 0, 0.1, s);
      if (i < n - 1) palm(b, `${T}.carve`, start + i * 9 + 4.5, 0, 0.1, 8);
    }
    b.pop();
  };
  run(-90, -9.65, 40, 0);            // heichal north wall (faces south)
  run(-90, 9.65, 40, Math.PI);       // heichal south wall
  run(-124, -9.65, 20, 0);           // KK north
  run(-124, 9.65, 20, Math.PI);      // KK south
  run(-133.7, 0, 20, Math.PI / 2);   // KK west wall
  for (const x of [-100, -80]) { sealedWindow(b, `${T}.win`, x, 28, -9.6, 3, 5, 1); sealedWindow(b, `${T}.win`, x, 28, 9.6, 3, 5, -1); }

  // wooden altar in the heichal (41:22): 3 high, 2 × 2, four corners
  b.box(`${T}.altarW`, M.cedar, -75, 0, -1, -73, 3, 1);
  for (const [x, z] of [[-75, -1], [-75, 0.6], [-73.4, -1], [-73.4, 0.6]]) b.box(`${T}.altarW`, M.cedar, x, 3, z, x + 0.4, 3.5, z + 0.4);

  // ---- measures (plan of p.18)
  const m = (n, label, a, bb, kind) => c.measure(`house.m.${n}`, label, a, bb, kind);
  const y = 0.6;
  m('len100', '100 אמה', [-150, y, 56], [-50, y, 56]);
  m('w100', '100 אמה', [-48, y, -50], [-48, y, 50]);
  m('w70', '70 אמה', [-152, y, -35], [-152, y, 35]);
  m('heichalL', '40 אמה', [-110, y, 0], [-70, y, 0]);
  m('heichalW', '20 אמה', [-90, y, -10], [-90, y, 10]);
  m('kkL', '20 אמה', [-134, y, 4], [-114, y, 4]);
  m('kkW', '20 אמה', [-124, y, -10], [-124, y, 10]);
  m('kkDoor', '7 אמות', [-112, y, -3.5], [-112, y, 3.5]);
  m('kkAil', '2 אמות', [-110, y + 0.2, 4.8], [-108, y + 0.2, 4.8]);
  m('kkThick', '6 = 4 + 2', [-114, y + 0.2, 8], [-108, y + 0.2, 8]);
  m('kkJamb', '6½ אמות', [-112, y, 3.5], [-112, y, 10]);
  m('kkWall', '4 אמות', [-114, y + 0.2, -11.5], [-110, y + 0.2, -11.5]);
  m('door10', '10 אמות', [-67, y, -5], [-67, y, 5]);
  m('jamb5', '5 אמות', [-67, y, 5], [-67, y, 10]);
  m('wall6', '6 אמות', [-67, y + 0.2, 10], [-67, y + 0.2, 16]);
  m('wallFront6', '6 אמות', [-70, y + 0.2, -11.5], [-64, y + 0.2, -11.5]);
  m('ulamZ', '20 אמה', [-58.5, y, -10], [-58.5, y, 10]);
  m('ulamX', '11 אמה', [-64, y, 0], [-53, y, 0]);
  m('ulamWall', '3 אמות', [-53, y, -12], [-50, y, -12]);
  m('ulamDoor', '14 אמה', [-51.5, y, -7], [-51.5, y, 7]);
  m('ulamJamb', '5 = 3 + 2', [-53, y + 0.3, 12.2], [-48, y + 0.3, 12.2]);
  m('steps10', '10 מעלות', [-40, -6, 14], [-50, 0, 14]);
  m('plinth6', '6 אמות', [-38, -6, 14], [-38, 0, 14], 'v');
  m('westWall', '6 אמות', [-140, y + 0.2, -12], [-134, y + 0.2, -12]);
  m('westCell4', '4 אמות', [-144, y, 0], [-140, y, 0]);
  m('westOuter5', '5 אמות', [-149, y, 12], [-144, y, 12]);
  m('thin1', 'אמה', [-150, y, 20], [-149, y, 20]);
  m('mynach5', '5 אמות', [-100, y, 16], [-100, y, 21]);
  m('cellWall5', '5 אמות', [-100, y, 21], [-100, y, 26]);
  m('cell4', '4 אמות', [-133, y, 26], [-133, y, 30]);
  m('outer5', '5 אמות', [-100, y, 30], [-100, y, 35]);
  m('cells', '33 צלעות', [-137, 31.5, 33], [-85, 31.5, 33]);
  m('cellW', '4 · 5 · 6', [-141, 10, 26], [-141, 10, 30], 'v');
  m('hlfW', '19 אמה', [-61, y, 26], [-61, y, 45]);
  m('hlfL', '11 אמה', [-64, y, 35], [-53, y, 35]);
  m('hlfWall', '5 אמות', [-61, y, 45], [-61, y, 50]);
  m('houseH', '100 אמה', [-152, 0, 37], [-152, HOUSE_H, 37], 'v');
  m('gizraW', '20 אמה', [-170, y, 58], [-150, y, 58]);
  m('gizraN', '20 אמה', [-120, y, 35], [-120, y, 55]);
  m('binyanL90', '90 אמה', [-140, y, -37], [-50, y, -37]);
  m('west10', '4 + 6', [-150, y, 37], [-140, y, 37]);
  m('wings15', '15 אמה', [-60, y, 35], [-60, y, 50]);
  m('altarW3', '3 אמות', [-76.2, 0, 0], [-76.2, 3, 0], 'v');
  m('altarW2', '2 אמות', [-75, 3.8, 0], [-73, 3.8, 0]);
  c.anchor('house.heichal.a', [-90, 24, 0], 'ההיכל');
  c.anchor('house.kk.a', [-124, 24, 0], 'קודש הקדשים');
  c.anchor('house.ulam.a', [-57, 54, 0], 'האולם');
  c.anchor('house.binyan.a', [-110, 34, 36], 'הבנין (70 × 90)');
  c.anchor('house.gizra.a', [-160, 3, 40], 'הגזרה');
  c.anchor('house.hlf.a', [-60, 16, 34], 'בית החליפות');
  b.pop();

  // ---- doors (animated pivots; built outside the batch)
  const doors = {};
  const doorMeshes = [];
  const door = (name, x, z, w, h, sgn) => {
    const d = makeDoor({ x, y: Y.house, z, w, h, sgn, tag: `${T}.doors` });
    doors[name] = d.piv;
    doorMeshes.push(...d.meshes);
  };
  // heichal: two leaves meeting at z=0, hinged on the jambs (z = ±5)
  door('heichalN', -67, -5, 5, 20, +1);
  door('heichalS', -67, 5, 5, 20, -1);
  // KK: leaves 3.5 wide, hinged at z = ±3.5
  door('kkN', -112, -3.5, 3.5, 14, +1);
  door('kkS', -112, 3.5, 3.5, 14, -1);
  return { doors, doorMeshes };
}
