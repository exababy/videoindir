'use strict';
const site = require('../site');

// Her grup dosyası bir sayfa dizisi döndürür. Eksik dosyalar sessizce atlanır
// ki içerik eklenirken sunucu çökmesin.
const DOSYALAR = ['instagram', 'youtube', 'tiktok', 'sosyal', 'genel', 'diger'];

function yukle(dosya) {
  try {
    const veri = require('./' + dosya);
    return Array.isArray(veri) ? veri : [];
  } catch (hata) {
    if (hata.code !== 'MODULE_NOT_FOUND') console.error(`[SAYFA VERISI] ${dosya}: ${hata.message}`);
    return [];
  }
}

const tumSayfalar = [];
const slugHaritasi = new Map();

DOSYALAR.forEach(dosya => {
  yukle(dosya).forEach(sayfa => {
    if (!sayfa || !sayfa.slug || slugHaritasi.has(sayfa.slug)) return;
    const temiz = {
      ...sayfa,
      platform: sayfa.platform || 'genel',
      ikincil: Array.isArray(sayfa.ikincil) ? sayfa.ikincil : [],
      adimlar: Array.isArray(sayfa.adimlar) ? sayfa.adimlar : [],
      icerik: Array.isArray(sayfa.icerik) ? sayfa.icerik : [],
      sss: Array.isArray(sayfa.sss) ? sayfa.sss : [],
      arac: { mod: 'indir', format: null, placeholder: '', ...(sayfa.arac || {}) }
    };
    tumSayfalar.push(temiz);
    slugHaritasi.set(temiz.slug, temiz);
  });
});

const ANA_GRUPLAR = new Set(site.gruplar.map(g => g.anahtar));

function grupAnahtari(sayfa) {
  return ANA_GRUPLAR.has(sayfa.platform) ? sayfa.platform : 'diger';
}

// Menü / footer için gruplanmış liste.
function gruplar() {
  const liste = site.gruplar.map(g => ({ ...g, sayfalar: tumSayfalar.filter(s => s.platform === g.anahtar) }));
  const diger = tumSayfalar.filter(s => grupAnahtari(s) === 'diger');
  if (diger.length) liste.push({ anahtar: 'diger', ad: 'Diğer Platformlar', hub: null, sayfalar: diger });
  return liste.filter(g => g.sayfalar.length);
}

// Aynı platformdan kardeş sayfalar + diğer platformların hub sayfaları.
function ilgili(sayfa, adet = 8) {
  const kardesler = tumSayfalar.filter(s => s.slug !== sayfa.slug && s.platform === sayfa.platform);
  const hublar = site.gruplar
    .map(g => slugHaritasi.get(g.hub))
    .filter(s => s && s.slug !== sayfa.slug && s.platform !== sayfa.platform);
  return [...kardesler, ...hublar].slice(0, adet);
}

function bul(slug) {
  return slugHaritasi.get(slug) || null;
}

module.exports = { tumSayfalar, bul, gruplar, ilgili, grupAnahtari };
