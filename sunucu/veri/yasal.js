'use strict';
const site = require('./site');

module.exports = {
  'hakkimizda': {
    baslik: 'Hakkımızda | MP3.NET.TR',
    aciklama: 'MP3.NET.TR, 2023’ten beri YouTube, Instagram, TikTok ve daha fazlasından ücretsiz MP3 ve MP4 indirme hizmeti sunan Türkçe bir çevrim içi araçtır.',
    h1: 'Hakkımızda',
    bolumler: [
      { h2: 'Biz kimiz?', p: ['MP3.NET.TR, internetteki herkese açık videoların sesini ve görüntüsünü basit, hızlı ve ücretsiz biçimde kaydetmek isteyen kullanıcılar için geliştirilmiş Türkçe bir çevrim içi araçtır. 2023’ten bu yana binlerce kullanıcıya hizmet veriyoruz.'] },
      { h2: 'Ne yapıyoruz?', p: ['Bağlantısını yapıştırdığınız videoyu analiz ediyor, MP3 veya MP4 olarak indirilebilir hale getiriyoruz. Kayıt istemiyor, kişisel veri toplamıyor ve hazırlanan dosyaları kısa süre sonra sunucularımızdan otomatik olarak siliyoruz.'] },
      { h2: 'İlkelerimiz', p: ['Sade bir arayüz, dürüst bilgilendirme ve telif haklarına saygı. Gizli hesaplara erişim gibi mümkün olmayan şeyleri vaat etmiyoruz; kullanıcılarımızı dolandırıcı uygulamalara karşı uyarıyoruz.'] }
    ]
  },
  'gizlilik-politikasi': {
    baslik: 'Gizlilik Politikası | MP3.NET.TR',
    aciklama: 'MP3.NET.TR gizlilik politikası: hangi verileri işlediğimizi, çerezleri, reklam ortaklarını ve indirilen dosyaların ne kadar süre saklandığını öğrenin.',
    h1: 'Gizlilik Politikası',
    bolumler: [
      { h2: 'Topladığımız veriler', p: ['Hizmeti kullanmak için hesap oluşturmanız gerekmez; ad, e-posta veya telefon gibi kişisel bilgiler istemeyiz. Kötüye kullanımı önlemek ve istatistik tutmak için IP adresiniz geri döndürülemez biçimde özetlenerek (hash) saklanır.'] },
      { h2: 'İndirilen dosyalar', p: ['Dönüştürülen dosyalar sunucumuzda geçici olarak tutulur ve en geç birkaç saat içinde otomatik olarak silinir. Yapıştırdığınız bağlantılar kişisel kimliğinizle ilişkilendirilmez. Bazı platformlarda (ör. TikTok) içeriğe erişebilmek için bağlantı, kimlik bilgisi içermeden üçüncü taraf bir dönüştürme servisine iletilebilir.'] },
      { h2: 'Çerezler ve reklamlar', p: ['Sitemizde tema tercihiniz gibi küçük ayarları hatırlamak için tarayıcı depolaması kullanılır. Hizmeti ücretsiz sunabilmek için Google AdSense gibi üçüncü taraf reklam sağlayıcılarıyla çalışabiliriz. Bu sağlayıcılar, ilgi alanına dayalı reklam göstermek amacıyla çerez kullanabilir. Kişiselleştirilmiş reklamları Google Reklam Ayarları sayfasından kapatabilirsiniz.'] },
      { h2: 'Haklarınız', p: [`KVKK ve GDPR kapsamındaki talepleriniz için ${site.iletisimEposta} adresinden bize ulaşabilirsiniz.`] }
    ]
  },
  'kullanim-sartlari': {
    baslik: 'Kullanım Şartları | MP3.NET.TR',
    aciklama: 'MP3.NET.TR kullanım şartları: hizmetin kapsamı, kullanıcı sorumlulukları, telif hakları ve sorumluluk reddi hakkında bilmeniz gerekenler.',
    h1: 'Kullanım Şartları',
    bolumler: [
      { h2: 'Hizmetin kapsamı', p: ['MP3.NET.TR, herkese açık çevrim içi içeriklerin kişisel kullanım amacıyla kaydedilmesine yardımcı olan bir araçtır. Hizmet “olduğu gibi” sunulur; kesintisiz veya hatasız çalışacağı garanti edilmez.'] },
      { h2: 'Kullanıcının sorumluluğu', p: ['İndirdiğiniz içeriklerin telif haklarına ve ilgili platformun kullanım koşullarına uymak sizin sorumluluğunuzdadır. Telif hakkı size ait olmayan içerikleri izinsiz çoğaltmayın, yeniden yayımlamayın veya ticari amaçla kullanmayın.'] },
      { h2: 'Yasaklı kullanım', p: ['Hizmeti otomatik araçlarla aşırı yüklemek, kötü amaçlı yazılım dağıtmak veya yasa dışı içerik elde etmek amacıyla kullanmak yasaktır. Bu tür kullanımlar tespit edildiğinde erişim engellenebilir.'] }
    ]
  },
  'dmca-contract': {
    baslik: 'DMCA ve Telif Hakkı Bildirimi | MP3.NET.TR',
    aciklama: 'MP3.NET.TR telif hakkı (DMCA) politikası: hak sahiplerinin ihlal bildirimlerini nasıl iletebileceğini ve sürecin nasıl işlediğini öğrenin.',
    h1: 'DMCA ve Telif Hakkı',
    bolumler: [
      { h2: 'Politikamız', p: ['MP3.NET.TR herhangi bir içeriği barındırmaz, dizinlemez veya yayımlamaz. Dosyalar yalnızca kullanıcının talebi üzerine geçici olarak hazırlanır ve kısa süre sonra silinir. Telif haklarına saygı duyuyor ve hak sahiplerinin bildirimlerini ciddiye alıyoruz.'] },
      { h2: 'Bildirim nasıl yapılır?', p: [`Bir içeriğin hizmetimiz aracılığıyla hakkınızı ihlal edecek şekilde işlendiğini düşünüyorsanız; eserin tanımını, ilgili bağlantıları, iletişim bilgilerinizi ve iyi niyet beyanınızı ${site.iletisimEposta} adresine gönderin. Geçerli bildirimler en kısa sürede değerlendirilir ve ilgili bağlantılar engellenir.`] }
    ]
  },
  'iletisim': {
    baslik: 'İletişim | MP3.NET.TR',
    aciklama: 'MP3.NET.TR ile iletişime geçin: öneri, hata bildirimi, reklam ve telif hakkı talepleri için e-posta adresimiz.',
    h1: 'İletişim',
    bolumler: [
      { h2: 'Bize ulaşın', p: [`Öneri, hata bildirimi, reklam işbirliği veya telif hakkı talepleri için ${site.iletisimEposta} adresine e-posta gönderebilirsiniz. Mesajlara genellikle 2 iş günü içinde yanıt veriyoruz.`] },
      { h2: 'Hata bildirirken', p: ['Sorunu hızlı çözebilmemiz için indirmeye çalıştığınız bağlantıyı, kullandığınız cihazı ve tarayıcıyı ve ekranda gördüğünüz hata mesajını eklemeniz yeterlidir.'] }
    ]
  }
};
