let ac = null, master = null, nbuf = null;
let volume = 0.7;
export function setVolume(v) { volume = v; if (master) master.gain.value = v; }
const amb = {};

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  const C = window.AudioContext || window.webkitAudioContext;
  if (!C) return;
  ac = new C();
  master = ac.createGain(); master.gain.value = volume; master.connect(ac.destination);
  nbuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
  const d = nbuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  const osc = (type, f) => { const o = ac.createOscillator(); o.type = type; o.frequency.value = f; return o; };
  // elektrik uğultusu
  amb.hum = ac.createGain(); amb.hum.gain.value = 0; amb.hum.connect(master);
  const h1 = osc('sine', 50), h2 = osc('sine', 100.5), h2g = ac.createGain();
  h2g.gain.value = 0.4; h1.connect(amb.hum); h2.connect(h2g); h2g.connect(amb.hum); h1.start(); h2.start();
  // hava
  amb.air = ac.createGain(); amb.air.gain.value = 0;
  const ns = ac.createBufferSource(); ns.buffer = nbuf; ns.loop = true;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 380;
  ns.connect(lp); lp.connect(amb.air); amb.air.connect(master); ns.start();
  // motor
  amb.mot = ac.createGain(); amb.mot.gain.value = 0;
  amb.motO = osc('sawtooth', 45);
  const mlp = ac.createBiquadFilter(); mlp.type = 'lowpass'; mlp.frequency.value = 220;
  amb.motO.connect(mlp); mlp.connect(amb.mot); amb.mot.connect(master); amb.motO.start();
  // güvenli oda işareti: sıcak, alçak bir uğultu
  amb.bea = ac.createGain(); amb.bea.gain.value = 0; amb.bea.connect(master);
  const b1 = osc('sine', 196), b2 = osc('triangle', 294), b2g = ac.createGain();
  b2g.gain.value = 0.35; b1.connect(amb.bea); b2.connect(b2g); b2g.connect(amb.bea); b1.start(); b2.start();
  // gerilim müziği: iki fa diyez/ fa kayması, tehlikeyle açılan filtre
  amb.mus = ac.createGain(); amb.mus.gain.value = 0;
  amb.musF = ac.createBiquadFilter(); amb.musF.type = 'lowpass'; amb.musF.frequency.value = 180; amb.musF.Q.value = 4;
  amb.musF.connect(amb.mus); amb.mus.connect(master);
  for (const [f, ty] of [[55, 'sawtooth'], [58.3, 'sawtooth'], [82.4, 'triangle'], [116.5, 'sine']]) { const o = osc(ty, f); const g = ac.createGain(); g.gain.value = ty === 'sine' ? 0.5 : 0.35; o.connect(g); g.connect(amb.musF); o.start(); }
  const lfo = osc('sine', 0.17), lg = ac.createGain(); lg.gain.value = 60; lfo.connect(lg); lg.connect(amb.musF.frequency); lfo.start();
}

export function tension(v) {
  if (!ac || !amb.mus) return;
  const t = ac.currentTime;
  amb.mus.gain.setTargetAtTime(v * 0.16, t, 0.6);
  amb.musF.frequency.setTargetAtTime(160 + v * 900, t, 0.8);
}

export function ambient({ hum, air, motor, pitch } = {}) {
  if (!ac) return;
  const t = ac.currentTime;
  if (hum !== undefined) amb.hum.gain.setTargetAtTime(hum, t, 0.5);
  if (air !== undefined) amb.air.gain.setTargetAtTime(air, t, 0.5);
  if (motor !== undefined) amb.mot.gain.setTargetAtTime(motor, t, 0.6);
  if (pitch !== undefined) amb.motO.frequency.setTargetAtTime(pitch, t, 0.8);
}

export function beacon(v) { if (ac) amb.bea.gain.setTargetAtTime(v, ac.currentTime, 0.3); }

