import * as THREE from 'three';
import { B, M, box, checkerTexture, cyl, dotTexture, mesh, plankTexture, plane, rugTexture, sphere, stripeTexture, tileTexture, starTexture2, matTexture } from '../render/kit';
import type { Builder } from './Builder';
import type { ColDef } from '../game/types';

/* ------------------------------------------------------------------ */
/* Generic diorama house: rectangular rooms, exterior walls on the back */
/* (min z) and left (min x) edges, low interior walls with doorways     */
/* between neighbouring rooms, open (cut-away) front & right sides.     */
/* ------------------------------------------------------------------ */

export const T = 0.35; // exterior wall thickness
export const IT = 0.24; // interior wall thickness

export type FloorKind = 'wood' | 'checker' | 'lilac' | 'tile' | 'playmat' | 'darkwood' | 'herring' | 'concrete' | 'marttile';
export type WallKind = 'mint' | 'butter' | 'night' | 'bath' | 'play' | 'hall' | 'study' | 'garage' | 'mart' | 'steel';

interface WallStyle { wall: string; paper?: () => THREE.Texture | undefined; wainscot: string; trim: string; inner: string }
const WALLS: Record<WallKind, WallStyle> = {
  mint: { wall: '#9fd8cb', paper: () => stripeTexture('#a8ddd1', '#97d2c4', [14, 1]), wainscot: '#f4efe4', trim: '#ffffff', inner: '#b5e3d8' },
  butter: { wall: '#ffe7a3', paper: () => dotTexture('#ffe7a3', '#ffd77a', [12, 7]), wainscot: '#ffffff', trim: '#7fb8d8', inner: '#ffefc2' },
  night: { wall: '#7d70c9', paper: () => dotTexture('#8678d1', '#9b8fdd', [12, 7]), wainscot: '#b9b0ea', trim: '#ffffff', inner: '#9a8fe0' },
  bath: { wall: '#bfe6f2', paper: () => tileTexture('#f4fbff', '#cfe8f2', [10, 6]), wainscot: '#ffffff', trim: '#7fc2d8', inner: '#d6f0f7' },
  play: { wall: '#ffd6e3', paper: () => starTexture2('#ffd6e3', '#ffeef4', [10, 6]), wainscot: '#c9f2d6', trim: '#ffffff', inner: '#ffe3ec' },
  hall: { wall: '#e9d8c4', paper: () => stripeTexture('#efe1cf', '#e4d1bb', [16, 1]), wainscot: '#b9825a', trim: '#ffffff', inner: '#f2e6d6' },
  study: { wall: '#7fae94', paper: () => stripeTexture('#86b59b', '#79a78d', [12, 1]), wainscot: '#5b3b2b', trim: '#e8d6b5', inner: '#94c0a8' },
  garage: { wall: '#c9ccd6', paper: () => tileTexture('#cdd0da', '#bfc3ce', [10, 4]), wainscot: '#8e95a8', trim: '#ffd23f', inner: '#d6d9e2' },
  mart: { wall: '#eaf4ff', paper: () => stripeTexture('#eef6ff', '#e2effc', [20, 1]), wainscot: '#5ec4c9', trim: '#ffffff', inner: '#f4faff' },
  steel: { wall: '#9aa6bd', paper: () => tileTexture('#a3aec4', '#8f9ab2', [8, 4]), wainscot: '#4a5268', trim: '#ffd23f', inner: '#b3bdd1' },
};

interface FloorStyle { tex: (w: number, d: number) => THREE.Texture | undefined; color: string; slab: string }
const FLOORS: Record<FloorKind, FloorStyle> = {
  wood: { tex: (w, d) => plankTexture('#e7b07a', '#c98d5a', [w / 2.6, d / 2.6]), color: '#e7b07a', slab: '#c98d5a' },
  checker: { tex: (w, d) => checkerTexture('#f7f3ea', '#7fb8d8', [w * 0.75, d * 0.72]), color: '#f7f3ea', slab: '#7fb8d8' },
  lilac: { tex: (w, d) => plankTexture('#c9a0dc', '#a882c4', [w / 2.6, d / 2.6]), color: '#c9a0dc', slab: '#a882c4' },
  tile: { tex: (w, d) => tileTexture('#ffffff', '#cfe3ee', [w * 0.9, d * 0.9]), color: '#ffffff', slab: '#8fc3d8' },
  playmat: { tex: (w, d) => matTexture([w / 2, d / 2]), color: '#ffe08a', slab: '#f2a65a' },
  darkwood: { tex: (w, d) => plankTexture('#a8714a', '#865636', [w / 2.6, d / 2.6]), color: '#a8714a', slab: '#6e452b' },
  herring: { tex: (w, d) => plankTexture('#d9a877', '#b98757', [w / 1.6, d / 2.6]), color: '#d9a877', slab: '#a8774c' },
  concrete: { tex: (w, d) => tileTexture('#d9d6d0', '#c9c5bd', [w / 3, d / 3]), color: '#d9d6d0', slab: '#a8a49c' },
  marttile: { tex: (w, d) => checkerTexture('#ffffff', '#e4eef7', [w / 1.4, d / 1.4]), color: '#ffffff', slab: '#9fb8d0' },
};

