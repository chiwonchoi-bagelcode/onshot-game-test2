import * as THREE from 'three';
import { M, box, cone, cyl, mesh, plane, sphere } from '../render/kit';
import type { Builder } from './Builder';
import type { ColDef } from '../game/types';

/* ------------------------------------------------------------------ */
/* The outside world as a diorama: flat ground patches, slopes (the    */
/* heart of "pull the chock and it rolls"), house fronts, shops,       */
/* fences, hedges, trees and lamps. 1 unit ≈ 0.5 m (a person ≈ 3.4).   */
/* ------------------------------------------------------------------ */

export type GroundKind = 'grass' | 'asphalt' | 'sidewalk' | 'concrete' | 'dirt' | 'paving' | 'tile' | 'wood' | 'gravel' | 'rail' | 'deck' | 'metal';

const GROUND: Record<GroundKind, { a: string; b: string; side: string; pattern: 'grass' | 'noise' | 'tiles' | 'planks' | 'joints' | 'grid' }> = {
  grass: { a: '#9bd88a', b: '#8ccc7c', side: '#7a5c48', pattern: 'grass' },
  asphalt: { a: '#6f6c7e', b: '#666377', side: '#4f4c5c', pattern: 'noise' },
  sidewalk: { a: '#e8e2d8', b: '#d9d1c4', side: '#b8ad9c', pattern: 'tiles' },
  concrete: { a: '#ddd8ce', b: '#cec8bd', side: '#aaa293', pattern: 'joints' },
  dirt: { a: '#c9a27a', b: '#bb946c', side: '#8e6a4c', pattern: 'noise' },
  paving: { a: '#f0c9a8', b: '#e3b893', side: '#b88b67', pattern: 'tiles' },
  tile: { a: '#ffffff', b: '#dfe9f0', side: '#b8c8d4', pattern: 'tiles' },
  wood: { a: '#e7b07a', b: '#c98d5a', side: '#a06f45', pattern: 'planks' },
  gravel: { a: '#cfc8c0', b: '#bdb5ac', side: '#9a9188', pattern: 'noise' },
  rail: { a: '#b9a58e', b: '#a8937c', side: '#7c6a58', pattern: 'noise' },
  deck: { a: '#a8b3c4', b: '#97a3b5', side: '#6f7b8e', pattern: 'joints' },
  metal: { a: '#b8c2cf', b: '#a9b4c2', side: '#7f8a99', pattern: 'grid' },
};

