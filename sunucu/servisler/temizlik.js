'use strict';
const fs = require('fs');
const path = require('path');

const GECICI_KLASOR = path.join(__dirname, '..', '..', 'gecici');
const SURE = parseInt(process.env.GECICI_DOSYA_SURESI) || 3600000;

function geciciDosyalariTemizle() {
  if (!fs.existsSync(GECICI_KLASOR)) return;
  const simdi = Date.now();
  fs.readdirSync(GECICI_KLASOR).forEach(dosya => {
    if (dosya === '.gitkeep') return;
    const tam = path.join(GECICI_KLASOR, dosya);
    try {
      const stat = fs.statSync(tam);
      if (simdi - stat.mtimeMs > SURE) fs.unlinkSync(tam);
    } catch {}
  });
}

module.exports = { geciciDosyalariTemizle };
