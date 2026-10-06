import * as THREE from 'three';
import { M, box, cone, cyl, mesh, sphere, torus, B } from '../render/kit';
import type { Builder } from './Builder';
import { buildHouse, cabinet, clockOn, doorOn, posterOn, rug, sofa, table, windowOn, block, type HouseInfo, type RoomDef } from './house';

/* ------------------------------------------------------------------ */
/* Furnished rooms. Each "furnish" function works in room-local         */
/* coordinates around (ox, oz) so a room can stand alone or be one part */
/* of a bigger connected house.                                         */
/* ------------------------------------------------------------------ */

export type Theme = 'living' | 'kitchen' | 'bathroom' | 'playroom' | 'bedroom' | 'house';

export interface RoomStyle {
  bg: [string, string];
  hemi: [number, number, number];
  sun: [number, number, [number, number, number]];
}

export const THEME_STYLE: Record<Theme, RoomStyle> = {
  living: { bg: ['#ffe2b8', '#ffb3a7'], hemi: [0xfff4e6, 0x9b7fb8, 1.45], sun: [0xfff0dc, 1.9, [-5, 16, 11]] },
  kitchen: { bg: ['#d7f5e9', '#9fd8cb'], hemi: [0xfffaf0, 0x7f9fb8, 1.5], sun: [0xfff6e0, 1.8, [-6, 16, 10]] },
  bathroom: { bg: ['#d9f2ff', '#8fc3e6'], hemi: [0xf4fbff, 0x7f9fc8, 1.55], sun: [0xffffff, 1.7, [-4, 16, 9]] },
  playroom: { bg: ['#fff3c4', '#ffb8d1'], hemi: [0xfff8ea, 0xb08fc8, 1.5], sun: [0xfff2d6, 1.85, [-6, 16, 12]] },
  bedroom: { bg: ['#4b3f8f', '#1f1b4a'], hemi: [0xc9c4ff, 0x4a3a7a, 1.15], sun: [0xffd9a0, 1.35, [6, 14, 10]] },
  house: { bg: ['#ffe9c7', '#f7a8a0'], hemi: [0xfff4e6, 0x9b7fb8, 1.45], sun: [0xfff0dc, 1.85, [-8, 20, 14]] },
};

/** standard single-room footprint */
export const ROOM_W = 8, ROOM_D = 7.5;

export function rect(id: string, name: string, cx: number, cz: number, w: number, d: number, floor: RoomDef['floor'], wall: RoomDef['wall']): RoomDef {
  return { id, name, x0: cx - w / 2, x1: cx + w / 2, z0: cz - d / 2, z1: cz + d / 2, floor, wall };
}

/* ============================== LIVING ============================== */

export const LIVING = {
  sofaSeat: 1.36,
  sofa: { x: -1.3, z: -2.9 },
  tvStand: { x: 2.35, z: -3.2, top: 1.25, w: 2.8, d: 1.0 },
  coffee: { x: 0.2, z: 0.3, top: 1.25, w: 2.8, d: 1.6 },
  doorZ: 2.1,
};

export function furnishLiving(b: Builder, ox = 0, oz = 0, o: { coffee?: boolean; tvStand?: boolean; sofa?: boolean; backWall?: boolean; leftWall?: boolean } = {}) {
  const L = LIVING;
  if (o.backWall !== false) {
    windowOn(b, { z: oz - ROOM_D / 2 }, ox - 1.3, 4.3, 2.4, 2.2, false, '#ff9f87');
    clockOn(b, { z: oz - ROOM_D / 2 }, ox + 2.6, 5.3);
  }
  if (o.leftWall !== false) posterOn(b, { x: ox - ROOM_W / 2 }, oz - 1.2, 4.2, 1.3, 1.7, ['#fff1c1', '#ff7aa8', '#4f86c6']);
  rug(b, ox + 0.3, oz + 0.5, 5.0, 3.4, ['#ffcf5c', '#ff8c6b', '#ffffff']);
  if (o.sofa !== false) sofa(b, ox + L.sofa.x, oz + L.sofa.z, 0, '#ff8c6b');
  if (o.tvStand !== false) cabinet(b, ox + L.tvStand.x, oz + L.tvStand.z, L.tvStand.w, L.tvStand.d, L.tvStand.top, '#f4efe4', '#b9825a', 1);
  if (o.coffee !== false) table(b, ox + L.coffee.x, oz + L.coffee.z, L.coffee.w, L.coffee.d, L.coffee.top, '#b9825a', '#8e5f3e');
}

