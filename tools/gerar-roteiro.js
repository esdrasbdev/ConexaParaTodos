#!/usr/bin/env node
/* Gera docs/ROTEIRO.md lendo os dados reais do jogo (js/world.js, js/player.js, js/missions.js, js/game.js).
 * Uso: node tools/gerar-roteiro.js   (sem dependências) */
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
global.window = global;
['world', 'player', 'missions'].forEach(function (f) { vm.runInThisContext(fs.readFileSync(path.join(root, 'js', f + '.js'), 'utf8'), { filename: f + '.js' }); });
const CPT = global.CPT, W = CPT.World, M = CPT.Missions, AG = CPT.Player.AGENTS;
const gameSrc = fs.readFileSync(path.join(root, 'js', 'game.js'), 'utf8');
const num = function (k) { return +new RegExp(k + ': (\\d+)').exec(gameSrc)[1]; };
const C = { GOAL: num('GOAL'), PORTAL: num('PORTAL_NEEDS'), HINT: num('HINT_AT'), FMAX: num('FUND_MAX'), FGAIN: num('FUND_GAIN'), MUT: num('MUTIRAO_GAIN') };
const START = /START_STATS: \{ ac: (\d+), ab: (\d+), co: (\d+) \}/.exec(gameSrc).slice(1).map(Number);
const START_PTS = num('START_PTS');

const N = { ac: 'Acesso', ab: 'Acessibilidade', co: 'Conhecimento' };
const fx = function (o) { const t = Object.keys(o || {}).map(function (k) { return N[k] + ' ' + (o[k] > 0 ? '+' : '') + o[k]; }).join(', '); return t || '—'; };
const esc = function (s) { return String(s).replace(/\|/g, '\\|').replace(/\n/g, ' '); };
const strip = function (h) { return h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(); };
const TIER = { best: '✅ Ótima escolha', ok: '🟡 Funciona, mas dá para melhorar', bad: '❌ Ainda não é o melhor caminho (tenta de novo)' };
const who = function (id) {
  if (id === 'me') return 'Agente em ação (Márcio, Miguel ou Yuri)';
  if (id === 'narrator') return 'Conecta (narração)';
  const a = AG.filter(function (x) { return x.id === id; })[0]; if (a) return a.name;
  return W.NPCS[id].name;
};
const area = function (id) { return (W.AREAS.filter(function (a) { return a.id === id; })[0] || {}).name || id; };
const LOC = { tablet: 'frente do Centro Comunitário', wifi: 'Praça Central, perto do poste de Wi-Fi', caderno: 'em frente à Biblioteca Comunitária', pc1: 'pátio da Biblioteca', pc2: 'pátio da Biblioteca', pc3: 'pátio da Biblioteca', t1: 'em frente à Prefeitura', t2: 'em frente à Prefeitura', t3: 'em frente à Prefeitura' };

const out = [];
const p = function (s) { out.push(s === undefined ? '' : s); };

function choiceTable(c) {
  p('| Opção | Nível | Efeito nos status | O que o jogo explica |'); p('|---|---|---|---|');
  c.options.forEach(function (o, i) { p('| ' + (i + 1) + '. ' + esc(o.text) + ' | ' + TIER[o.tier] + ' | ' + fx(o.fx) + ' | ' + esc(o.why) + ' |'); });
  p();
}
function bestPlan(s) {
  let best = null;
  for (let mask = 0; mask < (1 << s.options.length); mask++) {
    const sel = s.options.filter(function (_, i) { return mask & (1 << i); });
    if (sel.length < s.min || sel.reduce(function (a, o) { return a + o.cost; }, 0) > s.budget) continue;
    const t = { ac: 0, ab: 0, co: 0 };
    sel.forEach(function (o) { for (const k in o.fx) t[k] += o.fx[k]; });
    (s.synergy || []).forEach(function (y) { if (y.need.every(function (id) { return sel.some(function (o) { return o.id === id; }); })) for (const k in y.fx) t[k] += y.fx[k]; });
    const v = t.ac + t.ab + t.co;
    if (!best || v > best.v) best = { v: v, sel: sel, t: t };
  }
  return best;
}
function bestTotals(m) {
  const t = { ac: 0, ab: 0, co: 0 };
  const add = function (o) { for (const k in o) t[k] += o[k]; };
  const bestOpt = function (c) { return c.options.filter(function (o) { return o.tier === 'best'; })[0].fx; };
  m.steps.forEach(function (s) {
    if (s.t === 'choice') add(bestOpt(s));
    if (s.fx) add(s.fx);
    if (s.t === 'plan') add(bestPlan(s).t);
    if (s.itemFx) Object.keys(s.itemFx).forEach(function (k) { add(s.itemFx[k].fx); });
    if (s.mini) Object.keys(s.mini).forEach(function (k) { add(bestOpt(s.mini[k])); });
    if (s.finish) add(s.finish.fx);
  });
  return t;
}

