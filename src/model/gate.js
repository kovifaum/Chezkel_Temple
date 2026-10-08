import { M } from '../engine/materials.js';
import { D } from './dims.js';
import { palm, sealedWindow, slot } from './decor.js';

/**
 * A gate complex (שער) as the Gra reads 40:6-16 and 40:21-37 (book pp. 7-15).
 *
 * Local frame: x = u runs *inward* (from the outside toward the court), z = v (lateral), y up from the gate floor.
 *   outer gate: [wall/threshold 6][chamber 8][gap 5][chamber 8][gap 5][chamber 8][ulam 8][ail 2]  = 50
 *   inner gate: the same, mirrored – the ulam faces the outer court (40:31).
 * Each chamber is 6×6 inside with 1-cubit walls; the passage is 10 wide; total width 25.
 * The two "ails" at the far end are 60 cubits high (40:14) and stand apart from the lower ulam (fn. 22).
 */
export function buildGate(c, { id, x, y0, z, ang, kind, steps }) {
  const b = c.b;
  const out = kind === 'outer';
  const L = D.gateLen;
  const mir = (u) => (out ? u : L - u);
  const lo = (a, bb) => Math.min(mir(a), mir(bb));
  const hi = (a, bb) => Math.max(mir(a), mir(bb));
  const bx = (tag, mat, u0, u1, ya, yb, v0, v1) => b.box(`${id}.${tag}`, mat, lo(u0, u1), ya, v0, hi(u0, u1), yb, v1);

  b.push(x, y0, z, ang);

  bx('floor', M.floor, 0, L, -0.45, 0, -12.5, 12.5);

  // the wall at the threshold end (u 0..6): one reed thick (40:5-6)
  const wallH = out ? D.wallH : 12;
  bx('wall', M.wall, 0, 6, 0, wallH, 5, 12.5);
  bx('wall', M.wall, 0, 6, 0, wallH, -12.5, -5);

  // the threshold (סף), one reed = 6 wide (40:6): the thickness of the wall at the entrance. The second "סף" of 40:6 is the
  // opposite jamb of the same opening (the wall pieces above); the "סף" of 40:7 is the ail after the ulam (u 48..50, below).
  bx('thr', M.stoneDark, 0, 6, 0, 0.3, -5, 5);

  // three guard chambers each side (תאים) with a small pilaster ("איל") at the inner corner (40:10)
  const chambers = [[6, 14], [19, 27], [32, 40]];
  for (const [c0, c1] of chambers) {
    const u0 = lo(c0, c1), u1 = hi(c0, c1);
    for (const s of [-1, 1]) {
      b.room(`${id}.cham`, M.wall, {
        x0: u0, x1: u1, z0: s > 0 ? 5 : -12.5, z1: s > 0 ? 12.5 : -5, y0: 0, h: 12, t: 1,
        tz0: s > 0 ? 1 : 0.5, tz1: s > 0 ? 0.5 : 1,
        doors: [{ side: s > 0 ? 'z0' : 'z1', c: (u0 + u1) / 2, w: 3.2, h: 7.5 }],
      });
      sealedWindow(b, `${id}.win`, (u0 + u1) / 2, 5.2, s * 12.5, 2, 3.4, s);
      // pilaster at the inner corner, bulging into the passage
      const uc = mir(c1);
      const ua = out ? uc - 1.2 : uc, ub = out ? uc : uc + 1.2;
      b.box(`${id}.ailc`, M.stoneDark, ua, 0, s > 0 ? 4.1 : -5, ub, 12.5, s > 0 ? 5 : -4.1);
      // palm relief on its passage face (40:16, 40:22 "ואל איל תמרים" = the ails beside the chamber doors). Own tag segment, so that
      // the scenes of the two end ails (40:26, 31, 34, 37) – which match `.palm` – do not light these.
      b.push((ua + ub) / 2, 4, s * 4.1, s > 0 ? Math.PI : 0); // local +z faces the passage
      palm(b, `${id}.ailc.palm`, 0, 0, 0.03, 1.4);
      b.pop();
    }
    // roof over the chambers only – the passage and the 5-cubit gaps stay open to the sky
    for (const s of [-1, 1]) b.box(`${id}.roof`, M.roof, u0, 12, s > 0 ? 5 : -12.5, u1, 13, s > 0 ? 12.5 : -5);
  }
  // the 5-cubit gaps between the chambers = "אילמות": unroofed cross-corridors 25 long (40:30).
  // NOTE: the book's plan (pp. 14-15) draws four such corridors running ~25 out from each edge of the passage, notched into the
  // shoulder chambers/pavements; that needs matching cut-outs in court.js (lp.*) and inner.js (ic.*), so here each gap is one
  // cross-strip spanning the whole 25-wide gate.
  for (const [g0, g1] of [[14, 19], [27, 32]]) {
    const u0 = lo(g0, g1), u1 = hi(g0, g1);
    bx('gap', M.stone, g0, g1, 0, 0.12, -12.5, 12.5);
    for (const s of [-1, 1]) sealedWindow(b, `${id}.win`, (u0 + u1) / 2, 5.2, s * 12.5, 2.6, 3.4, s);
  }

  // ulam: two 6-wide blocks, 8 deep, lower than the ails
  for (const s of [-1, 1]) {
    const v0 = s > 0 ? 6 : -12, v1 = s > 0 ? 12 : -6;
    b.box(`${id}.ulam`, M.wall, lo(40, 48), 0, v0, hi(40, 48), 16, v1);
    b.box(`${id}.ulam`, M.roof, lo(40, 48), 16, v0, hi(40, 48), 17, v1);
    sealedWindow(b, `${id}.win`, mir(44), 7.5, s * 12, 2, 3.4, s);
  }

  // the two ails (אילים): 60 high, 2 deep, with a rounded face (40:9, 40:14), joined by a lintel
  const ailPts = (s) => {
    const pts = [[mir(48), s * 6], [mir(48), s * 12]];
    const n = 8;
    for (let i = n; i >= 0; i--) {
      const t = (i / n) * 2 - 1;
      pts.push([mir(48 + 2 * (1 - t * t)), s * (9 - t * 3)]);
    }
    return pts;
  };
  const pts = (s) => {
    // polygon around the arch: straight inner edge, curved outer edge
    const arc = [];
    const n = 8;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * 2 - 1;
      arc.push([mir(48 + 2 * (1 - t * t)), s * (9 + t * 3)]);
    }
    return [[mir(48), s * 6], ...arc, [mir(48), s * 12]];
  };
  void ailPts;
  for (const s of [-1, 1]) {
    const p = pts(s);
    b.poly(`${id}.ail`, M.stone, p, 0, D.ailH - 2);
    b.poly(`${id}.ail`, M.stoneDark, p, D.ailH - 2, D.ailH);
    for (const hh of [14, 30, 45]) b.poly(`${id}.ail`, M.stoneDark, p, hh, hh + 0.5);
    // The flank facing the passage is the arc t∈[-1,0] (u = 48+2(1-t²), v = s(9+3t)). Windows (40:16 "ואל אליהמה לפנימה") and the palms
    // (40:26 etc.) sit on it, each frame turned to the surface normal (3, 4ts) in the (u,v) plane so that local +z faces the passage
    // and nothing floats off the curved stone.
    const onFlank = (y, fn) => {
      const t = -0.56, nu = 3, nv = 4 * t * s;
      b.push(mir(48 + 2 * (1 - t * t)), y, s * (9 + 3 * t), Math.atan2(out ? nu : -nu, nv));
      fn();
      b.pop();
    };
    for (const hh of [6, 33]) onFlank(hh, () => palm(b, `${id}.palm`, 0, 0, 0.03, 4.4));
    for (const hh of [18, 46]) onFlank(hh, () => slot(b, `${id}.win`, 0, 0, -0.04, 1.6, 4.4, 1));
  }
  bx('ail', M.stoneDark, 48, 50, 52, D.ailH, -6, 6); // lintel structure (משקוף)

  // steps up to the gate: 7 (outer) / 8 (inner), always on the outside end
  const run = 1.3;
  b.steps(`${id}.steps`, M.stone, -steps * run, 0, -7, 7, -steps * D.step, D.step, steps);

  // ---- measures
  const m = (n, label, a, bb, kind) => c.measure(`${id}.m.${n}`, label, a, bb, kind);
  const P = (u, y, v) => [mir(u), y, v];
  m('len', '50 אמה', P(0, 0.4, -14.5), P(L, 0.4, -14.5));
  m('wid', '25 אמה', P(L / 2, 0.4, -12.5), P(L / 2, 0.4, 12.5));
  m('wid25r', '25 אמה', P(10, 13.4, -12.5), P(10, 13.4, 12.5));
  m('pass', '10 אמות', P(24, 0.4, -5), P(24, 0.4, 5));
  m('p13', '13 אמה', P(0, 0.5, -4), P(13, 0.5, -4));
  m('thr', '6 אמות', P(0, 0.6, 3), P(6, 0.6, 3));
  m('thr2', '6 אמות', P(50.5, 0.6, 6), P(50.5, 0.6, 12)); // the sof of 40:7 = the ail after the ulam: a reed across (right to left)
  m('cham', '6 אמות', P(7, 0.6, 6), P(13, 0.6, 6));
  m('chamW', '6 אמות', P(10, 0.6, 6), P(10, 0.6, 12));
  m('gvul', 'אמה', P(6, 0.6, 13.6), P(7, 0.6, 13.6));
  m('gap', '5 אמות', P(14, 0.6, 15), P(19, 0.6, 15));
  m('gap25', '25 אמה', P(16.5, 0.6, -12.5), P(16.5, 0.6, 12.5));
  m('ulam', '8 אמות', P(40, 0.6, 15), P(48, 0.6, 15));
  m('ail', '2 אמות', P(48, 0.6, 15), P(50, 0.6, 15));
  m('ulamW', '6 אמות', P(44, 17.2, 6), P(44, 17.2, 12));
  m('ailH', '60 אמה', P(49, 0, 12.8), P(49, D.ailH, 12.8), 'v');
  m('hall', '1 + 6 + 1', P(6, 0.6, -13.4), P(14, 0.6, -13.4));
  c.measure(`${id}.m.steps`, `${steps} מעלות`, [-steps * run, -steps * D.step, 9], [0, 0, 9]);
  m('wallT', '6 אמות', P(0, wallH + 0.3, -9), P(6, wallH + 0.3, -9));
  m('wallH', '6 אמות', P(0, 0, -12.9), P(0, wallH, -12.9), 'v');
  c.anchor(`${id}.a`, P(25, 14, 0), '');

  b.pop();
}
