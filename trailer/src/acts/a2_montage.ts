import * as THREE from 'three';
import type { Shot } from '../kit';
import { cuts, noIdle, say, rates, rig } from '../kit';
import { path } from '../camera';

/* ================================================================== */
/* ACT 2 — the montage: same paw, different choices, bigger accidents */
/* ================================================================== */

/* --- 2-1 tablecloth: yank hard (magician trick!) vs pull gently ---- */

const clothCam = (_c: unknown, l: number) => ({ ...path([
  { t: 0, pos: [4.1, 3.6, 10.4], look: [0.9, 1.75, 1.7], fov: 30 },
  { t: 6, pos: [3.6, 3.4, 9.6], look: [0.9, 1.7, 1.7], fov: 30 },
], 'none')(l), shadow: 6 });

export const B_yank: Shot = {
  id: 'B_yank',
  level: '2-1',
  cat: 'samsaek',
  dur: 4.2,
  setup(c) { noIdle(c); c.s.muteBubbles = true; c.o.chainVisible = false; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('cloth', { dir: [0, 1], power: 1, aim: 0.75 }) },
    { t: 0.12, run: (c) => c.o.card('세게?', c.t, 1.25, { x: 0.2, y: 0.2, size: 120, style: 'soft', rot: -0.05 }) },
    { t: 2.25, run: (c) => { c.g.cat.faceYaw = 0.35; say(c, '(고개 갸웃)', 1.8); } },
  ],
  tick(c) { c.d.updateAim(); },
  cam: (c) => clothCam(c, c.t),
};

export const B_gentle: Shot = {
  id: 'B_gentle',
  level: '2-1',
  cat: 'samsaek',
  dur: 6,
  setup(c) { noIdle(c); c.s.muteBubbles = true; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('cloth', { dir: [0, 1], power: 0.36, aim: 0.75 }) },
    { t: 0.12, run: (c) => c.o.card('살살?', c.t, 1.25, { x: 0.2, y: 0.2, size: 120, style: 'soft', rot: -0.05 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: (c) => clothCam(c, c.t),
};

/* --- 1-2 shaken soda: fizz… rocket across the room into the shelf --- */

export const C_soda: Shot = {
  id: 'C_soda',
  level: '1-2',
  cat: 'siam',
  dur: 8,
  setup(c) { noIdle(c); c.s.muteBubbles = true; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('soda', { near: [1.25, 1.5, 0.65], dir: [0.3, -1], power: 0.8, aim: 0.6 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: cuts([
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [-1.9, 2.5, 4.3], look: [1.6, 2.7, -1.6], fov: 42 },
      { t: 2.2, pos: [-1.5, 2.6, 3.7], look: [1.9, 3.0, -2.2], fov: 40 },
      { t: 3.6, pos: [-0.6, 2.9, 2.2], look: [2.3, 3.1, -2.9], fov: 40 },
      { t: 8, pos: [-0.4, 2.9, 1.9], look: [2.3, 3.0, -2.9], fov: 40 },
    ], 'none')(l), shadow: 7 }) },
  ]),
  rate: rates([[0, 1], [2.1, 1], [2.3, 0.4], [2.9, 0.4], [3.3, 1]]),
};

/* --- 5-1 block castle: pull one block from the base ---------------- */

export const D_castle: Shot = {
  id: 'D_castle',
  level: '5-1',
  cat: 'tux',
  dur: 8,
  setup(c) { noIdle(c); c.s.muteBubbles = true; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('block', { near: [1.0, 0.5, -1.6], dir: [1, 0], power: 0.6, aim: 0.6 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: cuts([
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [2.6, 1.1, 5.4], look: [0.5, 2.9, -1.6], fov: 40 },
      { t: 1.6, pos: [2.8, 1.15, 5.4], look: [0.7, 2.8, -1.6], fov: 40 },
      { t: 3.2, pos: [3.8, 1.5, 5.3], look: [2.5, 1.9, -1.6], fov: 42 },
      { t: 5.0, pos: [5.0, 1.7, 4.8], look: [3.9, 1.1, -1.5], fov: 42 },
      { t: 8, pos: [5.2, 1.8, 4.9], look: [3.9, 1.0, -1.5], fov: 42 },
    ], 'none')(l), shadow: 7 }) },
  ]),
  rate: rates([[0, 1], [1.3, 1], [1.6, 0.45], [3.4, 0.45], [3.9, 1]]),
};

/* --- 5-2 balloon party: one balloon nudged into the treasure shelf -- */

export const E_balloon: Shot = {
  id: 'E_balloon',
  level: '5-2',
  cat: 'persian',
  dur: 8,
  setup(c) { noIdle(c); c.s.muteBubbles = true; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('balloon', { near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, aim: 0.6 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: cuts([
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [0.3, 4.1, 9.4], look: [0.6, 3.3, -1.4], fov: 40 },
      { t: 8, pos: [0.9, 3.7, 8.6], look: [0.9, 2.7, -1.4], fov: 40 },
    ], 'none')(l), shadow: 7 }) },
  ]),
};

/* --- 6-3 the aquarium: one push and the hallway becomes a pool ----- */

export const F_flood: Shot = {
  id: 'F_flood',
  level: '6-3',
  cat: 'kkamang',
  dur: 8,
  setup(c) { noIdle(c); c.s.muteBubbles = true; },
  cues: [
    { t: 0.1, run: (c) => c.d.aimAndSwat('aquarium', { dir: [0, 1], power: 0.85, at: 'top', aim: 0.6 }) },
  ],
  tick(c) { c.d.updateAim(); },
  cam: cuts([
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [9.3, 3.1, 6.2], look: [7.1, 1.7, 0.8], fov: 38 },
      { t: 1.5, pos: [9.2, 3.2, 6.3], look: [7.0, 1.6, 0.8], fov: 38 },
      { t: 4.5, pos: [8.6, 7.6, 11.8], look: [4.8, 0.4, 0.9], fov: 38 },
      { t: 8, pos: [8.4, 7.8, 12.0], look: [4.6, 0.4, 0.9], fov: 38 },
    ], 'none')(l), shadow: 8 }) },
  ]),
};

void THREE; void rates; void rig;
