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

  function boot() {
    CPT.Settings.load();
    CPT.Sprites.init();
    CPT.Game.init();
    CPT.Game.showScreen('screen-title');
    const logo = $('#logo-icon'); if (logo) logo.src = CPT.Sprites.logoWifiURL('#4f84f5', 3);
    $('#btn-play').addEventListener('click', function () { CPT.Game.startFlow(false); });
    $('#btn-play2').addEventListener('click', function () { CPT.Game.startFlow(true); });
    $('#btn-how').addEventListener('click', function () { CPT.Sound.init(); const pgs = CPT.UI.howToPages(false); pgs.splice(pgs.length - 1, 0, CPT.UI.howToPages(true)[0]);   // página da dupla antes da do controle
      CPT.UI.pages('Como jogar', pgs); });
    $('#btn-credits').addEventListener('click', function () { CPT.UI.credits(); });
    $('#btn-options').addEventListener('click', function () { CPT.Settings.open(); });
    $('#btn-pad').addEventListener('click', function () { CPT.Sound.init(); CPT.Gamepad.openPanel(); });
    window.addEventListener('resize', setHudVar);
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
