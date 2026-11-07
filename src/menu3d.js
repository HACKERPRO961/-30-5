import * as THREE from 'three';
import { G, P, $, camera, newWorld, box, floor, ceil, sfx, tween, wait, plain, surf, initAudio, ambient } from './core.js';
import { buildMonster, animateMonster, KINDS } from './monsters.js';

const KIND_LIST = ['blind', 'deaf', 'super', 'statue', 'tracker'];
const CX0 = 3.6, GAP = 2.35, CZ = -5.2;
let state = null, listening = false;
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

/* Ana menü: karanlık bir bodrum, kafeslerde canavarlar. Birine dokunursan... */
export function buildMenu() {
  const W = newWorld(0x010102, 0.06, 0.11);
  G.tweens.length = 0;
  const camX = CX0 + GAP * 2;
  box([28, 0.2, 14], [camX, -0.1, -1], plain(0x161618, { rough: 0.85 }), { cast: false });
  ceil(camX - 14, -8, camX + 14, 6, 3.6, 'concrete');
  box([28, 3.6, 0.3], [camX, 1.8, -7.2], surf('concrete', 28, 3.6, { color: 0x666666 }), {});
  box([0.3, 3.6, 14], [camX - 14, 1.8, -1], surf('concrete', 14, 3.6, { color: 0x666666 }), {});
  box([0.3, 3.6, 14], [camX + 14, 1.8, -1], surf('concrete', 14, 3.6, { color: 0x666666 }), {});
  // boru ve kablolar
  for (const [y, r] of [[3.1, 0.09], [2.75, 0.05]]) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 28, 10), plain(0x30343a, { rough: 0.5, metal: 0.7 }));
    p.rotation.z = Math.PI / 2; p.position.set(camX, y, -6.95); W.scene.add(p);
  }
  const barM = plain(0x2a2c30, { rough: 0.5, metal: 0.8 });
  const cages = [];
  KIND_LIST.forEach((k, i) => {
    const cx = CX0 + GAP * i;
    const g = new THREE.Group(); g.position.set(cx, 0, CZ); W.scene.add(g);
    // zemin ve çatı
    box([2.1, 0.1, 2.1], [0, 0.05, 0], plain(0x1b1b1d, { rough: 0.9 }), { parent: g, cast: false });
    box([2.2, 0.1, 2.2], [0, 2.85, 0], barM, { parent: g, cast: false });
    box([2.1, 2.8, 0.06], [0, 1.4, -1.05], plain(0x0c0c0d, { rough: 1 }), { parent: g, cast: false });
    // ön parmaklıklar (kırılabilir) + yan parmaklıklar
    const front = new THREE.Group(); g.add(front);
    for (let b = 0; b < 10; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 2.8, 6), barM);
      bar.position.set(-1.0 + b * (2.0 / 9), 1.4, 1.05); front.add(bar);
    }
    for (const y of [0.9, 1.9]) box([2.1, 0.04, 0.04], [0, y, 1.05], barM, { parent: front, cast: false });
    for (const sx of [-1.05, 1.05]) for (let b = 0; b < 6; b++) {
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 2.8, 6), barM);
      bar.position.set(sx, 1.4, -0.9 + b * 0.36); g.add(bar);
    }
    // canavar
    const mon = { kind: k, b: buildMonster(k), x: cx, z: CZ - 0.1, fa: 0, fx: 0, fz: 1, ph: Math.random() * 6, spd: 0, state: 'patrol', scream: false };
    W.scene.add(mon.b.g);
    // etiket (isim levhası)
    const hit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.9, 2.2), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.set(0, 1.45, 0); hit.userData.cage = i; g.add(hit);
    cages.push({ k, g, front, mon, hit, home: { x: cx, z: CZ - 0.1 }, rattle: 0, hot: 0, baseX: cx });
  });
  // ışıklar
  const key = new THREE.PointLight(0xaab4c8, 0, 0, 2); key.position.set(camX, 3.0, -2.8); W.scene.add(key);
  const hov = new THREE.PointLight(0xff4a30, 0, 0, 2); hov.position.set(camX, 2.2, -3.2); W.scene.add(hov);
  const lampM = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xdfe8ff, emissiveIntensity: 2 });
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.3), lampM); lamp.position.set(camX, 3.55, -1.2); W.scene.add(lamp);

  P.frozen = true; P.noMove = true; P.autoV = null;
  P.x = camX; P.z = 0.6; P.h = 1.65; P.yaw = 0; P.pitch = -0.03; P.cr = 0;
  G.fov = 72; G.shake = 0; G.armPose = 0;

  state = { cages, hover: -1, busy: false, key, hov, lampM, nextTwitch: 6 + Math.random() * 6, camX };
  W.updaters.push((dt, t) => {
    const s = state;
    // sallanan kamera
    P.yaw = Math.sin(t * 0.13) * 0.035; P.pitch = -0.03 + Math.sin(t * 0.09) * 0.012;
    // titreyen lamba
    const fl = Math.sin(t * 31) * Math.sin(t * 7.1) > 0.8 ? 0.2 : 1;
    s.key.intensity = (s.busy ? 12 : 30) * fl; s.lampM.emissiveIntensity = 2 * fl;
    s.nextTwitch -= dt;
    if (s.nextTwitch <= 0 && !s.busy) {
      s.nextTwitch = 7 + Math.random() * 9;
      const c = s.cages[Math.floor(Math.random() * s.cages.length)];
      c.rattle = 0.7; sfx.thud(); if (Math.random() < 0.5) sfx.mvoice(c.k, 0.06);
    }
    s.cages.forEach((c, i) => {
      const hot = s.hover === i && !s.busy;
      c.hot += ((hot ? 1 : 0) - c.hot) * Math.min(1, dt * 6);
      c.rattle = Math.max(0, c.rattle - dt);
      const jx = (c.rattle > 0 ? Math.sin(t * 60) * 0.03 * c.rattle : 0) + (hot ? Math.sin(t * 40) * 0.012 : 0);
      c.g.position.x = c.baseX + jx;
      if (!c.slam) {
        const m = c.mon;
        m.state = hot ? 'chase' : 'patrol';
        const toCam = Math.atan2(P.x - m.x, P.z - m.z);
        const want = hot ? toCam : toCam * 0.35 + Math.sin(t * 0.4 + i) * 0.5;
        m.fa += (want - m.fa) * Math.min(1, dt * 3);
        m.spd = hot ? 0.9 : 0; m.x = c.home.x + (hot ? Math.sin(t * 7 + i) * 0.04 : 0);
        animateMonster(m, dt, t + i * 3);
      } else animateMonster(c.mon, dt, t);
    });
    if (s.hover >= 0 && !s.busy) { s.hov.position.set(s.cages[s.hover].baseX, 1.7, CZ + 1.8); s.hov.intensity = 12; } else s.hov.intensity = 0;
  });

  if (!listening) {
    listening = true;
    document.addEventListener('mousemove', (e) => {
      if (G.started || !state || $('menu').classList.contains('hide')) return;
      ndc.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(state.cages.map((c) => c.hit), false)[0];
      const idx = hit ? hit.object.userData.cage : -1;
      if (idx !== state.hover) {
        state.hover = idx;
        document.body.style.cursor = idx >= 0 ? 'pointer' : '';
        if (idx >= 0 && !state.busy) { try { sfx.mvoice(state.cages[idx].k, 0.1); } catch (err) { /* ses yok */ } }
      }
    });
    document.addEventListener('click', (e) => {
      if (G.started || !state || $('menu').classList.contains('hide') || e.target.closest('button,input,label')) return;
      initAudio();
      if (state.hover >= 0 && !state.busy) jumpscare(state.hover);
    });
  }
}

