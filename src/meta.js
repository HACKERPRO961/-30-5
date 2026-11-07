// Ayarlar, tuş atamaları, kuruş (oyun içi para) ve market yükseltmeleri
const rd = (k, d) => { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } };
const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* kayıt yok */ } };

export const DEFAULT_BIND = { fwd: 'KeyW', back: 'KeyS', left: 'KeyA', right: 'KeyD', sprint: 'ShiftLeft', crouch: 'KeyC', flash: 'KeyQ', use: 'KeyE', throw: 'KeyG', full: 'KeyF' };
export const BIND_LABELS = { fwd: 'İleri', back: 'Geri', left: 'Sola', right: 'Sağa', sprint: 'Koş', crouch: 'Eğil', flash: 'El feneri', use: 'Etkileşim', throw: 'Şişe at', full: 'Tam ekran' };
export const BIND = Object.assign({}, DEFAULT_BIND, rd('a305_keys', {}));
export const saveBind = () => wr('a305_keys', BIND);
export const resetBind = () => { Object.assign(BIND, DEFAULT_BIND); saveBind(); };

const legacyVol = parseFloat(localStorage.getItem('a305_vol') || '70') || 70;
const legacySens = parseFloat(localStorage.getItem('a305_sens') || '50') || 50;
export const DIFFS = {
  huzurlu: { name: 'Huzurlu', desc: 'Canavarlar yavaş ve az duyar, pil uzun gider, ani korkutmalar seyrek. Kuruş ×0,75.', mon: 0.8, bat: 0.7, coin: 0.75, sc: 30, ev: 1.6 },
  normal: { name: 'Normal', desc: 'Dengeli deneyim.', mon: 1, bat: 1, coin: 1, sc: 14, ev: 1 },
  kabus: { name: 'Kâbus', desc: 'Canavarlar hızlı ve keskin, pil çabuk biter, ani korkutmalar sık. Kuruş ×1,5.', mon: 1.25, bat: 1.3, coin: 1.5, sc: 9, ev: 0.7 },
};
export const diff = () => DIFFS[SET.diff] || DIFFS.normal;
export const SET = Object.assign({ diff: 'normal', vol: legacyVol, sens: legacySens, invY: false, fov: 0, bright: 100, bob: true }, rd('a305_set', {}));
export const saveSet = () => wr('a305_set', SET);

export const coins = () => rd('a305_coins', 0);
export function addCoins(n) { const c = coins() + n; wr('a305_coins', c); return c; }
const UP = rd('a305_up', {});
export const upLevel = (id) => UP[id] || 0;

export const SHOP = [
  { id: 'bat', name: 'Yedek Pil Kutusu', desc: 'Her güne daha dolu bir fener piliyle başla (+%12 / seviye).', cost: [60, 120, 200], max: 3 },
  { id: 'bot', name: 'Cep Şişeleri', desc: 'Her güne 1 şişe daha fazla başla (+1 / seviye).', cost: [40, 90], max: 2 },
  { id: 'run', name: 'Spor Ayakkabı', desc: 'Koşma dayanıklılığı %30 uzar (/ seviye).', cost: [80, 160], max: 2 },
  { id: 'soft', name: 'Yumuşak Tabanlar', desc: 'Adım gürültün %15 azalır (/ seviye).', cost: [90, 180], max: 2 },
  { id: 'lens', name: 'Güçlü Fener Merceği', desc: 'Fener daha parlak ve daha uzağı aydınlatır.', cost: [110], max: 1 },
];
export function buy(id) {
  const it = SHOP.find((s) => s.id === id); if (!it) return false;
  const lv = upLevel(id); if (lv >= it.max) return false;
  const c = it.cost[lv]; if (coins() < c) return false;
  wr('a305_coins', coins() - c); UP[id] = lv + 1; wr('a305_up', UP);
  setTimeout(() => unlock('shop'), 0);
  return true;
}

export function keyName(code) {
  if (!code) return '—';
  const m = { ShiftLeft: 'Sol Shift', ShiftRight: 'Sağ Shift', ControlLeft: 'Sol Ctrl', ControlRight: 'Sağ Ctrl', AltLeft: 'Sol Alt', Space: 'Boşluk', ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→', Tab: 'Tab', Enter: 'Enter', Backquote: '`' };
  if (m[code]) return m[code];
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Num ');
}

/* ---------- İstatistik ve başarımlar ---------- */
export const STATS = Object.assign({ caught: 0, best: 0, sleeps: 0, bottles: 0, thrown: 0, batteries: 0, pages: 0, escapes: 0, minutes: 0 }, rd('a305_stats', {}));
export const saveStats = () => wr('a305_stats', STATS);
export const stat = (k, inc = 1) => { STATS[k] = (STATS[k] || 0) + inc; saveStats(); };
export const statMax = (k, v) => { if (v > (STATS[k] || 0)) { STATS[k] = v; saveStats(); } };
export const ACH = [
  { id: 'first_night', name: 'İlk Gece', desc: 'Korku modunda ilk kez uyu.' },
  { id: 'week', name: 'Bir Hafta', desc: '7. güne ulaş.' },
  { id: 'half', name: 'Yarı Yol', desc: '15. güne ulaş.' },
  { id: 'last', name: 'Son Gece', desc: '30. günü tamamla.' },
  { id: 'escape', name: 'Kaçış', desc: 'Asansörle çıkışa ulaş.' },
  { id: 'caught1', name: 'İlk Yakalanma', desc: 'Bir canavara yakalan.' },
  { id: 'caught10', name: 'Ölümle Dans', desc: '10 kez yakalan.' },
  { id: 'quiet', name: 'Sessiz Gün', desc: 'Bir günü hiç koşmadan bitir (2. günden sonra).' },
  { id: 'dark', name: 'Karanlıkta', desc: 'Fener pilin bitmişken uyu.' },
  { id: 'decoy', name: 'Dikkat Dağıtma', desc: 'Şişeyle bir canavarı başka yöne çek.' },
  { id: 'page1', name: 'İlk Sayfa', desc: 'Bir günlük sayfası bul.' },
  { id: 'page10', name: 'Arşivci', desc: '10 günlük sayfası topla.' },
  { id: 'page30', name: 'Tüm Gerçek', desc: '30 günlük sayfasını topla.' },
  { id: 'shop', name: 'Müşteri', desc: 'Marketten ilk eşyayı al.' },
  { id: 'nightmare', name: 'Kâbus Yolcusu', desc: 'Kâbus modunda 3. günü geç.' },
];
const UNL = new Set(rd('a305_ach', []));
export const hasAch = (id) => UNL.has(id);
export const achCount = () => UNL.size;
let onUnlock = null;
export const setUnlockHandler = (f) => { onUnlock = f; };
export function unlock(id) {
  if (UNL.has(id)) return false;
  UNL.add(id); wr('a305_ach', [...UNL]);
  const a = ACH.find((x) => x.id === id);
  if (a && onUnlock) onUnlock(a);
  return true;
}
