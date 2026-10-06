import * as THREE from 'three';
import { B, M, box, checkerTexture, cone, cyl, dotTexture, mesh, plankTexture, plane, rugTexture, sphere, stripeTexture } from '../render/kit';
import type { Builder } from './Builder';

/* ------------------------------------------------------------------ */
/* Static diorama rooms. Floor y=0, x∈[-5,5], z∈[-4.5,4.5].             */
/* Back wall at z=-4.5, left wall at x=-5 (the camera looks from +x+z). */
/* ------------------------------------------------------------------ */

export const W = 8, D = 7.5, H = 7.0, T = 0.35;
export const X0 = -W / 2, X1 = W / 2, Z0 = -D / 2, Z1 = D / 2;

export interface RoomStyle {
  bg: [string, string];
  hemi: [number, number, number];
  sun: [number, number, [number, number, number]];
}

export const ROOM_STYLE: Record<'living' | 'kitchen' | 'bedroom', RoomStyle> = {
  living: { bg: ['#ffe2b8', '#ffb3a7'], hemi: [0xfff4e6, 0x9b7fb8, 1.45], sun: [0xfff0dc, 1.9, [-5, 16, 11]] },
  kitchen: { bg: ['#d7f5e9', '#9fd8cb'], hemi: [0xfffaf0, 0x7f9fb8, 1.5], sun: [0xfff6e0, 1.8, [-6, 16, 10]] },
  bedroom: { bg: ['#4b3f8f', '#1f1b4a'], hemi: [0xc9c4ff, 0x4a3a7a, 1.15], sun: [0xffd9a0, 1.35, [6, 14, 10]] },
};

interface Shell {
  floor: THREE.Texture | undefined;
  floorColor: string;
  wall: string;
  wallTex?: THREE.Texture;
  wainscot: string;
  trim: string;
  slab: string;
  base: string;
}

