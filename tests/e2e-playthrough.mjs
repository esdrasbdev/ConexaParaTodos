/* Teste ponta a ponta: joga o jogo inteiro pela interface real, em um navegador headless.
 * Requisitos: Node 18+ e `npm i puppeteer` (ou puppeteer-core + CHROME_PATH). Uso: node tests/e2e-playthrough.mjs */
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';

let puppeteer;
try { puppeteer = (await import('puppeteer')).default; } catch { puppeteer = (await import('puppeteer-core')).default; }
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const URL = pathToFileURL(path.join(root, 'index.html')).href;
const extra = (process.env.CHROME_ARGS || '').split(' ').filter(Boolean);

let failures = 0;
const check = (cond, msg) => { console.log((cond ? '  ✔ ' : '  ✖ ') + msg); if (!cond) failures++; };
const wait = ms => new Promise(r => setTimeout(r, ms));

// "jogador automático" que roda dentro da página, clicando nos botões reais
const AUTO = `
window.__auto = (function(){
  const norm = s => (s||'').replace(/\\s+/g,' ').trim();
  const policy = { tier: 'best' };
  function allSteps(){ const out=[]; CPT.Missions.list.forEach(m=>m.steps.forEach(s=>{out.push(s); if(s.mini) Object.values(s.mini).forEach(c=>out.push(Object.assign({t:'choice'},c)));})); return out; }
  function handleDialogue(){
    const text = norm(document.querySelector('#dlg-text').textContent);
    const choices = document.querySelectorAll('#dlg-actions .choices .btn.choice');
    if (choices.length){
      const c = allSteps().find(s=>s.t==='choice' && norm(s.prompt)===norm(text)); if(!c) throw new Error('escolha não encontrada: '+text);
      const bestIdx = c.options.findIndex(o=>o.tier==='best');
      let idx = c.options.findIndex(o=>o.tier===policy.tier); if (idx<0) idx = bestIdx;
      if (choices[idx].classList.contains('tried')) idx = bestIdx;
      choices[idx].click(); return;
    }
    const b = document.querySelector('#dlg-actions .btn.primary'); if (b) b.click();
  }
  function handleModal(m){
    const card = m.card;
    if (card.querySelector('#o-pool')){
      const title = norm(card.querySelector('.act-head h2').textContent);
      const st = allSteps().find(s=>s.t==='order' && norm(s.title)===title);
      const done = card.querySelector('#o-done'); if (!done.disabled){ done.click(); return; }
      const next = card.querySelectorAll('#o-seq li').length;
      Array.from(card.querySelectorAll('#o-pool .btn.step')).find(b=>norm(b.textContent)===norm(st.items[next])).click(); return;
    }
    if (card.querySelector('.match')){
      const title = norm(card.querySelector('.act-head h2').textContent);
      const st = allSteps().find(s=>s.t==='match' && norm(s.title)===title);
      const done = card.querySelector('#m-done'); if (!done.disabled){ done.click(); return; }
      for (let i=0;i<st.pairs.length;i++){ const nb = card.querySelector('[data-n="'+i+'"]'); if(!nb.classList.contains('matched')){ nb.click(); card.querySelector('[data-r="'+i+'"]').click(); return; } }
    }
    if (card.querySelector('.mock')){
      const title = norm(card.querySelector('.act-head h2').textContent);
      const st = allSteps().find(s=>s.t==='spot' && norm(s.title)===title);
      if (!card.dataset.marked && card.querySelector('#s-verify')){
        card.dataset.marked='1'; st.elements.filter(e=>e.flaw).forEach(e=>card.querySelector('.spot-el[data-id="'+e.id+'"]').click());
        card.querySelector('#s-verify').click(); return;
      }
      Array.from(card.querySelectorAll('.actions .btn.primary')).pop().click(); return;
    }
    if (card.querySelector('.plan')){
      if (!card.dataset.sel){ card.dataset.sel='1';
        ['rampa','monitores','noite','apostila'].forEach(id=>{const o=card.querySelector('.plan-opt[data-id="'+id+'"]'); if(!o.classList.contains('on')) o.click();});
        card.querySelector('#p-ok').click(); return; }
      Array.from(card.querySelectorAll('.actions .btn.primary')).pop().click(); return;
    }
    const b = card.querySelector('#mc-ok') || card.querySelector('#v-cont') || card.querySelector('.btn.primary'); if (b) b.click();
  }
  return {
    policy,
    step(){ const m=CPT.Modal.top(), d=document.querySelector('#dialogue:not(.hidden)'); if(m){handleModal(m);return 'modal';} if(d){handleDialogue();return 'dlg';} return 'idle'; },
    tpNpc(id){ const n=CPT.World.NPCS[id], a=CPT.Player.leader(); a.x=n.tx*16+8; a.y=(n.ty+1)*16+12; a.dir='up'; CPT.Player.rebuildTrail(); },
    tpTile(tx,ty){ const a=CPT.Player.leader(); a.x=tx*16+8; a.y=ty*16+12; a.dir='up'; CPT.Player.rebuildTrail(); }
  };
})();`;

