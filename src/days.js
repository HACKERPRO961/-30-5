import * as THREE from 'three';
import {
  G, P, $, sfx, say, toast, setTasks, taskDone, tasksLeft, showNote, openMinigame,
  newWorld, box, cyl, plane, floor, ceil, wall, lamp, sign, inter, hitbox, colBox,
  placePlayer, tween, wait, fadeTo, card, ambient, surf, plain, refreshFlash,
} from './core.js';
import { screen, cityTex, labelTex, stainMat } from './util.js';
import { wipeGame, keypadGame, timingGame } from './minigames.js';
import { buildFreight, startFreight, introFreight } from './freight.js';

const PI = Math.PI;
const KEMAL = 'Kemal Usta (telsiz)';
const steel = () => plain(0xa7adb3, { rough: 0.3, metal: 0.9 });
const dark = () => plain(0x1c1d20, { rough: 0.6, metal: 0.3 });

function glow(x, y, z, color, size) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, color); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  s.position.set(x, y, z); s.scale.set(size, size, 1);
  G.W.scene.add(s);
  return s;
}
function cityBackdrop(x, y, z, w, h, rotY = 0) {
  const m = new THREE.MeshBasicMaterial({ map: cityTex(), fog: false });
  return plane(w, h, [x, y, z], rotY, m);
}
function glassMat(opacity = 0.12) {
  return new THREE.MeshStandardMaterial({ color: 0x9fb8c8, roughness: 0.05, metalness: 0.9, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });
}

/* =====================================================================
   1. GÜN — Zemin kat lobisi: kapı sensörü
   ===================================================================== */