function shell(b: Builder, s: Shell) {
  const env = new THREE.Group();
  // floor
  const fl = mesh(plane(W, D), s.floor ? M('#ffffff', { map: s.floor }) : M(s.floorColor), { rot: [-Math.PI / 2, 0, 0], pos: [0, 0, 0], shadow: false });
  env.add(fl);
  // slab & base (diorama chunk)
  env.add(mesh(box(W + T, 0.45, D + T, 0.02), M(s.slab), { pos: [-T / 2, -0.23, -T / 2], shadow: false }));
  env.add(mesh(box(W + T + 0.5, 1.1, D + T + 0.5, 0.15), M(s.base), { pos: [-T / 2, -0.98, -T / 2], shadow: false }));
  // walls
  const wallMat = M(s.wall);
  env.add(mesh(box(W + T, H, T, 0), wallMat, { pos: [-T / 2, H / 2, Z0 - T / 2] }));
  env.add(mesh(box(T, H, D, 0), wallMat, { pos: [X0 - T / 2, H / 2, 0] }));
  // wallpaper on inner faces
  if (s.wallTex) {
    env.add(mesh(plane(W, H - 1.7), M('#ffffff', { map: s.wallTex }), { pos: [0, 1.7 + (H - 1.7) / 2, Z0 + 0.005], shadow: false }));
    env.add(mesh(plane(D, H - 1.7), M('#ffffff', { map: s.wallTex }), { pos: [X0 + 0.005, 1.7 + (H - 1.7) / 2, 0], rot: [0, Math.PI / 2, 0], shadow: false }));
  }
  // wainscot + rail + baseboard
  env.add(mesh(box(W, 1.7, 0.06, 0), M(s.wainscot), { pos: [0, 0.85, Z0 + 0.03], shadow: false }));
  env.add(mesh(box(0.06, 1.7, D, 0), M(s.wainscot), { pos: [X0 + 0.03, 0.85, 0], shadow: false }));
  env.add(mesh(box(W, 0.12, 0.14, 0.02), M(s.trim), { pos: [0, 1.72, Z0 + 0.07], shadow: false }));
  env.add(mesh(box(0.14, 0.12, D, 0.02), M(s.trim), { pos: [X0 + 0.07, 1.72, 0], shadow: false }));
  env.add(mesh(box(W, 0.25, 0.12, 0.02), M(s.trim), { pos: [0, 0.125, Z0 + 0.06], shadow: false }));
  env.add(mesh(box(0.12, 0.25, D, 0.02), M(s.trim), { pos: [X0 + 0.06, 0.125, 0], shadow: false }));
  // wall caps
  env.add(mesh(box(W + T + 0.06, 0.12, T + 0.06, 0.02), M('#ffffff'), { pos: [-T / 2, H + 0.06, Z0 - T / 2], shadow: false }));
  env.add(mesh(box(T + 0.06, 0.12, D + 0.06, 0.02), M('#ffffff'), { pos: [X0 - T / 2, H + 0.06, 0], shadow: false }));
  env.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.receiveShadow = true; } });
  b.deco(env);

  // physics: floor, walls, invisible open sides & ceiling
  b.solid(null, [{ shape: 'box', hx: W / 2 + 3, hy: 0.5, hz: D / 2 + 3, at: [0, -0.5, 0] }], [0, 0, 0], 0, { friction: 0.75, restitution: 0.1 });
  b.solid(null, [{ shape: 'box', hx: W / 2 + T, hy: H / 2 + 2, hz: T / 2, at: [0, H / 2 + 2, Z0 - T / 2] }], [0, 0, 0], 0, { friction: 0.4, restitution: 0.2 });
  b.solid(null, [{ shape: 'box', hx: T / 2, hy: H / 2 + 2, hz: D / 2 + T, at: [X0 - T / 2, H / 2 + 2, 0] }], [0, 0, 0], 0, { friction: 0.4, restitution: 0.2 });
  b.invisible([{ shape: 'box', hx: W / 2 + 1, hy: H / 2 + 3, hz: 0.3, at: [0, H / 2 + 3, Z1 + 0.3] }], [0, 0, 0]);
  b.invisible([{ shape: 'box', hx: 0.3, hy: H / 2 + 3, hz: D / 2 + 1, at: [X1 + 0.3, H / 2 + 3, 0] }], [0, 0, 0]);
  b.invisible([{ shape: 'box', hx: W / 2 + 1, hy: 0.3, hz: D / 2 + 1, at: [0, H + 3.3, 0] }], [0, 0, 0]);

  b.game.floorY = 0;
  b.game.roomBounds = { minX: X0, maxX: X1, minZ: Z0, maxZ: Z1 };
  b.game.framePoints = [
    new THREE.Vector3(X0 - T, H + 0.1, Z0 - T),
    new THREE.Vector3(X1, H + 0.1, Z0 - T),
    new THREE.Vector3(X0 - T, H + 0.1, Z1),
    new THREE.Vector3(X0 - T * 0.5, -0.6, Z1),
    new THREE.Vector3(X1, -0.6, Z1),
    new THREE.Vector3(X1, -0.6, Z0 - T * 0.5),
  ];
}

/* ------------------------------ decor pieces ------------------------------ */

