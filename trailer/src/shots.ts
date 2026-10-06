import * as THREE from 'three';
import type { Theme } from '../../src/levels/rooms';
import type { CamState } from './view';
import type { Ctx } from './director';
import { SCOUTS } from './scouts';
import { path, orbit, mix, smooth, clamp01, Chaser, v3, type V3 } from './camera';

export interface Cue { t: number; run(c: Ctx): void }

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
  tick?(c: Ctx): void;
  cam(c: Ctx): CamState & { shadow?: number };
  under?(c: Ctx): void;
  post?(c: Ctx): void;
}

/* ------------------------------ small helpers ------------------------------ */

/** piecewise camera: pick a setup by time (hard cuts inside one simulation) */
function cuts(list: { from: number; cam: (c: Ctx, local: number) => CamState & { shadow?: number } }[]) {
  return (c: Ctx) => {
    let cur = list[0];
    for (const l of list) if (c.t >= l.from) cur = l;
    return cur.cam(c, c.t - cur.from);
  };
}

/** speed ramp: 1 → low → 1 around a moment */
function ramp(center: number, low: number, inDur: number, hold: number, outDur: number) {
  return (t: number) => {
    const a = center - inDur, b = center, c2 = center + hold, d = c2 + outDur;
    if (t <= a || t >= d) return 1;
    if (t < b) return 1 + (low - 1) * smooth((t - a) / inDur);
    if (t < c2) return low;
    return low + (1 - low) * smooth((t - c2) / outDur);
  };
}

const say = (c: Ctx, text: string, dur = 2) => {
  const cat = c.g.cat;
  c.o.bubble(text, () => cat.headPos(), c.t, dur, 'cat');
};

/* ================================================================== */
/* A — 1-1 living room: peaceful afternoon → suspicious cat → 툭.      */
/* ================================================================== */

const A_living: Shot = {
  id: 'A_living',
  level: '1-1',
  cat: 'cheese',
  dur: 15,
  setup(c) {
    c.g.cat.faceYaw = 0.9;
    c.g.cat.reset(new THREE.Vector3(2.4, 0, 2.6));
    c.s.wide = path([
      { t: 0, pos: [15.5, 12.5, 17.5], look: [0.2, 1.4, -0.3], fov: 30 },
      { t: 6, pos: [11.5, 8.0, 13.0], look: [0.6, 1.3, 0.2], fov: 30 },
    ], 'out');
  },
  cues: [
    { t: 6.6, run: (c) => { c.g.cat.setAim(c.d.find('vase').center(new THREE.Vector3())); } },
    { t: 9.9, run: (c) => { c.g.cat.setAim(null); } },
    { t: 10.0, run: (c) => c.d.aimAndSwat('book', { near: [-1.05, 1.5, 0.55], dir: [1, 0], power: 0.5, at: 'top', aim: 0.9 }) },
    { t: 11.05, run: (c) => c.o.card('툭.', c.t, 1.3, { x: 0.5, y: 0.2, size: 170 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: cuts([
    // calm establishing push-in
    { from: 0, cam: (c) => ({ ...(c.s.wide as (t: number) => CamState)(c.t), shadow: 9 }) },
    // the look: low close-up on the cat, eyes sliding to the vase
    { from: 6.0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [4.3, 1.05, 5.0], look: [2.35, 0.95, 2.55], fov: 26 },
      { t: 4, pos: [3.85, 1.0, 4.35], look: [2.3, 0.92, 2.5], fov: 24 },
    ], 'none')(l), shadow: 5 }) },
    // the swat: side view along the book row so the domino reads
    { from: 9.8, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [0.6, 3.4, 7.2], look: [0.3, 1.6, 0.5], fov: 34 },
      { t: 5.2, pos: [1.6, 3.0, 6.4], look: [1.2, 1.0, 0.7], fov: 34 },
    ], 'inout')(l), shadow: 7 }) },
  ]),
};

/* ------------------------------------------------------------------ */

export const SHOTS: Shot[] = [A_living, ...SCOUTS];
export { ramp, mix, orbit, smooth, clamp01, Chaser, v3 };
export type { V3 };
