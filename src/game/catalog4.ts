import * as THREE from 'three';
import { M, box, cyl, mesh, sphere } from '../render/kit';
import type { Builder } from '../levels/Builder';
import type { Worth } from './types';
import type { Prop } from './Prop';
import type { Game, SlickKind } from './Game';
import { RailSwitch, SpillSpecial } from './specials4';
import { WobbleSpecial } from './specials3';
import type { O } from './catalog';

/* ------------------------------------------------------------------ */
/* Phase 2 props: the model kit and its paint, the supermarket, the     */
/* high street, the crossing, the railway, the airport, the base.       */
/* ------------------------------------------------------------------ */

const g = () => new THREE.Group();

/* ------------------------------ the workshop ------------------------------ */

/** a tin of paint: tip it over (or drop it) and it empties into a slippery puddle */
export function paintCan(b: Builder, o: O & { onSpill?: (game: Game, at: THREE.Vector3, by: Prop) => void; kind?: SlickKind; h?: number }): Prop {
  const c = o.color ?? '#ff6b8a';
  const h = o.h ?? 0.62;
  const grp = g();
  grp.add(mesh(cyl(0.26, 0.26, h, 12), M('#dfe3ea'), { pos: [0, h / 2, 0] }));
  grp.add(mesh(cyl(0.265, 0.265, h * 0.5, 12), M('#ffffff'), { pos: [0, h * 0.48, 0], shadow: false }));
  grp.add(mesh(cyl(0.2, 0.2, h * 0.2, 12), M(c), { pos: [0, h * 0.5, 0.08], scale: [1, 1, 0.75], shadow: false }));
  grp.add(mesh(cyl(0.24, 0.24, 0.04, 12), M(c), { pos: [0, h + 0.01, 0], shadow: false }));
  const kind = o.kind ?? 'paint';
  return b.prop({
    kind: 'paintCan', name: o.name ?? '페인트 통', icon: '🪣', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r: 0.26, hh: h / 2, at: [0, h / 2, 0] }],
    mass: 1.6, mat: 'metal', value: o.value ?? 18000, friction: 0.6, restitution: 0.15,
    special: new SpillSpecial({ kind, r: 1.6, mouth: h * 0.9, color: kind === 'paint' ? c : undefined, onSpill: o.onSpill }),
    traits: ['넘어지면 쏟아짐', '웅덩이는 미끄러움'],
  });
}

/**
 * The model kit, three months in the making, on a heavy acrylic display base.
 * Too heavy to shove far by paw — but on something slippery it glides.
 */
export function modelKit(b: Builder, o: O & { worth?: Worth }): Prop {
  const grp = g();
  // display base and acrylic lid
  grp.add(mesh(box(1.5, 0.18, 0.9, 0.04), M('#3b2a4a'), { pos: [0, 0.09, 0] }));
  grp.add(mesh(box(1.3, 0.04, 0.7, 0.01), M('#b8e0c8'), { pos: [0, 0.2, 0], shadow: false }));
  const lid = mesh(box(1.46, 0.95, 0.86, 0.03), M('#e8f8ff', { transparent: true, opacity: 0.28 }), { pos: [0, 0.66, 0], shadow: false });
  lid.userData.glass = true;
  grp.add(lid);
  // the battleship: hull, decks, turrets, the last antenna
  const hullC = M('#9aa3b5');
  grp.add(mesh(box(1.05, 0.16, 0.26, 0.06), hullC, { pos: [0, 0.32, 0] }));
  grp.add(mesh(box(0.7, 0.12, 0.2, 0.03), M('#c8ccd8'), { pos: [-0.02, 0.45, 0] }));
  grp.add(mesh(box(0.22, 0.24, 0.14, 0.02), M('#dfe3ea'), { pos: [0.02, 0.6, 0] }));
  for (const x of [-0.36, -0.2, 0.28]) {
    grp.add(mesh(cyl(0.06, 0.07, 0.07, 8), M('#7f8799'), { pos: [x, 0.54, 0] }));
    grp.add(mesh(box(0.18, 0.025, 0.025, 0), M('#5b5f73'), { pos: [x + 0.09, 0.55, 0] }));
  }
  grp.add(mesh(cyl(0.008, 0.008, 0.3, 4), M('#ffd23f'), { pos: [0.04, 0.85, 0], shadow: false }));
  grp.add(mesh(sphere(0.02, 6, 4), M('#ff5a6e'), { pos: [0.04, 1.0, 0], shadow: false }));
  return b.prop({
    kind: 'kitModel', name: o.name ?? '완성 직전 프라모델', icon: '🚢', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.75, hy: 0.57, hz: 0.45, at: [0, 0.57, 0], round: 0.03 }],
    mass: 6, mat: 'plastic', value: o.value ?? 85000, target: o.target, friction: 0.75, restitution: 0.1,
    worth: o.worth ?? { heart: 2200, owner: '옆집 아저씨', story: '석 달 동안 조립한 전함. 안테나 하나만 남았다' },
    breakable: { threshold: 4.2, hitForce: 1600, mode: 'shatter', fx: 'glass', word: '와장창! 석 달이…', debris: { count: 16, colors: ['#9aa3b5', '#dfe3ea', '#e8f8ff', '#3b2a4a'], size: 0.14 } },
    traits: ['무거운 받침대', '미끄러운 곳에선 쭉 미끄러짐', '💗 정성'],
  });
}

