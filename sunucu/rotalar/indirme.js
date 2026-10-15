'use strict';
const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuid } = require('uuid');
const db = require('../../veritabani/veritabani');
const { urlDogrula, platformTespit } = require('../servisler/platform');
const { ytdlpHataMesaji, medyaBilgisiAl, youtubeAra, indir, kirp, aktifIndirmeEkle, aktifIndirmeGuncelle, aktifIndirmeKaldir } = require('../servisler/indirici');
const ayarlar = require('../servisler/ayarlar');
const instagram = require('../servisler/instagram');

const yonlendirici = express.Router();

function aktifIndirmeyiSonlandir(islemId, durum, mesaj) {
  aktifIndirmeGuncelle(islemId, { durum, mesaj: mesaj || '', bitis: Date.now() });
  setTimeout(() => aktifIndirmeKaldir(islemId), 15000);
}

// yt-dlp'nin gerçek hata çıktısı yönetici panelindeki hata kaydına yazılır,
// kullanıcıya anlaşılır bir mesaj döner.
function ytdlpHatasiKaydet(hata, yol) {
  const detay = String(hata?.detay || hata?.message || '').slice(-500);
  console.error(`[YT-DLP] ${yol}: ${detay}`);
  try { db.calistir('INSERT INTO hatalar (mesaj, yol) VALUES (?, ?)', [detay || 'yt-dlp hatasi', yol]); } catch {}
}

function indirmeHatasiMesaji(hata) {
  ytdlpHatasiKaydet(hata, 'indirme');
  const detay = String(hata?.detay || hata?.message || '');
  if (/10013|EACCES|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|Failed to establish|network/i.test(detay)) {
    return 'Kaynak sunucuya bağlanılamadı. Lütfen tekrar deneyin.';
  }
  return ytdlpHataMesaji(hata, 'İndirme başarısız oldu. Lütfen tekrar deneyin.');
}

function kullanimOlayiKaydet(req, olay) {
  try { db.calistir('INSERT INTO kullanim_olaylari (olay, ip_hash) VALUES (?, ?)', [olay, req.ipHash || '']); } catch {}
}

yonlendirici.post('/ara', (req, res) => {
  const sorgu = typeof req.body.sorgu === 'string' ? req.body.sorgu.trim() : '';
  if (!sorgu || sorgu.length > 120) {
    return res.status(400).json({ basari: false, mesaj: 'Lutfen 1-120 karakter arasinda bir arama yazin.' });
  }

  kullanimOlayiKaydet(req, 'arama');

  youtubeAra(sorgu, (hata, sonuclar) => {
    if (hata) {
      ytdlpHatasiKaydet(hata, 'arama');
      return res.status(422).json({ basari: false, mesaj: ytdlpHataMesaji(hata, 'YouTube araması yapılamadı. Lütfen tekrar deneyin.') });
    }
    res.json({ basari: true, sonuclar });
  });
});

yonlendirici.post('/analiz', (req, res) => {
  const { url } = req.body;
  if (!url || !urlDogrula(url)) {
    return res.status(400).json({ basari: false, mesaj: 'Gecersiz veya desteklenmeyen baglanti.' });
  }
  medyaBilgisiAl(url, (hata, veri) => {
    if (hata) {
      ytdlpHatasiKaydet(hata, 'analiz');
      return res.status(422).json({ basari: false, mesaj: ytdlpHataMesaji(hata, 'Video bilgisi alınamadı. Bağlantının herkese açık bir içeriğe ait olduğundan emin olun.') });
    }
    res.json({ basari: true, veri });
  });
});

