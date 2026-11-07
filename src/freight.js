import * as THREE from 'three';
import {
  G, P, sfx, say, toast, setTasks, taskDone, showNote, openMinigame,
  newWorld, box, cyl, plane, hitbox, colBox, placePlayer, tween, wait, fadeTo,
  ambient, surf, plain,
} from './core.js';
import { screen, labelTex } from './util.js';
import { timingGame } from './minigames.js';
import { startHorror } from './horror.js';

const PI = Math.PI;
const KEMAL = 'Kemal Usta (telsiz)';
const YEL = 0xb4a45a;

function groupLamp(group, x, y, z, int, color = 0xfff1d6, size = [1.2, 0.05, 0.3]) {
  const em = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: color, emissiveIntensity: 2.2 });
  const m = new THREE.Mesh(new THREE.BoxGeometry(...size), em);
  m.position.set(x, y, z); group.add(m);
  const L = new THREE.PointLight(color, int, 0, 2);
  L.position.set(x, y - 0.2, z); group.add(L);
  return { L, em, base: int };
}

export function buildFreight() {
  const S = G.S;
  newWorld(0x050607, 0.035, 0.34);
  const scene = G.W.scene;

  /* ---- Yük kabini (merkez 0,0; kapılar kuzeyde z=-1.6) ---- */
  const mt = (w, h) => surf('metal', w, h, { color: 0x8a8e92 });
  box([2.6, 0.06, 3.2], [0, 0.03, 0], surf('rubber', 2.6, 3.2), { cast: false });
  box([0.06, 2.8, 3.2], [-1.3, 1.4, 0], mt(3.2, 2.8), { cast: false });
  box([0.06, 2.8, 3.2], [1.3, 1.4, 0], mt(3.2, 2.8), { cast: false });
  box([2.6, 2.8, 0.06], [0, 1.4, 1.6], mt(2.6, 2.8), { cast: false });
  box([2.6, 0.06, 3.2], [0, 2.8, 0], mt(2.6, 3.2), { cast: false });
  box([0.4, 2.8, 0.06], [-1.1, 1.4, -1.6], mt(0.4, 2.8), { cast: false });
  box([0.4, 2.8, 0.06], [1.1, 1.4, -1.6], mt(0.4, 2.8), { cast: false });
  box([1.8, 0.4, 0.06], [0, 2.6, -1.6], mt(1.8, 0.4), { cast: false });
  colBox(-1.33, -1.65, -1.27, 1.65); colBox(1.27, -1.65, 1.33, 1.65); colBox(-1.3, 1.57, 1.3, 1.63);
  colBox(-1.3, -1.65, -0.9, -1.55); colBox(0.9, -1.65, 1.3, -1.55);
  box([2.4, 0.05, 0.05], [0, 1.0, 1.55], plain(0xa7adb3, { rough: 0.3, metal: 0.9 }), { cast: false });

  const door = { open: 1 };
  const dmat = surf('metal', 0.9, 2.4, { color: 0xb8bcc0 });
  const dL = box([0.9, 2.4, 0.06], [-0.45, 1.2, -1.65], dmat, { cast: false });
  const dR = box([0.9, 2.4, 0.06], [0.45, 1.2, -1.65], dmat, { cast: false });
  G.W.updaters.push(() => { dL.position.x = -0.45 - 0.85 * door.open; dR.position.x = 0.45 + 0.85 * door.open; });
  const doorCol = colBox(-0.9, -1.75, 0.9, -1.5);
  doorCol.disabled = true;

  const cabLamp = (() => {
    const em = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xfff1d6, emissiveIntensity: 2.2 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.4), em);
    m.position.set(0, 2.77, 0); scene.add(m);
    const L = new THREE.PointLight(0xfff1d6, 26, 0, 2);
    L.position.set(0, 2.35, 0.2); L.castShadow = true; L.shadow.mapSize.set(1024, 1024); L.shadow.bias = -0.002;
    scene.add(L);
    const o = { L, em, base: 26, mul: 1 };
    G.W.updaters.push(() => { L.intensity = o.base * o.mul; em.emissiveIntensity = 2.2 * o.mul; });
    return o;
  })();

  /* Gösterge */
  const disp = screen(128, 64);
  const drawDisp = (t, col = '#ff6a2a') => {
    disp.g.fillStyle = '#050505'; disp.g.fillRect(0, 0, 128, 64);
    disp.g.fillStyle = col; disp.g.font = 'bold 40px monospace';
    disp.g.textAlign = 'center'; disp.g.textBaseline = 'middle'; disp.g.fillText(t, 64, 34); disp.update();
  };
  drawDisp('14');
  plane(0.6, 0.3, [0, 2.3, -1.56], 0, new THREE.MeshBasicMaterial({ map: disp.tex }));

  /* Kontrol paneli (batı duvarı) */
  box([0.1, 1.0, 0.7], [-1.22, 1.35, 0.0], plain(0x4a4f55, { rough: 0.5, metal: 0.6 }), { cast: false });
  plane(0.6, 0.3, [-1.168, 1.6, 0.0], PI / 2, new THREE.MeshBasicMaterial({
    map: labelTex([{ t: 'DENETİM MODU', color: '#ffb040' }, { t: 'SERVİS', color: '#ff4a3a', font: 'bold 34px monospace' }], { w: 256, h: 128, bg: '#120c04', font: 'bold 24px monospace' }),
  }));
  const lever = new THREE.Group(); lever.position.set(-1.14, 1.2, 0.0); scene.add(lever);
  box([0.04, 0.04, 0.3], [0, 0, 0.15], plain(0xb01818, { rough: 0.4 }), { parent: lever });
  lever.rotation.y = -0.5;
  box([0.06, 0.16, 0.16], [-1.15, 0.95, 0.0], plain(0xb0b4b8, { rough: 0.3, metal: 0.8 }), { cast: false });

  /* Yük sensörü kablosu ve klemens */
  const cable = cyl(0.015, 1.2, [1.0, 0.06, 0.9], plain(0x111111, { rough: 0.5 }), { rot: [PI / 2, 0, 0], seg: 6, cast: false });
  cable.rotation.z = 0.15;
  box([0.5, 0.04, 0.5], [1.0, 0.08, 0.45], plain(0x6a6e72, { rough: 0.4, metal: 0.7 }), { cast: false });
  const term = box([0.14, 0.14, 0.08], [1.24, 0.6, 1.2], plain(0x806a00, { rough: 0.5, metal: 0.4 }), { cast: false });
  hitbox([1.0, 0.1, 0.8], [0.8, 0.3, 1.0], {
    label: 'Yük sensörü kablosunu incele', hold: 1.4,
    run() { this.dead = true; S.cable = true; sfx.pick(); taskDone('cable'); toast('Kablo ezilmiş, klemens gevşemiş.'); },
  });
  hitbox([1.2, 0.6, 1.15], [0.4, 0.4, 0.3], {
    label: 'Klemensi sık',
    can: () => (S.clamped ? false : (S.cable ? true : 'Önce yük sensörü kablosunu incele.')),
    run() {
      openMinigame(timingGame(1.25, () => {
        S.clamped = true; term.material = plain(0x2a7a3a, { rough: 0.4, metal: 0.5 }); taskDone('clamp');
        say(KEMAL, 'Tamam, klemens tamam. Denetim anahtarını normale al da bir deneyelim.', 6000);
      }));
    },
  });
  hitbox([-1.12, 1.2, 0.0], [0.3, 0.4, 0.5], {
    label: 'Denetim anahtarını NORMAL konuma al',
    can: () => (S.normal ? false : (S.clamped ? true : 'Klemens sağlam değil, önce onu sık.')),
    async run() {
      S.normal = true; sfx.lever();
      await tween(lever.rotation, 'y', 0.5, 0.4);
      sfx.thud(); taskDone('normal');
    },
  });
  /* B1 butonu */
  box([0.1, 0.5, 0.2], [-1.22, 0.9, -0.75], plain(0x4a4f55, { rough: 0.5, metal: 0.6 }), { cast: false });
  cyl(0.04, 0.03, [-1.15, 1.05, -0.75], plain(0x442200, { emissive: 0xff7a20, ei: 1.5 }), { rot: [0, 0, PI / 2], cast: false });
  plane(0.14, 0.1, [-1.165, 0.88, -0.75], PI / 2, new THREE.MeshBasicMaterial({ map: labelTex(['B1'], { w: 96, h: 64, bg: '#111', fg: '#fff', font: 'bold 34px Arial' }) }));
  hitbox([-1.1, 0.98, -0.75], [0.25, 0.4, 0.3], {
    label: 'B1 — test sürüşü',
    can: () => (S.riding ? false : (S.normal ? true : 'Denetim modundan çıkmadan sürüş olmaz.')),
    run: () => freightRide(),
  });

  /* ---- Yükleme rampası (kapıların dışı) ---- */
  const dock = new THREE.Group(); scene.add(dock);
  box([10, 0.2, 9], [0, -0.1, -6.1], surf('concrete', 10, 9), { parent: dock, cast: false });
  box([10, 3.4, 0.2], [0, 1.7, -10.7], surf('concrete', 10, 3.4), { parent: dock, solid: true });
  box([0.2, 3.4, 9], [-5, 1.7, -6.1], surf('concrete', 9, 3.4), { parent: dock, solid: true });
  box([0.2, 3.4, 9], [5, 1.7, -6.1], surf('concrete', 9, 3.4), { parent: dock, solid: true });
  box([10, 0.2, 9], [0, 3.4, -6.1], surf('ceiling', 10, 9), { parent: dock, cast: false });
  box([5, 3.4, 0.2], [-2.5 - 1.3, 1.7, -1.7], surf('concrete', 5, 3.4), { parent: dock, solid: true });
  box([5, 3.4, 0.2], [2.5 + 1.3, 1.7, -1.7], surf('concrete', 5, 3.4), { parent: dock, solid: true });
  for (const [cx, cz, w, h] of [[-3.2, -5, 1.2, 1.0], [-3.2, -6.3, 1.2, 1.4], [3.4, -7.5, 1.4, 1.2], [2.2, -9.4, 1.0, 1.0]]) {
    box([w, h, w], [cx, h / 2, cz], surf('wood', w, h), { parent: dock, solid: true });
  }
  groupLamp(dock, 0, 3.35, -4.5, 36); groupLamp(dock, 0, 3.35, -8.5, 28);
  sign3(dock, 0, 1.7, -10.58, 'MERKEZ PLAZA', 'YÜK ASANSÖRÜ 2');

  /* Karanlık koridor (düşüşten sonra kapıların ardı) */
  const dark = new THREE.Group(); dark.visible = false; scene.add(dark);
  const ym = (w, h) => surf('paint', w, h, { color: YEL });
  box([3, 0.2, 14], [0, -0.1, -8.6], surf('concrete', 3, 14), { parent: dark, cast: false });
  box([3, 0.2, 14], [0, 3.1, -8.6], surf('ceiling', 3, 14), { parent: dark, cast: false });
  box([0.2, 3.0, 14], [-1.6, 1.5, -8.6], ym(14, 3), { parent: dark });
  box([0.2, 3.0, 14], [1.6, 1.5, -8.6], ym(14, 3), { parent: dark });
  box([3.4, 3.0, 0.2], [0, 1.5, -15.7], ym(3, 3), { parent: dark });
  const dl = groupLamp(dark, 0, 3.05, -6.5, 14, 0xffe3a0, [0.9, 0.05, 0.3]);
  groupLamp(dark, 0, 3.05, -12, 8, 0xffe3a0, [0.9, 0.05, 0.3]);
  G.W.updaters.push((dt, t) => {
    if (!dark.visible) return;
    const f = Math.random() < 0.06 ? 0.2 + Math.random() * 0.5 : 1;
    dl.L.intensity = dl.base * f; dl.em.emissiveIntensity = 2.2 * f;
  });

  S.cab = { door, doorCol, drawDisp, lamp: cabLamp, dock, dark };
}

