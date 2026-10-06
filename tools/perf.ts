/* Logic + physics cost per frame for every stage under a busy random plan (headless). */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game } from '../src/game/Game';
import { LEVELS } from '../src/levels/index';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
const only = process.argv.slice(2);
for (const lv of LEVELS) {
  if (only.length && !only.includes(lv.id)) continue;
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(lv); g.start(); g.simulate(1);
  let worst = 0, total = 0, n = 0, maxBodies = 0, maxFrag = 0;
  let s = 7;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 60 * 12; i++) {
    if (i % 150 === 0 && g.canAct()) {
      const cands = g.props.filter((p) => p.alive && p.interactable && g.reachable(p));
      const p = cands[Math.floor(rnd() * cands.length)];
      if (p) { const c = p.center(new THREE.Vector3()); const a = rnd() * Math.PI * 2; g.paws = Math.max(g.paws, 1); g.swat(p, new THREE.Vector3(Math.cos(a), 0, Math.sin(a)), 1, c); }
    }
    const t0 = performance.now();
    g.update(1 / 60 + 1e-7);
    const e = performance.now() - t0;
    worst = Math.max(worst, e); total += e; n++;
    maxBodies = Math.max(maxBodies, g.world.bodies.len());
    maxFrag = Math.max(maxFrag, g.debris.activeCount);
  }
  console.log(`${lv.id.padEnd(4)} avg ${(total / n).toFixed(2)}ms worst ${worst.toFixed(1)}ms  bodies ${maxBodies} frags ${maxFrag} props ${g.props.length}`);
  g.unload();
}
