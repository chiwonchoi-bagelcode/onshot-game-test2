import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { Prop } from '../game/Prop';
import { TrailSpecial } from '../game/specials';
import type { LevelDef } from '../game/types';
import { M, box, cyl, mesh, screenTexture, sphere, torus } from '../render/kit';
import type { Builder } from './Builder';
import { buildHouse, cabinet, clockOn, doorOn, posterOn, rug, windowOn, type HouseInfo } from './house';
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
    { shape: 'cyl', hh: 0.05, r: 0.36, at: [0, 0.05, 0.15] },
    { shape: 'box', hx: 0.42, hy: 0.5, hz: 0.22, at: [0, 1.55, -0.45] },
    { shape: 'box', hx: 0.42, hy: 0.47, hz: 0.07, at: [0, 0.57, 0.72] },
    { shape: 'box', hx: 0.07, hy: 0.47, hz: 0.47, at: [-0.42, 0.57, 0.25] },
    { shape: 'box', hx: 0.07, hy: 0.47, hz: 0.47, at: [0.42, 0.57, 0.25] },
    { shape: 'box', hx: 0.42, hy: 0.47, hz: 0.05, at: [0, 0.57, -0.2] },
  ], [x, 0, z]);
  waterZone(b, x - 0.33, x + 0.33, z - 0.13, z + 0.63, 0.12, 0.86, '#9fe0ff');
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

/**
 * Toilet-paper roll. Same as the catalog roll, but a lying roll is built by
 * rotating the *body* (the catalog version rotates the collider inside an
 * upright body, which makes Rapier slowly stand the roll up on its own and
 * puts the paper trail under the floor).
 */
