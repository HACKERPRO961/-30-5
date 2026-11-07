import * as THREE from 'three';
import { G, P, $, sfx, say, toast, tween, wait, fadeTo, card, plain, ambient, beacon, tension } from './core.js';
import { C, DX, DY, cellOf, cellCenter, losClear, rnd } from './maze.js';
import { diff, unlock } from './meta.js';

const TAU = Math.PI * 2;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; if (d < -Math.PI) d += TAU; return d; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/* Canavar türleri: her 6 günde yenisi (2, 8, 14, 20, 26). Eskiler her gün biraz güçlenir. */
export const KINDS = {
  blind: {
    name: 'Kör', day: 2, patrol: 1.3, chase: 3.1, hear: 1.6, sight: null, lose: 7, lurk: 12,
    hint: 'KÖR: gözü yok, yalnızca sesi duyar. C ile eğil, yavaş yürü; koşma.',
    look: { h: 2.1, skin: 0x4e4a42, cloth: 0x0c0a09, head: [0.1, 0.2, 0.12], neck: 0.16, eyes: null, sewn: true, ears: true, arm: 1.05, lean: 0.35, gape: 0.5, finger: 0.2, rags: 0.5 },
  },
  deaf: {
    name: 'Sağır', day: 8, patrol: 1.6, chase: 3.5, hear: 0, sight: { range: 9, light: 20, fov: 1.2 }, lose: 5, lurk: 12,
    hint: 'SAĞIR: kulağı yok, yalnızca görür. Fener (Q) onu uzaktan çeker; gözünden kaç.',
    look: { h: 2.2, skin: 0x353b32, cloth: 0x0a0c0a, head: [0.11, 0.22, 0.12], neck: 0.3, eyes: { n: 2, color: 0xf4fff0, size: 0.026, ei: 6 }, arm: 1.0, lean: 0.2, gape: 0.6, finger: 0.22, rags: 0.4 },
  },
  super: {
    name: 'Süper', day: 14, patrol: 1.9, chase: 3.9, hear: 1.25, sight: { range: 14, light: 22, fov: 1.5 }, lose: 12, lurk: 14, sense: true,
    hint: 'YETENEKLİ: hem görür hem duyar, ara sıra yerini sezer. Odaya sığın.',
    look: { h: 2.5, skin: 0x0b0b0d, cloth: 0x050506, head: [0.1, 0.24, 0.12], neck: 0.22, eyes: { n: 4, color: 0xff1a1a, size: 0.022, ei: 4 }, arm: 1.25, lean: 0.4, gape: 0.7, finger: 0.26, claws: true, extraArms: true, spikes: true, rags: 0.6 },
  },
  statue: {
    name: 'Heykel', day: 20, patrol: 2.0, chase: 4.6, hear: 0, sight: null, lose: 99, lurk: 14, freeze: true, hunter: true,
    hint: 'HEYKEL: ona baktığın sürece kıpırdamaz. Bakmadığında koşar.',
    look: { h: 2.05, skin: 0x5c5c56, cloth: 0x4c4c47, head: [0.12, 0.2, 0.12], neck: 0.12, eyes: null, arm: 0.95, lean: 0.05, gape: 0, finger: 0.16, cracks: true, rags: 0.2 },
  },
  tracker: {
    name: 'İz Sürücü', day: 26, patrol: 1.4, chase: 2.3, lunge: 4.6, hear: 0, sight: null, lose: 99, lurk: 16, hunter: true,
    hint: 'İZ SÜRÜCÜ: kokunu alıyor, hiç durmaz. Güvenli odaya git.',
    look: { h: 1.5, skin: 0x2c1411, cloth: 0x1c0f0c, head: [0.12, 0.17, 0.22], neck: 0.12, eyes: { n: 2, color: 0xffb020, size: 0.04, ei: 4 }, arm: 1.3, lean: 1.2, gape: 0.8, finger: 0.2, claws: true, spikes: true, rags: 0.3 },
  },
};
export const kindsForDay = (n) => Object.keys(KINDS).filter((k) => KINDS[k].day <= n);
export const newKindToday = (n) => Object.keys(KINDS).find((k) => KINDS[k].day === n) || null;