export interface RoomDef {
  id: string;
  name: string;
  x0: number; x1: number; z0: number; z1: number;
  floor: FloorKind;
  wall: WallKind;
}

export interface HouseSpec {
  rooms: RoomDef[];
  /** exterior wall height */
  h?: number;
  /** interior wall height */
  innerH?: number;
  /** door gaps in interior walls: a point on the wall + gap width */
  doors?: { x: number; z: number; w?: number }[];
  /** base colour under the diorama */
  base?: string;
}

export interface HouseInfo {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  h: number;
  rooms: Record<string, RoomDef & { cx: number; cz: number }>;
}

type Seg = { a: number; b: number };
const EPS = 0.01;

function subtract(segs: Seg[], cut: Seg): Seg[] {
  const out: Seg[] = [];
  for (const s of segs) {
    if (cut.b <= s.a + EPS || cut.a >= s.b - EPS) { out.push(s); continue; }
    if (cut.a > s.a + EPS) out.push({ a: s.a, b: cut.a });
    if (cut.b < s.b - EPS) out.push({ a: cut.b, b: s.b });
  }
  return out;
}

function overlap(a0: number, a1: number, b0: number, b1: number): Seg | null {
  const a = Math.max(a0, b0), b = Math.min(a1, b1);
  return b - a > EPS ? { a, b } : null;
}

