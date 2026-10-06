import * as THREE from 'three';
import type { Shot } from '../kit';
import { cuts, noIdle, say, rates, rig, follow } from '../kit';
import { path } from '../camera';
import type { Ctx } from '../director';

/* ================================================================== */
/* ACT 3 — 6-5 the whole house: domino → soda rocket → kitchen shelf, */
/* coat rack → grand clock → aquarium flood, lamp → TV. Then the door */
/* clicks: the owner is home, and the cat knows nothing.              */
/* ================================================================== */

const T = {
  stare: 3.6,
  domino: 4.55,
  rack: 10.9,
  lamp: 15.35,
  overview: 17.1,
  door: 19.7,
  cat: 22.75,
  end: 28.4,
};

const pos = (c: Ctx, kind: string, near?: [number, number, number]) => {
  try { return c.d.where(c.d.find(kind, near)); } catch { return null; }
};

export const G_finale: Shot = {
  id: 'G_finale',
  level: '6-5',
  cat: 'cheese',
  dur: T.end,
  setup(c) {
    noIdle(c);
    c.s.muteBubbles = true;
    c.g.cat.faceYaw = 0.4;
    c.s.soda = c.d.find('soda');
  },
  rate: rates([
    [0, 1],
    // the rocket lands on the china shelf: slow
    [9.0, 1], [9.25, 0.35], [10.0, 0.35], [10.3, 1],
    // the grand clock goes over
    [12.0, 1], [12.25, 0.4], [13.1, 0.4], [13.4, 1],
  ]),
  cues: [
    // the plan: the cat sits at the head of the domino snake
    { t: T.stare - 0.05, run: (c) => { c.g.cat.faceYaw = Math.atan2(0.74, -0.67); c.g.cat.reset(new THREE.Vector3(0.45, 0, 7.4)); noIdle(c); } },
    { t: T.stare + 0.25, run: (c) => { c.g.cat.setAim(new THREE.Vector3(2.4, 0.3, 5.7)); } },
    { t: T.domino - 0.05, run: (c) => { c.g.cat.setAim(null); } },
    { t: T.domino, run: (c) => { c.d.aimAndSwat('domino', { near: [1.2, 0.3, 6.7], dir: [0.74, -0.67], power: 0.4, at: 'top', aim: 0.55 }); c.o.damage.visible = true; } },
    // hallway: the coat rack
    { t: T.rack - 0.2, run: (c) => { c.g.cat.faceYaw = -Math.PI / 2; c.g.cat.reset(new THREE.Vector3(1.7, 0, 0.35)); noIdle(c); } },
    { t: T.rack, run: (c) => c.d.aimAndSwat('coatRack', { dir: [-1, 0], power: 0.8, at: 'top', aim: 0.45 }) },
    // living room: the floor lamp over the new TV
    { t: T.lamp - 0.2, run: (c) => { c.g.cat.faceYaw = Math.atan2(-0.69, -0.73); c.g.cat.reset(new THREE.Vector3(-0.35, 0, 7.0)); noIdle(c); } },
    { t: T.lamp, run: (c) => c.d.aimAndSwat('lamp', { dir: [-0.69, -0.73], power: 0.8, at: 'top', aim: 0.45 }) },
    // the owner is home
    { t: T.door - 0.3, run: (c) => { c.o.damage.visible = false; c.o.chainVisible = false; } },
    { t: T.door, run: (c) => { c.g.owner!.discover(c.g, true); c.s.muteBubbles = false; } },
    // …and the cat has no idea what happened here
    { t: T.cat - 0.1, run: (c) => {
      c.s.muteBubbles = true;
      c.g.cat.faceYaw = 1.34;
      c.g.cat.reset(new THREE.Vector3(0.9, 0, 0.6));
      c.g.cat.ending(c.g, true);
    } },
    { t: T.cat + 0.15, run: (c) => say(c, '…', 1.1) },
    { t: T.cat + 1.4, run: (c) => say(c, '냥? (난 아무것도 몰라요)', 2.8) },
  ],
  tick(c) {
    c.d.updateAim();
    const r = rig(c);
    if (c.t > T.stare + 0.3 && c.t < T.domino) r.wantSquint = 0.6;
  },
  cam: cuts([
    // the whole house, peaceful, from high above
    { from: 0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [5.5, 25, 17], look: [0, 0, 0.3], fov: 36 },
      { t: T.stare, pos: [8.5, 15.5, 15.5], look: [0.2, 0.4, 0.4], fov: 36 },
    ], 'out')(l), shadow: 12 }) },
    // the plan: profile of the cat, the domino snake stretching ahead
    { from: T.stare, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [2.6, 0.95, 7.2], look: [0.6, 0.72, 7.25], fov: 40 },
      { t: 1.0, pos: [2.5, 0.92, 7.2], look: [0.6, 0.72, 7.25], fov: 36 },
    ], 'none')(l), shadow: 4 }) },
    // the paw: over the domino line as the finger draws the arrow
    { from: T.domino, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [1.2, 2.7, 3.4], look: [1.4, 0.3, 6.5], fov: 42 },
      { t: 1.0, pos: [1.4, 2.5, 3.4], look: [1.8, 0.3, 6.1], fov: 42 },
    ], 'none')(l), shadow: 5 }) },
    // the wave: track the domino front down the snake
    { from: T.domino + 1.0, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [0.2, 1.4, 4.0], look: [2.0, 0.3, 6.0], fov: 40 },
      { t: 0.9, pos: [1.9, 1.35, 3.6], look: [3.4, 0.3, 5.2], fov: 40 },
      { t: 1.7, pos: [3.2, 1.4, 2.3], look: [4.9, 0.4, 3.9], fov: 40 },
      { t: 2.4, pos: [3.2, 1.2, 1.0], look: [4.5, 0.5, 2.6], fov: 38 },
    ], 'none')(l), shadow: 5 }) },
    // the rocket: chase the can over the walls
    { from: 7.62, cam: follow((c) => c.d.where(c.s.soda as never), [2.6, 2.4, 3.3], 46, 5, 9, 9) },
    // the china shelf
    { from: 9.15, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [-1.2, 4.6, -1.6], look: [-3.6, 4.6, -6.9], fov: 40 },
      { t: 1.7, pos: [-1.4, 4.1, -2.0], look: [-3.8, 3.4, -6.7], fov: 40 },
    ], 'none')(l), shadow: 6 }) },
    // hallway: the paw on the coat rack
    { from: T.rack - 0.15, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [2.6, 3.0, 5.2], look: [0.2, 2.6, -0.2], fov: 38 },
      { t: 0.9, pos: [2.3, 3.0, 5.0], look: [-0.3, 2.4, -0.2], fov: 38 },
    ], 'none')(l), shadow: 6 }) },
    // the big topple line along the hallway, seen from above the kitchen wall:
    // rack → clock → aquarium → flood
    { from: T.rack + 0.75, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [-0.6, 6.6, -5.4], look: [-1.2, 1.4, 0.2], fov: 42 },
      { t: 1.5, pos: [-2.2, 6.6, -5.4], look: [-2.8, 1.2, 0.2], fov: 42 },
      { t: 3.0, pos: [-3.6, 7.0, -5.6], look: [-4.3, 0.8, 0.3], fov: 44 },
      { t: 4.6, pos: [-3.4, 7.6, -6.0], look: [-3.6, 0.4, 0.4], fov: 48 },
    ], 'none')(l), shadow: 7 }) },
    // living room: the lamp
    { from: T.lamp - 0.15, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [-4.2, 3.8, 10.2], look: [-1.6, 2.1, 5.0], fov: 40 },
      { t: 1.8, pos: [-4.4, 3.6, 9.8], look: [-2.2, 1.9, 4.3], fov: 40 },
    ], 'none')(l), shadow: 6 }) },
    // the whole house in ruins
    { from: T.overview, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [5.5, 10.5, 14.0], look: [-1.5, 0.8, 0.5], fov: 38 },
      { t: 3.1, pos: [7.5, 17.0, 17.5], look: [-0.5, 0.2, 0.2], fov: 38 },
    ], 'out')(l), shadow: 12 }) },
    // click. the owner at the door
    { from: T.door, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [-3.3, 4.9, 1.0], look: [-6.2, 2.3, 0.0], fov: 38 },
      { t: 3.2, pos: [-3.5, 4.8, 0.9], look: [-6.2, 2.4, 0.0], fov: 35 },
    ], 'none')(l), shadow: 6 }) },
    // reverse: the culprit
    { from: T.cat, cam: (_c, l) => ({ ...path([
      { t: 0, pos: [3.55, 1.32, 1.22], look: [-1.0, 1.42, 0.05], fov: 37 },
      { t: 5, pos: [3.35, 1.3, 1.18], look: [-1.0, 1.42, 0.05], fov: 34 },
    ], 'none')(l), shadow: 5 }) },
  ]),
};

void pos;
