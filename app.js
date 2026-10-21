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

  /* ───────────── Theme (light / dark, same tokens as the app) ───────────── */
  const SUN = 'M12 16a4 4 0 1 0 0-8a4 4 0 0 0 0 8z M12 2v2 M12 20v2 M4.9 4.9l1.4 1.4 M17.7 17.7l1.4 1.4 M2 12h2 M20 12h2 M4.9 19.1l1.4-1.4 M17.7 6.3l1.4-1.4';
  const MOON = 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z';
  const themeBtn = $('themeToggle');
  const root = document.documentElement;
  const cssVar = (n) => getComputedStyle(root).getPropertyValue(n).trim();
  const themeListeners = [];
  function paintThemeBtn() {
    const dark = root.getAttribute('data-theme') !== 'light';
    themeBtn.innerHTML = `<svg class="ico" width="18" height="18" viewBox="0 0 24 24"><path d="${dark ? SUN : MOON}"/></svg>`;
    themeBtn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
  themeBtn.addEventListener('click', () => {
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('lw-theme', next); } catch (e) {}
    paintThemeBtn();
    themeListeners.forEach((f) => f());
  });
  paintThemeBtn();

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
    const canvas = $('heroWaveCanvas'), wave = $('heroWave'), playhead = $('heroPlayhead'), loop = $('heroLoop');
    const timeEl = $('heroTime'), btn = $('heroPlay'), icon = $('heroPlayIcon');
    const LOOP_A = 0.36, LOOP_B = 0.52, TOTAL = 276;
    const PLAY = 'M7 4.5v15l12.5-7.5z', PAUSE = 'M6 5h4.5v14H6z M13.5 5H18v14h-4.5z';
    const prog = [['E/G#', '1/3'], ['B', '5'], ['A', '4'], ['Bsus4', '5sus']];

    const N = 150, env = [];
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
      const bw = w / N, accent = cssVar('--accent'), dim = cssVar('--wave-dim');
      const mid = h / 2;
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const bh = Math.max(3, env[i] * (h * .8));
        ctx.fillStyle = t < pos ? accent : dim;
        const x = i * bw + 1, bwid = Math.max(1.5, bw - 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, mid - bh / 2, bwid, bh, bwid / 2); else ctx.rect(x, mid - bh / 2, bwid, bh);
        ctx.fill();
      }
    }
    loop.style.left = LOOP_A * 100 + '%';
    loop.style.width = (LOOP_B - LOOP_A) * 100 + '%';

    const chordEl = $('heroChord'), nextEl = $('heroNext'), nashEl = $('heroNash'), nashNextEl = $('heroNashNext'), barEl = $('heroBar'), beatN = $('heroBeatN'), ring = $('heroRing');
    const mm = (sec) => String(Math.floor(sec / 60)).padStart(2, '0') + ':' + (sec % 60).toFixed(1).padStart(4, '0');

    let pos = LOOP_A + .03, playing = !reduceMotion, visible = true, last = 0, lastIdx = -1, lastDraw = 0;
    function render() {
      playhead.style.left = `calc(${pos * 100}% - 1px)`;
      timeEl.innerHTML = `${mm(pos * TOTAL)} <i>/ ${mm(TOTAL)}</i>`;
      const span = (pos - LOOP_A) / (LOOP_B - LOOP_A);
      const idx = Math.min(3, Math.max(0, Math.floor(span * 4)));
      const frac = (span * 4) % 1;
      beatN.textContent = 4 - Math.min(3, Math.floor(frac * 4));
      ring.style.strokeDashoffset = (150.8 * frac).toFixed(1);
      if (idx !== lastIdx) {
        lastIdx = idx;
        const c = prog[idx], n = prog[(idx + 1) % 4];
        chordEl.textContent = c[0]; nashEl.textContent = c[1];
        nextEl.textContent = n[0]; nashNextEl.textContent = n[1];
        barEl.textContent = `Chorus · bar ${idx + 1}/4`;
      }
    }
    function setPlaying(p) { playing = p; icon.innerHTML = `<path d="${p ? PAUSE : PLAY}"/>`; }
    btn.addEventListener('click', () => setPlaying(!playing));
    setPlaying(playing);
    drawWave(); render();
    window.addEventListener('resize', drawWave);
    themeListeners.push(drawWave);

    document.querySelectorAll('#heroMixer .vf').forEach((g) => {
      const v = parseFloat(g.dataset.v);
      g.querySelector('.vtrack i').style.height = v * 100 + '%';
      g.querySelector('.vtrack b').style.bottom = v * 100 + '%';
    });

    function frame(ts) {
      requestAnimationFrame(frame);
      if (!visible) { last = ts; return; }
      const dt = Math.min(.1, (ts - last) / 1000); last = ts;
      if (playing) {
        pos += (dt * 1.1) / TOTAL;
        if (pos > LOOP_B) pos = LOOP_A;
        render();
        if (ts - lastDraw > 120) { lastDraw = ts; drawWave(); }
      }
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
  const PAD_COLORS = ['#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#64D2FF', '#0A84FF', '#5E5CE6', '#FF375F'];
  const padColor = (i) => PAD_COLORS[i % 8];

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
    const tabs = $('bankTabs'), grid = $('padGrid');
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
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'fx-pad-btn';
        b.style.setProperty('--pc', padColor(i));
        b.innerHTML = `<span class="pn">${bank}${i + 1}</span><span class="pl">${name}</span>`;
        b.addEventListener('pointerdown', (e) => { e.preventDefault(); trigger(b, bank, i, sample); });
        b.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); trigger(b, bank, i, sample); } });
        grid.appendChild(b);
      });
    }
    function trigger(el, k, i, sample) {
      el.classList.remove('hit'); void el.offsetWidth; el.classList.add('hit');
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
      c2.strokeStyle = cssVar('--sep'); c2.lineWidth = 1; c2.beginPath();
      for (let x = 0; x <= w; x += w / 8) { c2.moveTo(x, 0); c2.lineTo(x, h); }
      for (let y = 0; y <= h; y += h / 4) { c2.moveTo(0, y); c2.lineTo(w, y); }
      c2.stroke();
      c2.strokeStyle = cssVar('--accent'); c2.lineWidth = 2; c2.shadowColor = cssVar('--tint2'); c2.shadowBlur = 8; c2.beginPath();
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

  /* ───────────── Phone remote preview ───────────── */
  (function phone() {
    const screen = $('phoneScreen'), tabbar = $('tabbar'), title = document.querySelector('.phone-title');
    const TABS = [
      ['Stage', 'M9 18V5l12-2v13 M9 18a3 3 0 1 1-6 0a3 3 0 0 1 6 0z M21 16a3 3 0 1 1-6 0a3 3 0 0 1 6 0z'],
      ['Pads', 'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z'],
      ['Mix', 'M6 4v16 M12 4v16 M18 4v16 M4 15h4 M10 8h4 M16 13h4'],
      ['Parts', 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5'],
      ['Song', 'M9 6h11 M9 12h11 M9 18h7 M4 6h.01 M4 12h.01 M4 18h.01']
    ];
    const prog = [['E/G#', '1/3'], ['B', '5'], ['A', '4'], ['Bsus4', '5sus']];
    let page = 0, ci = 1, beat = 0, droneOn = false, ticker = null;

    TABS.forEach(([name, d], i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.setAttribute('role', 'tab');
      b.innerHTML = `<svg class="ico" width="19" height="19" viewBox="0 0 24 24"><path d="${d}"/></svg>${name}`;
      b.addEventListener('click', () => { page = i; render(); });
      tabbar.appendChild(b);
    });

    const vf = (label, v, db, on) => `<div class="vf"><span class="lbl2 ${on ? 'on' : ''}">${label}</span><div class="vtrack" style="min-height:150px"><i style="height:${v * 100}%"></i><b style="bottom:${v * 100}%"></b></div><span class="num">${db}</span></div>`;
    const pvf = (label, v) => `<div class="vf"><div class="vtrack" style="min-height:150px"><i style="height:${v * 100}%"></i><b style="bottom:${v * 100}%;width:20px;margin-left:-10px;height:14px"></b></div><span class="lbl2" style="font-size:9.5px">${label}</span></div>`;
    function pageHtml() {
      if (page === 0) {
        const c = prog[ci], n = prog[(ci + 1) % 4], frac = beat / 4;
        return `
        <div class="ph-card" style="padding:10px 18px 14px">
          <div class="lbl" style="text-align:center">Playing</div>
          <div class="ph-chord">${c[0]}</div>
          <div class="ph-nash"><span class="nash">${c[1]}</span></div>
        </div>
        <div class="ph-card ph-nextrow"><div class="ring"><svg viewBox="0 0 56 56"><circle class="t" cx="28" cy="28" r="24"/><circle class="p" cx="28" cy="28" r="24" stroke-dasharray="150.8" stroke-dashoffset="${(150.8 * frac).toFixed(1)}"/></svg><b>${4 - beat}</b></div><div><span class="lbl">Next</span><strong>${n[0]}</strong></div></div>
        <div class="ph-card" style="padding:12px 16px"><div class="ph-drone"><span><b>Drone pad</b><span class="faint">${droneOn ? 'On' : 'Off'}</span></span><button class="switch" id="phDrone" type="button" role="switch" aria-checked="${droneOn}" aria-label="Drone pad"></button></div>
        <div class="ph-rootkeys">${['C', 'C♯', 'D', 'E♭', 'E', 'F'].map((k, i) => `<span class="${i === 4 ? 'on' : ''}">${k}</span>`).join('')}</div></div>`;
      }
      if (page === 1) {
        return `<div class="ph-pads">${BANKS.A[2].slice(0, 6).map(([nm], i) => `<div class="fx-pad-btn" style="--pc:${padColor(i)}"><span class="pn">A${i + 1}</span><span class="pl">${nm}</span></div>`).join('')}</div>`;
      }
      if (page === 2) {
        return `<div class="ph-faders">${vf('Track', .72, '-1.9')}${vf('Synth', .9, '0.0')}${vf('FX Pads', .55, '-1.4')}${vf('Master', .9, '0.0', true)}</div>`;
      }
      if (page === 3) {
        const v = [.7, .55, .62, .48, .66, .4, .58, .3];
        return `<div class="ph-faders parts">${v.map((x, i) => pvf('P' + (i + 1), x)).join('')}</div>`;
      }
      const songs = [['Opening Song', 'G · 72'], ['Slow Build', 'C · 64'], ['Your Song', 'E · 72'], ['Closing Anthem', 'A · 76']];
      return songs.map((x, i) => `<div class="ph-song ${i === 2 ? 'on' : ''}">${x[0]}<span class="num">${x[1]}</span></div>`).join('');
    }
    function render() {
      title.textContent = TABS[page][0];
      [...tabbar.children].forEach((b, i) => { b.classList.toggle('on', i === page); b.setAttribute('aria-selected', i === page); });
      screen.innerHTML = pageHtml();
      const dr = $('phDrone');
      if (dr) dr.addEventListener('click', () => { droneOn = !droneOn; render(); });
    }
    function run(on) {
      clearInterval(ticker);
      if (on && !reduceMotion) ticker = setInterval(() => { beat++; if (beat > 3) { beat = 0; ci = (ci + 1) % 4; } if (page === 0) render(); }, 600);
    }
    whenVisible($('phone'), run);
    render();
  })();
})();
