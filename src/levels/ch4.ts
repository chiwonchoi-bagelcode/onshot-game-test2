import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { Prop } from '../game/Prop';
import type { LevelDef } from '../game/types';
import { M, box, cyl, mesh, screenTexture, sphere, torus } from '../render/kit';
import type { Builder } from './Builder';
import { buildHouse, cabinet, doorOn, rug, wallBoard, windowOn, type HouseInfo } from './house';
import { BATH, BATH_D, BATH_W, bathtub, rect, waterZone } from './rooms';

/* ------------------------------------------------------------------ */
/* Chapter 4 – 욕실: water (things float / sink / short out), slippery   */
/* soap, unrolling toilet paper and the hair dryer's wind.              */
/* ------------------------------------------------------------------ */

const T = BATH.tub;

/** soap on wet tiles: (almost) no friction against anything it touches */
function slick(b: Builder, p: Prop, friction = 0.05): Prop {
  const R = b.game.R;
  for (const h of p.colliderHandles) {
    const c = b.game.world.getCollider(h);
    c.setFriction(friction);
    c.setFrictionCombineRule(R.CoefficientCombineRule.Min);
  }
  return p;
}

/** wooden bath caddy lying across the tub (static) – returns its top y */
function caddy(b: Builder, x: number, w: number) {
  const z0 = T.z0 - 0.02, z1 = T.z1 + 0.02, d = z1 - z0, y = T.rim, th = 0.2;
  const g = new THREE.Group();
  const wood = M('#d9a877'), dark = M('#b98757');
  for (let i = 0; i < 4; i++) g.add(mesh(box(w / 4 - 0.04, th, d, 0.02), i % 2 ? wood : dark, { pos: [-w / 2 + (i + 0.5) * (w / 4), th / 2, 0] }));
  for (const sz of [-1, 1]) g.add(mesh(box(w, 0.08, 0.1, 0.02), dark, { pos: [0, th + 0.04, sz * (d / 2 - 0.05)] }));
  b.solid(g, [
    { shape: 'box', hx: w / 2, hy: th / 2, hz: d / 2, at: [0, th / 2, 0] },
    { shape: 'box', hx: w / 2, hy: 0.04, hz: 0.05, at: [0, th + 0.04, -(d / 2 - 0.05)] },
    { shape: 'box', hx: w / 2, hy: 0.04, hz: 0.05, at: [0, th + 0.04, d / 2 - 0.05] },
  ], [x, y, (z0 + z1) / 2], 0, { friction: 0.6 });
  return y + th;
}

/**
 * Toilet with a hollow bowl. (The shared preset's bowl is a solid cylinder
 * with only ~0.1 of water on top, so anything taller than a coin sits *on*
 * the water instead of in it and never counts as dunked.)
 */
function deepToilet(b: Builder, x: number, z: number) {
  const g = new THREE.Group();
  const wh = M('#ffffff');
  g.add(mesh(cyl(0.38, 0.32, 0.75, 12), wh, { pos: [0, 0.38, 0.15] }));
  g.add(mesh(torus(0.4, 0.09, 6, 14), wh, { pos: [0, 0.98, 0.25], rot: [Math.PI / 2, 0, 0], scale: [1, 1.25, 1] }));
  g.add(mesh(box(0.85, 1.0, 0.45, 0.08), wh, { pos: [0, 1.55, -0.45] }));
  g.add(mesh(box(0.9, 0.08, 0.5, 0.03), M('#e8f4fb'), { pos: [0, 2.06, -0.45] }));
  g.add(mesh(box(0.86, 0.75, 0.06, 0.04), M('#e8f4fb'), { pos: [0, 1.4, -0.12], rot: [-0.15, 0, 0] }));
  g.add(mesh(box(0.15, 0.06, 0.08, 0.02), M('#c9ccd8'), { pos: [0.3, 1.9, -0.2] }));
  g.add(mesh(cyl(0.3, 0.3, 0.02, 12), M('#5ab8f0'), { pos: [0, 0.79, 0.25], scale: [1, 1, 1.25], shadow: false }));
  b.solid(g, [
    { shape: 'cyl', hh: 0.2, r: 0.36, at: [0, 0.2, 0.15] },
    { shape: 'box', hx: 0.42, hy: 0.5, hz: 0.22, at: [0, 1.55, -0.45] },
    { shape: 'box', hx: 0.42, hy: 0.32, hz: 0.07, at: [0, 0.72, 0.72] },
    { shape: 'box', hx: 0.07, hy: 0.32, hz: 0.47, at: [-0.42, 0.72, 0.25] },
    { shape: 'box', hx: 0.07, hy: 0.32, hz: 0.47, at: [0.42, 0.72, 0.25] },
    { shape: 'box', hx: 0.42, hy: 0.3, hz: 0.05, at: [0, 0.7, -0.2] },
  ], [x, 0, z]);
  waterZone(b, x - 0.33, x + 0.33, z - 0.13, z + 0.63, 0.4, 0.86, '#9fe0ff');
}