export function buildHouse(b: Builder, spec: HouseSpec): HouseInfo {
  const H = spec.h ?? 7;
  const IH = spec.innerH ?? 1.7;
  const rooms = spec.rooms;
  const env = new THREE.Group();
  const minX = Math.min(...rooms.map((r) => r.x0)), maxX = Math.max(...rooms.map((r) => r.x1));
  const minZ = Math.min(...rooms.map((r) => r.z0)), maxZ = Math.max(...rooms.map((r) => r.z1));

  // ---------------- floors & diorama slab ----------------
  for (const r of rooms) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const fs = FLOORS[r.floor];
    const tex = fs.tex(w, d);
    env.add(mesh(plane(w, d), tex ? M('#ffffff', { map: tex }) : M(fs.color), { rot: [-Math.PI / 2, 0, 0], pos: [(r.x0 + r.x1) / 2, 0, (r.z0 + r.z1) / 2], shadow: false }));
    env.add(mesh(box(w + 0.02, 0.45, d + 0.02, 0.01), M(fs.slab), { pos: [(r.x0 + r.x1) / 2, -0.23, (r.z0 + r.z1) / 2], shadow: false }));
  }
  const base = spec.base ?? '#8e6a8f';
  env.add(mesh(box(maxX - minX + T + 0.5, 1.1, maxZ - minZ + T + 0.5, 0.15), M(base), { pos: [(minX + maxX) / 2 - T / 2, -0.98, (minZ + maxZ) / 2 - T / 2], shadow: false }));

  // ---------------- walls ----------------
  const solids: ColDef[] = [];
  const invis: ColDef[] = [];
  const interior: { axis: 'x' | 'z'; at: number; seg: Seg; styleA: WallStyle; styleB: WallStyle }[] = [];

  for (const r of rooms) {
    const st = WALLS[r.wall];
    // back edge (z = z0), runs along x
    let back: Seg[] = [{ a: r.x0, b: r.x1 }];
    for (const o of rooms) if (o !== r && Math.abs(o.z1 - r.z0) < EPS) {
      const ov = overlap(r.x0, r.x1, o.x0, o.x1);
      if (ov) { back = subtract(back, ov); interior.push({ axis: 'x', at: r.z0, seg: ov, styleA: WALLS[o.wall], styleB: st }); }
    }
    for (const s of back) {
      const extL = Math.abs(s.a - r.x0) < EPS ? T : 0;
      exteriorWall(env, solids, 'x', r.z0, { a: s.a - extL, b: s.b }, H, st);
    }
    // left edge (x = x0), runs along z
    let left: Seg[] = [{ a: r.z0, b: r.z1 }];
    for (const o of rooms) if (o !== r && Math.abs(o.x1 - r.x0) < EPS) {
      const ov = overlap(r.z0, r.z1, o.z0, o.z1);
      if (ov) { left = subtract(left, ov); interior.push({ axis: 'z', at: r.x0, seg: ov, styleA: WALLS[o.wall], styleB: st }); }
    }
    for (const s of left) exteriorWall(env, solids, 'z', r.x0, s, H, st);
    // open front (z1) / right (x1) edges get invisible walls
    let front: Seg[] = [{ a: r.x0, b: r.x1 }];
    for (const o of rooms) if (o !== r && Math.abs(o.z0 - r.z1) < EPS) { const ov = overlap(r.x0, r.x1, o.x0, o.x1); if (ov) front = subtract(front, ov); }
    for (const s of front) invis.push({ shape: 'box', hx: (s.b - s.a) / 2 + 0.3, hy: H / 2 + 3, hz: 0.3, at: [(s.a + s.b) / 2, H / 2 + 3, r.z1 + 0.3] });
    let right: Seg[] = [{ a: r.z0, b: r.z1 }];
    for (const o of rooms) if (o !== r && Math.abs(o.x0 - r.x1) < EPS) { const ov = overlap(r.z0, r.z1, o.z0, o.z1); if (ov) right = subtract(right, ov); }
    for (const s of right) invis.push({ shape: 'box', hx: 0.3, hy: H / 2 + 3, hz: (s.b - s.a) / 2 + 0.3, at: [r.x1 + 0.3, H / 2 + 3, (s.a + s.b) / 2] });
  }

  // interior walls with door gaps
  for (const iw of interior) {
    let segs: Seg[] = [iw.seg];
    for (const d of spec.doors ?? []) {
      const along = iw.axis === 'x' ? d.x : d.z;
      const across = iw.axis === 'x' ? d.z : d.x;
      if (Math.abs(across - iw.at) > 0.6) continue;
      const w = d.w ?? 1.9;
      const gap = { a: along - w / 2, b: along + w / 2 };
      if (gap.b < iw.seg.a || gap.a > iw.seg.b) continue;
      segs = subtract(segs, gap);
      // door frame posts
      for (const p of [gap.a, gap.b]) if (p > iw.seg.a + 0.05 && p < iw.seg.b - 0.05) {
        const x = iw.axis === 'x' ? p : iw.at, z = iw.axis === 'x' ? iw.at : p;
        env.add(mesh(box(0.3, IH + 0.25, 0.3, 0.05), M('#ffffff'), { pos: [x, (IH + 0.25) / 2, z] }));
      }
    }
    for (const s of segs) interiorWall(env, solids, iw.axis, iw.at, s, IH, iw.styleA, iw.styleB);
  }

  env.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.receiveShadow = true; });
  b.deco(env);

  // ---------------- physics ----------------
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
  b.solid(null, [{ shape: 'box', hx: (maxX - minX) / 2 + 3, hy: 0.5, hz: (maxZ - minZ) / 2 + 3, at: [cx, -0.5, cz] }], [0, 0, 0], 0, { friction: 0.75, restitution: 0.1 });
  if (solids.length) b.solid(null, solids, [0, 0, 0], 0, { friction: 0.4, restitution: 0.2 });
  invis.push({ shape: 'box', hx: (maxX - minX) / 2 + 1, hy: 0.3, hz: (maxZ - minZ) / 2 + 1, at: [cx, H + 3.3, cz] });
  b.invisible(invis, [0, 0, 0]);

  const g = b.game;
  g.floorY = 0;
  g.roomBounds = { minX, maxX, minZ, maxZ };
  g.wallH = H;
  g.framePoints = [
    new THREE.Vector3(minX - T, H + 0.1, minZ - T),
    new THREE.Vector3(maxX, H + 0.1, minZ - T),
    new THREE.Vector3(minX - T, H + 0.1, maxZ),
    new THREE.Vector3(minX - T * 0.5, -0.6, maxZ),
    new THREE.Vector3(maxX, -0.6, maxZ),
    new THREE.Vector3(maxX, -0.6, minZ - T * 0.5),
  ];
  const info: HouseInfo = { bounds: { minX, maxX, minZ, maxZ }, h: H, rooms: {} };
  for (const r of rooms) info.rooms[r.id] = { ...r, cx: (r.x0 + r.x1) / 2, cz: (r.z0 + r.z1) / 2 };
  g.roomLabels = rooms.length > 1 ? rooms.map((r) => ({ name: r.name, pos: new THREE.Vector3((r.x0 + r.x1) / 2, 0.05, (r.z0 + r.z1) / 2) })) : [];
  return info;
}