const texCache = new Map<string, THREE.Texture>();
function groundTex(kind: GroundKind, w: number, d: number): THREE.Texture | undefined {
  if (typeof document === 'undefined') return undefined;
  const key = kind;
  let t = texCache.get(key);
  if (!t) {
    const g = GROUND[kind];
    const cv = document.createElement('canvas');
    cv.width = cv.height = 128;
    const c = cv.getContext('2d')!;
    c.fillStyle = g.a; c.fillRect(0, 0, 128, 128);
    c.fillStyle = g.b;
    let s = 7;
    const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    switch (g.pattern) {
      case 'grass':
        for (let i = 0; i < 70; i++) { const x = r() * 128, y = r() * 128; c.fillRect(x, y, 2, 6); }
        c.fillStyle = 'rgba(255,255,255,0.12)';
        for (let i = 0; i < 12; i++) { c.beginPath(); c.arc(r() * 128, r() * 128, 2, 0, Math.PI * 2); c.fill(); }
        break;
      case 'noise':
        for (let i = 0; i < 260; i++) c.fillRect(r() * 128, r() * 128, 2, 2);
        break;
      case 'tiles':
        c.strokeStyle = g.b; c.lineWidth = 3;
        c.strokeRect(1.5, 1.5, 63, 63); c.strokeRect(65.5, 1.5, 61, 63); c.strokeRect(1.5, 65.5, 63, 61); c.strokeRect(65.5, 65.5, 61, 61);
        break;
      case 'planks':
        for (let i = 0; i < 4; i++) c.fillRect(0, i * 32, 128, 3);
        break;
      case 'joints':
        c.fillRect(0, 0, 128, 2); c.fillRect(0, 0, 2, 128);
        for (let i = 0; i < 90; i++) c.fillRect(r() * 128, r() * 128, 1.5, 1.5);
        break;
      case 'grid':
        for (let i = 0; i < 8; i++) { c.fillRect(i * 16, 0, 1.5, 128); c.fillRect(0, i * 16, 128, 1.5); }
        break;
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 4;
    texCache.set(key, t);
  }
  const c = t.clone();
  const unit = GROUND[kind].pattern === 'tiles' ? 2 : GROUND[kind].pattern === 'planks' ? 3 : 4;
  c.repeat.set(w / unit, d / unit);
  c.needsUpdate = true;
  return c;
}

function groundMat(kind: GroundKind, w: number, d: number): THREE.Material {
  const t = groundTex(kind, w, d);
  return t ? M('#ffffff', { map: t }) : M(GROUND[kind].a);
}

export interface Patch { x0: number; x1: number; z0: number; z1: number; kind: GroundKind; y?: number }
/** a slope: height y0 at the low end of `along` (x0 or z0), y1 at the other */
export interface Ramp { x0: number; x1: number; z0: number; z1: number; kind: GroundKind; y0: number; y1: number; along: 'x' | 'z' }

export interface LotSpec {
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  patches: Patch[];
  ramps?: Ramp[];
  /** diorama base colour */
  base?: string;
  /** how tall the tallest thing is (camera framing) */
  height?: number;
  labels?: { name: string; x: number; z: number }[];
}

/** ground and slopes with their physics; sets the game's bounds and camera framing */
export function buildLot(b: Builder, spec: LotSpec) {
  const env = new THREE.Group();
  const cols: ColDef[] = [];
  const { minX, maxX, minZ, maxZ } = spec.bounds;
  for (const p of spec.patches) {
    const w = p.x1 - p.x0, d = p.z1 - p.z0, y = p.y ?? 0;
    const g = GROUND[p.kind];
    env.add(mesh(plane(w, d), groundMat(p.kind, w, d), { rot: [-Math.PI / 2, 0, 0], pos: [(p.x0 + p.x1) / 2, y + 0.002, (p.z0 + p.z1) / 2], shadow: false }));
    const h = y + 0.45;
    env.add(mesh(box(w, h, d, 0.01), M(g.side), { pos: [(p.x0 + p.x1) / 2, y - h / 2, (p.z0 + p.z1) / 2], shadow: false }));
    cols.push({ shape: 'box', hx: w / 2, hy: (y + 1) / 2, hz: d / 2, at: [(p.x0 + p.x1) / 2, (y - 1) / 2, (p.z0 + p.z1) / 2] });
  }
  for (const r of spec.ramps ?? []) {
    const w = r.x1 - r.x0, d = r.z1 - r.z0;
    const len = r.along === 'x' ? w : d;
    const rise = r.y1 - r.y0;
    const ang = Math.atan2(rise, len);
    const slant = Math.hypot(len, rise);
    const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2, cy = (r.y0 + r.y1) / 2;
    const top = new THREE.Group();
    const sw = r.along === 'x' ? slant : w, sd = r.along === 'x' ? d : slant;
    top.add(mesh(plane(sw, sd), groundMat(r.kind, sw, sd), { rot: [-Math.PI / 2, 0, 0], shadow: false }));
    top.position.set(cx, cy + 0.002, cz);
    if (r.along === 'x') top.rotation.z = ang; else top.rotation.x = -ang;
    env.add(top);
    // the earth under the slope (a wedge down to the diorama base)
    env.add(new THREE.Mesh(wedgeGeo(r), M(GROUND[r.kind].side, { side: THREE.DoubleSide })));
    // physics: a thin box tilted along the slope + a filler underneath
    const rot: [number, number, number] = r.along === 'x' ? [0, 0, ang] : [-ang, 0, 0];
    cols.push({ shape: 'box', hx: sw / 2, hy: 0.25, hz: sd / 2, at: [cx - (r.along === 'x' ? Math.sin(ang) * 0.25 * -1 : 0), cy - Math.cos(ang) * 0.25, cz + (r.along === 'z' ? Math.sin(ang) * 0.25 : 0)], rot });
    const low = Math.min(r.y0, r.y1);
    cols.push({ shape: 'box', hx: w / 2, hy: (low + 1) / 2, hz: d / 2, at: [cx, (low - 1) / 2, cz] });
  }
  // diorama slab
  env.add(mesh(box(maxX - minX + 0.6, 1.1, maxZ - minZ + 0.6, 0.15), M(spec.base ?? '#8e6a8f'), { pos: [(minX + maxX) / 2, -1.0, (minZ + maxZ) / 2], shadow: false }));
  env.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.receiveShadow = true; });
  b.deco(env);
  b.solid(null, cols, [0, 0, 0], 0, { friction: 0.75, restitution: 0.1 });
  // catch-all floor far below + soft invisible fence so nothing flies off forever
  const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2, hw = (maxX - minX) / 2, hd = (maxZ - minZ) / 2;
  const H = spec.height ?? 7;
  b.invisible([
    { shape: 'box', hx: 0.3, hy: H, hz: hd + 1, at: [minX - 0.3, H, cz] },
    { shape: 'box', hx: 0.3, hy: H, hz: hd + 1, at: [maxX + 0.3, H, cz] },
    { shape: 'box', hx: hw + 1, hy: H, hz: 0.3, at: [cx, H, minZ - 0.3] },
    { shape: 'box', hx: hw + 1, hy: H, hz: 0.3, at: [cx, H, maxZ + 0.3] },
    { shape: 'box', hx: hw + 1, hy: 0.3, hz: hd + 1, at: [cx, H * 1.6, cz] },
  ], [0, 0, 0]);
  const g = b.game;
  g.floorY = 0;
  g.roomBounds = { minX, maxX, minZ, maxZ };
  g.wallH = H;
  g.framePoints = [
    new THREE.Vector3(minX, H, minZ), new THREE.Vector3(maxX, H, minZ), new THREE.Vector3(minX, H * 0.5, maxZ),
    new THREE.Vector3(minX, -0.6, maxZ), new THREE.Vector3(maxX, -0.6, maxZ), new THREE.Vector3(maxX, -0.6, minZ),
  ];
  g.roomLabels = (spec.labels ?? []).map((l) => ({ name: l.name, pos: new THREE.Vector3(l.x, 0.05, l.z) }));
}

