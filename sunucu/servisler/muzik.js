'use strict';
const db = require('../../veritabani/veritabani');

// YouTube Müzik Listeleri (charts.youtube.com) – Türkiye günlük en popüler
// müzik videoları. Liste her gün güncellenir; ilk N şarkı için kalıcı
// "Sanatçı - Şarkı MP3 İndir" sayfaları oluşturulur.

const BOLGE = String(process.env.MUZIK_BOLGE || 'tr').toLowerCase();
const ADET = Math.min(100, Math.max(5, Number(process.env.MUZIK_LISTE_ADET) || 25));
const REZERVE_SLUGLAR = new Set();

const durum = { sonDeneme: null, sonBasari: null, sonHata: null, calisiyor: false };

/* ---------- Metin yardımcıları ---------- */

const TR_HARF = { 'ç': 'c', 'Ç': 'c', 'ğ': 'g', 'Ğ': 'g', 'ı': 'i', 'I': 'i', 'İ': 'i', 'ö': 'o', 'Ö': 'o', 'ş': 's', 'Ş': 's', 'ü': 'u', 'Ü': 'u', 'â': 'a', 'Â': 'a', 'î': 'i', 'û': 'u' };

function slugla(metin) {
  return String(metin || '')
    .replace(/[çÇğĞıIİöÖşŞüÜâÂîû]/g, h => TR_HARF[h] || h)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' ve ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
}

function karsilastirmaAnahtari(metin) {
  return slugla(metin).replace(/-/g, '');
}

const GURULTU = [
  /\((?:official|resmi|offical)[^)]*\)/gi,
  /\[(?:official|resmi|offical)[^\]]*\]/gi,
  /\((?:music video|video clip|klip|lyric video|lyrics?|audio|visualizer|şarkı sözleri|sözleri|4k|hd|hq)[^)]*\)/gi,
  /\[(?:music video|video clip|klip|lyric video|lyrics?|audio|visualizer|şarkı sözleri|sözleri|4k|hd|hq)[^\]]*\]/gi,
  /\s+[|｜].*$/g,
  /\s+#\S+/g
];

function basligiTemizle(baslik) {
  let metin = String(baslik || '');
  GURULTU.forEach(desen => { metin = metin.replace(desen, ' '); });
  return metin.replace(/\s{2,}/g, ' ').replace(/[\s\-–—:]+$/g, '').trim();
}

function sanatciMetni(sanatcilar) {
  const adlar = sanatcilar.filter(Boolean);
  if (adlar.length <= 1) return adlar[0] || '';
  if (adlar.length === 2) return `${adlar[0]} & ${adlar[1]}`;
  return `${adlar.slice(0, -1).join(', ')} & ${adlar[adlar.length - 1]}`;
}

// Plak şirketi / yapım kanalı adları bazen sanatçı alanında gelir.
const SIRKET = /\b(m[uü]zik|music|records|recordings|yap[iı]m|production|productions|plak|entertainment|official)\b/i;

// "Eypio - Şahidim" gibi başlıklarda sanatçı başlığa da yazılmış olabilir.
function sarkiAyikla(hamBaslik, sanatcilar, kanal) {
  let baslik = basligiTemizle(hamBaslik);
  // Sanatçı alanında yalnızca bir şirket adı varsa gerçek sanatçı başlıktadır.
  if (sanatcilar.length === 1 && SIRKET.test(sanatcilar[0]) && /\s[-–—]\s/.test(baslik)) sanatcilar = [];
  const ayrac = baslik.match(/\s[-–—]\s/);
  if (ayrac) {
    const sol = baslik.slice(0, ayrac.index).trim();
    const sag = baslik.slice(ayrac.index + ayrac[0].length).trim();
    const solAnahtar = karsilastirmaAnahtari(sol);
    const adaylar = [...sanatcilar, kanal].filter(Boolean).map(karsilastirmaAnahtari);
    const eslesir = adaylar.some(a => a && (solAnahtar === a || solAnahtar.includes(a) || a.includes(solAnahtar)));
    if (eslesir && sag) {
      baslik = sag;
      if (!sanatcilar.length) sanatcilar = [sol];
    } else if (!sanatcilar.length && sag) {
      sanatcilar = [sol];
      baslik = sag;
    }
  }
  // "ft. X" / "feat. X" sanatçı alanında gösterildiği için şarkı adından çıkarılır.
  if (sanatcilar.length > 1) baslik = baslik.replace(/\s*[([]?\s*\b(?:ft|feat|featuring)\b\.?\s.*$/i, '').trim();
  return { sarki: baslik || hamBaslik, sanatcilar };
}

/* ---------- Veri kaynağı ---------- */

async function grafikGetir() {
  const kontrol = new AbortController();
  const zamanlayici = setTimeout(() => kontrol.abort(), 30000);
  try {
    const yanit = await fetch('https://charts.youtube.com/youtubei/v1/browse?alt=json', {
      method: 'POST',
      signal: kontrol.signal,
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://charts.youtube.com',
        Referer: `https://charts.youtube.com/charts/TopVideos/${BOLGE}/daily`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB_MUSIC_ANALYTICS', clientVersion: '2.0', hl: 'tr', gl: BOLGE.toUpperCase(), theme: 'MUSIC' }, capabilities: {}, request: { internalExperimentFlags: [] } },
        browseId: 'FEmusic_analytics_charts_home',
        query: `perspective=CHART_DETAILS&chart_params_country_code=${BOLGE}&chart_params_chart_type=VIDEOS&chart_params_period_type=DAILY`
      })
    });
    if (!yanit.ok) throw new Error(`YouTube Charts yanıtı ${yanit.status}`);
    const veri = await yanit.json();
    const bolum = veri?.contents?.sectionListRenderer?.contents?.[0]?.musicAnalyticsSectionRenderer?.content;
    const videolar = bolum?.videos?.[0]?.videoViews;
    if (!Array.isArray(videolar) || !videolar.length) throw new Error('Liste verisi bulunamadı');
    const tarih = JSON.stringify(bolum).match(/"endDate":"(\d{4}-\d{2}-\d{2})"/)?.[1] || new Date().toISOString().slice(0, 10);
    return { tarih, videolar };
  } finally {
    clearTimeout(zamanlayici);
  }
}

