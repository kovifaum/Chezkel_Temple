import * as THREE from 'three';
import { M } from '../engine/materials.js';

/**
 * A hinged door leaf. The pivot sits at the hinge; the closed leaf extends along +z (sgn=+1) or −z (sgn=−1).
 * Open = swung 90° toward the west (inward for all east-facing entrances of this temple).
 */
export function makeDoor({ x, y, z, w, h, sgn, tag, thick = 0.7, mat = M.wood }) {
  const piv = new THREE.Group();
  piv.position.set(x, y, z);
  const g = new THREE.BoxGeometry(w, h, thick);
  g.translate(w / 2, h / 2, 0);
  const leaf = new THREE.Mesh(g, mat);
  leaf.rotation.y = sgn > 0 ? -Math.PI / 2 : Math.PI / 2;
  leaf.castShadow = true;
  leaf.userData = { tag, baseMat: mat };
  piv.add(leaf);
  const boss = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.15, 12), M.gold);
  boss.rotation.z = Math.PI / 2;
  boss.position.set(thick / 2 + 0.03, h * 0.45, sgn * w * 0.8);
  boss.userData = { tag, baseMat: M.gold };
  piv.add(boss);
  piv.userData.closed = 0;
  piv.userData.open = sgn > 0 ? -Math.PI * 0.5 : Math.PI * 0.5;
  return { piv, meshes: [leaf, boss] };
}
