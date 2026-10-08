import * as THREE from 'three';
import { M, box, cone, cyl, mesh, sphere } from '../render/kit';
import { clamp, damp, easeInOut, pick, rand } from '../core/util';
import type { Game } from './Game';
import type { Prop } from './Prop';
import { CATS, accById, type CatDef, type IdleAct } from '../meta/cats';
import { disposeMerged, mergeByMaterial } from '../render/merge';

type CatState = 'idle' | 'crouch' | 'leap' | 'strike' | 'perch' | 'fall' | 'land' | 'ending';

/**
 * The player's avatar. Built from primitives according to a CatDef
 * (pattern, colours, chubbiness, fluff) with accessory slots, and animated
 * procedurally with per-cat motion style and lines.
 */
export class Cat {
  readonly group = new THREE.Group();
  private rig = new THREE.Group();
  private body = new THREE.Group();
  private head = new THREE.Group();
  private mouth: THREE.Object3D | null = null;
  private eyes: THREE.Object3D[] = [];
  private shines: THREE.Object3D[] = [];
  private ears: THREE.Object3D[] = [];
  private pawR = new THREE.Group();
  private pawL = new THREE.Group();
  private tail: THREE.Group[] = [];
  private headSlot = new THREE.Group();
  private faceSlot = new THREE.Group();
  private neckSlot = new THREE.Group();
  def: CatDef = CATS[0];
  accessories: string[] = [];
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
  private act: IdleAct | null = null;
  private actT = 0;
  private nextIdleAct = 4;
  private aim: THREE.Vector3 | null = null;
  private aimT = 0;
  private hop = 0;
  /** yaw that faces the camera (set by the game / showroom) */
  faceYaw = 0.5;
  private sparkleT = 0;
  private lastSay = -10;

  constructor(def?: CatDef, acc: string[] = []) {
    this.group.add(this.rig);
    this.setLook(def ?? CATS[0], acc);
  }

