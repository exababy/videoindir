'use strict';
const express = require('express');
const yonlendirici = express.Router();

yonlendirici.get('/', (req, res) => {
  res.render('ana', { baslik: 'OzgurAPP Video İndirici' });
});

module.exports = yonlendirici;
