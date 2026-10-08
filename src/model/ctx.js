import * as THREE from 'three';
import { Batch } from '../engine/batch.js';

/** Build context: geometry batch + registries for measures (dimension lines) and anchors (callouts). */
export class Ctx {
  constructor() {
    this.b = new Batch();
    this.measures = new Map();
    this.anchors = new Map();
  }
  /** local → world point under the batch's current frame */
  P(x, y, z) {
    return new THREE.Vector3(x, y, z).applyMatrix4(this.b.m);
  }
  /** register a dimension line: a,b are [x,y,z] in the current local frame */
  measure(id, label, a, b, kind = '') {
    this.measures.set(id, { id, label, a: this.P(...a), b: this.P(...b), kind });
  }
  anchor(id, p, text = '') {
    this.anchors.set(id, { id, p: this.P(...p), text });
  }
}
