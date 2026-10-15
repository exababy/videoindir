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

## Reklamlar

`/admin/panel` → **Reklam Yönetimi**: üst/alt banner, içerik arası, sonuç alanı, mobil sabit şerit, `<head>` kodu, `ads.txt` ve indirme öncesi zorunlu reklam (HTML kodu veya https video URL'si, en az 5 sn). Varsayılan yönetici: `admin` / `admin123` — ilk girişte değiştirin.

## Instagram notları

- Hikaye ve öne çıkanlar için Instagram oturumu gerekir: `YTDLP_COOKIES` ile Netscape formatında çerez dosyası verin.
- Profil fotoğrafı veri merkezi IP'lerinde sınırlanabilir; gerekirse `INSTAGRAM_SESSIONID` tanımlayın.
- Gizli hesap içeriği hiçbir şekilde gösterilmez; ilgili sayfa bilgilendirme amaçlıdır.
