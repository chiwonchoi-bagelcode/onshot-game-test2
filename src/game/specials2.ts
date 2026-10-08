import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { clamp, rand } from '../core/util';
import { M, cyl, mesh } from '../render/kit';
import type { Loop } from '../audio/Sfx';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Special } from './types';

const _v = new THREE.Vector3();
const _q = new THREE.Quaternion();

/* ------------------------------------------------------------------ */
/* Soap: almost frictionless – a gentle tap sends it across the room.   */
/* ------------------------------------------------------------------ */
export class SoapSpecial implements Special {
  label = '미끄덩';
  private start = new THREE.Vector3();
  private tracking = false;
  busy() { return false; }
  onSwat(game: Game, p: Prop): boolean {
    const t = p.body.translation();
    this.start.set(t.x, 0, t.z);
    this.tracking = true;
    game.sfx.squish();
    return false;
  }
  onImpact(game: Game, p: Prop, impact: number) { if (impact > 2) game.sfx.squish(clamp(p.body.translation().x / 8, -1, 1)); }
  frame(game: Game, p: Prop) {
    if (!this.tracking) return;
    const t = p.body.translation();
    const d = Math.hypot(t.x - this.start.x, t.z - this.start.z);
    game.best('soapDist', d);
    if (d > 3) game.discover('soap', new THREE.Vector3(t.x, t.y, t.z));
  }
}

