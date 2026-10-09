import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Overlay } from './overlay.js';
import { tagMatches } from './batch.js';
import { levelAt } from '../model/dims.js';

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
    r.shadowMap.autoUpdate = false; // the model is static: re-render shadows only when something changed
    this.shadowDirty = 4;
    this.q = 'high';
    this.frameEma = 1 / 60;
    this.slowFor = 0;
    r.localClippingEnabled = true;
    r.setClearAlpha(0);
    container.prepend(r.domElement);
    r.domElement.className = 'gl';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xd6d2c2, 1800, 7000);

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.2, 60000);
    this.orbitFov = 42;
    this.walk = null;
    this.camera.position.set(520, 330, 520);

    const c = (this.controls = new OrbitControls(this.camera, r.domElement));
    c.enableDamping = true;
    c.dampingFactor = 0.08;
    c.maxPolarAngle = Math.PI * 0.495;
    c.minDistance = 4;
    c.maxDistance = 9000;
    c.target.set(-30, 10, 0);
    c.addEventListener('start', () => { this.fly = null; });
    c.rotateSpeed = 0.7; c.zoomSpeed = 0.8; c.panSpeed = 0.8;
    c.screenSpacePanning = true;
    // a lost WebGL context must not leave a dead canvas
    r.domElement.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; this.onLost && this.onLost(true); });
    r.domElement.addEventListener('webglcontextrestored', () => { this.lost = false; this.shadowDirty = 4; for (const m of this.meshes || []) m.userData.baseMat.needsUpdate = true; this.onLost && this.onLost(false); });

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
    this.shadowDirty = 4;
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
        vis = !(has && (this.mode === 'isolate' || m.userData.tag === 'scn.city'));
      } else if (has && !hit) {
        const inCtx = this.ctxTags.length && this.ctxTags.some((t) => tagMatches(m.userData.tag, t));
        if (this.mode === 'isolate') { if (inCtx) { mat = this._variant(base, 'soft'); cast = false; } else vis = false; }
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
    this.glow.clear(); // edge geometries are cached on the meshes
    if (!this.focusTags.length) return;
    const mat = this._lineMat || (this._lineMat = new THREE.LineBasicMaterial({ color: 0xffd36b, transparent: true, opacity: 0.55, clippingPlanes: [this.plane] }));
    for (const m of this.meshes) {
      if (!m.visible || m.userData.tag.startsWith('prop') || m.userData.tag.startsWith('variant')) continue;
      if (!this.focusTags.some((t) => tagMatches(m.userData.tag, t))) continue;
      if (m.geometry.attributes.position.count > 60000) continue;
      const geo = m.userData.edges || (m.userData.edges = new THREE.EdgesGeometry(m.geometry, 35));
      const e = new THREE.LineSegments(geo, mat);
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

  /** Smooth "orbit" flight: the target glides, the camera turns around it and the distance changes logarithmically. */
  flyTo(pos, target) {
    if (this.walk || !isFinite(pos.x + pos.y + pos.z + target.x + target.y + target.z)) return;
    const tg = this.controls.target;
    const o0 = new THREE.Vector3().subVectors(this.camera.position, tg);
    const o1 = new THREE.Vector3().subVectors(pos, target);
    const s0 = new THREE.Spherical().setFromVector3(o0);
    const s1 = new THREE.Spherical().setFromVector3(o1);
    let dTheta = s1.theta - s0.theta;
    while (dTheta > Math.PI) dTheta -= 2 * Math.PI;
    while (dTheta < -Math.PI) dTheta += 2 * Math.PI;
    const travel = tg.distanceTo(target);
    const zoom = Math.abs(Math.log(Math.max(s1.radius, 0.01) / Math.max(s0.radius, 0.01)));
    const dur = Math.min(2.4, Math.max(0.8, 0.55 + 0.28 * Math.log2(1 + travel / 25) + 0.3 * zoom + 0.2 * Math.abs(dTheta)));
    this.fly = {
      t0: this.clock.elapsedTime, dur, s0, theta1: s0.theta + dTheta, s1,
      c0: tg.clone(), c1: target.clone(),
    };
  }

  _stepFly(t) {
    const f = this.fly;
    const k = Math.min(1, (t - f.t0) / f.dur);
    const e = k * k * k * (k * (k * 6 - 15) + 10); // smootherstep: no start/stop jerk
    const r = Math.exp(Math.log(Math.max(f.s0.radius, 0.01)) * (1 - e) + Math.log(Math.max(f.s1.radius, 0.01)) * e);
    const sp = new THREE.Spherical(r, THREE.MathUtils.clamp(f.s0.phi + (f.s1.phi - f.s0.phi) * e, 0.02, Math.PI - 0.02), f.s0.theta + (f.theta1 - f.s0.theta) * e);
    this.controls.target.lerpVectors(f.c0, f.c1, e);
    this.camera.position.setFromSpherical(sp).add(this.controls.target);
    if (this.camera.position.y < 0.8) this.camera.position.y = 0.8;
    if (k >= 1) this.fly = null;
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
    if (cam) this.flyTo(cam.pos, cam.target);
    return cam;
  }

  overview(view = 'far') {
    this.setFocus([]);
    this.setCut(null);
    this.overlay.clear();
    const box = this.boxOf(['court']) || new THREE.Box3(new THREE.Vector3(-260, 0, -260), new THREE.Vector3(260, 100, 260));
    const f = this.frameFor(box, view, 1.0);
    this.flyTo(f.pos, f.target);
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
    if (this.insetCur == null) { this.insetCur = this.inset; this.insetTopCur = this.insetTop; this._applyInset(); }
  }

  _stepInset(dt) {
    if (this.insetCur == null) return;
    const dB = this.inset - this.insetCur, dT = this.insetTop - this.insetTopCur;
    if (Math.abs(dB) < 0.4 && Math.abs(dT) < 0.4) {
      if (dB || dT) { this.insetCur = this.inset; this.insetTopCur = this.insetTop; this._applyInset(); }
      return;
    }
    const k = 1 - Math.exp(-dt * 9); // eased: the scene glides instead of jumping when the card changes height
    this.insetCur += dB * k; this.insetTopCur += dT * k;
    this._applyInset();
  }

  _applyInset() {
    const b = this.insetCur || 0, t = this.insetTopCur || 0;
    if (this.walk) this.camera.clearViewOffset();
    else if (b || t) this.camera.setViewOffset(this.w, this.h, 0, Math.round((b - t) / 2), this.w, this.h);
    else this.camera.clearViewOffset();
    this.camera.updateProjectionMatrix();
  }

  setQuality(q) {
    const hi = q === 'high';
    this.q = q;
    this.renderer.setPixelRatio(hi ? Math.min(window.devicePixelRatio || 1, 2) : 1);
    this.renderer.shadowMap.enabled = q !== 'low';
    this.sun.castShadow = q !== 'low';
    this.sun.shadow.mapSize.set(hi ? 4096 : 2048, hi ? 4096 : 2048);
    if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
    this.shadowDirty = 4;
    this.resize();
    for (const m of this.meshes || []) m.userData.baseMat.needsUpdate = true;
  }

  tick() {
    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const t = this.clock.elapsedTime;
    if (this.lost) return;
    if (this.walk) this._stepWalk(dt);
    else {
      if (this.fly) this._stepFly(t);
      this.controls.update();
    }
    this._stepInset(dt);
    // pulse highlight
    const pulse = 0.28 + 0.14 * Math.sin(t * 3.2);
    this._hiMats.forEach((m) => (m.emissiveIntensity = pulse));
    for (const a of this.animators) a(t, dt);
    if (this.shadowDirty > 0) { this.renderer.shadowMap.needsUpdate = true; this.shadowDirty--; }
    this.renderer.render(this.scene, this.camera);
    this.overlay.update(this.camera, this.w, this.h);
    // stability: when frames are consistently slow, step the graphics quality down automatically
    if (t > 4) {
      this.frameEma += (Math.min(rawDt, 0.25) - this.frameEma) * 0.06;
      this.slowFor = this.frameEma > 0.045 ? this.slowFor + 1 : 0;
      if (this.slowFor > 90 && this.q !== 'low') {
        const next = this.q === 'high' ? 'mid' : 'low';
        this.slowFor = 0; this.frameEma = 1 / 40;
        this.setQuality(next);
        this.onAutoQuality && this.onAutoQuality(next);
      }
    }
  }

  // ---------------------------------------------------------------- walking inside (360° view)
  /** Stand inside the model: drag to look around, wheel to zoom, WASD/arrows to walk, click the floor to go there. */
  enterWalk(x, z, yaw = 0, pitch = 0) {
    const eye = 3.4; // ~1.7 m
    if (!this.walk) {
      this.walk = { yaw, pitch, fov: 72, keys: new Set(), eye, saved: { pos: this.camera.position.clone(), target: this.controls.target.clone(), fov: this.camera.fov } };
      this.controls.enabled = false;
      this.fly = null;
      this.camera.near = 0.15;
      this._bindWalk();
    }
    const w = this.walk;
    w.yaw = yaw; w.pitch = pitch;
    w.goal = null;
    w.floor = levelAt(x, z);
    this.camera.position.set(x, w.floor + eye, z);
    this.camera.fov = w.fov;
    this._applyInset();
    this._applyWalkRotation();
    this.shadowDirty = 4;
  }

  /** glide to another standing place without leaving the 360° view */
  walkTo(x, z, yaw) {
    if (!this.walk) return this.enterWalk(x, z, yaw);
    const w = this.walk;
    w.goal = { x, z, yaw, t0: this.clock.elapsedTime, dur: 0.9, from: { x: this.camera.position.x, z: this.camera.position.z, yaw: w.yaw } };
  }

  exitWalk() {
    if (!this.walk) return;
    const sv = this.walk.saved;
    this._unbindWalk();
    this.walk = null;
    this.camera.fov = sv.fov;
    this.camera.near = 0.2;
    this.controls.enabled = true;
    this.camera.position.copy(sv.pos);
    this.controls.target.copy(sv.target);
    this._applyInset();
    this.camera.updateProjectionMatrix();
    this.controls.update();
  }

  _applyWalkRotation() {
    const w = this.walk;
    w.pitch = THREE.MathUtils.clamp(w.pitch, -1.25, 1.25);
    this.camera.rotation.set(w.pitch, w.yaw, 0, 'YXZ');
    this.camera.fov = w.fov;
    this.camera.updateProjectionMatrix();
  }

  _stepWalk(dt) {
    const w = this.walk, cam = this.camera;
    const R = 256;
    if (w.goal) {
      const g = w.goal, k = Math.min(1, (this.clock.elapsedTime - g.t0) / g.dur);
      const e = k * k * (3 - 2 * k);
      cam.position.x = g.from.x + (g.x - g.from.x) * e;
      cam.position.z = g.from.z + (g.z - g.from.z) * e;
      let dy = g.yaw - g.from.yaw;
      while (dy > Math.PI) dy -= 2 * Math.PI;
      while (dy < -Math.PI) dy += 2 * Math.PI;
      w.yaw = g.from.yaw + dy * e;
      if (k >= 1) w.goal = null;
    } else if (w.keys.size) {
      const k = w.keys;
      const f = (k.has('KeyW') || k.has('ArrowUp') ? 1 : 0) - (k.has('KeyS') || k.has('ArrowDown') ? 1 : 0);
      const s = (k.has('KeyD') ? 1 : 0) - (k.has('KeyA') ? 1 : 0);
      const turn = (k.has('ArrowLeft') ? 1 : 0) - (k.has('ArrowRight') ? 1 : 0);
      const sp = (k.has('ShiftLeft') || k.has('ShiftRight') ? 26 : 9) * dt;
      w.yaw += turn * 1.4 * dt;
      cam.position.x += (-Math.sin(w.yaw) * f + Math.cos(w.yaw) * s) * sp;
      cam.position.z += (-Math.cos(w.yaw) * f - Math.sin(w.yaw) * s) * sp;
    }
    cam.position.x = THREE.MathUtils.clamp(cam.position.x, -R, R);
    cam.position.z = THREE.MathUtils.clamp(cam.position.z, -R, R);
    // follow the floor level smoothly (stairs and platforms glide instead of popping)
    const target = levelAt(cam.position.x, cam.position.z);
    w.floor += (target - w.floor) * (1 - Math.exp(-dt * 7));
    cam.position.y = w.floor + w.eye;
    this._applyWalkRotation();
  }

  _bindWalk() {
    const el = this.renderer.domElement;
    const w = this.walk;
    const ptr = new Map();
    let drag = null, pinch = 0;
    const down = (e) => {
      el.setPointerCapture?.(e.pointerId);
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 1) drag = { x: e.clientX, y: e.clientY, moved: 0, t: performance.now() };
      if (ptr.size === 2) { const [a, b] = [...ptr.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); drag = null; }
    };
    const move = (e) => {
      if (!ptr.has(e.pointerId)) return;
      const prev = ptr.get(e.pointerId);
      ptr.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptr.size === 2) {
        const [a, b] = [...ptr.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        w.fov = THREE.MathUtils.clamp(w.fov * (pinch / Math.max(d, 1)), 28, 100); pinch = d; return;
      }
      if (!drag) return;
      const dx = e.clientX - prev.x, dy = e.clientY - prev.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      const sens = (w.fov / 72) * 0.0042;
      w.yaw += dx * sens; w.pitch += dy * sens; // drag like grabbing the scene (Street-View style)
      w.goal = null;
    };
    const up = (e) => {
      const d = drag;
      ptr.delete(e.pointerId);
      if (ptr.size < 2) pinch = 0;
      drag = null;
      if (d && d.moved < 6 && performance.now() - d.t < 450) this._walkClick(e);
    };
    const wheel = (e) => { e.preventDefault(); w.fov = THREE.MathUtils.clamp(w.fov * (1 + e.deltaY * 0.0012), 28, 100); };
    const kd = (e) => { if (e.target.matches && e.target.matches('input, textarea, select')) return; if (/^(Key[WASD]|Arrow|Shift)/.test(e.code)) { w.keys.add(e.code); if (e.code.startsWith('Arrow')) e.preventDefault(); } };
    const ku = (e) => w.keys.delete(e.code);
    el.addEventListener('pointerdown', down); el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('keydown', kd, true); window.addEventListener('keyup', ku, true);
    this._walkUnbind = () => {
      el.removeEventListener('pointerdown', down); el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up); el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
      window.removeEventListener('keydown', kd, true); window.removeEventListener('keyup', ku, true);
    };
  }

  _unbindWalk() { if (this._walkUnbind) { this._walkUnbind(); this._walkUnbind = null; } }

  /** click on the floor = walk there (like clicking the road in Street View) */
  _walkClick(e) {
    const el = this.renderer.domElement, rect = el.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    const ray = this._ray || (this._ray = new THREE.Raycaster());
    ray.setFromCamera(ndc, this.camera);
    ray.far = 220;
    const targets = this.meshes.filter((m) => m.visible && !m.userData.noPick && !m.userData.tag.startsWith('scn') && (!m.material.transparent || m.material.opacity > 0.5));
    const hit = ray.intersectObjects(targets, false)[0];
    if (!hit || !hit.face) return;
    const n = hit.face.normal;
    if (n.y > 0.6) this.walkTo(hit.point.x, hit.point.z, this.walk.yaw);
    else if (this.onPick) this.onPick(hit.object.userData.tag, hit.point);
  }

  _bindPick() {
    const el = this.renderer.domElement;
    const ray = new THREE.Raycaster();
    let down = null;
    el.addEventListener('pointerdown', (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() }));
    el.addEventListener('pointerup', (e) => {
      if (this.walk) return; // in the 360° view clicks mean "walk here"
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
