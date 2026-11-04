/* Conexão para Todos — world.js
 * Mapa em tiles da cidade de Conecta, prédios, personagens, pontos de interesse e colisões. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const T = 16, W = 44, H = 34;

  const BUILDINGS = [
    { id: 'escola', kind: 'escola', name: 'Escola Municipal', x: 3, y: 2, w: 8, h: 6 },
    { id: 'posto', kind: 'posto', name: 'Posto de Saúde', x: 13, y: 2, w: 7, h: 6 },
    { id: 'prefeitura', kind: 'prefeitura', name: 'Prefeitura', x: 24, y: 2, w: 9, h: 6 },
    { id: 'biblioteca', kind: 'biblioteca', name: 'Biblioteca Comunitária', x: 34, y: 2, w: 8, h: 6 },
    { id: 'centro', kind: 'centro', name: 'Centro Comunitário', x: 4, y: 22, w: 9, h: 6 },
    { id: 'padaria', kind: 'padaria', name: 'Padaria Pão & Prosa', x: 14, y: 22, w: 6, h: 6 },
    { id: 'casaA', kind: 'casaA', name: 'Casa do Seu Zeca', x: 25, y: 22, w: 7, h: 6 },
    { id: 'casaB', kind: 'casaB', name: 'Casa da Sofia', x: 33, y: 22, w: 7, h: 6 }
  ];

  /* Áreas que se revelam quando o jogador chega perto */
  const AREAS = [
    { id: 'escola', name: 'Escola Municipal', b: 'escola' },
    { id: 'posto', name: 'Posto de Saúde', b: 'posto' },
    { id: 'prefeitura', name: 'Prefeitura', b: 'prefeitura' },
    { id: 'biblioteca', name: 'Biblioteca Comunitária', b: 'biblioteca' },
    { id: 'centro', name: 'Centro Comunitário', b: 'centro' },
    { id: 'padaria', name: 'Padaria Pão & Prosa', b: 'padaria' },
    { id: 'casaA', name: 'Casa do Seu Zeca', b: 'casaA' },
    { id: 'casaB', name: 'Casa da Sofia', b: 'casaB' },
    { id: 'praca', name: 'Praça Central', rect: { x: 15, y: 10, w: 14, h: 10 } }
  ];

  const NPCS = {
    marta: { id: 'marta', name: 'Dona Marta', role: 'Moradora', tx: 17, ty: 8, area: 'posto', look: { key: 'marta', skin: '#e0b48c', hair: '#dcdce6', shirt: '#c9a5e8', pants: '#5b4b7a', acc: ['bun', 'shawl', 'cane'], bg: '#d9cffa' } },
    thiago: { id: 'thiago', name: 'Thiago', role: 'Estudante', tx: 9, ty: 8, area: 'escola', look: { key: 'thiago', skin: '#a96b43', hair: '#2a2230', shirt: '#4f84f5', pants: '#3b4a7a', acc: ['backpack'], bg: '#bfe0ff' } },
    beto: { id: 'beto', name: 'Beto', role: 'Atendente da Prefeitura', tx: 31, ty: 8, area: 'prefeitura', look: { key: 'beto', skin: '#f1c9a0', hair: '#5a3a22', shirt: '#e8eefc', pants: '#27407f', acc: ['glasses', 'tie'], bg: '#c9d6f5' } },
    helena: { id: 'helena', name: 'Prefeita Helena', role: 'Prefeita de Conecta', tx: 26, ty: 8, area: 'prefeitura', look: { key: 'helena', skin: '#a96b43', hair: '#1f1a28', shirt: '#3b5ba9', pants: '#27407f', acc: ['longhair', 'badge'], bg: '#c9d6f5' } },
    joana: { id: 'joana', name: 'Joana', role: 'Bibliotecária', tx: 40, ty: 9, area: 'biblioteca', look: { key: 'joana', skin: '#f1c9a0', hair: '#7a3a22', shirt: '#5b4b9b', pants: '#3b4a7a', acc: ['glasses', 'longhair'], chair: true, bg: '#dccff3' } },
    lucia: { id: 'lucia', name: 'Tia Lúcia', role: 'Coordenadora do Centro Comunitário', tx: 11, ty: 28, area: 'centro', look: { key: 'lucia', skin: '#7a4a2c', hair: '#2a2230', shirt: '#e0834a', pants: '#3b4a7a', acc: ['curly', 'badge'], bg: '#fbe0c4' } },
    neide: { id: 'neide', name: 'Dona Neide', role: 'Dona da padaria', tx: 19, ty: 28, area: 'padaria', look: { key: 'neide', skin: '#e0b48c', hair: '#5a3a22', shirt: '#e86f5b', pants: '#3b4a7a', acc: ['apron', 'bun'], bg: '#fde3c8' } },
    zeca: { id: 'zeca', name: 'Seu Zeca', role: 'Agricultor', tx: 30, ty: 28, area: 'casaA', look: { key: 'zeca', skin: '#9b6a45', hair: '#d8d8e2', shirt: '#d6a54a', pants: '#4a4a6a', acc: ['cap'], capColor: '#c9a45a', bg: '#f3e2b8' } },
    sofia: { id: 'sofia', name: 'Sofia', role: 'Representante da associação de surdos', tx: 38, ty: 28, area: 'casaB', look: { key: 'sofia', skin: '#e0b48c', hair: '#2a2230', shirt: '#e86f5b', pants: '#3b4a7a', acc: ['longhair'], bg: '#fbd9d2' } },
    raimundo: { id: 'raimundo', name: 'Seu Raimundo', role: 'Morador', tx: 24, ty: 13, area: 'praca', look: { key: 'raimundo', skin: '#d9a273', hair: '#cfcfd8', shirt: '#7a9a5a', pants: '#5a4a3a', acc: ['cap', 'mustache'], capColor: '#8a5a3a', bg: '#d4ecd0' } }
  };

  /* Placas informativas (pontos de interesse) */
  const SIGNS = [
    { id: 's_escola', tx: 3, ty: 10, title: 'Quadro de avisos da escola', text: 'Aula online exige aparelho e internet. Quando falta um dos dois, o aluno fica para trás — e a culpa não é dele.' },
    { id: 's_posto', tx: 13, ty: 10, title: 'Cartaz do posto de saúde', text: 'Marcação pelo aplicativo OU no balcão. Duas portas, mesma consulta.' },
    { id: 's_pref', tx: 32, ty: 10, title: 'Placa da Prefeitura', text: 'Serviço digital bom funciona com teclado, leitor de tela, contraste forte e linguagem simples.' },
    { id: 's_praca', tx: 18, ty: 18, title: 'Placa do Wi-Fi da praça', text: 'Wi-Fi gratuito ajuda muita gente. Em rede aberta, evite digitar senhas e dados do banco.' },
    { id: 's_bib', tx: 33, ty: 10, title: 'Mural da biblioteca', text: 'Ensinar sem humilhar: pergunte, mostre uma vez e deixe a pessoa tentar com as próprias mãos.' },
    { id: 's_pad', tx: 20, ty: 27, title: 'Cartaz da padaria', text: 'Pix só pelo QR Code ou chave oficial. Quem pede pressa e dados demais merece desconfiança.' }
  ];

  /* Postos de trabalho (computadores) das missões 7 e 8 */
  const STATIONS = [
    { id: 'pc1', mission: 'biblioteca', tx: 35, ty: 11, sprite: 'pcPlain', label: 'Computador 1', who: 'Seu Tomás' },
    { id: 'pc2', mission: 'biblioteca', tx: 37, ty: 11, sprite: 'pcPlain', label: 'Computador 2', who: 'Rita' },
    { id: 'pc3', mission: 'biblioteca', tx: 39, ty: 11, sprite: 'pcPlain', label: 'Computador 3', who: 'Dona Cida' },
    { id: 't1', mission: 'portal', tx: 25, ty: 11, sprite: 'pcEar', pad: 'padLilac', label: 'Posto de teste: leitor de tela', agent: 'marcio' },
    { id: 't2', mission: 'portal', tx: 27, ty: 11, sprite: 'pcTurtle', pad: 'padBlue', label: 'Posto de teste: conexão lenta', agent: 'miguel' },
    { id: 't3', mission: 'portal', tx: 29, ty: 11, sprite: 'pcChat', pad: 'padGreen', label: 'Posto de teste: linguagem simples', agent: 'yuri' }
  ];

  const FUND = { id: 'fundo', tx: 13, ty: 27, title: 'Quadro do Fundo da Cidade' };

  /* Objetos colecionáveis (missão 3) */
  const ITEMS = [
    { id: 'tablet', mission: 'estudo', tx: 6, ty: 28, sprite: 'itemTablet', label: 'Tablet emprestado' },
    { id: 'wifi', mission: 'estudo', tx: 20, ty: 14, sprite: 'itemWifi', label: 'Ponto de Wi-Fi da praça' },
    { id: 'caderno', mission: 'estudo', tx: 36, ty: 9, sprite: 'itemBook', label: 'Resumo impresso da biblioteca' }
  ];

  const START = { tx: 21, ty: 19 };

  const World = (CPT.World = {
    T: T, W: W, H: H, BUILDINGS: BUILDINGS, AREAS: AREAS, NPCS: NPCS, SIGNS: SIGNS, STATIONS: STATIONS, ITEMS: ITEMS, FUND: FUND, START: START,
    ground: null, solid: null, statics: [], groundCanvas: null, dynSolids: [], wifiSpots: [], doors: [],
    areaRect: function (a) {
      if (a.rect) return a.rect;
      const b = BUILDINGS.filter(function (q) { return q.id === a.b; })[0];
      return { x: b.x - 1, y: b.y, w: b.w + 2, h: b.h + 4 };
    },
    build: function () {
      const S = CPT.Sprites; S.init();
      const g = (World.ground = new Uint8Array(W * H)), sol = (World.solid = new Uint8Array(W * H));
      const occ = new Uint8Array(W * H);
      const statics = (World.statics = []);
      function fillPath(x0, y0, x1, y1) { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) g[y * W + x] = 1; }
      fillPath(2, 8, 41, 9); fillPath(2, 20, 41, 21); fillPath(2, 28, 41, 29);
      fillPath(2, 8, 3, 29); fillPath(40, 8, 41, 29); fillPath(21, 8, 22, 29);
      for (let y = 11; y <= 18; y++) for (let x = 16; x <= 27; x++) g[y * W + x] = 2;
      function setSolid(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) { sol[y * W + x] = 1; } }
      function setOcc(x, y) { if (x >= 0 && y >= 0 && x < W && y < H) occ[y * W + x] = 1; }
      // prédios
      BUILDINGS.forEach(function (b) {
        for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) { setSolid(x, y); setOcc(x, y); }
        statics.push({ img: S.getBuilding(b.kind, b.w, b.h), x: b.x * T, y: b.y * T, sortY: (b.y + b.h) * T, id: b.id });
        const dw = 20, dx = (((b.w * T) - dw) / 2) | 0;
        b.doorTx = b.x + Math.floor((dx + 10) / T);
        b.frontTy = b.y + b.h;
        World.doors.push({ id: b.id, tx: b.doorTx, ty: b.frontTy, decor: !!b.decor });
      });
      // reservas
      for (let y = 11; y <= 13; y++) for (let x = 24; x <= 41; x++) setOcc(x, y);
      for (let y = 10; y <= 19; y++) for (let x = 15; x <= 28; x++) setOcc(x, y);
      NPCS.raimundo && setOcc(NPCS.raimundo.tx, NPCS.raimundo.ty);
      function put(img, tx, ty, solid, dyOff, sortOff, extra) {
        if (solid) setSolid(tx, ty);
        setOcc(tx, ty);
        const s = { img: img, x: tx * T, y: ty * T + (dyOff || 0), sortY: ty * T + T + (sortOff || 0) };
        if (extra) for (const k in extra) s[k] = extra[k];
        statics.push(s); return s;
      }
      // bordas de árvores
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const border = y <= 1 || y >= 30 || x <= 1 || x >= 42;
        if (border && !occ[y * W + x]) { g[y * W + x] = 0; put(S.tiles['tree' + ((x * 7 + y * 3) % 2)], x, y, true, -8, 0); }
      }
      // fonte e Wi-Fi
      statics.push({ img: S.tiles.fountain, x: 21 * T, y: 14 * T, sortY: 16 * T - 2, id: 'fountain' });
      setSolid(21, 14); setSolid(22, 14); setSolid(21, 15); setSolid(22, 15);
      put(S.tiles.wifiPole, 19, 12, true, -16, 0, { id: 'poste' });
      World.wifiSpots = [{ tx: 19, ty: 12 }];
      [[17, 12], [26, 12], [17, 17], [26, 17], [6, 14], [36, 16], [11, 14], [32, 14]].forEach(function (p) { put(S.tiles.bench, p[0], p[1], true, 0, -2); });
      [[11, 10], [20, 10], [23, 10], [13, 19], [23, 19], [32, 19], [38, 10]].forEach(function (p) { put(S.tiles.lamp, p[0], p[1], true, -16, 0); });
      SIGNS.forEach(function (s) { put(S.tiles.info, s.tx, s.ty, true, 0, 0, { id: s.id }); });
      put(S.tiles.info, FUND.tx, FUND.ty, true, 0, 0, { id: FUND.id });
      // vegetação
      const r = S.rnd(2026);
      for (let y = 2; y < 30; y++) for (let x = 2; x < 42; x++) {
        const i = y * W + x;
        if (g[i] !== 0 || occ[i] || sol[i]) continue;
        const v = r();
        if (v < 0.07 && y !== 10 && y !== 19 && y !== 22 && y !== 27) put(S.tiles['tree' + ((x + y) % 2)], x, y, true, -8, 0);
        else if (v < 0.2) g[i] = 3;
        else if (v < 0.23) { put(S.tiles.hedge, x, y, true, 0, 0); }
      }
      // postos de trabalho
      STATIONS.forEach(function (st) { setSolid(st.tx, st.ty); setOcc(st.tx, st.ty); });
      statics.sort(function (a, b) { return a.sortY - b.sortY; });
      // chão pré-renderizado
      const gc = (World.groundCanvas = S.mk(W * T, H * T)), gx = gc.getContext('2d');
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
        const k = g[y * W + x], h = (x * 31 + y * 17) % 4;
        let t;
        if (k === 1) t = S.tiles['path' + ((x + y) % 2)];
        else if (k === 2) t = S.tiles['plaza' + ((x + y) % 2)];
        else t = S.tiles['grass' + h];
        gx.drawImage(t, x * T, y * T);
        if (k === 3) gx.drawImage(S.tiles.flowers, x * T, y * T);
      }
      // áreas de computadores e consoles
      STATIONS.forEach(function (st) {
        if (st.pad) gx.drawImage(S.tiles[st.pad], st.tx * T, (st.ty + 1) * T);
      });
      return World;
    },
    tileSolid: function (tx, ty) {
      if (tx < 0 || ty < 0 || tx >= W || ty >= H) return true;
      return World.solid[ty * W + tx] === 1;
    },
    /* retângulo (px) colide com algo? */
    blocked: function (x, y, w, h) {
      if (x < 0 || y < 0 || x + w > W * T || y + h > H * T) return true;
      const x0 = Math.floor(x / T), x1 = Math.floor((x + w - 0.001) / T), y0 = Math.floor(y / T), y1 = Math.floor((y + h - 0.001) / T);
      for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) if (World.solid[ty * W + tx]) return true;
      const d = World.dynSolids;
      for (let i = 0; i < d.length; i++) {
        const q = d[i];
        if (x < q.x + q.w && x + w > q.x && y < q.y + q.h && y + h > q.y) return true;
      }
      return false;
    },
    /* Reconstrói retângulos sólidos dinâmicos (personagens) */
    setDynSolids: function () {
      World.dynSolids = Object.keys(NPCS).map(function (k) {
        const n = NPCS[k];
        return { x: n.tx * T + 3, y: n.ty * T + 8, w: 10, h: 7 };
      });
    }
  });
})();
