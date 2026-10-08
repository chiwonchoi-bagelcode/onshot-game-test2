import * as THREE from 'three';
import { M, box, cyl, mesh, sphere, torus } from '../render/kit';
import { clamp, damp } from '../core/util';
import type { Game } from './Game';

/* ------------------------------------------------------------------ */
/* People of the outside world: the owner polishing the new car, the  */
/* neighbour with her bonsai, a potter, an office worker, guards and   */
/* the general. They act out stage openings (preludes), stand watch    */
/* (suspicion) and come back to discover the mess.                     */
/* ------------------------------------------------------------------ */

export type Hat = 'none' | 'cap' | 'hardhat' | 'chef' | 'beret' | 'helmet' | 'bun';
export type Tool = 'none' | 'rag' | 'scissors' | 'tweezers' | 'keys' | 'waterCan' | 'clipboard' | 'cup' | 'tray';

export interface ActorLook {
  shirt: string;
  pants: string;
  skin?: string;
  hair?: string;
  hat?: Hat;
  hatColor?: string;
  tool?: Tool;
  /** grey hair, slightly smaller (grandma) */
  old?: boolean;
  apron?: string;
  glasses?: boolean;
  /** overall scale (kids, the general) */
  scale?: number;
}

type Pose = 'idle' | 'walk' | 'polish' | 'admire' | 'work' | 'water' | 'point' | 'shock' | 'happy' | 'look';

interface Act {
  kind: 'walk' | 'pose' | 'turn' | 'wait' | 'call';
  to?: THREE.Vector3;
  yaw?: number;
  pose?: Pose;
  dur: number;
  fn?: () => void;
  t: number;
}

const _v = new THREE.Vector3();

export class Actor {
  readonly group = new THREE.Group();
  private rig = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private eyes: THREE.Mesh[] = [];
  private mouth!: THREE.Mesh;
  private tool: THREE.Object3D | null = null;
  pose: Pose = 'idle';
  private t = 0;
  private yaw = 0;
  private wantYaw = 0;
  private queue: Act[] = [];
  /** walking speed (units/s) */
  speed = 2.4;
  readonly height: number;
  /** used by watchers: where the head looks (yaw offset from the body) */
  lookYaw = 0;
  /** where it went after the opening (comes back from here at the end) */
  readonly exitPos = new THREE.Vector3();
  /** where it rushes to when it discovers the mess */
  readonly scenePos = new THREE.Vector3();
  name = '';

  constructor(readonly look: ActorLook) {
    this.build();
    this.group.add(this.rig);
    const s = look.scale ?? (look.old ? 0.92 : 1);
    this.group.scale.setScalar(s);
    this.height = 3.4 * s;
    this.group.traverse((m) => { if ((m as THREE.Mesh).isMesh) { m.castShadow = true; m.userData.noOutline = true; } });
  }

  /* ------------------------------ model ------------------------------ */

