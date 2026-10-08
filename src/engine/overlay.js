import * as THREE from 'three';

const SVGNS = 'http://www.w3.org/2000/svg';
const _v = new THREE.Vector3();

/**
 * Screen-space annotations (dimension lines + callouts) drawn over the WebGL canvas.
 * Using SVG/HTML keeps lines crisp at every zoom level and supports Hebrew text.
 */
export class Overlay {
  constructor(container) {
    this.svg = document.createElementNS(SVGNS, 'svg');
    this.svg.setAttribute('class', 'overlay-svg');
    this.labels = document.createElement('div');
    this.labels.className = 'overlay-labels';
    container.append(this.svg, this.labels);
    this.dims = [];
    this.calls = [];
  }

  clear() {
    this.svg.replaceChildren();
    this.labels.replaceChildren();
    this.dims = [];
    this.calls = [];
  }

  /** dims: [{a:Vector3,b:Vector3,label,kind}] */
  setDims(list) {
    this.svg.replaceChildren();
    this.labels.querySelectorAll('.dim-label').forEach((n) => n.remove());
    this.dims = list.map((d, i) => {
      const g = document.createElementNS(SVGNS, 'g');
      g.setAttribute('class', 'dim');
      const mk = (cls) => {
        const l = document.createElementNS(SVGNS, 'line');
        l.setAttribute('class', cls);
        g.append(l);
        return l;
      };
      const halo = mk('halo'), main = mk('main'), t1 = mk('tick'), t2 = mk('tick');
      this.svg.append(g);
      const el = document.createElement('div');
      el.className = 'dim-label' + (d.kind ? ' ' + d.kind : '');
      el.textContent = d.label;
      el.style.animationDelay = `${Math.min(i, 8) * 60}ms`;
      this.labels.append(el);
      return { ...d, g, halo, main, t1, t2, el };
    });
  }

  /** callouts: [{p:Vector3,text,cls}] */
  setCallouts(list) {
    this.labels.querySelectorAll('.callout').forEach((n) => n.remove());
    this.calls = list.map((c) => {
      const el = document.createElement('div');
      el.className = 'callout' + (c.cls ? ' ' + c.cls : '');
      el.textContent = c.text;
      this.labels.append(el);
      return { ...c, el };
    });
  }

  update(camera, w, h) {
    const proj = (p, out) => {
      _v.copy(p).project(camera);
      out.x = (_v.x * 0.5 + 0.5) * w;
      out.y = (-_v.y * 0.5 + 0.5) * h;
      out.z = _v.z;
      return _v.z < 1 && _v.z > -1;
    };
    const A = { x: 0, y: 0, z: 0 }, B = { x: 0, y: 0, z: 0 };
    for (const d of this.dims) {
      const ok = proj(d.a, A) & proj(d.b, B);
      d.g.style.display = d.el.style.display = ok ? '' : 'none';
      if (!ok) continue;
      const dx = B.x - A.x, dy = B.y - A.y;
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      const tk = 6;
      for (const l of [d.halo, d.main]) {
        l.setAttribute('x1', A.x); l.setAttribute('y1', A.y);
        l.setAttribute('x2', B.x); l.setAttribute('y2', B.y);
      }
      d.t1.setAttribute('x1', A.x - nx * tk); d.t1.setAttribute('y1', A.y - ny * tk);
      d.t1.setAttribute('x2', A.x + nx * tk); d.t1.setAttribute('y2', A.y + ny * tk);
      d.t2.setAttribute('x1', B.x - nx * tk); d.t2.setAttribute('y1', B.y - ny * tk);
      d.t2.setAttribute('x2', B.x + nx * tk); d.t2.setAttribute('y2', B.y + ny * tk);
      // keep the label on the side of the line that faces the top of the screen
      let ox = nx * 15, oy = ny * 15;
      if (oy > 0) { ox = -ox; oy = -oy; }
      d.el.style.transform = `translate(${(A.x + B.x) / 2 + ox}px, ${(A.y + B.y) / 2 + oy}px) translate(-50%,-50%)`;
      d.el.classList.toggle('tiny', len < 22);
    }
    for (const c of this.calls) {
      const ok = proj(c.p, A);
      c.el.style.display = ok ? '' : 'none';
      if (ok) c.el.style.transform = `translate(${A.x}px, ${A.y}px) translate(-50%,-110%)`;
    }
  }
}