/* ---------- cabeçalho ---------- */
p('# 📜 Roteiro do jogo — Conexão para Todos');
p();
p('> Documento de referência com **tudo o que existe no jogo**: história, personagens, mapa, regras, status e o passo a passo completo de cada missão (diálogos, escolhas, atividades e consequências).');
p('> As seções de missões são geradas automaticamente a partir dos dados do jogo (`node tools/gerar-roteiro.js`), então refletem fielmente o que está implementado.');
p();
p('## Índice');
p();
['1. Visão geral', '2. História', '3. Equipe de agentes (marcadores)', '4. Moradores de Conecta', '5. Mapa e locais', '6. Placas e pontos de interesse', '7. Regras: status, pontos e Fundo da Cidade', '8. Como as escolhas funcionam', '9. Modo dupla (co-op local) e controle', '10. Roteiro das 8 missões', '11. Final e vitória', '12. Apêndice: quadro de efeitos por missão'].forEach(function (x) { p('- ' + x); });
p();

/* ---------- 1. visão geral ---------- */
p('## 1. Visão geral');
p();
p('**Conexão para Todos** é um jogo educativo em pixel art, de exploração 2D, sobre **inclusão digital, acessibilidade e exclusão tecnológica**. O jogador (ou a dupla) explora a cidade fictícia de **Conecta**, conversa com moradores, descobre barreiras e escolhe como resolvê-las, melhorando três **status coletivos** da cidade.');
p();
p('| Item | Descrição |');
p('|---|---|');
p('| Gênero | Exploração 2D com missões, escolhas com consequência e cooperação |');
p('| Jogadores | 1 jogador, ou **2 jogadores no mesmo teclado** (co-op local) |');
p('| Duração estimada | cerca de 30 a 45 minutos lendo com calma (' + M.list.length + ' missões) |');
p('| Objetivo | Concluir as **' + M.list.length + ' missões** e levar **Acesso, Acessibilidade e Conhecimento a pelo menos ' + C.GOAL + '** |');
p('| Derrota | **Não existe.** Escolhas ruins mostram a consequência e permitem tentar de novo |');
p('| Tema acadêmico | *Analfabetismo Digital, Acessibilidade e Exclusão Tecnológica: Desafios e Caminhos para a Cidadania na Era Digital* (Equipe 1 · UFC Russas) |');
p();
p('### Estrutura pedida no trabalho');
p();
p('| Elemento | No jogo |');
p('|---|---|');
p('| **Espaço = Exploração** | Mapa de Conecta com ' + W.AREAS.length + ' locais que são **descobertos** ao chegar perto, placas de curiosidade, minimapa e seta de objetivo |');
p('| **Atores = Marcadores** | Agentes **Márcio ● círculo**, **Miguel ■ quadrado** e **Yuri ▲ triângulo**; moradores com balões `!` `…` `✔` |');
p('| **Itens = Status** | Acesso, Acessibilidade, Conhecimento e Pontos de Comunidade, com efeitos reais no jogo |');
p('| **Desafios = Cooperação** | ' + M.list.length + ' missões; a última exige os **três agentes** (e, em dupla, os dois jogadores combinando as tarefas) |');
p();

