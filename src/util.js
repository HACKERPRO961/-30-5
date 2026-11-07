import * as THREE from 'three';

const rnd = (a, b) => a + Math.random() * (b - a);
function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}
function speck(g, w, h, n, a0, a1, dark, size) {
  for (let i = 0; i < n; i++) {
    const v = dark ? 0 : 255;
    g.fillStyle = `rgba(${v},${v},${v},${rnd(a0, a1)})`;
    g.fillRect(Math.random() * w, Math.random() * h, rnd(1, size), rnd(1, size));
  }
}
function tex(c, repeat) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const painters = {
  tile(g, w, h) {
    g.fillStyle = '#b8b3a4'; g.fillRect(0, 0, w, h);
    const n = 4, s = w / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const v = (Math.random() * 14 - 7) | 0;
      g.fillStyle = `rgb(${184 + v},${179 + v},${164 + v})`;
      g.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
    }
    g.fillStyle = 'rgba(60,55,45,0.55)';
    for (let i = 0; i <= n; i++) { g.fillRect(i * s - 1.5, 0, 3, h); g.fillRect(0, i * s - 1.5, w, 3); }
    speck(g, w, h, 900, 0.03, 0.12, true, 3);
  },
  concrete(g, w, h) {
    g.fillStyle = '#86857f'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 40; i++) {
      const v = Math.random() < 0.5 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},0.04)`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(10, 40), 0, 7); g.fill();
    }
    speck(g, w, h, 2500, 0.04, 0.2, true, 3);
    speck(g, w, h, 900, 0.03, 0.1, false, 3);
  },
  paint(g, w, h) {
    g.fillStyle = '#cdc6b0'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(80,70,50,${rnd(0.01, 0.05)})`;
      g.fillRect(Math.random() * w, 0, rnd(1, 6), h);
    }
    speck(g, w, h, 800, 0.02, 0.08, true, 3);
  },
  metal(g, w, h) {
    g.fillStyle = '#7b8087'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      const v = Math.random() < 0.5 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},${rnd(0.02, 0.07)})`;
      g.fillRect(0, Math.random() * h, w, rnd(1, 2));
    }
    speck(g, w, h, 600, 0.03, 0.1, true, 2);
  },
  wood(g, w, h) {
    g.fillStyle = '#6e4b2e'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      g.fillStyle = `rgba(${Math.random() < 0.5 ? '30,15,5' : '150,100,60'},${rnd(0.04, 0.14)})`;
      g.fillRect(0, Math.random() * h, w, rnd(1, 3));
    }
  },
  hazard(g, w, h) {
    g.fillStyle = '#e0b800'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#16140f';
    for (let i = -h; i < w + h; i += 64) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 32, 0); g.lineTo(i + 32 - h, h); g.lineTo(i - h, h); g.closePath(); g.fill();
    }
    speck(g, w, h, 500, 0.05, 0.2, true, 3);
  },
  ceiling(g, w, h) {
    g.fillStyle = '#d7d5cc'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(60,60,55,0.5)';
    g.fillRect(0, 0, w, 3); g.fillRect(0, 0, 3, h);
    g.fillRect(w / 2 - 1, 0, 2, h); g.fillRect(0, h / 2 - 1, w, 2);
    speck(g, w, h, 600, 0.03, 0.1, true, 3);
  },
  carpet(g, w, h) {
    g.fillStyle = '#6e6234'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) {
      const v = Math.random() < 0.5 ? 0 : 255;
      g.fillStyle = `rgba(${v},${v},${v},${rnd(0.03, 0.12)})`;
      g.fillRect(Math.random() * w, Math.random() * h, rnd(1, 3), rnd(1, 3));
    }
    for (let i = 0; i < 14; i++) {
      g.fillStyle = `rgba(30,22,8,${rnd(0.05, 0.14)})`;
      g.beginPath(); g.arc(Math.random() * w, Math.random() * h, rnd(8, 34), 0, 7); g.fill();
    }
  },
  rubber(g, w, h) {
    g.fillStyle = '#26272a'; g.fillRect(0, 0, w, h);
    speck(g, w, h, 1500, 0.03, 0.12, false, 2);
  },
};

const SIZE = { tile: 2, concrete: 3, paint: 3, metal: 1.5, wood: 1.2, hazard: 0.8, ceiling: 2, rubber: 2, carpet: 2.5 };
const ROUGH = { tile: 0.35, concrete: 0.95, paint: 0.9, metal: 0.4, wood: 0.7, hazard: 0.6, ceiling: 0.9, rubber: 0.8, carpet: 1 };
const METAL = { metal: 0.7 };
const base = {};
const mats = new Map();

export function surf(kind, w, h, o = {}) {
  const q = (v) => Math.max(0.25, Math.round((v / SIZE[kind]) * 4) / 4);
  const rx = q(w), ry = q(h);
  const key = `${kind}_${rx}_${ry}_${o.color ?? ''}`;
  if (mats.has(key)) return mats.get(key);
  if (!base[kind]) {
    const [c, g] = cv(256, 256);
    painters[kind](g, 256, 256);
    base[kind] = tex(c, true);
  }
  const t = base[kind].clone();
  t.needsUpdate = true;
  t.repeat.set(rx, ry);
  const m = new THREE.MeshStandardMaterial({
    map: t, roughness: ROUGH[kind], metalness: METAL[kind] || 0,
    color: o.color !== undefined ? o.color : 0xffffff,
  });
  mats.set(key, m);
  return m;
}

const plainCache = new Map();
export function plain(color, o = {}) {
  const key = `${color}_${o.rough ?? ''}_${o.metal ?? ''}_${o.emissive ?? ''}_${o.ei ?? ''}_${o.opacity ?? ''}`;
  if (plainCache.has(key)) return plainCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, roughness: o.rough ?? 0.7, metalness: o.metal ?? 0,
    emissive: o.emissive ?? 0x000000, emissiveIntensity: o.ei ?? 1,
    transparent: o.opacity !== undefined, opacity: o.opacity ?? 1,
  });
  plainCache.set(key, m);
  return m;
}

export function labelTex(lines, o = {}) {
  const w = o.w ?? 256, h = o.h ?? 128;
  const [c, g] = cv(w, h);
  g.fillStyle = o.bg ?? '#f2f2ee'; g.fillRect(0, 0, w, h);
  g.textAlign = o.align ?? 'center'; g.textBaseline = 'middle';
  const lh = h / (lines.length + 0.4);
  lines.forEach((ln, i) => {
    const obj = typeof ln === 'string' ? { t: ln } : ln;
    g.font = obj.font ?? o.font ?? 'bold 26px Arial';
    g.fillStyle = obj.color ?? o.fg ?? '#111';
    const x = (o.align === 'left') ? 14 : w / 2;
    g.fillText(obj.t, x, lh * (i + 0.9));
  });
  if (o.border) { g.strokeStyle = o.border; g.lineWidth = 6; g.strokeRect(3, 3, w - 6, h - 6); }
  return tex(c, false);
}

// Güncellenebilir ekran (gösterge paneli vb.)
export function screen(w, h) {
  const [c, g] = cv(w, h);
  const t = tex(c, false);
  return { c, g, tex: t, w, h, update() { t.needsUpdate = true; } };
}

export function cityTex() {
  const [c, g] = cv(1024, 256);
  const gr = g.createLinearGradient(0, 0, 0, 256);
  gr.addColorStop(0, '#05060c'); gr.addColorStop(1, '#1b1f33');
  g.fillStyle = gr; g.fillRect(0, 0, 1024, 256);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(255,255,255,${rnd(0.2, 0.8)})`;
    g.fillRect(Math.random() * 1024, Math.random() * 90, 1.5, 1.5);
  }
  let x = 0;
  while (x < 1024) {
    const bw = rnd(40, 110), bh = rnd(60, 190);
    g.fillStyle = '#0a0c14'; g.fillRect(x, 256 - bh, bw, bh);
    for (let wy = 256 - bh + 10; wy < 248; wy += 14) {
      for (let wx = x + 6; wx < x + bw - 8; wx += 12) {
        if (Math.random() < 0.35) {
          g.fillStyle = Math.random() < 0.8 ? '#ffd98a' : '#9fd0ff';
          g.globalAlpha = rnd(0.4, 0.9);
          g.fillRect(wx, wy, 5, 7);
          g.globalAlpha = 1;
        }
      }
    }
    x += bw + rnd(0, 8);
  }
  return tex(c, false);
}