function exteriorWall(env: THREE.Group, solids: ColDef[], axis: 'x' | 'z', at: number, s: Seg, H: number, st: WallStyle) {
  const len = s.b - s.a, mid = (s.a + s.b) / 2;
  const P = (along: number, y: number, off: number): [number, number, number] => (axis === 'x' ? [along, y, at + off] : [at + off, y, along]);
  const S = (l: number, h: number, t: number): [number, number, number] => (axis === 'x' ? [l, h, t] : [t, h, l]);
  const rotY = axis === 'x' ? 0 : Math.PI / 2;
  const geo = (l: number, h: number, t: number, bev = 0) => { const s3 = S(l, h, t); return box(s3[0], s3[1], s3[2], bev); };
  env.add(mesh(geo(len, H, T), M(st.wall), { pos: P(mid, H / 2, -T / 2) }));
  const paperLen = axis === 'x' ? len : len;
  if (st.paper) {
    const tex = st.paper();
    if (tex) {
      const t2 = tex.clone();
      t2.repeat.set((tex.repeat.x * paperLen) / 8, tex.repeat.y);
      t2.needsUpdate = true;
      env.add(mesh(plane(paperLen, H - 1.7), M('#ffffff', { map: t2 }), { pos: P(mid, 1.7 + (H - 1.7) / 2, 0.005), rot: [0, rotY, 0], shadow: false }));
    }
  }
  env.add(mesh(geo(len, 1.7, 0.06), M(st.wainscot), { pos: P(mid, 0.85, 0.03), shadow: false }));
  env.add(mesh(geo(len, 0.12, 0.14, 0.02), M(st.trim), { pos: P(mid, 1.72, 0.07), shadow: false }));
  env.add(mesh(geo(len, 0.25, 0.12, 0.02), M(st.trim), { pos: P(mid, 0.125, 0.06), shadow: false }));
  env.add(mesh(geo(len + 0.06, 0.12, T + 0.06, 0.02), M('#ffffff'), { pos: P(mid, H + 0.06, -T / 2), shadow: false }));
  const sz = S(len / 2, H / 2 + 2, T / 2);
  solids.push({ shape: 'box', hx: sz[0], hy: sz[1], hz: sz[2], at: P(mid, H / 2 + 2, -T / 2) });
}

function interiorWall(env: THREE.Group, solids: ColDef[], axis: 'x' | 'z', at: number, s: Seg, IH: number, a: WallStyle, b2: WallStyle) {
  const len = s.b - s.a, mid = (s.a + s.b) / 2;
  if (len < 0.05) return;
  const P = (along: number, y: number, off = 0): [number, number, number] => (axis === 'x' ? [along, y, at + off] : [at + off, y, along]);
  const S = (l: number, h: number, t: number): [number, number, number] => (axis === 'x' ? [l, h, t] : [t, h, l]);
  const sz = S(len, IH, IT);
  env.add(mesh(box(sz[0], sz[1], sz[2], 0.02), M(a.inner), { pos: P(mid, IH / 2) }));
  const cap = S(len + 0.02, 0.1, IT + 0.08);
  env.add(mesh(box(cap[0], cap[1], cap[2], 0.02), M('#ffffff'), { pos: P(mid, IH + 0.05) }));
  for (const [side, st] of [[-1, a], [1, b2]] as const) {
    const bb = S(len, 0.22, 0.06);
    env.add(mesh(box(bb[0], bb[1], bb[2], 0), M(st.trim), { pos: P(mid, 0.11, side * (IT / 2 + 0.03)), shadow: false }));
  }
  const hz = S(len / 2, IH / 2, IT / 2);
  solids.push({ shape: 'box', hx: hz[0], hy: hz[1], hz: hz[2], at: P(mid, IH / 2) });
}

/* ------------------------------------------------------------------ */
/* decor helpers (absolute coordinates)                                 */
/* ------------------------------------------------------------------ */

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

/** place a decor group flat against a back wall (z) or left wall (x) */
function onWall(g: THREE.Group, wall: { z?: number; x?: number }, along: number, y: number) {
  if (wall.z !== undefined) { g.position.set(along, y, wall.z + 0.01); }
  else { g.position.set(wall.x! + 0.01, y, along); g.rotation.y = Math.PI / 2; }
}