/* ------------------------------------------------------------------ */
/* Toy train: switch it on and it chugs along its rails, shoving        */
/* whatever sits on the track.                                          */
/* ------------------------------------------------------------------ */
export class TrainSpecial implements Special {
  label = '출발!';
  active = false;
  private idx = 0;
  private timer = 0;
  private loop: Loop | null = null;
  constructor(private path: THREE.Vector3[], private loopPath: boolean, private speed = 3.2, private duration = 10) {}
  busy() { return this.active; }
  onSwat(game: Game, p: Prop): boolean {
    if (!this.active) {
      this.active = true;
      this.timer = this.duration;
      // start from the nearest waypoint ahead
      const t = p.body.translation();
      let best = 0, bd = Infinity;
      this.path.forEach((w, i) => { const d = Math.hypot(w.x - t.x, w.z - t.z); if (d < bd) { bd = d; best = i; } });
      this.idx = (best + 1) % this.path.length;
      game.sfx.choo();
      this.loop = game.sfx.motor();
      this.loop.set?.(1);
      game.discover('train', new THREE.Vector3(t.x, t.y, t.z));
      game.emit({ type: 'word', text: '칙칙폭폭!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 1, color: '#ffd23f' });
    } else this.timer = this.duration;
    return true;
  }
  step(game: Game, p: Prop, h: number) {
    if (!this.active) return;
    this.timer -= h;
    const b = p.body;
    b.wakeUp();
    const t = b.translation();
    let wp = this.path[this.idx];
    if (Math.hypot(wp.x - t.x, wp.z - t.z) < 0.45) {
      this.idx++;
      if (this.idx >= this.path.length) {
        if (this.loopPath) this.idx = 0;
        else { this.idx = this.path.length - 1; this.timer = Math.min(this.timer, 0.6); }
      }
      wp = this.path[this.idx];
    }
    const dx = wp.x - t.x, dz = wp.z - t.z;
    const dl = Math.hypot(dx, dz) || 1;
    const v = b.linvel();
    const m = b.mass();
    const fx = ((dx / dl) * this.speed - v.x) * m * 9, fz = ((dz / dl) * this.speed - v.z) * m * 9;
    const fl = Math.hypot(fx, fz), maxF = 140;
    const k = fl > maxF ? maxF / fl : 1;
    b.applyImpulse({ x: fx * k * h, y: 0, z: fz * k * h }, true);
    // face the direction of travel
    const r = b.rotation();
    _q.set(r.x, r.y, r.z, r.w);
    const fwd = _v.set(1, 0, 0).applyQuaternion(_q);
    const want = Math.atan2(-dz, dx), cur = Math.atan2(-fwd.z, fwd.x);
    const da = Math.atan2(Math.sin(want - cur), Math.cos(want - cur));
    b.setAngvel({ x: 0, y: clamp(da * 6, -5, 5), z: 0 }, true);
    if (Math.random() < 0.08) game.puffs.emit({ pos: new THREE.Vector3(t.x, t.y + 0.9, t.z), vel: new THREE.Vector3(0, 1.5, 0), life: 1.2, size0: 0.3, size1: 1.0, color: '#ffffff', alpha: 0.7, drag: 1 });
    if (this.timer <= 0) { this.active = false; this.loop?.stop(); this.loop = null; }
  }
  dispose() { this.loop?.stop(); }
}

/** decorative rails along a path */
export function rails(game: Game, path: THREE.Vector3[], closed: boolean, y = 0.02) {
  const g = new THREE.Group();
  const n = closed ? path.length : path.length - 1;
  for (let i = 0; i < n; i++) {
    const a = path[i], b = path[(i + 1) % path.length];
    const dx = b.x - a.x, dz = b.z - a.z;
    const len = Math.hypot(dx, dz);
    if (len < 0.01) continue;
    const ang = Math.atan2(-dz, dx);
    const px = -dz / len, pz = dx / len;
    for (const off of [-0.2, 0.2]) {
      g.add(mesh(cyl(0.03, 0.03, len + 0.06, 4), M('#8f97a8'), { pos: [(a.x + b.x) / 2 + px * off, y + 0.05, (a.z + b.z) / 2 + pz * off], rot: [0, ang, Math.PI / 2], shadow: false }));
    }
    for (let d = 0.15; d < len; d += 0.35) {
      const k = d / len;
      g.add(mesh(cyl(0.045, 0.045, 0.6, 4), M('#b9825a'), { pos: [a.x + dx * k, y + 0.015, a.z + dz * k], rot: [0, ang + Math.PI / 2, Math.PI / 2], shadow: false }));
    }
  }
  g.userData.keep = false;
  game.envGroup.add(g);
}

/* ------------------------------------------------------------------ */
/* Balloon on a string: floats, swings, and pops with a little blast    */
/* that can pop the neighbours too.                                     */
/* ------------------------------------------------------------------ */
export class BalloonSpecial implements Special {
  label = '펑?';
  popped = false;
  joint: RAPIER.ImpulseJoint | null = null;
  anchor = new THREE.Vector3();
  string: THREE.Mesh | null = null;
  private popAt = -1;
  constructor(private r: number, private color: string) {}
  busy() { return this.popAt >= 0; }
  private gentleUntil = -1;
  onSwat(game: Game, p: Prop, dir: THREE.Vector3, power: number): boolean {
    if (power > 0.72) { this.pop(game, p); return true; }
    this.gentleUntil = game.time + 0.8;
    p.body.applyImpulse({ x: dir.x * power * 2.2 * p.body.mass() * 4, y: 0.5, z: dir.z * power * 2.2 * p.body.mass() * 4 }, true);
    return true;
  }
  onImpact(game: Game, _p: Prop, impact: number) { if (impact > 2.4 && this.popAt < 0 && game.time > this.gentleUntil) this.schedule(game, 0); }
  schedule(game: Game, delay: number) { if (!this.popped && this.popAt < 0) this.popAt = game.time + delay; }
  step(game: Game, p: Prop) { if (this.popAt >= 0 && game.time >= this.popAt) this.pop(game, p); }
  frame(_game: Game, p: Prop) {
    if (!this.string || this.popped) return;
    const t = p.body.translation();
    const bottom = _v.set(t.x, t.y - this.r * 0.95, t.z);
    const len = bottom.distanceTo(this.anchor);
    this.string.position.copy(bottom).add(this.anchor).multiplyScalar(0.5);
    this.string.scale.set(1, Math.max(0.01, len), 1);
    this.string.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bottom.clone().sub(this.anchor).normalize());
  }
  pop(game: Game, p: Prop) {
    if (this.popped || !p.alive) return;
    this.popped = true;
    this.popAt = -1;
    const c = p.center(new THREE.Vector3());
    game.sfx.balloonPop(clamp(c.x / 8, -1, 1));
    game.emit({ type: 'word', text: '펑!', pos: c.clone().add(new THREE.Vector3(0, 0.4, 0)), size: 1.2, color: this.color });
    for (let i = 0; i < 16; i++) game.chunks.emit({ pos: c.clone(), vel: new THREE.Vector3(rand(-4, 4), rand(-1, 4), rand(-4, 4)), life: 2.2, size: 0.16, color: ['#ff7aa8', '#ffd23f', '#7fd3ff', '#7bd389'][i % 4], flat: true, flutter: true, gravity: -4, drag: 1.6, floor: game.floorY + 0.03 });
    for (let i = 0; i < 6; i++) game.glows.emit({ pos: c.clone(), vel: new THREE.Vector3(rand(-3, 3), rand(-1, 3), rand(-3, 3)), life: 0.4, size0: 0.5, size1: 0.05, color: '#fff3b0', drag: 3 });
    game.count('balloon');
    game.discover('balloon', c.clone());
    game.shake(0.3);
    // shockwave: nudges light things, pops neighbours
    for (const o of game.props) {
      if (o === p || !o.alive || !o.isDynamic()) continue;
      const t = o.body.translation();
      const d = Math.hypot(t.x - c.x, t.y - c.y, t.z - c.z);
      if (d > 2.4) continue;
      if (o.special instanceof BalloonSpecial) { o.cause = p; o.causeCat = false; o.activeSwat = game.swatIndex; o.special.schedule(game, 0.09 + d * 0.04); continue; }
      const m = o.body.mass();
      const k = (1 - d / 2.4) * Math.min(6, 3.5 / Math.max(0.3, m));
      _v.set(t.x - c.x, t.y - c.y + 0.4, t.z - c.z).normalize().multiplyScalar(k * m);
      o.body.applyImpulse({ x: _v.x, y: _v.y, z: _v.z }, true);
      if (o.activeSwat !== game.swatIndex) { o.cause = p; o.causeCat = false; o.activeSwat = game.swatIndex; }
    }
    if (this.joint) { game.world.removeImpulseJoint(this.joint, true); this.joint = null; }
    if (this.string) { this.string.parent?.remove(this.string); this.string = null; }
    game.addScore(5000, c, { prop: p, type: 'break' });
    p.broken = true;
    game.removeProp(p);
    game.checkGoal();
  }
}

export function attachBalloon(game: Game, p: Prop, sp: BalloonSpecial, anchor: THREE.Vector3, length: number) {
  const R = game.R;
  const ab = game.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(anchor.x, anchor.y, anchor.z));
  const r = sp as unknown as { r: number };
  sp.joint = game.world.createImpulseJoint(R.JointData.rope(length, { x: 0, y: 0, z: 0 }, { x: 0, y: -r.r * 0.95 + 0.0, z: 0 }), ab, p.body, true);
  sp.anchor.copy(anchor);
  const s = mesh(cyl(0.012, 0.012, 1, 3), M('#ffffff'), { shadow: false });
  s.userData.keep = true;
  game.envGroup.add(s);
  sp.string = s;
  // a little weight at the anchor
  const w = mesh(cyl(0.12, 0.14, 0.12, 8), M('#ff7aa8'), { pos: [anchor.x, anchor.y + 0.06, anchor.z] });
  w.userData.keep = true;
  game.envGroup.add(w);
}

