'use strict';
const { execFile, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const { platformTespit } = require('./platform');
const ayarlar = require('./ayarlar');
const tiktok = require('./tiktok');

const GECICI_KLASOR = path.join(__dirname, '..', '..', 'gecici');
const aktifIndirmeler = new Map();

function aktifIndirmeEkle(kayit) {
  if (!kayit?.id) return;
  aktifIndirmeler.set(kayit.id, { ...kayit, durum: 'isleniyor', baslangic: Date.now() });
}

function aktifIndirmeGuncelle(id, degisiklik) {
  if (!id || !aktifIndirmeler.has(id)) return;
  aktifIndirmeler.set(id, { ...aktifIndirmeler.get(id), ...degisiklik });
}

function aktifIndirmeKaldir(id) {
  if (id) aktifIndirmeler.delete(id);
}

// Kurulu yt-dlp sürümünün desteklediği seçenekler. Eski sürümler (ör. apt
// paketleri) "--js-runtimes" gibi yeni seçenekleri tanımaz ve tanımadığı her
// seçenekte tüm isteği reddeder; bu yüzden seçenekler yalnızca destekleniyorsa
// eklenir.
let yetenekOnbellegi = null;
function ytdlpYetenekleri() {
  if (yetenekOnbellegi) return yetenekOnbellegi;
  try {
    const yardim = execFileSync(ytdlpKomutBul(), ['--help'], { timeout: 15000, maxBuffer: 4 * 1024 * 1024, windowsHide: true }).toString();
    yetenekOnbellegi = {
      kurulu: true,
      jsRuntimes: yardim.includes('--js-runtimes'),
      remoteComponents: yardim.includes('--remote-components')
    };
  } catch (hata) {
    // Bulunamadıysa bir sonraki istekte yeniden denenebilsin diye önbelleğe alınmaz.
    return { kurulu: hata.code !== 'ENOENT', jsRuntimes: false, remoteComponents: false };
  }
  return yetenekOnbellegi;
}

// YouTube artık bir JavaScript çalışma zamanı istiyor. Node.js zaten
// uygulamayla birlikte geldiği için her yt-dlp çağrısına açıkça verilir. EJS
// betikleri GitHub'dan alınıp yt-dlp tarafından önbelleğe alınır; çevrimdışı
// kurulumlarda YTDLP_REMOTE_COMPONENTS=0 ile kapatılabilir.
function ytDlpJavascriptArgumanlari() {
  const yetenek = ytdlpYetenekleri();
  const args = [];
  if (yetenek.jsRuntimes) {
    const nodeYolu = process.execPath;
    args.push('--js-runtimes', nodeYolu && fs.existsSync(nodeYolu) ? `node:${nodeYolu}` : 'node');
  }
  const remoteComponents = process.env.YTDLP_REMOTE_COMPONENTS === '0'
    ? ''
    : (process.env.YTDLP_REMOTE_COMPONENTS || 'ejs:github');
  if (remoteComponents && yetenek.remoteComponents) args.push('--remote-components', remoteComponents);
  // Instagram hikayeleri ve YouTube'un "bot değilim" doğrulaması için
  // Netscape formatındaki çerez dosyası YTDLP_COOKIES ile verilebilir.
  const cerezDosyasi = process.env.YTDLP_COOKIES;
  if (cerezDosyasi && fs.existsSync(cerezDosyasi)) args.push('--cookies', cerezDosyasi);
  // Veri merkezi IP'leri engellendiğinde istekler bir vekil sunucu üzerinden
  // yapılabilir (ör. http://kullanici:sifre@host:port veya socks5://...).
  if (process.env.YTDLP_PROXY) args.push('--proxy', process.env.YTDLP_PROXY);
  // Ör. PO token eklentisi için: youtube:player_client=default,mweb
  if (process.env.YTDLP_EXTRACTOR_ARGS) args.push('--extractor-args', process.env.YTDLP_EXTRACTOR_ARGS);
  return args;
}

// yt-dlp çıktısındaki gerçek hatayı korur; kullanıcıya gösterilecek mesaj
// rotalarda ytdlpHataMesaji() ile üretilir, ayrıntı hata kaydına yazılır.
function ytdlpHatasi(varsayilan, hata, stderr, stdout) {
  const detay = String(stderr || stdout || (hata && hata.message) || '').trim();
  const sonuc = new Error(varsayilan);
  sonuc.detay = (hata && hata.code === 'ENOENT' ? 'ENOENT: yt-dlp bulunamadi. ' : '') + detay.slice(-800);
  if (hata && hata.killed) sonuc.detay = 'Zaman asimi (yt-dlp yanit vermedi). ' + sonuc.detay;
  return sonuc;
}

function ytdlpHataMesaji(hata, varsayilan) {
  const detay = String((hata && (hata.detay || hata.message)) || '');
  if (/ENOENT/.test(detay)) return 'İndirme aracı (yt-dlp) sunucuda bulunamadı. Lütfen site yöneticisine bildirin.';
  if (/no such option|unrecognized arguments/i.test(detay)) return 'Sunucudaki yt-dlp sürümü çok eski. Lütfen site yöneticisine bildirin.';
  if (/confirm you.?re not a bot|Sign in to confirm|HTTP Error 429|Too Many Requests|rate.?limit/i.test(detay)) {
    return 'Platform şu anda sunucumuzdan gelen istekleri sınırlıyor. Lütfen birkaç dakika sonra tekrar deneyin.';
  }
  if (/private|login required|log in|requires authentication|members-only|Join this channel/i.test(detay)) return 'Bu içerik gizli veya giriş gerektiriyor; yalnızca herkese açık içerikler indirilebilir.';
  if (/unavailable|not available|has been removed|does not exist|404/i.test(detay)) return 'Bu video kaldırılmış veya bölgemizde erişilemiyor.';
  if (/Unsupported URL/i.test(detay)) return 'Bu bağlantı desteklenmiyor. Doğrudan video bağlantısını yapıştırın.';
  if (/Zaman asimi/.test(detay)) return 'İşlem zaman aşımına uğradı. Lütfen tekrar deneyin.';
  return varsayilan;
}

function dosyaAdiHazirla(baslik) {
  const temiz = String(baslik || '')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 150);
  return temiz || 'mp3.net.tr';
}