/* ---------- 2. história ---------- */
p('## 2. História');
p();
p('**Tela 1 — Bem-vindo(a) a Conecta**');
p();
p('> Conecta é uma cidade pequena e acolhedora. Mas muita coisa por lá só funciona pelo celular ou pela internet: marcar consulta, estudar, falar com a Prefeitura, vender pão.');
p('> Quem não tem aparelho, sinal ou prática não está “atrasado”: está sem as oportunidades certas.');
p();
p('**Tela 2 — Sua equipe: Agentes de Inclusão Digital**');
p();
p('> Você lidera **Márcio**, **Miguel** e **Yuri**. Juntos, vão conversar com os moradores, achar as barreiras e criar soluções **com** a comunidade — nunca **no lugar** dela.');
p('> Cada pequena ação faz diferença. Vamos começar?');
p();
p('Em seguida vem o **tutorial** de 5 telas (explorar, conversar, status, objetivo e controle), que pode ser pulado. No começo da partida o jogo aponta o primeiro objetivo com uma **seta amarela**.');
p();

/* ---------- 3. agentes ---------- */
p('## 3. Equipe de agentes (marcadores)');
p();
p('![Os agentes Márcio, Miguel e Yuri](screenshots/00-equipe.png)');
p();
p('**Márcio** tem pele negra e cabelo cacheado curto; **Miguel** tem traços indígenas, cabelo liso com franja, colar de miçangas e uma faixa de grafismo na camisa; **Yuri** é pardo, de cabelo ondulado e óculos. Os três vestem o crachá da equipe.');
p();
p('| Agente | Marcador | Especialidade | Status que representa | Posto do Portal Conecta+ |');
p('|---|---|---|---|---|');
AG.forEach(function (a) {
  const st = W.STATIONS.filter(function (s) { return s.agent === a.id; })[0];
  p('| **' + a.name + '** | ' + { 'círculo': '●', 'quadrado': '■', 'triângulo': '▲' }[a.shape] + ' ' + a.shape + ' (número ' + a.letter + ') | ' + a.about + ' | ' + N[a.stat] + ' | ' + st.label.replace('Posto de teste: ', '') + ' |');
});
p();
p('- O jogador controla um agente por vez e os outros **seguem em fila**; a troca é feita com `Tab`/`Q`/`1`/`2`/`3` ou clicando no retrato.');
p('- O marcador (forma + número, o mesmo da tecla de troca) aparece sobre o agente e no minimapa, então **nunca depende só da cor**.');
p();

/* ---------- 4. moradores ---------- */
p('## 4. Moradores de Conecta');
p();
p('| Morador | Quem é | Onde fica | Missão |');
p('|---|---|---|---|');
M.list.forEach(function (m) {
  const n = W.NPCS[m.npc];
  p('| **' + n.name + '** | ' + n.role + ' | ' + area(n.area) + ' | ' + (M.list.indexOf(m) + 1) + '. ' + m.title + ' |');
});
p();
p('Balões sobre os moradores: `!` missão disponível · `…` em andamento · `✔` concluída · 🔒 bloqueada (só o Portal Conecta+). O balão só aparece depois de **descobrir** o local.');
p();

