# Product

## Register

product

## Users

Türkiye'deki genel kullanıcılar (çoğunluğu mobil). Google'da "instagram mp3 indir", "youtube mp3 indir", "instagram story indir", "tiktok filigransız indir" gibi aramalarla gelir; bağlantıyı yapıştırıp birkaç saniyede MP3 veya MP4 almak ister.

## Product Purpose

MP3.NET.TR; YouTube, Instagram, TikTok, Twitter/X, Facebook ve 25+ platformdan MP3/MP4 indirme, şarkı adıyla YouTube araması, Instagram profil fotoğrafı, oynatma listesi toplu indirme ve video kırpma işlemlerini tek ve sade bir akışta sunar. Gelir modeli reklamdır: sayfa içi reklam alanları ve indirme öncesi zorunlu 5 saniyelik (video destekli) reklam.

## SEO Mimarisi

- Her arama niyeti için ayrı açılış sayfası (`sunucu/veri/sayfalar/*.js`): benzersiz title, description, H1, içerik, SSS.
- JSON-LD: Organization, WebSite, WebApplication, HowTo, FAQPage, BreadcrumbList.
- `/sitemap.xml`, `/robots.txt`, `/ads.txt`, kanonik URL'ler (sonda `/`), küçük harf normalizasyonu.
- Eski WordPress URL'leri (`/en/...`, `/page/N/`, `*-mp3-mp4-indir`, blog yazıları) en yakın yeni sayfaya 301 ile yönlendirilir (`sunucu/veri/yonlendirmeler.js`).
- Header, footer ve "ilgili araçlar" ile güçlü iç linkleme.

## Brand Personality

Sade, hızlı, güven veren ve premium. Beyaz/koyu nötr zemin, siyah ana buton, tek mor vurgu rengi; ince çizgiler, yumuşak gölgeler, büyük ve sıkı tipografi.

## Anti-references

Dolandırıcı "gizli hesap görme" vaatleri, sahte indirme butonları, aşırı neon ve gradient, reklamla içeriğin karıştırılması.

## Design Principles

- Ana eylem (bağlantı yapıştır → indir) her sayfada ilk ekranda.
- Reklam alanları açıkça "Reklam" olarak etiketlenir; içerikle karışmaz.
- Dürüst bilgilendirme: yalnızca herkese açık içerik indirilebilir.
- Mobil öncelikli; açık ve koyu tema; WCAG AA.

## Accessibility & Inclusion

WCAG AA temel alınır. Klavye ile kullanım, görünür odak durumları, yeterli renk kontrastı, anlamlı alternatif metinler, azaltılmış hareket tercihi ve mobil ekranlarda okunabilir düzen desteklenir.
