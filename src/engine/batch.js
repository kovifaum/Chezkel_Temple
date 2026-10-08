import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { TEX_SCALE } from './materials.js';

/**
 * Collects primitives (boxes, cylinders, extrusions…) in a local coordinate frame
 * and merges them per (tag, material) into a handful of draw calls.
 * Units are cubits. Local frame: x = "inward" for gates, y = up, z = lateral.
 */
export class Batch {
  constructor() {
    this.groups = new Map();
    this.m = new THREE.Matrix4();
    this.stack = [];
  }

  push(x = 0, y = 0, z = 0, ang = 0) {
    this.stack.push(this.m.clone());
    const t = new THREE.Matrix4().makeTranslation(x, y, z);
    const r = new THREE.Matrix4().makeRotationY(ang);
    this.m.multiply(t).multiply(r);
    return this;
  }

  pop() {
    this.m = this.stack.pop();
    return this;
  }

  /** run fn inside a temporary frame */
  at(x, y, z, ang, fn) {
    this.push(x, y, z, ang);
    fn(this);
    this.pop();
  }

  _add(tag, mat, geom, extra) {
    let g = geom.index ? geom.toNonIndexed() : geom;
    if (extra) g.applyMatrix4(extra);
    g.applyMatrix4(this.m);
    if (g.userData.recompute) g.computeVertexNormals();
    worldUV(g, TEX_SCALE[mat.name] || 12);
    const key = tag + '|' + mat.name;
    let grp = this.groups.get(key);
    if (!grp) this.groups.set(key, (grp = { tag, mat, geoms: [] }));
    grp.geoms.push(g);
  }

  /** axis-aligned box from min corner to max corner (local coords) */
  box(tag, mat, x0, y0, z0, x1, y1, z1) {
    const sx = Math.abs(x1 - x0), sy = Math.abs(y1 - y0), sz = Math.abs(z1 - z0);
    if (sx < 1e-6 || sy < 1e-6 || sz < 1e-6) return this;
    const g = new THREE.BoxGeometry(sx, sy, sz);
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this._add(tag, mat, g);
    return this;
  }

  /** box by centre + size */
  boxC(tag, mat, cx, cy, cz, sx, sy, sz) {
    return this.box(tag, mat, cx - sx / 2, cy - sy / 2, cz - sz / 2, cx + sx / 2, cy + sy / 2, cz + sz / 2);
  }

  cyl(tag, mat, cx, y0, cz, r, h, seg = 20, rTop = r) {
    const g = new THREE.CylinderGeometry(rTop, r, h, seg);
    g.translate(cx, y0 + h / 2, cz);
    this._add(tag, mat, g);
    return this;
  }

  sphere(tag, mat, cx, cy, cz, r, ws = 14, hs = 10) {
    const g = new THREE.SphereGeometry(r, ws, hs);
    g.translate(cx, cy, cz);
    this._add(tag, mat, g);
    return this;
  }

