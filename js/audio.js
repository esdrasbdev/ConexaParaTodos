/* Conexão para Todos — audio.js
 * Sons curtos e música de fundo gerados com Web Audio (sem arquivos). O jogo é totalmente compreensível sem som. */
(function () {
  'use strict';
  const CPT = (window.CPT = window.CPT || {});
  const Sound = (CPT.Sound = {
    ctx: null, volume: 0.5, muted: false,
    musicOn: true,
    init: function () {
      if (Sound.ctx) { if (Sound.ctx.state === 'suspended' && !document.hidden) Sound.ctx.resume(); Sound.music.sync(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      try { Sound.ctx = new AC(); } catch (e) { Sound.ctx = null; }
      Sound.music.sync();
    },
    setTrack: function (name) { Sound.music.want = name; Sound.music.sync(); },
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

  /* =====================================================================
   * Música de fundo — chiptune "calorosa" gerada por código.
   *  play : 104 BPM, Dó maior, I–V–vi–IV–I–V–IV–V (8 compassos em laço) com baixo saltitante,
   *         arpejo, melodia (2 vozes levemente desafinadas), chimbal, caixa suave e bumbo.
   *  title: 76 BPM, mais calma, com acordes longos ("pad"), arpejo lento e melodia espaçada.
   * Tudo passa por um "barramento" (filtro + eco no ritmo + compressor) com volume próprio,
   * e respeita Opções: volume, silenciar e a caixa "Música de fundo".
   * ===================================================================== */
  const mtof = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };
  const C_ = [60, 64, 67, 72], G_ = [59, 62, 67, 71], Am_ = [57, 60, 64, 69], F_ = [60, 65, 69, 72];
  const TRACKS = {
    play: {
      bpm: 104, drums: true, arp: 2, pad: false, bassGain: 0.085, arpGain: 0.026, melGain: 0.05,
      chords: [C_, G_, Am_, F_, C_, G_, F_, G_],
      roots:  [48, 43, 45, 41, 48, 43, 41, 43],
      bass: [[0, 0, 3], [3, 0, 2], [6, 7, 2], [8, 0, 3], [11, 0, 2], [14, 7, 2]],   // [passo, intervalo, duração] em semicolcheias
      melody: [
        [[0, 76, 4], [4, 79, 2], [6, 76, 2], [8, 74, 4], [12, 72, 4]],
        [[0, 74, 4], [4, 71, 4], [8, 74, 6], [14, 76, 2]],
        [[0, 76, 4], [4, 81, 4], [8, 79, 2], [10, 76, 2], [12, 72, 4]],
        [[0, 77, 4], [4, 76, 2], [6, 74, 2], [8, 72, 8]],
        [[0, 79, 4], [4, 76, 4], [8, 79, 4], [12, 84, 4]],
        [[0, 83, 4], [4, 79, 4], [8, 74, 4], [12, 79, 4]],
        [[0, 81, 4], [4, 77, 4], [8, 81, 2], [10, 79, 2], [12, 77, 4]],
        [[0, 79, 4], [4, 74, 2], [6, 71, 2], [8, 74, 8]]
      ]
    },
    title: {
      bpm: 76, drums: false, arp: 4, pad: true, bassGain: 0.07, arpGain: 0.022, melGain: 0.045,
      chords: [C_, Am_, F_, G_, C_, Am_, F_, G_],
      roots:  [48, 45, 41, 43, 48, 45, 41, 43],
      bass: [[0, 0, 8], [8, 7, 8]],
      melody: [
        [[0, 79, 8], [8, 76, 8]], [[0, 72, 8], [8, 76, 8]], [[0, 77, 8], [8, 74, 8]], [[0, 74, 6], [8, 71, 8]],
        [[0, 76, 8], [8, 79, 8]], [[0, 81, 8], [8, 79, 8]], [[0, 77, 8], [8, 76, 4], [12, 74, 4]], [[0, 79, 16]]
      ]
    }
  };
  const ARP_IDX = [0, 1, 2, 3, 2, 1, 2, 1];

  /* uma nota com envelope suave */
  function note(c, out, type, f, t, d, g, o) {
    o = o || {};
    const osc = c.createOscillator(), env = c.createGain(), a = o.attack || 0.012, rel = o.release || 0.08;
    osc.type = type; osc.frequency.setValueAtTime(f, t);
    if (o.detune) osc.detune.value = o.detune;
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(g, t + a);
    env.gain.exponentialRampToValueAtTime(Math.max(0.0001, g * (o.sustain || 0.55)), t + Math.max(a + 0.01, d * 0.6));
    env.gain.exponentialRampToValueAtTime(0.0001, t + d + rel);
    osc.connect(env); env.connect(out);
    osc.start(t); osc.stop(t + d + rel + 0.02);
  }
  function noiseBuffer(c) {
    if (!c._cptNoise) {
      const n = Math.floor(c.sampleRate * 0.5), b = c.createBuffer(1, n, c.sampleRate), ch = b.getChannelData(0);
      for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
      c._cptNoise = b;
    }
    return c._cptNoise;
  }
  function hit(c, out, t, d, g, ftype, freq) {
    const src = c.createBufferSource(), f = c.createBiquadFilter(), env = c.createGain();
    src.buffer = noiseBuffer(c); f.type = ftype; f.frequency.value = freq;
    env.gain.setValueAtTime(g, t); env.gain.exponentialRampToValueAtTime(0.0001, t + d);
    src.connect(f); f.connect(env); env.connect(out);
    src.start(t, Math.random() * 0.3); src.stop(t + d + 0.02);
  }
  function kick(c, out, t, g) {
    const o = c.createOscillator(), env = c.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(g, t + 0.004); env.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(env); env.connect(out); o.start(t); o.stop(t + 0.2);
  }

  /* agenda tudo o que toca no passo i (semicolcheia) da trilha, no instante t */
  function scheduleStep(c, out, trk, i, t) {
    const bar = Math.floor(i / 16) % trk.chords.length, s = i % 16, sd = 60 / trk.bpm / 4, ch = trk.chords[bar];
    trk.bass.forEach(function (n) { if (n[0] === s) note(c, out, 'triangle', mtof(trk.roots[bar] + n[1]), t, n[2] * sd * 0.9, trk.bassGain, { sustain: 0.7 }); });
    if (trk.arp && s % trk.arp === 0) note(c, out, 'square', mtof(ch[ARP_IDX[(s / trk.arp) % 8]]), t, trk.arp * sd * 0.7, trk.arpGain, { sustain: 0.4, release: 0.05 });
    if (trk.pad && s === 0) ch.forEach(function (m) { note(c, out, 'triangle', mtof(m - 12), t, 15 * sd, 0.028, { attack: 0.5, release: 0.6, sustain: 0.9 }); });
    trk.melody[bar].forEach(function (n) {
      if (n[0] !== s) return;
      const d = n[2] * sd * 0.95;
      note(c, out, 'square', mtof(n[1]), t, d, trk.melGain, { sustain: 0.5 });
      note(c, out, 'triangle', mtof(n[1]), t, d, trk.melGain * 1.1, { detune: 7, sustain: 0.7 });
    });
    if (trk.drums) {
      if (s === 0 || s === 8 || (s === 10 && bar % 2 === 1)) kick(c, out, t, 0.16);
      if (s === 4 || s === 12) hit(c, out, t, 0.11, 0.035, 'bandpass', 1900);
      if (s % 2 === 0) hit(c, out, t, 0.04, s % 4 === 2 ? 0.02 : 0.011, 'highpass', 7500);
    }
  }
  /* barramento: filtro suave + eco no ritmo + compressor (evita estourar junto dos efeitos) */
  function buildBus(c, dest) {
    const input = c.createGain(), master = c.createGain(), lp = c.createBiquadFilter(), comp = c.createDynamicsCompressor();
    const dl = c.createDelay(1), fb = c.createGain(), wet = c.createGain();
    lp.type = 'lowpass'; lp.frequency.value = 6500;
    dl.delayTime.value = 0.4; fb.gain.value = 0.3; wet.gain.value = 0.2;
    input.connect(lp); lp.connect(master); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(master);
    master.connect(comp); comp.connect(dest || c.destination);
    return { input: input, master: master, delay: dl };
  }

  const LEVEL = 0.6;   // volume da música em relação ao volume geral (ajustado para ficar abaixo dos efeitos)
  const Music = (Sound.music = {
    want: 'title', cur: null, i: 0, next: 0, timer: null, bus: null, busCtx: null, node: null, TRACKS: TRACKS,
    enabled: function () { return Sound.musicOn !== false && !Sound.muted && Sound.volume > 0; },
    level: function () { return Music.enabled() ? Sound.volume * LEVEL : 0; },
    setLevel: function () {
      const c = Sound.ctx; if (!c || !Music.bus) return;
      try { Music.bus.master.gain.setTargetAtTime(Music.level(), c.currentTime, 0.05); } catch (e) { /* ok */ }
    },
    halt: function () {
      if (Music.timer) { clearInterval(Music.timer); Music.timer = null; }
      if (Music.node && Sound.ctx) Music.fadeOut(Music.node);
      Music.node = null; Music.cur = null; Music.setLevel();
    },
    fadeOut: function (node) {
      try { const t = Sound.ctx.currentTime; node.gain.cancelScheduledValues(t); node.gain.setTargetAtTime(0.0001, t, 0.12); setTimeout(function () { try { node.disconnect(); } catch (e) { /* ok */ } }, 1200); } catch (e) { /* ok */ }
    },
    /* liga/desliga/troca a trilha conforme o estado atual (chamar sempre que algo mudar) */
    sync: function () {
      const c = Sound.ctx; if (!c) return;
      try {
        if (!Music.enabled() || !TRACKS[Music.want]) { Music.halt(); return; }
        if (Music.busCtx !== c) { Music.bus = buildBus(c); Music.busCtx = c; Music.bus.master.gain.value = 0; }
        if (Music.cur !== Music.want) {
          if (Music.node) Music.fadeOut(Music.node);
          Music.node = c.createGain(); Music.node.connect(Music.bus.input);
          Music.cur = Music.want; Music.i = 0; Music.next = c.currentTime + 0.1;
          Music.bus.delay.delayTime.value = (60 / TRACKS[Music.cur].bpm) * 0.75;   // colcheia pontuada
        }
        if (!Music.timer) Music.timer = setInterval(Music.tick, 40);
        Music.setLevel();
      } catch (e) { /* a música nunca pode travar o jogo */ }
    },
    tick: function () {
      const c = Sound.ctx, trk = TRACKS[Music.cur];
      if (!c || !trk || !Music.node || c.state !== 'running') return;
      try {
        const sd = 60 / trk.bpm / 4, now = c.currentTime;
        if (Music.next < now - 0.2) Music.next = now + 0.05;   // voltou de uma pausa: recomeça sem rajada de notas atrasadas
        while (Music.next < now + 0.3) { scheduleStep(c, Music.node, trk, Music.i, Music.next); Music.next += sd; Music.i++; }
      } catch (e) { /* ignorar */ }
    },
    /* Renderiza uma trilha para um AudioBuffer (usado nos testes; também serve para exportar WAV). */
    render: function (name, bars, rate) {
      const trk = TRACKS[name], sd = 60 / trk.bpm / 4, secs = bars * 16 * sd + 2;
      const oc = new (window.OfflineAudioContext || window.webkitOfflineAudioContext)(2, Math.ceil(secs * (rate || 22050)), rate || 22050);
      const bus = buildBus(oc); bus.master.gain.value = 1; bus.delay.delayTime.value = (60 / trk.bpm) * 0.75;
      for (let i = 0; i < bars * 16; i++) scheduleStep(oc, bus.input, trk, i, i * sd);
      return oc.startRendering();
    }
  });
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', function () {
    const c = Sound.ctx; if (!c) return;
    try { if (document.hidden) c.suspend(); else c.resume(); } catch (e) { /* ok */ }
  });
})();
