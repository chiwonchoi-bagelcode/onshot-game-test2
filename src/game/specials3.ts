import * as THREE from 'three';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Special } from './types';
import type { Loop } from '../audio/Sfx';
import { clamp, rand, srand } from '../core/util';

/* ------------------------------------------------------------------ */
/* Outside-world gadgets. The paw never gets stronger: it pulls a      */
/* chock, throws a lever, presses a button — and stored energy (a car  */
/* on a slope, a hanging load, a moving train) does the rest.          */
/* ------------------------------------------------------------------ */

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();

/** make `p` part of the current chain, caused by `by` */
export function blame(game: Game, p: Prop, by: Prop | null) {
  if (p.activeSwat === game.swatIndex && (p.causeCat || p.cause)) return;
  p.cause = by;
  p.causeCat = !by;
  p.activeSwat = game.swatIndex;
}

/** let go of something pinned (a hanging load, a parked trailer) as part of the chain */
export function release(game: Game, p: Prop, by: Prop | null) {
  if (!p.alive) return;
  blame(game, p, by);
  if (p.pinned !== null) game.unpin(p);
  p.body.wakeUp();
}

/* ------------------------------ car ------------------------------ */

type CarStage = 0 | 1 | 2 | 3;
const STAGE_NAME = ['', '흠집', '찌그러짐', '전손'] as const;
/** share of the car's value lost at each stage (cumulative) */
const STAGE_COST = [0, 0.04, 0.35, 1];

export interface CarParts {
  body: THREE.Object3D;
  wheels: THREE.Object3D[];
  glass: THREE.Mesh[];
  lights: THREE.Mesh[];
  hood: THREE.Object3D | null;
  scratches: THREE.Object3D;
  dents: THREE.Object3D;
}

/**
 * A car: heavy, rolls on near-frictionless wheels, and takes damage in
 * stages — scratch, dent (alarm, cracked glass), wreck (smoke, popped
 * hood). Each stage goes on the receipt as a repair bill.
 */
export class CarSpecial implements Special {
  stage: CarStage = 0;
  private hp = 0;
  private alarm: Loop | null = null;
  private alarmT = 0;
  private smokeT = 0;
  private spin = 0;
  label = '';
  /** parked on a slope: held in place until its chock goes (or something rams it) */
  held = false;
  constructor(private parts: CarParts, private glassMat: THREE.MeshLambertMaterial, private crackedMat: THREE.Material) {}
  busy() { return false; }

  /** rolling resistance: free-wheeling while fast, brakes to a stop when slow or wrecked */
  private damp = -1;
  step(_g: Game, p: Prop) {
    if (this.held) return;
    const v = p.body.linvel();
    const sp = v.x * v.x + v.z * v.z;
    const want = this.stage >= 3 ? 1.4 : this.stage === 2 ? (sp < 1.4 ? 1.2 : 0.5) : sp < 1.4 ? 1.2 : -1;
    if (want !== this.damp) { this.damp = want; p.body.setLinearDamping(want < 0 ? (p.spec.linDamp ?? 0.12) : Math.max(want, p.spec.linDamp ?? 0)); }
  }

  /** lock in place (call after the body exists) */
  hold(p: Prop) {
    this.held = true;
    p.body.setEnabledTranslations(false, false, false, false);
    p.body.setEnabledRotations(false, false, false, false);
  }