  /** flat disc standing on its side; axis 'x' or 'z' is its normal */
  disc(tag, mat, cx, cy, cz, r, t, axis = 'x', seg = 28) {
    const g = new THREE.CylinderGeometry(r, r, t, seg);
    if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2);
    g.translate(cx, cy, cz);
    this._add(tag, mat, g);
    return this;
  }

  cone(tag, mat, cx, y0, cz, r, h, seg = 12) {
    return this.cyl(tag, mat, cx, y0, cz, r, h, seg, 0.0001);
  }

  /** extrude a polygon given in local (x,z) pairs between y0 and y1 */
  poly(tag, mat, pts, y0, y1) {
    const shape = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    const g = new THREE.ExtrudeGeometry(shape, { depth: y1 - y0, bevelEnabled: false, curveSegments: 4 });
    g.rotateX(-Math.PI / 2);
    g.translate(0, y0, 0);
    this._add(tag, mat, g);
    return this;
  }

  /** a thin plane (quad) from 4 local points – used for banners, curtains, fronds */
  quad(tag, mat, a, b, c, d) {
    const g = new THREE.BufferGeometry();
    const v = new Float32Array([...a, ...b, ...c, ...a, ...c, ...d]);
    g.setAttribute('position', new THREE.BufferAttribute(v, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(18), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2));
    g.userData.recompute = true;
    this._add(tag, mat, g);
    return this;
  }

  /** straight staircase rising from xA to xB (direction of ascent), z0..z1 wide */
  steps(tag, mat, xA, xB, z0, z1, y0, rise, n) {
    const dx = (xB - xA) / n;
    for (let i = 0; i < n; i++) {
      const xs = xA + dx * i;
      this.box(tag, mat, Math.min(xs, xB), y0, z0, Math.max(xs, xB), y0 + rise * (i + 1), z1);
    }
    return this;
  }

  /**
   * Walls of a rectangular room with door openings.
   * opts: {x0,x1,z0,z1,y0,h,t (wall thickness), doors:[{side:'x0'|'x1'|'z0'|'z1', c, w, h}], mat, tag}
   * Walls are built *inside* the rectangle bounds.
   */
  room(tag, mat, o) {
    const { x0, x1, z0, z1, y0, h, t } = o;
    const tx0 = o.tx0 ?? t, tx1 = o.tx1 ?? t, tz0 = o.tz0 ?? t, tz1 = o.tz1 ?? t;
    const doors = o.doors || [];
    const wallRun = (side, a0, a1, fixedLo, fixedHi) => {
      const ds = doors.filter((d) => d.side === side).sort((p, q) => p.c - q.c);
      let cur = a0;
      const seg = (s, e, yLo, yHi) => {
        if (e - s < 1e-6) return;
        if (side === 'x0' || side === 'x1') this.box(tag, mat, fixedLo, yLo, s, fixedHi, yHi, e);
        else this.box(tag, mat, s, yLo, fixedLo, e, yHi, fixedHi);
      };
      for (const d of ds) {
        const lo = d.c - d.w / 2, hi = d.c + d.w / 2;
        seg(cur, lo, y0, y0 + h);
        if (d.h < h) seg(lo, hi, y0 + d.h, y0 + h); // lintel
        cur = hi;
      }
      seg(cur, a1, y0, y0 + h);
    };
    wallRun('x0', z0, z1, x0, x0 + tx0);
    wallRun('x1', z0, z1, x1 - tx1, x1);
    wallRun('z0', x0 + tx0, x1 - tx1, z0, z0 + tz0);
    wallRun('z1', x0 + tx0, x1 - tx1, z1 - tz1, z1);
    return this;
  }

  /** merge everything into meshes and add to `parent`; returns the meshes */
  build(parent, { shadow = true } = {}) {
    const meshes = [];
    for (const { tag, mat, geoms } of this.groups.values()) {
      const merged = mergeGeometries(geoms, false);
      merged.computeBoundingBox();
      merged.computeBoundingSphere();
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadow && !mat.transparent;
      mesh.receiveShadow = shadow;
      mesh.userData.tag = tag;
      mesh.userData.baseMat = mat;
      parent.add(mesh);
      meshes.push(mesh);
      geoms.forEach((g) => g.dispose());
    }
    this.groups.clear();
    return meshes;
  }
}

function worldUV(g, scale) {
  const p = g.attributes.position, n = g.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    let u, v;
    if (ny >= nx && ny >= nz) { u = x; v = z; } else if (nx >= nz) { u = z; v = y; } else { u = x; v = y; }
    uv[2 * i] = u / scale; uv[2 * i + 1] = v / scale;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}

/** Does `tag` belong to the dotted-prefix `f`? ("og.E.cham" belongs to "og" and "og.E") */
export function tagMatches(tag, f) {
  return tag === f || tag.startsWith(f + '.');
}