/* ---------- Model ---------- */
export function buildMonster(kind) { return build(kind); }
function build(kind) {
  const L = KINDS[kind].look, g = new THREE.Group();
  const skin = plain(L.skin, { rough: 0.7 }), cloth = plain(L.cloth, { rough: 1 });
  const bone = plain(0x7d7767, { rough: 0.6 }), dark = plain(0x020101, { rough: 1 });
  const hipY = L.h * 0.5, th = L.h * 0.32;
  const part = (geo, mt, x, y, z, parent, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mt); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m;
  };
  const grp = (x, y, z, parent) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); return p; };
  // bacaklar: tersine eklemli, ince
  const t1 = hipY * 0.55, s1 = hipY * 0.62;
  const mkLeg = (sx) => {
    const hip = grp(sx, hipY * 1.04, 0, g);
    const thigh = grp(0, 0, 0, hip); thigh.rotation.x = 0.5;
    part(new THREE.CylinderGeometry(0.068, 0.045, t1, 7), skin, 0, -t1 / 2, 0, thigh);
    const shin = grp(0, -t1, 0, thigh); shin.rotation.x = -1.0;
    part(new THREE.CylinderGeometry(0.042, 0.026, s1, 7), skin, 0, -s1 / 2, 0, shin);
    part(new THREE.BoxGeometry(0.06, 0.03, 0.24), skin, 0, -s1, 0.08, shin);
    for (const cx of [-0.02, 0, 0.02]) part(new THREE.ConeGeometry(0.008, 0.07, 4), bone, cx, -s1, 0.22, shin, Math.PI / 2);
    return { thigh, shin };
  };
  const legs = [mkLeg(-0.1), mkLeg(0.1)];
  const upper = grp(0, hipY, 0, g); upper.rotation.x = L.lean;
  // gövde: çökük göğüs, görünen omurga ve kaburgalar
  part(new THREE.CylinderGeometry(0.19, 0.11, th, 9), skin, 0, th / 2, 0, upper);
  for (let i = 0; i < 8; i++) part(new THREE.SphereGeometry(0.03, 6, 5), bone, 0, 0.04 + i * (th - 0.08) / 7, -0.115 + Math.sin(i / 7 * 3) * -0.02, upper);
  for (let i = 0; i < 4; i++) part(new THREE.BoxGeometry(0.3 - i * 0.02, 0.012, 0.02), bone, 0, th * 0.4 + i * 0.065, 0.1, upper, -0.2);
  // paçavralar
  const strips = [];
  const nS = 16;
  for (let i = 0; i < nS; i++) {
    const a = (i / nS) * Math.PI * 2, len = 0.3 + Math.random() * (L.rags || 0.45);
    const p = grp(Math.sin(a) * 0.14, 0.02, Math.cos(a) * 0.14, upper);
    part(new THREE.BoxGeometry(0.075, len, 0.01), cloth, 0, -len / 2, 0, p, 0, a, 0);
    strips.push(p);
  }
  // kollar: omuz + dirsek + uzun parmaklar
  const mkArm = (sx, len, y) => {
    const sh = grp(sx, y, 0, upper);
    const a1 = len * 0.5;
    part(new THREE.CylinderGeometry(0.05, 0.034, a1, 7), skin, 0, -a1 / 2, 0, sh);
    const el = grp(0, -a1, 0, sh); el.rotation.x = -0.4;
    part(new THREE.CylinderGeometry(0.034, 0.022, a1, 7), skin, 0, -a1 / 2, 0, el);
    const hand = grp(0, -a1, 0, el);
    part(new THREE.BoxGeometry(0.06, 0.07, 0.02), skin, 0, -0.03, 0, hand);
    for (let f = 0; f < 4; f++) {
      const fg = grp(-0.024 + f * 0.016, -0.065, 0, hand); fg.rotation.x = 0.15 + f * 0.05; fg.rotation.z = (f - 1.5) * 0.12;
      part(new THREE.CylinderGeometry(0.006, 0.004, L.finger || 0.2, 4), L.claws ? plain(0x15110f, { rough: 0.4 }) : skin, 0, -(L.finger || 0.2) / 2, 0, fg);
    }
    return { sh, el };
  };
  const arms = [mkArm(-0.24, L.arm, th - 0.03), mkArm(0.24, L.arm, th - 0.03)];
  const extra = L.extraArms ? [mkArm(-0.18, L.arm * 0.85, th - 0.2), mkArm(0.18, L.arm * 0.85, th - 0.2)] : [];
  if (L.spikes) for (let i = 0; i < 7; i++) part(new THREE.ConeGeometry(0.02, 0.16, 5), bone, 0, 0.1 + i * 0.1, -0.13, upper, -1.2);
  // uzun boyun + kafatası
  const neck = L.neck || 0.12;
  const headG = grp(0, th + 0.04, 0.02 + (L.lean > 0.5 ? 0.1 : 0), upper);
  const head = grp(0, 0, 0, headG);
  part(new THREE.CylinderGeometry(0.03, 0.045, neck, 6), skin, 0, neck / 2, 0, head);
  const hy = neck + L.head[1] * 0.8;
  const hc = grp(0, hy, 0, head);
  part(new THREE.SphereGeometry(1, 14, 10), skin, 0, 0, 0, hc).scale.set(...L.head);
  const hx = L.head[0], hz = L.head[2];
  // çene (açık) ve dişler
  const jaw = grp(0, -L.head[1] * 0.55, hz * 0.1, hc);
  part(new THREE.BoxGeometry(hx * 1.35, 0.025, hz * 1.5), skin, 0, -0.01, hz * 0.45, jaw);
  jaw.rotation.x = 0.35 + (L.gape || 0.25);
  part(new THREE.BoxGeometry(hx * 1.2, 0.05, hz * 1.2), dark, 0, 0.03, hz * 0.4, jaw);
  for (let i = 0; i < 7; i++) {
    const x = (i - 3) * hx * 0.2;
    part(new THREE.ConeGeometry(0.008, 0.045 + Math.random() * 0.02, 4), bone, x, 0.03, hz * 0.92, jaw, Math.PI);
    part(new THREE.ConeGeometry(0.008, 0.04 + Math.random() * 0.02, 4), bone, x, -L.head[1] * 0.5 + 0.03, hz * 0.95, hc);
  }
  // gözler
  const eyes = [];
  const eyeY = L.head[1] * 0.12, eyeZ = hz * 0.8;
  for (const sx of [-1, 1]) {
    part(new THREE.SphereGeometry(1, 8, 6), dark, sx * hx * 0.42, eyeY, eyeZ, hc).scale.set(0.055, 0.075, 0.05);
    if (L.eyes) {
      const e = L.eyes, n = e.n || 2;
      for (let k = 0; k < (n > 2 ? 2 : 1); k++) {
        const ey = part(new THREE.SphereGeometry(e.size, 8, 6), plain(0x050505, { emissive: e.color, ei: e.ei || 3.2 }), sx * hx * 0.42, eyeY - k * 0.06, eyeZ + 0.012, hc);
        eyes.push(ey);
      }
    }
    if (L.sewn) for (let k = 0; k < 4; k++) part(new THREE.BoxGeometry(0.012, 0.075, 0.006), plain(0x1a1008, { rough: 1 }), sx * hx * 0.42 + (k - 1.5) * 0.02, eyeY, eyeZ + 0.03, hc, 0, 0, (k % 2 ? 0.5 : -0.5));
  }
  if (L.ears) for (const sx of [-1, 1]) part(new THREE.ConeGeometry(0.07, 0.24, 5), skin, sx * hx * 1.05, 0.02, 0, hc, 0, 0, -sx * 1.25);
  if (L.cracks) for (let i = 0; i < 9; i++) part(new THREE.BoxGeometry(0.006, 0.12 + Math.random() * 0.2, 0.006), dark, (Math.random() - 0.5) * 0.3, th * 0.5 + Math.random() * 0.4, 0.1 + Math.random() * 0.04, upper, 0, 0, Math.random() - 0.5);
  return { g, legs, arms, extra, upper, head: headG, headInner: head, jaw, strips, eyes, lean: L.lean };
}