function skyTexture(night: boolean) {
  if (typeof document === 'undefined') return undefined;
  const cv = document.createElement('canvas');
  cv.width = 64; cv.height = 128;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 128);
  if (night) { g.addColorStop(0, '#1d1a4a'); g.addColorStop(1, '#5a4aa0'); }
  else { g.addColorStop(0, '#7fd3ff'); g.addColorStop(1, '#d9f4ff'); }
  c.fillStyle = g; c.fillRect(0, 0, 64, 128);
  if (night) {
    c.fillStyle = '#fff6c9';
    for (let i = 0; i < 18; i++) c.fillRect((i * 37) % 64, (i * 53) % 90, 2, 2);
    c.beginPath(); c.arc(44, 26, 10, 0, Math.PI * 2); c.fill();
  } else {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    for (const [x, y, r] of [[18, 40, 9], [28, 36, 11], [38, 42, 8], [44, 86, 7], [52, 82, 9]]) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** window on the back wall centred at x */
function backWindow(b: Builder, x: number, y: number, w: number, h: number, night: boolean, curtain: string) {
  const g = new THREE.Group();
  const sky = skyTexture(night);
  g.add(mesh(plane(w, h), sky ? new THREE.MeshBasicMaterial({ map: sky }) : B(night ? '#3a3480' : '#9fe0ff'), { pos: [0, 0, 0.02], shadow: false }));
  const fr = M('#ffffff');
  g.add(mesh(box(w + 0.3, 0.18, 0.2, 0.03), fr, { pos: [0, h / 2 + 0.09, 0.1] }));
  g.add(mesh(box(w + 0.5, 0.16, 0.45, 0.03), fr, { pos: [0, -h / 2 - 0.08, 0.2] }));
  g.add(mesh(box(0.16, h, 0.2, 0.03), fr, { pos: [-w / 2 - 0.08, 0, 0.1] }));
  g.add(mesh(box(0.16, h, 0.2, 0.03), fr, { pos: [w / 2 + 0.08, 0, 0.1] }));
  g.add(mesh(box(0.1, h, 0.12, 0), fr, { pos: [0, 0, 0.08] }));
  g.add(mesh(box(w, 0.1, 0.12, 0), fr, { pos: [0, 0, 0.08] }));
  for (const sx of [-1, 1]) {
    for (let i = 0; i < 3; i++) g.add(mesh(box(0.32, h + 0.4, 0.14, 0.06), M(curtain), { pos: [sx * (w / 2 + 0.15 + i * 0.22), -0.1, 0.3 + (i % 2) * 0.06] }));
  }
  g.add(mesh(cyl(0.05, 0.05, w + 1.8, 6), M('#8e5f3e'), { pos: [0, h / 2 + 0.35, 0.3], rot: [0, 0, Math.PI / 2] }));
  g.position.set(x, y, Z0 + 0.01);
  b.deco(g);
  // light patch on the floor
  const patch = mesh(plane(w * 0.95, h * 0.9), new THREE.MeshBasicMaterial({ color: night ? '#a9b8ff' : '#fff4c9', transparent: true, opacity: night ? 0.12 : 0.28, depthWrite: false, blending: THREE.AdditiveBlending }), { rot: [-Math.PI / 2, 0, 0.35], pos: [x + 1.2, 0.012, Z0 + h * 0.55], shadow: false, receive: false });
  b.deco(patch);
}

/** door on the left wall at z (owner enters here) */
function leftDoor(b: Builder, z: number, color: string) {
  const g = new THREE.Group();
  const w = 1.8, h = 3.9;
  g.add(mesh(box(0.08, h, w, 0.02), M(color), { pos: [0.06, h / 2, 0] }));
  g.add(mesh(box(0.1, h - 0.6, w - 0.5, 0.04), M(color), { pos: [0.11, h / 2, 0], scale: [1, 0.42, 1] }));
  g.add(mesh(box(0.1, h * 0.35, w - 0.5, 0.04), M(color), { pos: [0.11, h * 0.75, 0] }));
  g.add(mesh(sphere(0.08, 6, 4), M('#ffd23f'), { pos: [0.18, h * 0.48, w / 2 - 0.25] }));
  const fr = M('#ffffff');
  g.add(mesh(box(0.2, h + 0.2, 0.16, 0.03), fr, { pos: [0.08, (h + 0.2) / 2, w / 2 + 0.08] }));
  g.add(mesh(box(0.2, h + 0.2, 0.16, 0.03), fr, { pos: [0.08, (h + 0.2) / 2, -w / 2 - 0.08] }));
  g.add(mesh(box(0.2, 0.18, w + 0.32, 0.03), fr, { pos: [0.08, h + 0.11, 0] }));
  g.position.set(X0, 0, z);
  b.deco(g);
  // welcome mat
  b.deco(mesh(box(1.1, 0.04, 1.6, 0.02), M('#c9965a'), { pos: [X0 + 0.75, 0.02, z], shadow: false }));
}

function wallClock(b: Builder, x: number, y: number) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.45, 0.45, 0.1, 14), M('#ffffff'), { rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(cyl(0.5, 0.5, 0.08, 14), M('#3a3d4f'), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -0.02] }));
  g.add(mesh(box(0.04, 0.3, 0.02, 0), M('#2b2233'), { pos: [0, 0.12, 0.06], shadow: false }));
  g.add(mesh(box(0.22, 0.04, 0.02, 0), M('#2b2233'), { pos: [0.1, 0, 0.06], shadow: false }));
  g.position.set(x, y, Z0 + 0.06);
  b.deco(g);
}

