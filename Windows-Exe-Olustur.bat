@echo off
chcp 65001 >nul
echo === 30,5 kurulum dosyasi olusturuluyor ===
where node >nul 2>nul || (echo Node.js bulunamadi. https://nodejs.org adresinden LTS surumunu kurup tekrar calistir. & pause & exit /b 1)
call npm install --no-audit --no-fund || (echo npm install basarisiz & pause & exit /b 1)
call npm run kur || (echo Derleme basarisiz & pause & exit /b 1)
echo.
echo Hazir! release klasorundeki "30,5-Kurulum-*.exe" dosyasini calistirip oyunu kurabilirsin.
start "" release
pause
