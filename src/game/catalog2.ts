import * as THREE from 'three';
import { M, ball, box, cone, cyl, lathe, mesh, screenTexture, sphere, torus } from '../render/kit';
import type { Builder } from '../levels/Builder';
import type { ColDef } from './types';
import type { Prop } from './Prop';
import { TrailSpecial } from './specials';
import { BalloonSpecial, FanSpecial, JackSpecial, SoapSpecial, TrainSpecial, attachBalloon, rails } from './specials2';
import type { O, V3 } from './catalog';

/* ------------------------------------------------------------------ */
/* Props for the bathroom, playroom, hallway and extra kitchen toys.    */
/* ------------------------------------------------------------------ */

const g = () => new THREE.Group();

function hull(profile: [number, number][], seg = 8): ColDef {
  const pts: number[] = [];
  for (const [r, y] of profile) {
    if (r < 0.001) { pts.push(0, y, 0); continue; }
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  }
  return { shape: 'hull', points: pts };
}

/* ------------------------------ bathroom ------------------------------ */

export function soap(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.55, 0.2, 0.34, 0.08), M(o.color ?? '#ffb3c6'), { pos: [0, 0.1, 0] }));
  grp.add(mesh(sphere(0.06, 6, 4), M('#ffffff'), { pos: [0.12, 0.21, 0.05], scale: [1, 0.4, 1], shadow: false }));
  grp.add(mesh(sphere(0.045, 6, 4), M('#ffffff'), { pos: [-0.1, 0.21, -0.06], scale: [1, 0.4, 1], shadow: false }));
  return b.prop({
    kind: 'soap', name: o.name ?? '비누', icon: '🧼', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.27, hy: 0.1, hz: 0.17, at: [0, 0.1, 0], round: 0.05 }],
    mass: 0.4, mat: 'soft', value: 2000, friction: 0.012, restitution: 0.35, linDamp: 0.01, angDamp: 0.6, noTopple: true,
    special: new SoapSpecial(), floats: true,
  });
}

export function toiletPaper(b: Builder, o: O & { lying?: boolean }): Prop {
  const grp = g();
  const inner = g();
  inner.add(mesh(cyl(0.26, 0.26, 0.38, 12), M('#ffffff')));
  inner.add(mesh(cyl(0.09, 0.09, 0.39, 8), M('#c9a27a'), { shadow: false }));
  for (const y of [-0.12, 0, 0.12]) inner.add(mesh(torus(0.262, 0.006, 3, 16), M('#e8e8f0'), { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
  const lying = o.lying ?? true;
  if (lying) { inner.rotation.x = Math.PI / 2; inner.position.y = 0.26; } else inner.position.y = 0.19;
  grp.add(inner);
  const p = b.prop({
    kind: 'tp', name: '두루마리 휴지', icon: '🧻', group: grp, pos: o.at, rotY: o.rot,
    colliders: [lying ? { shape: 'cyl', hh: 0.19, r: 0.26, at: [0, 0.26, 0], rot: [Math.PI / 2, 0, 0] } : { shape: 'cyl', hh: 0.19, r: 0.26, at: [0, 0.19, 0] }],
    mass: 0.25, mat: 'paper', value: 1500, angDamp: 0.08, linDamp: 0.04, friction: 0.9, noTopple: true, floats: true,
    special: new TrailSpecial(b.game, '#ffffff', 0.26, 0.13, 'tpLen', 420),
  });
  return p;
}

export function phone(b: Builder, o: O): Prop {
  const grp = g();
  const scr = new THREE.MeshBasicMaterial({ map: screenTexture('laptop') ?? null, color: screenTexture('laptop') ? 0xffffff : 0xc6d6ff });
  grp.add(mesh(box(0.42, 0.07, 0.82, 0.03), M(o.color ?? '#2f3142'), { pos: [0, 0.035, 0] }));
  grp.add(mesh(box(0.36, 0.01, 0.72, 0), scr, { pos: [0, 0.075, 0], shadow: false }));
  return b.prop({
    kind: 'phone', name: o.name ?? '집사 폰', icon: '📱', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.21, hy: 0.035, hz: 0.41, at: [0, 0.035, 0] }],
    mass: 0.5, mat: 'electronic', value: o.value ?? 950000, target: o.target, friction: 0.35, restitution: 0.2,
    breakable: {
      threshold: 9, mode: 'damage', fx: 'sparks', word: '액정 박살!',
      onDamage: () => { const t = screenTexture('broken'); if (t) scr.map = t; else scr.color.set('#111'); scr.needsUpdate = true; },
    },
  });
}

export function perfume(b: Builder, o: O): Prop {
  const c = o.color ?? '#ff9fc0';
  const grp = g();
  const glass = M(c, { transparent: true, opacity: 0.85 });
  grp.add(mesh(box(0.36, 0.42, 0.22, 0.06), glass, { pos: [0, 0.21, 0] }));
  grp.add(mesh(cyl(0.05, 0.05, 0.12, 6), M('#ffcf3f'), { pos: [0, 0.48, 0] }));
  grp.add(mesh(sphere(0.09, 6, 5), M('#ffcf3f'), { pos: [0, 0.6, 0] }));
  return b.prop({
    kind: 'perfume', name: o.name ?? '향수', icon: '🌸', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.18, hy: 0.3, hz: 0.11, at: [0, 0.3, 0] }],
    mass: 0.3, mat: 'glass', value: o.value ?? 85000, target: o.target,
    breakable: { threshold: 4.2, mode: 'shatter', fx: 'perfume', word: '쨍! 향기 폭탄', debris: { count: 6, colors: [c, '#ffffff'], size: 0.14 } },
  });
}

