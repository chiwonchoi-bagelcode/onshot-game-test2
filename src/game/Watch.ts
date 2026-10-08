import * as THREE from 'three';
import type { Game } from './Game';
import { Actor } from './Actor';
import { G, groups } from '../core/constants';

/* ------------------------------------------------------------------ */
/* Watchers: people who might see the cat do it. Each one looks around  */
/* on a fixed routine (readable timing), its gaze drawn on the ground.  */
/* Crashes and paws seen inside the cone raise suspicion; 100% means    */
/* caught red-handed. Nobody saw a thing = the perfect crime.           */
/* ------------------------------------------------------------------ */

export interface WatchDef {
  /** how far they see (units) */
  range: number;
  /** half-angle of the gaze (radians) */
  half: number;
  /** routine: [seconds, head yaw offset from the body] — loops */
  cycle: [number, number][];
  /** walks a loop: [x, z, seconds to stand there, 1 = out of sight there (next carriage)] */
  patrol?: ([number, number, number] | [number, number, number, number])[];
  /** can't leave the spot (behind a window): a meow only turns the head */
  stays?: boolean;
}

const _v = new THREE.Vector3();

export class Watcher {
  readonly cone: THREE.Mesh;
  readonly holder = new THREE.Group();
  private alertT = 0;
  private period: number;
  private leg = 0;
  private mat: THREE.MeshBasicMaterial;
  /** called away by a meow: walking to and staring at a spot */
  private lured = false;
  private home: { x: number; z: number; yaw: number } | null = null;
  private stare: { x: number; z: number; until: number } | null = null;

  constructor(readonly actor: Actor, readonly def: WatchDef) {
    this.cone = Actor.visionCone(def.range, def.half, '#ff8f6b');
    this.mat = this.cone.material as THREE.MeshBasicMaterial;
    this.holder.add(this.cone);
    this.period = def.cycle.reduce((a, c) => a + c[0], 0) || 1;
  }

  /** where the routine has the head turned at game time t (smooth turns) */
  yawAt(t: number): number {
    const c = this.def.cycle;
    let u = ((t % this.period) + this.period) % this.period;
    for (let i = 0; i < c.length; i++) {
      if (u < c[i][0]) {
        const prev = c[(i + c.length - 1) % c.length][1];
        const k = Math.min(1, u / 0.45);
        return prev + (c[i][1] - prev) * (k * k * (3 - 2 * k));
      }
      u -= c[i][0];
    }
    return c[0][1];
  }

  update(game: Game, dt: number) {
    const a = this.actor;
    if (this.stare && game.time > this.stare.until) { this.stare = null; this.lured = false; }
    if (this.stare) {
      let y = Math.atan2(this.stare.x - a.pos.x, this.stare.z - a.pos.z) - a.group.rotation.y;
      y = Math.atan2(Math.sin(y), Math.cos(y));
      a.lookYaw += (y - a.lookYaw) * Math.min(1, dt * 6);
    } else if (game.phase === 'ready' || game.phase === 'intro') a.lookYaw = this.lured ? 0 : this.yawAt(game.time);
    const pt = this.def.patrol;
    if (pt && game.phase === 'ready' && !game.caught && !a.busy() && !this.lured) {
      const [x, z, w, hide] = pt[this.leg % pt.length];
      this.leg++;
      a.group.visible = true;
      a.walkTo(x, z);
      if (hide) a.then(() => { a.group.visible = false; });
      a.wait(w);
      if (hide) a.then(() => { a.group.visible = true; });
    }
    const yaw = a.group.rotation.y + a.lookYaw;
    this.holder.position.set(a.pos.x, a.pos.y + 0.05, a.pos.z);
    this.holder.rotation.y = yaw + Math.PI;
    this.holder.visible = a.group.visible && game.phase !== 'ending' && game.phase !== 'done';
    this.alertT = Math.max(0, this.alertT - dt);
    const k = Math.min(1, game.suspicion / 100);
    this.mat.color.setRGB(1, 0.62 - k * 0.4, 0.42 - k * 0.3);
    this.mat.opacity = 0.16 + k * 0.14 + (this.alertT > 0 ? 0.2 * Math.abs(Math.sin(this.alertT * 18)) : 0);
  }

  /** is pos inside the gaze (and not hidden behind something solid)? */
  sees(game: Game, pos: THREE.Vector3): boolean {
    const a = this.actor;
    if (!a.group.visible) return false;
    const eye = _v.set(a.pos.x, a.pos.y + a.height * 0.9, a.pos.z);
    const dx = pos.x - eye.x, dz = pos.z - eye.z;
    const d = Math.hypot(dx, dz);
    if (d > this.def.range) return false;
    const f = a.facing(new THREE.Vector3());
    const cos = (dx * f.x + dz * f.z) / Math.max(1e-4, d);
    if (d > 0.8 && cos < Math.cos(this.def.half)) return false;
    // walls, hedges and parked cars block the view
    const dir = new THREE.Vector3(pos.x - eye.x, pos.y + 0.3 - eye.y, pos.z - eye.z);
    const len = dir.length();
    if (len < 0.5) return true;
    dir.multiplyScalar(1 / len);
    // start a little in front of the face (people lean out of windows)
    const ray = new game.R.Ray({ x: eye.x + dir.x * 0.7, y: eye.y + dir.y * 0.7, z: eye.z + dir.z * 0.7 }, { x: dir.x, y: dir.y, z: dir.z });
    const hit = game.world.castRay(ray, len - 1.1, true, undefined, groups(G.PROP, G.STATIC));
    return !hit;
  }

  alert() { this.alertT = 0.8; }

  /**
   * A meow from over there: walk up to (x, z), stare at it for `dur` seconds,
   * then go back (patrollers just carry on with their round). Too far = no reaction.
   */
  lure(game: Game, x: number, z: number, dur: number): boolean {
    const a = this.actor;
    if (game.caught || Math.hypot(x - a.pos.x, z - a.pos.z) > 16) return false;
    if (this.def.stays) { this.stare = { x, z, until: game.time + dur }; this.lured = true; return true; }
    if (!this.def.patrol && !this.home) this.home = { x: a.pos.x, z: a.pos.z, yaw: a.group.rotation.y };
    a.clear();
    a.group.visible = true;
    const d = Math.hypot(x - a.pos.x, z - a.pos.z);
    const k = d > 1.6 ? 1 - 1.3 / d : 0;
    this.lured = true;
    a.walkTo(a.pos.x + (x - a.pos.x) * k, a.pos.z + (z - a.pos.z) * k).turnTo(x, z).do('look', dur);
    const h = this.home;
    if (h) a.walkTo(h.x, h.z).turnTo(h.x + Math.sin(h.yaw), h.z + Math.cos(h.yaw));
    a.then(() => { this.lured = false; });
    return true;
  }
}