/** chapter-4 bathroom furniture (room-local around ox, oz) */
function furnishBath4(b: Builder, ox = 0, oz = 0, o: { tub?: boolean; toilet?: boolean; vanity?: boolean; vanityX?: number; backWall?: boolean; leftWall?: boolean; ledges?: boolean } = {}) {
  const Bt = BATH;
  const vx = o.vanityX ?? Bt.vanity.x;
  if (o.tub !== false) {
    bathtub(b, ox + Bt.tub.x0, ox + Bt.tub.x1, oz + Bt.tub.z0, oz + Bt.tub.z1, Bt.tub.rim, Bt.tub.water);
    if (o.ledges !== false) tubLedges(b, ox, oz, { left: o.leftWall !== false, back: o.backWall !== false });
  }
  if (o.toilet !== false) deepToilet(b, ox + Bt.toilet.x, oz + Bt.toilet.z);
  if (o.vanity !== false) {
    cabinet(b, ox + vx, oz + Bt.vanity.z, Bt.vanity.w, Bt.vanity.d, Bt.vanity.top, '#9fd8cb', '#ffffff', 2);
    const vg = new THREE.Group();
    vg.add(mesh(box(0.9, 0.04, 0.55, 0), M('#c9e7f2'), { pos: [0, 0.02, 0.05], shadow: false }));
    vg.add(mesh(cyl(0.05, 0.05, 0.45, 6), M('#c9ccd8'), { pos: [0, 0.22, -0.3] }));
    vg.position.set(ox + vx, Bt.vanity.top, oz + Bt.vanity.z);
    b.deco(vg);
  }
  if (o.backWall !== false) {
    if (o.vanity !== false) {
      const mg = new THREE.Group();
      mg.add(mesh(box(1.5, 1.4, 0.08, 0.04), M('#ffffff')));
      mg.add(mesh(box(1.3, 1.2, 0.02, 0), new THREE.MeshLambertMaterial({ color: '#d6f3ff', emissive: '#8fd0ee', emissiveIntensity: 0.35 }), { pos: [0, 0, 0.05], shadow: false }));
      mg.position.set(ox + vx, Bt.vanity.top + 1.6, oz - BATH_D / 2 + 0.06);
      b.deco(mg);
    }
    windowOn(b, { z: oz - BATH_D / 2 }, ox - 2.05, 5.4, 1.4, 1.0, false, '#9fd8cb');
  }
  rug(b, ox - 1.9, oz - 0.75, 2.2, 1.0, ['#ffb3c6', '#ffffff', '#ffffff']);
  if (o.leftWall !== false) {
    const tr = new THREE.Group();
    tr.add(mesh(cyl(0.04, 0.04, 1.6, 6), M('#c9ccd8'), { rot: [Math.PI / 2, 0, 0] }));
    tr.add(mesh(box(0.08, 1.1, 0.75, 0.04), M('#ff9fb6'), { pos: [0.06, -0.55, -0.35] }));
    tr.add(mesh(box(0.08, 0.9, 0.6, 0.04), M('#9fd8cb'), { pos: [0.06, -0.45, 0.4] }));
    tr.position.set(ox - BATH_W / 2 + 0.12, 3.2, oz + 0.3);
    b.deco(tr);
  }
}