function buildLobby() {
  const S = G.S, H = 3.2;
  S.screws = 0;
  newWorld(0x06080b, 0.03, 0.4);
  floor(-6, -4.5, 6, 4.5, 'tile');
  ceil(-6, -4.5, 6, 4.5, H, 'ceiling');
  wall(-6, -4.5, 6, -4.5, H, 'paint', [{ at: 6, w: 1.2, h: 2.2 }]);
  wall(-6, 4.5, 6, 4.5, H, 'paint', [{ at: 9, w: 2.4, h: 2.4 }]);
  wall(-6, -4.5, -6, 4.5, H, 'paint');
  wall(6, -4.5, 6, 4.5, H, 'paint');

  // Dış mekân
  const road = new THREE.Mesh(new THREE.PlaneGeometry(90, 60), new THREE.MeshBasicMaterial({ color: 0x0a0b0f, fog: false }));
  road.rotation.x = -PI / 2; road.position.set(0, -0.03, 36); G.W.scene.add(road);
  cityBackdrop(0, 8, 46, 80, 20, PI);
  for (const lx of [-6, 6, 14]) {
    cyl(0.06, 5, [lx, 2.5, 9], dark());
    glow(lx, 5, 9, 'rgba(255,190,110,0.9)', 3.2);
  }
  // Giriş camı
  plane(2.4, 2.4, [3, 1.2, 4.5], 0, glassMat());
  for (const gx of [1.8, 3, 4.2]) box([0.06, 2.4, 0.1], [gx, 1.2, 4.5], steel(), { cast: false });
  box([2.5, 0.06, 0.1], [3, 2.4, 4.5], steel(), { cast: false });
  box([2.4, 0.04, 0.06], [3, 1.0, 4.5], steel(), { cast: false });
  colBox(1.8, 4.35, 4.2, 4.65, 0, 3);
  plane(0.8, 0.22, [3, 2.75, 4.38], PI, new THREE.MeshBasicMaterial({ map: labelTex(['ÇIKIŞ'], { w: 256, h: 72, bg: '#0a6b3a', fg: '#fff', font: 'bold 40px Arial' }) }));

  // Asansör çerçevesi, kapılar
  box([0.1, 2.3, 0.25], [-0.65, 1.15, -4.4], steel(), { cast: false });
  box([0.1, 2.3, 0.25], [0.65, 1.15, -4.4], steel(), { cast: false });
  box([1.4, 0.14, 0.25], [0, 2.27, -4.4], steel(), { cast: false });
  const door = { open: 0 };
  const dmat = surf('metal', 0.6, 2.1, { color: 0xd6dade });
  const dL = box([0.6, 2.15, 0.05], [-0.3, 1.075, -4.5], dmat, { cast: false });
  const dR = box([0.6, 2.15, 0.05], [0.3, 1.075, -4.5], dmat, { cast: false });
  G.W.updaters.push(() => { dL.position.x = -0.3 - 0.6 * door.open; dR.position.x = 0.3 + 0.6 * door.open; });
  // Kabin içi
  const cz = -5.4;
  box([1.9, 0.05, 1.6], [0, 0.025, cz], surf('rubber', 1.9, 1.6), { cast: false });
  box([0.06, 2.4, 1.6], [-0.93, 1.2, cz], surf('metal', 1.6, 2.4), { cast: false });
  box([0.06, 2.4, 1.6], [0.93, 1.2, cz], surf('metal', 1.6, 2.4), { cast: false });
  box([1.92, 2.4, 0.06], [0, 1.2, -6.2], surf('metal', 1.9, 2.4), { cast: false });
  box([1.9, 0.05, 1.6], [0, 2.4, cz], surf('metal', 1.9, 1.6), { cast: false });
  box([1.4, 0.04, 0.04], [0, 1.0, -6.15], steel(), { cast: false });
  lamp(0, 2.36, cz, { size: [0.8, 0.04, 0.3], int: 16 });
  colBox(-0.7, -4.75, 0.7, -4.25, 0, 3);
  // Kat göstergesi
  const ind = screen(128, 48);
  const drawInd = (t) => {
    ind.g.fillStyle = '#050505'; ind.g.fillRect(0, 0, 128, 48);
    ind.g.fillStyle = '#ff6a2a'; ind.g.font = 'bold 34px monospace';
    ind.g.textAlign = 'center'; ind.g.textBaseline = 'middle'; ind.g.fillText(t, 64, 26); ind.update();
  };
  drawInd('0');
  plane(0.5, 0.19, [0, 2.55, -4.39], 0, new THREE.MeshBasicMaterial({ map: ind.tex }));

  // Çağrı butonu
  box([0.14, 0.32, 0.02], [1.1, 1.1, -4.39], steel(), { cast: false });
  const btn = cyl(0.022, 0.02, [1.1, 1.17, -4.375], plain(0x442200, { emissive: 0xff7a20, ei: 1.5 }), { rot: [PI / 2, 0, 0] });
  cyl(0.022, 0.02, [1.1, 1.03, -4.375], plain(0x442200, { emissive: 0xff7a20, ei: 1.5 }), { rot: [PI / 2, 0, 0] });

  const closeAttempt = async () => {
    if (!S.cleaned) {
      await tween(door, 'open', 0.55, 1.0);
      sfx.buzz(); btn.material = plain(0x330000, { emissive: 0xff0000, ei: 2 });
      await wait(250);
      await tween(door, 'open', 1, 0.6);
      btn.material = plain(0x442200, { emissive: 0xff7a20, ei: 1.5 });
      return false;
    }
    await tween(door, 'open', 0, 1.8);
    sfx.clunk();
    return true;
  };
  const call = async () => {
    S.busy = true;
    if (door.open < 0.05) { sfx.ding(); drawInd('▲'); await tween(door, 'open', 1, 1.4); await wait(1500); } else { await wait(300); }
    const closed = await closeAttempt();
    drawInd('0');
    S.busy = false;
    if (!closed && !S.verified) {
      S.verified = true; taskDone('verify');
      say(KEMAL, 'Gördün işte, yarıya kadar kapanıp geri açılıyor. Alet çantası tezgâhta. Sensör kapağı kapının solunda.', 7500);
    } else if (closed && S.covered && !S.tested) {
      S.tested = true; taskDone('test'); sfx.ding();
      say(KEMAL, 'Tertemiz kapandı. Eline sağlık. Kartı bas, eve git.', 6000);
    }
  };
  hitbox([1.1, 1.1, -4.34], [0.2, 0.4, 0.16], {
    label: 'Çağrı butonuna bas',
    can: () => (S.busy ? 'Kapı hareket ediyor...' : true),
    run: call,
  });

  // Sensör modülü (kapının solunda)
  const px = -1.3, py = 1.15;
  box([0.3, 0.44, 0.03], [px, py, -4.395], dark(), { cast: false });
  const lensMat = plain(0x3a3224, { rough: 0.9 });
  const lens = cyl(0.055, 0.02, [px, py + 0.03, -4.375], lensMat, { rot: [PI / 2, 0, 0] });
  const led = cyl(0.012, 0.01, [px, py - 0.14, -4.375], plain(0x330000, { emissive: 0xff0000, ei: 2 }), { rot: [PI / 2, 0, 0] });
  const cover = box([0.38, 0.52, 0.02], [px, py, -4.36], surf('metal', 0.4, 0.5), { cast: false });
  const screwMesh = [];
  const coverHome = { y: py, z: -4.36 };
  [[-0.16, 0.22], [0.16, 0.22], [-0.16, -0.22], [0.16, -0.22]].forEach(([dx, dy]) => {
    const sm = cyl(0.018, 0.02, [px + dx, py + dy, -4.345], plain(0x888d92, { rough: 0.3, metal: 0.9 }), { rot: [PI / 2, 0, 0], seg: 8 });
    screwMesh.push(sm);
    const o = hitbox([px + dx, py + dy, -4.33], [0.1, 0.1, 0.1], {
      label: 'Vidayı sök', hold: 0.9,
      can: () => (S.tools ? true : 'Önce alet çantasını al.'),
      run: async () => {
        o.dead = true; sm.visible = false; S.screws++;
        if (S.screws === 4) {
          taskDone('screws'); sfx.clunk();
          tween(cover.position, 'y', 0.02, 0.5); tween(cover.position, 'z', -4.0, 0.5);
          await tween(cover.rotation, 'x', -PI / 2, 0.5);
          sfx.thud();
          say('', 'Kapak çıktı. Mercek yağ ve toz içinde.', 4000);
        }
      },
    });
  });
  hitbox([px, py + 0.03, -4.34], [0.28, 0.28, 0.1], {
    label: 'Sensör merceğini temizle',
    can: () => (S.screws === 4 && !S.cleaned ? true : false),
    run: () => openMinigame(wipeGame(() => {
      S.cleaned = true;
      lens.material = plain(0x66b7ff, { emissive: 0x3a8cff, ei: 1.2, rough: 0.1 });
      led.material = plain(0x003311, { emissive: 0x00ff66, ei: 2 });
      taskDone('lens'); toast('Mercek tertemiz.');
    })),
  });
  hitbox([px, py, -4.33], [0.4, 0.55, 0.1], {
    label: 'Kapağı yerine tak',
    can: () => (S.cleaned && !S.covered ? true : false),
    run: async () => {
      S.covered = true;
      cover.rotation.x = 0; cover.position.set(px, coverHome.y, coverHome.z);
      screwMesh.forEach((m) => { m.visible = true; });
      sfx.clunk(); taskDone('cover');
      say('', 'Şimdi çağrı butonuyla dene.', 3500);
    },
  });

  // Tezgâh ve alet çantası
  box([1.8, 0.9, 0.5], [-3.2, 0.45, -4.05], surf('metal', 1.8, 0.9, { color: 0x8c9096 }), { solid: true });
  box([1.9, 0.05, 0.56], [-3.2, 0.925, -4.05], surf('wood', 1.9, 0.56), { cast: false });
  cyl(0.08, 0.3, [-2.6, 1.1, -4.05], plain(0x222428), { rot: [0, 0, PI / 2], cast: false });
  const tb = box([0.5, 0.26, 0.26], [-3.3, 1.08, -4.05], plain(0xb3261e, { rough: 0.5 }));
  box([0.3, 0.03, 0.03], [-3.3, 1.23, -4.05], dark());
  hitbox([-3.3, 1.1, -4.05], [0.6, 0.35, 0.4], {
    label: 'Alet çantasını al',
    can: () => (S.verified ? true : 'Önce arızayı doğrula: çağrı butonuna bas.'),
    run() { S.tools = true; this.dead = true; tb.visible = false; sfx.pick(); taskDone('tools'); toast('Alet çantasını aldın.'); },
  });
  // Uyarı levhası
  box([0.4, 0.05, 0.3], [1.9, 0.025, -2.7], plain(0xd8b800), { cast: false });
  sign(1.9, 0.36, -2.7, 0.25, 0.4, 0.6, [{ t: 'DİKKAT', color: '#a00' }, 'KAYGAN', 'ZEMİN'], { bg: '#e8c200', font: 'bold 34px Arial', tw: 256, th: 384 });

  // Resepsiyon
  box([2.6, 1.04, 0.9], [4.0, 0.52, -2.6], surf('wood', 2.6, 1.04), { solid: true });
  box([2.7, 0.05, 1.0], [4.0, 1.065, -2.6], plain(0x2a2b2e, { rough: 0.3 }), { cast: false });
  box([0.5, 0.32, 0.04], [3.6, 1.3, -2.7], plain(0x111214, { emissive: 0x244a66, ei: 0.8 }), { cast: false });
  box([0.12, 0.2, 0.06], [3.6, 1.15, -2.7], dark(), { cast: false });
  box([0.22, 0.06, 0.16], [4.5, 1.12, -2.55], dark(), { cast: false });
  box([0.5, 0.08, 0.5], [4.0, 0.5, -3.55], plain(0x2a2e36), { cast: false });
  box([0.5, 0.55, 0.08], [4.0, 0.82, -3.8], plain(0x2a2e36), { cast: false });
  cyl(0.25, 0.4, [5.3, 0.2, -3.8], plain(0x6a4a34), { solid: true });
  for (const [ox, oy, oz] of [[0, 0.65, 0], [0.12, 0.85, 0.08], [-0.1, 0.8, -0.08]]) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8), plain(0x2d5a2a, { rough: 0.9 }));
    s.position.set(5.3 + ox, oy, -3.8 + oz); G.W.scene.add(s);
  }
  // Bekleme sırası
  for (let i = 0; i < 3; i++) box([0.5, 0.08, 0.5], [5.4, 0.45, 0.4 + i * 0.6], plain(0x3a3a40), { solid: true });
  box([0.1, 0.5, 1.7], [5.7, 0.7, 1.0], plain(0x3a3a40), { cast: false });

  // Duyuru panosu
  sign(-5.89, 1.7, -1.5, PI / 2, 0.9, 0.7, [{ t: 'DUYURU', font: 'bold 34px Arial' }, { t: 'Asansör bakım periyodu: 6 ay', font: '20px Arial' }, { t: 'Son kontrol: Nisan', font: '20px Arial' }, { t: 'Arıza için servisi arayın', font: '20px Arial' }], { bg: '#a67c52', fg: '#2a1a0a', tw: 360, th: 280 });

  // Lobi süsleri: arka duvar, süpürgelikler
  {
    const bb = plain(0x6b6558, { rough: 0.6 });
    box([12, 0.12, 0.04], [0, 0.06, -4.38], bb, { cast: false });
    box([12, 0.12, 0.04], [0, 0.06, 4.38], bb, { cast: false });
    box([0.04, 0.12, 9], [-5.88, 0.06, 0], bb, { cast: false });
    box([0.04, 0.12, 9], [5.88, 0.06, 0], bb, { cast: false });
    const clk = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.05, 24), plain(0xe8e4d8, { rough: 0.4 }));
    clk.rotation.x = PI / 2; clk.position.set(-3.2, 2.5, 4.36); G.W.scene.add(clk);
    box([0.025, 0.2, 0.02], [-3.2, 2.52, 4.32], plain(0x111111), { cast: false });
    const mh = box([0.02, 0.14, 0.02], [-3.17, 2.47, 4.32], plain(0x111111), { cast: false }); mh.rotation.z = 1.0;
    for (const [px, w2, c1] of [[-1.4, 0.8, 0x4a6a7a], [0.2, 0.6, 0x7a5a4a]]) {
      box([w2 + 0.1, 0.7, 0.04], [px, 1.8, 4.37], plain(0x2a1d12, { rough: 0.5 }), { cast: false });
      box([w2, 0.6, 0.02], [px, 1.8, 4.355], plain(c1, { rough: 0.9 }), { cast: false });
    }
    cyl(0.09, 0.5, [-4.6, 0.95, 4.2], plain(0xb01818, { rough: 0.35, metal: 0.3 }), { cast: false });
    box([0.3, 0.5, 0.02], [-4.6, 1.1, 4.36], plain(0xf0f0f0, { rough: 0.6 }), { cast: false });
    cyl(0.22, 0.45, [-5.3, 0.22, 3.6], plain(0x5a4030, { rough: 0.8 }), { solid: true });
    for (let i = 0; i < 9; i++) {
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), plain(0x2a5a30, { rough: 0.8 }));
      lf.scale.set(0.5, 1.8, 0.5); lf.position.set(-5.3 + Math.sin(i * 2.3) * 0.18, 0.75 + (i % 3) * 0.14, 3.6 + Math.cos(i * 2.3) * 0.18);
      lf.rotation.set(Math.sin(i) * 0.5, 0, Math.cos(i * 1.7) * 0.5); G.W.scene.add(lf);
    }
    box([1.8, 0.02, 0.9], [3, 0.01, 3.9], plain(0x2a2a30, { rough: 1 }), { cast: false });
    for (const [sx, sz, sc] of [[-2.2, 1.5, 1.3], [2.4, -1.0, 1.0], [4.0, 2.8, 1.6]]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stainMat('110,100,80'));
      m.scale.set(sc, sc, 1); m.rotation.set(-PI / 2, 0, sx); m.position.set(sx, 0.011, sz); G.W.scene.add(m);
    }
  }

  // Kart saati
  box([0.12, 0.5, 0.34], [-5.86, 1.3, 2.0], plain(0xb9b39a, { rough: 0.5 }), { cast: false });
  plane(0.24, 0.12, [-5.795, 1.4, 2.0], PI / 2, new THREE.MeshBasicMaterial({ map: labelTex(['MESAİ'], { w: 128, h: 64, bg: '#0a2a14', fg: '#5cff8a', font: 'bold 30px monospace' }) }));
  hitbox([-5.7, 1.3, 2.0], [0.4, 0.6, 0.5], {
    label: 'Kartı bas — mesaiyi bitir',
    can: () => (tasksLeft(['clock']) === 0 ? true : 'Önce iş emrini tamamla.'),
    run() { this.dead = true; sfx.clunk(); taskDone('clock'); endDay(1); },
  });

  // Işıklar
  lamp(0, 3.17, -1.0, { shadow: true, int: 40 });
  lamp(-3, 3.17, 1.5, { int: 28 });
  lamp(3.2, 3.17, 0.5, { int: 28, flicker: 0.08 });
}

