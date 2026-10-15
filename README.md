# MP3.NET.TR

YouTube, Instagram, TikTok, Twitter/X, Facebook ve 25+ platform için ücretsiz MP3 / MP4 indirici. Node.js + Express + EJS, indirme için `yt-dlp` ve `ffmpeg` kullanır.

## Kurulum

```bash
npm install
cp .env.ornek .env   # değerleri düzenleyin
npm start
```

Sunucuda `yt-dlp` ve `ffmpeg` PATH'te olmalı (Windows'ta `bin/` klasörü de desteklenir).

## Yapı

| Yol | Açıklama |
| --- | --- |
| `sunucu/veri/sayfalar/*.js` | SEO açılış sayfaları (title, açıklama, H1, içerik, SSS). Yeni anahtar kelime = diziye yeni nesne. |
| `sunucu/veri/ana.js`, `yasal.js` | Ana sayfa ve yasal sayfa içerikleri |
| `sunucu/veri/yonlendirmeler.js` | Eski WordPress URL'leri için 301 kuralları |
| `sunucu/servisler/seo.js` | JSON-LD şemaları ve sitemap |
| `sunucu/servisler/reklam.js` | Reklam alanları (yönetici panelinden düzenlenir) |
| `gorunumler/` | EJS şablonları (`parcalar/` ortak parçalar) |
| `genel/` | CSS, JS, ikon ve OG görseli |

## Günlük müzik listesi (Top 25)

`sunucu/servisler/muzik.js`, YouTube Müzik Listeleri'nin Türkiye **günlük en popüler müzik videoları** verisini (charts.youtube.com) 3 saatte bir kontrol eder. Yeni günün listesi geldiğinde ilk 25 şarkı kaydedilir ve her şarkı için kalıcı bir sayfa açılır:

| Sayfa | Örnek |
| --- | --- |
| Şarkı | `/wegh-geri-ver-mp3-indir/` — "Wegh - Geri Ver MP3 İndir" |
| Günlük liste | `/top-25-sarkilar/` |
| Arşiv | `/sarkilar/` |
| Sanatçı | `/sanatci/wegh/` |

Şarkı sayfaları liste verisinden (sıra, sıra geçmişi, çıkış tarihi, süre, söz yazarı, prodüktör, görüntülenme) içerik üretir; MusicRecording, VideoObject, FAQPage ve Breadcrumb şemaları içerir. Listeden çıkan şarkıların sayfaları silinmez. Yönetici panelinden durum görülebilir ve liste elle güncellenebilir.

## Reklamlar

`/admin/panel` → **Reklam Yönetimi**: üst/alt banner, içerik arası, sonuç alanı, mobil sabit şerit, `<head>` kodu, `ads.txt` ve indirme öncesi zorunlu reklam (HTML kodu veya https video URL'si, en az 5 sn). Varsayılan yönetici: `admin` / `admin123` — ilk girişte değiştirin.

## Instagram notları

- Hikaye ve öne çıkanlar için Instagram oturumu gerekir: `YTDLP_COOKIES` ile Netscape formatında çerez dosyası verin.
- Profil fotoğrafı veri merkezi IP'lerinde sınırlanabilir; gerekirse `INSTAGRAM_SESSIONID` tanımlayın.
- Gizli hesap içeriği hiçbir şekilde gösterilmez; ilgili sayfa bilgilendirme amaçlıdır.
