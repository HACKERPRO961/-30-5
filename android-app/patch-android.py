# Capacitor'un ürettiği Android projesine: yatay ekran, tam ekran, ikon, ekran uyanık kalsın
import glob, os, re, shutil
base = 'android/app/src/main'
mf = base + '/AndroidManifest.xml'
s = open(mf, encoding='utf-8').read()
if 'screenOrientation' not in s:
    s = s.replace('<activity', '<activity android:screenOrientation="sensorLandscape"', 1)
open(mf, 'w', encoding='utf-8').write(s)
# ikonlar
for d in glob.glob(base + '/res/mipmap-anydpi*'):
    shutil.rmtree(d)
for dens in ['mdpi', 'hdpi', 'xhdpi', 'xxhdpi', 'xxxhdpi']:
    for n in ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png']:
        shutil.copy(f'icons/{dens}.png', f'{base}/res/mipmap-{dens}/{n}')
# tam ekran + ekran uyanık
for f in glob.glob(base + '/java/**/MainActivity.java', recursive=True):
    t = open(f, encoding='utf-8').read()
    if 'setSystemUiVisibility' not in t:
        t = t.replace('public class MainActivity extends BridgeActivity {}', '''public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideBars();
    }
    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) hideBars();
    }
    private void hideBars() {
        getWindow().getDecorView().setSystemUiVisibility(
            android.view.View.SYSTEM_UI_FLAG_FULLSCREEN | android.view.View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | android.view.View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | android.view.View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | android.view.View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | android.view.View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }
}''')
        open(f, 'w', encoding='utf-8').write(t)
print('patched')
