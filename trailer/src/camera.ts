import * as THREE from 'three';
import type { CamState } from './view';

export type V3 = [number, number, number];
export const v3 = (a: V3 | THREE.Vector3) => (a instanceof THREE.Vector3 ? a.clone() : new THREE.Vector3(a[0], a[1], a[2]));

export const smooth = (t: number) => t * t * (3 - 2 * t);
export const smoother = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

export interface Key { t: number; pos: V3; look: V3; fov?: number; roll?: number }

function catmull(p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, out: THREE.Vector3) {
  const u2 = u * u, u3 = u2 * u;
  out.set(0, 0, 0)
    .addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u)
    .addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
    .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u)
    .addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
  return out;
}

/**
 * Smooth camera path through keyframes (Catmull-Rom for position and
 * look-at). `ease` shapes the global progress so the move starts and
 * lands softly; inner keys are passed through without stopping.
 */
export function path(keys: Key[], ease: 'none' | 'inout' | 'out' | 'in' = 'inout') {
  const P = keys.map((k) => v3(k.pos)), L = keys.map((k) => v3(k.look));
  const t0 = keys[0].t, t1 = keys[keys.length - 1].t;
  const tmpP = new THREE.Vector3(), tmpL = new THREE.Vector3();
  return (t: number): CamState => {
    let g = clamp01((t - t0) / Math.max(1e-6, t1 - t0));
    g = ease === 'inout' ? smooth(g) : ease === 'out' ? 1 - (1 - g) * (1 - g) : ease === 'in' ? g * g : g;
    const tt = t0 + g * (t1 - t0);
    let i = 0;
    while (i < keys.length - 2 && tt > keys[i + 1].t) i++;
    const a = keys[i], b = keys[Math.min(keys.length - 1, i + 1)];
    const u = clamp01((tt - a.t) / Math.max(1e-6, b.t - a.t));
    const i0 = Math.max(0, i - 1), i2 = Math.min(keys.length - 1, i + 1), i3 = Math.min(keys.length - 1, i + 2);
    catmull(P[i0], P[i], P[i2], P[i3], u, tmpP);
    catmull(L[i0], L[i], L[i2], L[i3], u, tmpL);
    const fov = (a.fov ?? 30) + ((b.fov ?? a.fov ?? 30) - (a.fov ?? 30)) * u;
    const roll = (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * u;
    return { pos: tmpP.clone(), look: tmpL.clone(), fov, roll };
  };
}

/** a damped point that chases a moving target (for follow cams) */
export class Chaser {
  readonly p = new THREE.Vector3();
  private init = false;
  constructor(private stiffness = 4) {}
  update(target: THREE.Vector3, dt: number) {
    if (!this.init) { this.p.copy(target); this.init = true; return this.p; }
    this.p.lerp(target, 1 - Math.exp(-this.stiffness * dt));
    return this.p;
  }
  reset() { this.init = false; }
}

/** blend two camera states */
export function mix(a: CamState, b: CamState, k: number): CamState {
  return { pos: a.pos.clone().lerp(b.pos, k), look: a.look.clone().lerp(b.look, k), fov: a.fov + (b.fov - a.fov) * k, roll: (a.roll ?? 0) + ((b.roll ?? 0) - (a.roll ?? 0)) * k };
}

/** orbit a point: yaw in radians (0 = +z), pitch above the horizon, distance */
export function orbit(center: V3 | THREE.Vector3, yaw: number, pitch: number, dist: number, fov = 30, lookOffset: V3 = [0, 0, 0]): CamState {
  const c = v3(center);
  const pos = new THREE.Vector3(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).multiplyScalar(dist).add(c);
  return { pos, look: c.clone().add(v3(lookOffset)), fov };
}
