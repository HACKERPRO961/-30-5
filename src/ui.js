import { G, $, setVolume, toMenu, resume, toast } from './core.js';
import { ACH, STATS, hasAch, achCount, DIFFS, BIND, BIND_LABELS, DEFAULT_BIND, SET, saveSet, saveBind, resetBind, keyName, coins, SHOP, upLevel, buy } from './meta.js';
import { sfx } from './audio.js';

export function applySettings() {
  setVolume(SET.vol / 100);
  G.sens = 0.0022 * (SET.sens / 50);
  G.fovAdd = SET.fov;
  const cv = document.querySelector('canvas');
  if (cv) cv.style.filter = SET.bright === 100 ? '' : `brightness(${SET.bright}%)`;
}

const open = (id) => { $(id).classList.remove('hide'); };
const close = (id) => { $(id).classList.add('hide'); };

/* ---------- Ayarlar ---------- */
function slider(label, key, min, max, unit = '') {
  const row = document.createElement('label');
  row.className = 'row';
  const val = document.createElement('b');
  const inp = document.createElement('input');
  inp.type = 'range'; inp.min = min; inp.max = max; inp.value = SET[key];
  const show = () => { val.textContent = SET[key] + unit; };
  inp.oninput = () => { SET[key] = parseFloat(inp.value); show(); applySettings(); saveSet(); };
  show();
  row.append(label, inp, val);
  return row;
}
function toggle(label, key) {
  const row = document.createElement('label');
  row.className = 'row';
  const inp = document.createElement('input');
  inp.type = 'checkbox'; inp.checked = !!SET[key];
  inp.onchange = () => { SET[key] = inp.checked; applySettings(); saveSet(); };
  row.append(label, inp, document.createElement('b'));
  return row;
}
function buildBinds(box) {
  box.innerHTML = '';
  for (const a of Object.keys(DEFAULT_BIND)) {
    const row = document.createElement('div');
    row.className = 'row';
    const btn = document.createElement('button');
    btn.className = 'kbtn';
    btn.textContent = keyName(BIND[a]);
    btn.onclick = () => {
      btn.textContent = 'Bir tuşa bas…'; btn.classList.add('wait');
      G.rebind = (e) => {
        G.rebind = null; btn.classList.remove('wait');
        if (e.code !== 'Escape') {
          const other = Object.keys(BIND).find((k) => k !== a && BIND[k] === e.code);
          if (other) BIND[other] = BIND[a]; // çakışma: tuşları değiş tokuş et
          BIND[a] = e.code; saveBind();
        }
        buildBinds(box);
      };
    };
    row.append(BIND_LABELS[a], document.createElement('span'), btn);
    box.append(row);
  }
  const rs = document.createElement('button');
  rs.className = 'kbtn rst'; rs.textContent = 'Varsayılana dön';
  rs.onclick = () => { resetBind(); buildBinds(box); };
  box.append(rs);
}
function buildSettings() {
  const b = $('setBody'); b.innerHTML = '';
  const s0 = document.createElement('div'); s0.className = 'sec';
  const h0 = document.createElement('h4'); h0.textContent = 'Zorluk (yeni güne başlarken tam etkili olur)';
  const dr = document.createElement('div'); dr.className = 'dsel';
  const dd = document.createElement('small'); dd.className = 'ddesc';
  const showD = () => { dd.textContent = DIFFS[SET.diff].desc; dr.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x.dataset.k === SET.diff)); };
  for (const k of Object.keys(DIFFS)) {
    const bt = document.createElement('button'); bt.textContent = DIFFS[k].name; bt.dataset.k = k;
    bt.onclick = () => { SET.diff = k; saveSet(); showD(); };
    dr.append(bt);
  }
  showD();
  s0.append(h0, dr, dd);
  const s1 = document.createElement('div'); s1.className = 'sec';
  const h1 = document.createElement('h4'); h1.textContent = 'Ses ve Görüntü';
  s1.append(h1, slider('Ses', 'vol', 0, 100, '%'), slider('Parlaklık', 'bright', 60, 140, '%'), slider('Görüş açısı (FOV)', 'fov', -10, 25, ''), toggle('Kafa sallanması', 'bob'));
  const s2 = document.createElement('div'); s2.className = 'sec';
  const h2 = document.createElement('h4'); h2.textContent = 'Kontroller';
  s2.append(h2, slider('Fare hassasiyeti', 'sens', 20, 100, ''), toggle('Fare Y ekseni ters', 'invY'));
  const s3 = document.createElement('div'); s3.className = 'sec';
  const h3 = document.createElement('h4'); h3.textContent = 'Tuş Atamaları (tıkla, sonra yeni tuşa bas)';
  const kb = document.createElement('div'); buildBinds(kb);
  s3.append(h3, kb);
  b.append(s0, s1, s2, s3);
}