/* ---------- 5. mapa ---------- */
p('## 5. Mapa e locais');
p();
p('Mapa de **' + W.W + '×' + W.H + ' tiles**. Um local é **descoberto** ao entrar perto dele: aparece o aviso “Local descoberto”, o nome passa a ser exibido no mapa e o morador ganha o balão de missão. Antes disso o nome aparece como `? ? ?`.');
p();
p('| Local | O que acontece lá | Missão |');
p('|---|---|---|');
const bnote = { praca: 'Fonte, bancos e **poste de Wi-Fi comunitário**. Ponto de partida do jogo.', escola: 'Escola Municipal, onde estuda Thiago.', casaA: 'Casa do Seu Zeca, que precisa de uma conta gov.br e de apoio para não cair em golpes.', casaB: 'Casa da Sofia, que representa a associação de surdos e quer uma reunião acessível.', posto: 'Posto de Saúde, onde Dona Marta precisa de ajuda.', prefeitura: 'Prefeitura, com o atendente Beto, a Prefeita Helena e os **3 postos de teste** do Portal.', biblioteca: 'Biblioteca Comunitária, com Joana e **3 computadores públicos** no pátio.', centro: 'Centro Comunitário, com Tia Lúcia e o **Quadro do Fundo da Cidade**.', padaria: 'Padaria Pão & Prosa, de Dona Neide.' };
W.AREAS.forEach(function (a) {
  const ms = M.list.filter(function (m) { return m.area === a.id; });
  p('| **' + a.name + '** | ' + bnote[a.id] + ' | ' + (ms.length ? ms.map(function (m) { return (M.list.indexOf(m) + 1) + '. ' + m.title; }).join('<br>') : '—') + ' |');
});
p();
p('O mapa é cercado por árvores. O **minimapa** (canto da tela) mostra locais descobertos, os agentes (com suas formas) e o objetivo atual. Uma **seta na borda da tela** aponta o objetivo quando ele está fora de vista.');
p();

/* ---------- 6. placas ---------- */
p('## 6. Placas e pontos de interesse');
p();
p('Cada placa lida pela primeira vez dá **+1 Ponto de Comunidade** (“Curiosidade descoberta”). São ' + W.SIGNS.length + ' placas:');
p();
p('| Placa | Texto |');
p('|---|---|');
W.SIGNS.forEach(function (s) { p('| **' + s.title + '** | ' + esc(s.text) + ' |'); });
p();
p('Outros pontos interativos:');
p();
p('- **Poste de Wi-Fi comunitário** (Praça): o texto muda conforme o Acesso da cidade; com Acesso ≥ 50 ele passa a emitir ondas de sinal.');
p('- **Quadro do Fundo da Cidade** (Centro Comunitário): investir pontos e chamar mutirões (veja a seção 7).');
p('- **Computadores e postos de teste**: usados nas missões 7 e 8; fora das missões mostram apenas uma mensagem informativa.');
p();

/* ---------- 7. regras ---------- */
p('## 7. Regras: status, pontos e Fundo da Cidade');
p();
p('### Status coletivos (0 a 100)');
p();
p('| Status | Valor inicial | O que representa | Efeito real no jogo |');
p('|---|---|---|---|');
p('| **Acesso** | ' + START[0] + ' | Aparelhos, internet e serviços ao alcance de todos | +1 Ponto de Comunidade extra por missão a cada 25 de Acesso; com **≥ 50**, os postes de Wi-Fi se iluminam |');
p('| **Acessibilidade** | ' + START[1] + ' | Quanto lugares e serviços atendem pessoas com diferentes necessidades | Melhorias do Fundo ficam mais baratas (−1 com **≥ 50**, −2 com **≥ 75**); com ≥ 50 surge **piso tátil** e com ≥ 75 **rampas** nas entradas |');
p('| **Conhecimento** | ' + START[2] + ' | Capacidade da comunidade de usar a tecnologia com autonomia e segurança | A partir de **' + C.HINT + '**, o Yuri oferece **dicas** nas escolhas e atividades |');
p();
p('A **meta é ' + C.GOAL + '** em cada um (marcada com um traço na barra e com ✔ quando atingida). Tocar/clicar numa barra abre o painel de status com explicações, efeitos e o diário das últimas mudanças.');
p();
p('### Pontos de Comunidade');
p();
p('- Início: **' + START_PTS + ' pontos**.');
p('- Cada missão concluída: **+3** (mais o bônus de Acesso).');
p('- Cada placa lida pela primeira vez: **+1**.');
p('- Finalizar o Portal Conecta+ em equipe: **+5**.');
p();
p('### Fundo da Cidade e Mutirão (Centro Comunitário)');
p();
p('| Ação | Custo | Efeito | Limite |');
p('|---|---|---|---|');
p('| Instalar mais pontos de Wi-Fi e emprestar aparelhos | 4 pts (−1/−2 com Acessibilidade alta, mínimo 2) | Acesso +' + C.FGAIN + ' | ' + C.FMAX + ' vezes |');
p('| Construir rampas, piso tátil e sinalização | idem | Acessibilidade +' + C.FGAIN + ' | ' + C.FMAX + ' vezes |');
p('| Abrir mais turmas de oficinas digitais | idem | Conhecimento +' + C.FGAIN + ' | ' + C.FMAX + ' vezes |');
p('| **Mutirão de vizinhos (grátis)** | 0 | +' + C.MUT + ' no status escolhido | 1 + número de missões concluídas (nunca deixa o jogo sem saída) |');
p();