export function shampoo(b: Builder, o: O): Prop {
  const c = o.color ?? '#7fd3ff';
  const grp = g();
  const prof: [number, number][] = [[0, 0], [0.2, 0], [0.22, 0.1], [0.2, 0.62], [0.1, 0.72], [0, 0.72]];
  grp.add(mesh(lathe(prof, 8), M(c)));
  grp.add(mesh(cyl(0.07, 0.09, 0.12, 6), M('#ffffff'), { pos: [0, 0.78, 0] }));
  grp.add(mesh(box(0.06, 0.04, 0.16, 0), M('#ffffff'), { pos: [0, 0.83, 0.08] }));
  grp.add(mesh(cyl(0.205, 0.205, 0.2, 8), M('#ffffff'), { pos: [0, 0.35, 0], shadow: false }));
  return b.prop({
    kind: 'shampoo', name: o.name ?? '샴푸', icon: '🧴', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 8)],
    mass: 0.55, mat: 'plastic', value: 6000, restitution: 0.45, floats: true,
  });
}

export function toothCup(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(lathe([[0, 0], [0.15, 0], [0.18, 0.42], [0.15, 0.42], [0.13, 0.03], [0, 0.03]], 9), M('#d8f3ff', { transparent: true, opacity: 0.8 })));
  for (const [x, c] of [[-0.05, '#ff6b6b'], [0.05, '#4f86c6']] as const) grp.add(mesh(box(0.04, 0.6, 0.03, 0.01), M(c), { pos: [x, 0.5, 0], rot: [0, 0, x * 2] }));
  return b.prop({
    kind: 'toothcup', name: '양치컵', icon: '🪥', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.21, r: 0.17, at: [0, 0.21, 0] }],
    mass: 0.25, mat: 'glass', value: 12000, target: o.target,
    breakable: { threshold: 4.2, mode: 'shatter', fx: 'glass', debris: { count: 5, colors: ['#e8fbff'], size: 0.12 } },
  });
}

export function hairDryer(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff8fa3';
  grp.add(mesh(cyl(0.12, 0.14, 0.55, 8), M(c), { pos: [0, 0.3, 0] }));
  const head = g();
  head.position.set(0, 0.62, 0);
  head.add(mesh(cyl(0.2, 0.2, 0.5, 10), M(c), { rot: [Math.PI / 2, 0, 0] }));
  head.add(mesh(cyl(0.14, 0.16, 0.12, 10), M('#3a3d4f'), { pos: [0, 0, 0.3], rot: [Math.PI / 2, 0, 0] }));
  const blades = g();
  blades.userData.keep = true;
  for (let i = 0; i < 3; i++) blades.add(mesh(box(0.22, 0.04, 0.01, 0), M('#ffffff'), { rot: [0, 0, (i * Math.PI) / 3], shadow: false }));
  blades.position.set(0, 0, 0.37);
  head.add(blades);
  grp.add(head);
  const sp = new FanSpecial(4.2, 15, 6);
  sp.blades = blades;
  return b.prop({
    kind: 'dryer', name: '드라이기', icon: '💨', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.3, r: 0.14, at: [0, 0.3, 0], massShare: 0.5 }, { shape: 'cyl', hh: 0.3, r: 0.2, at: [0, 0.62, 0.05], rot: [Math.PI / 2, 0, 0], massShare: 0.5 }],
    mass: 0.9, mat: 'electronic', value: 45000, special: sp,
    breakable: { threshold: 9, mode: 'damage', fx: 'sparks' },
  });
}

/* ------------------------------ playroom ------------------------------ */

const BLOCK_COLORS = ['#ff6b6b', '#ffd23f', '#4f86c6', '#5bb98c', '#ff9f43', '#9b6fcf'];

