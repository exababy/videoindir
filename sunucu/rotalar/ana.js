'use strict';
const express = require('express');
const site = require('../veri/site');
const sayfalar = require('../veri/sayfalar');
const anaIcerik = require('../veri/ana');
const yasal = require('../veri/yasal');
const seo = require('../servisler/seo');
const reklam = require('../servisler/reklam');
const muzik = require('../servisler/muzik');
const muzikIcerik = require('../servisler/muzikIcerik');

// Şarkı sayfaları kök dizinde yer aldığı için statik sayfa slug'ları
// şarkı slug'larına verilmez.
muzik.rezerveEt([...sayfalar.tumSayfalar.map(s => s.slug), ...Object.keys(yasal), 'araclar', 'top-25-sarkilar', 'sarkilar', 'sanatci', 'admin', 'indir']);

const yonlendirici = express.Router();

// Ana sayfadaki "popüler araçlar" ızgarası.
const POPULER = [
  'youtube-mp3-indir', 'youtube-mp4-indir', 'instagram-mp3-mp4-indir', 'instagram-story-indir',
  'instagram-profil-fotografi-indir', 'instagram-mp3-indir', 'tiktok-filigransiz-indir', 'tiktok-mp3-indir',
  'twitter-mp3-mp4-indir', 'facebook-mp3-mp4-indir', 'youtube-shorts-indir', 'instagram-reels-indir'
];

yonlendirici.get('/', (req, res) => {
  const yol = '/';
  res.render('ana', {
    sayfa: anaIcerik,
    populer: POPULER.map(slug => sayfalar.bul(slug)).filter(Boolean),
    topListe: muzik.liste(),
    tarihYaz: muzikIcerik.tarihYaz,
    seo: seo.meta({
      baslik: anaIcerik.baslik,
      aciklama: anaIcerik.aciklama,
      yol,
      jsonld: seo.grafik([
        seo.organizasyon(),
        seo.webSitesi(),
        seo.uygulama(site.ad + ' – MP3 ve Video İndirici', anaIcerik.aciklama, yol),
        seo.nasilSemasi('MP3 ve video nasıl indirilir?', anaIcerik.adimlar, yol),
        seo.sssSemasi(anaIcerik.sss)
      ])
    })
  });
});

yonlendirici.get('/araclar/', (req, res) => {
  const yol = '/araclar/';
  const baslik = 'Tüm İndirme Araçları – Instagram, YouTube, TikTok | MP3.NET.TR';
  const aciklama = 'Instagram story, reels, profil fotoğrafı; YouTube MP3, MP4, Shorts; TikTok filigransız ve 25+ platform için ücretsiz indirme araçlarının tam listesi.';
  res.render('araclar', {
    seo: seo.meta({
      baslik,
      aciklama,
      yol,
      jsonld: seo.grafik([
        seo.organizasyon(),
        seo.ekmekKirintisi([{ ad: 'Ana Sayfa', yol: '/' }, { ad: 'Tüm Araçlar', yol }]),
        {
          '@type': 'ItemList',
          name: 'İndirme araçları',
          itemListElement: sayfalar.tumSayfalar.map((s, i) => ({ '@type': 'ListItem', position: i + 1, name: s.menuAdi, url: seo.mutlak(`/${s.slug}/`) }))
        }
      ])
    })
  });
});

yonlendirici.get('/robots.txt', (req, res) => {
  res.type('text/plain').send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin/',
    'Disallow: /indir/',
    '',
    `Sitemap: ${site.url}/sitemap.xml`,
    ''
  ].join('\n'));
});

yonlendirici.get('/sitemap.xml', (req, res) => {
  res.type('application/xml').set('Cache-Control', 'public, max-age=3600').send(seo.sitemap());
});

yonlendirici.get('/ads.txt', (req, res) => {
  const icerik = reklam.tumunuAl().ads_txt;
  if (!icerik.trim()) return res.status(404).type('text/plain').send('');
  res.type('text/plain').send(icerik.trim() + '\n');
});