export function animateMonster(m, dt, t) {
  const b = m.b;
  b.g.position.set(m.x, 0, m.z);
  b.g.rotation.y = m.fa;
  const moving = m.spd > 0.2;
  m.ph += m.spd * dt * 3.0;
  const jerky = m.kind === 'blind' || m.kind === 'super';
  const phq = jerky ? Math.floor(m.ph * 3) / 3 : m.ph;
  const sw = Math.sin(phq) * Math.min(1, m.spd / 1.6);
  const chasing = m.state === 'chase' || m.state === 'scripted';
  const base = -b.lean * 0.9;
  const setLegs = (amp) => {
    b.legs[0].thigh.rotation.x = 0.5 + sw * amp; b.legs[1].thigh.rotation.x = 0.5 - sw * amp;
    b.legs[0].shin.rotation.x = -1.0 - Math.max(0, -sw) * 0.7; b.legs[1].shin.rotation.x = -1.0 - Math.max(0, sw) * 0.7;
  };
  // paçavralar savrulur
  b.strips.forEach((s, i) => { s.rotation.x = Math.sin(t * 1.7 + i) * 0.06 + Math.min(0.5, m.spd * 0.1); });
  b.eyes.forEach((e, i) => { e.scale.setScalar(1 + (jerky ? Math.sin(t * 17 + i) * 0.08 : 0)); });
  if (m.scream) {
    b.jaw.rotation.x = 1.55; b.head.rotation.set(-0.35, 0, Math.sin(t * 45) * 0.12);
    b.arms[0].sh.rotation.set(-2.3, 0, -0.5); b.arms[1].sh.rotation.set(-2.3, 0, 0.5);
    b.arms[0].el.rotation.x = -0.3; b.arms[1].el.rotation.x = -0.3;
    b.extra.forEach((e, i) => { e.sh.rotation.set(-2.0 + Math.sin(t * 30 + i) * 0.3, 0, (i ? 1 : -1) * 0.8); });
    setLegs(0.2);
    return;
  }
  if (m.kind === 'statue') {
    b.arms[0].sh.rotation.set(-2.0, 0, 0.5); b.arms[1].sh.rotation.set(-2.0, 0, -0.5);
    b.arms[0].el.rotation.x = -1.7; b.arms[1].el.rotation.x = -1.7;
    setLegs(0.3);
    b.head.rotation.set(0.25, 0, 0.12);
    b.jaw.rotation.x = 0.3;
    return;
  }
  setLegs(0.85);
  if (m.kind === 'blind') {
    const reach = chasing ? 1.55 : 1.25;
    b.arms[0].sh.rotation.x = base - reach + Math.sin(t * 1.9) * 0.2; b.arms[1].sh.rotation.x = base - reach + Math.cos(t * 1.4) * 0.2;
    b.arms[0].el.rotation.x = -0.2 + Math.sin(t * 3) * 0.1; b.arms[1].el.rotation.x = -0.2 + Math.cos(t * 2.6) * 0.1;
    b.head.rotation.z = 0.5 + Math.sin(t * 0.8) * 0.2 + (Math.random() < 0.03 ? 0.25 : 0);
    b.head.rotation.y = Math.sin(t * 0.5 + m.ph) * (moving ? 0.25 : 0.9);
    b.head.rotation.x = 0.2;
    b.jaw.rotation.x = 0.8 + Math.sin(t * 9) * (chasing ? 0.25 : 0.05);
  } else if (m.kind === 'deaf') {
    b.arms[0].sh.rotation.x = base + sw * 0.6; b.arms[1].sh.rotation.x = base - sw * 0.6;
    b.arms[0].el.rotation.x = -0.4; b.arms[1].el.rotation.x = -0.4;
    b.head.rotation.y = !chasing ? Math.sin(t * 0.7) * 1.1 : Math.sin(t * 0.3) * 0.15;
    b.head.rotation.x = 0.15; b.head.rotation.z = Math.sin(t * 1.3) * 0.1;
    b.jaw.rotation.x = 0.9;
  } else if (m.kind === 'super') {
    const f = chasing ? 1.4 : 0.8;
    b.arms[0].sh.rotation.x = base + sw * 0.9 * f - 0.4; b.arms[1].sh.rotation.x = base - sw * 0.9 * f - 0.4;
    b.extra[0].sh.rotation.x = base + Math.sin(t * 6 + 1) * 0.5 - 0.6; b.extra[1].sh.rotation.x = base + Math.sin(t * 5.3) * 0.5 - 0.6;
    b.head.rotation.z = Math.sin(t * 3.1) * (chasing ? 0.55 : 0.15);
    b.head.rotation.y = Math.sin(t * 1.3) * 0.4 + (Math.random() < 0.02 ? 0.5 : 0);
    b.jaw.rotation.x = 0.8 + Math.abs(Math.sin(t * 11)) * (chasing ? 0.5 : 0.1);
  } else if (m.kind === 'tracker') {
    b.arms[0].sh.rotation.x = base + sw * 1.1 - 0.3; b.arms[1].sh.rotation.x = base - sw * 1.1 - 0.3;
    b.arms[0].el.rotation.x = -0.2; b.arms[1].el.rotation.x = -0.2;
    b.head.rotation.x = -b.lean * 0.8 + Math.sin(t * 6) * 0.06;
    b.head.rotation.y = Math.sin(t * 2.2) * 0.15;
    b.jaw.rotation.x = 0.9 + Math.sin(t * 14) * 0.1;
  }
  b.g.position.y = Math.abs(Math.sin(phq)) * 0.025;
  void dt;
}