export function block(b: Builder, o: O & { size: [number, number, number]; shape?: 'box' | 'cyl' }): Prop {
  const [w, h, d] = o.size;
  const c = o.color ?? BLOCK_COLORS[Math.abs(Math.round(o.at[0] * 3 + o.at[1] * 7 + o.at[2] * 5)) % BLOCK_COLORS.length];
  const grp = g();
  const cylS = o.shape === 'cyl';
  grp.add(mesh(cylS ? cyl(w / 2, w / 2, h, 10) : box(w, h, d, 0.04), M(c), { pos: [0, h / 2, 0] }));
  const vol = cylS ? Math.PI * (w / 2) * (w / 2) * h : w * h * d;
  return b.prop({
    kind: 'block', name: '나무 블록', icon: '🧱', group: grp, pos: o.at, rotY: o.rot,
    colliders: [cylS ? { shape: 'cyl', hh: h / 2, r: w / 2, at: [0, h / 2, 0] } : { shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }],
    mass: Math.max(0.12, vol * 1.6), mat: 'wood', value: 1500, toppleValue: 450, friction: 0.65, ccd: false,
  });
}

/**
 * Angry-Birds-ish block structure. Returns the y of its top so a target
 * can be perched there.
 */
export function castle(b: Builder, at: V3, design: 'tower' | 'gate' | 'pyramid' | 'wall' | 'bridge', o: { rot?: number; floors?: number; width?: number } = {}): number {
  const [x0, y0, z0] = at;
  const rot = o.rot ?? 0;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const P = (lx: number, y: number, lz = 0): V3 => [x0 + ca * lx + sa * lz, y, z0 - sa * lx + ca * lz];
  let y = y0;
  const floors = o.floors ?? 2;
  if (design === 'tower' || design === 'gate') {
    const span = o.width ?? (design === 'gate' ? 1.4 : 0.9);
    for (let f = 0; f < floors; f++) {
      const ph = 0.9;
      for (const lx of [-span / 2, span / 2]) block(b, { at: P(lx, y), size: [0.24, ph, 0.5], rot });
      y += ph;
      block(b, { at: P(0, y), size: [span + 0.5, 0.18, 0.6], rot, color: '#b9825a' });
      y += 0.18;
    }
    if (design === 'tower') { block(b, { at: P(0, y), size: [0.5, 0.5, 0.5], rot, shape: 'cyl' }); y += 0.5; }
  } else if (design === 'pyramid') {
    const rows = floors + 1;
    for (let r = 0; r < rows; r++) {
      const n = rows - r;
      for (let i = 0; i < n; i++) block(b, { at: P((i - (n - 1) / 2) * 0.58, y), size: [0.5, 0.5, 0.5], rot });
      y += 0.5;
    }
  } else if (design === 'wall') {
    const n = o.width ?? 5;
    for (let r = 0; r < floors; r++) {
      for (let i = 0; i < n - (r % 2); i++) block(b, { at: P((i - (n - 1 - (r % 2)) / 2) * 0.62, y), size: [0.6, 0.38, 0.4], rot });
      y += 0.38;
    }
  } else if (design === 'bridge') {
    const span = o.width ?? 2.2;
    for (const lx of [-span / 2, span / 2]) {
      block(b, { at: P(lx, y), size: [0.5, 0.5, 0.5], rot });
      block(b, { at: P(lx, y + 0.5), size: [0.5, 0.5, 0.5], rot });
    }
    y += 1.0;
    block(b, { at: P(0, y), size: [span + 0.7, 0.16, 0.7], rot, color: '#b9825a' });
    y += 0.16;
  }
  return y;
}

export function doll(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff9fc0';
  grp.add(mesh(lathe([[0, 0], [0.32, 0], [0.26, 0.35], [0.12, 0.6], [0, 0.62]], 10), M(c)));
  grp.add(mesh(sphere(0.17, 9, 7), M('#fff3ea'), { pos: [0, 0.78, 0] }));
  grp.add(mesh(sphere(0.19, 9, 6), M('#6b4423'), { pos: [0, 0.84, -0.04], scale: [1, 0.8, 1] }));
  for (const sx of [-1, 1]) grp.add(mesh(sphere(0.025, 4, 3), M('#2b2233'), { pos: [sx * 0.06, 0.8, 0.15], shadow: false }));
  grp.add(mesh(sphere(0.06, 6, 4), M('#ffd23f'), { pos: [0, 1.0, 0] }));
  return b.prop({
    kind: 'doll', name: o.name ?? '도자기 인형', icon: '🎎', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull([[0.32, 0], [0.12, 0.6], [0.17, 0.95]], 8)],
    mass: 0.7, mat: 'ceramic', value: o.value ?? 180000, target: o.target,
    breakable: { threshold: 5, mode: 'shatter', fx: 'glass', word: '쨍그랑!', debris: { count: 9, colors: [c, '#fff3ea', '#6b4423'], size: 0.15 } },
  });
}