function oynatmaListesiUrlMi(url) {
  try {
    const parsed = new URL(url);
    const youtube = parsed.hostname.toLowerCase().endsWith('youtube.com');
    const liste = parsed.searchParams.has('list');
    return youtube && liste;
  } catch {
    return false;
  }
}

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

function ffmpegKlasoruBul() {
  const klasor = path.join(__dirname, '..', '..', 'bin');
  return fs.existsSync(path.join(klasor, 'ffmpeg.exe')) ? klasor : null;
}

// TikTok bulut sunucu IP'lerini sık sık engellediği için yt-dlp başarısız
// olursa yedek kaynak denenir. Yedek de başarısız olursa yt-dlp'nin hatası
// (gerçek neden) korunur.
function tiktokYedegiKullan(url, hata) {
  return tiktok.etkin() && platformTespit(url)?.platform === 'tiktok' && !/ENOENT/.test(String(hata?.detay || ''));
}

function medyaBilgisiAl(url, cb) {
  ytdlpMedyaBilgisiAl(url, (hata, veri) => {
    if (!hata || !tiktokYedegiKullan(url, hata)) return cb(hata, veri);
    tiktok.medyaBilgisi(url, platformTespit(url)).then(
      sonuc => cb(null, sonuc),
      yedekHata => {
        hata.detay = `${hata.detay || ''} | Yedek: ${yedekHata.detay || yedekHata.message}`;
        cb(hata);
      }
    );
  });
}

