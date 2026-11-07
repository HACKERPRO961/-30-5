import * as THREE from 'three';
import { G, sfx, box, colBox, tween, wait, surf, plain, plane } from './core.js';
import { screen, labelTex } from './util.js';
import { DX, DY, H } from './maze.js';

const PI = Math.PI;
export const WALL = 0xb4a45a;

/* Yük asansörü kabini: labirentin çıkmaz bir hücresinde. Kapılar d yönüne açılır. */
export function buildCabin(W, { cx, cz, d, sealed }) {
  const ox = DX[d], oz = DY[d];
  const th = Math.atan2(-ox, -oz);
  const bx = cx - ox * 0.2, bz = cz - oz * 0.2;
  const g = new THREE.Group();
  g.position.set(bx, 0, bz); g.rotation.y = th; W.scene.add(g);
  const cs = Math.cos(th), sn = Math.sin(th);
  const world = (lx, lz) => [bx + lx * cs + lz * sn, bz - lx * sn + lz * cs];
  const lcol = (x1, z1, x2, z2) => {
    const a = world(x1, z1), b = world(x2, z2);
    return colBox(a[0], a[1], b[0], b[1], 0, 3);
  };
  const mt = (w, h) => surf('metal', w, h, { color: 0x8a8e92 });
  const wm = (w, h) => surf('paint', w, h, { color: WALL });
  const P_ = { parent: g, cast: false };
  box([2.6, 0.06, 3.2], [0, 0.03, 0], surf('rubber', 2.6, 3.2), P_);
  box([0.06, 2.8, 3.2], [-1.3, 1.4, 0], mt(3.2, 2.8), P_);
  box([0.06, 2.8, 3.2], [1.3, 1.4, 0], mt(3.2, 2.8), P_);
  box([2.6, 2.8, 0.06], [0, 1.4, 1.6], mt(2.6, 2.8), P_);
  box([2.6, 0.06, 3.2], [0, 2.8, 0], mt(2.6, 3.2), P_);
  box([0.4, 2.8, 0.06], [-1.1, 1.4, -1.6], mt(0.4, 2.8), P_);
  box([0.4, 2.8, 0.06], [1.1, 1.4, -1.6], mt(0.4, 2.8), P_);
  box([1.8, 0.4, 0.06], [0, 2.6, -1.6], mt(1.8, 0.4), P_);
  box([2.4, 0.05, 0.05], [0, 1.0, 1.55], plain(0xa7adb3, { rough: 0.3, metal: 0.9 }), P_);
  // kabin ile hücre duvarı arasındaki boşluklar
  for (const s of [-1, 1]) {
    box([0.575, H, 3.75], [s * 1.5875, H / 2, -0.2], wm(3.75, H), { parent: g });
    lcol(s * 1.3, -2.075, s * 1.875, 1.675);
  }
  lcol(-1.3, 1.57, 1.3, 1.63);
  lcol(-1.3, -1.65, -0.9, -1.55); lcol(0.9, -1.65, 1.3, -1.55);

  // kapılar
  const door = { open: sealed ? 0 : 1 };
  const dmat = surf('metal', 0.9, 2.4, { color: 0xb8bcc0 });
  const dL = box([0.9, 2.4, 0.06], [-0.45, 1.2, -1.65], dmat, P_);
  const dR = box([0.9, 2.4, 0.06], [0.45, 1.2, -1.65], dmat, P_);
  const doorCol = lcol(-0.9, -1.75, 0.9, -1.5);
  doorCol.disabled = !sealed;
  W.updaters.push(() => { dL.position.x = -0.45 - 0.85 * door.open; dR.position.x = 0.45 + 0.85 * door.open; });

  // gösterge: -30,5
  const disp = screen(128, 64);
  disp.g.fillStyle = '#050505'; disp.g.fillRect(0, 0, 128, 64);
  disp.g.fillStyle = '#ff3a2a'; disp.g.font = 'bold 36px monospace';
  disp.g.textAlign = 'center'; disp.g.textBaseline = 'middle'; disp.g.fillText('-30,5', 64, 34); disp.update();
  plane(0.6, 0.3, [0, 2.3, -1.56], 0, new THREE.MeshBasicMaterial({ map: disp.tex }), { parent: g });

  // iç ışık
  const lampM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1d6, emissiveIntensity: 2 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.35), lampM);
  lamp.position.set(0, 2.77, 0); g.add(lamp);
  const L = new THREE.PointLight(0xfff1d6, 0, 0, 2);
  L.position.set(0, 2.4, 0.2); g.add(L);
  const lm = { mul: sealed ? 0 : 1 };
  W.updaters.push(() => { L.intensity = 22 * lm.mul; lampM.emissiveIntensity = 2 * lm.mul; });

  // dış kapatma paneli (tavandan iner)
  const panel = box([3.7, H, 0.2], [0, sealed ? H / 2 : H * 1.5 + 0.2, -2.0], wm(3.7, H), { parent: g });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.5), new THREE.MeshStandardMaterial({
    map: labelTex([{ t: 'YÜK ASANSÖRÜ 2', font: 'bold 34px Arial' }, { t: '— hizmet dışı —', font: '24px Arial', color: '#b04a3a' }], { w: 512, h: 170, bg: '#1d2a3a', fg: '#d8d6cf' }), roughness: 0.8,
  }));
  sign.position.set(0, 0.1, -0.106); sign.rotation.y = PI; panel.add(sign);
  const panelCol = lcol(-1.9, -2.1, 1.9, -1.9);
  panelCol.disabled = !sealed;

  const cab = {
    sealed, sealing: false, bx, bz, ox, oz, th, world,
    along: (x, z) => (x - bx) * ox + (z - bz) * oz,
    startPos: () => world(0, 0.2),
    local: (x, z) => { const dx = x - bx, dz = z - bz; return [dx * cs - dz * sn, dx * sn + dz * cs]; },
    async seal() {
      if (cab.sealed || cab.sealing) return;
      cab.sealing = true;
      sfx.rumble(); G.shake = 0.012;
      tween(lm, 'mul', 0, 1.4);
      await tween(door, 'open', 0, 1.7);
      sfx.clunk(); doorCol.disabled = false;
      await wait(500);
      sfx.rumble();
      G.shake = 0.02;
      await tween(panel.position, 'y', H / 2, 1.8, (t) => t * t);
      panelCol.disabled = false;
      sfx.thud(); G.shake = 0.06;
      await wait(350); G.shake = 0;
      cab.sealed = true; cab.sealing = false;
    },
    async unseal() {
      sfx.rumble(); G.shake = 0.02;
      panelCol.disabled = true;
      await tween(panel.position, 'y', H * 1.5 + 0.2, 2.4);
      G.shake = 0; sfx.clunk();
      doorCol.disabled = true;
      tween(lm, 'mul', 1, 1);
      await tween(door, 'open', 1, 2.2);
      cab.sealed = false;
    },
  };
  return cab;
}
