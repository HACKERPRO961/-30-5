import { closeMinigame, sfx } from './core.js';

const W = 720, H = 440;

function frame(g, title) {
  g.fillStyle = '#101214'; g.fillRect(0, 0, W, H);
  g.fillStyle = '#1b1e22'; g.fillRect(24, 24, W - 48, H - 48);
  g.strokeStyle = '#3a3f46'; g.lineWidth = 2; g.strokeRect(24, 24, W - 48, H - 48);
  g.fillStyle = '#f2c14e'; g.font = '600 13px Arial'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.fillText(title, 44, 52);
}
function cursor(g, x, y, color = '#f2c14e') {
  g.strokeStyle = color; g.lineWidth = 2;
  g.beginPath(); g.arc(x, y, 8, 0, 7); g.stroke();
  g.fillStyle = color; g.fillRect(x - 1, y - 1, 2, 2);
}

/* Sensör merceğini silme */
export function wipeGame(onDone) {
  const dirt = document.createElement('canvas'); dirt.width = W; dirt.height = H;
  const dg = dirt.getContext('2d');
  const small = document.createElement('canvas'); small.width = 72; small.height = 44;
  const sg = small.getContext('2d', { willReadFrequently: true });
  const CX = 360, CY = 232, R = 150;
  let down = false, lx = 0, ly = 0, acc = 0, chk = 0, pct = 0, fin = false;
  return {
    hint: 'Fareyi hareket ettir ve sol tuşa basılı tutarak merceği sil',
    init() {
      dg.save(); dg.beginPath(); dg.arc(CX, CY, R, 0, 7); dg.clip();
      dg.fillStyle = 'rgba(78,60,38,0.93)'; dg.fillRect(0, 0, W, H);
      for (let i = 0; i < 260; i++) {
        dg.fillStyle = `rgba(${Math.random() < 0.5 ? '40,30,18' : '120,98,66'},${0.2 + Math.random() * 0.3})`;
        dg.beginPath();
        dg.arc(CX + (Math.random() * 2 - 1) * R, CY + (Math.random() * 2 - 1) * R, 6 + Math.random() * 28, 0, 7);
        dg.fill();
      }
      dg.restore();
      lx = this.cx; ly = this.cy;
    },
    onDown() { down = true; lx = this.cx; ly = this.cy; },
    onUp() { down = false; },
    update(dt) {
      if (down && !fin) {
        dg.globalCompositeOperation = 'destination-out';
        dg.lineCap = 'round'; dg.lineWidth = 64; dg.strokeStyle = '#000';
        dg.beginPath(); dg.moveTo(lx, ly); dg.lineTo(this.cx, this.cy); dg.stroke();
        dg.globalCompositeOperation = 'source-over';
        if (Math.hypot(this.cx - lx, this.cy - ly) > 3) { acc += dt; if (acc > 0.12) { acc = 0; sfx.wipe(); } }
      }
      lx = this.cx; ly = this.cy;
      chk += dt;
      if (chk > 0.25 && !fin) {
        chk = 0;
        sg.clearRect(0, 0, 72, 44); sg.drawImage(dirt, 0, 0, 72, 44);
        const d = sg.getImageData(0, 0, 72, 44).data;
        let tot = 0, left = 0;
        for (let y = 0; y < 44; y++) for (let x = 0; x < 72; x++) {
          const dx = x * 10 + 5 - CX, dy = y * 10 + 5 - CY;
          if (dx * dx + dy * dy < (R - 6) * (R - 6)) { tot++; if (d[(y * 72 + x) * 4 + 3] > 50) left++; }
        }
        pct = 1 - left / tot;
        if (left / tot < 0.06) { fin = true; sfx.done(); setTimeout(() => { closeMinigame(); onDone(); }, 600); }
      }
    },
    render(g) {
      frame(g, 'KAPI SENSÖRÜ — MERCEK TEMİZLİĞİ');
      const gr = g.createRadialGradient(CX, CY, 10, CX, CY, R);
      gr.addColorStop(0, '#8fcaff'); gr.addColorStop(0.6, '#2c6fb5'); gr.addColorStop(1, '#10294a');
      g.fillStyle = gr; g.beginPath(); g.arc(CX, CY, R, 0, 7); g.fill();
      g.drawImage(dirt, 0, 0);
      g.strokeStyle = '#555a61'; g.lineWidth = 8; g.beginPath(); g.arc(CX, CY, R + 4, 0, 7); g.stroke();
      g.fillStyle = '#aaa'; g.font = '14px Arial'; g.textAlign = 'right';
      g.fillText(`Temizlik %${Math.round(Math.min(1, pct / 0.94) * 100)}`, W - 44, 52);
      cursor(g, this.cx, this.cy, down ? '#ffffff' : '#f2c14e');
    },
  };
}

