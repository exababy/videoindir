/* MP3.NET.TR istemci betiği */
(function () {
  'use strict';

  var AYAR = window.MP3 || {};
  var REKLAM_SURE = Math.max(5, Number(AYAR.reklamSure) || 5);
  var MAKS_TOPLU = Number(AYAR.maksToplu) || 20;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ikon(ad, boyut) {
    boyut = boyut || 18;
    return '<svg width="' + boyut + '" height="' + boyut + '" aria-hidden="true"><use href="#' + ad + '"/></svg>';
  }
  function sure(sn) {
    var t = Math.max(0, Math.round(Number(sn) || 0));
    if (!t) return '';
    var s = Math.floor(t / 3600), d = Math.floor((t % 3600) / 60), n = t % 60;
    return (s ? s + ':' + String(d).padStart(2, '0') : d) + ':' + String(n).padStart(2, '0');
  }
  function zamanMetni(sn) {
    var t = Math.max(0, Math.round(Number(sn) || 0));
    var s = Math.floor(t / 3600), d = Math.floor((t % 3600) / 60), n = t % 60;
    return (s ? String(s).padStart(2, '0') + ':' : '') + String(d).padStart(2, '0') + ':' + String(n).padStart(2, '0');
  }
  function zamanSayisi(deger) {
    var p = String(deger || '').trim().split(':').map(Number);
    if (!p.length || p.some(function (x) { return !isFinite(x); })) return null;
    if (p.length === 1) return p[0];
    if (p.length === 2) return p[0] * 60 + p[1];
    if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
    return null;
  }
  function sayiKisa(n) {
    n = Number(n) || 0;
    if (n >= 1e6) return (n / 1e6).toFixed(1).replace('.0', '') + ' Mn';
    if (n >= 1e3) return (n / 1e3).toFixed(1).replace('.0', '') + ' B';
    return String(n);
  }
  function postJson(url, govde) {
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(govde)
    }).then(function (yanit) {
      return yanit.json().catch(function () { return { basari: false, mesaj: 'Sunucudan geçersiz yanıt alındı.' }; })
        .then(function (veri) {
          if (yanit.status === 429) veri = { basari: false, mesaj: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.' };
          if (!veri.basari) throw new Error(veri.mesaj || 'İşlem başarısız oldu.');
          return veri;
        });
    }, function () { throw new Error('Sunucuya bağlanılamadı. İnternet bağlantınızı kontrol edin.'); });
  }
  function dosyaLinki(v) {
    return '/indir/dosya/' + encodeURIComponent(v.indirmeId) + '/' + encodeURIComponent(v.format) + '?ad=' + encodeURIComponent(v.dosyaAdi || 'mp3.net.tr');
  }

  /* ---------- Genel arayüz ---------- */
  function temaKur() {
    var btn = $('temaBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var kok = document.documentElement;
      var mevcut = kok.getAttribute('data-theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var yeni = mevcut === 'dark' ? 'light' : 'dark';
      kok.setAttribute('data-theme', yeni);
      try { localStorage.setItem('tema', yeni); } catch (e) {}
    });
  }

  function menuKur() {
    var btn = $('menuBtn'), menu = $('menu'), ust = $('ust');
    if (btn && menu) {
      btn.addEventListener('click', function () {
        var acik = menu.classList.toggle('acik');
        btn.setAttribute('aria-expanded', acik ? 'true' : 'false');
        btn.setAttribute('aria-label', acik ? 'Menüyü kapat' : 'Menüyü aç');
        btn.querySelector('use').setAttribute('href', acik ? '#i-kapat' : '#i-menu');
        document.body.classList.toggle('menu-acik', acik);
      });
      menu.addEventListener('click', function (e) {
        if (e.target.closest('a')) { menu.classList.remove('acik'); document.body.classList.remove('menu-acik'); btn.setAttribute('aria-expanded', 'false'); btn.querySelector('use').setAttribute('href', '#i-menu'); }
      });
    }
    if (ust) {
      var guncelle = function () { ust.classList.toggle('kaydi', window.scrollY > 8); };
      window.addEventListener('scroll', guncelle, { passive: true });
      guncelle();
    }
    var sabit = $('mobilSabit');
    if (sabit) {
      var kapat = sabit.querySelector('.mobil-sabit-kapat');
      if (kapat) kapat.addEventListener('click', function () { sabit.classList.add('gizli'); });
    }
  }

  /* ---------- Zorunlu reklam (geçiş) ---------- */
  var Gecis = (function () {
    var kutu, sayac, sayacSayi, dolgu, durum, durumMetin, kapatBtn, indirBtn, video, sesBtn, notEl;
    var zamanlayici = null, kalan = 0, hazirVeri = null, hata = null, bitti = false, acik = false, sonGorev = 0, sonOdak = null;
    var CEVRE = 100.53;

    function hazirla() {
      kutu = $('gecis');
      if (!kutu) return false;
      sayac = $('gecisSayac'); sayacSayi = $('gecisSayacSayi'); dolgu = $('gecisSayacDolgu');
      durum = $('gecisDurum'); durumMetin = $('gecisDurumMetin'); kapatBtn = $('gecisKapat'); indirBtn = $('gecisIndir');
      video = $('gecisVideo'); sesBtn = $('gecisSes'); notEl = $('gecisNot');
      kapatBtn.addEventListener('click', kapat);
      indirBtn.addEventListener('click', function () { if (hazirVeri && hazirVeri.tikla) { hazirVeri.tikla(); } setTimeout(kapat, 150); });
      if (sesBtn && video) {
        sesBtn.addEventListener('click', function () {
          video.muted = !video.muted;
          sesBtn.innerHTML = ikon(video.muted ? 'i-sessiz' : 'i-ses', 16);
          sesBtn.setAttribute('aria-label', video.muted ? 'Sesi aç' : 'Sesi kapat');
        });
      }
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && acik && bitti) kapat(); });
      return true;
    }

    function arayuzGuncelle() {
      $('gecisBaslik').textContent = hata ? 'Bir sorun oluştu' : (hazirVeri ? 'Dosyanız hazır' : 'Dosyanız hazırlanıyor');
      durum.classList.remove('hazir', 'hata');
      if (hata) {
        durum.classList.add('hata');
        durum.innerHTML = ikon('i-uyari', 16) + '<span>' + esc(hata) + '</span>';
      } else if (hazirVeri) {
        durum.classList.add('hazir');
        durum.innerHTML = ikon('i-tik', 16) + '<span>' + esc(hazirVeri.mesaj || 'Dosyanız hazır') + '</span>';
      } else {
        durum.innerHTML = '<span class="donen" aria-hidden="true"></span><span>' + esc(durumMetin.dataset.metin || 'Dönüştürülüyor…') + '</span>';
      }
      if (!bitti) {
        kapatBtn.disabled = true;
        kapatBtn.textContent = 'Lütfen bekleyin · ' + kalan;
        indirBtn.hidden = true;
        return;
      }
      kapatBtn.disabled = false;
      if (hazirVeri && hazirVeri.href) {
        indirBtn.hidden = false;
        indirBtn.href = hazirVeri.href;
        indirBtn.querySelector('span').textContent = hazirVeri.dugme || 'Dosyayı indir';
        if (hazirVeri.dosyaAdi) indirBtn.setAttribute('download', hazirVeri.dosyaAdi); else indirBtn.setAttribute('download', '');
        kapatBtn.textContent = 'Kapat';
      } else if (hazirVeri) {
        indirBtn.hidden = false;
        indirBtn.removeAttribute('download');
        indirBtn.href = '#sonuc';
        indirBtn.querySelector('span').textContent = hazirVeri.dugme || 'Sonuçları göster';
        kapatBtn.textContent = 'Kapat';
      } else {
        indirBtn.hidden = true;
        kapatBtn.textContent = hata ? 'Kapat' : 'Kapat, arka planda devam etsin';
      }
    }

    function kapat() {
      if (!bitti) return;
      acik = false;
      kutu.classList.remove('acik');
      kutu.setAttribute('aria-hidden', 'true');
      clearInterval(zamanlayici);
      if (video) { try { video.pause(); } catch (e) {} }
      if (sonOdak && sonOdak.focus) sonOdak.focus();
    }

    // islem: Promise -> { href, dosyaAdi, mesaj, dugme, tikla }
    function ac(islem, metin) {
      if (!kutu && !hazirla()) return islem;
      var gorev = ++sonGorev;
      sonOdak = document.activeElement;
      hazirVeri = null; hata = null; bitti = false; kalan = REKLAM_SURE; acik = true;
      durumMetin.dataset.metin = metin || 'Dosyanız hazırlanıyor…';
      sayac.classList.remove('bitti');
      sayacSayi.textContent = kalan;
      dolgu.style.transition = 'none';
      dolgu.style.strokeDashoffset = '0';
      kutu.classList.add('acik');
      kutu.setAttribute('aria-hidden', 'false');
      if (video) {
        try { video.currentTime = 0; var p = video.play(); if (p && p.catch) p.catch(function () {}); } catch (e) {}
      }
      requestAnimationFrame(function () { dolgu.style.transition = ''; });
      arayuzGuncelle();
      setTimeout(function () { kapatBtn.focus(); }, 50);

      clearInterval(zamanlayici);
      zamanlayici = setInterval(function () {
        kalan -= 1;
        sayacSayi.textContent = Math.max(0, kalan);
        dolgu.style.strokeDashoffset = String(CEVRE * (1 - Math.max(0, kalan) / REKLAM_SURE));
        if (kalan <= 0) {
          clearInterval(zamanlayici);
          bitti = true;
          sayac.classList.add('bitti');
          sayacSayi.innerHTML = ikon('i-tik', 20);
        }
        arayuzGuncelle();
      }, 1000);

      return islem.then(function (veri) {
        if (gorev === sonGorev) { hazirVeri = veri || {}; arayuzGuncelle(); }
        return veri;
      }, function (h) {
        if (gorev === sonGorev) { hata = (h && h.message) || 'İşlem başarısız oldu.'; arayuzGuncelle(); }
        throw h;
      });
    }

    return { ac: ac };
  })();

  /* ---------- Araç ---------- */
  function aracKur() {
    var arac = $('arac');
    if (!arac) return;

    var mod = arac.dataset.mod;
    var tercihFormat = arac.dataset.format || '';
    var form = $('aracForm'), giris = $('aracGiris'), gonder = $('aracGonder');
    var yapistir = $('aracYapistir'), temizle = $('aracTemizle');
    var mesajEl = $('aracMesaj'), sonucEl = $('sonuc');
    var aramaEl = $('aramaSonuclari'), aramayaDon = $('aramayaDon');
    var medyaEl = $('medya'), formatlarEl = $('formatlar');
    var oynatmaEl = $('oynatma'), oynatmaListe = $('oynatmaListe'), oynatmaSayac = $('oynatmaSayac'), oynatmaTumu = $('oynatmaTumu');
    var kirpmaEl = $('kirpma'), topluEl = $('topluSonuc');
    var gonderMetin = gonder.querySelector('.arac-gonder-metin').textContent;

    var durum = { url: '', analiz: null, oynatma: null, kirpma: null, aramaVar: false };

    function mesaj(tur, metin) {
      if (!metin) { mesajEl.hidden = true; mesajEl.textContent = ''; return; }
      mesajEl.className = 'arac-mesaj ' + tur;
      mesajEl.innerHTML = (tur === 'hata' ? ikon('i-uyari', 18) : '') + '<span>' + esc(metin) + '</span>';
      mesajEl.hidden = false;
    }
    function yukleniyor(acik) {
      gonder.disabled = acik;
      gonder.innerHTML = acik
        ? '<span class="donen" aria-hidden="true"></span><span class="arac-gonder-metin">' + (mod === 'profil' ? 'Aranıyor' : 'Analiz ediliyor') + '</span>'
        : '<span class="arac-gonder-metin">' + esc(gonderMetin) + '</span>' + ikon('i-sag-ok');
    }
    function girisDurumu() {
      var dolu = giris.value.trim().length > 0;
      temizle.hidden = !dolu;
      yapistir.hidden = dolu;
    }
    function urlMi(metin) {
      if (/^https?:\/\//i.test(metin)) return true;
      return !/\s/.test(metin) && /^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(metin);
    }
    function sifirla() {
      aramaEl.innerHTML = '';
      aramaEl.hidden = false;
      medyaEl.hidden = true; medyaEl.innerHTML = '';
      formatlarEl.hidden = true; formatlarEl.innerHTML = '';
      oynatmaEl.hidden = true; oynatmaListe.innerHTML = '';
      topluEl.innerHTML = '';
      aramayaDon.hidden = true;
      kirpmaKapat();
      durum.analiz = null; durum.oynatma = null;
    }

    giris.addEventListener('input', girisDurumu);
    temizle.addEventListener('click', function () { giris.value = ''; girisDurumu(); giris.focus(); });
    yapistir.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { giris.focus(); return mesaj('bilgi', 'Bağlantıyı uzun basıp “Yapıştır” seçeneğiyle ekleyebilirsiniz.'); }
      navigator.clipboard.readText().then(function (metin) {
        metin = String(metin || '').trim();
        if (!metin) return;
        giris.value = metin.slice(0, 500);
        girisDurumu();
        if (mod === 'profil' || urlMi(metin)) form.requestSubmit ? form.requestSubmit() : gonderIslem();
      }).catch(function () { giris.focus(); });
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); gonderIslem(); });
    girisDurumu();

    // Sayfaya ?url= ile gelinirse (paylaşım, eklenti vb.) otomatik başlat.
    try {
      var sorgu = new URLSearchParams(location.search);
      var gelen = sorgu.get('url') || sorgu.get('q');
      if (gelen) { giris.value = gelen.slice(0, 500); girisDurumu(); setTimeout(gonderIslem, 50); }
    } catch (e) {}

    function gonderIslem() {
      var deger = giris.value.trim();
      mesaj();
      if (!deger) { giris.focus(); return mesaj('hata', mod === 'profil' ? 'Lütfen bir kullanıcı adı yazın.' : 'Lütfen bir bağlantı yapıştırın veya şarkı adı yazın.'); }
      if (mod === 'profil') return profilGetir(deger);
      if (urlMi(deger)) {
        if (!/^https?:\/\//i.test(deger)) deger = 'https://' + deger;
        return analiz(deger);
      }
      return ara(deger);
    }

    /* --- Arama --- */
    function ara(sorgu) {
      sifirla();
      yukleniyor(true);
      postJson('/indir/ara', { sorgu: sorgu.slice(0, 120) }).then(function (veri) {
        var liste = veri.sonuclar || [];
        sonucEl.hidden = false;
        durum.aramaVar = true;
        if (!liste.length) { aramaEl.innerHTML = '<p class="arama-baslik">“' + esc(sorgu) + '” için sonuç bulunamadı.</p>'; return; }
        aramaEl.innerHTML = '<p class="arama-baslik">“' + esc(sorgu) + '” için YouTube sonuçları</p>' + liste.map(function (s, i) {
          var meta = [s.kanal, sure(s.sure)].filter(Boolean).map(esc).join(' · ');
          return '<button type="button" class="arama-oge" data-i="' + i + '">' +
            '<img src="' + esc(s.kucukResim) + '" alt="" loading="lazy" width="120" height="68">' +
            '<span class="arama-bilgi"><span class="arama-ad">' + esc(s.baslik) + '</span><span class="arama-meta">' + meta + '</span></span>' +
            '<span class="format-rozet ' + (tercihFormat === 'mp4' ? 'mp4' : 'mp3') + '">' + (tercihFormat === 'mp4' ? 'MP4' : 'MP3') + '</span></button>';
        }).join('');
        aramaEl.querySelectorAll('.arama-oge').forEach(function (b) {
          b.addEventListener('click', function () {
            var s = liste[Number(b.dataset.i)];
            giris.value = s.url; girisDurumu();
            analiz(s.url, true);
          });
        });
      }).catch(function (h) { mesaj('hata', h.message); }).then(function () { yukleniyor(false); });
    }
    aramayaDon.addEventListener('click', function () {
      medyaEl.hidden = true; formatlarEl.hidden = true; oynatmaEl.hidden = true; topluEl.innerHTML = ''; kirpmaKapat();
      aramaEl.hidden = false; aramayaDon.hidden = true;
      sonucEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* --- Analiz --- */
    function analiz(url, aramadan) {
      var aramaHtml = aramaEl.innerHTML;
      sifirla();
      if (aramadan) { aramaEl.innerHTML = aramaHtml; aramaEl.hidden = true; }
      durum.url = url;
      yukleniyor(true);
      sonucEl.hidden = false;
      medyaEl.hidden = false;
      medyaEl.innerHTML = '<div class="medya-gorsel"></div><div class="medya-bilgi"><p class="arac-ipucu" style="justify-content:flex-start;margin:0"><span class="donen"></span>Bağlantı analiz ediliyor…</p></div>';
      postJson('/indir/analiz', { url: url }).then(function (yanit) {
        var veri = yanit.veri;
        durum.analiz = veri;
        if (aramadan) aramayaDon.hidden = false;
        medyaCiz(veri);
        if (veri.tur === 'oynatma_listesi') {
          durum.oynatma = veri;
          oynatmaCiz(veri);
          formatCiz([
            { tur: 'video', kalite: '1080p' }, { tur: 'video', kalite: '720p' }, { tur: 'video', kalite: '480p' }, { tur: 'video', kalite: '360p' }, { tur: 'ses', format: 'mp3' }
          ]);
        } else {
          formatCiz(veri.formatlar || []);
        }
        if (window.innerWidth < 900) setTimeout(function () { sonucEl.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 60);
      }).catch(function (h) {
        medyaEl.hidden = true;
        if (!aramadan) sonucEl.hidden = true; else { aramaEl.hidden = false; }
        mesaj('hata', h.message === 'Gecersiz veya desteklenmeyen baglanti.' ? 'Bu bağlantı desteklenmiyor. YouTube, Instagram, TikTok, X, Facebook ve diğer desteklenen sitelerden bir bağlantı yapıştırın.' : (h.message === 'Medya bilgisi alinamadi. Baglantıyı kontrol edin.' ? 'Video bilgisi alınamadı. Bağlantının herkese açık bir içeriğe ait olduğundan emin olun.' : h.message));
      }).then(function () { yukleniyor(false); });
    }

    function medyaCiz(veri) {
      var oynatma = veri.tur === 'oynatma_listesi';
      var sureMetin = sure(veri.sure);
      medyaEl.innerHTML =
        '<div class="medya-gorsel">' + (veri.kucukResim ? '<img src="' + esc(veri.kucukResim) + '" alt="' + esc(veri.baslik) + '" referrerpolicy="no-referrer">' : '') +
        (sureMetin ? '<span class="medya-sure">' + sureMetin + '</span>' : '') + '</div>' +
        '<div class="medya-bilgi"><span class="medya-platform">' + esc(veri.platform && veri.platform.ad || 'Video') + (oynatma ? ' · ' + (veri.toplam || 0) + ' video' : '') + '</span>' +
        '<p class="medya-baslik">' + esc(veri.baslik) + '</p>' +
        (!oynatma ? '<div class="medya-eylem"><button type="button" class="btn btn-ikincil btn-kucuk" id="kirpAc">' + ikon('i-makas', 16) + 'Videoyu kırp</button></div>' : '') +
        '</div>';
      var img = medyaEl.querySelector('img');
      if (img) img.addEventListener('error', function () { img.remove(); });
      var kirpBtn = $('kirpAc');
      if (kirpBtn) kirpBtn.addEventListener('click', kirpmaAc);
    }

    function formatCiz(formatlar) {
      var videolar = formatlar.filter(function (f) { return f.tur === 'video'; });
      var sesler = formatlar.filter(function (f) { return f.tur === 'ses'; });
      var kirpmaModu = !!durum.kirpma;
      var oynatma = !!durum.oynatma;
      var oneriVideo = (videolar.find(function (f) { return f.kalite === '720p'; }) || videolar[0] || {}).kalite;
      var mp3Once = tercihFormat === 'mp3' && !kirpmaModu;

      function satir(f) {
        var mp3 = f.tur === 'ses';
        var oneri = mp3 ? tercihFormat === 'mp3' : (tercihFormat !== 'mp3' && f.kalite === oneriVideo);
        var yukseklik = parseInt(f.kalite, 10) || 0;
        var ad = mp3 ? 'MP3 · Ses' : f.kalite + (yukseklik >= 1080 ? ' Full HD' : (yukseklik >= 720 ? ' HD' : ''));
        var alt = mp3 ? 'En iyi kalite · 320 kbps’ye kadar' : 'MP4 · H.264 · sesli video';
        var dugme = kirpmaModu ? 'Klibi indir' : (oynatma ? 'Seçilenleri indir' : 'İndir');
        return '<div class="format-satir' + (oneri ? ' oneri' : '') + '">' +
          '<span class="format-rozet ' + (mp3 ? 'mp3' : 'mp4') + '">' + (mp3 ? 'MP3' : 'MP4') + '</span>' +
          '<span class="format-bilgi"><span class="format-ad">' + esc(ad) + (oneri ? '<span class="format-etiket">Önerilen</span>' : '') + '</span><span class="format-alt">' + alt + '</span></span>' +
          '<button type="button" class="btn btn-ana" data-format="' + (mp3 ? 'mp3' : 'mp4') + '" data-kalite="' + esc(mp3 ? '' : f.kalite) + '">' + ikon('i-indir', 16) + '<span>' + dugme + '</span></button></div>';
      }

      var videoGrup = videolar.length ? '<div><p class="format-grup-baslik">' + ikon('i-video', 15) + (kirpmaModu ? 'Klip kalitesi' : 'Video (MP4)') + '</p><div class="format-liste">' + videolar.map(satir).join('') + '</div></div>' : '';
      var sesGrup = (sesler.length && !kirpmaModu) ? '<div><p class="format-grup-baslik">' + ikon('i-muzik', 15) + 'Ses (MP3)</p><div class="format-liste">' + sesler.map(satir).join('') + '</div></div>' : '';
      formatlarEl.innerHTML = (mp3Once ? sesGrup + videoGrup : videoGrup + sesGrup) || '<p class="arac-ipucu">Bu içerik için indirilebilir format bulunamadı.</p>';
      formatlarEl.hidden = false;
      formatlarEl.querySelectorAll('button[data-format]').forEach(function (b) {
        b.addEventListener('click', function () { indir(b); });
      });
    }

    /* --- Oynatma listesi --- */
    function oynatmaCiz(veri) {
      var maks = Number(veri.maksTopluVideo) || MAKS_TOPLU;
      oynatmaEl.hidden = false;
      oynatmaListe.innerHTML = (veri.oynatmaListesi || []).map(function (v, i) {
        return '<label class="oynatma-satir"><input type="checkbox" data-i="' + i + '"' + (i < maks ? ' checked' : '') + '>' +
          '<img src="' + esc(v.kucukResim) + '" alt="" loading="lazy" width="88" height="50">' +
          '<span><span class="oynatma-ad">' + esc(v.baslik) + '</span><span class="oynatma-meta">' + esc([v.kanal, sure(v.sure)].filter(Boolean).join(' · ')) + '</span></span></label>';
      }).join('');
      oynatmaListe.querySelectorAll('input').forEach(function (k) { k.addEventListener('change', function (e) { oynatmaSecim(e); }); });
      oynatmaSecim();
    }
    function oynatmaSecim(e) {
      var maks = Number(durum.oynatma && durum.oynatma.maksTopluVideo) || MAKS_TOPLU;
      var kutular = [].slice.call(oynatmaListe.querySelectorAll('input'));
      var secili = kutular.filter(function (k) { return k.checked; });
      if (secili.length > maks && e && e.target.checked) { e.target.checked = false; mesaj('bilgi', 'Tek seferde en fazla ' + maks + ' video seçebilirsiniz.'); }
      var n = kutular.filter(function (k) { return k.checked; }).length;
      oynatmaSayac.textContent = n + ' / ' + kutular.length + ' video seçildi · en fazla ' + maks;
      oynatmaTumu.textContent = n ? 'Seçimi kaldır' : 'İlk ' + Math.min(maks, kutular.length) + ' videoyu seç';
    }
    oynatmaTumu.addEventListener('click', function () {
      var kutular = [].slice.call(oynatmaListe.querySelectorAll('input'));
      var herhangi = kutular.some(function (k) { return k.checked; });
      var maks = Number(durum.oynatma && durum.oynatma.maksTopluVideo) || MAKS_TOPLU;
      kutular.forEach(function (k, i) { k.checked = !herhangi && i < maks; });
      oynatmaSecim();
    });

    /* --- İndirme --- */
    function dugmeHazir(b, href, dosyaAdi) {
      var a = document.createElement('a');
      a.className = 'btn btn-ana hazir';
      a.href = href;
      a.setAttribute('download', dosyaAdi || '');
      a.innerHTML = ikon('i-tik', 16) + '<span>Kaydet</span>';
      b.replaceWith(a);
    }

    function indir(b) {
      var format = b.dataset.format, kalite = b.dataset.kalite;
      mesaj();
      if (durum.kirpma) return kirpIndir(b, kalite);
      if (durum.oynatma) return topluIndir(b, format, kalite);

      var eski = b.innerHTML;
      b.disabled = true;
      b.innerHTML = '<span class="donen"></span><span>Hazırlanıyor</span>';
      var islem = postJson('/indir/baslat', { url: durum.url, format: format, kalite: kalite, baslik: durum.analiz && durum.analiz.baslik || '' })
        .then(function (v) {
          var href = dosyaLinki(v);
          var ad = (v.dosyaAdi || 'mp3.net.tr') + '.' + v.format;
          dugmeHazir(b, href, ad);
          return { href: href, dosyaAdi: ad, mesaj: format.toUpperCase() + ' dosyanız hazır', dugme: format === 'mp3' ? 'MP3 indir' : 'MP4 indir' };
        });
      Gecis.ac(islem, format === 'mp3' ? 'MP3’e dönüştürülüyor…' : 'Video ' + (kalite || '') + ' hazırlanıyor…')
        .catch(function (h) { b.disabled = false; b.innerHTML = eski; mesaj('hata', h.message); });
    }

    function topluIndir(b, format, kalite) {
      var liste = durum.oynatma.oynatmaListesi || [];
      var secilen = [].slice.call(oynatmaListe.querySelectorAll('input:checked')).map(function (k) { return liste[Number(k.dataset.i)]; }).filter(Boolean);
      if (!secilen.length) return mesaj('hata', 'Lütfen en az bir video seçin.');
      var eski = b.innerHTML;
      b.disabled = true;
      b.innerHTML = '<span class="donen"></span><span>' + secilen.length + ' video</span>';
      topluEl.innerHTML = '';
      var islem = postJson('/indir/toplu', {
        videolar: secilen.map(function (v) { return { url: v.url, baslik: v.baslik }; }), format: format, kalite: kalite
      }).then(function (v) {
        var basarili = (v.sonuclar || []).filter(function (s) { return s.basari; });
        var basarisiz = (v.sonuclar || []).length - basarili.length;
        topluEl.innerHTML = basarili.map(function (s) {
          var ad = String(s.dosyaAdi || 'mp3.net.tr');
          return '<a class="toplu-link" href="' + esc(dosyaLinki(s)) + '" download="' + esc(ad + '.' + s.format) + '"><span>' + esc(ad) + '.' + esc(s.format) + '</span><span>İndir ↓</span></a>';
        }).join('');
        if (basarisiz) mesaj('bilgi', basarisiz + ' video indirilemedi.');
        b.disabled = false; b.innerHTML = eski;
        return { mesaj: basarili.length + ' dosya hazır', dugme: 'Dosyaları göster', tikla: function () { topluEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); } };
      });
      Gecis.ac(islem, secilen.length + ' video hazırlanıyor… (bu biraz sürebilir)')
        .catch(function (h) { b.disabled = false; b.innerHTML = eski; mesaj('hata', h.message); });
    }

    /* --- Kırpma --- */
    var kirp = { sure: 0, bas: 0, bit: 0 };
    function kirpmaKapat() {
      if (!durum.kirpma) { kirpmaEl.hidden = true; return; }
      var v = $('kirpmaVideo');
      try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) {}
      kirpmaEl.hidden = true;
      durum.kirpma = null;
      if (durum.analiz && durum.analiz.formatlar) formatCiz(durum.analiz.formatlar);
      var kb = $('kirpAc'); if (kb) kb.innerHTML = ikon('i-makas', 16) + 'Videoyu kırp';
    }
    function kirpmaAc() {
      var kb = $('kirpAc');
      if (durum.kirpma) return kirpmaKapat();
      kb.disabled = true;
      kb.innerHTML = '<span class="donen"></span>Önizleme hazırlanıyor…';
      postJson('/indir/onizleme', { url: durum.url, baslik: durum.analiz && durum.analiz.baslik || '' }).then(function (v) {
        durum.kirpma = { id: v.onizlemeId };
        var video = $('kirpmaVideo');
        video.src = '/indir/onizleme/' + encodeURIComponent(v.onizlemeId);
        kirpmaEl.hidden = false;
        kb.innerHTML = ikon('i-kapat', 16) + 'Kırpmayı kapat';
        formatCiz((durum.analiz.formatlar || []).filter(function (f) { return f.tur === 'video'; }));
      }).catch(function (h) {
        kb.innerHTML = ikon('i-makas', 16) + 'Videoyu kırp';
        mesaj('hata', h.message);
      }).then(function () { kb.disabled = false; });
    }
    function kirpGuncelle(kaynak) {
      var bas = $('kirpBas'), bit = $('kirpBit');
      kirp.bas = Math.min(Number(bas.value), kirp.sure);
      kirp.bit = Math.min(Number(bit.value), kirp.sure);
      if (kirp.bas >= kirp.bit) {
        if (kaynak === bas) { kirp.bas = Math.max(0, kirp.bit - 1); bas.value = kirp.bas; }
        else { kirp.bit = Math.min(kirp.sure, kirp.bas + 1); bit.value = kirp.bit; }
      }
      $('kirpBasMetin').value = zamanMetni(kirp.bas);
      $('kirpBitMetin').value = zamanMetni(kirp.bit);
      $('kirpBasEtiket').textContent = zamanMetni(kirp.bas);
      $('kirpBitEtiket').textContent = zamanMetni(kirp.bit);
      $('kirpSecim').textContent = 'Seçim: ' + zamanMetni(kirp.bit - kirp.bas);
      var secili = $('kirpSecili');
      secili.style.left = (kirp.sure ? kirp.bas / kirp.sure * 100 : 0) + '%';
      secili.style.width = (kirp.sure ? (kirp.bit - kirp.bas) / kirp.sure * 100 : 0) + '%';
    }
    $('kirpmaVideo').addEventListener('loadedmetadata', function () {
      kirp.sure = Number(this.duration) || 0;
      ['kirpBas', 'kirpBit'].forEach(function (id) { $(id).max = String(kirp.sure); });
      $('kirpBas').value = '0';
      $('kirpBit').value = String(Math.min(kirp.sure, 1800));
      kirpGuncelle();
    });
    $('kirpBas').addEventListener('input', function () { kirpGuncelle(this); var v = $('kirpmaVideo'); v.currentTime = Number(this.value); });
    $('kirpBit').addEventListener('input', function () { kirpGuncelle(this); var v = $('kirpmaVideo'); v.currentTime = Number(this.value); });
    [['kirpBasMetin', 'kirpBas'], ['kirpBitMetin', 'kirpBit']].forEach(function (c) {
      $(c[0]).addEventListener('change', function () {
        var sn = zamanSayisi(this.value);
        if (sn !== null) $(c[1]).value = String(Math.max(0, Math.min(sn, kirp.sure)));
        kirpGuncelle($(c[1]));
      });
    });
    $('kirpmaKapat').addEventListener('click', kirpmaKapat);

    function kirpIndir(b, kalite) {
      if (!kirp.sure) return mesaj('hata', 'Önizleme henüz yüklenmedi.');
      if (kirp.bit - kirp.bas > 1800) return mesaj('hata', 'En fazla 30 dakikalık klip oluşturabilirsiniz.');
      var eski = b.innerHTML;
      b.disabled = true;
      b.innerHTML = '<span class="donen"></span><span>Kırpılıyor</span>';
      var islem = postJson('/indir/kirp', {
        url: durum.url, baslangic: kirp.bas, bitis: kirp.bit, kalite: kalite, baslik: durum.analiz && durum.analiz.baslik || ''
      }).then(function (v) {
        var href = dosyaLinki(v);
        var ad = (v.dosyaAdi || 'mp3.net.tr') + '.mp4';
        dugmeHazir(b, href, ad);
        return { href: href, dosyaAdi: ad, mesaj: 'Klibiniz hazır', dugme: 'Klibi indir' };
      });
      Gecis.ac(islem, 'Klip hazırlanıyor…').catch(function (h) { b.disabled = false; b.innerHTML = eski; mesaj('hata', h.message); });
    }

    /* --- Instagram profil fotoğrafı --- */
    function profilGetir(deger) {
      sifirla();
      yukleniyor(true);
      postJson('/indir/profil', { kullanici: deger }).then(function (yanit) {
        var p = yanit.veri;
        sonucEl.hidden = false;
        medyaEl.hidden = false;
        medyaEl.className = 'profil';
        medyaEl.innerHTML =
          '<div class="profil-kap"><div class="profil-foto"><img src="' + esc(p.gorsel) + '" alt="@' + esc(p.kullaniciAdi) + ' Instagram profil fotoğrafı" width="320" height="320"></div></div>' +
          '<div><p class="profil-ad">' + esc(p.adSoyad || p.kullaniciAdi) + '</p><p class="profil-kullanici">@' + esc(p.kullaniciAdi) + '</p></div>' +
          (p.takipci || p.gonderi ? '<p class="profil-istat"><span><strong>' + sayiKisa(p.takipci) + '</strong> takipçi</span><span><strong>' + sayiKisa(p.gonderi) + '</strong> gönderi</span></p>' : '') +
          (p.gizli ? '<span class="profil-rozet">' + ikon('i-kilit', 14) + 'Gizli hesap · yalnızca profil fotoğrafı herkese açıktır</span>' : '') +
          (p.dusukCozunurluk ? '<span class="profil-rozet">Instagram şu an yalnızca küçük boyutu sunuyor</span>' : '') +
          '<button type="button" class="btn btn-ana" id="profilIndir">' + ikon('i-indir', 18) + '<span>Tam boyut indir</span></button>';
        $('profilIndir').addEventListener('click', function () {
          var ad = p.kullaniciAdi + '-profil-fotografi.jpg';
          Gecis.ac(Promise.resolve({ href: p.indir, dosyaAdi: ad, mesaj: 'Profil fotoğrafı hazır', dugme: 'Fotoğrafı indir' }), 'Fotoğraf hazırlanıyor…');
        });
      }).catch(function (h) { mesaj('hata', h.message); }).then(function () { yukleniyor(false); });
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    temaKur();
    menuKur();
    aracKur();
  });
})();