export function livingRoom(b: Builder, o: { coffee?: boolean; tvStand?: boolean; sofa?: boolean } = {}): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('living', '거실', 0, 0, ROOM_W, ROOM_D, 'wood', 'mint')], base: '#8e6a8f' });
  furnishLiving(b, 0, 0, o);
  doorOn(b, { x: -ROOM_W / 2 }, LIVING.doorZ, '#ef8a5b');
  b.ownerAtDoor(-ROOM_W / 2 + 0.9, 0, LIVING.doorZ, Math.PI / 2);
  return info;
}

/* ============================== KITCHEN ============================== */

export const KITCHEN = {
  counter: { x0: -1.95, x1: 4.0, z: -3.0, d: 1.5, top: 2.6 },
  shelf: { x0: -0.4, x1: 3.6, y: 5.0, z: -3.4, d: 0.7 },
  fridge: { x: -3.0, z: -2.85, w: 1.9, d: 1.7, h: 5.8 },
  table: { x: 0.9, z: 1.2, w: 3.8, d: 2.2, top: 2.3 },
  doorZ: 2.4,
};

export function furnishKitchen(b: Builder, ox = 0, oz = 0, o: { table?: boolean; shelf?: boolean; fridge?: boolean; backWall?: boolean; leftWall?: boolean } = {}) {
  const K = KITCHEN;
  const cw = K.counter.x1 - K.counter.x0, cx = ox + (K.counter.x0 + K.counter.x1) / 2;
  const cg = new THREE.Group();
  cg.add(mesh(box(cw, K.counter.top - 0.14, K.counter.d, 0.04), M('#7fc8b8'), { pos: [0, (K.counter.top - 0.14) / 2, 0] }));
  cg.add(mesh(box(cw + 0.1, 0.14, K.counter.d + 0.1, 0.03), M('#fdfbf5'), { pos: [0, K.counter.top - 0.07, 0] }));
  for (let i = 0; i < 4; i++) {
    const dx = -cw / 2 + (i + 0.5) * (cw / 4);
    cg.add(mesh(box(cw / 4 - 0.15, K.counter.top - 0.6, 0.04, 0.02), M('#8fd3c4'), { pos: [dx, (K.counter.top - 0.14) / 2, K.counter.d / 2 + 0.01] }));
    cg.add(mesh(box(0.06, 0.4, 0.06, 0.02), M('#3a3d4f'), { pos: [dx + 0.5, K.counter.top - 0.6, K.counter.d / 2 + 0.05], shadow: false }));
  }
  cg.add(mesh(box(1.4, 0.02, 0.85, 0), M('#9aa6b8'), { pos: [-1.5, K.counter.top + 0.005, 0.05], shadow: false }));
  cg.add(mesh(cyl(0.06, 0.06, 0.7, 6), M('#c9ccd8'), { pos: [-1.5, K.counter.top + 0.35, -0.5] }));
  cg.add(mesh(cyl(0.05, 0.05, 0.5, 6), M('#c9ccd8'), { pos: [-1.5, K.counter.top + 0.68, -0.3], rot: [Math.PI / 2, 0, 0] }));
  for (const dx of [1.5, 2.4]) cg.add(mesh(cyl(0.3, 0.3, 0.02, 12), M('#3a3d4f'), { pos: [dx, K.counter.top + 0.01, 0.1], shadow: false }));
  b.solid(cg, [
    { shape: 'box', hx: cw / 2 + 0.05, hy: K.counter.top / 2, hz: K.counter.d / 2 + 0.05, at: [0, K.counter.top / 2, 0] },
    { shape: 'cyl', hh: 0.35, r: 0.08, at: [-1.5, K.counter.top + 0.35, -0.5] },
  ], [cx, 0, oz + K.counter.z]);
  if (o.shelf !== false) {
    const sw = K.shelf.x1 - K.shelf.x0, sx = ox + (K.shelf.x0 + K.shelf.x1) / 2;
    const sg = new THREE.Group();
    sg.add(mesh(box(sw, 0.14, K.shelf.d, 0.03), M('#e0a46d'), { pos: [0, -0.07, 0] }));
    for (const dx of [-sw / 2 + 0.3, sw / 2 - 0.3]) sg.add(mesh(box(0.08, 0.4, 0.5, 0.02), M('#3a3d4f'), { pos: [dx, -0.3, -0.1] }));
    b.solid(sg, [{ shape: 'box', hx: sw / 2, hy: 0.07, hz: K.shelf.d / 2, at: [0, -0.07, 0] }], [sx, K.shelf.y, oz + K.shelf.z]);
  }
  if (o.fridge !== false) {
    const fg = new THREE.Group();
    fg.add(mesh(box(K.fridge.w, K.fridge.h, K.fridge.d, 0.2), M('#f4f6fb'), { pos: [0, K.fridge.h / 2, 0] }));
    fg.add(mesh(box(K.fridge.w - 0.1, 0.04, 0.05, 0), M('#c9ccd8'), { pos: [0, K.fridge.h * 0.62, K.fridge.d / 2 + 0.01], shadow: false }));
    for (const y of [K.fridge.h * 0.45, K.fridge.h * 0.75]) fg.add(mesh(box(0.1, 0.8, 0.12, 0.03), M('#c9ccd8'), { pos: [K.fridge.w / 2 - 0.25, y, K.fridge.d / 2 + 0.06] }));
    for (const [x, y, c] of [[-0.4, 4.6, '#ff6b6b'], [0.2, 4.2, '#ffd23f'], [-0.2, 2.6, '#5bb98c']] as const) fg.add(mesh(box(0.25, 0.25, 0.05, 0.03), M(c), { pos: [x, y, K.fridge.d / 2 + 0.03], shadow: false }));
    b.solid(fg, [{ shape: 'box', hx: K.fridge.w / 2, hy: K.fridge.h / 2, hz: K.fridge.d / 2, at: [0, K.fridge.h / 2, 0] }], [ox + K.fridge.x, 0, oz + K.fridge.z]);
  }
  if (o.backWall !== false) {
    windowOn(b, { z: oz - ROOM_D / 2 }, ox + 1.4, 3.95, 2.2, 1.4, false, '#ff9fc0');
    clockOn(b, { z: oz - ROOM_D / 2 }, ox - 1.0, 6.0);
  }
  if (o.leftWall !== false) posterOn(b, { x: ox - ROOM_W / 2 }, oz + 0.4, 4.4, 1.1, 1.4, ['#ffffff', '#e8434b', '#5bb98c']);
  if (o.table !== false) table(b, ox + K.table.x, oz + K.table.z, K.table.w, K.table.d, K.table.top, '#f4efe4', '#b9825a');
}