yonlendirici.get('/manifest.webmanifest', (req, res) => {
  res.type('application/manifest+json').send(JSON.stringify({
    name: site.ad + ' – ' + site.slogan,
    short_name: site.ad,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: site.temaRengi,
    lang: 'tr',
    icons: [
      { src: '/img/logo-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/img/logo-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' }
    ]
  }));
});

yonlendirici.get('/top-25-sarkilar/', (req, res) => {
  const yol = '/top-25-sarkilar/';
  const liste = muzik.liste();
  const tarih = liste.tarih ? muzikIcerik.tarihYaz(liste.tarih) : '';
  res.set('Cache-Control', 'public, max-age=900');
  res.render('muzik-liste', {
    liste,
    tarihYaz: muzikIcerik.tarihYaz,
    seo: seo.meta({
      baslik: 'Top 25 Şarkı – Bugün En Çok Dinlenen Şarkılar MP3 İndir',
      aciklama: `YouTube Türkiye günlük Top 25 şarkı listesi${tarih ? ` (${tarih})` : ''}. En çok dinlenen ve yeni çıkan şarkıları ücretsiz MP3 olarak indirin; liste her gün güncellenir.`,
      yol,
      jsonld: seo.grafik([
        seo.organizasyon(),
        seo.ekmekKirintisi([{ ad: 'Ana Sayfa', yol: '/' }, { ad: 'Top 25 Şarkı', yol }]),
        {
          '@type': 'ItemList',
          name: 'Bugünün Top 25 Şarkısı',
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          numberOfItems: liste.sarkilar.length,
          itemListElement: liste.sarkilar.map(x => ({ '@type': 'ListItem', position: x.sira, name: `${x.sanatci} - ${x.sarki}`, url: seo.mutlak(`/${x.slug}/`) }))
        }
      ])
    })
  });
});

yonlendirici.get('/sarkilar/', (req, res) => {
  const sayfa = Math.max(1, Math.floor(Number(req.query.sayfa)) || 1);
  const veri = muzik.tumSarkilar({ sayfa });
  if (sayfa > veri.sayfaSayisi) return res.redirect(301, '/sarkilar/');
  const yol = sayfa > 1 ? `/sarkilar/?sayfa=${sayfa}` : '/sarkilar/';
  const kirinti = [{ ad: 'Ana Sayfa', yol: '/' }, { ad: 'Top 25 Şarkı', yol: '/top-25-sarkilar/' }, { ad: 'Şarkı Arşivi', yol }];
  res.render('muzik-arsiv', {
    kirinti,
    h1: 'Şarkı arşivi – MP3 indir',
    ozet: `YouTube Türkiye günlük listesine girmiş ${veri.toplam} şarkı. En yeniden eskiye sıralı; hepsini ücretsiz MP3 olarak indirebilirsiniz.`,
    sarkilar: veri.sarkilar,
    sayfalama: { sayfa, sayfaSayisi: veri.sayfaSayisi },
    seo: seo.meta({
      baslik: `Şarkı Arşivi – Popüler Şarkılar MP3 İndir${sayfa > 1 ? ` (Sayfa ${sayfa})` : ''} | MP3.NET.TR`,
      aciklama: 'YouTube Türkiye listelerine girmiş tüm popüler şarkılar tek sayfada. Sevdiğiniz şarkıyı bulun ve ücretsiz MP3 olarak indirin.',
      yol,
      jsonld: seo.grafik([seo.organizasyon(), seo.ekmekKirintisi(kirinti)])
    })
  });
});

