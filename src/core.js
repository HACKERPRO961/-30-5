import * as THREE from 'three';
import { surf, plain, labelTex } from './util.js';
import * as A from './audio.js';
import { BIND, SET, upLevel, diff, stat } from './meta.js';

export const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const sfx = A.sfx;
export const setVolume = A.setVolume;

export const G = {
  W: null, started: false, locked: false, day: 1, S: {}, tasks: [],
  horror: false, taskTitle: null, flashOn: true, bat: 1, stam: 1, bottles: 0, decoy: null, tired: false, breathT: 0, onNoteClose: null,
  fov: 72, fovAdd: 0, paused: false, rebind: null, armPose: 0, noise: 0, noiseBurst: 0, fsT: 0, caught: false, mx: undefined, my: undefined,
  focus: null, hold: 0, holdLock: false, minigame: null, noteOpen: false,
  tweens: [], sens: 0.0022, shake: 0,
};
export const P = { x: 0, z: 0, yaw: 0, pitch: 0, vx: 0, vz: 0, bob: 0, step: 0, frozen: true, noMove: false, r: 0.3, h: 1.65, cr: 0, autoV: null, sprinting: false };

export const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, /Android|iPhone|iPad/i.test(navigator.userAgent) ? 1.25 : 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
$('game').appendChild(renderer.domElement);
export const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
camera.rotation.order = 'YXZ';
const arms = new THREE.Group();
camera.add(arms);
arms.visible = false;
const skinM = new THREE.MeshStandardMaterial({ color: 0xc9a98a, roughness: 0.8 });
const sleeveM = new THREE.MeshStandardMaterial({ color: 0x2e3b48, roughness: 0.9 });
function mkArm(sx) {
  const piv = new THREE.Group(); piv.position.set(sx, -0.32, -0.12);
  const sl = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.42, 8), sleeveM);
  sl.rotation.x = Math.PI / 2; sl.position.z = -0.21; piv.add(sl);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.044, 8, 6), skinM); hand.position.z = -0.45; piv.add(hand);
  arms.add(piv); return piv;
}
const armL = mkArm(-0.26), armR = mkArm(0.26);
const torchBody = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.036, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 0.5, metalness: 0.6 }));
torchBody.rotation.x = Math.PI / 2; torchBody.position.z = -0.52; armR.add(torchBody);
function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- Yardımcılar ---------- */
export const wait = (ms) => new Promise((r) => setTimeout(r, ms));
export function tween(o, k, to, dur, ease) {
  const e = ease || ((t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2));
  return new Promise((res) => { G.tweens.push({ o, k, from: o[k], to, dur, t: 0, ease: e, res }); });
}
export function fadeTo(v, ms = 800) {
  const f = $('fade');
  f.style.transition = `opacity ${ms}ms`;
  f.style.opacity = v;
  return wait(ms);
}
export async function card(big, small, ms = 2800) {
  const c = $('card');
  c.querySelector('.big').textContent = big;
  c.querySelector('.small').textContent = small || '';
  c.classList.add('on');
  await wait(ms);
  c.classList.remove('on');
  await wait(600);
}
let subT = null;
export function say(who, text, ms = 5000) {
  const s = $('sub');
  s.innerHTML = (who ? `<small>${who.toUpperCase()}</small>` : '') + text;
  s.classList.add('on');
  clearTimeout(subT);
  subT = setTimeout(() => s.classList.remove('on'), ms);
}
let toastT = null;
export function toast(text, ms = 2400) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('on');
  clearTimeout(toastT);
  toastT = setTimeout(() => t.classList.remove('on'), ms);
}