function startLobby() {
  setTasks([
    { id: 'verify', text: 'Arızayı doğrula: çağrı butonu' },
    { id: 'tools', text: 'Alet çantasını al' },
    { id: 'screws', text: 'Sensör kapağının 4 vidasını sök' },
    { id: 'lens', text: 'Sensör merceğini temizle' },
    { id: 'cover', text: 'Kapağı yerine tak' },
    { id: 'test', text: 'Düzeltmeyi test et' },
    { id: 'clock', text: 'Kartı bas (mesaiyi bitir)' },
  ]);
  placePlayer(0, 3.5, 0);
  ambient({ hum: 0.05, air: 0.04, motor: 0 });
}
async function introLobby() {
  toast('WASD: yürü · Fare: bak · E / sol tık: etkileşim', 4500);
  await wait(1500);
  say(KEMAL, 'Günaydın Usta. Zemin kattaki asansörün kapısı yarı kapanıp geri açılıyor. Önce çağrı butonuyla sorunu kendin gör.', 8000);
}

/* =====================================================================
   2. GÜN — Çatıdaki makine dairesi
   ===================================================================== */
function buildMachine() {
  const S = G.S, H = 3.4;
  S.burnt = Math.floor(Math.random() * 3);
  S.spinSpeed = 0; S.oil = 0;
  newWorld(0x050607, 0.04, 0.3);
  floor(-5, -4, 5, 4, 'concrete');
  ceil(-5, -4, 5, 4, H, 'concrete');
  wall(-5, -4, 5, -4, H, 'concrete', [{ at: 7.5, w: 2.0, h: 2.5, y0: 1.2 }]);
  wall(-5, 4, 5, 4, H, 'concrete', [{ at: 2, w: 1.0, h: 2.1 }]);
  wall(-5, -4, -5, 4, H, 'concrete');
  wall(5, -4, 5, 4, H, 'concrete');
  // Makine dairesi: borular, kablo kanalı, yağ lekeleri
  {
    const pm = plain(0x6a6e70, { rough: 0.45, metal: 0.7 });
    for (const [py, pr] of [[2.75, 0.07], [2.5, 0.05]]) {
      cyl(pr, 7.6, [-4.88, py, 0], pm, { rot: [PI / 2, 0, 0], seg: 12, cast: false });
      for (const bz of [-3, -1, 1, 3]) box([0.1, 0.05, 0.12], [-4.92, py, bz], plain(0x3a3a3a, { metal: 0.5 }), { cast: false });
    }
    box([0.4, 0.05, 7.6], [3.6, H - 0.35, 0], plain(0x55595c, { rough: 0.5, metal: 0.6 }), { cast: false });
    for (let i = 0; i < 4; i++) cyl(0.012, 7.4, [3.5 + i * 0.07, H - 0.31, 0], plain(i % 2 ? 0x161616 : 0x7a1818, { rough: 0.6 }), { rot: [PI / 2, 0, 0], seg: 5, cast: false });
    for (const [sx, sz, sc, col] of [[0.2, 0.9, 1.5, '12,10,8'], [-1.8, -0.5, 0.9, '12,10,8'], [2.4, 2.2, 1.2, '40,30,20'], [-3.2, 1.5, 1.0, '40,30,20']]) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), stainMat(col));
      m.scale.set(sc, sc, 1); m.rotation.set(-PI / 2, 0, sx * 2); m.position.set(sx, 0.011, sz); G.W.scene.add(m);
    }
  }

  // Pencere ve şehir
  plane(2.0, 1.3, [2.5, 1.85, -4.0], 0, glassMat(0.1));
  cityBackdrop(2.5, 6, -18, 44, 11);
  // Giriş kapısı (kapalı)
  box([0.95, 2.1, 0.06], [-3, 1.05, 3.95], surf('metal', 0.95, 2.1, { color: 0x6a7076 }), { cast: false });
  colBox(-3.5, 3.8, -2.5, 4.2, 0, 3);

  // Makine: iki ayak + motor diski + çark
  box([0.4, 1.0, 1.0], [-1.0, 0.5, -0.7], surf('concrete', 0.4, 1.0), { solid: true });
  box([0.4, 1.0, 1.0], [1.0, 0.5, -0.7], surf('concrete', 0.4, 1.0), { solid: true });
  colBox(-0.8, -0.95, 0.8, -0.1, 0, 2);
  const motorMat = plain(0x2f5a4a, { rough: 0.5, metal: 0.4 });
  cyl(0.9, 0.5, [0, 1.5, -0.7], motorMat, { rot: [PI / 2, 0, 0], seg: 32 });
  cyl(0.3, 0.12, [0, 1.5, -0.42], steel(), { rot: [PI / 2, 0, 0] });
  const spinner = new THREE.Group();
  spinner.position.set(0, 1.5, -0.3);
  G.W.scene.add(spinner);
  const sh = cyl(0.55, 0.25, [0, 0, 0], plain(0x7d838a, { rough: 0.35, metal: 0.9 }), { rot: [PI / 2, 0, 0], parent: spinner, seg: 32 });
  sh.castShadow = true;
  for (let i = 0; i < 6; i++) {
    const sp = box([0.08, 1.0, 0.04], [0, 0, 0.14], plain(0x3a3e44), { parent: spinner, cast: false });
    sp.rotation.z = (i * PI) / 6;
  }
  // Halatlar ve zemindeki delikler
  for (const rx of [-0.55, 0.55]) {
    for (let i = 0; i < 4; i++) cyl(0.012, 1.5, [rx, 0.75, -0.42 + i * 0.06], plain(0x222222, { rough: 0.4, metal: 0.6 }), { seg: 6, cast: false });
    const hole = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), new THREE.MeshBasicMaterial({ color: 0x000000 }));
    hole.rotation.x = -PI / 2; hole.position.set(rx, 0.01, -0.3); G.W.scene.add(hole);
  }
  G.W.updaters.push((dt) => {
    S.spinSpeed += ((S.run ? 1.6 : 0) - S.spinSpeed) * Math.min(1, dt * 0.8);
    spinner.rotation.z -= S.spinSpeed * dt;
  });
  // Yağlama noktaları
  for (const sx of [-0.78, 0.78]) {
    cyl(0.055, 0.05, [sx, 1.5, -0.43], plain(0xb08a2a, { rough: 0.3, metal: 0.8 }), { rot: [PI / 2, 0, 0], seg: 12 });
    const o = hitbox([sx, 1.5, -0.38], [0.24, 0.24, 0.2], {
      label: 'Yatağı yağla', hold: 1.3,
      can: () => (S.oilCan ? true : 'Yağdanlığa ihtiyacın var. Raftan al.'),
      run() {
        o.dead = true; S.oil++; sfx.pick();
        if (S.oil === 2) { S.oiled = true; taskDone('oil'); toast('Yataklar yağlandı.'); }
      },
    });
  }

  // Kontrol dolabı
  box([1.4, 2.1, 0.5], [-3.3, 1.05, -3.7], surf('metal', 1.4, 2.1, { color: 0x6e757c }), { solid: true });
  const scr = screen(256, 150);
  const drawScr = (ok) => {
    scr.g.fillStyle = ok ? '#06180c' : '#1c0606'; scr.g.fillRect(0, 0, 256, 150);
    scr.g.fillStyle = ok ? '#5cff8a' : '#ff4a3a'; scr.g.textAlign = 'center'; scr.g.textBaseline = 'middle';
    scr.g.font = 'bold 40px monospace'; scr.g.fillText(ok ? 'HAZIR' : 'HATA E-47', 128, 55);
    scr.g.font = '20px monospace'; scr.g.fillText(ok ? 'Kart sıfırlandı' : 'KART KİLİTLİ', 128, 100);
    scr.update();
  };
  drawScr(false);
  plane(0.58, 0.34, [-3.3, 1.55, -3.445], 0, new THREE.MeshBasicMaterial({ map: scr.tex }));
  for (let i = 0; i < 3; i++) cyl(0.015, 0.01, [-3.65 + i * 0.1, 1.2, -3.44], plain(0x222222, { emissive: i === 0 ? 0xff2200 : 0x0044ff, ei: 1.6 }), { rot: [PI / 2, 0, 0], cast: false });
  hitbox([-3.3, 1.55, -3.38], [0.7, 0.45, 0.15], {
    label: 'Kontrol kartını sıfırla',
    can: () => {
      if (S.reset) return false;
      if (!S.fuseIn) return 'Kart enerjisiz. Önce sigortayı değiştir.';
      if (!S.oiled) return 'Defterde yazıyor: önce yatakları yağla.';
      return true;
    },
    run: () => openMinigame(keypadGame([3, 1, 4, 2], () => {
      S.reset = true; drawScr(true); taskDone('reset');
      say(KEMAL, 'Hata gitti. Şimdi ana şalteri çevir.', 4500);
    })),
  });

  // Ana şalter
  box([0.12, 0.6, 0.35], [-4.9, 1.3, -1.8], steel(), { cast: false });
  const lever = new THREE.Group(); lever.position.set(-4.8, 1.3, -1.8); G.W.scene.add(lever);
  box([0.04, 0.4, 0.04], [0, 0.2, 0], plain(0xb01818, { rough: 0.4 }), { parent: lever });
  lever.rotation.z = 0.5;
  const lamps = [
    lamp(-1.5, 3.37, 0.5, { shadow: true, int: 58 }),
    lamp(2.5, 3.37, -0.5, { int: 40, flicker: 0.12 }),
    lamp(-3, 3.37, 2.5, { int: 34 }),
  ];
  hitbox([-4.7, 1.35, -1.8], [0.3, 0.7, 0.4], {
    label: 'Ana şalteri çevir',
    can: () => (S.run ? false : (S.reset ? true : 'Kart hâlâ hatalı.')),
    run: async () => {
      S.run = true; sfx.lever();
      await tween(lever.rotation, 'z', -0.5, 0.4);
      sfx.thud();
      for (let i = 0; i < 4; i++) { lamps.forEach((l) => { l.mul = 0.2; }); await wait(90); lamps.forEach((l) => { l.mul = 1; }); await wait(110); }
      ambient({ motor: 0.07, pitch: 52 });
      taskDone('start');
      say(KEMAL, 'Motor dönüyor, ses düzgün. Mükemmel. Kapıyı kilitle, çık.', 6000);
    },
  });

  // Masa, bakım defteri
  box([0.8, 0.75, 1.6], [-4.5, 0.375, 1.8], surf('wood', 0.8, 1.6), { solid: true });
  box([0.3, 0.02, 0.22], [-4.45, 0.76, 1.55], plain(0xc9c2a8), { cast: false });
  box([0.3, 0.18, 0.12], [-4.55, 0.84, 2.2], dark(), { cast: false });
  cyl(0.04, 0.09, [-4.4, 0.8, 2.0], plain(0xdddddd), { cast: false });
  box([0.5, 0.08, 0.5], [-3.7, 0.5, 1.8], plain(0x2a2e36), { cast: false });
  lamp(-4.5, 1.25, 1.2, { size: [0.2, 0.05, 0.2], int: 10, color: 0xffd9a0 });
  hitbox([-4.45, 0.82, 1.55], [0.5, 0.2, 0.4], {
    label: 'Bakım defterini oku',
    run() {
      showNote('Bakım Defteri — Makine Dairesi',
        '<b>12 Ekim — gece vardiyası</b><br>Asansör 4 saniye boyunca takıldı. Kontrol kartında <b>E-47</b> hatası.<br>Sigorta kutusunda yanmış sigorta olabilir, bakın.<br><br><b>Kart sıfırlama:</b> yeni sigortayı taktıktan ve <b>yatakları yağladıktan</b> sonra tuş sırası <b>3 – 1 – 4 – 2</b>.<br>Sonra ana şalteri çevirin.<br><br><i>— Kemal</i>');
      if (!S.read) { S.read = true; taskDone('read'); }
    },
  });

  // Sigorta kutusu
  box([0.15, 1.1, 0.9], [4.82, 1.5, -1.5], steel(), { cast: false });
  const fdoor = box([0.04, 1.0, 0.8], [4.72, 1.5, -1.5], plain(0x7a8086, { rough: 0.4, metal: 0.7 }), { cast: false });
  hitbox([4.68, 1.5, -1.5], [0.2, 1.1, 0.9], {
    label: 'Sigorta kutusunu aç',
    can: () => (S.fuseBox ? false : (S.read ? true : 'Önce masadaki bakım defterini oku.')),
    run() { S.fuseBox = true; this.dead = true; fdoor.visible = false; sfx.clunk(); fuses.forEach((f) => { f.visible = true; }); },
  });
  const goodMat = plain(0xffcf6a, { emissive: 0xc08a20, ei: 0.6, rough: 0.2 });
  const burntMat = plain(0x14100c, { rough: 0.8 });
  const fuses = [];
  [-1.8, -1.5, -1.2].forEach((fz, i) => {
    const fm = cyl(0.045, 0.2, [4.75, 1.5, fz], i === S.burnt ? burntMat : goodMat, { rot: [0, 0, PI / 2], seg: 10, cast: false });
    fm.visible = false; fuses.push(fm);
    hitbox([4.7, 1.5, fz], [0.2, 0.3, 0.22], {
      label: () => (i === S.burnt && S.fuseOut ? (S.spare ? 'Yedek sigortayı tak' : 'Boş yuva (yedek sigorta lazım)') : 'Sigortayı incele'),
      can: () => (S.fuseBox ? (i === S.burnt && S.fuseIn ? false : true) : false),
      run() {
        if (i !== S.burnt) { toast('Bu sigorta sağlam görünüyor.'); return; }
        if (!S.fuseOut) {
          S.fuseOut = true; fm.visible = false; sfx.pick(); taskDone('fuseOut');
          toast('Cam kararmış, yanık. Çıkardın.');
        } else if (!S.spare) {
          toast('Yerine takacak yedek sigorta lazım. Alet çantasına bak.');
        } else {
          S.fuseIn = true; fm.material = goodMat; fm.visible = true; sfx.clunk(); taskDone('fuseIn');
        }
      },
    });
  });
  // Yedek sigorta için alet çantası
  const tbx = box([0.55, 0.3, 0.28], [3.5, 0.15, 2.8], plain(0xb3261e, { rough: 0.5 }), { solid: true });
  hitbox([3.5, 0.3, 2.8], [0.7, 0.5, 0.5], {
    label: 'Yedek sigorta al',
    can: () => (S.spare ? false : (S.fuseOut ? true : 'Neye ihtiyacın olduğunu bilmeden alma. Önce yanık sigortayı bul.')),
    run() { S.spare = true; sfx.pick(); toast('Yedek sigortayı aldın.'); tbx.rotation.y = 0.1; },
  });
  // Raf ve yağdanlık
  for (const sy of [0.5, 1.0, 1.5]) box([0.4, 0.05, 1.4], [4.75, sy, 2.5], surf('wood', 0.4, 1.4), { cast: false });
  box([0.05, 1.55, 0.05], [4.57, 0.78, 1.82], dark(), { cast: false });
  box([0.05, 1.55, 0.05], [4.57, 0.78, 3.18], dark(), { cast: false });
  const can = cyl(0.06, 0.16, [4.75, 1.11, 2.4], plain(0xd8b400, { rough: 0.4, metal: 0.5 }));
  cyl(0.012, 0.14, [4.7, 1.2, 2.4], steel(), { rot: [0, 0, 1.0], cast: false });
  box([0.4, 0.3, 0.3], [4.75, 0.67, 2.9], plain(0x5a4a32), { cast: false });
  hitbox([4.72, 1.12, 2.4], [0.35, 0.3, 0.3], {
    label: 'Yağdanlığı al',
    can: () => (S.oilCan ? false : (S.read ? true : 'Önce bakım defterini oku.')),
    run() { S.oilCan = true; can.visible = false; sfx.pick(); toast('Yağdanlığı aldın.'); },
  });
  // Süs: boru
  cyl(0.07, 8, [0, 3.0, 3.6], steel(), { rot: [0, 0, PI / 2], cast: false });
  cyl(0.05, 6, [-4.8, 3.0, 0], steel(), { rot: [PI / 2, 0, 0], cast: false });
  sign(-3.3, 2.25, -3.43, 0, 0.9, 0.3, ['KONTROL PANOSU'], { bg: '#222', fg: '#f2c14e', font: 'bold 34px Arial', tw: 384, th: 128 });

  // Çıkış kapısı
  hitbox([-3, 1.1, 3.88], [1.0, 2.2, 0.3], {
    label: 'Kapıyı kilitle — mesaiyi bitir',
    can: () => (tasksLeft(['exit']) === 0 ? true : 'Önce iş emrini tamamla.'),
    run() { this.dead = true; sfx.clunk(); taskDone('exit'); endDay(2); },
  });
}
function startMachine() {
  setTasks([
    { id: 'read', text: 'Bakım defterini oku (masa)' },
    { id: 'fuseOut', text: 'Yanık sigortayı bul ve çıkar' },
    { id: 'fuseIn', text: 'Yedek sigortayı tak' },
    { id: 'oil', text: 'Motor yataklarını yağla (2 nokta)' },
    { id: 'reset', text: 'Kontrol kartını sıfırla' },
    { id: 'start', text: 'Ana şalteri çevir' },
    { id: 'exit', text: 'Kapıyı kilitle ve çık' },
  ]);
  placePlayer(-3, 3.0, 0);
  ambient({ hum: 0.06, air: 0.05, motor: 0 });
}
async function introMachine() {
  await wait(1200);
  say(KEMAL, 'Usta, makine dairesi çatıda. Dün gece asansör dört saniye takılı kalmış. Masadaki bakım defterine bir bak.', 8000);
}