/** single bathroom stage (owner comes in through the left door) */
function bathRoom(b: Builder, o: Parameters<typeof furnishBath4>[3] = {}): HouseInfo {
  const info = buildHouse(b, { rooms: [rect('bath', '욕실', 0, 0, BATH_W, BATH_D, 'tile', 'bath')], base: '#5c8fb0', h: 6.8 });
  furnishBath4(b, 0, 0, o);
  doorOn(b, { x: -BATH_W / 2 }, BATH.doorZ, '#9fd8cb');
  b.ownerAtDoor(-BATH_W / 2 + 0.9, 0, BATH.doorZ, Math.PI / 2);
  return info;
}

void sphere;

/* ------------------------------ chapter props ------------------------------ */

const zap = { threshold: 9, mode: 'damage' as const, fx: 'sparks' as const, word: '지지직!' };

/** 전동칫솔 on its charging stand – tall, tippy, hates water */
function toothbrush(b: Builder, o: { at: [number, number, number]; rot?: number; color?: string; value?: number }): Prop {
  const g = new THREE.Group();
  const c = o.color ?? '#7fd3ff';
  g.add(mesh(cyl(0.16, 0.18, 0.12, 10), M('#ffffff'), { pos: [0, 0.06, 0] }));
  g.add(mesh(cyl(0.075, 0.085, 0.5, 8), M(c), { pos: [0, 0.37, 0] }));
  g.add(mesh(cyl(0.03, 0.05, 0.18, 6), M('#ffffff'), { pos: [0, 0.71, 0] }));
  g.add(mesh(box(0.08, 0.1, 0.06, 0.02), M('#ffffff'), { pos: [0, 0.82, 0.03] }));
  g.add(mesh(cyl(0.025, 0.025, 0.02, 6), M('#5bb98c', { emissive: '#5bb98c', emissiveIntensity: 0.6 }), { pos: [0, 0.45, 0.075], rot: [Math.PI / 2, 0, 0], shadow: false }));
  return b.prop({
    kind: 'gadget', name: '전동칫솔', icon: '🪥', group: g, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.16, hy: 0.06, hz: 0.16, at: [0, 0.06, 0], massShare: 0.45 }, { shape: 'box', hx: 0.08, hy: 0.35, hz: 0.08, at: [0, 0.47, 0], massShare: 0.55 }],
    mass: 0.35, mat: 'electronic', value: o.value ?? 150000, traits: ['전자제품', '물에 약함', '잘 넘어짐'], angDamp: 1.0,
    breakable: zap,
  });
}