/* ---------- Görev listesi ---------- */
function renderTasks() {
  $('tasks').querySelector('h4').textContent = G.taskTitle || `İŞ EMRİ — ${G.day}. GÜN`;
  $('tasks').querySelector('ul').innerHTML = G.tasks
    .map((t) => `<li class="${t.done ? 'done' : ''}">${t.text}</li>`).join('');
}
export function setTasks(list) { G.tasks = list.map((t) => ({ ...t, done: false })); renderTasks(); }
export function taskDone(id) {
  const t = G.tasks.find((x) => x.id === id);
  if (!t || t.done) return;
  t.done = true; sfx.done(); renderTasks();
}
export const tasksLeft = (except = []) => G.tasks.filter((t) => !t.done && !except.includes(t.id)).length;

/* ---------- Not kâğıdı ---------- */
export function showNote(title, html) {
  const n = $('note');
  n.querySelector('h3').textContent = title;
  n.querySelector('.body').innerHTML = html;
  n.classList.add('on');
  G.noteOpen = true;
  sfx.note();
}
function closeNote() {
  $('note').classList.remove('on'); G.noteOpen = false; sfx.note();
  const cb = G.onNoteClose; G.onNoteClose = null;
  if (cb) cb();
}

/* ---------- Mini oyun ---------- */
export function openMinigame(mg) {
  G.minigame = mg;
  $('mgwrap').classList.add('on');
  mg.ctx = $('mg').getContext('2d');
  mg.cx = 360; mg.cy = 220;
  if (mg.init) mg.init();
  $('mghint').textContent = mg.hint || '';
  mouseDown = false;
}
export function closeMinigame() {
  G.minigame = null;
  $('mgwrap').classList.remove('on');
  mouseDown = false;
}

