/* Sanity test of the meta layer: play every regression case through settle() on a fresh profile. */
import { runPlan } from './sim';
import { CHAPTERS, LEVELS, REMIXES, levelById } from '../src/levels/index';
import { freshProfile } from '../src/meta/profile';
import { settle, chapterOpen, homeDone, stageOpen, totalStars } from '../src/meta/rewards';
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
import { CASES as CR } from './cases/remix';

const p = freshProfile();
let bad = 0;
const check = (ok: boolean, what: string) => { if (!ok) { bad++; console.log('  ✗ ' + what); } };
// play the way a player would: stage by stage, in order
const order = [...LEVELS, ...REMIXES].map((l) => l.id);
const cases: Case[] = [...C1, ...C2, ...C3, ...C4, ...C5, ...C6, ...C7, ...C8, ...C9, ...C10, ...C11, ...CR].filter((c) => c.expect === 'win').sort((a, b) => order.indexOf(a.level) - order.indexOf(b.level));
let doors = 0, ends = 0;
for (const c of cases) {
  const level = levelById(c.level);
  if (!level) continue;
  if (!stageOpen(p, level)) { check(false, `${c.level} played while still locked`); continue; }
  const r = runPlan(level, c.plan);
  if (!r.result) continue;
  const s = settle(p, level, r.result, 'bonus2x');
  if (s.doorOpened) { doors++; p.outside = true; }
  if (s.worldEnd) ends++;
  const extra = [...s.achievements.map((a) => '🏆' + a.name), ...s.unlocks.map((u) => '🔓' + u.kind + ':' + u.name), ...s.discoveries.map((d) => '✨' + d.name), s.doorOpened ? '🚪DOOR' : '', s.worldEnd ? '🪐END' : ''].filter(Boolean);
  console.log(`${c.level.padEnd(4)} ${c.name.slice(0, 28).padEnd(28)} ★${s.stars} +${String(s.churu).padStart(3)} churu=${String(p.churu).padStart(5)} ${extra.join(' ')}`);
}
check(homeDone(p), 'house done');
check(doors === 1, `door opened exactly once (${doors})`);
check(ends === 1, `world ended exactly once (${ends})`);
check(p.tricks.includes('hairball') && p.tricks.includes('knead'), 'both tricks granted');
check(CHAPTERS.every((c) => chapterOpen(p, c.id)), 'every chapter open');
console.log('stars', totalStars(p), 'chapters open', CHAPTERS.filter((c) => chapterOpen(p, c.id)).map((c) => c.id).join(','), 'cats', p.cats.join(','), 'ach', p.ach.length, 'disc', p.disc.length, 'tricks', p.tricks.join(','));
console.log(bad ? `${bad} meta problems` : 'meta OK');
process.exit(bad ? 1 : 0);