export function snowGlobe(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.3, 0.34, 0.2, 10), M('#b9825a'), { pos: [0, 0.1, 0] }));
  grp.add(mesh(sphere(0.34, 12, 9), M('#d8f3ff', { transparent: true, opacity: 0.55 }), { pos: [0, 0.48, 0] }));
  grp.add(mesh(box(0.2, 0.16, 0.16, 0.02), M('#ff6b6b'), { pos: [0, 0.32, 0], shadow: false }));
  grp.add(mesh(cone(0.16, 0.14, 4), M('#ffffff'), { pos: [0, 0.47, 0], rot: [0, Math.PI / 4, 0], shadow: false }));
  for (let i = 0; i < 6; i++) grp.add(mesh(sphere(0.025, 4, 3), M('#ffffff'), { pos: [Math.sin(i * 2.3) * 0.2, 0.5 + Math.cos(i * 1.7) * 0.15, Math.cos(i * 2.3) * 0.2], shadow: false }));
  return b.prop({
    kind: 'globeSnow', name: o.name ?? '스노우볼', icon: '🔮', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.1, r: 0.33, at: [0, 0.1, 0], massShare: 0.4 }, { shape: 'ball', r: 0.34, at: [0, 0.48, 0], massShare: 0.6 }],
    mass: 0.9, mat: 'glass', value: o.value ?? 120000, target: o.target,
    breakable: { threshold: 4.6, mode: 'shatter', fx: 'snow', word: '쨍! 눈보라', debris: { count: 8, colors: ['#e8fbff', '#b9825a'], size: 0.15 } },
  });
}

export function balloon(b: Builder, o: O & { anchor: V3; length?: number }): Prop {
  const c = o.color ?? '#ff6b6b';
  const r = 0.42;
  const grp = g();
  grp.add(mesh(sphere(r, 12, 10), M(c, { emissive: c, emissiveIntensity: 0.12 }), { scale: [1, 1.15, 1] }));
  grp.add(mesh(cone(0.06, 0.1, 6), M(c), { pos: [0, -r * 1.12, 0], rot: [Math.PI, 0, 0] }));
  grp.add(mesh(sphere(0.08, 6, 4), M('#ffffff', { transparent: true, opacity: 0.7 }), { pos: [-0.15, 0.2, 0.3], shadow: false }));
  const sp = new BalloonSpecial(r, c);
  const p = b.prop({
    kind: 'balloon', name: '풍선', icon: '🎈', group: grp, pos: o.at,
    colliders: [{ shape: 'ball', r: r * 1.05 }],
    mass: 0.06, mat: 'rubber', value: 0, restitution: 0.6, linDamp: 1.4, angDamp: 2, scoreMoves: false, noTopple: true, ccd: false,
    special: sp, target: o.target,
  });
  p.body.setGravityScale(-0.6, true);
  attachBalloon(b.game, p, sp, new THREE.Vector3(...o.anchor), o.length ?? 2.6);
  return p;
}

export function jackBox(b: Builder, o: O & { launch?: number }): Prop {
  const grp = g();
  const c = o.color ?? '#7fd3ff';
  grp.add(mesh(box(0.8, 0.8, 0.8, 0.06), M(c), { pos: [0, 0.4, 0] }));
  for (const [x, z] of [[0, 0.41], [0.41, 0]] as const) grp.add(mesh(box(x ? 0.02 : 0.5, 0.5, x ? 0.5 : 0.02, 0), M('#ffd23f'), { pos: [x, 0.4, z], shadow: false }));
  grp.add(mesh(cyl(0.04, 0.04, 0.3, 5), M('#c9ccd8'), { pos: [0.48, 0.45, 0], rot: [0, 0, Math.PI / 2] }));
  grp.add(mesh(sphere(0.07, 6, 4), M('#e05a5a'), { pos: [0.64, 0.45, 0.12] }));
  const clown = g();
  clown.userData.keep = true;
  clown.position.set(0, 0.8, 0);
  clown.add(mesh(cyl(0.08, 0.08, 0.6, 6), M('#c9ccd8'), { pos: [0, 0.3, 0], shadow: false }));
  clown.add(mesh(sphere(0.2, 8, 6), M('#fff3ea'), { pos: [0, 0.7, 0] }));
  clown.add(mesh(sphere(0.06, 5, 4), M('#e05a5a'), { pos: [0, 0.7, 0.2] }));
  clown.add(mesh(cone(0.16, 0.3, 6), M('#ff7aa8'), { pos: [0, 0.98, 0] }));
  clown.scale.set(1, 0.01, 1);
  clown.visible = false;
  grp.add(clown);
  const sp = new JackSpecial(o.launch ?? 13);
  sp.clown = clown;
  return b.prop({
    kind: 'jack', name: '깜짝 상자', icon: '🎁', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.4, hy: 0.4, hz: 0.4, at: [0, 0.4, 0] }],
    mass: 1.8, mat: 'wood', value: 8000, special: sp,
  });
}