/** a finished little kit for the display cabinet */
export function smallKit(b: Builder, o: O & { type?: 'plane' | 'tank' | 'robot' }): Prop {
  const grp = g();
  const t = o.type ?? 'plane';
  const c = M(o.color ?? '#7fb8ff');
  if (t === 'plane') {
    grp.add(mesh(box(0.55, 0.1, 0.1, 0.03), c, { pos: [0, 0.2, 0] }));
    grp.add(mesh(box(0.12, 0.03, 0.62, 0.01), c, { pos: [0.04, 0.22, 0] }));
    grp.add(mesh(box(0.06, 0.12, 0.2, 0.01), c, { pos: [-0.24, 0.28, 0] }));
  } else if (t === 'tank') {
    grp.add(mesh(box(0.5, 0.14, 0.32, 0.03), c, { pos: [0, 0.1, 0] }));
    grp.add(mesh(cyl(0.1, 0.11, 0.1, 8), c, { pos: [0, 0.22, 0] }));
    grp.add(mesh(box(0.3, 0.03, 0.03, 0), M('#5b5f73'), { pos: [0.15, 0.23, 0] }));
  } else {
    grp.add(mesh(box(0.2, 0.24, 0.14, 0.03), c, { pos: [0, 0.3, 0] }));
    grp.add(mesh(box(0.12, 0.1, 0.1, 0.02), M('#ffffff'), { pos: [0, 0.47, 0] }));
    for (const x of [-0.06, 0.06]) grp.add(mesh(box(0.06, 0.18, 0.08, 0.01), c, { pos: [x, 0.09, 0] }));
  }
  grp.add(mesh(box(0.4, 0.04, 0.3, 0.01), M('#3b2a4a'), { pos: [0, 0.02, 0] }));
  return b.prop({
    kind: 'smallKit', name: o.name ?? '완성 프라모델', icon: '✈️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.22, hy: 0.16, hz: 0.16, at: [0, 0.16, 0] }],
    mass: 0.5, mat: 'plastic', value: o.value ?? 45000, target: o.target, friction: 0.6,
    worth: { heart: 48, owner: '옆집 아저씨' },
    breakable: { threshold: 3.2, mode: 'shatter', fx: 'none', word: '빠직!', debris: { count: 6, colors: ['#7fb8ff', '#dfe3ea'], size: 0.09 } },
  });
}

/** a steel toolbox: heavy, rattles, a good battering ram on a slick */
export function toolbox(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.9, 0.42, 0.42, 0.04), M(o.color ?? '#e05a5a'), { pos: [0, 0.21, 0] }));
  grp.add(mesh(box(0.5, 0.06, 0.06, 0.02), M('#2f3142'), { pos: [0, 0.5, 0] }));
  grp.add(mesh(box(0.92, 0.04, 0.44, 0.01), M('#c94a4a'), { pos: [0, 0.3, 0], shadow: false }));
  return b.prop({
    kind: 'toolbox', name: '공구함', icon: '🧰', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.25, hz: 0.21, at: [0, 0.25, 0] }],
    mass: 4.5, mat: 'metal', value: 60000, friction: 0.6,
    traits: ['무거움'],
  });
}

/** a spray can */
export function sprayCan(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.09, 0.09, 0.4, 8), M(o.color ?? '#5ec4c9'), { pos: [0, 0.2, 0] }));
  grp.add(mesh(cyl(0.05, 0.07, 0.08, 8), M('#ffffff'), { pos: [0, 0.44, 0] }));
  return b.prop({
    kind: 'spray', name: '스프레이', icon: '🧴', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r: 0.09, hh: 0.24, at: [0, 0.24, 0] }],
    mass: 0.35, mat: 'metal', value: 9000, friction: 0.5,
  });
}