/** the owner's phone propped up on a little stand (video in the bath!) – tall, tippy */
function standPhone(b: Builder, o: { at: [number, number, number]; rot?: number; target?: boolean; value?: number }): Prop {
  const g = new THREE.Group();
  const tex = screenTexture('laptop');
  const scr = new THREE.MeshBasicMaterial({ map: tex ?? null, color: tex ? 0xffffff : 0xc6d6ff });
  const tilt = -0.22;
  const ph = new THREE.Group();
  ph.add(mesh(box(0.46, 0.84, 0.07, 0.03), M('#2f3142'), { pos: [0, 0.42, 0] }));
  ph.add(mesh(box(0.4, 0.74, 0.01, 0), scr, { pos: [0, 0.43, 0.04], shadow: false }));
  ph.position.set(0, 0.08, 0.02);
  ph.rotation.x = tilt;
  g.add(ph);
  g.add(mesh(box(0.42, 0.08, 0.36, 0.03), M('#ffffff'), { pos: [0, 0.04, -0.04] }));
  g.add(mesh(box(0.3, 0.4, 0.05, 0.02), M('#ffffff'), { pos: [0, 0.24, -0.2], rot: [tilt, 0, 0] }));
  return b.prop({
    kind: 'phone', name: '집사 폰', icon: '📱', group: g, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: 0.21, hy: 0.04, hz: 0.18, at: [0, 0.04, -0.04], massShare: 0.4 },
      { shape: 'box', hx: 0.23, hy: 0.42, hz: 0.05, at: [0, 0.08 + 0.42 * Math.cos(tilt), 0.02 - 0.42 * Math.sin(tilt) * -1], rot: [tilt, 0, 0], massShare: 0.6 },
    ],
    mass: 0.5, mat: 'electronic', value: o.value ?? 950000, target: o.target, friction: 0.45, restitution: 0.2,
    breakable: {
      threshold: 9, mode: 'damage', fx: 'sparks', word: '액정 박살!',
      onDamage: () => { const t = screenTexture('broken'); if (t) scr.map = t; else scr.color.set('#111'); scr.needsUpdate = true; },
    },
  });
}

/** 블루투스 스피커 – a chunky little cylinder */
function speaker(b: Builder, o: { at: [number, number, number]; rot?: number; color?: string; value?: number }): Prop {
  const g = new THREE.Group();
  const c = o.color ?? '#ff8fa3';
  g.add(mesh(cyl(0.22, 0.22, 0.42, 12), M(c), { pos: [0, 0.21, 0] }));
  g.add(mesh(cyl(0.2, 0.2, 0.3, 12), M('#3a3d4f'), { pos: [0, 0.21, 0.025], scale: [1, 1, 0.9], shadow: false }));
  g.add(mesh(cyl(0.12, 0.12, 0.02, 10), M('#ffffff'), { pos: [0, 0.43, 0], shadow: false }));
  g.add(mesh(box(0.1, 0.04, 0.04, 0.01), M('#ffffff'), { pos: [0, 0.31, 0.21], shadow: false }));
  return b.prop({
    kind: 'gadget', name: '블루투스 스피커', icon: '🔊', group: g, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.2, hy: 0.21, hz: 0.2, at: [0, 0.21, 0], round: 0.07 }],
    angDamp: 1.2, mass: 2.4, mat: 'electronic', value: o.value ?? 150000, traits: ['전자제품', '물에 약함', '묵직함'],
    breakable: zap,
  });
}

/**
 * Sloped tiled ledges where the tub meets the walls: anything flung against
 * the wall above the tub slides back into the water instead of wedging
 * between rim and wall.
 */
function tubLedges(b: Builder, ox = 0, oz = 0, o: { left?: boolean; back?: boolean } = {}) {
  const x0 = ox + T.x0, x1 = ox + T.x1, z0 = oz + T.z0, z1 = oz + T.z1;
  const wallX = ox - 3.7, wallZ = oz - 3.3, th = 0.3;
  const tile = M('#f4fbff'), edge = M('#bfe6f2');
  const ledge = (ax: number, ay: number, bx: number, by: number, along: number, len: number, axis: 'x' | 'z') => {
    // slope in the (u, y) plane from wall point a down to rim point b; u = x or z
    const du = bx - ax, dy = by - ay, L = Math.hypot(du, dy);
    const ang = Math.atan2(dy, du);
    const nu = -Math.sin(ang), ny = Math.cos(ang); // top-surface normal
    const cu = (ax + bx) / 2 - nu * th / 2, cy = (ay + by) / 2 - ny * th / 2;
    const g = new THREE.Group();
    const vis = mesh(box(axis === 'x' ? L : len, th, axis === 'x' ? len : L, 0.04), tile);
    const lip = mesh(box(axis === 'x' ? 0.06 : len, 0.06, axis === 'x' ? len : 0.06, 0.02), edge, { shadow: false });
    if (axis === 'x') { vis.rotation.z = ang; lip.position.set(bx - cu, by - cy + 0.02, 0); }
    else { vis.rotation.x = -ang; lip.position.set(0, by - cy + 0.02, bx - cu); }
    g.add(vis, lip);
    const pos: [number, number, number] = axis === 'x' ? [cu, cy, along] : [along, cy, cu];
    b.solid(g, [{ shape: 'box', hx: axis === 'x' ? L / 2 : len / 2, hy: th / 2, hz: axis === 'x' ? len / 2 : L / 2, rot: axis === 'x' ? [0, 0, ang] : [-ang, 0, 0] }], pos, 0, { friction: 0.3, restitution: 0.1 });
  };
  if (o.left !== false) ledge(wallX, T.rim + 0.75, x0 + 0.26, T.rim + 0.02, (z0 + z1) / 2, z1 - z0, 'x');
  if (o.back !== false) ledge(wallZ, T.rim + 0.75, z0 + 0.26, T.rim + 0.02, (x0 + x1) / 2, x1 - x0, 'z');
}