export function train(b: Builder, o: O & { path: [number, number][]; loop?: boolean; y?: number }): Prop {
  const y = o.y ?? 0;
  const path = o.path.map(([x, z]) => new THREE.Vector3(x, y, z));
  rails(b.game, path, !!o.loop, y);
  const grp = g();
  const c = o.color ?? '#e05a5a';
  grp.add(mesh(box(1.1, 0.4, 0.55, 0.06), M(c), { pos: [0, 0.32, 0] }));
  grp.add(mesh(box(0.45, 0.45, 0.55, 0.06), M('#4f86c6'), { pos: [-0.3, 0.72, 0] }));
  grp.add(mesh(box(0.5, 0.06, 0.62, 0.02), M('#2f3142'), { pos: [-0.3, 0.98, 0] }));
  grp.add(mesh(cyl(0.22, 0.22, 0.6, 10), M('#2f3142'), { pos: [0.25, 0.42, 0], rot: [0, 0, Math.PI / 2] }));
  grp.add(mesh(cyl(0.08, 0.11, 0.3, 8), M('#2f3142'), { pos: [0.4, 0.75, 0] }));
  grp.add(mesh(sphere(0.07, 6, 4), M('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.6 }), { pos: [0.58, 0.45, 0] }));
  for (const lx of [-0.35, 0, 0.35]) for (const sz of [-0.29, 0.29]) grp.add(mesh(cyl(0.12, 0.12, 0.06, 8), M('#2b2233'), { pos: [lx, 0.12, sz], rot: [Math.PI / 2, 0, 0] }));
  const ang = Math.atan2(-(path[1].z - path[0].z), path[1].x - path[0].x);
  const p = b.prop({
    kind: 'train', name: '장난감 기차', icon: '🚂', group: grp, pos: [path[0].x, y, path[0].z], rotY: ang,
    colliders: [{ shape: 'box', hx: 0.55, hy: 0.28, hz: 0.29, at: [0, 0.32, 0], massShare: 0.8 }, { shape: 'box', hx: 0.23, hy: 0.25, hz: 0.28, at: [-0.3, 0.75, 0], massShare: 0.2 }],
    mass: 2.6, mat: 'plastic', value: 30000, friction: 0.25, special: new TrainSpecial(path, !!o.loop), scoreMoves: false,
  });
  p.body.setEnabledRotations(false, true, false, true);
  return p;
}

export function plush(b: Builder, o: O & { kind?: 'bear' | 'bunny' }): Prop {
  const bunny = o.kind === 'bunny';
  const c = o.color ?? (bunny ? '#ffffff' : '#c98a5a');
  const grp = g();
  grp.add(mesh(sphere(0.34, 9, 7), M(c), { pos: [0, 0.34, 0], scale: [1, 1.1, 0.9] }));
  grp.add(mesh(sphere(0.26, 9, 7), M(c), { pos: [0, 0.82, 0.02] }));
  grp.add(mesh(sphere(0.1, 6, 4), M(bunny ? '#ffc2d1' : '#e8c08a'), { pos: [0, 0.76, 0.22], scale: [1.2, 0.8, 0.6] }));
  for (const sx of [-1, 1]) {
    if (bunny) grp.add(mesh(cone(0.07, 0.45, 5), M(c), { pos: [sx * 0.1, 1.2, 0], rot: [0, 0, -sx * 0.15] }));
    else grp.add(mesh(sphere(0.09, 6, 4), M(c), { pos: [sx * 0.2, 1.03, 0] }));
    grp.add(mesh(sphere(0.03, 4, 3), M('#2b2233'), { pos: [sx * 0.08, 0.88, 0.23], shadow: false }));
    grp.add(mesh(sphere(0.11, 6, 4), M(c), { pos: [sx * 0.33, 0.42, 0.05] }));
  }
  return b.prop({
    kind: 'plush', name: bunny ? '토끼 인형' : '곰 인형', icon: '🧸', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r: 0.34, at: [0, 0.34, 0], massShare: 0.7 }, { shape: 'ball', r: 0.26, at: [0, 0.82, 0], massShare: 0.3 }],
    mass: 0.5, mat: 'soft', value: 15000, restitution: 0.45, floats: true,
  });
}

/* ------------------------------ hallway / house ------------------------------ */

export function coatRack(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.38, 0.42, 0.1, 8), M('#5b3b2b'), { pos: [0, 0.05, 0] }));
  grp.add(mesh(cyl(0.06, 0.06, 4.0, 6), M('#8e5f3e'), { pos: [0, 2.05, 0] }));
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2; grp.add(mesh(cyl(0.03, 0.03, 0.35, 4), M('#5b3b2b'), { pos: [Math.cos(a) * 0.15, 3.8, Math.sin(a) * 0.15], rot: [Math.sin(a) * 0.8, 0, -Math.cos(a) * 0.8] })); }
  grp.add(mesh(box(0.7, 1.4, 0.3, 0.12), M('#e05a5a'), { pos: [0.15, 3.0, 0.05], rot: [0, 0, 0.08] }));
  grp.add(mesh(box(0.6, 1.0, 0.25, 0.1), M('#4f86c6'), { pos: [-0.12, 3.25, -0.08], rot: [0, 0.4, -0.06] }));
  grp.add(mesh(cyl(0.3, 0.32, 0.22, 10), M('#3a3d4f'), { pos: [0, 4.15, 0] }));
  return b.prop({
    kind: 'coatRack', name: '옷걸이', icon: '🧥', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'cyl', hh: 0.05, r: 0.4, at: [0, 0.05, 0], massShare: 0.35 },
      { shape: 'cyl', hh: 2.0, r: 0.08, at: [0, 2.05, 0], massShare: 0.25 },
      { shape: 'box', hx: 0.38, hy: 0.7, hz: 0.18, at: [0, 3.1, 0], massShare: 0.4 },
    ],
    mass: 3.4, mat: 'wood', value: 40000, toppleValue: 9000,
  });
}