  /** the chock is gone: gravity takes over */
  release(game: Game, p: Prop, by: Prop | null) {
    if (!this.held || !p.alive) return;
    this.held = false;
    p.body.setEnabledTranslations(true, true, true, true);
    p.body.setEnabledRotations(true, true, true, true);
    p.body.wakeUp();
    blame(game, p, by);
    p.graceUntil = game.time + 0.3;
    game.wakeAround(p);
    game.sfx.clunk();
    game.emit({ type: 'word', text: '스르륵…', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 2.2, 0)), size: 1.0, color: '#ffffff' });
  }

  onSwat(game: Game, p: Prop, dir: THREE.Vector3, power: number, point: THREE.Vector3): boolean {
    // a paw on a car: a scratch at most, and a sore paw
    p.body.applyImpulse({ x: dir.x * 25 * power, y: 0, z: dir.z * 25 * power }, true);
    if (this.stage < 1) this.damage(game, p, 1, point);
    game.emit({ type: 'word', text: '끼익…', pos: point.clone().add(new THREE.Vector3(0, 0.5, 0)), size: 0.9, color: '#ffffff' });
    game.discover('heavy', point.clone());
    return true;
  }

  onImpact(game: Game, p: Prop, impact: number) {
    if (impact < 2.2 || game.time < 0.8) return;
    this.hp += impact;
    const want: CarStage = impact > 8 || this.hp > 22 ? 3 : impact > 4.2 || this.hp > 9 ? 2 : 1;
    if (want > this.stage) this.damage(game, p, want, p.center(_v).clone());
    game.sfx.crunch(clamp(impact / 9, 0.3, 1), clamp(p.body.translation().x / 12, -1, 1));
  }

  onTouch(game: Game, p: Prop, other: Prop) {
    // something heavy fell on / rammed the car
    // closing speed just before the hit (this step's solver already slowed them)
    const v = other.prevV, w = p.prevV;
    const e = other.body.mass() * Math.hypot(v.x - w.x, v.y - w.y, v.z - w.z);
    if (e < 60) return;
    if (this.held && e > 260) this.release(game, p, other);
    const want: CarStage = e > 900 ? 3 : e > 260 ? 2 : 1;
    if (want > this.stage) { blame(game, p, other); this.damage(game, p, want, other.center(_v).clone()); game.sfx.crunch(1, 0); }
  }

  private damage(game: Game, p: Prop, to: CarStage, at: THREE.Vector3) {
    if (to <= this.stage) return;
    const from = this.stage;
    this.stage = to;
    const cost = Math.round(p.value * (STAGE_COST[to] - STAGE_COST[from]));
    const P = this.parts;
    if (to >= 1) P.scratches.visible = true;
    if (to >= 2) {
      p.damaged = true;
      P.dents.visible = true;
      P.body.scale.set(1, 0.94, 1);
      for (const g of P.glass) g.material = this.crackedMat;
      if (!this.alarm && !game.headless) { this.alarm = game.sfx.carAlarm(); this.alarmT = 9; }
      game.owner?.hear(game, at, 40);
      game.noise += 12;
      game.discover('carAlarm', at.clone());
    }
    if (to >= 3) {
      P.body.scale.set(1.02, 0.86, 0.96);
      P.body.rotation.z = srand(-0.06, 0.06);
      if (P.hood) { P.hood.rotation.z = 0.9; P.hood.position.y += 0.35; }
      for (const g of P.glass) g.visible = false;
      for (let i = 0; i < 14; i++) game.debris.spawn(at.clone().add(new THREE.Vector3(srand(-1, 1), srand(0.5, 1.2), srand(-1, 1))), new THREE.Vector3(srand(-4, 4), srand(2, 5), srand(-4, 4)), srand(0.1, 0.22), i % 3 ? '#cfefff' : '#ffffff', true);
      this.smokeT = 6;
      game.discover('carWreck', at.clone());
      game.slowmo(0.35, 0.6);
      game.glowBurst(at, '#ffd23f', 10);
    }
    game.witness(at, 12 + to * 8);
    game.count('car:' + STAGE_NAME[to]);
    game.emit({ type: 'word', text: to === 3 ? '콰직! 전손!!' : to === 2 ? '우지끈! 삐용삐용' : '찌익—', pos: at.clone().add(new THREE.Vector3(0, 1.4, 0)), size: to === 3 ? 1.6 : 1.1, color: p.target ? '#ff4f6d' : '#ffd23f' });
    game.shake(0.3 + to * 0.2);
    game.addScore(cost, at, { prop: p, type: to === 3 ? 'break' : 'damage' });
    const e = game.run.ledger[p.id];
    if (e) e.label = STAGE_NAME[to];
    if (from < 2 && to >= 2) {
      game.brokenCount++; game.count('break'); game.count('break:' + p.kind);
      const by: string[] = [];
      for (let c = p.cause, n = 0; c && n < 12; c = c.cause, n++) by.push(c.kind);
      if (p.causeCat) by.unshift('cat');
      game.run.culprits.push({ kind: p.kind, target: p.target, by });
    }
    if (to === 3) game.count('wreck');
    game.checkGoal();
  }

  frame(game: Game, p: Prop, dt: number) {
    // wheels roll with the car
    const v = p.body.linvel();
    p.up(_v2);
    const fwd = _v.set(1, 0, 0).applyQuaternion(p.group.quaternion);
    const sp = v.x * fwd.x + v.y * fwd.y + v.z * fwd.z;
    this.spin -= (sp * dt) / 0.62;
    for (const w of this.parts.wheels) w.rotation.z = this.spin;
    if (this.alarm) {
      this.alarmT -= dt;
      const on = Math.floor(game.time * 3) % 2 === 0;
      for (const l of this.parts.lights) (l.material as THREE.MeshLambertMaterial).emissive.setHex(on ? 0xffa030 : 0x000000);
      if (this.alarmT <= 0) { this.alarm.stop(); this.alarm = null; for (const l of this.parts.lights) (l.material as THREE.MeshLambertMaterial).emissive.setHex(0); }
    }
    if (this.smokeT > 0) {
      this.smokeT -= dt;
      if (Math.random() < dt * 8) game.puffs.emit({ pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(rand(-1, 1), 1.2, rand(-0.6, 0.6))), vel: new THREE.Vector3(rand(-0.3, 0.3), 1.6, rand(-0.3, 0.3)), life: 1.6, size0: 0.6, size1: 2.2, color: '#6b6878', alpha: 0.45, drag: 0.8, gravity: 0.6 });
    }
    void this.glassMat;
  }

  dispose() { this.alarm?.stop(); this.alarm = null; }
}

