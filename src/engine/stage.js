import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Overlay } from './overlay.js';
import { tagMatches } from './batch.js';

const VIEWS = {
  iso: [0.62, 0.55, 0.62],
  isoW: [-0.62, 0.55, 0.62],
  isoN: [0.5, 0.55, -0.7],
  top: [0, 1, 0.0009],
  E: [1, 0.32, 0.12],
  W: [-1, 0.32, 0.12],
  N: [0.12, 0.32, -1],
  S: [0.12, 0.32, 1],
  low: [0.75, 0.16, 0.62],
  lowW: [-0.75, 0.16, 0.62],
  far: [0.35, 0.5, 0.8],
};

const ease = (t) => t * t * (3 - 2 * t);

export class Stage {
  constructor(container, { onPick } = {}) {
    this.container = container;
    this.onPick = onPick;
    this.mode = 'ghost';
    this.focusTags = [];
    this.cutY = null;
    this.tmp = new THREE.Vector3();
    this.fly = null;
    this.clock = new THREE.Clock();
    this.animators = [];

    const r = (this.renderer = new THREE.WebGLRenderer({
      antialias: true, alpha: true, logarithmicDepthBuffer: true, powerPreference: 'high-performance',
    }));
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.05;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.localClippingEnabled = true;
    r.setClearAlpha(0);
    container.prepend(r.domElement);
    r.domElement.className = 'gl';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd6d2c2, 1800, 7000);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 60000);
    this.camera.position.set(520, 330, 520);

    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = Math.PI * 0.495;
    c.minDistance = 4;
    c.maxDistance = 9000;
    c.target.set(-30, 10, 0);
    c.addEventListener('start', () => (this.fly = null));

    // lights
    this.scene.add(new THREE.HemisphereLight(0xeaf1ff, 0x9a8f78, 1.2));
    const sun = (this.sun = new THREE.DirectionalLight(0xfff6e4, 2.5));
    sun.position.set(-260, 420, 300);
    sun.castShadow = true;
    sun.shadow.mapSize.set(4096, 4096);
    const sc = sun.shadow.camera;
    sc.left = -360; sc.right = 360; sc.top = 360; sc.bottom = -360; sc.near = 50; sc.far = 1400;
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.6;
    this.scene.add(sun, sun.target);

    this.overlay = new Overlay(container);
    this.glow = new THREE.Group(); // outlines for focused parts
    this.scene.add(this.glow);
    this.dynamic = new THREE.Group(); // props / guide etc.
    this.scene.add(this.dynamic);

    this._matCache = new Map();
    this._hiMats = new Set();
    this.plane = new THREE.Plane(new THREE.Vector3(0, -1, 0), 1e5);

    new ResizeObserver(() => this.resize()).observe(container);
    this.resize();
    this._bindPick();
    r.setAnimationLoop(() => this.tick());
  }

  // ---------------------------------------------------------------- model
  setModel(model) {
    if (this.model) this.scene.remove(this.model.root);
    this.model = model;
    this.scene.add(model.root);
    this._boxCache = new Map();
    this.meshes = model.meshes;
    for (const m of this.meshes) {
      this._applyClip(m.userData.baseMat);
      m.userData.focusState = 'normal';
    }
  }

  boxOf(tags) {
    const key = tags.join('|');
    if (this._boxCache.has(key)) return this._boxCache.get(key);
    const box = new THREE.Box3();
    const tmp = new THREE.Box3();
    for (const m of this.meshes) {
      if (!m.userData.hidden && tags.some((t) => tagMatches(m.userData.tag, t))) {
        tmp.setFromObject(m);
        box.union(tmp);
      }
    }
    const out = box.isEmpty() ? null : box;
    this._boxCache.set(key, out);
    return out;
  }

  _applyClip(mat) {
    mat.clippingPlanes = [this.plane];
    mat.clipShadows = true;
  }

  _variant(base, kind) {
    const key = base.uuid + kind;
    let m = this._matCache.get(key);
    if (m) return m;
    m = base.clone();
    this._applyClip(m);
    if (kind === 'soft') {
      m.transparent = true;
      m.opacity = 0.34;
      m.depthWrite = false;
      m.side = THREE.FrontSide;
      if (m.emissive) m.emissive.setHex(0x000000);
    } else if (kind === 'ghost') {
      m.transparent = true;
      m.opacity = 0.075;
      m.depthWrite = false;
      m.side = THREE.FrontSide;
      if (m.color) m.color.lerp(new THREE.Color(0xc5d0e0), 0.35);
      if (m.emissive) m.emissive.setHex(0x000000);
    } else if (kind === 'hi' && m.emissive) {
      m.emissive.setHex(0xffa83a);
      m.emissiveIntensity = 0.28;
      this._hiMats.add(m);
    }
    this._matCache.set(key, m);
    return m;
  }

  // ---------------------------------------------------------------- focus / display
  setMode(mode) {
    this.mode = mode;
    this._restyle();
  }

  /** call after toggling userData.hidden on meshes (variants) */
  refresh() {
    this._boxCache.clear();
    this._restyle();
    this._outline();
  }

  setFocus(tags, ctx) {
    this.focusTags = tags || [];
    this.ctxTags = ctx || [];
    this._restyle();
    this._outline();
  }

  _restyle() {
    const has = this.focusTags.length > 0;
    for (const m of this.meshes) {
      const base = m.userData.baseMat;
      const hit = has && this.focusTags.some((t) => tagMatches(m.userData.tag, t));
      const isProp = m.userData.tag.startsWith('prop');
      const isScn = m.userData.tag.startsWith('scn');
      let vis = true, mat = base, cast = true;
      if (m.userData.hidden) {
        vis = false;
      } else if (isProp) {
        vis = hit;
      } else if (isScn && !hit) {
        vis = !(has && (this.mode === 'isolate' || m.userData.tag === 'scn.city') && m.userData.tag !== 'scn.terrain');
      } else if (has && !hit) {
        const inCtx = this.ctxTags.length && this.ctxTags.some((t) => tagMatches(m.userData.tag, t));
        if (this.mode === 'isolate') vis = false;
        else if (this.mode === 'ghost') { mat = this._variant(base, inCtx ? 'soft' : 'ghost'); cast = false; }
      } else if (hit && base.emissive) {
        mat = this._variant(base, 'hi');
      }
      m.visible = vis;
      m.material = mat;
      m.castShadow = cast && !base.transparent;
    }
  }

  _outline() {
    this.glow.children.forEach((c) => { c.geometry.dispose(); });
    this.glow.clear();
    if (!this.focusTags.length) return;
    const mat = this._lineMat || (this._lineMat = new THREE.LineBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.55, clippingPlanes: [this.plane] }));
    for (const m of this.meshes) {
      if (!m.visible || m.userData.tag.startsWith('prop') || m.userData.tag.startsWith('variant')) continue;
      if (!this.focusTags.some((t) => tagMatches(m.userData.tag, t))) continue;
      if (m.geometry.attributes.position.count > 60000) continue;
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry, 35), mat);
      e.renderOrder = 2;
      this.glow.add(e);
    }
  }

  /** show dimension lines for the given measure records ({a,b,label,kind}) and callouts for anchors ({p,text}) */
  showAnnotations(measures = [], anchors = []) {
    this.overlay.setDims(measures.map((m) => ({ a: m.a, b: m.b, label: m.label, kind: m.kind })));
    this.overlay.setCallouts(anchors.map((a) => ({ p: a.p, text: a.text })));
  }

  setCut(y) {
    this.cutY = y;
    this.plane.constant = y == null ? 1e5 : y;
    // clipped solids need to show their inner faces
    const side = y == null ? THREE.FrontSide : THREE.DoubleSide;
    for (const m of this.meshes) if (!m.userData.baseMat.userData.ds) m.userData.baseMat.side = side;
    for (const [k, mat] of this._matCache) if (!k.endsWith('ghost') && !k.endsWith('soft') && !mat.userData.ds) mat.side = side;
  }

  // ---------------------------------------------------------------- camera
  frameFor(box, view = 'iso', mul = 1) {
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(size.length() / 2, 5);
    const fov = THREE.MathUtils.degToRad(this.camera.fov);
    const aspect = this.camera.aspect;
    let fit = radius / Math.sin(Math.min(fov, fov * aspect) / 2);
    if (view === 'top') {
      // plan view: only the footprint matters
      const vf = Math.tan(fov / 2), hf = vf * aspect;
      fit = Math.max((size.z / 2) / vf, (size.x / 2) / hf, 12) * 1.12 + size.y * 0.4;
    }
    const visible = Math.max(0.35, (this.h - (this.inset || 0) - (this.insetTop || 0)) / this.h);
    const dist = (fit * 1.05 * mul) / visible;
    const v = new THREE.Vector3(...(VIEWS[view] || VIEWS.iso)).normalize();
    // keep the focus slightly below centre so the labels have room
    center.y += size.y * 0.1;
    return { pos: center.clone().addScaledVector(v, dist), target: center };
  }

  flyTo(pos, target, dur = 1.4) {
    this.fly = {
      t0: this.clock.elapsedTime, dur,
      p0: this.camera.position.clone(), p1: pos.clone(),
      t0v: this.controls.target.clone(), t1v: target.clone(),
    };
  }

  /** Apply a verse's 3D scene spec. */
  show(spec = {}) {
    const focus = spec.f || [];
    if (spec.mode) this.setMode(spec.mode);
    this.setFocus(focus, spec.ctx);
    if (spec.cut !== undefined) this.setCut(spec.cut);
    this.currentSpec = spec;

    // camera
    let cam = null;
    if (spec.ov) {
      const box = this.boxOf(spec.fit && spec.fit.length ? spec.fit : ['court']);
      if (box) cam = this.frameFor(box, spec.ov, spec.d || 1);
    } else if (spec.cam) {
      cam = { pos: new THREE.Vector3(spec.cam[0], spec.cam[1], spec.cam[2]), target: new THREE.Vector3(spec.cam[3], spec.cam[4], spec.cam[5]) };
    } else {
      const fit = spec.fit && spec.fit.length ? spec.fit : focus;
      const box = fit.length ? this.boxOf(fit) : null;
      if (box) cam = this.frameFor(box, spec.v || 'iso', spec.d || 1);
    }
    if (cam) this.flyTo(cam.pos, cam.target, spec.dur || 1.5);
    return cam;
  }

  overview(view = 'far') {
    this.setFocus([]);
    this.setCut(null);
    this.overlay.clear();
    const box = this.boxOf(['court']) || new THREE.Box3(new THREE.Vector3(-260, 0, -260), new THREE.Vector3(260, 100, 260));
    const f = this.frameFor(box, view, 1.0);
    this.flyTo(f.pos, f.target, 1.8);
  }

  // ---------------------------------------------------------------- loop & io
  resize() {
    const w = this.container.clientWidth || 800, h = this.container.clientHeight || 600;
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this._applyInset();
  }

  /** keep the focused subject centred in the part of the viewport that a bottom card leaves visible */
  setInset(bottom, top = 0) {
    this.inset = Math.max(0, bottom || 0);
    this.insetTop = Math.max(0, top || 0);
    this._applyInset();
  }

  _applyInset() {
    const b = this.inset || 0, t = this.insetTop || 0;
    if (b || t) this.camera.setViewOffset(this.w, this.h, 0, Math.round((b - t) / 2), this.w, this.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    const hi = q === 'high';
    this.renderer.setPixelRatio(hi ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sun.castShadow = q !== 'low';
    this.sun.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.resize();
    for (const m of this.meshes || []) m.userData.baseMat.needsUpdate = true;
  }

  tick() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const t = this.clock.elapsedTime;
    if (this.fly) {
      const f = this.fly;
      const k = Math.min(1, (t - f.t0) / f.dur);
      const e = ease(k);
      this.camera.position.lerpVectors(f.p0, f.p1, e);
      this.camera.position.y += Math.sin(Math.PI * k) * f.p0.distanceTo(f.p1) * 0.12;
      this.controls.target.lerpVectors(f.t0v, f.t1v, e);
      if (k >= 1) this.fly = null;
    }
    this.controls.update();
    // pulse highlight
    const pulse = 0.28 + 0.14 * Math.sin(t * 3.2);
    this._hiMats.forEach((m) => (m.emissiveIntensity = pulse));
    for (const a of this.animators) a(t, dt);
    this.renderer.render(this.scene, this.camera);
    this.overlay.update(this.camera, this.w, this.h);
  }

  _bindPick() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    let down = null;
    el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    el.addEventListener('pointerup', (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || performance.now() - down.t > 450) return;
      const rect = el.getBoundingClientRect();
      const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
      ray.setFromCamera(ndc, this.camera);
      const targets = this.meshes.filter((m) => m.visible && !m.userData.noPick && (m.material.opacity === undefined || m.material.opacity > 0.5 || !m.material.transparent));
      const hit = ray.intersectObjects(targets, false)[0];
      if (hit && this.onPick) this.onPick(hit.object.userData.tag, hit.point);
    });
  }
}