/* ---------- Dünya kurucuları ---------- */
export function newWorld(bg = 0x06080b, fog = 0.04, amb = 0.38) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(bg);
  scene.fog = new THREE.FogExp2(bg, fog);
  const hemi = new THREE.HemisphereLight(0x9aa4b8, 0x3a3228, amb);
  scene.add(hemi);
  scene.add(camera);
  G.W = { scene, hemi, colliders: [], blockers: [], picks: [], updaters: [] };
  return G.W;
}
export function colBox(x1, z1, x2, z2, y0 = 0, y1 = 3) {
  const c = { minX: Math.min(x1, x2), maxX: Math.max(x1, x2), minZ: Math.min(z1, z2), maxZ: Math.max(z1, z2), minY: y0, maxY: y1 };
  G.W.colliders.push(c);
  return c;
}
export function box(size, pos, material, o = {}) {
  const [w, h, d] = size;
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  m.position.set(pos[0], pos[1], pos[2]);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  (o.parent || G.W.scene).add(m);
  if (o.solid) {
    m.userData.col = colBox(pos[0] - w / 2, pos[2] - d / 2, pos[0] + w / 2, pos[2] + d / 2, pos[1] - h / 2, pos[1] + h / 2);
    G.W.blockers.push(m);
  }
  return m;
}
export function cyl(r, h, pos, material, o = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, o.r2 ?? r, h, o.seg ?? 20), material);
  m.position.set(pos[0], pos[1], pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  m.castShadow = o.cast !== false;
  m.receiveShadow = true;
  (o.parent || G.W.scene).add(m);
  if (o.solid) {
    m.userData.col = colBox(pos[0] - r, pos[2] - r, pos[0] + r, pos[2] + r, pos[1] - h / 2, pos[1] + h / 2);
    G.W.blockers.push(m);
  }
  return m;
}
export function plane(w, h, pos, rotY, material, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), material);
  m.position.set(pos[0], pos[1], pos[2]);
  m.rotation.y = rotY;
  if (o.rotX) m.rotation.x = o.rotX;
  (o.parent || G.W.scene).add(m);
  return m;
}
export function floor(x1, z1, x2, z2, kind, y = 0) {
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
  return box([w, 0.2, d], [(x1 + x2) / 2, y - 0.1, (z1 + z2) / 2], surf(kind, w, d), { cast: false });
}
export function ceil(x1, z1, x2, z2, h, kind) {
  const w = Math.abs(x2 - x1), d = Math.abs(z2 - z1);
  return box([w, 0.2, d], [(x1 + x2) / 2, h + 0.1, (z1 + z2) / 2], surf(kind, w, d), { cast: false });
}
// Eksen hizalı duvar. openings: [{at, w, h}] (at: başlangıçtan uzaklık)
export function wall(x1, z1, x2, z2, h, kind, openings = [], thick = 0.2) {
  const horiz = Math.abs(z2 - z1) < 1e-6;
  const len = horiz ? Math.abs(x2 - x1) : Math.abs(z2 - z1);
  const dx = horiz ? (Math.sign(x2 - x1) || 1) : 0;
  const dz = horiz ? 0 : (Math.sign(z2 - z1) || 1);
  const seg = (a, b, y0, y1) => {
    if (b - a < 0.01) return;
    const mid = (a + b) / 2;
    const cx = horiz ? x1 + dx * mid : x1;
    const cz = horiz ? z1 : z1 + dz * mid;
    const sw = horiz ? b - a : thick;
    const sd = horiz ? thick : b - a;
    const mt = surf(kind, b - a, y1 - y0);
    box([sw, y1 - y0, sd], [cx, (y0 + y1) / 2, cz], mt, { solid: true });
  };
  let cur = 0;
  for (const o of openings.slice().sort((p, q) => p.at - q.at)) {
    const a = o.at - o.w / 2, b = o.at + o.w / 2;
    seg(cur, a, 0, h);
    if (o.y0) seg(a, b, 0, o.y0);
    seg(a, b, o.h, h);
    cur = b;
  }
  seg(cur, len, 0, h);
}
export function lamp(x, y, z, o = {}) {
  const color = o.color ?? 0xfff1d6;
  const em = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 2.2 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(...(o.size ?? [1.2, 0.06, 0.3])), em);
  m.position.set(x, y, z);
  G.W.scene.add(m);
  const L = new THREE.PointLight(color, o.int ?? 36, 0, 2);
  L.position.set(x, y - 0.18, z);
  if (o.shadow) { L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002; }
  G.W.scene.add(L);
  const base = L.intensity;
  const obj = { L, m, em, base, mul: 1 };
  let until = 0;
  G.W.updaters.push((dt, t) => {
    if (o.flicker && t < until) {
      const f = 0.15 + Math.random() * 0.7;
      L.intensity = base * f * obj.mul; em.emissiveIntensity = 2.2 * f * obj.mul;
    } else {
      L.intensity = base * obj.mul; em.emissiveIntensity = 2.2 * obj.mul;
      if (o.flicker && Math.random() < o.flicker * dt) until = t + 0.05 + Math.random() * 0.25;
    }
  });
  return obj;
}
export function sign(x, y, z, rotY, w, h, lines, o = {}) {
  const m = new THREE.MeshStandardMaterial({ map: labelTex(lines, { w: o.tw ?? 256, h: o.th ?? Math.round(256 * h / w), ...o }), roughness: 0.8 });
  return plane(w, h, [x, y, z], rotY, m);
}
/* Etkileşim: mesh üzerine tanım bağlar. o: {label(str|fn), hold, can(), run()} */
export function inter(mesh, o) {
  mesh.userData.inter = o; o.mesh = mesh;
  G.W.picks.push(mesh);
  return o;
}
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
export function hitbox(pos, size, o) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), hitMat);
  m.position.set(pos[0], pos[1], pos[2]);
  G.W.scene.add(m);
  return inter(m, o);
}
/* Atılabilir şişe: yere/duvara çarpınca kırılır ve ses çıkarır */
const proj = [];
let decoyId = 0;
export function throwBottle() {
  if (G.bottles <= 0) { toast('Şişen yok.', 1200); return; }
  G.bottles--; stat('thrown'); sfx.click();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.04, 0.22, 8), new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.85 }));
  const dx = -Math.sin(P.yaw) * Math.cos(P.pitch), dz = -Math.cos(P.yaw) * Math.cos(P.pitch), dy = Math.sin(P.pitch);
  const p = { m, x: P.x + dx * 0.5, y: P.h - 0.15 + dy * 0.5, z: P.z + dz * 0.5, vx: dx * 11, vy: dy * 11 + 1.5, vz: dz * 11 };
  m.position.set(p.x, p.y, p.z); G.W.scene.add(m); proj.push(p);
  G.noiseBurst = Math.max(G.noiseBurst, 3);
}
function stepProj(dt) {
  for (let i = proj.length - 1; i >= 0; i--) {
    const p = proj[i];
    p.vy -= 12 * dt;
    const nx = p.x + p.vx * dt, ny = p.y + p.vy * dt, nz = p.z + p.vz * dt;
    let hit = ny <= 0.05 || ny >= 3;
    if (!hit) for (const c of G.W.colliders) {
      if (c.disabled) continue;
      if (nx > c.minX && nx < c.maxX && nz > c.minZ && nz < c.maxZ && ny > c.minY && ny < c.maxY) { hit = true; break; }
    }
    if (hit) {
      G.W.scene.remove(p.m); proj.splice(i, 1);
      sfx.glass();
      G.decoy = { x: p.x, z: p.z, id: ++decoyId };
      if (Math.hypot(p.x - P.x, p.z - P.z) < 6) G.noiseBurst = Math.max(G.noiseBurst, 6);
      continue;
    }
    p.x = nx; p.y = ny; p.z = nz;
    p.m.position.set(nx, ny, nz); p.m.rotation.x += dt * 9; p.m.rotation.z += dt * 5;
  }
}
export function placePlayer(x, z, yaw = 0) {
  P.x = x; P.z = z; P.yaw = yaw; P.pitch = 0; P.vx = 0; P.vz = 0;
}