/* ------------------------------ gates & barriers ------------------------------ */

/**
 * A kinematic leaf that swings about its origin (the hinge) from yaw a0
 * to a1 when opened: garden gates, parking barriers (lift: axis 'z'),
 * glass-cabinet doors. Opening changes where rolling things can go.
 */
export class SwingSpecial implements Special {
  label = '열기';
  open = false;
  /** the other leaf of a double gate opens with this one */
  partner: Prop | null = null;
  private t = 0;
  private q = new THREE.Quaternion();
  constructor(private o: { yaw: number; to: number; axis?: 'y' | 'z'; dur?: number; word?: string; onOpen?: (game: Game, p: Prop) => void }) {}
  busy() { return this.open && this.t < 1; }

  openNow(game: Game, p: Prop, by: Prop | null) {
    if (this.open) return;
    this.open = true;
    blame(game, p, by);
    if (this.partner) (this.partner.special as SwingSpecial).openNow(game, this.partner, p);
    // opened in the nick of time, with a car already rolling at it
    if (game.props.some((q) => q.kind === 'auto' && q.isDynamic() && q.body.linvel().x ** 2 + q.body.linvel().z ** 2 > 4)) game.count('gateRush');
    game.sfx.clunk();
    game.discover('gate', p.center(new THREE.Vector3()));
    if (this.o.word) game.emit({ type: 'word', text: this.o.word, pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 1.2, 0)), size: 1.0, color: '#ffffff' });
    this.o.onOpen?.(game, p);
  }

  onSwat(game: Game, p: Prop): boolean { this.openNow(game, p, null); return true; }

  step(_g: Game, p: Prop, h: number) {
    if (!this.open || this.t >= 1) return;
    this.t = Math.min(1, this.t + h / (this.o.dur ?? 0.7));
    const k = 1 - (1 - this.t) * (1 - this.t);
    const a = this.o.to * k;
    if (this.o.axis === 'z') this.q.setFromEuler(new THREE.Euler(0, this.o.yaw, a, 'YXZ'));
    else this.q.setFromAxisAngle(_v.set(0, 1, 0), this.o.yaw + a);
    p.body.setNextKinematicRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w });
  }
}

/* ------------------------------ wobbly furniture ------------------------------ */

/**
 * Tall heavy furniture rocks when hit and tips over on a second hit while
 * it is still rocking ("흔들릴 때 한 번 더!"). A hit is a paw high up, or
 * something heavy rolling into it.
 */
export class WobbleSpecial implements Special {
  private lastHit = -10;
  private firstBy: Prop | null = null;
  private dir = new THREE.Vector3();
  toppled = false;
  constructor(private o: { window?: number; minHeight?: number } = {}) {}
  busy() { return false; }

  hit(game: Game, p: Prop, dir: THREE.Vector3, by: Prop | null) {
    if (this.toppled) return;
    const now = game.time;
    if (now - this.lastHit < (this.o.window ?? 1.6) && this.lastHit > 0) {
      // second shove while rocking: over it goes
      this.toppled = true;
      const d = this.dir.add(dir).setY(0).normalize();
      // whatever set it rocking gets the credit in the story
      const culprit = by ?? this.firstBy;
      if (culprit) { p.cause = culprit; p.causeCat = false; p.activeSwat = game.swatIndex; }
      const m = p.body.mass();
      const t = p.body.translation();
      p.body.wakeUp();
      p.body.applyImpulseAtPoint({ x: d.x * m * 2.6, y: 0, z: d.z * m * 2.6 }, { x: t.x, y: t.y + p.height * 0.9, z: t.z }, true);
      game.emit({ type: 'word', text: '기우뚱…!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, p.height * 0.5, 0)), size: 1.2, color: '#ffd23f' });
      game.discover('furniture', p.center(new THREE.Vector3()));
      return;
    }
    this.lastHit = now;
    this.firstBy = by;
    this.dir.copy(dir).setY(0).normalize();
    game.emit({ type: 'word', text: '흔들흔들', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, p.height * 0.5, 0)), size: 0.9, color: '#ffffff' });
  }

