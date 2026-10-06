import * as THREE from 'three';
import type { Shot } from '../kit';
import { cuts, rig, noIdle, say, rates } from '../kit';
import { path } from '../camera';

/* ================================================================== */
/* ACT 1 — 1-1 living room: a peaceful afternoon, a suspicious stare, */
/* one little 툭 and the book domino that takes the vase with it.     */
/* ================================================================== */

const CAT_HOME = new THREE.Vector3(2.4, 0, 2.6);
const VASE = new THREE.Vector3(1.5, 2.25, 0.6);

export const A_living: Shot = {
  id: 'A_living',
  level: '1-1',
  cat: 'cheese',
  dur: 13.6,
  setup(c) {
    c.g.cat.faceYaw = 0.75;
    c.g.cat.reset(CAT_HOME);
    noIdle(c);
    c.s.muteBubbles = true;
  },
  // the domino runs a touch quicker, the vase's fall goes slow
  rate: rates([[0, 1], [8.0, 1], [8.4, 1.15], [9.0, 1.15], [9.25, 0.3], [9.8, 0.3], [10.2, 1]]),
  cues: [
    { t: 0.4, run: (c) => { rig(c).act = 'lick'; rig(c).actT = 0; } },
    // the stare: eyes on the vase (= on the lens)
    { t: 3.45, run: (c) => { c.g.cat.setAim(VASE); } },
    { t: 6.45, run: (c) => { c.g.cat.setAim(null); } },
    { t: 6.5, run: (c) => c.d.aimAndSwat('book', { near: [-1.05, 1.5, 0.55], dir: [1, 0], power: 0.5, at: 'top', aim: 0.85 }) },
    { t: 7.62, run: (c) => c.o.card('툭.', c.t, 1.0, { x: 0.27, y: 0.3, size: 130, rot: -0.08 }) },
    // reaction: back at its spot in front of the wreck, very pleased with itself
    { t: 10.9, run: (c) => { c.g.cat.faceYaw = 0.42; c.g.cat.reset(new THREE.Vector3(2.55, 0, 2.95)); noIdle(c); } },
    { t: 11.25, run: (c) => { say(c, '후훗…', 2.0); } },
  ],
  tick(c) {
    c.d.updateAim();
    const r = rig(c);
    // narrowed, scheming eyes during the stare; wide eyes on the zoom
    if (c.t > 3.6 && c.t < 5.5) r.wantSquint = 0.72;
    else if (c.t >= 5.5 && c.t < 6.5) r.wantSquint = 0;
    else if (c.t >= 11.0) r.wantSquint = 0.7;
  },
  cam: cuts([
    // calm establishing push-in on the diorama
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [15.0, 11.6, 17.0], look: [0.3, 1.3, -0.2], fov: 30 },
      { t: 3.4, pos: [12.6, 9.0, 14.2], look: [0.6, 1.3, 0.2], fov: 30 },
    ], 'out')(l), shadow: 9 }) },
    // the look: from the vase's point of view, the cat stares up at us
    { from: 3.4, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [1.6, 1.98, 0.86], look: [2.4, 0.78, 2.62], fov: 34 },
      { t: 2.2, pos: [1.74, 1.84, 1.1], look: [2.4, 0.8, 2.62], fov: 29 },
    ], 'none')(l), shadow: 4 }) },
    // the target: snap zoom over the cat's shoulder onto the vase
    { from: 5.6, cam: (_c, l) => {
      const k = Math.min(1, l / 0.32), e = 1 - Math.pow(1 - k, 3);
      const fov = 30 - 11 * e;
      return { pos: new THREE.Vector3(2.75, 1.3, 3.25), look: new THREE.Vector3(1.52, 2.35 + 0.1 * e, 0.62), fov, shadow: 5 };
    } },
    // the swat: side-on to the book row so the domino reads, then down with the vase
    { from: 6.5, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [0.4, 3.2, 6.6], look: [0.2, 1.75, 0.5], fov: 32 },
      { t: 2.2, pos: [0.9, 3.0, 6.4], look: [0.8, 1.6, 0.6], fov: 32 },
      { t: 4.2, pos: [1.6, 2.6, 6.2], look: [1.4, 0.9, 0.9], fov: 32 },
      { t: 7, pos: [1.9, 2.5, 6.3], look: [1.5, 0.8, 1.0], fov: 32 },
    ], 'none')(l), shadow: 6 }) },
    // smug cat, broken vase behind it
    { from: 10.9, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [4.7, 1.75, 7.6], look: [2.2, 0.85, 2.1], fov: 24 },
      { t: 3, pos: [4.5, 1.65, 7.2], look: [2.2, 0.85, 2.1], fov: 23 },
    ], 'none')(l), shadow: 5 }) },
  ]),
};