const browser = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox', '--allow-file-access-from-files', ...extra] });
const page = await browser.newPage();
// controle simulado: o teste define window.__pads (lista de controles) e o jogo lê pela Gamepad API
await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__pads || [] }); });
await page.setViewport({ width: 1280, height: 720 });
const errs = [];
page.on('pageerror', e => errs.push(e.message));
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });

async function drive(maxMs = 120000) {
  const t0 = Date.now(); let idle = 0;
  while (Date.now() - t0 < maxMs) {
    await wait(40);
    const r = await page.evaluate(() => __auto.step());
    if (r === 'idle') { if (++idle > 8) return; } else idle = 0;
  }
  throw new Error('drive: tempo esgotado');
}
const state = () => page.evaluate(() => ({ s: { ...CPT.Game.state.stats }, pts: CPT.Game.state.pts, done: CPT.Game.doneCount(), won: CPT.Game.state.won }));
async function talk(id) { await page.evaluate(i => __auto.tpNpc(i), id); await wait(100); await page.keyboard.press('e'); await drive(); }
async function useStation(id) { await page.evaluate(i => { const o = CPT.World.STATIONS.find(x => x.id === i); __auto.tpTile(o.tx, o.ty + 1); }, id); await wait(100); await page.keyboard.press('e'); await drive(); }

console.log('1. Início e tutorial');
await page.goto(URL); await wait(500); await page.evaluate(AUTO);
check(await page.evaluate(() => !document.querySelector('#screen-title').classList.contains('hidden')), 'tela de título visível');
await page.click('#btn-play'); await wait(300);
await page.evaluate(async () => { for (let i = 0; i < 12 && CPT.Modal.top(); i++) { const c = CPT.Modal.top().card; (c.querySelector('#pg-skip') || c.querySelector('#pg-next')).click(); await new Promise(r => setTimeout(r, 60)); } });
let st = await state();
check(st.s.ac === 40 && st.s.ab === 30 && st.s.co === 35 && st.pts === 5, 'status iniciais 40/30/35 e 5 pontos');

console.log('2. Portal bloqueado no começo');
await talk('helena');
check(await page.evaluate(() => CPT.Game.state.missions.portal.status === 'new'), 'Prefeita não inicia a missão no começo do jogo (precisa de 7 missões concluídas)');

