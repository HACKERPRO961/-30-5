import * as THREE from 'three';
import {
  G, P, $, sfx, say, toast, setTasks, taskDone, newWorld, box, floor, ceil, hitbox, colBox,
  placePlayer, tween, wait, fadeTo, card, ambient, toMenu, surf, plain, refreshFlash, beacon,
} from './core.js';
import { wallMat, stainMat, scrawlMat, labelTex } from './util.js';
import { C, T, H, DX, DY, rnd, genMaze, bfs, openCount, losClear } from './maze.js';
import { buildCabin } from './cabin.js';
import { initMonsters } from './monsters.js';
import { LORE, FINAL_NOTE } from './lore.js';
import { showNote } from './core.js';
import { addCoins as addC, upLevel, diff, stat, statMax, unlock, STATS } from './meta.js';
const addCoins = (n) => addC(Math.round(n * diff().coin));

const WALL = 0xb4a45a;

const fmt = (n) => String(n).replace('.', ',');
export async function startHorror(n) {
  G.day = n; G.horror = true; G.taskTitle = n === 30.5 ? 'GÜN 30,5' : `GÜN ${n} / 30`;
  G.caught = false; G.cine = false; G.noCatch = false; G.punchT = 0; G.fov = 72; G.armPose = 0; G.shake = 0;
  P.frozen = true; P.noMove = false; P.autoV = null; P.cr = 0; P.h = 1.65;
  G.tweens.length = 0; G.S = {};
  $('hud').classList.remove('on');
  $('danger').style.opacity = 0;
  await fadeTo(1, 300);
  buildHorror(n);
  G.bat = (n === 1 || n === 30.5) ? 1 : Math.min(1, Math.max(G.bat, 0.6 + 0.12 * upLevel('bat'))); G.flashOn = true; G.stam = 1; G.tired = false; G.decoy = null; G.blackout = 0; G.flick = 0; G.offSeen = false; G.ranToday = false; G.bottles = Math.max(Math.min(3, G.bottles), (n === 1 || n === 30.5) ? 1 : 0) + upLevel('bot');
  refreshFlash();
  if (n === 1) { P.h = 0.28; P.pitch = 1.2; }
  if (n === 1) await card('KORKU', 'Gün 1 / 30', 2800); else await card(`GÜN ${fmt(n)}`, n === 30.5 ? 'Son gün' : '/ 30', 2400);
  $('hud').classList.add('on');
  await fadeTo(0, 1600);
  if (n === 1) {
    say('', 'Hâlâ... buradayım. Kalkmalıyım.', 4000);
    await Promise.all([tween(P, 'h', 1.65, 2.8), tween(P, 'pitch', 0, 2.8)]);
  }
  P.frozen = false;
  if (n === 30.5) say('', 'Her yerde oda var… ama yalnızca biri doğru. Uğultuyu dinle.', 9000);
  if (n === 1) {
    toast('Q: el feneri  ·  C: eğil (sessiz yürü)', 6000);
    say('', 'Güvenli bir oda bulmalıyım. Uyursam gün geçecek...', 7000);
  }
}