export function kitchen(b: Builder, o: { table?: boolean; shelf?: boolean } = {}): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('kitchen', '주방', 0, 0, ROOM_W, ROOM_D, 'checker', 'butter')], base: '#5c7aa6' });
  furnishKitchen(b, 0, 0, o);
  doorOn(b, { x: -ROOM_W / 2 }, KITCHEN.doorZ, '#7fb8d8');
  b.ownerAtDoor(-ROOM_W / 2 + 0.9, 0, KITCHEN.doorZ, Math.PI / 2);
  return info;
}

/* ============================== BEDROOM ============================== */

export const BEDROOM = {
  bed: { x: -2.25, z: -1.65, w: 3.4, l: 4.2, top: 1.25 },
  night: { x: 0.25, z: -3.2, top: 1.75 },
  desk: { x: 2.45, z: -3.0, w: 3.0, d: 1.5, top: 2.35 },
  doorZ: 2.6,
};

export function bedFrame(b: Builder, x: number, z: number, w: number, l: number, top: number, colors: { frame: string; sheet: string; pillow: string }, headboard = true) {
  const bg = new THREE.Group();
  bg.add(mesh(box(w, top - 0.55, l, 0.1), M(colors.frame), { pos: [0, (top - 0.55) / 2, 0] }));
  bg.add(mesh(box(w - 0.1, 0.55, l - 0.1, 0.2), M(colors.sheet), { pos: [0, top - 0.27, 0] }));
  if (headboard) bg.add(mesh(box(w + 0.2, top + 1.65, 0.3, 0.12), M(colors.frame), { pos: [0, (top + 1.65) / 2, -l / 2 - 0.1] }));
  bg.add(mesh(box(w - 0.8, 0.35, 0.9, 0.16), M(colors.pillow), { pos: [0, top + 0.15, -l / 2 + 0.6] }));
  const cols = [{ shape: 'box' as const, hx: w / 2, hy: top / 2, hz: l / 2, at: [0, top / 2, 0] as [number, number, number], restitution: 0.7, friction: 0.8 }];
  if (headboard) cols.push({ shape: 'box', hx: w / 2 + 0.1, hy: (top + 1.65) / 2, hz: 0.15, at: [0, (top + 1.65) / 2, -l / 2 - 0.1], restitution: 0.2, friction: 0.6 });
  b.solid(bg, cols, [x, 0, z]);
}