/** workbench: a static top with legs and a pegboard of tools on the wall behind */
export function workbench(b: Builder, o: { x0: number; x1: number; z: number; d: number; h: number; wallZ: number }) {
  const w = o.x1 - o.x0, cx = (o.x0 + o.x1) / 2;
  const grp = g();
  grp.add(mesh(box(w, 0.16, o.d, 0.03), M('#c99a5e'), { pos: [0, o.h - 0.08, 0] }));
  for (const x of [-w / 2 + 0.2, w / 2 - 0.2]) for (const z of [-o.d / 2 + 0.15, o.d / 2 - 0.15]) grp.add(mesh(box(0.14, o.h - 0.16, 0.14, 0.02), M('#8e6a4a'), { pos: [x, (o.h - 0.16) / 2, z] }));
  grp.add(mesh(box(w - 0.4, 0.08, o.d - 0.3, 0.02), M('#a87e52'), { pos: [0, 0.4, 0] }));
  b.solid(grp, [{ shape: 'box', hx: w / 2, hy: o.h / 2, hz: o.d / 2, at: [0, o.h / 2, 0] }], [cx, 0, o.z], 0, { friction: 0.75, restitution: 0.1 });
  // pegboard with tool silhouettes (scenery)
  const pb = g();
  pb.add(mesh(box(w * 0.8, 1.8, 0.06, 0.02), M('#e8d2b0'), { pos: [0, 0, 0] }));
  const tools = ['#5b5f73', '#e05a5a', '#4f86c6', '#ffd23f', '#5b5f73'];
  tools.forEach((c, i) => pb.add(mesh(box(0.12, 0.6 + (i % 2) * 0.3, 0.05, 0.02), M(c), { pos: [-w * 0.3 + i * (w * 0.15), 0.1, 0.06], rot: [0, 0, (i - 2) * 0.12] })));
  pb.position.set(cx, o.h + 1.3, o.wallZ + 0.05);
  b.deco(pb);
}

/* ------------------------------ the supermarket ------------------------------ */

/** a static slope along x (moving walkway, loading ramp): height y0 at x0, y1 at x1 */
export function rampX(b: Builder, o: { x0: number; x1: number; y0: number; y1: number; z0: number; z1: number; color?: string; rails?: boolean }) {
  const len = o.x1 - o.x0, rise = o.y1 - o.y0;
  const ang = Math.atan2(rise, len);
  const slant = Math.hypot(len, rise);
  const w = o.z1 - o.z0, cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2, cz = (o.z0 + o.z1) / 2;
  const grp = g();
  const top = mesh(box(slant, 0.12, w, 0.02), M(o.color ?? '#9aa6bd'), { pos: [0, -0.06, 0] });
  top.rotation.z = ang;
  grp.add(top);
  for (let i = 0; i < 8; i++) {
    const k = (i + 0.5) / 8 - 0.5;
    grp.add(mesh(box(0.06, 0.02, w - 0.2, 0), M('#c9d2e3'), { pos: [k * len, k * rise + 0.01, 0], rot: [0, 0, ang], shadow: false }));
  }
  if (o.rails !== false) for (const z of [-w / 2, w / 2]) {
    const r = mesh(box(slant, 0.08, 0.08, 0.02), M('#5b5f73'), { pos: [0, 0.9, z] });
    r.rotation.z = ang;
    grp.add(r);
    const s = mesh(box(slant, 0.9, 0.05, 0.01), M('#d8f3ff', { transparent: true, opacity: 0.35 }), { pos: [0, 0.45, z], shadow: false });
    s.rotation.z = ang;
    grp.add(s);
  }
  const cols = [
    { shape: 'box' as const, hx: slant / 2, hy: 0.15, hz: w / 2, at: [Math.sin(ang) * 0.15, -Math.cos(ang) * 0.15, 0] as [number, number, number], rot: [0, 0, ang] as [number, number, number] },
  ];
  if (o.rails !== false) for (const z of [-w / 2, w / 2]) cols.push({ shape: 'box', hx: slant / 2, hy: 0.5, hz: 0.05, at: [0, 0.5, z], rot: [0, 0, ang] });
  b.solid(grp, cols, [cx, cy, cz], 0, { friction: 0.6, restitution: 0.05 });
}

