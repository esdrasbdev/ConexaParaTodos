/* Testes de lógica do "Conexão para Todos" — rodam no navegador, sem dependências.
 * Abra tests/test.html (ou use: node tests/run-tests.mjs). Resultado aparece na página e no console. */
(function () {
  'use strict';
  const results = [];
  const queue = [];
  function test(name, fn) { queue.push({ name: name, fn: fn }); }   // roda em sequência (aceita testes assíncronos)
  async function runAll(q) {
    for (let i = 0; i < q.length; i++) {
      try {
        await Promise.race([Promise.resolve().then(q[i].fn), new Promise(function (_, rej) { setTimeout(function () { rej(new Error('tempo esgotado: o teste travou (o jogo ficou preso?)')); }, 8000); })]);
        results.push({ name: q[i].name, ok: true });
      } catch (e) {
        results.push({ name: q[i].name, ok: false, err: e && e.message ? e.message : String(e) });
        try { window.CPT.Modal.closeAll(); window.CPT.Dialogue.close(); window.CPT.Game.coopMode = false; window.CPT.Game.newGame(true); } catch (e2) { /* ok */ }   // limpa o estado para os próximos testes
      }
    }
    try { window.CPT.Modal.closeAll(); window.CPT.Game.coopMode = false; window.CPT.Game.newGame(true); window.CPT.Game.toTitle(); } catch (e) { /* ok */ }
    return results;
  }
  function eq(a, b, msg) { if (a !== b) throw new Error((msg || 'esperado') + ': ' + JSON.stringify(a) + ' !== ' + JSON.stringify(b)); }
  function ok(c, msg) { if (!c) throw new Error(msg || 'condição falsa'); }

  function run() {
    const CPT = window.CPT, W = CPT.World, M = CPT.Missions, G = CPT.Game, P = CPT.Player, T = 16;
    CPT.Settings.load(); CPT.Sprites.init(); G.init(); G.newGame(true);
    G.block(1); // evita qualquer atualização de tela durante os testes
    G.block(-1);

    test('mapa: dimensões, chão e sólidos coerentes', function () {
      eq(W.ground.length, W.W * W.H); eq(W.solid.length, W.W * W.H);
      ok(W.statics.length > 100, 'cenário deveria ter muitos objetos');
    });
    test('ponto inicial é caminhável', function () {
      ok(!W.tileSolid(W.START.tx, W.START.ty), 'início bloqueado');
    });
    test('todos os locais de interesse são alcançáveis a pé (busca em largura)', function () {
      const seen = new Uint8Array(W.W * W.H), q = [[W.START.tx, W.START.ty]]; seen[W.START.ty * W.W + W.START.tx] = 1;
      while (q.length) {
        const c = q.shift();
        [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (d) {
          const x = c[0] + d[0], y = c[1] + d[1];
          if (x < 0 || y < 0 || x >= W.W || y >= W.H || seen[y * W.W + x] || W.tileSolid(x, y)) return;
          seen[y * W.W + x] = 1; q.push([x, y]);
        });
      }
      const reach = function (x, y) { return !!seen[y * W.W + x]; };
      const near = function (x, y) { return reach(x, y + 1) || reach(x, y - 1) || reach(x + 1, y) || reach(x - 1, y); };
      Object.keys(W.NPCS).forEach(function (k) { ok(reach(W.NPCS[k].tx, W.NPCS[k].ty + 1), 'NPC inalcançável: ' + k); });
      W.ITEMS.forEach(function (i) { ok(reach(i.tx, i.ty), 'item inalcançável: ' + i.id); });
      W.STATIONS.forEach(function (s) { ok(reach(s.tx, s.ty + 1), 'posto inalcançável: ' + s.id); });
      W.SIGNS.forEach(function (s) { ok(near(s.tx, s.ty), 'placa inalcançável: ' + s.id); });
      ok(near(W.FUND.tx, W.FUND.ty), 'Fundo inalcançável');
    });
    test('NPCs não ficam presos dentro de sólidos', function () {
      Object.keys(W.NPCS).forEach(function (k) { ok(!W.tileSolid(W.NPCS[k].tx, W.NPCS[k].ty), 'NPC em tile sólido: ' + k); });
    });
    test('colisão: agente não atravessa um prédio', function () {
      const b = W.BUILDINGS[0], a = P.leader();
      a.x = (b.x + 2) * T; a.y = (b.y + b.h) * T + 6;
      for (let i = 0; i < 120; i++) P.update(1 / 60, 0, -1, W.blocked);
      ok(a.y > (b.y + b.h) * T - 1, 'atravessou o prédio: y=' + a.y);
      for (let i = 0; i < 200; i++) P.update(1 / 60, -1, 0, W.blocked);
      ok(a.x >= 0, 'saiu do mapa');
    });
    test('equipe: três marcadores distintos (forma, número, especialidade)', function () {
      eq(P.AGENTS.length, 3);
      eq(new Set(P.AGENTS.map(function (a) { return a.shape; })).size, 3, 'formas repetidas');
      eq(new Set(P.AGENTS.map(function (a) { return a.letter; })).size, 3, 'números repetidos');
      eq(new Set(P.AGENTS.map(function (a) { return a.stat; })).size, 3, 'especialidades repetidas');
    });
    test('troca de agente muda o líder e mantém os três na fila', function () {
      P.reset(300, 300);
      eq(G.leaderId(), 'marcio');
      ok(P.switchTo(2), 'não trocou'); eq(G.leaderId(), 'yuri');
      eq(P.order.length, 3); eq(new Set(P.order).size, 3);
      ok(!P.switchTo(2), 'trocar para o mesmo agente deveria ser ignorado');
      P.switchTo(0); eq(G.leaderId(), 'marcio');
    });
    test('seguidores acompanham o líder em fila', function () {
      P.reset(300, 300);
      for (let i = 0; i < 120; i++) P.update(1 / 60, 1, 0, function () { return false; });
      const l = P.leader(), f1 = P.agents[P.order[1]], f2 = P.agents[P.order[2]];
      ok(l.x > 300 + 60, 'líder não andou');
      ok(Math.hypot(l.x - f1.x, l.y - f1.y) < 40 && Math.hypot(l.x - f2.x, l.y - f2.y) < 60, 'seguidores ficaram para trás');
    });

    test('status começam em valores razoáveis e ficam entre 0 e 100', function () {
      G.newGame(true);
      const s = G.state.stats;
      ok(s.ac > 0 && s.ab > 0 && s.co > 0 && s.ac < G.GOAL && s.ab < G.GOAL && s.co < G.GOAL, 'valores iniciais fora do esperado');
      G.applyFx({ ac: 500, ab: -500 }, 'teste');
      eq(G.state.stats.ac, 100); eq(G.state.stats.ab, 0);
      G.newGame(true);
    });
    test('applyFx devolve a variação real e registra no diário', function () {
      G.newGame(true);
      const d = G.applyFx({ co: 8 }, 'Teste');
      eq(d[0].key, 'co'); eq(d[0].delta, 8); ok(G.state.log.length === 1, 'diário vazio');
      G.newGame(true);
    });

    test('efeito real: Acesso aumenta o bônus de pontos por missão', function () {
      G.newGame(true); G.state.stats.ac = 24; eq(Math.floor(G.state.stats.ac / 25), 0);
      G.state.stats.ac = 80; eq(Math.floor(G.state.stats.ac / 25), 3);
    });
    test('efeito real: Acessibilidade reduz o custo do Fundo da Cidade', function () {
      G.newGame(true);
      G.state.stats.ab = 30; eq(G.fundCost(), 4);
      G.state.stats.ab = 50; eq(G.fundCost(), 3);
      G.state.stats.ab = 75; eq(G.fundCost(), 2);
    });
    test('Fundo da Cidade: compra desconta pontos, limita repetições e valida saldo', function () {
      G.newGame(true); G.state.pts = 4; G.state.stats.ac = 40;
      G.buyFund('ac'); eq(G.state.pts, 0); eq(G.state.stats.ac, 46); eq(G.state.fund.ac, 1);
      const msg = G.buyFund('ac'); ok(/Faltam pontos/.test(msg), 'deveria recusar sem pontos'); eq(G.state.stats.ac, 46);
      G.state.pts = 99; G.state.fund.ac = G.FUND_MAX; ok(/conclu/.test(G.buyFund('ac')), 'deveria limitar');
    });
    test('mutirão grátis nunca deixa o jogo sem saída', function () {
      G.newGame(true);
      ok(G.mutiraoLeft() >= 1, 'sem mutirão no início');
      const before = G.state.stats.co; G.useMutirao('co'); eq(G.state.stats.co, before + G.MUTIRAO_GAIN);
      eq(G.mutiraoLeft(), 0); ok(/Sem mutir/.test(G.useMutirao('co')), 'deveria avisar');
    });

    test('missões: 10 missões, todas com NPC, área e passos válidos', function () {
      eq(M.list.length, 10);
      eq(M.list[M.list.length - 1].id, 'portal', 'a missão cooperativa deve ser a final');
      M.list.forEach(function (m) {
        ok(W.NPCS[m.npc], 'NPC inexistente em ' + m.id);
        ok(W.AREAS.some(function (a) { return a.id === m.area; }), 'área inexistente em ' + m.id);
        ok(m.steps.length > 0 && m.title && m.learn && m.outro.length, 'dados incompletos em ' + m.id);
      });
    });
    function choices(m) {
      const out = [];
      m.steps.forEach(function (s) {
        if (s.t === 'choice') out.push(s);
        if (s.mini) Object.keys(s.mini).forEach(function (k) { out.push(s.mini[k]); });
      });
      return out;
    }
    test('toda escolha tem exatamente uma opção ótima, uma intermediária e uma ruim, com explicação', function () {
      M.list.forEach(function (m) {
        choices(m).forEach(function (c) {
          const tiers = c.options.map(function (o) { return o.tier; }).sort().join(',');
          eq(tiers, 'bad,best,ok', 'níveis em ' + m.id);
          c.options.forEach(function (o) { ok(o.why && o.why.length > 20, 'sem explicação em ' + m.id); ok(o.fx && Object.keys(o.fx).length, 'sem efeito em ' + m.id); });
          ok(c.hint, 'sem dica em ' + m.id);
        });
      });
    });
    test('opções ruins sempre permitem tentar de novo (nunca encerram a missão)', function () {
      M.list.forEach(function (m) { choices(m).forEach(function (c) { ok(c.options.some(function (o) { return o.tier !== 'bad'; }), 'só opções ruins em ' + m.id); }); });
    });
    test('atividades: ordenar, achar problemas e planejar são resolvíveis', function () {
      M.list.forEach(function (m) {
        m.steps.forEach(function (s) {
          if (s.t === 'order') ok(s.items.length >= 3 && new Set(s.items).size === s.items.length, 'ordem inválida em ' + m.id);
          if (s.t === 'spot') { ok(s.elements.filter(function (e) { return e.flaw; }).length >= 4, 'poucos problemas em ' + m.id); ok(s.elements.some(function (e) { return !e.flaw; }), 'sem exemplo bom em ' + m.id); }
          if (s.t === 'plan') {
            const best = ['rampa', 'monitores', 'noite', 'apostila'].map(function (id) { return s.options.filter(function (o) { return o.id === id; })[0]; });
            ok(best.every(Boolean), 'opções do plano ausentes');
            ok(best.reduce(function (a, o) { return a + o.cost; }, 0) <= s.budget, 'melhor plano estoura o orçamento');
            ok(s.options.some(function (o) { return o.cost <= s.budget; }) && s.min <= s.options.length, 'plano inválido');
          }
          if (s.t === 'match') { ok(s.pairs.length >= 4, 'poucos pares em ' + m.id); eq(new Set(s.pairs.map(function (q) { return q[0]; })).size, s.pairs.length); eq(new Set(s.pairs.map(function (q) { return q[1]; })).size, s.pairs.length); ok(s.fx && s.done, 'sem efeito ou fecho em ' + m.id); }
          if (s.t === 'collect') s.ids.forEach(function (id) { ok(W.ITEMS.some(function (i) { return i.id === id && i.mission === m.id; }), 'item ausente: ' + id); });
          if (s.t === 'stations') s.ids.forEach(function (id) { ok(W.STATIONS.some(function (i) { return i.id === id && i.mission === m.id; }), 'posto ausente: ' + id); ok(s.mini[id], 'sem mini-desafio: ' + id); });
        });
      });
    });
    test('missão cooperativa: cada posto exige um agente diferente', function () {
      const ag = W.STATIONS.filter(function (s) { return s.mission === 'portal'; }).map(function (s) { return s.agent; });
      eq(ag.length, 3); eq(new Set(ag).size, 3);
      ag.forEach(function (a) { ok(P.AGENTS.some(function (x) { return x.id === a; }), 'agente inexistente ' + a); });
    });

    function total(pick) {
      const t = { ac: 0, ab: 0, co: 0 };
      function add(fx) { for (const k in fx) t[k] += fx[k]; }
      M.list.forEach(function (m) {
        m.steps.forEach(function (s) {
          if (s.t === 'choice') add(s.options.filter(function (o) { return o.tier === pick; })[0].fx);
          if (s.mini) Object.keys(s.mini).forEach(function (k) { add(s.mini[k].options.filter(function (o) { return o.tier === pick; })[0].fx); });
          if (pick === 'best') {
            if (s.fx) add(s.fx);
            if (s.t === 'plan') add({ ac: 4, ab: 15, co: 13 });
            if (s.itemFx) Object.keys(s.itemFx).forEach(function (k) { add(s.itemFx[k].fx); });
            if (s.finish) add(s.finish.fx);
          }
        });
      });
      return t;
    }
    test('equilíbrio: jogar bem leva os três status acima da meta de 60', function () {
      const t = total('best'), s = G.START_STATS;
      ['ac', 'ab', 'co'].forEach(function (k) { ok(s[k] + t[k] >= G.GOAL + 10, k + ' final=' + (s[k] + t[k])); });
    });
    test('equilíbrio: mesmo escolhendo só o intermediário, a meta é alcançável com Fundo e mutirões', function () {
      const t = total('ok'), s = G.START_STATS;
      const recovery = 8 * G.MUTIRAO_GAIN + 9 * 0 + G.FUND_MAX * G.FUND_GAIN; // mutirões (até 9) + melhorias (3 por status, alvo único)
      ['ac', 'ab', 'co'].forEach(function (k) { ok(s[k] + Math.max(0, t[k]) + recovery >= G.GOAL, k + ' inalcançável'); });
    });

    test('portal só libera após 7 missões concluídas', function () {
      G.newGame(true); ok(!G.portalUnlocked());
      ['saude', 'barreiras', 'estudo', 'golpe', 'oficina', 'padaria'].forEach(function (id) { G.state.missions[id].status = 'done'; });
      ok(!G.portalUnlocked(), '6 missões não deveriam liberar');
      G.state.missions.biblioteca.status = 'done'; ok(G.portalUnlocked());
      eq(G.doneCount(), 7); eq(G.doneCount(true), 7);
      eq(G.PORTAL_NEEDS, 7);
    });
    test('balões de missão: novo só depois de descobrir; bloqueado para o portal', function () {
      G.newGame(true);
      eq(M.marker('marta'), null, 'não deveria aparecer antes de descobrir o Posto');
      G.state.discovered.posto = true; eq(M.marker('marta'), 'new');
      G.state.missions.saude.status = 'active'; eq(M.marker('marta'), 'new');
      G.state.missions.saude.status = 'done'; eq(M.marker('marta'), 'done');
      G.state.discovered.prefeitura = true; eq(M.marker('helena'), 'lock');
    });
    test('descoberta de locais ao chegar perto', function () {
      G.newGame(true);
      const b = W.BUILDINGS.filter(function (x) { return x.id === 'padaria'; })[0], a = P.leader();
      a.x = (b.x + 2) * T; a.y = (b.y + b.h + 1) * T;
      ok(!G.state.discovered.padaria); G.discoverCheck(); ok(G.state.discovered.padaria, 'não descobriu');
    });
    test('interação: Dona Marta é encontrada perto, mas não de longe', function () {
      G.newGame(true);
      const n = W.NPCS.marta, a = P.leader();
      a.x = n.tx * T + 8; a.y = (n.ty + 1) * T + 12; a.dir = 'up';
      const t = G.findTarget(); ok(t && t.kind === 'npc' && t.id === 'marta', 'alvo errado: ' + JSON.stringify(t && t.id));
      a.x = 100; a.y = 300; ok(!G.findTarget() || G.findTarget().id !== 'marta');
    });
    test('objetivo atual aponta para a missão descoberta mais próxima', function () {
      G.newGame(true); G.refresh();
      const o = G.currentObjective(); ok(o && o.target, 'sem objetivo'); ok(/Seu Raimundo/.test(o.text), 'objetivo inesperado: ' + o.text);
    });
    test('vitória: exige todas as 10 missões concluídas E os três status na meta', async function () {
      G.newGame(true);
      M.list.forEach(function (m) { G.state.missions[m.id].status = 'done'; });
      G.state.stats = { ac: 59, ab: 80, co: 80 }; ok(!G.checkVictory(), 'não deveria vencer com 59');
      ok(!G.state.won);
      G.state.stats = { ac: 60, ab: 60, co: 60 }; ok(G.checkVictory(), 'deveria vencer com 60 em tudo'); ok(G.state.won);
      await new Promise(function (r) { setTimeout(r, 600); });   // a tela de vitória abre com um pequeno atraso
      ok(CPT.Modal.top() && /Conecta agora é para todos/.test(CPT.Modal.top().card.textContent), 'tela de vitória deveria abrir');
      CPT.Modal.closeAll(); G.newGame(true);
    });
    test('vitória não dispara com status altos e missões pendentes', function () {
      G.newGame(true); G.state.stats = { ac: 100, ab: 100, co: 100 }; ok(!G.checkVictory());
    });
    test('configurações: acessibilidade aplica classes no corpo da página', function () {
      CPT.Settings.v.largeText = true; CPT.Settings.v.contrast = true; CPT.Settings.v.reduceMotion = true; CPT.Settings.apply();
      ok(document.body.classList.contains('large-text') && document.body.classList.contains('high-contrast') && document.body.classList.contains('reduce-motion'));
      CPT.Settings.v.largeText = CPT.Settings.v.contrast = CPT.Settings.v.reduceMotion = false; CPT.Settings.apply();
    });

    /* ---------- modo co-op local (2 jogadores) ---------- */
    function startCoop() { G.coopMode = true; G.newGame(true); }
    function endCoop() { G.coopMode = false; P.current = 0; G.newGame(true); }
    test('co-op: dois jogadores controlam agentes diferentes e andam de forma independente', function () {
      startCoop();
      ok(P.coop, 'modo co-op desligado'); eq(P.players().length, 2);
      const p1 = P.leaderOf(0), p2 = P.leaderOf(1); ok(p1 !== p2 && p1.def.id !== p2.def.id, 'mesmo agente para os dois');
      const free = function () { return false; }, x1 = p1.x, y1 = p1.y, x2 = p2.x, y2 = p2.y;
      for (let i = 0; i < 60; i++) P.update(1 / 60, 1, 0, free, 0, -1, free);
      ok(p1.x > x1 + 20 && Math.abs(p1.y - y1) < 0.5, 'J1 deveria andar só para a direita');
      ok(p2.y < y2 - 20 && Math.abs(p2.x - x2) < 0.5, 'J2 deveria andar só para cima');
      endCoop();
    });
    test('co-op: o terceiro agente segue o Jogador 1', function () {
      startCoop();
      const third = P.agents[P.order[2]], free = function () { return false; };
      for (let i = 0; i < 150; i++) P.update(1 / 60, 1, 0, free, 0, 0, free);
      const p1 = P.leaderOf(0);
      ok(Math.hypot(third.x - p1.x, third.y - p1.y) < 40, 'seguidor ficou para trás: ' + Math.round(Math.hypot(third.x - p1.x, third.y - p1.y)));
      endCoop();
    });
    test('co-op: trocar de agente mantém três agentes distintos e troca de lugar com o parceiro', function () {
      startCoop();
      const ids = function () { return P.order.slice(); };
      eq(ids().join(), '0,1,2');
      ok(P.assign(0, 1), 'J1 deveria pegar o agente do J2'); eq(ids().join(), '1,0,2', 'trocaram de agente');
      ok(P.assign(1, 2)); eq(ids().join(), '1,2,0', 'J2 pega o agente livre');
      ok(!P.assign(1, 2), 'pegar o próprio agente não deve mudar nada');
      eq(new Set(ids()).size, 3);
      ok(P.next(0)); eq(new Set(ids()).size, 3); ok(P.leaderOf(0) !== P.leaderOf(1));
      endCoop();
    });
    test('co-op: "elástico" impede os jogadores de saírem da tela um do outro', function () {
      startCoop();
      const orig = W.blocked; W.blocked = function () { return false; };
      try {
        const a = P.leaderOf(0), b = P.leaderOf(1); a.x = 300; a.y = 300; b.x = 300; b.y = 300;
        const view = { w: 300, h: 200 }, fn = G.tether(b, a, view);
        ok(!fn(300 + 50 - 4, 300 - 5, 8, 5), 'perto deveria ser permitido');
        ok(fn(300 + 400 - 4, 300 - 5, 8, 5), 'longe demais deveria bloquear');
        b.x = 300 + 400; ok(!fn(300 + 390 - 4, 300 - 5, 8, 5), 'voltar para perto deve ser permitido mesmo estando longe');
      } finally { W.blocked = orig; }
      endCoop();
    });
    test('co-op: cada jogador interage com o alvo mais próximo do seu agente', function () {
      startCoop();
      const n = W.NPCS.marta, p1 = P.leaderOf(0), p2 = P.leaderOf(1);
      p1.x = 100; p1.y = 300; p2.x = n.tx * T + 8; p2.y = (n.ty + 1) * T + 12; p2.dir = 'up';
      ok(!G.findTarget(0) || G.findTarget(0).id !== 'marta', 'J1 está longe da Dona Marta');
      const t = G.findTarget(1); ok(t && t.id === 'marta', 'J2 deveria alcançar a Dona Marta');
      P.current = 1; eq(P.actor(), p2); eq(G.leaderId(), p2.def.id, 'quem interagiu deveria falar como "me"');
      endCoop();
    });
    test('co-op: descobrir um local vale para qualquer um dos dois jogadores', function () {
      startCoop();
      const b = W.BUILDINGS.filter(function (x) { return x.id === 'padaria'; })[0], p2 = P.leaderOf(1);
      p2.x = (b.x + 2) * T; p2.y = (b.y + b.h + 1) * T;
      ok(!G.state.discovered.padaria); G.discoverCheck(); ok(G.state.discovered.padaria, 'J2 não descobriu');
      endCoop();
    });
    test('modo solo continua com um único jogador', function () {
      G.coopMode = false; G.newGame(true);
      ok(!P.coop); eq(P.players().length, 1); eq(P.leaderOf(1), P.leaderOf(0), 'sem J2 no modo solo');
    });

    test('relacionar: só liga o par certo e libera "Concluir" ao ligar todos', async function () {
      const st = M.byId.libras.steps.filter(function (x) { return x.t === 'match'; })[0];
      const p = CPT.Activities.match(st); await new Promise(function (r) { setTimeout(r, 90); });
      const card = CPT.Modal.top().card, done = card.querySelector('#m-done');
      ok(done.disabled, 'Concluir deveria começar bloqueado');
      card.querySelector('[data-n="0"]').click(); card.querySelector('[data-r="1"]').click();
      ok(!card.querySelector('[data-n="0"]').classList.contains('matched'), 'par errado não pode ligar');
      for (let i = 0; i < st.pairs.length; i++) { card.querySelector('[data-n="' + i + '"]').click(); card.querySelector('[data-r="' + i + '"]').click(); }
      ok(!done.disabled, 'Concluir deveria liberar com todos os pares'); eq(card.querySelectorAll('.matched').length, st.pairs.length * 2);
      done.click(); const r = await p; eq(r.tries, 1, 'deveria contar 1 erro'); eq(G.busy, 0); G.newGame(true);
    });

    /* ---------- sair de conversas e atividades (Esc / botão Sair) ---------- */
    const D = CPT.Dialogue, tick = function (ms) { return new Promise(function (r) { setTimeout(r, ms || 90); }); };
    const clickPrimary = function () { const b = document.querySelector('#dlg-actions .btn.primary'); if (b) b.click(); };
    const cleanupUI = function () { CPT.Modal.closeAll(); D.close(); document.querySelector('#dialogue').classList.add('hidden'); G.coopMode = false; G.newGame(true); };
    test('sair da conversa: Esc e o botão fecham o diálogo sem travar, e a missão recomeça do mesmo ponto', async function () {
      G.coopMode = false; G.newGame(true);
      const p = M.interactNpc('marta'); await tick();
      ok(D.isOpen(), 'o diálogo não abriu');
      const first = document.querySelector('#dlg-text').textContent;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true, cancelable: true }));
      await p;
      ok(!D.isOpen(), 'o diálogo deveria ter fechado'); eq(G.busy, 0, 'o jogo ficou travado (busy)');
      ok(!CPT.Modal.top(), 'o mesmo Esc não pode abrir o menu de pausa');
      ok(document.querySelector('#dialogue').classList.contains('hidden'), 'painel ainda visível');
      eq(G.state.missions.saude.status, 'active'); eq(G.state.missions.saude.step, 0);
      const p2 = M.interactNpc('marta'); await tick();
      eq(document.querySelector('#dlg-text').textContent, first, 'deveria recomeçar a etapa');
      document.getElementById('dlg-exit').click(); await p2;
      ok(!D.isOpen()); eq(G.busy, 0);
      cleanupUI();
    });
    test('sair logo depois de escolher não permite repetir o ganho de status (sem "farmar")', async function () {
      G.coopMode = false; G.newGame(true);
      const co0 = G.state.stats.co, ab0 = G.state.stats.ab;
      const p = M.interactNpc('marta'); await tick();
      clickPrimary(); await tick(); clickPrimary(); await tick();
      const opts = document.querySelectorAll('#dlg-actions .choices .btn.choice'); eq(opts.length, 3, 'esperava 3 alternativas');
      const best = Array.from(opts).find(function (b) { return /Sentar ao lado/.test(b.textContent); });
      ok(best, 'deveria encontrar a melhor resposta embaralhada');
      best.click(); await tick();
      eq(G.state.stats.co, co0 + 8); eq(G.state.stats.ab, ab0 + 2);
      D.cancel(); await p;
      eq(G.busy, 0); eq(G.state.missions.saude.doneSteps[1], true, 'a etapa deveria estar concluída');
      const p2 = M.interactNpc('marta'); await tick();
      ok(CPT.Modal.top() && CPT.Modal.top().card.querySelector('#o-pool'), 'deveria seguir para a atividade seguinte');
      eq(G.state.stats.co, co0 + 8, 'não pode ganhar de novo');
      CPT.Modal.top().onEsc(); await p2;
      eq(G.busy, 0); ok(!CPT.Modal.top(), 'a atividade deveria fechar');
      eq(G.state.stats.co, co0 + 8); eq(G.state.stats.ab, ab0 + 2);
      cleanupUI();
    });
    test('postos cooperativos: sair depois do último posto ainda concede o bônus de equipe, uma única vez', async function () {
      G.coopMode = false; G.newGame(true);
      const m = G.state.missions.portal; m.status = 'active'; m.step = 1; m.briefed[1] = true; m.prog.t1 = true; m.prog.t2 = true;
      P.switchTo(2);
      const def = W.STATIONS.filter(function (x) { return x.id === 't3'; })[0], pts0 = G.state.pts, s0 = Object.assign({}, G.state.stats);
      const p = M.interactStation(def); await tick();
      ok(D.isOpen(), 'o posto deveria abrir a escolha');
      const stationOpts = Array.from(document.querySelectorAll('#dlg-actions .choices .btn.choice'));
      const stationBest = stationOpts.find(function (b) { return /Passo a passo curto/.test(b.textContent); });
      ok(stationBest, 'deveria encontrar a melhor opção embaralhada do posto');
      stationBest.click(); await tick();
      eq(m.prog.t3, true, 'o posto deveria contar como concluído ao escolher');
      D.cancel(); await p;
      eq(G.busy, 0);
      eq(G.state.stats.co, s0.co + 8 + 3, 'efeito da escolha + bônus de equipe'); eq(G.state.pts, pts0 + 5, 'pontos do bônus');
      const p2 = M.interactStation(def); await tick();
      ok(/já foi concluído/.test(document.querySelector('#dlg-text').textContent)); clickPrimary(); await p2;
      eq(G.state.pts, pts0 + 5, 'o bônus não pode se repetir'); eq(G.state.stats.co, s0.co + 11);
      cleanupUI();
    });

    /* ---------- controle (gamepad) ---------- */
    const GPd = CPT.Gamepad, padList = [];
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: function () { return padList; } });
    const mkPad = function (i) { return { index: i, id: 'Controle de teste ' + i, connected: true, mapping: 'standard', axes: [0, 0, 0, 0], buttons: Array.apply(null, Array(17)).map(function () { return { pressed: false, value: 0 }; }) }; };
    const setBtn = function (pad, i, on) { pad.buttons[i] = { pressed: on !== false, value: on !== false ? 1 : 0 }; };
    const tap = function (pad, i) { setBtn(pad, i, true); GPd.poll(); setBtn(pad, i, false); GPd.poll(); };
    const padDone = function () { padList.length = 0; GPd.enabled = true; GPd.maps = {}; try { localStorage.removeItem('cpt-padmap'); } catch (e) { /* ok */ } GPd.reset(); GPd.poll(); };
    test('controle: o analógico (com zona morta) e o direcional movem o jogador', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const p0 = mkPad(0); padList.push(p0);
      p0.axes[0] = 0.2; GPd.poll(); eq(GPd.dirs[0].x, 0, 'a zona morta deveria ignorar movimentos pequenos');
      p0.axes[0] = 0.9; p0.axes[1] = -0.8; GPd.poll(); eq(GPd.dirs[0].x, 1); eq(GPd.dirs[0].y, -1);
      p0.axes[0] = 0; p0.axes[1] = 0; setBtn(p0, 14); GPd.poll(); eq(GPd.dirs[0].x, -1, 'direcional esquerdo');
      setBtn(p0, 14, false); GPd.poll(); eq(GPd.dirs[0].x, 0);
      padDone();
    });
    test('controle: no co-op, 1 controle fica com o J2 e 2 controles ficam com J1 e J2', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a); a.axes[0] = 1; GPd.poll();
      eq(GPd.dirs[1].x, 1, 'com 1 controle ele é do J2'); eq(GPd.dirs[0].x, 0);
      padList.push(b); b.axes[1] = -1; GPd.poll();
      eq(GPd.dirs[0].x, 1, '1º controle = J1'); eq(GPd.dirs[1].y, -1, '2º controle = J2');
      padDone(); endCoop();
    });
    test('controle: desligar nas opções ignora o controle', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const p0 = mkPad(0); padList.push(p0); p0.axes[0] = 1;
      GPd.enabled = false; GPd.poll(); eq(GPd.dirs[0].x, 0, 'com o controle desligado não deve mover');
      GPd.enabled = true; GPd.poll(); eq(GPd.dirs[0].x, 1);
      padDone();
    });
    test('controle: A interage, o direcional escolhe a resposta e B sai da conversa', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const pad = mkPad(0); padList.push(pad);
      const n = W.NPCS.marta, a = P.leader(); a.x = n.tx * T + 8; a.y = (n.ty + 1) * T + 12; a.dir = 'up';
      tap(pad, 0); await tick();
      ok(D.isOpen(), 'A deveria iniciar a conversa');
      tap(pad, 0); await tick(); tap(pad, 0); await tick();       // avança as duas falas
      const choices = document.querySelectorAll('#dlg-actions .choices .btn.choice'); eq(choices.length, 3, 'esperava 3 respostas');
      ok(document.activeElement === choices[0], 'a primeira resposta deveria ter o foco');
      tap(pad, 13);
      ok(document.activeElement === choices[1], 'direcional para baixo deveria ir para a 2ª resposta');
      tap(pad, 12);
      ok(document.activeElement === choices[0], 'direcional para cima deveria voltar à 1ª resposta');
      tap(pad, 1); await tick();
      ok(!D.isOpen(), 'B deveria sair da conversa'); eq(G.busy, 0); ok(!CPT.Modal.top(), 'o B não pode abrir a pausa');
      padDone(); cleanupUI();
    });
    test('controle: A escolhe a resposta focada e o ganho é aplicado uma vez', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const pad = mkPad(0), co0 = G.state.stats.co; padList.push(pad);
      const p = M.interactNpc('marta'); await tick();
      tap(pad, 0); await tick(); tap(pad, 0); await tick();
      const choices = Array.from(document.querySelectorAll('#dlg-actions .choices .btn.choice'));
      const bestIndex = choices.findIndex(function (b) { return /Sentar ao lado/.test(b.textContent); });
      ok(bestIndex >= 0, 'deveria encontrar a melhor resposta embaralhada');
      for (let i = 0; i < bestIndex; i++) tap(pad, 13);
      tap(pad, 0); await tick();
      eq(G.state.stats.co, co0 + 8, 'a melhor resposta deveria dar +8 de Conhecimento');
      D.cancel(); await p; padDone(); cleanupUI();
    });
    test('controle: Start abre a pausa e B fecha', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const pad = mkPad(0); padList.push(pad);
      tap(pad, 9); await tick();
      ok(CPT.Modal.top() && /pausado/.test(CPT.Modal.top().card.textContent), 'a pausa não abriu');
      tap(pad, 1); await tick();
      ok(!CPT.Modal.top(), 'B deveria fechar a pausa');
      padDone(); cleanupUI();
    });
    test('controle genérico: o direcional em eixo (hat) e a zona morta funcionam', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const p0 = mkPad(0); p0.mapping = ''; p0.axes = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1.2857]; padList.push(p0);
      GPd.poll(); eq(GPd.dirs[0].x, 0); eq(GPd.dirs[0].y, 0, 'hat neutro não deve mover');
      p0.axes[9] = -1; GPd.poll(); eq(GPd.dirs[0].y, -1, 'hat para cima');
      p0.axes[9] = -0.4286; GPd.poll(); eq(GPd.dirs[0].x, 1, 'hat para a direita');
      p0.axes[9] = 0.7143; GPd.poll(); eq(GPd.dirs[0].x, -1, 'hat para a esquerda');
      padDone();
    });
    test('controle: dispositivos "fantasma" (sensor de movimento) são ignorados e o controle de verdade funciona', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const ghost = mkPad(0); ghost.id = 'Wireless Controller Motion Sensors'; ghost.axes = [0.9, 0.9, 0.9, 0.9];
      const real = mkPad(1); padList.push(ghost, real); real.axes[0] = -1;
      GPd.poll();
      eq(GPd.count, 1, 'só o controle de verdade deveria contar'); eq(GPd.dirs[0].x, -1, 'o controle real deveria mover o jogador');
      const noButtons = mkPad(2); noButtons.buttons = []; noButtons.axes = [1, 1, 1, 1]; padList.push(noButtons); GPd.poll(); eq(GPd.count, 1, 'sem botões não é controle');
      padDone();
    });
    test('controle: no modo solo, qualquer controle conectado comanda o jogador', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b); b.axes[1] = 1; GPd.poll();
      eq(GPd.dirs[0].y, 1, 'o 2º controle também deveria andar'); padDone();
    });
    test('painel do controle: explica o que fazer sem controle e mostra os dados quando há controle', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      let h = GPd.openPanel(); await tick();
      ok(/Nenhum controle detectado/.test(h.card.querySelector('#pad-status').textContent), 'deveria explicar como conectar');
      h.close();
      const pad = mkPad(0); pad.id = 'Controle de teste ABC'; padList.push(pad);
      h = GPd.openPanel(); await tick(200);
      ok(/em uso/.test(h.card.querySelector('#pad-status').textContent), 'deveria avisar que há controle em uso');
      ok(/Controle de teste ABC/.test(h.card.querySelector('#pad-live').textContent), 'deveria mostrar o nome do controle');
      setBtn(pad, 0); await tick(250);
      ok(/A confirmar/.test(h.card.querySelector('.pill-act.on').textContent), 'deveria acender "A confirmar" ao vivo');
      h.close(); padDone();
    });
    test('controle: o assistente de configuração salva botões e eixos personalizados', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); GPd.maps = {}; padList.length = 0;
      const pad = mkPad(0); pad.mapping = ''; pad.id = 'Controle genérico (teste)'; padList.push(pad);
      const h = GPd.openPanel(); await tick();
      h.card.querySelector('#pad-config').click();
      const feed = function (idx) { setBtn(pad, idx); GPd.poll(); setBtn(pad, idx, false); GPd.poll(); GPd.poll(); };
      GPd.poll();
      [5, 6, 7, 8, 9].forEach(feed);                                       // A, B, Y, X, Start
      pad.axes[2] = 1; GPd.poll(); pad.axes[2] = 0; GPd.poll(); GPd.poll(); // analógico para a direita
      pad.axes[3] = -1; GPd.poll(); pad.axes[3] = 0; GPd.poll();            // para baixo (este controle reporta -1)
      const sv = GPd.maps[pad.id];
      ok(sv, 'o mapeamento deveria ter sido salvo');
      eq(sv.b.A, 5); eq(sv.b.B, 6); eq(sv.b.Y, 7); eq(sv.b.X, 8); eq(sv.b.START, 9); eq(sv.ax.x, 2); eq(sv.ax.y, 3); eq(sv.ax.ys, -1);
      h.close(); await tick();
      pad.axes[3] = -1; GPd.poll(); eq(GPd.dirs[0].y, 1, 'eixo invertido: -1 deveria ser "para baixo"'); pad.axes[3] = 0; GPd.poll();
      const n = W.NPCS.marta, a = P.leader(); a.x = n.tx * T + 8; a.y = (n.ty + 1) * T + 12; a.dir = 'up';
      tap(pad, 5); await tick();
      ok(D.isOpen(), 'o botão 5 deveria funcionar como A depois de configurado');
      D.cancel(); await tick(); padDone(); cleanupUI();
    });
    test('controle: "Restaurar padrão" apaga o mapeamento salvo', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const pad = mkPad(0); pad.id = 'Controle X'; padList.push(pad); GPd.maps[pad.id] = { b: { A: 7 } };
      eq(GPd.cfg(pad).b.A, 7, 'mapeamento salvo deveria valer');
      const h = GPd.openPanel(); h.card.querySelector('#pad-reset').click();
      eq(GPd.cfg(pad).b.A, 0, 'restaurar deveria voltar ao padrão'); h.close(); padDone();
    });
    test('controle: Y e RB percorrem os 3 agentes (não só 2) e LB volta', function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0;
      const pad = mkPad(0); padList.push(pad);
      const seen = [G.leaderId()];
      tap(pad, 3); seen.push(G.leaderId()); tap(pad, 3); seen.push(G.leaderId()); tap(pad, 3); seen.push(G.leaderId());
      eq(seen.join(), 'marcio,miguel,yuri,marcio', 'Y deveria percorrer Márcio → Miguel → Yuri → Márcio');
      tap(pad, 5); eq(G.leaderId(), 'miguel', 'RB = próximo');
      tap(pad, 5); eq(G.leaderId(), 'yuri');
      tap(pad, 4); eq(G.leaderId(), 'miguel', 'LB = anterior');
      tap(pad, 4); tap(pad, 4); eq(G.leaderId(), 'yuri', 'LB a partir do primeiro volta ao último');
      padDone(); G.newGame(true);
    });
    test('trocar de agente com Tab/Q também percorre os 3 (solo)', function () {
      G.coopMode = false; G.newGame(true);
      const seen = [G.leaderId()];
      for (let i = 0; i < 3; i++) { G.nextAgent(0); seen.push(G.leaderId()); }
      eq(seen.join(), 'marcio,miguel,yuri,marcio');
      G.cycleAgent(0, -1); eq(G.leaderId(), 'yuri');
      G.newGame(true);
    });
    test('co-op: Y pega o agente livre; RB/LB percorrem os 3 e, ao cair no parceiro, trocam de agente', function () {
      startCoop(); GPd.reset();
      eq(P.order.join(), '0,1,2');
      G.nextAgent(0); eq(P.order.join(), '2,1,0', 'J1 pega o agente livre');
      G.nextAgent(0); eq(P.order.join(), '0,1,2', 'e volta ao anterior');
      G.cycleAgent(0, 1); eq(P.order.join(), '1,0,2', 'RB do J1 cai no agente do J2: os dois trocam');
      eq(new Set(P.order).size, 3, 'sempre 3 agentes distintos');
      G.cycleAgent(1, -1); ok(P.leaderOf(0) !== P.leaderOf(1));
      endCoop();
    });
    test('controle no co-op: dá para inverter quem é J1 e J2 (2 controles)', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b); a.axes[0] = 1;
      GPd.swap = false; GPd.poll(); eq(GPd.dirs[0].x, 1, 'sem inverter, o 1º controle é do J1');
      GPd.swap = true; GPd.poll(); eq(GPd.dirs[1].x, 1, 'invertido, o 1º controle é do J2'); eq(GPd.dirs[0].x, 0);
      GPd.swap = false; padDone(); endCoop();
    });
    test('painel do controle: mostra qual jogador cada controle será no modo dupla', async function () {
      G.coopMode = false; G.newGame(true); GPd.reset(); padList.length = 0; GPd.swap = false;
      const a = mkPad(0), b = mkPad(1); a.id = 'Controle UM'; b.id = 'Controle DOIS'; padList.push(a, b);
      const h = GPd.openPanel(); await tick(250);
      const t = h.card.querySelector('#pad-live').textContent;
      ok(/Controle UM[\s\S]*Jogador 1[\s\S]*Controle DOIS[\s\S]*Jogador 2/.test(t), 'deveria indicar J1 e J2 nos dois controles');
      h.card.querySelector('#pad-swap').click(); await tick(250);
      ok(/Controle UM[\s\S]*Jogador 2[\s\S]*Controle DOIS[\s\S]*Jogador 1/.test(h.card.querySelector('#pad-live').textContent), 'depois de inverter, J1 e J2 trocam');
      h.close(); GPd.swap = false; try { localStorage.removeItem('cpt-padswap'); } catch (e) { /* ok */ } padDone();
    });

    /* ---------- celular: sem toque selecionando texto e só 1 jogador ---------- */
    test('celular: pressionar e segurar nas setas não seleciona texto (CSS + eventos)', function () {
      const btn = document.querySelector('.dpad button'), cs = getComputedStyle(btn);
      eq(cs.userSelect || cs.webkitUserSelect, 'none', 'as setas não podem permitir seleção de texto');
      eq(cs.touchAction, 'none', 'as setas não podem rolar nem dar zoom');
      eq(getComputedStyle(document.querySelector('#btn-act')).userSelect, 'none');
      eq(getComputedStyle(document.querySelector('#screen-game')).userSelect, 'none');
      const ev = new Event('contextmenu', { bubbles: true, cancelable: true }); btn.dispatchEvent(ev);
      ok(ev.defaultPrevented, 'o menu de pressionar e segurar deveria ser bloqueado');
      const ev2 = new Event('selectstart', { bubbles: true, cancelable: true }); btn.dispatchEvent(ev2);
      ok(ev2.defaultPrevented, 'iniciar seleção deveria ser bloqueado');
    });
    test('celular: o modo de 2 jogadores não existe (botão e dicas somem; o jogo fica solo)', function () {
      G.forcePhone = true; G.updatePhone();
      ok(document.body.classList.contains('is-phone'));
      eq(getComputedStyle(document.querySelector('#btn-play2')).display, 'none', 'botão de 2 jogadores deveria sumir');
      eq(getComputedStyle(document.querySelector('.coop-only')).display, 'none', 'dica de 2 jogadores deveria sumir');
      ok(getComputedStyle(document.querySelector('#btn-play')).display !== 'none', 'o de 1 jogador continua');
      G.coopMode = true; G.newGame(true);
      eq(P.coop, false, 'no celular o co-op deveria ser recusado'); eq(G.coopMode, false);
      const p = G.startFlow(true); eq(G.coopMode, false, 'startFlow(true) no celular vira 1 jogador'); eq(P.coop, false);
      cleanupUI();
      G.forcePhone = false; G.updatePhone();
      ok(!document.body.classList.contains('is-phone'), 'fora do celular o botão volta');
      ok(getComputedStyle(document.querySelector('#btn-play2')).display !== 'none');
      startCoop(); eq(P.coop, true, 'no computador o co-op continua funcionando'); endCoop();
      G.forcePhone = null; G.updatePhone();
    });

    /* ---------- dois controles (testados com controles simulados) ---------- */
    test('2 controles: cada um anda com o seu jogador, sem interferir no outro', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b);
      const j1 = P.leaderOf(0), j2 = P.leaderOf(1), x1 = j1.x, y1 = j1.y, x2 = j2.x, y2 = j2.y;
      a.axes[0] = 1; b.axes[1] = 1;                                   // controle 1 → direita, controle 2 → baixo
      for (let i = 0; i < 6; i++) { GPd.poll(); G.update(0.05); }
      ok(j1.x > x1 + 5, 'J1 (controle 1) deveria andar para a direita'); ok(Math.abs(j1.y - y1) < 0.5, 'J1 não pode andar na vertical');
      ok(j2.y > y2 + 5, 'J2 (controle 2) deveria andar para baixo'); ok(Math.abs(j2.x - x2) < 0.5, 'J2 não pode andar na horizontal');
      a.axes[0] = 0; b.axes[1] = 0; GPd.poll(); G.update(0.05); padDone(); endCoop();
    });
    test('2 controles: o botão A de cada um interage como o seu próprio jogador', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b);
      const calls = [], orig = G.interact; G.interact = function (n) { calls.push(n); };
      try { tap(a, 0); tap(b, 0); tap(b, 0); tap(a, 0); } finally { G.interact = orig; }
      eq(calls.join(','), '0,1,1,0', 'A do controle 1 = J1, A do controle 2 = J2');
      padDone(); endCoop();
    });
    test('2 controles: funciona com lacunas na lista do navegador e ignora sensores fantasmas', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const ghost = mkPad(0); ghost.id = 'Wireless Controller Motion Sensors'; ghost.axes = [1, 1, 1, 1];
      const a = mkPad(1), b = mkPad(3);                               // o navegador entrega [fantasma, controle, vazio, controle]
      padList.push(ghost, a, null, b);
      a.axes[0] = 1; b.axes[1] = -1; GPd.poll();
      eq(GPd.count, 2, 'deveria contar só os 2 controles de verdade');
      eq(GPd.dirs[0].x, 1, 'primeiro controle de verdade = J1'); eq(GPd.dirs[0].y, 0);
      eq(GPd.dirs[1].y, -1, 'segundo controle de verdade = J2'); eq(GPd.dirs[1].x, 0);
      padDone(); endCoop();
    });
    test('2 controles: o botão Y de cada um troca o agente só do seu jogador', function () {
      startCoop(); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b);
      const o0 = P.order.slice();
      tap(b, 3);                                                      // Y do controle 2 (J2)
      eq(P.order[0], o0[0], 'o J1 não pode mudar de agente quando o J2 aperta Y');
      ok(P.order[1] !== o0[1], 'o J2 deveria ter trocado de agente');
      padDone(); endCoop();
    });
    test('2 controles no celular (1 jogador): os dois controles comandam o mesmo jogador', function () {
      G.forcePhone = true; G.coopMode = true; G.newGame(true); GPd.reset(); padList.length = 0;
      const a = mkPad(0), b = mkPad(1); padList.push(a, b);
      b.axes[0] = -1; GPd.poll(); eq(GPd.dirs[0].x, -1, 'qualquer controle comanda o único jogador'); eq(GPd.dirs[1].x, 0, 'não existe J2 no celular');
      padDone(); G.forcePhone = null; G.updatePhone(); G.newGame(true);
    });

    /* ---------- música de fundo ---------- */
    const mockCtx = function () {
      const param = function () { return { value: 0, setValueAtTime: function () {}, linearRampToValueAtTime: function () {}, exponentialRampToValueAtTime: function () {}, setTargetAtTime: function () {}, cancelScheduledValues: function () {} }; };
      const node = function () { return { connect: function () {}, disconnect: function () {}, start: function () { this.started = true; }, stop: function () {}, gain: param(), frequency: param(), detune: param(), delayTime: param(), buffer: null, type: '' }; };
      const c = { currentTime: 0, state: 'running', sampleRate: 22050, destination: node(), made: 0, resume: function () {}, suspend: function () {},
        createBuffer: function (n, len) { return { getChannelData: function () { return new Float32Array(len); } }; } };
      ['createGain', 'createOscillator', 'createBiquadFilter', 'createDelay', 'createDynamicsCompressor', 'createBufferSource'].forEach(function (k) { c[k] = function () { c.made++; return node(); }; });
      return c;
    };
    test('música: as trilhas existem, os compassos fecham e todas as notas são audíveis', function () {
      const TR = CPT.Sound.music.TRACKS;
      ['play', 'title'].forEach(function (k) {
        const t = TR[k]; eq(t.chords.length, t.roots.length, k + ': um baixo por acorde'); eq(t.chords.length, t.melody.length, k + ': uma melodia por compasso');
        t.melody.forEach(function (bar) { bar.forEach(function (n) { ok(n[0] >= 0 && n[0] + n[2] <= 16, k + ': nota passa do fim do compasso'); ok(n[1] >= 55 && n[1] <= 95, k + ': nota fora da região audível'); }); });
      });
    });
    test('música: renderizada, não é silêncio, não estoura e tem som em todos os compassos', async function () {
      for (const name of ['play', 'title']) {
        const buf = await CPT.Sound.music.render(name, 4, 22050), d = buf.getChannelData(0);
        let peak = 0, nan = 0; for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a !== a) nan++; if (a > peak) peak = a; }
        eq(nan, 0, name + ': não pode ter valores inválidos'); ok(peak > 0.05, name + ': parece silêncio'); ok(peak < 0.95, name + ': estourou (distorção)');
        const per = Math.floor(d.length / 4.1); for (let k = 0; k < 4; k++) { let s = 0; for (let i = k * per; i < (k + 1) * per; i++) s += d[i] * d[i]; ok(Math.sqrt(s / per) > 0.01, name + ': compasso ' + (k + 1) + ' sem som'); }
      }
    });
    test('música: toca na tela certa, respeita Opções (música desligada, silenciar, volume 0) e para ao sair', function () {
      const Snd = CPT.Sound, Mu = Snd.music, realCtx = Snd.ctx, S = CPT.Settings;
      const saved = { musicOn: Snd.musicOn, muted: Snd.muted, volume: Snd.volume }, c = mockCtx();
      try {
        Snd.ctx = c; Mu.busCtx = null; Mu.cur = null;
        G.showScreen('screen-title'); eq(Mu.want, 'title'); eq(Mu.cur, 'title', 'no título toca a trilha calma');
        G.showScreen('screen-game'); eq(Mu.want, 'play'); eq(Mu.cur, 'play', 'no jogo toca a trilha animada');
        c.currentTime = 1; const before = c.made; Mu.tick(); ok(c.made > before + 5, 'o agendador deveria criar as notas à frente');
        S.v.music = false; S.apply(); eq(Mu.timer, null, 'com "Música de fundo" desmarcado o agendador para'); eq(Mu.cur, null);
        S.v.music = true; S.apply(); eq(Mu.cur, 'play', 'ao marcar de novo, a música volta');
        S.v.muted = true; S.apply(); eq(Mu.cur, null, 'silenciar tudo também cala a música');
        S.v.muted = false; S.v.volume = 0; S.apply(); eq(Mu.cur, null, 'volume 0 = sem música');
        S.v.volume = 50; S.apply(); eq(Mu.cur, 'play');
        Mu.halt(); eq(Mu.timer, null);
      } finally {
        Mu.halt(); S.v.music = true; S.v.muted = false; S.v.volume = 50; Snd.ctx = realCtx; Mu.busCtx = null; Mu.cur = null;
        Snd.musicOn = saved.musicOn; Snd.muted = saved.muted; Snd.volume = saved.volume; S.apply(); G.showScreen('screen-game');
      }
    });
    test('música: a caixa "Música de fundo" aparece nas Opções e liga/desliga de verdade', function () {
      const S = CPT.Settings, h = S.open(), cb = h.card.querySelector('#o-music');
      ok(cb && cb.checked, 'a caixa deveria existir e vir marcada');
      cb.checked = false; cb.dispatchEvent(new Event('change', { bubbles: true })); eq(CPT.Sound.musicOn, false);
      cb.checked = true; cb.dispatchEvent(new Event('change', { bubbles: true })); eq(CPT.Sound.musicOn, true);
      h.close(); try { localStorage.removeItem('cpt-settings'); } catch (e) { /* ok */ }
    });

    return queue;
  }

  function render(res) {
    const pass = res.filter(function (r) { return r.ok; }).length;
    const box = document.getElementById('results');
    if (box) {
      box.innerHTML = '<h1>' + pass + ' de ' + res.length + ' testes passaram ' + (pass === res.length ? '✔' : '✖') + '</h1><ul>' +
        res.map(function (r) { return '<li class="' + (r.ok ? 'ok' : 'fail') + '">' + (r.ok ? '✔ ' : '✖ ') + r.name + (r.ok ? '' : ' — ' + r.err) + '</li>'; }).join('') + '</ul>';
      box.style.display = 'block';
    }
    window.__testResults = { pass: pass, total: res.length, results: res };
    res.forEach(function (r) { console[r.ok ? 'log' : 'error']((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : ' — ' + r.err)); });
  }

  function boot() { Promise.resolve().then(function () { return runAll(run()); }).then(render, function (e) { render([{ name: 'inicialização', ok: false, err: e.message }]); }); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
