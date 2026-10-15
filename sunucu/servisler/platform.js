'use strict';

// Desteklenen platformlar. Alan adları alt alan adlarıyla birlikte eşleşir
// (örn. "m.facebook.com" -> facebook.com).
const PLATFORMLAR = [
  { platform: 'youtube', ad: 'YouTube', alanlar: ['youtube.com', 'youtu.be', 'youtube-nocookie.com'] },
  { platform: 'instagram', ad: 'Instagram', alanlar: ['instagram.com', 'instagr.am'] },
  { platform: 'tiktok', ad: 'TikTok', alanlar: ['tiktok.com'] },
  { platform: 'twitter', ad: 'Twitter / X', alanlar: ['twitter.com', 'x.com'] },
  { platform: 'facebook', ad: 'Facebook', alanlar: ['facebook.com', 'fb.watch', 'fb.com'] },
  { platform: 'pinterest', ad: 'Pinterest', alanlar: ['pinterest.com', 'pinterest.com.tr', 'pin.it'] },
  { platform: 'vimeo', ad: 'Vimeo', alanlar: ['vimeo.com'] },
  { platform: 'dailymotion', ad: 'Dailymotion', alanlar: ['dailymotion.com', 'dai.ly'] },
  { platform: 'soundcloud', ad: 'SoundCloud', alanlar: ['soundcloud.com', 'on.soundcloud.com'] },
  { platform: 'reddit', ad: 'Reddit', alanlar: ['reddit.com', 'redd.it'] },
  { platform: 'twitch', ad: 'Twitch', alanlar: ['twitch.tv'] },
  { platform: 'threads', ad: 'Threads', alanlar: ['threads.net', 'threads.com'] },
  { platform: 'vk', ad: 'VK', alanlar: ['vk.com', 'vkvideo.ru'] },
  { platform: 'ok-ru', ad: 'OK.ru', alanlar: ['ok.ru'] },
  { platform: 'tumblr', ad: 'Tumblr', alanlar: ['tumblr.com'] },
  { platform: 'bilibili', ad: 'Bilibili', alanlar: ['bilibili.com', 'bilibili.tv', 'b23.tv'] },
  { platform: 'streamable', ad: 'Streamable', alanlar: ['streamable.com'] },
  { platform: 'rumble', ad: 'Rumble', alanlar: ['rumble.com'] },
  { platform: 'ted', ad: 'TED', alanlar: ['ted.com'] },
  { platform: 'mixcloud', ad: 'Mixcloud', alanlar: ['mixcloud.com'] },
  { platform: 'bandcamp', ad: 'Bandcamp', alanlar: ['bandcamp.com'] },
  { platform: '9gag', ad: '9GAG', alanlar: ['9gag.com'] },
  { platform: 'imgur', ad: 'Imgur', alanlar: ['imgur.com'] },
  { platform: 'linkedin', ad: 'LinkedIn', alanlar: ['linkedin.com', 'lnkd.in'] },
  { platform: 'izlesene', ad: 'İzlesene', alanlar: ['izlesene.com'] },
  { platform: 'telegram', ad: 'Telegram', alanlar: ['t.me', 'telegram.me'] }
];

// Geriye dönük uyumluluk: eski kod bu listeyi içe aktarıyordu.
const IZINLI_ALAN_ADLARI = PLATFORMLAR.flatMap(p => p.alanlar);

function alanEslesir(host, alan) {
  return host === alan || host.endsWith('.' + alan);
}

function platformTespit(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (!['http:', 'https:'].includes(parsed.protocol)) return null;

  const host = parsed.hostname.toLowerCase();
  const bulunan = PLATFORMLAR.find(p => p.alanlar.some(alan => alanEslesir(host, alan)));
  if (!bulunan) return null;

  if (bulunan.platform === 'youtube' && parsed.pathname.startsWith('/shorts/')) {
    return { platform: 'youtube_shorts', ad: 'YouTube Shorts', ikon: 'youtube' };
  }
  return { platform: bulunan.platform, ad: bulunan.ad, ikon: bulunan.platform };
}

function urlDogrula(url) {
  if (!url || typeof url !== 'string') return false;
  if (url.length > 500) return false;
  return platformTespit(url) !== null;
}

module.exports = { platformTespit, urlDogrula, IZINLI_ALAN_ADLARI, PLATFORMLAR };