export function furnishBedroom(b: Builder, ox = 0, oz = 0, o: { owner?: 'sleep' | 'door' | 'none'; backWall?: boolean; leftWall?: boolean; desk?: boolean } = {}) {
  const Bd = BEDROOM.bed;
  bedFrame(b, ox + Bd.x, oz + Bd.z, Bd.w, Bd.l, Bd.top, { frame: '#b9825a', sheet: '#ffffff', pillow: '#fff4f8' });
  cabinet(b, ox + BEDROOM.night.x, oz + BEDROOM.night.z, 1.2, 1.0, BEDROOM.night.top, '#f2b134', '#ffffff', 2);
  if (o.desk !== false) {
    const De = BEDROOM.desk;
    table(b, ox + De.x, oz + De.z, De.w, De.d, De.top, '#f4efe4', '#3a3d4f');
  }
  if (o.backWall !== false) {
    windowOn(b, { z: oz - ROOM_D / 2 }, ox + 2.45, 4.55, 2.3, 1.9, true, '#5b4aa8');
    posterOn(b, { z: oz - ROOM_D / 2 }, ox - 2.4, 4.7, 1.3, 0.9, ['#ffe3b0', '#ff7aa8', '#4f86c6']);
  }
  rug(b, ox + 0.3, oz + 1.3, 4.0, 2.8, ['#7ec4cf', '#ffffff', '#ffd23f']);
  const lamp = new THREE.PointLight(0xffc27a, 9, 9, 1.6);
  lamp.position.set(ox + 0.0, 3.0, oz - 3.0);
  b.deco(lamp);
  const lg = new THREE.Group();
  lg.add(mesh(cyl(0.12, 0.2, 0.5, 8), M('#ffffff'), { pos: [0, 0.25, 0] }));
  lg.add(mesh(cone(0.4, 0.5, 8), new THREE.MeshLambertMaterial({ color: '#ffe3b0', emissive: '#ffb35a', emissiveIntensity: 0.9, flatShading: true }), { pos: [0, 0.75, 0] }));
  lg.position.set(ox - 0.15, BEDROOM.night.top, oz - 3.45);
  b.deco(lg);
  b.solid(null, [{ shape: 'cyl', hh: 0.5, r: 0.38, at: [0, 0.5, 0] }], [ox - 0.15, BEDROOM.night.top, oz - 3.45]);
  if (o.owner === 'sleep' || o.owner === undefined) b.ownerAsleep(ox + Bd.x, 1.1, oz + Bd.z - 0.5, -Math.PI / 2);
}

