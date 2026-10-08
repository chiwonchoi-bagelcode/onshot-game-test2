import * as THREE from 'three';
import type { Game, SlickKind } from './Game';
import type { Prop } from './Prop';
import type { Special } from './types';
import { clamp } from '../core/util';
import { blame } from './specials3';

/* ------------------------------------------------------------------ */
/* Phase 2 gadgets: things that spill, a paint job that halves a        */
/* treasure's worth, a rail switch, traffic you can hold up.            */
/* ------------------------------------------------------------------ */

const _v = new THREE.Vector3();
const _q = new THREE.Vector3();

const SPILL_COLOR: Partial<Record<SlickKind, string>> = { paint: '#ff8fa3', oil: '#4a4458', water: '#8fd3f5' };

/**
 * A can or drum of something runny. Tip it past ~55° (or drop it) and it
 * empties where its mouth points: a slippery puddle on whatever is below.
 * Anything precious sitting right where it lands gets painted (half its
 * worth, and it can no longer break for the full price).
 */
export class SpillSpecial implements Special {
  spilled = false;
  private startY = 0;
  private armed = false;
  constructor(private o: { kind: SlickKind; r: number; mouth: number; color?: string; word?: string; onSpill?: (game: Game, at: THREE.Vector3, by: Prop) => void }) {}
  busy() { return false; }
  step(game: Game, p: Prop) {
    if (this.spilled || !p.alive) return;
    const t = p.body.translation();
    if (!this.armed) { this.startY = t.y; this.armed = true; }
    if (game.time < 0.8) return;
    p.up(_q);
    if (_q.y < 0.55 || t.y < this.startY - 0.9) this.spill(game, p);
  }
  onBreak(game: Game, p: Prop) { if (!this.spilled) this.spill(game, p); }
  spill(game: Game, p: Prop) {
    this.spilled = true;
    const t = p.body.translation();
    p.up(_q);
    // the mouth: along the can's up axis, but puddles lie flat
    const at = new THREE.Vector3(t.x + _q.x * this.o.mouth, t.y + 0.1, t.z + _q.z * this.o.mouth);
    game.addSlick(at, this.o.r, this.o.kind);
    game.stain(at, this.o.r * 1.4, this.o.color ?? SPILL_COLOR[this.o.kind] ?? '#ffffff', 0.85);
    game.sfx.splash(0.6, clamp(at.x / 8, -1, 1));
    game.emit({ type: 'word', text: this.o.word ?? '철퍽!', pos: at.clone().add(new THREE.Vector3(0, 0.6, 0)), size: 1.0, color: this.o.color ?? SPILL_COLOR[this.o.kind] ?? '#ffffff' });
    // empty now: light enough to be pushed aside
    for (const h of p.colliderHandles) game.world.getCollider(h)?.setMass(0.25 / p.colliderHandles.length);
    // …and a sticky, paint-smeared tin doesn't roll forever
    p.spec.angDamp = 3; p.spec.linDamp = 0.6;
    p.body.setAngularDamping(3); p.body.setLinearDamping(0.6);
    game.count('spills');
    game.count('spill:' + p.kind);
    game.witness(at, 8);
    this.o.onSpill?.(game, at, p);
  }
}

/**
 * Paint all over a precious thing: it counts as damaged (half its worth on
 * the receipt) and won't shatter for the full price any more.
 */
export function paintProp(game: Game, p: Prop, by: Prop, label = '페인트 범벅') {
  if (!p.alive || p.broken || p.damaged) return;
  blame(game, p, by);
  p.damaged = true;
  const pos = p.center(new THREE.Vector3());
  game.stain(pos, 1.0, '#ff8fa3', 0.9);
  // paint washes off (mostly): half the price, and the care that went into it survives
  game.addScore(Math.round(p.value * 0.5), pos, { prop: p, type: 'damage', heartK: 0 });
  const e = game.run.ledger[p.id];
  if (e) e.label = label;
  game.brokenCount++;
  game.count('break');
  game.count('break:' + p.kind);
  game.count('painted');
  const by2: string[] = [];
  for (let c = p.cause, n = 0; c && n < 12; c = c.cause, n++) by2.push(c.kind);
  if (p.causeCat) by2.unshift('cat');
  game.run.culprits.push({ kind: p.kind, target: p.target, by: by2 });
  game.emit({ type: 'word', text: '앗… 페인트 범벅!', pos: pos.clone().add(new THREE.Vector3(0, 0.8, 0)), size: 1.1, color: '#ff8fa3' });
  game.discover('painted', pos.clone());
  p.group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh && !m.userData.glass) m.material = new THREE.MeshLambertMaterial({ color: '#ff9fb3', flatShading: true });
  });
  game.checkGoal();
}