yonlendirici.post('/onizleme', (req, res) => {
  const { url, baslik } = req.body;
  if (!url || !urlDogrula(url)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz baglanti.' });

  indir(url, 'mp4', '360p', (hata, sonuc) => {
    if (hata) return res.status(502).json({ basari: false, mesaj: indirmeHatasiMesaji(hata) });
    res.json({ basari: true, onizlemeId: sonuc.id, sure: 0 });
  }, baslik);
});

yonlendirici.get('/onizleme/:id', (req, res) => {
  const { id } = req.params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return res.status(400).send('Gecersiz istek');
  const geciciKlasor = path.resolve(__dirname, '..', '..', 'gecici');
  const dosyaYolu = path.resolve(geciciKlasor, `${id}.mp4`);
  if (!dosyaYolu.startsWith(geciciKlasor)) return res.status(403).send('Erisim reddedildi');
  if (!fs.existsSync(dosyaYolu)) return res.status(404).send('Onizleme bulunamadi');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Content-Type', 'video/mp4');
  res.sendFile(dosyaYolu);
});

yonlendirici.post('/kirp', (req, res) => {
  const { url, baslangic, bitis, kalite, baslik } = req.body;
  const baslangicSayisi = Number(baslangic);
  const bitisSayisi = Number(bitis);
  if (!url || !urlDogrula(url)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz baglanti.' });
  if (!Number.isFinite(baslangicSayisi) || !Number.isFinite(bitisSayisi) || baslangicSayisi < 0 || bitisSayisi <= baslangicSayisi || bitisSayisi - baslangicSayisi > 1800) {
    return res.status(400).json({ basari: false, mesaj: 'Gecersiz video araligi. En fazla 30 dakikalik bir klip secin.' });
  }
  kullanimOlayiKaydet(req, 'analiz');

  const islemId = uuid();
  const platform = platformTespit(url);
  try {
    db.calistir('INSERT INTO islemler (id, platform, format, kalite, durum, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [islemId, platform?.platform || 'bilinmiyor', 'mp4', kalite || '', 'isleniyor', req.ipHash || '']);
  } catch {}

  aktifIndirmeEkle({ id: islemId, baslik: baslik || url, format: 'mp4', kalite: kalite || '', platform: platform?.platform || 'bilinmiyor', tur: 'kirpma' });

  kirp(url, baslangicSayisi, bitisSayisi, kalite, (hata, sonuc) => {
    if (hata) {
      try { db.calistir("UPDATE islemler SET durum='hata' WHERE id=?", [islemId]); } catch {}
      const mesaj = indirmeHatasiMesaji(hata);
      aktifIndirmeyiSonlandir(islemId, 'hata', mesaj);
      return res.status(502).json({ basari: false, mesaj });
    }
    try { db.calistir("UPDATE islemler SET durum='tamamlandi', dosya_adi=? WHERE id=?", [sonuc.dosyaAdi, islemId]); } catch {}
    aktifIndirmeyiSonlandir(islemId, 'tamamlandi');
    res.json({ basari: true, indirmeId: sonuc.id, format: 'mp4', dosyaAdi: sonuc.dosyaAdi });
  }, baslik);
});

yonlendirici.post('/baslat', (req, res) => {
  const { url, format, kalite, baslik } = req.body;
  if (!url || !urlDogrula(url)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz baglanti.' });
  const izinliFormatlar = ['mp4', 'mp3', 'wav'];
  if (!izinliFormatlar.includes(format)) return res.status(400).json({ basari: false, mesaj: 'Gecersiz format.' });

  const islemId = uuid();
  const platform = platformTespit(url);
  try {
    db.calistir('INSERT INTO islemler (id, platform, format, kalite, durum, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [islemId, platform?.platform || 'bilinmiyor', format, kalite || '', 'isleniyor', req.ipHash || '']);
  } catch {}

  aktifIndirmeEkle({ id: islemId, baslik: baslik || url, format, kalite: kalite || '', platform: platform?.platform || 'bilinmiyor', tur: 'indirme' });

  indir(url, format, kalite, (hata, sonuc) => {
    if (hata) {
      try { db.calistir("UPDATE islemler SET durum='hata' WHERE id=?", [islemId]); } catch {}
      const mesaj = indirmeHatasiMesaji(hata);
      aktifIndirmeyiSonlandir(islemId, 'hata', mesaj);
      return res.status(502).json({ basari: false, mesaj });
    }
    try { db.calistir("UPDATE islemler SET durum='tamamlandi', dosya_adi=? WHERE id=?", [sonuc.dosyaAdi, islemId]); } catch {}
    aktifIndirmeyiSonlandir(islemId, 'tamamlandi');
    res.json({ basari: true, indirmeId: sonuc.id, format: sonuc.format, dosyaAdi: sonuc.dosyaAdi });
  }, baslik);
});

yonlendirici.post('/toplu', async (req, res) => {
  res.setTimeout(0);
  const { videolar, format, kalite } = req.body;
  const izinliFormatlar = ['mp4', 'mp3', 'wav'];
  const videoListesi = Array.isArray(videolar)
    ? [...new Map(videolar
      .map(video => typeof video === 'string' ? { url: video, baslik: '' } : { url: video?.url, baslik: video?.baslik || '' })
      .filter(video => video.url)
      .map(video => [video.url, video])).values()]
    : [];
  const urls = videoListesi.map(video => video.url);

  const maksTopluVideo = ayarlar.tumunuAl().maksTopluVideo;
  if (!urls.length || urls.length > maksTopluVideo) {
    return res.status(400).json({ basari: false, mesaj: `1 ile ${maksTopluVideo} arasinda video secin.` });
  }
  if (!izinliFormatlar.includes(format)) {
    return res.status(400).json({ basari: false, mesaj: 'Gecersiz format.' });
  }
  if (urls.some(url => !urlDogrula(url))) {
    return res.status(400).json({ basari: false, mesaj: 'Secilen videolardan biri desteklenmiyor.' });
  }

  const sonuclar = [];
  for (const video of videoListesi) {
    const { url, baslik } = video;
    const islemId = uuid();
    const platform = platformTespit(url);
    try {
      db.calistir('INSERT INTO islemler (id, platform, format, kalite, durum, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [islemId, platform?.platform || 'bilinmiyor', format, kalite || '', 'isleniyor', req.ipHash || '']);
    } catch {}

    aktifIndirmeEkle({ id: islemId, baslik: baslik || url, format, kalite: kalite || '', platform: platform?.platform || 'bilinmiyor', tur: 'toplu' });

    const sonuc = await new Promise(resolve => indir(url, format, kalite, (hata, veri) => resolve({ hata, veri }), baslik));
    if (sonuc.hata) {
      try { db.calistir("UPDATE islemler SET durum='hata' WHERE id=?", [islemId]); } catch {}
      const mesaj = indirmeHatasiMesaji(sonuc.hata);
      aktifIndirmeyiSonlandir(islemId, 'hata', mesaj);
      sonuclar.push({ basari: false, url, mesaj });
      continue;
    }

    try { db.calistir("UPDATE islemler SET durum='tamamlandi', dosya_adi=? WHERE id=?", [sonuc.veri.dosyaAdi, islemId]); } catch {}
    aktifIndirmeyiSonlandir(islemId, 'tamamlandi');
    sonuclar.push({
      basari: true,
      url,
      indirmeId: sonuc.veri.id,
      format: sonuc.veri.format,
      dosyaAdi: sonuc.veri.dosyaAdi
    });
  }

  res.json({
    basari: sonuclar.some(sonuc => sonuc.basari),
    sonuclar,
    tamamlanan: sonuclar.filter(sonuc => sonuc.basari).length,
    basarisiz: sonuclar.filter(sonuc => !sonuc.basari).length
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
  if (!fs.existsSync(dosyaYolu)) {
    return res.status(404).json({ basari: false, mesaj: 'Dosyanin suresi dolmus veya dosya bulunamadi.' });
  }
  const mimeMap = { mp4: 'video/mp4', mp3: 'audio/mpeg', wav: 'audio/wav' };
  const istenenAd = typeof req.query.ad === 'string' ? req.query.ad : '';
  const dosyaAdi = istenenAd
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '')
    .slice(0, 150) || 'mp3.net.tr';
  const tamDosyaAdi = `${dosyaAdi}.${format}`;
  const asciiDosyaAdi = dosyaAdi
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '_') || 'mp3.net.tr';
  const asciiTamDosyaAdi = `${asciiDosyaAdi}.${format}`;
  res.setHeader('Content-Disposition', `attachment; filename="${asciiTamDosyaAdi}"; filename*=UTF-8''${encodeURIComponent(tamDosyaAdi)}`);
  res.setHeader('Content-Type', mimeMap[format]);
  res.sendFile(dosyaYolu);
});

yonlendirici.post('/profil', async (req, res) => {
  const kullaniciAdi = instagram.kullaniciAdiAyikla(req.body?.kullanici);
  if (!kullaniciAdi) {
    return res.status(400).json({ basari: false, mesaj: 'Geçerli bir Instagram kullanıcı adı veya profil bağlantısı girin.' });
  }
  kullanimOlayiKaydet(req, 'analiz');
  try {
    const veri = await instagram.profilAl(kullaniciAdi);
    const gorsel = `/indir/gorsel?u=${encodeURIComponent(veri.foto)}`;
    try {
      db.calistir('INSERT INTO islemler (id, platform, format, kalite, durum, ip_hash) VALUES (?, ?, ?, ?, ?, ?)',
        [uuid(), 'instagram_profil', 'jpg', '', 'tamamlandi', req.ipHash || '']);
    } catch {}
    res.json({
      basari: true,
      veri: {
        kullaniciAdi: veri.kullaniciAdi,
        adSoyad: veri.adSoyad,
        gizli: veri.gizli,
        dogrulanmis: veri.dogrulanmis,
        takipci: veri.takipci,
        gonderi: veri.gonderi,
        dusukCozunurluk: Boolean(veri.dusukCozunurluk),
        gorsel,
        indir: `${gorsel}&indir=1&ad=${encodeURIComponent(veri.kullaniciAdi + '-profil-fotografi')}`
      }
    });
  } catch (hata) {
    try { db.calistir('INSERT INTO hatalar (mesaj, yol) VALUES (?, ?)', [String(hata.message || '').slice(0, 500), 'instagram-profil']); } catch {}
    if (hata.kod === 'bulunamadi') return res.status(404).json({ basari: false, mesaj: 'Bu kullanıcı adıyla bir Instagram hesabı bulunamadı.' });
    if (hata.kod === 'sinir') return res.status(503).json({ basari: false, mesaj: 'Instagram şu anda çok fazla istek alıyor. Lütfen birkaç dakika sonra tekrar deneyin.' });
    res.status(502).json({ basari: false, mesaj: 'Profil bilgisi alınamadı. Lütfen tekrar deneyin.' });
  }
});

// Instagram CDN görselleri başka sitelerde doğrudan gösterilemediği için
// yalnızca izinli CDN alan adlarından vekil (proxy) olarak sunulur.
yonlendirici.get('/gorsel', async (req, res) => {
  const url = typeof req.query.u === 'string' ? req.query.u : '';
  if (!instagram.gorselUrlGecerli(url)) return res.status(400).send('Gecersiz gorsel');
  try {
    const kontrol = new AbortController();
    const zamanlayici = setTimeout(() => kontrol.abort(), 15000);
    const yanit = await fetch(url, { signal: kontrol.signal, headers: { 'User-Agent': 'Mozilla/5.0' } }).finally(() => clearTimeout(zamanlayici));
    const tip = String(yanit.headers.get('content-type') || '');
    if (!yanit.ok || !tip.startsWith('image/')) return res.status(502).send('Gorsel alinamadi');
    const veri = Buffer.from(await yanit.arrayBuffer());
    if (veri.length > 10 * 1024 * 1024) return res.status(413).send('Gorsel cok buyuk');
    res.setHeader('Content-Type', tip);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    if (req.query.indir === '1') {
      const ad = String(req.query.ad || 'instagram-profil-fotografi').replace(/[^a-z0-9._-]/gi, '_').slice(0, 80) || 'instagram';
      const uzanti = tip.includes('png') ? 'png' : (tip.includes('webp') ? 'webp' : 'jpg');
      res.setHeader('Content-Disposition', `attachment; filename="${ad}.${uzanti}"`);
    }
    res.send(veri);
  } catch {
    res.status(502).send('Gorsel alinamadi');
  }
});

module.exports = yonlendirici;
