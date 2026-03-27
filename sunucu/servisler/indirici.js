'use strict';
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const { platformTespit } = require('./platform');

const GECICI_KLASOR = path.join(__dirname, '..', '..', 'gecici');

function ytdlpKomutBul() {
  const adaylar = ['yt-dlp', 'yt-dlp.exe'];
  const ekYollar = [
    path.join(__dirname, '..', '..', 'bin', 'yt-dlp.exe'),
    path.join(__dirname, '..', '..', 'bin', 'yt-dlp'),
    'C:\\yt-dlp\\yt-dlp.exe',
  ];
  for (const e of ekYollar) {
    if (fs.existsSync(e)) return e;
  }
  return 'yt-dlp';
}

function medyaBilgisiAl(url, cb) {
  const bilgi = platformTespit(url);
  if (!bilgi) return cb(new Error('Desteklenmeyen platform'));

  const komut = ytdlpKomutBul();
  const args = ['--dump-json', '--no-playlist', url];

  execFile(komut, args, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (hata, stdout) => {
    if (hata) return cb(new Error('Medya bilgisi alinamadi'));
    try {
      const veri = JSON.parse(stdout.trim().split('\n')[0]);
      const tumFormatlar = veri.formats || [];
      const formatHaritasi = new Map();
      const sesVarmi = tumFormatlar.some(f => f.acodec && f.acodec !== 'none');
      const birlesikMp4Var = tumFormatlar.some(f => {
        const uzanti = String(f.ext || '').toLowerCase();
        const videoVar = f.vcodec && f.vcodec !== 'none';
        const sesVar = f.acodec && f.acodec !== 'none';
        return uzanti === 'mp4' && videoVar && sesVar;
      });
      const platformYoutube = bilgi.platform === 'youtube' || bilgi.platform === 'youtube_shorts';

      tumFormatlar.forEach(f => {
        const videoVar = f.vcodec && f.vcodec !== 'none';
        const sesVar = f.acodec && f.acodec !== 'none';
        const yukseklik = Number(f.height || 0);
        const uzanti = String(f.ext || '').toLowerCase();
        const codec = String(f.vcodec || '').toLowerCase();
        const protokol = String(f.protocol || '').toLowerCase();
        const etiket = yukseklik + 'p';

        if (!videoVar || !yukseklik || uzanti !== 'mp4') return;

        if (platformYoutube) {
          const codecPuan = codec.includes('avc1') || codec.includes('h264') ? 4 : (codec.includes('av01') ? 3 : (codec.includes('vp9') ? 2 : 1));
          const protokolPuan = protokol.includes('m3u8') ? 3 : (protokol.includes('https') ? 2 : 1);
          const mevcut = formatHaritasi.get(etiket);
          if (!mevcut || protokolPuan > mevcut.protokolPuan || (protokolPuan === mevcut.protokolPuan && (codecPuan > mevcut.codecPuan || (codecPuan === mevcut.codecPuan && Number(f.tbr || 0) > Number(mevcut.tbr || 0))))) {
            formatHaritasi.set(etiket, {
              tur: 'video',
              format: 'mp4',
              kalite: etiket,
              yukseklik,
              tbr: Number(f.tbr || 0),
              codecPuan,
              protokolPuan,
              sesVar
            });
          }
          return;
        }

        if (birlesikMp4Var) {
          if (!sesVar) return;
          if (!codec.includes('avc1') && !codec.includes('h264')) return;
          const mevcut = formatHaritasi.get(etiket);
          if (!mevcut || Number(f.tbr || 0) > Number(mevcut.tbr || 0)) {
            formatHaritasi.set(etiket, { tur: 'video', format: 'mp4', kalite: etiket, yukseklik, tbr: Number(f.tbr || 0) });
          }
          return;
        }

        const codecPuan = codec.includes('avc1') || codec.includes('h264') ? 2 : (codec.includes('hev1') || codec.includes('hvc1') ? 0 : 1);
        const mevcut = formatHaritasi.get(etiket);
        if (!mevcut || codecPuan > mevcut.codecPuan || (codecPuan === mevcut.codecPuan && Number(f.tbr || 0) > Number(mevcut.tbr || 0))) {
          formatHaritasi.set(etiket, {
            tur: 'video',
            format: 'mp4',
            kalite: etiket,
            yukseklik,
            tbr: Number(f.tbr || 0),
            codecPuan
          });
        }
      });

      const formatlar = [...formatHaritasi.values()]
        .sort((a, b) => b.yukseklik - a.yukseklik)
        .map(({ codecPuan, protokolPuan, sesVar, ...kalan }) => kalan);
      if (sesVarmi) formatlar.push({ tur: 'ses', format: 'mp3', kalite: 'En Iyi', yukseklik: 0 });
      cb(null, {
        baslik: (veri.title || 'Video').slice(0, 100),
        sure: veri.duration || 0,
        kucukResim: veri.thumbnail || '',
        platform: bilgi,
        formatlar
      });
    } catch {
      cb(new Error('Medya ayristirilamadi'));
    }
  });
}

function indir(url, format, kalite, cb) {
  const id = uuid();
  const hedef = path.join(GECICI_KLASOR, id + '.' + format);
  const komut = ytdlpKomutBul();
  let args;

  if (format === 'mp3') {
    args = ['-f', 'bestaudio/best', '-o', hedef, '--no-playlist', url];
  } else if (format === 'wav') {
    args = ['-f', 'bestaudio/best', '-o', hedef, '--no-playlist', url];
  } else {
    const yukseklik = (kalite || '720').replace('p', '');
    const bilgi = platformTespit(url);
    if (bilgi && (bilgi.platform === 'youtube' || bilgi.platform === 'youtube_shorts')) {
      args = [
        '-f', `best[protocol*=m3u8][ext=mp4][height<=${yukseklik}][vcodec^=avc1]/best[protocol*=m3u8][ext=mp4][height<=${yukseklik}]/bestvideo[ext=mp4][height<=${yukseklik}][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4][height<=${yukseklik}][vcodec^=avc1]/bestvideo[ext=mp4][height<=${yukseklik}]+bestaudio[ext=m4a]/best[ext=mp4]/best`,
        '--merge-output-format', 'mp4',
        '-o', hedef, '--no-playlist', url
      ];
    } else {
      args = [
        '-f', `best[ext=mp4][height<=${yukseklik}][vcodec^=avc1]/best[ext=mp4][height<=${yukseklik}][vcodec!*=hev1][vcodec!*=hvc1]/best[ext=mp4][height<=${yukseklik}]/best[ext=mp4]/best`,
        '-o', hedef, '--no-playlist', url
      ];
    }
  }

  execFile(komut, args, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (hata, stdout, stderr) => {
    if (hata) return cb(new Error((stderr || stdout || 'Indirme basarisiz').trim().slice(0, 500)));
    if (!fs.existsSync(hedef)) return cb(new Error('Dosya olusturulamadi'));
    cb(null, { id, dosyaYolu: hedef, format });
  });
}

module.exports = { medyaBilgisiAl, indir };