/* ---------- Girdi ---------- */
const keys = {};
let mouseDown = false;
const live = () => G.started && !G.paused && (G.locked || G.noLock);
const canvas = renderer.domElement;

document.addEventListener('mousemove', (e) => {
  G.mx = e.clientX; G.my = e.clientY;
  if (!live()) return;
  const m = G.minigame;
  if (m) {
    m.cx = clamp(m.cx + e.movementX, 0, 720);
    m.cy = clamp(m.cy + e.movementY, 0, 440);
    if (m.onMove) m.onMove(e.movementX, e.movementY);
    return;
  }
  if (P.frozen || G.noteOpen) return;
  P.yaw -= e.movementX * G.sens;
  P.pitch = clamp(P.pitch - e.movementY * G.sens * (SET.invY ? -1 : 1), -1.45, 1.45);
});
document.addEventListener('mousedown', (e) => {
  if (!live() || e.button !== 0) return;
  mouseDown = true;
  if (G.minigame) { if (G.minigame.onDown) G.minigame.onDown(); return; }
  if (G.noteOpen) { closeNote(); return; }
  pressInteract();
});
document.addEventListener('mouseup', (e) => {
  if (e.button === 0) mouseDown = false;
  if (G.minigame && G.minigame.onUp) G.minigame.onUp();
});
document.addEventListener('keydown', (e) => {
  if (G.rebind) { G.rebind(e); e.preventDefault(); return; }
  keys[e.code] = true;
  if (e.code === 'Escape' && G.started && G.noLock && !G.minigame) { setPaused(!G.paused); return; }
  if (e.code === BIND.full && !e.repeat && !G.minigame) toggleFullscreen();
  if (e.code === BIND.flash && !e.repeat && G.horror && live() && !G.minigame) { if (!G.flashOn && G.bat <= 0) { toast('Pil bitti.', 1800); sfx.click(); return; } G.flashOn = !G.flashOn; refreshFlash(); sfx.click(); G.noiseBurst = Math.max(G.noiseBurst, 5); }
  if (!live() || e.repeat) return;
  if (G.minigame) { if (G.minigame.onKey) G.minigame.onKey(e.code); e.preventDefault(); return; }
  if (G.noteOpen) { if (e.code === BIND.use || e.code === 'Space') closeNote(); return; }
  if (e.code === BIND.throw && !e.repeat && G.horror && live() && !G.minigame && !P.frozen) throwBottle();
  if (e.code === BIND.use) pressInteract();
  if (e.code === 'Space') e.preventDefault();
});
document.addEventListener('keyup', (e) => { keys[e.code] = false; });
window.addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouseDown = false; });