export function menuAmbient() { ambient({ hum: 0.05, air: 0.05, motor: 0 }); }

async function jumpscare(i) {
  const s = state, c = s.cages[i], m = c.mon;
  s.busy = true; c.slam = true; m.scream = true; m.state = 'chase';
  const look = KINDS[c.k].look;
  c.front.visible = true;
  // ani saldırı: kafesi kırıp kameraya atılır
  const tx = P.x + (c.baseX - P.x) * 0.1, tz = P.z - 0.75;
  const f = $('fade');
  c.front.visible = false;
  sfx.jump();
  m.fa = Math.atan2(P.x - m.x, P.z - m.z);
  tween(m, 'x', tx, 0.16); tween(m, 'z', tz, 0.16);
  G.shake = 0.25;
  G.fov = 105;
  const headY = look.h * 0.9;
  P.pitch = Math.max(-0.1, Math.min(1.2, Math.atan2(headY - 1.65, 0.75)));
  f.style.transition = 'none'; f.style.background = '#fff'; f.style.opacity = 1;
  await wait(70); f.style.opacity = 0; f.style.background = '#000';
  $('danger').style.opacity = 1;
  await wait(1100);
  f.style.transition = 'opacity 120ms'; f.style.opacity = 1;
  await wait(500);
  // sıfırla
  G.shake = 0; G.fov = 72; $('danger').style.opacity = 0;
  m.scream = false; m.x = c.home.x; m.z = c.home.z; c.slam = false; c.front.visible = true; c.rattle = 1.4;
  await wait(500);
  f.style.transition = 'opacity 800ms'; f.style.opacity = 0;
  s.busy = false; s.nextTwitch = 5;
}