  private build() {
    const L = this.look;
    const shirt = M(L.shirt), pants = M(L.pants), skin = M(L.skin ?? '#ffd9b8');
    const hairC = L.old ? '#e8e4ee' : L.hair ?? '#4a3428';
    const hair = M(hairC), shoe = M('#f4f1ea');
    this.rig.add(this.torso);
    for (const [g, x] of [[this.legL, 0.2], [this.legR, -0.2]] as const) {
      g.position.set(x, 1.5, 0);
      g.add(mesh(box(0.32, 1.45, 0.36, 0.06), pants, { pos: [0, -0.72, 0] }));
      g.add(mesh(box(0.34, 0.16, 0.5, 0.05), shoe, { pos: [0, -1.44, 0.07] }));
      this.rig.add(g);
    }
    this.torso.position.y = 1.5;
    this.torso.add(mesh(box(0.85, 1.15, 0.48, 0.12), shirt, { pos: [0, 0.6, 0] }));
    if (L.apron) this.torso.add(mesh(box(0.7, 1.1, 0.06, 0.03), M(L.apron), { pos: [0, 0.38, 0.26] }));
    for (const [g, x] of [[this.armL, 0.52], [this.armR, -0.52]] as const) {
      g.position.set(x, 1.1, 0);
      g.add(mesh(box(0.22, 0.95, 0.24, 0.06), shirt, { pos: [0, -0.45, 0] }));
      g.add(mesh(sphere(0.13, 6, 5), skin, { pos: [0, -0.98, 0] }));
      this.torso.add(g);
    }
    this.head.position.y = 1.55;
    this.head.add(mesh(sphere(0.42, 10, 8), skin, { pos: [0, 0.3, 0] }));
    const hat = L.hat ?? 'none';
    if (hat !== 'helmet') {
      if (L.old || hat === 'bun') {
        this.head.add(mesh(sphere(0.44, 10, 8), hair, { pos: [0, 0.42, -0.08], scale: [1, 0.72, 1] }));
        this.head.add(mesh(sphere(0.2, 8, 6), hair, { pos: [0, 0.82, -0.22] }));
      } else {
        this.head.add(mesh(sphere(0.45, 10, 8), hair, { pos: [0, 0.45, -0.07], scale: [1, 0.75, 1] }));
        this.head.add(mesh(box(0.5, 0.18, 0.2, 0.06), hair, { pos: [0.08, 0.62, 0.3], rot: [0.3, 0, -0.2] }));
      }
    }
    const hc = M(L.hatColor ?? '#ff6b6b');
    if (hat === 'cap') {
      this.head.add(mesh(sphere(0.46, 10, 6, ), hc, { pos: [0, 0.52, -0.02], scale: [1, 0.55, 1] }));
      this.head.add(mesh(box(0.5, 0.06, 0.34, 0.03), hc, { pos: [0, 0.58, 0.38] }));
    } else if (hat === 'hardhat') {
      this.head.add(mesh(sphere(0.5, 10, 6), M(L.hatColor ?? '#ffd23f'), { pos: [0, 0.55, 0], scale: [1, 0.62, 1] }));
      this.head.add(mesh(cyl(0.6, 0.6, 0.05, 12), M(L.hatColor ?? '#ffd23f'), { pos: [0, 0.48, 0.04] }));
    } else if (hat === 'chef') {
      this.head.add(mesh(cyl(0.34, 0.3, 0.5, 10), M('#ffffff'), { pos: [0, 0.95, -0.02] }));
      this.head.add(mesh(sphere(0.38, 8, 6), M('#ffffff'), { pos: [0, 1.2, -0.02] }));
    } else if (hat === 'beret') {
      this.head.add(mesh(sphere(0.47, 10, 6), M(L.hatColor ?? '#3f5d3a'), { pos: [0.06, 0.62, -0.02], scale: [1.05, 0.38, 1.05] }));
    } else if (hat === 'helmet') {
      this.head.add(mesh(sphere(0.62, 12, 9), M('#f4f6fb'), { pos: [0, 0.32, 0] }));
      this.head.add(mesh(sphere(0.46, 10, 8), M('#2b3a5c', { opacity: 0.55 }), { pos: [0, 0.32, 0.22], scale: [1, 0.85, 0.6] }));
    }
    const faceG = new THREE.Group();
    faceG.position.y = 0.3;
    this.head.add(faceG);
    const blk = M('#2b2233');
    for (const sx of [-1, 1]) {
      const e = mesh(sphere(0.06, 6, 5), blk, { pos: [0.15 * sx, 0.05, 0.39], scale: [1, 1.2, 0.5], shadow: false });
      this.eyes.push(e);
      faceG.add(e);
    }
    if (L.glasses) for (const sx of [-1, 1]) faceG.add(mesh(torus(0.11, 0.022, 4, 10), M('#3b2a4a'), { pos: [0.15 * sx, 0.05, 0.42] }));
    this.mouth = mesh(sphere(0.07, 8, 6), M('#7a2e3a'), { pos: [0, -0.15, 0.38], scale: [1.2, 0.35, 0.4], shadow: false });
    faceG.add(this.mouth);
    for (const sx of [-1, 1]) faceG.add(mesh(sphere(0.06, 6, 4), M('#ffb39a'), { pos: [0.22 * sx, -0.06, 0.35], scale: [1, 0.6, 0.4], shadow: false }));
    this.torso.add(this.head);
    this.setTool(L.tool ?? 'none');
  }

