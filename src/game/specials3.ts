import * as THREE from 'three';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Special } from './types';
import type { Loop } from '../audio/Sfx';
import { clamp, rand, srand } from '../core/util';
import { GRAVITY as GRAV } from '../core/constants';

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
  /** on a gentle slope: don't brake before it has had a chance to get going */
  gentle = false;
  constructor(private parts: CarParts, private glassMat: THREE.MeshLambertMaterial, private crackedMat: THREE.Material) {}
  busy() { return false; }

  /** rolling resistance: free-wheeling while fast, brakes to a stop when slow or wrecked */
  private damp = -1;
  private peak = 0;
  step(_g: Game, p: Prop) {
    if (this.held) return;
    const v = p.body.linvel();
    const sp = v.x * v.x + v.z * v.z;
    this.peak = Math.max(this.peak, sp);
    // a gentle slope gets to pick up speed; once it has run, slowing means stopping
    const slowing = sp < 1.4 && (!this.gentle || this.peak > 6);
    const want = this.stage >= 3 ? 1.4 : this.stage === 2 ? (slowing ? 1.2 : 0.5) : slowing ? 1.2 : -1;
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
  constructor(private o: { window?: number; minHeight?: number; kick?: number } = {}) {}
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
      const kick = this.o.kick ?? 2.6;
      p.body.applyImpulseAtPoint({ x: d.x * m * kick, y: 0, z: d.z * m * kick }, { x: t.x, y: t.y + p.height * 0.9, z: t.z }, true);
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
    if (other.body.mass() < 3.5 || v.x * v.x + v.z * v.z < 0.25) return;
    const d = new THREE.Vector3(v.x, 0, v.z);
    this.hit(game, p, d, other);
    // something really big (a falling container) needs no second shove,
    // and a toppled neighbour of the same sort knocks it straight over (dominoes)
    const domino = other.special instanceof WobbleSpecial && other.special.toppled;
    if (other.body.mass() * Math.hypot(v.x, v.z) > 100 || domino) this.hit(game, p, d, other);
  }
}

/* ------------------------------ cables ------------------------------ */

/**
 * Plugged-in things are tied together: when one goes over the edge, its
 * cable yanks its neighbours after it (a domino you can't see coming).
 */
export class CableSpecial implements Special {
  links: Prop[] = [];
  /** where the cables run to (the power strip on the floor) */
  anchor: THREE.Vector3 | null = null;
  /** which way a yanked neighbour goes over the edge (defaults to toward the anchor) */
  pull: THREE.Vector3 | null = null;
  private yanked = false;
  busy() { return false; }
  step(game: Game, p: Prop) {
    if (this.yanked || game.time < 0.8) return;
    const t = p.body.translation();
    if (p.startPos.y - t.y < 0.45 && !p.broken && !p.damaged) return;
    this.yanked = true;
    for (const q of this.links) {
      if (!q.alive || q.fell || q.broken || q.damaged) continue;
      const c = q.body.translation();
      const to = this.anchor ?? new THREE.Vector3(t.x, t.y, t.z);
      const d = this.pull ? _v.copy(this.pull).setY(0) : _v.set(to.x - c.x, 0, to.z - c.z);
      if (d.lengthSq() < 1e-4) continue;
      d.normalize();
      const m = q.body.mass();
      q.body.wakeUp();
      q.body.applyImpulseAtPoint({ x: d.x * m * 4.2, y: m * 1.2, z: d.z * m * 4.2 }, { x: c.x, y: c.y + q.height * 0.35, z: c.z }, true);
      blame(game, q, p);
      game.emit({ type: 'word', text: '주르륵!', pos: q.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 0.9, color: '#ffffff' });
    }
    if (this.links.length) game.discover('cable', p.center(new THREE.Vector3()));
  }
}