function buildHorror(n) {
  const S = G.S;
  const N = n === 1 ? 9 : Math.min(20, 15 + Math.floor((n - 1) / 6));
  const FINAL = n === 30.5;
  newWorld(0x050504, 0.085, 0.22);
  const W = G.W;
  const id = (x, y) => y * N + x;
  const cells = genMaze(N);
  const leaves = [];
  for (let i = 0; i < N * N; i++) if (openCount(cells, i) === 1) leaves.push(i);
  const cabId = leaves[rnd(leaves.length)];
  const cabD = cells[cabId].findIndex(Boolean);
  const cabX = cabId % N, cabY = Math.floor(cabId / N);
  const cabEntry = (cabY + DY[cabD]) * N + cabX + DX[cabD];
  let startId = cabEntry;
  if (n > 1) { do { startId = rnd(N * N); } while (startId === cabId); }
  const sx = startId % N, sy = Math.floor(startId / N);
  const dist = bfs(cells, N, sx, sy);
  const cand = leaves.filter((i) => i !== cabId && i !== startId).sort((a, b) => dist[b] - dist[a]);
  let pick = cand[rnd(Math.min(4, cand.length))];
  if (n === 1) { const near = cand.filter((i) => dist[i] >= 9).pop(); pick = near !== undefined ? near : cand[cand.length - 1]; }
  const roomIds = FINAL ? cand.filter((i) => i !== pick).sort(() => Math.random() - 0.5).slice(0, 15) : [];
  const roomSet = new Set([pick, ...roomIds]);
  const rx = pick % N, ry = Math.floor(pick / N);
  const keep = cells[pick].findIndex(Boolean);
  const cx = (rx + 0.5) * C, cz = (ry + 0.5) * C;
  S.safe = { x: cx, z: cz, d: keep };
  const entryId = (ry + DY[keep]) * N + rx + DX[keep];

  // zemin ve tavan
  floor(0, 0, N * C, N * C, 'carpet');
  ceil(0, 0, N * C, N * C, H, 'ceiling');

  // duvarlar
  const wm = surf('paint', C + T, H, { color: WALL });
  const vWall = (x, y) => box([T, H, C + T], [x * C, H / 2, (y + 0.5) * C], wallMat(x * 3 + y * 7), { solid: true });
  const hWall = (x, y) => box([C + T, H, T], [(x + 0.5) * C, H / 2, y * C], wallMat(x * 5 + y * 2 + 1), { solid: true });
  for (let y = 0; y < N; y++) for (let x = 0; x <= N; x++) {
    if (x === 0 || x === N || !cells[id(x - 1, y)][1]) vWall(x, y);
  }
  for (let x = 0; x < N; x++) for (let y = 0; y <= N; y++) {
    if (y === 0 || y === N || !cells[id(x, y - 1)][2]) hWall(x, y);
  }

  // zemin lekeleri ve duvar yazıları
  {
    const stainGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < N * 3; i++) {
      const c = rnd(N * N);
      if (c === cabId) continue;
      const m = new THREE.Mesh(stainGeo, stainMat(Math.random() < 0.3 ? '60,8,8' : '35,25,10'));
      const s = 0.6 + Math.random() * 1.6;
      m.scale.set(s, s, 1); m.rotation.set(-Math.PI / 2, 0, Math.random() * 6.28);
      m.position.set(((c % N) + 0.2 + Math.random() * 0.6) * C, 0.012, (Math.floor(c / N) + 0.2 + Math.random() * 0.6) * C);
      W.scene.add(m);
    }
    const words = ['KOŞMA', 'SUS', 'GERİ DÖN', 'UYU', 'ARKANDA', 'BURADA', 'SAKLAN', 'YALNIZ DEĞİLSİN', 'DUY', 'BAKMA'];
    const walls = W.blockers.filter((b) => b.geometry.parameters.height === H);
    const used = new Set();
    for (let k = 0; k < Math.min(walls.length, FINAL ? 34 : 18); k++) {
      const w = walls[rnd(walls.length)];
      if (used.has(w)) continue; used.add(w);
      const gp = w.geometry.parameters, alongZ = gp.depth > gp.width;
      if (w.position.x < 1 || w.position.z < 1 || w.position.x > N * C - 1 || w.position.z > N * C - 1) continue;
      const side = Math.random() < 0.5 ? 1 : -1;
      const off = (alongZ ? gp.width : gp.depth) / 2 + 0.012;
      const along = (Math.random() - 0.5) * 2.2;
      const wordPick = words[rnd(words.length)];
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 0.55), scrawlMat(wordPick));
      if (alongZ) { m.position.set(w.position.x + side * off, 1.2 + Math.random() * 0.8, w.position.z + along); m.rotation.y = side * Math.PI / 2; }
      else { m.position.set(w.position.x + along, 1.2 + Math.random() * 0.8, w.position.z + side * off); m.rotation.y = side > 0 ? 0 : Math.PI; }
      W.scene.add(m);
    }
  }

  const lamps = [];
  function makeRoom(pid, d, correct) {
    const cx = ((pid % N) + 0.5) * C, cz = (Math.floor(pid / N) + 0.5) * C;
    const ox = DX[d], oz = DY[d];
    let opened = false;
    const lx = cx + ox * C / 2, lz = cz + oz * C / 2;
    const alongZ = ox !== 0;
    const sl = C / 2 + T / 2 - 0.6;
    for (const sgn of [-1, 1]) {
      const off = 0.6 + sl / 2;
      if (alongZ) box([T, H, sl], [lx, H / 2, lz + sgn * off], wm, { solid: true });
      else box([sl, H, T], [lx + sgn * off, H / 2, lz], wm, { solid: true });
    }
    box(alongZ ? [T, 0.6, 1.2] : [1.2, 0.6, T], [lx, H - 0.3, lz], wm, { cast: false });
    const dm = surf('metal', 1.2, 2.4, { color: 0x4a6a58 });
    const door = box(alongZ ? [0.12, 2.4, 1.2] : [1.2, 2.4, 0.12], [lx, 1.2, lz], dm);
    const dcol = colBox(alongZ ? lx - 0.08 : lx - 0.6, alongZ ? lz - 0.6 : lz - 0.08, alongZ ? lx + 0.08 : lx + 0.6, alongZ ? lz + 0.6 : lz + 0.08, 0, 3);
    // uzaktan görünen yeşil tabela (sisten etkilenmez)
    {
      const tx = labelTex([{ t: 'GÜVENLİ ODA', font: 'bold 52px Arial' }], { w: 384, h: 96, bg: '#0a3a1a', fg: '#7dffa4' });
      const sm = new THREE.MeshBasicMaterial({ map: tx, fog: false, toneMapped: false });
      const sg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.225), sm);
      sg.position.set(lx + ox * 0.14, 2.72, lz + oz * 0.14); sg.rotation.y = Math.atan2(ox, oz);
      W.scene.add(sg);
      const sg2 = sg.clone(); sg2.position.set(lx - ox * 0.14, 2.72, lz - oz * 0.14); sg2.rotation.y = Math.atan2(-ox, -oz); W.scene.add(sg2);
    }
    // yanında loş yeşil bir nokta
    box([0.06, 0.06, 0.06], [lx + ox * 0.09, 2.15, lz + oz * 0.09], plain(0x103018, { emissive: 0x3dff7a, ei: 1.5 }), { cast: false });
    hitbox([lx, 1.2, lz], alongZ ? [0.8, 2.4, 1.4] : [1.4, 2.4, 0.8], {
      label: 'Kapıyı aç',
      can: () => (opened ? false : true),
      async run() {
        this.dead = true; opened = true; sfx.clunk(); sfx.creak();
        dcol.disabled = true;
        if (alongZ) await tween(door.position, 'z', lz + 1.2, 1.2); else await tween(door.position, 'x', lx + 1.2, 1.2);
      },
    });

    // oda içi
    const px = alongZ ? 0 : 1, pz = alongZ ? 1 : 0;
    box([0.6, 0.5, 0.6], [cx - ox * 1.2 + px * 1.55, 0.25, cz - oz * 1.2 + pz * 1.55], plain(0x3a2a1c, { rough: 0.8 }), { solid: true });
    const bx = cx - ox * 1.2, bz = cz - oz * 1.2;
    const bedSize = alongZ ? [1.0, 0.3, 2.2] : [2.2, 0.3, 1.0];
    box([bedSize[0] + 0.1, 0.18, bedSize[2] + 0.1], [bx, 0.09, bz], plain(0x2e2418, { rough: 0.8 }), { solid: true });
    box(bedSize, [bx, 0.33, bz], plain(0x7a8a82, { rough: 0.95 }), { cast: false });
    box([0.45, 0.12, 0.45], [bx + px * 0.8, 0.52, bz + pz * 0.8], plain(0xd8d2c0, { rough: 0.95 }), { cast: false });
    const em = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffb870, emissiveIntensity: 2.2 });
    const lm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.25), em);
    lm.position.set(cx, H - 0.04, cz); W.scene.add(lm);
    if (FINAL) lamps.push({ x: cx, z: cz, em, dead: false, ph: 0, fl: false, warm: true });
    else {
      const L = new THREE.PointLight(0xffb870, 26, 0, 2);
      L.position.set(cx, H - 0.5, cz); W.scene.add(L);
    }
    hitbox([bx, 0.4, bz], [bedSize[0] + 0.3, 0.8, bedSize[2] + 0.3], {
      label: 'Uyu',
      can: () => (S.threat && S.threat() ? 'Dışarıda bir şey var… Sessiz ol, uyuyamam.' : true),
      run: () => (!correct ? wrongRoom(cx, cz, ox, oz) : (FINAL ? finale() : sleep(n))),
    });
  }
  makeRoom(pick, keep, true);
  for (const rid of roomIds) makeRoom(rid, cells[rid].findIndex(Boolean), false);

  // tavan lambaları (gerçek ışık yok, 4'lük havuz yakın lambaları aydınlatır)
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    if ((x * 7 + y * 13) % 4 !== 0 || roomSet.has(id(x, y)) || id(x, y) === cabId) continue;
    const dead = Math.random() < 0.25;
    const em = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffe3a0, emissiveIntensity: dead ? 0 : 2 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.04, 0.35), em);
    const lx = (x + 0.5) * C, lz = (y + 0.5) * C;
    m.position.set(lx, H - 0.03, lz); W.scene.add(m);
    lamps.push({ x: lx, z: lz, em, dead, ph: Math.random() * 10, fl: Math.random() < 0.35 });
  }
  // piller
  {
    const cand = [];
    for (let i = 0; i < N * N; i++) if (!roomSet.has(i) && i !== cabId && i !== startId) cand.push(i);
    for (let k = 0; k < (FINAL ? 7 : 5) && cand.length; k++) {
      const ci = cand.splice(rnd(cand.length), 1)[0];
      const bx = ((ci % N) + 0.5) * C + (Math.random() - 0.5) * 1.6, bz = (Math.floor(ci / N) + 0.5) * C + (Math.random() - 0.5) * 1.6;
      const g = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, roughness: 0.4, metalness: 0.5, emissive: 0x0a3a14, emissiveIntensity: 0.8 }));
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.02, 8), new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.8, roughness: 0.3 }));
      cap.position.y = 0.065; g.add(body, cap);
      g.rotation.z = Math.PI / 2; g.position.set(bx, 0.04, bz); g.rotation.y = Math.random() * 6;
      W.scene.add(g);
      const hb = hitbox([bx, 0.15, bz], [0.7, 0.4, 0.7], {
        label: 'Pil al',
        run: () => {
          G.bat = Math.min(1, G.bat + 0.5); g.visible = false; stat('batteries');
          W.picks.splice(W.picks.indexOf(hb.mesh), 1); W.scene.remove(hb.mesh);
          sfx.click(); toast('Pil takıldı.', 1800);
        },
      });
    }
  }
  for (let k = 0; k < 4; k++) {
    const ci = rnd(N * N); if (roomSet.has(ci) || ci === cabId) continue;
    const bx = ((ci % N) + 0.5) * C + (Math.random() - 0.5) * 2, bz = (Math.floor(ci / N) + 0.5) * C + (Math.random() - 0.5) * 2;
    const g = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.24, 8), new THREE.MeshStandardMaterial({ color: 0x3a7a4a, roughness: 0.2, metalness: 0.2, transparent: true, opacity: 0.85 }));
    g.rotation.z = Math.PI / 2; g.position.set(bx, 0.045, bz); W.scene.add(g);
    const hb = hitbox([bx, 0.15, bz], [0.7, 0.4, 0.7], {
      label: 'Şişe al',
      run: () => {
        if (G.bottles >= 5) { toast('Daha fazla taşıyamam.', 1500); return; }
        G.bottles++; g.visible = false;
        W.picks.splice(W.picks.indexOf(hb.mesh), 1); W.scene.remove(hb.mesh);
        sfx.pick(); toast('Şişe alındı. G: at (canavarın dikkatini dağıtır).', 3000);
      },
    });
  }
  // 1. gün öğreticisi: yeşil ok izi + yoldaki pil
  const TUT = n === 1;
  if (TUT) {
    const df = bfs(cells, N, rx, ry);
    const path = [];
    let cur = startId, guard = 0;
    while (cur !== pick && guard++ < 200) {
      path.push(cur);
      const cxx = cur % N, cyy = Math.floor(cur / N);
      let best = -1;
      for (let d = 0; d < 4; d++) {
        if (!cells[cur][d]) continue;
        const nx = cxx + DX[d], ny = cyy + DY[d], ni = ny * N + nx;
        if (df[ni] >= 0 && df[ni] < df[cur]) { best = ni; break; }
      }
      if (best < 0) break;
      cur = best;
    }
    const mat = new THREE.MeshBasicMaterial({ color: 0x33ff77, transparent: true, opacity: 0.6, depthWrite: false });
    const geo = new THREE.CircleGeometry(0.28, 3);
    for (let i = 2; i < path.length; i++) {
      const a = path[i], b = path[i + 1] !== undefined ? path[i + 1] : pick;
      const ax = ((a % N) + 0.5) * C, az = (Math.floor(a / N) + 0.5) * C, bx = ((b % N) + 0.5) * C, bz = (Math.floor(b / N) + 0.5) * C;
      const gr = new THREE.Group(); gr.position.set(ax, 0.03, az); gr.rotation.y = Math.atan2(-(bz - az), bx - ax);
      const ms = new THREE.Mesh(geo, mat); ms.rotation.x = -Math.PI / 2; gr.add(ms); W.scene.add(gr);
    }
    // yol üstüne öğretici pil
    const pc = path[Math.min(3, path.length - 1)];
    const tx = ((pc % N) + 0.5) * C + 0.8, tz = (Math.floor(pc / N) + 0.5) * C;
    const tg = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.11, 10), new THREE.MeshStandardMaterial({ color: 0x2a6a3a, emissive: 0x1a8a34, emissiveIntensity: 1.2 }));
    tg.rotation.z = Math.PI / 2; tg.position.set(tx, 0.04, tz); W.scene.add(tg);
    const tl = new THREE.PointLight(0x33ff77, 3, 4); tl.position.set(tx, 0.5, tz); W.scene.add(tl);
    const thb = hitbox([tx, 0.15, tz], [0.9, 0.5, 0.9], {
      label: 'Pil al',
      run: () => {
        G.bat = Math.min(1, G.bat + 0.5); tg.visible = false; tl.intensity = 0; stat('batteries');
        W.picks.splice(W.picks.indexOf(thb.mesh), 1); W.scene.remove(thb.mesh);
        sfx.click(); toast('Pil takıldı.', 1800); taskDone('t_bat');
      },
    });
  }
  // günlük sayfası
  {
    const pi = FINAL ? 30 : n;
    let got = [];
    try { got = JSON.parse(localStorage.getItem('a305_pages') || '[]'); } catch (e) { got = []; }
    const ci = (() => { let c; let t = 0; do { c = rnd(N * N); t++; } while ((roomSet.has(c) || c === cabId || c === startId) && t < 80); return c; })();
    const px = ((ci % N) + 0.5) * C + (Math.random() - 0.5) * 1.6, pz = (Math.floor(ci / N) + 0.5) * C + (Math.random() - 0.5) * 1.6;
    const pg = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 0.28), new THREE.MeshStandardMaterial({ color: 0xe6dcb8, roughness: 0.9, emissive: 0x3a3320, emissiveIntensity: 0.9 }));
    pg.rotation.x = -Math.PI / 2; pg.rotation.z = Math.random() * 6; pg.position.set(px, 0.02, pz); W.scene.add(pg);
    const hb = hitbox([px, 0.15, pz], [0.8, 0.4, 0.8], {
      label: got.includes(pi) ? 'Sayfayı tekrar oku' : 'Sayfayı al',
      run: () => {
        showNote(`Günlük · Sayfa ${pi}`, `<p>${pi === 30 ? LORE[29] + '</p><p>' + FINAL_NOTE : LORE[pi - 1]}</p>`);
        if (!got.includes(pi)) {
          got.push(pi);
          try { localStorage.setItem('a305_pages', JSON.stringify(got)); } catch (e) { /* kayıt yok */ }
          stat('pages'); unlock('page1'); if (got.length >= 10) unlock('page10'); if (got.length >= 30) unlock('page30');
          addCoins(5); toast(`Günlük sayfaları: ${got.length}/30 · +${Math.round(5 * diff().coin)} kuruş`, 3000);
        }
      },
    });
    void hb;
  }
  const pool = [];
  for (let i = 0; i < 4; i++) {
    const L = new THREE.PointLight(0xffe3a0, 0, 0, 2);
    L.position.set(0, H - 0.4, 0); W.scene.add(L); pool.push(L);
  }
  const roomDist = bfs(cells, N, rx, ry);
  const cabDist = bfs(cells, N, cabX, cabY);
  const doorX = cx + DX[keep] * C / 2, doorZ = cz + DY[keep] * C / 2;
  let distantT = 12 + Math.random() * 15;
  let evT = (40 + Math.random() * 40) * diff().ev;
  W.updaters.push((dt, t) => {
    if (TUT) {
      if (!G.offSeen && !G.flashOn) G.offSeen = true;
      if (G.offSeen && G.flashOn) taskDone('t_flash');
      if (P.cr > 0.6) taskDone('t_crouch');
      if (P.sprinting) taskDone('t_run');
    }
    if (P.sprinting) G.ranToday = true;
    if (G.blackout > 0) G.blackout -= dt;
    if (G.flick > 0) G.flick -= dt;
    if (!G.cine && !G.caught && !S.ending && !P.frozen && (evT -= dt) <= 0) {
      evT = (45 + Math.random() * 60) * diff().ev;
      const e = rnd(5);
      if (e === 0) { G.blackout = 5 + Math.random() * 4; sfx.buzz(); setTimeout(() => sfx.thud(), 250); toast('Işıklar gitti…', 2500); }
      else if (e === 1) { sfx.distant(); setTimeout(() => sfx.mvoice(['blind', 'deaf', 'super'][rnd(3)], 0.3), 700); }
      else if (e === 2) { G.flick = 3.5; sfx.buzz(); }
      else if (e === 3) { sfx.thud(); setTimeout(() => sfx.creak(), 500); }
      else { for (let k = 0; k < 5; k++) setTimeout(() => sfx.mstep(0.1, 'blind'), 450 * k); setTimeout(() => sfx.sniff(0.08), 2600); }
    }
    const near = lamps.filter((l) => !l.dead)
      .map((l) => ({ l, d: (l.x - P.x) ** 2 + (l.z - P.z) ** 2 }))
      .sort((a, b) => a.d - b.d).slice(0, 4);
    for (let i = 0; i < 4; i++) {
      if (near[i]) {
        const l = near[i].l;
        let fl = l.fl ? (Math.sin(t * 23 + l.ph) * Math.sin(t * 7.3 + l.ph) > 0.55 ? 0.15 : 1) : 1;
        if (G.blackout > 0) fl = G.blackout < 0.7 ? (Math.random() < 0.5 ? 1 : 0) : 0;
        else if (G.flick > 0 && Math.random() < 0.55) fl = 0.08;
        pool[i].position.set(l.x, H - 0.4, l.z);
        pool[i].intensity = (l.warm ? 20 : 24) * fl;
        pool[i].color.setHex(l.warm ? 0xffb870 : 0xffe3a0);
        l.em.emissiveIntensity = 2 * fl;
      } else pool[i].intensity = 0;
    }
    // güvenli odanın sıcak uğultusu
    const tx = S.finalRun ? ccx : cx, tz = S.finalRun ? ccz : cz;
    const pcell = Math.max(0, Math.min(N - 1, Math.floor(P.z / C))) * N + Math.max(0, Math.min(N - 1, Math.floor(P.x / C)));
    const dd = S.finalRun ? cabDist : roomDist;
    const dpath = dd[pcell] < 0 ? 99 : dd[pcell] * C + Math.hypot(P.x - ((pcell % N) + 0.5) * C, P.z - (Math.floor(pcell / N) + 0.5) * C) * 0.5;
    const d = Math.hypot(P.x - tx, P.z - tz);
    beacon(dpath < 46 ? Math.pow(1 - dpath / 46, 2) * (S.finalRun ? 0.16 : 0.1) : 0);
    if (S.finalRun && !S.ending && S.cabin) {
      const [lx, lz] = S.cabin.local(P.x, P.z);
      if (Math.abs(lx) < 1.1 && lz > -1.3 && lz < 1.4) ending();
    }
    if (!FINAL && !S.found && dpath < 6 && losClear(cells, N, P.x, P.z, doorX, doorZ)) { S.found = true; taskDone('find'); say('', 'Bir kapı... Yeşil bir ışık.', 4500); }
    if (n === 1 && S.cabin && !S.cabin.sealed && !S.cabin.sealing && !P.frozen && S.cabin.along(P.x, P.z) > 2.7) {
      S.cabin.seal();
      say('', 'Kapılar... kapandı. Duvar da kapandı. Geri dönüş yok.', 5500);
    }
    distantT -= dt;
    if (distantT <= 0) { distantT = 16 + Math.random() * 25; sfx.distant(); }
  });

  // asansör kabini: çıkmaz hücrede kalıcı
  const [ccx, ccz] = [(cabX + 0.5) * C, (cabY + 0.5) * C];
  const cabin = buildCabin(W, { cx: ccx, cz: ccz, d: cabD, sealed: n > 1 });
  S.cabin = cabin;
  if (n === 1) {
    const [px, pz] = cabin.startPos();
    placePlayer(px, pz, cabin.th);
  } else {
    placePlayer((sx + 0.5) * C, (sy + 0.5) * C, rnd(4) * Math.PI / 2);
  }

  setTasks(TUT ? [
    { id: 't_flash', text: 'Feneri kapat ve tekrar aç (Q)' },
    { id: 't_crouch', text: 'Eğilerek yürü (C)' },
    { id: 't_run', text: 'Koş (Shift)' },
    { id: 't_bat', text: 'Yeşil ışıklı pili al (E)' },
    { id: 'find', text: 'Yeşil okları izle: güvenli odayı bul' },
    { id: 'sleep', text: 'İçeri gir ve yatakta uyu (E)' },
  ] : [
    { id: 'find', text: FINAL ? 'Doğru odayı bul' : 'Güvenli odayı bul' },
    { id: 'sleep', text: FINAL ? 'Doğru odada uyu' : 'İçeri gir ve uyu' },
  ]);
  ambient({ hum: 0.03, air: 0.06, motor: 0 });
  S.n = n;
  S.mon = initMonsters({ cells, N, n, startId, safeId: pick, entryId, cabId, extraBlocked: roomIds, onCaught: () => { stat('caught'); unlock('caught1'); if (STATS.caught >= 10) unlock('caught10'); startHorror(n); } });
}