function tiktokYedekIndir(url, format, id, hedef, baslik, cb, ilkHata) {
  const sesMi = format === 'mp3' || format === 'wav';
  const videoYolu = sesMi ? path.join(GECICI_KLASOR, `${id}.kaynak.mp4`) : hedef;
  const hataVer = yedekHata => {
    try { if (sesMi) fs.unlinkSync(videoYolu); } catch {}
    const sonuc = new Error('Indirme basarisiz');
    sonuc.detay = `${ilkHata.detay || ''} | Yedek: ${yedekHata.detay || yedekHata.message}`;
    sonuc.message = sonuc.detay.slice(-500);
    cb(sonuc);
  };
  tiktok.videoIndir(url, videoYolu).then(() => {
    if (!sesMi) return cb(null, { id, dosyaYolu: hedef, format, dosyaAdi: dosyaAdiHazirla(baslik) });
    const sesArgs = format === 'mp3' ? ['-c:a', 'libmp3lame', '-q:a', '0'] : ['-c:a', 'pcm_s16le'];
    execFile(ffmpegKomutBul(), ['-y', '-i', videoYolu, '-vn', ...sesArgs, hedef], { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (ffHata, stdout, stderr) => {
      try { fs.unlinkSync(videoYolu); } catch {}
      if (ffHata || !fs.existsSync(hedef)) return hataVer({ detay: `ffmpeg: ${String(stderr || ffHata?.message || '').trim().slice(-300)}` });
      cb(null, { id, dosyaYolu: hedef, format, dosyaAdi: dosyaAdiHazirla(baslik) });
    });
  }, hataVer);
}

function ytdlpMedyaBilgisiAl(url, cb) {
  const bilgi = platformTespit(url);
  if (!bilgi) return cb(new Error('Desteklenmeyen platform'));
  if (oynatmaListesiUrlMi(url)) return oynatmaListesiBilgisiAl(url, bilgi, cb);

  const komut = ytdlpKomutBul();
  const args = [...ytDlpJavascriptArgumanlari(), '--no-warnings', '--dump-json', '--no-playlist', url];

  execFile(komut, args, { timeout: 45000, maxBuffer: 10 * 1024 * 1024 }, (hata, stdout, stderr) => {
    if (hata) return cb(ytdlpHatasi('Medya bilgisi alinamadi', hata, stderr));
    try {
      const veri = JSON.parse(stdout.trim().split('\n')[0]);
      const tumFormatlar = veri.formats || [];
      const formatHaritasi = new Map();
      // Bazı siteler codec bilgisini vermez (null). Codec'i bilinmeyen tek
      // dosyalık formatlar hem görüntü hem ses içeriyor kabul edilir.
      const videoVarMi = f => f.vcodec !== 'none' && Boolean(f.vcodec || f.height);
      const sesVarMi = f => (f.acodec ? f.acodec !== 'none' : (f.acodec == null && f.vcodec == null));
      const sesVarmi = tumFormatlar.some(sesVarMi);
      const birlesikMp4Var = tumFormatlar.some(f => {
        const uzanti = String(f.ext || '').toLowerCase();
        return uzanti === 'mp4' && videoVarMi(f) && sesVarMi(f);
      });
      const platformYoutube = bilgi.platform === 'youtube' || bilgi.platform === 'youtube_shorts';

      tumFormatlar.forEach(f => {
        const videoVar = videoVarMi(f);
        const sesVar = sesVarMi(f);
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
          if (codec && !codec.includes('avc1') && !codec.includes('h264')) return;
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

function oynatmaListesiBilgisiAl(url, bilgi, cb) {
  const komut = ytdlpKomutBul();
  const args = [
    ...ytDlpJavascriptArgumanlari(),
    '--dump-single-json',
    '--flat-playlist',
    '--playlist-end', '50',
    '--no-warnings',
    '--skip-download',
    url
  ];

  execFile(komut, args, { timeout: 45000, maxBuffer: 10 * 1024 * 1024 }, (hata, stdout, stderr) => {
    if (hata) return cb(ytdlpHatasi('Oynatma listesi bilgisi alinamadi', hata, stderr));
    try {
      const veri = JSON.parse(String(stdout || '').trim());
      const oynatmaListesi = (veri.entries || [])
        .filter(kayit => kayit && kayit.id)
        .map(kayit => ({
          id: String(kayit.id),
          url: kayit.webpage_url || `https://www.youtube.com/watch?v=${encodeURIComponent(kayit.id)}`,
          baslik: String(kayit.title || 'Basliksiz video').slice(0, 200),
          kanal: String(kayit.channel || kayit.uploader || '').slice(0, 100),
          sure: Number(kayit.duration || 0),
          kucukResim: kayit.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(kayit.id)}/hqdefault.jpg`,
          yayinTarihi: String(kayit.upload_date || '')
        }));
      cb(null, {
        tur: 'oynatma_listesi',
        baslik: String(veri.title || 'YouTube oynatma listesi').slice(0, 200),
        kucukResim: oynatmaListesi[0]?.kucukResim || '',
        platform: bilgi,
        oynatmaListesi,
        toplam: oynatmaListesi.length,
        maksTopluVideo: ayarlar.tumunuAl().maksTopluVideo
      });
    } catch {
      cb(new Error('Oynatma listesi ayristirilamadi'));
    }
  });
}

function youtubeAra(sorgu, cb) {
  const temizSorgu = String(sorgu || '').trim();
  if (!temizSorgu) return cb(new Error('Arama ifadesi bos'));

  const komut = ytdlpKomutBul();
  const args = [
    ...ytDlpJavascriptArgumanlari(),
    '--dump-json',
    '--flat-playlist',
    '--no-warnings',
    '--skip-download',
    `ytsearch10:${temizSorgu}`
  ];

  execFile(komut, args, { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }, (hata, stdout, stderr) => {
    if (hata) return cb(ytdlpHatasi('YouTube aramasi basarisiz', hata, stderr));

    const sonuclar = String(stdout || '')
      .split(/\r?\n/)
      .map(satir => satir.trim())
      .filter(Boolean)
      .slice(0, 10)
      .map(satir => {
        try { return JSON.parse(satir); } catch { return null; }
      })
      .filter(veri => veri && veri.id)
      .map(veri => ({
        id: String(veri.id),
        url: veri.webpage_url || `https://www.youtube.com/watch?v=${encodeURIComponent(veri.id)}`,
        baslik: String(veri.title || 'Basliksiz video').slice(0, 200),
        kanal: String(veri.channel || veri.uploader || '').slice(0, 100),
        sure: Number(veri.duration || 0),
        kucukResim: veri.thumbnail || `https://i.ytimg.com/vi/${encodeURIComponent(veri.id)}/hqdefault.jpg`,
        yayinTarihi: String(veri.upload_date || '')
      }));

    cb(null, sonuclar);
  });
}

function indir(url, format, kalite, cb, baslik) {
  const id = uuid();
  const hedef = path.join(GECICI_KLASOR, id + '.' + format);
  const komut = ytdlpKomutBul();
  let args;

  if (format === 'mp3') {
    args = ['--no-warnings', '-f', 'bestaudio/best', '-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', hedef, '--no-playlist', url];
  } else if (format === 'wav') {
    args = ['--no-warnings', '-f', 'bestaudio/best', '-x', '--audio-format', 'wav', '-o', hedef, '--no-playlist', url];
  } else {
    const yukseklik = (kalite || ayarlar.tumunuAl().varsayilanKalite || '720p').replace('p', '');
    const bilgi = platformTespit(url);
    if (bilgi && (bilgi.platform === 'youtube' || bilgi.platform === 'youtube_shorts')) {
      args = [
        '--no-warnings',
        '-f', `best[protocol*=m3u8][ext=mp4][height<=${yukseklik}][vcodec^=avc1]/best[protocol*=m3u8][ext=mp4][height<=${yukseklik}]/bestvideo[ext=mp4][height<=${yukseklik}][vcodec^=avc1]+bestaudio[ext=m4a]/best[ext=mp4][height<=${yukseklik}][vcodec^=avc1]/bestvideo[ext=mp4][height<=${yukseklik}]+bestaudio[ext=m4a]/best[ext=mp4]/best`,
        '--merge-output-format', 'mp4',
        '-o', hedef, '--no-playlist', url
      ];
    } else {
      args = [
        '--no-warnings',
        '-f', `best[ext=mp4][height<=${yukseklik}][vcodec^=avc1]/best[ext=mp4][height<=${yukseklik}][vcodec!*=hev1][vcodec!*=hvc1]/best[ext=mp4][height<=${yukseklik}]/bestvideo[ext=mp4][height<=${yukseklik}]+bestaudio[ext=m4a]/bestvideo[height<=${yukseklik}]+bestaudio/best[ext=mp4]/best`,
        '--merge-output-format', 'mp4',
        '-o', hedef, '--no-playlist', url
      ];
    }
  }

  args = [...ytDlpJavascriptArgumanlari(), ...args];

  const ffmpegKlasoru = ffmpegKlasoruBul();
  if (ffmpegKlasoru) args = ['--ffmpeg-location', ffmpegKlasoru, ...args];

  execFile(komut, args, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }, (hata, stdout, stderr) => {
    if (hata) {
      const sonuc = ytdlpHatasi('Indirme basarisiz', hata, stderr, stdout);
      sonuc.message = sonuc.detay.slice(0, 500) || 'Indirme basarisiz';
      if (tiktokYedegiKullan(url, sonuc)) return tiktokYedekIndir(url, format, id, hedef, baslik, cb, sonuc);
      return cb(sonuc);
    }
    if (!fs.existsSync(hedef)) {
      const detay = String(stderr || stdout || '').trim().slice(0, 500);
      return cb(new Error(detay ? `Dosya olusturulamadi: ${detay}` : 'Dosya olusturulamadi'));
    }
    cb(null, { id, dosyaYolu: hedef, format, dosyaAdi: dosyaAdiHazirla(baslik) });
  });
}

function ffmpegKomutBul() {
  const yerel = path.join(__dirname, '..', '..', 'bin', 'ffmpeg.exe');
  return fs.existsSync(yerel) ? yerel : 'ffmpeg';
}

function kirp(url, baslangic, bitis, kalite, cb, baslik) {
  const sure = bitis - baslangic;
  if (!Number.isFinite(baslangic) || !Number.isFinite(bitis) || baslangic < 0 || sure <= 0 || sure > 1800) {
    return cb(new Error('Gecersiz kirpma araligi'));
  }

  indir(url, 'mp4', kalite, (hata, kaynak) => {
    if (hata) return cb(hata);

    const id = uuid();
    const hedef = path.join(GECICI_KLASOR, id + '.mp4');
    const args = [
      '-y',
      '-ss', String(baslangic),
      '-i', kaynak.dosyaYolu,
      '-t', String(sure),
      '-map', '0:v:0',
      '-map', '0:a?',
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '23',
      '-c:a', 'aac',
      '-b:a', '192k',
      '-movflags', '+faststart',
      hedef
    ];

    execFile(ffmpegKomutBul(), args, { timeout: 600000, maxBuffer: 10 * 1024 * 1024 }, (ffmpegHatasi, stdout, stderr) => {
      try { fs.unlinkSync(kaynak.dosyaYolu); } catch {}
      if (ffmpegHatasi) return cb(new Error((stderr || stdout || 'Kirpma basarisiz').trim().slice(0, 500)));
      if (!fs.existsSync(hedef)) return cb(new Error('Kirpilmis dosya olusturulamadi'));
      cb(null, { id, dosyaYolu: hedef, format: 'mp4', dosyaAdi: dosyaAdiHazirla(baslik) });
    });
  }, baslik);
}

module.exports = { ytdlpKomutBul, ytdlpYetenekleri, ytDlpJavascriptArgumanlari, ytdlpHataMesaji, medyaBilgisiAl, youtubeAra, indir, kirp, aktifIndirmeler, aktifIndirmeEkle, aktifIndirmeGuncelle, aktifIndirmeKaldir };