/* =====================================================================
   3. GÜN — Kuyu dibi (tamponlar) ve kabin
   ===================================================================== */
function buildPit() {
  const S = G.S, H = 4.4;
  S.buf = 0; S.clips = 0;
  newWorld(0x040506, 0.055, 0.26);
  floor(-3.5, -3.5, 3.5, 3.5, 'concrete');
  ceil(-3.5, -3.5, 3.5, 3.5, H, 'concrete');
  wall(-3.5, -3.5, 3.5, -3.5, H, 'concrete');
  wall(-3.5, 3.5, 3.5, 3.5, H, 'concrete', [{ at: 3.5, w: 1.0, h: 2.1 }]);
  wall(-3.5, -3.5, -3.5, 3.5, H, 'concrete');
  wall(3.5, -3.5, 3.5, 3.5, H, 'concrete');
  box([0.95, 2.1, 0.06], [0, 1.05, 3.45], surf('metal', 0.95, 2.1, { color: 0x555a60 }), { cast: false });
  colBox(-0.5, 3.3, 0.5, 3.7, 0, 3);

  // Kabinin alt tarafı
  box([2.0, 2.2, 1.8], [0, 3.3, 0], surf('metal', 2.0, 2.2, { color: 0x9aa0a6 }), { solid: true });
  box([2.02, 0.3, 0.05], [0, 2.35, 0.92], surf('hazard', 2.0, 0.3), { cast: false });
  box([1.8, 0.12, 0.12], [0, 2.14, -0.5], dark(), { cast: false });
  box([1.8, 0.12, 0.12], [0, 2.14, 0.5], dark(), { cast: false });
  // Raylar
  for (const rx of [-1.25, 1.25]) {
    box([0.1, H, 0.3], [rx, H / 2, 0], plain(0x7b8087, { rough: 0.35, metal: 0.8 }), { solid: true });
    box([0.04, H, 0.12], [rx + (rx < 0 ? 0.07 : -0.07), H / 2, 0], plain(0x6a7076, { rough: 0.35, metal: 0.8 }), { cast: false });
  }
  // Tamponlar
  const bufMat = plain(0xd9a400, { rough: 0.5, metal: 0.3 });
  [-0.55, 0.55].forEach((bx, i) => {
    box([0.5, 0.05, 0.5], [bx, 0.025, 0], dark(), { cast: false });
    cyl(0.15, 0.5, [bx, 0.3, 0], bufMat, { solid: true });
    cyl(0.09, 0.4, [bx, 0.75, 0], plain(0xcfd3d8, { rough: 0.15, metal: 1 }), { cast: false });
    box([0.35, 0.04, 0.35], [bx, 0.97, 0], steel(), { cast: false });
    const o = hitbox([bx, 0.55, 0], [0.5, 0.9, 0.5], {
      label: 'Tamponu kontrol et', hold: 1.6,
      run() {
        o.dead = true; S.buf++; sfx.pick();
        toast('Piston temiz, yağ seviyesi normal. Tampon sağlam.');
        if (S.buf === 2) {
          S.bufDone = true; taskDone('buffers');
          say(KEMAL, 'Tamponlar sağlam, iyi. Umarım hiçbir zaman çalışmazlar ama son durak onlar. Şimdi ray kelepçeleri.', 8000);
        }
      },
    });
  });
  sign(0, 1.5, -3.39, 0, 1.6, 0.6, [{ t: 'TAMPON BÖLGESİ', color: '#a00' }, { t: 'Yağ seviyesi: MAKS ▮▮▮▮▯', font: '20px Arial' }], { bg: '#e8c200', font: 'bold 30px Arial', tw: 512, th: 192 });
  // Su birikintisi
  const pud = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x1a2228, roughness: 0.03, metalness: 0.7 }));
  pud.rotation.x = -PI / 2; pud.position.set(1.8, 0.006, 1.8); G.W.scene.add(pud);
  cyl(0.08, 7, [-3.3, 3.2, 0.6], steel(), { rot: [PI / 2, 0, 0], cast: false });

  // Ray kelepçeleri
  [[-1.25, 0.9], [1.25, 1.35], [-1.25, 1.8]].forEach(([cx, cy], i) => {
    const cm = box([0.16, 0.1, 0.36], [cx, cy, 0], plain(0x806a00, { rough: 0.5, metal: 0.4 }), { cast: false });
    const o = hitbox([cx, cy, 0], [0.4, 0.3, 0.55], {
      label: 'Ray kelepçesini sık',
      can: () => (S.bufDone ? true : 'Önce tamponları kontrol et.'),
      run: () => openMinigame(timingGame(0.9 + i * 0.35, () => {
        o.dead = true; S.clips++;
        cm.material = plain(0x2a7a3a, { rough: 0.4, metal: 0.5 });
        toast(`Kelepçe sıkıldı (${S.clips}/3)`);
        if (S.clips === 3) {
          S.clipDone = true; taskDone('clips');
          say(KEMAL, 'Güzel. Batı duvarındaki servis merdiveninden kabine çık, 5. kata test sürüşü yap.', 7500);
        }
      })),
    });
  });

  // Servis merdiveni
  for (const lz of [-0.3, 0.3]) box([0.05, 2.5, 0.05], [-3.33, 1.25, lz], steel(), { cast: false });
  for (let y = 0.3; y < 2.4; y += 0.3) cyl(0.015, 0.6, [-3.33, y, 0], steel(), { rot: [PI / 2, 0, 0], seg: 6, cast: false });
  sign(-3.39, 2.8, 0, PI / 2, 0.8, 0.3, ['KABİN ERİŞİMİ'], { bg: '#223', fg: '#f2c14e', font: 'bold 30px Arial', tw: 384, th: 128 });
  hitbox([-3.15, 1.2, 0], [0.4, 2.4, 0.9], {
    label: 'Servis merdivenine çık',
    can: () => (S.clipDone ? true : (S.bufDone ? 'Önce üç ray kelepçesini sık.' : 'Önce tamponları kontrol et.')),
    run: () => enterCabin(),
  });

  // Işıklar
  lamp(-3.1, 3.7, -3.1, { int: 28, size: [0.2, 0.2, 0.2] });
  lamp(3.1, 3.7, -3.1, { int: 26, size: [0.2, 0.2, 0.2], flicker: 0.2 });
  lamp(-3.1, 3.7, 3.1, { int: 24, size: [0.2, 0.2, 0.2] });
  lamp(3.1, 3.7, 3.1, { int: 34, size: [0.2, 0.2, 0.2], shadow: true });
  lamp(1.9, 2.0, 1.5, { int: 18, size: [0.14, 0.14, 0.14], color: 0xffcf8a });

  buildCabinAndCorridor();
}