export function bedroom(b: Builder, o: { owner?: 'sleep' | 'door' } = {}): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('bedroom', '침실', 0, 0, ROOM_W, ROOM_D, 'lilac', 'night')], base: '#3f3478' });
  furnishBedroom(b, 0, 0, { owner: o.owner === 'door' ? 'none' : 'sleep' });
  doorOn(b, { x: -ROOM_W / 2 }, BEDROOM.doorZ, '#b9b0ea');
  if (o.owner === 'door') b.ownerAtDoor(-ROOM_W / 2 + 0.9, 0, BEDROOM.doorZ, Math.PI / 2);
  return info;
}

/* ============================== BATHROOM ============================== */

export const BATH_W = 7.4, BATH_D = 6.6;
export const BATH = {
  tub: { x0: -3.6, x1: -0.5, z0: -3.25, z1: -1.65, rim: 1.25, water: 0.95 },
  toilet: { x: 2.75, z: -2.55, tankTop: 2.05, bowlTop: 1.05 },
  vanity: { x: 0.95, z: -2.8, w: 1.7, d: 0.95, top: 1.9 },
  shelf: { x: -2.05, y: 3.5, z: -3.0, w: 2.8 },
  doorZ: 2.0,
};

/** water the cat can dunk things into (tub, toilet, aquarium …) */
export function waterZone(b: Builder, x0: number, x1: number, z0: number, z1: number, y0: number, top: number, color = '#7fd4ff') {
  b.game.waterZones.push({ x0, x1, z0, z1, y0, top });
  const surf = mesh(box(x1 - x0, 0.04, z1 - z0, 0), new THREE.MeshLambertMaterial({ color, transparent: true, opacity: 0.72, emissive: '#2a7fb8', emissiveIntensity: 0.15 }), { pos: [(x0 + x1) / 2, top - 0.02, (z0 + z1) / 2], shadow: false });
  surf.userData.keep = true;
  b.deco(surf);
  return surf;
}

export function bathtub(b: Builder, x0: number, x1: number, z0: number, z1: number, rim: number, water: number) {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const wt = 0.22;
  const white = M('#ffffff'), side = M('#e8f4fb');
  g.add(mesh(box(w, 0.25, d, 0.05), side, { pos: [0, 0.125, 0] }));
  g.add(mesh(box(w, rim, wt, 0.06), white, { pos: [0, rim / 2, -d / 2 + wt / 2] }));
  g.add(mesh(box(w, rim, wt, 0.06), white, { pos: [0, rim / 2, d / 2 - wt / 2] }));
  g.add(mesh(box(wt, rim, d, 0.06), white, { pos: [-w / 2 + wt / 2, rim / 2, 0] }));
  g.add(mesh(box(wt, rim, d, 0.06), white, { pos: [w / 2 - wt / 2, rim / 2, 0] }));
  // feet + faucet
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(sphere(0.12, 6, 4), M('#ffd23f'), { pos: [sx * (w / 2 - 0.2), 0.06, sz * (d / 2 - 0.2)] }));
  g.add(mesh(cyl(0.06, 0.06, 0.5, 6), M('#c9ccd8'), { pos: [-w / 2 + 0.35, rim + 0.25, 0] }));
  g.add(mesh(cyl(0.05, 0.05, 0.4, 6), M('#c9ccd8'), { pos: [-w / 2 + 0.5, rim + 0.48, 0], rot: [0, 0, Math.PI / 2] }));
  const cols = [
    { shape: 'box' as const, hx: w / 2, hy: 0.125, hz: d / 2, at: [0, 0.125, 0] as [number, number, number] },
    { shape: 'box' as const, hx: w / 2, hy: rim / 2, hz: wt / 2, at: [0, rim / 2, -d / 2 + wt / 2] as [number, number, number] },
    { shape: 'box' as const, hx: w / 2, hy: rim / 2, hz: wt / 2, at: [0, rim / 2, d / 2 - wt / 2] as [number, number, number] },
    { shape: 'box' as const, hx: wt / 2, hy: rim / 2, hz: d / 2, at: [-w / 2 + wt / 2, rim / 2, 0] as [number, number, number] },
    { shape: 'box' as const, hx: wt / 2, hy: rim / 2, hz: d / 2, at: [w / 2 - wt / 2, rim / 2, 0] as [number, number, number] },
  ];
  b.solid(g, cols, [cx, 0, cz], 0, { friction: 0.5, restitution: 0.25 });
  // bubbles on the water
  const bub = new THREE.Group();
  for (let i = 0; i < 9; i++) bub.add(mesh(sphere(0.12 + (i % 3) * 0.05, 7, 5), B('#ffffff', 0.9), { pos: [Math.sin(i * 2.1) * (w / 2 - 0.4), water + 0.05, Math.cos(i * 1.3) * (d / 2 - 0.35)], shadow: false }));
  bub.position.set(cx, 0, cz);
  bub.userData.keep = true;
  b.deco(bub);
  waterZone(b, x0 + wt, x1 - wt, z0 + wt, z1 - wt, 0.25, water);
}

