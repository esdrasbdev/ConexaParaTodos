/* Conexão para Todos — audio.js
 * Sons curtos gerados com Web Audio (sem arquivos). O jogo é totalmente compreensível sem som. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const Sound = (CPT.Sound = {
    ctx: null, volume: 0.5, muted: false,
    init: function () {
      if (Sound.ctx) { if (Sound.ctx.state === 'suspended') Sound.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { Sound.ctx = new AC(); } catch (e) { Sound.ctx = null; }
    },
    tone: function (freq, start, dur, type, gain) {
      const c = Sound.ctx;
      if (!c || Sound.muted || Sound.volume <= 0) return;
      try { Sound.rawTone(c, freq, start, dur, type, gain); } catch (e) { /* o som nunca pode travar o jogo */ }
    },
    rawTone: function (c, freq, start, dur, type, gain) {
      const o = c.createOscillator(), g = c.createGain(), t = c.currentTime + start;
      o.type = type || 'square'; o.frequency.value = freq;
      const v = (gain || 0.12) * Sound.volume;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(v, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + dur + 0.02);
    },
    play: function (name) {
      if (!Sound.ctx) return;
      try { Sound.playRaw(name); } catch (e) { /* ignorar falhas de áudio */ }
    },
    playRaw: function (name) {
      const t = Sound.tone;
      if (name === 'click') t(660, 0, 0.06, 'square', 0.08);
      else if (name === 'talk') { t(440, 0, 0.05, 'triangle', 0.1); t(560, 0.05, 0.06, 'triangle', 0.1); }
      else if (name === 'good') { t(523, 0, 0.1, 'triangle'); t(659, 0.09, 0.1, 'triangle'); t(784, 0.18, 0.16, 'triangle'); }
      else if (name === 'ok') { t(523, 0, 0.1, 'triangle'); t(587, 0.1, 0.14, 'triangle'); }
      else if (name === 'bad') { t(300, 0, 0.12, 'sine', 0.14); t(240, 0.12, 0.18, 'sine', 0.14); }
      else if (name === 'pick') { t(880, 0, 0.07, 'square', 0.08); t(1175, 0.07, 0.1, 'square', 0.08); }
      else if (name === 'win') { [523, 659, 784, 1047, 784, 1047].forEach(function (f, i) { t(f, i * 0.12, 0.2, 'triangle', 0.14); }); }
      else if (name === 'new') { t(700, 0, 0.08, 'triangle'); t(900, 0.09, 0.12, 'triangle'); }
    }
  });
})();