  /** rebuild the model for a cat + its accessories */
  setLook(def: CatDef, acc: string[]) {
    this.def = def;
    this.accessories = acc;
    disposeMerged(this.rig);
    this.rig.clear();
    this.body = new THREE.Group();
    this.head = new THREE.Group();
    this.pawR = new THREE.Group();
    this.pawL = new THREE.Group();
    this.eyes = []; this.shines = []; this.ears = []; this.tail = [];
    this.headSlot = new THREE.Group(); this.faceSlot = new THREE.Group(); this.neckSlot = new THREE.Group();
    this.build();
    const s = def.look.size ?? 1;
    this.rig.scale.setScalar(s);
    for (const id of acc) {
      const a = accById(id);
      if (!a) continue;
      const o = a.build();
      o.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.userData.noOutline = true; } });
      (a.slot === 'head' ? this.headSlot : a.slot === 'face' ? this.faceSlot : this.neckSlot).add(o);
    }
    this.mergeStatic();
  }

  /** fewer draw calls: bake the non-animated parts of body and head into a few meshes */
  private mergeStatic() {
    const animated: THREE.Object3D[] = [this.head, this.pawR, this.pawL, this.headSlot, this.faceSlot, this.neckSlot, ...this.eyes, ...this.ears];
    if (this.mouth) animated.push(this.mouth);
    if (this.tail[0]?.parent) animated.push(this.tail[0].parent);
    const prev = animated.map((o) => o.userData.keep);
    for (const o of animated) o.userData.keep = true;
    mergeByMaterial(this.body);
    this.head.userData.keep = false;
    mergeByMaterial(this.head);
    for (const s of [this.headSlot, this.faceSlot, this.neckSlot]) { s.userData.keep = false; if (s.children.length) mergeByMaterial(s); }
    animated.forEach((o, i) => { o.userData.keep = prev[i]; });
    this.rig.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.userData.noOutline = true; });
  }

  private build() {
    const L = this.def.look;
    const base = M(L.base), belly = M(L.belly), stripe = M(L.stripe), earIn = M(L.ear), nose = M(L.nose);
    const eyeMat = L.glowEyes ? M(L.eye, { emissive: L.eye, emissiveIntensity: 0.8 }) : M(L.eye);
    const wht = M('#ffffff');
    const point = L.pattern === 'point';
    const tux = L.pattern === 'tuxedo';
    const dark = M(L.stripe);
    const ch = L.chubby ?? 1;
    const fluffy = !!L.fluffy;
    this.rig.add(this.body);
    // torso
    this.body.add(mesh(sphere(0.42, 10, 8), base, { pos: [0, 0.45, -0.02], scale: [0.95 * ch, 1.08, 1.12 * (0.92 + ch * 0.08)], rot: [-0.35, 0, 0] }));
    this.body.add(mesh(sphere(0.3, 8, 6), tux ? wht : belly, { pos: [0, 0.55, 0.24 + (ch - 1) * 0.12], scale: [0.95 * ch, 1.15, 0.6] }));
    for (const sx of [-1, 1]) this.body.add(mesh(sphere(0.25, 8, 6), base, { pos: [sx * 0.24 * ch, 0.24, -0.06], scale: [0.9 * ch, 1, 1.25] }));
    for (const sx of [-1, 1]) this.body.add(mesh(sphere(0.11, 7, 5), tux || point ? (point ? dark : wht) : belly, { pos: [sx * 0.27 * ch, 0.07, 0.2], scale: [1, 0.7, 1.4] }));
    if (fluffy) {
      // fluffy ruff + rounder silhouette
      this.body.add(mesh(sphere(0.36, 9, 7), wht, { pos: [0, 0.78, 0.12], scale: [1.25, 0.7, 1.0] }));
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; this.body.add(mesh(sphere(0.16, 6, 5), base, { pos: [Math.cos(a) * 0.36, 0.45 + Math.sin(i * 1.7) * 0.1, Math.sin(a) * 0.36 - 0.02] })); }
    }
    if (L.pattern === 'tabby') {
      this.body.add(mesh(box(0.5 * ch, 0.06, 0.2, 0.02), stripe, { pos: [0, 0.78, -0.25], rot: [-0.5, 0, 0] }));
      this.body.add(mesh(box(0.62 * ch, 0.06, 0.2, 0.02), stripe, { pos: [0, 0.58, -0.38], rot: [-0.9, 0, 0] }));
      this.body.add(mesh(box(0.58 * ch, 0.06, 0.2, 0.02), stripe, { pos: [0, 0.36, -0.44], rot: [-1.3, 0, 0] }));
    }
    if (L.pattern === 'calico') {
      const pa = M(L.patch ?? '#f39a4a'), pb = M(L.patch2 ?? '#3a3346');
      this.body.add(mesh(sphere(0.22, 7, 5), pa, { pos: [0.18, 0.62, -0.18], scale: [1, 0.55, 1.2] }));
      this.body.add(mesh(sphere(0.18, 7, 5), pb, { pos: [-0.2, 0.42, -0.3], scale: [1, 0.5, 1.2] }));
      this.body.add(mesh(sphere(0.16, 7, 5), pa, { pos: [-0.22, 0.25, 0.05], scale: [0.6, 1, 1] }));
    }
    if (L.pattern === 'spots') {
      for (let i = 0; i < 9; i++) {
        const a = i * 2.3, y = 0.3 + (i % 3) * 0.17;
        this.body.add(mesh(sphere(0.06, 5, 4), stripe, { pos: [Math.cos(a) * 0.36, y, Math.sin(a) * 0.36 - 0.05], scale: [1, 0.6, 1], shadow: false }));
      }
    }

    // front legs
    for (const [g, x] of [[this.pawR, -0.15], [this.pawL, 0.15]] as const) {
      g.position.set(x * ch, 0.62, 0.2);
      g.add(mesh(cyl(0.075 * (ch > 1 ? 1.2 : 1), 0.07, 0.52, 7), base, { pos: [0, -0.27, 0.02] }));
      g.add(mesh(sphere(0.095, 7, 5), tux ? wht : point ? dark : belly, { pos: [0, -0.54, 0.05], scale: [1, 0.75, 1.25] }));
      this.body.add(g);
    }

    // head
    this.head.position.set(0, 0.98, 0.14 + (ch - 1) * 0.08);
    const hs = fluffy ? 1.12 : 1;
    this.head.add(mesh(sphere(0.36, 10, 8), base, { scale: [1.12 * hs * (ch > 1 ? 1.08 : 1), 0.94 * hs, 1 * hs] }));
    if (point) this.head.add(mesh(sphere(0.25, 9, 7), dark, { pos: [0, -0.06, 0.16], scale: [1.1, 0.95, 0.8] }));
    this.head.add(mesh(sphere(0.16, 8, 6), point ? dark : tux ? wht : belly, { pos: [0, -0.11, 0.26 * hs], scale: [1.35, 0.8, 0.8] }));
    this.head.add(mesh(sphere(0.045, 6, 4), nose, { pos: [0, -0.05, 0.37 * hs], scale: [1.3, 0.8, 0.8] }));
    const mouth = mesh(sphere(0.05, 6, 4), M('#7a2e3a'), { pos: [0, -0.17, 0.33 * hs], scale: [1.2, 0.01, 0.5], shadow: false });
    this.head.add(mouth);
    this.mouth = mouth;
    if (L.pattern === 'tabby' || L.pattern === 'spots') {
      this.head.add(mesh(box(0.06, 0.03, 0.16, 0.01), stripe, { pos: [0, 0.3, 0.12], rot: [0.5, 0, 0] }));
      this.head.add(mesh(box(0.05, 0.03, 0.13, 0.01), stripe, { pos: [0.1, 0.28, 0.12], rot: [0.5, 0, -0.25] }));
      this.head.add(mesh(box(0.05, 0.03, 0.13, 0.01), stripe, { pos: [-0.1, 0.28, 0.12], rot: [0.5, 0, 0.25] }));
    }
    if (L.pattern === 'calico') this.head.add(mesh(sphere(0.17, 7, 5), M(L.patch ?? '#f39a4a'), { pos: [0.16, 0.14, 0.14], scale: [1, 0.8, 0.8] }));
    if (tux) this.head.add(mesh(sphere(0.12, 7, 5), wht, { pos: [0, 0.02, 0.29], scale: [0.6, 1.3, 0.5] }));
    for (const sx of [-1, 1]) {
      const eye = new THREE.Group();
      eye.position.set(0.145 * sx, 0.03, 0.29 * hs);
      eye.add(mesh(sphere(0.072, 8, 6), eyeMat, { scale: [0.95, 1.25, 0.55], shadow: false }));
      eye.add(mesh(sphere(0.04, 6, 4), M('#1c1622'), { pos: [0, 0, 0.025], scale: [0.6, 1.25, 0.5], shadow: false }));
      const shine = mesh(sphere(0.024, 5, 4), wht, { pos: [0.02 * sx, 0.035, 0.04], shadow: false });
      eye.add(shine);
      this.shines.push(shine);
      this.eyes.push(eye);
      this.head.add(eye);
      const ear = new THREE.Group();
      ear.position.set(0.21 * sx * hs, 0.25 * hs, -0.02);
      ear.rotation.z = -0.32 * sx;
      const earMat = point ? dark : base;
      ear.add(mesh(cone(0.14 * (fluffy ? 0.8 : 1), 0.27 * (fluffy ? 0.75 : 1), 4), earMat, { pos: [0, 0.1, 0], rot: [0, Math.PI / 4, 0] }));
      ear.add(mesh(cone(0.08, 0.17 * (fluffy ? 0.75 : 1), 4), earIn, { pos: [0, 0.07, 0.045], rot: [0, Math.PI / 4, 0], shadow: false }));
      this.ears.push(ear);
      this.head.add(ear);
      for (const wy of [-0.09, -0.13]) this.head.add(mesh(box(0.26, 0.012, 0.012, 0), wht, { pos: [0.27 * sx, wy, 0.27], rot: [0, -0.25 * sx, (wy + 0.11) * 3 * sx], shadow: false }));
    }
    this.head.add(this.headSlot, this.faceSlot);
    this.body.add(this.head);
    this.neckSlot.position.set(0, 0.8, 0.14);
    this.body.add(this.neckSlot);

    // tail
    const baseG = new THREE.Group();
    baseG.position.set(0, 0.12, -0.45);
    this.body.add(baseG);
    let parent: THREE.Object3D = baseG;
    const tf = fluffy ? 1.7 : (ch > 1 ? 1.25 : 1);
    for (let i = 0; i < 8; i++) {
      const seg = new THREE.Group();
      const r = (0.075 - i * 0.004) * tf;
      const len = 0.17;
      let m: THREE.Material = base;
      if (point) m = dark;
      else if (L.pattern === 'tabby' || L.pattern === 'spots') m = i % 2 ? stripe : base;
      if (i === 7 && !point) m = L.pattern === 'tuxedo' ? wht : L.pattern === 'tabby' ? belly : base;
      seg.add(mesh(cyl(r * 0.92, r, len, 6), m, { pos: [0, 0, -len / 2], rot: [Math.PI / 2, 0, 0] }));
      if (i > 0) seg.position.z = -0.17;
      parent.add(seg);
      this.tail.push(seg);
      parent = seg;
    }
    this.group.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.userData.noOutline = true; });
  }

  reset(home: THREE.Vector3) {
    this.perchP = null;
    this.group.position.copy(home);
    this.state = 'idle';
    this.st = 0;
    this.endKind = null;
    this.squint = this.wantSquint = 0;
    this.sparkle = 0;
    this.earsBack = 0;
    this.yaw = this.wantYaw = this.faceYaw;
    this.onHit = null;
    this.aim = null;
    this.act = null;
    this.rig.position.set(0, 0, 0);
    this.rig.rotation.set(0, 0, 0);
    this.body.scale.set(1, 1, 1);
  }

  busy() { return this.state !== 'idle' && this.state !== 'ending'; }

  /** knead: after the strike, stay sitting on top of p for dur seconds */
  private perchP: Prop | null = null;
  private perchDur = 0;
  private perchOff = new THREE.Vector3();
  perch(p: Prop, dur: number, at: THREE.Vector3) {
    this.perchP = p;
    this.perchDur = dur;
    // where on the prop (in its local frame) the cat sits
    const inv = p.group.quaternion.clone().invert();
    const c = p.body.translation();
    this.perchOff.set(at.x - c.x, 0, at.z - c.z).applyQuaternion(inv);
    this.perchOff.y = p.localBox.max.y;
  }
  /** world point the cat is pressing on (knead) */
  perchPoint(out: THREE.Vector3): THREE.Vector3 | null {
    if (this.state !== 'perch' || !this.perchP) return null;
    return out.copy(this.perchOff).applyQuaternion(this.perchP.group.quaternion).add(this.perchP.group.position);
  }

  /** while the player is aiming: look at the prop and wiggle in anticipation */
  setAim(p: THREE.Vector3 | null) {
    this.aim = p ? p.clone() : null;
    if (p) { this.act = null; this.aimT = 0; }
  }

  line(kind: keyof CatDef['lines']) { return pick(this.def.lines[kind]); }

  /** cat-specific stats */
  get leapMul() { return this.def.motion.leap; }

  performSwat(game: Game, p: Prop, dir: THREE.Vector3, strike: THREE.Vector3, power: number, onHit: () => void) {
    this.onHit = onHit;
    this.hitDone = false;
    this.aim = null;
    this.act = null;
    this.dir.copy(dir);
    void power;
    this.from.copy(this.group.position);
    const back = p.radius + 0.62;
    this.to.copy(strike).addScaledVector(dir, -back);
    this.to.y = strike.y - 0.78;
    const g = game.groundBelow(this.to.x, this.to.y + 0.9, this.to.z, 30, true);
    if (g && this.to.y < g.y) this.to.y = g.y;
    if (this.to.y < game.floorY) this.to.y = game.floorY;
    const lx = clamp(this.to.x - dir.x * 0.4, game.roomBounds.minX + 0.6, game.roomBounds.maxX - 0.6);
    const lz = clamp(this.to.z - dir.z * 0.4, game.roomBounds.minZ + 0.6, game.roomBounds.maxZ - 0.6);
    const lg = game.groundBelow(lx, Math.max(this.to.y + 0.5, 0.5), lz, 30, true);
    this.landAt.set(lx, lg ? lg.y : game.floorY, lz);
    if (this.landAt.y > this.to.y + 0.2) this.landAt.y = game.floorY;
    const dist = this.from.distanceTo(this.to);
    const lm = this.def.motion.leap;
    this.leapDur = clamp(0.16 + dist * 0.035, 0.18, 0.55) * lm;
    this.fallDur = clamp(0.2 + Math.abs(this.to.y - this.landAt.y) * 0.04, 0.22, 0.42) * lm;
    this.wantYaw = Math.atan2(dir.x, dir.z);
    this.state = 'crouch';
    this.st = 0;
    this.lookTarget.copy(strike);
    this.hasLook = true;
    game.sfx.whoosh(0.6);
    if (this.accessories.includes('bell')) game.sfx.jingle();
    if (this.def.perk.id === 'chatty') { game.sfx.meow('short', this.def.voice); game.owner?.hear(game, this.group.position, 9); }
  }

  ending(game: Game, success: boolean) {
    this.state = 'ending';
    this.st = 0;
    this.endKind = success ? 'win' : 'lose';
    this.aim = null;
    this.wantYaw = this.faceYaw;
    if (success) {
      game.emit({ type: 'bubble', text: '...', anchor: () => this.headPos(), dur: 1.2, style: 'cat' });
      setTimeoutSafe(game, 1.25, () => {
        this.sparkle = 1;
        game.sfx.meow('ask', this.def.voice);
        game.emit({ type: 'bubble', text: this.line('innocent'), anchor: () => this.headPos(), dur: 2.6, style: 'cat' });
      });
    } else {
      game.sfx.meow('annoyed', this.def.voice);
      game.emit({ type: 'bubble', text: this.line('fail'), anchor: () => this.headPos(), dur: 2.2, style: 'cat' });
    }
  }

  /** smug little comments while the chaos unfolds */
  say(game: Game, text: string, dur: number) {
    if (this.state === 'ending' || game.time - this.lastSay < 2.5) return;
    this.lastSay = game.time;
    game.emit({ type: 'bubble', text, anchor: () => this.headPos(), dur, style: 'cat' });
  }

  sayLine(game: Game, kind: keyof CatDef['lines'], dur = 1.6) { this.say(game, this.line(kind), dur); }

  headPos(): THREE.Vector3 {
    return this.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.55, 0));
  }

  /** little celebratory hop (showroom / unlock) */
  cheer() { this.hop = 1; this.sparkle = 1; }

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

  update(game: Game | null, dt: number, gdt: number) {
    this.time += dt;
    this.st += gdt;
    const pos = this.group.position;
    const s = this.st;
    const mo = this.def.motion;
    let squash = 1, stretch = 1, butt = 0, pawRaise = 0, pawFwd = 0, legsBack = 0, lower = 0, roll = 0;

    switch (this.state) {
      case 'idle': {
        const watching = game ? this.findInteresting(game) : false;
        this.hasLook = watching;
        if (this.aim) {
          // anticipation: crouch, butt wiggle, stare at the target
          this.aimT += dt;
          this.hasLook = true;
          this.lookTarget.copy(this.aim);
          const k = Math.min(1, this.aimT / 0.25);
          squash = 1 - 0.14 * k;
          butt = Math.sin(this.time * 22 * mo.wiggle) * 0.06 * k * mo.wiggle;
          this.wantYaw = Math.atan2(this.aim.x - pos.x, this.aim.z - pos.z);
        } else if (!watching && !(game?.busy())) {
          this.nextIdleAct -= dt;
          if (this.nextIdleAct < 0 && !this.act) {
            this.nextIdleAct = rand(4, 8);
            this.act = pick(mo.idle);
            this.actT = 0;
            if (Math.random() < 0.3) this.wantYaw = this.faceYaw + rand(-0.6, 0.6);
          }
        }
        squash *= 1 + Math.sin(this.time * 2.2) * 0.015;
        break;
      }
      case 'crouch': {
        const k = Math.min(1, s / (0.13 * mo.leap));
        squash = 1 - 0.18 * k;
        butt = Math.sin(this.time * 55) * 0.08 * k * mo.wiggle;
        if (s >= 0.13 * mo.leap) { this.state = 'leap'; this.st = 0; }
        break;
      }
      case 'leap': {
        const k = Math.min(1, s / this.leapDur);
        const e = easeInOut(k);
        pos.lerpVectors(this.from, this.to, e);
        pos.y += Math.sin(k * Math.PI) * (0.9 + this.from.distanceTo(this.to) * 0.12) * mo.hop;
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
        if (k >= 1) {
          if (this.perchP) { this.state = 'perch'; this.st = 0; }
          else { this.state = 'fall'; this.st = 0; this.from.copy(pos); }
        }
        break;
      }
      case 'perch': {
        // knead, knead: paws alternate, body sinks a little
        const p = this.perchP;
        const top = p && p.alive ? this.perchPoint(new THREE.Vector3()) : null;
        if (top) pos.lerp(top, Math.min(1, dt * 14));
        squash = 0.9 + Math.sin(this.time * 12) * 0.04;
        pawRaise = Math.max(0, Math.sin(this.time * 12)) * 0.5;
        lower = 0.5;
        if (!top || s >= this.perchDur || (p && (p.broken || !p.alive))) {
          this.perchP = null;
          this.state = 'fall'; this.st = 0; this.from.copy(pos);
          const g = game?.groundBelow(pos.x + this.dir.x * 0.8, pos.y + 0.3, pos.z + this.dir.z * 0.8, 30, true);
          this.landAt.set(pos.x + this.dir.x * 0.8, g ? g.y : (game?.floorY ?? 0), pos.z + this.dir.z * 0.8);
        }
        break;
      }
      case 'fall': {
        const k = Math.min(1, s / this.fallDur);
        pos.lerpVectors(this.from, this.landAt, k);
        pos.y += Math.sin(k * Math.PI) * 0.5 * mo.hop;
        stretch = 1.1; legsBack = 0.5;
        if (k >= 1) { this.state = 'land'; this.st = 0; game?.sfx.land(); }
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
          if (s > 1.2 && s < 1.25) this.act = 'lick';
        } else {
          this.wantSquint = 0.5;
          this.earsBack = 1;
        }
        break;
      }
    }

    // idle acts (personality)
    let lickK = 0, yawn = 0, tailBoost = 0;
    if (this.act) {
      this.actT += dt;
      const dur = this.act === 'roll' ? 2.2 : this.act === 'loaf' ? 3.5 : 1.5;
      const k = Math.sin(clamp(this.actT / dur, 0, 1) * Math.PI);
      switch (this.act) {
        case 'lick': case 'groom': lickK = k; break;
        case 'stretch': stretch = 1 + k * 0.25; lower = k * 0.25; pawFwd = Math.max(pawFwd, k * 0.9); break;
        case 'yawn': yawn = k; this.wantSquint = k * 0.8; break;
        case 'loaf': lower = k * 0.18; legsBack = Math.max(legsBack, k * 0.9); this.wantSquint = k * 0.6; break;
        case 'roll': roll = k; break;
        case 'tail': tailBoost = k; break;
      }
      if (this.actT >= dur) { this.act = null; if (this.state === 'idle') this.wantSquint = 0; }
    }
    if (this.hop > 0) { this.hop = Math.max(0, this.hop - dt * 1.8); }

    // turn
    const dy = Math.atan2(Math.sin(this.wantYaw - this.yaw), Math.cos(this.wantYaw - this.yaw));
    this.yaw += dy * Math.min(1, dt * (this.state === 'crouch' || this.state === 'leap' || this.aim ? 30 : 8));
    this.group.rotation.y = this.yaw;

    this.body.scale.set(1 / Math.sqrt(squash), squash, stretch);
    this.rig.position.y = -lower * 0.3 + Math.sin((1 - this.hop) * Math.PI) * this.hop * 0.6;
    this.rig.rotation.z = butt + roll * 1.3;
    this.rig.rotation.x = this.state === 'leap' ? -0.35 : this.state === 'fall' ? 0.25 : lower * 0.4;

    this.pawR.rotation.x = -pawRaise * 2.3 - pawFwd * 1.4 - legsBack * 0.4;
    this.pawL.rotation.x = -legsBack * 0.6 - (this.act === 'stretch' ? pawFwd * 1.4 : 0);
    if (lickK > 0) {
      this.pawL.rotation.x = -lickK * 2.0;
      this.pawL.rotation.z = -lickK * 0.4;
    } else this.pawL.rotation.z = 0;
    if (this.mouth) this.mouth.scale.y = 0.01 + yawn * 1.2 + (lickK > 0.3 ? 0.4 : 0);

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
      const ang = this.faceYaw - this.yaw;
      wantHY = clamp(Math.atan2(Math.sin(ang), Math.cos(ang)), -1.1, 1.1);
      wantHP = -0.15 + (lickK > 0 ? 0.4 : 0) - yawn * 0.4;
      if (this.state === 'ending' && this.endKind === 'win' && this.st > 1.2) {
        wantHP = -0.1; this.head.rotation.z = Math.sin(this.time * 2.4) * 0.12;
      }
    }
    this.lookYaw = damp(this.lookYaw, wantHY, 10, dt);
    this.lookPitch = damp(this.lookPitch, wantHP, 10, dt);
    this.head.rotation.y = this.lookYaw;
    this.head.rotation.x = this.lookPitch;
    if (this.state !== 'ending') this.head.rotation.z = damp(this.head.rotation.z, this.aim ? 0.18 : 0, 8, dt);

    // eyes
    this.blinkT -= dt;
    if (this.blinkT < 0) { this.blink = 0.14; this.blinkT = rand(2, 5); }
    if (this.blink > 0) this.blink -= dt;
    this.squint = damp(this.squint, this.wantSquint, 8, dt);
    const open = this.blink > 0 ? 0.12 : 1 - this.squint * 0.85;
    const big = 1 + this.sparkle * 0.35 + (this.aim ? 0.15 : 0);
    for (const e of this.eyes) e.scale.set(big, open * big, big);
    for (const sh of this.shines) sh.scale.setScalar(1 + this.sparkle * 0.8);
    if (this.state !== 'ending') this.sparkle = Math.max(0, this.sparkle - dt * 0.6);
    // ears
    const twitch = Math.sin(this.time * 0.7) > 0.97 ? Math.sin(this.time * 40) * 0.2 : 0;
    this.ears.forEach((e, i) => {
      const sx = i === 0 ? -1 : 1;
      const perk = this.aim ? -0.15 * sx : 0;
      e.rotation.z = -0.32 * sx - this.earsBack * 0.9 * sx + (i === 1 ? twitch : 0) + perk;
      e.rotation.x = -this.earsBack * 0.4;
    });
    // tail
    const active = this.state === 'leap' || this.state === 'crouch' || !!this.aim;
    const ts = mo.tail * (1 + tailBoost * 2);
    this.tail.forEach((seg, i) => {
      const ph = this.time * (active ? 9 : 2.2) * ts - i * 0.6;
      seg.rotation.y = (i === 0 ? 1.1 : 0.22) + Math.sin(ph) * (active ? 0.25 : 0.12 + tailBoost * 0.2);
      seg.rotation.x = i === 0 ? (active ? -0.9 : 0.05) : active ? -0.12 : 0.04 + (i > 5 ? -0.25 : 0);
    });
    // golden sparkle
    if (this.def.look.sparkle && game) {
      this.sparkleT -= dt;
      if (this.sparkleT < 0) {
        this.sparkleT = 0.18;
        game.glows.emit({ pos: pos.clone().add(new THREE.Vector3(rand(-0.4, 0.4), rand(0.3, 1.2), rand(-0.4, 0.4))), vel: new THREE.Vector3(0, 0.6, 0), life: 0.7, size0: 0.25, size1: 0.02, color: '#ffe680', drag: 1 });
      }
    }
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
