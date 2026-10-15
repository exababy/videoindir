'use strict';

const SITE_URL = String(process.env.SITE_URL || 'https://mp3.net.tr').replace(/\/+$/, '');

module.exports = {
  ad: 'MP3.NET.TR',
  url: SITE_URL,
  host: (() => { try { return new URL(SITE_URL).host; } catch { return 'mp3.net.tr'; } })(),
  slogan: 'Ücretsiz MP3 ve Video İndirici',
  aciklama: 'YouTube, Instagram, TikTok ve 25+ platformdan MP3 ve MP4 indirin. Kayıt yok, uygulama yok; telefonda ve bilgisayarda hızlı, ücretsiz video ve müzik indirici.',
  dil: 'tr',
  yerel: 'tr_TR',
  temaRengi: '#0b0b10',
  // Menüde ve footer'da gösterilecek platform grupları (sıra önemlidir).
  gruplar: [
    { anahtar: 'instagram', ad: 'Instagram', hub: 'instagram-mp3-mp4-indir' },
    { anahtar: 'youtube', ad: 'YouTube', hub: 'youtube-mp3-mp4-indir' },
    { anahtar: 'tiktok', ad: 'TikTok', hub: 'tiktok-mp3-mp4-indir' },
    { anahtar: 'twitter', ad: 'Twitter / X', hub: 'twitter-mp3-mp4-indir' },
    { anahtar: 'facebook', ad: 'Facebook', hub: 'facebook-mp3-mp4-indir' },
    { anahtar: 'genel', ad: 'MP3 & Video', hub: 'mp3-donusturucu' }
  ],
  yasalSayfalar: [
    { slug: 'hakkimizda', ad: 'Hakkımızda' },
    { slug: 'gizlilik-politikasi', ad: 'Gizlilik Politikası' },
    { slug: 'kullanim-sartlari', ad: 'Kullanım Şartları' },
    { slug: 'dmca-contract', ad: 'DMCA / Telif Hakkı' },
    { slug: 'iletisim', ad: 'İletişim' }
  ],
  iletisimEposta: process.env.ILETISIM_EPOSTA || 'iletisim@mp3.net.tr'
};