function tpRoll(b: Builder, o: { at: [number, number, number]; rot?: number; lying?: boolean; target?: boolean; name?: string }): Prop {
  const lying = o.lying ?? true, r = 0.26, hh = 0.19;
  const g = new THREE.Group();
  g.add(mesh(cyl(r, r, hh * 2, 12), M('#ffffff')));
  g.add(mesh(cyl(0.09, 0.09, hh * 2 + 0.01, 8), M('#c9a27a'), { shadow: false }));
  for (const y of [-0.12, 0, 0.12]) g.add(mesh(torus(r + 0.002, 0.006, 3, 16), M('#e8e8f0'), { pos: [0, y, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(lying ? Math.PI / 2 : 0, o.rot ?? 0, 0, 'YXZ'));
  const trail = new TrailSpecial(b.game, '#ffffff', r, 0.13, 'tpLen', 420);
  // the trail mesh has no normals (renders black under Lambert lighting). Its triangles face
  // down, so the visible (back) side gets the flipped normal: store "down" to light it as "up".
  const tgeo = (trail as unknown as { geo: THREE.BufferGeometry }).geo;
  const nn = new Float32Array(tgeo.attributes.position.count * 3);
  for (let i = 1; i < nn.length; i += 3) nn[i] = -1;
  tgeo.setAttribute('normal', new THREE.BufferAttribute(nn, 3));
  const p = b.prop({
    kind: 'tp', name: o.name ?? '두루마리 휴지', icon: '🧻', group: g, pos: [o.at[0], o.at[1] + (lying ? r : hh), o.at[2]], quat: q,
    colliders: [{ shape: 'cyl', hh, r }],
    mass: 0.25, mat: 'paper', value: 1500, angDamp: 0.15, linDamp: 0.04, friction: 0.9, noTopple: true, floats: false, target: o.target,
    // soaked paper goes soggy and sinks (a floating roll pinned under another one jitters forever)
    breakable: { threshold: 999, mode: 'damage', fx: 'paper', word: '흐물흐물…' },
    special: trail, traits: ['굴러감', '풀림', '물에 흐물'],
  });
  // a round roll on a flat top creeps from solver jitter: start it asleep (any touch wakes it)
  p.body.sleep();
  return p;
}

/** folded towel (soft, cheap clutter that floats) */
function towel(b: Builder, o: { at: [number, number, number]; rot?: number; color?: string }): Prop {
  const g = new THREE.Group();
  const c = o.color ?? '#ffb3c6';
  g.add(mesh(box(0.8, 0.16, 0.5, 0.06), M(c), { pos: [0, 0.08, 0] }));
  g.add(mesh(box(0.82, 0.03, 0.52, 0.01), M('#ffffff'), { pos: [0, 0.12, 0], shadow: false }));
  return b.prop({
    kind: 'towel', name: '수건', icon: '🧺', group: g, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.4, hy: 0.08, hz: 0.25, at: [0, 0.08, 0], round: 0.04 }],
    mass: 0.3, mat: 'soft', value: 3000, floats: true, friction: 0.8, traits: ['푹신함', '물에 뜸'],
  });
}
function towelStack(b: Builder, x: number, y: number, z: number, n: number, rot = 0) {
  const cols = ['#ffb3c6', '#9fd8cb', '#ffffff', '#ffe08a'];
  for (let i = 0; i < n; i++) towel(b, { at: [x, y + i * 0.16, z], rot: rot + (i % 2 ? 0.08 : -0.05), color: cols[i % cols.length] });
}

/** a pair of bath slippers */
function slippers(b: Builder, x: number, z: number, rot = 0, color = '#9fd8cb') {
  for (const s of [-1, 1]) {
    const g = new THREE.Group();
    g.add(mesh(box(0.3, 0.07, 0.62, 0.03), M(color), { pos: [0, 0.035, 0] }));
    g.add(mesh(box(0.32, 0.12, 0.24, 0.05), M('#ffffff'), { pos: [0, 0.1, 0.12] }));
    const ca = Math.cos(rot), sa = Math.sin(rot);
    b.prop({
      kind: 'slipper', name: '욕실 슬리퍼', icon: '🩴', group: g, pos: [x + ca * s * 0.2, 0, z - sa * s * 0.2], rotY: rot + s * 0.06,
      colliders: [{ shape: 'box', hx: 0.15, hy: 0.06, hz: 0.31, at: [0, 0.06, 0] }],
      mass: 0.2, mat: 'plastic', value: 1500, floats: true,
    });
  }
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
    for (const [x, z, r] of [[-2.9, -2.6, 0.4], [-2.4, -2.15, 2.4]] as const) C.rubberDuck(b, { at: [x, 0.49, z], rot: r }).dunked = true;
    // floor
    towelStack(b, 1.9, 0, -1.2, 3, 0.2);
    slippers(b, -3.0, 1.0, 1.4);
    laundryBasket(b, { at: [2.9, 0, 0.9] });
    tpRoll(b, { at: [3.3, 0, -1.25], lying: false });
    tpRoll(b, { at: [3.3, 0.38, -1.25], lying: false });
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

const S4_2: LevelDef = {
  id: '4-2', chapter: 4, theme: 'bathroom', title: '문틈으로 미끄덩', subtitle: '샤워부스 문은 닫혔지만… 문 아래 틈이 있다',
  paws: 2,
  goal: { kind: 'break', count: 3, text: '샤워부스 안 명품 향수 3병을 깨뜨려라', short: '부스 향수' },
  stars: [400000, 525000],
  challenges: [
    { type: 'paws', max: 1, text: '비누 한 방으로 클리어' },
    { type: 'count', kind: 'perfume', n: 6, text: '향수 6병 전부 와장창' },
    { type: 'discover', id: 'tp', text: '휴지도 길게 풀어 버리기' },
  ],
  tip: '샤워부스 문이 닫혀 있어 냥이는 못 들어가요. 그런데 문 아래 틈이…?',
  hints: ['바닥의 비누를 샤워부스 문 쪽으로 세게 쳐 보세요.', '비누는 거의 안 멈춰요. 젖은 벤치를 맞히면 벤치가 쭉 밀려나요!', '정면으로 세게 치면 4병 스트라이크! 남은 앞발로 세면대 향수 2병을 한 번에 쓸어요.'],
  hintMove: { prop: 'soap', dir: [1, 0] },
  ownerLine: '내 향수 컬렉션!! 샤워부스 문은 닫아 뒀는데?!',
  build(b) {
    bathRoom(b);
    // glass shower booth (front-right). The cat can't get in – the soap can.
    const bx0 = 1.5, bz0 = 0.5;
    showerBooth(b, bx0, bz0, BATH_W / 2, BATH_D / 2, 0.85, 3.05);
    const st = bathStool(b, { at: [2.3, 0, 1.95], w: 0.7, d: 2.0, name: '샤워 벤치', color: '#ffd6e3' });
    slick(b, st.prop, 0.05);
    const inside: Prop[] = [st.prop];
    const cols = ['#ff9fc0', '#c9a0dc', '#7fd3ff', '#ffd23f'];
    [-0.72, -0.24, 0.24, 0.72].forEach((dz, i) => inside.push(C2.perfume(b, { at: [2.22, st.seat, 1.95 + dz], target: true, rot: Math.PI / 2, color: cols[i], name: '명품 향수' })));
    inside.push(C2.shampoo(b, { at: [3.3, 0, 0.9], color: '#ff9fb6' }), C2.shampoo(b, { at: [3.35, 0, 1.4] }));
    for (const p of inside) p.interactable = false;
    // soaps: one by the bath mat, one by the tub
    const vt = BATH.vanity.top, vx = BATH.vanity.x, vz = BATH.vanity.z;
    const soaps = [slick(b, C2.soap(b, { at: [-2.6, 0, 1.95] }), 0.03)];
    // once a soap is inside the booth the cat can't reach it either
    b.game.addUpdater(() => { for (const p of soaps) if (p.interactable) { const t = p.body.translation(); if (t.x > bx0 + 0.1 && t.z > bz0) p.interactable = false; } });
    // vanity: two more bottles + a cup (reachable)
    C2.perfume(b, { at: [vx + -0.2, vt, vz + 0.25], color: '#ff8fa3', rot: 0 });
    C2.perfume(b, { at: [vx + 0.2, vt, vz + 0.25], color: '#9fe0c8', rot: 0 });
    C2.toothCup(b, { at: [vx + 0.55, vt, vz - 0.25] });
    C2.toiletPaper(b, { at: [BATH.toilet.x, BATH.toilet.tankTop, BATH.toilet.z - 0.45], lying: false });
    // clutter (kept out of the soap's lane)
    for (const [x, z, r] of [[-2.9, -2.6, 0.4], [-1.6, -2.2, 2.4]] as const) C.rubberDuck(b, { at: [x, 0.49, z], rot: r }).dunked = true;
    towelStack(b, -0.2, 0, -1.0, 3, -0.3);
    slippers(b, -3.15, 0.55, 1.5, '#ffb3c6');
    laundryBasket(b, { at: [0.9, 0, -1.0] });
    b.cat(-1.2, 0, 2.6);
  },
};

/* =============================== 4-3 =============================== */

/** tiled privacy half-wall (static) along z at x */
function partition(b: Builder, x: number, z0: number, z1: number, h: number, t = 0.16) {
  const g = new THREE.Group();
  g.add(mesh(box(t, h, z1 - z0, 0.03), M('#d6f0f7'), { pos: [0, h / 2, 0] }));
  g.add(mesh(box(t + 0.06, 0.08, z1 - z0 + 0.04, 0.02), M('#ffffff'), { pos: [0, h + 0.04, 0] }));
  b.solid(g, [{ shape: 'box', hx: t / 2, hy: h / 2, hz: (z1 - z0) / 2, at: [0, h / 2, 0] }], [x, 0, (z0 + z1) / 2], 0, { friction: 0.8, restitution: 0.05 });
}

/** static sloped board (chute) along x from (xa, ya) high to (xb, yb) low, centred at z */
function chute(b: Builder, xa: number, ya: number, xb: number, yb: number, z: number, d = 0.6, color = '#ffffff', frontRail = true) {
  const th = 0.1;
  const dx = xb - xa, dy = yb - ya, L = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
  const nx = -Math.sin(ang), ny = Math.cos(ang);
  const cx = (xa + xb) / 2 - nx * th / 2, cy = (ya + yb) / 2 - ny * th / 2;
  const g = new THREE.Group();
  const board = mesh(box(L, th, d, 0.02), M(color));
  board.rotation.z = ang;
  g.add(board);
  // side rails so the rolls stay in the lane
  for (const s of frontRail ? [-1, 1] : [-1]) { const rl = mesh(box(L, 0.16, 0.04, 0.01), M('#9fd8cb')); rl.rotation.z = ang; rl.position.set(nx * 0.1, ny * 0.1, s * (d / 2 + 0.02)); g.add(rl); }
  // legs to the counter
  g.add(mesh(box(0.08, ya - yb + 0.05, 0.08, 0.01), M('#c9ccd8'), { pos: [xa - cx + 0.1, (ya + yb) / 2 - cy - 0.05, 0] }));
  const cols: import('../game/types').ColDef[] = [
    { shape: 'box', hx: L / 2, hy: th / 2, hz: d / 2, rot: [0, 0, ang] },
    { shape: 'box', hx: L / 2, hy: 0.08, hz: 0.02, at: [nx * 0.1, ny * 0.1, -d / 2 - 0.02], rot: [0, 0, ang] },
  ];
  if (frontRail) cols.push({ shape: 'box', hx: L / 2, hy: 0.08, hz: 0.02, at: [nx * 0.1, ny * 0.1, d / 2 + 0.02], rot: [0, 0, ang] });
  b.solid(g, cols, [cx, cy, z], 0, { friction: 0.6, restitution: 0.05 });
}

const S4_3: LevelDef = {
  id: '4-3', chapter: 4, theme: 'bathroom', title: '휴지 대작전', subtitle: '집사가 만든 휴지 미끄럼틀… 끝은 변기다',
  paws: 2,
  goal: { kind: 'dunk', count: 2, text: '휴지 2개를 변기에 넣어 막아라', short: '변기 막기' },
  stars: [190000, 260000],
  challenges: [
    { type: 'paws', max: 1, text: '앞발 1번으로 변기 막기' },
    { type: 'stat', key: 'tpLen', min: 8, text: '휴지 한 롤을 8m 풀기' },
    { type: 'discover', id: 'perfume', text: '향수 폭탄까지 터뜨리기' },
  ],
  tip: '휴지는 데굴데굴 잘 굴러가요. 미끄럼틀을 막고 있는 건…?',
  hints: ['휴지 미끄럼틀을 막고 있는 스피커를 치워 보세요.', '스피커를 변기 쪽으로 밀면 스피커가 변기를 막아 버려요! 앞쪽(바닥)으로 떨어뜨려요.', '남은 앞발로 바닥의 휴지를 세게 굴려 방 전체에 휴지 길을 만들어요.'],
  hintMove: { prop: 'gadget', dir: [0.2, 1] },
  ownerLine: '변기가… 휴지로 꽉…! 스피커는 또 왜 바닥에?!',
  build(b) {
    const tx = 2.6, vt = BATH.vanity.top, vz = BATH.vanity.z;
    bathRoom(b, { toilet: false, tub: false, vanity: false });
    deepToilet(b, tx, BATH.toilet.z);
    partition(b, tx + 0.62, -3.3, -1.5, 2.4);
    // long counter along the back wall
    const cx0 = -2.2, cx1 = 2.08;
    cabinet(b, (cx0 + cx1) / 2, vz, cx1 - cx0, BATH.vanity.d, vt, '#9fd8cb', '#ffffff', 2);
    // the TP slide: from the left end of the counter down over the toilet bowl
    const lz = vz + 0.4;
    const xa = -1.6, ya = vt + 0.75, xb = 2.38, yb = vt + 0.02;
    chute(b, xa, ya, xb, yb, lz, 0.6, '#ffffff', false);
    const sl = (ya - yb) / (xb - xa);
    const yAt = (x: number) => yb + (xb - x) * sl;
    void yAt;
    // spawned where they come to rest: three rolls leaning on the speaker at the foot of the slide
    speaker(b, { at: [0.9, 2.14, lz] });
    for (const [x, y] of [[0.49, 2.53], [-0.02, 2.62], [-0.53, 2.72]]) tpRoll(b, { at: [x, y - 0.26, lz], target: true }).body.wakeUp();
    // counter odds and ends (behind the slide)
    C2.perfume(b, { at: [-1.95, vt, vz - 0.2], color: '#c9a0dc' });
    C2.toothCup(b, { at: [-1.4, vt, vz - 0.3] });
    // spare roll on the floor
    tpRoll(b, { at: [-3.1, 0, 0.3], rot: 0.5 });
    // spare stock in the corner + bathroom clutter
    for (let i = 0; i < 3; i++) tpRoll(b, { at: [-3.15, i * 0.38, -1.45], lying: false });
    tpRoll(b, { at: [-2.6, 0, -1.45], lying: false });
    towelStack(b, 1.0, 0, -1.6, 2, 0.1);
    slippers(b, -1.0, 2.4, 0.3, '#ffe08a');
    laundryBasket(b, { at: [2.4, 0, 0.9], rot: 0.5 });
    C.plant(b, { at: [3.3, 0, 2.7], color: '#5ec4c9' });
    b.cat(0.6, 0, 2.2);
  },
};

/* =============================== 4-4 =============================== */

const S4_4: LevelDef = {
  id: '4-4', chapter: 4, theme: 'bathroom', title: '드라이기 태풍', subtitle: '반신욕 하다 잠든 집사. 깨워야 밥을 준다',
  paws: 2,
  goal: { kind: 'wake', text: '욕조에서 잠든 집사를 깨워라', short: '집사 깨우기' },
  stars: [330000, 420000],
  challenges: [
    { type: 'paws', max: 1, text: '앞발 1번으로 깨우기' },
    { type: 'discover', id: 'zap', text: '켜진 드라이기까지 지지직!' },
    { type: 'score', amount: 420000, text: '손해액 ₩420,000 (디퓨저까지!)' },
  ],
  tip: '드라이기를 치면 켜져서 앞쪽으로 바람을 뿜어요. 지금 드라이기가 바라보는 쪽은…?',
  hints: ['향수 하나 깨지는 소리로는 집사가 안 깨요. 한꺼번에 와장창!', '드라이기를 켜면 세면대 위 병들이 욕조 쪽으로 날아가요.', '드라이기 한 방으로 깨우고, 남은 앞발로 변기 위 디퓨저까지 박살! 켜진 드라이기를 쳐서 떨어뜨리면…?'],
  hintMove: { prop: 'dryer', dir: [-1, 0] },
  ownerLine: '콜록콜록! 향수 냄새…! 반신욕 중이었는데!!',
  build(b) {
    const vx = T.x1 + 0.05 + BATH.vanity.w / 2 + 0.1;
    bathRoom(b, { vanityX: vx });
    b.ownerAsleep((T.x0 + T.x1) / 2 + 0.25, 0.55, (T.z0 + T.z1) / 2, 0);
    const vt = BATH.vanity.top, vz = BATH.vanity.z;
    const lz = vz + 0.1;
    C2.hairDryer(b, { at: [vx + 0.7, vt, lz], rot: -Math.PI / 2 });
    // the owner's cosmetics lined up right in front of the dryer
    C2.perfume(b, { at: [vx + 0.25, vt, lz], rot: Math.PI / 2, color: '#ff9fc0', name: '스킨' });
    C2.shampoo(b, { at: [vx - 0.15, vt, lz], color: '#ffd6e3' });
    C2.perfume(b, { at: [vx - 0.5, vt, lz], rot: Math.PI / 2, color: '#c9a0dc' });
    C2.perfume(b, { at: [vx - 0.82, vt, lz], rot: Math.PI / 2, color: '#ffd23f', name: '로션' });
    C2.toothCup(b, { at: [vx + 0.5, vt, vz - 0.3] });
    // toilet tank: a reed diffuser and a spare roll
    C2.perfume(b, { at: [BATH.toilet.x - 0.15, BATH.toilet.tankTop, BATH.toilet.z - 0.45], color: '#9fe0c8', name: '디퓨저', value: 120000 });
    tpRoll(b, { at: [BATH.toilet.x + 0.25, BATH.toilet.tankTop, BATH.toilet.z - 0.45], lying: false });
    // floor clutter
    laundryBasket(b, { at: [2.6, 0, 0.6], rot: 0.3 });
    slick(b, C2.soap(b, { at: [-0.6, 0, 0.4], rot: 0.7 }));
    slippers(b, -2.3, 1.7, 1.2, '#ff9fb6');
    towelStack(b, 3.1, 0, 2.4, 3, 0.2);
    b.cat(1.8, 0, 2.2);
  },
};

/* =============================== 4-5 =============================== */

/** front-loading washer / dryer (static) – returns its top y */
function washer(b: Builder, x: number, z: number, o: { color?: string; dryer?: boolean } = {}) {
  const w = 1.35, h = 2.3, d = 1.2;
  const g = new THREE.Group();
  g.add(mesh(box(w, h, d, 0.08), M(o.color ?? '#f4f6fb'), { pos: [0, h / 2, 0] }));
  g.add(mesh(box(w - 0.1, 0.32, 0.04, 0.02), M('#c9e7f2'), { pos: [0, h - 0.24, d / 2 + 0.01], shadow: false }));
  g.add(mesh(torus(0.4, 0.07, 6, 18), M('#c9ccd8'), { pos: [0, h * 0.42, d / 2 + 0.03] }));
  g.add(mesh(cyl(0.38, 0.38, 0.03, 18), M(o.dryer ? '#3a3d4f' : '#7fc8e8', { transparent: true, opacity: 0.75 }), { pos: [0, h * 0.42, d / 2 + 0.03], rot: [Math.PI / 2, 0, 0], shadow: false }));
  for (const dx of [-0.35, -0.15]) g.add(mesh(cyl(0.06, 0.06, 0.05, 8), M('#ff8fa3'), { pos: [dx, h - 0.24, d / 2 + 0.04], rot: [Math.PI / 2, 0, 0], shadow: false }));
  b.solid(g, [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }], [x, 0, z]);
  return h;
}

/** woven laundry basket full of clothes (dynamic, soft) */
function laundryBasket(b: Builder, o: { at: [number, number, number]; rot?: number }): Prop {
  const g = new THREE.Group();
  g.add(mesh(cyl(0.48, 0.4, 0.7, 10), M('#e0b97a'), { pos: [0, 0.35, 0] }));
  for (const [x, z, c] of [[-0.12, 0.05, '#7fd3ff'], [0.15, -0.1, '#ff9fb6'], [0.0, 0.15, '#ffd23f']] as const) g.add(mesh(sphere(0.25, 7, 5), M(c), { pos: [x, 0.72, z], scale: [1, 0.55, 1] }));
  return b.prop({
    kind: 'basket', name: '빨래 바구니', icon: '🧺', group: g, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.38, r: 0.46, at: [0, 0.38, 0] }],
    mass: 1.6, mat: 'soft', value: 12000, toppleValue: 4000, floats: true, restitution: 0.3, traits: ['푹신함', '물에 뜸'],
  });
}