console.log('2b. Sair no meio de conversas e atividades (Esc e botão Sair)');
const dlgVisible = () => page.evaluate(() => !document.querySelector('#dialogue').classList.contains('hidden'));
await page.evaluate(i => __auto.tpNpc(i), 'beto'); await wait(100); await page.keyboard.press('e'); await wait(250);
check(await dlgVisible(), 'a conversa com o Beto abriu');
check(await page.evaluate(() => { const b = document.querySelector('#dlg-exit'); return !!b && b.offsetParent !== null; }), 'botão "✕ Sair" visível na conversa');
await page.keyboard.press('Escape'); await wait(250);
let ex = await page.evaluate(() => ({ hidden: document.querySelector('#dialogue').classList.contains('hidden'), busy: CPT.Game.busy, modals: CPT.Modal.stack.length }));
check(ex.hidden && ex.busy === 0 && ex.modals === 0, 'Esc fecha a conversa e devolve o controle (o jogo não trava)');
const xBefore = await page.evaluate(() => CPT.Player.leader().x);
await page.keyboard.down('KeyD'); await wait(300); await page.keyboard.up('KeyD');
check(await page.evaluate(b => CPT.Player.leader().x > b + 5, xBefore), 'o jogador volta a andar depois de sair');
await page.evaluate(i => __auto.tpNpc(i), 'beto'); await wait(100); await page.keyboard.press('e'); await wait(250);
await page.evaluate(() => document.querySelector('#dlg-actions .btn.primary').click()); await wait(150);
await page.evaluate(() => document.querySelector('#dlg-actions .btn.primary').click()); await wait(350);
check(await page.evaluate(() => !!document.querySelector('.mock')), 'a atividade "Barreiras no portal" abriu');
check(await page.evaluate(() => !!document.querySelector('.act-exit')), 'a atividade tem o botão "✕ Sair"');
await page.evaluate(() => document.querySelector('.act-exit').click()); await wait(300);
ex = await page.evaluate(() => ({ modals: CPT.Modal.stack.length, busy: CPT.Game.busy, dlg: !document.querySelector('#dialogue').classList.contains('hidden') }));
check(ex.modals === 0 && ex.busy === 0 && !ex.dlg, 'botão ✕ Sair fecha a atividade sem travar');
await page.evaluate(i => __auto.tpNpc(i), 'beto'); await wait(100); await page.keyboard.press('e'); await wait(350);
check(await page.evaluate(() => !!document.querySelector('.mock')), 'ao voltar, a missão retoma direto na atividade (sem repetir a conversa)');
await page.keyboard.press('Escape'); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 0 && CPT.Game.busy === 0), 'Esc também sai da atividade');
await page.keyboard.press('Escape'); await wait(250);
check(await page.evaluate(() => CPT.Modal.stack.length === 1 && /pausado/.test(CPT.Modal.top().card.textContent)), 'Esc fora de conversas continua abrindo o menu de pausa');
await page.keyboard.press('Escape'); await wait(250);
check(await page.evaluate(() => CPT.Modal.stack.length === 0), 'Esc fecha o menu de pausa');

console.log('3. Escolha ruim ensina e permite tentar de novo (missão da Dona Marta)');
await page.evaluate(() => { __auto.policy.tier = 'bad'; });
const before = await state();
await talk('marta');
await page.evaluate(() => { __auto.policy.tier = 'best'; });
st = await state();
check(await page.evaluate(() => CPT.Game.state.missions.saude.status === 'done'), 'missão concluída mesmo após errar');
check(st.s.co > before.s.co && st.pts > before.pts, 'Conhecimento e pontos subiram no fim');
check(await page.evaluate(() => CPT.Game.state.log.some(l => /Consulta sem vergonha/.test(l))), 'diário registrou as mudanças');