async function sleep(n) {
  P.frozen = true; G.noCatch = true;
  taskDone('sleep');
  addCoins(10); toast(`+${Math.round(10 * diff().coin)} kuruş`, 2500);
  stat('sleeps'); statMax('best', n); unlock('first_night');
  if (n >= 7) unlock('week');
  if (n >= 15) unlock('half');
  if (n === 30) unlock('last');
  if (n >= 2 && !G.ranToday) unlock('quiet');
  if (G.bat <= 0) unlock('dark');
  if (n >= 3 && diff().mon > 1.1) unlock('nightmare');
  try { localStorage.setItem('a305_h', String(n === 30 ? 30.5 : n + 1)); } catch (e) { /* yok say */ }
  ambient({ hum: 0, air: 0, motor: 0 }); beacon(0);
  await fadeTo(1, 1800);
  if (n === 30) {
    await card('GÜN 30 TAMAMLANDI', 'Uyudun. Ama bu sefer her şey farklı.', 3600);
    startHorror(30.5);
    return;
  }
  await card(`GÜN ${n} TAMAMLANDI`, 'Uyudun. Hâlâ buradasın.', 3200);
  startHorror(n + 1);
}

async function wrongRoom(x, z, ox, oz) {
  const S = G.S;
  if (S.busy) return;
  S.busy = true; P.frozen = true;
  sfx.creak();
  say('', 'Bir şey yanlış… bu oda… bu doğru oda değil.', 3000);
  await wait(1100);
  G.shake = 0.03; sfx.sting();
  await wait(800);
  S.mon.jumpscare(x + ox * 1.3, z + oz * 1.3);
}