/* ---------- 8. escolhas ---------- */
p('## 8. Como as escolhas funcionam');
p();
p('Cada decisão tem **três níveis**, sempre explicados no jogo:');
p();
p('| Nível | O que acontece |');
p('|---|---|');
p('| ✅ **Ótima escolha** | Maior ganho nos status; a missão segue |');
p('| 🟡 **Funciona, mas dá para melhorar** | Ganho menor, com explicação do que faltou; a missão segue |');
p('| ❌ **Ainda não é o melhor caminho** | Pequena perda; o jogo explica a consequência e o jogador **tenta outra opção** (a opção já tentada fica marcada) |');
p();
p('**Sair no meio:** em qualquer conversa ou atividade o jogador pode apertar `Esc` (ou clicar em **✕ Sair**). A missão continua de onde parou: as etapas já decididas ficam salvas e **não dá para repetir um ganho de status**; a etapa em andamento recomeça na próxima visita. Se o jogador sair depois de concluir o último posto da missão cooperativa, o bônus de equipe é concedido mesmo assim (uma única vez).');
p();
p('Além das escolhas, há atividades: **ordenar passos**, **achar barreiras/golpes** (com opção de tentar de novo), **planejar com orçamento**, **coletar itens** pelo mapa e **configurar postos de trabalho**.');
p();
p('Ao concluir cada missão o jogo mostra **estrelas (1 a 3)** conforme a qualidade das escolhas, as mudanças nos status, os pontos ganhos e um quadro **“Você sabia?”** com o aprendizado.');
p();

/* ---------- 9. dupla ---------- */
p('## 9. Modo dupla (co-op local) e controle');
p();
p('| Ação | Jogador 1 | Jogador 2 |');
p('|---|---|---|');
p('| Andar | `W` `A` `S` `D` | setas |');
p('| Interagir | `E` ou `Espaço` | `Enter` |');
p('| Trocar de agente | `Q` (ou `1` `2` `3`) | `Shift` direito (ou `Num 1` `Num 2` `Num 3`) |');
p();
p('**Controle (gamepad):** reconhecido sozinho (Xbox, PlayStation, Switch Pro e similares); dá para jogar do menu inicial até a vitória sem teclado.');
p();
p('| Ação | Botão |');
p('|---|---|');
p('| Andar | analógico esquerdo ou direcional |');
p('| Interagir / confirmar | **A** (✕ no PlayStation) |');
p('| Sair ou voltar | **B** (○) |');
p('| Trocar de agente | **Y** ou **RB** = próximo · **LB** = anterior (percorre os 3) |');
p('| Missões | **X** (□) ou **Select** |');
p('| Pausa | **Start** |');
p('| Respostas e menus | direcional ou analógico + **A** |');
p();
p('**Se o controle não funcionar:** na tela inicial (ou na pausa) o botão **🎮 Controle** abre um painel que mostra, ao vivo, o que o navegador detecta (nome do controle, botões, eixos) e um assistente para configurar os botões de controles com mapeamento diferente. Dispositivos "fantasmas" (como o sensor de movimento do controle de PlayStation) são ignorados.');
p();
p('Em dupla: com **2 controles**, o 1º é do Jogador 1 e o 2º do Jogador 2; com **1 controle**, ele fica com o **Jogador 2**. Se os controles ficarem trocados, o botão **Trocar J1 ↔ J2** do painel 🎮 Controle inverte. A dica de interação mostra **A** quando o jogador está usando o controle. É possível desligar o controle em **Opções**.');
p();
p('- Cada jogador controla **um agente** ao mesmo tempo; o terceiro agente acompanha o Jogador 1.');
p('- Qualquer um pode conversar, pegar itens e ler placas; **quem interagiu fala pelo seu agente**, e os dois podem escolher as respostas.');
p('- A câmera acompanha o meio da dupla e há um **“elástico”**: os dois não conseguem se afastar além da tela um do outro.');
p('- Nos retratos da equipe: clique = Jogador 1, `Shift`+clique = Jogador 2. Se um pega o agente do outro, os dois **trocam de agente**.');
p('- Na missão final, cada posto exige um agente diferente: a dupla precisa **combinar quem vai a cada posto**.');
p();

