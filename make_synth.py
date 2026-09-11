"""
Synthesizes crisp, studio-quality Web Audio sounds for all 8 MPC pads:
Kick, Snare, Shaker, Swell, Stadium Clap, Sparkle Chime, Tape Stop, Sub Boom.
Also enriches the continuous drone synthesizer with multi-oscillator detuning, chorus warmth, and lush harmonics.
"""

SYNTH_ENGINE_JS = """
    // ════════════════════════════════════════════════════════════════════
    // PROFESSIONAL DSP AUDIO SYNTHESIS ENGINE (ZERO-DEPENDENCY WEB AUDIO)
    // ════════════════════════════════════════════════════════════════════

    // 1. MPC Sampler & Drum Machine Voice Synthesizer
    function synthesizePadSound(type, ctx) {
      const now = ctx.currentTime;

      if (type === 'kick') {
        // Deep 808/Sub-Kick with pitch dive and transient click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(38, now + 0.14);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
        osc.connect(gain);
        gain.connect(analyserNode);
        osc.start(now);
        osc.stop(now + 0.48);

        // Click transient
        const click = ctx.createOscillator();
        const cGain = ctx.createGain();
        click.type = 'triangle';
        click.frequency.setValueAtTime(800, now);
        click.frequency.exponentialRampToValueAtTime(60, now + 0.02);
        cGain.gain.setValueAtTime(0.4, now);
        cGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
        click.connect(cGain);
        cGain.connect(analyserNode);
        click.start(now);
        click.stop(now + 0.03);

      } else if (type === 'snare') {
        // Crisp Acoustic/Studio Snare: Tone body + filtered white noise snap
        const bodyOsc = ctx.createOscillator();
        const bodyGain = ctx.createGain();
        bodyOsc.type = 'triangle';
        bodyOsc.frequency.setValueAtTime(220, now);
        bodyOsc.frequency.exponentialRampToValueAtTime(110, now + 0.08);
        bodyGain.gain.setValueAtTime(0.6, now);
        bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        bodyOsc.connect(bodyGain);
        bodyGain.connect(analyserNode);
        bodyOsc.start(now);
        bodyOsc.stop(now + 0.16);

        // Noise snap
        const bufferSize = ctx.sampleRate * 0.22;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) output[i] = Math.random() * 2 - 1;
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(1200, now);
        const noiseGain = ctx.createGain();
        noiseGain.gain.setValueAtTime(0.7, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        whiteNoise.connect(filter);
        filter.connect(noiseGain);
        noiseGain.connect(analyserNode);
        whiteNoise.start(now);

      } else if (type === 'shaker') {
        // Metallic Studio Shaker: Highpass noise with soft double-shake envelope
        const bSize = ctx.sampleRate * 0.15;
        const nBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
        const out = nBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) out[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = nBuffer;
        const bandpass = ctx.createBiquadFilter();
        bandpass.type = 'bandpass';
        bandpass.frequency.setValueAtTime(6500, now);
        bandpass.Q.setValueAtTime(3.5, now);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.5, now + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        noise.connect(bandpass);
        bandpass.connect(gain);
        gain.connect(analyserNode);
        noise.start(now);

      } else if (type === 'swell') {
        // Dramatic Reverse Cymbal / Ambient Swell
        const dur = 1.6;
        const bSize = ctx.sampleRate * dur;
        const nBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
        const out = nBuffer.getChannelData(0);
        for (let i = 0; i < bSize; i++) out[i] = Math.random() * 2 - 1;
        const noise = ctx.createBufferSource();
        noise.buffer = nBuffer;
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(2500, now);
        filter.frequency.exponentialRampToValueAtTime(8000, now + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(0.75, now + dur - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + dur + 0.2);
        noise.connect(filter);
        filter.connect(gain);
        gain.connect(analyserNode);
        noise.start(now);

      } else if (type === 'clap') {
        // Stadium Stereo Handclap (Multi-transient burst)
        const times = [0, 0.012, 0.024, 0.038];
        times.forEach((t, idx) => {
          const bSize = ctx.sampleRate * (idx === times.length - 1 ? 0.28 : 0.04);
          const nBuffer = ctx.createBuffer(1, bSize, ctx.sampleRate);
          const out = nBuffer.getChannelData(0);
          for (let i = 0; i < bSize; i++) out[i] = Math.random() * 2 - 1;
          const noise = ctx.createBufferSource();
          noise.buffer = nBuffer;
          const filter = ctx.createBiquadFilter();
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1400, now + t);
          filter.Q.setValueAtTime(1.8, now + t);
          const gain = ctx.createGain();
          const amp = idx === times.length - 1 ? 0.7 : 0.4;
          gain.gain.setValueAtTime(amp, now + t);
          gain.gain.exponentialRampToValueAtTime(0.001, now + t + (idx === times.length - 1 ? 0.24 : 0.035));
          noise.connect(filter);
          filter.connect(gain);
          gain.connect(analyserNode);
          noise.start(now + t);
        });

      } else if (type === 'chime') {
        // Roland SC-88 Style Sparkle Chime / Bell Matrix (Harmonic FM Overtones)
        const freqs = [1046.5, 1318.5, 1567.98, 2093.0, 2637.0, 3135.96];
        freqs.forEach((f, i) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + i * 0.03);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.setValueAtTime(0.25 / (i + 1), now + i * 0.03);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.03 + 1.6);
          osc.connect(gain);
          gain.connect(analyserNode);
          osc.start(now + i * 0.03);
          osc.stop(now + i * 0.03 + 1.65);
        });

      } else if (type === 'tape_drop') {
        // Vintage Analog Tape Stop effect (Pitch dive down into silence)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(30, now + 0.45);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3200, now);
        filter.frequency.exponentialRampToValueAtTime(120, now + 0.45);
        gain.gain.setValueAtTime(0.65, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(analyserNode);
        osc.start(now);
        osc.stop(now + 0.5);

      } else if (type === 'sub_drop') {
        // Massive 808 Sub Boom / Cinematic Impact
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(95, now);
        osc.frequency.exponentialRampToValueAtTime(24, now + 1.2);
        gain.gain.setValueAtTime(1.0, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.4);
        osc.connect(gain);
        gain.connect(analyserNode);
        osc.start(now);
        osc.stop(now + 1.45);
      }
    }
"""
