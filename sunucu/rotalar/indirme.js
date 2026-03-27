'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const db = require('../../veritabani/veritabani');
const { urlDogrula, platformTespit } = require('../servisler/platform');
const { medyaBilgisiAl, indir } = require('../servisler/indirici');

const yonlendirici = express.Router();

yonlendirici.post('/analiz', (req, res) => {
  const { url } = req.body;
  if (!url || !urlDogrula(url)) {
    return res.status(400).json({ basari: false, mesaj: 'Gecersiz veya desteklenmeyen baglanti.' });
  }
  medyaBilgisiAl(url, (hata, veri) => {
    if (hata) return res.status(422).json({ basari: false, mesaj: 'Medya bilgisi alinamadi. Baglantıyı kontrol edin.' });
    res.json({ basari: true, veri });
  });
});

yonlendirici.post('/baslat', (req, res) => {
  const { url, format, kalite } = req.body;
  if (!url || !urlDogrula(url)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz baglanti.' });
  const izinliFormatlar = ['mp4', 'mp3', 'wav'];
  if (!izinliFormatlar.includes(format)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz format.' });

  const islemId = uuid();
  const platform = platformTespit(url);
  try {
    db.calistir('INSERT INTO islemler (id, platform, format, kalite, durum, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [islemId, platform?.platform || 'bilinmiyor', format, kalite || '', 'isleniyor', req.ipHash || '']);
  } catch {}

  indir(url, format, kalite, (hata, sonuc) => {
    if (hata) {
      try { db.calistir("UPDATE islemler SET durum='hata' WHERE id=?", [islemId]); } catch {}
      return res.status(500).json({ basari: false, mesaj: 'Indirme basarisiz oldu.' });
    }
    try { db.calistir("UPDATE islemler SET durum='tamamlandi', dosya_adi=? WHERE id=?", [sonuc.id, islemId]); } catch {}
    res.json({ basari: true, indirmeId: sonuc.id, format: sonuc.format });
  });
});

yonlendirici.get('/dosya/:id/:format', (req, res) => {
  const { id, format } = req.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).send('Gecersiz istek');
  const izinliFormatlar = ['mp4', 'mp3', 'wav'];
  if (!izinliFormatlar.includes(format)) return res.status(400).send('Gecersiz format');
  const geciciKlasor = path.resolve(__dirname, '..', '..', 'gecici');
  const dosyaYolu = path.resolve(geciciKlasor, `${id}.${format}`);
  if (!dosyaYolu.startsWith(geciciKlasor)) return res.status(403).send('Erisim reddedildi');
  if (!fs.existsSync(dosyaYolu)) return res.status(404).render('404', { baslik: 'Dosya Bulunamadi' });
  const mimeMap = { mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };
  res.setHeader('Content-Disposition', `attachment; filename="rabels.${format}"`);
  res.setHeader('Content-Type', mimeMap[format]);
  res.sendFile(dosyaYolu);
});

module.exports = yonlendirici;
