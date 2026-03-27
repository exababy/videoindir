@echo off
title Rabels Video Indirici

echo.
echo  ================================================
echo   RABELS VIDEO INDIRICI
echo  ================================================
echo.

if not exist ".env" (
    echo  [HATA] .env bulunamadi. Once kurulum.bat calistirin.
    pause
    exit /b 1
)

if not exist "node_modules" (
    echo  [HATA] node_modules bulunamadi. Once kurulum.bat calistirin.
    pause
    exit /b 1
)

set PORT=3000
for /f "tokens=1,* delims==" %%a in (.env) do (
    if "%%a"=="PORT" set PORT=%%b
)

echo  Adres  : http://localhost:%PORT%
echo  Admin  : http://localhost:%PORT%/admin/giris
echo  Durdurmak icin CTRL+C
echo.

node sunucu/uygulama.js

echo.
echo  Sunucu durduruldu.
pause