async function finale() {
  const S = G.S;
  if (S.busy) return;
  S.busy = true; P.frozen = true; G.noCatch = true;
  taskDone('sleep');
  ambient({ hum: 0, air: 0, motor: 0 }); beacon(0);
  await fadeTo(1, 1800);
  await card('30,5', 'Uyudun. Bir şey değişti…', 3400);
  S.finalRun = true; S.busy = false;
  setTasks([{ id: 'run', text: 'Asansöre ulaş' }]);
  S.cabin.unseal();
  S.mon.alertAll();
  ambient({ hum: 0.04, air: 0.08, motor: 0.03, pitch: 40 });
  await fadeTo(0, 1500);
  P.frozen = false; G.noCatch = false;
  sfx.rumble();
  say('', 'Duvar açıldı… asansör! Koşmalıyım!', 6500);
}

async function ending() {
  const S = G.S, c = S.cabin;
  if (S.ending) return;
  S.ending = true; G.noCatch = true; P.frozen = true; P.autoV = null;
  taskDone('run');
  addCoins(100); stat('escapes'); unlock('escape');
  while (c.sealed) await wait(200);
  ambient({ hum: 0.05, air: 0, motor: 0.08, pitch: 30 }); beacon(0);
  await c.seal();
  G.shake = 0.012; sfx.rumble();
  say('', 'Yukarı çıkıyor…', 4000);
  await wait(3500);
  sfx.ding(); await wait(700); sfx.ding();
  await fadeTo(1, 2600);
  G.shake = 0; ambient({ hum: 0, air: 0, motor: 0 });
  await card('KAÇTIN', '30 Şubat 2009 — Gün 30,5', 5200);
  await card('SON', 'Oynadığın için teşekkürler.', 4200);
  toMenu();
  await fadeTo(0, 700);
}