/* ------------------------------------------------------------------ */
/* Jack-in-the-box: crank it and BOING – whatever sits on top flies.    */
/* ------------------------------------------------------------------ */
export class JackSpecial implements Special {
  label = '뽀잉!';
  armed = true;
  clown: THREE.Object3D | null = null;
  private popT = -1;
  private dir = new THREE.Vector3(0, 0, 1);
  constructor(private launch = 13) {}
  busy() { return this.popT >= 0 && this.popT < 0.6; }
  onSwat(game: Game, p: Prop, dir: THREE.Vector3): boolean {
    if (!this.armed) return false;
    this.dir.copy(dir).setY(0).normalize();
    this.spring(game, p);
    return true;
  }
  onImpact(game: Game, p: Prop, impact: number) {
    if (this.armed && impact > 3.5) { const v = p.body.linvel(); this.dir.set(v.x, 0, v.z).normalize(); this.spring(game, p); }
  }
  private spring(game: Game, p: Prop) {
    this.armed = false;
    this.popT = 0;
    game.sfx.spring();
    const c = p.center(new THREE.Vector3());
    game.emit({ type: 'word', text: '뽀잉~!', pos: c.clone().add(new THREE.Vector3(0, 1.2, 0)), size: 1.2, color: '#ff7aa8' });
    game.discover('jack', c.clone());
    const top = p.body.translation().y + p.height;
    for (const o of game.props) {
      if (o === p || !o.alive || !o.isDynamic()) continue;
      const t = o.body.translation();
      if (Math.hypot(t.x - c.x, t.z - c.z) > p.radius + 0.35 || t.y < top - 0.25 || t.y > top + 1.2) continue;
      const m = o.body.mass();
      const k = this.launch * Math.min(1, 1.2 / Math.max(0.3, m));
      o.body.applyImpulse({ x: this.dir.x * k * 0.32 * m, y: k * m, z: this.dir.z * k * 0.32 * m }, true);
      o.cause = p; o.causeCat = false; o.activeSwat = game.swatIndex;
      o.graceUntil = game.time + 0.1;
      o.prevV.set(this.dir.x * k * 0.32, k, this.dir.z * k * 0.32);
    }
    p.body.applyImpulse({ x: 0, y: p.body.mass() * 2, z: 0 }, true);
    game.addScore(3000, c, { prop: p, type: 'other', as: 'bonus' });
  }
  frame(_g: Game, _p: Prop, dt: number) {
    if (this.popT < 0 || !this.clown) return;
    this.popT += dt;
    const k = this.popT;
    const s = k < 0.15 ? k / 0.15 * 1.3 : 1 + Math.sin((k - 0.15) * 18) * Math.exp(-(k - 0.15) * 4) * 0.3;
    this.clown.scale.set(1, Math.max(0.01, s), 1);
    this.clown.visible = true;
  }
}

