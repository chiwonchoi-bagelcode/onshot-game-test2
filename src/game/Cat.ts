import * as THREE from 'three';
import { M, box, cone, cyl, mesh, sphere } from '../render/kit';
import { clamp, damp, easeInOut, rand } from '../core/util';
import type { Game } from './Game';
import type { Prop } from './Prop';

type CatState = 'idle' | 'crouch' | 'leap' | 'strike' | 'fall' | 'land' | 'ending';

const ORANGE = '#f39a4a';
const DARK = '#d9732c';
const CREAM = '#fff6e8';
const PINK = '#ff9db0';

/** The player's avatar: a smug little orange tabby made of primitives. */
export class Cat {
  readonly group = new THREE.Group();
  private rig = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private eyes: THREE.Object3D[] = [];
  private shines: THREE.Object3D[] = [];
  private ears: THREE.Object3D[] = [];
  private pawR = new THREE.Group();
  private pawL = new THREE.Group();
  private tail: THREE.Group[] = [];
  private state: CatState = 'idle';
  private st = 0;
  private yaw = 0;
  private wantYaw = 0;
  private from = new THREE.Vector3();
  private to = new THREE.Vector3();
  private landAt = new THREE.Vector3();
  private onHit: (() => void) | null = null;
  private hitDone = false;
  private leapDur = 0.3;
  private fallDur = 0.3;
  private blinkT = 2;
  private blink = 0;
  private lookYaw = 0;
  private lookPitch = 0;
  private squint = 0;
  private wantSquint = 0;
  private sparkle = 0;
  private earsBack = 0;
  private time = 0;
  private endKind: 'win' | 'lose' | null = null;
  private lookTarget = new THREE.Vector3();
  private hasLook = false;
  private dir = new THREE.Vector3(0, 0, 1);
  private lick = 0;
  private nextIdleAct = 4;

  constructor() {
    this.build();
    this.group.add(this.rig);
  }

  private build() {
    const o = M(ORANGE), d = M(DARK), c = M(CREAM), pk = M(PINK), blk = M('#2b2233'), wht = M('#ffffff');
    this.rig.add(this.body);
    // torso (sitting egg)
    const torso = mesh(sphere(0.42, 10, 8), o, { pos: [0, 0.45, -0.02], scale: [0.95, 1.08, 1.12], rot: [-0.35, 0, 0] });
    const chest = mesh(sphere(0.3, 8, 6), c, { pos: [0, 0.55, 0.24], scale: [0.95, 1.15, 0.6] });
    const hauL = mesh(sphere(0.25, 8, 6), o, { pos: [0.24, 0.24, -0.06], scale: [0.9, 1, 1.25] });
    const hauR = mesh(sphere(0.25, 8, 6), o, { pos: [-0.24, 0.24, -0.06], scale: [0.9, 1, 1.25] });
    const stripe1 = mesh(box(0.5, 0.06, 0.2, 0.02), d, { pos: [0, 0.78, -0.25], rot: [-0.5, 0, 0] });
    const stripe2 = mesh(box(0.62, 0.06, 0.2, 0.02), d, { pos: [0, 0.58, -0.38], rot: [-0.9, 0, 0] });
    const hindPawL = mesh(sphere(0.11, 7, 5), c, { pos: [0.27, 0.07, 0.2], scale: [1, 0.7, 1.4] });
    const hindPawR = mesh(sphere(0.11, 7, 5), c, { pos: [-0.27, 0.07, 0.2], scale: [1, 0.7, 1.4] });
    this.body.add(torso, chest, hauL, hauR, stripe1, stripe2, hindPawL, hindPawR);

    // front legs
    for (const [g, x] of [[this.pawR, -0.15], [this.pawL, 0.15]] as const) {
      g.position.set(x, 0.62, 0.2);
      const leg = mesh(cyl(0.075, 0.07, 0.52, 7), o, { pos: [0, -0.27, 0.02] });
      const paw = mesh(sphere(0.095, 7, 5), c, { pos: [0, -0.54, 0.05], scale: [1, 0.75, 1.25] });
      g.add(leg, paw);
      this.body.add(g);
    }

    // head
    this.head.position.set(0, 0.98, 0.14);
    const skull = mesh(sphere(0.36, 10, 8), o, { scale: [1.12, 0.94, 1] });
    const muzzle = mesh(sphere(0.16, 8, 6), c, { pos: [0, -0.11, 0.26], scale: [1.35, 0.8, 0.8] });
    const nose = mesh(sphere(0.045, 6, 4), pk, { pos: [0, -0.05, 0.37], scale: [1.3, 0.8, 0.8] });
    const fs1 = mesh(box(0.06, 0.03, 0.16, 0.01), d, { pos: [0, 0.3, 0.12], rot: [0.5, 0, 0] });
    const fs2 = mesh(box(0.05, 0.03, 0.13, 0.01), d, { pos: [0.1, 0.28, 0.12], rot: [0.5, 0, -0.25] });
    const fs3 = mesh(box(0.05, 0.03, 0.13, 0.01), d, { pos: [-0.1, 0.28, 0.12], rot: [0.5, 0, 0.25] });
    this.head.add(skull, muzzle, nose, fs1, fs2, fs3);
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(0.145 * sx, 0.03, 0.29);
      eye.add(mesh(sphere(0.072, 8, 6), blk, { scale: [0.95, 1.25, 0.55], shadow: false }));
      const shine = mesh(sphere(0.024, 5, 4), wht, { pos: [0.02 * sx, 0.035, 0.035], shadow: false });
      eye.add(shine);
      this.shines.push(shine);
      this.eyes.push(eye);
      this.head.add(eye);
      const ear = new THREE.Group();
      ear.position.set(0.21 * sx, 0.25, -0.02);
      ear.rotation.z = -0.32 * sx;
      ear.add(mesh(cone(0.14, 0.27, 4), o, { pos: [0, 0.1, 0], rot: [0, Math.PI / 4, 0] }));
      ear.add(mesh(cone(0.08, 0.17, 4), pk, { pos: [0, 0.07, 0.045], rot: [0, Math.PI / 4, 0], shadow: false }));
      this.ears.push(ear);
      this.head.add(ear);
      // whiskers
      for (const wy of [-0.09, -0.13]) {
        const w = mesh(box(0.26, 0.012, 0.012, 0), wht, { pos: [0.27 * sx, wy, 0.27], rot: [0, -0.25 * sx, (wy + 0.11) * 3 * sx], shadow: false });
        this.head.add(w);
      }
    }
    this.body.add(this.head);