/* ---------- Sistem ---------- */
export function initMonsters(o) {
  const { cells, N, n, startId, safeId, entryId, cabId, onCaught, extraBlocked = [] } = o;
  const W = G.W;
  const blocked = new Set([safeId, cabId, ...extraBlocked]);
  const fcache = new Map();
  const field = (goal) => {
    let f = fcache.get(goal); if (f) return f;
    f = new Int16Array(N * N).fill(-1); f[goal] = 0;
    const q = [goal];
    for (let i = 0; i < q.length; i++) {
      const c = q[i], x = c % N, y = Math.floor(c / N);
      for (let d = 0; d < 4; d++) {
        if (!cells[c][d]) continue;
        const nb = (y + DY[d]) * N + x + DX[d];
        if (f[nb] < 0 && !blocked.has(nb)) { f[nb] = f[c] + 1; q.push(nb); }
      }
    }
    fcache.set(goal, f); return f;
  };
  const free = [];
  for (let i = 0; i < N * N; i++) if (!blocked.has(i)) free.push(i);
  const nbrs = (c) => {
    const r = [], x = c % N, y = Math.floor(c / N);
    for (let d = 0; d < 4; d++) if (cells[c][d]) { const nb = (y + DY[d]) * N + x + DX[d]; if (!blocked.has(nb)) r.push(nb); }
    return r;
  };

  const mons = [];
  const spawnCells = free.filter((c) => field(startId)[c] >= 5).sort(() => Math.random() - 0.5);
  const today = newKindToday(n);
  for (const kind of kindsForDay(n)) {
    const cfg = KINDS[kind], isNew = kind === today;
    const cid = spawnCells.length ? spawnCells.pop() : free[rnd(free.length)];
    const [mx, mz] = cellCenter(N, cid);
    const b = build(kind);
    b.g.position.set(mx, 0, mz); b.g.visible = !isNew; W.scene.add(b.g);
    const m = {
      kind, cfg, b, x: mx, z: mz, fa: Math.random() * TAU, fx: 0, fz: 1, wp: null, goal: null,
      state: isNew ? 'hidden' : 'patrol', pause: 1 + Math.random() * 3, lose: 0, last: cid, search: 0, str: Math.min(1.7, 1 + 0.045 * (n - cfg.day)) * diff().mon,
      ph: 0, stepT: 0, gT: 4 + Math.random() * 6, lurkT: 0, cool: 0, sense: 20 + Math.random() * 14, dist: 99, retarget: 0, startle: 0, observed: false, isNew, moving: false, spd: 0,
    };
    mons.push(m);
  }
  const intro = mons.find((m) => m.isNew) || null;
  let introT = 0, danger = 0, heartT = 0;

  const S = G.S;
  S.threat = () => mons.some((m) => m.state === 'chase' || m.state === 'lurk' || m.state === 'scripted');

  function moveToward(m, tx, tz, speed, dt) {
    const dx = tx - m.x, dz = tz - m.z, d = Math.hypot(dx, dz);
    if (d < 0.001) return d;
    const st = Math.min(d, speed * dt);
    m.x += (dx / d) * st; m.z += (dz / d) * st;
    m.fa += angDiff(m.fa, Math.atan2(dx, dz)) * Math.min(1, dt * 9);
    m.fx = Math.sin(m.fa); m.fz = Math.cos(m.fa);
    m.spd = st / Math.max(dt, 1e-4);
    return d - st;
  }
  // hedef hücreye yol izler; vardıysa true
  function pathStep(m, goal, speed, dt) {
    const cur = cellOf(N, m.x, m.z);
    if (m.wp == null) {
      const [gx, gz] = cellCenter(N, goal);
      if (cur === goal) {
        if (Math.hypot(gx - m.x, gz - m.z) < 0.6) return true;
        moveToward(m, gx, gz, speed, dt); return false;
      }
      const f = field(goal);
      let best = -1, bv = 1e9;
      for (const nb of nbrs(cur)) if (f[nb] >= 0 && f[nb] < bv) { bv = f[nb]; best = nb; }
      if (best < 0) return true;
      m.wp = best;
    }
    const [wx, wz] = cellCenter(N, m.wp);
    moveToward(m, wx, wz, speed, dt);
    if (Math.hypot(wx - m.x, wz - m.z) < 0.2) m.wp = null;
    return false;
  }
  function pickGoal(m, pc) {
    if (m.search > 0) {
      m.search--;
      const f = field(m.last);
      const c = free.filter((x) => f[x] >= 0 && f[x] <= 3);
      return c[rnd(c.length)];
    }
    const f = field(cellOf(N, m.x, m.z)), pf = field(pc);
    let best = -1, bv = 1e9;
    for (let i = 0; i < 8; i++) {
      const c = free[rnd(free.length)];
      if (f[c] < 3) continue;
      const v = pf[c] + Math.random() * 6;
      if (v < bv) { bv = v; best = c; }
    }
    return best < 0 ? free[rnd(free.length)] : best;
  }
  function isObserved(m) {
    const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz);
    if (d < 0.01) return true;
    const dot = (-Math.sin(P.yaw) * dx - Math.cos(P.yaw) * dz) / d;
    if (dot < Math.cos(0.95)) return false;
    if (!(G.flashOn || d < 6)) return false;
    return losClear(cells, N, P.x, P.z, m.x, m.z);
  }
  function detect(m, pc, pSafe) {
    const cfg = m.cfg;
    if (pSafe) return 0;
    let r = 0;
    if (cfg.hear > 0 && G.noise > 0) {
      const pf = field(pc), mc = cellOf(N, m.x, m.z);
      const pm = pf[mc] < 0 ? 99 : pf[mc] * C;
      if (pm <= G.noise * cfg.hear * m.str) r = 1;
    }
    if (cfg.sight) {
      let range = (G.flashOn ? cfg.sight.light : cfg.sight.range) * m.str;
      if (P.cr > 0.5) range *= 0.65;
      const dx = P.x - m.x, dz = P.z - m.z, d = Math.hypot(dx, dz);
      if (d < range) {
        const ang = Math.abs(angDiff(m.fa, Math.atan2(dx, dz)));
        if ((d < 2.4 || ang < cfg.sight.fov) && losClear(cells, N, m.x, m.z, P.x, P.z)) r = 2;
      }
    }
    return r;
  }

  function tick(m, dt, t) {
    const cfg = m.cfg, mc = cellOf(N, m.x, m.z), pc = cellOf(N, P.x, P.z), pSafe = pc === safeId;
    const dx = P.x - m.x, dz = P.z - m.z;
    m.dist = Math.hypot(dx, dz);
    m.spd = 0;
    if (m.state === 'hidden' || m.state === 'caught') return;
    if (m.cool > 0) m.cool -= dt;
    if (m.state === 'scripted') return; // sinematik kontrol ediyor
    const hunting = cfg.hunter && m.cool <= 0;
    if (cfg.freeze) m.observed = isObserved(m);
    const frozenNow = cfg.freeze && m.observed;

    if (m.state === 'patrol' && hunting && !pSafe) m.state = 'chase';
    if (m.state === 'patrol' || m.state === 'chase') {
      const det = hunting ? 2 : detect(m, pc, pSafe);
      if (m.state === 'patrol' && det > 0) {
        m.state = 'chase'; m.lose = cfg.lose; m.last = pc; m.wp = null;
        if (m.dist < 30) sfx.mvoice(m.kind, clamp(0.3 * (1 - m.dist / 30), 0.05, 0.3));
      }
      if (m.state === 'chase') {
        if (pSafe) { m.state = 'lurk'; m.lurkT = cfg.lurk; m.wp = null; }
        else {
          if (det > 0) { m.lose = cfg.lose; m.last = pc; } else { m.lose -= dt; if (m.lose <= 0) { m.state = 'patrol'; m.search = 3; m.goal = null; m.wp = null; } }
        }
      }
    }
    if (m.state === 'patrol' && cfg.hear > 0 && G.decoy && m.decoyId !== G.decoy.id) {
      m.decoyId = G.decoy.id;
      const dc = cellOf(N, G.decoy.x, G.decoy.z), df = field(dc), mc2 = cellOf(N, m.x, m.z);
      const dm = df[mc2] < 0 ? 99 : df[mc2] * C;
      if (dm <= 30 * cfg.hear * m.str) { m.goal = dc; m.pause = 0; m.wp = null; m.search = 0; sfx.mvoice(m.kind, 0.14); unlock('decoy'); }
    }
    if (m.state === 'patrol' && cfg.sense && !pSafe) {
      m.sense -= dt;
      if (m.sense <= 0) { m.sense = 24 + Math.random() * 10; m.state = 'chase'; m.lose = 9; m.last = pc; m.wp = null; sfx.mvoice(m.kind, 0.2); }
    }

    if (frozenNow) { m.spd = 0; return; }
    const str = m.str;
    if (m.state === 'patrol') {
      if (m.pause > 0) { m.pause -= dt; m.fa += Math.sin(t * 0.7 + m.ph) * dt * 0.8; m.fx = Math.sin(m.fa); m.fz = Math.cos(m.fa); return; }
      if (m.goal == null) m.goal = pickGoal(m, pc);
      if (pathStep(m, m.goal, cfg.patrol * str, dt)) { m.goal = null; m.pause = 1.5 + Math.random() * 3; }
    } else if (m.state === 'chase') {
      let sp = cfg.chase * str;
      const los = m.dist < 9 && losClear(cells, N, m.x, m.z, P.x, P.z);
      if (cfg.lunge && los) sp = cfg.lunge * str;
      if (m.lose < cfg.lose - 0.01 && !cfg.hunter) sp *= 0.9;
      const target = (m.lose >= cfg.lose - 0.01 || cfg.hunter) ? pc : m.last;
      if ((los && target === pc && (m.dist < 8)) || cellOf(N, m.x, m.z) === pc && !pSafe) { m.wp = null; moveToward(m, P.x, P.z, sp, dt); }
      else pathStep(m, target, sp, dt);
    } else if (m.state === 'lurk') {
      if (pathStep(m, entryId, cfg.chase * str * 0.8, dt)) {
        const [sx, sz] = cellCenter(N, safeId);
        m.fa += angDiff(m.fa, Math.atan2(sx - m.x, sz - m.z)) * Math.min(1, dt * 4); m.fx = Math.sin(m.fa); m.fz = Math.cos(m.fa);
        m.lurkT -= dt;
        if (m.lurkT <= 0 || !pSafe && m.lurkT < cfg.lurk - 3) { m.state = 'patrol'; m.cool = 40; m.goal = null; m.search = 0; m.wp = null; }
      }
      if (!pSafe && m.state === 'lurk' && m.lurkT < cfg.lurk - 1) { m.state = 'chase'; m.lose = cfg.lose; m.last = pc; }
    }
    void mc;
  }

  const animate = animateMonster;

  /* ---------- Yakalanma ---------- */
  async function caughtBy(m) {
    if (G.caught) return;
    G.caught = true; G.cine = false; P.frozen = true; P.autoV = null; G.flashOn = true; G.shake = 0; G.punchT = 99;
    ambient({ hum: 0, air: 0, motor: 0 }); beacon(0);
    m.state = 'caught';
    const dx = m.x - P.x, dz = m.z - P.z, d = Math.hypot(dx, dz) || 1;
    const headY = KINDS[m.kind].look.h * 0.9, dist = m.kind === 'tracker' ? 0.7 : 0.6;
    m.x = P.x + (dx / d) * dist; m.z = P.z + (dz / d) * dist; m.fa = Math.atan2(-dx, -dz);
    P.yaw += angDiff(P.yaw, Math.atan2(-dx, -dz));
    P.pitch = clamp(Math.atan2(headY - 1.65, dist), -0.4, 1.25);
    G.armPose = 1; G.fov = 114; m.scream = true;
    $('danger').style.opacity = 0;
    // 1) bir an tam sessizlik ve beyaz parlama
    const f = $('fade');
    f.style.transition = 'none'; f.style.background = '#fff'; f.style.opacity = 1;
    sfx.jump(); G.shake = 0.35;
    await wait(70);
    f.style.opacity = 0; f.style.background = '#000';
    // 2) kırmızı titreme
    for (let i = 0; i < 5; i++) { $('danger').style.opacity = i % 2 ? 0.2 : 1; await wait(90); }
    $('danger').style.opacity = 1;
    G.shake = 0.12;
    sfx.scream(); sfx.roar();
    await wait(1250);
    await fadeTo(1, 120);
    $('danger').style.opacity = 0;
    await wait(900);
    await card('YAKALANDIN', `Gün ${String(n).replace('.', ',')} baştan başlıyor…`, 2600);
    onCaught();
  }

  function startle(m) {
    sfx.sting(); sfx.mvoice(m.kind, 0.4);
    G.shake = 0.08; tween(G, 'shake', 0, 0.6);
    G.fov = 96; G.punchT = 0.9;
    tween(G, 'fov', 76, 0.9);
    G.armPose = 0.6; tween(G, 'armPose', 0, 0.9);
  }

  /* ---------- İlk karşılaşma sinematiği ---------- */
  function pickRunWaypoint(from, prev, mc) {
    const fM = field(mc);
    const reach = (c, p, depth) => {
      let best = fM[c];
      if (depth === 0) return best;
      for (const nb of nbrs(c)) if (nb !== p) best = Math.max(best, reach(nb, c, depth - 1));
      return best;
    };
    let cand = nbrs(from).filter((c) => c !== prev);
    if (!cand.length) cand = nbrs(from);
    let best = cand[0], bv = -1;
    for (const c of cand) { const v = reach(c, from, 3) + fM[c] * 0.3 + Math.random() * 0.1; if (v > bv) { bv = v; best = c; } }
    return best;
  }
  async function runAway(m, secs) {
    const t0 = performance.now();
    let prev = -1, wp = null, trav = 0, lx = P.x, lz = P.z;
    while ((performance.now() - t0) / 1000 < secs && !G.caught) {
      trav += Math.hypot(P.x - lx, P.z - lz); lx = P.x; lz = P.z;
      if (trav >= 14 && Math.hypot(m.x - P.x, m.z - P.z) >= 11) break;
      const pc = cellOf(N, P.x, P.z);
      if (wp == null || cellOf(N, P.x, P.z) === wp && Math.hypot(cellCenter(N, wp)[0] - P.x, cellCenter(N, wp)[1] - P.z) < 0.5) {
        const from = pc; wp = pickRunWaypoint(from, prev, cellOf(N, m.x, m.z)); prev = from;
      }
      const [wx, wz] = cellCenter(N, wp);
      const vx = wx - P.x, vz = wz - P.z, l = Math.hypot(vx, vz) || 1;
      P.autoV = { x: (vx / l) * 4.1, z: (vz / l) * 4.1 };
      P.yaw += angDiff(P.yaw, Math.atan2(-vx, -vz)) * 0.18;
      await wait(40);
    }
    P.autoV = null;
  }
  async function cinematic(m, spot) {
    G.cine = true; P.frozen = true; P.autoV = null;
    const [sx, sz] = cellCenter(N, spot);
    m.x = sx; m.z = sz; m.wp = null; m.state = 'scripted'; m.b.g.visible = true;
    const dx = P.x - m.x, dz = P.z - m.z;
    m.fa = Math.atan2(dx, dz); m.fx = Math.sin(m.fa); m.fz = Math.cos(m.fa);
    // 1) şok: kamera ona döner, FOV vurur, eller kalkar
    sfx.sting(); sfx.gasp();
    G.shake = 0.05;
    P.yaw += angDiff(P.yaw, Math.atan2(P.x - m.x, P.z - m.z));
    tween(P, 'pitch', 0.04, 0.25); tween(G, 'armPose', 1, 0.25);
    tween(G, 'fov', 94, 0.12).then(() => tween(G, 'fov', 82, 0.9));
    ambient({ hum: 0.02, air: 0.03, motor: 0 });
    await wait(900);
    say('', 'Ne... o da ne?!', 2200);
    sfx.roar();
    // canavar koşmaya başlar (heykel bakılırken kıpırdamaz)
    m.scriptRun = true;
    await wait(900);
    // 2) dön ve kaç
    G.shake = 0.015;
    tween(G, 'armPose', 0, 0.4);
    tween(P, 'yaw', P.yaw + Math.PI, 0.45);
    await wait(450);
    G.fov = 84; tween(G, 'fov', 80, 0.5);
    await runAway(m, 12);
    // 3) sıra oyuncuda
    P.autoV = null; P.frozen = false; G.cine = false; m.scriptRun = false;
    m.state = 'chase'; m.lose = m.cfg.lose; m.last = cellOf(N, P.x, P.z); m.wp = null;
    tween(G, 'fov', 72, 1.2);
    G.shake = 0;
    toast(m.cfg.hint, 9000);
  }

  function findSpot(pc, anyDist) {
    const pf = field(pc);
    const c = free.filter((x) => {
      const [cx, cz] = cellCenter(N, x);
      const d = Math.hypot(cx - P.x, cz - P.z);
      if (anyDist) return pf[x] >= 3 && pf[x] <= 5;
      return x !== pc && d >= 8 && d <= 17 && losClear(cells, N, P.x, P.z, cx, cz);
    });
    return c.length ? c[rnd(c.length)] : null;
  }

  /* ---------- Ana güncelleme ---------- */
  W.updaters.push((dt, t) => {
    if (G.caught) { for (const m of mons) animate(m, dt, t); return; }
    const pc = cellOf(N, P.x, P.z);
    const paused = P.frozen && !G.cine;
    if (!paused) {
      // sinematik tetikleyici
      if (intro && intro.state === 'hidden' && !G.cine && !G.minigame && !G.noteOpen && pc !== safeId) {
        introT += dt;
        if (introT > 14) {
          const spot = findSpot(pc, false) ?? (introT > 70 ? findSpot(pc, true) : null);
          if (spot != null) cinematic(intro, spot);
        }
      }
      for (const m of mons) {
        // sinematikte canavar oyuncuya doğru koşar
        if (m.state === 'scripted') {
          m.spd = 0; m.dist = Math.hypot(P.x - m.x, P.z - m.z);
          const run = m.scriptRun && !(m.cfg.freeze && isObserved(m));
          if (run) pathStep(m, cellOf(N, P.x, P.z), m.cfg.chase * m.str * 0.78, dt);
        } else tick(m, dt, t);
        if (!G.cine && !G.noCatch && m.state !== 'hidden' && m.state !== 'lurk' && m.dist < 0.95 && pc !== safeId) caughtBy(m);
        m.startle -= dt;
        if ((m.state === 'chase' || m.state === 'lurk') && m.dist < 3.6 && m.startle <= 0 && !G.cine && !G.caught && losClear(cells, N, m.x, m.z, P.x, P.z)) { m.startle = diff().sc; startle(m); }
      }
    } else for (const m of mons) m.spd = 0;
    for (const m of mons) if (m.state !== 'hidden') animate(m, dt, t);

    // adım sesleri, hırıltı
    for (const m of mons) {
      if (m.state === 'hidden' || paused) continue;
      if (m.spd > 0.3) {
        m.stepT -= dt * (m.spd / 1.5);
        if (m.stepT <= 0) {
          m.stepT = 0.55;
          const v = (m.kind === 'statue' ? 0.2 : 0.34) * Math.pow(Math.max(0, 1 - m.dist / 24), 1.6);
          if (v > 0.012) sfx.mstep(v, m.kind);
        }
      }
      if (m.state === 'chase') {
        m.gT -= dt;
        if (m.gT <= 0) { m.gT = 4.5 + Math.random() * 5; if (m.dist < 30) sfx.mvoice(m.kind, 0.06 + 0.22 * (1 - m.dist / 30)); }
      } else if (m.state === 'lurk' && m.dist < 14) {
        m.gT -= dt;
        if (m.gT <= 0) { m.gT = 3 + Math.random() * 3; { sfx.breath(0.1 + 0.12 * (1 - m.dist / 14)); if (Math.random() < 0.4) sfx.mvoice(m.kind, 0.1); } }
      }
    }

    // tehlike: kırmızı kenar + kalp atışı
    let dg = 0, domKind = null;
    if (!paused || G.cine) {
      for (const m of mons) {
        if (m.state === 'hidden') continue;
        const w = (m.state === 'chase' || m.state === 'scripted') ? 1 : (m.state === 'lurk' ? 0.55 : 0.28);
        const v = w * clamp((17 - m.dist) / 14, 0, 1);
        if (v > dg) { dg = v; domKind = m.kind; }
      }
    }
    danger += (dg - danger) * Math.min(1, dt * 3);
    $('danger').style.opacity = (danger * 0.9).toFixed(3);
    if (G.punchT > 0) G.punchT -= dt;
    if (!G.cine && !G.caught && !(G.punchT > 0)) G.fov = 72 + danger * 5;
    heartT -= dt;
    tension(paused && !G.cine ? 0 : danger);
    if (danger > 0.12 && heartT <= 0) {
      const k = domKind || 'blind';
      sfx.heartK(k, 0.6 + 0.4 * danger);
      const base = k === 'deaf' ? 1.6 : k === 'super' ? 1.0 : k === 'statue' ? 1.7 + Math.random() * 0.5 : k === 'tracker' ? 1.1 : 1.15;
      heartT = base - 0.55 * danger * base;
    }
  });

  return {
    mons, field,
    alertAll() {
      for (const m of mons) {
        if (m.state === 'hidden') { m.b.g.visible = true; const sp = free[rnd(free.length)]; [m.x, m.z] = cellCenter(N, sp); }
        m.state = 'chase'; m.lose = 99; m.last = cellOf(N, P.x, P.z); m.wp = null; m.cool = 0;
      }
    },
    jumpscare(x, z) {
      const m = mons[0];
      m.b.g.visible = true; m.x = x; m.z = z; m.state = 'scripted'; G.cine = false; G.noCatch = false;
      caughtBy(m);
    },
  };
}