export function toilet(b: Builder, x: number, z: number) {
  const g = new THREE.Group();
  const wh = M('#ffffff');
  g.add(mesh(cyl(0.38, 0.32, 0.75, 12), wh, { pos: [0, 0.38, 0.15] }));
  g.add(mesh(torus(0.4, 0.09, 6, 14), wh, { pos: [0, 0.98, 0.25], rot: [Math.PI / 2, 0, 0], scale: [1, 1.25, 1] }));
  g.add(mesh(box(0.85, 1.0, 0.45, 0.08), wh, { pos: [0, 1.55, -0.45] }));
  g.add(mesh(box(0.9, 0.08, 0.5, 0.03), M('#e8f4fb'), { pos: [0, 2.06, -0.45] }));
  g.add(mesh(box(0.86, 0.75, 0.06, 0.04), M('#e8f4fb'), { pos: [0, 1.4, -0.12], rot: [-0.15, 0, 0] }));
  g.add(mesh(box(0.15, 0.06, 0.08, 0.02), M('#c9ccd8'), { pos: [0.3, 1.9, -0.2] }));
  b.solid(g, [
    { shape: 'cyl', hh: 0.38, r: 0.36, at: [0, 0.38, 0.15] },
    { shape: 'box', hx: 0.42, hy: 0.5, hz: 0.22, at: [0, 1.55, -0.45] },
    { shape: 'box', hx: 0.42, hy: 0.06, hz: 0.07, at: [0, 0.98, 0.72] },
    { shape: 'box', hx: 0.07, hy: 0.06, hz: 0.45, at: [-0.42, 0.98, 0.25] },
    { shape: 'box', hx: 0.07, hy: 0.06, hz: 0.45, at: [0.42, 0.98, 0.25] },
  ], [x, 0, z]);
  waterZone(b, x - 0.3, x + 0.3, z - 0.05, z + 0.6, 0.6, 0.85, '#9fe0ff');
}

