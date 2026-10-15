'use strict';
const seo = require('./seo');
const site = require('../veri/site');

// Şarkı sayfası içeriği. Metinler liste verisinden (sıra, görüntülenme, çıkış
// tarihi, söz yazarı vb.) üretilir; cümle kalıpları video kimliğine göre
// seçildiği için sayfalar birbirinin kopyası olmaz. Türkçe ek uyumu sorunu
// yaşamamak için sanatçı adlarına ek getirilmez ("X imzalı" gibi yapılar).

const AYLAR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];

function tarihYaz(iso) {
  if (!iso) return '';
  const [y, a, g] = String(iso).split('-').map(Number);
  if (!y || !a) return '';
  return `${g} ${AYLAR[a - 1]} ${y}`;
}

function sayiYaz(n) {
  return Number(n || 0).toLocaleString('tr-TR');
}

function sureKisa(sn) {
  const t = Math.max(0, Number(sn) || 0);
  return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`;
}

function sureUzun(sn) {
  const t = Math.max(0, Number(sn) || 0);
  const d = Math.floor(t / 60), s = t % 60;
  return d ? `${d} dakika${s ? ` ${s} saniye` : ''}` : `${s} saniye`;
}

function isoSure(sn) {
  const t = Math.max(0, Number(sn) || 0);
  return `PT${Math.floor(t / 60)}M${t % 60}S`;
}

function sec(videoId, secenekler) {
  let ozet = 0;
  for (const h of String(videoId)) ozet = (ozet * 31 + h.charCodeAt(0)) >>> 0;
  return secenekler[ozet % secenekler.length];
}

function hareket(p) {
  if (!p.onceki_sira) return { tur: 'yeni', metin: 'Listeye yeni girdi' };
  const fark = p.onceki_sira - p.son_sira;
  if (fark > 0) return { tur: 'yukari', metin: `${fark} basamak yükseldi` };
  if (fark < 0) return { tur: 'asagi', metin: `${-fark} basamak geriledi` };
  return { tur: 'ayni', metin: 'Sırasını korudu' };
}

function ad(p) {
  return `${p.sanatci} - ${p.sarki}`;
}

function sayfaBasligi(p) {
  const tam = `${ad(p)} MP3 İndir`;
  if (tam.length + 13 <= 65) return `${tam} | MP3.NET.TR`;
  if (tam.length + 11 <= 65) return `${tam} (Ücretsiz)`;
  return tam.length <= 70 ? tam : `${p.sarki} MP3 İndir – ${p.sanatci}`.slice(0, 70);
}

function aciklamaYaz(p, guncel) {
  const ADI = ad(p);
  const adaylar = [
    guncel && p.son_sira ? `${ADI} MP3 indir: YouTube Türkiye listesinde ${p.son_sira}. sıradaki şarkıyı 320 kbps MP3 veya 1080p MP4 olarak ücretsiz indirin. Kayıt yok.` : null,
    guncel && p.son_sira ? `${ADI} MP3 indir: listede ${p.son_sira}. sıradaki şarkıyı 320 kbps MP3 veya MP4 olarak ücretsiz indirin.` : null,
    `${ADI} MP3 indir: şarkıyı 320 kbps'ye kadar MP3 veya 1080p MP4 olarak ücretsiz indirin. Üyelik ve uygulama gerekmez.`,
    `${ADI} MP3 indir: şarkıyı 320 kbps MP3 veya MP4 olarak ücretsiz indirin.`
  ].filter(Boolean);
  return adaylar.find(m => m.length <= 160) || adaylar[adaylar.length - 1].slice(0, 160);
}

