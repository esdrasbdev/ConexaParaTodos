#!/usr/bin/env node
/* Gera fonts.css embutindo (base64) as fontes de assets/fonts/*.woff2. Uso: node tools/embed-fonts.js */
'use strict';
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), dir = path.join(root, 'assets', 'fonts');
const faces = [
  { file: 'press-start-2p-latin-400-normal.woff2', family: 'Press Start 2P', weight: 400 },
  { file: 'pixelify-sans-latin-400-normal.woff2', family: 'Pixelify Sans', weight: 400 },
  { file: 'pixelify-sans-latin-700-normal.woff2', family: 'Pixelify Sans', weight: 700 }
];
let css = '/* Gerado por tools/embed-fonts.js — fontes pixel (SIL OFL 1.1) embutidas para uso offline. Não edite à mão. */\n';
faces.forEach(function (f) {
  const b64 = fs.readFileSync(path.join(dir, f.file)).toString('base64');
  css += "@font-face { font-family: '" + f.family + "'; font-style: normal; font-weight: " + f.weight + "; font-display: swap; src: url(data:font/woff2;base64," + b64 + ") format('woff2'); }\n";
});
fs.writeFileSync(path.join(root, 'fonts.css'), css);
console.log('fonts.css gerado (' + Math.round(css.length / 1024) + ' KB)');