export function furnishBathroom(b: Builder, ox = 0, oz = 0, o: { tub?: boolean; backWall?: boolean; leftWall?: boolean } = {}) {
  const Bt = BATH;
  if (o.tub !== false) bathtub(b, ox + Bt.tub.x0, ox + Bt.tub.x1, oz + Bt.tub.z0, oz + Bt.tub.z1, Bt.tub.rim, Bt.tub.water);
  toilet(b, ox + Bt.toilet.x, oz + Bt.toilet.z);
  // vanity + mirror
  cabinet(b, ox + Bt.vanity.x, oz + Bt.vanity.z, Bt.vanity.w, Bt.vanity.d, Bt.vanity.top, '#9fd8cb', '#ffffff', 2);
  const vg = new THREE.Group();
  vg.add(mesh(box(0.9, 0.04, 0.55, 0), M('#c9e7f2'), { pos: [0, 0.02, 0.05], shadow: false }));
  vg.add(mesh(cyl(0.05, 0.05, 0.45, 6), M('#c9ccd8'), { pos: [0, 0.22, -0.3] }));
  vg.position.set(ox + Bt.vanity.x, Bt.vanity.top, oz + Bt.vanity.z);
  b.deco(vg);
  if (o.backWall !== false) {
    const mg = new THREE.Group();
    mg.add(mesh(box(1.5, 1.4, 0.08, 0.04), M('#ffffff')));
    mg.add(mesh(box(1.3, 1.2, 0.02, 0), new THREE.MeshLambertMaterial({ color: '#d6f3ff', emissive: '#8fd0ee', emissiveIntensity: 0.35 }), { pos: [0, 0, 0.05], shadow: false }));
    mg.position.set(ox + Bt.vanity.x, Bt.vanity.top + 1.6, oz - BATH_D / 2 + 0.06);
    b.deco(mg);
    windowOn(b, { z: oz - BATH_D / 2 }, ox - 2.05, 5.4, 1.4, 1.0, false, '#9fd8cb');
  }
  rug(b, ox - 1.9, oz - 0.75, 2.2, 1.0, ['#ffb3c6', '#ffffff', '#ffffff']);
  // towel rail on the left wall
  if (o.leftWall !== false) {
    const tr = new THREE.Group();
    tr.add(mesh(cyl(0.04, 0.04, 1.6, 6), M('#c9ccd8'), { rot: [Math.PI / 2, 0, 0] }));
    tr.add(mesh(box(0.08, 1.1, 0.75, 0.04), M('#ff9fb6'), { pos: [0.06, -0.55, -0.35] }));
    tr.add(mesh(box(0.08, 0.9, 0.6, 0.04), M('#9fd8cb'), { pos: [0.06, -0.45, 0.4] }));
    tr.position.set(ox - BATH_W / 2 + 0.12, 3.2, oz + 0.3);
    b.deco(tr);
  }
}

export function bathroom(b: Builder): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('bath', '욕실', 0, 0, BATH_W, BATH_D, 'tile', 'bath')], base: '#5c8fb0', h: 6.8 });
  furnishBathroom(b, 0, 0);
  doorOn(b, { x: -BATH_W / 2 }, BATH.doorZ, '#9fd8cb');
  b.ownerAtDoor(-BATH_W / 2 + 0.9, 0, BATH.doorZ, Math.PI / 2);
  return info;
}

/* ============================== PLAYROOM ============================== */

export const PLAY_W = 10, PLAY_D = 8.4;
export const PLAY = {
  bed: { x: -3.55, z: -2.0, w: 2.6, l: 3.8, top: 1.0 },
  shelf: { x: 1.6, z: -3.65, w: 4.2, d: 0.9, top: 1.5 },
  table: { x: -0.6, z: 1.4, w: 2.4, d: 1.6, top: 1.2 },
  doorZ: 2.7,
};

