/* Regression check: every level's intended solutions still work (and the non-solutions still fail). */
import { runPlan, type Action } from './sim';
import { LEVELS } from '../src/levels/levels';

type Case = { level: string; name: string; plan: Action[]; expect: 'win' | 'lose'; minStars?: number };
const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });

const CASES: Case[] = [
  { level: 'A1', name: 'direct vase', expect: 'win', plan: [{ pick: 'vase', dir: [0, 1], power: 0.8 }] },
  { level: 'A1', name: 'book domino', expect: 'win', minStars: 2, plan: [book([-1.05, 1.5, 0.55], [1, 0])] },
  { level: 'A1', name: 'domino + mug thrown at tea set', expect: 'win', minStars: 3, plan: [{ ...book([-1.05, 1.5, 0.55], [1, 0]), wait: 3 }, { pick: 'mug', near: [-0.55, 1.4, -0.1], dir: [1, 0.3], power: 0.9 }] },
  { level: 'A2', name: 'TV full-power top swat', expect: 'win', plan: [{ pick: 'tv', dir: [0, 1], power: 1, at: 'top' }] },
  { level: 'A2', name: 'TV weak swat does nothing', expect: 'lose', plan: [{ pick: 'tv', dir: [0, 1], power: 0.5, at: 'top' }, { pick: 'plant', dir: [1, 0], power: 0.3 }, { pick: 'cushion', dir: [0, 1], power: 0.3 }] },
  { level: 'A2', name: 'lamp -> shelf -> TV', expect: 'win', plan: [{ pick: 'lamp', dir: [1.6, -2.0], power: 1, at: 'top' }] },
  { level: 'A2', name: 'soda rocket -> shelf', expect: 'win', plan: [{ pick: 'soda', dir: [1.1, -3.8], power: 0.8 }] },
  { level: 'A3', name: 'shake bookshelf', expect: 'win', plan: [{ pick: 'bookshelf', dir: [1, 0], power: 1, at: 0.86 }] },
  { level: 'A3', name: 'double swat topples bookshelf', expect: 'win', minStars: 3, plan: [{ pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86, wait: 1.0 }, { pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86 }] },
  { level: 'B1', name: 'slow tablecloth pull', expect: 'win', minStars: 2, plan: [{ pick: 'cloth', dir: [0, 1], power: 0.4 }] },
  { level: 'B1', name: 'magician yank keeps dishes', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 1 }, { pick: 'toaster', dir: [0, 1], power: 0.3 }] },
  { level: 'B2', name: 'toaster pushed under shelf', expect: 'win', plan: [{ pick: 'toaster', dir: [0, -1], power: 0.5 }] },
  { level: 'B2', name: 'soda rocket into shelf', expect: 'win', plan: [{ pick: 'soda', dir: [0, -1], power: 0.8 }] },
  { level: 'B3', name: 'carton + rolling pin', expect: 'win', plan: [{ pick: 'carton', dir: [0, 1], power: 0.5, wait: 2 }, { pick: 'pin', dir: [0, 1], power: 0.6 }] },
  { level: 'C1', name: 'alarm + falling book', expect: 'win', plan: [{ pick: 'alarm', dir: [-1, 0], power: 0.6, wait: 4 }, book([-3, 3.6, -3.4], [0, 1], 0.4)] },
  { level: 'C1', name: 'plant + two books', expect: 'win', plan: [{ pick: 'plant', dir: [0, 1], power: 0.4, wait: 2 }, book([-3, 3.6, -3.4], [0, 1], 0.4), book([-2.7, 3.6, -3.4], [0, 1], 0.4)] },
  { level: 'C2', name: 'laptop slid off the end', expect: 'win', plan: [{ pick: 'laptop', dir: [1, 0], power: 0.6 }] },
  { level: 'C2', name: 'desk lamp sweep', expect: 'win', plan: [{ pick: 'deskLamp', dir: [-1, 0], power: 1 }] },
  { level: 'C2', name: 'laptop blocked by books', expect: 'lose', plan: [{ pick: 'laptop', dir: [0, 1], power: 0.6 }, { pick: 'cushion', dir: [1, 0], power: 0.3 }] },
  { level: 'C3', name: 'domino -> rocket -> shelf + two vases', expect: 'win', plan: [{ pick: 'domino', near: [-2.6, 0.3, 2.0], dir: [1, 0.3], power: 0.4, at: 'top', wait: 4 }, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
  { level: 'C3', name: 'piecemeal is not enough', expect: 'lose', plan: [{ pick: 'laptop', dir: [1, 0], power: 0.8, wait: 3 }, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
];

const robust = process.argv.includes('--robust');
const only = process.argv.find((a) => /^[ABC][123]$/.test(a));
if (robust) {
  // jitter power / direction / timing like a real finger would
  for (const c of CASES) {
    if (only && c.level !== only) continue;
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
      const won = !!r.result?.success || r.goal.done >= r.goal.need;
      if (won === (c.expect === 'win')) wins++;
      n++;
    }
    console.log(`${c.level} ${c.name.padEnd(40)} as-expected ${wins}/${n}`);
  }
  process.exit(0);
}

let fails = 0;
for (const c of CASES) {
  if (only && c.level !== only) continue;
  const level = LEVELS.find((l) => l.id === c.level)!;
  const r = runPlan(level, c.plan);
  const won = !!r.result?.success || r.goal.done >= r.goal.need;
  const stars = r.result?.stars ?? 0;
  const ok = (c.expect === 'win') === won && (!c.minStars || stars >= c.minStars);
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${c.level} ${c.name.padEnd(40)} ${won ? 'won' : 'lost'} ${'★'.repeat(stars)} ₩${Math.round(r.score).toLocaleString()}`);
}
console.log(fails ? `${fails} failing` : 'all level solutions OK');
process.exit(fails ? 1 : 0);