function tone(f, d, type = 'sine', v = 0.15, slide = 0, delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + d);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(v, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + d + 0.05);
}

function noise(d, v = 0.2, freq = 1000, q = 1, type = 'bandpass', delay = 0) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const s = ac.createBufferSource(); s.buffer = nbuf;
  const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain();
  g.gain.setValueAtTime(v, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  s.connect(f); f.connect(g); g.connect(master);
  s.start(t, Math.random() * 1.5, d + 0.05);
}

function shaper(amount) {
  const s = ac.createWaveShaper(), n = 256, c = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; c[i] = ((3 + amount) * x * 20 * Math.PI / 180) / (Math.PI + amount * Math.abs(x)); }
  s.curve = c; s.oversample = '2x';
  return s;
}
/* Canavar sesi: titreşimli testereler -> bozulma -> ağız formantları */
function vox({ f0 = 70, f1 = 50, dur = 1, v = 0.2, saws = 2, trem = 0, vib = 0, form = [[500, 5, 1], [1100, 6, 0.6]], dist = 30, delay = 0, type = 'sawtooth' }) {
  if (!ac) return;
  const t = ac.currentTime + delay;
  const out = ac.createGain();
  out.gain.setValueAtTime(0.0001, t);
  out.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t + Math.min(0.2, dur * 0.25));
  out.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  out.connect(master);
  const sh = shaper(dist), am = ac.createGain(); am.gain.value = trem ? 0.55 : 1;
  sh.connect(am);
  for (const [f, q, gn] of form) {
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q;
    const fg = ac.createGain(); fg.gain.value = gn * 2.2;
    am.connect(bp); bp.connect(fg); fg.connect(out);
  }
  const pre = ac.createGain(); pre.gain.value = 0.6; pre.connect(sh);
  const stop = t + dur + 0.1;
  for (let i = 0; i < saws; i++) {
    const o = ac.createOscillator(); o.type = type;
    const det = 1 + (i - (saws - 1) / 2) * 0.014;
    o.frequency.setValueAtTime(f0 * det, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1 * det), t + dur);
    if (vib) {
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = vib + i * 0.7; lg.gain.value = f0 * 0.035;
      l.connect(lg); lg.connect(o.frequency); l.start(t); l.stop(stop);
    }
    o.connect(pre); o.start(t); o.stop(stop);
  }
  if (trem) {
    const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = trem; lg.gain.value = 0.5;
    l.connect(lg); lg.connect(am.gain); l.start(t); l.stop(stop);
  }
}