function buildCabinAndCorridor() {
  const S = G.S;
  const X = 30;
  // Kabin
  const mt = (w, h) => surf('metal', w, h, { color: 0xd8dce0 });
  box([1.8, 0.05, 1.6], [X, 0.025, 0], surf('rubber', 1.8, 1.6), { cast: false });
  box([0.06, 2.4, 1.6], [X - 0.9, 1.2, 0], mt(1.6, 2.4), { cast: false });
  box([0.06, 2.4, 1.6], [X + 0.9, 1.2, 0], mt(1.6, 2.4), { cast: false });
  box([1.86, 2.4, 0.06], [X, 1.2, 0.8], mt(1.8, 2.4), { cast: false });
  box([1.86, 0.05, 1.6], [X, 2.4, 0], mt(1.8, 1.6), { cast: false });
  box([1.4, 0.04, 0.04], [X, 1.0, 0.74], steel(), { cast: false });
  colBox(X - 0.93, -0.75, X - 0.87, 0.83, 0, 3);
  colBox(X + 0.87, -0.75, X + 0.93, 0.83, 0, 3);
  colBox(X - 0.9, 0.77, X + 0.9, 0.83, 0, 3);
  box([0.4, 2.4, 0.06], [X - 0.7, 1.2, -0.8], mt(0.4, 2.4), { cast: false });
  box([0.4, 2.4, 0.06], [X + 0.7, 1.2, -0.8], mt(0.4, 2.4), { cast: false });
  box([1.0, 0.0001, 0.06], [X, 2.4, -0.8], mt(1, 0.1), { cast: false });
  const cabDoor = { open: 0 };
  const dmat = surf('metal', 0.5, 2.3, { color: 0xe4e7ea });
  const cL = box([0.5, 2.3, 0.05], [X - 0.25, 1.15, -0.8], dmat, { cast: false });
  const cR = box([0.5, 2.3, 0.05], [X + 0.25, 1.15, -0.8], dmat, { cast: false });
  G.W.updaters.push(() => { cL.position.x = X - 0.25 - 0.45 * cabDoor.open; cR.position.x = X + 0.25 + 0.45 * cabDoor.open; });
  const doorCol = colBox(X - 0.5, -0.9, X + 0.5, -0.7, 0, 3);
  const cabLamp = lamp(X, 2.36, 0, { size: [0.9, 0.04, 0.35], int: 24, shadow: true });
  // Gösterge
  const disp = screen(128, 64);
  const drawDisp = (t, col = '#ff6a2a') => {
    disp.g.fillStyle = '#050505'; disp.g.fillRect(0, 0, 128, 64);
    disp.g.fillStyle = col; disp.g.font = 'bold 44px monospace';
    disp.g.textAlign = 'center'; disp.g.textBaseline = 'middle'; disp.g.fillText(t, 64, 34); disp.update();
  };
  drawDisp('0');
  plane(0.5, 0.25, [X, 2.12, -0.765], 0, new THREE.MeshBasicMaterial({ map: disp.tex }));
  // Buton paneli
  const pan = screen(112, 360);
  const drawPan = (lit) => {
    pan.g.fillStyle = '#2a2d31'; pan.g.fillRect(0, 0, 112, 360);
    pan.g.textAlign = 'center'; pan.g.textBaseline = 'middle'; pan.g.font = 'bold 22px Arial';
    for (let i = 0; i < 6; i++) {
      const n = 5 - i, y = 52 + i * 52, on = lit === n;
      pan.g.fillStyle = on ? '#ffb040' : '#111'; pan.g.beginPath(); pan.g.arc(56, y, 21, 0, 7); pan.g.fill();
      pan.g.strokeStyle = '#999'; pan.g.lineWidth = 3; pan.g.stroke();
      pan.g.fillStyle = on ? '#321' : '#ddd'; pan.g.fillText(String(n), 56, y + 1);
    }
    pan.update();
  };
  drawPan(-1);
  plane(0.28, 0.9, [X + 0.865, 1.3, -0.4], -PI / 2, new THREE.MeshBasicMaterial({ map: pan.tex }));
  for (let i = 0; i < 6; i++) {
    const n = 5 - i, y = 1.75 - (52 + i * 52) / 400;
    hitbox([X + 0.8, y, -0.4], [0.12, 0.11, 0.2], {
      label: n === 5 ? '5. kat düğmesi' : `${n}. kat düğmesi`,
      can: () => (S.riding ? false : true),
      run() {
        if (n !== 5) { toast('Bugünkü test sürüşü 5. kata.'); return; }
        ride();
      },
    });
  }

  // Koridor (5. kat)
  const CZ = -7;
  floor(X - 1.5, CZ, X + 1.5, -0.8, 'tile');
  ceil(X - 1.5, CZ, X + 1.5, -0.8, 3.0, 'ceiling');
  wall(X - 1.5, -0.8, X - 1.5, CZ, 3.0, 'paint');
  wall(X + 1.5, -0.8, X + 1.5, CZ, 3.0, 'paint');
  wall(X - 1.5, CZ, X + 1.5, CZ, 3.0, 'paint', [{ at: 1.5, w: 2.0, h: 2.4, y0: 0.9 }]);
  wall(X - 1.5, -0.8, X - 0.9, -0.8, 3.0, 'paint');
  wall(X + 0.9, -0.8, X + 1.5, -0.8, 3.0, 'paint');
  box([1.0, 0.6, 0.1], [X, 2.7, -0.8], surf('paint', 1, 0.6), { cast: false });
  plane(2.0, 1.5, [X, 1.65, CZ], 0, glassMat(0.1));
  cityBackdrop(X, 3, CZ - 14, 40, 10);
  [[-2.6, 'ŞİRKET 501'], [-5.2, 'ŞİRKET 502']].forEach(([dz, name]) => {
    box([0.06, 2.1, 0.9], [X + 1.43, 1.05, dz], surf('wood', 0.9, 2.1, { color: 0xb0a090 }), { cast: false });
    sign(X + 1.39, 1.65, dz, -PI / 2, 0.4, 0.14, [name], { bg: '#ddd', font: 'bold 22px Arial', tw: 256, th: 90 });
  });
  lamp(X, 2.97, -3.0, { int: 36 });
  lamp(X, 2.97, -5.5, { int: 28, flicker: 0.03 });
  // Kart saati
  box([0.12, 0.5, 0.34], [X - 1.44, 1.3, -4.0], plain(0xb9b39a, { rough: 0.5 }), { cast: false });
  hitbox([X - 1.3, 1.3, -4.0], [0.4, 0.6, 0.5], {
    label: 'Kartı bas — mesaiyi bitir',
    can: () => (S.arrived ? true : 'Önce test sürüşünü tamamla.'),
    run() { this.dead = true; sfx.clunk(); taskDone('clock'); endDay(3); },
  });

  // Test sürüşü
  S.cab = { door: cabDoor, doorCol, drawDisp, drawPan, lamp: cabLamp };
}

