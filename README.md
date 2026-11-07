# 30,5 — 1-4. Gün + Korku başlangıcı

3B birinci şahıs oyun. 1-3. gün tamir, 4. gün düşüş ve -30,5, ardından korku bölümünün ilk günleri (canavarsız): prosedürel labirent, güvenli oda, uyku, gün sayacı.

## Hemen oyna (tarayıcı)
`dist/oyun.html` dosyasını Chrome / Edge ile aç. Tek dosyadır, internet gerekmez.

## Kontroller
- WASD: yürü, Shift: koş (gürültülü!), C: eğil (sessiz), fare: bak (bir kez tıkla, imleç kaybolur), F: tam ekran
- Q: el feneri (korku bölümünde; baktığın yönü aydınlatır)
- E veya sol tık: etkileşim (vida gibi bazı işlerde basılı tut)
- Esc: duraklat

## Geliştirme
```
npm install
npm run build      # src/ -> dist/oyun.html (tek dosya)
npm start          # derler ve Electron penceresinde açar
npm run dist       # Windows (.exe kurulum) + Linux (AppImage) paketler
```

## Dosya yapısı
- `src/core.js`      motor: oyuncu, çarpışma, etkileşim, görev listesi, arayüz
- `src/days.js`      1-3. gün sahneleri, görevleri, gün geçişleri
- `src/minigames.js` mercek silme, tuş kodu, zamanlama mini oyunları
- `src/audio.js`     WebAudio ile üretilen ses efektleri ve ortam sesi
- `src/util.js`      prosedürel dokular, malzemeler
- `main.cjs`         Electron kabuğu (F11: tam ekran)

## Canavarlar (`src/monsters.js`)
Gün 2 Kör (yalnızca ses), 8 Sağır (yalnızca görüş; fener uzaktan çeker), 14 Yetenekli (görür + duyar + sezer), 20 Heykel (bakılmazken koşar), 26 İz Sürücü (kokuyu izler). Eskiler her gün biraz güçlenir. Yeni canavar günü kısa bir sinematikle gelir, sonra kontrol oyuncuya geçer.
`src/cabin.js`: kalıcı yük asansörü kabini; 1. günde çıkınca kapılar ve duvar kapanır (30,5. günde `cabin.unseal()` ile açılacak).

## Gün 30,5 (son bölüm)
30. günü uyuyunca açılır (menüden de "Son bölüm"). Her yerde 16 oda var, yalnızca biri doğru: sıcak uğultu yalnızca doğru odadan gelir. Yanlış odada uyumaya çalışırsan yakalanırsın. Doğru odada uyuyunca duvar açılır, tüm canavarlar alarma geçer; asansör kabinine ulaşırsan oyun biter.

## Sıradaki adımlar
Zorluk ayarı, ses cilası, tasarım cilası.

## Ana menü ve kayıt
- Ana menü 3B: canavarlar kafeslerde. Üzerine gelince kafes titrer ve kırmızı ışık yanar; tıklarsan kafesten fırlar (jumpscare).
- Yakalanma ve yaklaşma sahneleri güçlendirildi (yüze yakın çekim, ani sessizlik, flaş, çığlık).
- "Karanlığa Dön (Gün X)" korku modundaki ilerlemeyi saklar. Ses ve fare hassasiyeti menüden ayarlanır, kaydedilir.

## Android APK
- Telefon için dokunmatik kontroller (joystick, sağ yarıda bakma, E/fener/koş/eğil/şişe düğmeleri) oyunda hazır.
- APK'yı GitHub Actions üretir: projeyi bir GitHub deposuna yükle, Actions sekmesinden "Android APK" iş akışını çalıştır, çıkan `30-5-apk` dosyasından app-debug.apk'yı indir.
