/* Conexão para Todos — player.js
 * Equipe de três agentes (marcadores). Um jogador controla um agente por vez; os outros seguem em fila. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const T = 16;

  const AGENTS = [
    { id: 'marcio', name: 'Márcio', role: 'Acessibilidade', shape: 'círculo', pin: 'pinCircle', letter: '1', stat: 'ab', color: '#a58be0',
      about: 'Especialista em acessibilidade: leitores de tela, contraste e acesso para pessoas com deficiência.',
      look: { key: 'marcio', skin: '#6a3f27', hair: '#17121c', shirt: '#a58be0', pants: '#3b4a7a', acc: ['curlyshort', 'badge'], bg: '#d9cffa' } },
    { id: 'miguel', name: 'Miguel', role: 'Acesso', shape: 'quadrado', pin: 'pinSquare', letter: '2', stat: 'ac', color: '#4f84f5',
      about: 'Especialista em acesso: redes, aparelhos simples e conexão fraca.',
      look: { key: 'miguel', skin: '#b07a52', hair: '#14101a', shirt: '#4f84f5', pants: '#3b4a7a', acc: ['bangs', 'beads', 'grafismo', 'badge'], bg: '#bfe0ff' } },
    { id: 'yuri', name: 'Yuri', role: 'Conhecimento', shape: 'triângulo', pin: 'pinTri', letter: '3', stat: 'co', color: '#5fc878',
      about: 'Especialista em ensino: explica passo a passo, com paciência e linguagem simples.',
      look: { key: 'yuri', skin: '#c68c62', hair: '#3a2418', shirt: '#5fc878', pants: '#3b4a7a', acc: ['wavy', 'glasses', 'badge'], bg: '#cdeed4' } }
  ];

  const FRAMES = [0, 1, 0, 3];

  /* Move um agente com colisão. Devolve true se andou. */
  function stepAgent(a, dt, ax, ay, blockedFn) {
    if (!(ax || ay)) { a.frame = 0; a.walk = 0; return false; }
    const n = Math.hypot(ax, ay), vx = (ax / n) * Player.speed * dt, vy = (ay / n) * Player.speed * dt;
    const ox = a.x, oy = a.y;
    if (vx && !blockedFn(a.x + vx - 4, a.y - 5, 8, 5)) a.x += vx;
    if (vy && !blockedFn(a.x - 4, a.y + vy - 5, 8, 5)) a.y += vy;
    if (Math.abs(ax) >= Math.abs(ay) && ax) a.dir = ax > 0 ? 'right' : 'left';
    else if (ay) a.dir = ay > 0 ? 'down' : 'up';
    const moved = Math.hypot(a.x - ox, a.y - oy);
    if (moved > 0.01) { Player.walked += moved; a.walk += dt; a.frame = FRAMES[Math.floor(a.walk * 8) % 4]; return true; }
    a.frame = 0; return false;
  }

  const Player = (CPT.Player = {
    AGENTS: AGENTS, speed: 72, agents: [], order: [0, 1, 2], trail: [], moving: false, moving2: false, walked: 0,
    coop: false, current: 0,
    /* No modo solo há um jogador (líder = order[0]). No co-op: J1 = order[0], J2 = order[1] e order[2] segue o J1. */
    leaderOf: function (n) { return Player.agents[Player.coop && n === 1 ? Player.order[1] : Player.order[0]]; },
    leader: function () { return Player.leaderOf(0); },
    actor: function () { return Player.leaderOf(Player.current); },
    players: function () { return Player.coop ? [Player.leaderOf(0), Player.leaderOf(1)] : [Player.leaderOf(0)]; },
    reset: function (x, y, coop) {
      Player.coop = !!coop; Player.current = 0;
      Player.agents = AGENTS.map(function (d, i) {
        let ax = x + (i === 0 ? 0 : -14 * i), ay = y + (i === 0 ? 0 : 3);
        if (Player.coop) { ax = [x, x + 18, x - 14][i]; ay = [y, y, y + 3][i]; }
        return { def: d, x: ax, y: ay, dir: 'up', frame: 0, walk: 0 };
      });
      Player.order = [0, 1, 2]; Player.trail = []; Player.moving = false; Player.moving2 = false; Player.walked = 0;
      Player.rebuildTrail();
    },
    rebuildTrail: function () {
      const A = Player.agents, o = Player.order;
      const list = Player.coop ? [A[o[2]], A[o[0]]] : [A[o[2]], A[o[1]], A[o[0]]];
      const pts = list.map(function (a) { return { x: a.x, y: a.y }; });
      const tr = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1], dx = b.x - a.x, dy = b.y - a.y, d = Math.max(1, Math.hypot(dx, dy)), n = Math.max(1, Math.round(d / 3));
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        for (let k = 0; k < n; k++) tr.push({ x: a.x + (dx * k) / n, y: a.y + (dy * k) / n, dir: dir });
      }
      const l = pts[pts.length - 1];
      tr.push({ x: l.x, y: l.y, dir: A[o[0]].dir });
      while (tr.length < 14) tr.unshift({ x: tr[0].x, y: tr[0].y, dir: tr[0].dir });
      Player.trail = tr;
    },
    /* Solo: o agente i passa a ser o líder. */
    switchTo: function (i) {
      if (Player.coop) return Player.assign(0, i);
      if (i < 0 || i >= Player.agents.length || Player.order[0] === i) return false;
      Player.order = [i].concat(Player.order.filter(function (k) { return k !== i; }));
      Player.rebuildTrail();
      return true;
    },
    /* Co-op: o jogador p (0 = J1, 1 = J2) assume o agente i. Se o parceiro estiver com ele, trocam de agente. */
    assign: function (p, i) {
      if (!Player.coop || i < 0 || i > 2) return false;
      const o = Player.order, a1 = o[0], a2 = o[1], a3 = o[2];
      let n;
      if (p === 0) { if (i === a1) return false; n = i === a2 ? [a2, a1, a3] : [a3, a2, a1]; }
      else { if (i === a2) return false; n = i === a1 ? [a2, a1, a3] : [a1, a3, a2]; }
      Player.order = n; Player.rebuildTrail();
      return true;
    },
    /* "Próximo agente": solo percorre os 3 em ordem (1→2→3→1); no co-op o jogador pega o agente livre (o que ninguém controla) */
    next: function (p) { return Player.coop ? Player.assign(p || 0, Player.order[2]) : Player.switchTo((Player.order[0] + 1) % Player.agents.length); },
    /* Percorre os 3 agentes em ordem (dir = +1 próximo, -1 anterior). No co-op, se cair no agente do parceiro, os dois trocam. */
    cycle: function (p, dir) {
      const n = Player.agents.length, cur = Player.coop && p === 1 ? Player.order[1] : Player.order[0], target = (cur + (dir || 1) + n) % n;
      return Player.coop ? Player.assign(p || 0, target) : Player.switchTo(target);
    },
    /* ax, ay em {-1,0,1}. No co-op, ax2/ay2 e blockedFn2 movem o J2. Retorna true se alguém se moveu. */
    update: function (dt, ax, ay, blockedFn, ax2, ay2, blockedFn2) {
      const a = Player.leader();
      const m1 = stepAgent(a, dt, ax, ay, blockedFn);
      if (m1) {
        const last = Player.trail[Player.trail.length - 1];
        if (Math.hypot(a.x - last.x, a.y - last.y) >= 3) {
          Player.trail.push({ x: a.x, y: a.y, dir: a.dir });
          if (Player.trail.length > 300) Player.trail.shift();
        }
      }
      let m2 = false;
      if (Player.coop) m2 = stepAgent(Player.leaderOf(1), dt, ax2 || 0, ay2 || 0, blockedFn2 || blockedFn);
      Player.moving = m1; Player.moving2 = m2;
      const followers = Player.coop ? [[Player.order[2], 1]] : [[Player.order[1], 1], [Player.order[2], 2]];
      followers.forEach(function (fk) {
        const f = Player.agents[fk[0]], k = fk[1];
        const idx = Math.max(0, Player.trail.length - 1 - k * 5), p = Player.trail[idx];
        const t = Math.min(1, dt * 14);
        f.x += (p.x - f.x) * t; f.y += (p.y - f.y) * t;
        f.dir = p.dir;
        f.frame = m1 ? FRAMES[Math.floor((a.walk + k * 0.07) * 8) % 4] : 0;
      });
      return m1 || m2;
    }
  });
})();
