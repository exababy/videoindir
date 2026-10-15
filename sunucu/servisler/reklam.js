'use strict';
const ayarlar = require('./ayarlar');

// Reklam alanları. Kod alanlarına yönetici panelinden AdSense, Ad Manager vb.
// HTML/JS kodu yapıştırılır. Boş bırakılan alan, yer tutucu kapalıysa hiç
// görüntülenmez.
const ALANLAR = {
  reklam_head: { ad: '<head> içi kod (Auto ads, doğrulama vb.)', boyut: '' },
  reklam_ust: { ad: 'Üst banner (araç altı)', boyut: '728×90 · mobil 320×100' },
  reklam_icerik: { ad: 'İçerik arası', boyut: '336×280 · duyarlı' },
  reklam_alt: { ad: 'Alt banner (footer üstü)', boyut: '728×90 · mobil 320×100' },
  reklam_sonuc: { ad: 'Sonuç alanı (format listesi altı)', boyut: '468×60 · mobil 320×50' },
  reklam_mobil_sabit: { ad: 'Mobil sabit alt şerit', boyut: '320×50' },
  reklam_gecis_html: { ad: 'İndirme öncesi zorunlu reklam (HTML)', boyut: '300×250 · video' }
};

const VARSAYILANLAR = {
  reklam_gecis_video: '',
  reklam_gecis_link: '',
  reklam_gecis_sure: '5',
  reklam_yer_tutucu: '1',
  ads_txt: ''
};

function tumunuAl() {
  const sonuc = {};
  Object.keys(ALANLAR).forEach(anahtar => { sonuc[anahtar] = ayarlar.al(anahtar) || ''; });
  Object.keys(VARSAYILANLAR).forEach(anahtar => {
    const deger = ayarlar.al(anahtar);
    sonuc[anahtar] = deger === undefined || deger === null ? VARSAYILANLAR[anahtar] : deger;
  });
  const sure = Number(sonuc.reklam_gecis_sure);
  sonuc.reklam_gecis_sure = Number.isFinite(sure) ? Math.min(30, Math.max(5, Math.round(sure))) : 5;
  sonuc.reklam_yer_tutucu = sonuc.reklam_yer_tutucu === '1';
  return sonuc;
}

function guvenliVideoUrl(deger) {
  const metin = String(deger || '').trim();
  if (!metin) return '';
  if (metin.startsWith('/')) return metin.slice(0, 500);
  try {
    const url = new URL(metin);
    return url.protocol === 'https:' ? url.toString().slice(0, 500) : '';
  } catch { return ''; }
}

function kaydet(gelen) {
  Object.keys(ALANLAR).forEach(anahtar => {
    if (typeof gelen[anahtar] === 'string') ayarlar.guncelle(anahtar, gelen[anahtar].slice(0, 20000));
  });
  if (gelen.reklam_gecis_video !== undefined) ayarlar.guncelle('reklam_gecis_video', guvenliVideoUrl(gelen.reklam_gecis_video));
  if (gelen.reklam_gecis_link !== undefined) ayarlar.guncelle('reklam_gecis_link', guvenliVideoUrl(gelen.reklam_gecis_link));
  if (gelen.reklam_gecis_sure !== undefined) {
    const sure = Math.min(30, Math.max(5, Math.round(Number(gelen.reklam_gecis_sure) || 5)));
    ayarlar.guncelle('reklam_gecis_sure', sure);
  }
  if (gelen.reklam_yer_tutucu !== undefined) {
    const acik = gelen.reklam_yer_tutucu === true || gelen.reklam_yer_tutucu === '1' || gelen.reklam_yer_tutucu === 'true';
    ayarlar.guncelle('reklam_yer_tutucu', acik ? '1' : '0');
  }
  if (typeof gelen.ads_txt === 'string') ayarlar.guncelle('ads_txt', gelen.ads_txt.slice(0, 20000));
  return tumunuAl();
}

module.exports = { ALANLAR, tumunuAl, kaydet };