async function enterCabin() {
  const S = G.S;
  P.frozen = true;
  await fadeTo(1, 600);
  placePlayer(30, 0.35, 0);
  taskDone('enter');
  ambient({ hum: 0.04, air: 0.02 });
  await fadeTo(0, 800);
  P.frozen = false;
  say('', 'Kabin yerinde duruyor. Sağdaki panelden 5. kata bas.', 5000);
  S.inCabin = true;
}

async function ride() {
  const S = G.S, cab = S.cab;
  S.riding = true; P.noMove = true;
  cab.drawPan(5); sfx.click();
  await wait(500);
  sfx.ding();
  await tween(cab.door, 'open', 0, 1.4);
  sfx.clunk();
  cab.doorCol.disabled = false;
  await wait(700);
  ambient({ motor: 0.05, pitch: 60 }); sfx.rumble();
  G.shake = 0.008;
  for (let f = 1; f <= 5; f++) {
    await wait(1500);
    if (f === 3) {
      cab.drawDisp('--', '#ff2a2a'); sfx.buzz();
      cab.lamp.mul = 0.3; await wait(350); cab.lamp.mul = 1;
      await wait(150);
    }
    cab.drawDisp(String(f));
  }
  G.shake = 0; ambient({ motor: 0 });
  await wait(600);
  sfx.ding();
  cab.drawPan(-1);
  cab.doorCol.disabled = true;
  await tween(cab.door, 'open', 1, 1.4);
  P.noMove = false; S.riding = false; S.arrived = true;
  taskDone('ride');
  say(KEMAL, 'Pırıl pırıl çalışıyor. Kartı bas, eve git Usta. Yarın büyük bina.', 7000);
}
function startPit() {
  setTasks([
    { id: 'buffers', text: 'Tamponları kontrol et (2)' },
    { id: 'clips', text: 'Ray kelepçelerini sık (3)' },
    { id: 'enter', text: 'Servis merdiveniyle kabine çık' },
    { id: 'ride', text: 'Test sürüşü: 5. kat' },
    { id: 'clock', text: 'Kartı bas (mesaiyi bitir)' },
  ]);
  placePlayer(0, 2.6, 0);
  ambient({ hum: 0.05, air: 0.07, motor: 0 });
}
async function introPit() {
  await wait(1200);
  say(KEMAL, 'Bugün kuyu dibindeyiz. Sigorta müfettişi geliyor; tamponlara ve ray kelepçelerine bakmadan çıkma.', 8000);
}