function tarihMetni(t) {
  if (!t || !t.year) return null;
  return `${t.year}-${String(t.month || 1).padStart(2, '0')}-${String(t.day || 1).padStart(2, '0')}`;
}

function kayitHazirla(v) {
  const sanatcilarHam = (v.artists || []).map(a => String(a.name || '').trim()).filter(Boolean);
  const { sarki, sanatcilar } = sarkiAyikla(v.title, sanatcilarHam, v.channelName);
  const sanatci = sanatciMetni(sanatcilar) || String(v.channelName || '').replace(/\s*-\s*Topic$/i, '').trim() || 'Bilinmeyen Sanatçı';
  const meta = v.chartEntryMetadata || {};
  return {
    video_id: String(v.id),
    sarki: sarki.slice(0, 150),
    sanatci: sanatci.slice(0, 150),
    sanatci_slug: slugla(sanatcilar[0] || sanatci) || 'sanatci',
    ham_baslik: String(v.title || '').slice(0, 200),
    kanal: String(v.channelName || '').slice(0, 150),
    sure: Number(v.videoDuration || 0),
    yayin_tarihi: tarihMetni(v.releaseDate),
    soz_yazarlari: (v.songwriters || []).slice(0, 8).join(', ').slice(0, 300),
    produktorler: (v.songProducers || []).slice(0, 8).join(', ').slice(0, 300),
    goruntulenme: Number(v.viewCount || 0),
    sira: Number(meta.currentPosition || 0),
    onceki_sira: meta.previousPosition ? Number(meta.previousPosition) : null,
    listede_gun: Number(meta.periodsOnChart || 1)
  };
}

function benzersizSlug(temel, videoId) {
  let slug = temel;
  let n = 2;
  for (;;) {
    const mevcut = db.tek('SELECT video_id FROM muzik_parcalari WHERE slug = ?', [slug]);
    if ((!mevcut || mevcut.video_id === videoId) && !REZERVE_SLUGLAR.has(slug)) return slug;
    slug = `${temel.replace(/-mp3-indir$/, '')}-${n}-mp3-indir`;
    n += 1;
  }
}