/** a static platform (mezzanine, loading dock) with a railing on chosen sides */
export function platform(b: Builder, o: { x0: number; x1: number; z0: number; z1: number; y: number; color?: string; rail?: ('x0' | 'x1' | 'z0' | 'z1')[] }) {
  const w = o.x1 - o.x0, d = o.z1 - o.z0;
  const grp = g();
  grp.add(mesh(box(w, o.y, d, 0.03), M(o.color ?? '#c9d2e3'), { pos: [0, -o.y / 2, 0] }));
  grp.add(mesh(box(w, 0.06, d, 0.01), M('#eef3fb'), { pos: [0, 0.01, 0], shadow: false }));
  const cols: import('./types').ColDef[] = [{ shape: 'box', hx: w / 2, hy: o.y / 2, hz: d / 2, at: [0, -o.y / 2, 0] }];
  for (const side of o.rail ?? []) {
    const alongX = side === 'z0' || side === 'z1';
    const len = alongX ? w : d;
    const px = side === 'x0' ? -w / 2 : side === 'x1' ? w / 2 : 0, pz = side === 'z0' ? -d / 2 : side === 'z1' ? d / 2 : 0;
    grp.add(mesh(box(alongX ? len : 0.08, 0.08, alongX ? 0.08 : len, 0.02), M('#5b5f73'), { pos: [px, 1.0, pz] }));
    grp.add(mesh(box(alongX ? len : 0.04, 1.0, alongX ? 0.04 : len, 0.01), M('#d8f3ff', { transparent: true, opacity: 0.35 }), { pos: [px, 0.5, pz], shadow: false }));
    cols.push({ shape: 'box', hx: alongX ? len / 2 : 0.05, hy: 0.55, hz: alongX ? 0.05 : len / 2, at: [px, 0.55, pz] });
  }
  b.solid(grp, cols, [(o.x0 + o.x1) / 2, o.y, (o.z0 + o.z1) / 2]);
}

/** a tin can: a dented can still counts */
export function tinCan(b: Builder, o: O & { r?: number; h?: number; label?: string }): Prop {
  const r = o.r ?? 0.2, h = o.h ?? 0.38;
  const grp = g();
  grp.add(mesh(cyl(r, r, h, 10), M('#dfe3ea'), { pos: [0, h / 2, 0] }));
  grp.add(mesh(cyl(r + 0.005, r + 0.005, h * 0.62, 10), M(o.label ?? o.color ?? '#ff6b6b'), { pos: [0, h / 2, 0], shadow: false }));
  return b.prop({
    kind: 'can', name: o.name ?? '통조림', icon: '🥫', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r, hh: h / 2, at: [0, h / 2, 0] }],
    mass: 0.45, mat: 'metal', value: o.value ?? 3500, target: o.target, friction: 0.55, restitution: 0.2, angDamp: 1.6, linDamp: 0.2,
    breakable: { threshold: 7.5, mode: 'damage', fx: 'none', word: '찌그럭', onDamage: (p) => p.group.scale.set(1.08, 0.82, 1.08) },
  });
}

/** a 2D pyramid of cans along x, centred on (x, z), bottom row on y */
export function canPyramid(b: Builder, o: { x: number; y: number; z: number; rows: number; target?: boolean; r?: number; colors?: string[]; along?: 'x' | 'z' }): Prop[] {
  const r = o.r ?? 0.2, h = 0.38, gap = 0.012;
  const out: Prop[] = [];
  const colors = o.colors ?? ['#ff6b6b', '#ffd23f', '#5bb98c', '#4f86c6'];
  for (let row = 0; row < o.rows; row++) {
    const n = o.rows - row;
    for (let i = 0; i < n; i++) {
      const k = (i - (n - 1) / 2) * (2 * r + gap);
      const at: [number, number, number] = o.along === 'z' ? [o.x, o.y + row * (h + 0.002), o.z + k] : [o.x + k, o.y + row * (h + 0.002), o.z];
      out.push(tinCan(b, { at, r, h, target: o.target, label: colors[(row + i) % colors.length] }));
    }
  }
  return out;
}

/** a light round display table (on castors): rammed, it goes */
export function displayTable(b: Builder, o: O & { w?: number; d?: number; h?: number }): { prop: Prop; top: number } {
  const w = o.w ?? 3.4, d = o.d ?? 1.0, h = o.h ?? 0.95;
  const grp = g();
  grp.add(mesh(box(w, 0.1, d, 0.03), M(o.color ?? '#ffd23f'), { pos: [0, h - 0.05, 0] }));
  grp.add(mesh(box(w - 0.1, h - 0.15, d - 0.1, 0.03), M('#fff1c9'), { pos: [0, (h - 0.1) / 2, 0] }));
  grp.add(mesh(box(w * 0.7, 0.3, 0.04, 0.01), M('#ff5a6e'), { pos: [0, h * 0.55, d / 2 + 0.01], shadow: false }));
  const prop = b.prop({
    kind: 'display', name: o.name ?? '특가 진열대', icon: '🏷️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }],
    mass: 6, mat: 'wood', value: 80000, friction: 0.08, noTopple: false,
  });
  return { prop, top: o.at[1] + h };
}

