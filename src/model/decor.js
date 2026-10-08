import { M } from '../engine/materials.js';

/** Stylised palm tree relief (תמרה) standing on y0 in the local x–y plane (z = wall surface). */
export function palm(b, tag, x, y0, z, h = 6, flip = 1) {
  b.push(x, y0, z, 0);
  b.cyl(tag, M.palm, 0, 0, 0, 0.16, h * 0.78, 6, 0.1);
  for (let r = 0; r < 4; r++) b.cyl(tag, M.palm, 0, h * (0.14 + r * 0.17), 0, 0.2, 0.12, 6, 0.2);
  const top = h * 0.78;
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (-80 + (160 * i) / (n - 1)) * (Math.PI / 180);
    const L = h * 0.42;
    const mx = Math.sin(a) * L * 0.62, my = top + Math.cos(a) * L * 0.62 + 0.15;
    const tx = Math.sin(a) * L, ty = top + Math.cos(a) * L * 0.78 - Math.abs(Math.sin(a)) * L * 0.28;
    const w = 0.22;
    b.quad(tag, M.palm, [0, top, 0], [0, top + 0.02, 0], [mx, my + w, 0], [mx, my - w * 0.4, 0]);
    b.quad(tag, M.palm, [mx, my - w * 0.4, 0], [mx, my + w, 0], [tx + 0.02, ty, 0], [tx - 0.02, ty - 0.06, 0]);
  }
  b.pop();
}

/** Cherub relief (כרוב) with a human and a lion face, flanked toward the neighbouring palms. */
export function cherub(b, tag, x, y0, z, s = 1) {
  b.push(x, y0, z, 0);
  const m = M.gold;
  b.box(tag, m, -0.55 * s, 0, -0.12, 0.55 * s, 4.2 * s, 0.12);              // body
  b.quad(tag, M.goldFoil, [-0.55 * s, 3.8 * s, 0], [-2.1 * s, 5.4 * s, 0], [-2.4 * s, 3.4 * s, 0], [-0.55 * s, 2.0 * s, 0]); // wings
  b.quad(tag, M.goldFoil, [0.55 * s, 3.8 * s, 0], [0.55 * s, 2.0 * s, 0], [2.4 * s, 3.4 * s, 0], [2.1 * s, 5.4 * s, 0]);
  b.sphere(tag, m, -0.85 * s, 4.7 * s, 0.05, 0.62 * s, 10, 8);                // human face
  b.box(tag, m, -1.15 * s, 4.0 * s, -0.04, -0.55 * s, 4.25 * s, 0.14);         // beard
  b.sphere(tag, m, 0.85 * s, 4.7 * s, 0.05, 0.68 * s, 10, 8);                 // lion face
  b.cyl(tag, M.bronze, 0.85 * s, 4.7 * s - 0.04, -0.09, 0.95 * s, 0.1, 12);    // mane
  b.pop();
}

/** Window with sealed shutters (חלון אטום) on a wall facing +z or -z (local). */
export function sealedWindow(b, tag, x, y0, z, w = 2, h = 3.4, face = 1) {
  b.box(tag, M.window, x - w / 2, y0, z, x + w / 2, y0 + h, z + 0.12 * face);
  b.box(tag, M.stoneDark, x - w / 2 - 0.2, y0 - 0.2, z, x + w / 2 + 0.2, y0, z + 0.2 * face);
}

/** Round "latticed" opening placeholder used on towers: a taller dark slot. */
export function slot(b, tag, x, y0, z, w, h, face = 1, mat = M.window) {
  b.box(tag, mat, x - w / 2, y0, z, x + w / 2, y0 + h, z + 0.12 * face);
}