  onSwat(game: Game, p: Prop, dir: THREE.Vector3, _power: number, point: THREE.Vector3): boolean {
    const t = p.body.translation();
    if (point.y - t.y >= p.height * (this.o.minHeight ?? 0.55)) this.hit(game, p, dir, null);
    return false;
  }

  onTouch(game: Game, p: Prop, other: Prop) {
    const v = other.prevV;
    // a real shove from outside (not the vase rattling inside it)
    if (other.body.mass() < 3.5 || v.x * v.x + v.z * v.z < 0.36) return;
    this.hit(game, p, _v.set(v.x, 0, v.z), other);
  }
}

/* ------------------------------ triggers ------------------------------ */

export interface TriggerOpts {
  /** shown on the aim arrow */
  label: string;
  /** what happens: release loads, start belts, slam the brakes … */
  action: (game: Game, self: Prop) => void;
  kind?: 'lever' | 'button' | 'chock';
  /** can fire only once */
  once?: boolean;
  /** a thing bumping into it also fires it (chains can pull levers) */
  bump?: number;
  word?: string;
  /** the moving part to animate */
  handle?: THREE.Object3D | null;
}

/** a lever, a button, a chock: the paw's way to let big things go */
export class TriggerSpecial implements Special {
  used = false;
  label: string;
  private flip = 0;
  constructor(private o: TriggerOpts) { this.label = o.label; }
  busy() { return false; }

  fire(game: Game, p: Prop, byCat: boolean) {
    if (this.used && this.o.once !== false) return;
    this.used = true;
    if (byCat) { p.causeCat = true; p.cause = null; p.activeSwat = game.swatIndex; }
    if (this.o.kind === 'button') game.sfx.beep(); else game.sfx.clunk();
    this.flip = 1;
    if (this.o.word) game.emit({ type: 'word', text: this.o.word, pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.9, 0)), size: 1.0, color: '#7fe3ff' });
    game.discover('trigger', p.center(new THREE.Vector3()));
    this.o.action(game, p);
  }

  onSwat(game: Game, p: Prop, dir: THREE.Vector3, power: number): boolean {
    this.fire(game, p, true);
    // a chock also gets knocked away
    if (this.o.kind === 'chock') { void dir; void power; return false; }
    return true;
  }

  onImpact(game: Game, p: Prop, impact: number) {
    if (this.o.bump !== undefined && impact > this.o.bump && game.time > 0.8 && !p.causeCat) this.fire(game, p, false);
  }

  onTouch(game: Game, p: Prop, other: Prop) {
    if (this.o.bump === undefined || game.time < 0.8) return;
    blame(game, p, other);
    this.fire(game, p, false);
  }

  frame(_g: Game, _p: Prop, dt: number) {
    const h = this.o.handle;
    if (!h) return;
    if (this.o.kind === 'button') h.position.y = h.userData.y0 - (this.used ? 0.12 : 0);
    else h.rotation.z = (h.userData.r0 ?? 0.7) * (this.used ? -1 : 1) * (1 - Math.max(0, this.flip)) + (h.userData.r0 ?? 0.7) * (this.used ? -1 : 1) * Math.max(0, this.flip) * 0.2;
    this.flip = Math.max(0, this.flip - dt * 4);
  }
}

/* ------------------------------ water hose ------------------------------ */

/** turns on and sprays where the paw pointed: pushes light things, soaks the ground */
export class HoseSpecial implements Special {
  label = '물 틀기';
  private on = 0;
  private dir = new THREE.Vector3(1, 0, 0);
  private loop: Loop | null = null;
  private wetT = 0;
  constructor(private nozzle: THREE.Object3D, private dur = 4) {}
  busy() { return this.on > 0; }

  onSwat(game: Game, p: Prop, dir: THREE.Vector3): boolean {
    this.dir.copy(dir).setY(0).normalize();
    this.on = this.dur;
    if (!game.headless) this.loop = game.sfx.hose();
    game.discover('hose', p.center(new THREE.Vector3()));
    game.emit({ type: 'word', text: '촤아아~', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 1.0, color: '#7fd3ff' });
    this.nozzle.rotation.y = Math.atan2(this.dir.x, this.dir.z) - p.group.rotation.y;
    return true;
  }