/** a gondola shelf run (static) with goods on it */
export function gondola(b: Builder, o: { x0: number; x1: number; z: number; h?: number; shelves?: number; color?: string }) {
  const w = o.x1 - o.x0, h = o.h ?? 2.6, n = o.shelves ?? 3, d = 0.9;
  const grp = g();
  grp.add(mesh(box(w, h, 0.12, 0.02), M(o.color ?? '#e8eef7'), { pos: [0, h / 2, 0] }));
  const cols: import('./types').ColDef[] = [{ shape: 'box', hx: w / 2, hy: h / 2, hz: 0.08, at: [0, h / 2, 0] }];
  const goods = ['#ff6b6b', '#ffd23f', '#5bb98c', '#4f86c6', '#ff9f43', '#c9a0dc'];
  for (let i = 0; i < n; i++) {
    const y = 0.25 + (i * (h - 0.4)) / n;
    for (const s of [-1, 1]) {
      grp.add(mesh(box(w, 0.06, d / 2, 0.01), M('#cfd8e6'), { pos: [0, y, (s * d) / 4] }));
      cols.push({ shape: 'box', hx: w / 2, hy: 0.03, hz: d / 4, at: [0, y, (s * d) / 4] });
      for (let k = 0; k < Math.floor(w / 0.42); k++) grp.add(mesh(box(0.32, 0.5, 0.26, 0.03), M(goods[(i * 3 + k + (s > 0 ? 1 : 0)) % goods.length]), { pos: [-w / 2 + 0.25 + k * 0.42, y + 0.28, (s * d) / 4], shadow: false }));
    }
  }
  b.solid(grp, cols, [(o.x0 + o.x1) / 2, 0, o.z]);
}

/* ------------------------------ the high street ------------------------------ */

/** a tall florist's bucket: knocked over, its water runs out across the pavement */
export function flowerBucket(b: Builder, o: O & { flowers?: string[]; interactable?: boolean }): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.3, 0.24, 0.75, 10), M(o.color ?? '#7fb8d8'), { pos: [0, 0.375, 0] }));
  grp.add(mesh(cyl(0.27, 0.27, 0.04, 10), M('#bfeaff'), { pos: [0, 0.7, 0], shadow: false }));
  const fl = o.flowers ?? ['#ff8fa3', '#ffd23f', '#ffffff'];
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    grp.add(mesh(cyl(0.015, 0.015, 0.6, 4), M('#5bb98c'), { pos: [Math.cos(a) * 0.12, 0.95, Math.sin(a) * 0.12], shadow: false }));
    grp.add(mesh(sphere(0.12, 6, 4), M(fl[i % fl.length]), { pos: [Math.cos(a) * 0.14, 1.27, Math.sin(a) * 0.14] }));
  }
  return b.prop({
    kind: 'flowerBucket', name: o.name ?? '꽃 양동이', icon: '💐', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r: 0.3, hh: 0.62, at: [0, 0.62, 0] }],
    mass: 2.2, mat: 'plastic', value: o.value ?? 70000, friction: 0.6, interactable: o.interactable,
    special: new SpillSpecial({ kind: 'water', r: 1.8, mouth: 0.9, word: '촤악!' }),
    traits: ['넘어지면 물이 쏟아짐'],
  });
}

/** a projecting neon sign on its bracket (pinned): when it lets go, it is heavy */
export function neonSign(b: Builder, o: O & { text?: string; w?: number }): Prop {
  const w = o.w ?? 2.2;
  const grp = g();
  grp.add(mesh(box(w, 1.1, 0.35, 0.06), M(o.color ?? '#3b2a4a'), { pos: [0, 0, 0] }));
  for (let i = 0; i < 4; i++) grp.add(mesh(box(w * 0.18, 0.5, 0.05, 0.02), M('#7fe3ff', { emissive: '#4ad8ff', emissiveIntensity: 0.9 }), { pos: [-w * 0.33 + i * w * 0.22, 0, 0.19], shadow: false }));
  grp.add(mesh(box(0.08, 0.6, 0.08, 0.01), M('#5b5f73'), { pos: [-w / 2 + 0.2, 0.85, 0] }));
  grp.add(mesh(box(0.08, 0.6, 0.08, 0.01), M('#5b5f73'), { pos: [w / 2 - 0.2, 0.85, 0] }));
  return b.prop({
    kind: 'sign', name: o.name ?? '네온 간판', icon: '🪧', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: 0.55, hz: 0.18 }],
    mass: 36, mat: 'metal', value: o.value ?? 1800000, pinned: 99999, interactable: false,
    breakable: { threshold: 6, mode: 'damage', fx: 'sparks', word: '쿵!! 지지직', debris: { count: 8, colors: ['#7fe3ff', '#3b2a4a'], size: 0.16, flat: true } },
    traits: ['매달림', '아주 무거움'],
  });
}

