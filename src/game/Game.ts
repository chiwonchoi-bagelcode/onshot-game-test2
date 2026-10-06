import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GRAVITY, GROUPS, G, groups, MAX_STEPS_PER_FRAME, PAW, REACH, SOUND_MIN_IMPACT, STEP } from '../core/constants';
import { clamp, rand, pick, srand, reseed } from '../core/util';
import type { Sfx } from '../audio/Sfx';
import { Debris } from '../fx/Debris';
import { ChunkSystem, PuffSystem } from '../fx/Particles';
import { Decals } from '../fx/Decals';
import { Prop } from './Prop';
import type { ColDef, FxKind, LevelDef, Mat, PropSpec } from './types';
import { Cat } from './Cat';
import { Owner } from './Owner';
import { Aim } from './Aim';
import { Builder } from '../levels/Builder';

export type Phase = 'intro' | 'ready' | 'ending' | 'done';

export interface Result {
  success: boolean;
  score: number;
  stars: number;
  maxChain: number;
  broken: number;
  pawsLeft: number;
  pawBonus: number;
}

export type GameEvent =
  | { type: 'score'; amount: number; total: number; pos: THREE.Vector3; big: boolean; chain: number }
  | { type: 'word'; text: string; pos: THREE.Vector3; size: number; color: string }
  | { type: 'chain'; n: number }
  | { type: 'paws'; left: number; max: number }
  | { type: 'goal'; done: number; need: number; complete: boolean }
  | { type: 'toast'; text: string }
  | { type: 'bubble'; text: string; anchor: () => THREE.Vector3; dur: number; style: 'cat' | 'owner' | 'info' }
  | { type: 'phase'; phase: Phase }
  | { type: 'goalReached' }
  | { type: 'end'; result: Result }
  | { type: 'sleep'; value: number }
  | { type: 'aim'; label: string | null; power: number };

/** Sfx-compatible no-op used in headless simulation */
export type SfxLike = Pick<Sfx, keyof Sfx>;

const WORDS: Partial<Record<Mat, string[]>> = {
  glass: ['쨍그랑!', '챙그랑!'],
  ceramic: ['와장창!', '쨍강!', '와장창창!'],
  egg: ['퍽!', '철퍽!'],
  food: ['철퍽!', '뭉개짐!'],
  electronic: ['파지직!', '퍽! 지지직'],
  wood: ['우지끈!'],
  paper: ['털썩!', '와르르!'],
  plastic: ['와그작!'],
  marble: ['쨍그랑!'],
  soft: ['펑!'],
};

const _v = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _q = new THREE.Quaternion();

export class Game {
  readonly scene = new THREE.Group();
  readonly envGroup = new THREE.Group();
  readonly propGroup = new THREE.Group();
  world!: RAPIER.World;
  events!: RAPIER.EventQueue;
  props: Prop[] = [];
  private byCollider = new Map<number, Prop>();
  ownerColliders = new Set<number>();
  level!: LevelDef;

  debris!: Debris;
  puffs = new PuffSystem(260, false);
  glows = new PuffSystem(160, true, 'star');
  chunks = new ChunkSystem(320);
  decals = new Decals(56);
  cat = new Cat();
  owner: Owner | null = null;
  aim = new Aim();

  time = 0;
  phase: Phase = 'intro';
  paws = 3;
  maxPaws = 3;
  score = 0;
  chain = 0;
  maxChain = 0;
  brokenCount = 0;
  goalComplete = false;
  private goalAnnounced = false;
  private lastActionTime = -100;
  private settleTimer = 0;
  private endTimer = -1;
  private acc = 0;
  timeScale = 1;
  private slowTimer = 0;
  private slowScale = 1;
  private hitstop = 0;
  private endRequested = false;
  private listeners: ((e: GameEvent) => void)[] = [];
  private updaters: ((dt: number) => void)[] = [];
  /** world-space bounds of the room for camera framing */
  framePoints: THREE.Vector3[] = [];
  view = { yaw: 0.5, pitch: 0.72, fov: 30 };
  catHome = new THREE.Vector3(3, 0, 3);
  floorY = 0;
  roomBounds = { minX: -5, maxX: 5, minZ: -4.5, maxZ: 4.5 };
  readonly headless: boolean;
  builder: Builder | null = null;

  constructor(readonly R: typeof RAPIER, readonly sfx: SfxLike, opts: { headless?: boolean } = {}) {
    this.headless = !!opts.headless;
    this.scene.add(this.envGroup, this.propGroup, this.decals.group, this.puffs.mesh, this.glows.mesh, this.chunks.mesh, this.cat.group, this.aim.group);
  }