export function windowOn(b: Builder, wall: { z?: number; x?: number }, along: number, y: number, w: number, h: number, night: boolean, curtain: string) {
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
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) g.add(mesh(box(0.32, h + 0.4, 0.14, 0.06), M(curtain), { pos: [sx * (w / 2 + 0.15 + i * 0.22), -0.1, 0.3 + (i % 2) * 0.06] }));
  g.add(mesh(cyl(0.05, 0.05, w + 1.8, 6), M('#8e5f3e'), { pos: [0, h / 2 + 0.35, 0.3], rot: [0, 0, Math.PI / 2] }));
  onWall(g, wall, along, y);
  b.deco(g);
  if (wall.z !== undefined) {
    const patch = mesh(plane(w * 0.95, h * 0.9), new THREE.MeshBasicMaterial({ color: night ? '#a9b8ff' : '#fff4c9', transparent: true, opacity: night ? 0.12 : 0.26, depthWrite: false, blending: THREE.AdditiveBlending }), { rot: [-Math.PI / 2, 0, 0.35], pos: [along + 1.0, 0.012, wall.z + h * 0.55], shadow: false, receive: false });
    b.deco(patch);
  }
}

/** a door on an exterior wall – the owner comes in through here */
export function doorOn(b: Builder, wall: { z?: number; x?: number }, along: number, color: string) {
  const g = new THREE.Group();
  const w = 1.8, h = 3.9;
  // built facing +z, then rotated for left walls
  g.add(mesh(box(w, h, 0.08, 0.02), M(color), { pos: [0, h / 2, 0.06] }));
  g.add(mesh(box(w - 0.5, (h - 0.6) * 0.42, 0.1, 0.04), M(color), { pos: [0, h / 2 - 0.6, 0.11] }));
  g.add(mesh(box(w - 0.5, h * 0.35, 0.1, 0.04), M(color), { pos: [0, h * 0.75, 0.11] }));
  g.add(mesh(sphere(0.08, 6, 4), M('#ffd23f'), { pos: [-w / 2 + 0.25, h * 0.48, 0.18] }));
  const fr = M('#ffffff');
  g.add(mesh(box(0.16, h + 0.2, 0.2, 0.03), fr, { pos: [w / 2 + 0.08, (h + 0.2) / 2, 0.08] }));
  g.add(mesh(box(0.16, h + 0.2, 0.2, 0.03), fr, { pos: [-w / 2 - 0.08, (h + 0.2) / 2, 0.08] }));
  g.add(mesh(box(w + 0.32, 0.18, 0.2, 0.03), fr, { pos: [0, h + 0.11, 0.08] }));
  onWall(g, wall, along, 0);
  if (wall.x !== undefined) g.rotation.y = Math.PI / 2;
  b.deco(g);
  const mat = mesh(box(1.6, 0.04, 1.1, 0.02), M('#c9965a'), { pos: wall.z !== undefined ? [along, 0.02, wall.z + 0.75] : [wall.x! + 0.75, 0.02, along], rot: [0, wall.z !== undefined ? 0 : Math.PI / 2, 0], shadow: false });
  b.deco(mat);
}

export function clockOn(b: Builder, wall: { z?: number; x?: number }, along: number, y: number) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.45, 0.45, 0.1, 14), M('#ffffff'), { rot: [Math.PI / 2, 0, 0] }));
  g.add(mesh(cyl(0.5, 0.5, 0.08, 14), M('#3a3d4f'), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, -0.02] }));
  g.add(mesh(box(0.04, 0.3, 0.02, 0), M('#2b2233'), { pos: [0, 0.12, 0.06], shadow: false }));
  g.add(mesh(box(0.22, 0.04, 0.02, 0), M('#2b2233'), { pos: [0.1, 0, 0.06], shadow: false }));
  onWall(g, wall, along, y);
  g.position.add(wall.z !== undefined ? new THREE.Vector3(0, 0, 0.05) : new THREE.Vector3(0.05, 0, 0));
  b.deco(g);
}

