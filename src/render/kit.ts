import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';

/* ------------------------------------------------------------------ */
/* Shared materials & geometry helpers for the low-poly diorama look.  */
/* Everything is cached so many props share GPU resources.             */
/* ------------------------------------------------------------------ */

const matCache = new Map<string, THREE.Material>();

export interface MatOpts {
  emissive?: number | string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  map?: THREE.Texture;
  side?: THREE.Side;
  flat?: boolean;
}

export function M(color: number | string, o: MatOpts = {}): THREE.MeshLambertMaterial {
  const key = `${color}|${o.emissive ?? ''}|${o.emissiveIntensity ?? ''}|${o.transparent ? o.opacity : ''}|${o.map?.uuid ?? ''}|${o.side ?? ''}|${o.flat ?? true}`;
  let m = matCache.get(key) as THREE.MeshLambertMaterial | undefined;
  if (!m) {
    m = new THREE.MeshLambertMaterial({
      color: new THREE.Color(color as THREE.ColorRepresentation),
      flatShading: o.flat ?? true,
      emissive: new THREE.Color((o.emissive ?? 0x000000) as THREE.ColorRepresentation),
      emissiveIntensity: o.emissiveIntensity ?? 1,
      transparent: !!o.transparent,
      opacity: o.opacity ?? 1,
      map: o.map ?? null,
      side: o.side ?? THREE.FrontSide,
    });
    if (o.transparent) m.depthWrite = false;
    matCache.set(key, m);
  }
  return m;
}

const basicCache = new Map<string, THREE.MeshBasicMaterial>();
export function B(color: number | string, opacity = 1): THREE.MeshBasicMaterial {
  const key = `${color}|${opacity}`;
  let m = basicCache.get(key);
  if (!m) {
    m = new THREE.MeshBasicMaterial({ color: new THREE.Color(color as THREE.ColorRepresentation), transparent: opacity < 1, opacity });
    if (opacity < 1) m.depthWrite = false;
    basicCache.set(key, m);
  }
  return m;
}

const geoCache = new Map<string, THREE.BufferGeometry>();
function cached<T extends THREE.BufferGeometry>(key: string, make: () => T): T {
  let g = geoCache.get(key) as T | undefined;
  if (!g) { g = make(); geoCache.set(key, g); }
  return g;
}

const r3 = (n: number) => Math.round(n * 1000) / 1000;

/** Chamfered box – reads as "toy-like" under flat shading. Centered at origin. */
export function box(w: number, h: number, d: number, bevel = 0.06): THREE.BufferGeometry {
  const key = `box|${r3(w)}|${r3(h)}|${r3(d)}|${r3(bevel)}`;
  return cached(key, () => {
    const hx = w / 2, hy = h / 2, hz = d / 2;
    const b = Math.min(bevel, hx * 0.45, hy * 0.45, hz * 0.45);
    if (b <= 0.001) return new THREE.BoxGeometry(w, h, d);
    const pts: THREE.Vector3[] = [];
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) {
      pts.push(new THREE.Vector3(sx * (hx - b), sy * hy, sz * (hz - b)));
      pts.push(new THREE.Vector3(sx * hx, sy * (hy - b), sz * (hz - b)));
      pts.push(new THREE.Vector3(sx * (hx - b), sy * (hy - b), sz * hz));
    }
    return new ConvexGeometry(pts);
  });
}

export function cyl(rTop: number, rBot: number, h: number, seg = 10): THREE.BufferGeometry {
  return cached(`cyl|${r3(rTop)}|${r3(rBot)}|${r3(h)}|${seg}`, () => new THREE.CylinderGeometry(rTop, rBot, h, seg, 1));
}

export function cone(r: number, h: number, seg = 8): THREE.BufferGeometry {
  return cached(`cone|${r3(r)}|${r3(h)}|${seg}`, () => new THREE.ConeGeometry(r, h, seg, 1));
}

export function ball(r: number, detail = 1): THREE.BufferGeometry {
  return cached(`ball|${r3(r)}|${detail}`, () => new THREE.IcosahedronGeometry(r, detail));
}