/** solid under a ramp: top follows the slope, bottom at y = -0.45 */
function wedgeGeo(r: Ramp): THREE.BufferGeometry {
  const B = -0.45, e = 0.004;
  const y = (x: number, z: number) => {
    const k = r.along === 'x' ? (x - r.x0) / (r.x1 - r.x0) : (z - r.z0) / (r.z1 - r.z0);
    return r.y0 + (r.y1 - r.y0) * k - e;
  };
  const c = [[r.x0, r.z0], [r.x1, r.z0], [r.x1, r.z1], [r.x0, r.z1]] as const;
  const top = c.map(([x, z]) => [x, y(x, z), z]);
  const bot = c.map(([x, z]) => [x, B, z]);
  const v: number[] = [];
  const quad = (a: number[], b2: number[], c2: number[], d: number[]) => v.push(...a, ...b2, ...c2, ...a, ...c2, ...d);
  quad(top[0], top[3], top[2], top[1]);
  for (let i = 0; i < 4; i++) { const j = (i + 1) % 4; quad(bot[i], bot[j], top[j], top[i]); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  g.computeVertexNormals();
  return g;
}

/* ------------------------------ scenery ------------------------------ */

/** a house front: walls, roof, door, windows. Solid (things bounce off it). */
export function houseFront(b: Builder, o: { x: number; z: number; w: number; d: number; h?: number; y?: number; wall?: string; roof?: string; door?: string; facing?: 'z' | 'x' | '-x' | '-z'; garage?: boolean }) {
  const h = o.h ?? 6, y = o.y ?? 0;
  const g = new THREE.Group();
  const wall = M(o.wall ?? '#fff1d6'), roof = M(o.roof ?? '#e58b7a'), trim = M('#ffffff');
  g.add(mesh(box(o.w, h, o.d, 0.08), wall, { pos: [0, h / 2, 0] }));
  // gable roof
  const roofGeo = new THREE.CylinderGeometry(0.01, (o.w / 2 + 0.6) * Math.SQRT2, 2.6, 4, 1);
  const rm = new THREE.Mesh(roofGeo, roof);
  rm.rotation.y = Math.PI / 4;
  rm.scale.set(1, 1, (o.d + 1.2) / (o.w + 1.2));
  rm.position.set(0, h + 1.3, 0);
  rm.castShadow = true;
  g.add(rm);
  // front details on +z face (rotated for other facings)
  const fz = o.d / 2 + 0.03;
  g.add(mesh(box(1.5, 2.9, 0.1, 0.03), M(o.door ?? '#c98a5a'), { pos: [o.garage ? -o.w / 2 + 1.4 : 0, 1.45, fz] }));
  g.add(mesh(sphere(0.1, 6, 5), M('#ffd23f'), { pos: [(o.garage ? -o.w / 2 + 1.4 : 0) + 0.5, 1.45, fz + 0.06] }));
  for (const wx of o.garage ? [1.2] : [-o.w / 2 + 1.3, o.w / 2 - 1.3]) {
    g.add(mesh(box(1.5, 1.4, 0.08, 0.03), trim, { pos: [wx, 3.8, fz] }));
    g.add(mesh(box(1.25, 1.15, 0.1, 0.02), M('#a8dcf2'), { pos: [wx, 3.8, fz + 0.02] }));
  }
  if (o.garage) g.add(mesh(box(o.w * 0.45, 2.8, 0.12, 0.03), M('#f4efe4'), { pos: [o.w / 2 - o.w * 0.25 - 0.4, 1.4, fz] }));
  const rotY = o.facing === 'x' ? Math.PI / 2 : o.facing === '-x' ? -Math.PI / 2 : o.facing === '-z' ? Math.PI : 0;
  b.solid(g, [{ shape: 'box', hx: o.w / 2, hy: h / 2, hz: o.d / 2, at: [0, h / 2, 0] }], [o.x, y, o.z], rotY, { friction: 0.5, restitution: 0.2 });
}

/** a tall city building block (static scenery with windows) */
export function building(b: Builder, o: { x: number; z: number; w: number; d: number; h: number; color?: string; y?: number; sign?: string; signColor?: string; solid?: boolean }) {
  const g = new THREE.Group();
  const y = o.y ?? 0;
  g.add(mesh(box(o.w, o.h, o.d, 0.08), M(o.color ?? '#c9d6ea'), { pos: [0, o.h / 2, 0] }));
  const rows = Math.max(1, Math.floor((o.h - 1.5) / 2.2));
  const colsN = Math.max(1, Math.floor(o.w / 1.8));
  const win = M('#a8dcf2'), frame = M('#ffffff');
  for (let r = 0; r < rows; r++) for (let c = 0; c < colsN; c++) {
    const wx = -o.w / 2 + (c + 0.5) * (o.w / colsN), wy = 2 + r * 2.2;
    g.add(mesh(box(1.0, 1.2, 0.06, 0.02), frame, { pos: [wx, wy, o.d / 2 + 0.02], shadow: false }));
    g.add(mesh(box(0.82, 1.0, 0.08, 0.01), win, { pos: [wx, wy, o.d / 2 + 0.04], shadow: false }));
  }
  if (o.sign) g.add(mesh(box(Math.min(o.w - 0.6, 4), 0.8, 0.2, 0.05), M(o.signColor ?? '#ff8fa3'), { pos: [0, Math.min(o.h - 0.6, 3.2), o.d / 2 + 0.12] }));
  if (o.solid === false) { g.position.set(o.x, y, o.z); b.deco(g); }
  else b.solid(g, [{ shape: 'box', hx: o.w / 2, hy: o.h / 2, hz: o.d / 2, at: [0, o.h / 2, 0] }], [o.x, y, o.z], 0, { friction: 0.5, restitution: 0.2 });
}

export function fence(b: Builder, o: { x0: number; z0: number; x1: number; z1: number; y?: number; h?: number; color?: string; solid?: boolean }) {
  const g = new THREE.Group();
  const h = o.h ?? 1.3, y = o.y ?? 0;
  const len = Math.hypot(o.x1 - o.x0, o.z1 - o.z0);
  const n = Math.max(2, Math.round(len / 0.6));
  const col = M(o.color ?? '#ffffff');
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    g.add(mesh(box(0.16, h, 0.12, 0.03), col, { pos: [o.x0 + (o.x1 - o.x0) * k, y + h / 2, o.z0 + (o.z1 - o.z0) * k] }));
  }
  const ang = Math.atan2(o.z1 - o.z0, o.x1 - o.x0);
  for (const yy of [h * 0.35, h * 0.8]) {
    const rail = mesh(box(len, 0.12, 0.08, 0.02), col, { pos: [(o.x0 + o.x1) / 2, y + yy, (o.z0 + o.z1) / 2] });
    rail.rotation.y = -ang;
    g.add(rail);
  }
  b.deco(g);
  if (o.solid !== false) b.game.addStatic([{ shape: 'box', hx: len / 2, hy: h / 2, hz: 0.1, at: [0, h / 2, 0] }], [(o.x0 + o.x1) / 2, y, (o.z0 + o.z1) / 2], -ang, { friction: 0.5, restitution: 0.25 });
}