console.log('4. Demais missões');
for (const id of ['raimundo', 'beto', 'lucia', 'neide']) await talk(id);
check((await state()).done === 5, '5 missões concluídas');
await talk('thiago');
for (const it of ['tablet', 'wifi', 'caderno']) {
  await page.evaluate(i => { const o = CPT.World.ITEMS.find(x => x.id === i); __auto.tpTile(o.tx, o.ty + 1); }, it);
  await wait(100); await page.keyboard.press('e'); await wait(100);
}
check(await page.evaluate(() => Object.keys(CPT.Game.state.missions.estudo.prog).length === 3), 'três itens coletados explorando o mapa');
await talk('thiago');
check((await state()).done === 6, '6 missões concluídas');
await talk('helena');
check(await page.evaluate(() => CPT.Game.state.missions.portal.status === 'new'), 'o Portal ainda está bloqueado com 6 missões (precisa de 7)');
await talk('joana');
for (const id of ['pc1', 'pc2', 'pc3']) await useStation(id);
await talk('joana');
check((await state()).done === 7, '7 missões concluídas: o Portal Conecta+ libera');
console.log('4b. As duas missões novas');
await talk('zeca');
check(await page.evaluate(() => CPT.Game.state.missions.gov.status === 'done'), 'missão 8 concluída: Benefício sem atravessador (Seu Zeca)');
await talk('sofia');
check(await page.evaluate(() => CPT.Game.state.missions.libras.status === 'done'), 'missão 9 concluída: Reunião para todos (Sofia, com atividade de relacionar)');
check((await state()).done === 9, '9 missões concluídas antes do Portal');

console.log('5. Cooperação: posto exige o agente certo');
await talk('helena');
await page.evaluate(() => { CPT.Player.switchTo(0); });
await useStation('t2');
check(await page.evaluate(() => !CPT.Game.state.missions.portal.prog.t2), 'Márcio não consegue usar o posto do Miguel');
for (const [id, key] of [['t1', '1'], ['t2', '2'], ['t3', '3']]) { await page.keyboard.press(key); await useStation(id); }
check(await page.evaluate(() => Object.keys(CPT.Game.state.missions.portal.prog).length === 3), 'três postos concluídos com três agentes');
await talk('helena');
await wait(900);
st = await state();
check(st.done === 10, '10 missões concluídas');
check(st.s.ac >= 60 && st.s.ab >= 60 && st.s.co >= 60, 'status finais ≥ 60: ' + JSON.stringify(st.s));
check(await page.evaluate(() => !!document.querySelector('.victory')) && st.won, 'tela de vitória exibida');

console.log('6. Celular: sem rolagem horizontal');
await page.setViewport({ width: 390, height: 844 }); await wait(500);
check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), 'página cabe na largura do celular');

console.log('7. Co-op local: J1 (WASD) e J2 (setas) no mesmo teclado');
await page.setViewport({ width: 1280, height: 720 });
await page.goto(URL); await wait(500); await page.evaluate(AUTO);
await page.click('#btn-play2'); await wait(300);
await page.evaluate(async () => { for (let i = 0; i < 12 && CPT.Modal.top(); i++) { const c = CPT.Modal.top().card; (c.querySelector('#pg-skip') || c.querySelector('#pg-next')).click(); await new Promise(r => setTimeout(r, 60)); } });
const pos = () => page.evaluate(() => ({ p1: { x: CPT.Player.leaderOf(0).x, y: CPT.Player.leaderOf(0).y, id: CPT.Player.leaderOf(0).def.id }, p2: { x: CPT.Player.leaderOf(1).x, y: CPT.Player.leaderOf(1).y, id: CPT.Player.leaderOf(1).def.id } }));
let a = await pos();
check(await page.evaluate(() => CPT.Player.coop) && a.p1.id !== a.p2.id, 'modo dupla ativo com agentes diferentes (J1=' + a.p1.id + ', J2=' + a.p2.id + ')');
check(await page.evaluate(() => document.querySelectorAll('.agent[data-p]').length === 3 && !!document.querySelector('.agent[data-p="1"]') && !!document.querySelector('.agent[data-p="2"]')), 'cartões da equipe mostram Jogador 1 e Jogador 2');
await page.keyboard.down('KeyD'); await wait(500); await page.keyboard.up('KeyD');
let b = await pos();
check(b.p1.x > a.p1.x + 10 && Math.abs(b.p2.x - a.p2.x) < 1 && Math.abs(b.p2.y - a.p2.y) < 1, 'tecla D move só o Jogador 1');
await page.keyboard.down('ArrowUp'); await wait(500); await page.keyboard.up('ArrowUp');
let c = await pos();
check(c.p2.y < b.p2.y - 10 && Math.abs(c.p1.y - b.p1.y) < 1 && Math.abs(c.p1.x - b.p1.x) < 1, 'seta para cima move só o Jogador 2');
await page.keyboard.down('KeyA'); await page.keyboard.down('ArrowRight'); await wait(500); await page.keyboard.up('KeyA'); await page.keyboard.up('ArrowRight');
let d = await pos();
check(d.p1.x < c.p1.x - 10 && d.p2.x > c.p2.x + 10, 'os dois andam ao mesmo tempo em direções opostas');