  setTool(t: Tool) {
    if (this.tool) { this.tool.parent?.remove(this.tool); this.tool = null; }
    if (t === 'none') return;
    const g = new THREE.Group();
    switch (t) {
      case 'rag': g.add(mesh(box(0.34, 0.08, 0.28, 0.03), M('#ffd23f'))); break;
      case 'scissors':
        g.add(mesh(box(0.05, 0.42, 0.03, 0.01), M('#c9ccd6'), { pos: [0.03, -0.18, 0], rot: [0, 0, 0.15] }));
        g.add(mesh(box(0.05, 0.42, 0.03, 0.01), M('#c9ccd6'), { pos: [-0.03, -0.18, 0], rot: [0, 0, -0.15] }));
        g.add(mesh(torus(0.07, 0.02, 4, 8), M('#ff6b6b'), { pos: [0.06, 0.04, 0] }));
        break;
      case 'tweezers': g.add(mesh(box(0.03, 0.32, 0.03, 0.01), M('#c9ccd6'), { pos: [0, -0.14, 0] })); break;
      case 'keys':
        g.add(mesh(torus(0.06, 0.015, 4, 8), M('#ffd23f')));
        g.add(mesh(box(0.06, 0.18, 0.02, 0.01), M('#ffd23f'), { pos: [0, -0.12, 0] }));
        break;
      case 'waterCan':
        g.add(mesh(cyl(0.18, 0.2, 0.32, 10), M('#7bd389'), { pos: [0, -0.18, 0.08] }));
        g.add(mesh(cyl(0.03, 0.04, 0.42, 6), M('#7bd389'), { pos: [0, -0.1, 0.36], rot: [1.1, 0, 0] }));
        break;
      case 'clipboard': g.add(mesh(box(0.34, 0.46, 0.04, 0.02), M('#b9825a'), { pos: [0, -0.12, 0.1] })); break;
      case 'cup': g.add(mesh(cyl(0.1, 0.09, 0.2, 8), M('#ffffff'), { pos: [0, -0.08, 0.06] })); break;
      case 'tray': g.add(mesh(cyl(0.4, 0.4, 0.04, 12), M('#c9ccd6'), { pos: [0, -0.04, 0.3] })); break;
    }
    g.position.set(0, -1.05, 0.08);
    this.armR.add(g);
    this.tool = g;
  }

  /* ------------------------------ placement ------------------------------ */

  place(x: number, y: number, z: number, yaw: number) {
    this.group.position.set(x, y, z);
    this.yaw = this.wantYaw = yaw;
    this.group.rotation.y = yaw;
    this.queue = [];
    this.pose = 'idle';
  }