function sign3(group, x, y, z, a, b) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.9), new THREE.MeshStandardMaterial({
    map: labelTex([{ t: a, font: 'bold 44px Arial' }, { t: b, font: '30px Arial' }], { w: 512, h: 192, bg: '#1d2a3a', fg: '#e8e6df' }), roughness: 0.8,
  }));
  m.position.set(x, y, z); group.add(m);
}

export function startFreight() {
  setTasks([
    { id: 'cable', text: 'Yük sensörü kablosunu incele' },
    { id: 'clamp', text: 'Gevşek klemensi sık' },
    { id: 'normal', text: 'Denetim anahtarını normale al' },
    { id: 'ride', text: 'B1: test sürüşü' },
  ]);
  placePlayer(0, -0.4, 0);
  ambient({ hum: 0.05, air: 0.04, motor: 0 });
}
export async function introFreight() {
  await wait(1200);
  say(KEMAL, 'Merkez Plaza, yük asansörü. Yük sensörü saçmalıyor. Kabinin içinden bak, kablo klemensi gevşemiş olabilir.', 8000);
}

/* ---------- Düşüş sahnesi ---------- */
async function freightRide() {
  const S = G.S, c = S.cab, W = G.W;
  S.riding = true; P.noMove = true;
  sfx.click();
  await wait(400);
  sfx.ding();
  await tween(c.door, 'open', 0, 1.6);
  sfx.clunk();
  c.doorCol.disabled = false;
  c.dock.visible = false; c.dark.visible = true;
  await wait(600);
  ambient({ motor: 0.05, pitch: 55 }); sfx.rumble();
  G.shake = 0.006;
  for (let f = 13; f >= 9; f--) { await wait(1000); c.drawDisp(String(f)); }

  // kablo kopuyor
  sfx.snap(); G.shake = 0.02;
  await wait(260); sfx.snap();
  say(KEMAL, 'Usta? Duyuyor musun? Kablo... par...', 3000);
  for (let i = 0; i < 6; i++) { c.lamp.mul = 0.15; await wait(70); c.lamp.mul = 1; await wait(90); }
  c.drawDisp('ERR', '#ff2a2a');

  // refleks: yere yat
  P.frozen = true;
  ambient({ motor: 0.1, pitch: 28 }); sfx.whoosh();
  tween(P, 'h', 0.28, 0.7); tween(P, 'pitch', 1.25, 0.8);
  tween(G, 'shake', 0.07, 1.4);
  for (const n of ['8', '7', '5', '3', '2', '1']) { c.drawDisp(n, '#ff2a2a'); await wait(330); }
  c.drawDisp('B1', '#ff2a2a'); await wait(400);

  // çarpma beklentisi... hiçbir şey olmuyor
  c.drawDisp('', '#000');
  G.shake = 0;
  ambient({ hum: 0, air: 0, motor: 0 });
  c.lamp.mul = 0;
  tween(W.hemi, 'intensity', 0.015, 0.8);
  say('', 'Şimdi... şimdi çarpacak.', 3200);
  await wait(3500);
  sfx.click();
  await wait(5500);

  // gösterge yanar
  c.drawDisp('-30,5', '#ff3a2a');
  sfx.beep();
  await tween(P, 'pitch', 0.85, 0.5);
  say('', '...-30,5 mi?', 3500);
  await wait(3600);

  // kapılar kendiliğinden açılır
  sfx.creak();
  c.doorCol.disabled = true;
  tween(W.hemi, 'intensity', 0.09, 3);
  await tween(c.door, 'open', 1, 3.2);
  await wait(1800);

  // not defteri yüzüne düşer
  const nb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.04, 0.3), plain(0x4a2f1c, { rough: 0.8 }));
  const pg = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.034, 0.28), plain(0xe6dcc0, { rough: 0.9 }));
  pg.position.x = 0.012; nb.add(pg);
  nb.position.set(P.x, 2.6, P.z); nb.rotation.set(0.4, 0.6, 0.2);
  W.scene.add(nb);
  const a = tween(nb.position, 'y', 0.42, 0.55, (t) => t * t);
  tween(nb.rotation, 'x', 1.4, 0.55); tween(nb.rotation, 'z', 0.0, 0.55);
  await a;
  sfx.thud();
  G.shake = 0.05;
  await fadeTo(1, 60);
  await wait(700);
  G.shake = 0;
  W.scene.remove(nb);
  await fadeTo(0, 400);
  G.onNoteClose = async () => {
    await fadeTo(1, 1400);
    await startHorror(1);
  };
  showNote('Defter — 1. sayfa',
    '<div style="font-family:\'Segoe Print\',\'Bradley Hand\',cursive;line-height:1.7">' +
    '<b>30 Şubat 2009</b><br><br>' +
    'Sakın koşma. Sakın bağırma.<br>' +
    'Her gün güvenli bir oda bul, içeri gir ve uyu. Uyursan gün geçer.<br><br>' +
    'Sadece <b>30,5\'inci günde</b> buradan kaçabilirsin.' +
    '</div>');
}
