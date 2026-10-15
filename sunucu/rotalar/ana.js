'use strict';
const express = require('express');
const site = require('../veri/site');
const sayfalar = require('../veri/sayfalar');
const anaIcerik = require('../veri/ana');
const yasal = require('../veri/yasal');
const seo = require('../servisler/seo');
const reklam = require('../servisler/reklam');

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
  if (!sayfa) return next();

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