export function sphere(r: number, ws = 10, hs = 7): THREE.BufferGeometry {
  return cached(`sph|${r3(r)}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs));
}

export function torus(r: number, tube: number, rs = 6, ts = 12, arc = Math.PI * 2): THREE.BufferGeometry {
  return cached(`tor|${r3(r)}|${r3(tube)}|${rs}|${ts}|${r3(arc)}`, () => new THREE.TorusGeometry(r, tube, rs, ts, arc));
}

/** Lathe from [radius, y] pairs (y from bottom up). */
export function lathe(profile: [number, number][], seg = 10): THREE.BufferGeometry {
  const key = `lathe|${seg}|${profile.map((p) => p.map(r3).join(',')).join(';')}`;
  return cached(key, () => new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg));
}

export function plane(w: number, h: number): THREE.BufferGeometry {
  return cached(`plane|${r3(w)}|${r3(h)}`, () => new THREE.PlaneGeometry(w, h));
}

export function circle(r: number, seg = 16): THREE.BufferGeometry {
  return cached(`circ|${r3(r)}|${seg}`, () => new THREE.CircleGeometry(r, seg));
}

export interface MeshOpts {
  pos?: [number, number, number];
  rot?: [number, number, number];
  scale?: [number, number, number] | number;
  shadow?: boolean;
  receive?: boolean;
}

export function mesh(geo: THREE.BufferGeometry, mat: THREE.Material, o: MeshOpts = {}): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  if (o.pos) m.position.set(o.pos[0], o.pos[1], o.pos[2]);
  if (o.rot) m.rotation.set(o.rot[0], o.rot[1], o.rot[2]);
  if (o.scale !== undefined) {
    if (typeof o.scale === 'number') m.scale.setScalar(o.scale);
    else m.scale.set(o.scale[0], o.scale[1], o.scale[2]);
  }
  m.castShadow = o.shadow ?? true;
  m.receiveShadow = o.receive ?? true;
  return m;
}

/* ------------------------------ textures ----------------------------- */

const texCache = new Map<string, THREE.Texture>();

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void, repeat: [number, number] = [1, 1]): THREE.Texture | undefined {
  if (typeof document === 'undefined') return undefined;
  let t = texCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat[0], repeat[1]);
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

export function plankTexture(base: string, line: string, repeat: [number, number]) {
  return canvasTex(`plank|${base}|${line}|${repeat}`, 256, 256, (c) => {
    c.fillStyle = base; c.fillRect(0, 0, 256, 256);
    const rows = 4;
    for (let i = 0; i < rows; i++) {
      const y = (i * 256) / rows;
      c.fillStyle = i % 2 ? 'rgba(0,0,0,0.035)' : 'rgba(255,255,255,0.035)';
      c.fillRect(0, y, 256, 256 / rows);
      c.fillStyle = line; c.fillRect(0, y, 256, 3);
      const off = (i * 97) % 256;
      c.fillRect(off, y, 3, 256 / rows);
      c.fillRect((off + 128) % 256, y, 3, 256 / rows);
    }
  }, repeat);
}

export function checkerTexture(a: string, b: string, repeat: [number, number]) {
  return canvasTex(`check|${a}|${b}|${repeat}`, 128, 128, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 128, 128);
    c.fillStyle = b; c.fillRect(0, 0, 64, 64); c.fillRect(64, 64, 64, 64);
    c.strokeStyle = 'rgba(0,0,0,0.06)'; c.lineWidth = 2; c.strokeRect(0, 0, 128, 128); c.strokeRect(0, 0, 64, 64); c.strokeRect(64, 64, 64, 64);
  }, repeat);
}

export function stripeTexture(a: string, b: string, repeat: [number, number]) {
  return canvasTex(`stripe|${a}|${b}|${repeat}`, 64, 64, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 64, 64);
    c.fillStyle = b; c.fillRect(0, 0, 22, 64);
  }, repeat);
}

export function dotTexture(a: string, b: string, repeat: [number, number]) {
  return canvasTex(`dot|${a}|${b}|${repeat}`, 64, 64, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 64, 64);
    c.fillStyle = b;
    for (const [x, y] of [[16, 16], [48, 48]]) { c.beginPath(); c.arc(x, y, 5, 0, Math.PI * 2); c.fill(); }
  }, repeat);
}

export function rugTexture(a: string, b: string, cdot: string) {
  return canvasTex(`rug|${a}|${b}|${cdot}`, 256, 256, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = b; c.lineWidth = 14; c.strokeRect(18, 18, 220, 220);
    c.lineWidth = 5; c.strokeRect(42, 42, 172, 172);
    c.fillStyle = cdot;
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      c.beginPath(); c.arc(76 + i * 35, 76 + j * 35, 7, 0, Math.PI * 2); c.fill();
    }
  });
}

export function screenTexture(kind: 'tv' | 'laptop' | 'broken') {
  return canvasTex(`screen|${kind}`, 128, 96, (c) => {
    if (kind === 'broken') {
      c.fillStyle = '#16161e'; c.fillRect(0, 0, 128, 96);
      c.strokeStyle = '#d8e4ff'; c.lineWidth = 2;
      const cx = 70, cy = 40;
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        c.beginPath(); c.moveTo(cx, cy);
        c.lineTo(cx + Math.cos(a) * 30, cy + Math.sin(a) * 22);
        c.lineTo(cx + Math.cos(a + 0.2) * 80, cy + Math.sin(a + 0.2) * 70);
        c.stroke();
      }
      return;
    }
    const g = c.createLinearGradient(0, 0, 0, 96);
    if (kind === 'tv') { g.addColorStop(0, '#7fd3ff'); g.addColorStop(1, '#b9f0c9'); }
    else { g.addColorStop(0, '#e8f0ff'); g.addColorStop(1, '#c6d6ff'); }
    c.fillStyle = g; c.fillRect(0, 0, 128, 96);
    if (kind === 'tv') {
      c.fillStyle = '#ffe28a'; c.beginPath(); c.arc(96, 26, 12, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#5bbf7a'; c.beginPath(); c.moveTo(0, 96); c.lineTo(40, 50); c.lineTo(80, 96); c.fill();
      c.fillStyle = '#3e9f63'; c.beginPath(); c.moveTo(50, 96); c.lineTo(95, 58); c.lineTo(128, 96); c.fill();
    } else {
      c.fillStyle = '#5470c9'; c.fillRect(8, 8, 112, 10);
      c.fillStyle = '#9aa9d8';
      for (let i = 0; i < 6; i++) c.fillRect(12, 28 + i * 10, 40 + ((i * 37) % 60), 4);
    }
  });
}

export function softDotTexture() {
  return canvasTex('softdot', 64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.75)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
}

export function starTexture() {
  return canvasTex('star4', 64, 64, (c) => {
    c.fillStyle = '#fff';
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 7 : 31;
      c.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r);
    }
    c.fill();
  });
}

export function tileTexture(a: string, grout: string, repeat: [number, number]) {
  return canvasTex(`tile|${a}|${grout}|${repeat}`, 64, 64, (c) => {
    c.fillStyle = grout; c.fillRect(0, 0, 64, 64);
    c.fillStyle = a; c.fillRect(2, 2, 60, 60);
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(6, 6, 20, 6);
  }, repeat);
}

export function starTexture2(a: string, b: string, repeat: [number, number]) {
  return canvasTex(`stars2|${a}|${b}|${repeat}`, 64, 64, (c) => {
    c.fillStyle = a; c.fillRect(0, 0, 64, 64);
    c.fillStyle = b;
    const star = (x: number, y: number, r: number) => {
      c.beginPath();
      for (let i = 0; i < 10; i++) { const ang = (i / 10) * Math.PI * 2 - Math.PI / 2; const rr = i % 2 ? r * 0.45 : r; c.lineTo(x + Math.cos(ang) * rr, y + Math.sin(ang) * rr); }
      c.fill();
    };
    star(16, 16, 8); star(48, 44, 6);
    c.beginPath(); c.arc(46, 14, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(14, 48, 3, 0, Math.PI * 2); c.fill();
  }, repeat);
}

export function matTexture(repeat: [number, number]) {
  return canvasTex(`mat|${repeat}`, 128, 128, (c) => {
    const cols = ['#ffe08a', '#9fd8cb', '#ffb3c6', '#a9c8ff'];
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
      c.fillStyle = cols[(i + j * 2) % 4]; c.fillRect(i * 64, j * 64, 64, 64);
      c.fillStyle = 'rgba(0,0,0,0.06)';
      // puzzle tabs
      c.beginPath(); c.arc(i * 64 + 32, j * 64 + 2, 7, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.arc(i * 64 + 2, j * 64 + 32, 7, 0, Math.PI * 2); c.fill();
    }
    c.strokeStyle = 'rgba(0,0,0,0.08)'; c.lineWidth = 2;
    c.strokeRect(0, 0, 64, 64); c.strokeRect(64, 64, 64, 64); c.strokeRect(64, 0, 64, 64); c.strokeRect(0, 64, 64, 64);
  }, repeat);
}