/** a low outdoor sale stand (static) */
export function saleStand(b: Builder, o: { x0: number; x1: number; z: number; d?: number; h?: number; color?: string }) {
  const w = o.x1 - o.x0, d = o.d ?? 1.2, h = o.h ?? 0.7;
  const grp = g();
  grp.add(mesh(box(w, h, d, 0.04), M(o.color ?? '#ff6b6b'), { pos: [0, h / 2, 0] }));
  grp.add(mesh(box(w * 0.6, 0.25, 0.04, 0.01), M('#ffffff'), { pos: [0, h * 0.55, d / 2 + 0.01], shadow: false }));
  b.solid(grp, [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }], [(o.x0 + o.x1) / 2, 0, o.z]);
  return h;
}

/* ------------------------------ the railway ------------------------------ */

/** the yellow switch blade (scenery: the rails decide), hinged at `at` */
export function switchBlade(b: Builder, o: { at: [number, number, number]; len: number; a0: number; a1: number }): RailSwitch {
  const grp = g();
  grp.add(mesh(box(o.len, 0.18, 0.22, 0.04), M('#ffd23f'), { pos: [o.len / 2, 0.09, 0] }));
  for (let i = 0; i < 4; i++) grp.add(mesh(box(0.25, 0.2, 0.24, 0), M('#2f3142'), { pos: [0.4 + i * (o.len / 4), 0.09, 0], shadow: false }));
  grp.position.set(o.at[0], o.at[1] + 0.01, o.at[2]);
  grp.userData.keep = true;
  b.deco(grp);
  const sw = new RailSwitch(grp, o.a0, o.a1);
  b.game.addUpdater((dt) => sw.update(dt));
  return sw;
}

/** a rail curb (static): keeps wheels on the track */
export function railCurb(b: Builder, x0: number, z0: number, x1: number, z1: number, y = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
  const grp = g();
  grp.add(mesh(box(len, 0.22, 0.16, 0.02), M('#8e95a8'), { pos: [0, 0.11, 0] }));
  b.solid(grp, [{ shape: 'box', hx: len / 2, hy: 0.45, hz: 0.1, at: [0, 0.45, 0] }], [(x0 + x1) / 2, y, (z0 + z1) / 2], ang, { friction: 0.05, restitution: 0.05 });
}

/** two rails and sleepers between (scenery) */
export function rails(b: Builder, x0: number, z0: number, x1: number, z1: number, y = 0) {
  const len = Math.hypot(x1 - x0, z1 - z0), ang = -Math.atan2(z1 - z0, x1 - x0);
  const grp = g();
  for (const z of [-0.75, 0.75]) grp.add(mesh(box(len, 0.08, 0.1, 0.01), M('#9aa3b5'), { pos: [0, 0.05, z], shadow: false }));
  const n = Math.floor(len / 0.8);
  for (let i = 0; i < n; i++) grp.add(mesh(box(0.25, 0.04, 2.0, 0.01), M('#8e6a4a'), { pos: [-len / 2 + 0.4 + i * 0.8, 0.02, 0], shadow: false }));
  grp.position.set((x0 + x1) / 2, y + 0.005, (z0 + z1) / 2);
  grp.rotation.y = ang;
  b.deco(grp);
}

/* ------------------------------ the airport ------------------------------ */

/** a hard-shell suitcase: heavy, rides belts, fills carts */
export function suitcase(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#4f86c6';
  grp.add(mesh(box(0.9, 0.62, 0.36, 0.08), M(c), { pos: [0, 0.31, 0] }));
  for (const x of [-0.2, 0.2]) grp.add(mesh(box(0.04, 0.6, 0.38, 0.01), M('#ffffff'), { pos: [x, 0.31, 0], shadow: false }));
  grp.add(mesh(box(0.3, 0.06, 0.06, 0.02), M('#2f3142'), { pos: [0, 0.66, 0] }));
  return b.prop({
    kind: 'suitcase', name: o.name ?? '여행 가방', icon: '🧳', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.31, hz: 0.18, at: [0, 0.31, 0], round: 0.04 }],
    mass: 6, mat: 'plastic', value: o.value ?? 180000, friction: 0.5,
    traits: ['무거움', '컨베이어를 탐'],
  });
}