export function lockPointer() {
  if (G.mobile) return;
  try { let r; try { r = canvas.requestPointerLock({ unadjustedMovement: true }); } catch (e2) { r = canvas.requestPointerLock(); } if (r && r.catch) r.catch(() => { try { canvas.requestPointerLock(); } catch (e3) { /* yok say */ } }); } catch (err) { /* yok say */ }
}
let lockFails = 0, clickTry = false;
document.addEventListener('pointerlockchange', () => {
  G.locked = document.pointerLockElement === canvas;
  if (G.locked) { G.noLock = false; lockFails = 0; }
  $('pause').classList.toggle('hide', G.locked || !G.started || G.noLock);
  if (G.locked) G.paused = false;
});
document.addEventListener('pointerlockerror', () => {
  if (clickTry && ++lockFails >= 3) setNoLock(); // tarayıcı kilidi hiç vermiyor: yumuşak moda geç
  clickTry = false;
  if (G.started && !G.noLock) $('pause').classList.remove('hide');
});
document.addEventListener('fullscreenchange', () => {
  setTimeout(() => { if (G.started && !G.locked && !G.noLock) lockPointer(); }, 250);
});
document.addEventListener('mousedown', (e) => {
  if (e.target.closest && e.target.closest('button, input, .panel, #pause')) return;
  if (G.started && !G.locked && !G.paused) { clickTry = true; lockPointer(); }
}, true);
document.addEventListener('contextmenu', (e) => { if (G.started) e.preventDefault(); });
export function setNoLock() {
  if (G.locked || !G.started) return;
  G.noLock = true;
  $('pause').classList.add('hide');
  toast('Tarayıcı fareyi kilitlemedi. Oyun yine de fareyle döner; imleç pencere kenarına varınca durur. Çözüm: dosyayı Chrome ile aç ya da masaüstü uygulamasını kullan.', 9000);
}
export function checkLockSoon() {
  if (G.mobile) return;
  G.noLock = false; lockFails = 0;
  setTimeout(() => { if (G.started && !G.locked && !G.noLock) $('pause').classList.remove('hide'); }, 900);
}
export function goFullscreen() {
  const el = document.documentElement;
  if (!document.fullscreenElement && el.requestFullscreen) { const r = el.requestFullscreen(); if (r && r.catch) r.catch(() => {}); }
}
export function toggleFullscreen() {
  if (document.fullscreenElement) { if (document.exitFullscreen) document.exitFullscreen(); } else goFullscreen();
}
export function setPaused(v) {
  G.paused = v;
  $('pause').classList.toggle('hide', !v && (G.locked || !G.started || G.noLock));
  if (!v && !G.locked && !G.noLock) { clickTry = true; lockPointer(); }
}
export function resume() { G.paused = false; $('pause').classList.add('hide'); if (!G.noLock) { clickTry = true; lockPointer(); } }
$('pause').addEventListener('click', (e) => { if (e.target === $('pause')) resume(); });