export function umbrellaStand(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.3, 0.26, 0.9, 10), M(o.color ?? '#5ec4c9'), { pos: [0, 0.45, 0] }));
  for (const [x, z, c] of [[0.08, 0.05, '#ff6b6b'], [-0.1, 0, '#ffd23f'], [0, -0.1, '#2f3142']] as const) {
    grp.add(mesh(cyl(0.03, 0.03, 2.0, 5), M('#3a3d4f'), { pos: [x, 1.4, z], rot: [z * 0.6, 0, x * 0.6] }));
    grp.add(mesh(cone(0.14, 0.9, 8), M(c), { pos: [x, 1.2, z], rot: [z * 0.6, 0, x * 0.6] }));
    grp.add(mesh(torus(0.08, 0.025, 4, 8, Math.PI), M('#3a3d4f'), { pos: [x + 0.08, 2.4, z], rot: [0, 0, 0] }));
  }
  return b.prop({
    kind: 'umbrella', name: '우산꽂이', icon: '☂️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.45, r: 0.3, at: [0, 0.45, 0], massShare: 0.6 }, { shape: 'cyl', hh: 0.8, r: 0.18, at: [0, 1.6, 0], massShare: 0.4 }],
    mass: 1.8, mat: 'plastic', value: 25000, toppleValue: 6000,
  });
}

export function grandClock(b: Builder, o: O): Prop {
  const grp = g();
  const wood = M('#8e5f3e');
  grp.add(mesh(box(1.1, 0.5, 0.7, 0.05), wood, { pos: [0, 0.25, 0] }));
  grp.add(mesh(box(0.85, 2.6, 0.6, 0.05), wood, { pos: [0, 1.8, 0] }));
  grp.add(mesh(box(1.05, 1.2, 0.7, 0.08), wood, { pos: [0, 3.7, 0] }));
  grp.add(mesh(cone(0.65, 0.4, 4), wood, { pos: [0, 4.5, 0], rot: [0, Math.PI / 4, 0], scale: [1, 1, 0.65] }));
  const face = new THREE.MeshBasicMaterial({ color: '#fff8e6' });
  grp.add(mesh(cyl(0.4, 0.4, 0.04, 16), face, { pos: [0, 3.7, 0.36], rot: [Math.PI / 2, 0, 0], shadow: false }));
  grp.add(mesh(box(0.04, 0.3, 0.02, 0), M('#2b2233'), { pos: [0, 3.82, 0.39], shadow: false }));
  grp.add(mesh(box(0.22, 0.04, 0.02, 0), M('#2b2233'), { pos: [0.1, 3.7, 0.39], shadow: false }));
  grp.add(mesh(box(0.6, 1.8, 0.02, 0), M('#d8f3ff', { transparent: true, opacity: 0.5 }), { pos: [0, 1.8, 0.31], shadow: false }));
  grp.add(mesh(cyl(0.18, 0.18, 0.04, 12), M('#ffcf3f', { emissive: '#6b4a00', emissiveIntensity: 0.4 }), { pos: [0, 1.2, 0.2], rot: [Math.PI / 2, 0, 0] }));
  return b.prop({
    kind: 'grandClock', name: '괘종시계', icon: '🕰️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: 0.55, hy: 0.25, hz: 0.35, at: [0, 0.25, 0], massShare: 0.3 },
      { shape: 'box', hx: 0.42, hy: 1.3, hz: 0.3, at: [0, 1.8, 0], massShare: 0.35 },
      { shape: 'box', hx: 0.52, hy: 0.6, hz: 0.35, at: [0, 3.7, 0], massShare: 0.35 },
    ],
    mass: 9, mat: 'wood', value: o.value ?? 700000, target: o.target, toppleValue: 20000,
    breakable: {
      threshold: 6, hitForce: 420, mode: 'damage', fx: 'glass', word: '댕-! 와장창',
      debris: { count: 8, colors: ['#e8fbff', '#8e5f3e', '#ffcf3f'], size: 0.18 },
      onDamage: () => { face.color.set('#c9bfa0'); },
    },
  });
}