/* Labirent duvarı: 4m x 3m'lik tek parça doku (duvar kağıdı, süpürgelik, kir, leke) */
const wallCache = [];
export function wallMat(i) {
  const k = i % 5;
  if (wallCache[k]) return wallCache[k];
  const [c, g] = cv(512, 384);
  const hue = [[185, 168, 92], [178, 160, 84], [190, 172, 100], [172, 154, 80], [182, 166, 96]][k];
  g.fillStyle = `rgb(${hue[0]},${hue[1]},${hue[2]})`; g.fillRect(0, 0, 512, 384);
  for (let x = 0; x < 512; x += 32) {
    g.fillStyle = 'rgba(255,245,200,0.07)'; g.fillRect(x, 0, 16, 384);
    g.fillStyle = 'rgba(80,60,20,0.16)'; g.fillRect(x, 0, 2, 384);
    for (let y = 16; y < 360; y += 48) { g.fillStyle = 'rgba(80,60,20,0.08)'; g.beginPath(); g.arc(x + 16, y + (x % 64 ? 24 : 0), 4, 0, 7); g.fill(); }
  }
  // su lekesi ve akıntılar
  for (let i = 0; i < 7; i++) {
    const x = Math.random() * 512, w = rnd(6, 30), len = rnd(60, 260);
    const gr = g.createLinearGradient(0, 0, 0, len);
    gr.addColorStop(0, `rgba(60,40,10,${rnd(0.12, 0.3)})`); gr.addColorStop(1, 'rgba(60,40,10,0)');
    g.fillStyle = gr; g.fillRect(x, 0, w, len);
  }
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(70,50,15,${rnd(0.05, 0.12)})`;
    g.beginPath(); g.ellipse(Math.random() * 512, rnd(60, 280), rnd(20, 70), rnd(14, 40), 0, 0, 7); g.fill();
  }
  // alttan kir
  const dg = g.createLinearGradient(0, 384, 0, 230);
  dg.addColorStop(0, 'rgba(15,10,0,0.55)'); dg.addColorStop(1, 'rgba(15,10,0,0)');
  g.fillStyle = dg; g.fillRect(0, 230, 512, 154);
  // süpürgelik ve kenar silmesi
  g.fillStyle = '#3a2b1c'; g.fillRect(0, 384 - 17, 512, 17);
  g.fillStyle = 'rgba(255,230,180,0.25)'; g.fillRect(0, 384 - 17, 512, 2);
  g.fillStyle = '#4a3a26'; g.fillRect(0, 0, 512, 7);
  speck(g, 512, 384, 1400, 0.02, 0.09, true, 3);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  const m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.95 });
  wallCache[k] = m;
  return m;
}

/* Saydam leke dokusu (zemin) */
let stainTex = null;
export function stainMat(rgb = '40,25,10') {
  if (!stainTex) stainTex = {};
  if (stainTex[rgb]) return stainTex[rgb];
  const [c, g] = cv(128, 128);
  const gr = g.createRadialGradient(64, 64, 4, 64, 64, 62);
  gr.addColorStop(0, `rgba(${rgb},0.75)`); gr.addColorStop(0.6, `rgba(${rgb},0.35)`); gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr; g.beginPath(); g.ellipse(64, 64, 62, rnd(40, 62), rnd(0, 3), 0, 7); g.fill();
  for (let i = 0; i < 6; i++) { g.fillStyle = `rgba(${rgb},0.25)`; g.beginPath(); g.arc(rnd(20, 108), rnd(20, 108), rnd(3, 12), 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  stainTex[rgb] = new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  return stainTex[rgb];
}
/* Duvar yazısı: saydam zemin, el yazısı, damlalar */
export function scrawlMat(text, color = '110,12,12') {
  const [c, g] = cv(512, 160);
  g.translate(256, 80); g.rotate(rnd(-0.06, 0.06));
  g.font = 'bold 84px "Segoe Print","Bradley Hand","Comic Sans MS",cursive';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillStyle = `rgba(${color},0.88)`; g.fillText(text, 0, 0);
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(0,0,0,${rnd(0.1, 0.5)})`; g.fillRect(Math.random() * 512, Math.random() * 160, rnd(1, 5), rnd(1, 3)); }
  g.globalCompositeOperation = 'source-over';
  const gr = g.createLinearGradient(0, 0, 0, 160);
  for (let i = 0; i < 5; i++) { // damlalar
    const x = rnd(80, 430), y0 = rnd(80, 110), l = rnd(14, 44);
    g.fillStyle = `rgba(${color},0.7)`; g.fillRect(x, y0, 3, l); g.beginPath(); g.arc(x + 1.5, y0 + l, 3, 0, 7); g.fill();
  }
  void gr;
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
}
