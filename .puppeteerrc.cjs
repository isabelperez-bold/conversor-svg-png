const {join} = require('path');

/**
 * @type {import("puppeteer").Configuration}
 */
module.exports = {
  // Le decimos que guarde Chrome en la misma carpeta del proyecto
  cacheDirectory: join(__dirname, '.cache', 'puppeteer'),
};
