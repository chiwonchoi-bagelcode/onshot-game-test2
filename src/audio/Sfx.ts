import type { Mat } from '../game/types';

/* ------------------------------------------------------------------ */
/* All sound is synthesised with WebAudio – no asset files needed.     */
/* ------------------------------------------------------------------ */

export interface Loop { stop(): void; set?(v: number): void }

const PENTA = [0, 2, 4, 7, 9];

export class Sfx {
  ctx: AudioContext | null = null;
  private master!: GainNode;
  private bus!: GainNode;
  musicBus!: GainNode;
  private noiseBuf!: AudioBuffer;
  private last = new Map<string, number>();
  private voices = 0;
  muted = false;
  musicMuted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC({ latencyHint: 'interactive' });
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5;
    comp.attack.value = 0.003; comp.release.value = 0.2;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.9;
    this.bus = ctx.createGain(); this.bus.gain.value = 1;
    this.musicBus = ctx.createGain(); this.musicBus.gain.value = this.musicMuted ? 0 : 0.5;
    this.bus.connect(comp); this.musicBus.connect(comp);
    comp.connect(this.master); this.master.connect(ctx.destination);
    const len = ctx.sampleRate;
    this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // iOS needs a sound started inside the gesture
    const o = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = 0;
    o.connect(g); g.connect(this.master); o.start(); o.stop(ctx.currentTime + 0.02);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05);
  }

  setMusicMuted(m: boolean) {
    this.musicMuted = m;
    if (this.ctx) this.musicBus.gain.setTargetAtTime(m ? 0 : 0.5, this.ctx.currentTime, 0.1);
  }

  duckMusic(amount: number, time: number) {
    if (!this.ctx || this.musicMuted) return;
    const g = this.musicBus.gain, t = this.ctx.currentTime;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.5 * amount, t, 0.05);
    g.setTargetAtTime(0.5, t + time, 0.4);
  }

  private ok(key: string, gap: number): boolean {
    if (!this.ctx || this.muted) return false;
    const now = this.ctx.currentTime;
    const l = this.last.get(key) ?? -1;
    if (now - l < gap) return false;
    if (this.voices > 28) return false;
    this.last.set(key, now);
    return true;
  }

  private out(pan = 0): AudioNode {
    const ctx = this.ctx!;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-0.8, Math.min(0.8, pan));
      p.connect(this.bus);
      setTimeout(() => p.disconnect(), 3000);
      return p;
    }
    return this.bus;
  }

  private track(node: AudioScheduledSourceNode, end: number) {
    this.voices++;
    node.onended = () => { this.voices--; };
    node.stop(end);
  }

  tone(type: OscillatorType, f0: number, f1: number, t0: number, dur: number, vol: number, dest: AudioNode, attack = 0.004, curve: 'exp' | 'lin' = 'exp') {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) {
      if (curve === 'exp') o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      else o.frequency.linearRampToValueAtTime(f1, t0 + dur);
    }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(dest);
    o.start(t0);
    this.track(o, t0 + dur + 0.05);
    return o;
  }

  noise(t0: number, dur: number, vol: number, type: BiquadFilterType, f0: number, f1: number, q: number, dest: AudioNode, attack = 0.002) {
    const ctx = this.ctx!;
    const s = ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    s.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(dest);
    s.start(t0, Math.random() * 0.5);
    this.track(s, t0 + dur + 0.05);
  }

  /* ---------------------------- impacts ---------------------------- */

  impact(mat: Mat, k: number, pan = 0) {
    if (!this.ok('imp' + mat, 0.035)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    const v = Math.min(1, 0.18 + k * 0.85);
    const r = 0.9 + Math.random() * 0.2;
    switch (mat) {
      case 'wood':
        this.tone('sine', 190 * r, 70, t, 0.14, 0.55 * v, o);
        this.noise(t, 0.05, 0.25 * v, 'lowpass', 1600, 500, 1, o);
        break;
      case 'paper':
        this.tone('sine', 130 * r, 60, t, 0.1, 0.4 * v, o);
        this.noise(t, 0.09, 0.3 * v, 'bandpass', 1200, 600, 0.8, o);
        break;
      case 'ceramic':
        this.tone('sine', 2300 * r, 2200 * r, t, 0.09, 0.18 * v, o);
        this.tone('sine', 3400 * r, 3300 * r, t, 0.06, 0.1 * v, o);
        this.noise(t, 0.03, 0.2 * v, 'highpass', 2000, 2000, 1, o);
        break;
      case 'glass': case 'marble':
        this.tone('sine', 4200 * r, 4100 * r, t, 0.14, 0.13 * v, o);
        this.tone('sine', 6100 * r, 6000 * r, t, 0.09, 0.07 * v, o);
        break;
      case 'metal':
        for (const [m, a] of [[1, 0.3], [2.76, 0.18], [5.4, 0.1], [8.9, 0.05]] as const)
          this.tone('sine', 420 * r * m, 418 * r * m, t, 0.5 / Math.sqrt(m), a * v, o);
        this.noise(t, 0.02, 0.2 * v, 'highpass', 3000, 3000, 1, o);
        break;
      case 'plastic': case 'electronic':
        this.tone('triangle', 620 * r, 300, t, 0.07, 0.35 * v, o);
        this.noise(t, 0.025, 0.15 * v, 'bandpass', 2500, 2500, 2, o);
        break;
      case 'soft':
        this.tone('sine', 100 * r, 55, t, 0.12, 0.35 * v, o);
        this.noise(t, 0.1, 0.18 * v, 'lowpass', 500, 200, 1, o);
        break;
      case 'rubber':
        this.tone('sine', 260 * r, 520 * r, t, 0.06, 0.35 * v, o, 0.004, 'lin');
        this.tone('sine', 520 * r, 220 * r, t + 0.06, 0.12, 0.3 * v, o);
        break;
      case 'squeak':
        this.squeak(v, o);
        break;
      case 'egg': case 'food':
        this.tone('sine', 220 * r, 90, t, 0.08, 0.3 * v, o);
        break;
    }
  }

  private squeak(v: number, o: AudioNode) {
    const ctx = this.ctx!, t = ctx.currentTime;
    const osc = ctx.createOscillator(); osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.linearRampToValueAtTime(1500, t + 0.07);
    osc.frequency.linearRampToValueAtTime(1150, t + 0.2);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 38;
    const lg = ctx.createGain(); lg.gain.value = 60;
    lfo.connect(lg); lg.connect(osc.frequency);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.3 * v, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
    osc.connect(g); g.connect(o);
    osc.start(t); lfo.start(t);
    this.track(osc, t + 0.26); lfo.stop(t + 0.26);
  }

  /** big breaking sound by material */
  shatter(mat: Mat, k: number, pan = 0) {
    if (!this.ok('sh' + mat, 0.05)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    const v = Math.min(1, 0.5 + k * 0.6);
    switch (mat) {
      case 'glass': case 'marble': {
        this.noise(t, 0.35, 0.45 * v, 'highpass', 3500, 2500, 0.7, o);
        for (let i = 0; i < 12; i++) {
          const tt = t + Math.random() * 0.28;
          this.tone('sine', 3000 + Math.random() * 5000, 2800 + Math.random() * 4000, tt, 0.08 + Math.random() * 0.12, 0.08 * v, o);
        }
        this.tone('sine', 160, 60, t, 0.12, 0.3 * v, o);
        break;
      }
      case 'ceramic': {
        this.noise(t, 0.3, 0.6 * v, 'bandpass', 2600, 900, 0.9, o);
        this.noise(t, 0.08, 0.5 * v, 'lowpass', 900, 300, 1, o);
        this.tone('sine', 150, 50, t, 0.18, 0.55 * v, o);
        for (let i = 0; i < 8; i++) {
          const tt = t + 0.02 + Math.random() * 0.3;
          this.tone('sine', 1800 + Math.random() * 2800, 1700 + Math.random() * 2000, tt, 0.06 + Math.random() * 0.08, 0.1 * v, o);
        }
        break;
      }
      case 'egg': case 'food': {
        this.noise(t, 0.02, 0.4 * v, 'highpass', 3000, 3000, 1, o);
        this.noise(t + 0.01, 0.22, 0.55 * v, 'lowpass', 1400, 300, 1.5, o);
        this.tone('sine', 300, 80, t, 0.15, 0.4 * v, o);
        break;
      }
      case 'electronic': {
        this.tone('sawtooth', 120, 60, t, 0.35, 0.25 * v, o);
        this.noise(t, 0.25, 0.5 * v, 'bandpass', 1800, 900, 1, o);
        this.sparks(0.5, pan);
        break;
      }
      case 'paper': case 'soft': {
        this.noise(t, 0.5, 0.6 * v, 'lowpass', 1200, 200, 0.7, o);
        this.tone('sine', 110, 50, t, 0.25, 0.5 * v, o);
        break;
      }
      default:
        this.impact(mat, 1, pan);
    }
  }

  heavyThud(k: number, pan = 0) {
    if (!this.ok('thud', 0.06)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    const v = Math.min(1, 0.4 + k * 0.6);
    this.tone('sine', 95, 38, t, 0.35, 0.9 * v, o);
    this.noise(t, 0.2, 0.4 * v, 'lowpass', 500, 120, 1, o);
  }

  sparks(k = 1, pan = 0) {
    if (!this.ok('spark', 0.05)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    for (let i = 0; i < 10; i++) this.noise(t + Math.random() * 0.45, 0.012, 0.35 * k, 'highpass', 4000, 4000, 1, o);
    this.tone('square', 60, 60, t, 0.3, 0.06 * k, o);
  }

  splash(k = 1, pan = 0) {
    if (!this.ok('splash', 0.08)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    this.noise(t, 0.35, 0.5 * k, 'lowpass', 2200, 400, 0.8, o);
    for (let i = 0; i < 6; i++) {
      const tt = t + 0.05 + Math.random() * 0.3;
      const f = 400 + Math.random() * 600;
      this.tone('sine', f, f * 1.8, tt, 0.06, 0.12 * k, o, 0.003, 'lin');
    }
  }

  puff(k = 1, pan = 0) {
    if (!this.ok('puff', 0.08)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    this.noise(t, 0.6, 0.45 * k, 'lowpass', 900, 150, 0.6, o, 0.03);
  }

  coins(k = 1, pan = 0) {
    if (!this.ok('coins', 0.1)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.out(pan);
    for (let i = 0; i < 10; i++) {
      const tt = t + Math.random() * 0.5;
      const f = 2400 + Math.random() * 1800;
      this.tone('sine', f, f, tt, 0.18, 0.09 * k, o);
      this.tone('sine', f * 1.5, f * 1.5, tt, 0.1, 0.05 * k, o);
    }
  }

  /* ---------------------------- actions ---------------------------- */

  swat(power: number) {
    if (!this.ok('swat', 0.05)) return;
    const ctx = this.ctx!, t = ctx.currentTime, o = this.bus;
    this.noise(t, 0.13, 0.35 + power * 0.25, 'bandpass', 600, 3200, 1.2, o, 0.03);
    this.noise(t + 0.1, 0.035, 0.6, 'lowpass', 2500, 800, 1, o);
    this.tone('sine', 320, 140, t + 0.1, 0.08, 0.5, o);
  }

  whoosh(k = 1) {
    if (!this.ok('whoosh', 0.08)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    this.noise(t, 0.22, 0.25 * k, 'bandpass', 400, 1800, 1.5, this.bus, 0.06);
  }

  land() {
    if (!this.ok('land', 0.1)) return;
    const t = this.ctx!.currentTime;
    this.tone('sine', 140, 70, t, 0.07, 0.25, this.bus);
  }

  meow(kind: 'short' | 'long' | 'ask' | 'smug' | 'annoyed' = 'short') {
    if (!this.ok('meow', 0.25)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const shapes: Record<string, [number, number, number, number, number]> = {
      // start, peak, end, peakTime, dur
      short: [520, 760, 560, 0.08, 0.28],
      long: [480, 780, 420, 0.18, 0.75],
      ask: [470, 560, 820, 0.25, 0.42],
      smug: [430, 600, 380, 0.14, 0.55],
      annoyed: [380, 520, 300, 0.1, 0.45],
    };
    const [f0, fp, f1, tp, dur] = shapes[kind];
    const src = ctx.createOscillator(); src.type = 'sawtooth';
    src.frequency.setValueAtTime(f0, t);
    src.frequency.linearRampToValueAtTime(fp, t + tp);
    src.frequency.linearRampToValueAtTime(f1, t + dur);
    const vib = ctx.createOscillator(); vib.frequency.value = 6;
    const vg = ctx.createGain(); vg.gain.value = 9;
    vib.connect(vg); vg.connect(src.frequency);
    const mix = ctx.createGain(); mix.gain.value = 1;
    const formants: [number, number, number, number][] = [[700, 1000, 750, 0.9], [1500, 2300, 1300, 0.5], [3000, 3300, 2800, 0.15]];
    for (const [a, b, c, amp] of formants) {
      const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 7;
      f.frequency.setValueAtTime(a, t);
      f.frequency.linearRampToValueAtTime(b, t + tp);
      f.frequency.linearRampToValueAtTime(c, t + dur);
      const g = ctx.createGain(); g.gain.value = amp;
      src.connect(f); f.connect(g); g.connect(mix);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.linearRampToValueAtTime(0.9, t + 0.04);
    env.gain.setValueAtTime(0.9, t + dur * 0.7);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    mix.connect(env); env.connect(this.bus);
    src.start(t); vib.start(t);
    this.track(src, t + dur + 0.05); vib.stop(t + dur + 0.05);
  }

  purr(dur = 1.4) {
    if (!this.ok('purr', 0.5)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
    const am = ctx.createGain(); am.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(am.gain);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.linearRampToValueAtTime(0.8, t + 0.2);
    env.gain.setValueAtTime(0.8, t + dur - 0.3); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(am); am.connect(env); env.connect(this.bus);
    s.start(t); lfo.start(t);
    this.track(s, t + dur + 0.05); lfo.stop(t + dur + 0.05);
  }

  pop() {
    if (!this.ok('pop', 0.05)) return;
    const t = this.ctx!.currentTime;
    this.tone('sine', 900, 180, t, 0.07, 0.45, this.bus);
    this.tone('triangle', 300, 900, t + 0.04, 0.25, 0.18, this.bus, 0.004, 'lin');
  }

  boing() {
    if (!this.ok('boing', 0.08)) return;
    const ctx = this.ctx!, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'triangle';
    o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(520, t + 0.35);
    const lfo = ctx.createOscillator(); lfo.frequency.value = 18;
    const lg = ctx.createGain(); lg.gain.value = 40; lfo.connect(lg); lg.connect(o.frequency);
    const g = ctx.createGain(); g.gain.setValueAtTime(0.35, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
    o.connect(g); g.connect(this.bus); o.start(t); lfo.start(t);
    this.track(o, t + 0.42); lfo.stop(t + 0.42);
  }

  click() {
    if (!this.ok('click', 0.03)) return;
    const t = this.ctx!.currentTime;
    this.tone('sine', 1300, 900, t, 0.05, 0.22, this.bus);
  }

  select() {
    if (!this.ok('select', 0.03)) return;
    const t = this.ctx!.currentTime;
    this.tone('triangle', 660, 990, t, 0.08, 0.2, this.bus, 0.004, 'lin');
  }

  denied() {
    if (!this.ok('denied', 0.1)) return;
    const t = this.ctx!.currentTime;
    this.tone('square', 220, 180, t, 0.12, 0.08, this.bus);
    this.tone('square', 180, 150, t + 0.12, 0.14, 0.08, this.bus);
  }

  /** rising pentatonic pling – Nth step of a chain */
  chain(n: number) {
    if (!this.ok('chain', 0.045)) return;
    const t = this.ctx!.currentTime;
    const step = Math.min(n, 24);
    const semi = 12 * Math.floor(step / 5) + PENTA[step % 5];
    const f = 523.25 * Math.pow(2, semi / 12);
    this.tone('triangle', f, f, t, 0.22, 0.12, this.bus);
    this.tone('sine', f * 2, f * 2, t, 0.12, 0.05, this.bus);
  }

  target() {
    if (!this.ok('target', 0.1)) return;
    const t = this.ctx!.currentTime;
    [784, 988, 1175, 1568].forEach((f, i) => this.tone('triangle', f, f, t + i * 0.06, 0.25, 0.16, this.bus));
  }

  star(i: number) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const f = [659, 784, 1047][i] ?? 1047;
    this.tone('triangle', f, f, t, 0.4, 0.22, this.bus);
    this.tone('sine', f * 2, f * 2, t, 0.3, 0.1, this.bus);
    this.tone('sine', f * 3, f * 3, t + 0.02, 0.2, 0.05, this.bus);
  }

  fanfare() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => this.tone('square', f, f, t + i * 0.09, 0.18, 0.06, this.bus));
    for (const f of [523, 659, 784, 1047]) this.tone('triangle', f, f, t + 0.38, 0.8, 0.09, this.bus);
  }

  sting() {
    // dramatic "!?" when the owner sees the mess
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    this.noise(t, 0.5, 0.4, 'lowpass', 600, 200, 1, this.bus);
    for (const f of [146.8, 174.6, 207.6, 293.7]) this.tone('sawtooth', f, f * 0.98, t, 0.7, 0.07, this.bus);
    this.tone('sine', 880, 1760, t + 0.05, 0.25, 0.1, this.bus, 0.01, 'lin');
  }

  fail() {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    const notes = [392, 370, 349, 330];
    notes.forEach((f, i) => {
      const d = i === 3 ? 0.9 : 0.32;
      this.tone('sawtooth', f, i === 3 ? f * 0.94 : f, t + i * 0.34, d, 0.08, this.bus, 0.02);
    });
  }

  gasp() {
    if (!this.ok('gasp', 0.3)) return;
    const t = this.ctx!.currentTime;
    this.noise(t, 0.25, 0.25, 'bandpass', 1200, 2400, 2, this.bus, 0.05);
    this.tone('sine', 500, 900, t, 0.22, 0.12, this.bus, 0.02, 'lin');
  }

  /* ---------------------------- loops ---------------------------- */

  fizz(): Loop {
    if (!this.ctx || this.muted) return { stop() {} };
    const ctx = this.ctx, t = ctx.currentTime;
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 2500;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.35, t + 0.05);
    s.connect(f); f.connect(g); g.connect(this.bus); s.start(t);
    this.voices++;
    return {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.setTargetAtTime(0.0001, n, 0.08);
        s.stop(n + 0.4); s.onended = () => { this.voices--; };
      },
    };
  }

  ring(): Loop {
    if (!this.ctx || this.muted) return { stop() {} };
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 2093;
    const o2 = ctx.createOscillator(); o2.type = 'square'; o2.frequency.value = 2637;
    const gate = ctx.createGain(); gate.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 14;
    const lg = ctx.createGain(); lg.gain.value = 0.5;
    lfo.connect(lg); lg.connect(gate.gain);
    const g = ctx.createGain(); g.gain.value = 0.05;
    o.connect(gate); o2.connect(gate); gate.connect(g); g.connect(this.bus);
    o.start(t); o2.start(t); lfo.start(t);
    this.voices++;
    return {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.setTargetAtTime(0.0001, n, 0.03);
        for (const x of [o, o2, lfo]) x.stop(n + 0.2);
        o.onended = () => { this.voices--; };
      },
    };
  }

  motor(): Loop {
    if (!this.ctx || this.muted) return { stop() {} };
    const ctx = this.ctx, t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 85;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.2);
    const s = ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'bandpass'; nf.frequency.value = 1600; nf.Q.value = 2;
    const ng = ctx.createGain(); ng.gain.value = 0.06;
    o.connect(f); f.connect(g); s.connect(nf); nf.connect(ng); ng.connect(g); g.connect(this.bus);
    o.start(t); s.start(t);
    this.voices++;
    this.tone('sine', 880, 1320, t, 0.12, 0.12, this.bus, 0.004, 'lin');
    return {
      stop: () => {
        const n = ctx.currentTime;
        g.gain.setTargetAtTime(0.0001, n, 0.1);
        o.stop(n + 0.5); s.stop(n + 0.5);
        o.onended = () => { this.voices--; };
      },
      set: (v: number) => { o.frequency.setTargetAtTime(70 + v * 40, ctx.currentTime, 0.05); },
    };
  }

  zzz(): Loop {
    // owner snoring
    if (!this.ctx || this.muted) return { stop() {} };
    const ctx = this.ctx;
    let alive = true;
    const snore = () => {
      if (!alive || !this.ctx) return;
      const t = ctx.currentTime;
      this.noise(t, 1.1, 0.07, 'bandpass', 180, 320, 3, this.bus, 0.5);
      this.tone('sawtooth', 70, 85, t, 1.1, 0.025, this.bus, 0.5, 'lin');
      setTimeout(snore, 2600);
    };
    setTimeout(snore, 400);
    return { stop: () => { alive = false; } };
  }
}
