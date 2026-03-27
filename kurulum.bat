@echo off
title Rabels - Kurulum

echo.
echo  ================================================
echo   RABELS VIDEO INDIRICI - Kurulum
echo  ================================================
echo.

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo  [HATA] Node.js bulunamadi.
    echo  Lutfen https://nodejs.org adresinden indirin.
    pause
    exit /b 1
)
for /f "tokens=*" %%v in ('node --version') do echo  [OK] Node.js %%v mevcut.

echo.
echo  [1/6] npm paketleri kuruluyor...
call npm install
if %errorlevel% neq 0 (
    echo  [HATA] npm install basarisiz.
    pause
    exit /b 1
)
echo  [OK] Paketler kuruldu.

echo.
echo  [2/6] Klasorler olusturuluyor...
if not exist "gecici" mkdir gecici
if not exist "loglar" mkdir loglar
if not exist "veritabani" mkdir veritabani
if not exist "bin" mkdir bin
echo  [OK] Klasorler hazir.

echo.
echo  [3/6] yt-dlp indiriliyor...
if exist "bin\yt-dlp.exe" (
    echo  [OK] yt-dlp zaten mevcut, atlanıyor.
) else (
    echo  GitHub'dan indiriliyor...
    powershell -Command "& { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe' -OutFile 'bin\yt-dlp.exe' -UseBasicParsing }"
    if exist "bin\yt-dlp.exe" (
        echo  [OK] yt-dlp indirildi.
    ) else (
        echo  [UYARI] yt-dlp indirilemedi. Internet baglantisini kontrol edin.
        echo  Manuel indirme: https://github.com/yt-dlp/yt-dlp/releases/latest
        echo  bin\ klasorune yt-dlp.exe olarak kaydedin.
    )
)

echo.
echo  [4/6] ffmpeg indiriliyor...
if exist "bin\ffmpeg.exe" if exist "bin\ffprobe.exe" goto ffmpeg_mevcut

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; $zip = Join-Path (Get-Location) 'bin\ffmpeg-release-essentials.zip'; $temp = Join-Path (Get-Location) 'bin\ffmpeg-temp'; if (Test-Path $zip) { Remove-Item $zip -Force }; if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }; Invoke-WebRequest -Uri 'https://www.gyan.dev/ffmpeg/builds/ffmpeg-release-essentials.zip' -OutFile $zip -UseBasicParsing; Expand-Archive -Path $zip -DestinationPath $temp -Force; $ffmpeg = Get-ChildItem -Path $temp -Recurse -Filter 'ffmpeg.exe' | Select-Object -First 1; $ffprobe = Get-ChildItem -Path $temp -Recurse -Filter 'ffprobe.exe' | Select-Object -First 1; if (-not $ffmpeg) { throw 'ffmpeg.exe bulunamadi' }; if (-not $ffprobe) { throw 'ffprobe.exe bulunamadi' }; Copy-Item $ffmpeg.FullName (Join-Path (Get-Location) 'bin\ffmpeg.exe') -Force; Copy-Item $ffprobe.FullName (Join-Path (Get-Location) 'bin\ffprobe.exe') -Force; Remove-Item $zip -Force -ErrorAction SilentlyContinue; Remove-Item $temp -Recurse -Force -ErrorAction SilentlyContinue; exit 0 } catch { Write-Host $_.Exception.Message; exit 1 }"
if %errorlevel% neq 0 (
    echo  [UYARI] ffmpeg indirilemedi.
    echo  Manuel indirme: https://www.gyan.dev/ffmpeg/builds/
    echo  ffmpeg.exe ve ffprobe.exe dosyalarini bin\ klasorune koyun.
    pause
) else (
    echo  [OK] ffmpeg ve ffprobe hazir.
)
goto ffmpeg_hazir

:ffmpeg_mevcut
echo  [OK] ffmpeg zaten mevcut, atlanıyor.

:ffmpeg_hazir

echo.
echo  [5/6] .env dosyasi hazirlaniyor...
if not exist ".env" (
    copy ".env.ornek" ".env" >nul
    echo  [OK] .env olusturuldu.
) else (
    echo  [OK] .env zaten mevcut.
)

echo.
echo  [6/6] Veritabani olusturuluyor...
node -e "require('./veritabani/veritabani').baglan().then(()=>{ console.log('[OK] Veritabani hazir.'); process.exit(0); }).catch(e=>{ console.error('[HATA]',e.message); process.exit(1); });"
if %errorlevel% neq 0 (
    echo  [HATA] Veritabani olusturulamadi.
    pause
    exit /b 1
)

echo.
echo  ================================================
echo   Kurulum basarili!
echo.
echo   Baslatmak icin: baslar.bat
echo.
echo   Admin bilgileri:
echo   Kullanici : admin
echo   Sifre     : admin123
echo.
echo   ONEMLI: Giris yapinca sifrenizi degistirin!
echo  ================================================
echo.
pause