function poster(b: Builder, onLeft: boolean, a: number, y: number, w: number, h: number, colors: string[]) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h, 0.03, 0), M(colors[0])));
  g.add(mesh(sphere(Math.min(w, h) * 0.22, 8, 6), M(colors[1]), { pos: [w * 0.1, h * 0.12, 0.02], scale: [1, 1, 0.15], shadow: false }));
  g.add(mesh(box(w * 0.7, h * 0.12, 0.02, 0), M(colors[2]), { pos: [0, -h * 0.3, 0.02], shadow: false }));
  if (onLeft) { g.position.set(X0 + 0.04, y, a); g.rotation.y = Math.PI / 2; }
  else g.position.set(a, y, Z0 + 0.04);
  b.deco(g);
}

function rug(b: Builder, x: number, z: number, w: number, d: number, tex: THREE.Texture | undefined, color: string) {
  b.deco(mesh(box(w, 0.04, d, 0.02), tex ? M('#ffffff', { map: tex }) : M(color), { pos: [x, 0.02, z], shadow: false }));
}

/* ------------------------------ static furniture ------------------------------ */

export function sofa(b: Builder, x: number, z: number, rotY: number, color: string) {
  const g = new THREE.Group();
  const c = M(color), dark = M(new THREE.Color(color).multiplyScalar(0.85).getStyle());
  g.add(mesh(box(4.2, 0.9, 1.7, 0.2), dark, { pos: [0, 0.55, 0] }));
  g.add(mesh(box(1.9, 0.38, 1.4, 0.18), c, { pos: [-0.98, 1.17, 0.12] }));
  g.add(mesh(box(1.9, 0.38, 1.4, 0.18), c, { pos: [0.98, 1.17, 0.12] }));
  g.add(mesh(box(4.2, 1.6, 0.45, 0.2), dark, { pos: [0, 1.6, -0.65] }));
  for (const sx of [-1, 1]) g.add(mesh(box(0.45, 1.3, 1.7, 0.18), c, { pos: [sx * 2.1, 1.0, 0] }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(cyl(0.07, 0.05, 0.12, 6), M('#5b3b2b'), { pos: [sx * 1.9, 0.06, sz * 0.7] }));
  b.solid(g, [
    { shape: 'box', hx: 2.1, hy: 0.68, hz: 0.85, at: [0, 0.68, 0], restitution: 0.45, friction: 0.8 },
    { shape: 'box', hx: 2.1, hy: 0.8, hz: 0.23, at: [0, 1.6, -0.65] },
    { shape: 'box', hx: 0.23, hy: 0.65, hz: 0.85, at: [-2.1, 1.0, 0] },
    { shape: 'box', hx: 0.23, hy: 0.65, hz: 0.85, at: [2.1, 1.0, 0] },
  ], [x, 0, z], rotY);
  return 1.36; // seat height
}

export function table(b: Builder, x: number, z: number, w: number, d: number, h: number, color: string, legColor = '#8e5f3e') {
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.2, d, 0.05), M(color), { pos: [0, h - 0.1, 0] }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(0.18, h - 0.2, 0.18, 0.03), M(legColor), { pos: [sx * (w / 2 - 0.25), (h - 0.2) / 2, sz * (d / 2 - 0.25)] }));
  const cols = [{ shape: 'box' as const, hx: w / 2, hy: 0.1, hz: d / 2, at: [0, h - 0.1, 0] as [number, number, number] }];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cols.push({ shape: 'box', hx: 0.09, hy: (h - 0.2) / 2, hz: 0.09, at: [sx * (w / 2 - 0.25), (h - 0.2) / 2, sz * (d / 2 - 0.25)] });
  b.solid(g, cols, [x, 0, z]);
  return h;
}

export function cabinet(b: Builder, x: number, z: number, w: number, d: number, h: number, color: string, top = '#ffffff', drawers = 2) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h - 0.12, d, 0.04), M(color), { pos: [0, (h - 0.12) / 2, 0] }));
  g.add(mesh(box(w + 0.1, 0.12, d + 0.1, 0.03), M(top), { pos: [0, h - 0.06, 0] }));
  for (let i = 0; i < drawers; i++) {
    const dh = (h - 0.3) / drawers;
    g.add(mesh(box(w - 0.25, dh - 0.12, 0.04, 0.02), M(new THREE.Color(color).multiplyScalar(1.08).getStyle()), { pos: [0, 0.12 + dh * (i + 0.5), d / 2 + 0.01] }));
    g.add(mesh(box(0.3, 0.06, 0.06, 0.02), M('#3a3d4f'), { pos: [0, 0.12 + dh * (i + 0.5), d / 2 + 0.05], shadow: false }));
  }
  b.solid(g, [{ shape: 'box', hx: w / 2 + 0.05, hy: h / 2, hz: d / 2 + 0.05, at: [0, h / 2, 0] }], [x, 0, z]);
  return h;
}

