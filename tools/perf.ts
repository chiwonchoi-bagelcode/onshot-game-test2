import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game } from '../src/game/Game';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
for (const id of ['A3', 'B1', 'C3']) {
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(LEVELS.find((l) => l.id === id)!); g.start(); g.simulate(1);
  const plans: Record<string, [string, number[], number, number]> = {
    A3: ['bookshelf', [1, 0], 1, 0.86], B1: ['cloth', [0, 1], 0.4, 0.5], C3: ['domino', [1, 0.3], 0.4, 0.85],
  };
  const [k, d, pw, fr] = plans[id];
  let p = g.props.filter((x) => x.kind === k)[0];
  if (id === 'C3') p = g.props.filter((x) => x.kind === k).sort((a, b) => a.startPos.x - b.startPos.x)[0];
  const t = p.body.translation(); const c = p.center(new THREE.Vector3());
  g.swat(p, new THREE.Vector3(d[0], 0, d[1]).normalize(), pw, new THREE.Vector3(c.x, t.y + p.height * fr, c.z));
  if (id === 'A3') { g.simulate(0.9); const t2 = p.body.translation(); g.swat(p, new THREE.Vector3(1, 0, 0), 1, new THREE.Vector3(t2.x, 4.6, t2.z)); }
  let worst = 0, total = 0, n = 0, maxBodies = 0, maxFrag = 0;
  for (let i = 0; i < 60 * 8; i++) {
    const s = performance.now();
    g.update(1 / 60 + 1e-7);
    const e = performance.now() - s;
    worst = Math.max(worst, e); total += e; n++;
    maxBodies = Math.max(maxBodies, g.world.bodies.len());
    maxFrag = Math.max(maxFrag, g.debris.activeCount);
  }
  console.log(`${id}: avg ${(total / n).toFixed(2)}ms worst ${worst.toFixed(2)}ms per frame (logic+physics), bodies ${maxBodies}, frags ${maxFrag}, props ${g.props.length}, score ${g.score}`);
}
