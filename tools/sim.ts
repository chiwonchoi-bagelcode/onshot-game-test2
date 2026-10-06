/* Headless level simulator: runs scripted or random swat plans through the real game logic. */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Game, type Result } from '../src/game/Game';
import { LEVELS } from '../src/levels/levels';
import type { Prop } from '../src/game/Prop';
import type { LevelDef } from '../src/game/types';

await RAPIER.init();

const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });

export interface Action {
  /** prop kind or name; optional index or nearest position */
  pick: string;
  near?: [number, number, number];
  /** world dir in xz */
  dir: [number, number];
  power: number;
  /** 'top' | 'mid' | 'low' or absolute fraction of height */
  at?: 'top' | 'mid' | 'low' | number;
  /** seconds to wait after this action before the next */
  wait?: number;
}

export interface SimOut {
  result: Result | null;
  score: number;
  goal: { done: number; need: number };
  broken: string[];
  events: number;
  log: string[];
}

function findProp(g: Game, a: Action): Prop | null {
  let cands = g.props.filter((p) => p.alive && p.interactable && (p.kind === a.pick || p.name === a.pick));
  if (!cands.length) return null;
  if (a.near) {
    const n = new THREE.Vector3(...a.near);
    cands.sort((x, y) => x.center(new THREE.Vector3()).distanceTo(n) - y.center(new THREE.Vector3()).distanceTo(n));
  }
  return cands[0];
}

export function runPlan(level: LevelDef, plan: Action[], verbose = false): SimOut {
  const g = new Game(RAPIER, noop, { headless: true });
  const log: string[] = [];
  let result: Result | null = null;
  const broken: string[] = [];
  let events = 0;
  g.on((e) => {
    if (e.type === 'end') result = e.result;
    if (e.type === 'score') { events++; if (verbose) log.push(`  +${e.amount} (chain ${e.chain}) @${e.pos.x.toFixed(1)},${e.pos.y.toFixed(1)},${e.pos.z.toFixed(1)}`); }
    if (e.type === 'word' && verbose) log.push(`  word ${e.text}`);
    if (e.type === 'toast') log.push(`  toast ${e.text}`);
  });
  g.load(level);
  g.start();
  for (const p of g.props) if (p.breakable) { const orig = p.breakable; void orig; }
  g.simulate(1.0);
  const startBroken = new Set<number>();
  for (const a of plan) {
    // wait until cat idle
    let guard = 0;
    while (!g.canAct() && guard++ < 600 && g.phase === 'ready') g.simulate(1 / 60);
    if (g.phase !== 'ready') break;
    const p = findProp(g, a);
    if (!p) { log.push(`! no prop ${a.pick}`); continue; }
    const c = p.center(new THREE.Vector3());
    const t = p.body.translation();
    const frac = a.at === 'top' ? 0.85 : a.at === 'low' ? 0.15 : a.at === 'mid' || a.at === undefined ? 0.5 : a.at;
    const hit = new THREE.Vector3(c.x, t.y + p.height * frac, c.z);
    const dir = new THREE.Vector3(a.dir[0], 0, a.dir[1]).normalize();
    const ok = g.swat(p, dir, a.power, hit);
    if (verbose) log.push(`> swat ${p.name}#${p.id} dir(${a.dir}) pw ${a.power} ok=${ok}`);
    g.simulate(a.wait ?? 0.6);
  }
  // let everything settle, then the game will end on its own when out of paws
  let guard = 0;
  while (g.phase === 'ready' && guard++ < 60 * 25) {
    g.simulate(1 / 60);
    if (g.goalComplete && g.paws > 0 && !g.busy()) g.requestEnd();
  }
  g.simulate(0.2);
  for (const p of g.props) if ((p.broken || p.damaged) && !startBroken.has(p.id)) broken.push(p.name);
  const out: SimOut = { result, score: g.score, goal: g.goalProgress(), broken, events, log };
  g.unload();
  return out;
}

