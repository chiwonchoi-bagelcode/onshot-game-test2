import * as THREE from 'three';
import { M, box, cyl, mesh, sphere } from '../render/kit';
import type { Builder } from './Builder';
import type { Game, WaterZone } from '../game/Game';
import type { Prop } from '../game/Prop';
import { cabinet } from './house';

/* ------------------------------------------------------------------ */
/* Chapter 6 (온 집안) helpers: hallway furniture + the aquarium flood. */
/* ------------------------------------------------------------------ */

const _v = new THREE.Vector3();

export interface FloodArea { x0: number; x1: number; z0: number; z1: number; top?: number }

/**
 * Make a breakable aquarium flood the floor: when it shatters, a shallow
 * puddle spreads from the impact point over `area` (usually the hallway).
 * Electronics / paper lying in it short out (dunk → break), light things
 * float, and every item the water reaches joins the aquarium's chain.
 */
export function floodOnBreak(aq: Prop, area: FloodArea) {
  const def = aq.breakable;
  if (!def) return;
  const prev = def.after;
  def.after = (game, p, pos, vel) => {
    prev?.(game, p, pos, vel);
    startFlood(game, p, pos, area);
  };
}

function startFlood(game: Game, src: Prop, pos: THREE.Vector3, area: FloodArea) {
  const top = area.top ?? 0.2;
  const cx = THREE.MathUtils.clamp(pos.x, area.x0 + 0.3, area.x1 - 0.3);
  const cz = THREE.MathUtils.clamp(pos.z, area.z0 + 0.3, area.z1 - 0.3);
  const zone: WaterZone = { x0: cx - 0.3, x1: cx + 0.3, z0: cz - 0.3, z1: cz + 0.3, y0: -0.6, top };
  game.waterZones.push(zone);
  const mat = new THREE.MeshLambertMaterial({ color: '#7fd4ff', transparent: true, opacity: 0.62, emissive: '#2a7fb8', emissiveIntensity: 0.18, depthWrite: false, flatShading: true });
  const sheet = mesh(box(1, 0.05, 1, 0), mat, { shadow: false });
  sheet.position.set(cx, top - 0.09, cz);
  sheet.userData.keep = true;
  game.envGroup.add(sheet);
  const dur = 1.5;
  let t = 0;
  const reached = new Set<number>();
  game.addUpdater((dt) => {
    if (t > dur + 0.6) return;
    t += dt;
    const k = Math.min(1, t / dur);
    const e = 1 - (1 - k) * (1 - k);
    zone.x0 = cx - 0.3 + (area.x0 - cx + 0.3) * e;
    zone.x1 = cx + 0.3 + (area.x1 - cx - 0.3) * e;
    zone.z0 = cz - 0.3 + (area.z0 - cz + 0.3) * e;
    zone.z1 = cz + 0.3 + (area.z1 - cz - 0.3) * e;
    sheet.scale.set(zone.x1 - zone.x0, 1, zone.z1 - zone.z0);
    sheet.position.set((zone.x0 + zone.x1) / 2, top - 0.09, (zone.z0 + zone.z1) / 2);
    // wake everything the water reaches (resting props sleep) and credit the aquarium
    for (const o of game.props) {
      if (!o.alive || !o.isDynamic() || reached.has(o.id)) continue;
      const c = o.center(_v);
      if (c.x < zone.x0 || c.x > zone.x1 || c.z < zone.z0 || c.z > zone.z1 || c.y > top + 0.1) continue;
      reached.add(o.id);
      if (!o.dunked && o.activeSwat !== game.swatIndex) { o.cause = src; o.causeCat = false; o.activeSwat = game.swatIndex; }
      o.body.wakeUp();
    }
    if (!game.headless && Math.random() < 0.5 && k < 1) {
      const a = Math.random() * Math.PI * 2;
      game.puffs.emit({ pos: new THREE.Vector3((zone.x0 + zone.x1) / 2 + Math.cos(a) * (zone.x1 - zone.x0) * 0.4, top, (zone.z0 + zone.z1) / 2 + Math.sin(a) * (zone.z1 - zone.z0) * 0.4), vel: new THREE.Vector3(0, 0.6, 0), life: 0.6, size0: 0.3, size1: 1.0, color: '#e8fbff', alpha: 0.5, drag: 2 });
    }
  });
}

/* ------------------------------ static furniture ------------------------------ */

/** low shoe cabinet / hall console (static); returns its top height */
export function shoeCabinet(b: Builder, x: number, z: number, w: number, d: number, h: number, rotY = 0, color = '#f4efe4', top = '#b9825a') {
  return cabinet(b, x, z, w, d, h, color, top, 2, rotY);
}