/** paint anything precious within r of `at` (same height band) */
export function paintAround(game: Game, at: THREE.Vector3, r: number, by: Prop, pick: (p: Prop) => boolean) {
  for (const p of game.props) {
    if (!p.alive || p.broken || p.damaged || !pick(p)) continue;
    const c = p.body.translation();
    if (Math.abs(c.y - at.y) > 0.9) continue;
    if (Math.hypot(c.x - at.x, c.z - at.z) < r) paintProp(game, p, by);
  }
}

/* ------------------------------ traffic ------------------------------ */

/**
 * Drives a (car) prop along an axis while `go()` says so, stopping at its
 * stop line otherwise. It loops from `wrap[1]` back to `wrap[0]`. Once it
 * has hit something hard, the driver gives up and physics takes over.
 */
export interface DriveDef {
  axis: 'x' | 'z';
  dir: 1 | -1;
  speed: number;
  go: (game: Game) => boolean;
  /** coordinate along the axis where it waits when it may not go */
  stopAt?: number;
  /** [respawn, leave]: past `leave` it reappears at `respawn` */
  wrap?: [number, number];
  /** start rolling only after this many seconds */
  delay?: number;
  /** cars sharing the lane: keep a gap behind the one in front (unless it has crashed: pile-up) */
  lane?: { d: Driver; p: Prop }[];
  /** how far behind the car in front to wait (centre to centre) */
  gap?: number;
}

/** something steering a car (a driver in traffic, rails under a wagon) */
export interface Steering {
  crashed: boolean;
  step(game: Game, p: Prop, h: number): void;
  crash(game: Game, p: Prop): void;
}

export class Driver implements Steering {
  crashed = false;
  private blocked = 0;
  private v = 0;
  /** went through the stop line on green this lap */
  private cleared = false;
  /** off stage (waiting its turn): no driving, no crash checks */
  paused = false;
  constructor(readonly d: DriveDef) {}
  step(game: Game, p: Prop, h: number) {
    if (this.crashed || this.paused || !p.alive || game.time < (this.d.delay ?? 0) + 0.3) return;
    const b = p.body;
    const t = b.translation();
    const pos = this.d.axis === 'x' ? t.x : t.z;
    const s = this.d.dir;
    // pass the stop line only on green; once through it, keep going
    const go = this.d.go(game);
    const room = this.d.stopAt !== undefined ? (this.d.stopAt - pos) * s : Infinity;
    if (go && room < 1.5) this.cleared = true;
    const hold = this.d.stopAt !== undefined && !this.cleared && !go && room > -2;
    let want = !hold ? this.d.speed : Math.min(this.d.speed, Math.max(0, Math.sqrt(Math.max(0, room - 0.2) * 2 * 4)));
    // queue behind a waiting car (a crashed one is not seen in time)
    if (this.d.lane) {
      let gapAhead = Infinity;
      for (const o of this.d.lane) {
        if (o.p === p || o.d.crashed || !o.p.alive) continue;
        const ot = o.p.body.translation();
        const op = this.d.axis === 'x' ? ot.x : ot.z;
        const ahead = (op - pos) * s;
        if (ahead > 0 && ahead < gapAhead) gapAhead = ahead;
      }
      const g = this.d.gap ?? 6.5;
      if (gapAhead < Infinity) want = Math.min(want, Math.max(0, Math.sqrt(Math.max(0, gapAhead - g) * 2 * 4)));
    }
    this.v += clamp(want - this.v, -6 * h, 3 * h);
    const lv = b.linvel();
    const along = this.d.axis === 'x' ? lv.x * s : lv.z * s;
    // pushed back hard by something it ran into: the driver stops
    if (this.v > 1.5 && along < this.v * 0.35) this.blocked += h; else this.blocked = 0;
    if (this.blocked > 0.25) { this.crash(game, p); return; }
    const vx = this.d.axis === 'x' ? this.v * s : lv.x * 0.9;
    const vz = this.d.axis === 'z' ? this.v * s : lv.z * 0.9;
    b.setLinvel({ x: vx, y: Math.min(lv.y, 0.5), z: vz }, true);
    b.setAngvel({ x: 0, y: 0, z: 0 }, true);
    if (this.d.wrap && (pos - this.d.wrap[1]) * s > 0) {
      const r = this.d.wrap[0];
      b.setTranslation(this.d.axis === 'x' ? { x: r, y: t.y, z: t.z } : { x: t.x, y: t.y, z: r }, true);
      p.prevV.set(0, 0, 0);
      this.cleared = false;
    }
  }
  /** back at the start of the road: a fresh lap */
  reset() { this.cleared = false; this.v = 0; this.blocked = 0; }
  crash(game: Game, p: Prop) {
    if (this.crashed) return;
    this.crashed = true;
    game.sfx.crunch(0.8, 0);
    game.emit({ type: 'word', text: '끼이익—쾅!', pos: p.center(_v).clone().add(new THREE.Vector3(0, 2.0, 0)), size: 1.1, color: '#ffd23f' });
  }
}

