import * as THREE from 'three';
import { M } from '../engine/materials.js';

const PLATEAU = 330;

/** terrain height: flat plateau under the temple, steep sides, a lower shelf to the south for the city (40:2) */
export function terrainY(x, z) {
  const d = Math.max(0, Math.max(Math.abs(x), Math.abs(z)) - PLATEAU);
  let y = -(0.5 * d + 0.0004 * d * d);
  // noise on the slopes only
  y += Math.sin(x * 0.011 + 1.3) * Math.sin(z * 0.013) * Math.min(d, 400) * 0.08;
  // southern shelf (city)
  const wz = smooth((z - 300) / 90) * (1 - smooth((z - 1250) / 150)) * (1 - smooth((Math.abs(x) - 700) / 200));
  const shelf = -38 - Math.max(0, z - 700) * 0.02;
  y = y * (1 - wz) + shelf * wz;
  return y;
}
function smooth(t) {
  t = Math.min(1, Math.max(0, t));
  return t * t * (3 - 2 * t);
}

export function buildScenery(c, root) {
  // ---- terrain
  const N = 160, SIZE = 7000;
  const geo = new THREE.PlaneGeometry(SIZE, SIZE, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const uv = new Float32Array(pos.count * 2);
  const ca = new THREE.Color(0xcfc8b0), cb = new THREE.Color(0x8d856f), cg = new THREE.Color(0x7d8a5b);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrainY(x, z);
    pos.setY(i, y);
    const d = Math.max(Math.abs(x), Math.abs(z));
    const t = smooth((d - 330) / 500);
    const color = ca.clone().lerp(cb, t * 0.8).lerp(cg, smooth((d - 900) / 900) * 0.8);
    col.set([color.r, color.g, color.b], i * 3);
    uv.set([x / 70, z / 70], i * 2);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mat = M.ground.clone();
  mat.name = 'terrain';
  mat.vertexColors = true;
  const terrain = new THREE.Mesh(geo, mat);
  terrain.receiveShadow = true;
  terrain.userData = { tag: 'scn.terrain', baseMat: mat, noPick: true };
  root.add(terrain);

  // ---- the city to the south (40:2 "כמבנה עיר מנגב")
  const b = c.b;
  b.push(0, 0, 0, 0);
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const cityY = (z) => terrainY(0, z);
  for (let gx = -9; gx <= 9; gx++) {
    for (let gz = 0; gz < 14; gz++) {
      if (rnd() < 0.18) continue;
      const x = gx * 34 + (rnd() - 0.5) * 6;
      const z = 420 + gz * 34 + (rnd() - 0.5) * 6;
      if (Math.abs(x) > 330) continue;
      const w = 12 + rnd() * 14, d = 12 + rnd() * 14, h = 6 + rnd() * 14;
      const y = cityY(z) - 0.5;
      b.box('scn.city', M.plaster, x - w / 2, y, z - d / 2, x + w / 2, y + h, z + d / 2);
      if (rnd() < 0.4) b.box('scn.city', M.stoneDark, x - w / 2 + 1, y + h, z - d / 2 + 1, x + w / 2 - 1, y + h + 2 + rnd() * 3, z + d / 2 - 1);
    }
  }
  // city wall
  const wy = cityY(450);
  b.box('scn.city', M.wall, -330, wy - 1, 395, 330, wy + 8, 401);
  b.box('scn.city', M.wall, -330, wy - 1, 395, -324, wy + 8, 920);
  b.box('scn.city', M.wall, 324, wy - 1, 395, 330, wy + 8, 920);
  c.anchor('scn.city.a', [0, wy + 40, 560], 'העיר – מדרום להר');
  c.anchor('scn.mount.a', [0, 120, -300], 'הר גבוה מאוד');
  b.pop();
}
