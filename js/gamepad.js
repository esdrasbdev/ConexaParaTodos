/* Conexão para Todos — gamepad.js
 * Suporte a controles (Gamepad API): Xbox, PlayStation, Switch Pro e similares.
 *  - Jogando: analógico esquerdo ou direcional anda · A interage · Y/LB/RB troca de agente · X/Select missões · Start pausa
 *  - Menus e conversas: direcional/analógico navega · A confirma · B (ou Start na pausa) sai/volta
 *  - Solo: qualquer controle conectado comanda o jogador. Co-op: com 2 controles, o 1º é do J1 e o 2º do J2; com 1, ele fica com o J2.
 * Robustez: ignora "controles fantasmas" (sensores de movimento), entende o direcional em eixo (hat) de controles genéricos
 * e oferece o painel "🎮 Controle" para ver o que o navegador detecta e configurar os botões. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const DEAD = 0.5, FIRST = 380, REPEAT = 140, KEY = 'cpt-padmap';
  const NAMES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'BACK', 'START'];
  const STD = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, BACK: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 };
  const GEN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, BACK: 6, START: 7, UP: -1, DOWN: -1, LEFT: -1, RIGHT: -1 };
  const HAT = [[0, -1], [1, -1], [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1]];

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function isDown(g, i) { if (i < 0) return false; const b = g.buttons && g.buttons[i]; return !!b && (b.pressed || b.value > 0.5); }
  function usable(g) { return (g.buttons || []).length >= 4 && !/motion|accelerometer|gyro|sensor/i.test(g.id || ''); }
  function loadMaps() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { return {}; } }
  function saveMaps(m) { try { localStorage.setItem(KEY, JSON.stringify(m)); } catch (e) { /* ok */ } }

  function dirOf(g, c) {
    const ax = g.axes || []; let x = 0, y = 0;
    const vx = (ax[c.ax.x] || 0) * c.ax.xs, vy = (ax[c.ax.y] || 0) * c.ax.ys;
    if (vx > DEAD) x = 1; else if (vx < -DEAD) x = -1;
    if (vy > DEAD) y = 1; else if (vy < -DEAD) y = -1;
    if (isDown(g, c.b.LEFT)) x = -1; if (isDown(g, c.b.RIGHT)) x = 1;
    if (isDown(g, c.b.UP)) y = -1; if (isDown(g, c.b.DOWN)) y = 1;
    if (c.hat && typeof ax[9] === 'number' && ax[9] > -1.05 && ax[9] < 1.05) {   // direcional em eixo (controles genéricos)
      const h = HAT[Math.round((ax[9] + 1) * 3.5)];
      if (h) { if (h[0]) x = h[0]; if (h[1]) y = h[1]; }
    }
    return { x: x, y: y };
  }

  const GP = (CPT.Gamepad = {
    enabled: true, count: 0, rawCount: 0, slots: [null, null], dirs: [{ x: 0, y: 0 }, { x: 0, y: 0 }], lastUse: [0, 0],
    maps: loadMaps(), swap: (function () { try { return localStorage.getItem('cpt-padswap') === '1'; } catch (e) { return false; } })(), capture: null, _prev: {}, _navKey: '', _navNext: 0, STD: STD,
    reset: function () { GP._prev = {}; GP._navKey = ''; GP._navNext = 0; GP.lastUse = [0, 0]; GP.capture = null; },
    supported: function () { return typeof navigator.getGamepads === 'function'; },
    /* Todos os "gamepads" que o navegador devolve (inclui os que o jogo ignora) */
    list: function () {
      let raw = [];
      try { raw = (navigator.getGamepads ? navigator.getGamepads() : []) || []; } catch (e) { raw = []; }
      const out = [];
      for (let i = 0; i < raw.length; i++) if (raw[i] && raw[i].connected !== false) out.push(raw[i]);
      return out;
    },
    usable: usable,
    /* Mapeamento de botões/eixos deste controle (padrão, genérico ou salvo pelo assistente) */
    cfg: function (g) {
      const std = g.mapping === 'standard';
      const c = { b: Object.assign({}, std ? STD : GEN), ax: { x: 0, xs: 1, y: 1, ys: 1 }, hat: !std && (g.axes || []).length > 9 };
      const sv = GP.maps[g.id];
      if (sv) { Object.assign(c.b, sv.b || {}); if (sv.ax) Object.assign(c.ax, sv.ax); }
      return c;
    },
    edge: function (g, i) {
      if (i < 0) return false;
      const key = g.index + ':' + i, cur = isDown(g, i), was = !!GP._prev[key];
      GP._prev[key] = cur; return cur && !was;
    },
    /* O jogador n (0 = J1, 1 = J2) está usando o controle (e não o teclado)? */
    usingPad: function (n) { return !!GP.slots[n] && GP.lastUse[n] > (CPT.Game && CPT.Game.lastKeyTime || 0); },

    /* Chamado a cada quadro pelo laço principal */
    poll: function () {
      const G = CPT.Game, now = performance.now();
      GP.dirs = [{ x: 0, y: 0 }, { x: 0, y: 0 }];
      const all = GP.enabled ? GP.list() : [], pads = all.filter(usable);
      GP.count = pads.length; GP.rawCount = all.length;
      const title = !!G && G.mode === 'title' && !CPT.Modal.top();
      const hint = document.getElementById('pad-hint'), help = document.getElementById('pad-help');
      if (hint) {
        hint.classList.toggle('hidden', !(pads.length > 0 && title));
        if (pads.length > 0 && title) {
          const odd = pads.some(function (g) { return g.mapping !== 'standard' && !GP.maps[g.id]; });
          const html = '🎮 <b>Controle detectado:</b> use o direcional ou o analógico e aperte <b>A</b> para escolher.' + (odd ? ' <b>Se os botões não baterem, abra “🎮 Controle” para configurar.</b>' : '');
          if (hint.dataset.h !== html) { hint.innerHTML = html; hint.dataset.h = html; }
        }
      }
      if (help) help.classList.toggle('hidden', !(pads.length === 0 && title && GP.enabled));
      if (!G || !G.ready) { GP.slots = [null, null]; return; }
      if (GP.capture) { pads.forEach(function (g) { GP.capture(g); }); return; }   // assistente de configuração
      const coop = CPT.Player.coop && G.mode === 'play';
      GP.slots = coop ? (pads.length >= 2 ? (GP.swap ? [pads[1], pads[0]] : [pads[0], pads[1]]) : (pads.length === 1 ? [null, pads[0]] : [null, null])) : [pads[0] || null, null];
      const frozen = G.mode === 'play' ? G.frozen() : true;
      pads.forEach(function (g) {
        const c = GP.cfg(g), e = {};
        NAMES.forEach(function (k) { e[k] = GP.edge(g, c.b[k]); });
        const d = dirOf(g, c), slot = coop ? GP.slots.indexOf(g) : 0;   // solo: todos os controles comandam o jogador
        if (e.A || e.B || e.X || e.Y || e.LB || e.RB || e.BACK || e.START || d.x || d.y) { if (slot >= 0) GP.lastUse[slot] = now; }
        if (!frozen) {
          if (slot < 0) return;
          const cur = GP.dirs[slot]; GP.dirs[slot] = { x: cur.x || d.x, y: cur.y || d.y };
          if (e.A) G.interact(slot);
          if (e.Y) G.nextAgent(slot);
          if (e.RB) G.cycleAgent(slot, 1);
          if (e.LB) G.cycleAgent(slot, -1);
          if (e.X || e.BACK) CPT.UI.questList();
          if (e.START) CPT.UI.pause();
        } else GP.menu(e, d, now);
      });
    },

    /* ---------- navegação em menus, conversas e atividades ---------- */
    container: function () {
      const m = CPT.Modal.top();
      if (m) return m.card;
      if (CPT.Dialogue.isOpen()) return document.getElementById('dialogue');
      if (CPT.Game.mode === 'title') return document.querySelector('#screen-title .title-box');
      return null;
    },
    cancel: function () {
      const m = CPT.Modal.top();
      if (m) { if (m.onEsc) m.onEsc(); }
      else if (CPT.Dialogue.isOpen()) CPT.Dialogue.cancel();
    },
    focusables: function (cont) {
      return Array.prototype.filter.call(cont.querySelectorAll('button, input'), function (el) {
        return !el.disabled && el.offsetParent !== null && !el.classList.contains('dlg-exit') && !el.classList.contains('act-exit');
      });
    },
    menu: function (e, d, now) {
      const cont = GP.container(); if (!cont) return;
      if (e.B || (e.START && CPT.Modal.top())) { GP.cancel(); return; }
      const dd = d.y ? { x: 0, y: d.y } : { x: d.x, y: 0 }, key = dd.x || dd.y ? dd.x + ',' + dd.y : '';
      if (key) {
        if (GP._navKey !== key) { GP._navKey = key; GP._navNext = now + FIRST; GP.move(dd, cont); }
        else if (now >= GP._navNext) { GP._navNext = now + REPEAT; GP.move(dd, cont); }
      } else GP._navKey = '';
      if (e.A) GP.activate(cont);
    },
    move: function (d, cont) {
      document.body.classList.add('padnav');
      const act = document.activeElement;
      if (act && act.type === 'range' && cont.contains(act) && d.x) {
        act.value = Math.max(+act.min, Math.min(+act.max, +act.value + d.x * 5));
        act.dispatchEvent(new Event('change', { bubbles: true })); return;
      }
      const list = GP.focusables(cont); if (!list.length) return;
      const cur = act && list.indexOf(act) >= 0 ? act : null;
      if (!cur) { (cont.querySelector('.btn.choice') || list[0]).focus(); return; }
      const r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      let best = null, bs = 1e9;
      list.forEach(function (el) {
        if (el === cur) return;
        const q = el.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy;
        let s = null;
        if (d.y > 0 && dy > 4) s = dy + 2.5 * Math.abs(dx);
        else if (d.y < 0 && dy < -4) s = -dy + 2.5 * Math.abs(dx);
        else if (d.x > 0 && dx > 4) s = dx + 2.5 * Math.abs(dy);
        else if (d.x < 0 && dx < -4) s = -dx + 2.5 * Math.abs(dy);
        if (s !== null && s < bs) { bs = s; best = el; }
      });
      if (!best && d.y) {   // dá a volta na lista (vertical)
        best = list.slice().sort(function (a, b) { return a.getBoundingClientRect().top - b.getBoundingClientRect().top; })[d.y > 0 ? 0 : list.length - 1];
      }
      if (best && best !== cur) { best.focus(); try { best.scrollIntoView({ block: 'nearest' }); } catch (err) { /* ok */ } }
    },
    activate: function (cont) {
      const a = document.activeElement;
      if (a && cont.contains(a) && (a.tagName === 'BUTTON' || a.type === 'checkbox') && !a.disabled) { a.click(); return; }
      const b = cont.querySelector('#dlg-actions .btn.primary, .actions .btn.primary, .btn.primary, .btn.choice, button:not([disabled])');
      if (b) b.click();
    },

    /* ---------- painel "🎮 Controle": diagnóstico ao vivo + assistente de botões ---------- */
    openPanel: function () {
      let timer = null;
      const h = CPT.Modal.open('<h2>🎮 Controle</h2><p id="pad-status" class="lead"></p><div id="pad-live"></div><div id="pad-wiz" class="hidden" aria-live="polite"></div>' +
        '<div class="actions"><button class="btn" id="pad-config">Configurar botões</button><button class="btn" id="pad-reset">Restaurar padrão</button><button class="btn" id="pad-swap"></button><button class="btn primary" id="pad-close">Fechar</button></div>',
        { label: 'Controle', cls: 'wide', onEsc: function () { h.close(); }, onClose: function () { clearInterval(timer); GP.capture = null; } });
      const $ = function (s) { return h.card.querySelector(s); };

      function role(g, ok) {
        const idx = ok.indexOf(g);
        if (idx < 0) return '';
        if (ok.length === 1) return '<div class="pa-row"><span>No modo dupla:</span> <b>este controle fica com o Jogador 2</b> (o Jogador 1 joga no teclado)</div>';
        const who = idx > 1 ? null : (GP.swap ? (idx === 0 ? 2 : 1) : idx + 1);
        return '<div class="pa-row"><span>No modo dupla:</span> <b>' + (who ? 'Jogador ' + who : 'não é usado (só 2 controles jogam)') + '</b></div>';
      }
      function pill(on, text) { return '<span class="pill-act' + (on ? ' on' : '') + '">' + (on ? '● ' : '○ ') + text + '</span> '; }
      function render() {
        const all = GP.list(), ok = all.filter(usable);
        let st;
        if (!GP.supported()) st = '✖ Este navegador não oferece suporte a controles. Use Chrome, Edge ou Firefox atualizados.';
        else if (window.isSecureContext === false) st = '✖ Esta página não está em um contexto seguro, e o navegador bloqueia controles. Abra o jogo pelo arquivo <b>index.html</b> ou por <b>http://localhost</b> (ou HTTPS).';
        else if (!GP.enabled) st = 'O controle está desligado em <b>Opções</b>. Ligue para usar.';
        else if (!all.length) st = '<b>Nenhum controle detectado ainda.</b> Faça assim: <b>1)</b> clique em qualquer lugar desta janela do jogo; <b>2)</b> aperte um botão do controle (os navegadores só mostram o controle depois disso); <b>3)</b> se for sem fio, confira se está ligado e pareado. Esta tela atualiza sozinha.';
        else if (!ok.length) st = 'O navegador enxerga ' + all.length + ' dispositivo(s), mas nenhum parece um controle de jogo (sem botões ou é sensor de movimento).';
        else st = '✔ <b>' + ok.length + ' controle(s) em uso.</b> Aperte botões e mexa no analógico: o painel mostra o que o jogo entende.';
        $('#pad-status').innerHTML = st;
        let live = '';
        all.forEach(function (g) {
          const use = usable(g), c = GP.cfg(g), d = dirOf(g, c), saved = !!GP.maps[g.id];
          const pressed = []; (g.buttons || []).forEach(function (b, i) { if (isDown(g, i)) pressed.push(i); });
          const axes = (g.axes || []).slice(0, 6).map(function (v, i) { return '<span class="axis">eixo ' + i + ' <meter min="-1" max="1" value="' + (+v || 0).toFixed(2) + '"></meter> ' + (+v || 0).toFixed(2) + '</span>'; }).join(' ');
          live += '<div class="padcard' + (use ? '' : ' ignored') + '"><b>' + esc(g.id) + '</b><br><small>' + (g.mapping === 'standard' ? 'mapeamento padrão' : 'mapeamento não padrão' + (saved ? ' (configurado por você)' : '')) + ' · ' + (g.buttons || []).length + ' botões · ' + (g.axes || []).length + ' eixos · ' + (use ? 'em uso pelo jogo' : 'ignorado pelo jogo') + '</small>' +
            role(g, ok) + '<div class="pa-row"><span>Botões apertados:</span> <b>' + (pressed.length ? pressed.join(', ') : 'nenhum') + '</b></div><div class="pa-row">' + axes + '</div>' +
            (use ? '<div class="pa-row"><span>O jogo entende:</span> ' + pill(d.y < 0, '↑') + pill(d.y > 0, '↓') + pill(d.x < 0, '←') + pill(d.x > 0, '→') + pill(isDown(g, c.b.A), 'A confirmar') + pill(isDown(g, c.b.B), 'B voltar') + pill(isDown(g, c.b.Y), 'Y agente') + pill(isDown(g, c.b.X), 'X missões') + pill(isDown(g, c.b.START), 'Start pausa') + '</div>' : '') + '</div>';
        });
        $('#pad-live').innerHTML = live;
      }

      function startWizard() {
        const pad = GP.list().filter(usable)[0];
        if (!pad) { $('#pad-status').innerHTML = '<b>Conecte um controle primeiro</b> (clique na janela e aperte um botão dele).'; return; }
        const steps = [
          { k: 'A', t: 'Aperte o botão que será o <b>A</b> (confirmar / interagir)' },
          { k: 'B', t: 'Aperte o botão que será o <b>B</b> (voltar / sair)' },
          { k: 'Y', t: 'Aperte o botão que vai <b>trocar de agente</b>' },
          { k: 'X', t: 'Aperte o botão que abre as <b>missões</b>' },
          { k: 'START', t: 'Aperte o botão de <b>pausa</b> (Start)' },
          { ax: 'x', t: 'Empurre o <b>analógico esquerdo para a DIREITA</b> até o fim' },
          { ax: 'y', t: 'Empurre o <b>analógico esquerdo para BAIXO</b> até o fim' }
        ];
        let i = 0, waiting = true; const got = { b: {}, ax: {} }, usedB = [], usedA = [];
        const box = $('#pad-wiz'); box.classList.remove('hidden');
        function show() {
          box.innerHTML = '<p class="wiz-step"><b>Passo ' + (i + 1) + ' de ' + steps.length + ':</b> ' + steps[i].t + '</p><p><button class="btn small" id="wz-skip">Pular este passo</button> <button class="btn small ghost" id="wz-cancel">Cancelar</button></p>';
          $('#wz-skip').onclick = next; $('#wz-cancel').onclick = function () { finish(false); };
        }
        function next() { i++; waiting = true; if (i >= steps.length) finish(true); else show(); }
        function finish(save) {
          GP.capture = null;
          if (save) {
            GP.maps[pad.id] = { b: got.b, ax: got.ax }; saveMaps(GP.maps); GP.reset();
            box.innerHTML = '<p class="wiz-step"><b>✔ Pronto!</b> Configuração salva para este controle. Teste os botões acima.</p>';
          } else box.classList.add('hidden');
        }
        show();
        GP.capture = function (g) {
          if (g.id !== pad.id || i >= steps.length) return;
          const ax = g.axes || [], neutral = !(g.buttons || []).some(function (b, k) { return isDown(g, k); }) && [0, 1, 2, 3].every(function (k) { return Math.abs(ax[k] || 0) < 0.35; });
          if (waiting) { if (neutral) waiting = false; return; }
          const st = steps[i];
          if (st.k) {
            for (let k = 0; k < (g.buttons || []).length; k++) if (isDown(g, k) && usedB.indexOf(k) < 0) { got.b[st.k] = k; usedB.push(k); next(); return; }
          } else {
            for (let a = 0; a < Math.min(ax.length, 6); a++) {
              if (Math.abs(ax[a]) > 0.7 && usedA.indexOf(a) < 0) { got.ax[st.ax] = a; got.ax[st.ax + 's'] = ax[a] > 0 ? 1 : -1; usedA.push(a); next(); return; }
            }
          }
        };
      }
      $('#pad-config').onclick = startWizard;
      $('#pad-reset').onclick = function () {
        const g = GP.list().filter(usable)[0]; if (g) { delete GP.maps[g.id]; saveMaps(GP.maps); GP.reset(); }
        $('#pad-wiz').classList.add('hidden'); GP.capture = null; render();
      };
      function swapLabel() { $('#pad-swap').textContent = 'Trocar J1 ↔ J2 (2 controles)' + (GP.swap ? ' · trocado' : ''); }
      $('#pad-swap').onclick = function () { GP.swap = !GP.swap; try { localStorage.setItem('cpt-padswap', GP.swap ? '1' : '0'); } catch (e) { /* ok */ } swapLabel(); render(); };
      swapLabel();
      $('#pad-close').onclick = function () { h.close(); };
      render(); timer = setInterval(render, 120);
      return h;
    }
  });

  window.addEventListener('gamepadconnected', function () {
    if (CPT.Game && CPT.Game.mode === 'play' && CPT.UI) CPT.UI.toast('🎮 <b>Controle conectado.</b> Use o analógico ou o direcional e o botão A.', 4200);
  });
  window.addEventListener('gamepaddisconnected', function () {
    if (CPT.Game && CPT.Game.mode === 'play' && CPT.UI) CPT.UI.toast('🎮 Controle desconectado. O teclado continua funcionando.', 3500);
  });
  ['mousedown', 'keydown'].forEach(function (t) { document.addEventListener(t, function () { document.body.classList.remove('padnav'); }, true); });
})();
