/* Sanity test of the meta layer: play every regression case through settle() on a fresh profile. */
import { runPlan } from './sim';
import { LEVELS } from '../src/levels/index';
import { freshProfile } from '../src/meta/profile';
import { settle, chapterOpen, totalStars } from '../src/meta/rewards';
import type { Case } from './cases/types';
import { CASES as C1 } from './cases/ch1';
import { CASES as C2 } from './cases/ch2';
import { CASES as C3 } from './cases/ch3';
import { CASES as C4 } from './cases/ch4';
import { CASES as C5 } from './cases/ch5';
import { CASES as C6 } from './cases/ch6';

const p = freshProfile();
const cases: Case[] = [...C1, ...C2, ...C3, ...C4, ...C5, ...C6].filter((c) => c.expect === 'win');
for (const c of cases) {
  const level = LEVELS.find((l) => l.id === c.level);
  if (!level) continue;
  const r = runPlan(level, c.plan);
  if (!r.result) continue;
  const s = settle(p, level, r.result, 'bonus2x');
  const extra = [...s.achievements.map((a) => '🏆' + a.name), ...s.unlocks.map((u) => '🔓' + u.kind + ':' + u.name), ...s.discoveries.map((d) => '✨' + d.name)];
  console.log(`${c.level} ${c.name.slice(0, 28).padEnd(28)} ★${s.stars} +${String(s.churu).padStart(3)} churu=${String(p.churu).padStart(4)} ${extra.join(' ')}`);
}
console.log('stars', totalStars(p), 'chapters open', [1, 2, 3, 4, 5, 6].filter((c) => chapterOpen(p, c)).join(','), 'cats', p.cats.join(','), 'ach', p.ach.length, 'disc', p.disc.length);
