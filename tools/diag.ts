/* Diagnosis: random play and "hit the priciest thing hardest" vs the stage goals. */
import RAPIER from '@dimforge/rapier3d-compat';
import { LEVELS } from '../src/levels/index';
import { Game } from '../src/game/Game';
import { explore, runPlan, NEUTRAL_CAT, type Action } from './sim';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
const ids = process.argv.slice(2);
console.log('id\trandWin\trand3★\trandMed\tgreedyWin\tgreedyScore\tstar2\tstar3\tprops\tpaws');
for (const lv of LEVELS.filter((l) => !ids.length || ids.includes(l.id))) {
  const e = explore(lv, 24, 7);
  // greedy: the most valuable reachable prop, hardest swat, best of 8 directions, per paw
  const g0 = new Game(RAPIER, noop, { headless: true }); g0.catDef = NEUTRAL_CAT; g0.load(lv);
  const cands = g0.props.filter((p) => p.interactable && g0.reachable(p)).sort((a, b) => b.value - a.value).map((p) => ({ kind: p.kind, pos: p.startPos.toArray() as [number, number, number] }));
  const n = g0.props.length; g0.unload();
  let plan: Action[] = [];
  let best = { score: 0, success: false };
  for (let k = 0; k < lv.paws && k < cands.length; k++) {
    let bk: { plan: Action[]; score: number; success: boolean } | null = null;
    for (let d = 0; d < 8; d++) {
      const ang = d * Math.PI / 4;
      const p = [...plan, { pick: cands[k].kind, near: cands[k].pos, dir: [Math.cos(ang), Math.sin(ang)] as [number, number], power: 1, at: 'mid' as const, wait: 2 }];
      const r = runPlan(lv, p);
      if (!bk || r.score > bk.score) bk = { plan: p, score: r.score, success: !!r.result?.success };
    }
    plan = bk!.plan; best = { score: bk!.score, success: bk!.success };
  }
  console.log([lv.id, (e.winRate * 100).toFixed(0) + '%', '', Math.round(e.median), best.success ? 'Y' : 'n', Math.round(best.score), lv.stars[0], lv.stars[1], n, lv.paws].join('\t'));
}
