'use strict';
const db = require('../../veritabani/veritabani');

const VARSAYILANLAR = {
  maks_toplu_video: '20',
  gecici_dosya_suresi: '3600000',
  varsayilan_kalite: '720p',
  bakim_modu: '0'
};

function al(anahtar) {
  try { return db.tek('SELECT deger FROM ayarlar WHERE anahtar = ?', [anahtar])?.deger ?? VARSAYILANLAR[anahtar]; } catch { return VARSAYILANLAR[anahtar]; }
}

function sayi(anahtar, varsayilan) {
  const deger = Number(al(anahtar));
  return Number.isFinite(deger) ? deger : varsayilan;
}

function guncelle(anahtar, deger) {
  db.calistir('INSERT OR REPLACE INTO ayarlar (anahtar, deger) VALUES (?, ?)', [anahtar, String(deger)]);
}

function tumunuAl() {
  return {
    maksTopluVideo: Math.min(50, Math.max(1, sayi('maks_toplu_video', 20))),
    geciciDosyaSuresi: Math.min(86400000, Math.max(300000, sayi('gecici_dosya_suresi', 3600000))),
    varsayilanKalite: ['360p', '480p', '720p', '1080p'].includes(al('varsayilan_kalite')) ? al('varsayilan_kalite') : '720p',
    bakimModu: al('bakim_modu') === '1'
  };
}

module.exports = { al, sayi, guncelle, tumunuAl };
