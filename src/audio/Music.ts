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
    const root = 110 * Math.pow(2, roots[bar] / 12);
    const calm = this.mood === 'calm';
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
