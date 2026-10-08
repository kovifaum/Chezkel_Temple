import * as THREE from 'three';

// ---------- procedural textures (no external assets) ----------
function canvasTex(size, draw, repeat = true) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d'), size);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function stoneTexture(base, mortar, rows = 8, seed = 7) {
  return canvasTex(512, (g, n) => {
    const r = rng(seed);
    g.fillStyle = mortar; g.fillRect(0, 0, n, n);
    const h = n / rows;
    for (let y = 0; y < rows; y++) {
      let x = -((y % 2) * 0.5) * (n / 4);
      while (x < n) {
        const w = n / 4 * (0.8 + r() * 0.5);
        const k = 0.9 + r() * 0.2;
        g.fillStyle = shade(base, k);
        g.fillRect(x + 2, y * h + 2, w - 4, h - 4);
        x += w;
      }
    }
    // speckle
    for (let i = 0; i < 2500; i++) {
      g.fillStyle = `rgba(${r() > 0.5 ? '255,250,235' : '60,50,35'},${r() * 0.07})`;
      g.fillRect(r() * n, r() * n, 2, 2);
    }
  });
}

function shade(hex, k) {
  const c = new THREE.Color(hex);
  c.multiplyScalar(k);
  return '#' + c.getHexString();
}

function plasterTexture(base, seed = 3) {
  return canvasTex(256, (g, n) => {
    const r = rng(seed);
    g.fillStyle = base; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 5000; i++) {
      const v = r();
      g.fillStyle = v > 0.5 ? `rgba(255,255,255,${r() * 0.06})` : `rgba(80,60,30,${r() * 0.06})`;
      g.fillRect(r() * n, r() * n, 1 + r() * 3, 1 + r() * 3);
    }
  });
}

function woodTexture() {
  return canvasTex(256, (g, n) => {
    const r = rng(11);
    g.fillStyle = '#7a5230'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 90; i++) {
      g.strokeStyle = `rgba(${r() > 0.5 ? '40,22,8' : '150,105,60'},${0.08 + r() * 0.18})`;
      g.lineWidth = 1 + r() * 2;
      g.beginPath();
      const y = r() * n;
      g.moveTo(0, y);
      g.bezierCurveTo(n * 0.3, y + (r() - 0.5) * 12, n * 0.6, y + (r() - 0.5) * 12, n, y + (r() - 0.5) * 8);
      g.stroke();
    }
  });
}

function sandTexture() {
  return canvasTex(512, (g, n) => {
    const r = rng(21);
    g.fillStyle = '#d8d2c2'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 9000; i++) {
      g.fillStyle = r() > 0.5 ? `rgba(255,245,220,${r() * 0.12})` : `rgba(110,85,50,${r() * 0.12})`;
      g.fillRect(r() * n, r() * n, 1 + r() * 4, 1 + r() * 4);
    }
  });
}

function paveTexture() {
  return canvasTex(512, (g, n) => {
    const r = rng(5);
    g.fillStyle = '#9b927c'; g.fillRect(0, 0, n, n);
    const s = n / 8;
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      g.fillStyle = shade('#c9c0a8', 0.88 + r() * 0.2);
      g.fillRect(x * s + 2, y * s + 2, s - 4, s - 4);
    }
  });
}

function grassTexture() {
  return canvasTex(512, (g, n) => {
    const r = rng(33);
    g.fillStyle = '#7d8a52'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 12000; i++) {
      g.fillStyle = r() > 0.5 ? `rgba(60,90,30,${r() * 0.15})` : `rgba(190,190,110,${r() * 0.12})`;
      g.fillRect(r() * n, r() * n, 1 + r() * 3, 2 + r() * 4);
    }
  });
}

// ---------- shared materials (one instance per look; highlight/ghost variants derive from these) ----------
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0.0, ...o });

export const M = {
  stone: std({ name: 'stone', map: stoneTexture('#ddd3bb', '#a9a08a', 8, 7), roughness: 0.95 }),
  stoneDark: std({ name: 'stoneDark', map: stoneTexture('#bdb299', '#8d846f', 6, 9), roughness: 0.95 }),
  wall: std({ name: 'wall', map: stoneTexture('#d8cfb8', '#a39a85', 10, 12), roughness: 0.95 }),
  plaster: std({ name: 'plaster', map: plasterTexture('#ece4d0'), roughness: 0.97 }),
  floor: std({ name: 'floor', map: paveTexture(), roughness: 0.9 }),
  wood: std({ name: 'wood', map: woodTexture(), roughness: 0.75 }),
  cedar: std({ name: 'cedar', color: 0x8b5a33, roughness: 0.7 }),
  gold: std({ name: 'gold', color: 0xd9a92a, metalness: 0.85, roughness: 0.32 }),
  bronze: std({ name: 'bronze', color: 0xb0733a, metalness: 0.8, roughness: 0.4 }),
  iron: std({ name: 'iron', color: 0x4a4a4e, metalness: 0.7, roughness: 0.5 }),
  altar: std({ name: 'altar', map: stoneTexture('#bfae8e', '#8f7f66', 6, 17), roughness: 0.95 }),
  fire: new THREE.MeshBasicMaterial({ name: 'fire', color: 0xff8c1a }),
  dark: std({ name: 'dark', color: 0x201a14, roughness: 1 }),
  window: std({ name: 'window', color: 0x2d241b, roughness: 1 }),
  palm: std({ name: 'palm', color: 0xb6962f, metalness: 0.5, roughness: 0.5, side: THREE.DoubleSide, userData: { ds: true } }),
  goldFoil: std({ name: 'goldFoil', color: 0xd9a92a, metalness: 0.85, roughness: 0.32, side: THREE.DoubleSide, userData: { ds: true } }),
  linen: std({ name: 'linen', color: 0xf3efe4, roughness: 0.95 }),
  skin: std({ name: 'skin', color: 0xd9a77a, roughness: 0.8 }),
  glow: new THREE.MeshBasicMaterial({ name: 'glow', color: 0xffe08a }),
  ground: std({ name: 'ground', map: sandTexture(), roughness: 1 }),
  grass: std({ name: 'grass', map: grassTexture(), roughness: 1 }),
  rock: std({ name: 'rock', color: 0x9d8d73, roughness: 1, flatShading: true }),
  house: std({ name: 'house', color: 0xe6dcc4, roughness: 0.95, map: plasterTexture('#e8dfc8', 8) }),
  roof: std({ name: 'roof', color: 0xb5a584, roughness: 0.95 }),
  curtain: std({ name: 'curtain', color: 0x6a1f4a, roughness: 0.9, side: THREE.DoubleSide }),
  water: new THREE.MeshStandardMaterial({ name: 'water', color: 0x4f8fb0, roughness: 0.2, metalness: 0.1, transparent: true, opacity: 0.8 }),
  forbidden: new THREE.MeshBasicMaterial({ name: 'forbidden', color: 0xd13b3b }),
};

// world-space texture density (texture repeats every N cubits); set per material
export const TEX_SCALE = {
  stone: 12, stoneDark: 14, wall: 16, plaster: 18, floor: 20, wood: 6, ground: 60,
  grass: 80, altar: 8, house: 18,
};
