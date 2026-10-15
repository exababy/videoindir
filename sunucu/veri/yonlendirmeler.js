'use strict';
const sayfalar = require('./sayfalar');

// Eski WordPress sitesinden kalan ve trafik alan URL'ler. Açık eşleşmeler
// önce denenir, ardından slug içindeki platform adına göre en yakın sayfa
// bulunur. Böylece eski backlink ve sıralamalar 301 ile korunur.
const ACIK = {
  'tiktok-mp4-no-watermak-indir': 'tiktok-filigransiz-indir',
  'tiktok-nowatermak-indir': 'tiktok-filigransiz-indir',
  'tiktok-video-cevirici': 'tiktok-mp3-mp4-indir',
  'tiktok-mp4-video-indir': 'tiktok-mp3-mp4-indir',
  'tiktok-mp3-converter': 'tiktok-mp3-indir',
  'instagram-mp4-cevirici': 'instagram-mp4-indir',
  'instagram-mp4-video-indir': 'instagram-mp4-indir',
  'instagram-video-downloaden': 'instagram-mp3-mp4-indir',
  'instagram-mp3-downloaden': 'instagram-mp3-indir',
  'facebook-indir-video': 'facebook-mp3-mp4-indir',
  'facebook-video-indir': 'facebook-mp3-mp4-indir',
  'facebook-mp4-sarki': 'facebook-mp3-indir',
  'youtube-mp3-converter': 'youtube-mp3-donusturucu',
  'youtube-mp3-downloader': 'youtube-mp3-indir',
  'youtube-mp4-converter': 'youtube-mp4-indir',
  'youtube-video-converter': 'youtube-mp3-mp4-indir',
  'mp4-mp3-converter': 'mp3-donusturucu',
  'mp4-naar-mp3': 'mp3-donusturucu',
  'converter-mp3': 'mp3-donusturucu',
  'mp3-converter': 'mp3-donusturucu',
  'linkedln-mp3-mp4-indir': 'linkedin-mp3-mp4-indir'
};

// Slug içinde geçen anahtar kelime -> hedef sayfa (sıra önemlidir).
const PLATFORM_IPUCLARI = [
  ['instagram', 'instagram-mp3-mp4-indir'],
  ['youtube', 'youtube-mp3-mp4-indir'],
  ['tiktok', 'tiktok-mp3-mp4-indir'],
  ['twitter', 'twitter-mp3-mp4-indir'],
  ['facebook', 'facebook-mp3-mp4-indir'],
  ['soundcloud', 'soundcloud-mp3-mp4-indir'],
  ['pinterest', 'pinterest-mp3-mp4-indir'],
  ['vimeo', 'vimeo-mp3-mp4-indir'],
  ['dailymotion', 'dailymotion-mp3-mp4-indir'],
  ['reddit', 'reddit-mp3-mp4-indir'],
  ['twitch', 'twitch-mp3-mp4-indir'],
  ['threads', 'threads-mp3-mp4-indir'],
  ['linkedin', 'linkedin-mp3-mp4-indir'],
  ['linkedln', 'linkedin-mp3-mp4-indir'],
  ['tumblr', 'tumblr-mp3-mp4-indir'],
  ['telegram', 'telegram-mp3-mp4-indir'],
  ['mixcloud', 'mixcloud-mp3-mp4-indir'],
  ['bandcamp', 'bandcamp-mp3-mp4-indir'],
  ['bilibili', 'bilibili-mp3-mp4-indir'],
  ['streamable', 'streamable-mp3-mp4-indir'],
  ['rumble', 'rumble-mp3-mp4-indir'],
  ['izlesene', 'izlesene-mp3-mp4-indir'],
  ['imgur', 'imgur-mp3-mp4-indir'],
  ['9gag', '9gag-mp3-mp4-indir'],
  ['ok-ru', 'ok-ru-mp3-mp4-indir'],
  ['vk-', 'vk-mp3-mp4-indir'],
  ['ted-', 'ted-mp3-mp4-indir'],
  ['mp3-mp4', 'video-indir'],
  ['mp3', 'mp3-donusturucu'],
  ['muziek', 'muzik-indir'],
  ['musica', 'muzik-indir'],
  ['muzik', 'muzik-indir'],
  ['sarki', 'sarki-indir'],
  ['video', 'video-indir']
];

const DIL_ONEKLERI = ['en', 'es', 'nl', 'az', 'pt', 'de', 'fr', 'ru'];
const WP_YOLLARI = /^\/(wp-content|wp-includes|wp-admin|wp-json|feed|comments|category|tag|author|page|xmlrpc\.php|wp-login\.php)(\/|$)/i;

function mevcutHedef(slug) {
  return sayfalar.bul(slug) ? `/${slug}/` : null;
}

// Verilen yol için 301 hedefini döndürür; yönlendirme gerekmiyorsa null.
function yonlendirmeBul(yol) {
  let temiz = String(yol || '/');
  try { temiz = decodeURIComponent(temiz); } catch {}
  temiz = temiz.toLowerCase();

  const parcalar = temiz.split('/').filter(Boolean);
  if (!parcalar.length) return null;

  // Eski çok dilli sürümler: /en/..., /de/...
  if (DIL_ONEKLERI.includes(parcalar[0])) {
    if (parcalar.length === 1) return '/';
    parcalar.shift();
  }

  if (WP_YOLLARI.test('/' + parcalar.join('/'))) return '/';
  if (parcalar[0] === 'sitemap_index.xml' || /^(post|page|category|video)-sitemap\d*\.xml$/.test(parcalar[0])) return '/sitemap.xml';

  const slug = parcalar[parcalar.length - 1].replace(/\.html?$/, '');
  if (ACIK[slug]) return mevcutHedef(ACIK[slug]) || '/';
  if (sayfalar.bul(slug)) return `/${slug}/`;

  for (const [ipucu, hedef] of PLATFORM_IPUCLARI) {
    const eslesir = ipucu.endsWith('-') ? slug.startsWith(ipucu) : slug.includes(ipucu);
    if (eslesir) return mevcutHedef(hedef) || '/';
  }
  return null;
}

module.exports = { yonlendirmeBul };
