Unicode true
!include "MUI2.nsh"
!define APP "30,5"
!define VER "0.2.0"
Name "${APP}"
OutFile "release\30,5-Kurulum-${VER}.exe"
InstallDir "$LOCALAPPDATA\Programs\${APP}"
RequestExecutionLevel user
SetCompressor /SOLID lzma
!define MUI_ICON "build\icon.ico"
!define MUI_UNICON "build\icon.ico"
!define MUI_FINISHPAGE_RUN "$INSTDIR\30,5.exe"
!define MUI_FINISHPAGE_RUN_TEXT "30,5 oyununu şimdi başlat"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "Turkish"
Section "Install"
  SetOutPath "$INSTDIR"
  File /r "release\win-unpacked\*.*"
  WriteUninstaller "$INSTDIR\Kaldir.exe"
  CreateDirectory "$SMPROGRAMS\${APP}"
  CreateShortcut "$SMPROGRAMS\${APP}\${APP}.lnk" "$INSTDIR\30,5.exe" "" "$INSTDIR\icon.ico"
  CreateShortcut "$SMPROGRAMS\${APP}\Kaldır.lnk" "$INSTDIR\Kaldir.exe"
  CreateShortcut "$DESKTOP\${APP}.lnk" "$INSTDIR\30,5.exe" "" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}" "DisplayName" "${APP}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}" "DisplayVersion" "${VER}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}" "Publisher" "Eren Ensar"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}" "DisplayIcon" "$INSTDIR\icon.ico"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}" "UninstallString" "$INSTDIR\Kaldir.exe"
SectionEnd
Section "Uninstall"
  Delete "$DESKTOP\${APP}.lnk"
  RMDir /r "$SMPROGRAMS\${APP}"
  RMDir /r "$INSTDIR"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\${APP}"
SectionEnd