export function aquarium(b: Builder, o: O): Prop {
  const grp = g();
  const w = 1.6, h = 1.0, d = 0.8;
  grp.add(mesh(box(w, h, d, 0.04), M('#bfeaff', { transparent: true, opacity: 0.45 }), { pos: [0, h / 2, 0] }));
  grp.add(mesh(box(w - 0.08, h * 0.75, d - 0.08, 0), M('#5ab8f0', { transparent: true, opacity: 0.55 }), { pos: [0, h * 0.4, 0], shadow: false }));
  grp.add(mesh(box(w - 0.1, 0.1, d - 0.1, 0), M('#e8d3a8'), { pos: [0, 0.06, 0], shadow: false }));
  for (let i = 0; i < 4; i++) grp.add(mesh(cone(0.08, 0.5 + (i % 2) * 0.2, 5), M('#5bb98c'), { pos: [-0.5 + i * 0.33, 0.35, (i % 2 ? 0.15 : -0.15)], shadow: false }));
  grp.add(mesh(box(w + 0.06, 0.08, d + 0.06, 0.02), M('#2f3142'), { pos: [0, h + 0.04, 0] }));
  return b.prop({
    kind: 'aquarium', name: '수조', icon: '🫧', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: h / 2 + 0.04, hz: d / 2, at: [0, h / 2 + 0.04, 0] }],
    mass: 4, mat: 'glass', value: o.value ?? 260000, target: o.target,
    breakable: { threshold: 4.8, hitForce: 360, mode: 'shatter', fx: 'flood', word: '촤아악!!', debris: { count: 12, colors: ['#bfeaff', '#e8fbff', '#5bb98c'], size: 0.22, flat: true } },
  });
}

export function standFan(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#9fd8cb';
  grp.add(mesh(cyl(0.42, 0.46, 0.1, 10), M(c), { pos: [0, 0.05, 0] }));
  grp.add(mesh(cyl(0.05, 0.05, 1.9, 6), M('#ffffff'), { pos: [0, 1.0, 0] }));
  const head = g();
  head.position.set(0, 2.05, 0);
  head.add(mesh(cyl(0.2, 0.22, 0.3, 10), M(c), { pos: [0, 0, -0.15], rot: [Math.PI / 2, 0, 0] }));
  head.add(mesh(torus(0.6, 0.025, 4, 18), M('#ffffff'), { pos: [0, 0, 0.05] }));
  for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; head.add(mesh(box(0.02, 1.2, 0.02, 0), M('#ffffff'), { pos: [0, 0, 0.12], rot: [0, 0, a], shadow: false })); }
  const blades = g();
  blades.userData.keep = true;
  blades.position.set(0, 0, 0.05);
  for (let i = 0; i < 3; i++) blades.add(mesh(box(0.22, 0.52, 0.02, 0.02), M(c, { transparent: true, opacity: 0.85 }), { pos: [Math.cos((i / 3) * Math.PI * 2) * 0.0, 0, 0], rot: [0, 0.3, (i / 3) * Math.PI * 2], scale: [1, 1, 1], shadow: false }));
  head.add(blades);
  grp.add(head);
  const sp = new FanSpecial(6.5, 24, 7);
  sp.blades = blades;
  return b.prop({
    kind: 'fan', name: '선풍기', icon: '🌀', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.05, r: 0.44, at: [0, 0.05, 0], massShare: 0.45 }, { shape: 'cyl', hh: 0.95, r: 0.07, at: [0, 1.0, 0], massShare: 0.15 }, { shape: 'cyl', hh: 0.2, r: 0.6, at: [0, 2.05, 0], rot: [Math.PI / 2, 0, 0], massShare: 0.4 }],
    mass: 2.2, mat: 'electronic', value: 60000, special: sp, toppleValue: 5000,
    breakable: { threshold: 9, mode: 'damage', fx: 'sparks' },
  });
}

export function shoe(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#e05a5a';
  grp.add(mesh(box(0.34, 0.2, 0.7, 0.08), M(c), { pos: [0, 0.12, 0] }));
  grp.add(mesh(box(0.34, 0.08, 0.72, 0.03), M('#ffffff'), { pos: [0, 0.03, 0] }));
  grp.add(mesh(box(0.3, 0.16, 0.3, 0.06), M(c), { pos: [0, 0.28, -0.18] }));
  return b.prop({
    kind: 'shoe', name: '운동화', icon: '👟', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.17, hy: 0.15, hz: 0.35, at: [0, 0.15, 0] }],
    mass: 0.35, mat: 'soft', value: 2000, floats: true,
  });
}

export function pillow(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(1.2, 0.36, 0.8, 0.16), M(o.color ?? '#ffffff'), { pos: [0, 0.18, 0] }));
  return b.prop({
    kind: 'pillow', name: '베개', icon: '☁️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.6, hy: 0.18, hz: 0.4, at: [0, 0.18, 0], round: 0.12 }],
    mass: 0.5, mat: 'soft', value: 20000, restitution: 0.5, floats: true,
    breakable: { threshold: 11, mode: 'shatter', fx: 'feathers', word: '퐁! 깃털 폭발', debris: { count: 4, colors: ['#ffffff'], size: 0.2, flat: true } },
  });
}