export const sfx = {
  click() { noise(0.05, 0.25, 3000, 1, 'highpass'); tone(1200, 0.03, 'square', 0.04); },
  ding() { tone(1318, 0.9, 'sine', 0.18); tone(988, 1.1, 'sine', 0.14, 0, 0.18); },
  clunk() { tone(90, 0.25, 'sine', 0.3, -40); noise(0.12, 0.25, 400, 1, 'lowpass'); },
  buzz() { tone(110, 0.35, 'sawtooth', 0.12); tone(116, 0.35, 'square', 0.06); },
  step() { noise(0.07, 0.13 + Math.random() * 0.05, 180 + Math.random() * 80, 0.8, 'lowpass'); },
  done() { tone(660, 0.12, 'triangle', 0.12); tone(990, 0.2, 'triangle', 0.12, 0, 0.1); },
  wipe() { noise(0.09, 0.07, 2500, 0.7, 'bandpass'); },
  screw() { noise(0.05, 0.12, 4000, 4, 'bandpass'); tone(300 + Math.random() * 80, 0.04, 'square', 0.03); },
  zap() { noise(0.4, 0.3, 3000, 0.5, 'highpass'); tone(200, 0.3, 'sawtooth', 0.12, -120); },
  pick() { noise(0.08, 0.15, 900, 1, 'bandpass'); tone(500, 0.06, 'triangle', 0.08); },
  thud() { tone(70, 0.3, 'sine', 0.35, -30); noise(0.15, 0.2, 200, 1, 'lowpass'); },
  rumble() { noise(2.5, 0.25, 120, 0.6, 'lowpass'); tone(40, 2.5, 'sine', 0.2); },
  error() { tone(180, 0.12, 'square', 0.1); tone(140, 0.2, 'square', 0.1, 0, 0.12); },
  note() { noise(0.18, 0.1, 5000, 0.5, 'highpass'); },
  snap() { noise(0.25, 0.5, 5000, 0.6, 'highpass'); tone(900, 0.25, 'sawtooth', 0.18, -700); },
  whoosh() { noise(3.2, 0.28, 700, 0.5, 'bandpass'); tone(80, 3.2, 'sawtooth', 0.06, -50); },
  beep() { tone(740, 0.22, 'square', 0.07); },
  creak() { tone(140, 1.6, 'sawtooth', 0.05, 90); noise(1.4, 0.07, 900, 3, 'bandpass'); },
  distant() { noise(0.9, 0.18, 110, 0.6, 'lowpass'); tone(52, 0.9, 'sine', 0.14, -12); },
  glass() { noise(0.35, 0.5, 5200, 0.7, 'highpass'); for (let i = 0; i < 6; i++) tone(2400 + Math.random() * 2600, 0.08, 'triangle', 0.08, 0, 0.03 + i * 0.05 + Math.random() * 0.04); noise(0.2, 0.25, 1200, 1, 'bandpass', 0.1); },
  breath(v = 0.15) { noise(0.8, v, 1500, 3, 'bandpass'); noise(0.9, v * 0.8, 800, 2.5, 'bandpass', 0.95); },
  tick(v = 0.1) { for (let i = 0; i < 3; i++) noise(0.03, v, 2700, 9, 'bandpass', i * 0.1 + Math.random() * 0.05); },
  sniff(v = 0.1) { for (let i = 0; i < 4; i++) noise(0.07, v, 3200, 2, 'highpass', i * 0.12); },
  grind(v = 0.2) { noise(1.0, v, 170, 1.6, 'lowpass'); tone(64, 1.0, 'sawtooth', v * 0.35, -8); },
  mvoice(kind, v = 0.2) {
    if (kind === 'blind') { sfx.tick(v * 0.6); vox({ f0: 85, f1: 52, dur: 1.2, v: v * 1.8, saws: 3, trem: 24, vib: 6, form: [[380, 6, 1], [950, 7, 0.7], [2300, 5, 0.3]], dist: 50, delay: 0.25 }); }
    else if (kind === 'deaf') vox({ f0: 55, f1: 38, dur: 1.8, v: v * 2.0, saws: 3, trem: 7, vib: 3, form: [[300, 5, 1], [700, 6, 0.6]], dist: 35 });
    else if (kind === 'super') { vox({ f0: 70, f1: 42, dur: 1.5, v: v * 2.0, saws: 4, trem: 30, vib: 8, form: [[450, 6, 1], [1100, 7, 0.8], [2800, 6, 0.4]], dist: 70 }); vox({ f0: 900, f1: 1300, dur: 0.9, v: v * 0.45, saws: 2, vib: 11, form: [[1700, 9, 1]], dist: 40, delay: 0.3 }); }
    else if (kind === 'statue') sfx.grind(v * 1.2);
    else { sfx.sniff(v * 0.8); vox({ f0: 100, f1: 60, dur: 1.0, v: v * 1.8, saws: 3, trem: 20, vib: 6, form: [[500, 6, 1], [1300, 6, 0.7]], dist: 55, delay: 0.5 }); }
  },
  jump() {
    noise(0.8, 0.9, 2000, 0.5, 'highpass'); noise(1.1, 0.8, 300, 0.6, 'lowpass');
    vox({ f0: 700, f1: 1800, dur: 1.1, v: 0.7, saws: 4, vib: 12, form: [[1400, 7, 1], [2900, 7, 0.8], [4200, 6, 0.5]], dist: 90 });
    vox({ f0: 90, f1: 45, dur: 1.4, v: 0.8, saws: 4, trem: 26, form: [[450, 5, 1], [1000, 6, 0.8]], dist: 90 });
    tone(40, 1.5, 'sine', 0.9, -10);
  },
  heartK(kind, v = 1) {
    const th = (f, d, g, dl = 0) => tone(f, d, 'sine', g * v, -8, dl);
    if (kind === 'deaf') { th(44, 0.34, 0.62); noise(0.2, 0.12 * v, 90, 1, 'lowpass'); }
    else if (kind === 'super') { th(70, 0.1, 0.45); th(62, 0.1, 0.4, 0.12); th(56, 0.12, 0.36, 0.24); }
    else if (kind === 'statue') { th(58, 0.2, 0.5); if (Math.random() < 0.7) th(50, 0.18, 0.32, 0.34); tone(1900, 0.03, 'square', 0.025 * v, 0, 0.62); tone(1500, 0.03, 'square', 0.02 * v, 0, 1.0); }
    else if (kind === 'tracker') { th(60, 0.15, 0.48); th(52, 0.16, 0.34, 0.16); tone(2400, 0.02, 'square', 0.035 * v, 0, 0.5); }
    else { th(62, 0.13, 0.5); th(52, 0.16, 0.38, 0.17); }
  },
  heart() { tone(62, 0.13, 'sine', 0.5); tone(52, 0.16, 'sine', 0.38, 0, 0.17); },
  sting() { [233, 247, 311, 370].forEach((f) => tone(f, 1.6, 'sawtooth', 0.07, -30)); noise(0.6, 0.35, 2600, 0.6, 'highpass'); tone(60, 1.4, 'sine', 0.3); vox({ f0: 640, f1: 1100, dur: 1.2, v: 0.25, saws: 3, vib: 9, form: [[1300, 8, 1], [2700, 8, 0.7]], dist: 50, delay: 0.05 }); },
  roar() { vox({ f0: 140, f1: 52, dur: 2.0, v: 0.55, saws: 4, trem: 14, vib: 7, form: [[500, 5, 1], [1000, 6, 0.8], [1800, 5, 0.5]], dist: 80 }); vox({ f0: 50, f1: 36, dur: 2.0, v: 0.6, saws: 2, form: [[80, 2, 1]], dist: 5, type: 'sine' }); noise(1.6, 0.4, 900, 0.8, 'bandpass'); },
  scream() { vox({ f0: 600, f1: 1500, dur: 1.5, v: 0.45, saws: 3, vib: 9, form: [[1300, 8, 1], [2700, 8, 0.8], [3800, 6, 0.5]], dist: 60 }); vox({ f0: 110, f1: 70, dur: 1.5, v: 0.4, saws: 2, trem: 30, form: [[500, 5, 1]], dist: 60 }); noise(1.3, 0.45, 3500, 0.6, 'highpass'); },
  gasp() { noise(0.4, 0.28, 2200, 0.7, 'bandpass'); },
  mstep(v, kind) {
    if (kind === 'statue') { noise(0.2, v * 1.3, 220, 1.4, 'lowpass'); tone(46, 0.22, 'sine', v, -12); return; }
    noise(0.16, v * 1.2, 260, 1.2, 'lowpass'); tone(48, 0.18, 'sine', v, -14); noise(0.06, v * 0.5, 2200, 3, 'bandpass', 0.09);
  },
  growl(v) { vox({ f0: 78, f1: 48, dur: 1.3, v: v * 1.8, saws: 3, trem: 22, vib: 5, form: [[420, 6, 1], [900, 7, 0.7], [2400, 5, 0.3]], dist: 45 }); },
  lever() { tone(120, 0.25, 'square', 0.1, -50); noise(0.15, 0.2, 600, 1, 'lowpass', 0.1); },
};
