@echo off
setlocal
title ER Affiliate - feltoltes GitHubra
cd /d "%~dp0"

echo.
echo  ==================================================
echo    FELTOLTES:  github.com/tibi0223/-R_AFFILIATE
echo  ==================================================
echo.

where git >nul 2>nul
if errorlevel 1 (
  echo  [HIBA] Nincs telepitve a Git.
  echo  Toltsd le innen:  https://git-scm.com/download/win
  echo  Telepites utan inditsd ujra ezt a fajlt.
  echo.
  pause
  exit /b 1
)

if not exist ".git" (
  echo  [HIBA] Hianyzik a .git mappa. Csomagold ki ujra a zip-et
  echo  ugy, hogy a rejtett fajlok is kikeruljenek.
  echo.
  pause
  exit /b 1
)

if exist ".git\index.lock" del /f /q ".git\index.lock" >nul 2>nul

echo  A commit mar kesz, csak fel kell tolteni.
echo  Ha a GitHub belepest ker, a bongeszoben jelentkezz be.
echo.
echo  --------------------------------------------------
git push -u origin main
echo  --------------------------------------------------

if errorlevel 1 goto :ELUTASITVA

echo.
echo  KESZ. Megnyitom a repot a bongeszoben...
start "" https://github.com/tibi0223/-R_AFFILIATE
echo.
pause
exit /b 0

:ELUTASITVA
echo.
echo  A push nem ment at elsore. A leggyakoribb ok, hogy a repo
echo  mar nem ures (pl. van benne egy README).
echo.
echo  Megpr¢balom osszefesulni a meglevo tartalommal...
echo.
git pull --rebase origin main
if errorlevel 1 goto :KEZI
git push -u origin main
if errorlevel 1 goto :KEZI

echo.
echo  KESZ. Megnyitom a repot a bongeszoben...
start "" https://github.com/tibi0223/-R_AFFILIATE
echo.
pause
exit /b 0

:KEZI
echo.
echo  Az automatikus osszefesules sem sikerult.
echo.
echo  Ha a repo tartalmat NYUGODTAN FELUL LEHET IRNI, futtasd ezt
echo  a parancsot ebben a mappaban (jobb klikk - "Open Git Bash here"
echo  vagy cmd):
echo.
echo      git push -u origin main --force
echo.
echo  FIGYELEM: ez torli a repo jelenlegi tartalmat!
echo.
pause
exit /b 1
