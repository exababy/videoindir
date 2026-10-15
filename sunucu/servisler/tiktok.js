'use strict';
const fs = require('fs');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');

// TikTok yedek kaynağı. TikTok, bulut sunucu IP'lerinden gelen sayfa
// isteklerini sıklıkla engellediği için yt-dlp başarısız olduğunda tikwm.com
// herkese açık API'si kullanılır (filigransız video bağlantısı döndürür).
// TIKTOK_YEDEK=0 ile kapatılabilir.

const API = 'https://www.tikwm.com/api/';
const ONBELLEK_SURESI = 10 * 60 * 1000;
const MAKS_BOYUT = 500 * 1024 * 1024;
const onbellek = new Map();
let sonIstek = 0;
let kuyruk = Promise.resolve();

function etkin() {
  return process.env.TIKTOK_YEDEK !== '0';
}

async function zamanAsimliFetch(url, secenekler = {}, sure = 20000) {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), sure);
  try {
    return await fetch(url, { ...secenekler, signal: kontrol.signal, redirect: 'follow' });
  } finally {
    clearTimeout(zamanlayici);
  }
}

// API ücretsiz kullanımda saniyede ~1 istek kabul eder; istekler sıraya alınır.
function siraliCalistir(is) {
  const sonuc = kuyruk.then(async () => {
    const bekle = Math.max(0, sonIstek + 1100 - Date.now());
    if (bekle) await new Promise(r => setTimeout(r, bekle));
    sonIstek = Date.now();
    return is();
  });
  kuyruk = sonuc.catch(() => {});
  return sonuc;
}

async function bilgiAl(url) {
  const kayit = onbellek.get(url);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_SURESI) return kayit.veri;

  const govde = await siraliCalistir(async () => {
    const yanit = await zamanAsimliFetch(`${API}?url=${encodeURIComponent(url)}&hd=1`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; mp3.net.tr)', Accept: 'application/json' }
    });
    if (!yanit.ok) throw Object.assign(new Error(`tikwm yanıtı ${yanit.status}`), { detay: `TikTok yedek API HTTP ${yanit.status}` });
    return yanit.json();
  });

  if (!govde || govde.code !== 0 || !govde.data) {
    throw Object.assign(new Error('TikTok bilgisi alınamadı'), { detay: `TikTok yedek API: ${String(govde?.msg || 'bilinmeyen hata').slice(0, 200)}` });
  }
  const d = govde.data;
  if (Array.isArray(d.images) && d.images.length && !d.play) {
    throw Object.assign(new Error('Fotoğraf slaytı'), { detay: 'TikTok fotoğraf slaytı: video unavailable' });
  }
  const videoUrl = d.hdplay || d.play;
  if (!videoUrl) throw Object.assign(new Error('Video bağlantısı yok'), { detay: 'TikTok yedek API: video bulunamadı' });

  const veri = {
    id: String(d.id || ''),
    baslik: String(d.title || (d.author && d.author.nickname) || 'TikTok videosu').slice(0, 100),
    sure: Number(d.duration || 0),
    kapak: d.origin_cover || d.cover || '',
    videoUrl,
    hd: Boolean(d.hdplay)
  };
  onbellek.set(url, { zaman: Date.now(), veri });
  if (onbellek.size > 300) onbellek.delete(onbellek.keys().next().value);
  return veri;
}

// medyaBilgisiAl() ile aynı biçimde sonuç üretir.
async function medyaBilgisi(url, platform) {
  const v = await bilgiAl(url);
  return {
    baslik: v.baslik,
    sure: v.sure,
    kucukResim: v.kapak,
    platform,
    formatlar: [
      { tur: 'video', format: 'mp4', kalite: v.hd ? 'HD' : 'Orijinal', yukseklik: 0 },
      { tur: 'ses', format: 'mp3', kalite: 'En Iyi', yukseklik: 0 }
    ]
  };
}

async function videoIndir(url, hedef) {
  const v = await bilgiAl(url);
  const yanit = await zamanAsimliFetch(v.videoUrl, { headers: { 'User-Agent': 'Mozilla/5.0', Referer: 'https://www.tiktok.com/' } }, 120000);
  if (!yanit.ok || !yanit.body) throw Object.assign(new Error('TikTok videosu indirilemedi'), { detay: `TikTok CDN HTTP ${yanit.status}` });
  const boyut = Number(yanit.headers.get('content-length') || 0);
  if (boyut > MAKS_BOYUT) throw Object.assign(new Error('Dosya çok büyük'), { detay: 'TikTok dosyası boyut sınırını aşıyor' });
  await pipeline(Readable.fromWeb(yanit.body), fs.createWriteStream(hedef));
  return v;
}

module.exports = { etkin, bilgiAl, medyaBilgisi, videoIndir };