export function listProps(level: LevelDef) {
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(level);
  g.start();
  g.simulate(1.5);
  const rows = g.props.filter((p) => p.alive).map((p) => {
    const t = p.body.translation();
    const moved = p.startPos.distanceTo(new THREE.Vector3(t.x, t.y, t.z));
    return `${p.name.padEnd(8)} ${p.kind.padEnd(10)} m=${p.body.mass().toFixed(2)} pos=(${t.x.toFixed(2)},${t.y.toFixed(2)},${t.z.toFixed(2)}) moved=${moved.toFixed(3)} reach=${g.reachable(p)}${p.broken ? ' BROKEN' : ''}${p.target ? ' TARGET' : ''}`;
  });
  const brokenAtStart = g.props.filter((p) => p.broken || p.damaged).map((p) => p.name);
  g.unload();
  return { rows, brokenAtStart };
}

/** random exploration: how often does a random plan clear the level? */
export function explore(level: LevelDef, n: number, seed = 1) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const g0 = new Game(RAPIER, noop, { headless: true });
  g0.load(level);
  const kinds = g0.props.filter((p) => p.interactable && g0.reachable(p)).map((p) => ({ kind: p.kind, pos: p.startPos.toArray() as [number, number, number] }));
  g0.unload();
  let wins = 0;
  const scores: number[] = [];
  let best: { score: number; plan: Action[] } = { score: -1, plan: [] };
  for (let i = 0; i < n; i++) {
    const plan: Action[] = [];
    for (let k = 0; k < level.paws; k++) {
      const pk = kinds[Math.floor(rnd() * kinds.length)];
      const ang = Math.floor(rnd() * 8) * (Math.PI / 4);
      plan.push({ pick: pk.kind, near: pk.pos, dir: [Math.cos(ang), Math.sin(ang)], power: [0.45, 0.75, 1][Math.floor(rnd() * 3)], at: (['low', 'mid', 'top'] as const)[Math.floor(rnd() * 3)], wait: 2 });
    }
    const r = runPlan(level, plan);
    if (r.result?.success) wins++;
    scores.push(r.score);
    if (r.score > best.score) best = { score: r.score, plan };
  }
  scores.sort((a, b) => a - b);
  return { winRate: wins / n, median: scores[Math.floor(n / 2)], max: scores[n - 1], best };
}

// CLI
const [, , cmd, id, ...rest] = process.argv;
const level = LEVELS.find((l) => l.id === id);
if (cmd && !level && cmd !== 'all') { console.error('no level', id); process.exit(1); }
if (cmd === 'props') {
  const r = listProps(level!);
  console.log(r.rows.join('\n'));
  console.log('broken at start:', r.brokenAtStart);
} else if (cmd === 'plan') {
  const plan = JSON.parse(rest.join(' ')) as Action[];
  const r = runPlan(level!, plan, true);
  console.log(r.log.join('\n'));
  console.log(JSON.stringify({ success: r.result?.success, stars: r.result?.stars, score: r.score, goal: r.goal, broken: r.broken, maxChain: r.result?.maxChain }));
} else if (cmd === 'explore') {
  const n = Number(rest[0] ?? 40);
  const r = explore(level!, n);
  console.log(JSON.stringify({ winRate: r.winRate, median: r.median, max: r.max, bestPlan: r.best.plan }));
}
if (cmd === 'wake') {
  // report owner disturbance after a plan
  const plan = JSON.parse(rest.join(' ')) as Action[];
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(level!); g.start(); g.simulate(1);
  for (const a of plan) {
    while (!g.canAct() && g.phase === 'ready') g.simulate(1 / 60);
    const p = findProp(g, a)!;
    const c = p.center(new THREE.Vector3()); const t = p.body.translation();
    const frac = a.at === 'top' ? 0.85 : a.at === 'low' ? 0.15 : 0.5;
    g.swat(p, new THREE.Vector3(a.dir[0], 0, a.dir[1]).normalize(), a.power, new THREE.Vector3(c.x, t.y + p.height * frac, c.z));
    g.simulate(a.wait ?? 6);
    console.log(`after ${a.pick}: disturbance ${g.owner?.disturbance.toFixed(1)} awake ${g.owner?.awake}`);
  }
}
