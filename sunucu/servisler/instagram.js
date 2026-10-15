'use strict';

// Instagram profil fotoğrafı. Instagram'ın web istemcisinin kullandığı herkese
// açık uç noktası kullanılır; profil fotoğrafı gizli hesaplarda da herkese
// açıktır. Instagram sunucu IP'lerini sık sık sınırladığı için sonuçlar kısa
// süre önbelleğe alınır ve hata durumunda anlaşılır bir mesaj döner.

const ONBELLEK_SURESI = 10 * 60 * 1000;
const onbellek = new Map();

const GORSEL_ALANLARI = ['cdninstagram.com', 'fbcdn.net'];

function kullaniciAdiAyikla(girdi) {
  let metin = String(girdi || '').trim();
  if (!metin) return null;
  try {
    if (/instagram\.com|instagr\.am/i.test(metin)) {
      const url = new URL(/^https?:\/\//i.test(metin) ? metin : 'https://' + metin);
      metin = url.pathname.split('/').filter(Boolean)[0] || '';
    }
  } catch { return null; }
  metin = metin.replace(/^@/, '').toLowerCase();
  if (!/^[a-z0-9._]{1,30}$/.test(metin)) return null;
  if (['p', 'reel', 'reels', 'stories', 'explore', 'tv'].includes(metin)) return null;
  return metin;
}

function gorselUrlGecerli(url) {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return GORSEL_ALANLARI.some(alan => host === alan || host.endsWith('.' + alan));
  } catch { return false; }
}

async function zamanAsimliFetch(url, secenekler = {}) {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), 12000);
  try {
    return await fetch(url, { ...secenekler, signal: kontrol.signal, redirect: 'follow' });
  } finally {
    clearTimeout(zamanlayici);
  }
}

// Yedek yöntem: profil sayfasındaki og:image etiketi (daha düşük çözünürlük).
async function ogGorselAl(kullaniciAdi) {
  const yanit = await zamanAsimliFetch(`https://www.instagram.com/${encodeURIComponent(kullaniciAdi)}/`, {
    headers: { 'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'Accept-Language': 'tr-TR,tr;q=0.9' }
  });
  if (!yanit.ok) return null;
  const html = await yanit.text();
  const eslesme = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
  if (!eslesme) return null;
  const foto = eslesme[1].replace(/&amp;/g, '&');
  if (!gorselUrlGecerli(foto)) return null;
  const baslik = (html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i) || [])[1] || '';
  return {
    kullaniciAdi,
    adSoyad: baslik.replace(/&#064;|&quot;|&amp;/g, ' ').split('(')[0].trim().slice(0, 100),
    gizli: null,
    dogrulanmis: false,
    takipci: 0,
    gonderi: 0,
    foto,
    dusukCozunurluk: true
  };
}

async function profilAl(kullaniciAdi) {
  const kayit = onbellek.get(kullaniciAdi);
  if (kayit && Date.now() - kayit.zaman < ONBELLEK_SURESI) return kayit.veri;

  const basliklar = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
    'X-IG-App-ID': '936619743392459',
    Accept: 'application/json',
    'Accept-Language': 'tr-TR,tr;q=0.9'
  };
  // Veri merkezi IP'lerinde Instagram oturum ister; INSTAGRAM_SESSIONID
  // tanımlıysa istek oturum çereziyle yapılır.
  if (process.env.INSTAGRAM_SESSIONID) basliklar.Cookie = `sessionid=${process.env.INSTAGRAM_SESSIONID}`;

  let yanit;
  try {
    yanit = await zamanAsimliFetch(`https://www.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(kullaniciAdi)}`, { headers: basliklar });
  } catch {
    yanit = null;
  }

  if (!yanit || (!yanit.ok && yanit.status !== 404)) {
    const yedek = await ogGorselAl(kullaniciAdi).catch(() => null);
    if (yedek) {
      onbellek.set(kullaniciAdi, { zaman: Date.now(), veri: yedek });
      return yedek;
    }
  }
  if (!yanit) throw Object.assign(new Error('Instagram yanıt vermedi'), { kod: 'hata' });

  if (yanit.status === 404) {
    const hata = new Error('Kullanıcı bulunamadı');
    hata.kod = 'bulunamadi';
    throw hata;
  }
  if (!yanit.ok) {
    const hata = new Error(`Instagram yanıtı ${yanit.status}`);
    hata.kod = [400, 401, 429].includes(yanit.status) ? 'sinir' : 'hata';
    throw hata;
  }

  const govde = await yanit.json();
  const kullanici = govde?.data?.user;
  if (!kullanici) {
    const hata = new Error('Kullanıcı bulunamadı');
    hata.kod = 'bulunamadi';
    throw hata;
  }

  const foto = kullanici.profile_pic_url_hd || kullanici.profile_pic_url;
  if (!gorselUrlGecerli(foto)) throw new Error('Profil fotoğrafı bulunamadı');

  const veri = {
    kullaniciAdi: String(kullanici.username || kullaniciAdi),
    adSoyad: String(kullanici.full_name || '').slice(0, 100),
    gizli: Boolean(kullanici.is_private),
    dogrulanmis: Boolean(kullanici.is_verified),
    takipci: Number(kullanici.edge_followed_by?.count || 0),
    gonderi: Number(kullanici.edge_owner_to_timeline_media?.count || 0),
    foto
  };
  onbellek.set(kullaniciAdi, { zaman: Date.now(), veri });
  if (onbellek.size > 500) onbellek.delete(onbellek.keys().next().value);
  return veri;
}

module.exports = { kullaniciAdiAyikla, profilAl, gorselUrlGecerli };