// elástico: J2 tenta se afastar muito do J1 numa rua livre
await page.evaluate(() => { const p1 = CPT.Player.leaderOf(0), p2 = CPT.Player.leaderOf(1); p1.x = 3 * 16 + 8; p1.y = 9 * 16 + 12; p2.x = 4 * 16 + 8; p2.y = 9 * 16 + 12; CPT.Player.rebuildTrail(); });
await page.keyboard.down('ArrowRight'); await wait(6500); await page.keyboard.up('ArrowRight');
const lim = await page.evaluate(() => { const v = CPT.Game.viewSize(), p1 = CPT.Player.leaderOf(0), p2 = CPT.Player.leaderOf(1); return { dx: Math.abs(p2.x - p1.x), max: v.w - 44 }; });
check(lim.dx <= lim.max + 2, 'elástico: distância entre os jogadores (' + Math.round(lim.dx) + ') respeita o limite da tela (' + Math.round(lim.max) + ')');
check(lim.dx > 100, 'o Jogador 2 chegou a se afastar bastante antes de ser contido');

// J2 interage com Enter e fala pelo próprio agente
await page.evaluate(() => { const n = CPT.World.NPCS.marta, p2 = CPT.Player.leaderOf(1); p2.x = n.tx * 16 + 8; p2.y = (n.ty + 1) * 16 + 12; p2.dir = 'up'; });
await wait(150); await page.keyboard.press('Enter'); await wait(250);
const who = await page.evaluate(() => ({ cur: CPT.Player.current, name: document.querySelector('#dlg-name').textContent, p2: CPT.Player.leaderOf(1).def.name }));
check(who.cur === 1 && who.name === 'Dona Marta', 'Enter faz o Jogador 2 iniciar a conversa com a Dona Marta');
await page.evaluate(() => document.querySelector('#dlg-actions .btn.primary').click()); await wait(150);
const me = await page.evaluate(() => document.querySelector('#dlg-name').textContent);
check(me === who.p2, 'na conversa, o agente do Jogador 2 (' + who.p2 + ') é quem fala');
await drive();
check(await page.evaluate(() => CPT.Game.state.missions.saude.status === 'done' && CPT.Player.current === 0), 'missão concluída em dupla');

// troca de agentes
const swapBefore = await pos();
await page.keyboard.press('ShiftRight');
const after = await pos();
check(after.p2.id !== swapBefore.p2.id && after.p1.id !== after.p2.id, 'Shift direito troca o agente do Jogador 2 (' + swapBefore.p2.id + ' → ' + after.p2.id + ')');
await page.keyboard.press('KeyQ');
const after2 = await pos();
check(after2.p1.id !== after.p1.id && after2.p1.id !== after2.p2.id, 'Q troca o agente do Jogador 1');

