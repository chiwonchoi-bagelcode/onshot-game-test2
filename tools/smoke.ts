/* Smoke test: build test rooms with every new prop, let them settle, poke each one. */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game } from '../src/game/Game';
import * as C from '../src/game/catalog';
import * as C2 from '../src/game/catalog2';
import { bathroom, playroom, BATH, PLAY, rect } from '../src/levels/rooms';
import { buildHouse } from '../src/levels/house';
import type { LevelDef } from '../src/game/types';

await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });

const base = { chapter: 4, theme: 'bathroom' as const, title: 't', subtitle: '', paws: 3, goal: { kind: 'score' as const, amount: 1e9, text: '', short: '' }, stars: [1, 2] as [number, number], challenges: [], hints: [] };
const levels: LevelDef[] = [
  { ...base, id: 'bath', build(b) {
    bathroom(b);
    C2.soap(b, { at: [0.5, 0, 0.5] });
    C2.toiletPaper(b, { at: [1.5, 0, 1.0] });
    C2.phone(b, { at: [-2.0, BATH.tub.rim, -1.75] });
    C2.perfume(b, { at: [0.6, BATH.vanity.top, -2.8] });
    C2.shampoo(b, { at: [1.1, BATH.vanity.top, -2.8] });
    C2.toothCup(b, { at: [1.5, BATH.vanity.top, -2.7] });
    C2.hairDryer(b, { at: [0.3, BATH.vanity.top, -2.6], rot: Math.PI });
    C.rubberDuck(b, { at: [-2, 1.2, -2.4] });
    b.cat(2.5, 0, 2.5);
  } },
  { ...base, id: 'play', theme: 'playroom', build(b) {
    playroom(b);
    const top = C2.castle(b, [2.5, 0, 1.0], 'tower');
    C2.doll(b, { at: [2.5, top, 1.0], target: true });
    const t2 = C2.castle(b, [-0.5, 0, 3.0], 'bridge');
    C2.snowGlobe(b, { at: [-0.5, t2, 3.0] });
    C2.castle(b, [0.5, 0, -1.5], 'pyramid');
    C2.castle(b, [3.5, 0, -1.0], 'wall');
    C2.balloon(b, { at: [-2, 3.5, 1.5], anchor: [-2, 0.4, 1.5] });
    C2.jackBox(b, { at: [1.6, PLAY.shelf.top, -3.6] });
    C2.train(b, { at: [0, 0, 0], path: [[-3, 3.5], [3, 3.5], [3.5, 2.0]] });
    C2.plush(b, { at: [-3.5, PLAY.bed.top, -2] });
    b.cat(3.5, 0, 3.2);
  } },
  { ...base, id: 'hall', theme: 'house', build(b) {
    buildHouse(b, { rooms: [rect('hall', '복도', 0, 0, 12, 4, 'herring', 'hall')] });
    C2.coatRack(b, { at: [-4.5, 0, -1.2] });
    C2.umbrellaStand(b, { at: [-3.2, 0, -1.4] });
    C2.grandClock(b, { at: [0, 0, -1.4] });
    C2.aquarium(b, { at: [3, 1.2, -1.4] });
    C2.standFan(b, { at: [5, 0, 0], rot: -Math.PI / 2 });
    C2.shoe(b, { at: [-4, 0, 1] });
    C2.pillow(b, { at: [-1.5, 0, 1] });
    C2.guitar(b, { at: [1.5, 0, -1.6] });
    C2.cereal(b, { at: [2.0, 0, 1.0] });
    C2.milk(b, { at: [2.6, 0, 1.0] });
    C2.pan(b, { at: [4, 0, 1.2] });
    b.cat(0, 0, 1.5);
  } },
];

for (const lv of levels) {
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(lv);
  g.start();
  g.simulate(2);
  const rows: string[] = [];
  for (const p of g.props) {
    const t = p.body.translation();
    const moved = p.startPos.distanceTo(new THREE.Vector3(t.x, t.y, t.z));
    const v = p.body.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    if (moved > 0.15 || sp > 0.2 || p.broken || p.damaged || !p.alive) rows.push(`  ! ${p.name} ${p.kind} moved=${moved.toFixed(2)} v=${sp.toFixed(2)} broken=${p.broken || p.damaged} alive=${p.alive} y=${t.y.toFixed(2)}`);
  }
  console.log(`${lv.id}: ${g.props.length} props, settled issues: ${rows.length}`);
  if (rows.length) console.log(rows.join('\n'));
  // poke each special kind
  const seen = new Set<string>();
  for (const p of [...g.props]) {
    if (!p.alive || seen.has(p.kind) || !g.reachable(p)) continue;
    seen.add(p.kind);
    while (!g.canAct() && g.phase === 'ready') g.simulate(1 / 60);
    g.paws = 3;
    const c = p.center(new THREE.Vector3());
    g.swat(p, new THREE.Vector3(1, 0, 0.3).normalize(), 0.8, c);
    g.simulate(2.5);
  }
  console.log(`  after pokes: score ${g.score} broken ${g.brokenCount} discovered ${g.run.discovered.join(',')} counters ${JSON.stringify(g.run.counters).slice(0, 300)}`);
  g.unload();
}