  on(fn: (e: GameEvent) => void) { this.listeners.push(fn); }
  emit(e: GameEvent) { for (const l of this.listeners) l(e); }
  addUpdater(fn: (dt: number) => void) { this.updaters.push(fn); }

  /* ------------------------------------------------------------ */
  /* level lifecycle                                              */
  /* ------------------------------------------------------------ */

  load(level: LevelDef) {
    this.unload();
    this.level = level;
    reseed([...level.id].reduce((a, c) => a * 31 + c.charCodeAt(0), 7));
    const R = this.R;
    this.world = new R.World({ x: 0, y: GRAVITY, z: 0 });
    this.world.timestep = STEP;
    this.world.numSolverIterations = 6;
    this.events = new R.EventQueue(true);
    this.debris = new Debris(R, this.world, 170);
    this.scene.add(this.debris.mesh);
    this.time = 0;
    this.phase = 'intro';
    this.paws = this.maxPaws = level.paws;
    this.score = 0; this.chain = 0; this.maxChain = 0; this.brokenCount = 0;
    this.goalComplete = false; this.goalAnnounced = false;
    this.lastActionTime = -100; this.settleTimer = 0; this.endTimer = -1;
    this.timeScale = 1; this.slowTimer = 0; this.hitstop = 0; this.acc = 0;
    this.endRequested = false;
    const b = new Builder(this);
    level.build(b);
    b.finish();
    this.cat.reset(this.catHome);
    for (const p of this.props) p.sync();
    this.emit({ type: 'paws', left: this.paws, max: this.maxPaws });
    this.emitGoal();
  }

  unload() {
    this.updaters = [];
    for (const p of this.props) p.special?.dispose?.(this, p);
    this.props = [];
    this.byCollider.clear();
    this.ownerColliders.clear();
    this.envGroup.clear();
    this.propGroup.clear();
    this.decals.clear();
    this.puffs.clear(); this.glows.clear(); this.chunks.clear();
    this.aim.hide();
    if (this.debris) { this.debris.clear(); this.scene.remove(this.debris.mesh); }
    if (this.owner) { this.owner.dispose(); this.scene.remove(this.owner.group); this.owner = null; }
    if (this.world) { this.world.free(); this.events.free(); }
    this.framePoints = [];
  }

  start() {
    this.phase = 'ready';
    this.emit({ type: 'phase', phase: 'ready' });
  }

  /* ------------------------------------------------------------ */
  /* physics construction                                         */
  /* ------------------------------------------------------------ */

