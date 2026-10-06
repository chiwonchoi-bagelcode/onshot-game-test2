import * as THREE from 'three';
import { clamp, rand, srand } from '../core/util';
import type { Loop } from '../audio/Sfx';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Special } from './types';

const _v = new THREE.Vector3();

function lcg(seed: number) {
  let s = seed * 9301 + 49297;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

/* ------------------------------------------------------------------ */
/* Robot vacuum: swat it to switch it on – it drives off in the swipe  */
/* direction, bumping into things and turning like a real one.         */
/* ------------------------------------------------------------------ */
export class RoombaSpecial implements Special {
  label = '전원 ON';
  active = false;
  private dir = new THREE.Vector3();
  private timer = 0;
  private stuck = 0;
  private loop: Loop | null = null;
  private rnd: () => number;
  private bumps = 0;
  led: THREE.MeshLambertMaterial | null = null;
  brush: THREE.Object3D | null = null;
  constructor(seed: number, private speed = 3.6, private duration = 8) { this.rnd = lcg(seed); }
  busy() { return this.active; }
  onSwat(game: Game, p: Prop, dir: THREE.Vector3, power: number): boolean {
    this.dir.copy(dir).setY(0).normalize();
    if (!this.active) {
      this.active = true;
      this.timer = this.duration;
      this.loop = game.sfx.motor();
      game.emit({ type: 'word', text: '위잉~', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 0.9, color: '#7fe3ff' });
    } else this.timer = Math.max(this.timer, this.duration * 0.6);
    p.body.setLinvel({ x: this.dir.x * this.speed * (0.6 + power * 0.4), y: 0, z: this.dir.z * this.speed * (0.6 + power * 0.4) }, true);
    if (this.led) this.led.emissive.setHex(0x22ff88);
    return true;
  }
  step(game: Game, p: Prop, h: number) {
    if (!this.active) return;
    this.timer -= h;
    const b = p.body;
    b.wakeUp();
    const v = b.linvel();
    const hs = Math.hypot(v.x, v.z);
    const want = this.speed;
    const m = b.mass();
    const fx = (this.dir.x * want - v.x) * m * 10, fz = (this.dir.z * want - v.z) * m * 10;
    const fl = Math.hypot(fx, fz), maxF = 160;
    const k = fl > maxF ? maxF / fl : 1;
    b.applyImpulse({ x: fx * k * h, y: 0, z: fz * k * h }, true);
    b.setAngvel({ x: 0, y: 2.5, z: 0 }, true);
    if (hs < want * 0.45) this.stuck += h; else this.stuck = 0;
    if (this.stuck > 0.22) {
      this.stuck = 0;
      this.bumps++;
      const a = (this.rnd() > 0.5 ? 1 : -1) * (1.7 + this.rnd() * 1.2);
      this.dir.applyAxisAngle(new THREE.Vector3(0, 1, 0), a);
      game.sfx.impact('plastic', 0.6);
    }
    if (this.timer <= 0) {
      this.active = false;
      this.loop?.stop(); this.loop = null;
      if (this.led) this.led.emissive.setHex(0x330000);
    }
  }
  frame(_g: Game, _p: Prop, dt: number) {
    if (this.brush && this.active) this.brush.rotation.y += dt * 25;
  }
  dispose() { this.loop?.stop(); }
}

/* ------------------------------------------------------------------ */
/* Shaken soda bottle: turns into a fizzing rocket                      */
/* ------------------------------------------------------------------ */
export class SodaSpecial implements Special {
  label = '흔들기';
  private armed = true;
  private delay = -1;
  private thrust = 0;
  private dir = new THREE.Vector3();
  private loop: Loop | null = null;
  private wob = 0;
  /** knocked-over (not swatted) bottles fly this way if set – lets a level aim a chain reaction */
  aim: THREE.Vector3 | null = null;
  constructor(private power = 1) {}
  busy() { return this.delay >= 0 || this.thrust > 0; }
  private fire(game: Game, p: Prop, dir: THREE.Vector3) {
    if (!this.armed) return;
    this.armed = false;
    this.dir.copy(dir).setY(0).normalize();
    if (this.dir.lengthSq() < 0.1) this.dir.set(srand(-1, 1), 0, srand(-1, 1)).normalize();
    this.delay = 0.22;
    game.emit({ type: 'word', text: '치이익…', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0)), size: 0.9, color: '#bff3ff' });
  }
  onSwat(game: Game, p: Prop, dir: THREE.Vector3): boolean {
    if (!this.armed) return false;
    this.fire(game, p, dir);
    p.body.applyImpulse({ x: dir.x * 0.6 * p.body.mass(), y: 0.4 * p.body.mass(), z: dir.z * 0.6 * p.body.mass() }, true);
    return true;
  }
  onTouch(game: Game, p: Prop, other: Prop) {
    if (!this.armed) return;
    const a = p.body.translation(), b = other.body.translation();
    this.fire(game, p, this.aim ? _v.copy(this.aim) : _v.set(a.x - b.x, 0, a.z - b.z));
  }
  onImpact(game: Game, p: Prop, impact: number) {
    if (this.armed && impact > 2.5) {
      const v = p.body.linvel();
      this.fire(game, p, _v.set(v.x, 0, v.z));
    }
  }
  step(game: Game, p: Prop, h: number) {
    if (this.delay >= 0) {
      this.delay -= h;
      if (this.delay < 0) {
        this.thrust = 0.95;
        this.loop = game.sfx.fizz();
        game.emit({ type: 'word', text: '퓨슝!!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 1.2, color: '#7fe3ff' });
        p.body.setGravityScale(0.35, true);
      }
      return;
    }
    if (this.thrust <= 0) return;
    this.thrust -= h;
    const b = p.body;
    const m = b.mass();
    // bottle-rocket: launches diagonally upward in the swipe direction
    const f = 29 * this.power * m;
    this.wob += h * 9;
    const side = Math.sin(this.wob) * 0.15;
    const hx = 0.66, up = 0.75;
    b.applyImpulse({ x: (this.dir.x + -this.dir.z * side) * hx * f * h, y: up * f * h, z: (this.dir.z + this.dir.x * side) * hx * f * h }, true);
    const v = b.linvel();
    const sp = Math.hypot(v.x, v.y, v.z);
    if (sp > 13) b.setLinvel({ x: (v.x / sp) * 13, y: (v.y / sp) * 13, z: (v.z / sp) * 13 }, true);
    b.applyTorqueImpulse({ x: srand(-1, 1) * 0.02, y: 0.03, z: srand(-1, 1) * 0.02 }, true);
    // spray
    const t = b.translation();
    for (let i = 0; i < 2; i++) {
      game.chunks.emit({
        pos: new THREE.Vector3(t.x, t.y + 0.4, t.z),
        vel: new THREE.Vector3(-this.dir.x * rand(2, 4) + rand(-1, 1), -rand(3, 6), -this.dir.z * rand(2, 4) + rand(-1, 1)),
        life: rand(0.4, 0.8), size: rand(0.08, 0.16), color: i % 2 ? '#e8fbff' : '#a5e6ff', floor: game.floorY + 0.03,
      });
    }
    if (Math.random() < 0.3) game.puffs.emit({ pos: new THREE.Vector3(t.x, t.y + 0.3, t.z), vel: new THREE.Vector3(-this.dir.x * 2, 1, -this.dir.z * 2), life: 0.6, size0: 0.3, size1: 1.0, color: '#ffffff', alpha: 0.5 });
    if (this.thrust <= 0) {
      this.loop?.stop(); this.loop = null;
      b.setGravityScale(1, true);
      game.stain(new THREE.Vector3(t.x, t.y, t.z), 1.0, '#b5e3f7', 0.5);
    }
  }
  dispose() { this.loop?.stop(); }
}

/* ------------------------------------------------------------------ */
/* Tablecloth: pull it. Slow pull drags everything off the table, a    */
/* lightning-fast yank can leave the dishes standing (magic trick!).   */
/* ------------------------------------------------------------------ */
export class ClothSpecial implements Special {
  label = '당기기';
  private pulling = false;
  private done = false;
  private dir = new THREE.Vector3();
  private speed = 0;
  private moved = 0;
  private start = new THREE.Vector3();
  private dropT = -1;
  private dropFrom = new THREE.Vector3();
  constructor(private length: number) {}
  busy() { return this.pulling || (this.dropT >= 0 && this.dropT < 1); }
  onSwat(game: Game, p: Prop, dir: THREE.Vector3, power: number): boolean {
    if (this.pulling || this.done) return true;
    this.pulling = true;
    this.dir.copy(dir).setY(0).normalize();
    // gentle tug = drag everything; full power = magician's yank
    this.speed = power < 0.62 ? 2.6 + power * 3 : 18 + (power - 0.62) * 40;
    const t = p.body.translation();
    this.start.set(t.x, t.y, t.z);
    game.sfx.whoosh(1.2);
    game.emit({ type: 'word', text: power < 0.62 ? '스르륵…' : '휘릭!!', pos: this.start.clone().add(new THREE.Vector3(0, 0.8, 0)), size: 1.1, color: '#ffffff' });
    return true;
  }
  step(game: Game, p: Prop, h: number) {
    if (!this.pulling) return;
    // ease in for the slow tug so dishes start sliding together
    const sp = this.speed;
    this.moved += sp * h;
    const t = p.body.translation();
    const nx = t.x + this.dir.x * sp * h, nz = t.z + this.dir.z * sp * h;
    p.body.setNextKinematicTranslation({ x: nx, y: t.y, z: nz });
    if (this.moved > this.length + 0.6) {
      this.pulling = false;
      this.done = true;
      this.dropT = 0;
      this.dropFrom.set(nx, t.y, nz);
      // cloth leaves physics; becomes a crumpled heap
      game.removeProp(p);
      game.envGroup.add(p.group);
      p.group.position.copy(this.dropFrom);
      game.addScore(2000, this.dropFrom.clone(), { chain: true });
    }
  }
  frame(game: Game, p: Prop, dt: number) {
    if (this.dropT < 0 || this.dropT >= 1) return;
    this.dropT = Math.min(1, this.dropT + dt * 2.2);
    const k = this.dropT;
    const g = p.group;
    g.position.set(this.dropFrom.x + this.dir.x * k * 1.2, this.dropFrom.y + (game.floorY + 0.15 - this.dropFrom.y) * k * k, this.dropFrom.z + this.dir.z * k * 1.2);
    g.scale.set(1 - k * 0.6, 1 + k * 2.5, 1 - k * 0.55);
    g.rotation.z = k * 0.4;
  }
}

/* ------------------------------------------------------------------ */
/* Toaster: any bump pops the toast up                                  */
/* ------------------------------------------------------------------ */
export class ToasterSpecial implements Special {
  label = '레버 탁!';
  armed = true;
  private timer = -1;
  constructor(private spawnToast: (game: Game, p: Prop) => void) {}
  busy() { return this.timer >= 0; }
  step(game: Game, p: Prop, h: number) {
    if (this.timer < 0) return;
    this.timer -= h;
    if (this.timer < 0) this.pop(game, p);
  }
  private pop(game: Game, p: Prop) {
    if (!this.armed) return;
    this.armed = false;
    this.timer = -1;
    game.sfx.pop();
    game.emit({ type: 'word', text: '팝!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.9, 0)), size: 1.1, color: '#ffb347' });
    this.spawnToast(game, p);
  }
  onSwat(game: Game, p: Prop): boolean {
    if (this.armed && this.timer < 0) {
      this.timer = 0.55;
      game.sfx.click();
      game.emit({ type: 'word', text: '딸깍', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.7, 0)), size: 0.8, color: '#ffffff' });
    }
    return false;
  }
  onImpact(game: Game, p: Prop, impact: number) { if (impact > 4.5 && this.timer < 0) this.pop(game, p); }
}

/* ------------------------------------------------------------------ */
/* Alarm clock: rings when it takes a knock (wakes sleeping owners)     */
/* ------------------------------------------------------------------ */
export class AlarmSpecial implements Special {
  label?: string;
  private ringing = 0;
  private used = false;
  private loop: Loop | null = null;
  private jit = 0;
  bells: THREE.Object3D | null = null;
  busy() { return this.ringing > 0; }
  private start(game: Game, p: Prop) {
    if (this.used) return;
    this.used = true;
    this.ringing = 5;
    this.loop = game.sfx.ring();
    game.emit({ type: 'word', text: '따르르릉!!', pos: p.center(new THREE.Vector3()).add(new THREE.Vector3(0, 0.8, 0)), size: 1.2, color: '#ffd23f' });
    game.addScore(5000, p.center(new THREE.Vector3()));
  }
  onImpact(game: Game, p: Prop, impact: number) { if (impact > 4) this.start(game, p); }
  onSwat(): boolean { return false; }
  step(game: Game, p: Prop, h: number) {
    if (this.ringing <= 0) return;
    this.ringing -= h;
    this.jit -= h;
    const b = p.body;
    if (this.jit <= 0) {
      this.jit = 0.06;
      const m = b.mass();
      b.applyImpulse({ x: srand(-0.4, 0.4) * m, y: 1.1 * m, z: srand(-0.4, 0.4) * m }, true);
      p.graceUntil = game.time + 0.05;
    }
    const t = b.translation();
    if (game.owner && game.owner.mode === 'sleep') {
      const d = _v.set(t.x, t.y, t.z).distanceTo(game.owner.headPos);
      if (d < 4.4) game.owner.disturb(game, 32 * h * clamp(1.45 - d / 4.4, 0.35, 1), null);
      else if (d < 7.5) game.owner.disturb(game, 6 * h, null);
    }
    if (this.ringing <= 0) { this.loop?.stop(); this.loop = null; }
  }
  frame(game: Game, _p: Prop, dt: number) {
    if (this.bells) this.bells.rotation.z = this.ringing > 0 ? Math.sin(game.time * 60) * 0.25 : 0;
    void dt;
  }
  dispose() { this.loop?.stop(); }
}

/* ------------------------------------------------------------------ */
/* Yarn ball: leaves an unravelled trail wherever it rolls               */
/* ------------------------------------------------------------------ */
export class YarnSpecial implements Special {
  private pts: THREE.Vector3[] = [];
  private geo: THREE.BufferGeometry;
  private line: THREE.Mesh;
  private max = 500;
  private pos: Float32Array;
  constructor(game: Game, color: string, private r: number) {
    this.pos = new Float32Array(this.max * 2 * 3);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    const idx: number[] = [];
    for (let i = 0; i < this.max - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx);
    this.geo.setDrawRange(0, 0);
    this.line = new THREE.Mesh(this.geo, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1 }));
    this.line.frustumCulled = false;
    this.line.receiveShadow = true;
    this.line.userData.keep = true;
    game.envGroup.add(this.line);
  }
  busy() { return false; }
  frame(_game: Game, p: Prop) {
    const t = p.body.translation();
    const cur = new THREE.Vector3(t.x, t.y - this.r + 0.03, t.z);
    const last = this.pts[this.pts.length - 1];
    if (!last) { this.pts.push(cur); return; }
    if (last.distanceTo(cur) < 0.15 || this.pts.length >= this.max) return;
    this.pts.push(cur);
    const n = this.pts.length;
    for (let i = Math.max(0, n - 2); i < n; i++) {
      const a = this.pts[Math.max(0, i - 1)], b = this.pts[i];
      const d = _v.subVectors(b, a); d.y = 0;
      if (d.lengthSq() < 1e-6) d.set(1, 0, 0);
      d.normalize();
      const w = 0.045;
      this.pos.set([b.x - d.z * w, b.y, b.z + d.x * w, b.x + d.z * w, b.y, b.z - d.x * w], i * 6);
    }
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    this.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
    this.geo.computeBoundingSphere();
    const s = Math.max(0.55, 1 - n / 700);
    p.group.scale.setScalar(s);
  }
}
