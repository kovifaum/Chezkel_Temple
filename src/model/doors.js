import * as THREE from 'three';
import { M } from '../engine/materials.js';
import { Batch } from '../engine/batch.js';
import { palm, cherub } from './decor.js';

/**
 * A hinged door leaf. The pivot sits at the hinge; the closed leaf extends along +z (sgn=+1) or −z (sgn=−1).
 * Open = swung 90° toward the west (inward for all east-facing entrances of this temple).
 *
 * split: the leaf is made of two half-leaves ("שתים מוסבות", 41:24). The second half is hinged on the free edge of the
 *   first, on its east face, and folds back over it while the door opens (driven by the pivot's own rotation, so the
 *   FX code that only rotates the pivot needs no change). With foldBack it folds onto the west face instead, i.e. away
 *   from the passage once the door is open (for leaves that swing into a room and must leave the passage free).
 * carve: tag of a cherub/palm relief on both faces of every half-leaf (41:25); the relief replaces the gold boss.
 */
export function makeDoor({ x, y, z, w, h, sgn, tag, thick = 0.7, mat = M.wood, split = false, carve = null, foldBack = false }) {
  const piv = new THREE.Group();
  piv.position.set(x, y, z);
  piv.userData.closed = 0;
  piv.userData.open = sgn > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
  const meshes = [];
  const mesh = (geom, material, t = tag) => {
    const m = new THREE.Mesh(geom, material);
    m.castShadow = true;
    m.userData = { tag: t, baseMat: material };
    meshes.push(m);
    return m;
  };

  if (!split) {
    const g = new THREE.BoxGeometry(w, h, thick);
    g.translate(w / 2, h / 2, 0);
    const leaf = mesh(g, mat);
    leaf.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
    piv.add(leaf);
    const boss = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), M.gold);
    boss.castShadow = false;
    boss.rotation.z = Math.PI / 2;
    boss.position.set(thick / 2 + 0.03, h * 0.45, sgn * w * 0.8);
    piv.add(boss);
    bake(piv, meshes);
    return { piv, meshes };
  }

  // leaf frame: local +x runs along the leaf away from the hinge; local z is the thickness (east face at z = face)
  const frame = new THREE.Group();
  frame.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
  piv.add(frame);
  const hw = w / 2;
  const east = -sgn;                 // sign of the east (outer) face along the leaf's local z
  const fside = foldBack ? -east : east;   // the face the second half folds onto
  const face = fside * thick / 2;
  const half = (u0, u1, zc) => {
    const g = new THREE.BoxGeometry(u1 - u0, h, thick);
    g.translate((u0 + u1) / 2, h / 2, zc);
    return g;
  };
  const pin = (parent, zc) => {      // vertical hinge pin
    const g = new THREE.CylinderGeometry(0.13, 0.13, h, 8);
    g.translate(0, h / 2, zc);
    parent.add(mesh(g, M.bronze));
  };
  // first half, hinged on the jamb
  frame.add(mesh(half(0, hw - 0.02, 0), mat));
  pin(frame, face);
  // second half, hinged on the free edge of the first (on the face it folds onto), so that it can fold back over it
  const sub = new THREE.Group();
  sub.position.set(hw, 0, face);
  frame.add(sub);
  sub.add(mesh(half(0.02, hw, -face), mat));
  pin(sub, 0);
  if (carve) {
    relief(frame, carve, hw, 0, thick / 2, meshes);
    relief(sub, carve, hw, -face, thick / 2, meshes);
  } else {
    const boss = mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), M.gold);
    boss.castShadow = false;
    boss.rotation.x = Math.PI / 2;
    boss.position.set(hw * 0.78, h * 0.45, fside * 0.1);
    sub.add(boss);
  }

  // the second half folds back over the first (almost 180°, a little open so that the two leaves read as two) as the
  // pivot swings from closed to open
  const fold = -fside * (Math.PI - 0.22);
  const range = piv.userData.open - piv.userData.closed;
  const base = THREE.Object3D.prototype.updateMatrixWorld;
  piv.updateMatrixWorld = function (force) {
    const p = Math.min(1, Math.max(0, (this.rotation.y - this.userData.closed) / range));
    sub.rotation.y = fold * p * p * (3 - 2 * p);
    base.call(this, force);
  };
  bake(piv, meshes);
  return { piv, meshes };
}

/**
 * Keep the focus outlines of the doors out of sight. The stage builds an outline from the raw geometry of a mesh and
 * draws it at the scene origin without applying the mesh's transform, so the outlines of meshes that sit in a swinging
 * pivot land in the middle of the inner court (and could not follow the leaves anyway). The vertices are therefore
 * stored in world coordinates of the closed pose, lowered by OUTLINE_DROP; the mesh carries the inverse transform
 * (plus the drop) so that it still sits and swings correctly. The outlines end up far below the terrain; the doors are
 * still highlighted through their material.
 */
const OUTLINE_DROP = 400;
function bake(piv, meshes) {
  piv.updateMatrixWorld(true);
  const lift = new THREE.Matrix4().makeTranslation(0, OUTLINE_DROP, 0);
  for (const m of meshes) {
    const own = new THREE.Matrix4().multiplyMatrices(m.parent.matrixWorld.clone().invert(), lift);
    m.geometry.applyMatrix4(m.matrixWorld);
    m.geometry.translate(0, -OUTLINE_DROP, 0);
    own.decompose(m.position, m.quaternion, m.scale);
    m.updateMatrix();
  }
  piv.updateMatrixWorld(true);
}

/**
 * Cherubim and palms carved on both faces of a half-leaf: a column of cherub / palm / cherub … centred at u = hw / 2,
 * `zc` is the leaf's mid-plane in the parent's frame, `half` half its thickness.
 */
function relief(parent, tag, hw, zc, half, meshes) {
  const b = new Batch();
  const col = [['c', 1.4], ['p', 5.0], ['c', 8.6], ['p', 12.2], ['c', 15.8]];
  for (const f of [1, -1]) {
    b.push(0, 0, zc + f * half, f > 0 ? 0 : Math.PI);
    const cx = f > 0 ? hw / 2 : -hw / 2;
    for (const [kind, y0] of col) {
      if (kind === 'c') cherub(b, tag, cx, y0, 0.1, 0.5);
      else palm(b, tag, cx, y0, 0.1, 3);
    }
    b.pop();
  }
  meshes.push(...b.build(parent, { shadow: false }));
}