  colliderDesc(c: ColDef): RAPIER.ColliderDesc {
    const R = this.R;
    let d: RAPIER.ColliderDesc | null = null;
    switch (c.shape) {
      case 'box': d = c.round ? R.ColliderDesc.roundCuboid(c.hx - c.round, c.hy - c.round, c.hz - c.round, c.round) : R.ColliderDesc.cuboid(c.hx, c.hy, c.hz); break;
      case 'cyl': d = R.ColliderDesc.cylinder(c.hh, c.r); break;
      case 'ball': d = R.ColliderDesc.ball(c.r); break;
      case 'cone': d = R.ColliderDesc.cone(c.hh, c.r); break;
      case 'capsule': d = R.ColliderDesc.capsule(c.hh, c.r); break;
      case 'hull': d = R.ColliderDesc.convexHull(new Float32Array(c.points)); break;
    }
    if (!d) d = R.ColliderDesc.ball(0.2);
    if (c.at) d.setTranslation(c.at[0], c.at[1], c.at[2]);
    if (c.rot) {
      _q.setFromEuler(new THREE.Euler(c.rot[0], c.rot[1], c.rot[2]));
      d.setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w });
    }
    return d;
  }

  addStatic(cols: ColDef[], pos: [number, number, number], rotY = 0, o: { friction?: number; restitution?: number; invisible?: boolean } = {}) {
    const R = this.R;
    _q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY);
    const body = this.world.createRigidBody(
      R.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]).setRotation({ x: _q.x, y: _q.y, z: _q.z, w: _q.w }),
    );
    for (const c of cols) {
      const d = this.colliderDesc(c)
        .setFriction(c.friction ?? o.friction ?? 0.7)
        .setRestitution(c.restitution ?? o.restitution ?? 0.15)
        .setCollisionGroups(o.invisible ? GROUPS.invis : GROUPS.static);
      if (c.restitution !== undefined || o.restitution !== undefined) d.setRestitutionCombineRule(R.CoefficientCombineRule.Max);
      this.world.createCollider(d, body);
    }
    return body;
  }

  addProp(spec: PropSpec): Prop {
    const R = this.R;
    const q = spec.quat ?? new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), spec.rotY ?? 0);
    let bd: RAPIER.RigidBodyDesc;
    if (spec.kinematic) bd = R.RigidBodyDesc.kinematicPositionBased();
    else if (spec.pinned !== undefined) bd = R.RigidBodyDesc.fixed();
    else bd = R.RigidBodyDesc.dynamic();
    bd.setTranslation(spec.pos[0], spec.pos[1], spec.pos[2])
      .setRotation({ x: q.x, y: q.y, z: q.z, w: q.w })
      .setLinearDamping(spec.linDamp ?? 0.05)
      .setAngularDamping(spec.angDamp ?? 0.25)
      .setCcdEnabled(spec.ccd ?? true);
    const body = this.world.createRigidBody(bd);
    const prop = new Prop(spec, body);
    const n = spec.colliders.length;
    for (const c of spec.colliders) {
      const share = c.massShare ?? 1 / n;
      const d = this.colliderDesc(c)
        .setMass(Math.max(0.01, spec.mass * share))
        .setFriction(c.friction ?? spec.friction ?? 0.6)
        .setRestitution(c.restitution ?? spec.restitution ?? 0.12)
        .setCollisionGroups(GROUPS.prop);
      const thr = Math.min(spec.pinned ?? Infinity, spec.breakable?.hitForce ?? Infinity, spec.touchForce ?? Infinity);
      if (thr < Infinity) {
        d.setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(thr);
      }
      const col = this.world.createCollider(d, body);
      prop.colliderHandles.push(col.handle);
      this.byCollider.set(col.handle, prop);
    }
    spec.group.position.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    spec.group.quaternion.copy(q);
    spec.group.userData.prop = prop;
    this.propGroup.add(spec.group);
    this.props.push(prop);
    return prop;
  }

  propOf(colliderHandle: number): Prop | undefined { return this.byCollider.get(colliderHandle); }

  removeProp(p: Prop) {
    if (!p.alive) return;
    p.alive = false;
    for (const h of p.colliderHandles) this.byCollider.delete(h);
    this.world.removeRigidBody(p.body);
    this.propGroup.remove(p.group);
  }

  unpin(p: Prop) {
    if (p.pinned === null || !p.alive) return;
    p.pinned = null;
    p.body.setBodyType(this.R.RigidBodyType.Dynamic, true);
    p.body.wakeUp();
    p.prevV.set(0, 0, 0); p.prevW.set(0, 0, 0);
  }

  /* ------------------------------------------------------------ */
  /* queries                                                      */
  /* ------------------------------------------------------------ */

  /** highest surface (static or prop) below a point */
  groundBelow(x: number, y: number, z: number, maxDist = 30, staticOnly = false): { y: number; normal: THREE.Vector3 } | null {
    const ray = new this.R.Ray({ x, y, z }, { x: 0, y: -1, z: 0 });
    const filter = staticOnly ? groups(G.PROP, G.STATIC) : groups(G.PROP, G.STATIC | G.PROP);
    const hit = this.world.castRayAndGetNormal(ray, maxDist, true, undefined, filter);
    if (!hit) return null;
    return { y: y - hit.timeOfImpact, normal: new THREE.Vector3(hit.normal.x, hit.normal.y, hit.normal.z) };
  }

  reachable(p: Prop): boolean {
    if (!p.alive || !p.interactable) return false;
    const t = p.body.translation();
    return t.y + Math.min(0.3, p.height * 0.2) < REACH;
  }

  targetsLeft(): Prop[] { return this.props.filter((p) => p.target && p.alive && !p.broken && !p.damaged); }

  /* ------------------------------------------------------------ */
  /* the paw                                                      */
  /* ------------------------------------------------------------ */

  canAct(): boolean {
    return this.phase === 'ready' && this.paws > 0 && !this.cat.busy();
  }

  /** player committed a swat: the cat leaps and strikes after a short anticipation */
  swat(p: Prop, dir: THREE.Vector3, power: number, hit: THREE.Vector3): boolean {
    if (!this.canAct() || !p.alive) return false;
    if (!this.reachable(p)) {
      this.emit({ type: 'toast', text: '너무 높아서 앞발이 닿지 않아요!' });
      this.sfx.denied();
      return false;
    }
    this.paws--;
    this.emit({ type: 'paws', left: this.paws, max: this.maxPaws });
    this.chain = 0;
    this.lastActionTime = this.time;
    this.settleTimer = 0;
    const d = dir.clone().setY(0).normalize();
    const pw = clamp(power, PAW.minPower, 1);
    const strike = hit.clone();
    const t = p.body.translation();
    strike.y = clamp(strike.y, t.y + 0.05, REACH);
    this.cat.performSwat(this, p, d, strike, pw, () => this.applySwat(p, d, pw, strike));
    return true;
  }

  applySwat(p: Prop, dir: THREE.Vector3, power: number, point: THREE.Vector3) {
    this.lastActionTime = this.time;
    if (!p.alive) return;
    this.sfx.swat(power);
    if (p.pinned !== null) this.unpin(p);
    const body = p.body;
    body.wakeUp();
    p.lastSwatAt = this.time;
    let handled = false;
    if (p.special?.onSwat) handled = p.special.onSwat(this, p, dir, power, point);
    if (!handled && !p.kinematic) {
      const m = body.mass();
      const dv = PAW.vmax * power * Math.min(1, PAW.mref / m);
      const imp = _v.copy(dir).multiplyScalar(dv * m);
      imp.y += PAW.lift * dv * m;
      body.applyImpulseAtPoint({ x: imp.x, y: imp.y, z: imp.z }, { x: point.x, y: point.y, z: point.z }, true);
      const w = body.angvel();
      const wl = Math.hypot(w.x, w.y, w.z);
      if (wl > 16) body.setAngvel({ x: (w.x / wl) * 16, y: (w.y / wl) * 16, z: (w.z / wl) * 16 }, true);
      if (dv < 1.6) {
        this.emit({ type: 'word', text: pick(['꿈쩍!', '끄응..', '무거워!']), pos: point.clone(), size: 0.9, color: '#ffffff' });
      }
    }
    const lv = body.linvel(), av = body.angvel();
    p.prevV.set(lv.x, lv.y, lv.z);
    p.prevW.set(av.x, av.y, av.z);
    p.graceUntil = this.time + 0.08;
    // paw impact puff
    this.puffs.emit({ pos: point.clone(), life: 0.35, size0: 0.25, size1: 1.0, color: '#ffffff', alpha: 0.9, drag: 4 });
    for (let i = 0; i < 5; i++) {
      this.glows.emit({ pos: point.clone(), vel: new THREE.Vector3(rand(-3, 3), rand(0, 4), rand(-3, 3)), life: 0.35, size0: 0.35, size1: 0.05, color: '#fff3b0', drag: 3 });
    }
    this.hitstop = 0.045;
    this.shake(0.25 + power * 0.25);
    if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
  }

  /* ------------------------------------------------------------ */
  /* scoring & goal                                               */
  /* ------------------------------------------------------------ */

  addScore(amount: number, pos: THREE.Vector3, opts: { chain?: boolean } = {}) {
    let total = Math.round(amount);
    if (opts.chain !== false) {
      this.chain++;
      this.maxChain = Math.max(this.maxChain, this.chain);
      if (this.chain > 1) total += 500 * (this.chain - 1);
      this.sfx.chain(this.chain - 1);
      if (this.chain >= 3) this.emit({ type: 'chain', n: this.chain });
    }
    this.score += total;
    this.emit({ type: 'score', amount: total, total: this.score, pos: pos.clone(), big: total >= 50000, chain: this.chain });
    this.checkGoal();
  }

  goalProgress(): { done: number; need: number } {
    const g = this.level.goal;
    if (g.kind === 'wake') return { done: this.owner?.awake ? 1 : 0, need: 1 };
    if (g.kind === 'score') return { done: Math.min(this.score, g.amount ?? 0), need: g.amount ?? 0 };
    const targets = this.props.filter((p) => p.target);
    const need = g.count ?? targets.length;
    let done = 0;
    for (const p of targets) {
      if (g.kind === 'break' && (p.broken || p.damaged)) done++;
      if (g.kind === 'floor' && (p.broken || p.damaged || p.onFloor || !p.alive)) done++;
    }
    return { done: Math.min(done, need), need };
  }

  emitGoal() {
    const { done, need } = this.goalProgress();
    this.emit({ type: 'goal', done, need, complete: done >= need });
  }

  checkGoal() {
    if (!this.level) return;
    const { done, need } = this.goalProgress();
    this.emit({ type: 'goal', done, need, complete: done >= need });
    if (done >= need && !this.goalComplete) {
      this.goalComplete = true;
      this.sfx.target();
      this.emit({ type: 'goalReached' });
    }
  }

  /* ------------------------------------------------------------ */
  /* breaking & effects                                           */
  /* ------------------------------------------------------------ */

  breakProp(p: Prop, impact: number) {
    const b = p.breakable;
    if (!b || p.broken || p.damaged || !p.alive) return;
    const pos = p.center(new THREE.Vector3());
    const vel = p.prevV.clone();
    const k = clamp(impact / 14, 0.3, 1);
    const pan = clamp(pos.x / 8, -1, 1);
    if (b.mode === 'shatter') {
      p.broken = true;
      const n = b.debris?.count ?? 8;
      const box = p.localBox;
      p.group.updateMatrixWorld(true);
      for (let i = 0; i < n; i++) {
        _v.set(srand(box.min.x, box.max.x), srand(box.min.y, box.max.y), srand(box.min.z, box.max.z)).applyMatrix4(p.group.matrixWorld);
        _v2.copy(_v).sub(pos).setY(0).normalize().multiplyScalar(srand(1.5, 4.5) * (0.6 + k));
        _v2.y = srand(1.5, 5) * (0.6 + k * 0.6);
        _v2.addScaledVector(vel, 0.25);
        const colors = b.debris?.colors ?? ['#ffffff'];
        this.debris.spawn(_v, _v2, (b.debris?.size ?? 0.2) * srand(0.7, 1.25), colors[i % colors.length], b.debris?.flat);
      }
      this.removeProp(p);
    } else {
      p.damaged = true;
      b.onDamage?.(p);
      const colors = b.debris?.colors;
      if (colors) for (let i = 0; i < (b.debris?.count ?? 3); i++) {
        _v2.set(srand(-2, 2), srand(2, 4), srand(-2, 2));
        this.debris.spawn(pos, _v2, (b.debris?.size ?? 0.15), colors[i % colors.length], b.debris?.flat);
      }
    }
    this.brokenCount++;
    this.owner?.hear(this, pos, clamp(p.value / 5000, 6, 30));
    this.sfx.shatter(p.mat, k, pan);
    this.fx(b.fx ?? 'none', pos, k);
    this.puffs.emit({ pos: pos.clone(), life: 0.7, size0: 0.6, size1: 2.2, color: '#fff7ea', alpha: 0.7, drag: 3 });
    const words = WORDS[p.mat];
    const word = b.word ?? (words ? pick(words) : '와장창!');
    const big = p.value >= 100000 || p.target;
    this.emit({ type: 'word', text: word, pos: pos.clone().add(new THREE.Vector3(0, 0.6, 0)), size: big ? 1.5 : 1.0, color: p.target ? '#ff4f6d' : '#ffd23f' });
    this.addScore(p.value, pos);
    this.shake(clamp(0.25 + p.value / 300000, 0.25, 1));
    if (big) this.punch(1.2);
    if (p.target) {
      this.slowmo(0.3, 0.75);
      this.glowBurst(pos, '#ff8fa3', 14);
    } else if (p.value >= 100000) {
      this.slowmo(0.5, 0.35);
    }
    if (!this.headless && navigator.vibrate) navigator.vibrate(big ? 40 : 18);
    p.special?.onBreak?.(this, p);
    b.after?.(this, p, pos, vel);
    this.checkGoal();
  }

  glowBurst(pos: THREE.Vector3, color: string, n: number) {
    for (let i = 0; i < n; i++) {
      this.glows.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-5, 5), rand(1, 7), rand(-5, 5)), life: rand(0.5, 0.9), size0: rand(0.3, 0.6), size1: 0.05, color, drag: 2.5, gravity: -6 });
    }
  }

  stain(pos: THREE.Vector3, size: number, color: string, opacity = 0.9) {
    const g = this.groundBelow(pos.x, pos.y + 0.3, pos.z, 20, true);
    if (!g) return;
    this.decals.add(new THREE.Vector3(pos.x + rand(-0.2, 0.2), g.y, pos.z + rand(-0.2, 0.2)), g.normal, size, color, opacity);
  }

  fx(kind: FxKind, pos: THREE.Vector3, k: number) {
    const pan = clamp(pos.x / 8, -1, 1);
    const drops = (n: number, colors: string[], speed: number, size: number, opts: Partial<{ flat: boolean; flutter: boolean; life: number; gravity: number; drag: number }> = {}) => {
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2;
        const s = rand(0.3, 1) * speed;
        this.chunks.emit({
          pos: pos.clone().add(new THREE.Vector3(rand(-0.15, 0.15), rand(0, 0.3), rand(-0.15, 0.15))),
          vel: new THREE.Vector3(Math.cos(a) * s, rand(0.4, 1.2) * speed, Math.sin(a) * s),
          life: opts.life ?? rand(0.7, 1.3), size: size * rand(0.6, 1.3), color: colors[i % colors.length],
          flat: opts.flat, flutter: opts.flutter, gravity: opts.gravity, drag: opts.drag,
          floor: this.floorY + 0.03,
        });
      }
    };
    switch (kind) {
      case 'water':
        drops(22, ['#7fd4ff', '#bfeaff', '#5ab8f0'], 5, 0.16);
        this.sfx.splash(k, pan);
        this.stain(pos, 1.3, '#8fd3f5', 0.6);
        break;
      case 'juice':
        drops(16, ['#ffb347', '#ffd27f'], 4.5, 0.15);
        this.sfx.splash(k * 0.8, pan);
        this.stain(pos, 1.1, '#ffb347', 0.75);
        break;
      case 'coffee':
        drops(14, ['#7a4a2a', '#a5714a'], 4, 0.14);
        this.sfx.splash(k * 0.6, pan);
        this.stain(pos, 0.9, '#6b3f22', 0.8);
        break;
      case 'dirt':
        drops(20, ['#7b5232', '#5e3d22', '#8e6a44'], 4, 0.17);
        this.stain(pos, 1.1, '#6a4528', 0.95);
        for (let i = 0; i < 3; i++) this.puffs.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-1, 1), rand(0.5, 1.5), rand(-1, 1)), life: 0.9, size0: 0.6, size1: 1.8, color: '#b08a66', alpha: 0.6 });
        break;
      case 'flour':
        for (let i = 0; i < 18; i++) this.puffs.emit({ pos: pos.clone().add(new THREE.Vector3(rand(-0.3, 0.3), rand(0, 0.4), rand(-0.3, 0.3))), vel: new THREE.Vector3(rand(-3, 3), rand(0.5, 3.5), rand(-3, 3)), life: rand(1.4, 2.4), size0: 0.8, size1: rand(2.4, 3.6), color: '#ffffff', alpha: 0.85, drag: 1.8, gravity: -0.4 });
        this.sfx.puff(1, pan);
        this.stain(pos, 1.8, '#fbf7ef', 0.95);
        break;
      case 'yolk':
        drops(10, ['#ffd23f', '#fff4d6'], 3, 0.13);
        this.stain(pos, 0.7, '#ffd23f', 0.95);
        break;
      case 'cream':
        drops(18, ['#fff4f8', '#ff9fc0', '#fff'], 4, 0.18);
        this.stain(pos, 1.3, '#ffe9f0', 0.95);
        break;
      case 'sparks':
        for (let i = 0; i < 26; i++) this.glows.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-6, 6), rand(2, 8), rand(-6, 6)), life: rand(0.3, 0.7), size0: 0.35, size1: 0.05, color: pick(['#fff3a0', '#ffd35a', '#a8e8ff']), gravity: -14, drag: 1 });
        for (let i = 0; i < 4; i++) this.puffs.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-0.5, 0.5), rand(1, 2), rand(-0.5, 0.5)), life: 1.8, size0: 0.6, size1: 2.2, color: '#5d5d6b', alpha: 0.55, drag: 1 });
        this.sfx.sparks(1, pan);
        break;
      case 'coins':
        drops(18, ['#ffd23f', '#ffe680', '#e6b422'], 5.5, 0.2, { flat: true, life: 2.2 });
        this.sfx.coins(1, pan);
        break;
      case 'feathers':
        drops(18, ['#ffffff', '#f4f0ff'], 3, 0.2, { flat: true, flutter: true, life: 3, gravity: -2, drag: 2 });
        break;
      case 'paper':
        drops(10, ['#ffffff', '#f2f2f2'], 3, 0.3, { flat: true, flutter: true, life: 3, gravity: -3, drag: 2 });
        break;
      case 'flowers':
        drops(14, ['#ff7aa8', '#ffd23f', '#ffffff', '#7bd389'], 3.5, 0.17, { flat: true, flutter: true, life: 2.6, gravity: -6, drag: 1.5 });
        this.sfx.splash(k * 0.6, pan);
        this.stain(pos, 1.0, '#8fd3f5', 0.55);
        break;
      case 'glass':
        for (let i = 0; i < 10; i++) this.glows.emit({ pos: pos.clone(), vel: new THREE.Vector3(rand(-4, 4), rand(1, 5), rand(-4, 4)), life: rand(0.4, 0.8), size0: 0.4, size1: 0.05, color: '#e8fbff', drag: 2.5, gravity: -10 });
        break;
      default:
        break;
    }
  }

  shake(a: number) { this.shakeAmt = Math.max(this.shakeAmt, a); }
  shakeAmt = 0;
  punchAmt = 0;
  punch(a: number) { this.punchAmt += a; }

  slowmo(scale: number, dur: number) {
    if (this.headless) return;
    this.slowScale = Math.min(this.slowTimer > 0 ? this.slowScale : 1, scale);
    this.slowTimer = Math.max(this.slowTimer, dur);
  }

  /* ------------------------------------------------------------ */
  /* simulation                                                   */
  /* ------------------------------------------------------------ */

  /** advance by real dt (seconds). Returns game dt actually simulated. */
  update(realDt: number): number {
    if (!this.world) return 0;
    const dt = Math.min(realDt, 0.1);
    // time scale: slow-mo eases back to 1
    if (this.slowTimer > 0) {
      this.slowTimer -= dt;
      this.timeScale = this.slowScale;
    } else {
      this.timeScale = Math.min(1, this.timeScale + dt * 2.5);
    }
    let scale = this.timeScale;
    if (this.hitstop > 0) { this.hitstop -= dt; scale = 0; }

    // Physics always steps with a constant dt (varying dt makes Rapier's
    // warm-started contacts spike). Slow motion = fewer steps + interpolation.
    if (this.phase !== 'intro') {
      this.acc += dt * scale;
      let steps = 0;
      while (this.acc >= STEP && steps < MAX_STEPS_PER_FRAME) {
        this.fixedStep(STEP);
        this.acc -= STEP;
        steps++;
      }
      if (steps === MAX_STEPS_PER_FRAME && this.acc > STEP) this.acc = STEP * 0.5;
    }
    const alpha = this.phase === 'intro' ? 1 : Math.min(1, this.acc / STEP);
    const gdt = dt * scale;
    for (const p of this.props) if (p.alive) {
      p.syncInterp(alpha);
      p.special?.frame?.(this, p, gdt);
    }
    this.debris.update(gdt, alpha);
    this.puffs.update(gdt);
    this.glows.update(gdt);
    this.chunks.update(gdt);
    this.decals.update(gdt);
    this.cat.update(this, dt, gdt);
    this.owner?.update(this, gdt, dt);
    this.aim.update(dt);
    for (const u of this.updaters) u(gdt);
    this.updateFlow(dt);
    return gdt;
  }

  private fixedStep(h: number) {
    if (h <= 0.0001) return;
    this.time += h;
    for (const p of this.props) if (p.alive) {
      p.savePrev();
      if (p.special?.step) p.special.step(this, p, h);
    }
    this.debris.savePrev();
    this.world.timestep = h;
    this.world.step(this.events);
    this.events.drainContactForceEvents((e) => {
      const h1 = e.collider1(), h2 = e.collider2();
      const f = e.totalForceMagnitude();
      for (const [a, b] of [[h1, h2], [h2, h1]]) {
        const p = this.byCollider.get(a);
        if (p && p.pinned !== null && f > p.pinned) {
          const other = this.byCollider.get(b);
          if (!other || other.isDynamic()) this.unpin(p);
        }
        if (p && p.spec.touchForce && f > p.spec.touchForce && p.special?.onTouch && this.time > 0.7) {
          const other = this.byCollider.get(b);
          if (other && other.isDynamic()) p.special.onTouch(this, p, other);
        }
        const hf = p?.breakable?.hitForce;
        if (p && hf && f > hf && this.time > 0.7 && !p.broken && !p.damaged) {
          const other = this.byCollider.get(b);
          if (other && other.isDynamic() && other.body.mass() > 0.3) this.breakProp(p, f / (60 * Math.max(1, p.body.mass())) + p.breakable!.threshold);
        }
        if (this.ownerColliders.has(a) && this.owner) {
          const other = this.byCollider.get(b);
          if (other) this.owner.hitBy(this, other, f);
        }
      }
    });
    this.events.drainCollisionEvents(() => {});
    const gy = GRAVITY * h;
    const settle = this.time > 0.7;
    for (const p of this.props) {
      if (!p.isDynamic()) continue;
      const body = p.body;
      if (body.isSleeping()) { p.prevV.set(0, 0, 0); p.prevW.set(0, 0, 0); continue; }
      const v = body.linvel(), w = body.angvel();
      const gs = body.gravityScale();
      const dvx = v.x - p.prevV.x, dvy = v.y - (p.prevV.y + gy * gs), dvz = v.z - p.prevV.z;
      const dwx = w.x - p.prevW.x, dwy = w.y - p.prevW.y, dwz = w.z - p.prevW.z;
      const impact = Math.sqrt(dvx * dvx + dvy * dvy + dvz * dvz) + 0.35 * Math.sqrt(dwx * dwx + dwy * dwy + dwz * dwz) * p.radius;
      if (settle && impact > SOUND_MIN_IMPACT && this.time > p.graceUntil) this.onImpact(p, impact);
      if (p.alive) {
        p.prevV.set(v.x, v.y, v.z);
        p.prevW.set(w.x, w.y, w.z);
        this.trackMotion(p);
      }
    }
  }

  private onImpact(p: Prop, impact: number) {
    p.lastImpact = impact;
    const m = p.body.mass();
    if (this.time - p.lastSound > 0.07) {
      p.lastSound = this.time;
      const k = clamp((impact - SOUND_MIN_IMPACT) / 9, 0, 1);
      const t = p.body.translation();
      const pan = clamp(t.x / 8, -1, 1);
      if (p.mat === 'squeak' || (m > 2.5 && impact > 4)) this.owner?.hear(this, _v.set(t.x, t.y, t.z), p.mat === 'squeak' ? 7 : 4 + m * k);
      if (m > 6 && impact > 3) {
        this.sfx.heavyThud(k, pan);
        this.shake(clamp(m / 40 * k, 0.15, 0.7));
        _v.set(t.x, t.y, t.z);
        for (let i = 0; i < 3; i++) this.puffs.emit({ pos: _v.clone(), vel: new THREE.Vector3(rand(-2, 2), rand(0.2, 1), rand(-2, 2)), life: 0.8, size0: 0.6, size1: 2, color: '#f3e6d6', alpha: 0.6, drag: 2.5 });
      }
      this.sfx.impact(p.mat, k, pan);
    }
    p.special?.onImpact?.(this, p, impact);
    if (p.breakable && impact > p.breakable.threshold && this.time > p.graceUntil) this.breakProp(p, impact);
  }

  private trackMotion(p: Prop) {
    const t = p.body.translation();
    if (t.y < p.minY) p.minY = t.y;
    if (t.y < -4) {
      this.removeProp(p);
      return;
    }
    const floorish = t.y < this.floorY + 0.35;
    if (floorish && p.startPos.y > this.floorY + 0.8) p.onFloor = true;
    if (p.spec.scoreMoves === false || p.broken) return;
    if (!p.fell && p.startPos.y - t.y > 1.1) {
      p.fell = true;
      const amt = Math.max(300, p.value * 0.12);
      this.addScore(amt, _v.set(t.x, t.y + p.height * 0.5, t.z));
      if (p.target && this.level.goal.kind === 'floor') this.checkGoal();
    }
    if (!p.toppled && !p.spec.noTopple) {
      p.up(_v2);
      if (_v2.dot(p.startUp) < 0.7) {
        p.toppled = true;
        const amt = p.spec.toppleValue ?? Math.max(200, p.value * 0.06);
        this.addScore(amt, _v.set(t.x, t.y + p.height * 0.5, t.z));
      }
    }
    if (p.onFloor && p.target && this.level.goal.kind === 'floor') this.checkGoal();
  }

  /** is anything still moving / happening? */
  busy(): boolean {
    if (this.cat.busy()) return true;
    for (const p of this.props) {
      if (!p.alive) continue;
      if (p.special?.busy()) return true;
      if (!p.isDynamic() || p.body.isSleeping()) continue;
      const v = p.body.linvel(), w = p.body.angvel();
      if (v.x * v.x + v.y * v.y + v.z * v.z > 0.12 || w.x * w.x + w.y * w.y + w.z * w.z > 0.5) return true;
    }
    if (this.owner?.busy()) return true;
    return false;
  }

  requestEnd() {
    if (this.phase === 'ready' && this.goalComplete) this.endRequested = true;
  }

  private updateFlow(dt: number) {
    if (this.phase === 'ready') {
      const since = this.time - this.lastActionTime;
      const busy = this.busy();
      this.settleTimer = busy ? 0 : this.settleTimer + dt;
      const settled = this.settleTimer > 0.7 || since > 14;
      if (this.goalComplete && !this.goalAnnounced) {
        this.goalAnnounced = true;
      }
      const noMore = this.paws <= 0 && !this.cat.busy();
      if ((this.goalComplete && (this.endRequested || noMore) && settled) || (!this.goalComplete && noMore && settled && since > 1.2)) {
        this.beginEnding(this.goalComplete);
      }
    } else if (this.phase === 'ending') {
      this.endTimer -= dt;
      if (this.endTimer <= 0) this.finish();
    }
  }

  private pendingResult: Result | null = null;

  private beginEnding(success: boolean) {
    this.phase = 'ending';
    this.emit({ type: 'phase', phase: 'ending' });
    const pawBonus = success ? this.paws * 10000 : 0;
    if (pawBonus) this.score += pawBonus;
    const [s2, s3] = this.level.stars;
    const stars = success ? (this.score >= s3 ? 3 : this.score >= s2 ? 2 : 1) : 0;
    this.pendingResult = { success, score: this.score, stars, maxChain: this.maxChain, broken: this.brokenCount, pawsLeft: this.paws, pawBonus };
    this.endTimer = this.headless ? 0 : success ? 3.6 : 2.4;
    this.cat.ending(this, success);
    if (this.owner) this.owner.discover(this, success);
  }

  private finish() {
    this.phase = 'done';
    this.emit({ type: 'phase', phase: 'done' });
    if (this.pendingResult) this.emit({ type: 'end', result: this.pendingResult });
  }

  /** for headless sims: run until settled */
  simulate(seconds: number) {
    const n = Math.round(seconds / STEP);
    for (let i = 0; i < n; i++) this.update(STEP + 1e-7);
  }
}