/** a power strip on the floor: if water reaches it, everything plugged in dies */
export class PowerStripSpecial implements Special {
  plugged: Prop[] = [];
  private dead = false;
  busy() { return false; }
  step(game: Game, p: Prop) {
    if (this.dead || !game.slicks.length) return;
    const t = p.body.translation();
    const wet = game.slicks.some((s) => s.kind !== 'hair' && Math.abs(s.y - t.y) < 0.6 && (t.x - s.x) ** 2 + (t.z - s.z) ** 2 < s.r * s.r);
    if (!wet) return;
    this.dead = true;
    const c = p.center(new THREE.Vector3());
    game.fx('sparks', c, 1);
    game.emit({ type: 'word', text: '파지지직!! 합선', pos: c.clone().add(new THREE.Vector3(0, 0.8, 0)), size: 1.3, color: '#7fe3ff' });
    game.discover('zap', c.clone());
    let k = 0;
    for (const q of this.plugged) {
      if (!q.alive || q.broken || q.damaged || !q.breakable) continue;
      k++;
      blame(game, q, p);
      game.breakProp(q, 99);
    }
    if (k) game.count('short', k);
  }
}

/* ------------------------------ timed machines ------------------------------ */

/**
 * A parking barrier arm that lifts on a fixed rhythm (cars leaving), so a
 * rolling thing gets through only if it arrives while the arm is up. Its
 * button holds it open for good.
 */
export class BarrierSpecial implements Special {
  label = '차단기';
  held = false;
  private q = new THREE.Quaternion();
  constructor(private o: { yaw: number; period: number; open: number; offset?: number }) {}
  busy() { return false; }
  /** 0 = down, 1 = up at game time t */
  liftAt(t: number) {
    if (this.held) return 1;
    const u = (((t + (this.o.offset ?? 0)) % this.o.period) + this.o.period) % this.o.period;
    const k = Math.min(1, u / 0.5, Math.max(0, (this.o.open - u) / 0.5));
    return u < this.o.open ? k : 0;
  }
  step(game: Game, p: Prop) {
    const a = this.liftAt(game.time) * 1.35;
    this.q.setFromEuler(new THREE.Euler(0, this.o.yaw, a, 'YXZ'));
    p.body.setNextKinematicRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w });
  }
  onSwat(game: Game, p: Prop): boolean {
    game.emit({ type: 'word', text: '덜컹', pos: p.center(new THREE.Vector3()), size: 0.8, color: '#ffffff' });
    return true;
  }
}

/**
 * A crane: the trolley shuttles along the jib; pulling the lever drops the
 * hanging load wherever the trolley happens to be.
 */
export class CraneSpecial implements Special {
  released = false;
  private x = 0;
  private vel = 0;
  constructor(private o: { trolley: THREE.Object3D; cable: THREE.Object3D; load: Prop | null; x0: number; x1: number; z: number; y: number; speed: number; hang: number; axis?: 'x' | 'z'; swing?: boolean }) {}
  set load(p: Prop) { this.o.load = p; }
  busy() { return false; }
  /** trolley position along its rail at game time t (ping-pong) */
  xAt(t: number) {
    const L = Math.abs(this.o.x1 - this.o.x0), s = Math.sign(this.o.x1 - this.o.x0) || 1;
    const u = (t * this.o.speed) % (2 * L);
    return this.o.x0 + s * (u < L ? u : 2 * L - u);
  }
  private at(v: number): { x: number; z: number } { return this.o.axis === 'z' ? { x: this.o.z, z: v } : { x: v, z: this.o.z }; }
  step(game: Game, _p: Prop, h: number) {
    const nx = this.xAt(game.time);
    this.vel = (nx - this.x) / Math.max(h, 1e-4);
    this.x = nx;
    const l = this.o.load;
    const a = this.at(this.x);
    if (!this.released && l && l.alive) l.body.setNextKinematicTranslation({ x: a.x, y: this.o.y - this.o.hang, z: a.z });
  }
  frame(game: Game) {
    const a = this.at(this.x);
    this.o.trolley.position.x = a.x; this.o.trolley.position.z = a.z;
    this.o.cable.position.x = a.x; this.o.cable.position.z = a.z;
    this.o.cable.visible = !this.released;
    void game;
  }
  release(game: Game, by: Prop) {
    const l = this.o.load;
    if (this.released || !l) return;
    this.released = true;
    l.body.setBodyType(game.R.RigidBodyType.Dynamic, true);
    (l as { kinematic: boolean }).kinematic = false;
    // it keeps the trolley's speed as it falls
    if (this.o.swing) {
      const v = Math.abs(this.vel) < 20 ? this.vel : 0;
      l.body.setLinvel(this.o.axis === 'z' ? { x: 0, y: 0, z: v } : { x: v, y: 0, z: 0 }, true);
    }
    l.body.wakeUp();
    blame(game, l, by);
    l.graceUntil = game.time + 0.1;
    game.sfx.clunk();
    game.emit({ type: 'word', text: '철컥… 휘이잉', pos: l.center(new THREE.Vector3()), size: 1.2, color: '#ffd23f' });
  }
}

