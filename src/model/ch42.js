import { M } from '../engine/materials.js';
import { Y } from './dims.js';

/**
 * The holy chambers of ch. 42, rebuilt after the second part of the book (figure 29 "לשכות המאה" and the plan of the Temple Mount).
 * Frame: world x/z, y relative to the house floor (Y.house). East = +x, north = −z. Everything is mirrored for the south (s = +1).
 *
 *  לשכות המאה (lk.N / lk.S) – beside the house, 100 along its length, 50 deep, three storeys. Plan (figure 29), south block:
 *      inner (house-side) wall  x −160 … −60 at z 55  (20 from the house's rib wall, 42:3 "נגד העשרים")
 *      outer wall               x −110 … −60 at z 105 (50 long: 42:7-8 "ארך הלשכות אשר לחצר החיצונה חמישים אמה")
 *      the west end is closed by a 45° wall from (−160,55) to (−110,105) ("והשאר נסגר באלכסון")
 *    It starts 10 west of the house's west wall and ends 10 short of the inner court's west line (x −50): the 10-cubit walk (42:4).
 *  אתיקים (lk.N.atik …) – three long support walls from the rib wall across the gizra, the chambers, out to the outer court's pavements.
 *  לשכות החמישים (lk.fifty.N / lk.fifty.S) – two 50 × 50 blocks at the east corners of the inner court, outside its wall (42:9-12).
 *  גדרת הגינה (lk.N.gader, lk.S.gader, lk.gader.W, lk.gader.E) – the stepped fence around all of it, with the entrance from the east;
 *    lk.N.gader.front / lk.N.gader.diag (and .S) are the stretches before the chambers' outer wall and along the 45° wall (for the scenes' framing).
 */
const SH = 10;                          // storey height (the house's side chambers use 10 as well: the atikim join them storey to storey)
const SLAB = 0.8;                       // floor / roof slab
const WT = [5, 4, 3];                   // wall thickness, storey 1-3 (42:5-6: the atikim "eat" the walls – thinner above)
const R2 = Math.SQRT2;
const DOOR_W = 4.5, DOOR_H = 7;
const ATIK_W = [6, 4, 2];               // the atik is wide below, narrow above (figure 29: 6 · 4 · 2)
const ATIK_X = [-150, -118.35, -86.7];  // west edge of each atik (the first at the house's west wall, then every ~32 cubits)
const DROP_OUT = Y.outer - Y.house;     // −10: the outer court's floor below the house platform
const DROP_IN = Y.inner - Y.house;      // −6: the inner court's floor below the house platform