  get pos() { return this.group.position; }
  /** where speech bubbles anchor */
  top(): THREE.Vector3 { return this.group.position.clone().add(new THREE.Vector3(0, this.height + 0.4, 0)); }
  headPos(): THREE.Vector3 { return this.head.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0)); }
  /** world direction the actor is facing (including head turn) */
  facing(out = new THREE.Vector3()): THREE.Vector3 {
    const a = this.yaw + this.lookYaw;
    return out.set(Math.sin(a), 0, Math.cos(a));
  }

  /* ------------------------------ scripting ------------------------------ */

  /** queue: walk to (x, z) on the current ground height */
  walkTo(x: number, z: number) { this.queue.push({ kind: 'walk', to: new THREE.Vector3(x, this.group.position.y, z), dur: 0, t: 0 }); return this; }
  turnTo(x: number, z: number) { this.queue.push({ kind: 'turn', to: new THREE.Vector3(x, 0, z), dur: 0.35, t: 0 }); return this; }
  do(pose: Pose, dur: number) { this.queue.push({ kind: 'pose', pose, dur, t: 0 }); return this; }
  wait(dur: number) { this.queue.push({ kind: 'wait', dur, t: 0 }); return this; }
  then(fn: () => void) { this.queue.push({ kind: 'call', fn, dur: 0, t: 0 }); return this; }
  busy() { return this.queue.length > 0; }
  clear() { this.queue = []; this.pose = 'idle'; }

  /** jump to the end of the script (skipping an opening) */
  finish() {
    for (const a of this.queue) {
      if (a.kind === 'walk' && a.to) this.group.position.copy(a.to);
      if (a.kind === 'call') a.fn?.();
    }
    this.queue = [];
    this.pose = 'idle';
  }

  /* ------------------------------ animation ------------------------------ */

  update(game: Game | null, dt: number) {
    this.t += dt;
    const a = this.queue[0];
    let pose: Pose = this.pose;
    if (a) {
      a.t += dt;
      if (a.kind === 'walk' && a.to) {
        _v.copy(a.to).sub(this.group.position).setY(0);
        const d = _v.length();
        if (d > 0.03) {
          this.wantYaw = Math.atan2(_v.x, _v.z);
          const step = Math.min(d, this.speed * dt);
          this.group.position.addScaledVector(_v.normalize(), step);
          pose = 'walk';
        } else { this.queue.shift(); pose = 'idle'; }
      } else if (a.kind === 'turn' && a.to) {
        _v.copy(a.to).sub(this.group.position);
        this.wantYaw = Math.atan2(_v.x, _v.z);
        if (a.t >= a.dur) this.queue.shift();
      } else if (a.kind === 'pose') {
        pose = a.pose!;
        if (a.t >= a.dur) { this.queue.shift(); pose = 'idle'; }
      } else if (a.kind === 'wait') {
        if (a.t >= a.dur) this.queue.shift();
      } else if (a.kind === 'call') {
        this.queue.shift();
        a.fn?.();
      }
    }
    this.pose = pose === 'walk' && !this.queue.length ? 'idle' : pose;
    const dy = Math.atan2(Math.sin(this.wantYaw - this.yaw), Math.cos(this.wantYaw - this.yaw));
    this.yaw += dy * Math.min(1, dt * 8);
    this.group.rotation.y = this.yaw;
    this.animate(pose, dt, game);
  }

  private animate(pose: Pose, dt: number, game: Game | null) {
    const t = this.t;
    let legL = 0, legR = 0, armLx = 0, armRx = 0, armLz = 0, armRz = 0, bob = 0, headX = 0, headZ = 0, eyes = 1, mouth: [number, number] = [1.2, 0.35];
    switch (pose) {
      case 'walk': {
        const s = Math.sin(t * 9);
        legL = s * 0.55; legR = -s * 0.55; armLx = -s * 0.45; armRx = s * 0.45; bob = Math.abs(Math.cos(t * 9)) * 0.06;
        break;
      }
      case 'polish':
        armRx = -1.1 + Math.sin(t * 7) * 0.25; armRz = Math.cos(t * 7) * 0.3; headX = 0.25; bob = Math.sin(t * 7) * 0.02;
        break;
      case 'work':
        armRx = -1.25 + Math.sin(t * 11) * 0.06; armLx = -1.15; armLz = -0.25; headX = 0.4;
        break;
      case 'water':
        armRx = -1.2; armRz = 0.35 + Math.sin(t * 3) * 0.08; headX = 0.3;
        break;
      case 'admire':
        armLx = -0.9; armRx = -0.9; armLz = -0.55; armRz = 0.55; bob = Math.sin(t * 5) * 0.05; headZ = Math.sin(t * 2.5) * 0.15; eyes = 0.25; mouth = [1.4, 0.5];
        if (game && Math.random() < dt * 3) game.glows.emit({ pos: this.top().add(new THREE.Vector3((Math.random() - 0.5) * 0.8, -0.4, 0)), vel: new THREE.Vector3(0, 1.2, 0), life: 0.9, size0: 0.35, size1: 0.05, color: '#ff9fc0', drag: 1.5 });
        break;
      case 'point':
        armRx = -1.5; headX = 0.1;
        break;
      case 'look':
        headX = 0.15; headZ = Math.sin(t * 1.3) * 0.08;
        break;
      case 'shock': {
        const k = clamp(t * 6, 0, 1);
        armLz = k * 2.6; armRz = -k * 2.6; armLx = Math.sin(t * 30) * 0.08; armRx = -armLx; bob = Math.abs(Math.sin(t * 5)) * 0.12; eyes = 1.6; mouth = [0.9, 1.3];
        headZ = Math.sin(t * 9) * 0.25;
        break;
      }
      case 'happy':
        armLz = 0.7; armRz = -0.7; headZ = Math.sin(t * 3) * 0.12; eyes = 0.35; mouth = [1.4, 0.5];
        break;
      default: {
        const b = Math.sin(t * 1.8) * 0.02;
        bob = b; armLz = 0.05; armRz = -0.05;
      }
    }
    const k = 1 - Math.exp(-dt * 14);
    const D = (o: THREE.Object3D, ax: 'x' | 'z', v: number) => { o.rotation[ax] += (v - o.rotation[ax]) * k; };
    D(this.legL, 'x', legL); D(this.legR, 'x', legR);
    D(this.armL, 'x', armLx); D(this.armR, 'x', armRx); D(this.armL, 'z', armLz); D(this.armR, 'z', armRz);
    D(this.head, 'x', headX); D(this.head, 'z', headZ);
    this.head.rotation.y = damp(this.head.rotation.y, this.lookYaw, 6, dt);
    this.rig.position.y = bob;
    const blink = (t % 3.3) < 0.12 ? 0.15 : 1;
    for (const e of this.eyes) e.scale.set(eyes > 1 ? 1.3 : 1, 1.2 * eyes * blink, 0.5);
    this.mouth.scale.set(mouth[0], mouth[1], 0.4);
  }

  /** the ending: comes back, sees the mess, and reacts */
  react(game: Game, success: boolean, line: string) {
    this.queue = [];
    if (!this.group.visible) {
      this.group.visible = true;
      this.group.position.copy(this.exitPos);
    }
    _v.copy(this.scenePos).sub(this.group.position).setY(0);
    const d = _v.length();
    if (d > 0.5) {
      const go = this.group.position.clone().addScaledVector(_v.normalize(), Math.min(2.2, d - 0.4));
      this.walkTo(go.x, go.z);
    }
    this.turnTo(this.scenePos.x, this.scenePos.z);
    this.then(() => {
      if (success) { game.sfx.sting(); game.sfx.gasp(); }
      game.emit({ type: 'bubble', text: success ? line : '휴… 별일 없었네~', anchor: () => this.top(), dur: 2.6, style: 'owner' });
    });
    this.do(success ? 'shock' : 'happy', 3);
  }

  /** a little cone on the floor showing what a watcher sees */
  static visionCone(range: number, half: number, color = '#ff6b6b'): THREE.Mesh {
    const g = new THREE.CircleGeometry(range, 20, -half, half * 2);
    const m = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, depthWrite: false });
    const c = new THREE.Mesh(g, m);
    c.rotation.x = -Math.PI / 2;
    c.rotation.z = Math.PI / 2;
    c.position.y = 0.04;
    c.renderOrder = 2;
    return c;
  }
}


