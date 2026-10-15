'use strict';
require('dotenv').config();
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');
const path = require('path');
const crypto = require('crypto');
const db = require('../veritabani/veritabani');
const compression = require('compression');
const site = require('./veri/site');
const gorunumYardimcilari = require('./servisler/gorunum');

const uygulama = express();
const PORT = process.env.PORT || 3000;

function kritikHataKaydet(kaynak, hata) {
  const mesaj = `${kaynak}: ${hata && hata.stack ? hata.stack : hata}`;
  console.error('\n[KRITIK HATA]', mesaj);
  try {
    db.calistir('INSERT INTO hatalar (mesaj, yol) VALUES (?, ?)', [String(mesaj).slice(0, 500), kaynak]);
  } catch {}
}

process.on('uncaughtException', hata => {
  kritikHataKaydet('uncaughtException', hata);
});

process.on('unhandledRejection', hata => {
  kritikHataKaydet('unhandledRejection', hata);
});

uygulama.set('view engine', 'ejs');
uygulama.set('views', path.join(__dirname, '..', 'gorunumler'));
uygulama.set('trust proxy', 1);

// Reklam ağları (AdSense, Ad Manager vb.) harici script, iframe ve medya
// yükler; bu yüzden https kaynaklarına izin verilir.
uygulama.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", 'https:'],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      fontSrc: ["'self'", 'https:', 'data:'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
      mediaSrc: ["'self'", 'blob:', 'data:', 'https:'],
      frameSrc: ["'self'", 'https:'],
      connectSrc: ["'self'", 'https:'],
      upgradeInsecureRequests: process.env.SESSION_SECURE === 'true' ? [] : null
    },
  },
  crossOriginEmbedderPolicy: false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

uygulama.use(compression());

// Kanonik alan adı (www -> çıplak alan adı) ve URL normalizasyonu: büyük harf
// ve sonda eğik çizgi eksikliği 301 ile düzeltilir; böylece her içerik tek
// bir URL'de toplanır.
uygulama.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (process.env.KANONIK_ALAN_ZORLA === 'true' && req.hostname && req.hostname !== site.host.replace(/:\d+$/, '')) {
    return res.redirect(301, site.url + req.originalUrl);
  }
  const yol = req.path;
  if (yol.startsWith('/indir') || yol.startsWith('/admin')) return next();
  const sorgu = req.originalUrl.slice(req.path.length);
  if (yol !== yol.toLowerCase() && !/\.[a-z0-9]+$/i.test(yol)) {
    return res.redirect(301, yol.toLowerCase() + sorgu);
  }
  if (yol !== '/' && !yol.endsWith('/') && !/\.[a-z0-9]+$/i.test(yol)) {
    return res.redirect(301, yol + '/' + sorgu);
  }
  next();
});

uygulama.use(cookieParser());
// Reklam kodları uzun olabileceği için bu uç noktada sınır daha yüksektir.
uygulama.use('/admin/reklamlar', express.json({ limit: '200kb' }));
uygulama.use(express.json({ limit: '10kb' }));
uygulama.use(express.urlencoded({ extended: false, limit: '10kb' }));
uygulama.use(express.static(path.join(__dirname, '..', 'genel'), {
  maxAge: process.env.NODE_ENV === 'production' ? '30d' : 0,
  setHeaders: (res, dosyaYolu) => {
    if (/\.(svg|png|ico|webmanifest)$/.test(dosyaYolu)) res.setHeader('Cache-Control', 'public, max-age=604800');
  }
}));

uygulama.use(session({
  secret: process.env.OTURUM_SIRRI || crypto.randomBytes(32).toString('hex'),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: 'strict',
    // Local development uses HTTP even when NODE_ENV=production. Enable this
    // only when the deployed site is actually served over HTTPS.
    secure: process.env.SESSION_SECURE === 'true'
  }
}));

const genelLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  // Admin dashboard widgets poll several endpoints periodically. They are
  // already protected by the admin session and have their own login limit.
  skip: req => Boolean(req.session?.adminGiris)
});
const indirmeLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  skip: req => req.path === '/toplu'
    || req.path === '/analiz'
    || req.path === '/gorsel'
    || req.path === '/onizleme'
    || req.path.startsWith('/onizleme/')
    || req.path.startsWith('/dosya/')
});
const topluIndirmeLimit = rateLimit({ windowMs: 15 * 60 * 1000, max: 2 });
const adminLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  // Keep login attempts rate-limited, but do not throttle an authenticated
  // admin's health/statistics polling requests.
  skip: req => Boolean(req.session?.adminGiris)
});

uygulama.use(genelLimit);
uygulama.use('/indir/toplu', topluIndirmeLimit);
uygulama.use('/indir', indirmeLimit);
uygulama.use('/admin', adminLimit);

uygulama.use((req, res, next) => {
  req.ipHash = crypto.createHash('sha256').update(req.ip || '').digest('hex').slice(0, 16);
  const sayfaIstegi = req.method === 'GET' && !req.path.startsWith('/indir') && !req.path.startsWith('/admin') && !/\.[a-z0-9]+$/i.test(req.path);
  if (sayfaIstegi) {
    try { db.calistir('INSERT INTO ziyaretciler (ip_hash) VALUES (?)', [req.ipHash]); } catch {}
  }
  next();
});

uygulama.use(gorunumYardimcilari.yereller);

(async () => {
  try {
    await db.baglan();

  const anaSayfa = require('./rotalar/ana');
  const indirme = require('./rotalar/indirme');
  const admin = require('./rotalar/admin');
  const temizlik = require('./servisler/temizlik');

  uygulama.use('/', anaSayfa);
  uygulama.use('/indir', indirme);
  uygulama.use('/admin', admin);

  const { yonlendirmeBul } = require('./veri/yonlendirmeler');
  const seo = require('./servisler/seo');

  uygulama.use((req, res) => {
    // Eski WordPress URL'leri en yakın yeni sayfaya kalıcı olarak taşınır.
    if (req.method === 'GET' || req.method === 'HEAD') {
      const hedef = yonlendirmeBul(req.path);
      if (hedef && hedef !== req.path) return res.redirect(301, hedef);
    }
    res.status(404).render('404', {
      seo: seo.meta({ baslik: 'Sayfa Bulunamadı (404) | MP3.NET.TR', aciklama: 'Aradığınız sayfa bulunamadı.', yol: req.path, robots: 'noindex, follow' })
    });
  });

  uygulama.use((err, req, res, next) => {
    try { db.calistir('INSERT INTO hatalar (mesaj, yol) VALUES (?, ?)', [(err.message || '').slice(0, 500), req.path || '/']); } catch {}
    res.status(500).render('hata', {
      seo: seo.meta({ baslik: 'Bir hata oluştu | MP3.NET.TR', aciklama: 'Beklenmedik bir sorun oluştu.', yol: '/', robots: 'noindex, nofollow' })
    });
  });

  cron.schedule('*/30 * * * *', () => temizlik.geciciDosyalariTemizle());

  const sunucu = uygulama.listen(PORT, () => {
    console.log('');
    console.log('  ================================================');
    console.log('   MP3.NET.TR - Calisiyor');
    console.log('   Adres : http://localhost:' + PORT);
    console.log('   Admin : http://localhost:' + PORT + '/admin/giris');
    console.log('  ================================================');
    console.log('');
  });

  // Playlist indirmeleri birden fazla video nedeniyle uzun sürebilir.
  // Node'un varsayılan 5 dakikalık HTTP isteği zaman aşımı bağlantıyı kapatmasın.
  sunucu.requestTimeout = 0;
  sunucu.timeout = 0;

  sunucu.on('error', hata => {
    if (hata.code === 'EADDRINUSE') {
      console.error(`[BASLATMA HATASI] ${PORT} portu zaten kullaniliyor. Mevcut sunucuyu kapatip tekrar deneyin.`);
    } else {
      kritikHataKaydet('sunucu-dinleme', hata);
    }
    process.exit(1);
  });
  } catch (hata) {
    kritikHataKaydet('uygulama-baslatma', hata);
  }
})();