/* Kontrol kartı sıfırlama: tuş sırası */
export function keypadGame(seq, onDone) {
  let entered = [], flash = 0, fin = false;
  const bx = (i) => 110 + i * 130, by = 250, bs = 110;
  function press(n) {
    if (fin) return;
    if (n === seq[entered.length]) {
      entered.push(n); sfx.click();
      if (entered.length === seq.length) { fin = true; sfx.done(); setTimeout(() => { closeMinigame(); onDone(); }, 800); }
    } else { entered = []; flash = 0.5; sfx.error(); }
  }
  return {
    hint: 'Defterdeki sırayı gir: 1-4 tuşları ya da fare ile tıkla',
    onKey(code) {
      const m = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4 }[code];
      if (m) press(m);
    },
    onDown() {
      for (let i = 0; i < 4; i++) {
        if (this.cx > bx(i) && this.cx < bx(i) + bs && this.cy > by && this.cy < by + bs) press(i + 1);
      }
    },
    update(dt) { if (flash > 0) flash -= dt; },
    render(g) {
      frame(g, 'KONTROL KARTI — E-47 KİLİTLİ');
      g.fillStyle = flash > 0 ? '#5a1010' : '#0a1410'; g.fillRect(110, 80, 500, 100);
      g.strokeStyle = '#3a4a40'; g.strokeRect(110, 80, 500, 100);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < seq.length; i++) {
        const x = 200 + i * 105;
        g.fillStyle = i < entered.length ? '#5cff8a' : '#2a3a30';
        g.beginPath(); g.arc(x, 130, 22, 0, 7); g.fill();
        if (i < entered.length) { g.fillStyle = '#031'; g.font = 'bold 24px monospace'; g.fillText(String(entered[i]), x, 131); }
      }
      for (let i = 0; i < 4; i++) {
        const hot = this.cx > bx(i) && this.cx < bx(i) + bs && this.cy > by && this.cy < by + bs;
        g.fillStyle = hot ? '#3a4048' : '#272b30'; g.fillRect(bx(i), by, bs, bs);
        g.strokeStyle = '#555'; g.strokeRect(bx(i), by, bs, bs);
        g.fillStyle = '#e8e6df'; g.font = 'bold 44px Arial'; g.fillText(String(i + 1), bx(i) + bs / 2, by + bs / 2 + 2);
      }
      cursor(g, this.cx, this.cy);
    },
  };
}

/* Ray kelepçesi sıkma: zamanlama */
export function timingGame(speed, onDone) {
  let p = 0, dir = 1, zone = 0.3 + Math.random() * 0.4, fin = false, flash = 0, tries = 0;
  const bw = 0.17, X0 = 110, X1 = 610;
  function hit() {
    if (fin) return;
    if (Math.abs(p - zone) < bw / 2) {
      fin = true; sfx.clunk();
      setTimeout(() => { closeMinigame(); onDone(); }, 600);
    } else { sfx.error(); flash = 0.4; tries++; zone = 0.2 + Math.random() * 0.6; }
  }
  return {
    hint: 'İşaretçi yeşil alandayken BOŞLUK, E veya sol tık',
    onKey(code) { if (code === 'Space' || code === 'KeyE') hit(); },
    onDown() { hit(); },
    update(dt) {
      if (!fin) { p += dir * speed * dt; if (p > 1) { p = 1; dir = -1; } if (p < 0) { p = 0; dir = 1; } }
      if (flash > 0) flash -= dt;
    },
    render(g) {
      frame(g, 'RAY KELEPÇESİ — SIKMA AYARI');
      g.fillStyle = flash > 0 ? '#3a1414' : '#0f1214'; g.fillRect(X0, 190, X1 - X0, 60);
      g.strokeStyle = '#444'; g.strokeRect(X0, 190, X1 - X0, 60);
      g.fillStyle = fin ? '#5cff8a' : '#2f8f4c';
      g.fillRect(X0 + (zone - bw / 2) * (X1 - X0), 190, bw * (X1 - X0), 60);
      const mx = X0 + p * (X1 - X0);
      g.fillStyle = '#f2c14e'; g.fillRect(mx - 3, 178, 6, 84);
      g.fillStyle = '#aaa'; g.font = '14px Arial'; g.textAlign = 'center';
      g.fillText(fin ? 'Kelepçe sıkıldı' : (tries ? 'Kaçırdın, tekrar dene' : 'Tork anahtarını doğru anda bırak'), W / 2, 310);
    },
  };
}