/* ------------------------------ rooms ------------------------------ */

export const LIVING = {
  sofaSeat: 1.36,
  sofa: { x: -1.3, z: -2.9 },
  tvStand: { x: 2.35, z: -3.2, top: 1.25, w: 2.8, d: 1.0 },
  coffee: { x: 0.2, z: 0.3, top: 1.25, w: 2.8, d: 1.6 },
  doorZ: 2.1,
};

export function livingRoom(b: Builder, o: { coffee?: boolean; tvStand?: boolean; sofa?: boolean } = {}) {
  shell(b, {
    floor: plankTexture('#e7b07a', '#c98d5a', [3, 3]), floorColor: '#e7b07a',
    wall: '#9fd8cb', wallTex: stripeTexture('#a8ddd1', '#97d2c4', [14, 1]), wainscot: '#f4efe4', trim: '#ffffff',
    slab: '#c98d5a', base: '#8e6a8f',
  });
  backWindow(b, -1.3, 4.3, 2.4, 2.2, false, '#ff9f87');
  leftDoor(b, LIVING.doorZ, '#ef8a5b');
  wallClock(b, 2.6, 5.3);
  poster(b, true, -1.2, 4.2, 1.3, 1.7, ['#fff1c1', '#ff7aa8', '#4f86c6']);
  rug(b, 0.3, 0.5, 5.0, 3.4, rugTexture('#ffcf5c', '#ff8c6b', '#ffffff'), '#ffcf5c');
  if (o.sofa !== false) sofa(b, LIVING.sofa.x, LIVING.sofa.z, 0, '#ff8c6b');
  if (o.tvStand !== false) cabinet(b, LIVING.tvStand.x, LIVING.tvStand.z, LIVING.tvStand.w, LIVING.tvStand.d, LIVING.tvStand.top, '#f4efe4', '#b9825a', 1);
  if (o.coffee !== false) table(b, LIVING.coffee.x, LIVING.coffee.z, LIVING.coffee.w, LIVING.coffee.d, LIVING.coffee.top, '#b9825a', '#8e5f3e');
  b.ownerAtDoor(X0 + 0.9, 0, LIVING.doorZ, Math.PI / 2);
}

export const KITCHEN = {
  counter: { x0: -1.95, x1: 4.0, z: -3.0, d: 1.5, top: 2.6 },
  shelf: { x0: -0.4, x1: 3.6, y: 5.0, z: -3.4, d: 0.7 },
  fridge: { x: -3.0, z: -2.85, w: 1.9, d: 1.7, h: 5.8 },
  table: { x: 0.9, z: 1.2, w: 3.8, d: 2.2, top: 2.3 },
  doorZ: 2.4,
};