function olustur(p, { gecmis = [], digerleri = [], sonListeTarihi } = {}) {
  const guncel = p.son_tarih && p.son_tarih === sonListeTarihi;
  const url = `https://www.youtube.com/watch?v=${p.video_id}`;
  const kapak = `https://i.ytimg.com/vi/${p.video_id}/maxresdefault.jpg`;
  const yayin = tarihYaz(p.yayin_tarihi);
  const h = hareket(p);
  const ADI = ad(p);

  const bilgiler = [
    { etiket: 'Sanatçı', deger: p.sanatci, link: `/sanatci/${p.sanatci_slug}/` },
    { etiket: 'Şarkı', deger: p.sarki },
    p.sure ? { etiket: 'Süre', deger: sureKisa(p.sure) } : null,
    yayin ? { etiket: 'Çıkış tarihi', deger: yayin } : null,
    p.soz_yazarlari ? { etiket: 'Söz / Müzik', deger: p.soz_yazarlari } : null,
    p.produktorler ? { etiket: 'Prodüktör', deger: p.produktorler } : null,
    p.en_iyi_sira ? { etiket: 'En iyi sıra', deger: `${p.en_iyi_sira}.` } : null,
    p.listede_gun ? { etiket: 'Listede', deger: `${p.listede_gun} gün` } : null
  ].filter(Boolean);

  // --- Giriş paragrafı ---
  const giris = sec(p.video_id, [
    `${ADI}, ${yayin ? `${yayin} tarihinde yayımlanan ve ` : ''}YouTube Türkiye günlük müzik listesine giren şarkılardan biri. ${guncel ? `Son listede ${p.son_sira}. sırada yer alan parça, ` : `Parça, `}şimdiye kadar listede en iyi ${p.en_iyi_sira}. sıraya yükseldi.`,
    `${p.sanatci} imzalı "${p.sarki}", YouTube’da Türkiye’nin en çok izlenen müzik videoları arasında ${p.listede_gun || 1} gündür yer alıyor. ${guncel ? `Güncel listede ${p.son_sira}. sırada; ${h.metin.toLowerCase()}.` : `En yüksek konumu ${p.en_iyi_sira}. sıra oldu.`}`,
    `Son günlerin dikkat çeken şarkılarından "${p.sarki}", ${p.sanatci} imzasını taşıyor. ${yayin ? `${yayin} tarihinde çıkan şarkı ` : 'Şarkı '}${guncel ? `bugünkü YouTube Türkiye listesinde ${p.son_sira}. sırada.` : `listede en iyi ${p.en_iyi_sira}. sırayı gördü.`}`
  ]);

  const hakkinda = [giris];
  const ek = [];
  if (p.goruntulenme) ek.push(`Liste döneminde günlük ${sayiYaz(p.goruntulenme)} görüntülenmeye ulaştı`);
  if (p.sure) ek.push(`şarkının süresi ${sureUzun(p.sure)}`);
  if (ek.length) hakkinda.push(ek.join('; ').replace(/^./, c => c.toUpperCase()) + '.');
  if (p.soz_yazarlari || p.produktorler) {
    hakkinda.push([
      p.soz_yazarlari ? `Şarkının söz ve müziğinde ${p.soz_yazarlari} imzası bulunuyor.` : '',
      p.produktorler ? `Prodüksiyonu ${p.produktorler} üstlendi.` : ''
    ].filter(Boolean).join(' '));
  }

  // --- İndirme paragrafı ---
  const indirme = sec(p.video_id.split('').reverse().join(''), [
    [
      `${ADI} MP3 indir işlemi için yukarıdaki kutuda şarkının YouTube bağlantısı hazır. “MP3 İndir” düğmesine dokunun, ardından MP3 satırındaki İndir’i seçin. Kısa reklamın ardından dosya telefonunuza veya bilgisayarınıza kaydedilir.`,
      `Ses, YouTube’daki en iyi akıştan alınarak MP3’e çevrilir; kaynağa bağlı olarak 320 kbps’ye kadar kalite elde edersiniz. Klibi izlemek isterseniz aynı ekrandan 360p ile 1080p arasında MP4 de seçebilirsiniz.`
    ],
    [
      `"${p.sarki}" şarkısını MP3 olarak kaydetmek için ek bir uygulamaya ihtiyacınız yok. Bağlantı sayfada hazır olduğu için tek yapmanız gereken MP3 İndir’e basmak ve açılan listeden MP3’ü seçmek.`,
      `Dosya hazırlanırken 5 saniyelik kısa bir reklam gösterilir; bu süre içinde dönüştürme arka planda devam eder. iPhone’da dosya Dosyalar > İndirilenler klasörüne, Android’de İndirilenler klasörüne kaydedilir.`
    ],
    [
      `${ADI} şarkısını indirmek birkaç saniye sürer: önce MP3 İndir’e dokunun, sonra format listesinden MP3’ü seçin. Video olarak saklamak isterseniz MP4 satırlarından 720p veya 1080p’yi tercih edebilirsiniz.`,
      `İndirilen MP3 dosyasına şarkının adı verilir; müzik çalarınızda, arabanızda ya da telefonunuzun zil sesi ayarlarında doğrudan kullanabilirsiniz.`
    ]
  ]);

  const icerik = [
    { h2: `${ADI} hakkında`, p: hakkinda },
    { h2: `${ADI} MP3 nasıl indirilir?`, p: indirme }
  ];
  if (digerleri.length) {
    icerik.push({ h2: `${p.sanatci.split(/\s*[&,]\s*/)[0]} şarkıları`, p: [`Listeye giren diğer şarkılar için sanatçı sayfasına göz atabilir, hepsini aynı şekilde MP3 olarak indirebilirsiniz.`] });
  }
  icerik.push({ h2: 'Telif hakları hakkında', p: [`Şarkının tüm hakları sahiplerine aittir. MP3.NET.TR yalnızca kişisel kullanım için dönüştürme aracı sunar; şarkıyı dinleyerek ve dijital platformlarda satın alarak ${p.sanatci} gibi sanatçılara destek olabilirsiniz.`] });

  const sss = [
    { s: `${ADI} MP3 nasıl indirilir?`, c: `Bu sayfadaki MP3 İndir düğmesine dokunun, MP3 satırını seçin ve kısa reklamın ardından dosyayı kaydedin. Kayıt veya uygulama gerekmez.` },
    p.sure ? { s: `${p.sarki} şarkısı kaç dakika?`, c: `${ADI} şarkısının süresi ${sureUzun(p.sure)} (${sureKisa(p.sure)}).` } : null,
    yayin ? { s: `${p.sarki} ne zaman çıktı?`, c: `"${p.sarki}" ${yayin} tarihinde yayımlandı.` } : null,
    p.soz_yazarlari ? { s: `${p.sarki} şarkısının sözleri kime ait?`, c: `Şarkının söz ve müziği ${p.soz_yazarlari} imzası taşıyor.${p.produktorler ? ` Prodüktörlüğünü ${p.produktorler} yaptı.` : ''}` } : null,
    { s: `${p.sarki} YouTube listesinde kaçıncı sırada?`, c: guncel ? `${tarihYaz(sonListeTarihi)} tarihli YouTube Türkiye günlük müzik listesinde ${p.son_sira}. sırada. Şarkının listedeki en iyi derecesi ${p.en_iyi_sira}. sıra.` : `Şarkı şu an ilk ${require('./muzik').ADET} içinde değil; listedeki en iyi derecesi ${p.en_iyi_sira}. sıra oldu. Son olarak ${tarihYaz(p.son_tarih)} tarihinde listedeydi.` },
    { s: `${p.sarki} MP3 telefona nasıl indirilir?`, c: 'iPhone’da Safari, Android’de Chrome ile bu sayfayı açıp MP3 İndir’e dokunun. Dosya, telefonunuzun İndirilenler klasörüne kaydedilir.' }
  ].filter(Boolean);

  const yol = `/${p.slug}/`;
  const kirinti = [{ ad: 'Ana Sayfa', yol: '/' }, { ad: 'Top 25 Şarkı', yol: '/top-25-sarkilar/' }, { ad: ADI, yol }];
  const aciklama = aciklamaYaz(p, guncel);

  const jsonld = seo.grafik([
    seo.organizasyon(),
    {
      '@type': 'MusicRecording',
      '@id': seo.mutlak(yol) + '#sarki',
      name: p.sarki,
      url: seo.mutlak(yol),
      byArtist: p.sanatci.split(/\s*[&,]\s*/).map(n => ({ '@type': 'MusicGroup', name: n })),
      duration: p.sure ? isoSure(p.sure) : undefined,
      datePublished: p.yayin_tarihi || undefined,
      image: kapak,
      inLanguage: 'tr'
    },
    {
      '@type': 'VideoObject',
      name: `${ADI} (Video)`,
      description: aciklama,
      thumbnailUrl: [kapak, `https://i.ytimg.com/vi/${p.video_id}/hqdefault.jpg`],
      uploadDate: p.yayin_tarihi || p.ilk_tarih,
      duration: p.sure ? isoSure(p.sure) : undefined,
      embedUrl: `https://www.youtube-nocookie.com/embed/${p.video_id}`
    },
    seo.ekmekKirintisi(kirinti),
    seo.sssSemasi(sss)
  ]);

  return {
    p,
    url,
    kapak,
    ADI,
    guncel,
    hareket: h,
    bilgiler,
    icerik,
    sss,
    gecmis,
    kirinti,
    yayin,
    arac: { mod: 'indir', format: 'mp3', placeholder: url, deger: url, dugme: 'MP3 İndir' },
    seo: seo.meta({ baslik: sayfaBasligi(p), aciklama, yol, tur: 'music.song', gorsel: `https://i.ytimg.com/vi/${p.video_id}/hqdefault.jpg`, jsonld })
  };
}

module.exports = { olustur, tarihYaz, sayiYaz, sureKisa, hareket, ad, site };