export function posterOn(b: Builder, wall: { z?: number; x?: number }, along: number, y: number, w: number, h: number, colors: string[]) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h, 0.03, 0), M(colors[0])));
  g.add(mesh(sphere(Math.min(w, h) * 0.22, 8, 6), M(colors[1]), { pos: [w * 0.1, h * 0.12, 0.02], scale: [1, 1, 0.15], shadow: false }));
  g.add(mesh(box(w * 0.7, h * 0.12, 0.02, 0), M(colors[2]), { pos: [0, -h * 0.3, 0.02], shadow: false }));
  onWall(g, wall, along, y);
  g.position.add(wall.z !== undefined ? new THREE.Vector3(0, 0, 0.03) : new THREE.Vector3(0.03, 0, 0));
  b.deco(g);
}

export function rug(b: Builder, x: number, z: number, w: number, d: number, colors: [string, string, string], rot = 0) {
  const tex = rugTexture(colors[0], colors[1], colors[2]);
  b.deco(mesh(box(w, 0.04, d, 0.02), tex ? M('#ffffff', { map: tex }) : M(colors[0]), { pos: [x, 0.02, z], rot: [0, rot, 0], shadow: false }));
}

/* ------------------------------------------------------------------ */
/* static furniture                                                     */
/* ------------------------------------------------------------------ */

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
  return 1.36;
}

export function table(b: Builder, x: number, z: number, w: number, d: number, h: number, color: string, legColor = '#8e5f3e') {
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.2, d, 0.05), M(color), { pos: [0, h - 0.1, 0] }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(0.18, h - 0.2, 0.18, 0.03), M(legColor), { pos: [sx * (w / 2 - 0.25), (h - 0.2) / 2, sz * (d / 2 - 0.25)] }));
  const cols: ColDef[] = [{ shape: 'box', hx: w / 2, hy: 0.1, hz: d / 2, at: [0, h - 0.1, 0] }];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cols.push({ shape: 'box', hx: 0.09, hy: (h - 0.2) / 2, hz: 0.09, at: [sx * (w / 2 - 0.25), (h - 0.2) / 2, sz * (d / 2 - 0.25)] });
  b.solid(g, cols, [x, 0, z]);
  return h;
}

export function cabinet(b: Builder, x: number, z: number, w: number, d: number, h: number, color: string, top = '#ffffff', drawers = 2, rotY = 0) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h - 0.12, d, 0.04), M(color), { pos: [0, (h - 0.12) / 2, 0] }));
  g.add(mesh(box(w + 0.1, 0.12, d + 0.1, 0.03), M(top), { pos: [0, h - 0.06, 0] }));
  for (let i = 0; i < drawers; i++) {
    const dh = (h - 0.3) / drawers;
    g.add(mesh(box(w - 0.25, dh - 0.12, 0.04, 0.02), M(new THREE.Color(color).multiplyScalar(1.08).getStyle()), { pos: [0, 0.12 + dh * (i + 0.5), d / 2 + 0.01] }));
    g.add(mesh(box(0.3, 0.06, 0.06, 0.02), M('#3a3d4f'), { pos: [0, 0.12 + dh * (i + 0.5), d / 2 + 0.05], shadow: false }));
  }
  b.solid(g, [{ shape: 'box', hx: w / 2 + 0.05, hy: h / 2, hz: d / 2 + 0.05, at: [0, h / 2, 0] }], [x, 0, z], rotY);
  return h;
}

/** plain static block with a top colour (counters, crates, steps) */
export function block(b: Builder, x: number, z: number, w: number, d: number, h: number, color: string, top?: string, opts: { restitution?: number } = {}) {
  const g = new THREE.Group();
  g.add(mesh(box(w, h - (top ? 0.12 : 0), d, 0.04), M(color), { pos: [0, (h - (top ? 0.12 : 0)) / 2, 0] }));
  if (top) g.add(mesh(box(w + 0.08, 0.12, d + 0.08, 0.03), M(top), { pos: [0, h - 0.06, 0] }));
  b.solid(g, [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0], restitution: opts.restitution }], [x, 0, z]);
  return h;
}

/** a fixed shelf board on a wall (things rest on it) */
export function wallBoard(b: Builder, x0: number, x1: number, y: number, z: number, d: number, color = '#e0a46d') {
  const w = x1 - x0, x = (x0 + x1) / 2;
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.14, d, 0.03), M(color), { pos: [0, -0.07, 0] }));
  for (const dx of [-w / 2 + 0.3, w / 2 - 0.3]) g.add(mesh(box(0.08, 0.4, d * 0.7, 0.02), M('#3a3d4f'), { pos: [dx, -0.3, -d * 0.15] }));
  b.solid(g, [{ shape: 'box', hx: w / 2, hy: 0.07, hz: d / 2, at: [0, -0.07, 0] }], [x, y, z]);
  return y;
}
