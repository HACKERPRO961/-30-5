import { G, P, $, toast, sfx, startLoop, initAudio, lockPointer, fadeTo, newWorld, toMenu, goFullscreen, toggleFullscreen, checkLockSoon } from './core.js';
import { runDay } from './days.js';
import { startHorror } from './horror.js';
import { buildMenu } from './menu3d.js';
import { initUI } from './ui.js';
import { initTouch } from './touch.js';
import { setUnlockHandler } from './meta.js';
import { LORE, FINAL_NOTE } from './lore.js';

function savedDay() {
  try { return parseInt(localStorage.getItem('a305_day') || '0', 10) || 0; } catch (e) { return 0; }
}

async function begin(day) {
  initAudio();
  document.body.style.cursor = '';
  P.noMove = false;
  G.started = true;
  document.body.classList.add('playing');
  checkLockSoon();
  lockPointer();
  goFullscreen();
  $('menu').classList.add('hide');
  $('pause').classList.add('hide');
  if (day < 0) await startHorror(-day); else if (day === 0) await startHorror(1); else if (day === 30.5) await startHorror(30.5); else await runDay(day);
}

// Geri bildirim adresi (buraya kendi e-posta adresini yaz)
const CONTACT_MAIL = '';
$('wmail').textContent = CONTACT_MAIL || '(e-posta adresi eklenecek)';
document.querySelectorAll('.wbtn').forEach((b) => b.addEventListener('click', () => {
  if (b.dataset.n === '1') { $('wp1').style.display = 'none'; $('wp2').style.display = ''; }
  else $('warn').classList.add('hide');
}));
// Menü arka planı için boş bir sahne
G.onMenu = buildMenu;
buildMenu();
startLoop();
$('fade').style.opacity = 0;

const cont = $('bCont');
const sd = savedDay();
if (sd > 0) { cont.style.display = 'block'; cont.textContent = `Devam Et (${sd}. Gün)`; cont.onclick = () => begin(sd); }
function savedHorror() {
  try { return parseFloat(localStorage.getItem('a305_h') || '0') || 0; } catch (e) { return 0; }
}
const sh = savedHorror();
if (sh > 1) {
  const hb = $('bHorCont');
  hb.style.display = 'block'; hb.textContent = sh === 30.5 ? 'Karanlığa Dön (Gün 30,5)' : `Karanlığa Dön (Gün ${sh})`;
  hb.onclick = () => begin(sh === 30.5 ? 30.5 : -sh);
}
initUI();
initTouch();
setUnlockHandler((a) => { toast(`★ Başarım: ${a.name}`, 4500); sfx.done(); });
$('bFull').onclick = () => toggleFullscreen();
$('bPages').onclick = () => {
  let got = [];
  try { got = JSON.parse(localStorage.getItem('a305_pages') || '[]'); } catch (e) { got = []; }
  got.sort((a, b) => a - b);
  $('pgbody').innerHTML = got.length ? got.map((i) => `<p><b>Sayfa ${i}.</b> ${i === 30 ? LORE[29] + ' ' + FINAL_NOTE : LORE[i - 1]}</p>`).join('') : '<p>Henüz sayfa bulmadın. Korku bölümünde her gün labirentte bir günlük sayfası bulunur.</p>';
  $('pages').classList.remove('hide');
};
$('pages').onclick = () => $('pages').classList.add('hide');
$('bNew').onclick = () => begin(1);

if (/debug/.test(location.hash)) window.__asansor = { G, P, toMenu, fadeTo, startHorror };