const LX = BATH_W / 2, LW = 6.2, LCX = LX + LW / 2;

const S4_5: LevelDef = {
  id: '4-5', chapter: 4, theme: 'bathroom', title: '욕실 대홍수', subtitle: '욕실 옆 세탁실 문까지 활짝. 오늘은 물바다 파티다냥',
  paws: 3,
  goal: { kind: 'score', amount: 500000, text: '손해액 ₩500,000 달성', short: '대참사' },
  stars: [620000, 760000],
  challenges: [
    { type: 'cause', victim: 'bottle', culprit: 'soap', text: '비누를 세탁실까지 보내 세제병 깨기' },
    { type: 'count', kind: 'tp', event: 'fall', n: 3, text: '선풍기로 휴지 3개를 욕실까지 날리기' },
    { type: 'chain', n: 9, text: '한 번에 연쇄 x9' },
  ],
  tip: '앞발은 3번뿐! 한 번에 여러 개가 터지는 장치를 찾아요. 문틈 너머 세탁실도 내 무대다냥.',
  hints: ['욕실 바닥의 비누를 세탁실 문 쪽으로 세게! 젖은 벤치가 쭉 밀려나요.', '드라이기를 켜면 세면대 병들이 욕조 받침대 쪽으로 날아가요. 받침대 위엔 전동칫솔이…', '세탁실 선풍기를 켜면 세탁기 위 휴지가 벽을 넘어 욕실로 날아가요! 운이 좋으면 변기 속으로.'],
  hintMove: { prop: 'soap', dir: [1, 0] },
  ownerLine: '욕실이… 세탁실까지…?! 휴지는 왜 변기에 꽂혀 있어?!',
  start: [2.0, 0.5],
  build(b) {
    buildHouse(b, {
      rooms: [rect('bath', '욕실', 0, 0, BATH_W, BATH_D, 'tile', 'bath'), rect('laundry', '세탁실', LCX, 0, LW, BATH_D, 'checker', 'butter')],
      doors: [{ x: LX, z: 1.3, w: 2.1 }],
      base: '#5c8fb0', h: 6.8,
    });
    furnishBath4(b, 0, 0);
    doorOn(b, { x: -BATH_W / 2 }, BATH.doorZ, '#9fd8cb');
    b.ownerAtDoor(-BATH_W / 2 + 0.9, 0, BATH.doorZ, Math.PI / 2);
    // ---- bathroom side ----
    const vt = BATH.vanity.top, vx = BATH.vanity.x, vz = BATH.vanity.z, lz = vz + 0.1;
    C2.hairDryer(b, { at: [vx + 0.7, vt, lz], rot: -Math.PI / 2 });
    C2.perfume(b, { at: [vx + 0.25, vt, lz], rot: Math.PI / 2, color: '#ff9fc0', name: '스킨' });
    C2.shampoo(b, { at: [vx - 0.15, vt, lz], color: '#ffd6e3' });
    C2.perfume(b, { at: [vx - 0.5, vt, lz], rot: Math.PI / 2, color: '#c9a0dc' });
    const cy = caddy(b, -2.0, 0.95);
    toothbrush(b, { at: [-1.72, cy, -2.55] });
    C.rubberDuck(b, { at: [-2.2, cy, -2.0], rot: 2.6 });
    C2.shampoo(b, { at: [-2.25, cy, -2.75], color: '#9fe0c8' });
    speaker(b, { at: [BATH.toilet.x, BATH.toilet.tankTop, BATH.toilet.z - 0.36] });
    slick(b, C2.soap(b, { at: [-1.1, 0, 1.3] }), 0.03);
    // ---- laundry room ----
    const wt = washer(b, LX + 1.3, -2.65);
    washer(b, LX + 2.75, -2.65, { dryer: true, color: '#fff4d6' });
    // spare TP stock on the machines, lined up in the fan's wind
    for (const x of [LX + 1.2, LX + 1.8, LX + 2.5]) tpRoll(b, { at: [x, wt, -2.75] });
    C.bottle(b, { at: [LX + 3.05, wt, -2.85], color: '#c9a0dc', name: '표백제' });
    C2.standFan(b, { at: [LX + 5.2, 0, -2.4], rot: -Math.PI / 2 });
    // wet laundry bench right in line with the doorway: the soap's target
    const st = bathStool(b, { at: [LX + 2.4, 0, 1.3], w: 0.7, d: 2.2, name: '세탁실 벤치', color: '#ffe08a' });
    slick(b, st.prop, 0.05);
    for (const [dz, c] of [[-0.75, '#ff8fa3'], [0, '#7fd3ff'], [0.75, '#ffd23f']] as const) C.bottle(b, { at: [LX + 2.32, st.seat, 1.3 + dz], color: c, name: '세제 유리병' });
    laundryBasket(b, { at: [LX + 4.8, 0, 0.9] });
    laundryBasket(b, { at: [LX + 5.3, 0, 2.0], rot: 0.7 });
    C2.pillow(b, { at: [LX + 4.3, 0, 2.6], color: '#9fd8cb', rot: 0.4 });
    towelStack(b, LX + 4.6, 0, -0.6, 3, 0.1);
    slippers(b, LX + 3.6, 2.7, 0.9, '#ffe08a');
    // bathroom extras
    for (const [x, z, r] of [[-3.0, -2.6, 0.4], [-0.95, -2.1, 2.4]] as const) C.rubberDuck(b, { at: [x, 0.49, z], rot: r }).dunked = true;
    towelStack(b, 0.2, 0, -1.2, 3, -0.2);
    slippers(b, -3.15, 0.5, 1.5, '#ffb3c6');
    tpRoll(b, { at: [-1.4, 0, 2.75], lying: false });
    tpRoll(b, { at: [-1.4, 0.38, 2.75], lying: false });
    windowOn(b, { z: -BATH_D / 2 }, LX + 4.6, 4.6, 1.6, 1.2, false, '#ffe08a');
    posterOn(b, { z: -BATH_D / 2 }, LX + 2.0, 4.7, 1.2, 0.9, ['#d9f2ff', '#7fd3ff', '#ffffff']);
    clockOn(b, { z: -BATH_D / 2 }, LX + 0.6, 4.9);
    rug(b, LCX + 0.9, 0.2, 2.4, 1.6, ['#ffe08a', '#ffffff', '#7fd3ff']);
    b.cat(1.5, 0, 2.4);
  },
};

export const CH4: LevelDef[] = [S4_1, S4_2, S4_3, S4_4, S4_5];