// ---------------------------------------------------------------- polygon helpers (plan coordinates [x, z'], z' mirrored by s when drawn)
const area = (p) => {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const [x0, z0] = p[i], [x1, z1] = p[(i + 1) % p.length]; a += x0 * z1 - x1 * z0; }
  return a / 2;
};
function clipHalf(poly, k, v, ge) {
  const out = [];
  const inside = (p) => (ge ? p[k] >= v - 1e-9 : p[k] <= v + 1e-9);
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const ia = inside(a), ib = inside(b);
    if (ia) out.push(a);
    if (ia !== ib) {
      const t = (v - a[k]) / (b[k] - a[k]);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
/** keep the part of a convex polygon where fn(p) <= 0 (fn linear) */
function clipLin(poly, fn) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const fa = fn(a), fb = fn(b);
    if (fa <= 1e-9) out.push(a);
    if ((fa < -1e-9 && fb > 1e-9) || (fa > 1e-9 && fb < -1e-9)) {
      const t = fa / (fa - fb);
      out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
/** keep the part of a convex polygon with lo <= p[k] <= hi (k: 0 = x, 1 = z) */
function clip(poly, k, lo = -Infinity, hi = Infinity) {
  let p = poly;
  if (lo > -Infinity) p = clipHalf(p, k, lo, true);
  if (hi < Infinity && p.length) p = clipHalf(p, k, hi, false);
  return p;
}
/** extrude a plan polygon (mirrored by s) – skips degenerate pieces */
function solid(b, tag, mat, poly, y0, y1, s = 1) {
  if (!poly || poly.length < 3 || y1 - y0 < 1e-6) return;
  const pts = [];
  for (const p of poly) {
    const q = [p[0], s * p[1]];
    const l = pts[pts.length - 1];
    if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 1e-6) pts.push(q);
  }
  while (pts.length > 1 && Math.hypot(pts[0][0] - pts[pts.length - 1][0], pts[0][1] - pts[pts.length - 1][1]) < 1e-6) pts.pop();
  if (pts.length < 3 || Math.abs(area(pts)) < 1e-4) return;
  b.poly(tag, mat, pts, y0, y1);
}
/**
 * a wall member (convex quad) cut by openings along x: gaps = [{a, b, lo, hi}] sorted, open between heights lo..hi above y0
 * (a door: lo 0 / hi 7; a window: lo 3 / hi 7; an atik: lo 0 / hi ∞ = cut right through)
 */
function member(b, tag, mat, quad, gaps, y0, y1, s) {
  const H = y1 - y0;
  let cur = -Infinity;
  for (const g of gaps) {
    solid(b, tag, mat, clip(quad, 0, cur, g.a), y0, y1, s);
    const mid = clip(quad, 0, g.a, g.b);
    if (g.lo > 0) solid(b, tag, mat, mid, y0, y0 + g.lo, s);
    if (g.hi < H) solid(b, tag, mat, mid, y0 + g.hi, y1, s);
    cur = g.b;
  }
  solid(b, tag, mat, clip(quad, 0, cur, Infinity), y0, y1, s);
}
/** door jambs + lintel beam (timber) in the openings of a wall member */
function doorFrames(b, tag, quad, doors, y0, s) {
  for (const d of doors) {
    for (const [a, bb] of [[d.a, d.a + 0.35], [d.b - 0.35, d.b]]) solid(b, tag, M.cedar, clip(quad, 0, a, bb), y0, y0 + DOOR_H, s);
    solid(b, tag, M.cedar, clip(quad, 0, d.a, d.b), y0 + DOOR_H - 0.5, y0 + DOOR_H, s);
  }
}

// ---------------------------------------------------------------- the 100 × 50 chambers
function hundred(c, b, s) {
  const id = `lk.${s < 0 ? 'N' : 'S'}`;
  const K = 215 - 5 * R2;                       // the inner face of the diagonal wall: z = x + K
  const AT = ATIK_X.map((a) => a + 3);          // atik centres
  const DOORS = [{ q: 'diag', c: -128 }, { q: 'north', c: -101.5 }, { q: 'north', c: -72.5 }]; // one door per bay, as drawn (ח ×3)
  const bx = (tag, mat, x0, y0, z0, x1, y1, z1) => b.box(tag, mat, x0, y0, s * z0, x1, y1, s * z1);

  for (let f = 0; f < 3; f++) {
    const t = WT[f], y0 = f * SH, y1 = y0 + SH - SLAB;
    // outer corners (the walls' outer faces step in on every storey; the hall inside stays the same)
    const O1 = [60 - t - K - t * R2, 60 - t], O2 = [100 + t - K - t * R2, 100 + t], O3 = [-65 + t, 100 + t], O4 = [-65 + t, 60 - t];
    // inner corners = the hall: 40 wide, from the 45° wall to the east wall
    const I1 = [60 - K, 60], I2 = [100 - K, 100], I3 = [-65, 100], I4 = [-65, 60];
    const tag = `${id}.f${f + 1}`;
    const atikGaps = AT.map((c0) => ({ a: c0 - ATIK_W[f] / 2, b: c0 + ATIK_W[f] / 2, lo: 0, hi: Infinity }));
    const open = (q) => DOORS.filter((d) => d.q === q).map((d) => (f === 0
      ? { a: d.c - DOOR_W / 2, b: d.c + DOOR_W / 2, lo: 0, hi: DOOR_H }
      : { a: d.c - 1.25, b: d.c + 1.25, lo: 3, hi: 7 }));
    const gaps = (q) => [...atikGaps, ...open(q)].sort((p, r) => p.a - r.a);
    const diag = [O1, O2, I2, I1], north = [O2, O3, I3, I2], side = [O4, O1, I1, I4];
    member(b, tag, M.house, diag, gaps('diag'), y0, y1, s);
    member(b, tag, M.house, north, gaps('north'), y0, y1, s);
    member(b, tag, M.house, side, atikGaps, y0, y1, s);
    // east wall; on the ground floor its south end is set back by one cubit: the 1-cubit slit "דרך אמה אחת" at the corner (42:4, ו′)
    const O4e = f === 0 ? [O4[0], O4[1] + 1] : O4, I4e = f === 0 ? [I4[0], I4[1] + 1] : I4;
    solid(b, tag, M.house, [O3, O4e, I4e, I3], y0, y1, s);
    // floor / roof slab over the whole footprint
    solid(b, tag, M.roof, [O1, O2, O3, O4], y1, y0 + SH, s);
    if (f === 0) {
      solid(b, `${id}.base`, M.floor, [O1, O2, O3, O4], -0.5, 0.02, s);
      doorFrames(b, `${id}.door`, north, open('north'), y0, s);
      doorFrames(b, `${id}.door`, diag, open('diag'), y0, s);
    }
  }
  // the slit at the south-east corner (ground floor): a threshold in the 45° opening between the walls
  solid(b, `${id}.slit`, M.stoneDark, [[-65, 60], [-60, 55], [-60, 56], [-65, 61]], 0, 0.14, s);

  // ---- the gizra (20 cubits between the house's ribs and the chambers, 42:3 "נגד העשרים אשר לחצר הפנימי")
  bx(`${id}.gizra`, M.stone, -160, 0.3, 35, -60, 0.36, 55);

  // ---- the 10-cubit walk east of the chambers and the 1-cubit way (42:4), from the slit to the inner court's west line
  bx(`${id}.walk`, M.stone, -60, 0, 56, -50, 0.07, 105);
  bx(`${id}.way`, M.stoneDark, -60, 0, 55, -50, 0.14, 56);

  // ---- platform ledge along the outer wall: carries the lane and the fence (the house platform ends at z 105)
  bx(`${id}.base`, M.stoneDark, -115, DROP_OUT - 0.5, 105, -50, -0.5, 112);
  bx(`${id}.base`, M.floor, -115, -0.5, 105, -50, 0, 112);
  // ---- המבוא מהקדים: twenty steps down to the outer court on the east, where the ground is lower (42:9)
  b.steps(`${id}.mavo`, M.stone, -40, -50, s * 105, s * 108, DROP_OUT, 0.5, 20);

  // ---- אתיקים: three support walls, stepped 6 · 4 · 2 (one tier per storey), from the house's rib wall (z 35) out to the pavements
  AT.forEach((c0) => {
    for (let f = 0; f < 3; f++) {
      const w = ATIK_W[f] / 2, rect = [[c0 - w, 35], [c0 + w, 35], [c0 + w, 105], [c0 - w, 105]];
      const inside = clipLin(rect, (p) => p[1] - p[0] - 215);     // z <= x + 215: within the chambers' outer boundary (the 45° wall)
      const outside = clipLin(rect, (p) => 215 - (p[1] - p[0]));
      // across the gizra and through the chambers: three tiers, level with the ribs' storeys
      solid(b, `${id}.atik`, M.stone, inside, f * SH, (f + 1) * SH + (f === 2 ? SLAB : 0.03), s);
      // where it leaves the chambers (it crosses the 45° wall) and beyond: a low stepped ridge, first on the platform, then on the outer court's floor
      solid(b, `${id}.atik`, M.stone, outside, 2 * f, 2 * (f + 1), s);
      bx(`${id}.atik`, M.stone, c0 - w, DROP_OUT + 2 * f, 105, c0 + w, DROP_OUT + 2 * (f + 1), 200);
    }
  });

  // ---- measures
  const m = (n, label, a, bb, kind) => c.measure(`${id}.m.${n}`, label, a, bb, kind);
  const Z = (z) => s * z;
  m('len', '100 אמה', [-160, 0.6, Z(52)], [-60, 0.6, Z(52)]);
  m('wid', '50 אמה', [-57, 0.6, Z(55)], [-57, 0.6, Z(105)]);
  m('outer', '50 אמה', [-110, 0.6, Z(106.5)], [-60, 0.6, Z(106.5)]);
  m('diag', 'אלכסון 45°', [-160, 0.6, Z(55)], [-110, 0.6, Z(105)], 'tag');
  m('gizra', '20 אמה', [-156, 0.6, Z(35)], [-156, 0.6, Z(55)]);
  m('walk', '10 אמות', [-60, 0.6, Z(70)], [-50, 0.6, Z(70)]);
  m('way', '1 אמה', [-55, 0.6, Z(55)], [-55, 0.6, Z(56)]);
  // the book's computation (note 1): 100 − 70 = 30 → 15 a side; 20 between the ribs and the chambers, of which 5 are not opposite the court; the wall is 6
  m('fifteen', '15 אמה', [-72, 0.7, Z(35)], [-72, 0.7, Z(50)]);
  m('five', '5 אמות', [-72, 0.7, Z(50)], [-72, 0.7, Z(55)]);
  m('cwall', '6 אמות', [-46, 6.3, Z(50)], [-46, 6.3, Z(56)]);
  m('floors', '3 קומות', [-57, 0, Z(105)], [-57, 3 * SH, Z(105)], 'v');
  // wall thickness on the three storeys (measured on the ledges of the east wall) and the atik's three widths (in the gizra)
  m('wall1', '5 אמות', [-65, SH + 0.15, Z(90)], [-60, SH + 0.15, Z(90)]);
  m('wall2', '4 אמות', [-65, 2 * SH + 0.15, Z(80)], [-61, 2 * SH + 0.15, Z(80)]);
  m('wall3', '3 אמות', [-65, 3 * SH + 0.15, Z(70)], [-62, 3 * SH + 0.15, Z(70)]);
  m('atik6', '6 אמות', [AT[1] - 3, SH + 0.15, Z(40)], [AT[1] + 3, SH + 0.15, Z(40)]);
  m('atik4', '4 אמות', [AT[1] - 2, 2 * SH + 0.15, Z(45)], [AT[1] + 2, 2 * SH + 0.15, Z(45)]);
  m('atik2', '2 אמות', [AT[1] - 1, 3 * SH + SLAB + 0.15, Z(50)], [AT[1] + 1, 3 * SH + SLAB + 0.15, Z(50)]);
  m('atikStart', 'מקיר הצלעות', [AT[0], 3 * SH + 2, Z(35)], [AT[0], 3 * SH + 2, Z(35)], 'tag');
  m('atikEnd', 'עד הרצפות שבחצר החיצונה', [AT[1], DROP_OUT + 7, Z(200)], [AT[1], DROP_OUT + 7, Z(200)], 'tag');
  m('thirds', 'אתיק אל פני אתיק בשלישים', [AT[0], 0.7, Z(45)], [AT[2], 0.7, Z(45)], 'tag');
  m('door', s < 0 ? 'פתחים לצפון' : 'פתחים לדרום', [-101.5, DOOR_H + 0.6, Z(106)], [-72.5, DOOR_H + 0.6, Z(106)], 'tag');
  m('gader', '50 אמה', [-110, 4.6, Z(109.75)], [-60, 4.6, Z(109.75)]);
  m('mavo', 'המבוא מהקדים', [-50, 0.4, Z(106.5)], [-40, DROP_OUT + 0.4, Z(106.5)], 'tag');
  m('drop', '10 אמות', [-38, DROP_OUT, Z(106.5)], [-38, 0, Z(106.5)], 'v');

  c.anchor(`${id}.a`, [-112, 3 * SH + 4, Z(80)], 'לשכות המאה');
  c.anchor(`${id}.atik.a`, [AT[0], DROP_OUT + 9, Z(125)], 'אתיק');
}

// ---------------------------------------------------------------- the 50 × 50 chambers at the inner court's east corners
function fifty(c, b, s) {
  const id = `lk.fifty.${s < 0 ? 'N' : 'S'}`;
  b.push(0, DROP_IN, 0, 0);                    // y = 0 is now the inner court's floor
  const OUTER = Y.outer - Y.inner;             // −4: the outer court's floor
  const bx = (tag, mat, x0, y0, z0, x1, y1, z1) => b.box(tag, mat, x0, y0, s * z0, x1, y1, s * z1);
  const DOORS = [83.5, 98.5];                  // two doors in the outer (north) wall, at the thirds of the 50 as drawn

  // podium: the chambers stand level with the inner court's platform; it also carries the lane (3) and the fence's foot on the outer sides
  bx(`${id}.base`, M.stoneDark, 66, OUTER - 0.5, 55, 123.5, -0.5, 112);
  bx(`${id}.base`, M.floor, 66, -0.5, 55, 123.5, 0.02, 112);

  for (let f = 0; f < 3; f++) {
    const t = WT[f], y0 = f * SH, y1 = y0 + SH - SLAB;
    const SW = [71 - t, 60 - t], NW = [71 - t, 100 + t], NE = [111 + t, 100 + t], SE = [111 + t, 60 - t];
    const sw = [71, 60], nw = [71, 100], ne = [111, 100], se = [111, 60];
    const tag = `${id}.f${f + 1}`;
    const open = DOORS.map((c0) => (f === 0 ? { a: c0 - DOOR_W / 2, b: c0 + DOOR_W / 2, lo: 0, hi: DOOR_H } : { a: c0 - 1.25, b: c0 + 1.25, lo: 3, hi: 7 }));
    const north = [NW, NE, ne, nw];
    member(b, tag, M.house, north, open, y0, y1, s);
    solid(b, tag, M.house, [NE, SE, se, ne], y0, y1, s);          // east wall
    solid(b, tag, M.house, [SE, SW, sw, se], y0, y1, s);          // court-side wall
    // west wall; on the ground floor its court-side end is set back by one cubit: the 1-cubit slit at the corner (42:12 "פתח בראש דרך")
    const SWw = f === 0 ? [SW[0], SW[1] + 1] : SW, swW = f === 0 ? [sw[0], sw[1] + 1] : sw;
    solid(b, tag, M.house, [SWw, NW, nw, swW], y0, y1, s);
    solid(b, tag, M.roof, [SW, NW, NE, SE], y1, y0 + SH, s);
    if (f === 0) doorFrames(b, `${id}.door`, north, open, y0, s);
  }
  solid(b, `${id}.slit`, M.stoneDark, [[66, 55], [71, 60], [71, 61], [66, 56]], 0, 0.14, s);

  // the 10-cubit walk between the court's wall and the chambers (x 56…66) and the 1-cubit way along the platform's edge
  bx(`${id}.walk`, M.stone, 56, OUTER, 56, 66, OUTER + 0.07, 105);
  bx(`${id}.way`, M.stoneDark, 56, 0, 55, 66, 0.14, 56);
  // eight steps (as at the inner gates) down from the lane to the outer court, at the lane's west end
  b.steps(`${id}.mavo`, M.stone, 62, 66, s * 105, s * 108, OUTER, 0.5, 8);

  const m = (n, label, a, bb, kind) => c.measure(`${id}.m.${n}`, label, a, bb, kind);
  const Z = (z) => s * z;
  m('len', '50 אמה', [66, 0.6, Z(106.5)], [116, 0.6, Z(106.5)]);
  m('wid', '50 אמה', [62, OUTER + 0.6, Z(55)], [62, OUTER + 0.6, Z(105)]);
  m('walk', '10 אמות', [56, OUTER + 0.6, Z(58)], [66, OUTER + 0.6, Z(58)]);
  m('way', '1 אמה', [61, 0.6, Z(55)], [61, 0.6, Z(56)]);
  m('floors', '3 קומות', [118, 0, Z(58)], [118, 3 * SH, Z(58)], 'v');
  m('door', s < 0 ? 'פתחים לצפון' : 'פתחים לדרום', [DOORS[0], DOOR_H + 0.6, Z(106)], [DOORS[1], DOOR_H + 0.6, Z(106)], 'tag');
  m('mavo', 'מדרגות אל החצר החיצונה', [66, 0.4, Z(106.5)], [62, OUTER + 0.4, Z(106.5)], 'tag');
  c.anchor(`${id}.a`, [91, 3 * SH + 4, Z(80)], 'לשכות החמישים');
  b.pop();
}

// ---------------------------------------------------------------- the fence around everything (גדרת הגינה)
function gader(c, b) {
  const L = 3, G = 3.5;                          // lane between the chambers and the fence; the fence's foot (figure: 4 steps of half a cubit a side)
  const TIER = [3.5, 2.5, 1.5, 0.5];             // the fence is a stepped wall: one cubit high each tier
  const V = [[-160, -55], [-160, 55], [-110, 105], [116, 105], [116, -105], [-110, -105]];
  const cen = [V.reduce((a, p) => a + p[0], 0) / V.length, V.reduce((a, p) => a + p[1], 0) / V.length];
  const normal = (i) => {
    const p = V[i], q = V[(i + 1) % V.length];
    let nx = q[1] - p[1], nz = p[0] - q[0];
    const l = Math.hypot(nx, nz); nx /= l; nz /= l;
    const mx = (p[0] + q[0]) / 2 - cen[0], mz = (p[1] + q[1]) / 2 - cen[1];
    return mx * nx + mz * nz > 0 ? [nx, nz] : [-nx, -nz];
  };
  const NRM = V.map((_, i) => normal(i));
  const off = (i, d) => {
    const a = NRM[(i + V.length - 1) % V.length], n = NRM[i], k = d / (1 + a[0] * n[0] + a[1] * n[1]);
    return [V[i][0] + (a[0] + n[0]) * k, V[i][1] + (a[1] + n[1]) * k];
  };
  const TAGS = ['lk.gader.W', 'lk.S.gader.diag', 'lk.S.gader', 'lk.gader.E', 'lk.N.gader', 'lk.N.gader.diag'];
  // the ground the fence stands on: house platform in the west, outer court's floor in the middle, the 50-chambers' podium in the east
  const BASE = { plat: 0, out: DROP_OUT, pod: DROP_IN };
  const put = (tag, zone, poly, i) => solid(b, tag, M.wall, poly, BASE[zone] + i, BASE[zone] + i + 1, 1);

  TIER.forEach((w, i) => {
    const d1 = L + (G - w) / 2, d2 = d1 + w;
    for (let k = 0; k < V.length; k++) {
      const k2 = (k + 1) % V.length;
      const quad = [off(k, d1), off(k2, d1), off(k2, d2), off(k, d2)];
      const tag = TAGS[k];
      if (k === 0 || k === 1 || k === 5) put(tag, 'plat', quad, i);
      else if (k === 2 || k === 4) {
        // the stretch before the chambers' outer wall (x −113 … −57: "ארכו חמישים אמה", 42:7) is tagged apart from the rest
        const plat = clip(quad, 0, -Infinity, -50);
        put(tag, 'plat', clip(plat, 0, -Infinity, -113), i);
        put(`${tag}.front`, 'plat', clip(plat, 0, -113, -57), i);
        put(tag, 'plat', clip(plat, 0, -57, Infinity), i);
        put(tag, 'out', clip(quad, 0, -50, 66), i);
        put(tag, 'pod', clip(quad, 0, 66, Infinity), i);
      } else {
        // east side: the podium level at the two corners, the outer court's floor between them, with the entrance (המבוא מהקדים) at the middle
        put(tag, 'pod', clip(quad, 1, -Infinity, -55), i);
        put(tag, 'pod', clip(quad, 1, 55, Infinity), i);
        put(tag, 'out', clip(quad, 1, -55, -20), i);
        put(tag, 'out', clip(quad, 1, 20, 55), i);
      }
    }
  });
  // the entrance from the east: two piers flanking the opening
  for (const sz of [-1, 1]) {
    b.box('lk.mavo.E', M.stone, 118.5, DROP_OUT, sz > 0 ? 20 : -22.5, 123, DROP_OUT + 9, sz > 0 ? 22.5 : -20);
    b.box('lk.mavo.E', M.stoneDark, 118, DROP_OUT + 9, sz > 0 ? 19.5 : -23, 123.5, DROP_OUT + 9.6, sz > 0 ? 23 : -19.5);
  }
  c.measure('lk.m.mavoE', 'המבוא מהקדים', [128, DROP_OUT + 0.4, 0], [112, DROP_OUT + 0.4, 0], 'tag');
  c.anchor('lk.gader.a', [10, DROP_OUT + 7, -111], 'גדרת הגינה');
  c.anchor('lk.gader.b', [-165, 7, 0], 'גדרת הגינה');
  c.anchor('lk.gader.c', [121, DROP_OUT + 12, 0], 'המבוא מהקדים');
}

export function buildChambers(c) {
  const b = c.b;
  b.push(0, Y.house, 0, 0);
  for (const s of [-1, 1]) {
    hundred(c, b, s);
    fifty(c, b, s);
  }
  gader(c, b);
  b.pop();
}