export function hedge(b: Builder, o: { x: number; z: number; w: number; d: number; h?: number; y?: number }) {
  const h = o.h ?? 1.4;
  const g = new THREE.Group();
  g.add(mesh(box(o.w, h, o.d, 0.35), M('#6fbf73'), { pos: [0, h / 2, 0] }));
  for (let i = 0; i < Math.max(2, Math.round(o.w)); i++) g.add(mesh(sphere(0.32, 6, 5), M('#7fd082'), { pos: [-o.w / 2 + 0.4 + i * ((o.w - 0.8) / Math.max(1, Math.round(o.w) - 1)), h, 0] }));
  b.solid(g, [{ shape: 'box', hx: o.w / 2, hy: h / 2, hz: o.d / 2, at: [0, h / 2, 0], restitution: 0.1 }], [o.x, o.y ?? 0, o.z]);
}

export function tree(b: Builder, x: number, z: number, s = 1, y = 0, color = '#7fcf8a') {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.25 * s, 0.32 * s, 2.6 * s, 7), M('#a0714f'), { pos: [0, 1.3 * s, 0] }));
  g.add(mesh(sphere(1.5 * s, 8, 6), M(color), { pos: [0, 3.4 * s, 0] }));
  g.add(mesh(sphere(1.05 * s, 7, 5), M(color), { pos: [0.8 * s, 2.9 * s, 0.4 * s] }));
  g.add(mesh(sphere(1.0 * s, 7, 5), M(color), { pos: [-0.7 * s, 3.0 * s, -0.3 * s] }));
  b.solid(g, [{ shape: 'cyl', hh: 1.3 * s, r: 0.32 * s, at: [0, 1.3 * s, 0] }], [x, y, z], 0, { restitution: 0.3 });
}