console.log('8. Controle (gamepad simulado)');
await page.setViewport({ width: 1280, height: 720 });
await page.goto(URL); await wait(600); await page.evaluate(AUTO);
await page.evaluate(() => { window.__mk = (down, axes, index) => ({ index: index || 0, id: 'Controle simulado', connected: true, mapping: 'standard', axes: axes || [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (down || []).includes(i), value: (down || []).includes(i) ? 1 : 0 })) }); window.__pads = [window.__mk()]; });
const tapPad = async idx => { await page.evaluate(i => { window.__pads = [__mk([i])]; }, idx); await wait(220); await page.evaluate(() => { window.__pads = [__mk()]; }); await wait(220); };
await wait(300);
check(await page.evaluate(() => !document.querySelector('#pad-hint').classList.contains('hidden')), 'a tela de título avisa que um controle foi detectado');
await page.click('#btn-pad'); await wait(500);
check(await page.evaluate(() => !!CPT.Modal.top() && /Controle simulado/.test(CPT.Modal.top().card.textContent) && /em uso/.test(CPT.Modal.top().card.textContent)), 'o painel "🎮 Controle" da tela inicial mostra o controle detectado');
await page.keyboard.press('Escape'); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 0), 'Esc fecha o painel do controle');
await page.evaluate(() => document.querySelector('#btn-play').focus());
await tapPad(0); await wait(400);   // A no botão "Jogar · 1 jogador" (já está com o foco)
check(await page.evaluate(() => CPT.Game.mode === 'play' && !!CPT.Modal.top()), 'A inicia o jogo pelo controle (abre a história)');
for (let i = 0; i < 12 && await page.evaluate(() => !!CPT.Modal.top()); i++) await tapPad(0);   // avança história e tutorial só com o A
check(await page.evaluate(() => CPT.Modal.stack.length === 0 && CPT.Game.busy === 0), 'dá para passar pela história e pelo tutorial só com o controle');
const gx0 = await page.evaluate(() => CPT.Player.leader().x);
await page.evaluate(() => { window.__pads = [__mk([], [1, 0, 0, 0])]; }); await wait(500); await page.evaluate(() => { window.__pads = [__mk()]; }); await wait(150);
check(await page.evaluate(b => CPT.Player.leader().x > b + 10, gx0), 'o analógico move o jogador');
await page.evaluate(() => __auto.tpNpc('marta')); await wait(200);
check(await page.evaluate(() => /A/.test(document.querySelector('#prompt').textContent)), 'a dica de interação mostra o botão A quando se joga com o controle');
await tapPad(0); await wait(300);
check(await dlgVisible(), 'A inicia a conversa com a Dona Marta');
await tapPad(1); await wait(300);
check(await page.evaluate(() => document.querySelector('#dialogue').classList.contains('hidden') && CPT.Game.busy === 0 && CPT.Modal.stack.length === 0), 'B sai da conversa (sem abrir a pausa)');
await tapPad(9); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 1 && /pausado/.test(CPT.Modal.top().card.textContent)), 'Start abre a pausa');
await tapPad(1); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 0), 'B fecha a pausa');
const lead0 = await page.evaluate(() => CPT.Game.leaderId());
await tapPad(3); await wait(200);
check(await page.evaluate(l => CPT.Game.leaderId() !== l, lead0), 'Y troca de agente');
const seenAg = [await page.evaluate(() => CPT.Game.leaderId())];
for (let i = 0; i < 3; i++) { await tapPad(3); await wait(150); seenAg.push(await page.evaluate(() => CPT.Game.leaderId())); }
check(new Set(seenAg.slice(0, 3)).size === 3 && seenAg[3] === seenAg[0], 'Y percorre os 3 agentes e volta ao primeiro (' + seenAg.join(' → ') + ')');
await tapPad(4); await wait(150);
check(await page.evaluate(a => CPT.Game.leaderId() !== a, seenAg[0]), 'LB volta para o agente anterior');
// conversa completa com o controle: A avança, direcional escolhe a melhor resposta
await page.evaluate(() => __auto.tpNpc('lucia')); await wait(200);
await tapPad(0); await wait(300); await tapPad(0); await wait(300); await tapPad(0); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 1 && !!CPT.Modal.top().card.querySelector('.plan')), 'a missão da Tia Lúcia chegou à atividade de planejar usando só o controle');
await tapPad(13); await tapPad(0); await wait(200);   // direcional para baixo e A: escolhe uma opção
check(await page.evaluate(() => CPT.Modal.top().card.querySelectorAll('.plan-opt.on').length === 1), 'o controle também seleciona opções nas atividades');
await tapPad(1); await wait(300);
check(await page.evaluate(() => CPT.Modal.stack.length === 0 && CPT.Game.busy === 0), 'B sai da atividade');