/* ---------- 10. missões ---------- */
p('## 10. Roteiro das ' + M.list.length + ' missões');
p();
p('Ordem **livre**, exceto a missão ' + M.list.length + ' (**Portal Conecta+**), que só abre depois de **' + C.PORTAL + ' missões concluídas**. Ordem sugerida: Praça → Posto de Saúde → Prefeitura (Beto) → Escola → Centro Comunitário → Padaria → Biblioteca → Casa do Seu Zeca → Casa da Sofia → Prefeitura (Helena).');
p();
p('**Legenda dos passos:** 💬 conversa · 🔀 escolha · 🔢 ordenar · 🔎 achar problemas · 🔗 relacionar · 🧩 planejar · 🧭 coletar · 🖥️ postos de trabalho');
p();

M.list.forEach(function (m, idx) {
  const n = W.NPCS[m.npc];
  p('---');
  p();
  p('### Missão ' + (idx + 1) + ' — ' + m.title);
  p();
  p('| | |');
  p('|---|---|');
  p('| **Local** | ' + m.place + ' |');
  p('| **Quem pede ajuda** | ' + n.name + ' (' + n.role + ') |');
  p('| **Situação** | ' + esc(m.blurb) + ' |');
  p('| **Libera** | ' + (m.id === 'portal' ? 'Depois de ' + C.PORTAL + ' missões concluídas' : 'Ao descobrir o local') + ' |');
  p();
  p('**O que ensina:** ' + m.learn);
  p();
  m.steps.forEach(function (s, i) {
    p('#### Passo ' + (i + 1));
    p();
    if (s.t === 'talk') {
      p('💬 **Conversa**');
      p();
      s.lines.forEach(function (l) { p('- **' + who(l[0]) + ':** ' + l[1]); });
      p();
    } else if (s.t === 'choice') {
      p('🔀 **Escolha** — **' + who(s.who) + ':** “' + s.prompt + '”');
      p();
      if (s.hint) { p('*Dica do Yuri (com Conhecimento ≥ ' + C.HINT + '):* ' + s.hint); p(); }
      choiceTable(s);
    } else if (s.t === 'order') {
      p('🔢 **Ordenar passos — “' + s.title + '”** — ' + s.prompt);
      p();
      s.items.forEach(function (t, k) { p((k + 1) + '. ' + t); });
      p();
      p('*Dica:* ' + s.hint);
      p();
      p('**Ao concluir:** ' + fx(s.fx) + '. *“' + s.done + '”*');
      p();
    } else if (s.t === 'spot') {
      p('🔎 **Achar problemas — “' + s.title + '”** (' + (s.kind === 'phone' ? 'tela de celular' : 'tela de site') + ') — ' + s.prompt);
      p();
      p('| Trecho da tela | É problema? | Explicação |'); p('|---|---|---|');
      s.elements.forEach(function (e) { p('| ' + esc(strip(e.html)) + ' | ' + (e.flaw ? '🚩 Sim' : '✅ Não') + ' | ' + esc(e.why) + ' |'); });
      p();
      const nf = s.elements.filter(function (e) { return e.flaw; }).length;
      p('Há **' + nf + ' problemas**. O jogador marca, clica em **Verificar**, vê o resultado e pode **tentar de novo** ou seguir. Ganho proporcional ao que achou (máximo **' + fx(s.fx) + '**). *“' + s.after + '”*');
      p();
      if (s.hint) { p('*Dica:* ' + s.hint); p(); }
    } else if (s.t === 'match') {
      p('🔗 **Relacionar — “' + s.title + '”** — ' + s.prompt);
      p();
      p('| Pessoa | Recurso que ajuda |'); p('|---|---|');
      s.pairs.forEach(function (pr) { p('| ' + esc(pr[0]) + ' | ' + esc(pr[1]) + ' |'); });
      p();
      p('Os recursos aparecem **embaralhados**; um par errado só faz o jogo pedir que a pessoa tente outro recurso. **Ao concluir:** ' + fx(s.fx) + '. *“' + s.done + '”*');
      p();
      if (s.hint) { p('*Dica:* ' + s.hint); p(); }
    } else if (s.t === 'plan') {
      p('🧩 **Planejar — “' + s.title + '”** — ' + s.prompt);
      p();
      p('Planejamento disponível: **' + s.budget + '** · mínimo de **' + s.min + '** ações.');
      p();
      p('| Ação | Custo | Efeito | Observação do jogo |'); p('|---|---|---|---|');
      s.options.forEach(function (o) { p('| ' + esc(o.text) + ' | ' + o.cost + ' | ' + fx(o.fx) + ' | ' + esc(o.note) + ' |'); });
      p();
      (s.synergy || []).forEach(function (y) { p('★ **Sinergia** (' + y.need.map(function (id) { return s.options.filter(function (o) { return o.id === id; })[0].text.split(',')[0]; }).join(' + ') + '): ' + fx(y.fx) + ' — ' + y.text); p(); });
      const b = bestPlan(s);
      p('**Melhor combinação possível:** ' + b.sel.map(function (o) { return o.text; }).join('; ') + ' → ' + fx(b.t) + '.');
      p();
      if (s.hint) { p('*Dica:* ' + s.hint); p(); }
    } else if (s.t === 'collect') {
      p('🧭 **Explorar e coletar** — objetivo: *' + s.objective + '*');
      p();
      s.intro.forEach(function (l) { p('- **' + who(l[0]) + ':** ' + l[1]); });
      p();
      p('| Item | Onde fica | Efeito | Mensagem |'); p('|---|---|---|---|');
      s.ids.forEach(function (id) { p('| ' + W.ITEMS.filter(function (i) { return i.id === id; })[0].label + ' | ' + LOC[id] + ' | ' + fx(s.itemFx[id].fx) + ' | ' + esc(s.itemFx[id].msg) + ' |'); });
      p();
      p('Os itens **brilham** no mapa só enquanto a missão está nessa etapa. Depois de pegar todos, o jogador **volta a falar com ' + n.name + '**. Se voltar antes, ' + n.name + ' lembra: *“' + s.remind + '”*');
      p();
    } else if (s.t === 'stations') {
      p('🖥️ **Postos de trabalho** — objetivo: *' + s.objective + '*' + (s.coop ? ' · **cooperativo**' : ''));
      p();
      p('*Lembrete de ' + n.name + ':* “' + s.remind + '”');
      p();
      s.ids.forEach(function (id) {
        const st = W.STATIONS.filter(function (x) { return x.id === id; })[0], c = s.mini[id];
        const ag = st.agent ? ' — exige **' + who(st.agent) + '**' : '';
        p('**' + st.label + ' (' + LOC[id] + ')' + ag + '**' + (st.who ? ' — para ' + st.who : '') + ': **' + who(c.who) + ':** “' + c.prompt + '”');
        p();
        if (c.hint) { p('*Dica:* ' + c.hint); p(); }
        choiceTable(c);
      });
      if (s.coop) { p('Se o jogador usar um posto com o **agente errado**, o jogo explica qual agente é necessário e como trocar (`Q`/`Shift` direito/`1` `2` `3`).'); p(); }
      if (s.finish) { p('**Ao concluir todos:** ' + fx(s.finish.fx) + (s.finish.pts ? ' e **+' + s.finish.pts + ' Pontos de Comunidade**' : '') + '. *“' + s.finish.text + '”*'); p(); }
    }
  });
  p('**Fecho da missão**');
  p();
  m.outro.forEach(function (l) { p('- **' + who(l[0]) + ':** ' + l[1]); });
  p();
  p('➡️ Resumo da missão: **+3 Pontos de Comunidade** (+ bônus de Acesso), estrelas de 1 a 3 e o quadro “Você sabia?”:');
  p();
  p('> ' + m.learn);
  p();
  p('Quando o morador já foi ajudado, ele repete uma frase de agradecimento: *“' + m.idle + '”*');
  p();
});