/** a duty-free bottle (perfume or whisky): small, pricey, shatters */
export function dutyFree(b: Builder, o: O & { type?: 'perfume' | 'whisky' }): Prop {
  const t = o.type ?? 'perfume';
  const grp = g();
  if (t === 'perfume') {
    grp.add(mesh(box(0.22, 0.26, 0.14, 0.04), M(o.color ?? '#ffb3c6', { transparent: true, opacity: 0.85 }), { pos: [0, 0.13, 0] }));
    grp.add(mesh(cyl(0.05, 0.05, 0.08, 6), M('#ffd23f'), { pos: [0, 0.3, 0] }));
  } else {
    grp.add(mesh(cyl(0.11, 0.12, 0.36, 8), M(o.color ?? '#c98a5a', { transparent: true, opacity: 0.9 }), { pos: [0, 0.18, 0] }));
    grp.add(mesh(cyl(0.04, 0.05, 0.12, 6), M('#2f3142'), { pos: [0, 0.42, 0] }));
  }
  return b.prop({
    kind: t, name: o.name ?? (t === 'perfume' ? '면세 향수' : '면세 위스키'), icon: t === 'perfume' ? '🧴' : '🥃', group: grp, pos: o.at, rotY: o.rot,
    colliders: [t === 'perfume' ? { shape: 'box', hx: 0.11, hy: 0.17, hz: 0.07, at: [0, 0.17, 0] } : { shape: 'cyl', r: 0.12, hh: 0.24, at: [0, 0.24, 0] }],
    mass: 0.4, mat: 'glass', value: o.value ?? (t === 'perfume' ? 320000 : 450000), target: o.target, friction: 0.5,
    breakable: { threshold: 3.0, mode: 'shatter', fx: t === 'perfume' ? 'perfume' : 'juice', word: t === 'perfume' ? '쨍! 향수 폭탄' : '쨍그랑! 위스키', debris: { count: 6, colors: [o.color ?? '#ffb3c6', '#ffffff'], size: 0.1, flat: true } },
  });
}

/* ------------------------------ the secret base ------------------------------ */

/** a classified folder: drop it and the secrets are all over the floor */
export function secretFolder(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.42, 0.56, 0.08, 0.02), M(o.color ?? '#e8c46a'), { pos: [0, 0.28, 0] }));
  grp.add(mesh(box(0.3, 0.08, 0.09, 0.005), M('#ff2a3c'), { pos: [0, 0.4, 0] }));
  return b.prop({
    kind: 'folder', name: o.name ?? '1급 기밀 서류', icon: '📁', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.21, hy: 0.28, hz: 0.04, at: [0, 0.28, 0] }],
    mass: 0.35, mat: 'paper', value: o.value ?? 5000000, target: o.target, friction: 0.5,
    breakable: { threshold: 2.4, mode: 'damage', fx: 'paper', word: '기밀 유출!', onDamage: (p) => { p.group.scale.set(1.1, 0.4, 1.1); } },
  });
}

/** a server rack: tall, heavy, blinking; tips on the second shove, and they go in rows */
export function serverRack(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(1.0, 2.6, 1.0, 0.04), M('#2f3142'), { pos: [0, 1.3, 0] }));
  for (let i = 0; i < 7; i++) {
    grp.add(mesh(box(0.84, 0.22, 0.02, 0.01), M('#3f4458'), { pos: [0, 0.35 + i * 0.32, 0.51], shadow: false }));
    grp.add(mesh(box(0.06, 0.05, 0.02, 0), M(i % 3 ? '#5bd98c' : '#7fd3ff', { emissive: i % 3 ? '#2ad86c' : '#4ad8ff', emissiveIntensity: 0.8 }), { pos: [0.32, 0.35 + i * 0.32, 0.525], shadow: false }));
  }
  return b.prop({
    kind: 'server', name: o.name ?? '서버', icon: '🗄️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.5, hy: 1.3, hz: 0.5, at: [0, 1.3, 0] }],
    mass: 25, mat: 'electronic', value: o.value ?? 18000000, target: o.target, friction: 0.7,
    special: new WobbleSpecial(), touchForce: 100, traits: ['아주 무거움', '흔들릴 때 한 번 더', '줄줄이'],
    breakable: { threshold: 4.5, mode: 'damage', fx: 'sparks', word: '파지직! 서버 다운', debris: { count: 8, colors: ['#2f3142', '#5bd98c'], size: 0.14, flat: true } },
  });
}