/**
 * A wrecking ball hanging from a jib: once released it swings as a pendulum
 * and plows through whatever is in its arc (kinematic: nothing stops it).
 */
export class WreckingBallSpecial implements Special {
  swinging = false;
  private t0 = 0;
  private q = new THREE.Quaternion();
  constructor(private o: { pivot: THREE.Vector3; len: number; dir: THREE.Vector3; from: number; chain: THREE.Object3D }) {}
  busy() { return this.swinging; }
  release(game: Game, p: Prop, by: Prop) {
    if (this.swinging) return;
    this.swinging = true;
    this.t0 = game.time;
    blame(game, p, by);
    game.sfx.whoosh(1);
    game.discover('trigger', p.center(new THREE.Vector3()));
  }
  angleAt(game: Game) {
    if (!this.swinging) return this.o.from;
    const t = game.time - this.t0;
    const w = Math.sqrt(-GRAV / this.o.len) * 0.9;
    return this.o.from * Math.cos(w * t) * Math.exp(-t * 0.12);
  }
  step(game: Game, p: Prop) {
    const a = this.angleAt(game);
    const d = this.o.dir;
    const x = this.o.pivot.x + d.x * Math.sin(a) * this.o.len, z = this.o.pivot.z + d.z * Math.sin(a) * this.o.len;
    const y = this.o.pivot.y - Math.cos(a) * this.o.len;
    p.body.setNextKinematicTranslation({ x, y, z });
    if (this.swinging && game.time - this.t0 > 12) this.swinging = false;
  }
  frame(game: Game, p: Prop) {
    const t = p.body.translation();
    const c = this.o.chain;
    const v = new THREE.Vector3(t.x, t.y, t.z).sub(this.o.pivot);
    c.position.copy(this.o.pivot).addScaledVector(v, 0.5);
    c.scale.set(1, v.length(), 1);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), v.normalize());
    void game; void this.q;
  }
}

/* ------------------------------ parked carts ------------------------------ */

/** a cart with its wheel brake on: the first paw releases the brake (and shoves) */
export class CartBrakeSpecial implements Special {
  label = '브레이크 풀기';
  braked = true;
  constructor(private free = 0.15, private held = 9) {}
  busy() { return false; }
  hold(p: Prop) { p.body.setLinearDamping(this.held); p.body.setAngularDamping(6); }
  onSwat(game: Game, p: Prop): boolean {
    if (this.braked) {
      this.braked = false;
      p.body.setLinearDamping(this.free);
      p.body.setAngularDamping(1.2);
      game.emit({ type: 'word', text: '딸깍', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), size: 0.8, color: '#ffffff' });
    }
    return false;
  }
}

/* ------------------------------ the bomb ------------------------------ */

/**
 * The planetary defence bomb on its tilting rig. It points at the sky; a
 * heavy weight on the short arm (or a kneading cat) swings it to point at
 * the ground. The red button fires it whichever way it points.
 */