/* ---------- Etkileşim ---------- */
const ray = new THREE.Raycaster();
const center = new THREE.Vector2(0, 0);
function visible(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
function updateFocus() {
  ray.setFromCamera(center, camera);
  ray.far = 2.8;
  const hits = ray.intersectObjects(G.W.picks.concat(G.W.blockers), false);
  G.focus = null;
  for (const h of hits) {
    const o = h.object;
    if (!visible(o)) continue;
    const it = o.userData.inter;
    if (it && (it.dead || (it.can && it.can() === false))) continue;
    if (it) G.focus = it;
    break;
  }
}
function pressInteract() {
  const f = G.focus;
  if (!f || P.frozen || G.noteOpen || G.minigame) return;
  const c = f.can ? f.can() : true;
  if (c !== true) { if (typeof c === 'string') { toast(c); sfx.error(); } return; }
  if (f.hold) return;
  sfx.click();
  f.run();
}
let lastFocus = null, lastPrompt = '';
function updateHold(dt) {
  const holding = (keys[BIND.use] || mouseDown) && !P.frozen;
  if (!holding) G.holdLock = false;
  const f = G.focus;
  if (f !== lastFocus) { G.hold = 0; lastFocus = f; }
  const ok = f && f.hold && (f.can ? f.can() === true : true);
  const bar = $('holdbar');
  if (ok && holding && !G.holdLock) {
    const before = G.hold;
    G.hold += dt / f.hold;
    if (Math.floor(before * 6) !== Math.floor(G.hold * 6)) sfx.screw();
    bar.style.opacity = 1;
    bar.firstElementChild.style.width = `${Math.min(1, G.hold) * 100}%`;
    if (G.hold >= 1) { G.hold = 0; G.holdLock = true; bar.style.opacity = 0; f.run(); }
  } else {
    G.hold = 0; bar.style.opacity = 0;
  }
  // istem metni
  let html = '';
  if (f && !P.frozen && !G.noteOpen) {
    const c = f.can ? f.can() : true;
    const label = typeof f.label === 'function' ? f.label() : f.label;
    html = c === true ? `<b>E</b>${label}` : `<b>E</b>${label}`;
    if (c !== true) html = `<span style="opacity:.55"><b>E</b>${label}</span>`;
  }
  if (html !== lastPrompt) { $('prompt').innerHTML = html; lastPrompt = html; }
}

/* ---------- Oyuncu hareketi ---------- */
function collide(nx, nz) {
  const r = P.r;
  for (let it = 0; it < 3; it++) {
    for (const c of G.W.colliders) {
      if (c.disabled || c.maxY < 0.3 || c.minY > 1.8) continue;
      const cx = Math.max(c.minX, Math.min(nx, c.maxX));
      const cz = Math.max(c.minZ, Math.min(nz, c.maxZ));
      const dx = nx - cx, dz = nz - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2), push = r - d;
          nx += (dx / d) * push; nz += (dz / d) * push;
        } else {
          const l = nx - c.minX, rg = c.maxX - nx, t = nz - c.minZ, b = c.maxZ - nz;
          const m = Math.min(l, rg, t, b);
          if (m === l) nx = c.minX - r; else if (m === rg) nx = c.maxX + r;
          else if (m === t) nz = c.minZ - r; else nz = c.maxZ + r;
        }
      }
    }
  }
  return [nx, nz];
}
function movePlayer(dt) {
  let ix = 0, iz = 0;
  if (!P.frozen && !P.noMove && !G.noteOpen) {
    const arr = !G.noLock;
    ix = (keys[BIND.right] || (arr && keys.ArrowRight) ? 1 : 0) - (keys[BIND.left] || (arr && keys.ArrowLeft) ? 1 : 0);
    iz = (keys[BIND.back] || (arr && keys.ArrowDown) ? 1 : 0) - (keys[BIND.fwd] || (arr && keys.ArrowUp) ? 1 : 0);
    if (G.noLock) {
      P.yaw += ((keys.ArrowLeft ? 1 : 0) - (keys.ArrowRight ? 1 : 0)) * dt * 1.9;
      P.pitch = clamp(P.pitch + ((keys.ArrowUp ? 1 : 0) - (keys.ArrowDown ? 1 : 0)) * dt * 1.4, -1.45, 1.45);
    }
  }
  const len = Math.hypot(ix, iz);
  if (len > 0) { ix /= len; iz /= len; }
  const crouch = (keys[BIND.crouch] || keys.ControlLeft) && !P.frozen;
  const moving = ix !== 0 || iz !== 0;
  const sprint = !crouch && (keys[BIND.sprint] || keys.ShiftRight) && !(G.horror && G.tired) && !P.frozen;
  const sp = crouch ? 1.4 : (sprint ? 4.1 : 2.5);
  P.cr += ((crouch ? 1 : 0) - P.cr) * Math.min(1, dt * 8);
  P.sprinting = sprint;
  stepProj(dt);
  if (G.horror) {
    const be2 = document.getElementById('botn'); if (be2) be2.textContent = G.bottles;
    if (sprint && moving) G.stam = Math.max(0, G.stam - dt / (6 * (1 + 0.3 * upLevel('run'))));
    else G.stam = Math.min(1, G.stam + dt / (crouch ? 5 : 8));
    if (G.stam <= 0.002 && !G.tired) { G.tired = true; toast('Nefesim kesildi…', 2200); }
    if (G.tired && G.stam > 0.35) G.tired = false;
    G.breathT -= dt;
    if (G.breathT <= 0 && (G.tired || G.stam < 0.3)) {
      G.breathT = G.tired ? 1.2 : 2.0; sfx.breath(G.tired ? 0.22 : 0.12);
      if (G.tired) G.noiseBurst = Math.max(G.noiseBurst, 7);
    }
    const se = document.getElementById('stamfill');
    if (se) { se.style.width = (G.stam * 100).toFixed(1) + '%'; se.style.background = G.tired ? '#d33' : '#9ec8e8'; }
  }
  if (G.horror && G.flashOn && !P.frozen && !G.caught) {
    G.bat = Math.max(0, G.bat - dt * diff().bat / 210);
    if (G.bat <= 0) { G.flashOn = false; refreshFlash(); sfx.click(); toast('Pil bitti! Yeni pil bulmalısın.', 3500); }
  }
  if (G.horror) {
    const f = G.bat < 0.2 && G.flashOn ? (Math.sin(performance.now() * 0.04) * Math.sin(performance.now() * 0.013) > 0.2 - G.bat ? 0.25 : 1) : 1;
    flash.intensity = 80 * (1 + 0.3 * upLevel('lens')) * Math.min(1, 0.35 + G.bat * 3) * f;
    const be = document.getElementById('batfill');
    if (be) { be.style.width = (G.bat * 100).toFixed(1) + '%'; be.style.background = G.bat < 0.2 ? '#d33' : '#f2c14e'; }
  }
  const sin = Math.sin(P.yaw), cos = Math.cos(P.yaw);
  let tx = (ix * cos + iz * sin) * sp;
  let tz = (-ix * sin + iz * cos) * sp;
  if (P.autoV) { tx = P.autoV.x; tz = P.autoV.z; }
  const k = Math.min(1, dt * 10);
  P.vx += (tx - P.vx) * k; P.vz += (tz - P.vz) * k;
  const [nx, nz] = collide(P.x + P.vx * dt, P.z + P.vz * dt);
  P.x = nx; P.z = nz;
  const spd = Math.hypot(P.vx, P.vz);
  P.bob += spd * dt * 2.6;
  P.step += spd * dt;
  if (P.step > (sprint ? 1.7 : 1.35)) { P.step = 0; if (spd > 0.8 && !crouch) sfx.step(); }
  return spd;
}