export function kitchen(b: Builder, o: { table?: boolean; shelf?: boolean } = {}) {
  shell(b, {
    floor: checkerTexture('#f7f3ea', '#7fb8d8', [6, 5.4]), floorColor: '#f7f3ea',
    wall: '#ffe7a3', wallTex: dotTexture('#ffe7a3', '#ffd77a', [12, 7]), wainscot: '#ffffff', trim: '#7fb8d8',
    slab: '#7fb8d8', base: '#5c7aa6',
  });
  const K = KITCHEN;
  // counter (back wall) with sink + stove decals
  const cw = K.counter.x1 - K.counter.x0, cx = (K.counter.x0 + K.counter.x1) / 2;
  const cg = new THREE.Group();
  cg.add(mesh(box(cw, K.counter.top - 0.14, K.counter.d, 0.04), M('#7fc8b8'), { pos: [0, (K.counter.top - 0.14) / 2, 0] }));
  cg.add(mesh(box(cw + 0.1, 0.14, K.counter.d + 0.1, 0.03), M('#fdfbf5'), { pos: [0, K.counter.top - 0.07, 0] }));
  for (let i = 0; i < 4; i++) {
    const dx = -cw / 2 + (i + 0.5) * (cw / 4);
    cg.add(mesh(box(cw / 4 - 0.15, K.counter.top - 0.6, 0.04, 0.02), M('#8fd3c4'), { pos: [dx, (K.counter.top - 0.14) / 2, K.counter.d / 2 + 0.01] }));
    cg.add(mesh(box(0.06, 0.4, 0.06, 0.02), M('#3a3d4f'), { pos: [dx + 0.5, K.counter.top - 0.6, K.counter.d / 2 + 0.05], shadow: false }));
  }
  // sink basin (visual) and faucet
  cg.add(mesh(box(1.4, 0.02, 0.85, 0), M('#9aa6b8'), { pos: [-1.5, K.counter.top + 0.005, 0.05], shadow: false }));
  cg.add(mesh(cyl(0.06, 0.06, 0.7, 6), M('#c9ccd8'), { pos: [-1.5, K.counter.top + 0.35, -0.5] }));
  cg.add(mesh(cyl(0.05, 0.05, 0.5, 6), M('#c9ccd8'), { pos: [-1.5, K.counter.top + 0.68, -0.3], rot: [Math.PI / 2, 0, 0] }));
  // stove rings
  for (const dx of [1.5, 2.4]) cg.add(mesh(cyl(0.3, 0.3, 0.02, 12), M('#3a3d4f'), { pos: [dx, K.counter.top + 0.01, 0.1], shadow: false }));
  b.solid(cg, [
    { shape: 'box', hx: cw / 2 + 0.05, hy: K.counter.top / 2, hz: K.counter.d / 2 + 0.05, at: [0, K.counter.top / 2, 0] },
    { shape: 'cyl', hh: 0.35, r: 0.08, at: [-1.5, K.counter.top + 0.35, -0.5] },
  ], [cx, 0, K.counter.z]);
  // open shelf
  if (o.shelf !== false) {
    const sw = K.shelf.x1 - K.shelf.x0, sx = (K.shelf.x0 + K.shelf.x1) / 2;
    const sg = new THREE.Group();
    sg.add(mesh(box(sw, 0.14, K.shelf.d, 0.03), M('#e0a46d'), { pos: [0, -0.07, 0] }));
    for (const dx of [-sw / 2 + 0.3, sw / 2 - 0.3]) sg.add(mesh(box(0.08, 0.4, 0.5, 0.02), M('#3a3d4f'), { pos: [dx, -0.3, -0.1] }));
    b.solid(sg, [{ shape: 'box', hx: sw / 2, hy: 0.07, hz: K.shelf.d / 2, at: [0, -0.07, 0] }], [sx, K.shelf.y, K.shelf.z]);
  }
  // fridge
  const fg = new THREE.Group();
  fg.add(mesh(box(K.fridge.w, K.fridge.h, K.fridge.d, 0.2), M('#f4f6fb'), { pos: [0, K.fridge.h / 2, 0] }));
  fg.add(mesh(box(K.fridge.w - 0.1, 0.04, 0.05, 0), M('#c9ccd8'), { pos: [0, K.fridge.h * 0.62, K.fridge.d / 2 + 0.01], shadow: false }));
  for (const y of [K.fridge.h * 0.45, K.fridge.h * 0.75]) fg.add(mesh(box(0.1, 0.8, 0.12, 0.03), M('#c9ccd8'), { pos: [K.fridge.w / 2 - 0.25, y, K.fridge.d / 2 + 0.06] }));
  for (const [x, y, c] of [[-0.4, 4.6, '#ff6b6b'], [0.2, 4.2, '#ffd23f'], [-0.2, 2.6, '#5bb98c']] as const) fg.add(mesh(box(0.25, 0.25, 0.05, 0.03), M(c), { pos: [x, y, K.fridge.d / 2 + 0.03], shadow: false }));
  b.solid(fg, [{ shape: 'box', hx: K.fridge.w / 2, hy: K.fridge.h / 2, hz: K.fridge.d / 2, at: [0, K.fridge.h / 2, 0] }], [K.fridge.x, 0, K.fridge.z]);
  backWindow(b, 1.4, 3.95, 2.2, 1.4, false, '#ff9fc0');
  leftDoor(b, KITCHEN.doorZ, '#7fb8d8');
  wallClock(b, -1.0, 6.0);
  poster(b, true, 0.4, 4.4, 1.1, 1.4, ['#ffffff', '#e8434b', '#5bb98c']);
  if (o.table !== false) {
    table(b, K.table.x, K.table.z, K.table.w, K.table.d, K.table.top, '#f4efe4', '#b9825a');
  }
  b.ownerAtDoor(X0 + 0.9, 0, KITCHEN.doorZ, Math.PI / 2);
}