export class RigSpecial implements Special {
  down = false;
  fired: 'up' | 'down' | null = null;
  private a: number;
  private t = 0;
  private q = new THREE.Quaternion();
  onDown: ((game: Game) => void) | null = null;
  onFire: ((game: Game, dir: 'up' | 'down') => void) | null = null;
  constructor(private o: { yaw: number; up: number; downA: number; bomb: THREE.Object3D }) { this.a = o.up; }
  busy() { return this.fired !== null && this.t < 3; }
  /** what set it pointing down (for the story of the end of the world) */
  tiltBy: Prop | null = null;
  tilt(game: Game, p: Prop, by: Prop | null) {
    if (this.down || this.fired) return;
    this.down = true;
    this.tiltBy = by;
    if (by) blame(game, p, by);
    game.sfx.clunk();
    game.sfx.rumble(0.8);
    game.shake(0.6);
    game.emit({ type: 'word', text: '끼기긱… 조준 변경?!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 3, 0)), size: 1.3, color: '#ff5a6e' });
    this.onDown?.(game);
  }
  onTouch(game: Game, p: Prop, other: Prop) { if (other.body.mass() >= 20) this.tilt(game, p, other); }
  onSwat(game: Game, p: Prop, _d: THREE.Vector3, _pw: number, point: THREE.Vector3): boolean {
    game.emit({ type: 'word', text: '꿈쩍도 안 해', pos: point.clone().add(new THREE.Vector3(0, 0.6, 0)), size: 0.9, color: '#ffffff' });
    return true;
  }
  fire(game: Game) {
    if (this.fired) return;
    this.fired = this.down ? 'down' : 'up';
    this.t = 0;
    this.onFire?.(game, this.fired);
  }
  step(game: Game, p: Prop, h: number) {
    // the cat kneading the short arm counts as a heavy weight
    if (!this.down && game.cat.perchProp() === p) this.tilt(game, p, null);
    // anything heavy landing on the short arm's pad (kinematic contacts report no forces)
    if (!this.down && game.time > 0.8) {
      const r = p.body.rotation(), t = p.body.translation();
      const pad = _v2.set(-1.7, 0.6, 0).applyQuaternion(new THREE.Quaternion(r.x, r.y, r.z, r.w)).add(_v.set(t.x, t.y, t.z));
      for (const q of game.props) {
        if (q === p || !q.isDynamic() || q.body.mass() < 20) continue;
        const c = q.body.translation();
        if ((c.x - pad.x) ** 2 + (c.z - pad.z) ** 2 < 1.4 * 1.4 && c.y - pad.y < 1.6 && c.y - pad.y > -0.6) { this.tilt(game, p, q); break; }
      }
    }
    const want = this.down ? this.o.downA : this.o.up;
    this.a += Math.sign(want - this.a) * Math.min(Math.abs(want - this.a), h * 1.4);
    this.q.setFromEuler(new THREE.Euler(0, this.o.yaw, this.a, 'YXZ'));
    p.body.setNextKinematicRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w });
    if (this.fired) {
      this.t += h;
      // the bomb slides out along the arm: into the sky, or into the ground
      const b = this.o.bomb;
      b.position.x = 1.2 + Math.min(this.t, 3) * Math.min(this.t, 3) * 4;
    }
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
  /** may it fire right now? (a closed cover blocks the button) */
  canFire?: (game: Game) => boolean;
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
    if (this.o.canFire && !this.o.canFire(game)) {
      game.emit({ type: 'word', text: '딱! (막혀 있음)', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.9, 0)), size: 0.9, color: '#ffffff' });
      game.sfx.denied();
      return;
    }
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
      // the belt drags it along at belt speed (friction against the belt is what moves it)
      p.body.wakeUp();
      p.body.setLinvel({ x: b.dir.x * b.speed + (v.x - b.dir.x * (v.x * b.dir.x + v.z * b.dir.z)) * 0.5, y: v.y, z: b.dir.z * b.speed + (v.z - b.dir.z * (v.x * b.dir.x + v.z * b.dir.z)) * 0.5 }, true);
      void h;
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