export function streetLamp(b: Builder, x: number, z: number, y = 0) {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.1, 0.14, 5.5, 6), M('#5b5f73'), { pos: [0, 2.75, 0] }));
  g.add(mesh(sphere(0.35, 8, 6), M('#fff6c4'), { pos: [0, 5.6, 0] }));
  b.solid(g, [{ shape: 'cyl', hh: 2.75, r: 0.14, at: [0, 2.75, 0] }], [x, y, z]);
}

/** painted road markings (deco) */
export function roadLines(b: Builder, o: { x0: number; x1: number; z: number; y?: number; dash?: boolean; color?: string; along?: 'x' | 'z' }) {
  const g = new THREE.Group();
  const len = o.x1 - o.x0;
  const n = o.dash === false ? 1 : Math.floor(len / 1.6);
  for (let i = 0; i < n; i++) {
    const l = o.dash === false ? len : 0.9;
    const cx = o.dash === false ? (o.x0 + o.x1) / 2 : o.x0 + 0.8 + i * 1.6;
    const m = mesh(plane(o.along === 'z' ? 0.18 : l, o.along === 'z' ? l : 0.18), M(o.color ?? '#ffffff'), { rot: [-Math.PI / 2, 0, 0], pos: o.along === 'z' ? [o.z, (o.y ?? 0) + 0.006, cx] : [cx, (o.y ?? 0) + 0.006, o.z], shadow: false });
    g.add(m);
  }
  b.deco(g);
}

/** a low solid block (curb, step, planter wall, counter) with optional colour */
export function slab(b: Builder, o: { x: number; z: number; w: number; d: number; h: number; y?: number; color?: string; top?: string; rot?: number }) {
  const g = new THREE.Group();
  g.add(mesh(box(o.w, o.h, o.d, 0.05), M(o.color ?? '#d9d1c4'), { pos: [0, o.h / 2, 0] }));
  if (o.top) g.add(mesh(box(o.w + 0.04, 0.08, o.d + 0.04, 0.02), M(o.top), { pos: [0, o.h, 0] }));
  b.solid(g, [{ shape: 'box', hx: o.w / 2, hy: o.h / 2, hz: o.d / 2, at: [0, o.h / 2, 0] }], [o.x, o.y ?? 0, o.z], o.rot ?? 0, { friction: 0.6, restitution: 0.15 });
}

export function flowerBed(b: Builder, x: number, z: number, w: number, d: number, y = 0) {
  const g = new THREE.Group();
  g.add(mesh(box(w, 0.35, d, 0.08), M('#a0714f'), { pos: [0, 0.17, 0] }));
  g.add(mesh(box(w - 0.2, 0.1, d - 0.2, 0.04), M('#6b4a33'), { pos: [0, 0.36, 0] }));
  const cols = ['#ff7aa8', '#ffd23f', '#ffffff', '#b38cff'];
  let k = 0;
  for (let i = 0.4; i < w - 0.3; i += 0.55) for (let j = 0.35; j < d - 0.25; j += 0.5) {
    g.add(mesh(cone(0.12, 0.35, 5), M('#59a85e'), { pos: [-w / 2 + i, 0.5, -d / 2 + j] }));
    g.add(mesh(sphere(0.13, 6, 4), M(cols[k++ % cols.length]), { pos: [-w / 2 + i, 0.72, -d / 2 + j] }));
  }
  b.solid(g, [{ shape: 'box', hx: w / 2, hy: 0.2, hz: d / 2, at: [0, 0.2, 0] }], [x, y, z]);
}
