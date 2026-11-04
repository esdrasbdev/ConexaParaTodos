/* Conexão para Todos — sprites.js
 * Toda a pixel art é desenhada por código em canvas fora da tela (sem arquivos externos). */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const T = 16;

  function mk(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
  function R(g, col, x, y, w, h) { g.fillStyle = col; g.fillRect(x, y, w, h); }
  function rnd(seed) {
    let s = (seed >>> 0) || 1;
    return function () { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }
  function bmp(g, rows, map, ox, oy) {
    for (let y = 0; y < rows.length; y++)
      for (let x = 0; x < rows[y].length; x++) {
        const ch = rows[y][x];
        if (ch !== '.' && map[ch]) { g.fillStyle = map[ch]; g.fillRect(ox + x, oy + y, 1, 1); }
      }
  }

  const INK = '#1f2547';
  const tiles = {};
  const glyphs = {
    cross: ['..###..', '..###..', '#######', '#######', '#######', '..###..', '..###..'],
    heart: ['.##.##.', '#######', '#######', '#######', '.#####.', '..###..', '...#...'],
    pencil: ['.....##', '....###', '...###.', '..###..', '.###...', '##.....', '#......'],
    book: ['.###.###.', '#..#.#..#', '#..#.#..#', '#..#.#..#', '#..#.#..#', '#..#.#..#', '.###.###.'],
    star: ['...#...', '...#...', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'],
    bread: ['..###..', '.#####.', '#######', '#######', '.#####.', '.......', '.......'],
    wifi: ['.#######.', '#.......#', '..#####..', '.#.....#.', '...###...', '.........', '....#....'],
    access: ['....#....', '...###...', '....#....', '#########', '....#....', '...#.#...', '..#...#..', '.#.....#.'],
    ear: ['..###..', '.#...#.', '#..#..#', '#.#...#', '..#..#.', '..#.#..', '...#...'],
    turtle: ['..###...', '.#####.#', '#######.', '#.#.#.#.', '.#...#..'],
    chat: ['#######', '#.....#', '#.###.#', '#.....#', '###.###', '..#.#..', '...#...'],
    info: ['..##..', '..##..', '......', '.###..', '..##..', '..##..', '.####.'],
    lock: ['.####.', '#....#', '#....#', '######', '######', '######', '######'],
    check: ['......#', '.....##', '#...##.', '##.##..', '.###...', '..#....']
  };

  function glyph(name, color, scale) {
    const rows = glyphs[name], c = mk(rows[0].length * scale, rows.length * scale), g = c.getContext('2d');
    g.fillStyle = color;
    for (let y = 0; y < rows.length; y++) for (let x = 0; x < rows[y].length; x++)
      if (rows[y][x] === '#') g.fillRect(x * scale, y * scale, scale, scale);
    return c;
  }
  /* logotipo: Wi-Fi em arcos (25x17 "pixels") */
  function logoWifi(color, scale) {
    const W = 25, H = 17, cx = 12, cy = 15, c = mk(W * scale, H * scale), g = c.getContext('2d');
    g.fillStyle = color;
    const rings = [[3.6, 4.9], [7.6, 8.9], [11.6, 12.9]];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy);
      let on = d <= 1.6;
      if (dy < -1.5 && Math.abs(dx) <= -dy * 1.35) rings.forEach(function (r) { if (d >= r[0] && d <= r[1]) on = true; });
      if (on) g.fillRect(x * scale, y * scale, scale, scale);
    }
    return c;
  }
  const iconCache = {};
  function iconURL(name, color, scale) {
    const k = name + color + scale;
    return iconCache[k] || (iconCache[k] = glyph(name, color, scale || 2).toDataURL());
  }

  /* ---------- tiles de chão ---------- */
  function grass(v) {
    const c = mk(T, T), g = c.getContext('2d'), r = rnd(100 + v * 7);
    R(g, '#5eb36b', 0, 0, T, T);
    for (let i = 0; i < 14; i++) {
      const x = (r() * 15) | 0, y = (r() * 14) | 0;
      R(g, r() < 0.5 ? '#4e9f5d' : '#74c97f', x, y, 1, 1);
      if (r() < 0.4) R(g, '#4e9f5d', x, y + 1, 1, 1);
    }
    return c;
  }
  function pathTile(v) {
    const c = mk(T, T), g = c.getContext('2d');
    R(g, '#eadfc4', 0, 0, T, T);
    for (let row = 0; row < 4; row++) {
      const y = row * 4, off = (row + v) % 2 ? 0 : 4;
      R(g, '#d6c7a4', 0, y, T, 1);
      for (let x = off; x < T; x += 8) R(g, '#d6c7a4', x, y, 1, 4);
      R(g, '#f6eed8', 1 + off, y + 1, 3, 1);
    }
    return c;
  }
  function plazaTile(v) {
    const c = mk(T, T), g = c.getContext('2d');
    for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) {
      R(g, (x + y + v) % 2 ? '#b9c5f0' : '#cbd5f6', x * 8, y * 8, 8, 8);
      R(g, '#a5b3e8', x * 8, y * 8 + 7, 8, 1); R(g, '#a5b3e8', x * 8 + 7, y * 8, 1, 8);
      R(g, '#e3e9fc', x * 8 + 1, y * 8 + 1, 2, 1);
    }
    return c;
  }
  function flowers() {
    const c = mk(T, T), g = c.getContext('2d');
    [[3, 4, '#e86f5b'], [10, 3, '#ffd35c'], [6, 11, '#ffffff'], [12, 12, '#d9a5ff']].forEach(function (f) {
      R(g, f[2], f[0], f[1], 2, 2); R(g, '#2f7d4f', f[0], f[1] + 2, 1, 2);
    });
    return c;
  }
  function tactile() {
    const c = mk(T, T), g = c.getContext('2d');
    for (let x = 1; x < 16; x += 3) { R(g, '#f2c230', x, 5, 2, 2); R(g, '#f2c230', x, 9, 2, 2); }
    return c;
  }
  function ramp() {
    const c = mk(32, 12), g = c.getContext('2d');
    for (let y = 0; y < 12; y++) R(g, '#c9c5d8', 0, y, 32, 1);
    R(g, '#9a95b5', 0, 11, 32, 1); R(g, '#f2c230', 0, 0, 32, 1);
    for (let x = 2; x < 32; x += 6) R(g, '#aaa5c4', x, 3, 2, 6);
    R(g, '#7b76a0', 0, 3, 1, 8); R(g, '#7b76a0', 31, 3, 1, 8);
    return c;
  }

  /* ---------- objetos ---------- */
  function tree(v) {
    const c = mk(16, 24), g = c.getContext('2d');
    R(g, 'rgba(20,50,40,.25)', 3, 21, 11, 3);
    R(g, '#7a5230', 7, 15, 3, 8); R(g, '#5c3b20', 9, 15, 1, 8);
    const dark = v ? '#2c6f6a' : '#2f7d4f', mid = v ? '#3b8f86' : '#3f9a5d', lit = v ? '#6fc3b4' : '#62b974';
    for (let y = 0; y < 17; y++) for (let x = 0; x < 16; x++) {
      const dx = (x - 7.5) / 8, dy = (y - 8) / 8.5, d = dx * dx + dy * dy;
      if (d < 1) R(g, d > 0.72 ? dark : (dx + dy < -0.35 ? lit : mid), x, y, 1, 1);
    }
    [[4, 4], [9, 3], [6, 8], [11, 9], [3, 11]].forEach(function (p) { R(g, lit, p[0], p[1], 2, 1); });
    return c;
  }
  function bench() {
    const c = mk(16, 16), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.2)', 1, 13, 14, 2);
    R(g, '#8a5a3a', 1, 6, 14, 2); R(g, '#a8734a', 1, 6, 14, 1);
    R(g, '#8a5a3a', 1, 9, 14, 3); R(g, '#a8734a', 1, 9, 14, 1);
    R(g, '#4b3a52', 2, 12, 2, 2); R(g, '#4b3a52', 12, 12, 2, 2);
    return c;
  }
  function lamp() {
    const c = mk(16, 32), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.2)', 4, 29, 8, 2);
    R(g, '#3b3f66', 7, 8, 2, 22); R(g, '#3b3f66', 5, 28, 6, 2);
    R(g, '#3b3f66', 4, 5, 8, 3); R(g, '#ffe28a', 5, 1, 6, 5); R(g, '#fff6c9', 6, 2, 2, 2);
    return c;
  }
  function wifiPole() {
    const c = mk(16, 32), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.2)', 3, 29, 10, 2);
    R(g, '#59608c', 7, 10, 2, 20); R(g, '#59608c', 4, 28, 8, 2);
    R(g, '#2a5bd7', 3, 3, 10, 8); R(g, '#4f84f5', 3, 3, 10, 2); R(g, INK, 3, 10, 10, 1);
    g.drawImage(glyph('wifi', '#ffffff', 1), 3, 4);
    return c;
  }
  function fountain() {
    const c = mk(32, 32), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.22)', 3, 27, 26, 4);
    for (let y = 0; y < 28; y++) for (let x = 0; x < 32; x++) {
      const dx = (x - 15.5) / 16, dy = (y - 17) / 11, d = dx * dx + dy * dy;
      if (d < 1) R(g, d > 0.78 ? '#8f86c9' : (d > 0.6 ? '#b7addf' : '#6fb7f0'), x, y, 1, 1);
    }
    R(g, '#8f86c9', 13, 7, 6, 12); R(g, '#b7addf', 13, 7, 2, 12);
    R(g, '#bfe6ff', 12, 5, 8, 3); R(g, '#e8f6ff', 14, 3, 4, 2);
    return c;
  }
  function hedge() {
    const c = mk(16, 16), g = c.getContext('2d'), r = rnd(5);
    R(g, '#2f7d4f', 0, 3, 16, 12); R(g, '#3f9a5d', 0, 3, 16, 3);
    for (let i = 0; i < 10; i++) R(g, '#62b974', (r() * 15) | 0, 3 + ((r() * 10) | 0), 2, 1);
    return c;
  }
  function infoSign() {
    const c = mk(16, 16), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.2)', 3, 14, 10, 2);
    R(g, '#7a5230', 7, 9, 2, 6);
    R(g, '#fff4dc', 2, 1, 12, 9); R(g, '#8a5a3a', 2, 1, 12, 1); R(g, '#8a5a3a', 2, 9, 12, 1);
    R(g, '#8a5a3a', 2, 1, 1, 9); R(g, '#8a5a3a', 13, 1, 1, 9);
    g.drawImage(glyph('info', '#2a5bd7', 1), 5, 2);
    return c;
  }
  function pc(iconName, color) {
    const c = mk(16, 16), g = c.getContext('2d');
    R(g, 'rgba(20,30,50,.2)', 1, 14, 14, 2);
    R(g, '#c9a97a', 0, 10, 16, 4); R(g, '#a8874f', 0, 13, 16, 1);
    R(g, '#3b3f66', 2, 1, 12, 9); R(g, '#86c5ff', 3, 2, 10, 7); R(g, '#bfe2ff', 3, 2, 10, 2);
    R(g, '#3b3f66', 7, 10, 2, 1);
    if (iconName) g.drawImage(glyph(iconName, color || '#1f2547', 1), 4, 3);
    R(g, '#eef0fb', 4, 12, 8, 1);
    return c;
  }
  function pad(col) {
    const c = mk(16, 16), g = c.getContext('2d');
    R(g, col, 1, 2, 14, 13); R(g, 'rgba(255,255,255,.5)', 1, 2, 14, 1);
    R(g, 'rgba(0,0,0,.18)', 1, 14, 14, 1);
    return c;
  }
  function item(kind) {
    const c = mk(14, 14), g = c.getContext('2d');
    if (kind === 'tablet') {
      R(g, INK, 2, 2, 10, 11); R(g, '#86c5ff', 3, 3, 8, 8); R(g, '#e8f6ff', 3, 3, 8, 2);
      R(g, '#ffd35c', 6, 12, 2, 1);
    } else if (kind === 'wifi') {
      R(g, '#59608c', 6, 7, 2, 6); R(g, '#2a5bd7', 2, 1, 10, 6);
      g.drawImage(glyph('wifi', '#ffffff', 1), 2, 1);
    } else {
      R(g, '#6f55b8', 2, 2, 10, 11); R(g, '#a58be0', 3, 2, 8, 10); R(g, '#fff4dc', 4, 4, 6, 1);
      R(g, '#fff4dc', 4, 6, 6, 1); R(g, '#fff4dc', 4, 8, 4, 1);
    }
    return c;
  }

  /* ---------- prédios ---------- */
  function building(wT, hT, o) {
    const w = wT * T, h = hT * T, c = mk(w, h), g = c.getContext('2d');
    const roofH = Math.round(h * 0.42);
    R(g, o.wall, 0, roofH - 4, w, h - roofH + 4);
    for (let y = roofH + 4; y < h; y += 6) R(g, o.wall2, 0, y, w, 1);
    R(g, o.wall2, 0, h - 2, w, 2);
    for (let y = 2; y < roofH; y++) {
      const row = ((y - 2) / 4) | 0, off = row % 2 ? 4 : 0;
      R(g, row % 2 ? o.roof2 : o.roof, 0, y, w, 1);
      if ((y - 2) % 4 === 3) R(g, o.roofDark, 0, y, w, 1);
      for (let x = off; x < w; x += 8) R(g, o.roofDark, x, y, 1, 1);
    }
    R(g, o.roof2, 0, 0, w, 2); R(g, o.roofDark, 0, roofH, w, 1); R(g, 'rgba(0,0,0,.2)', 0, roofH + 1, w, 3);
    const dw = 20, dh = 28, dx = ((w - dw) / 2) | 0, dy = h - dh;
    const sideW = dx - 6, n = Math.max(1, Math.floor(sideW / 20));
    for (let side = 0; side < 2; side++) for (let i = 0; i < n; i++) {
      const gap = sideW / n, wx = Math.round((side ? dx + dw + 6 : 4) + gap * i + (gap - 12) / 2), wy = roofH + 8;
      R(g, o.trim, wx - 1, wy - 1, 14, 16); R(g, '#8ec5ff', wx, wy, 12, 14); R(g, '#c9e6ff', wx, wy, 12, 4);
      R(g, o.trim, wx + 5, wy, 2, 14); R(g, o.trim, wx, wy + 6, 12, 1);
    }
    R(g, o.trim, dx - 2, dy - 2, dw + 4, dh + 2);
    R(g, o.door, dx, dy, dw, dh); R(g, 'rgba(255,255,255,.18)', dx, dy, dw, 2);
    R(g, 'rgba(0,0,0,.2)', (dx + dw / 2) | 0, dy, 1, dh); R(g, '#ffd35c', dx + dw / 2 - 3, dy + 14, 2, 2); R(g, '#ffd35c', dx + dw / 2 + 2, dy + 14, 2, 2);
    R(g, '#bdb7c9', dx - 4, h - 3, dw + 8, 3);
    if (o.icon) {
      const sx = ((w - 30) / 2) | 0, sy = dy - 16;
      R(g, INK, sx - 1, sy - 1, 32, 14); R(g, o.sign || '#fff4dc', sx, sy, 30, 12);
      const gl = glyphs[o.icon], gw = gl[0].length, gh = gl.length;
      g.drawImage(glyph(o.icon, o.iconColor || INK, 1), sx + ((30 - gw) >> 1), sy + ((12 - gh) >> 1));
    }
    if (o.awning) {
      for (let x = 0; x < dw + 16; x += 4) {
        R(g, (x / 4) % 2 ? '#ffffff' : o.awning, dx - 8 + x, dy - 22, 4, 5);
        R(g, 'rgba(0,0,0,.15)', dx - 8 + x, dy - 18, 4, 1);
      }
    }
    if (o.flag) { R(g, '#59608c', ((w / 2) | 0) - 1, -0, 2, 6); }
    return c;
  }
  const PAL = {
    escola: { wall: '#f6dfae', wall2: '#e8c98a', roof: '#6f55b8', roof2: '#8b73d4', roofDark: '#59439a', trim: '#fff4dc', door: '#c0583f', icon: 'pencil', sign: '#fff4dc', iconColor: '#6f55b8' },
    posto: { wall: '#eaf6f3', wall2: '#cfe6e0', roof: '#2f9a94', roof2: '#46b4ac', roofDark: '#237b76', trim: '#ffffff', door: '#3b6fd4', icon: 'cross', sign: '#ffffff', iconColor: '#e24a4a' },
    prefeitura: { wall: '#e4e8f8', wall2: '#c7cfec', roof: '#3b5ba9', roof2: '#5276c9', roofDark: '#2c4688', trim: '#ffffff', door: '#27407f', icon: 'star', sign: '#fff4dc', iconColor: '#e0834a', flag: true },
    biblioteca: { wall: '#dccff3', wall2: '#c3b2e6', roof: '#5b4b9b', roof2: '#7461ba', roofDark: '#483a7f', trim: '#fff4dc', door: '#3d3270', icon: 'book', sign: '#fff4dc', iconColor: '#5b4b9b' },
    centro: { wall: '#f9e3c9', wall2: '#eac9a2', roof: '#e0834a', roof2: '#f09d62', roofDark: '#bf6a38', trim: '#fff4dc', door: '#3b6fd4', icon: 'heart', sign: '#fff4dc', iconColor: '#e24a6a' },
    padaria: { wall: '#fdebd3', wall2: '#efd0a5', roof: '#c9553f', roof2: '#e06c55', roofDark: '#a43f2e', trim: '#ffffff', door: '#6f4a2e', icon: 'bread', sign: '#fff4dc', iconColor: '#b9772e', awning: '#e24a4a' },
    casaA: { wall: '#cfe9d8', wall2: '#b4d6c0', roof: '#4a7fc1', roof2: '#6296d8', roofDark: '#3a669f', trim: '#ffffff', door: '#8a5a3a' },
    casaB: { wall: '#f2d7e6', wall2: '#e0bcd3', roof: '#8b5e3c', roof2: '#a5764f', roofDark: '#6f4a2e', trim: '#ffffff', door: '#3b6fd4' }
  };

  /* ---------- personagens ---------- */
  function charSprite(o, dir, frame) {
    const c = mk(16, 24), g = c.getContext('2d');
    const skin = o.skin, hair = o.hair, shirt = o.shirt, pants = o.pants || '#3b4a7a', shoe = '#2a2a3a';
    const step = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    const acc = o.acc || [];
    const has = function (a) { return acc.indexOf(a) >= 0; };
    R(g, 'rgba(20,30,50,.28)', 3, 21, 10, 3);
    const side = dir === 'left' || dir === 'right';
    const fx = dir === 'left' ? -1 : 1; // direção do rosto
    if (has('backpack') && dir === 'up') R(g, '#e86f5b', 4, 10, 8, 6);
    if (o.chair) {
      R(g, '#3a3f55', 2, 14, 3, 7); R(g, '#8f96b5', 3, 15, 1, 5);
      R(g, '#3a3f55', 11, 14, 3, 7); R(g, '#8f96b5', 12, 15, 1, 5);
      R(g, '#4b5170', 4, 16, 8, 3);
      R(g, pants, 5, 15, 6, 3);
      R(g, shoe, 5, 18, 6, 1);
    } else if (side) {
      R(g, pants, 6 + step, 16, 2, 5 - (step === 1 ? 1 : 0)); R(g, shoe, 6 + step, step === 1 ? 20 : 21, 3, 1);
      R(g, pants, 8 - step, 16, 2, 5 - (step === -1 ? 1 : 0)); R(g, shoe, 8 - step, step === -1 ? 20 : 21, 3, 1);
    } else {
      const lL = step === 1 ? 4 : 5, rL = step === -1 ? 4 : 5;
      R(g, pants, 5, 16, 3, lL); R(g, shoe, 5, 16 + lL, 3, 1);
      R(g, pants, 8, 16, 3, rL); R(g, shoe, 8, 16 + rL, 3, 1);
    }
    R(g, pants, 4, 15, 8, 2);
    R(g, shirt, 4, 10, 8, 6);
    R(g, 'rgba(255,255,255,.2)', 4, 10, 8, 1);
    if (has('grafismo')) { for (let gx = 4; gx < 12; gx++) R(g, gx % 2 ? '#e24a4a' : INK, gx, 14, 1, 1); R(g, '#fff4dc', 4, 15, 8, 1); }
    if (has('badge') && dir === 'down') { R(g, '#ffd35c', 8, 12, 2, 2); R(g, INK, 7, 10, 1, 2); }
    if (has('apron') && dir !== 'up') R(g, '#fff4dc', 5, 12, 6, 4);
    if (has('tie') && dir === 'down') { R(g, '#e24a4a', 7, 10, 2, 5); }
    if (has('shawl')) { R(g, '#a58be0', 3, 10, 10, 3); R(g, '#8b73d4', 3, 12, 10, 1); }
    if (has('beads') && dir !== 'up') {
      if (dir === 'down') { R(g, '#e86f5b', 6, 10, 1, 1); R(g, '#ffd35c', 7, 11, 1, 1); R(g, '#fff4dc', 8, 11, 1, 1); R(g, '#ffd35c', 9, 11, 1, 1); R(g, '#e86f5b', 10, 10, 1, 1); }
      else { R(g, '#e86f5b', 7, 10, 1, 1); R(g, '#ffd35c', 8, 11, 1, 1); }
    }
    if (has('backpack') && dir === 'down') { R(g, '#e86f5b', 5, 10, 1, 5); R(g, '#e86f5b', 10, 10, 1, 5); }
    if (has('backpack') && side) R(g, '#e86f5b', dir === 'left' ? 10 : 2, 10, 4, 6);
    if (side) {
      R(g, shirt, 7, 10, 2, 5 - Math.abs(step)); R(g, skin, 7, 14 - Math.abs(step), 2, 1);
    } else {
      R(g, shirt, 2, 10, 2, 4 - (step === 1 ? 1 : 0)); R(g, skin, 2, 14 - (step === 1 ? 1 : 0), 2, 1);
      R(g, shirt, 12, 10, 2, 4 - (step === -1 ? 1 : 0)); R(g, skin, 12, 14 - (step === -1 ? 1 : 0), 2, 1);
    }
    if (has('cane')) { R(g, '#8a6a4a', dir === 'left' ? 4 : 12, 14, 1, 8); R(g, '#8a6a4a', dir === 'left' ? 3 : 12, 14, 2, 1); }
    R(g, skin, 7, 9, 2, 1);
    R(g, skin, 4, 3, 8, 7);
    if (has('longhair') && dir !== 'up') { R(g, hair, 3, 3, 2, 8); R(g, hair, 11, 3, 2, 8); }
    if (dir === 'up') {
      R(g, hair, 4, 2, 8, 8);
      if (has('longhair')) R(g, hair, 3, 3, 10, 9);
      if (has('curlyshort')) { R(g, hair, 4, 1, 2, 1); R(g, hair, 7, 1, 2, 1); R(g, hair, 10, 1, 2, 1); R(g, hair, 3, 3, 1, 4); R(g, hair, 12, 3, 1, 4); }
      if (has('bangs')) R(g, hair, 3, 3, 10, 7);
      if (has('wavy')) { R(g, hair, 4, 1, 5, 1); R(g, hair, 3, 3, 1, 3); R(g, hair, 12, 3, 1, 3); }
    } else {
      R(g, hair, 4, 2, 8, 3);
      if (dir === 'down') { R(g, hair, 4, 4, 1, 2); R(g, hair, 11, 4, 1, 2); }
      else { R(g, hair, fx > 0 ? 4 : 9, 3, 3, 6); }
      if (has('bun')) R(g, hair, 6, 0, 4, 3);
      if (has('curly')) { R(g, hair, 3, 1, 10, 4); R(g, hair, 3, 4, 2, 3); R(g, hair, 11, 4, 2, 3); }
      if (has('curlyshort')) { R(g, hair, 4, 1, 2, 1); R(g, hair, 7, 1, 2, 1); R(g, hair, 10, 1, 2, 1); R(g, hair, 3, 3, 1, 2); R(g, hair, 12, 3, 1, 2); }
      if (has('bangs')) { R(g, hair, 4, 4, 8, 1); if (dir === 'down') { R(g, hair, 3, 3, 1, 6); R(g, hair, 12, 3, 1, 6); } else R(g, hair, fx > 0 ? 3 : 9, 3, 4, 6); }
      if (has('wavy')) { R(g, hair, 4, 1, 5, 1); if (dir === 'down') { R(g, hair, 4, 4, 3, 1); R(g, hair, 3, 3, 1, 3); R(g, hair, 12, 3, 1, 2); } else R(g, hair, fx > 0 ? 4 : 9, 3, 3, 6); }
      if (dir === 'down') {
        if (has('glasses')) { R(g, INK, 5, 6, 3, 3); R(g, '#e8f6ff', 6, 7, 1, 1); R(g, INK, 9, 6, 3, 3); R(g, '#e8f6ff', 10, 7, 1, 1); R(g, INK, 8, 7, 1, 1); }
        else { R(g, INK, 6, 7, 1, 2); R(g, INK, 10, 7, 1, 2); }
        R(g, '#b5544a', 7, 9, 3, 1);
        if (has('mustache')) R(g, '#cfcfd8', 6, 9, 5, 1);
      } else {
        const ex = fx > 0 ? 9 : 6;
        if (has('glasses')) { R(g, INK, ex - 1, 6, 3, 3); R(g, '#e8f6ff', ex, 7, 1, 1); }
        else R(g, INK, ex, 7, 1, 2);
        R(g, skin, fx > 0 ? 12 : 3, 7, 1, 2);
      }
    }
    if (has('cap')) {
      R(g, o.capColor || '#2a5bd7', 3, 1, 10, 3);
      if (dir === 'down') R(g, '#1f3f9a', 3, 4, 10, 1);
      else if (side) R(g, '#1f3f9a', fx > 0 ? 10 : 2, 4, 4, 1);
    }
    if (has('headphones')) { R(g, '#f2a24b', 3, 5, 1, 4); R(g, '#f2a24b', 12, 5, 1, 4); R(g, '#f2a24b', 4, 1, 8, 1); }
    return c;
  }
  const charCache = {};
  function character(look, dir, frame) {
    const key = look.key + dir + frame;
    return charCache[key] || (charCache[key] = charSprite(look, dir, frame));
  }

  function portrait(o) {
    const c = mk(32, 32), g = c.getContext('2d');
    const acc = o.acc || [];
    const has = function (a) { return acc.indexOf(a) >= 0; };
    R(g, o.bg || '#d9cffa', 0, 0, 32, 32); R(g, 'rgba(255,255,255,.35)', 0, 0, 32, 10);
    R(g, o.shirt, 3, 25, 26, 7); R(g, o.shirt, 5, 23, 22, 3); R(g, 'rgba(255,255,255,.2)', 5, 23, 22, 1);
    if (has('shawl')) { R(g, '#a58be0', 3, 24, 26, 4); R(g, '#8b73d4', 3, 27, 26, 1); }
    if (has('tie')) R(g, '#e24a4a', 15, 25, 2, 7);
    if (has('apron')) R(g, '#fff4dc', 9, 27, 14, 5);
    if (has('grafismo')) { for (let gx = 4; gx < 28; gx += 2) R(g, (gx / 2) % 2 ? '#e24a4a' : INK, gx, 29, 2, 2); R(g, '#fff4dc', 4, 31, 24, 1); }
    if (has('badge')) { R(g, '#ffd35c', 20, 27, 4, 4); }
    R(g, o.skin, 13, 20, 6, 5);
    if (has('beads')) { R(g, '#e86f5b', 11, 24, 2, 2); R(g, '#ffd35c', 14, 25, 2, 2); R(g, '#fff4dc', 17, 25, 2, 2); R(g, '#ffd35c', 20, 24, 2, 2); }
    if (has('longhair')) { R(g, o.hair, 6, 8, 20, 18); }
    if (has('curly')) { R(g, o.hair, 5, 5, 22, 14); R(g, o.hair, 5, 14, 4, 8); R(g, o.hair, 23, 14, 4, 8); }
    for (let y = 7; y < 22; y++) for (let x = 8; x < 24; x++) {
      const dx = (x - 15.5) / 8, dy = (y - 14) / 8; if (dx * dx + dy * dy < 1.05) R(g, o.skin, x, y, 1, 1);
    }
    R(g, o.hair, 8, 5, 16, 6); R(g, o.hair, 8, 8, 2, 5); R(g, o.hair, 22, 8, 2, 5);
    if (has('bun')) R(g, o.hair, 12, 2, 8, 4);
    if (has('curlyshort')) { R(g, o.hair, 9, 3, 4, 3); R(g, o.hair, 14, 2, 4, 4); R(g, o.hair, 19, 3, 4, 3); R(g, o.hair, 7, 7, 2, 5); R(g, o.hair, 23, 7, 2, 5); }
    if (has('bangs')) { R(g, o.hair, 8, 5, 16, 7); R(g, o.hair, 7, 8, 2, 11); R(g, o.hair, 23, 8, 2, 11); }
    if (has('wavy')) { R(g, o.hair, 10, 3, 6, 2); R(g, o.hair, 16, 4, 5, 1); R(g, o.hair, 8, 9, 7, 2); R(g, o.hair, 20, 9, 4, 1); R(g, o.hair, 7, 7, 2, 4); R(g, o.hair, 23, 7, 2, 3); }
    R(g, 'rgba(0,0,0,.08)', 9, 11, 14, 1);
    if (has('glasses')) {
      R(g, INK, 10, 13, 5, 5); R(g, '#e8f6ff', 11, 14, 3, 3); R(g, INK, 17, 13, 5, 5); R(g, '#e8f6ff', 18, 14, 3, 3); R(g, INK, 15, 14, 2, 1);
      R(g, INK, 12, 15, 1, 2); R(g, INK, 19, 15, 1, 2);
    } else {
      R(g, INK, 12, 14, 2, 3); R(g, INK, 18, 14, 2, 3); R(g, '#ffffff', 12, 14, 1, 1); R(g, '#ffffff', 18, 14, 1, 1);
    }
    R(g, 'rgba(240,110,110,.4)', 9, 18, 3, 2); R(g, 'rgba(240,110,110,.4)', 20, 18, 3, 2);
    R(g, '#b5544a', 14, 20, 4, 1); R(g, '#b5544a', 13, 19, 1, 1); R(g, '#b5544a', 18, 19, 1, 1);
    if (has('mustache')) R(g, '#cfcfd8', 12, 18, 8, 2);
    if (has('cap')) { R(g, o.capColor || '#2a5bd7', 7, 4, 18, 6); R(g, '#1f3f9a', 7, 10, 18, 2); }
    if (has('headphones')) { R(g, '#f2a24b', 6, 11, 3, 8); R(g, '#f2a24b', 23, 11, 3, 8); R(g, '#f2a24b', 8, 3, 16, 2); }
    return c;
  }
  const portCache = {};
  function portraitURL(look) {
    return portCache[look.key] || (portCache[look.key] = portrait(look).toDataURL());
  }

  /* ---------- marcadores ---------- */
  function bubble(kind) {
    const c = mk(13, 15), g = c.getContext('2d');
    const col = { new: '#ffd35c', doing: '#8ec5ff', done: '#7fd18a', lock: '#c9c5d8' }[kind];
    R(g, INK, 1, 0, 11, 12); R(g, INK, 0, 1, 13, 10); R(g, col, 1, 1, 11, 10);
    R(g, INK, 5, 12, 3, 2); R(g, INK, 6, 14, 1, 1);
    R(g, col, 5, 11, 3, 1);
    R(g, 'rgba(255,255,255,.55)', 2, 2, 5, 1);
    if (kind === 'new') { R(g, INK, 6, 2, 2, 5); R(g, INK, 6, 8, 2, 2); }
    else if (kind === 'doing') { R(g, INK, 3, 6, 2, 2); R(g, INK, 6, 6, 2, 2); R(g, INK, 9, 6, 2, 2); }
    else if (kind === 'done') g.drawImage(glyph('check', INK, 1), 3, 3);
    else g.drawImage(glyph('lock', INK, 1), 3, 3);
    return c;
  }
  function agentPin(shape, color, letter) {
    const c = mk(11, 12), g = c.getContext('2d');
    const rows = { '1': ['.#.', '##.', '.#.', '.#.', '###'], '2': ['###', '..#', '###', '#..', '###'], '3': ['###', '..#', '###', '..#', '###'] }[letter];
    if (shape === 'circle') {
      R(g, INK, 3, 0, 5, 9); R(g, INK, 1, 1, 9, 7); R(g, INK, 0, 2, 11, 5);
      R(g, color, 3, 1, 5, 7); R(g, color, 1, 2, 9, 5); R(g, color, 2, 1, 7, 7);
    } else if (shape === 'square') {
      R(g, INK, 0, 0, 11, 9); R(g, color, 1, 1, 9, 7);
    } else {
      for (let y = 0; y < 9; y++) { const hw = 1 + ((y * 5) / 8) | 0; R(g, INK, 5 - hw - 1 + 0, y, hw * 2 + 3, 1); }
      for (let y = 1; y < 9; y++) { const hw = (y * 5) / 8 | 0; R(g, color, 5 - hw, y, hw * 2 + 1, 1); }
    }
    R(g, INK, 5, 9, 1, 3);
    const lx = 4, ly = shape === 'triangle' ? 3 : 2;
    for (let y = 0; y < 5; y++) for (let x = 0; x < 3; x++) if (rows[y][x] === '#') R(g, INK, lx + x, ly + y, 1, 1);
    return c;
  }
  function arrowDown() {
    const c = mk(9, 7), g = c.getContext('2d');
    R(g, INK, 0, 0, 9, 2); R(g, INK, 1, 2, 7, 2); R(g, INK, 2, 4, 5, 2); R(g, INK, 3, 6, 3, 1);
    R(g, '#ffd35c', 1, 1, 7, 1); R(g, '#ffd35c', 2, 2, 5, 2); R(g, '#ffd35c', 3, 4, 3, 1);
    return c;
  }

  /* ---------- inicialização ---------- */
  const S = CPT.Sprites = {
    T: T, tiles: tiles, glyph: glyph, iconURL: iconURL, character: character, portraitURL: portraitURL,
    logoWifiURL: function (color, scale) { return logoWifi(color, scale || 4).toDataURL(); },
    mk: mk, R: R, rnd: rnd, PAL: PAL, bmp: bmp, INK: INK, bld: {}, built: false,
    init: function () {
      if (S.built) return;
      for (let i = 0; i < 4; i++) tiles['grass' + i] = grass(i);
      tiles.path0 = pathTile(0); tiles.path1 = pathTile(1);
      tiles.plaza0 = plazaTile(0); tiles.plaza1 = plazaTile(1);
      tiles.flowers = flowers(); tiles.tactile = tactile(); tiles.ramp = ramp();
      tiles.tree0 = tree(0); tiles.tree1 = tree(1);
      tiles.bench = bench(); tiles.lamp = lamp(); tiles.wifiPole = wifiPole(); tiles.fountain = fountain();
      tiles.hedge = hedge(); tiles.info = infoSign();
      tiles.pcPlain = pc('', ''); tiles.pcEar = pc('ear', '#6f55b8'); tiles.pcTurtle = pc('turtle', '#2a7d4f'); tiles.pcChat = pc('chat', '#2a5bd7');
      tiles.padLilac = pad('rgba(165,139,224,.55)'); tiles.padBlue = pad('rgba(79,132,245,.5)'); tiles.padGreen = pad('rgba(95,200,120,.55)');
      tiles.itemTablet = item('tablet'); tiles.itemWifi = item('wifi'); tiles.itemBook = item('book');
      tiles.bNew = bubble('new'); tiles.bDoing = bubble('doing'); tiles.bDone = bubble('done'); tiles.bLock = bubble('lock');
      tiles.arrow = arrowDown();
      tiles.pinCircle = agentPin('circle', '#a58be0', '1'); tiles.pinSquare = agentPin('square', '#4f84f5', '2'); tiles.pinTri = agentPin('triangle', '#5fc878', '3');
      S.built = true;
    },
    getBuilding: function (kind, wT, hT) {
      const k = kind + wT + 'x' + hT;
      return S.bld[k] || (S.bld[k] = building(wT, hT, PAL[kind]));
    }
  };
})();
