/* Print layout info for a stage (headless): room bounds, cat, owner, and every prop. */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game } from '../../src/game/Game';
import { LEVELS } from '../../src/levels/index';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
for (const id of process.argv.slice(2)) {
  const lv = LEVELS.find((l) => l.id === id)!;
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(lv); g.start(); g.simulate(0.5);
  const f = (v: { x: number; y: number; z: number }) => `${v.x.toFixed(1)},${v.y.toFixed(1)},${v.z.toFixed(1)}`;
  console.log(`== ${id} ${lv.title} theme=${lv.theme} bounds=${JSON.stringify(g.roomBounds)} wallH=${g.wallH} cat=${f(g.catHome)} owner=${g.owner ? g.owner.mode + '@' + f(g.owner.group.position) : '-'} rooms=${g.roomLabels.map((r) => r.name + '@' + f(r.pos)).join(' ')}`);
  const groups = new Map<string, string[]>();
  for (const p of g.props) {
    const k = `${p.name}${p.target ? '🎯' : ''}${p.interactable ? '' : '🚫'}`;
    const arr = groups.get(k) ?? [];
    arr.push(f(p.center(new THREE.Vector3())));
    groups.set(k, arr);
  }
  const all = process.env.ALL === "1";
  for (const [k, v] of groups) console.log(`  ${k} ×${v.length}: ${(all ? v : v.slice(0, 6)).join(" | ")}${!all && v.length > 6 ? " …" : ""}`);
  g.unload();
}