console.log('8b. Co-op com dois controles');
await page.goto(URL); await wait(600); await page.evaluate(AUTO);
await page.evaluate(() => { window.__mk = (down, axes, index) => ({ index: index || 0, id: 'Controle simulado ' + (index || 0), connected: true, mapping: 'standard', axes: axes || [0, 0, 0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (down || []).includes(i), value: (down || []).includes(i) ? 1 : 0 })) }); window.__pads = [__mk([], null, 0), __mk([], null, 1)]; });
await page.click('#btn-play2'); await wait(500);
await page.evaluate(async () => { for (let i = 0; i < 14 && CPT.Modal.top(); i++) { const c = CPT.Modal.top().card; (c.querySelector('#pg-skip') || c.querySelector('#pg-next')).click(); await new Promise(r => setTimeout(r, 60)); } });
const cp0 = await pos();
await page.evaluate(() => { window.__pads = [__mk([], [1, 0, 0, 0], 0), __mk([], [0, -1, 0, 0], 1)]; }); await wait(500); await page.evaluate(() => { window.__pads = [__mk([], null, 0), __mk([], null, 1)]; }); await wait(150);
const cp1 = await pos();
check(cp1.p1.x > cp0.p1.x + 10 && Math.abs(cp1.p1.y - cp0.p1.y) < 1, 'o 1º controle move só o Jogador 1');
check(cp1.p2.y < cp0.p2.y - 10 && Math.abs(cp1.p2.x - cp0.p2.x) < 1, 'o 2º controle move só o Jogador 2');
const padA = idx => page.evaluate(i => { window.__pads = [__mk(i === 0 ? [0] : [], null, 0), __mk(i === 1 ? [0] : [], null, 1)]; }, idx);
const padB = idx => page.evaluate(i => { window.__pads = [__mk(i === 0 ? [1] : [], null, 0), __mk(i === 1 ? [1] : [], null, 1)]; }, idx);
const padIdle = () => page.evaluate(() => { window.__pads = [__mk([], null, 0), __mk([], null, 1)]; });
await page.evaluate(() => { const W = CPT.World.NPCS, p1 = CPT.Player.leaderOf(0), p2 = CPT.Player.leaderOf(1);
  p1.x = W.marta.tx * 16 + 8; p1.y = (W.marta.ty + 1) * 16 + 12; p1.dir = 'up'; p2.x = W.beto.tx * 16 + 8; p2.y = (W.beto.ty + 1) * 16 + 12; p2.dir = 'up'; CPT.Player.rebuildTrail(); });
await wait(250);
await padA(0); await wait(250); await padIdle(); await wait(250);
let who2 = await page.evaluate(() => ({ cur: CPT.Player.current, name: document.querySelector('#dlg-name').textContent, open: !document.querySelector('#dialogue').classList.contains('hidden') }));
check(who2.open && who2.cur === 0 && who2.name === 'Dona Marta', 'o A do 1º controle faz o Jogador 1 falar com a Dona Marta');
await padB(0); await wait(250); await padIdle(); await wait(250);
await padA(1); await wait(250); await padIdle(); await wait(250);
who2 = await page.evaluate(() => ({ cur: CPT.Player.current, name: document.querySelector('#dlg-name').textContent, open: !document.querySelector('#dialogue').classList.contains('hidden') }));
check(who2.open && who2.cur === 1 && who2.name === 'Beto', 'o A do 2º controle faz o Jogador 2 falar com o Beto');
await padB(1); await wait(250); await padIdle(); await wait(250);
check(await page.evaluate(() => CPT.Game.busy === 0 && CPT.Modal.stack.length === 0), 'cada controle sai da própria conversa com o B');

check(errs.length === 0, 'nenhum erro de JavaScript' + (errs.length ? ': ' + errs.join(' | ') : ''));
await browser.close();
console.log(failures ? `\n${failures} verificação(ões) falharam` : '\nTodas as verificações passaram ✔');
process.exit(failures ? 1 : 0);