async function guncelle({ zorla = false } = {}) {
  if (durum.calisiyor) return { basari: false, mesaj: 'Güncelleme zaten çalışıyor.' };
  durum.calisiyor = true;
  durum.sonDeneme = new Date().toISOString();
  try {
    const { tarih, videolar } = await grafikGetir();
    const mevcutListe = db.tek('SELECT COUNT(*) AS sayi FROM muzik_listesi WHERE tarih = ?', [tarih]);
    if (!zorla && Number(mevcutListe?.sayi) > 0) {
      durum.sonBasari = new Date().toISOString();
      durum.sonHata = null;
      return { basari: true, tarih, yeni: 0, mesaj: `${tarih} listesi zaten kayıtlı.` };
    }

    const kayitlar = videolar.slice(0, ADET).filter(v => v && v.id && v.isAvailable !== false).map(kayitHazirla);
    const islemler = [['DELETE FROM muzik_listesi WHERE tarih = ?', [tarih]]];
    const yeniSluglar = [];
    const islenen = new Set();
    const buListedekiSluglar = new Map();

    kayitlar.forEach(k => {
      // Aynı şarkının farklı videosu (klip / söz videosu) tek sayfada toplanır.
      const temelSlug = `${slugla(`${k.sanatci} ${k.sarki}`)}-mp3-indir`;
      const ayniSarki = buListedekiSluglar.get(temelSlug) || db.tek('SELECT video_id FROM muzik_parcalari WHERE slug = ?', [temelSlug])?.video_id;
      if (ayniSarki && ayniSarki !== k.video_id) k.video_id = ayniSarki;
      buListedekiSluglar.set(temelSlug, k.video_id);

      if (islenen.has(k.video_id)) {
        islemler.push(['INSERT OR REPLACE INTO muzik_listesi (tarih, sira, video_id, goruntulenme) VALUES (?, ?, ?, ?)', [tarih, k.sira, k.video_id, k.goruntulenme]]);
        return;
      }
      islenen.add(k.video_id);
      const mevcut = db.tek('SELECT slug, en_iyi_sira, ilk_tarih FROM muzik_parcalari WHERE video_id = ?', [k.video_id]);
      if (mevcut) {
        islemler.push([
          `UPDATE muzik_parcalari SET goruntulenme = ?, listede_gun = ?, son_sira = ?, onceki_sira = ?, son_tarih = ?,
             en_iyi_sira = MIN(COALESCE(en_iyi_sira, 999), ?), yayin_tarihi = COALESCE(yayin_tarihi, ?),
             soz_yazarlari = CASE WHEN soz_yazarlari = '' OR soz_yazarlari IS NULL THEN ? ELSE soz_yazarlari END,
             produktorler = CASE WHEN produktorler = '' OR produktorler IS NULL THEN ? ELSE produktorler END
           WHERE video_id = ?`,
          [k.goruntulenme, k.listede_gun, k.sira, k.onceki_sira, tarih, k.sira, k.yayin_tarihi, k.soz_yazarlari, k.produktorler, k.video_id]
        ]);
      } else {
        const slug = benzersizSlug(temelSlug, k.video_id);
        REZERVE_SLUGLAR.add(slug);
        yeniSluglar.push(slug);
        islemler.push([
          `INSERT INTO muzik_parcalari (video_id, slug, sarki, sanatci, sanatci_slug, ham_baslik, kanal, sure, yayin_tarihi,
             soz_yazarlari, produktorler, goruntulenme, listede_gun, en_iyi_sira, son_sira, onceki_sira, ilk_tarih, son_tarih)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [k.video_id, slug, k.sarki, k.sanatci, k.sanatci_slug, k.ham_baslik, k.kanal, k.sure, k.yayin_tarihi,
            k.soz_yazarlari, k.produktorler, k.goruntulenme, k.listede_gun, k.sira, k.sira, k.onceki_sira, tarih, tarih]
        ]);
      }
      islemler.push(['INSERT OR REPLACE INTO muzik_listesi (tarih, sira, video_id, goruntulenme) VALUES (?, ?, ?, ?)', [tarih, k.sira, k.video_id, k.goruntulenme]]);
    });

    db.calistirToplu(islemler);
    yeniSluglar.forEach(s => REZERVE_SLUGLAR.delete(s));
    durum.sonBasari = new Date().toISOString();
    durum.sonHata = null;
    indexNowBildir(yeniSluglar.map(s => `/${s}/`).concat(['/top-25-sarkilar/'])).catch(() => {});
    return { basari: true, tarih, yeni: yeniSluglar.length, mesaj: `${tarih} listesi kaydedildi (${kayitlar.length} şarkı, ${yeniSluglar.length} yeni sayfa).` };
  } catch (hata) {
    durum.sonHata = String(hata.message || hata).slice(0, 300);
    try { db.calistir('INSERT INTO hatalar (mesaj, yol) VALUES (?, ?)', [`Müzik listesi: ${durum.sonHata}`, 'muzik-listesi']); } catch {}
    return { basari: false, mesaj: durum.sonHata };
  } finally {
    durum.calisiyor = false;
  }
}

/* ---------- IndexNow (Bing, Yandex vb. hızlı dizinleme) ---------- */

async function indexNowBildir(yollar) {
  const anahtar = process.env.INDEXNOW_KEY;
  if (!anahtar || !yollar.length) return;
  const site = require('../veri/site');
  await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: site.host, key: anahtar, keyLocation: `${site.url}/${anahtar}.txt`, urlList: yollar.map(y => site.url + y) })
  });
}

/* ---------- Sorgular ---------- */

const ALANLAR = 'video_id, slug, sarki, sanatci, sanatci_slug, kanal, sure, yayin_tarihi, soz_yazarlari, produktorler, goruntulenme, listede_gun, en_iyi_sira, son_sira, onceki_sira, ilk_tarih, son_tarih';

function sonTarih() {
  return db.tek('SELECT MAX(tarih) AS tarih FROM muzik_listesi')?.tarih || null;
}

function oncekiTarih(tarih) {
  return db.tek('SELECT MAX(tarih) AS tarih FROM muzik_listesi WHERE tarih < ?', [tarih])?.tarih || null;
}

// Belirli bir günün listesi; dünkü sırayla birlikte.
function liste(tarih) {
  const gun = tarih || sonTarih();
  if (!gun) return { tarih: null, sarkilar: [] };
  const dun = oncekiTarih(gun);
  const sarkilar = db.sorgu(
    `SELECT l.sira, l.goruntulenme AS gunluk_goruntulenme, ${ALANLAR.split(', ').map(a => 'p.' + a).join(', ')},
       (SELECT d.sira FROM muzik_listesi d WHERE d.tarih = ? AND d.video_id = l.video_id) AS dun_sira
     FROM muzik_listesi l JOIN muzik_parcalari p ON p.video_id = l.video_id
     WHERE l.tarih = ? ORDER BY l.sira ASC`, [dun || '', gun]);
  return { tarih: gun, dun, sarkilar };
}

function bul(slug) {
  return db.tek(`SELECT ${ALANLAR} FROM muzik_parcalari WHERE slug = ?`, [slug]);
}

function gecmis(videoId, limit = 14) {
  return db.sorgu('SELECT tarih, sira FROM muzik_listesi WHERE video_id = ? ORDER BY tarih DESC LIMIT ?', [videoId, limit]).reverse();
}

function sanatciSarkilari(sanatciSlug, haric) {
  return db.sorgu(`SELECT ${ALANLAR} FROM muzik_parcalari WHERE sanatci_slug = ? AND video_id != ? ORDER BY en_iyi_sira ASC, son_tarih DESC LIMIT 30`, [sanatciSlug, haric || '']);
}

function sanatci(sanatciSlug) {
  const sarkilar = db.sorgu(`SELECT ${ALANLAR} FROM muzik_parcalari WHERE sanatci_slug = ? ORDER BY en_iyi_sira ASC, son_tarih DESC`, [sanatciSlug]);
  if (!sarkilar.length) return null;
  // Görünen ad: sanatçının tek başına geçtiği kayıt varsa onu kullan.
  const tekil = sarkilar.find(s => !/[&,]/.test(s.sanatci));
  return { slug: sanatciSlug, ad: (tekil || sarkilar[0]).sanatci.split(/\s*[&,]\s*/)[0], sarkilar };
}

function tumSarkilar({ sayfa = 1, adet = 120 } = {}) {
  const toplam = Number(db.tek('SELECT COUNT(*) AS sayi FROM muzik_parcalari')?.sayi || 0);
  const sarkilar = db.sorgu(`SELECT ${ALANLAR} FROM muzik_parcalari ORDER BY son_tarih DESC, en_iyi_sira ASC LIMIT ? OFFSET ?`, [adet, (sayfa - 1) * adet]);
  return { toplam, sayfaSayisi: Math.max(1, Math.ceil(toplam / adet)), sarkilar };
}

function sitemapKayitlari() {
  const sarkilar = db.sorgu('SELECT slug, son_tarih FROM muzik_parcalari ORDER BY son_tarih DESC');
  const sanatcilar = db.sorgu('SELECT sanatci_slug AS slug, MAX(son_tarih) AS son_tarih FROM muzik_parcalari GROUP BY sanatci_slug');
  return { sarkilar, sanatcilar, sonTarih: sonTarih() };
}

function durumBilgisi() {
  return {
    ...durum,
    sonListeTarihi: sonTarih(),
    sarkiSayisi: Number(db.tek('SELECT COUNT(*) AS sayi FROM muzik_parcalari')?.sayi || 0),
    bolge: BOLGE.toUpperCase(),
    adet: ADET
  };
}

// Statik açılış sayfası slug'ları ile çakışmayı önlemek için.
function rezerveEt(sluglar) {
  sluglar.forEach(s => REZERVE_SLUGLAR.add(s));
}

module.exports = {
  ADET, slugla, basligiTemizle, sarkiAyikla, guncelle, liste, bul, gecmis, sanatci, sanatciSarkilari,
  tumSarkilar, sitemapKayitlari, durumBilgisi, rezerveEt, sonTarih
};