export const BEDROOM = {
  bed: { x: -2.25, z: -1.65, w: 3.4, l: 4.2, top: 1.25 },
  night: { x: 0.25, z: -3.2, top: 1.75 },
  desk: { x: 2.45, z: -3.0, w: 3.0, d: 1.5, top: 2.35 },
  doorZ: 2.6,
};

export function bedroom(b: Builder, o: { owner?: 'sleep' | 'door' } = {}) {
  shell(b, {
    floor: plankTexture('#c9a0dc', '#a882c4', [3, 3]), floorColor: '#c9a0dc',
    wall: '#7d70c9', wallTex: dotTexture('#8678d1', '#9b8fdd', [12, 7]), wainscot: '#b9b0ea', trim: '#ffffff',
    slab: '#a882c4', base: '#3f3478',
  });
  const Bd = BEDROOM.bed;
  // bed: frame + bouncy mattress + headboard
  const bg = new THREE.Group();
  bg.add(mesh(box(Bd.w, 0.7, Bd.l, 0.1), M('#b9825a'), { pos: [0, 0.35, 0] }));
  bg.add(mesh(box(Bd.w - 0.1, 0.55, Bd.l - 0.1, 0.2), M('#ffffff'), { pos: [0, 0.98, 0] }));
  bg.add(mesh(box(Bd.w + 0.2, 2.9, 0.3, 0.12), M('#b9825a'), { pos: [0, 1.45, -Bd.l / 2 - 0.1] }));
  bg.add(mesh(box(Bd.w - 0.8, 0.35, 0.9, 0.16), M('#fff4f8'), { pos: [0, 1.4, -Bd.l / 2 + 0.6] }));
  b.solid(bg, [
    { shape: 'box', hx: Bd.w / 2, hy: Bd.top / 2, hz: Bd.l / 2, at: [0, Bd.top / 2, 0], restitution: 0.7, friction: 0.8 },
    { shape: 'box', hx: Bd.w / 2 + 0.1, hy: 1.45, hz: 0.15, at: [0, 1.45, -Bd.l / 2 - 0.1] },
  ], [Bd.x, 0, Bd.z]);
  cabinet(b, BEDROOM.night.x, BEDROOM.night.z, 1.2, 1.0, BEDROOM.night.top, '#f2b134', '#ffffff', 2);
  // desk
  const De = BEDROOM.desk;
  table(b, De.x, De.z, De.w, De.d, De.top, '#f4efe4', '#3a3d4f');
  backWindow(b, 2.45, 4.55, 2.3, 1.9, true, '#5b4aa8');
  leftDoor(b, BEDROOM.doorZ, '#b9b0ea');
  poster(b, false, -2.4, 4.7, 1.3, 0.9, ['#ffe3b0', '#ff7aa8', '#4f86c6']);
  rug(b, 0.3, 1.3, 4.0, 2.8, rugTexture('#7ec4cf', '#ffffff', '#ffd23f'), '#7ec4cf');
  // night lamp glow
  const lamp = new THREE.PointLight(0xffc27a, 9, 9, 1.6);
  lamp.position.set(0.0, 3.0, -3.0);
  b.deco(lamp);
  const lg = new THREE.Group();
  lg.add(mesh(cyl(0.12, 0.2, 0.5, 8), M('#ffffff'), { pos: [0, 0.25, 0] }));
  lg.add(mesh(cone(0.4, 0.5, 8), new THREE.MeshLambertMaterial({ color: '#ffe3b0', emissive: '#ffb35a', emissiveIntensity: 0.9, flatShading: true }), { pos: [0, 0.75, 0] }));
  lg.position.set(-0.15, BEDROOM.night.top, -3.45);
  b.deco(lg);
  b.solid(null, [{ shape: 'cyl', hh: 0.5, r: 0.38, at: [0, 0.5, 0] }], [-0.15, BEDROOM.night.top, -3.45]);
  if (o.owner === 'door') b.ownerAtDoor(X0 + 0.9, 0, BEDROOM.doorZ, Math.PI / 2);
  else b.ownerAsleep(Bd.x, 1.1, Bd.z - 0.5, -Math.PI / 2);
}