/* ------------------------------ latched things ------------------------------ */

/** hold a prop where it is (a cart on its latch, a wagon on its brake) */
export function latch(p: Prop) {
  p.body.setEnabledTranslations(false, false, false, false);
  p.body.setEnabledRotations(false, false, false, false);
}

/** let it go, as part of the chain (with an optional nudge, world units/s) */
export function unlatch(game: Game, p: Prop, by: Prop | null, nudge?: THREE.Vector3) {
  if (!p.alive) return;
  p.body.setEnabledTranslations(true, true, true, true);
  p.body.setEnabledRotations(true, true, true, true);
  p.body.wakeUp();
  blame(game, p, by);
  p.graceUntil = game.time + 0.3;
  if (nudge) p.body.setLinvel({ x: nudge.x, y: nudge.y, z: nudge.z }, true);
  game.wakeAround(p);
}

/* ------------------------------ the railway ------------------------------ */

/** a straight piece of track: from (x, z) along unit (dx, dz) */
export interface Track { x: number; z: number; dx: number; dz: number }

/**
 * Wheels on rails: on the flat, a wagon follows whichever track `pick`
 * says (the switch), rolling freely along it. Hit something hard (or get
 * the switch thrown under you) and it leaves the rails for good.
 */
export class RailFollower implements Steering {
  crashed = false;
  private q = new THREE.Quaternion();
  private want = new THREE.Quaternion();
  constructor(private o: { pick: (x: number, z: number) => Track | null }) {}
  step(_game: Game, p: Prop) {
    if (this.crashed || !p.alive) return;
    const t = p.body.translation();
    const tr = this.o.pick(t.x, t.z);
    if (!tr) return;
    const v = p.body.linvel();
    const along = v.x * tr.dx + v.z * tr.dz;
    if (Math.abs(along) < 0.05) return;
    const nx = -tr.dz, nz = tr.dx;
    const e = (t.x - tr.x) * nx + (t.z - tr.z) * nz;
    p.body.setLinvel({ x: tr.dx * along - nx * e * 3, y: v.y, z: tr.dz * along - nz * e * 3 }, true);
    const r = p.body.rotation();
    this.q.set(r.x, r.y, r.z, r.w);
    this.want.setFromAxisAngle(_q.set(0, 1, 0), Math.atan2(-tr.dz, tr.dx));
    this.q.slerp(this.want, 0.25);
    p.body.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w }, true);
    p.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  }
  crash(game: Game, p: Prop) {
    if (this.crashed) return;
    this.crashed = true;
    game.emit({ type: 'word', text: '탈선!!', pos: p.center(_v).clone().add(new THREE.Vector3(0, 2.4, 0)), size: 1.3, color: '#ff5a6e' });
  }
}

/** the switch: a yellow blade (scenery) that swings over when the lever is thrown */
export class RailSwitch {
  set = false;
  private t = 1;
  private from = 0;
  constructor(readonly blade: THREE.Object3D, private a0: number, private a1: number) { blade.rotation.y = a0; this.from = a0; }
  throwSwitch(game: Game) {
    this.from = this.blade.rotation.y;
    this.set = !this.set;
    this.t = 0;
    game.sfx.clunk();
    game.emit({ type: 'word', text: this.set ? '철컥! 옆 선로로' : '철컥! 본선으로', pos: this.blade.position.clone().add(new THREE.Vector3(2, 1.4, 0)), size: 1.0, color: '#ffd23f' });
  }
  update(dt: number) {
    if (this.t >= 1) return;
    this.t = Math.min(1, this.t + dt / 0.4);
    const k = 1 - (1 - this.t) * (1 - this.t);
    this.blade.rotation.y = this.from + ((this.set ? this.a1 : this.a0) - this.from) * k;
  }
}