/* =====================================================================
   Gün akışı
   ===================================================================== */
const BUILD = [buildLobby, buildMachine, buildPit, buildFreight];
const START = [startLobby, startMachine, startPit, startFreight];
const INTRO = [introLobby, introMachine, introPit, introFreight];
const TITLES = ['Zemin Kat — Kapı Sensörü', 'Makine Dairesi — Motor', 'Kuyu Dibi — Tamponlar', 'Merkez Plaza — Yük Asansörü'];
const ENDS = [
  'Kapı sensörü onarıldı.',
  'Motor yeniden çalışıyor.',
  'Tamponlar sağlam. Kabin 5. kata çıktı.',
];

export async function runDay(n) {
  G.day = n;
  try { localStorage.setItem('a305_day', String(n)); } catch (e) { /* yok say */ }
  P.frozen = true; P.noMove = false; G.shake = 0; P.h = 1.65;
  G.horror = false; G.taskTitle = null; refreshFlash();
  G.tweens.length = 0; G.S = {};
  $('hud').classList.remove('on');
  await fadeTo(1, 500);
  BUILD[n - 1]();
  START[n - 1]();
  await card(`${n}. GÜN`, TITLES[n - 1], 3000);
  $('hud').classList.add('on');
  await fadeTo(0, 1200);
  P.frozen = false;
  INTRO[n - 1]();
}

export async function endDay(n) {
  P.frozen = true;
  ambient({ hum: 0, air: 0, motor: 0 });
  await fadeTo(1, 1400);
  $('hud').classList.remove('on');
  await card(`${n}. GÜN TAMAMLANDI`, ENDS[n - 1], 3600);
  if (n < 4) runDay(n + 1);
}
