// Dokunmatik kontroller (telefon/tablet): sol joystick, sağ yarıda bakma, düğmeler
import { G, P, $, setPaused } from './core.js';
import { BIND, SET } from './meta.js';

export const isTouchDevice = () => (navigator.maxTouchPoints > 0 && window.matchMedia('(pointer: coarse)').matches) || /Android|iPhone|iPad/i.test(navigator.userAgent);

export function initTouch() {
  if (!isTouchDevice() && !/[?#&]touch/.test(location.href)) return;
  G.mobile = true; G.noLock = true;
  document.body.classList.add('touch');
  const root = document.createElement('div');
  root.id = 'tc';
  root.innerHTML = `
    <div id="tcStick"><i></i></div>
    <div id="tcBtns">
      <button data-a="use" class="big">E</button>
      <button data-a="flash">🔦</button>
      <button data-a="sprint" class="hold">KOŞ</button>
      <button data-a="crouch" class="hold">EĞİL</button>
      <button data-a="throw">ŞİŞE</button>
    </div>
    <button id="tcPause">II</button>`;
  document.body.appendChild(root);

  const press = (code, down) => document.dispatchEvent(new KeyboardEvent(down ? 'keydown' : 'keyup', { code, bubbles: true }));
  const live = () => G.started && !G.paused;

  /* sol joystick */
  const st = $('tcStick'), knob = st.firstElementChild;
  let sid = null, sx = 0, sy = 0;
  const setKeys = (dx, dy) => {
    const t = 0.3;
    press(BIND.left, dx < -t); press(BIND.right, dx > t); press(BIND.fwd, dy < -t); press(BIND.back, dy > t);
  };
  st.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; sid = t.identifier; const r = st.getBoundingClientRect(); sx = r.left + r.width / 2; sy = r.top + r.height / 2; e.preventDefault(); }, { passive: false });
  st.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === sid) {
      let dx = (t.clientX - sx) / 55, dy = (t.clientY - sy) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      knob.style.transform = `translate(${dx * 45}px,${dy * 45}px)`; setKeys(dx, dy);
      press(BIND.sprint, l > 1.25 && G.autoRunOk);
    }
    e.preventDefault();
  }, { passive: false });
  const endStick = (e) => { for (const t of e.changedTouches) if (t.identifier === sid) { sid = null; knob.style.transform = ''; setKeys(0, 0); } };
  st.addEventListener('touchend', endStick); st.addEventListener('touchcancel', endStick);

  /* sağ yarı: bakma */
  let lid = null, lx = 0, ly = 0;
  const canvas = document.querySelector('canvas');
  const lookArea = document.createElement('div'); lookArea.id = 'tcLook'; root.prepend(lookArea);
  lookArea.addEventListener('touchstart', (e) => { const t = e.changedTouches[0]; lid = t.identifier; lx = t.clientX; ly = t.clientY; e.preventDefault(); }, { passive: false });
  lookArea.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches) if (t.identifier === lid && live()) {
      const k = G.sens * 1.7;
      P.yaw -= (t.clientX - lx) * k; P.pitch = Math.max(-1.45, Math.min(1.45, P.pitch - (t.clientY - ly) * k * (SET.invY ? -1 : 1)));
      lx = t.clientX; ly = t.clientY;
    }
    e.preventDefault();
  }, { passive: false });
  const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === lid) lid = null; };
  lookArea.addEventListener('touchend', endLook); lookArea.addEventListener('touchcancel', endLook);

  /* düğmeler */
  root.querySelectorAll('#tcBtns button').forEach((b) => {
    const a = b.dataset.a;
    const code = () => BIND[a];
    b.addEventListener('touchstart', (e) => { e.preventDefault(); b.classList.add('on'); press(code(), true); }, { passive: false });
    const up = (e) => { e.preventDefault(); b.classList.remove('on'); press(code(), false); };
    b.addEventListener('touchend', up, { passive: false }); b.addEventListener('touchcancel', up, { passive: false });
  });
  $('tcPause').addEventListener('touchstart', (e) => { e.preventDefault(); if (G.started) setPaused(true); }, { passive: false });
  G.autoRunOk = false;

  const sync = () => { root.style.display = G.started && !G.paused && !G.noteOpen ? 'block' : 'none'; requestAnimationFrame(sync); };
  sync();
  void canvas;
}