/* =============================== 4-1 =============================== */

const S4_1: LevelDef = {
  id: '4-1', chapter: 4, theme: 'bathroom', title: '풍덩!', subtitle: '욕조 받침대 위에 집사 폰이… 물 바로 옆에?',
  paws: 3,
  goal: { kind: 'dunk', text: '집사 폰을 욕조에 빠뜨려라', short: '폰 풍덩' },
  stars: [1190000, 1320000],
  challenges: [
    { type: 'indirect', text: '폰을 직접 치지 않고 빠뜨리기' },
    { type: 'stat', key: 'dunk', min: 5, text: '물건 5개를 물에 풍덩' },
    { type: 'count', kind: 'gadget', event: 'dunk', n: 2, text: '전동칫솔·스피커까지 물에 풍덩' },
  ],
  tip: '물에 빠진 전자제품은 고장! 가벼운 물건은 둥둥 떠요.',
  hints: ['폰을 욕조 물 쪽(왼쪽)으로 밀어요.', '비누는 아주 미끄러워요. 비누를 쳐서 폰을 밀어 넣을 수도!', '전동칫솔과 물탱크 위 스피커도 전자제품! 스피커는 살살 쳐야 변기 속으로 쏙.'],
  hintMove: { prop: 'phone', dir: [-1, 0] },
  tutorial: [
    { text: '받침대 위 집사 폰! 폰을 누르고 욕조 물 쪽(왼쪽)으로 끌었다 놓아요.', prop: 'phone', dir: [-1, 0] },
    { text: '풍덩! 지지직~ 전자제품은 물에 빠지면 고장나요. 남은 앞발로 다른 것도 빠뜨려 봐요!', until: 'settle' },
  ],
  ownerLine: '내 폰!!! 방수라며?!',
  build(b) {
    bathRoom(b);
    // bath caddy across the tub: the owner was watching videos in the bath…
    const cx = -1.4;
    const y = caddy(b, cx, 0.95);
    standPhone(b, { at: [cx - 0.2, y, -2.62], target: true, rot: 0 });
    slick(b, C2.soap(b, { at: [cx + 0.3, y, -2.6], rot: Math.PI / 2, color: '#9fe0c8' }));
    toothbrush(b, { at: [cx - 0.2, y, -1.98] });
    C2.shampoo(b, { at: [cx + 0.28, y, -1.98] });
    // vanity: glass things
    const vt = BATH.vanity.top, vx = BATH.vanity.x, vz = BATH.vanity.z;
    C2.perfume(b, { at: [vx - 0.5, vt, vz - 0.15], rot: 0.3 });
    C2.toothCup(b, { at: [vx + 0.6, vt, vz + 0.25] });
    // toilet tank: the owner's speaker
    speaker(b, { at: [BATH.toilet.x, BATH.toilet.tankTop, BATH.toilet.z - 0.36] });
    // bath toys already bobbing in the tub
    for (const [x, z, r] of [[-2.9, -2.6, 0.4], [-2.4, -2.15, 2.4]] as const) C.rubberDuck(b, { at: [x, T.water - 0.25, z], rot: r }).dunked = true;
    b.cat(2.4, 0, 2.2);
  },
};