/* ---------- 11. final ---------- */
p('---');
p();
p('## 11. Final e vitória');
p();
p('**Condição de vitória:** as **' + M.list.length + ' missões concluídas** e **Acesso, Acessibilidade e Conhecimento ≥ ' + C.GOAL + '**.');
p();
p('- Se as missões terminarem com algum status abaixo da meta, o jogo avisa (“Falta levar os três status a ' + C.GOAL + '”) e o objetivo passa a apontar para o **Quadro do Fundo da Cidade**.');
p('- A tela de vitória, **“Conecta agora é para todos!”**, mostra a tabela **Início × Agora × Mudança** de cada status, os Pontos de Comunidade, as curiosidades descobertas e a lista de missões concluídas.');
p('- Mensagem final:');
p();
p('> **O que a cidade aprendeu** — Exclusão digital não é falta de capacidade das pessoas: é falta de acesso, de interfaces acessíveis e de apoio para aprender. Inclusão digital é um caminho para a autonomia e a cidadania, e só funciona quando **comunidade, instituições e desenvolvedores** constroem juntos — oferecendo mais de um caminho, ensinando sem humilhar e testando com quem realmente vai usar.');
p();
p('Depois da vitória é possível **continuar explorando**, **jogar novamente** ou voltar ao **menu inicial**.');
p();

