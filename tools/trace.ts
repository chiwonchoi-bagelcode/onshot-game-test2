// usage: tsx tools/_trace.ts LEVEL 'plan-json' kind1,kind2
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game } from '../src/game/Game';
import { LEVELS } from '../src/levels/index';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
const [, , id, planJson, kinds] = process.argv;
const g = new Game(RAPIER, noop, { headless: true });
g.on((e) => { if (e.type === 'score') console.log(`   t=${g.time.toFixed(2)} +${e.amount} @(${e.pos.x.toFixed(2)},${e.pos.y.toFixed(2)},${e.pos.z.toFixed(2)})`); if (e.type === 'word') console.log(`   t=${g.time.toFixed(2)} "${e.text}"`); });
g.load(LEVELS.find((l) => l.id === id)!); g.start(); g.simulate(1);
const watch = g.props.filter((p) => kinds.split(',').includes(p.kind));
const v = new THREE.Vector3();
const dump = (tag: string) => console.log(tag, watch.map((p) => { if (!p.alive) return `${p.kind}:X`; const t = p.body.translation(); p.up(v); return `${p.kind}(${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)} ${Math.round(Math.acos(Math.min(1, v.y)) * 57)}°)`; }).join(' '));
for (const a of JSON.parse(planJson)) {
  while (!g.canAct()) g.simulate(1 / 60);
  let cands = g.props.filter((p) => p.alive && p.kind === a.pick);
  if (a.near) cands.sort((x, y) => x.center(new THREE.Vector3()).distanceTo(new THREE.Vector3(...a.near)) - y.center(new THREE.Vector3()).distanceTo(new THREE.Vector3(...a.near)));
  const p = cands[0];
  const c = p.center(new THREE.Vector3()); const t = p.body.translation();
  const frac = a.at === 'top' ? 0.85 : a.at === 'low' ? 0.15 : 0.5;
  console.log(`> swat ${p.kind} at y ${(t.y + p.height * frac).toFixed(2)}`, g.swat(p, new THREE.Vector3(a.dir[0], 0, a.dir[1]).normalize(), a.power, new THREE.Vector3(c.x, t.y + p.height * frac, c.z)));
  for (let i = 0; i < (a.steps ?? 8); i++) { g.simulate(a.dt ?? 0.25); dump(`t=${g.time.toFixed(2)}`); }
}