/* =============================== 4-2 =============================== */

/** small plastic bath stool (dynamic) – returns its seat height */
function bathStool(b: Builder, o: { at: [number, number, number]; rot?: number; color?: string; h?: number; w?: number; d?: number; mass?: number; name?: string }) {
  const h = o.h ?? 0.95, w = o.w ?? 0.9, dd = o.d ?? w;
  const g = new THREE.Group();
  const c = M(o.color ?? '#7fd3ff');
  g.add(mesh(box(w, 0.12, dd, 0.05), c, { pos: [0, h - 0.06, 0] }));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(mesh(box(0.12, h - 0.12, 0.12, 0.03), c, { pos: [sx * (w / 2 - 0.08), (h - 0.12) / 2, sz * (dd / 2 - 0.08)] }));
  const cols: import('../game/types').ColDef[] = [{ shape: 'box', hx: w / 2, hy: 0.06, hz: dd / 2, at: [0, h - 0.06, 0], massShare: 0.5 }];
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cols.push({ shape: 'box', hx: 0.06, hy: (h - 0.12) / 2, hz: 0.06, at: [sx * (w / 2 - 0.08), (h - 0.12) / 2, sz * (dd / 2 - 0.08)], massShare: 0.08 });
  // low stretchers between the legs (so a sliding soap can't just pass under)
  for (const s of [-1, 1]) {
    g.add(mesh(box(w - 0.1, 0.08, 0.06, 0.02), c, { pos: [0, 0.12, s * (dd / 2 - 0.08)] }));
    g.add(mesh(box(0.06, 0.08, dd - 0.1, 0.02), c, { pos: [s * (w / 2 - 0.08), 0.12, 0] }));
    cols.push({ shape: 'box', hx: (w - 0.1) / 2, hy: 0.06, hz: 0.04, at: [0, 0.12, s * (dd / 2 - 0.08)], massShare: 0.045 });
    cols.push({ shape: 'box', hx: 0.04, hy: 0.06, hz: (dd - 0.1) / 2, at: [s * (w / 2 - 0.08), 0.12, 0], massShare: 0.045 });
  }
  const prop = b.prop({
    kind: 'stool', name: o.name ?? '목욕 의자', icon: '🪑', group: g, pos: o.at, rotY: o.rot, colliders: cols,
    mass: o.mass ?? 0.8, mat: 'plastic', value: 8000, toppleValue: 3000, friction: 0.35, traits: ['가벼움', '미끄러짐'],
  });
  return { prop, seat: o.at[1] + h };
}

/**
 * Glass shower booth in the front-right corner. The cat can't get in (the
 * glass door is shut) – but there is a gap under the door…
 * x0/z0 = inner corner; the door is in the x0 wall between dz0..dz1.
 */