/* ---------- 12. apêndice ---------- */
p('## 12. Apêndice: quadro de efeitos por missão');
p();
p('Ganho máximo de status em cada missão (jogando sempre a melhor opção). Valores acima de 100 são limitados a 100 no jogo.');
p();
p('| Missão | Acesso | Acessibilidade | Conhecimento |');
p('|---|---:|---:|---:|');
const tot = { ac: 0, ab: 0, co: 0 };
M.list.forEach(function (m, i) { const t = bestTotals(m); for (const k in t) tot[k] += t[k]; p('| ' + (i + 1) + '. ' + m.title + ' | +' + t.ac + ' | +' + t.ab + ' | +' + t.co + ' |'); });
p('| **Total possível** | **+' + tot.ac + '** | **+' + tot.ab + '** | **+' + tot.co + '** |');
p('| Valor inicial | ' + START[0] + ' | ' + START[1] + ' | ' + START[2] + ' |');
p();
p('Com a meta em **' + C.GOAL + '**, jogar bem deixa uma folga confortável; mesmo escolhendo só opções intermediárias a meta continua alcançável com o Fundo da Cidade e os mutirões.');
p();

const dest = path.join(root, 'docs', 'ROTEIRO.md');
fs.mkdirSync(path.dirname(dest), { recursive: true });
fs.writeFileSync(dest, out.join('\n'), 'utf8');
console.log('Roteiro gerado em ' + path.relative(process.cwd(), dest) + ' (' + out.length + ' linhas)');
