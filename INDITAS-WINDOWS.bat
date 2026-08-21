@echo off
setlocal
title ER Affiliate - demo
cd /d "%~dp0"

echo.
echo  ============================================
echo    ER AFFILIATE  -  demo inditasa
echo  ============================================
echo.

where node >nul 2>nul
if errorlevel 1 (
  echo  [HIBA] Nincs telepitve a Node.js.
  echo.
  echo  Toltsd le innen:  https://nodejs.org   ^(az "LTS" gomb^)
  echo  Telepites utan inditsd ujra ezt a fajlt.
  echo.
  pause
  exit /b 1
)

if not exist ".env.local" (
  echo  [1/3] Demo beallitasok bemasolasa...
  copy /y ".env.demo" ".env.local" >nul
) else (
  echo  [1/3] Beallitasok mar keszen vannak.
)

if not exist "node_modules" (
  echo  [2/3] Fuggosegek telepitese - elso alkalommal 1-2 perc, turelem...
  call npm install --no-audit --no-fund
  if errorlevel 1 (
    echo.
    echo  [HIBA] Az "npm install" nem sikerult. Ellenorizd az internetkapcsolatot.
    pause
    exit /b 1
  )
) else (
  echo  [2/3] Fuggosegek mar telepitve.
)

echo  [3/3] Szerver inditasa...
echo.
echo  ============================================
echo    Megnyitas:  http://localhost:3000
echo.
echo    Admin belepes:    admin@demo.hu   / demo1234
echo    Partner belepes:  partner@demo.hu / demo1234
echo.
echo    Leallitas: zard be ezt az ablakot.
echo  ============================================
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 14; Start-Process 'http://localhost:3000/admin/belepes'"
call npm run dev

echo.
echo  A szerver leallt.
pause
