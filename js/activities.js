/* Conexão para Todos — activities.js
 * Atividades interativas das missões: ordenar passos, achar barreiras/golpes, planejar uma oficina,
 * Fundo da Cidade e resumo de missão concluída. Cada uma devolve uma Promise. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const $ = function (s, r) { return (r || document).querySelector(s); };
  const $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function header(who, title) {
    const url = (function () {
      const P = CPT.Player, W = CPT.World;
      if (who === 'me') return CPT.Sprites.portraitURL(P.actor().def.look);
      if (W.NPCS[who]) return CPT.Sprites.portraitURL(W.NPCS[who].look);
      return CPT.Sprites.portraitURL(P.actor().def.look);
    })();
    return '<div class="act-head"><img class="pix portrait" alt="" src="' + url + '"><div><p class="kicker">Atividade</p><h2>' + esc(title) + '</h2></div><button class="btn small ghost act-exit" aria-label="Sair da atividade (tecla Esc)">✕ Sair <kbd>Esc</kbd></button></div>';
  }
  function hintBlock(hint) {
    if (!hint) return '';
    const ok = CPT.Game.state.stats.co >= CPT.Game.HINT_AT;
    return '<div class="hintrow"><button class="btn small ghost" id="a-hint"' + (ok ? '' : ' disabled') + '>' +
      (ok ? 'Pedir uma dica ao Yuri' : 'Dicas liberam com Conhecimento ' + CPT.Game.HINT_AT) + '</button><p id="a-hint-text" class="hint-box hidden"><b>Dica do Yuri:</b> ' + esc(hint) + '</p></div>';
  }
  function wireHint(card) {
    const b = $('#a-hint', card); if (!b) return;
    b.onclick = function () { $('#a-hint-text', card).classList.remove('hidden'); b.disabled = true; };
  }
  function block(h) { CPT.Game.block(1); const c = h.close; h.close = function () { if (!h.closed) CPT.Game.block(-1); c(); }; return h; }

  const A = (CPT.Activities = {
    /* ---- Ordenar passos ---- */
    order: function (cfg) {
      return new Promise(function (res, rej) {
        const items = cfg.items.map(function (t, i) { return { t: t, i: i }; });
        const shuf = items.slice().sort(function (a, b) { return ((a.i * 7 + 3) % 5) - ((b.i * 7 + 3) % 5); });
        if (shuf.every(function (x, k) { return x.i === k; })) shuf.reverse();
        let next = 0, tries = 0;
        const h = block(CPT.Modal.open(header(cfg.who, cfg.title) + '<p class="lead">' + esc(cfg.prompt) + '</p>' +
          '<div class="order"><div><h3>Passos disponíveis</h3><div id="o-pool" class="pool"></div></div><div><h3>Sequência do passo a passo</h3><ol id="o-seq" class="seq" aria-live="polite"></ol></div></div>' +
          '<p id="o-msg" class="msg-line" aria-live="polite">Toque nos passos na ordem em que a pessoa fará cada um.</p>' + hintBlock(cfg.hint) +
          '<div class="actions"><button class="btn primary" id="o-done" disabled>Concluir</button></div>', { label: cfg.title, onEsc: exit }));
        function exit() { h.close(); rej(CPT.CANCEL); }
        $('.act-exit', h.card).onclick = exit;
        wireHint(h.card);
        const pool = $('#o-pool', h.card), seq = $('#o-seq', h.card), msg = $('#o-msg', h.card);
        shuf.forEach(function (x) {
          const b = document.createElement('button'); b.className = 'btn step'; b.textContent = x.t;
          b.onclick = function () {
            if (x.i === next) {
              CPT.Sound.play('pick');
              const li = document.createElement('li'); li.textContent = x.t; seq.appendChild(li);
              b.disabled = true; b.classList.add('used'); next++;
              if (next === cfg.items.length) { msg.textContent = '✔ Passo a passo completo! Cada etapa vem naturalmente depois da anterior.'; $('#o-done', h.card).disabled = false; $('#o-done', h.card).focus(); }
              else msg.textContent = '✔ Isso! Qual é o próximo passo?';
            } else {
              tries++; CPT.Sound.play('bad'); b.classList.add('shake');
              setTimeout(function () { b.classList.remove('shake'); }, 400);
              msg.textContent = '◐ Ainda não: pense no que precisa acontecer antes desse passo. Sem pressa, tente outro.';
            }
          };
          pool.appendChild(b);
        });
        $('#o-done', h.card).onclick = function () { h.close(); res({ tries: tries }); };
        pool.querySelector('button').focus({ preventScroll: true });
      });
    },

    /* ---- Relacionar pessoas e recursos ---- */
    match: function (cfg) {
      return new Promise(function (res, rej) {
        const n = cfg.pairs.length;
        const order = cfg.pairs.map(function (_, i) { return i; }).sort(function (a, b) { return ((a * 3 + 1) % n) - ((b * 3 + 1) % n); });
        if (order.every(function (v, k) { return v === k; })) order.reverse();
        let tries = 0, count = 0, sel = null;
        const h = block(CPT.Modal.open(header(cfg.who, cfg.title) + '<p class="lead">' + esc(cfg.prompt) + '</p>' +
          '<div class="match"><div><h3>Pessoas</h3><div id="m-left" class="pool"></div></div><div><h3>Recursos</h3><div id="m-right" class="pool"></div></div></div>' +
          '<p id="m-msg" class="msg-line" aria-live="polite">Escolha uma pessoa e depois o recurso que combina com ela.</p>' + hintBlock(cfg.hint) +
          '<div class="actions"><button class="btn primary" id="m-done" disabled>Concluir</button></div>', { label: cfg.title, cls: 'wide', onEsc: exit }));
        function exit() { h.close(); rej(CPT.CANCEL); }
        $('.act-exit', h.card).onclick = exit;
        wireHint(h.card);
        const left = $('#m-left', h.card), right = $('#m-right', h.card), msg = $('#m-msg', h.card), done = $('#m-done', h.card);
        function btn(side, i) { return $('[data-' + side + '="' + i + '"]', h.card); }
        function mkBtn(side, i, text) {
          const b = document.createElement('button'); b.className = 'btn step'; b.setAttribute('data-' + side, i); b.textContent = text; b.setAttribute('aria-pressed', 'false');
          b.onclick = function () { pick(side, i); }; return b;
        }
        function unsel() { if (sel) { const o = btn(sel.side, sel.i); o.classList.remove('sel'); o.setAttribute('aria-pressed', 'false'); } sel = null; }
        function pick(side, i) {
          const b = btn(side, i);
          if (b.classList.contains('matched')) return;
          if (sel && sel.side !== side) {
            const other = btn(sel.side, sel.i), ni = side === 'n' ? i : sel.i, ri = side === 'r' ? i : sel.i;
            if (ni === ri) {
              count++; CPT.Sound.play('pick');
              [b, other].forEach(function (x) {
                x.classList.remove('sel'); x.classList.add('matched'); x.setAttribute('aria-pressed', 'false');
                x.insertAdjacentHTML('afterbegin', '<span class="pairno" aria-label="par ' + count + '">✔ ' + count + '</span>');
              });
              sel = null;
              if (count === n) { msg.textContent = '✔ Todos os pares estão ligados! Cada pessoa participa do jeito que funciona para ela.'; done.disabled = false; done.focus({ preventScroll: true }); }
              else msg.textContent = '✔ Combina! Escolha o próximo par.';
            } else {
              tries++; CPT.Sound.play('bad'); unsel();
              [b, other].forEach(function (x) { x.classList.add('shake'); setTimeout(function () { x.classList.remove('shake'); }, 400); });
              msg.textContent = '◐ Ainda não combina. Pense no que essa pessoa precisa para participar e tente outro recurso.';
            }
            return;
          }
          unsel(); sel = { side: side, i: i }; b.classList.add('sel'); b.setAttribute('aria-pressed', 'true'); CPT.Sound.play('click');
        }
        cfg.pairs.forEach(function (p, i) { left.appendChild(mkBtn('n', i, p[0])); });
        order.forEach(function (i) { right.appendChild(mkBtn('r', i, cfg.pairs[i][1])); });
        done.onclick = function () { h.close(); res({ tries: tries }); };
        left.querySelector('button').focus({ preventScroll: true });
      });
    },

    /* ---- Achar problemas (tela de site ou celular) ---- */
    spot: function (cfg) {
      return new Promise(function (res, rej) {
        const sel = {}; let verified = false;
        const frame = cfg.kind === 'phone' ? 'phone' : 'browser';
        let els = '';
        cfg.elements.forEach(function (e) {
          els += '<button class="spot-el ' + (e.cls || '') + '" data-id="' + e.id + '" aria-pressed="false"><span class="el-body">' + e.html + '</span><span class="el-flag" aria-hidden="true"></span></button>';
        });
        const bar = frame === 'browser' ? '<div class="bar"><span></span><span></span><span></span><em>' + esc(cfg.url || 'portal.conecta.gov') + '</em></div>' : '<div class="notch"></div><div class="sender">' + esc(cfg.sender || 'Mensagens') + '</div>';
        const h = block(CPT.Modal.open(header(cfg.who, cfg.title) + '<p class="lead">' + esc(cfg.prompt) + '</p>' +
          '<div class="mock ' + frame + '">' + bar + '<div class="mock-screen">' + els + '</div></div>' +
          '<p id="s-count" class="msg-line" aria-live="polite">Marcados: 0</p><div id="s-result" class="result" aria-live="polite"></div>' + hintBlock(cfg.hint) +
          '<div class="actions"><button class="btn primary" id="s-verify">Verificar</button></div>', { label: cfg.title, cls: 'wide', onEsc: exit }));
        function exit() { h.close(); rej(CPT.CANCEL); }
        $('.act-exit', h.card).onclick = exit;
        wireHint(h.card);
        const count = $('#s-count', h.card), result = $('#s-result', h.card), actions = $('.actions', h.card);
        function upd() { count.textContent = 'Marcados: ' + Object.keys(sel).filter(function (k) { return sel[k]; }).length + ' de ' + cfg.elements.length + ' trechos.'; }
        $$('.spot-el', h.card).forEach(function (b) {
          b.onclick = function () {
            if (verified) return;
            const id = b.dataset.id; sel[id] = !sel[id];
            b.classList.toggle('marked', !!sel[id]); b.setAttribute('aria-pressed', sel[id] ? 'true' : 'false');
            b.querySelector('.el-flag').textContent = sel[id] ? 'Marcado como problema' : '';
            CPT.Sound.play('click'); upd();
          };
        });
        function verify() {
          verified = true;
          let found = 0, falsePos = 0, missed = 0, total = 0, notes = '';
          cfg.elements.forEach(function (e) {
            const b = $('.spot-el[data-id="' + e.id + '"]', h.card), s = !!sel[e.id], f = b.querySelector('.el-flag');
            b.classList.remove('marked');
            if (e.flaw) {
              total++;
              if (s) { found++; b.classList.add('hit'); f.textContent = '✔ Problema encontrado'; notes += '<li><b>✔</b> ' + esc(e.why) + '</li>'; }
              else { missed++; b.classList.add('miss'); f.textContent = '◐ Passou despercebido'; notes += '<li><b>◐ Passou despercebido:</b> ' + esc(e.why) + '</li>'; }
            } else if (s) { falsePos++; b.classList.add('fp'); f.textContent = '✖ Aqui está tudo bem'; notes += '<li><b>✖</b> ' + esc(e.why) + '</li>'; }
            else if (e.why) { f.textContent = ''; }
          });
          const perfect = missed === 0 && falsePos === 0;
          result.innerHTML = '<p><b>' + (perfect ? '✔ Você encontrou todos os problemas!' : 'Você achou ' + found + ' de ' + total + ' problemas' + (falsePos ? ' e marcou ' + falsePos + ' trecho(s) que estava(m) bom(ns)' : '') + '.') + '</b></p><ul>' + notes + '</ul>';
          CPT.Sound.play(perfect ? 'good' : 'ok');
          try { result.scrollIntoView({ block: 'nearest' }); } catch (e) { /* ok */ }
          actions.innerHTML = '';
          if (!perfect) {
            const again = document.createElement('button'); again.className = 'btn'; again.textContent = 'Tentar de novo';
            again.onclick = function () {
              verified = false; result.innerHTML = '';
              $$('.spot-el', h.card).forEach(function (b) { b.classList.remove('hit', 'miss', 'fp'); const id = b.dataset.id; b.classList.toggle('marked', !!sel[id]); b.querySelector('.el-flag').textContent = sel[id] ? 'Marcado como problema' : ''; });
              actions.innerHTML = ''; actions.appendChild(vb); vb.focus();
            };
            actions.appendChild(again);
          }
          const go = document.createElement('button'); go.className = 'btn primary'; go.textContent = perfect ? 'Continuar' : 'Seguir mesmo assim';
          go.onclick = function () { h.close(); res({ found: found, total: total, falsePos: falsePos, missed: missed, perfect: perfect }); };
          actions.appendChild(go); go.focus({ preventScroll: true });
        }
        const vb = $('#s-verify', h.card); vb.onclick = verify;
        upd(); vb.focus();
      });
    },

    /* ---- Planejar (orçamento) ---- */
    plan: function (cfg) {
      return new Promise(function (res, rej) {
        const chosen = {};
        let list = '';
        cfg.options.forEach(function (o) {
          list += '<button class="plan-opt" data-id="' + o.id + '" aria-pressed="false"><span class="cost" aria-label="custo ' + o.cost + '">Custo ' + o.cost + '</span><span class="po-text">' + esc(o.text) + '</span><span class="po-mark" aria-hidden="true"></span></button>';
        });
        const h = block(CPT.Modal.open(header(cfg.who, cfg.title) + '<p class="lead">' + esc(cfg.prompt) + '</p>' +
          '<p class="budget" aria-live="polite"><b>Planejamento disponível:</b> <span id="p-used">0</span> de ' + cfg.budget + ' usados</p><div class="plan">' + list + '</div>' +
          '<p id="p-msg" class="msg-line" aria-live="polite">Escolha pelo menos ' + cfg.min + ' ações.</p><div id="p-result" class="result" aria-live="polite"></div>' + hintBlock(cfg.hint) +
          '<div class="actions"><button class="btn primary" id="p-ok" disabled>Confirmar plano</button></div>', { label: cfg.title, cls: 'wide', onEsc: exit }));
        function exit() { h.close(); rej(CPT.CANCEL); }
        $('.act-exit', h.card).onclick = exit;
        wireHint(h.card);
        const used = function () { return cfg.options.reduce(function (s, o) { return s + (chosen[o.id] ? o.cost : 0); }, 0); };
        const nsel = function () { return Object.keys(chosen).filter(function (k) { return chosen[k]; }).length; };
        function refresh() {
          $('#p-used', h.card).textContent = used();
          $$('.plan-opt', h.card).forEach(function (b) {
            const o = cfg.options.filter(function (x) { return x.id === b.dataset.id; })[0], on = !!chosen[o.id];
            b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false');
            b.querySelector('.po-mark').textContent = on ? '✔ Escolhida' : '';
            b.disabled = !on && used() + o.cost > cfg.budget;
            b.title = b.disabled ? 'Não cabe no planejamento disponível' : '';
          });
          $('#p-ok', h.card).disabled = nsel() < cfg.min;
          $('#p-msg', h.card).textContent = nsel() < cfg.min ? 'Escolha pelo menos ' + cfg.min + ' ações.' : 'Pode confirmar ou trocar as escolhas.';
        }
        $$('.plan-opt', h.card).forEach(function (b) {
          b.onclick = function () { chosen[b.dataset.id] = !chosen[b.dataset.id]; CPT.Sound.play('click'); refresh(); };
        });
        $('#p-ok', h.card).onclick = function () {
          const fx = { ac: 0, ab: 0, co: 0 }; let notes = '';
          cfg.options.forEach(function (o) {
            if (!chosen[o.id]) return;
            for (const k in o.fx) fx[k] += o.fx[k];
            const good = (o.fx.ac || 0) + (o.fx.ab || 0) + (o.fx.co || 0) > 0;
            notes += '<li><b>' + (good ? '▲' : '▼') + '</b> ' + esc(o.note) + '</li>';
          });
          let syn = null;
          (cfg.synergy || []).forEach(function (s) {
            if (s.need.every(function (id) { return chosen[id]; })) { for (const k in s.fx) fx[k] += s.fx[k]; notes += '<li><b>★ Trabalho em equipe:</b> ' + esc(s.text) + '</li>'; syn = s; }
          });
          const deltas = ['ac', 'ab', 'co'].map(function (k) { return { key: k, delta: fx[k] }; });
          $('.plan', h.card).classList.add('locked'); $$('.plan-opt', h.card).forEach(function (b) { b.disabled = true; });
          $('#p-result', h.card).innerHTML = '<p><b>Resultado da oficina</b></p><ul>' + notes + '</ul><div class="chips">' + CPT.chipsHTML(deltas) + '</div>';
          CPT.Sound.play('good');
          const act = $('.actions', h.card); act.innerHTML = '';
          const go = document.createElement('button'); go.className = 'btn primary'; go.textContent = 'Continuar';
          go.onclick = function () { h.close(); res({ fx: fx, chosen: Object.keys(chosen).filter(function (k) { return chosen[k]; }), synergy: !!syn }); };
          act.appendChild(go); go.focus();
        };
        refresh(); $('.plan-opt', h.card).focus({ preventScroll: true });
      });
    },

    /* ---- Fundo da Cidade ---- */
    fund: function () {
      return new Promise(function (res) {
        const G = CPT.Game, ST = CPT.STATS;
        const h = block(CPT.Modal.open('<div id="fund-body"></div>', { label: 'Fundo da Cidade', cls: 'wide', onEsc: function () { close(); } }));
        function close() { h.close(); res(); }
        function render() {
          const st = G.state, left = G.mutiraoLeft();
          let rows = '';
          ['ac', 'ab', 'co'].forEach(function (k) {
            const cost = G.fundCost(), bought = st.fund[k], max = G.FUND_MAX, can = st.pts >= cost && bought < max;
            const lab = { ac: 'Instalar mais pontos de Wi-Fi e emprestar aparelhos', ab: 'Construir rampas, piso tátil e sinalização', co: 'Abrir mais turmas de oficinas digitais' }[k];
            rows += '<div class="fund-row">' + CPT.UI.statIcon(k, 2) + '<div class="fr-txt"><b>' + esc(lab) + '</b><small>+' + G.FUND_GAIN + ' ' + ST[k].name + ' · feito ' + bought + ' de ' + max + ' vezes</small></div>' +
              '<button class="btn small" data-buy="' + k + '"' + (can ? '' : ' disabled') + '>' + (bought >= max ? 'Concluído' : 'Investir ' + cost + ' pts') + '</button></div>';
          });
          let mut = '';
          ['ac', 'ab', 'co'].forEach(function (k) { mut += '<button class="btn small" data-mut="' + k + '"' + (left > 0 ? '' : ' disabled') + '>+' + G.MUTIRAO_GAIN + ' ' + ST[k].name + '</button> '; });
          $('#fund-body', h.card).innerHTML = '<h2>Fundo da Cidade</h2><p class="lead">Aqui os Pontos de Comunidade viram melhorias. Quanto mais acessível a cidade, mais barato fica convocar voluntários.</p>' +
            '<p class="budget"><b>Seus pontos:</b> ' + st.pts + ' · <b>Custo atual:</b> ' + G.fundCost() + ' por melhoria</p>' + rows +
            '<div class="fund-row mut"><div class="fr-txt"><b>Mutirão de vizinhos (grátis)</b><small>Ajuda de quem mora por perto. Disponíveis agora: ' + left + ' (ganha mais a cada missão concluída).</small></div><div class="mut-btns">' + mut + '</div></div>' +
            '<div id="fund-msg" class="msg-line" aria-live="polite"></div><div class="actions"><button class="btn primary" id="f-close">Fechar</button></div>';
          $$('[data-buy]', h.card).forEach(function (b) { b.onclick = function () { const m = G.buyFund(b.dataset.buy); render(); $('#fund-msg', h.card).textContent = m || ''; }; });
          $$('[data-mut]', h.card).forEach(function (b) { b.onclick = function () { const m = G.useMutirao(b.dataset.mut); render(); $('#fund-msg', h.card).textContent = m || ''; }; });
          $('#f-close', h.card).onclick = close;
        }
        render();
        $('#f-close', h.card).focus();
      });
    },

    /* ---- Missão concluída ---- */
    missionComplete: function (m, info) {
      return new Promise(function (res) {
        const stars = '★'.repeat(info.stars) + '☆'.repeat(3 - info.stars);
        const motion = !CPT.Settings.v.reduceMotion;
        const h = block(CPT.Modal.open('<div class="mc' + (motion ? ' pop' : '') + '"><p class="kicker">Missão concluída</p><h2>' + esc(m.title) + '</h2>' +
          '<p class="stars" aria-label="' + info.stars + ' de 3 estrelas">' + stars + '</p>' +
          '<div class="chips" aria-label="Mudanças nos status">' + CPT.chipsHTML(info.deltas) + '</div>' +
          '<p class="rew"><b>Pontos de Comunidade:</b> +' + info.pts + (info.bonus ? ' (inclui +' + info.bonus + ' do bônus de Acesso)' : '') + '</p>' +
          '<div class="msg"><p><b>Você sabia?</b> ' + esc(m.learn) + '</p></div>' +
          '<div class="actions"><button class="btn primary" id="mc-ok">Continuar</button></div></div>', { label: 'Missão concluída', onEsc: function () { h.close(); res(); } }));
        $('#mc-ok', h.card).onclick = function () { h.close(); res(); };
      });
    }
  });
})();
