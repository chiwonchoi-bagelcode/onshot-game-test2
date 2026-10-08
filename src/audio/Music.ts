import type { Sfx } from './Sfx';

/**
 * Tiny sneaky "cat burglar" groove: walking pizzicato bass, marimba
 * motif and soft hats. Scheduled with a look-ahead timer.
 */
export class Music {
  private timer: number | null = null;
  private step = 0;
  private nextTime = 0;
  private tempo = 104;
  private mood: 'play' | 'calm' = 'play';
  /** semitone shift + tempo per chapter, chain intensity 0..3 */
  private key = 0;
  intensity = 0;
  private intensityT = 0;

  setFlavor(chapter: number) {
    const flavors: [number, number][] = [[0, 104], [0, 104], [3, 110], [5, 98], [7, 116], [-2, 92], [2, 120], [5, 112], [0, 118], [-3, 124], [4, 116], [-5, 128]];
    const f = flavors[chapter] ?? flavors[0];
    this.key = f[0];
    this.tempo = f[1];
  }

  bump(chain: number) {
    this.intensity = Math.max(this.intensity, chain >= 20 ? 3 : chain >= 10 ? 2 : chain >= 4 ? 1 : 0);
    this.intensityT = 3;
  }

  constructor(private sfx: Sfx) {}

  start(mood: 'play' | 'calm' = 'play') {
    this.mood = mood;
    const ctx = this.sfx.ctx;
    if (!ctx) return;
    if (this.timer !== null) return;
    this.nextTime = ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.schedule(), 40);
  }

  setMood(m: 'play' | 'calm') { this.mood = m; }

  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }

  private schedule() {
    const ctx = this.sfx.ctx;
    if (!ctx) return;
    const spb = 60 / this.tempo / 4; // 16th notes
    if (this.intensityT > 0) { this.intensityT -= 0.04; if (this.intensityT <= 0) this.intensity = 0; }
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.play(this.step, this.nextTime);
      this.nextTime += spb * (this.step % 2 === 0 ? 1.12 : 0.88); // swing
      this.step = (this.step + 1) % 128;
    }
  }

  private play(s: number, t: number) {
    const sfx = this.sfx;
    const bus = sfx.musicBus;
    const bar = Math.floor(s / 16) % 8;
    const i = s % 16;
    // chord roots (semitones from A2) : Am  F  G  E | Am  Dm  E  E
    const roots = [0, -4, -2, -5, 0, 5, -5, -5];
    const root = 110 * Math.pow(2, (roots[bar] + this.key) / 12);
    const calm = this.mood === 'calm';
    const hot = this.intensity;
    // chaos layer: kick + low octave pulses that build with the chain
    if (!calm && hot >= 1 && i % 4 === 0) sfx.tone('sine', 110, 45, t, 0.18, 0.28 + hot * 0.06, bus, 0.002);
    if (!calm && hot >= 2 && i % 2 === 1) sfx.tone('square', root, root, t, 0.08, 0.05, bus, 0.003);
    if (!calm && hot >= 3 && (i === 3 || i === 11)) sfx.noise(t, 0.12, 0.16, 'bandpass', 2500, 1200, 1.5, bus);
    // walking bass on 8ths
    if (i % 4 === 0 || (!calm && i % 4 === 2 && (i === 6 || i === 14))) {
      const walk = [0, 7, 12, 7][(i / 4) | 0] ?? 0;
      const f = root * Math.pow(2, (i % 4 === 2 ? 10 : walk) / 12);
      sfx.tone('triangle', f, f * 0.995, t, 0.22, 0.32, bus, 0.005);
    }
    // hats
    if (!calm && i % 2 === 0) sfx.noise(t, 0.03, i % 4 === 2 ? 0.07 : 0.035, 'highpass', 7000, 7000, 1, bus);
    // snap on 2 & 4
    if (!calm && (i === 4 || i === 12)) sfx.noise(t, 0.06, 0.12, 'bandpass', 1800, 1500, 1.5, bus);
    // marimba motif (sneaky chromatic tag on bars 3 and 7)
    const motif: Record<number, number> = bar % 4 === 3
      ? { 0: 12, 3: 11, 6: 10, 8: 9, 11: 7 }
      : { 0: 12, 3: 15, 6: 12, 10: 19, 12: 17, 14: 15 };
    const n = motif[i];
    if (n !== undefined && (!calm || i % 6 === 0)) {
      const f = root * 2 * Math.pow(2, n / 12);
      sfx.tone('sine', f, f, t, 0.28, 0.13, bus, 0.003);
      sfx.tone('sine', f * 4, f * 4, t, 0.05, 0.03, bus, 0.002);
    }
  }
}