/* ------------------------------------------------------------------ */
/* Electric fan: switch it on and it blows light things away.           */
/* ------------------------------------------------------------------ */
export class FanSpecial implements Special {
  label = '바람 ON';
  active = false;
  private timer = 0;
  private loop: Loop | null = null;
  blades: THREE.Object3D | null = null;
  private spin = 0;
  constructor(private range = 6, private strength = 22, private duration = 7) {}
  busy() { return this.active; }
  onSwat(game: Game, p: Prop): boolean {
    if (!this.active) {
      this.active = true;
      this.timer = this.duration;
      this.loop = game.sfx.motor();
      this.loop.set?.(2.5);
      game.discover('fan', p.center(new THREE.Vector3()));
      game.emit({ type: 'word', text: '슈우우웅~', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), size: 1, color: '#bfeaff' });
      return true;
    }
    return false;
  }
  step(game: Game, p: Prop, h: number) {
    if (!this.active) return;
    this.timer -= h;
    const r = p.body.rotation();
    _q.set(r.x, r.y, r.z, r.w);
    const fwd = new THREE.Vector3(0, 0, 1).applyQuaternion(_q);
    if (Math.abs(fwd.y) > 0.8) fwd.set(0, 0, 1);
    fwd.y = 0; fwd.normalize();
    const c = p.center(new THREE.Vector3());
    for (const o of game.props) {
      if (o === p || !o.alive || !o.isDynamic()) continue;
      const t = o.body.translation();
      const d = _v.set(t.x - c.x, 0, t.z - c.z);
      const dist = d.length();
      if (dist > this.range || dist < 0.2) continue;
      d.normalize();
      const cos = d.dot(fwd);
      if (cos < 0.82 || Math.abs(t.y - c.y) > 2.2) continue;
      const m = o.body.mass();
      const k = (1 - dist / this.range) * this.strength * (cos - 0.82) / 0.18;
      const acc = k / Math.max(0.25, m) * Math.min(1, 0.6 / Math.max(0.15, m));
      if (acc < 0.5) continue;
      o.body.applyImpulse({ x: fwd.x * acc * m * h, y: acc * 0.15 * m * h, z: fwd.z * acc * m * h }, true);
      if (o.activeSwat !== game.swatIndex && acc > 4) { o.cause = p; o.causeCat = false; o.activeSwat = game.swatIndex; }
    }
    if (Math.random() < 0.2) game.puffs.emit({ pos: c.clone().addScaledVector(fwd, 0.5), vel: fwd.clone().multiplyScalar(6), life: 0.5, size0: 0.2, size1: 0.8, color: '#e8fbff', alpha: 0.35, drag: 1 });
    if (this.timer <= 0) { this.active = false; this.loop?.stop(); this.loop = null; }
  }
  frame(_g: Game, _p: Prop, dt: number) {
    this.spin = this.active ? Math.min(30, this.spin + dt * 40) : Math.max(0, this.spin - dt * 15);
    if (this.blades) this.blades.rotation.z += this.spin * dt;
  }
  dispose() { this.loop?.stop(); }
}
