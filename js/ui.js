/* Conexão para Todos — ui.js
 * Interface: modais, HUD, toasts, tela de título, tutorial, pausa, opções, lista de missões e vitória. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function el(html) { const d = document.createElement('div'); d.innerHTML = html.trim(); return d.firstChild; }

  const STATS = {
    ac: { name: 'Acesso', icon: 'wifi', color: '#2a5bd7', desc: 'Aparelhos, internet e serviços ao alcance de todos.' },
    ab: { name: 'Acessibilidade', icon: 'access', color: '#6f55b8', desc: 'Quanto lugares e serviços atendem pessoas com diferentes necessidades.' },
    co: { name: 'Conhecimento', icon: 'book', color: '#237b4f', desc: 'Capacidade da comunidade de usar a tecnologia com autonomia e segurança.' },
    pt: { name: 'Pontos de Comunidade', icon: 'star', color: '#b9772e', desc: 'Recurso coletivo para financiar melhorias no Centro Comunitário.' }
  };
  CPT.STATS = STATS;
  function statIcon(k, px) { return '<img class="pix ico" alt="" src="' + CPT.Sprites.iconURL(STATS[k].icon, STATS[k].color, px || 2) + '">'; }

  CPT.chipsHTML = function (deltas) {
    return (deltas || []).filter(function (d) { return d.delta !== 0; }).map(function (d) {
      const up = d.delta > 0;
      return '<span class="chip ' + (up ? 'up' : 'down') + '">' + statIcon(d.key, 1) + '<span aria-hidden="true">' + (up ? '▲ +' : '▼ ') + d.delta + '</span><span class="sr">' + (up ? 'sobe ' : 'cai ') + Math.abs(d.delta) + '</span> ' + esc(STATS[d.key].name) + '</span>';
    }).join(' ');
  };

  /* ---------- Modal ---------- */
  const Modal = (CPT.Modal = {
    stack: [],
    open: function (html, opts) {
      opts = opts || {};
      const root = $('#modal-root');
      const ov = el('<div class="overlay ' + (opts.cls || '') + '"><div class="card" role="dialog" aria-modal="true" aria-label="' + esc(opts.label || 'Janela') + '" tabindex="-1">' + html + '</div></div>');
      const prev = document.activeElement;
      root.appendChild(ov);
      const card = $('.card', ov);
      const h = { root: ov, card: card, closed: false, onEsc: opts.onEsc || null,
        close: function () {
          if (h.closed) return; h.closed = true;
          ov.remove(); Modal.stack = Modal.stack.filter(function (x) { return x !== h; });
          if (prev && prev.focus && document.body.contains(prev)) { try { prev.focus(); } catch (e) { /* ok */ } }
          if (opts.onClose) opts.onClose();
        } };
      Modal.stack.push(h);
      const first = $(opts.focus || '[data-autofocus], .btn.primary, .btn', card);
      try { (first || card).focus({ preventScroll: true }); } catch (e) { /* ok */ }
      card.scrollTop = 0;
      return h;
    },
    top: function () { return Modal.stack[Modal.stack.length - 1]; },
    closeAll: function () { Modal.stack.slice().forEach(function (m) { m.close(); }); }
  });
  document.addEventListener('keydown', function (e) {
    const m = Modal.top();
    if (!m) return;
    if (e.key === 'Escape' && m.onEsc) { e.preventDefault(); e.stopPropagation(); m.onEsc(); return; }
    if (e.key === 'Tab') {
      const f = $$('button:not([disabled]), input, [tabindex="0"]', m.card).filter(function (x) { return x.offsetParent !== null; });
      if (!f.length) return;
      const i = f.indexOf(document.activeElement);
      if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && (i === f.length - 1 || i < 0)) { e.preventDefault(); f[0].focus(); }
    }
  }, true);

  /* ---------- Configurações ---------- */
  const defaults = { volume: 50, muted: false, reduceMotion: false, largeText: false, contrast: false, touch: false, gamepad: true };
  const Settings = (CPT.Settings = {
    v: Object.assign({}, defaults),
    load: function () {
      try { const s = JSON.parse(localStorage.getItem('cpt-settings') || '{}'); Object.assign(Settings.v, s); } catch (e) { /* ok */ }
      if (!('reduceMotionSet' in Settings.v) && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) Settings.v.reduceMotion = true;
      if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches && !Settings.v.touchSet) Settings.v.touch = true;
      Settings.apply();
    },
    save: function () { try { localStorage.setItem('cpt-settings', JSON.stringify(Settings.v)); } catch (e) { /* ok */ } },
    apply: function () {
      const b = document.body, v = Settings.v;
      b.classList.toggle('reduce-motion', !!v.reduceMotion);
      b.classList.toggle('large-text', !!v.largeText);
      b.classList.toggle('high-contrast', !!v.contrast);
      b.classList.toggle('show-touch', !!v.touch);
      CPT.Sound.volume = v.volume / 100; CPT.Sound.muted = !!v.muted;
      if (CPT.Gamepad) CPT.Gamepad.enabled = v.gamepad !== false;
    },
    open: function () {
      const v = Settings.v;
      const h = Modal.open(
        '<h2>Opções</h2><div class="opts">' +
        '<label class="opt"><span>Volume dos sons</span><input id="o-vol" type="range" min="0" max="100" value="' + v.volume + '" aria-label="Volume"></label>' +
        '<label class="opt check"><input id="o-mute" type="checkbox"' + (v.muted ? ' checked' : '') + '><span>Silenciar sons (o jogo funciona sem som)</span></label>' +
        '<label class="opt check"><input id="o-motion" type="checkbox"' + (v.reduceMotion ? ' checked' : '') + '><span>Reduzir animações e efeitos</span></label>' +
        '<label class="opt check"><input id="o-large" type="checkbox"' + (v.largeText ? ' checked' : '') + '><span>Texto maior</span></label>' +
        '<label class="opt check"><input id="o-contrast" type="checkbox"' + (v.contrast ? ' checked' : '') + '><span>Alto contraste na interface</span></label>' +
        '<label class="opt check"><input id="o-touch" type="checkbox"' + (v.touch ? ' checked' : '') + '><span>Mostrar controles na tela (setas e botão de interagir)</span></label>' +
        '<label class="opt check"><input id="o-pad" type="checkbox"' + (v.gamepad !== false ? ' checked' : '') + '><span>Usar controle (gamepad), quando conectado</span></label>' +
        '</div><div class="actions"><button class="btn primary" id="o-ok">Pronto</button></div>',
        { label: 'Opções', onEsc: function () { h.close(); } });
      function upd() {
        v.volume = +$('#o-vol', h.card).value; v.muted = $('#o-mute', h.card).checked;
        v.reduceMotion = $('#o-motion', h.card).checked; v.reduceMotionSet = true;
        v.largeText = $('#o-large', h.card).checked; v.contrast = $('#o-contrast', h.card).checked;
        v.touch = $('#o-touch', h.card).checked; v.touchSet = true; v.gamepad = $('#o-pad', h.card).checked;
        Settings.apply(); Settings.save(); CPT.Sound.init(); CPT.Sound.play('click');
      }
      $$('input', h.card).forEach(function (i) { i.addEventListener('change', upd); });
      $('#o-ok', h.card).onclick = function () { h.close(); };
      return h;
    }
  });

  /* ---------- Toast ---------- */
  const UI = (CPT.UI = {
    toast: function (html, ms) {
      const box = $('#toasts');
      const t = el('<div class="toast">' + html + '</div>');
      box.appendChild(t);
      while (box.children.length > 4) box.firstChild.remove();
      setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, ms || 3800);
    },
    esc: esc, $: $, $$: $$, el: el, statIcon: statIcon,

    /* ---------- HUD ---------- */
    buildHUD: function () {
      const box = $('#stats');
      box.innerHTML = '';
      ['ac', 'ab', 'co'].forEach(function (k) {
        const b = el('<button class="stat" data-stat="' + k + '" aria-label="">' + statIcon(k, 2) +
          '<span class="stat-name">' + STATS[k].name + '</span>' +
          '<span class="meter" aria-hidden="true"><span class="fill"></span><span class="goal"></span></span>' +
          '<span class="stat-val">0</span></button>');
        b.onclick = function () { UI.statusPanel(); };
        box.appendChild(b);
      });
      $('#ico-pt').src = CPT.Sprites.iconURL('star', '#b9772e', 2);
      const team = $('#team'); team.innerHTML = '';
      CPT.Player.AGENTS.forEach(function (a, i) {
        const b = el('<button class="agent" data-i="' + i + '" aria-pressed="false" title="Controlar ' + a.name + ' (tecla ' + (i + 1) + ')">' +
          '<img class="pix portrait" alt="" src="' + CPT.Sprites.portraitURL(a.look) + '"><span class="agent-txt"><b>' + a.name + '</b><small>' + a.role + '</small></span>' +
          '<span class="agent-key" aria-hidden="true">' + (i + 1) + '</span><span class="agent-state">Em controle</span></button>');
        b.onclick = function (e) { this.blur(); CPT.Game.switchAgent(i, CPT.Player.coop && e.shiftKey ? 1 : 0); };
        team.appendChild(b);
      });
    },
    updateHUD: function (st) {
      const G = CPT.Game;
      ['ac', 'ab', 'co'].forEach(function (k) {
        const b = $('.stat[data-stat="' + k + '"]'); if (!b) return;
        const v = Math.round(st.stats[k]);
        $('.fill', b).style.width = v + '%'; $('.stat-val', b).textContent = v;
        b.setAttribute('aria-label', STATS[k].name + ': ' + v + ' de 100. Meta: ' + G.GOAL + '. Toque para ver detalhes.');
        b.classList.toggle('goal-ok', v >= G.GOAL);
      });
      $('#val-pt').textContent = st.pts;
      const P = CPT.Player, p1 = P.order[0], p2 = P.coop ? P.order[1] : -1;
      $$('.agent').forEach(function (b, i) {
        b.setAttribute('aria-pressed', i === p1 || i === p2 ? 'true' : 'false');
        b.dataset.p = i === p1 ? '1' : (i === p2 ? '2' : '');
        $('.agent-state', b).textContent = P.coop ? (i === p1 ? 'Jogador 1' : (i === p2 ? 'Jogador 2' : '')) : 'Em controle';
      });
      const done = G.doneCount();
      $('#val-prog').textContent = done + '/' + CPT.Missions.list.length;
    },
    setTracker: function (title, text, pct) {
      $('#tracker-title').textContent = title;
      $('#tracker-text').textContent = text;
    },

    /* ---------- Painel de status ---------- */
    statusPanel: function () {
      const G = CPT.Game, st = G.state;
      let rows = '';
      ['ac', 'ab', 'co'].forEach(function (k) {
        const v = Math.round(st.stats[k]);
        const lvl = v >= G.GOAL ? 'Meta atingida ✔' : (v >= 40 ? 'Em evolução' : 'Precisa de atenção');
        rows += '<div class="srow">' + statIcon(k, 3) + '<div><b>' + STATS[k].name + ' — ' + v + '/100</b> <em>(' + lvl + ')</em>' +
          '<div class="meter big" aria-hidden="true"><span class="fill" style="width:' + v + '%"></span><span class="goal"></span></div>' +
          '<p>' + STATS[k].desc + '</p><p class="eff"><b>Efeito no jogo:</b> ' + G.effectText(k) + '</p></div></div>';
      });
      const log = st.log.slice(-5).reverse().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') || '<li>Ainda não houve mudanças. Converse com os moradores!</li>';
      const h = Modal.open('<h2>Status de Conecta</h2><p class="lead">Meta: levar os três status a pelo menos <b>' + G.GOAL + '</b> e concluir as ' + CPT.Missions.list.length + ' missões.</p>' + rows +
        '<div class="srow">' + statIcon('pt', 3) + '<div><b>Pontos de Comunidade — ' + st.pts + '</b><p>' + STATS.pt.desc + ' Ganhe pontos concluindo missões e descobrindo placas.</p></div></div>' +
        '<h3>Últimas mudanças</h3><ul class="log">' + log + '</ul><div class="actions"><button class="btn primary">Fechar</button></div>',
        { label: 'Status de Conecta', onEsc: function () { h.close(); } });
      $('.btn', h.card).onclick = function () { h.close(); };
      return h;
    },

    /* ---------- Lista de missões ---------- */
    questList: function () {
      const G = CPT.Game, M = CPT.Missions, st = G.state;
      let rows = '';
      M.list.forEach(function (m) {
        const ms = st.missions[m.id], disc = st.discovered[m.area], locked = m.id === 'portal' && !G.portalUnlocked();
        let label, cls;
        if (ms.status === 'done') { label = '✔ Concluída'; cls = 'done'; }
        else if (ms.status === 'active') { label = '◐ Em andamento'; cls = 'doing'; }
        else if (locked) { label = '🔒 Bloqueada'; cls = 'lock'; }
        else if (!disc) { label = '? Não descoberta'; cls = 'lock'; }
        else { label = '! Disponível'; cls = 'new'; }
        const known = disc || ms.status !== 'new';
        rows += '<li class="q ' + cls + '"><div class="q-head"><b>' + (known ? esc(m.title) : 'Missão misteriosa') + '</b><span class="tag">' + label + '</span></div>' +
          '<p>' + (known ? '<span class="where">Local: ' + esc(m.place) + '.</span> ' + esc(m.blurb) : 'Explore a cidade para descobrir este local.') + '</p>' +
          (locked ? '<p class="hint">Conclua ' + G.PORTAL_NEEDS + ' missões para liberar o Portal Conecta+ (feitas: ' + G.doneCount(true) + ').</p>' : '') +
          (known && ms.status !== 'done' && !locked ? '<button class="btn small" data-track="' + m.id + '">' + (st.tracked === m.id ? 'Acompanhando' : 'Acompanhar') + '</button>' : '') + '</li>';
      });
      const h = Modal.open('<h2>Missões</h2><p class="lead">' + G.doneCount() + ' de ' + M.list.length + ' concluídas.</p><ul class="quests">' + rows + '</ul><div class="actions"><button class="btn primary" id="q-ok">Fechar</button></div>',
        { label: 'Lista de missões', onEsc: function () { h.close(); } });
      $$('[data-track]', h.card).forEach(function (b) { b.onclick = function () { G.track(b.dataset.track); h.close(); UI.questList(); }; });
      $('#q-ok', h.card).onclick = function () { h.close(); };
      return h;
    },

    /* ---------- Como jogar / Tutorial / História ---------- */
    pages: function (title, pages, opts) {
      opts = opts || {};
      return new Promise(function (resolve) {
        let i = 0;
        const h = Modal.open('<div class="pager"></div>', { label: title, onEsc: function () { done(); } });
        function done() { h.close(); resolve(); }
        function render() {
          const p = pages[i];
          const dots = pages.map(function (_, k) { return '<span class="dot' + (k === i ? ' on' : '') + '"></span>'; }).join('');
          $('.pager', h.card).innerHTML = '<p class="kicker">' + esc(title) + ' · ' + (i + 1) + ' de ' + pages.length + '</p><h2>' + p.title + '</h2><div class="pg-body">' + p.html + '</div><div class="dots" aria-hidden="true">' + dots + '</div>' +
            '<div class="actions">' + (opts.skip && i < pages.length - 1 ? '<button class="btn ghost" id="pg-skip">' + opts.skip + '</button>' : '') +
            (i > 0 ? '<button class="btn" id="pg-prev">Voltar</button>' : '') +
            '<button class="btn primary" id="pg-next" data-autofocus>' + (i === pages.length - 1 ? (opts.finish || 'Fechar') : 'Próximo') + '</button></div>';
          $('#pg-next', h.card).onclick = function () { CPT.Sound.play('click'); if (i < pages.length - 1) { i++; render(); } else done(); };
          const pv = $('#pg-prev', h.card); if (pv) pv.onclick = function () { i--; render(); };
          const sk = $('#pg-skip', h.card); if (sk) sk.onclick = done;
          $('#pg-next', h.card).focus();
        }
        render();
      });
    },
    keys: function (arr) { return arr.map(function (k) { return '<kbd>' + k + '</kbd>'; }).join(' '); },
    howToPages: function (coop) {
      const k = UI.keys;
      const pages = [
        { title: 'Explorar a cidade', html: '<p>Ande por Conecta com ' + k(['W', 'A', 'S', 'D']) + ' ou ' + k(['←', '↑', '↓', '→']) + '. Em telas de toque, use as setas na tela.</p><p>Você controla uma equipe de <b>três agentes</b>, cada um com seu marcador: <b>Márcio ● círculo</b> (acessibilidade), <b>Miguel ■ quadrado</b> (acesso) e <b>Yuri ▲ triângulo</b> (conhecimento). Troque de agente com ' + k(['Tab']) + ' ou ' + k(['1']) + k(['2']) + k(['3']) + ' ou clicando nos retratos. Os outros seguem você.</p>' },
        { title: 'Conversar e ajudar', html: '<p>Chegue perto de um morador, objeto ou placa e aperte ' + k(['E']) + ' ou ' + k(['Espaço']) + ' — ou use o botão <b>Interagir</b>.</p><p>Balões mostram o que fazer: <b>!</b> missão nova, <b>…</b> em andamento, <b>✔</b> concluída. Placas e cartazes dão pontos de curiosidade. Nada é cronometrado: leia com calma.</p><p><b>Quer sair?</b> Em qualquer conversa ou atividade, aperte ' + k(['Esc']) + ' ou clique em <b>✕ Sair</b>. A missão continua de onde parou e o que já foi decidido fica salvo.</p>' },
        { title: 'Status e pontos', html: '<p>Suas escolhas mudam três status coletivos de 0 a 100: <b>Acesso</b>, <b>Acessibilidade</b> e <b>Conhecimento digital</b>. Toque em uma barra para ver o que ela faz de verdade no jogo.</p><p>Os <b>Pontos de Comunidade</b> pagam melhorias no Centro Comunitário. Escolheu mal? Tudo bem: a equipe explica, você tenta de novo. Ninguém perde o jogo.</p>' },
        { title: 'Seu objetivo', html: '<p>Conclua as <b>10 missões</b> e leve os <b>três status a pelo menos 60</b>. Se algum ficar para trás, o Centro Comunitário ajuda a recuperar.</p><p>Pause com ' + k(['Esc']) + ' ou ' + k(['P']) + '. Veja as missões com ' + k(['M']) + '. Inclusão digital é tarefa da cidade inteira — não só de cada pessoa.</p>' }
      ];
      if (coop) {
        pages[0] = { title: 'Dupla no mesmo teclado', html: '<p>Dois jogadores, uma cidade! Cada um controla <b>um agente</b>, e o terceiro agente acompanha o Jogador 1.</p>' +
          '<table class="sum keys"><thead><tr><th scope="col"></th><th scope="col">Jogador 1</th><th scope="col">Jogador 2</th></tr></thead><tbody>' +
          '<tr><th scope="row">Andar</th><td>' + k(['W', 'A', 'S', 'D']) + '</td><td>' + k(['←', '↑', '↓', '→']) + '</td></tr>' +
          '<tr><th scope="row">Interagir</th><td>' + k(['E']) + ' ou ' + k(['Espaço']) + '</td><td>' + k(['Enter']) + '</td></tr>' +
          '<tr><th scope="row">Trocar de agente</th><td>' + k(['Q']) + ' ou ' + k(['1']) + k(['2']) + k(['3']) + '</td><td>' + k(['Shift direito']) + ' ou ' + k(['Num 1']) + k(['Num 2']) + k(['Num 3']) + '</td></tr>' +
          '</tbody></table><p>Nos retratos da equipe: clique = Jogador 1, <b>Shift + clique</b> = Jogador 2. Se um pegar o agente do outro, eles trocam de lugar.</p>' };
        pages[1] = { title: 'Conversar e ajudar — em dupla', html: '<p>Qualquer um pode conversar, pegar objetos e ler placas. Quem interagiu fala pelo seu agente. <b>Os dois podem escolher as respostas</b>: conversem antes de decidir!</p><p>A câmera acompanha a dupla, então vocês não podem se afastar demais um do outro. Balões mostram o que fazer: <b>!</b> missão nova, <b>…</b> em andamento, <b>✔</b> concluída.</p><p><b>Quer sair?</b> ' + k(['Esc']) + ' ou <b>✕ Sair</b> fecha a conversa; a missão continua de onde parou.</p>' };
        pages[3] = { title: 'Seu objetivo (juntos)', html: '<p>Concluam as <b>10 missões</b> e levem os <b>três status a pelo menos 60</b>. Na missão final, <b>cada posto de teste exige um agente diferente</b>: combinem quem vai a cada posto e troquem de agente quando precisar.</p><p>Pausa: ' + k(['Esc']) + ' ou ' + k(['P']) + '. Missões: ' + k(['M']) + '. Cooperar é o jeito mais rápido de incluir todo mundo!</p>' };
      }
      pages.push({ title: 'Jogando com controle', html: '<p>Conecte um controle (Xbox, PlayStation, Switch Pro ou similar) e aperte qualquer botão: o jogo reconhece sozinho. Dá para jogar do início ao fim sem teclado.</p>' +
        '<table class="sum keys"><tbody>' +
        '<tr><th scope="row">Andar</th><td>analógico esquerdo ou direcional</td></tr>' +
        '<tr><th scope="row">Interagir e confirmar</th><td><b>A</b> (✕ no PlayStation)</td></tr>' +
        '<tr><th scope="row">Sair ou voltar</th><td><b>B</b> (○ no PlayStation)</td></tr>' +
        '<tr><th scope="row">Trocar de agente</th><td><b>Y</b> ou <b>RB</b> = próximo · <b>LB</b> = anterior (percorre os 3)</td></tr>' +
        '<tr><th scope="row">Missões</th><td><b>X</b> (□) ou <b>Select</b></td></tr>' +
        '<tr><th scope="row">Pausa</th><td><b>Start</b></td></tr>' +
        '<tr><th scope="row">Respostas e menus</th><td>direcional ou analógico para escolher, <b>A</b> para confirmar</td></tr></tbody></table>' +
        '<p>' + (coop ? 'No modo dupla: com <b>2 controles</b>, o primeiro é do Jogador 1 e o segundo do Jogador 2. Com <b>1 controle</b>, ele fica com o <b>Jogador 2</b> e o Jogador 1 joga no teclado. Se os controles ficarem trocados, use <b>Trocar J1 ↔ J2</b> no painel 🎮 Controle.' : 'Em um jogador, o primeiro controle conectado comanda a equipe.') + '</p>' });
      return pages;
    },

    introStory: function () {
      return UI.pages('História', [
        { title: 'Bem-vindo(a) a Conecta', html: '<p>Conecta é uma cidade pequena e acolhedora. Mas muita coisa por lá só funciona pelo celular ou pela internet: marcar consulta, estudar, falar com a Prefeitura, vender pão.</p><p>Quem não tem aparelho, sinal ou prática não está “atrasado”: está sem as oportunidades certas.</p>' },
        { title: 'Sua equipe: Agentes de Inclusão Digital', html: '<p>Você lidera <b>Márcio</b>, <b>Miguel</b> e <b>Yuri</b>. Juntos, vão conversar com os moradores, achar as barreiras e criar soluções <b>com</b> a comunidade — nunca <b>no lugar</b> dela.</p><p>Cada pequena ação faz diferença. Vamos começar?</p>' }
      ], { finish: 'Ver como jogar', skip: 'Pular história' });
    },

    credits: function () {
      const h = Modal.open('<h2>Créditos</h2><p><b>Conexão para Todos</b> — jogo educativo em pixel art.</p>' +
        '<p>Trabalho da <b>Equipe 1</b> · Universidade Federal do Ceará (UFC), Campus de Russas.</p>' +
        '<p>Tema: <i>Analfabetismo Digital, Acessibilidade e Exclusão Tecnológica: Desafios e Caminhos para a Cidadania na Era Digital.</i></p>' +
        '<p>Estrutura do jogo: Espaço = Exploração · Atores = Marcadores · Itens = Status · Desafios = Cooperação.</p>' +
        '<p class="small">Arte e sons gerados por código (HTML5 Canvas e Web Audio), sem imagens ou serviços externos. Personagens e cidade fictícios.</p>' +
        '<div class="actions"><button class="btn primary">Fechar</button></div>', { label: 'Créditos', onEsc: function () { h.close(); } });
      $('.btn', h.card).onclick = function () { h.close(); };
    },

    confirm: function (text, yes, no) {
      return new Promise(function (res) {
        const h = Modal.open('<p class="lead">' + text + '</p><div class="actions"><button class="btn" id="c-no">' + (no || 'Cancelar') + '</button><button class="btn primary" id="c-yes">' + (yes || 'Confirmar') + '</button></div>',
          { label: 'Confirmação', onEsc: function () { h.close(); res(false); } });
        $('#c-no', h.card).onclick = function () { h.close(); res(false); };
        $('#c-yes', h.card).onclick = function () { h.close(); res(true); };
        $('#c-no', h.card).focus();
      });
    },

    /* ---------- Pausa ---------- */
    pause: function () {
      const G = CPT.Game;
      if (G.paused) return;
      G.paused = true;
      const h = Modal.open('<h2>Jogo pausado</h2><div class="menu">' +
        '<button class="btn primary" id="p-resume">Continuar</button>' +
        '<button class="btn" id="p-quests">Missões e objetivos</button>' +
        '<button class="btn" id="p-status">Status da cidade</button>' +
        '<button class="btn" id="p-how">Como jogar</button>' +
        '<button class="btn" id="p-pad">🎮 Controle</button>' +
        '<button class="btn" id="p-opts">Opções</button>' +
        '<button class="btn" id="p-restart">Reiniciar partida</button>' +
        '<button class="btn" id="p-menu">Voltar ao menu</button></div>',
        { label: 'Pausa', onEsc: function () { h.close(); }, onClose: function () { G.paused = false; } });
      $('#p-resume', h.card).onclick = function () { h.close(); };
      $('#p-quests', h.card).onclick = function () { UI.questList(); };
      $('#p-status', h.card).onclick = function () { UI.statusPanel(); };
      $('#p-how', h.card).onclick = function () { UI.pages('Como jogar', UI.howToPages(G.coopMode)); };
      $('#p-pad', h.card).onclick = function () { CPT.Gamepad.openPanel(); };
      $('#p-opts', h.card).onclick = function () { Settings.open(); };
      $('#p-restart', h.card).onclick = function () {
        UI.confirm('Começar uma nova partida? O progresso atual será perdido.', 'Reiniciar', 'Continuar jogando').then(function (ok) { if (ok) { Modal.closeAll(); G.newGame(); } });
      };
      $('#p-menu', h.card).onclick = function () {
        UI.confirm('Voltar ao menu inicial? O progresso atual será perdido.', 'Voltar ao menu', 'Continuar jogando').then(function (ok) { if (ok) { Modal.closeAll(); G.toTitle(); } });
      };
    },

    /* ---------- Vitória ---------- */
    victory: function (sum) {
      const G = CPT.Game;
      let rows = '';
      ['ac', 'ab', 'co'].forEach(function (k) {
        rows += '<tr><th scope="row">' + statIcon(k, 2) + ' ' + STATS[k].name + '</th><td>' + sum.start[k] + '</td><td>' + sum.end[k] + '</td><td>▲ +' + (sum.end[k] - sum.start[k]) + '</td></tr>';
      });
      const items = CPT.Missions.list.map(function (m) { return '<li>✔ ' + esc(m.title) + '</li>'; }).join('');
      const h = Modal.open('<div class="victory"><p class="kicker">Missão principal cumprida</p><h2>Conecta agora é para todos!</h2>' +
        '<p class="lead">As melhorias que você ajudou a criar fazem a cidade funcionar para mais gente — e quem ensinou aprendeu junto.</p>' +
        '<table class="sum"><thead><tr><th scope="col">Status</th><th scope="col">Início</th><th scope="col">Agora</th><th scope="col">Mudança</th></tr></thead><tbody>' + rows + '</tbody></table>' +
        '<p><b>Pontos de Comunidade:</b> ' + sum.pts + ' · <b>Curiosidades descobertas:</b> ' + sum.signs + ' de ' + CPT.World.SIGNS.length + '</p>' +
        '<details><summary>Missões concluídas (' + CPT.Missions.list.length + ')</summary><ul class="done-list">' + items + '</ul></details>' +
        '<div class="msg"><p><b>O que a cidade aprendeu</b></p><p>Exclusão digital não é falta de capacidade das pessoas: é falta de acesso, de interfaces acessíveis e de apoio para aprender. Inclusão digital é um caminho para a autonomia e a cidadania, e só funciona quando <b>comunidade, instituições e desenvolvedores</b> constroem juntos — oferecendo mais de um caminho, ensinando sem humilhar e testando com quem realmente vai usar.</p></div>' +
        '<div class="actions"><button class="btn primary" id="v-cont">Continuar explorando</button><button class="btn" id="v-again">Jogar novamente</button><button class="btn" id="v-menu">Menu inicial</button></div></div>',
        { label: 'Vitória', cls: 'win', onEsc: function () { h.close(); } });
      $('#v-cont', h.card).onclick = function () { h.close(); };
      $('#v-again', h.card).onclick = function () { Modal.closeAll(); G.newGame(); };
      $('#v-menu', h.card).onclick = function () { Modal.closeAll(); G.toTitle(); };
    },

    /* ---------- Arte da tela de título ---------- */
    drawTitle: function (cv, t) {
      const S = CPT.Sprites, ctx = cv.getContext('2d');
      const w = cv.width, h = cv.height;
      const sc = Math.max(2, Math.ceil(Math.max(w / 260, h / 150)));
      const vw = Math.ceil(w / sc), vh = Math.ceil(h / sc);
      ctx.setTransform(sc, 0, 0, sc, 0, 0); ctx.imageSmoothingEnabled = false;
      const bands = ['#6fa9f5', '#7fb5f8', '#93c1fa', '#a9cdfb', '#bfd5fb', '#d2d6fb', '#e2d7fa', '#f0dbf3'];
      const gy = Math.round(vh * 0.62);
      for (let i = 0; i < bands.length; i++) { ctx.fillStyle = bands[i]; ctx.fillRect(0, Math.floor((gy / bands.length) * i), vw, Math.ceil(gy / bands.length) + 1); }
      ctx.fillStyle = '#ffe28a'; ctx.fillRect(vw - 60, 16, 16, 16); ctx.fillStyle = '#fff3bf'; ctx.fillRect(vw - 58, 18, 8, 8);
      const drift = t * 3;
      [[20, 14, 28], [110, 30, 36], [190, 10, 24], [60, 44, 22]].forEach(function (c, i) {
        const x = ((c[0] + drift * (0.5 + i * 0.2)) % (vw + 60)) - 30;
        ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x, c[1], c[2], 6); ctx.fillRect(x + 4, c[1] - 4, c[2] - 10, 5); ctx.fillRect(x + 8, c[1] + 6, c[2] - 14, 3);
      });
      ctx.fillStyle = '#5eb36b'; ctx.fillRect(0, gy, vw, vh - gy);
      ctx.fillStyle = '#74c97f'; for (let x = 0; x < vw; x += 9) ctx.fillRect(x, gy + ((x * 7) % 5) + 2, 2, 1);
      ctx.fillStyle = '#eadfc4'; ctx.fillRect(0, gy + 26, vw, 22);
      ctx.fillStyle = '#d6c7a4'; for (let x = 0; x < vw; x += 12) ctx.fillRect(x, gy + 26, 1, 22);
      ctx.fillRect(0, gy + 36, vw, 1);
      const bl = [['posto', 7, 6], ['biblioteca', 8, 6], ['prefeitura', 9, 6], ['escola', 8, 6], ['padaria', 6, 6]];
      let total = 0; bl.forEach(function (b) { total += b[1] * 8; });
      let x = Math.round((vw - total) / 2);
      bl.forEach(function (b) {
        const img = S.getBuilding(b[0], b[1], b[2]);
        ctx.drawImage(img, x, gy + 12 - img.height / 2, img.width / 2, img.height / 2);
        x += b[1] * 8;
      });
      [[8, 0], [20, 1], [vw - 30, 0], [vw - 14, 1]].forEach(function (p) { ctx.drawImage(S.tiles['tree' + p[1]], p[0], gy + 2); });
      const px = Math.round(vw * (w > 900 ? 0.76 : 0.5)) - 8, py = gy + 20;
      ctx.drawImage(S.tiles.wifiPole, px, py - 12);
      const pulse = Settings.v.reduceMotion ? 1 : (Math.floor(t * 2) % 3);
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1;
      for (let r = 0; r < 3; r++) {
        if (!Settings.v.reduceMotion && r > pulse) continue;
        ctx.globalAlpha = Settings.v.reduceMotion ? 0.8 : 1 - r * 0.2;
        ctx.beginPath(); ctx.arc(px + 8, py - 14, 7 + r * 5, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      const dirs = ['right'], spots = [px - 54, px - 36, px - 18];
      CPT.Player.AGENTS.forEach(function (a, i) {
        const walk = !Settings.v.reduceMotion;
        const fr = walk ? [0, 1, 0, 3][Math.floor(t * 6 + i) % 4] : 0;
        const ax = spots[i] + (walk ? Math.sin(t * 0.8) * 4 : 0), ay = gy + 30 + (i % 2) * 3;
        const spr = S.character(a.look, dirs[0], fr);
        ctx.drawImage(spr, Math.round(ax), ay - 22);
        ctx.drawImage(S.tiles[a.pin], Math.round(ax) + 2, ay - 36 + (walk ? Math.round(Math.sin(t * 3 + i)) : 0));
      });
      const npcs = ['marta', 'thiago', 'neide'];
      npcs.forEach(function (id, i) {
        const n = CPT.World.NPCS[id];
        ctx.drawImage(S.character(n.look, 'left', 0), px + 30 + i * 22, gy + 30 + (i % 2) * 3 - 22);
      });
    }
  });
  $('#year') && ($('#year').textContent = new Date().getFullYear());
})();