/* ---------- Market ---------- */
function buildMarket() {
  $('coinN').textContent = coins();
  const box = $('shopBody'); box.innerHTML = '';
  for (const it of SHOP) {
    const lv = upLevel(it.id);
    const row = document.createElement('div'); row.className = 'item';
    const info = document.createElement('div');
    info.innerHTML = `<b>${it.name}</b> <span class="lv">${'●'.repeat(lv)}${'○'.repeat(it.max - lv)}</span><br><small>${it.desc}</small>`;
    const btn = document.createElement('button');
    if (lv >= it.max) { btn.textContent = 'Tamam'; btn.disabled = true; }
    else {
      const c = it.cost[lv];
      btn.textContent = `${c} kuruş`; btn.disabled = coins() < c;
      btn.onclick = () => { if (buy(it.id)) { sfx.pick && sfx.pick(); buildMarket(); } };
    }
    row.append(info, btn); box.append(row);
  }
}

function buildAch() {
  const s = STATS;
  $('statBox').innerHTML = `<div class="stg"><div><b>${s.best}</b>en iyi gün</div><div><b>${s.sleeps}</b>uyunan gece</div><div><b>${s.caught}</b>yakalanma</div><div><b>${s.pages}</b>sayfa</div><div><b>${s.thrown}</b>atılan şişe</div><div><b>${achCount()}/${ACH.length}</b>başarım</div></div>`;
  $('achBody').innerHTML = ACH.map((a) => { const o = hasAch(a.id); return `<div class="ach ${o ? '' : 'lock'}"><i>${o ? '★' : '☆'}</i><div>${a.name}<small>${a.desc}</small></div></div>`; }).join('');
}
function quitGame() {
  try { const A = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App; if (A && A.exitApp) { A.exitApp(); return; } } catch (e) { /* yok say */ }
  window.close();
  setTimeout(() => toast('Tarayıcıda sekmeyi kendin kapatman gerekir.', 3500), 400);
}
export function initUI() {
  applySettings();
  const back = { settings: null, market: null, credits: null };
  const show = (id, from) => { back[id] = from; if (id === 'settings') buildSettings(); if (id === 'market') buildMarket(); open(id); };
  $('bSet').onclick = () => show('settings', 'menu');
  $('bMarket').onclick = () => show('market', 'menu');
  $('bAch').onclick = () => { buildAch(); open('achv'); };
  $('bCred').onclick = () => show('credits', 'menu');
  $('bPSet').onclick = () => show('settings', 'pause');
  for (const id of ['settings', 'market', 'credits', 'achv']) document.querySelectorAll(`#${id} .back`).forEach((b) => { b.onclick = () => close(id); });
  $('bQuit').onclick = quitGame;
  $('bPQuit').onclick = quitGame;
  $('bResume').onclick = () => resume();
  $('bPMenu').onclick = () => { $('pause').classList.add('hide'); toMenu(); };
  $('setReset').onclick = () => {
    Object.assign(SET, { diff: 'normal', vol: 70, sens: 50, invY: false, fov: 0, bright: 100, bob: true });
    saveSet(); applySettings(); buildSettings();
  };
}