yonlendirici.get('/sanatci/:slug/', (req, res, next) => {
  const veri = muzik.sanatci(req.params.slug);
  if (!veri) return next();
  const yol = `/sanatci/${veri.slug}/`;
  const kirinti = [{ ad: 'Ana Sayfa', yol: '/' }, { ad: 'Top 25 Şarkı', yol: '/top-25-sarkilar/' }, { ad: veri.ad, yol }];
  res.render('muzik-arsiv', {
    kirinti,
    h1: `${veri.ad} şarkıları MP3 indir`,
    ozet: `${veri.ad} imzalı, YouTube Türkiye listesine girmiş ${veri.sarkilar.length} şarkı. Hepsini ücretsiz MP3 veya MP4 olarak indirin.`,
    sarkilar: veri.sarkilar,
    seo: seo.meta({
      baslik: `${veri.ad} Şarkıları MP3 İndir | MP3.NET.TR`,
      aciklama: `${veri.ad} şarkıları MP3 indir: ${veri.sarkilar.slice(0, 3).map(x => x.sarki).join(', ')} ve listeye giren diğer şarkıları ücretsiz indirin.`.slice(0, 165),
      yol,
      jsonld: seo.grafik([
        seo.organizasyon(),
        seo.ekmekKirintisi(kirinti),
        { '@type': 'MusicGroup', name: veri.ad, url: seo.mutlak(yol), track: veri.sarkilar.map(x => ({ '@type': 'MusicRecording', name: x.sarki, url: seo.mutlak(`/${x.slug}/`) })) }
      ])
    })
  });
});

// IndexNow anahtar doğrulama dosyası.
yonlendirici.get('/:anahtar.txt', (req, res, next) => {
  const anahtar = process.env.INDEXNOW_KEY;
  if (!anahtar || req.params.anahtar !== anahtar) return next();
  res.type('text/plain').send(anahtar);
});

yonlendirici.get('/:slug/', (req, res, next) => {
  const { slug } = req.params;

  if (yasal[slug]) {
    const icerik = yasal[slug];
    const yol = `/${slug}/`;
    return res.render('yasal', {
      icerik,
      seo: seo.meta({
        baslik: icerik.baslik,
        aciklama: icerik.aciklama,
        yol,
        jsonld: seo.grafik([seo.organizasyon(), seo.ekmekKirintisi([{ ad: 'Ana Sayfa', yol: '/' }, { ad: icerik.h1, yol }])])
      })
    });
  }

  const sayfa = sayfalar.bul(slug);
  if (!sayfa) {
    const parca = muzik.bul(slug);
    if (!parca) return next();
    const liste = muzik.liste();
    const digerleri = muzik.sanatciSarkilari(parca.sanatci_slug, parca.video_id);
    const icerik = muzikIcerik.olustur(parca, { gecmis: muzik.gecmis(parca.video_id), digerleri, sonListeTarihi: liste.tarih });
    res.set('Cache-Control', 'public, max-age=900');
    return res.render('muzik-sarki', { s: icerik, seo: icerik.seo, liste, digerleri });
  }

  const yol = `/${slug}/`;
  const grup = site.gruplar.find(g => g.anahtar === sayfa.platform);
  const kirinti = [{ ad: 'Ana Sayfa', yol: '/' }];
  if (grup && grup.hub !== slug && sayfalar.bul(grup.hub)) kirinti.push({ ad: sayfalar.bul(grup.hub).menuAdi, yol: `/${grup.hub}/` });
  kirinti.push({ ad: sayfa.menuAdi, yol });

  res.render('sayfa', {
    sayfa,
    kirinti,
    ilgili: sayfalar.ilgili(sayfa),
    seo: seo.meta({
      baslik: sayfa.baslik,
      aciklama: sayfa.aciklama,
      yol,
      jsonld: seo.grafik([
        seo.organizasyon(),
        seo.uygulama(sayfa.h1, sayfa.aciklama, yol),
        seo.ekmekKirintisi(kirinti),
        seo.nasilSemasi(`${sayfa.h1} nasıl yapılır?`, sayfa.adimlar, yol),
        seo.sssSemasi(sayfa.sss)
      ])
    })
  });
});

module.exports = yonlendirici;
