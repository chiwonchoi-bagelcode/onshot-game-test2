export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smooth = (t: number) => t * t * (3 - 2 * t);
export const rand = (a: number, b: number) => a + Math.random() * (b - a);
export const randi = (a: number, b: number) => Math.floor(rand(a, b + 1));
export const pick = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];
export const easeOutBack = (t: number) => {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

/** Deterministic PRNG for repeatable level decoration. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seeded randomness for anything that affects physics (reset per level load) */
let seeded = mulberry32(1);
export function reseed(n: number) { seeded = mulberry32(n); }
export const srand = (a: number, b: number) => a + seeded() * (b - a);

export function formatWon(n: number): string {
  return '₩' + Math.round(n).toLocaleString('ko-KR');
}

/** hours of care → 3시간 / 4일 / 석 달 / 30년 */
export function formatHeart(h: number): string {
  if (h < 24) return `${Math.round(h)}시간`;
  const d = h / 24;
  if (d < 30) return `${Math.round(d)}일`;
  const m = d / 30;
  if (m < 12) return m < 1.5 ? '한 달' : m < 2.5 ? '두 달' : m < 3.5 ? '석 달' : `${Math.round(m)}개월`;
  const y = d / 365;
  return y >= 1e6 ? `${(y / 1e8).toFixed(0)}억 년` : `${Math.round(y)}년`;
}

export function damp(current: number, target: number, lambda: number, dt: number) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}