function showerBooth(b: Builder, x0: number, z0: number, x1: number, z1: number, dz0: number, dz1: number, gapH = 0.34) {
  const H = 3.0, t = 0.08;
  const glass = M('#d8f3ff', { transparent: true, opacity: 0.32 });
  const frame = M('#c9ccd8');
  const g = new THREE.Group();
  const panel = (cx: number, cz: number, w: number, d: number, y0: number, y1: number) => {
    g.add(mesh(box(w, y1 - y0, d, 0.01), glass, { pos: [cx, (y0 + y1) / 2, cz], shadow: false }));
    g.add(mesh(box(w + 0.04, 0.06, d + 0.04, 0.01), frame, { pos: [cx, y1, cz] }));
  };
  const cols: import('../game/types').ColDef[] = [];
  // back wall (along x at z0)
  panel((x0 + x1) / 2, z0, x1 - x0, t, 0, H);
  cols.push({ shape: 'box', hx: (x1 - x0) / 2, hy: H / 2, hz: t / 2, at: [(x0 + x1) / 2, H / 2, z0] });
  // side wall (along z at x0) with the door
  const seg = (a: number, c: number) => { if (c - a < 0.02) return; panel(x0, (a + c) / 2, t, c - a, 0, H); cols.push({ shape: 'box', hx: t / 2, hy: H / 2, hz: (c - a) / 2, at: [x0, H / 2, (a + c) / 2] }); };
  seg(z0, dz0);
  seg(dz1, z1);
  panel(x0, (dz0 + dz1) / 2, t, dz1 - dz0, gapH, H);
  cols.push({ shape: 'box', hx: t / 2, hy: (H - gapH) / 2, hz: (dz1 - dz0) / 2, at: [x0, (H + gapH) / 2, (dz0 + dz1) / 2] });
  g.add(mesh(box(0.06, 0.5, 0.06, 0.02), frame, { pos: [x0 + 0.07, 1.6, dz1 - 0.15] }));
  for (const zz of [z0, dz0, dz1]) g.add(mesh(box(0.08, H, 0.08, 0.02), frame, { pos: [x0, H / 2, zz] }));
  g.add(mesh(box(0.08, H, 0.08, 0.02), frame, { pos: [x1, H / 2, z0] }));
  // shower head on the back panel + floor drain
  g.add(mesh(cyl(0.04, 0.04, 1.4, 6), frame, { pos: [x1 - 0.5, 2.6, z0 + 0.12] }));
  g.add(mesh(cyl(0.22, 0.16, 0.12, 10), frame, { pos: [x1 - 0.5, 3.3, z0 + 0.3], rot: [0.5, 0, 0] }));
  g.add(mesh(cyl(0.18, 0.18, 0.02, 10), M('#9aa6b8'), { pos: [(x0 + x1) / 2, 0.012, (z0 + z1) / 2], shadow: false }));
  b.solid(g, cols, [0, 0, 0], 0, { friction: 0.3, restitution: 0.3 });
}

/** a plain plank laid across TP-roll pillars */
function plank(b: Builder, o: { at: [number, number, number]; w: number; d?: number; rot?: number; color?: string }): Prop {
  const d = o.d ?? 0.6, h = 0.08;
  const g = new THREE.Group();
  g.add(mesh(box(o.w, h, d, 0.02), M(o.color ?? '#ffffff'), { pos: [0, h / 2, 0] }));
  return b.prop({
    kind: 'plank', name: '욕실 선반 판', icon: '🪵', group: g, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: o.w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }],
    mass: 0.45, mat: 'plastic', value: 3000, toppleValue: 800, friction: 0.5,
  });
}

/** Angry-Birds style tower of standing TP rolls and planks; returns top y */
function tpTower(b: Builder, x: number, z: number, floors: number, span = 0.95, rot = 0, interact = true) {
  const ca = Math.cos(rot), sa = Math.sin(rot);
  let y = 0;
  const made: Prop[] = [];
  for (let f = 0; f < floors; f++) {
    for (const s of [-1, 1]) made.push(C2.toiletPaper(b, { at: [x + ca * s * span / 2, y, z - sa * s * span / 2], lying: false }));
    y += 0.38;
    made.push(plank(b, { at: [x, y, z], w: span + 0.6, rot }));
    y += 0.08;
  }
  if (!interact) for (const p of made) p.interactable = false;
  return y;
}

