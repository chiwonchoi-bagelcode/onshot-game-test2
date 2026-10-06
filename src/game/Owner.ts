import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { M, box, cyl, mesh, sphere } from '../render/kit';
import { clamp, rand } from '../core/util';
import { GROUPS } from '../core/constants';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Loop } from '../audio/Sfx';

const SKIN = '#ffd9b8';
const HAIR = '#4a3428';

/**
 * The cat's human. Either comes home through the door at the end of a
 * level, or (bedroom) is asleep in bed and must be woken up.
 */
export class Owner {
  readonly group = new THREE.Group();
  readonly mode: 'door' | 'sleep';
  private rig = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private torso = new THREE.Group();
  private mouth!: THREE.Mesh;
  private eyes: THREE.Mesh[] = [];
  private bag: THREE.Object3D | null = null;
  private home = new THREE.Vector3();
  private facing = 0;
  private t = 0;
  private state: 'hidden' | 'enter' | 'shock' | 'happy' | 'sleep' | 'waking' | 'awake' = 'hidden';
  disturbance = 0;
  awake = false;
  private zT = 0;
  private snore: Loop | null = null;
  private stirShown = 0;
  private lastHit = 0;
  /** world position of the sleeping head */
  readonly headPos = new THREE.Vector3();

  constructor(game: Game, mode: 'door' | 'sleep', pos: THREE.Vector3, facing: number) {
    this.mode = mode;
    this.home.copy(pos);
    this.facing = facing;
    this.group.add(this.rig);
    if (mode === 'door') this.buildStanding();
    else this.buildSleeping(game);
    this.group.position.copy(pos);
    this.group.rotation.y = facing;
    if (mode === 'door') { this.group.visible = false; this.state = 'hidden'; }
    else { this.state = 'sleep'; }
    this.group.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.userData.noOutline = true; });
  }

  private face(parent: THREE.Object3D, z: number) {
    const blk = M('#2b2233');
    for (const sx of [-1, 1]) {
      const e = mesh(sphere(0.06, 6, 5), blk, { pos: [0.15 * sx, 0.05, z], scale: [1, 1.2, 0.5], shadow: false });
      this.eyes.push(e);
      parent.add(e);
    }
    this.mouth = mesh(sphere(0.07, 8, 6), M('#7a2e3a'), { pos: [0, -0.15, z - 0.01], scale: [1.2, 0.35, 0.4], shadow: false });
    parent.add(this.mouth);
    parent.add(mesh(sphere(0.06, 6, 4), M('#ffb39a'), { pos: [0.22, -0.06, z - 0.04], scale: [1, 0.6, 0.4], shadow: false }));
    parent.add(mesh(sphere(0.06, 6, 4), M('#ffb39a'), { pos: [-0.22, -0.06, z - 0.04], scale: [1, 0.6, 0.4], shadow: false }));
  }

  private buildStanding() {
    const shirt = M('#5b8def'), pants = M('#3b3f63'), skin = M(SKIN), hair = M(HAIR), shoe = M('#f4f1ea');
    this.rig.add(this.torso);
    for (const [g, x] of [[this.legL, 0.2], [this.legR, -0.2]] as const) {
      g.position.set(x, 1.5, 0);
      g.add(mesh(box(0.32, 1.45, 0.36, 0.06), pants, { pos: [0, -0.72, 0] }));
      g.add(mesh(box(0.34, 0.16, 0.5, 0.05), shoe, { pos: [0, -1.44, 0.07] }));
      this.rig.add(g);
    }
    this.torso.position.y = 1.5;
    this.torso.add(mesh(box(0.85, 1.15, 0.48, 0.12), shirt, { pos: [0, 0.6, 0] }));
    for (const [g, x] of [[this.armL, 0.52], [this.armR, -0.52]] as const) {
      g.position.set(x, 1.1, 0);
      g.add(mesh(box(0.22, 0.95, 0.24, 0.06), shirt, { pos: [0, -0.45, 0] }));
      g.add(mesh(sphere(0.13, 6, 5), skin, { pos: [0, -0.98, 0] }));
      this.torso.add(g);
    }
    // grocery bag in right hand
    const bag = new THREE.Group();
    bag.add(mesh(box(0.5, 0.55, 0.32, 0.04), M('#e8d3a8'), { pos: [0, -0.3, 0] }));
    bag.add(mesh(sphere(0.12, 6, 5), M('#7bd389'), { pos: [0.08, 0.02, 0] }));
    bag.add(mesh(cyl(0.05, 0.05, 0.35, 6), M('#ffd23f'), { pos: [-0.12, 0.05, 0], rot: [0, 0, 0.3] }));
    bag.position.set(0, -1.05, 0.05);
    this.armR.add(bag);
    this.bag = bag;
    this.head.position.y = 1.55;
    this.head.add(mesh(sphere(0.42, 10, 8), skin, { pos: [0, 0.3, 0] }));
    this.head.add(mesh(sphere(0.45, 10, 8), hair, { pos: [0, 0.45, -0.07], scale: [1, 0.75, 1] }));
    this.head.add(mesh(box(0.5, 0.18, 0.2, 0.06), hair, { pos: [0.08, 0.62, 0.3], rot: [0.3, 0, -0.2] }));
    const faceG = new THREE.Group(); faceG.position.y = 0.3; this.head.add(faceG);
    this.face(faceG, 0.39);
    this.torso.add(this.head);
  }

  private buildSleeping(game: Game) {
    const skin = M(SKIN), hair = M(HAIR), blanket = M('#7ec4cf'), blanket2 = M('#a7dfe6');
    // local frame: lying along +x (head at -x)
    this.head.position.set(-1.25, 0.42, 0);
    const skull = mesh(sphere(0.42, 10, 8), skin);
    this.head.add(skull);
    this.head.add(mesh(sphere(0.45, 10, 8), hair, { pos: [-0.12, 0.08, 0], scale: [0.85, 1, 1] }));
    const faceG = new THREE.Group();
    faceG.rotation.y = Math.PI / 2;
    faceG.rotation.x = -0.1;
    this.head.add(faceG);
    this.face(faceG, 0.39);
    this.head.rotation.z = -1.3;
    this.rig.add(this.head);
    // blanket mound
    this.torso.add(mesh(box(2.3, 0.7, 1.7, 0.25), blanket, { pos: [0.35, 0.3, 0] }));
    this.torso.add(mesh(box(2.32, 0.14, 1.72, 0.05), blanket2, { pos: [0.35, 0.58, 0] }));
    this.torso.add(mesh(box(0.6, 0.18, 1.74, 0.06), M('#ffffff'), { pos: [-0.6, 0.62, 0] }));
    this.rig.add(this.torso);
    // physics: owner is a fixed obstacle that reports hits
    const R = game.R;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), this.facing);
    const b = game.world.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(this.home.x, this.home.y, this.home.z).setRotation({ x: q.x, y: q.y, z: q.z, w: q.w }));
    const mk = (d: RAPIER.ColliderDesc) => {
      d.setCollisionGroups(GROUPS.static).setRestitution(0.5).setFriction(0.6)
        .setActiveEvents(R.ActiveEvents.CONTACT_FORCE_EVENTS).setContactForceEventThreshold(40);
      const c = game.world.createCollider(d, b);
      game.ownerColliders.add(c.handle);
    };
    mk(R.ColliderDesc.roundCuboid(1.0, 0.2, 0.7, 0.15).setTranslation(0.35, 0.35, 0));
    mk(R.ColliderDesc.ball(0.42).setTranslation(-1.25, 0.42, 0));
    this.snore = game.sfx.zzz();
  }

  dispose() { this.snore?.stop(); this.snore = null; }

  busy() { return this.state === 'waking'; }

  /** called on contact force events against the sleeping owner */
  hitBy(game: Game, p: Prop, force: number) {
    if (this.mode !== 'sleep' || this.awake) return;
    if (game.time - this.lastHit < 0.12) return;
    this.lastHit = game.time;
    const add = clamp((force - 40) / 11, 3, 36) * (p.mat === 'soft' ? 0.4 : 1);
    this.disturb(game, add, '아얏…!');
  }

  /** noise from a crash at pos */
  hear(game: Game, pos: THREE.Vector3, loudness: number) {
    if (this.mode !== 'sleep' || this.awake) return;
    const d = pos.distanceTo(this.headPos);
    const k = clamp(1.15 - d / 9, 0, 1);
    if (k <= 0) return;
    this.disturb(game, loudness * k, null);
  }

  disturb(game: Game, amount: number, word: string | null) {
    if (this.awake || this.mode !== 'sleep') return;
    this.disturbance = Math.min(100, this.disturbance + amount);
    game.emit({ type: 'sleep', value: this.disturbance });
    if (word && amount > 6) game.emit({ type: 'word', text: word, pos: this.headPos.clone().add(new THREE.Vector3(0, 0.8, 0)), size: 0.9, color: '#ffffff' });
    const stage = this.disturbance >= 100 ? 3 : this.disturbance >= 60 ? 2 : this.disturbance >= 30 ? 1 : 0;
    if (stage > this.stirShown && stage < 3) {
      this.stirShown = stage;
      game.emit({ type: 'bubble', text: stage === 1 ? '으음… 냐암…' : '으으… 시끄러워…', anchor: () => this.headPos.clone().add(new THREE.Vector3(0, 0.9, 0)), dur: 1.6, style: 'owner' });
      this.t = 0;
    }
    if (this.disturbance >= 100) {
      this.awake = true;
      this.state = 'waking';
      this.t = 0;
      this.snore?.stop();
      game.sfx.gasp();
      game.emit({ type: 'bubble', text: '!!?', anchor: () => this.headPos.clone().add(new THREE.Vector3(0, 0.9, 0)), dur: 1.4, style: 'owner' });
      game.addScore(50000, this.headPos.clone(), { chain: false });
      game.checkGoal();
    }
  }

  /** end of level: the owner sees the room */
  discover(game: Game, success: boolean) {
    if (this.mode === 'door') {
      this.group.visible = true;
      this.state = success ? 'enter' : 'enter';
      this.t = 0;
      this.happyEnding = !success;
      game.sfx.click();
      setTimeout(() => {
        if (success) {
          game.sfx.sting();
          game.sfx.duckMusic(0.2, 3);
          game.emit({ type: 'bubble', text: game.level.ownerLine ?? '이게 다 뭐야?!', anchor: () => this.top(), dur: 2.6, style: 'owner' });
        } else {
          game.emit({ type: 'bubble', text: '우리 냥이 얌전히 있었네~ ♥', anchor: () => this.top(), dur: 2.4, style: 'owner' });
        }
      }, game.headless ? 0 : 650);
    } else if (success) {
      game.emit({ type: 'bubble', text: game.level.ownerLine ?? '너… 지금 몇 시인 줄 알아?!', anchor: () => this.headPos.clone().add(new THREE.Vector3(0, 1.3, 0)), dur: 2.6, style: 'owner' });
    } else {
      game.emit({ type: 'bubble', text: 'Zzz… 착한 냥이… Zzz', anchor: () => this.headPos.clone().add(new THREE.Vector3(0, 0.9, 0)), dur: 2.4, style: 'owner' });
    }
  }

  private happyEnding = false;

  top(): THREE.Vector3 { return this.group.position.clone().add(new THREE.Vector3(0, 3.6, 0)); }

  update(game: Game, gdt: number, dt: number) {
    this.t += dt;
    const t = this.t;
    if (this.mode === 'door') {
      if (this.state === 'hidden') return;
      const fwd = new THREE.Vector3(Math.sin(this.facing), 0, Math.cos(this.facing));
      const k = Math.min(1, t / 0.6);
      this.group.position.copy(this.home).addScaledVector(fwd, -0.9 + k * 0.9);
      if (t < 0.6) {
        const sw = Math.sin(t * 16) * 0.5;
        this.legL.rotation.x = sw; this.legR.rotation.x = -sw;
        this.armL.rotation.x = -sw * 0.6; this.armR.rotation.x = sw * 0.6;
      } else if (!this.happyEnding) {
        // shock: jump, arms up, bag drops
        const s = t - 0.6;
        this.rig.position.y = Math.max(0, Math.sin(Math.min(s, 0.35) / 0.35 * Math.PI) * 0.4);
        this.legL.rotation.x = this.legR.rotation.x = 0;
        this.armL.rotation.z = Math.min(1, s * 6) * 2.6;
        this.armR.rotation.z = -Math.min(1, s * 6) * 2.6;
        this.armL.rotation.x = this.armR.rotation.x = Math.sin(s * 30) * 0.08;
        this.head.rotation.y = s > 0.8 ? Math.sin(s * 9) * 0.35 : 0;
        this.mouth.scale.set(0.9, 1.3, 0.5);
        for (const e of this.eyes) e.scale.set(1.4, 1.6, 0.5);
        if (this.bag && this.bag.parent === this.armR) {
          const wp = this.bag.getWorldPosition(new THREE.Vector3());
          this.armR.remove(this.bag);
          game.scene.add(this.bag);
          this.bag.position.copy(wp);
          this.bag.userData.vy = 2;
        }
        if (this.bag && this.bag.parent === game.scene) {
          this.bag.userData.vy -= 20 * dt;
          this.bag.position.y = Math.max(game.floorY + 0.55, this.bag.position.y + this.bag.userData.vy * dt);
          this.bag.rotation.z = Math.min(1.3, this.bag.rotation.z + dt * 4);
        }
      } else {
        // happy: arms open, head tilt
        const s = t - 0.6;
        this.legL.rotation.x = this.legR.rotation.x = 0;
        this.armL.rotation.z = Math.min(1, s * 3) * 0.7;
        this.armR.rotation.z = -Math.min(1, s * 3) * 0.7;
        this.head.rotation.z = Math.sin(s * 3) * 0.12;
        this.mouth.scale.set(1.4, 0.5, 0.4);
        for (const e of this.eyes) e.scale.set(1.2, 0.35, 0.5);
      }
      return;
    }
    // sleeping owner
    this.headPos.copy(this.head.getWorldPosition(new THREE.Vector3()));
    if (this.state === 'sleep') {
      const breath = Math.sin(t * 1.6) * 0.03;
      this.torso.scale.set(1, 1 + breath, 1 + breath * 0.5);
      for (const e of this.eyes) e.scale.set(1.2, 0.12, 0.5);
      this.mouth.scale.set(0.6, 0.4, 0.4);
      this.zT -= gdt;
      if (this.zT <= 0) {
        this.zT = 1.1;
        game.glows.emit({ pos: this.headPos.clone().add(new THREE.Vector3(0, 0.5, 0)), vel: new THREE.Vector3(rand(0.2, 0.5), 1.0, 0), life: 2.2, size0: 0.35, size1: 0.6, color: '#c9d6ff', drag: 0.3 });
      }
      if (this.stirShown > 0 && t < 0.8) this.rig.rotation.x = Math.sin(t * 20) * 0.03 * this.stirShown;
      else this.rig.rotation.x = 0;
    } else if (this.state === 'waking' || this.state === 'awake') {
      const k = Math.min(1, t / 0.5);
      this.head.rotation.z = -1.3 + k * 1.3;
      this.head.position.set(-1.25 + k * 0.55, 0.42 + k * 0.9, 0);
      this.torso.rotation.z = 0;
      for (const e of this.eyes) e.scale.set(1.5, 1.7, 0.5);
      this.mouth.scale.set(0.9, 1.3, 0.5);
      if (t > 0.8) this.state = 'awake';
    }
  }
}
