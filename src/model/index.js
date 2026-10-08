import * as THREE from 'three';
import { Ctx } from './ctx.js';
import { buildOuter } from './court.js';
import { buildInner } from './inner.js';
import { buildHouse } from './house.js';
import { buildAltar } from './altar.js';
import { buildChambers } from './ch42.js';
import { buildProps } from './props.js';
import { buildScenery } from './scenery.js';
import { buildVariants } from './variants.js';
import { Y, levelAt } from './dims.js';

/** Assemble the whole Temple of Ezekiel (ch. 40-44). Returns the scene root, the pickable meshes and registries. */
export function buildModel() {
  const c = new Ctx();
  const root = new THREE.Group();
  root.name = 'temple';

  buildScenery(c, root);
  const outer = buildOuter(c);
  buildInner(c);
  buildAltar(c);
  const house = buildHouse(c);
  const doors = { ...house.doors, ...outer.doors };
  const doorMeshes = [...house.doorMeshes, ...outer.doorMeshes];
  buildChambers(c);
  buildProps(c);
  buildVariants(c);

  const meshes = c.b.build(root);
  for (const m of meshes) {
    if (m.userData.tag.startsWith('scn')) m.userData.noPick = true;
    if (m.userData.tag.startsWith('variant')) { m.userData.hidden = true; m.userData.noPick = true; }
  }
  for (const piv of Object.values(doors)) root.add(piv);
  meshes.push(...doorMeshes);

  const terrain = root.children.find((o) => o.userData.tag === 'scn.terrain');
  if (terrain) meshes.push(terrain);

  root.updateMatrixWorld(true);

  return {
    root, meshes, doors,
    measures: c.measures, anchors: c.anchors,
    levelAt, Y,
    /** show/hide meshes whose tag starts with the prefix (variants) */
    setVisible(prefix, show) {
      for (const m of meshes) if (m.userData.tag === prefix || m.userData.tag.startsWith(prefix + '.')) m.userData.hidden = !show;
    },
    /** all measures whose id starts with the prefix (supports trailing '*') */
    measuresFor(ids) {
      const out = [];
      for (const id of ids) {
        if (id.endsWith('*')) {
          const p = id.slice(0, -1);
          for (const [k, v] of c.measures) if (k.startsWith(p)) out.push(v);
        } else if (c.measures.has(id)) out.push(c.measures.get(id));
      }
      return out;
    },
  };
}
