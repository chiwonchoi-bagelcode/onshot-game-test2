/* Virtual time: the trailer advances time frame by frame, so every timer the game
   uses (owner reactions, delayed sounds) must follow simulated time, not wall time. */

type Timer = { id: number; at: number; fn: () => void };

let now = 0;
let nextId = 1;
let timers: Timer[] = [];

export const vclock = {
  get now() { return now; },
  reset() { now = 0; timers = []; },
  /** advance virtual milliseconds, firing due timers in order */
  advance(ms: number) {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at || a.id - b.id);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift();
      now = Math.max(now, t.at);
      t.fn();
    }
    now = end;
  },
};

export function installVirtualTime() {
  const w = window as unknown as Record<string, unknown>;
  w.setTimeout = ((fn: (...a: unknown[]) => void, ms = 0, ...args: unknown[]) => {
    const id = nextId++;
    timers.push({ id, at: now + Math.max(0, Number(ms) || 0), fn: () => fn(...args) });
    return id;
  }) as unknown;
  w.clearTimeout = ((id: number) => { timers = timers.filter((t) => t.id !== id); }) as unknown;
  performance.now = () => now;
}
