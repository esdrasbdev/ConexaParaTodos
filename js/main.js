/* Conexão para Todos — main.js
 * Ponto de entrada: carrega opções, inicia o jogo e liga os botões da tela de título. */
(function () {
  'use strict';
  const CPT = window.CPT;
  function $(s) { return document.querySelector(s); }

  function setHudVar() {
    const gameVisible = !$('#screen-game').classList.contains('hidden');
    document.documentElement.style.setProperty('--hud-h', (gameVisible ? $('#hud').offsetHeight : 0) + 'px');
  }

  /* Celular: esconde o botão e as dicas do modo de 2 jogadores (a classe também é usada pelo CSS). */
  function updatePhone() { CPT.Game.updatePhone(); }

  /* Navegadores só liberam áudio depois de um toque/tecla: o primeiro gesto liga o som e a música. */
  function unlockAudio() {
    CPT.Sound.init();
    if (CPT.Sound.ctx && CPT.Sound.ctx.state === 'running') ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.removeEventListener(t, unlockAudio, true); });
  }

  function boot() {
    CPT.Settings.load();
    CPT.Sprites.init();
    CPT.Game.init();
    CPT.Game.showScreen('screen-title');
    const logo = $('#logo-icon'); if (logo) logo.src = CPT.Sprites.logoWifiURL('#4f84f5', 3);
    updatePhone();
    ['pointerdown', 'keydown', 'touchend'].forEach(function (t) { document.addEventListener(t, unlockAudio, true); });
    $('#btn-play').addEventListener('click', function () { CPT.Game.startFlow(false); });
    $('#btn-play2').addEventListener('click', function () { CPT.Game.startFlow(true); });   // no celular o startFlow ignora o co-op
    $('#btn-how').addEventListener('click', function () { CPT.Sound.init(); const pgs = CPT.UI.howToPages(false); if (!CPT.Game.isPhone()) pgs.splice(pgs.length - 1, 0, CPT.UI.howToPages(true)[0]);   // página da dupla antes da do controle (some no celular)
      CPT.UI.pages('Como jogar', pgs); });
    $('#btn-credits').addEventListener('click', function () { CPT.UI.credits(); });
    $('#btn-options').addEventListener('click', function () { CPT.Settings.open(); });
    $('#btn-pad').addEventListener('click', function () { CPT.Sound.init(); CPT.Gamepad.openPanel(); });
    window.addEventListener('resize', setHudVar);
    window.addEventListener('resize', updatePhone); window.addEventListener('orientationchange', updatePhone);
    if (window.ResizeObserver) new ResizeObserver(setHudVar).observe($('#hud'));
    setHudVar();
    $('#btn-play').focus();
    CPT.booted = true;
  }

  window.addEventListener('error', function (e) {
    // Em vez de uma tela travada, avisa de forma amigável (e deixa o erro no console).
    if (!CPT.booted) {
      const m = document.createElement('div');
      m.style.cssText = 'position:fixed;inset:0;background:#fff7e6;color:#1f2547;padding:24px;font:18px sans-serif;z-index:999';
      m.innerHTML = '<h1>Não foi possível iniciar o jogo</h1><p>Recarregue a página. Se o problema continuar, abra o jogo por um servidor local (veja o README.md).</p>';
      document.body.appendChild(m);
    }
  });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