/** framed mirror on a back (z) or left (x) wall – decoration only */
export function mirrorOn(b: Builder, wall: { z?: number; x?: number }, along: number, y: number, w = 1.2, h = 1.7) {
  const g = new THREE.Group();
  g.add(mesh(box(w + 0.2, h + 0.2, 0.08, 0.05), M('#d9a35a')));
  g.add(mesh(box(w, h, 0.02, 0), new THREE.MeshLambertMaterial({ color: '#d6f3ff', emissive: '#8fd0ee', emissiveIntensity: 0.35 }), { pos: [0, 0, 0.05], shadow: false }));
  if (wall.z !== undefined) g.position.set(along, y, wall.z + 0.06);
  else { g.position.set(wall.x! + 0.06, y, along); g.rotation.y = Math.PI / 2; }
  b.deco(g);
}

/** a row of wall hooks with hats/bags (decor) */
export function hooksOn(b: Builder, wall: { z?: number; x?: number }, along: number, y: number, n = 3) {
  const g = new THREE.Group();
  g.add(mesh(box(0.5 + n * 0.55, 0.16, 0.08, 0.03), M('#8e5f3e')));
  const cols = ['#ffd23f', '#4f86c6', '#ff8fa3', '#5bb98c'];
  for (let i = 0; i < n; i++) {
    const x = (i - (n - 1) / 2) * 0.55;
    g.add(mesh(cyl(0.03, 0.03, 0.2, 5), M('#3a3d4f'), { pos: [x, -0.05, 0.12], rot: [Math.PI / 2, 0, 0] }));
    if (i % 2 === 0) g.add(mesh(sphere(0.22, 8, 5), M(cols[i % cols.length]), { pos: [x, -0.25, 0.18], scale: [1, 0.6, 1] }));
    else g.add(mesh(box(0.34, 0.42, 0.12, 0.06), M(cols[i % cols.length]), { pos: [x, -0.35, 0.16] }));
  }
  if (wall.z !== undefined) g.position.set(along, y, wall.z + 0.04);
  else { g.position.set(wall.x! + 0.04, y, along); g.rotation.y = Math.PI / 2; }
  b.deco(g);
}

/** entrance floor tiles (a slightly sunken 현관 area) – decor only */
export function entranceTiles(b: Builder, x0: number, x1: number, z0: number, z1: number) {
  const g = new THREE.Group();
  const w = x1 - x0, d = z1 - z0;
  g.add(mesh(box(w, 0.03, d, 0.01), M('#d8d2c8'), { pos: [0, 0.015, 0], shadow: false }));
  for (let i = 1; i < Math.round(w / 0.8); i++) g.add(mesh(box(0.03, 0.035, d, 0), M('#bdb5a8'), { pos: [-w / 2 + i * (w / Math.round(w / 0.8)), 0.018, 0], shadow: false }));
  for (let i = 1; i < Math.round(d / 0.8); i++) g.add(mesh(box(w, 0.035, 0.03, 0), M('#bdb5a8'), { pos: [0, 0.018, -d / 2 + i * (d / Math.round(d / 0.8))], shadow: false }));
  g.position.set((x0 + x1) / 2, 0, (z0 + z1) / 2);
  b.deco(g);
}

/** a tall static fridge (5.8 high) */
export function fridge(b: Builder, x: number, z: number, rotY = 0, w = 1.9, d = 1.7, h = 5.8) {
  const fg = new THREE.Group();
  fg.add(mesh(box(w, h, d, 0.2), M('#f4f6fb'), { pos: [0, h / 2, 0] }));
  fg.add(mesh(box(w - 0.1, 0.04, 0.05, 0), M('#c9ccd8'), { pos: [0, h * 0.62, d / 2 + 0.01], shadow: false }));
  for (const y of [h * 0.45, h * 0.75]) fg.add(mesh(box(0.1, 0.8, 0.12, 0.03), M('#c9ccd8'), { pos: [w / 2 - 0.25, y, d / 2 + 0.06] }));
  for (const [mx, my, c] of [[-0.4, 4.6, '#ff6b6b'], [0.2, 4.2, '#ffd23f'], [-0.2, 2.6, '#5bb98c']] as const) fg.add(mesh(box(0.25, 0.25, 0.05, 0.03), M(c), { pos: [mx, my, d / 2 + 0.03], shadow: false }));
  b.solid(fg, [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }], [x, 0, z], rotY);
  return h;
}

/**
 * Work-around: TrailSpecial's ribbon geometry (specials.ts) has no normal attribute, so its
 * Lambert material renders black. Give this prop's trail an up-facing normal buffer.
 */
export function fixTrailNormals(p: Prop) {
  const geo = (p.special as unknown as { geo?: THREE.BufferGeometry }).geo;
  if (!geo || geo.getAttribute('normal')) return;
  const n = new Float32Array(geo.getAttribute('position').count * 3);
  // the ribbon is wound facing down; DoubleSide flips back-face normals, so -y lights the top side
  for (let i = 1; i < n.length; i += 3) n[i] = -1;
  geo.setAttribute('normal', new THREE.BufferAttribute(n, 3));
}
