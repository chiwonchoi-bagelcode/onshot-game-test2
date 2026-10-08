/* Regression check: every stage's intended solutions still work (and the non-solutions still fail). */
import { runPlan } from './sim';
import { LEVELS } from '../src/levels/index';
import type { Case } from './cases/types';
import { CASES as C1 } from './cases/ch1';
import { CASES as C2 } from './cases/ch2';
import { CASES as C3 } from './cases/ch3';
import { CASES as C4 } from './cases/ch4';
import { CASES as C5 } from './cases/ch5';
import { CASES as C6 } from './cases/ch6';
import { CASES as C7 } from './cases/ch7';
import { CASES as C8 } from './cases/ch8';
import { CASES as C9 } from './cases/ch9';
import { CASES as C10 } from './cases/ch10';
import { CASES as C11 } from './cases/ch11';

const CASES: Case[] = [...C1, ...C2, ...C3, ...C4, ...C5, ...C6, ...C7, ...C8, ...C9, ...C10, ...C11];
const robust = process.argv.includes('--robust');
const only = process.argv.filter((a) => /^\d+(-\d)?$/.test(a));
const pick = (c: Case) => !only.length || only.some((o) => c.level === o || c.level.startsWith(o + '-'));

if (robust) {
  // jitter power / direction / timing like a real finger would
  for (const c of CASES) {
    if (!pick(c)) continue;
    const level = LEVELS.find((l) => l.id === c.level)!;
    let wins = 0, n = 0;
    for (let v = 0; v < 10; v++) {
      const j = (k: number) => Math.sin(v * 12.9898 + k * 78.233) * 0.5 + 0.5;
      const plan = c.plan.map((a, i) => {
        const ang = (j(i * 3) - 0.5) * 0.35;
        const ca = Math.cos(ang), sa = Math.sin(ang);
        return { ...a, power: Math.min(1, Math.max(0.3, a.power + (j(i * 3 + 1) - 0.5) * 0.25)), dir: [a.dir[0] * ca - a.dir[1] * sa, a.dir[0] * sa + a.dir[1] * ca] as [number, number], wait: (a.wait ?? 0.6) + j(i * 3 + 2) * 0.6 };
      });
      const r = runPlan(level, plan);
      const won = !!r.result?.success;
      if (won === (c.expect === 'win')) wins++;
      n++;
    }
    console.log(`${c.level} ${c.name.padEnd(44)} as-expected ${wins}/${n}`);
  }
  process.exit(0);
}

let fails = 0;
const covered = new Map<string, Set<number>>();
for (const c of CASES) {
  if (!pick(c)) continue;
  const level = LEVELS.find((l) => l.id === c.level);
  if (!level) { console.log(`FAIL ${c.level} missing level`); fails++; continue; }
  const r = runPlan(level, c.plan);
  const won = !!r.result?.success;
  const stars = r.result?.stars ?? 0;
  const chOk = (c.challenges ?? []).every((i) => r.challenges[i]);
  const ok = (c.expect === 'win') === won && (!c.minStars || stars >= c.minStars) && chOk;
  if (!ok) fails++;
  const set = covered.get(c.level) ?? new Set<number>();
  r.challenges.forEach((d, i) => { if (d) set.add(i); });
  covered.set(c.level, set);
  const chs = r.challenges.map((d) => (d ? '✔' : '·')).join('');
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.level} ${c.name.padEnd(44)} ${won ? 'won ' : 'lost'} ${'★'.repeat(stars).padEnd(3)} [${chs}] ₩${Math.round(r.score).toLocaleString()} x${r.result?.maxChain ?? 0}`);
}
// every challenge of every tested stage should be shown achievable by some case
for (const l of LEVELS) {
  if (only.length && !only.some((o) => l.id === o || l.id.startsWith(o + '-'))) continue;
  const set = covered.get(l.id);
  if (!set) { console.log(`WARN ${l.id} has no cases`); continue; }
  l.challenges.forEach((_, i) => { if (!set.has(i)) console.log(`WARN ${l.id} challenge #${i} never completed by a case`); });
}
console.log(fails ? `${fails} failing` : 'all stage solutions OK');
process.exit(fails ? 1 : 0);
