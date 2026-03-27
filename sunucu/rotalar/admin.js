'use strict';
const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../../veritabani/veritabani');

const yonlendirici = express.Router();

function adminKorumasi(req, res, next) {
  if (req.session && req.session.adminGiris) return next();
  res.redirect('/admin/giris');
}

yonlendirici.get('/giris', (req, res) => {
  if (req.session.adminGiris) return res.redirect('/admin/panel');
  res.render('admin-giris', { baslik: 'Admin Girisi', hata: null });
});

yonlendirici.post('/giris', (req, res) => {
  const { kullanici, sifre } = req.body;
  if (!kullanici || !sifre) return res.render('admin-giris', { baslik: 'Admin Girisi', hata: 'Bilgileri eksiksiz girin.' });
  const yonetici = db.tek('SELECT * FROM yoneticiler WHERE kullanici_adi = ?', [kullanici]);
  if (!yonetici || !bcrypt.compareSync(sifre, yonetici.sifre_hash)) {
    return res.render('admin-giris', { baslik: 'Admin Girisi', hata: 'Kullanici adi veya sifre hatali.' });
  }
  req.session.adminGiris = true;
  req.session.adminAdi = yonetici.kullanici_adi;
  res.redirect('/admin/panel');
});

yonlendirici.get('/cikis', (req, res) => {
  req.session.destroy(() => res.redirect('/admin/giris'));
});

yonlendirici.get('/panel', adminKorumasi, (req, res) => {
  const toplamIndirme = db.tek("SELECT COUNT(*) as sayi FROM islemler WHERE durum='tamamlandi'") || { sayi: 0 };
  const toplamZiyaretci = db.tek("SELECT COUNT(DISTINCT ip_hash) as sayi FROM ziyaretciler") || { sayi: 0 };
  const platformIstatistik = db.sorgu("SELECT platform, COUNT(*) as sayi FROM islemler WHERE durum='tamamlandi' GROUP BY platform ORDER BY sayi DESC");
  const formatIstatistik = db.sorgu("SELECT format, COUNT(*) as sayi FROM islemler WHERE durum='tamamlandi' GROUP BY format ORDER BY sayi DESC");
  const sonIslemler = db.sorgu("SELECT * FROM islemler ORDER BY olusturma_zamani DESC LIMIT 20");
  const hatalar = db.sorgu("SELECT * FROM hatalar ORDER BY zaman DESC LIMIT 20");

  res.render('admin-panel', {
    baslik: 'Admin Paneli',
    adminAdi: req.session.adminAdi,
    toplamIndirme: toplamIndirme.sayi,
    toplamZiyaretci: toplamZiyaretci.sayi,
    platformIstatistik,
    formatIstatistik,
    sonIslemler,
    hatalar
  });
});

yonlendirici.post('/sifre-degistir', adminKorumasi, (req, res) => {
  const { mevcutSifre, yeniSifre, yeniSifreTekrar } = req.body;
  const yonetici = db.tek('SELECT * FROM yoneticiler WHERE kullanici_adi = ?', [req.session.adminAdi]);
  if (!bcrypt.compareSync(mevcutSifre, yonetici.sifre_hash))
    return res.json({ basari: false, mesaj: 'Mevcut sifre hatali.' });
  if (yeniSifre !== yeniSifreTekrar || yeniSifre.length < 8)
    return res.json({ basari: false, mesaj: 'Sifreler eslesmiyor veya cok kisa.' });
  db.calistir('UPDATE yoneticiler SET sifre_hash = ? WHERE kullanici_adi = ?', [bcrypt.hashSync(yeniSifre, 12), req.session.adminAdi]);
  res.json({ basari: true, mesaj: 'Sifre guncellendi.' });
});

module.exports = yonlendirici;
