import * as THREE from 'three';
import type { Theme } from '../../src/levels/rooms';
import type { CamState } from './view';
import type { Ctx } from './director';
import { smooth, clamp01, Chaser, v3, type V3 } from './camera';

export interface Cue { t: number; run(c: Ctx): void }
export type Cam = CamState & { shadow?: number };

export interface Shot {
  id: string;
  /** seconds of footage */
  dur: number;
  level?: string;
  theme?: Theme;
  cat?: string;
  skin?: string;
  acc?: string[];
  /** keep the game's red target markers visible */
  markers?: boolean;
  bg?: [string, string];
  vignette?: number;
  shake?: number;
  setup?(c: Ctx): void;
  cues?: Cue[];
  /** simulation speed (slow motion) over shot time */
  rate?(t: number): number;
  /** runs every 1/60 s simulation substep, after the game update */
  tick?(c: Ctx): void;
  cam(c: Ctx): Cam;
  under?(c: Ctx): void;
  post?(c: Ctx): void;
}

/** piecewise camera: pick a setup by time (hard cuts inside one simulation) */
export function cuts(list: { from: number; cam: (c: Ctx, local: number) => Cam }[]) {
  return (c: Ctx) => {
    let cur = list[0];
    for (const l of list) if (c.t >= l.from) cur = l;
    return cur.cam(c, c.t - cur.from);
  };
}

/** speed ramp: 1 → low → 1 around a moment */
export function ramp(center: number, low: number, inDur: number, hold: number, outDur: number) {
  return (t: number) => {
    const a = center - inDur, c2 = center + hold, d = c2 + outDur;
    if (t <= a || t >= d) return 1;
    if (t < center) return 1 + (low - 1) * smooth((t - a) / inDur);
    if (t < c2) return low;
    return low + (1 - low) * smooth((t - c2) / outDur);
  };
}

/** piecewise-linear rate curve from [time, rate] keys */
export function rates(keys: [number, number][]) {
  return (t: number) => {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 0; i < keys.length - 1; i++) {
      const [t0, r0] = keys[i], [t1, r1] = keys[i + 1];
      if (t < t1) return r0 + (r1 - r0) * smooth((t - t0) / (t1 - t0));
    }
    return keys[keys.length - 1][1];
  };
}

/** a speech bubble over the cat's head (trailer-authored line) */
export const say = (c: Ctx, text: string, dur = 2) => {
  const cat = c.g.cat;
  c.o.bubble(text, () => cat.headPos(), c.t, dur, 'cat');
};

/** the cat rig's private bits the trailer pokes for acting beats */
export const rig = (c: Ctx) => c.g.cat as unknown as {
  wantSquint: number; squint: number; sparkle: number; earsBack: number; act: string | null; actT: number; nextIdleAct: number;
  wantYaw: number; yaw: number; faceYaw: number; state: string; st: number; hop: number; pawR: THREE.Object3D; pawL: THREE.Object3D; head: THREE.Object3D;
  group: THREE.Group;
};

/** keep the cat from starting random idle acts during a shot */
export const noIdle = (c: Ctx) => { const r = rig(c); r.nextIdleAct = 99; };

/** a follow camera: chases a moving target with an offset */
export function follow(target: (c: Ctx) => THREE.Vector3, offset: V3, fov: number, stiff = 3, lookStiff = 6, shadow = 8) {
  const pc = new Chaser(stiff), lc = new Chaser(lookStiff);
  return (c: Ctx, local: number): Cam => {
    if (local < c.dt - 1e-6) { pc.reset(); lc.reset(); }
    const tg = target(c);
    const l = lc.update(tg, c.dt);
    const p = pc.update(tg.clone().add(v3(offset)), c.dt);
    return { pos: p.clone(), look: l.clone(), fov, shadow };
  };
}

export { clamp01, smooth };
