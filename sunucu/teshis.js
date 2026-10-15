'use strict';
// Sunucu teşhis aracı: `npm run teshis`
// yt-dlp, ffmpeg, ağ erişimi ve örnek bir YouTube analizini kontrol eder;
// sorun varsa nedenini ve önerilen çözümü yazdırır.
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const indirici = require('./servisler/indirici');

const ORNEK = process.argv[2] || 'https://www.youtube.com/watch?v=jNQXAC9IVRw';

function calistir(komut, args, zaman = 60000) {
  return new Promise(resolve => {
    execFile(komut, args, { timeout: zaman, maxBuffer: 20 * 1024 * 1024 }, (hata, stdout, stderr) => {
      resolve({ hata, stdout: String(stdout || ''), stderr: String(stderr || '') });
    });
  });
}

function satir(durum, baslik, ayrinti) {
  const isaret = durum === true ? '✔' : (durum === false ? '✘' : '•');
  console.log(`${isaret} ${baslik}${ayrinti ? `\n    ${String(ayrinti).trim().split('\n').slice(-6).join('\n    ')}` : ''}`);
}

(async () => {
  console.log('\nMP3.NET.TR sunucu teşhisi\n');
  satir(true, `Node.js ${process.version}`, process.execPath);

  const ytdlp = indirici.ytdlpKomutBul();
  const surum = await calistir(ytdlp, ['--version'], 15000);
  if (surum.hata) {
    satir(false, 'yt-dlp bulunamadı', `Kurulum: sudo curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp && sudo chmod a+rx /usr/local/bin/yt-dlp`);
  } else {
    const s = surum.stdout.trim();
    const yil = Number(s.slice(0, 4));
    satir(yil >= 2025, `yt-dlp ${s}`, yil >= 2025 ? ytdlp : 'Sürüm çok eski. Güncelleyin: sudo yt-dlp -U  (apt ile kurulduysa: sudo apt remove yt-dlp ve yukarıdaki curl komutuyla kurun)');
    const y = indirici.ytdlpYetenekleri();
    satir(y.jsRuntimes, `--js-runtimes desteği: ${y.jsRuntimes ? 'var' : 'yok'}`);
  }

  const ffmpeg = await calistir('ffmpeg', ['-version'], 15000);
  satir(!ffmpeg.hata, ffmpeg.hata ? 'ffmpeg bulunamadı' : ffmpeg.stdout.split('\n')[0], ffmpeg.hata ? 'Kurulum: sudo apt install -y ffmpeg' : '');

  ['gecici', 'veritabani'].forEach(klasor => {
    const yol = path.join(__dirname, '..', klasor);
    try {
      fs.mkdirSync(yol, { recursive: true });
      fs.accessSync(yol, fs.constants.W_OK);
      satir(true, `${klasor}/ yazılabilir`);
    } catch (e) {
      satir(false, `${klasor}/ yazılamıyor`, `${e.message}\n    Çözüm: sudo chown -R $(whoami) ${yol}`);
    }
  });

  ['YTDLP_COOKIES', 'YTDLP_PROXY', 'YTDLP_EXTRACTOR_ARGS', 'INSTAGRAM_SESSIONID'].forEach(ad => {
    const deger = process.env[ad];
    if (!deger) return satir(null, `${ad} tanımlı değil`);
    if (ad === 'YTDLP_COOKIES') return satir(fs.existsSync(deger), `${ad}: ${deger}`, fs.existsSync(deger) ? '' : 'Dosya bulunamadı');
    satir(true, `${ad} tanımlı`);
  });

  console.log(`\nÖrnek analiz: ${ORNEK}`);
  const args = [...indirici.ytDlpJavascriptArgumanlari(), '--no-warnings', '--dump-json', '--no-playlist', '--skip-download', ORNEK];
  const analiz = await calistir(ytdlp, args, 90000);
  if (!analiz.hata) {
    try {
      const v = JSON.parse(analiz.stdout.split('\n')[0]);
      satir(true, `Analiz başarılı: "${v.title}" (${(v.formats || []).length} format)`);
    } catch {
      satir(false, 'Analiz çıktısı okunamadı', analiz.stdout.slice(0, 300));
    }
  } else {
    const detay = analiz.stderr || analiz.hata.message;
    satir(false, 'Analiz başarısız', detay);
    if (/not a bot|Sign in to confirm/i.test(detay)) {
      console.log(`
  → YouTube bu sunucunun IP adresini bot olarak işaretlemiş (bulut sunucularda sık görülür).
    Çözüm seçenekleri (birini uygulayın, sonra uygulamayı yeniden başlatın):
    1) Tarayıcınızda YouTube'a giriş yapın, "Get cookies.txt LOCALLY" eklentisiyle
       youtube.com çerezlerini dışa aktarın, dosyayı sunucuya yükleyin ve .env'ye
       YTDLP_COOKIES=/tam/yol/cookies.txt ekleyin.
    2) Konut (residential) vekil sunucu kullanın: YTDLP_PROXY=http://kullanici:sifre@host:port
    3) PO token eklentisi: pip install bgutil-ytdlp-pot-provider (ayrıca sunucu bileşeni gerekir).`);
    } else if (/no such option/i.test(detay)) {
      console.log('\n  → yt-dlp sürümü çok eski. Yukarıdaki komutla güncelleyin.');
    } else if (/ENOENT/.test(detay)) {
      console.log('\n  → yt-dlp PATH üzerinde değil. Yukarıdaki kurulum komutunu çalıştırın.');
    }
  }

  try {
    const yanit = await fetch('https://charts.youtube.com/', { method: 'HEAD' });
    satir(yanit.ok, `charts.youtube.com erişimi (${yanit.status})`);
  } catch (e) {
    satir(false, 'charts.youtube.com erişilemiyor', e.message);
  }
  console.log('');
})();