    // tail (chain of segments curling around)
    let parent: THREE.Object3D = this.body;
    const base = new THREE.Group();
    base.position.set(0, 0.12, -0.45);
    base.rotation.set(0, 0, 0);
    this.body.add(base);
    parent = base;
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Group();
      const r = 0.075 - i * 0.004;
      const len = 0.17;
      seg.add(mesh(cyl(r * 0.92, r, len, 6), i === 7 ? M(CREAM) : i % 2 ? d : o, { pos: [0, 0, -len / 2], rot: [Math.PI / 2, 0, 0] }));
      if (i > 0) seg.position.z = -0.17;
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
    }
    this.group.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.userData.noOutline = true; } });
  }

  reset(home: THREE.Vector3) {
    this.group.position.copy(home);
    this.state = 'idle';
    this.st = 0;
    this.endKind = null;
    this.squint = this.wantSquint = 0;
    this.sparkle = 0;
    this.earsBack = 0;
    this.yaw = this.wantYaw = 0.6;
    this.onHit = null;
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.body.scale.set(1, 1, 1);
  }

  busy() { return this.state !== 'idle' && this.state !== 'ending'; }

  faceCamera(game: Game) { this.wantYaw = game.view.yaw; }

  performSwat(game: Game, p: Prop, dir: THREE.Vector3, strike: THREE.Vector3, power: number, onHit: () => void) {
    this.onHit = onHit;
    this.hitDone = false;
    this.dir.copy(dir);
    void power;
    this.from.copy(this.group.position);
    const back = p.radius + 0.62;
    this.to.copy(strike).addScaledVector(dir, -back);
    this.to.y = strike.y - 0.78;
    const g = game.groundBelow(this.to.x, this.to.y + 0.9, this.to.z, 30, true);
    if (g && this.to.y < g.y) this.to.y = g.y;
    if (this.to.y < game.floorY) this.to.y = game.floorY;
    // landing spot
    const lx = clamp(this.to.x - dir.x * 0.4, game.roomBounds.minX + 0.6, game.roomBounds.maxX - 0.6);
    const lz = clamp(this.to.z - dir.z * 0.4, game.roomBounds.minZ + 0.6, game.roomBounds.maxZ - 0.6);
    const lg = game.groundBelow(lx, Math.max(this.to.y + 0.5, 0.5), lz, 30, true);
    this.landAt.set(lx, lg ? lg.y : game.floorY, lz);
    if (this.landAt.y > this.to.y + 0.2) this.landAt.y = game.floorY;
    const dist = this.from.distanceTo(this.to);
    this.leapDur = clamp(0.16 + dist * 0.035, 0.18, 0.4);
    this.fallDur = clamp(0.2 + Math.abs(this.to.y - this.landAt.y) * 0.04, 0.22, 0.42);
    this.wantYaw = Math.atan2(dir.x, dir.z);
    this.state = 'crouch';
    this.st = 0;
    this.lookTarget.copy(strike);
    this.hasLook = true;
    game.sfx.whoosh(0.6);
  }

  ending(game: Game, success: boolean) {
    this.state = 'ending';
    this.st = 0;
    this.endKind = success ? 'win' : 'lose';
    this.faceCamera(game);
    if (success) {
      game.emit({ type: 'bubble', text: '...', anchor: () => this.headPos(), dur: 1.2, style: 'cat' });
      setTimeoutSafe(game, 1.25, () => {
        this.sparkle = 1;
        game.sfx.meow('ask');
        game.emit({ type: 'bubble', text: '냥? (난 아무것도 몰라요)', anchor: () => this.headPos(), dur: 2.6, style: 'cat' });
      });
    } else {
      game.sfx.meow('annoyed');
      game.emit({ type: 'bubble', text: '흥… 오늘은 봐준다냥', anchor: () => this.headPos(), dur: 2.2, style: 'cat' });
    }
  }

  private lastSay = -10;
  /** smug little comments while the chaos unfolds */
  say(game: Game, text: string, dur: number) {
    if (this.state === 'ending' || game.time - this.lastSay < 2.5) return;
    this.lastSay = game.time;
    game.emit({ type: 'bubble', text, anchor: () => this.headPos(), dur, style: 'cat' });
  }

  headPos(): THREE.Vector3 {
    return this.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0));
  }

  private findInteresting(game: Game): boolean {
    let best = 2.5, found = false;
    for (const p of game.props) {
      if (!p.isDynamic() || p.body.isSleeping()) continue;
      const v = p.body.linvel();
      const s = v.x * v.x + v.y * v.y + v.z * v.z;
      if (s > best) { best = s; found = true; const t = p.body.translation(); this.lookTarget.set(t.x, t.y, t.z); }
    }
    return found;
  }

  update(game: Game, dt: number, gdt: number) {
    this.time += dt;
    this.st += gdt;
    const pos = this.group.position;
    const s = this.st;
    let squash = 1, stretch = 1, butt = 0, pawRaise = 0, pawFwd = 0, legsBack = 0;

    switch (this.state) {
      case 'idle': {
        const watching = this.findInteresting(game);
        this.hasLook = watching;
        if (!watching && !game.busy()) {
          this.nextIdleAct -= dt;
          if (this.nextIdleAct < 0) {
            this.nextIdleAct = rand(4, 8);
            if (Math.random() < 0.5) this.lick = 1.4; else this.wantYaw = game.view.yaw + rand(-0.5, 0.5);
          }
        }
        squash = 1 + Math.sin(this.time * 2.2) * 0.015;
        break;
      }
      case 'crouch': {
        const k = Math.min(1, s / 0.13);
        squash = 1 - 0.18 * k;
        butt = Math.sin(this.time * 55) * 0.08 * k;
        if (s >= 0.13) { this.state = 'leap'; this.st = 0; }
        break;
      }
      case 'leap': {
        const k = Math.min(1, s / this.leapDur);
        const e = easeInOut(k);
        pos.lerpVectors(this.from, this.to, e);
        pos.y += Math.sin(k * Math.PI) * (0.9 + this.from.distanceTo(this.to) * 0.12);
        stretch = 1.25; squash = 0.85; legsBack = 1;
        pawRaise = k;
        if (k >= 1) { this.state = 'strike'; this.st = 0; }
        break;
      }
      case 'strike': {
        const k = Math.min(1, s / 0.11);
        pawRaise = 1 - k;
        pawFwd = Math.sin(k * Math.PI);
        if (!this.hitDone && k > 0.4) {
          this.hitDone = true;
          this.onHit?.();
          this.onHit = null;
        }
        if (k >= 1) { this.state = 'fall'; this.st = 0; this.from.copy(pos); }
        break;
      }
      case 'fall': {
        const k = Math.min(1, s / this.fallDur);
        pos.lerpVectors(this.from, this.landAt, k);
        pos.y += Math.sin(k * Math.PI) * 0.5;
        stretch = 1.1; legsBack = 0.5;
        if (k >= 1) { this.state = 'land'; this.st = 0; game.sfx.land(); }
        break;
      }
      case 'land': {
        const k = Math.min(1, s / 0.16);
        squash = 1 - 0.2 * Math.sin(k * Math.PI);
        if (k >= 1) { this.state = 'idle'; this.st = 0; this.nextIdleAct = rand(2, 4); }
        break;
      }
      case 'ending': {
        this.hasLook = false;
        squash = 1 + Math.sin(this.time * 2) * 0.015;
        if (this.endKind === 'win') {
          this.wantSquint = s < 1.2 ? 0.75 : 0;
          if (s > 1.2 && s < 2.6) this.lick = Math.max(this.lick, 0.01);
        } else {
          this.wantSquint = 0.5;
          this.earsBack = 1;
        }
        break;
      }
    }

    // turn
    const dy = Math.atan2(Math.sin(this.wantYaw - this.yaw), Math.cos(this.wantYaw - this.yaw));
    this.yaw += dy * Math.min(1, dt * (this.state === 'crouch' || this.state === 'leap' ? 30 : 8));
    this.group.rotation.y = this.yaw;

    this.body.scale.set(1 / Math.sqrt(squash), squash, stretch);
    this.rig.rotation.z = butt;
    this.rig.rotation.x = this.state === 'leap' ? -0.35 : this.state === 'fall' ? 0.25 : 0;

    // right paw swat
    this.pawR.rotation.x = -pawRaise * 2.3 - pawFwd * 1.4 - legsBack * 0.4;
    this.pawL.rotation.x = -legsBack * 0.6;
    if (this.lick > 0) {
      this.lick -= dt;
      const k = Math.sin(clamp(this.lick / 1.4, 0, 1) * Math.PI);
      this.pawL.rotation.x = -k * 2.0;
      this.pawL.rotation.z = -k * 0.4;
    } else this.pawL.rotation.z = 0;

    // head look
    let wantHY = 0, wantHP = 0;
    if (this.hasLook) {
      const lp = this.lookTarget;
      const hp = this.head.getWorldPosition(new THREE.Vector3());
      const ang = Math.atan2(lp.x - hp.x, lp.z - hp.z) - this.yaw;
      wantHY = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.1, 1.1);
      const flat = Math.hypot(lp.x - hp.x, lp.z - hp.z);
      wantHP = clamp(-Math.atan2(lp.y - hp.y, flat), -0.6, 0.5);
    } else if (this.state === 'ending' || this.state === 'idle') {
      const ang = game.view.yaw - this.yaw;
      wantHY = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.1, 1.1);
      wantHP = -0.15 + (this.lick > 0 ? 0.4 : 0);
      if (this.state === 'ending' && this.endKind === 'win' && this.st > 1.2) {
        wantHP = -0.1; this.head.rotation.z = Math.sin(this.time * 2.4) * 0.12; // innocent head tilt
      }
    }
    this.lookYaw = damp(this.lookYaw, wantHY, 10, dt);
    this.lookPitch = damp(this.lookPitch, wantHP, 10, dt);
    this.head.rotation.y = this.lookYaw;
    this.head.rotation.x = this.lookPitch;
    if (this.state !== 'ending') this.head.rotation.z = damp(this.head.rotation.z, 0, 8, dt);

    // eyes: blink / squint / sparkle
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 0.14; this.blinkT = rand(2, 5); }
    if (this.blink > 0) this.blink -= dt;
    this.squint = damp(this.squint, this.wantSquint, 8, dt);
    const open = this.blink > 0 ? 0.12 : 1 - this.squint * 0.85;
    const big = 1 + this.sparkle * 0.35;
    for (const e of this.eyes) e.scale.set(big, open * big, big);
    for (const sh of this.shines) sh.scale.setScalar(1 + this.sparkle * 0.8);
    // ears
    const twitch = Math.sin(this.time * 0.7) > 0.97 ? Math.sin(this.time * 40) * 0.2 : 0;
    this.ears.forEach((e, i) => {
      const sx = i === 0 ? -1 : 1;
      e.rotation.z = -0.32 * sx - this.earsBack * 0.9 * sx + (i === 1 ? twitch : 0);
      e.rotation.x = -this.earsBack * 0.4;
    });
    // tail sway
    const active = this.state === 'leap' || this.state === 'crouch';
    this.tail.forEach((seg, i) => {
      const ph = this.time * (active ? 9 : 2.2) - i * 0.6;
      seg.rotation.y = (i === 0 ? 1.1 : 0.22) + Math.sin(ph) * (active ? 0.25 : 0.12);
      seg.rotation.x = i === 0 ? (active ? -0.9 : 0.05) : active ? -0.12 : 0.04 + (i > 5 ? -0.25 : 0);
    });
  }
}

function setTimeoutSafe(game: Game, seconds: number, fn: () => void) {
  let t = 0;
  let done = false;
  game.addUpdater((dt) => {
    if (done) return;
    t += Math.max(dt, 1 / 120);
    if (t >= seconds) { done = true; fn(); }
  });
}