/* ---------- Ana döngü ---------- */
let last = performance.now();
function runTweens(dt) {
  for (let i = G.tweens.length - 1; i >= 0; i--) {
    const w = G.tweens[i];
    w.t += dt;
    const k = Math.min(1, w.t / w.dur);
    w.o[w.k] = w.from + (w.to - w.from) * w.ease(k);
    if (k >= 1) { G.tweens.splice(i, 1); w.res(); }
  }
}
function menuTick(dt, t) {
  runTweens(dt);
  for (const f of G.W.updaters) f(dt, t);
  if (Math.abs(camera.fov - (G.fov + G.fovAdd)) > 0.01) { camera.fov = G.fov + G.fovAdd; camera.updateProjectionMatrix(); }
  camera.position.set(P.x + (Math.random() - 0.5) * G.shake, P.h + (Math.random() - 0.5) * G.shake, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
}
function update(dt, t) {
  runTweens(dt);
  for (const f of G.W.updaters) f(dt, t);
  let spd = 0;
  if (G.minigame) {
    if (G.minigame.update) G.minigame.update(dt);
    G.minigame.render(G.minigame.ctx);
  } else {
    spd = movePlayer(dt);
    updateFocus();
    updateHold(dt);
  }
  document.body.classList.toggle('horror', !!G.horror);
  if (Math.abs(camera.fov - (G.fov + G.fovAdd)) > 0.01) { camera.fov = G.fov + G.fovAdd; camera.updateProjectionMatrix(); }
  G.noiseBurst = Math.max(0, G.noiseBurst - dt * 4);
  const base = spd > 3.3 ? 20 : (spd > 1.1 ? (P.cr > 0.5 ? 2.5 : 7) : (spd > 0.4 ? 2 : 0));
  G.noise = Math.max(base * (1 - 0.15 * upLevel('soft')), G.noiseBurst);
  arms.visible = G.horror && !G.minigame && !G.noteOpen;
  if (arms.visible) {
    const sw = Math.sin(P.bob) * 0.22 * Math.min(1, spd / 2.5) * (P.autoV || P.sprinting ? 1.7 : 1) * (SET.bob ? 1 : 0.25);
    const rest = -0.55 - P.cr * 0.1, pz = G.armPose;
    armL.rotation.x = rest * (1 - pz) + 1.0 * pz + sw;
    armR.rotation.x = rest * (1 - pz) + 1.0 * pz - sw * 0.35;
    armL.rotation.y = 0.12 + pz * 0.3; armR.rotation.y = -0.12 - pz * 0.3;
    torchBody.visible = G.flashOn;
  }
  const bobY = Math.sin(P.bob) * 0.022 * Math.min(1, spd / 2.5);
  const bobX = Math.cos(P.bob * 0.5) * 0.012 * Math.min(1, spd / 2.5);
  camera.position.set(P.x + bobX + (Math.random() - 0.5) * G.shake, P.h + bobY - P.cr * 0.55 + (Math.random() - 0.5) * G.shake, P.z);
  camera.rotation.set(P.pitch, P.yaw, 0);
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const W = G.W;
  if (!W) return;
  if (live()) { update(dt, now / 1000); G.tz = false; } else { if (!G.tz) { A.tension(0); G.tz = true; } if (!G.started) menuTick(dt, now / 1000); }
  renderer.render(W.scene, camera);
}
export function startLoop() { requestAnimationFrame(frame); }

export function initAudio() { A.initAudio(); }
export const beacon = A.beacon;

/* El feneri (yalnızca korku bölümünde) */
const flash = new THREE.SpotLight(0xfff2d0, 80, 24, 0.6, 0.95, 1.8);
camera.add(flash);
camera.add(flash.target);
flash.target.position.set(0, 0, -1);
flash.castShadow = !/Android|iPhone|iPad/i.test(navigator.userAgent);
flash.shadow.mapSize.set(1024, 1024);
flash.shadow.bias = -0.0008;
flash.visible = false;
export function refreshFlash() { flash.visible = !!(G.horror && G.flashOn); }
export const ambient = A.ambient;
export const tension = A.tension;
export { plain, surf };

export function toMenu() {
  G.started = false;
  G.horror = false; G.taskTitle = null; refreshFlash();
  A.beacon(0);
  document.body.classList.remove('playing');
  const dg = $('danger'); if (dg) dg.style.opacity = 0;
  P.frozen = true;
  $('hud').classList.remove('on');
  if (document.pointerLockElement) document.exitPointerLock();
  $('pause').classList.add('hide'); G.paused = false;
  $('menu').classList.remove('hide');
  A.ambient({ hum: 0.05, air: 0.05, motor: 0 });
  if (G.onMenu) G.onMenu();
}