  step(game: Game, p: Prop, h: number) {
    if (this.on <= 0) return;
    this.on -= h;
    const o = p.center(_v).clone();
    o.y += 0.35;
    const range = 8.5;
    for (const q of game.props) {
      if (q === p || !q.isDynamic()) continue;
      const c = q.center(_v2);
      const dx = c.x - o.x, dz = c.z - o.z;
      const along = dx * this.dir.x + dz * this.dir.z;
      if (along < 0.3 || along > range) continue;
      const side = Math.abs(dx * this.dir.z - dz * this.dir.x);
      // the stream arcs up: it reaches high shelves a few steps away
      if (side > 0.6 + along * 0.18 || c.y > o.y + 1.5 + along * 0.8 || c.y < o.y - 2.5) continue;
      const m = q.body.mass();
      const push = clamp(60 / Math.max(0.4, m), 0, 40) * (1 - along / range * 0.6);
      q.body.wakeUp();
      q.body.applyImpulse({ x: this.dir.x * push * m * h, y: push * m * h * 0.25, z: this.dir.z * push * m * h }, true);
      blame(game, q, p);
      if (q.mat === 'electronic' && q.breakable && !q.broken && !q.damaged && game.time > 0.8) {
        game.emit({ type: 'word', text: '치익… 지지직', pos: c.clone().add(new THREE.Vector3(0, 0.6, 0)), size: 1, color: '#7fd3ff' });
        game.breakProp(q, 99);
      }
    }
    // soak the ground at the end of the jet
    this.wetT -= h;
    if (this.wetT <= 0) {
      this.wetT = 0.45;
      const reach = range * srand(0.55, 0.95);
      game.addSlick(o.clone().addScaledVector(this.dir, reach), 1.3, 'water');
    }
    if (this.on <= 0) { this.loop?.stop(); this.loop = null; }
  }

  frame(game: Game, p: Prop, dt: number) {
    if (this.on <= 0 || game.headless) return;
    const o = p.center(_v).clone();
    o.y += 0.35;
    for (let i = 0; i < 3; i++) {
      const s = rand(7, 11);
      game.chunks.emit({ pos: o.clone(), vel: new THREE.Vector3(this.dir.x * s + rand(-0.6, 0.6), rand(2.5, 4), this.dir.z * s + rand(-0.6, 0.6)), life: 0.9, size: rand(0.08, 0.14), color: i ? '#bfeaff' : '#7fd4ff', floor: game.floorY + 0.03 });
    }
    void dt;
  }

  dispose() { this.loop?.stop(); }
}

/* ------------------------------ conveyor belts ------------------------------ */

export interface Belt { x0: number; x1: number; z0: number; z1: number; y: number; dir: THREE.Vector3; speed: number; on: boolean; tex?: THREE.Texture | null; by?: Prop | null }

/** belts carry whatever sits on them (called every physics step) */
export function runBelts(game: Game, h: number) {
  for (const b of game.belts) {
    if (!b.on) continue;
    if (b.tex) b.tex.offset.x -= b.speed * h * 0.25;
    for (const p of game.props) {
      if (!p.isDynamic()) continue;
      const t = p.body.translation();
      const bottom = t.y + p.localBox.min.y;
      if (t.x < b.x0 || t.x > b.x1 || t.z < b.z0 || t.z > b.z1 || Math.abs(bottom - b.y) > 0.5) continue;
      const v = p.body.linvel();
      const k = Math.min(1, h * 8);
      p.body.wakeUp();
      p.body.setLinvel({ x: v.x + (b.dir.x * b.speed - v.x) * k, y: v.y, z: v.z + (b.dir.z * b.speed - v.z) * k }, true);
      if (b.by) blame(game, p, b.by);
    }
  }
}

/* ------------------------------ sudden stop ------------------------------ */

/**
 * The emergency brake: everything loose keeps going the way the train
 * was travelling. `dir` is the travel direction.
 */
export function jolt(game: Game, dir: THREE.Vector3, dv: number, by: Prop) {
  game.sfx.screech();
  game.shake(1);
  game.slowmo(0.45, 0.8);
  for (const p of game.props) {
    if (p === by || !p.alive) continue;
    if (p.pinned !== null && p.pinned < 900) game.unpin(p);
    if (!p.isDynamic()) continue;
    p.body.wakeUp();
    const m = p.body.mass();
    const k = dv * srand(0.85, 1.15);
    p.body.applyImpulse({ x: dir.x * k * m, y: 0.6 * m, z: dir.z * k * m }, true);
    blame(game, p, by);
    p.graceUntil = game.time + 0.05;
  }
}