export function furnishPlayroom(b: Builder, ox = 0, oz = 0, o: { table?: boolean; backWall?: boolean; leftWall?: boolean } = {}) {
  const P = PLAY;
  bedFrame(b, ox + P.bed.x, oz + P.bed.z, P.bed.w, P.bed.l, P.bed.top, { frame: '#9fd8cb', sheet: '#ffe08a', pillow: '#ffffff' });
  cabinet(b, ox + P.shelf.x, oz + P.shelf.z, P.shelf.w, P.shelf.d, P.shelf.top, '#ffb3c6', '#ffffff', 2);
  if (o.table !== false) table(b, ox + P.table.x, oz + P.table.z, P.table.w, P.table.d, P.table.top, '#a9c8ff', '#ffffff');
  if (o.backWall !== false) {
    windowOn(b, { z: oz - PLAY_D / 2 }, ox + 1.6, 4.3, 2.6, 2.0, false, '#ffb3c6');
    // hanging stars mobile
    const mob = new THREE.Group();
    for (let i = 0; i < 5; i++) {
      mob.add(mesh(cyl(0.01, 0.01, 1.2 + (i % 3) * 0.4, 3), M('#ffffff'), { pos: [(i - 2) * 0.45, -0.6 - (i % 3) * 0.2, 0], shadow: false }));
      mob.add(mesh(sphere(0.14, 6, 4), M(['#ffd23f', '#ff8fa3', '#7fd3ff', '#5bb98c', '#9b6fcf'][i]), { pos: [(i - 2) * 0.45, -1.25 - (i % 3) * 0.4, 0] }));
    }
    mob.add(mesh(cyl(0.03, 0.03, 2.1, 5), M('#b9825a'), { rot: [0, 0, Math.PI / 2] }));
    mob.position.set(ox - 3.4, 6.2, oz - 2.6);
    b.deco(mob);
  }
  if (o.leftWall !== false) posterOn(b, { x: ox - PLAY_W / 2 }, oz - 0.2, 4.4, 1.6, 1.2, ['#c9f2d6', '#ffd23f', '#4f86c6']);
  rug(b, ox + 1.2, oz + 1.0, 5.0, 4.0, ['#a9c8ff', '#ffffff', '#ffd23f']);
}

export function playroom(b: Builder): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('play', '아이방', 0, 0, PLAY_W, PLAY_D, 'playmat', 'play')], base: '#c27aa8', h: 7.2 });
  furnishPlayroom(b, 0, 0);
  doorOn(b, { x: -PLAY_W / 2 }, PLAY.doorZ, '#a9c8ff');
  b.ownerAtDoor(-PLAY_W / 2 + 0.9, 0, PLAY.doorZ, Math.PI / 2);
  return info;
}

/* ============================== HALLWAY / STUDY ============================== */

/** decorate a hallway room (long along x or z) */
export function furnishHall(b: Builder, r: { x0: number; x1: number; z0: number; z1: number }, o: { console?: { x: number; z: number } } = {}) {
  const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
  const alongX = r.x1 - r.x0 > r.z1 - r.z0;
  b.deco(mesh(box(alongX ? r.x1 - r.x0 - 1.2 : 1.2, 0.03, alongX ? 1.2 : r.z1 - r.z0 - 1.2, 0.01), M('#c25b5b'), { pos: [cx, 0.016, cz], shadow: false }));
  if (o.console) block(b, o.console.x, o.console.z, 1.8, 0.7, 1.8, '#b9825a', '#f4efe4');
}

export const STUDY = {
  desk: { x: 1.6, z: -2.9, w: 3.2, d: 1.5, top: 2.35 },
  armchair: { x: -2.6, z: 1.0 },
};

export function armchair(b: Builder, x: number, z: number, rotY: number, color: string) {
  const g = new THREE.Group();
  const c = M(color);
  g.add(mesh(box(1.8, 0.9, 1.6, 0.2), c, { pos: [0, 0.55, 0] }));
  g.add(mesh(box(1.8, 1.4, 0.4, 0.18), c, { pos: [0, 1.5, -0.6] }));
  for (const sx of [-1, 1]) g.add(mesh(box(0.35, 1.2, 1.6, 0.15), c, { pos: [sx * 0.9, 0.95, 0] }));
  b.solid(g, [
    { shape: 'box', hx: 0.9, hy: 0.55, hz: 0.8, at: [0, 0.55, 0], restitution: 0.45 },
    { shape: 'box', hx: 0.9, hy: 0.7, hz: 0.2, at: [0, 1.5, -0.6] },
    { shape: 'box', hx: 0.17, hy: 0.6, hz: 0.8, at: [-0.9, 0.95, 0] },
    { shape: 'box', hx: 0.17, hy: 0.6, hz: 0.8, at: [0.9, 0.95, 0] },
  ], [x, 0, z], rotY);
  return 1.1;
}
