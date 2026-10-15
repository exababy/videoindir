'use strict';
const site = require('../veri/site');
const sayfalar = require('../veri/sayfalar');

const SON_GUNCELLEME = process.env.SON_GUNCELLEME || new Date().toISOString().slice(0, 10);

function mutlak(yol) {
  if (/^https?:\/\//.test(yol)) return yol;
  return site.url + (yol.startsWith('/') ? yol : '/' + yol);
}

function organizasyon() {
  return {
    '@type': 'Organization',
    '@id': site.url + '/#organizasyon',
    name: site.ad,
    url: site.url + '/',
    logo: { '@type': 'ImageObject', url: mutlak('/img/logo-512.png'), width: 512, height: 512 }
  };
}

function webSitesi() {
  return {
    '@type': 'WebSite',
    '@id': site.url + '/#website',
    url: site.url + '/',
    name: site.ad,
    alternateName: ['mp3.net.tr', 'MP3 NET TR'],
    description: site.aciklama,
    inLanguage: 'tr-TR',
    publisher: { '@id': site.url + '/#organizasyon' }
  };
}

function uygulama(ad, aciklama, yol) {
  return {
    '@type': 'WebApplication',
    '@id': mutlak(yol) + '#uygulama',
    name: ad,
    url: mutlak(yol),
    description: aciklama,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Windows, macOS, Linux, Android, iOS',
    browserRequirements: 'HTML5 destekli modern bir tarayıcı',
    inLanguage: 'tr-TR',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'TRY' },
    publisher: { '@id': site.url + '/#organizasyon' }
  };
}

function sssSemasi(sss) {
  if (!sss || !sss.length) return null;
  return {
    '@type': 'FAQPage',
    mainEntity: sss.map(m => ({
      '@type': 'Question',
      name: m.s,
      acceptedAnswer: { '@type': 'Answer', text: m.c }
    }))
  };
}

function nasilSemasi(ad, adimlar, yol) {
  if (!adimlar || !adimlar.length) return null;
  return {
    '@type': 'HowTo',
    name: ad,
    totalTime: 'PT1M',
    estimatedCost: { '@type': 'MonetaryAmount', currency: 'TRY', value: '0' },
    step: adimlar.map((metin, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: `${i + 1}. adım`,
      text: metin,
      url: mutlak(yol) + '#nasil'
    }))
  };
}

function ekmekKirintisi(liste) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: liste.map((oge, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: oge.ad,
      item: mutlak(oge.yol)
    }))
  };
}

function grafik(dugumler) {
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': dugumler.filter(Boolean) })
    .replace(/</g, '\\u003c');
}

// Görünüm katmanına verilecek ortak SEO nesnesi.
function meta({ baslik, aciklama, yol, tur = 'website', gorsel, robots, jsonld }) {
  const kanonik = mutlak(yol);
  return {
    baslik,
    aciklama,
    kanonik,
    tur,
    gorsel: mutlak(gorsel || '/img/og.png'),
    robots: robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    jsonld: jsonld || null,
    guncelleme: SON_GUNCELLEME
  };
}

function sitemap() {
  const satirlar = [{ yol: '/', oncelik: '1.0', siklik: 'daily' }];
  satirlar.push({ yol: '/araclar/', oncelik: '0.8', siklik: 'weekly' });
  sayfalar.tumSayfalar.forEach(s => {
    const hub = site.gruplar.some(g => g.hub === s.slug);
    satirlar.push({ yol: `/${s.slug}/`, oncelik: hub ? '0.9' : '0.8', siklik: 'weekly' });
  });
  site.yasalSayfalar.forEach(s => satirlar.push({ yol: `/${s.slug}/`, oncelik: '0.3', siklik: 'yearly' }));

  const govde = satirlar.map(s => `  <url>\n    <loc>${mutlak(s.yol)}</loc>\n    <lastmod>${SON_GUNCELLEME}</lastmod>\n    <changefreq>${s.siklik}</changefreq>\n    <priority>${s.oncelik}</priority>\n  </url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${govde}\n</urlset>\n`;
}

module.exports = {
  mutlak, meta, grafik, organizasyon, webSitesi, uygulama, sssSemasi, nasilSemasi, ekmekKirintisi, sitemap, SON_GUNCELLEME
};