/** a rocket engine (rides a dolly) */
export function rocketEngine(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.45, 0.5, 0.9, 12), M('#dfe3ea'), { pos: [0, 0.45, 0] }));
  grp.add(mesh(cyl(0.3, 0.65, 0.8, 12), M('#5b5f73'), { pos: [0, 1.25, 0], rot: [0, 0, Math.PI] }));
  grp.add(mesh(cyl(0.48, 0.48, 0.12, 12), M('#ff6b6b'), { pos: [0, 0.85, 0] }));
  return b.prop({
    kind: 'engine', name: o.name ?? '로켓 엔진', icon: '🚀', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r: 0.55, hh: 0.8, at: [0, 0.8, 0] }],
    mass: 12, mat: 'metal', value: o.value ?? 60000000, friction: 0.6,
    breakable: { threshold: 3.6, mode: 'damage', fx: 'sparks', word: '쿵! 엔진 찌그러짐' },
  });
}

/** the first-stage fuel tank: tall, top-heavy, tips on the second shove or one big hit */
export function fuelTank(b: Builder, o: O & { h?: number; r?: number }): Prop {
  const h = o.h ?? 4.6, r = o.r ?? 0.9;
  const grp = g();
  grp.add(mesh(cyl(r, r, h, 16), M('#f4f4f8'), { pos: [0, h / 2 + 0.3, 0] }));
  grp.add(mesh(cyl(r * 0.6, r, 0.5, 16), M('#f4f4f8'), { pos: [0, h + 0.55, 0] }));
  for (const y of [0.25, 0.5, 0.75]) grp.add(mesh(cyl(r + 0.02, r + 0.02, 0.12, 16), M('#ff6b6b'), { pos: [0, 0.3 + h * y, 0], shadow: false }));
  grp.add(mesh(box(0.5, 1.4, 0.04, 0.01), M('#4f86c6'), { pos: [0, 0.3 + h * 0.55, r + 0.01], shadow: false }));
  grp.add(mesh(cyl(r * 1.05, r * 1.2, 0.3, 12), M('#5b5f73'), { pos: [0, 0.15, 0] }));
  return b.prop({
    kind: 'fuelTank', name: o.name ?? '1단 연료 탱크', icon: '🛢️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r, hh: h / 2, at: [0, h / 2 + 0.3, 0], massShare: 0.85 }, { shape: 'cyl', r: r * 1.15, hh: 0.15, at: [0, 0.15, 0], massShare: 0.15 }],
    mass: 30, mat: 'metal', value: o.value ?? 300000000, target: o.target, friction: 0.7,
    special: new WobbleSpecial({ kick: 2.4, minHeight: 2 }), touchForce: 100, traits: ['아주 무거움', '키가 큼', '앞발로는 꿈쩍 안 함'],
    breakable: { threshold: 4, mode: 'damage', fx: 'sparks', word: '콰앙!! 연료 탱크', debris: { count: 14, colors: ['#f4f4f8', '#ff6b6b', '#4f86c6'], size: 0.3, flat: true } },
  });
}

/* ------------------------------ the request board ------------------------------ */

/** the cat's own food bowl: break it and dinner is on the floor (a protected thing on some requests) */
export function catBowl(b: Builder, o: O): Prop {
  const c = o.color ?? '#7fd3ff';
  const grp = g();
  grp.add(mesh(cyl(0.3, 0.22, 0.16, 14), M(c), { pos: [0, 0.08, 0] }));
  grp.add(mesh(cyl(0.25, 0.25, 0.02, 14), M('#c98b4a'), { pos: [0, 0.15, 0], shadow: false }));
  for (const [x, z] of [[0.08, 0.04], [-0.06, 0.09], [0.02, -0.1], [-0.1, -0.04], [0.12, -0.06]]) grp.add(mesh(sphere(0.045, 5, 4), M('#a0622e'), { pos: [x, 0.17, z], shadow: false }));
  grp.add(mesh(box(0.16, 0.06, 0.01, 0.01), M('#ffffff'), { pos: [0, 0.09, 0.27], shadow: false }));
  return b.prop({
    kind: 'catBowl', name: o.name ?? '내 밥그릇', icon: '🥣', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', r: 0.29, hh: 0.08, at: [0, 0.08, 0] }],
    mass: 0.5, mat: 'ceramic', value: o.value ?? 12000, angDamp: 1.2,
    breakable: { threshold: 4.2, hitForce: 120, mode: 'shatter', fx: 'none', word: '내 밥…!!', debris: { count: 8, colors: [c, '#a0622e'], size: 0.15 } },
    traits: ['내 밥그릇', '깨지면 저녁도 없다'],
  });
}