/** free-standing shower caddy: a tall pole with three wire baskets. Light and top-heavy. */
function caddyTower(b: Builder, o: { at: [number, number, number]; rot?: number; levels?: number[] }) {
  const levels = o.levels ?? [0.9, 1.55, 2.2];
  const H = levels[levels.length - 1] + 0.5;
  const g = new THREE.Group();
  const chrome = M('#c9ccd8'), basket = M('#ffffff');
  g.add(mesh(cyl(0.24, 0.27, 0.26, 10), M('#7fd3ff'), { pos: [0, 0.13, 0] }));
  g.add(mesh(cyl(0.035, 0.035, H, 6), chrome, { pos: [0, H / 2, 0] }));
  const bw = 0.95, bd = 0.42;
  const cols: import('../game/types').ColDef[] = [
    { shape: 'cyl', hh: 0.13, r: 0.26, at: [0, 0.13, 0], massShare: 0.3 },
    { shape: 'cyl', hh: H / 2, r: 0.04, at: [0, H / 2, 0], massShare: 0.1 },
  ];
  for (const y of levels) {
    g.add(mesh(box(bw, 0.04, bd, 0.01), basket, { pos: [0, y, 0] }));
    g.add(mesh(box(bw, 0.1, 0.03, 0.01), chrome, { pos: [0, y + 0.05, bd / 2] }));
    g.add(mesh(box(bw, 0.1, 0.03, 0.01), chrome, { pos: [0, y + 0.05, -bd / 2] }));
    cols.push({ shape: 'box', hx: bw / 2, hy: 0.02, hz: bd / 2, at: [0, y, 0], massShare: 0.6 / levels.length / 2 });
    cols.push({ shape: 'box', hx: bw / 2, hy: 0.05, hz: 0.015, at: [0, y + 0.07, bd / 2], massShare: 0.6 / levels.length / 4 });
    cols.push({ shape: 'box', hx: bw / 2, hy: 0.05, hz: 0.015, at: [0, y + 0.07, -bd / 2], massShare: 0.6 / levels.length / 4 });
  }
  const prop = b.prop({
    kind: 'caddyTower', name: '샤워 선반', icon: '🧺', group: g, pos: o.at, rotY: o.rot, colliders: cols,
    mass: Number(process.env.CM ?? 1.0), mat: 'metal', value: 25000, toppleValue: 6000, friction: 0.5, traits: ['키가 큼', '가벼움', '잘 넘어짐'],
  });
  return { prop, levels: levels.map((y) => o.at[1] + y + 0.02) };
}

const S4_2: LevelDef = {
  id: '4-2', chapter: 4, theme: 'bathroom', title: '문틈으로 미끄덩', subtitle: 'probe',
  paws: 2,
  goal: { kind: 'break', count: 4, text: '샤워부스 안 향수 4병을 깨뜨려라', short: '향수 깨기' },
  stars: [100000, 200000],
  challenges: [],
  hints: ['a', 'b', 'c'],
  build(b) {
    bathRoom(b);
    const bx0 = 1.5, bz0 = 0.5, bx1 = BATH_W / 2, bz1 = BATH_D / 2;
    showerBooth(b, bx0, bz0, bx1, bz1, 1.0, 2.8);
    const bw = Number(process.env.BW ?? 0.7), bd = Number(process.env.BD ?? 1.5);
    const st = bathStool(b, { at: [2.3, 0, 1.9], w: bw, d: bd, mass: Number(process.env.BM ?? 0.8), name: '샤워 벤치' });
    slick(b, st.prop, Number(process.env.STF ?? 0.05));
    st.prop.interactable = false;
    const cols = ['#ff9fc0', '#c9a0dc', '#7fd3ff', '#ffd23f'];
    [-0.54, -0.18, 0.18, 0.54].forEach((dz, i) => { const p = C2.perfume(b, { at: [2.3 - 0.08, st.seat, 1.9 + dz], target: true, rot: Math.PI / 2, color: cols[i] }); p.interactable = false; });
    slick(b, C2.soap(b, { at: [-2.6, 0, 1.9] }), Number(process.env.SF ?? 0.03));
    b.cat(-1.0, 0, 2.7);
  },
};

export const CH4: LevelDef[] = [S4_1, S4_2];