export function guitar(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.42, 0.42, 0.16, 12), M('#d9a35a'), { pos: [0, 0.45, 0], rot: [Math.PI / 2, 0, 0], scale: [1, 1, 1.25] }));
  grp.add(mesh(cyl(0.34, 0.34, 0.16, 12), M('#d9a35a'), { pos: [0, 1.05, 0], rot: [Math.PI / 2, 0, 0] }));
  grp.add(mesh(cyl(0.11, 0.11, 0.17, 10), M('#3a2a1a'), { pos: [0, 0.82, 0.01], rot: [Math.PI / 2, 0, 0], shadow: false }));
  grp.add(mesh(box(0.12, 1.2, 0.06, 0.02), M('#5b3b2b'), { pos: [0, 1.85, 0] }));
  grp.add(mesh(box(0.2, 0.3, 0.07, 0.02), M('#3a2a1a'), { pos: [0, 2.55, 0] }));
  return b.prop({
    kind: 'guitar', name: '기타', icon: '🎸', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.42, hy: 0.6, hz: 0.1, at: [0, 0.7, 0], massShare: 0.7 }, { shape: 'box', hx: 0.08, hy: 0.75, hz: 0.04, at: [0, 2.0, 0], massShare: 0.3 }],
    mass: 1.6, mat: 'wood', value: o.value ?? 320000, target: o.target,
    breakable: { threshold: 6.5, hitForce: 260, mode: 'damage', fx: 'none', word: '띠로링~ 뚝!', debris: { count: 4, colors: ['#d9a35a', '#5b3b2b'], size: 0.14 } },
  });
}

/* ------------------------------ kitchen extras ------------------------------ */

export function cereal(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.5, 0.8, 0.22, 0.03), M(o.color ?? '#ffd23f'), { pos: [0, 0.4, 0] }));
  grp.add(mesh(sphere(0.13, 7, 5), M('#e05a5a'), { pos: [0, 0.48, 0.115], scale: [1, 1, 0.1], shadow: false }));
  return b.prop({
    kind: 'cereal', name: '시리얼', icon: '🥣', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.25, hy: 0.4, hz: 0.11, at: [0, 0.4, 0] }],
    mass: 0.4, mat: 'paper', value: 5000, target: o.target,
    breakable: { threshold: 6, mode: 'shatter', fx: 'cereal', word: '와르르!', debris: { count: 4, colors: ['#ffd23f'], size: 0.18, flat: true } },
  });
}

export function milk(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.34, 0.62, 0.34, 0.03), M('#ffffff'), { pos: [0, 0.31, 0] }));
  grp.add(mesh(cone(0.25, 0.2, 4), M('#ffffff'), { pos: [0, 0.72, 0], rot: [0, Math.PI / 4, 0] }));
  grp.add(mesh(box(0.35, 0.2, 0.35, 0), M('#4f86c6'), { pos: [0, 0.3, 0], shadow: false }));
  return b.prop({
    kind: 'milk', name: '우유', icon: '🥛', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.17, hy: 0.4, hz: 0.17, at: [0, 0.4, 0] }],
    mass: 0.6, mat: 'paper', value: 4000, target: o.target,
    breakable: { threshold: 5.5, mode: 'shatter', fx: 'milk', word: '콸콸!', debris: { count: 3, colors: ['#ffffff', '#4f86c6'], size: 0.15, flat: true } },
  });
}

export function pan(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.45, 0.4, 0.12, 12), M('#3a3d4f'), { pos: [0, 0.06, 0] }));
  grp.add(mesh(box(0.7, 0.06, 0.1, 0.02), M('#5b3b2b'), { pos: [0.75, 0.1, 0] }));
  return b.prop({
    kind: 'pan', name: '프라이팬', icon: '🍳', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.06, r: 0.45, at: [0, 0.06, 0], massShare: 0.85 }, { shape: 'box', hx: 0.35, hy: 0.03, hz: 0.05, at: [0.75, 0.1, 0], massShare: 0.15 }],
    mass: 1.6, mat: 'metal', value: 4000,
  });
}

/** a short static lip/fulcrum for seesaws */
export function fulcrum(b: Builder, x: number, y: number, z: number, len: number, rotY = 0) {
  const grp = g();
  grp.add(mesh(cyl(0.16, 0.16, len, 3), M('#8e5f3e'), { rot: [Math.PI / 2, 0, 0], pos: [0, 0.12, 0] }));
  b.solid(grp, [{ shape: 'cyl', hh: len / 2, r: 0.14, at: [0, 0.12, 0], rot: [Math.PI / 2, 0, 0] }], [x, y, z], rotY);
}

export { ball };
