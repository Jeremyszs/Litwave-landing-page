/* Litwave landing page — vanilla JS, no build step. */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ───────────── Header menu (mobile) ───────────── */
  const nav = $('headerNav');
  const menuBtn = $('menuToggle');
  menuBtn.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', (e) => {
    if (e.target.tagName === 'A') { nav.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); }
  });

  /* Pause expensive loops while off-screen */
  function whenVisible(el, onChange) {
    if (!('IntersectionObserver' in window)) { onChange(true); return; }
    new IntersectionObserver((entries) => onChange(entries[0].isIntersecting), { rootMargin: '80px' }).observe(el);
  }

  /* ───────────── Music theory helpers ───────────── */
  const NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
  const PROGRESSIONS = [
    { name: '1 – 5/7 – 6m – 4', chords: [{ d: 0, q: '', n: '1' }, { d: 7, q: '', bass: 11, n: '5/7' }, { d: 9, q: 'm', n: '6m' }, { d: 5, q: '', n: '4' }] },
    { name: '2m – 5 – 1 – 6m', chords: [{ d: 2, q: 'm', n: '2m' }, { d: 7, q: '', n: '5' }, { d: 0, q: '', n: '1' }, { d: 9, q: 'm', n: '6m' }] },
    { name: '1 – 4 – 1 – 5', chords: [{ d: 0, q: '', n: '1' }, { d: 5, q: '', n: '4' }, { d: 0, q: '', n: '1' }, { d: 7, q: '', n: '5' }] }
  ];
  function chordName(rootIdx, c) {
    const r = (rootIdx + c.d) % 12;
    let s = NOTES[r] + c.q;
    if (c.bass != null) s += '/' + NOTES[(rootIdx + c.bass) % 12];
    return s;
  }
  function chordNotes(rootIdx, c) {
    const r = (rootIdx + c.d) % 12;
    const third = c.q === 'm' ? 3 : 4;
    return [r, (r + third) % 12, (r + 7) % 12].map((i) => NOTES[i]).join(' ');
  }

  /* ───────────── Hero studio recreation ───────────── */
  (function hero() {
    const canvas = $('heroWaveCanvas');
    const wave = $('heroWave');
    const playhead = $('heroPlayhead');
    const loop = $('heroLoop');
    const dot = $('heroDot');
    const timeEl = $('heroTime');
    const btn = $('heroPlay');
    const label = $('heroPlayLabel');
    const icon = $('heroPlayIcon');
    const G = 7;
    const LOOP_A = 0.30, LOOP_B = 0.54, TOTAL = 228;
    const prog = PROGRESSIONS[0].chords;

    // deterministic pseudo-random envelope, shaped like song sections
    const N = 220;
    const env = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const sec = t < .08 ? .35 : t < .3 ? .55 : t < .52 ? .9 : t < .68 ? .6 : t < .88 ? .95 : .4;
      env.push(Math.min(1, sec * (.55 + rnd() * .55)));
    }
    function drawWave() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wave.clientWidth, h = wave.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const bw = w / N;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const inLoop = t >= LOOP_A && t <= LOOP_B;
        const bh = env[i] * (h * .78);
        ctx.fillStyle = inLoop ? 'rgba(56,189,248,.85)' : 'rgba(156,163,175,.45)';
        ctx.fillRect(i * bw, (h - bh) / 2 + 6, Math.max(1, bw - 1), bh);
      }
    }
    drawWave();
    window.addEventListener('resize', drawWave);
    loop.style.left = LOOP_A * 100 + '%';
    loop.style.width = (LOOP_B - LOOP_A) * 100 + '%';

    const chordEl = $('heroChord'), nextEl = $('heroNext'), nashEl = $('heroNash'), nashNextEl = $('heroNashNext');
    const mm = (s) => String(Math.floor(s / 60)).padStart(2, '0') + ':' + (s % 60).toFixed(2).padStart(5, '0');

    let pos = LOOP_A + .02, playing = !reduceMotion, visible = true, last = 0, lastIdx = -1;
    function render() {
      playhead.style.left = pos * 100 + '%';
      timeEl.textContent = mm(pos * TOTAL) + ' / ' + mm(TOTAL);
      const span = (pos - LOOP_A) / (LOOP_B - LOOP_A);
      const idx = Math.min(3, Math.max(0, Math.floor(span * 4)));
      if (idx !== lastIdx) {
        lastIdx = idx;
        const c = prog[idx], n = prog[(idx + 1) % 4];
        chordEl.textContent = chordName(G, c); nashEl.textContent = c.n;
        nextEl.textContent = chordName(G, n); nashNextEl.textContent = n.n;
      }
    }
    function setPlaying(p) {
      playing = p;
      label.textContent = p ? 'Pause' : 'Play';
      icon.innerHTML = p ? '<rect x="5" y="4" width="5" height="16"/><rect x="14" y="4" width="5" height="16"/>' : '<polygon points="6 3 20 12 6 21"/>';
      dot.classList.toggle('idle', !p);
    }
    btn.addEventListener('click', () => setPlaying(!playing));
    setPlaying(playing);
    render();

    // mixer meters
    const meters = document.querySelectorAll('#heroMixer .fader-group');
    meters.forEach((g) => {
      const v = parseFloat(g.dataset.v);
      g.querySelector('.fader-fill').style.height = v * 100 + '%';
      g.querySelector('.fader-thumb').style.bottom = `calc(${v * 100}% - 3px)`;
    });

    function frame(ts) {
      requestAnimationFrame(frame);
      if (!visible) { last = ts; return; }
      const dt = Math.min(.1, (ts - last) / 1000); last = ts;
      if (playing) {
        pos += (dt * .8) / TOTAL;
        if (pos > LOOP_B) pos = LOOP_A;
        render();
      }
      meters.forEach((g, i) => {
        const base = parseFloat(g.dataset.v);
        const m = playing ? base * (.45 + .5 * Math.abs(Math.sin(ts / (260 + i * 90) + i))) : 0.04;
        g.querySelector('.meter').style.height = Math.min(96, m * 100) + '%';
      });
    }
    whenVisible($('heroStudio'), (v) => { visible = v; });
    requestAnimationFrame(frame);
  })();

  /* ───────────── Chord demo ───────────── */
  (function chordDemo() {
    const sel = $('chordRoot');
    NOTES.forEach((n, i) => { const o = document.createElement('option'); o.value = i; o.textContent = n; sel.appendChild(o); });
    let root = 0, p = 0, idx = 0, auto = true, timer = null;

    const cells = $('cdCells');
    function build() {
      cells.innerHTML = '';
      PROGRESSIONS[p].chords.forEach((c, i) => {
        const d = document.createElement('div');
        d.className = 'mg-cell'; d.dataset.i = i;
        d.innerHTML = `<span></span><small></small>`;
        d.addEventListener('click', () => { idx = i; render(); restart(); });
        cells.appendChild(d);
      });
    }
    function render() {
      const ch = PROGRESSIONS[p].chords;
      const c = ch[idx], n = ch[(idx + 1) % ch.length];
      $('cdChord').textContent = chordName(root, c);
      $('cdNash').textContent = c.n;
      $('cdNotes').textContent = chordNotes(root, c);
      $('cdNext').textContent = chordName(root, n);
      $('cdNashNext').textContent = n.n;
      $('cdProgName').textContent = PROGRESSIONS[p].name;
      [...cells.children].forEach((el, i) => {
        el.classList.toggle('on', i === idx);
        el.firstChild.textContent = chordName(root, ch[i]);
        el.lastChild.textContent = ch[i].n;
      });
    }
    function step(dir) { const L = PROGRESSIONS[p].chords.length; idx = (idx + dir + L) % L; render(); }
    function restart() { clearInterval(timer); if (auto && !reduceMotion) timer = setInterval(() => step(1), 2200); }

    sel.addEventListener('change', () => { root = +sel.value; render(); });
    $('chordNextBtn').addEventListener('click', () => { step(1); restart(); });
    $('chordPrev').addEventListener('click', () => { step(-1); restart(); });
    const autoBtn = $('chordAuto');
    autoBtn.textContent = reduceMotion ? 'Auto: Off' : 'Auto: On';
    auto = !reduceMotion;
    autoBtn.addEventListener('click', () => { auto = !auto; autoBtn.textContent = 'Auto: ' + (auto ? 'On' : 'Off'); restart(); });
    $('progPick').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return;
      p = +b.dataset.p; idx = 0;
      [...$('progPick').children].forEach((x) => x.classList.toggle('active', x === b));
      build(); render(); restart();
    });
    build(); render(); restart();
    whenVisible($('chordDemo'), (v) => { if (v) restart(); else clearInterval(timer); });
  })();

  /* ───────────── Audio (lazy) ───────────── */
  let ctx = null, master = null, analyser = null;
  function audio() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = .85;
    analyser = ctx.createAnalyser(); analyser.fftSize = 1024;
    master.connect(analyser); analyser.connect(ctx.destination);
    return ctx;
  }
  const buffers = {};
  function loadSample(name) {
    if (buffers[name] !== undefined) return;
    buffers[name] = null;
    fetch('samples/' + name + '.wav').then((r) => r.arrayBuffer()).then((ab) => new Promise((res, rej) => ctx.decodeAudioData(ab, res, rej)))
      .then((b) => { buffers[name] = b; }).catch(() => { buffers[name] = false; });
  }

  /* ───────────── FX pads ───────────── */
  // Names, order and categories are the app's factory banks (assets/fx-pads/factory_manifest.json)
  const BANKS = {
    A: ['percussion', 'Percussion', [['Tight Rimshot'], ['Sidestick'], ['Modern Clap'], ['Finger Snap'], ['Big Snare Hit'], ['Perc Hit'], ['Floor Tom'], ['Timpani Hit']]],
    B: ['hits', 'Hits & Impacts', [['Orchestra Hit'], ['Brass Stab'], ['String Stab'], ['Cinematic Impact'], ['Punchy Impact'], ['Sub Impact'], ['Deep Boom'], ['Bass Drop']]],
    C: ['transitions', 'Transitions', [['Wide Whoosh'], ['Fast Whoosh'], ['Downlifter'], ['Long Riser'], ['Short Riser'], ['Reverse Cymbal'], ['Cymbal Swell', 'swell'], ['Noise Sweep']]],
    D: ['special', 'Special', [['Crash Cymbal'], ['Big Crash'], ['Reverse Impact'], ['Glitch Hit'], ['Electronic Stab'], ['Vocal Chop'], ['Ambient Swell'], ['Huge Final Impact']]],
    E: ['mixed', 'Wide Studio Set', [['Wide Vibe Pad'], ['Fat Rimshot'], ['Wide Metro Click'], ['Wide Sub Kick', 'kick'], ['Wide Snare', 'snare'], ['Wide Shaker', 'shaker'], ['808 Sub Boom'], ['Cinema Whoosh']]],
    F: ['mixed', 'Texture & Color', [['Analog Brass'], ['Vinyl Crackle Hit'], ['Tape Stop Drop', 'tape_drop'], ['Sub Drop Boom', 'sub_drop'], ['Sparkle Chime', 'chime'], ['Woodblock'], ['Wide Vocal Air'], ['Stadium Clap', 'clap']] ]
  };
  // synth category per pad when no bundled sample exists
  const KIND = {
    A: ['click', 'click', 'noise', 'click', 'noise', 'click', 'thump', 'thump'],
    B: ['stab', 'stab', 'stab', 'thump', 'thump', 'thump', 'thump', 'drop'],
    C: ['sweep', 'sweep', 'down', 'rise', 'rise', 'rise', 'sweep', 'sweep'],
    D: ['noise', 'noise', 'rise', 'glitch', 'stab', 'chop', 'sweep', 'thump'],
    E: ['pad', 'click', 'click', 'thump', 'noise', 'noise', 'drop', 'sweep'],
    F: ['stab', 'glitch', 'down', 'drop', 'chime', 'click', 'pad', 'noise']
  };
  const PALETTE = [
    ['#ef4444', 'rgba(239,68,68,.4)', 'linear-gradient(135deg, rgba(239,68,68,.25), rgba(185,28,28,.4))'],
    ['#f97316', 'rgba(249,115,22,.4)', 'linear-gradient(135deg, rgba(249,115,22,.25), rgba(194,65,12,.4))'],
    ['#eab308', 'rgba(234,179,8,.4)', 'linear-gradient(135deg, rgba(234,179,8,.25), rgba(161,98,7,.4))'],
    ['#22c55e', 'rgba(34,197,94,.4)', 'linear-gradient(135deg, rgba(34,197,94,.25), rgba(21,128,61,.4))'],
    ['#06b6d4', 'rgba(6,182,212,.4)', 'linear-gradient(135deg, rgba(6,182,212,.25), rgba(14,116,144,.4))'],
    ['#3b82f6', 'rgba(59,130,246,.4)', 'linear-gradient(135deg, rgba(59,130,246,.25), rgba(29,78,216,.4))'],
    ['#a855f7', 'rgba(168,85,247,.4)', 'linear-gradient(135deg, rgba(168,85,247,.25), rgba(126,34,206,.4))'],
    ['#ec4899', 'rgba(236,72,153,.4)', 'linear-gradient(135deg, rgba(236,72,153,.25), rgba(190,24,93,.4))']
  ];

  function noiseBuf(dur) {
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t, a, d, peak) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function synth(kind) {
    const t = ctx.currentTime;
    const out = ctx.createGain(); out.connect(master);
    const osc = (type, f0, f1, dur, peak, delay = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f0, t + delay);
      if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + delay + dur);
      env(g, t + delay, .005, dur, peak); o.connect(g); g.connect(out); o.start(t + delay); o.stop(t + delay + dur + .05);
    };
    const noise = (type, f, q, dur, peak, f1) => {
      const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf(dur + .1); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
      env(g, t, dur > .5 ? dur * .5 : .003, dur > .5 ? dur * .5 : dur, peak);
      s.connect(fl); fl.connect(g); g.connect(out); s.start(t); s.stop(t + dur + .1);
    };
    switch (kind) {
      case 'click': osc('triangle', 1800, 700, .08, .45); noise('highpass', 3000, 1, .05, .3); break;
      case 'noise': noise('bandpass', 2500, .8, .22, .6); osc('triangle', 220, 140, .12, .3); break;
      case 'thump': osc('sine', 150, 42, .45, .9); noise('lowpass', 400, 1, .08, .25); break;
      case 'drop': osc('sine', 120, 28, .9, .9); break;
      case 'stab': [0, 4, 7].forEach((s) => osc('sawtooth', 220 * Math.pow(2, s / 12), 0, .28, .14)); noise('lowpass', 1200, 1, .12, .15); break;
      case 'sweep': noise('bandpass', 400, 2, 1.1, .55, 6000); break;
      case 'down': noise('bandpass', 6000, 2, 1.1, .55, 300); break;
      case 'rise': noise('bandpass', 300, 3, 1.4, .5, 7000); osc('sawtooth', 110, 440, 1.4, .1); break;
      case 'glitch': for (let i = 0; i < 5; i++) osc('square', 400 + Math.random() * 1600, 0, .04, .15, i * .045); break;
      case 'chop': osc('sawtooth', 330, 280, .18, .22); noise('bandpass', 1400, 4, .15, .25); break;
      case 'pad': [0, 7, 12].forEach((s) => osc('sine', 261.6 * Math.pow(2, s / 12), 0, 1.4, .22)); break;
      case 'chime': [0, 7, 12, 16].forEach((s, i) => osc('sine', 1046 * Math.pow(2, s / 12), 0, 1.1, .1, i * .05)); break;
    }
  }
  function playSample(buf) {
    const s = ctx.createBufferSource(), g = ctx.createGain();
    s.buffer = buf; g.gain.value = .9; s.connect(g); g.connect(master); s.start();
  }

  (function pads() {
    const tabs = $('bankTabs'), grid = $('padGrid'), dot = $('padDot');
    let bank = 'A';
    Object.keys(BANKS).forEach((k) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = k; b.setAttribute('role', 'tab'); b.setAttribute('aria-label', 'Bank ' + k);
      b.addEventListener('click', () => { bank = k; render(); });
      tabs.appendChild(b);
    });
    function render() {
      [...tabs.children].forEach((b) => { const on = b.textContent === bank; b.classList.toggle('active', on); b.setAttribute('aria-selected', on); });
      $('bankName').textContent = `Bank ${bank} · ${BANKS[bank][1]}`;
      grid.innerHTML = '';
      BANKS[bank][2].forEach(([name, sample], i) => {
        const pal = PALETTE[i % 8];
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'fx-pad-btn';
        b.style.setProperty('--pad-border', pal[0]); b.style.setProperty('--pad-glow', pal[1]); b.style.setProperty('--pad-bg', pal[2]);
        b.innerHTML = `<span class="pn">${bank}${i + 1}</span><span class="pl">${name}</span>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(b, bank, i, sample); });
        b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); trigger(b, bank, i, sample); } });
        grid.appendChild(b);
      });
    }
    function trigger(el, k, i, sample) {
      el.classList.add('hit'); setTimeout(() => el.classList.remove('hit'), 140);
      dot.classList.remove('idle');
      if (!audio()) return;
      Object.keys(BANKS).forEach((bk) => BANKS[bk][2].forEach((p) => { if (p[1]) loadSample(p[1]); }));
      if (sample && buffers[sample]) playSample(buffers[sample]);
      else synth(KIND[k][i]);
    }
    render();
    // warm the sample cache after first interaction anywhere in the lab
    $('lab').addEventListener('pointerdown', () => { if (audio()) Object.keys(BANKS).forEach((bk) => BANKS[bk][2].forEach((p) => { if (p[1]) loadSample(p[1]); })); }, { once: true });
  })();

  /* ───────────── Drone + oscilloscope ───────────── */
  (function drone() {
    const keys = $('rootKeys'), dotEl = $('droneDot'), lbl = $('scopeLabel'), canvas = $('scope');
    const ROOTS = ['C', 'D', 'E', 'F', 'G', 'A'].map((n) => [n, NOTES.indexOf(n)]);
    let current = null, voice = null;
    ROOTS.forEach(([n]) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = n; b.dataset.n = n;
      b.addEventListener('click', () => toggle(n));
      keys.appendChild(b);
    });
    function freq(idx) { return 65.41 * Math.pow(2, idx / 12); } // C2 base
    function makeVoice(idx) {
      const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; lp.Q.value = .4;
      const g = ctx.createGain(); g.gain.value = 0;
      lp.connect(g); g.connect(master);
      const oscs = [[0, 'triangle', .5], [7, 'sine', .32], [12, 'sine', .28], [0, 'sawtooth', .06]].map(([semi, type, lvl]) => {
        const o = ctx.createOscillator(), og = ctx.createGain();
        o.type = type; o.frequency.value = freq(idx) * Math.pow(2, semi / 12) * (type === 'sawtooth' ? 1.004 : 1);
        og.gain.value = lvl; o.connect(og); og.connect(lp); o.start(); return o;
      });
      g.gain.linearRampToValueAtTime(.22, ctx.currentTime + 1.2);
      return { g, oscs };
    }
    function release(v, secs) {
      if (!v) return;
      const t = ctx.currentTime;
      v.g.gain.cancelScheduledValues(t); v.g.gain.setValueAtTime(v.g.gain.value, t); v.g.gain.linearRampToValueAtTime(0, t + secs);
      setTimeout(() => v.oscs.forEach((o) => { try { o.stop(); } catch (e) {} }), secs * 1000 + 80);
    }
    function ui() {
      [...keys.children].forEach((b) => b.classList.toggle('active', b.dataset.n === current));
      dotEl.classList.toggle('idle', !current);
      lbl.textContent = current ? `Playing · ${current} + 5th + octave` : 'Idle · choose a root';
    }
    function stop() { if (voice) release(voice, .8); voice = null; current = null; ui(); }
    function toggle(n) {
      if (!audio()) return;
      if (current === n) return stop();
      release(voice, 1.4);
      voice = makeVoice(ROOTS.find((r) => r[0] === n)[1]);
      current = n; ui();
    }
    $('droneStop').addEventListener('click', stop);
    ui();

    // oscilloscope
    const c2 = canvas.getContext('2d');
    let visible = false, w = 0, h = 0;
    function size() { const d = Math.min(devicePixelRatio || 1, 2); w = canvas.clientWidth; h = canvas.clientHeight; canvas.width = w * d; canvas.height = h * d; c2.setTransform(d, 0, 0, d, 0, 0); }
    size(); window.addEventListener('resize', size);
    whenVisible(canvas, (v) => { visible = v; });
    const data = new Uint8Array(1024);
    function draw() {
      requestAnimationFrame(draw);
      if (!visible) return;
      c2.clearRect(0, 0, w, h);
      c2.strokeStyle = 'rgba(255,255,255,.05)'; c2.lineWidth = 1; c2.beginPath();
      for (let x = 0; x <= w; x += w / 8) { c2.moveTo(x, 0); c2.lineTo(x, h); }
      for (let y = 0; y <= h; y += h / 4) { c2.moveTo(0, y); c2.lineTo(w, y); }
      c2.stroke();
      c2.strokeStyle = '#38bdf8'; c2.lineWidth = 1.6; c2.shadowColor = 'rgba(56,189,248,.8)'; c2.shadowBlur = 8; c2.beginPath();
      if (analyser) {
        analyser.getByteTimeDomainData(data);
        // find a rising zero crossing so the trace holds still
        let s = 0; for (let i = 1; i < 512; i++) { if (data[i - 1] < 128 && data[i] >= 128) { s = i; break; } }
        for (let i = 0; i < 480; i++) {
          const x = (i / 479) * w, y = h / 2 + ((data[s + i] - 128) / 128) * (h * .42);
          i ? c2.lineTo(x, y) : c2.moveTo(x, y);
        }
      } else { c2.moveTo(0, h / 2); c2.lineTo(w, h / 2); }
      c2.stroke(); c2.shadowBlur = 0;
    }
    requestAnimationFrame(draw);
  })();

  /* ───────────── Phone stage remote ───────────── */
  (function phone() {
    const screen = $('phoneScreen'), title = $('phoneTitle'), dots = $('phoneDots');
    const TITLES = ['STAGE: CHORDS & PAD', 'STAGE: FX PADS', 'STAGE: PART 1-8 FADERS', 'STAGE: SONG MANAGER', 'STAGE: MIXER'];
    let page = 0, ci = 0, droneOn = false, ticker = null;
    for (let i = 0; i < 5; i++) dots.appendChild(document.createElement('i'));

    const fader = (label, v) => `<div class="ph-fader"><div class="fader-track"><div class="fader-fill" style="height:${v * 100}%"></div><div class="fader-thumb" style="bottom:calc(${v * 100}% - 3px)"></div></div><span>${label}</span></div>`;
    function pageHtml() {
      const prog = PROGRESSIONS[0].chords, c = prog[ci], n = prog[(ci + 1) % 4];
      if (page === 0) return `
        <div class="ph-box"><div class="ph-row"><span>Song key</span><span class="custom-select-dark">Key: C</span></div></div>
        <div class="ph-center">
          <span class="ph-label">Playing chord</span>
          <div class="ph-chord">${chordName(0, c)}</div>
          <div class="ph-nash">[ ${c.n} ]</div>
          <div class="ph-next">NEXT<b>${chordName(0, n)}</b></div>
        </div>
        <div class="ph-box"><div class="ph-row"><span><span class="status-dot ${droneOn ? '' : 'idle'}" style="margin-right:7px"></span>Ambient drone pad</span><button class="btn ${droneOn ? '' : 'btn-primary'}" id="phDrone" type="button">${droneOn ? 'STOP' : 'START'}</button></div>
        <div class="ph-slider"><i style="width:75%"></i></div></div>`;
      if (page === 1) {
        const pads = BANKS.A[2].map(([nm], i) => `<div class="fx-pad-btn" style="--pad-border:${PALETTE[i][0]};--pad-glow:${PALETTE[i][1]};--pad-bg:${PALETTE[i][2]}"><span class="pn">A${i + 1}</span><span class="pl">${nm}</span></div>`).join('');
        return `<div class="ph-row" style="margin-bottom:8px"><span>Bank A · Percussion</span><span>A B C D E F</span></div><div class="ph-pads">${pads}</div>`;
      }
      if (page === 2) {
        const v = [.7, .55, .62, .48, .66, .4, .58, .3];
        return `<div class="ph-row" style="margin-bottom:6px"><span>Sound parts</span><span>Part 1–8</span></div><div class="ph-faders">${v.map((x, i) => fader('P' + (i + 1), x)).join('')}</div>`;
      }
      if (page === 3) {
        const songs = [['Opening Song', 'G · 72'], ['Slow Build', 'C · 64'], ['Bridge Reprise', 'A · 68'], ['Closing Anthem', 'E · 76']];
        return `<div class="ph-row" style="margin-bottom:8px"><span>Setlist</span><span>${songs.length} songs</span></div>` +
          songs.map((s, i) => `<div class="ph-song ${i === 0 ? 'on' : ''}"><span class="status-dot ${i === 0 ? '' : 'idle'}"></span>${s[0]}<span class="mono">${s[1]}</span></div>`).join('');
      }
      return `<div class="ph-row" style="margin-bottom:6px"><span>Output mixer</span><span>EQ Flat</span></div><div class="ph-faders" style="grid-template-columns:repeat(4,1fr)">${fader('TRACK', .62)}${fader('SYNTH', .78)}${fader('FX PADS', .5)}${fader('MASTER', .72)}</div>`;
    }
    function render() {
      title.textContent = TITLES[page];
      [...dots.children].forEach((d, i) => d.classList.toggle('on', i === page));
      screen.innerHTML = pageHtml();
      const dr = $('phDrone');
      if (dr) dr.addEventListener('click', () => { droneOn = !droneOn; render(); });
    }
    function go(d) { page = (page + d + 5) % 5; render(); }
    $('phonePrev').addEventListener('click', () => go(-1));
    $('phoneNext').addEventListener('click', () => go(1));

    function run(on) {
      clearInterval(ticker);
      if (on && !reduceMotion) ticker = setInterval(() => { ci = (ci + 1) % 4; if (page === 0) render(); }, 2400);
    }
    whenVisible($('phone'), run);
    render();
  })();
})();
