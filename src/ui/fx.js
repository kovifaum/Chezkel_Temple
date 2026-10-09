import * as THREE from 'three';

/**
 * Special effects tied to specific verses:
 *  - the glory of God returning from the east (43:2-5) — drifting golden light along the temple axis
 *  - doors opening / closing (heichal, holy of holies, outer east gate)
 *  - "קולו כקול מים רבים" — optional synthesized water-roar
 */
export class FX {
  constructor(stage, model) {
    this.stage = stage;
    this.model = model;
    this.doorTarget = {};
    this.glowOn = false;
    this.audio = null;
    this._buildGlory();
    stage.animators.push((t, dt) => this._tick(t, dt));
  }

  _buildGlory() {
    const N = 900;
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    this.seeds = new Float32Array(N * 4);
    for (let i = 0; i < N; i++) {
      this.seeds.set([Math.random(), Math.random() * Math.PI * 2, Math.random(), 0.4 + Math.random() * 0.8], i * 4);
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffd36b, size: 5, sizeAttenuation: true, transparent: true, opacity: 0.0,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.glory = new THREE.Points(geo, mat);
    this.glory.frustumCulled = false;
    this.glory.visible = false;
    this.stage.scene.add(this.glory);

    // soft light that travels with the glory
    this.light = new THREE.PointLight(0xffd070, 0, 700, 1.4);
    this.stage.scene.add(this.light);

    // great glow sprite at the head of the cloud
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, 'rgba(255,240,180,1)');
    grd.addColorStop(0.35, 'rgba(255,210,110,0.55)');
    grd.addColorStop(1, 'rgba(255,200,90,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 128, 128);
    this.sprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(c), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0,
    }));
    this.sprite.scale.set(160, 160, 1);
    this.sprite.visible = false;
    this.stage.scene.add(this.sprite);
    this.gloryT = 0;
    this.gloryMode = 'off'; // 'off' | 'approach' | 'fill'
  }

  /** mode: 'off' | 'approach' (comes from the east) | 'fill' (fills the house) */
  setGlory(mode) {
    this.gloryMode = mode || 'off';
    if (mode && mode !== 'off') { this.glory.visible = this.sprite.visible = true; }
    this.gloryT = mode === 'approach' ? 0 : this.gloryT;
    this._audio(mode === 'approach');
  }

  setDoors(states) {
    // states: {heichal, kk, east} → true = open
    for (const [k, v] of Object.entries(states || {})) this.doorTarget[k] = v;
  }

  _audio(on) {
    if (!this.soundOn) { this._stopAudio(); return; }
    if (!on) { this._stopAudio(); return; }
    if (this.audio) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = ctx.sampleRate * 2;
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < len; i++) { // pink-ish noise
        const w = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.11;
      }
      const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 520;
      const gain = ctx.createGain(); gain.gain.value = 0.0;
      src.connect(lp).connect(gain).connect(ctx.destination);
      src.start();
      gain.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 2.5);
      this.audio = { ctx, gain, src };
    } catch (e) { /* audio is optional */ }
  }

  _stopAudio() {
    if (!this.audio) return;
    const { ctx, gain, src } = this.audio;
    try { gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2); setTimeout(() => { src.stop(); ctx.close(); }, 1400); } catch (e) { /* ignore */ }
    this.audio = null;
  }

  setSound(on) {
    this.soundOn = on;
    if (!on) this._stopAudio();
    else if (this.gloryMode === 'approach') this._audio(true);
  }

  _tick(t, dt) {
    // doors
    for (const [name, piv] of Object.entries(this.model.doors)) {
      const group = name.startsWith('heichal') ? 'heichal' : name.startsWith('kk') ? 'kk' : 'east';
      const open = this.doorTarget[group];
      if (open === undefined) continue;
      const target = open ? piv.userData.open : piv.userData.closed;
      piv.rotation.y += (target - piv.rotation.y) * Math.min(1, dt * 2.4);
      if (Math.abs(target - piv.rotation.y) > 0.002) this.stage.shadowDirty = 3;
    }
    // glory
    const mode = this.gloryMode;
    const tgtOp = mode === 'off' ? 0 : 0.95;
    const mat = this.glory.material;
    mat.opacity += (tgtOp - mat.opacity) * Math.min(1, dt * 2);
    const camD = this.stage.camera.position.distanceTo(this.sprite.position);
    const near = Math.min(1, Math.max(0.12, camD / (mode === 'fill' ? 220 : 160)));
    const spriteTarget = mode === 'off' ? 0 : (mode === 'fill' ? 0.4 : 0.9) * near;
    this.sprite.material.opacity += (spriteTarget - this.sprite.material.opacity) * Math.min(1, dt * 2);
    this.light.intensity += ((mode === 'off' ? 0 : 2.4e4) - this.light.intensity) * Math.min(1, dt * 2);
    if (mat.opacity < 0.01 && mode === 'off') { this.glory.visible = this.sprite.visible = false; return; }
    this.gloryT += dt * (mode === 'approach' ? 0.075 : 0.0);
    const head = mode === 'approach' ? 900 - Math.min(1, this.gloryT) * 1010 : -90;
    const axisY = mode === 'approach' ? 26 : 38;
    const pos = this.glory.geometry.attributes.position;
    const n = pos.count;
    for (let i = 0; i < n; i++) {
      const [a, ang, b, sp] = [this.seeds[i * 4], this.seeds[i * 4 + 1], this.seeds[i * 4 + 2], this.seeds[i * 4 + 3]];
      const phase = (a + t * 0.05 * sp) % 1;
      const spread = mode === 'approach' ? 260 : 60;
      const x = head + (phase - 0.5) * spread * 2 * (mode === 'approach' ? 1 : 0.5) + (mode === 'approach' ? 60 : 0);
      const r = (6 + b * (mode === 'approach' ? 46 : 38)) * (0.7 + 0.3 * Math.sin(t * 0.8 + a * 20));
      pos.setXYZ(i, x, axisY + Math.sin(ang + t * 0.6 * sp) * r * 0.8, Math.cos(ang + t * 0.6 * sp) * r);
    }
    pos.needsUpdate = true;
    this.sprite.position.set(head, axisY, 0);
    this.sprite.scale.setScalar(mode === 'approach' ? 150 : 210);
    this.light.position.set(head, axisY + 6, 0);
  }
}
