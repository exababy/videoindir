'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const site = require('../veri/site');
const sayfalar = require('../veri/sayfalar');
const reklam = require('./reklam');
const ayarlar = require('./ayarlar');

const GENEL = path.join(__dirname, '..', '..', 'genel');

// Statik dosyalar uzun süre önbelleğe alındığı için içerik değişince URL de
// değişsin diye dosya özetinden bir sürüm üretilir.
function surumHesapla() {
  const ozet = crypto.createHash('md5');
  ['css/site.css', 'js/site.js'].forEach(dosya => {
    try { ozet.update(fs.readFileSync(path.join(GENEL, dosya))); } catch {}
  });
  return ozet.digest('hex').slice(0, 10);
}

const SURUM = surumHesapla();

function yereller(req, res, next) {
  res.locals.site = site;
  res.locals.surum = process.env.NODE_ENV === 'production' ? SURUM : surumHesapla();
  res.locals.yol = req.path;
  res.locals.menu = sayfalar.gruplar();
  res.locals.reklam = reklam.tumunuAl();
  res.locals.maksTopluVideo = ayarlar.tumunuAl().maksTopluVideo;
  next();
}

module.exports = { yereller };
