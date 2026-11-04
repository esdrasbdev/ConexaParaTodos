/* Conexão para Todos — game.js
 * Estado do jogo, laço principal, câmera, desenho do mundo em pixel art, entrada (teclado/mouse/toque),
 * interações, status coletivos (com efeitos reais), Fundo da Cidade e condição de vitória. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const T = 16;
  const $ = function (s) { return document.querySelector(s); };
  const $$ = function (s) { return Array.prototype.slice.call(document.querySelectorAll(s)); };

  const keys = {}, keys2 = {};
  const touch = { x: 0, y: 0 };
  let canvas, ctx, mini, mctx, stage;
  let cam = { x: 0, y: 0 }, time = 0, last = 0, particles = [], targets = [null, null], promptKeys = ['', ''], objective = null, hintShown = false;

  const Game = (CPT.Game = {
    GOAL: 60, PORTAL_NEEDS: 7, HINT_AT: 45, FUND_MAX: 3, FUND_GAIN: 6, MUTIRAO_GAIN: 2,
    START_STATS: { ac: 40, ab: 30, co: 35 }, START_PTS: 5,
    state: null, busy: 0, paused: false, mode: 'title', ready: false, coopMode: false, lastKeyTime: 0,

    /* ---------- inicialização ---------- */
    init: function () {
      canvas = $('#world'); ctx = canvas.getContext('2d'); stage = $('#stage');
      mini = $('#minimap'); mctx = mini.getContext('2d');
      CPT.World.build(); CPT.World.setDynSolids();
      CPT.UI.buildHUD();
      Game.state = Game.freshState();
      CPT.Player.reset(CPT.World.START.tx * T + 8, CPT.World.START.ty * T + 12, Game.coopMode);
      Game.bind();
      Game.ready = true;
      last = performance.now();
      requestAnimationFrame(Game.frame);
    },
    freshState: function () {
      return {
        stats: Object.assign({}, Game.START_STATS), start: Object.assign({}, Game.START_STATS), pts: Game.START_PTS,
        missions: CPT.Missions.initState(), discovered: {}, signs: {}, tracked: null, log: [], fund: { ac: 0, ab: 0, co: 0 },
        mutiraoUsed: 0, won: false, allDoneToast: false, portalToast: false, moved: false
      };
    },
    block: function (n) { Game.busy = Math.max(0, Game.busy + n); },
    frozen: function () { return Game.busy > 0 || CPT.Modal.stack.length > 0; },

    /* ---------- fluxo de telas ---------- */
    showScreen: function (id) {
      ['screen-title', 'screen-game'].forEach(function (s) { $('#' + s).classList.toggle('hidden', s !== id); });
      Game.mode = id === 'screen-game' ? 'play' : 'title';
      window.dispatchEvent(new Event('resize'));
    },
    newGame: function (quiet) {
      Game.state = Game.freshState();
      Game.busy = 0; Game.paused = false;
      CPT.Player.reset(CPT.World.START.tx * T + 8, CPT.World.START.ty * T + 12, Game.coopMode);
      particles = []; promptKeys = ['', '']; targets = [null, null]; hintShown = false;
      keys.up = keys.down = keys.left = keys.right = false; keys2.up = keys2.down = keys2.left = keys2.right = false;
      Game.showScreen('screen-game');
      Game.snapCamera(); Game.discoverCheck(true);
      Game.refresh();
      $('#dialogue').classList.add('hidden');
      CPT.Dialogue.isOpen() && CPT.Dialogue.close();
      Game.block(0);
      if (!quiet) Game.toast('<b>Nova partida!</b> Siga a seta amarela até o primeiro objetivo.', 5000);
    },
    /* Jogar: história + tutorial curto, depois a partida começa */
    startFlow: async function (coop) {
      CPT.Sound.init();
      Game.coopMode = !!coop;
      Game.newGame(true);
      Game.block(1);
      try {
        await CPT.UI.introStory();
        await CPT.UI.pages('Como jogar', CPT.UI.howToPages(Game.coopMode), { skip: 'Pular tutorial', finish: 'Começar a jogar' });
      } finally { Game.block(-1); }
      Game.refresh();
      Game.toast('Siga a <b>seta amarela</b> até o primeiro objetivo.', 5000);
    },
    toTitle: function () {
      CPT.Modal.closeAll(); Game.busy = 0; Game.paused = false;
      if (CPT.Dialogue.isOpen()) CPT.Dialogue.close();
      $('#dialogue').classList.add('hidden');
      Game.showScreen('screen-title');
    },

    /* ---------- status ---------- */
    clamp: function (v) { return Math.max(0, Math.min(100, v)); },
    applyFx: function (fx, reason) {
      const st = Game.state, out = [], parts = [];
      ['ac', 'ab', 'co'].forEach(function (k) {
        if (!fx || !fx[k]) return;
        const before = st.stats[k], after = Game.clamp(before + fx[k]);
        st.stats[k] = after;
        out.push({ key: k, delta: Math.round(after) - Math.round(before) });
        if (Math.round(after) !== Math.round(before)) parts.push(CPT.STATS[k].name + ' ' + (after > before ? '+' : '') + (Math.round(after) - Math.round(before)));
      });
      if (parts.length) { st.log.push((reason || 'Ação') + ': ' + parts.join(', ')); if (st.log.length > 40) st.log.shift(); }
      Game.refresh(true);
      return out;
    },
    addPts: function (n) {
      const st = Game.state; st.pts += n;
      st.log.push('Pontos de Comunidade +' + n); Game.refresh();
    },
    doneCount: function (excludePortal) {
      return CPT.Missions.list.filter(function (m) { return Game.state.missions[m.id].status === 'done' && !(excludePortal && m.id === 'portal'); }).length;
    },
    portalUnlocked: function () { return Game.doneCount(true) >= Game.PORTAL_NEEDS; },
    leaderId: function () { return CPT.Player.actor().def.id; },
    effectText: function (k) {
      const st = Game.state.stats;
      if (k === 'ac') return '+' + Math.floor(st.ac / 25) + ' ponto(s) de bônus a cada missão concluída (voluntários e doações chegam mais fácil). Com 50 ou mais, os postes de Wi-Fi da cidade se iluminam.';
      if (k === 'ab') return 'Melhorias do Fundo da Cidade custam ' + Game.fundCost() + ' pontos agora (4 sem bônus). Com 50, a cidade ganha piso tátil; com 75, rampas nas entradas.';
      return 'A partir de ' + Game.HINT_AT + ', o Yuri oferece dicas nas escolhas. ' + (st.co >= Game.HINT_AT ? 'Dicas liberadas ✔' : 'Dicas ainda bloqueadas.');
    },
    fundCost: function () { const ab = Game.state.stats.ab; return Math.max(2, 4 - (ab >= 75 ? 2 : (ab >= 50 ? 1 : 0))); },
    mutiraoLeft: function () { return Math.max(0, Game.doneCount() + 1 - Game.state.mutiraoUsed); },
    buyFund: function (k) {
      const st = Game.state, cost = Game.fundCost();
      if (st.fund[k] >= Game.FUND_MAX) return 'Essa melhoria já foi concluída.';
      if (st.pts < cost) return 'Faltam pontos. Conclua missões e descubra placas para ganhar Pontos de Comunidade (ou chame um mutirão grátis).';
      st.pts -= cost; st.fund[k]++;
      const d = Game.applyFx({ [k]: Game.FUND_GAIN }, 'Fundo da Cidade');
      CPT.Sound.play('good');
      Game.checkVictory();
      return 'Melhoria feita! ' + CPT.STATS[k].name + ' ▲ +' + (d[0] ? d[0].delta : 0) + '.';
    },
    useMutirao: function (k) {
      const st = Game.state;
      if (Game.mutiraoLeft() <= 0) return 'Sem mutirões agora. Conclua uma missão para chamar a vizinhança de novo.';
      st.mutiraoUsed++;
      const d = Game.applyFx({ [k]: Game.MUTIRAO_GAIN }, 'Mutirão de vizinhos');
      CPT.Sound.play('ok');
      Game.checkVictory();
      return 'Os vizinhos ajudaram! ' + CPT.STATS[k].name + ' ▲ +' + (d[0] ? d[0].delta : 0) + '.';
    },
    allStatsOk: function () { const s = Game.state.stats; return s.ac >= Game.GOAL && s.ab >= Game.GOAL && s.co >= Game.GOAL; },
    checkVictory: function () {
      const st = Game.state, total = CPT.Missions.list.length;
      if (st.won || Game.doneCount() < total) return false;
      if (Game.allStatsOk()) {
        st.won = true; Game.refresh(); Game.celebrate('helena'); CPT.Sound.play('win');
        const sum = { start: {}, end: {}, pts: st.pts, signs: Object.keys(st.signs).length };
        ['ac', 'ab', 'co'].forEach(function (k) { sum.start[k] = Math.round(st.start[k]); sum.end[k] = Math.round(st.stats[k]); });
        setTimeout(function () { CPT.UI.victory(sum); }, 400);
        return true;
      }
      if (!st.allDoneToast) {
        st.allDoneToast = true;
        Game.toast('<b>Todas as missões concluídas!</b> Falta levar os três status a ' + Game.GOAL + '. Use o Fundo da Cidade no Centro Comunitário.', 7000);
      }
      return false;
    },
    afterMission: function () {
      const st = Game.state;
      if (Game.portalUnlocked() && !st.portalToast && st.missions.portal.status !== 'done') {
        st.portalToast = true; CPT.Sound.play('new');
        Game.toast('<b>Portal Conecta+ liberado!</b> Fale com a Prefeita Helena na Prefeitura.', 6000);
      }
      Game.refresh(); Game.checkVictory();
    },

    /* ---------- missões / objetivo ---------- */
    track: function (id) { Game.state.tracked = id; Game.refresh(); },
    currentObjective: function () {
      const st = Game.state, M = CPT.Missions, W = CPT.World;
      let m = st.tracked && st.missions[st.tracked].status !== 'done' ? M.byId[st.tracked] : null;
      if (!m) {
        const lead = CPT.Player.leader();
        const dist = function (mm) { const n = W.NPCS[mm.npc]; return Math.hypot(n.tx * T - lead.x, n.ty * T - lead.y); };
        const act = M.list.filter(function (mm) { return st.missions[mm.id].status === 'active'; });
        const fresh = M.list.filter(function (mm) { return st.missions[mm.id].status === 'new' && st.discovered[mm.area] && (mm.id !== 'portal' || Game.portalUnlocked()); });
        const pool = act.length ? act : fresh;
        pool.sort(function (a, b) { return dist(a) - dist(b); });
        m = pool[0] || null;
      }
      if (m) { const o = M.objective(m); return { title: m.title, text: o.text, target: o.target, multi: o.multi }; }
      if (Game.doneCount() >= M.list.length) {
        if (st.won) return { title: 'Conecta é para todos!', text: 'Missão principal cumprida. Continue explorando e relendo as placas.', target: null };
        return { title: 'Reta final', text: 'Leve os três status a ' + Game.GOAL + ' usando o Fundo da Cidade, no Centro Comunitário.', target: { tx: W.FUND.tx, ty: W.FUND.ty } };
      }
      const undis = W.AREAS.filter(function (a) { return !st.discovered[a.id]; });
      if (undis.length) {
        const a = undis[0], r = W.areaRect(a);
        return { title: 'Explore a cidade', text: 'Ande por Conecta para descobrir novos locais e missões.', target: { tx: r.x + (r.w >> 1), ty: r.y + (r.h >> 1) } };
      }
      return { title: 'Missões pendentes', text: 'Abra a lista de missões (tecla M) para escolher a próxima.', target: null };
    },
    refresh: function () {
      if (!Game.state) return;
      CPT.UI.updateHUD(Game.state);
      objective = Game.currentObjective();
      CPT.UI.setTracker(objective.title, objective.text);
    },
    toast: function (html, ms) { CPT.UI.toast(html, ms); },

    /* ---------- descoberta ---------- */
    discoverCheck: function (silent) {
      const W = CPT.World, st = Game.state;
      CPT.Player.players().forEach(function (lead) {
        const tx = Math.floor(lead.x / T), ty = Math.floor((lead.y - 2) / T);
        W.AREAS.forEach(function (a) {
          if (st.discovered[a.id]) return;
          const r = W.areaRect(a);
          if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) {
            st.discovered[a.id] = true;
            if (!silent || a.id === 'praca') {
              CPT.Sound.play('new');
              const ms = CPT.Missions.list.filter(function (m) { return m.area === a.id && m.id !== 'portal'; });
              Game.toast('<b>Local descoberto: ' + CPT.UI.esc(a.name) + '</b>' + (ms.length ? '<br><small>Missão disponível: ' + CPT.UI.esc(ms[0].title) + '</small>' : ''), 4500);
            }
            Game.refresh();
          }
        });
      });
    },

    /* ---------- agentes ---------- */
    switchAgent: function (i, p) {
      if (Game.mode !== 'play' || Game.frozen()) return;
      const P = CPT.Player; p = p || 0;
      const changed = P.coop ? P.assign(p, i) : P.switchTo(i);
      if (changed) {
        CPT.Sound.init(); CPT.Sound.play('click'); Game.refresh();
        const a = P.AGENTS[i];
        Game.toast((P.coop ? '<b>Jogador ' + (p + 1) + '</b> agora controla ' : 'Agora você controla ') + '<b>' + a.name + '</b> (' + a.role + ')', 1800);
      }
    },
    nextAgent: function (p) {
      if (Game.mode !== 'play' || Game.frozen()) return;
      const P = CPT.Player;
      Game.switchAgent(P.coop ? P.order[2] : (P.order[0] + 1) % P.agents.length, p || 0);
    },
    /* LB/RB: percorre os 3 agentes em ordem (no co-op, cair no agente do parceiro troca os dois) */
    cycleAgent: function (p, dir) {
      if (Game.mode !== 'play' || Game.frozen()) return;
      const P = CPT.Player, n = P.agents.length, cur = P.coop && p === 1 ? P.order[1] : P.order[0];
      Game.switchAgent((cur + dir + n) % n, p || 0);
    },
    /* Ponto que a câmera acompanha: o líder (solo) ou o meio da dupla (co-op) */
    focus: function () {
      const pl = CPT.Player.players();
      if (pl.length === 1) return { x: pl[0].x, y: pl[0].y - 8 };
      return { x: (pl[0].x + pl[1].x) / 2, y: (pl[0].y + pl[1].y) / 2 - 8 };
    },
    /* "Elástico" do co-op: impede que um jogador se afaste tanto que saia da tela do parceiro */
    tether: function (self, other, view) {
      const W = CPT.World;
      return function (x, y, w, h) {
        if (W.blocked(x, y, w, h)) return true;
        const nx = x + w / 2, ny = y + h, dx = Math.abs(nx - other.x), dy = Math.abs(ny - other.y);
        const ox = Math.abs(self.x - other.x), oy = Math.abs(self.y - other.y);
        const mx = Math.max(60, view.w - 44), my = Math.max(60, view.h - 70);
        return (dx > mx && dx > ox) || (dy > my && dy > oy);
      };
    },

    /* ---------- partículas ---------- */
    sparkle: function (x, y) {
      if (CPT.Settings.v.reduceMotion) return;
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        particles.push({ x: x, y: y, vx: Math.cos(a) * 26, vy: Math.sin(a) * 26 - 8, life: 0.7, max: 0.7, c: i % 2 ? '#ffd35c' : '#ffffff', s: 2 });
      }
    },
    celebrate: function (npcId) {
      if (CPT.Settings.v.reduceMotion) return;
      const n = CPT.World.NPCS[npcId], x = n.tx * T + 8, y = n.ty * T - 4, cols = ['#ffd35c', '#a58be0', '#4f84f5', '#5fc878', '#e86f5b'];
      for (let i = 0; i < 36; i++) {
        particles.push({ x: x, y: y, vx: (Math.random() - 0.5) * 70, vy: -20 - Math.random() * 45, g: 90, life: 1.4, max: 1.4, c: cols[i % cols.length], s: 2 });
      }
    },

    /* ---------- interações ---------- */
    interactables: function () {
      const W = CPT.World, out = [];
      Object.keys(W.NPCS).forEach(function (id) { const n = W.NPCS[id]; out.push({ kind: 'npc', id: id, x: n.tx * T + 8, y: n.ty * T + 9, r: 26, label: 'Falar com ' + n.name }); });
      CPT.Missions.visibleItems().forEach(function (it) { out.push({ kind: 'item', id: it.id, x: it.tx * T + 8, y: it.ty * T + 8, r: 22, label: 'Pegar: ' + it.label, ref: it }); });
      W.STATIONS.forEach(function (s) { out.push({ kind: 'station', id: s.id, x: s.tx * T + 8, y: s.ty * T + 10, r: 24, label: 'Usar: ' + s.label, ref: s }); });
      W.SIGNS.forEach(function (s) { out.push({ kind: 'sign', id: s.id, x: s.tx * T + 8, y: s.ty * T + 9, r: 22, label: 'Ler: ' + s.title, ref: s }); });
      out.push({ kind: 'fund', id: 'fund', x: W.FUND.tx * T + 8, y: W.FUND.ty * T + 9, r: 24, label: 'Abrir: Fundo da Cidade' });
      out.push({ kind: 'pole', id: 'pole', x: 19 * T + 8, y: 12 * T + 9, r: 24, label: 'Ver: Poste de Wi-Fi' });
      return out;
    },
    findTarget: function (n) {
      const lead = CPT.Player.leaderOf(n || 0), px = lead.x, py = lead.y - 6;
      const face = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[lead.dir];
      let best = null, bd = 1e9;
      Game.interactables().forEach(function (it) {
        const dx = it.x - px, dy = it.y - py, d = Math.hypot(dx, dy);
        if (d > it.r) return;
        const behind = (dx * face[0] + dy * face[1]) < -4 ? 7 : 0;
        if (d + behind < bd) { bd = d + behind; best = it; }
      });
      return best;
    },
    interact: async function (n) {
      n = n || 0;
      if (Game.mode !== 'play' || Game.frozen()) return;
      CPT.Sound.init();
      const t = Game.findTarget(n); if (!t) return;
      CPT.Player.current = n;
      Game.block(1);
      try {
        const D = CPT.Dialogue, st = Game.state;
        if (t.kind === 'npc') await CPT.Missions.interactNpc(t.id);
        else if (t.kind === 'item') CPT.Missions.collect(t.ref);
        else if (t.kind === 'station') await CPT.Missions.interactStation(t.ref);
        else if (t.kind === 'sign') {
          if (!st.signs[t.ref.id]) {   // o ponto vale na hora da leitura, mesmo que o jogador saia com Esc
            st.signs[t.ref.id] = true; Game.addPts(1); CPT.Sound.play('pick');
            Game.toast('<b>Curiosidade descoberta!</b> +1 Ponto de Comunidade (' + Object.keys(st.signs).length + ' de ' + CPT.World.SIGNS.length + ')', 3500);
          }
          await D.say('narrator', t.ref.title + ': ' + t.ref.text);
          D.close();
        } else if (t.kind === 'fund') { await CPT.Activities.fund(); Game.refresh(); Game.checkVictory(); }
        else if (t.kind === 'pole') {
          await D.say('narrator', 'Poste de Wi-Fi comunitário da praça. ' + (st.stats.ac >= 50 ? 'Com mais acesso na cidade, o sinal chega mais longe e mais gente consegue se conectar.' : 'O sinal ainda é fraco. Melhorar o Acesso digital amplia a cobertura.'));
          D.close();
        }
      } catch (e) {
        CPT.Dialogue.close();
        if (e !== CPT.CANCEL) throw e;
      } finally { Game.block(-1); CPT.Player.current = 0; Game.refresh(); }
    },

    /* ---------- entrada ---------- */
    bind: function () {
      const K1 = { KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right' };
      const K2 = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
      const clearKeys = function () { ['up', 'down', 'left', 'right'].forEach(function (d) { keys[d] = false; keys2[d] = false; }); touch.x = touch.y = 0; };
      document.addEventListener('keydown', function (e) {
        Game.lastKeyTime = performance.now();
        if (Game.mode !== 'play' || e.defaultPrevented) return;   // defaultPrevented: a tecla já foi usada (ex.: Esc que saiu de uma conversa)
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        const frozen = Game.frozen(), c = e.code, coop = CPT.Player.coop;
        if (K1[c] || K2[c]) {
          if (frozen) return;
          e.preventDefault();
          if (K1[c]) keys[K1[c]] = true;
          if (K2[c]) keys2[K2[c]] = true;
          return;
        }
        if (frozen) return;
        if (c === 'KeyE' || c === 'Space') { e.preventDefault(); if (!e.repeat) Game.interact(0); return; }
        if (c === 'Enter' || c === 'NumpadEnter' || c === 'Numpad0') { e.preventDefault(); if (!e.repeat) Game.interact(coop ? 1 : 0); return; }
        if (c === 'KeyQ' || c === 'Tab') { e.preventDefault(); if (!e.repeat) { if (e.shiftKey && c === 'Tab') Game.cycleAgent(0, -1); else Game.nextAgent(0); } return; }
        if (c === 'ShiftRight' && coop) { e.preventDefault(); if (!e.repeat) Game.nextAgent(1); return; }
        if (c === 'Digit1' || c === 'Digit2' || c === 'Digit3') { Game.switchAgent(+c.slice(-1) - 1, 0); return; }
        if (c === 'Numpad1' || c === 'Numpad2' || c === 'Numpad3') { Game.switchAgent(+c.slice(-1) - 1, coop ? 1 : 0); return; }
        if (c === 'Escape' || c === 'KeyP') { e.preventDefault(); CPT.UI.pause(); return; }
        if (c === 'KeyM') { CPT.UI.questList(); return; }
      });
      document.addEventListener('keyup', function (e) { if (K1[e.code]) keys[K1[e.code]] = false; if (K2[e.code]) keys2[K2[e.code]] = false; });
      window.addEventListener('blur', clearKeys);
      $$('#touch [data-dir]').forEach(function (b) {
        const d = b.dataset.dir, v = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[d];
        const on = function (e) { e.preventDefault(); CPT.Sound.init(); if (v[0]) touch.x = v[0]; if (v[1]) touch.y = v[1]; b.classList.add('on'); };
        const off = function (e) { e.preventDefault(); if (v[0] && touch.x === v[0]) touch.x = 0; if (v[1] && touch.y === v[1]) touch.y = 0; b.classList.remove('on'); };
        b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
      });
      $('#btn-act').addEventListener('click', function () { Game.interact(0); });
      $('#prompt').addEventListener('click', function () { this.blur(); Game.interact(0); });
      $('#prompt2').addEventListener('click', function () { this.blur(); Game.interact(1); });
      $('#btn-pause').addEventListener('click', function () { this.blur(); if (!Game.frozen()) CPT.UI.pause(); });
      $('#btn-quests').addEventListener('click', function () { this.blur(); if (!Game.frozen()) CPT.UI.questList(); });
      $('#tracker').addEventListener('click', function () { this.blur(); if (!Game.frozen()) CPT.UI.questList(); });
      $('#btn-points').addEventListener('click', function () { this.blur(); if (!Game.frozen()) CPT.UI.statusPanel(); });
    },

    /* ---------- laço principal ---------- */
    snapCamera: function () {
      const r = Game.viewSize(), f = Game.focus();
      cam.x = Game.camTarget(f.x, r.w, CPT.World.W * T); cam.y = Game.camTarget(f.y, r.h, CPT.World.H * T);
    },
    camTarget: function (p, view, mapSize) { if (view >= mapSize) return (mapSize - view) / 2; return Math.max(0, Math.min(mapSize - view, p - view / 2)); },
    viewSize: function () {
      const w = canvas.clientWidth || 800, h = canvas.clientHeight || 500, S = Game.scale(w, h);
      return { w: w / S, h: h / S, S: S };
    },
    scale: function (w, h) { return Math.max(2, Math.min(6, Math.floor(Math.min(w / 288, h / 176)))); },

    frame: function (now) {
      requestAnimationFrame(Game.frame);
      const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
      if (CPT.Gamepad) CPT.Gamepad.poll();
      if (Game.mode === 'title') { Game.drawTitleFrame(); return; }
      if (Game.mode !== 'play') return;
      Game.update(dt); Game.render();
    },
    drawTitleFrame: function () {
      const cv = $('#title-canvas'), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
      CPT.UI.drawTitle(cv, CPT.Settings.v.reduceMotion ? 0 : time);
    },
    update: function (dt) {
      const frozen = Game.frozen(), P = CPT.Player, coop = P.coop;
      stage.classList.toggle('busy', frozen);
      stage.classList.toggle('coop', coop);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; if (p.g) p.vy += p.g * dt;
        if (p.life <= 0) particles.splice(i, 1);
      }
      const prompts = [$('#prompt'), $('#prompt2')];
      if (!frozen) {
        const view = Game.viewSize();
        let ax1, ay1, ax2 = 0, ay2 = 0;
        if (coop) {
          ax1 = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + touch.x; ay1 = (keys.down ? 1 : 0) - (keys.up ? 1 : 0) + touch.y;
          ax2 = (keys2.right ? 1 : 0) - (keys2.left ? 1 : 0); ay2 = (keys2.down ? 1 : 0) - (keys2.up ? 1 : 0);
        } else {
          ax1 = ((keys.right || keys2.right) ? 1 : 0) - ((keys.left || keys2.left) ? 1 : 0) + touch.x;
          ay1 = ((keys.down || keys2.down) ? 1 : 0) - ((keys.up || keys2.up) ? 1 : 0) + touch.y;
        }
        if (CPT.Gamepad) {
          const pd = CPT.Gamepad.dirs;
          ax1 += pd[0].x; ay1 += pd[0].y;
          if (coop) { ax2 += pd[1].x; ay2 += pd[1].y; }
        }
        const b1 = coop ? Game.tether(P.leaderOf(0), P.leaderOf(1), view) : CPT.World.blocked;
        const b2 = coop ? Game.tether(P.leaderOf(1), P.leaderOf(0), view) : null;
        const moved = P.update(dt, Math.sign(ax1), Math.sign(ay1), b1, Math.sign(ax2), Math.sign(ay2), b2);
        if (moved) { Game.state.moved = true; Game.discoverCheck(); }
        for (let n = 0; n < 2; n++) {
          const t = n === 0 || coop ? Game.findTarget(n) : null, pad = !!CPT.Gamepad && CPT.Gamepad.usingPad(n), key = t ? t.kind + t.id + (pad ? '#p' : '#k') : '';
          targets[n] = t;
          if (key !== promptKeys[n]) {
            promptKeys[n] = key;
            const p = prompts[n];
            if (t) {
              p.classList.remove('hidden');
              const tag = coop ? '<span class="ptag p' + (n + 1) + '">J' + (n + 1) + '</span> ' : '';
              p.innerHTML = tag + '<kbd>' + (pad ? 'A' : (n === 0 ? 'E' : 'Enter')) + '</kbd> ' + CPT.UI.esc(t.label);
              p.setAttribute('aria-label', (coop ? 'Jogador ' + (n + 1) + ': ' : '') + 'Interagir: ' + t.label);
            } else p.classList.add('hidden');
          }
        }
        if (!hintShown && time > 6 && !Game.state.moved) { hintShown = true; Game.toast(coop ? 'Dica: <b>J1</b> anda com <b>W A S D</b> e <b>J2</b> com as <b>setas</b>. Sigam a seta amarela.' : 'Dica: use <b>W A S D</b> ou as <b>setas</b> para andar. Siga a seta amarela.', 6000); }
      } else {
        for (let n = 0; n < 2; n++) if (promptKeys[n]) { promptKeys[n] = ''; prompts[n].classList.add('hidden'); targets[n] = null; }
      }
      if (!objective) objective = Game.currentObjective();
      const r = Game.viewSize(), f = Game.focus();
      const tx = Game.camTarget(f.x, r.w, CPT.World.W * T), ty = Game.camTarget(f.y, r.h, CPT.World.H * T);
      const k = Math.min(1, dt * 8); cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k;
    },

    /* ---------- desenho ---------- */
    render: function () {
      const W = CPT.World, S_ = CPT.Sprites, st = Game.state;
      const cw = canvas.clientWidth, chh = canvas.clientHeight;
      if (cw < 10 || chh < 10) return;
      if (canvas.width !== cw || canvas.height !== chh) { canvas.width = cw; canvas.height = chh; }
      const S = Game.scale(cw, chh), vw = cw / S, vh = chh / S;
      const motion = !CPT.Settings.v.reduceMotion;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = '#2b3a6b'; ctx.fillRect(0, 0, cw, chh);
      const camx = Math.round(Math.min(Math.max(cam.x, Math.min(0, (W.W * T - vw) / 2)), Math.max(W.W * T - vw, (W.W * T - vw) / 2)) * S) / S;
      const camy = Math.round(Math.min(Math.max(cam.y, Math.min(0, (W.H * T - vh) / 2)), Math.max(W.H * T - vh, (W.H * T - vh) / 2)) * S) / S;
      const ox = -Math.round(camx * S), oy = -Math.round(camy * S);
      ctx.setTransform(S, 0, 0, S, ox, oy);
      ctx.imageSmoothingEnabled = false;
      const gx0 = Math.max(0, Math.floor(camx)), gy0 = Math.max(0, Math.floor(camy));
      const gw = Math.min(W.W * T - gx0, Math.ceil(vw) + 2), gh = Math.min(W.H * T - gy0, Math.ceil(vh) + 2);
      if (gw > 0 && gh > 0) ctx.drawImage(W.groundCanvas, gx0, gy0, gw, gh, gx0, gy0, gw, gh);

      // melhorias visíveis conforme a Acessibilidade
      W.doors.forEach(function (d) {
        if (d.decor) return;
        if (st.stats.ab >= 50) { ctx.drawImage(S_.tiles.tactile, d.tx * T, d.ty * T); ctx.drawImage(S_.tiles.tactile, (d.tx + 1) * T, d.ty * T); }
        if (st.stats.ab >= 75) ctx.drawImage(S_.tiles.ramp, d.tx * T, d.ty * T + 2);
      });

      // lista com profundidade
      const list = [], x0 = camx - 40, x1 = camx + vw + 40, y0 = camy - 60, y1 = camy + vh + 40;
      W.statics.forEach(function (s) {
        if (s.x + s.img.width < x0 || s.x > x1 || s.y + s.img.height < y0 || s.y > y1) return;
        list.push({ sy: s.sortY, d: function () { ctx.drawImage(s.img, s.x, s.y); } });
      });
      W.STATIONS.forEach(function (s) {
        const spr = s.sprite;
        list.push({ sy: s.ty * T + T, d: function () { ctx.drawImage(S_.tiles[spr], s.tx * T, s.ty * T); } });
      });
      Game.stationBadges = [];
      const players = CPT.Player.players();
      Object.keys(W.NPCS).forEach(function (id) {
        const n = W.NPCS[id], fx = n.tx * T + 8, fy = n.ty * T + 15;
        const near = players.slice().sort(function (p, q) { return Math.hypot(p.x - fx, p.y - fy) - Math.hypot(q.x - fx, q.y - fy); })[0];
        let dir = 'down'; const dx = near.x - fx, dy = near.y - fy;
        if (Math.hypot(dx, dy) < 56) dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
        const bob = motion ? ((Math.floor(time * 1.6 + n.tx) % 2) ? -1 : 0) : 0;
        list.push({ sy: fy, d: function () { ctx.drawImage(S_.character(n.look, dir, 0), n.tx * T, n.ty * T - 6 + bob); } });
      });
      CPT.Missions.visibleItems().forEach(function (it) {
        const bob = motion ? Math.round(Math.sin(time * 3 + it.tx) * 1.5) : 0;
        list.push({ sy: it.ty * T + 14, d: function () {
          ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(it.tx * T + 1, it.ty * T + 12, 14, 3);
          ctx.drawImage(S_.tiles[it.sprite], it.tx * T + 1, it.ty * T - 1 + bob);
          if (motion ? (Math.floor(time * 3) % 2) : true) { ctx.fillStyle = '#fff'; ctx.fillRect(it.tx * T + 12, it.ty * T - 2, 1, 3); ctx.fillRect(it.tx * T + 11, it.ty * T - 1, 3, 1); }
        } });
      });
      const A = CPT.Player.agents;
      A.forEach(function (a, i) {
        const pn = players.indexOf(a), isLead = pn >= 0;
        list.push({ sy: a.y + (isLead ? 0.2 : 0), d: function () {
          const fx = Math.round(a.x), fy = Math.round(a.y);
          if (isLead) {
            ctx.lineWidth = 1; ctx.setLineDash(pn === 1 ? [2, 2] : []);
            ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(fx, fy - 1, 8, 3.5, 0, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = a.def.color; ctx.beginPath(); ctx.ellipse(fx, fy - 1, 9, 4, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
          }
          ctx.drawImage(S_.character(a.def.look, a.dir, a.frame), fx - 8, fy - 21);
        } });
      });
      list.sort(function (a, b) { return a.sy - b.sy; });
      list.forEach(function (o) { o.d(); });

      // postes de Wi-Fi acesos quando o Acesso está alto
      if (st.stats.ac >= 50) {
        const px = 19 * T + 8, py = 12 * T - 14;
        for (let r = 0; r < 3; r++) {
          const on = !motion || (Math.floor(time * 2) % 4) > r - 1;
          if (!on) continue;
          ctx.globalAlpha = 0.9 - r * 0.22; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, 6 + r * 5, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
          ctx.strokeStyle = '#4f84f5'; ctx.beginPath(); ctx.arc(px, py + 1, 6 + r * 5, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }

      // realce do alvo de interação
      targets.forEach(function (target) {
        if (!target) return;
        const ex = Math.round(target.x), ey = Math.round(target.y) + 6;
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
        const pulse = motion ? (Math.floor(time * 4) % 2) : 0;
        ctx.strokeRect(ex - 9 - pulse + 0.5, ey - 18 - pulse + 0.5, 18 + pulse * 2, 22 + pulse * 2);
        ctx.strokeStyle = '#1f2547'; ctx.strokeRect(ex - 10 - pulse + 0.5, ey - 19 - pulse + 0.5, 20 + pulse * 2, 24 + pulse * 2);
      });

      // balões de missão
      Object.keys(W.NPCS).forEach(function (id) {
        const mk = CPT.Missions.marker(id); if (!mk) return;
        const n = W.NPCS[id], b = motion ? Math.round(Math.sin(time * 4 + n.tx) * 1.5) : 0;
        const img = { new: S_.tiles.bNew, doing: S_.tiles.bDoing, done: S_.tiles.bDone, lock: S_.tiles.bLock }[mk];
        ctx.drawImage(img, n.tx * T + 1, n.ty * T - 22 + b);
      });
      // marcadores dos agentes
      A.forEach(function (a) {
        const px = Math.round(a.x) - 5, py = Math.round(a.y) - 36 + (players.indexOf(a) >= 0 && motion ? Math.round(Math.sin(time * 5)) : 0);
        ctx.drawImage(S_.tiles[a.def.pin], px, py);
        if (players.indexOf(a) >= 0) ctx.drawImage(S_.tiles.arrow, Math.round(a.x) - 4, py - 8);
      });
      // seta do objetivo
      if (objective && objective.target && !Game.frozen()) {
        const pts = objective.multi && objective.multi.length ? objective.multi : [objective.target];
        pts.forEach(function (p) {
          const b = motion ? Math.round(Math.sin(time * 5) * 2) : 0;
          ctx.drawImage(S_.tiles.arrow, p.tx * T + 4, p.ty * T - 32 + b);
        });
      }
      // partículas
      particles.forEach(function (p) { ctx.globalAlpha = Math.max(0, p.life / p.max); ctx.fillStyle = p.c; ctx.fillRect(Math.round(p.x), Math.round(p.y), p.s, p.s); });
      ctx.globalAlpha = 1;

      // ----- camada de tela (texto nítido) -----
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const fs = Math.round(8 + S * 1.8);
      ctx.font = '700 ' + fs + 'px "Trebuchet MS", "Segoe UI", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
      function label(txt, wx, wy, dim) {
        const sx = Math.round(wx * S + ox), sy = Math.round(wy * S + oy);
        if (sx < -200 || sx > cw + 200 || sy < -40 || sy > chh + 40) return;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(31,37,71,.92)'; ctx.strokeText(txt, sx, sy);
        ctx.fillStyle = dim ? '#cfd3ee' : '#ffffff'; ctx.fillText(txt, sx, sy);
      }
      W.BUILDINGS.forEach(function (b) {
        if (b.decor) return;
        label(st.discovered[b.id] ? b.name : '? ? ?', b.x * T + b.w * 8, b.y * T - 4, !st.discovered[b.id]);
      });
      label(st.discovered.praca ? 'Praça Central' : '? ? ?', 22 * T, 10 * T + 4, !st.discovered.praca);
      label('Quadro do Fundo', W.FUND.tx * T + 8, W.FUND.ty * T - 3, false);
      W.STATIONS.forEach(function (s) { if (s.agent) { const a = CPT.Player.AGENTS.filter(function (q) { return q.id === s.agent; })[0]; const prog = Game.state.missions.portal.prog[s.id]; label((prog ? '✔ ' : '') + a.name, s.tx * T + 8, s.ty * T - 4, false); } });
      Object.keys(W.NPCS).forEach(function (id) { if (targets.some(function (t) { return t && t.kind === 'npc' && t.id === id; })) label(W.NPCS[id].name, W.NPCS[id].tx * T + 8, W.NPCS[id].ty * T + 22, false); });
      if (CPT.Player.coop) players.forEach(function (a, i) { label('J' + (i + 1), a.x, a.y - 47, false); });
      // seta nas bordas apontando o objetivo fora da tela
      if (objective && objective.target && !Game.frozen()) {
        const tx = (objective.target.tx * T + 8) * S + ox, ty = (objective.target.ty * T + 8) * S + oy, m = 34;
        if (tx < m || tx > cw - m || ty < m || ty > chh - m) {
          const cx = cw / 2, cy = chh / 2, ang = Math.atan2(ty - cy, tx - cx);
          const k = Math.min((cw / 2 - m) / Math.max(0.001, Math.abs(Math.cos(ang))), (chh / 2 - m) / Math.max(0.001, Math.abs(Math.sin(ang))));
          const ax = cx + Math.cos(ang) * k, ay = cy + Math.sin(ang) * k;
          ctx.save(); ctx.translate(ax, ay); ctx.rotate(ang);
          ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-10, -12); ctx.lineTo(-4, 0); ctx.lineTo(-10, 12); ctx.closePath();
          ctx.fillStyle = '#ffd35c'; ctx.strokeStyle = '#1f2547'; ctx.lineWidth = 3; ctx.stroke(); ctx.fill(); ctx.restore();
        }
      }
      Game.drawMinimap();
    },

    drawMinimap: function () {
      const W = CPT.World, st = Game.state, P = 3, m = mctx;
      if (mini.width !== W.W * P) { mini.width = W.W * P; mini.height = W.H * P; }
      if (!Game.miniBase) {
        const b = CPT.Sprites.mk(W.W * P, W.H * P), bx = b.getContext('2d');
        for (let y = 0; y < W.H; y++) for (let x = 0; x < W.W; x++) {
          const k = W.ground[y * W.W + x];
          bx.fillStyle = k === 1 ? '#eadfc4' : k === 2 ? '#bcc7ee' : (W.solid[y * W.W + x] ? '#2f7d4f' : '#5eb36b');
          bx.fillRect(x * P, y * P, P, P);
        }
        Game.miniBase = b;
      }
      m.drawImage(Game.miniBase, 0, 0);
      W.BUILDINGS.forEach(function (b) {
        const disc = st.discovered[b.id] || b.decor;
        m.fillStyle = disc ? { escola: '#8b73d4', posto: '#46b4ac', prefeitura: '#5276c9', biblioteca: '#7461ba', centro: '#f09d62', padaria: '#e06c55', casaA: '#6296d8', casaB: '#a5764f' }[b.kind] : '#8a8fa8';
        m.fillRect(b.x * P, b.y * P, b.w * P, b.h * P);
        m.strokeStyle = '#1f2547'; m.lineWidth = 1; m.strokeRect(b.x * P + 0.5, b.y * P + 0.5, b.w * P - 1, b.h * P - 1);
      });
      if (objective && objective.target) {
        const pts = objective.multi && objective.multi.length ? objective.multi : [objective.target];
        pts.forEach(function (p) {
          m.fillStyle = '#ffd35c'; m.strokeStyle = '#1f2547'; m.lineWidth = 1.5;
          m.beginPath(); m.arc(p.tx * P + 1.5, p.ty * P + 1.5, 4, 0, Math.PI * 2); m.fill(); m.stroke();
        });
      }
      CPT.Player.agents.forEach(function (a) {
        const lead = CPT.Player.players().indexOf(a) >= 0, x = a.x / T * P, y = a.y / T * P;
        m.fillStyle = a.def.color; m.strokeStyle = '#ffffff'; m.lineWidth = lead ? 2 : 1;
        if (a.def.shape === 'círculo') { m.beginPath(); m.arc(x, y, lead ? 4 : 3, 0, Math.PI * 2); m.fill(); m.stroke(); }
        else if (a.def.shape === 'quadrado') { const s = lead ? 8 : 6; m.fillRect(x - s / 2, y - s / 2, s, s); m.strokeRect(x - s / 2, y - s / 2, s, s); }
        else { const s = lead ? 5 : 4; m.beginPath(); m.moveTo(x, y - s); m.lineTo(x + s, y + s); m.lineTo(x - s, y + s); m.closePath(); m.fill(); m.stroke(); }
      });
    }
  });
})();
