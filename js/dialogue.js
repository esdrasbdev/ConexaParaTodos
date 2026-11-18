/* Conexão para Todos — dialogue.js
 * Painel de diálogo com retrato, nome, texto curto e alternativas clicáveis (também por teclado 1-3). */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const $ = function (s, r) { return (r || document).querySelector(s); };
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  let narratorURL = null;
  function narrator() {
    if (narratorURL) return narratorURL;
    const S = CPT.Sprites, c = S.mk(32, 32), g = c.getContext('2d');
    S.R(g, '#8ec5ff', 0, 0, 32, 32); S.R(g, '#2a5bd7', 4, 4, 24, 24); S.R(g, '#4f84f5', 4, 4, 24, 6);
    g.drawImage(S.glyph('wifi', '#ffffff', 2), 7, 8);
    return (narratorURL = c.toDataURL());
  }

  function speaker(who) {
    const P = CPT.Player, W = CPT.World;
    if (who === 'me') { const d = P.actor().def; return { name: d.name, url: CPT.Sprites.portraitURL(d.look) }; }
    const a = P.AGENTS.filter(function (x) { return x.id === who; })[0];
    if (a) return { name: a.name, url: CPT.Sprites.portraitURL(a.look) };
    if (W.NPCS[who]) return { name: W.NPCS[who].name, url: CPT.Sprites.portraitURL(W.NPCS[who].look) };
    return { name: 'Conecta', url: narrator() };
  }

  /* Sinal usado para sair de uma conversa/atividade no meio (Esc ou botão Sair) */
  CPT.CANCEL = CPT.CANCEL || { cancelled: true };
  let open = false, keyHandler = null;
  const D = (CPT.Dialogue = {
    show: function (who) {
      const p = $('#dialogue'), s = speaker(who);
      if (!open) { open = true; CPT.Game.block(1); }
      p.classList.remove('hidden');
      $('#dlg-portrait').src = s.url; $('#dlg-name').textContent = s.name;
      return p;
    },
    close: function () {
      if (!open) return;
      open = false; $('#dialogue').classList.add('hidden');
      if (keyHandler) { document.removeEventListener('keydown', keyHandler); keyHandler = null; }
      CPT.Game.block(-1);
    },
    isOpen: function () { return open; },
    /* Sair da conversa: faz a espera atual falhar com CPT.CANCEL (quem chamou trata e fecha o painel) */
    cancel: function () { if (D._rej) { const r = D._rej; D._rej = null; r(CPT.CANCEL); } else D.close(); },
    /* Fala simples: resolve quando o jogador clica em Continuar */
    say: function (who, text, label) {
      return new Promise(function (res, rej) {
        D.show(who); D._rej = rej;
        $('#dlg-text').innerHTML = esc(text);
        $('#dlg-extra').innerHTML = '';
        const act = $('#dlg-actions'); act.innerHTML = '';
        const b = document.createElement('button'); b.className = 'btn primary'; b.textContent = label || 'Continuar';
        b.onclick = function () { CPT.Sound.play('click'); D._rej = null; res(); };
        act.appendChild(b); b.focus();
        CPT.Sound.play('talk');
      });
    },
    lines: async function (arr) {
      for (let i = 0; i < arr.length; i++) await D.say(arr[i][0], arr[i][1], i === arr.length - 1 ? 'Continuar' : 'Próxima');
    },
    /* Pergunta com alternativas. opts.hint (texto), opts.tried (array de índices já testados) */
    ask: function (who, prompt, options, opts) {
      opts = opts || {};
      return new Promise(function (res, rej) {
        D.show(who); D._rej = rej;
        $('#dlg-text').innerHTML = esc(prompt);
        const act = $('#dlg-actions'); act.innerHTML = '';
        const extra = $('#dlg-extra'); extra.innerHTML = '';
        const co = CPT.Game.state.stats.co, hintOK = co >= CPT.Game.HINT_AT;
        const list = document.createElement('div'); list.className = 'choices'; list.setAttribute('role', 'group'); list.setAttribute('aria-label', 'Alternativas');
        options.forEach(function (o, i) {
          const tried = (opts.tried || []).indexOf(i) >= 0;
          const b = document.createElement('button'); b.className = 'btn choice' + (tried ? ' tried' : '');
          b.innerHTML = '<span class="num" aria-hidden="true">' + (i + 1) + '</span><span class="ct">' + esc(o) + (tried ? ' <em>(já tentei: não funcionou bem)</em>' : '') + '</span>';
          b.onclick = function () { CPT.Sound.play('click'); cleanup(); res(i); };
          list.appendChild(b);
        });
        act.appendChild(list);
        if (opts.hint) {
          const hb = document.createElement('button'); hb.className = 'btn small ghost';
          if (hintOK) {
            hb.textContent = 'Pedir uma dica ao Yuri';
            hb.onclick = function () { extra.innerHTML = '<p class="hint-box"><b>Dica do Yuri:</b> ' + esc(opts.hint) + '</p>'; hb.disabled = true; };
          } else {
            hb.textContent = 'Dicas liberam com Conhecimento ' + CPT.Game.HINT_AT + ' (agora: ' + Math.round(co) + ')'; hb.disabled = true;
          }
          act.appendChild(hb);
        }
        function cleanup() { D._rej = null; document.removeEventListener('keydown', keyHandler); keyHandler = null; }
        keyHandler = function (e) {
          const n = parseInt(e.key, 10);
          if (n >= 1 && n <= options.length && !CPT.Modal.top()) { e.preventDefault(); CPT.Sound.play('click'); cleanup(); res(n - 1); }
        };
        document.addEventListener('keydown', keyHandler);
        const first = list.querySelector('.btn'); if (first) first.focus();
        CPT.Sound.play('talk');
      });
    },
    /* Retorno de uma escolha: tier = best | ok | bad */
    feedback: function (o) {
      return new Promise(function (res, rej) {
        D.show(o.who); D._rej = rej;
        const tag = { best: '✔ Ótima escolha', ok: '◐ Funciona, mas dá para melhorar', bad: '✖ Ainda não é o melhor caminho' }[o.tier];
        $('#dlg-text').innerHTML = '<span class="tier ' + o.tier + '">' + tag + '</span> ' + esc(o.text);
        $('#dlg-extra').innerHTML = (o.fx && o.fx.length ? '<div class="chips" aria-label="Mudanças nos status">' + CPT.chipsHTML(o.fx) + '</div>' : '') + (o.note ? '<p class="hint-box">' + esc(o.note) + '</p>' : '');
        const act = $('#dlg-actions'); act.innerHTML = '';
        const b = document.createElement('button'); b.className = 'btn primary';
        b.textContent = o.tier === 'bad' ? 'Tentar outra opção' : 'Continuar';
        b.onclick = function () { CPT.Sound.play('click'); D._rej = null; res(); };
        act.appendChild(b); b.focus();
        CPT.Sound.play(o.tier === 'best' ? 'good' : (o.tier === 'ok' ? 'ok' : 'bad'));
      });
    }
  });

  /* Esc sai da conversa (quando não há outra janela aberta por cima) e o botão Sair faz o mesmo */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && open && !CPT.Modal.top()) { e.preventDefault(); e.stopImmediatePropagation(); D.cancel(); }
  });
  const exitBtn = document.getElementById('dlg-exit');
  if (exitBtn) exitBtn.addEventListener('click', function () { CPT.Sound.play('click'); D.cancel(); });
})();
