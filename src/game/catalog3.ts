import * as THREE from 'three';
import { M, box, cone, cyl, lathe, mesh, sphere, torus } from '../render/kit';
import { mergeByMaterial } from '../render/merge';
import type { Builder } from '../levels/Builder';
import type { ColDef, Worth } from './types';
import type { Prop } from './Prop';
import { BarrierSpecial, CableSpecial, CarSpecial, CraneSpecial, HoseSpecial, PowerStripSpecial, SwingSpecial, TriggerSpecial, WobbleSpecial, WreckingBallSpecial, type CarParts } from './specials3';
import { fruit, type O, type V3 } from './catalog';
import { screenTexture } from '../render/kit';

/* ------------------------------------------------------------------ */
/* Props for the outside world: cars, chocks, gates, garden things.    */
/* Chibi scale: a car is ~5 units long, a person ~3.4 tall.            */
/* ------------------------------------------------------------------ */

const g = () => new THREE.Group();
const keep = <T extends THREE.Object3D>(o: T): T => { o.userData.keep = true; return o; };

function hull(profile: [number, number][], seg = 8): ColDef {
  const pts: number[] = [];
  for (const [r, y] of profile) {
    if (r < 0.001) { pts.push(0, y, 0); continue; }
    for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push(Math.cos(a) * r, y, Math.sin(a) * r); }
  }
  return { shape: 'hull', points: pts };
}

/* ------------------------------ cars ------------------------------ */

export interface CarOpts extends O {
  /** sporty: low and long */
  sport?: boolean;
  /** parked on a slope behind a chock */
  held?: boolean;
  /** pitch of the slope it is parked on (radians, nose down positive) */
  slope?: number;
  worth?: Worth;
  kind?: string;
  icon?: string;
  /** parking brake on (flat ground): hard to shove sideways */
  parked?: boolean;
}

/** a car along local +x (nose). Returns the prop and its damage special. */
export function car(b: Builder, o: CarOpts): { prop: Prop; car: CarSpecial } {
  const c = o.color ?? '#ff8fa3';
  const sport = !!o.sport;
  const L = sport ? 5.4 : 5.0, W = 2.5, wr = 0.48;
  const chassisH = sport ? 0.85 : 1.0, chassisY = 0.38 + chassisH / 2;
  const cabL = sport ? 2.4 : 2.8, cabH = sport ? 0.75 : 0.95, cabX = sport ? -0.5 : -0.3;
  const cabY = chassisY + chassisH / 2 + cabH / 2 - 0.02;
  const root = g();
  const body = keep(g());
  const paint = M(c);
  body.add(mesh(box(L, chassisH, W, 0.22), paint, { pos: [0, chassisY, 0] }));
  body.add(mesh(box(cabL, cabH, W - 0.3, 0.2), paint, { pos: [cabX, cabY, 0] }));
  // bumpers, grille, lamps, mirrors
  body.add(mesh(box(0.22, 0.32, W - 0.1, 0.06), M('#f4f4f8'), { pos: [L / 2, 0.55, 0] }));
  body.add(mesh(box(0.22, 0.32, W - 0.1, 0.06), M('#f4f4f8'), { pos: [-L / 2, 0.55, 0] }));
  body.add(mesh(box(0.06, 0.28, 1.0, 0.03), M('#5b5f73'), { pos: [L / 2 + 0.01, chassisY + 0.12, 0] }));
  for (const z of [-0.85, 0.85]) {
    body.add(mesh(sphere(0.17, 8, 6), M('#fffbe0'), { pos: [L / 2 - 0.02, chassisY + 0.18, z], scale: [0.5, 1, 1] }));
    body.add(mesh(box(0.08, 0.2, 0.42, 0.03), M('#ff5a6e'), { pos: [-L / 2 - 0.01, chassisY + 0.2, z] }));
    body.add(mesh(box(0.25, 0.16, 0.18, 0.04), paint, { pos: [cabX + cabL / 2 - 0.1, cabY - 0.25, z * 1.42] }));
  }
  if (sport) body.add(mesh(box(0.5, 0.08, W - 0.4, 0.03), M('#2f3142'), { pos: [-L / 2 + 0.3, chassisY + chassisH / 2 + 0.35, 0] }));
  mergeByMaterial(body);
  // glass (kept separate: it cracks, then shatters)
  const glassMat = new THREE.MeshLambertMaterial({ color: '#bfe8ff', flatShading: true });
  const crackedMat = new THREE.MeshLambertMaterial({ color: '#e8f4fb', flatShading: true });
  const glass: THREE.Mesh[] = [];
  const gl = (geo: THREE.BufferGeometry, pos: V3, rot: V3 = [0, 0, 0]) => { const m = keep(mesh(geo, glassMat, { pos, rot, shadow: false })); glass.push(m); body.add(m); };
  gl(box(0.08, cabH * 0.7, W - 0.55, 0.02), [cabX + cabL / 2 + 0.02, cabY + 0.02, 0]);
  gl(box(0.08, cabH * 0.65, W - 0.6, 0.02), [cabX - cabL / 2 - 0.02, cabY + 0.02, 0]);
  for (const z of [-1, 1]) gl(box(cabL * 0.78, cabH * 0.6, 0.06, 0.02), [cabX, cabY + 0.04, z * ((W - 0.3) / 2 + 0.02)]);
  // hazard lights (blink with the alarm)
  const lights: THREE.Mesh[] = [];
  for (const [x, z] of [[L / 2 - 0.15, 1.24], [L / 2 - 0.15, -1.24], [-L / 2 + 0.15, 1.24], [-L / 2 + 0.15, -1.24]] as const) {
    const lm = new THREE.MeshLambertMaterial({ color: '#ffb347', flatShading: true });
    lm.userData.dynamic = true;
    const m = keep(mesh(box(0.3, 0.14, 0.06, 0.02), lm, { pos: [x, chassisY + 0.22, z], shadow: false }));
    lights.push(m);
    body.add(m);
  }
  // hood (pops on a wreck)
  const hood = keep(g());
  hood.add(mesh(box(L / 2 - cabL / 2 + cabX - 0.1, 0.08, W - 0.2, 0.04), paint));
  hood.position.set(cabX + cabL / 2 + (L / 2 - cabL / 2 - cabX) / 2, chassisY + chassisH / 2 + 0.02, 0);
  body.add(hood);
  // scratches & dents (hidden until they happen)
  const scratches = keep(g());
  for (let i = 0; i < 5; i++) scratches.add(mesh(box(0.9 - i * 0.1, 0.035, 0.02, 0), M('#ffffff'), { pos: [-0.8 + i * 0.45, chassisY + 0.1 - i * 0.06, W / 2 + 0.01], rot: [0, 0, 0.15 - i * 0.07], shadow: false }));
  for (let i = 0; i < 3; i++) scratches.add(mesh(box(0.7, 0.035, 0.02, 0), M('#ffffff'), { pos: [0.6 - i * 0.4, chassisY + 0.05 + i * 0.05, -W / 2 - 0.01], rot: [0, 0, -0.1], shadow: false }));
  scratches.visible = false;
  const dents = keep(g());
  const dark = M(new THREE.Color(c).multiplyScalar(0.72).getStyle());
  dents.add(mesh(sphere(0.55, 7, 5), dark, { pos: [L / 2 - 0.35, chassisY + 0.1, 0.55], scale: [0.4, 0.7, 1] }));
  dents.add(mesh(sphere(0.45, 7, 5), dark, { pos: [0.4, chassisY, W / 2 - 0.12], scale: [1, 0.7, 0.35] }));
  dents.add(mesh(sphere(0.45, 7, 5), dark, { pos: [-1.2, chassisY + 0.05, -W / 2 + 0.12], scale: [1, 0.7, 0.35] }));
  dents.visible = false;
  body.add(scratches, dents);
  root.add(body);
  // wheels
  const wheels: THREE.Object3D[] = [];
  const wx = L / 2 - 1.0;
  for (const [x, z] of [[wx, 1.0], [wx, -1.0], [-wx, 1.0], [-wx, -1.0]] as const) {
    const w = keep(g());
    w.add(mesh(cyl(wr, wr, 0.42, 12), M('#3a3a48'), { rot: [Math.PI / 2, 0, 0] }));
    w.add(mesh(cyl(wr * 0.5, wr * 0.5, 0.44, 8), M('#dfe3ea'), { rot: [Math.PI / 2, 0, 0] }));
    w.position.set(x, wr, z);
    wheels.push(w);
    root.add(w);
  }
  const parts: CarParts = { body, wheels, glass, lights, hood, scratches, dents };
  const special = new CarSpecial(parts, glassMat, crackedMat);
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.rot ?? 0, -(o.slope ?? 0), 'YXZ'));
  const cols: ColDef[] = [
    { shape: 'box', hx: L / 2, hy: chassisH / 2, hz: W / 2, at: [0, chassisY, 0], round: 0.15, massShare: 0.62 },
    { shape: 'box', hx: cabL / 2, hy: cabH / 2, hz: (W - 0.3) / 2, at: [cabX, cabY, 0], round: 0.12, massShare: 0.18 },
  ];
  for (const w of wheels) cols.push({ shape: 'ball', r: wr, at: [w.position.x, wr, w.position.z], friction: 0.0, restitution: 0.05, massShare: 0.05 });
  const prop = b.game.addProp({
    kind: o.kind ?? 'auto', name: o.name ?? '새 차', icon: o.icon ?? (sport ? '🏎️' : '🚗'), group: root, pos: o.at, quat,
    colliders: cols, mass: 300, mat: 'metal', value: o.value ?? 38000000, target: o.target,
    friction: 0.4, restitution: 0.08, linDamp: o.parked ? 2.6 : 0.12, angDamp: o.parked ? 3 : 1.6, touchForce: 2500, noTopple: true, scoreMoves: false,
    special, worth: o.worth, radius: L * 0.45, traits: ['아주 무거움', '굴러감', '단계 파손'], frictionMin: true,
  });
  if (o.held) special.hold(prop);
  return { prop, car: special };
}

/** the wedge under a wheel: knock it away and the car goes */
export function chock(b: Builder, o: O & { car: { prop: Prop; car: CarSpecial }; slope?: number }): Prop {
  const grp = g();
  const s = 0.42;
  const pts = [-s, 0, -0.32, s, 0, -0.32, -s, 0, 0.32, s, 0, 0.32, s, s * 0.9, -0.32, s, s * 0.9, 0.32];
  const geo = new THREE.BufferGeometry();
  const v = [
    // bottom, slope, back, sides
    -s, 0, -0.32, s, 0, -0.32, s, 0, 0.32, -s, 0, -0.32, s, 0, 0.32, -s, 0, 0.32,
    -s, 0, 0.32, s, 0, 0.32, s, s * 0.9, 0.32, -s, 0, -0.32, s, s * 0.9, -0.32, s, 0, -0.32,
    -s, 0, -0.32, -s, 0, 0.32, s, s * 0.9, 0.32, -s, 0, -0.32, s, s * 0.9, 0.32, s, s * 0.9, -0.32,
    s, 0, -0.32, s, s * 0.9, -0.32, s, s * 0.9, 0.32, s, 0, -0.32, s, s * 0.9, 0.32, s, 0, 0.32,
  ];
  geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
  geo.computeVertexNormals();
  grp.add(new THREE.Mesh(geo, M('#ffb347', { side: THREE.DoubleSide })));
  grp.add(mesh(box(0.06, 0.05, 0.66, 0), M('#ffffff'), { pos: [0, s * 0.45, 0], rot: [0, 0, Math.atan2(s * 0.9, 2 * s)], shadow: false }));
  grp.traverse((m) => { (m as THREE.Mesh).castShadow = true; });
  const trig = new TriggerSpecial({
    label: '고임목 빼기', kind: 'chock', word: '쏙!', bump: 3.5,
    action: (game, self) => { o.car.car.release(game, o.car.prop, self); game.discover('chock', self.center(new THREE.Vector3())); },
  });
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.rot ?? 0, -(o.slope ?? 0), 'YXZ'));
  return b.prop({
    kind: 'chock', name: '고임목', icon: '🔺', group: grp, pos: o.at, quat,
    colliders: [{ shape: 'hull', points: pts }],
    mass: 0.6, mat: 'rubber', value: 0, special: trig, friction: 0.9, traits: ['방아쇠'],
  });
}

/** a swinging garden gate leaf, hinge at `at`, spanning `w` along local +x */
export function gateLeaf(b: Builder, o: O & { w: number; h?: number; to: number; latch?: boolean }): Prop {
  const h = o.h ?? 2.2;
  const grp = g();
  const c = M(o.color ?? '#5b5f73');
  grp.add(mesh(box(o.w, 0.14, 0.12, 0.03), c, { pos: [o.w / 2, h - 0.1, 0] }));
  grp.add(mesh(box(o.w, 0.14, 0.12, 0.03), c, { pos: [o.w / 2, 0.35, 0] }));
  const n = Math.max(3, Math.round(o.w / 0.32));
  for (let i = 0; i <= n; i++) grp.add(mesh(box(0.08, h - 0.2, 0.08, 0.02), c, { pos: [0.06 + (i / n) * (o.w - 0.12), h / 2 + 0.05, 0] }));
  for (let i = 0; i <= n; i++) grp.add(mesh(cone(0.07, 0.2, 4), c, { pos: [0.06 + (i / n) * (o.w - 0.12), h + 0.1, 0] }));
  if (o.latch !== false) grp.add(mesh(box(0.12, 0.3, 0.2, 0.03), M('#ffd23f'), { pos: [o.w - 0.1, h * 0.55, 0] }));
  return b.prop({
    kind: 'gate', name: o.name ?? '대문', icon: '🚪', group: grp, pos: o.at, rotY: o.rot, kinematic: true,
    colliders: [{ shape: 'box', hx: o.w / 2, hy: h / 2, hz: 0.12, at: [o.w / 2, h / 2, 0] }],
    mass: 30, mat: 'metal', value: 0, special: new SwingSpecial({ yaw: o.rot ?? 0, to: o.to, word: '끼이익' }), traits: ['열림', '길을 바꿈'],
  });
}

/** a double gate between hinges (x, z0) and (x, z1) across a wall running along z; opens toward +x (or -x) */
export function gatePair(b: Builder, o: { x: number; z0: number; z1: number; inward?: 1 | -1; name?: string; color?: string; h?: number }): [Prop, Prop] {
  const w = (o.z1 - o.z0) / 2;
  const s = o.inward ?? 1;
  const a = gateLeaf(b, { at: [o.x, 0, o.z0], rot: -Math.PI / 2, w, to: (s * Math.PI) / 2, name: o.name, color: o.color, h: o.h });
  const c = gateLeaf(b, { at: [o.x, 0, o.z1], rot: Math.PI / 2, w, to: (-s * Math.PI) / 2, name: o.name, color: o.color, h: o.h, latch: false });
  (a.special as SwingSpecial).partner = c;
  (c.special as SwingSpecial).partner = a;
  return [a, c];
}

/* ------------------------------ garden ------------------------------ */

export function gnome(b: Builder, o: O): Prop {
  const grp = g();
  const s = o.scale ?? 1;
  const coat = o.color ?? '#4f86c6';
  grp.add(mesh(cyl(0.22 * s, 0.3 * s, 0.5 * s, 8), M(coat), { pos: [0, 0.25 * s, 0] }));
  grp.add(mesh(sphere(0.2 * s, 8, 6), M('#ffd9c0'), { pos: [0, 0.62 * s, 0] }));
  grp.add(mesh(cone(0.18 * s, 0.32 * s, 8), M('#ffffff'), { pos: [0, 0.5 * s, 0.1 * s], rot: [Math.PI, 0, 0] }));
  grp.add(mesh(cone(0.21 * s, 0.5 * s, 8), M('#ff5a6e'), { pos: [0, 0.95 * s, 0], rot: [0, 0, 0.12] }));
  grp.add(mesh(sphere(0.06 * s, 6, 4), M('#ff9f87'), { pos: [0, 0.62 * s, 0.19 * s] }));
  return b.prop({
    kind: 'gnome', name: o.name ?? '정원 난쟁이', icon: '🧙', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.5 * s, r: 0.27 * s, at: [0, 0.5 * s, 0] }],
    mass: 1.4 * s, mat: 'ceramic', value: o.value ?? 85000, target: o.target, batch: 'gnome',
    breakable: { threshold: 5, hitForce: 260, mode: 'shatter', fx: 'none', debris: { count: 7, colors: [coat, '#ff5a6e', '#ffffff'], size: 0.17 * s } },
  });
}

export function mailbox(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff6b6b';
  grp.add(mesh(box(0.14, 1.5, 0.14, 0.03), M('#b9825a'), { pos: [0, 0.75, 0] }));
  grp.add(mesh(box(0.55, 0.5, 0.85, 0.12), M(c), { pos: [0, 1.7, 0] }));
  grp.add(mesh(box(0.06, 0.32, 0.06, 0.01), M('#ffd23f'), { pos: [0.3, 1.9, -0.2] }));
  return b.prop({
    kind: 'mailbox', name: o.name ?? '우편함', icon: '📮', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.12, hy: 0.75, hz: 0.12, at: [0, 0.75, 0], massShare: 0.4 }, { shape: 'box', hx: 0.27, hy: 0.25, hz: 0.42, at: [0, 1.7, 0], massShare: 0.6 }],
    mass: 2.2, mat: 'metal', value: o.value ?? 60000, target: o.target, toppleValue: undefined,
    breakable: { threshold: 9, hitForce: 2400, mode: 'damage', fx: 'paper', word: '우편물 우수수!', onDamage: (p) => { p.group.children[1]?.scale.set(1, 0.7, 1); } },
  });
}

export function birdbath(b: Builder, o: O): Prop {
  const grp = g();
  const stone = M('#d9d4cc');
  grp.add(mesh(cyl(0.35, 0.45, 0.2, 10), stone, { pos: [0, 0.1, 0] }));
  grp.add(mesh(cyl(0.16, 0.2, 1.1, 8), stone, { pos: [0, 0.75, 0] }));
  grp.add(mesh(lathe([[0, 1.3], [0.7, 1.32], [0.75, 1.5], [0.66, 1.52], [0.6, 1.4], [0, 1.4]], 12), stone));
  grp.add(mesh(cyl(0.6, 0.6, 0.04, 12), M('#8fd3f5'), { pos: [0, 1.46, 0], shadow: false }));
  return b.prop({
    kind: 'birdbath', name: o.name ?? '새 물그릇', icon: '⛲', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.55, r: 0.3, at: [0, 0.55, 0], massShare: 0.5 }, { shape: 'cyl', hh: 0.11, r: 0.74, at: [0, 1.41, 0], massShare: 0.5 }],
    mass: 6, mat: 'marble', value: o.value ?? 320000, target: o.target, worth: o.target ? undefined : undefined,
    breakable: { threshold: 5.5, hitForce: 1800, mode: 'shatter', fx: 'water', word: '와장창! 첨벙', debris: { count: 10, colors: ['#d9d4cc', '#c4beb4'], size: 0.26 } },
  });
}

export function flowerPot(b: Builder, o: O & { big?: boolean }): Prop {
  const s = (o.scale ?? 1) * (o.big ? 1.35 : 1);
  const prof: [number, number][] = [[0, 0], [0.24 * s, 0], [0.32 * s, 0.5 * s], [0.36 * s, 0.52 * s], [0.36 * s, 0.6 * s]];
  const grp = g();
  grp.add(mesh(lathe(prof, 9), M(o.color ?? '#e58b5a')));
  grp.add(mesh(cyl(0.3 * s, 0.3 * s, 0.05, 9), M('#6b4a33'), { pos: [0, 0.55 * s, 0] }));
  const fl = ['#ff7aa8', '#ffd23f', '#ffffff', '#b38cff'];
  for (let i = 0; i < 3; i++) {
    const a = i * 2.1 + (o.rot ?? 0);
    grp.add(mesh(cone(0.08 * s, 0.4 * s, 5), M('#59a85e'), { pos: [Math.cos(a) * 0.1 * s, 0.75 * s, Math.sin(a) * 0.1 * s] }));
    grp.add(mesh(sphere(0.12 * s, 6, 4), M(fl[(i + Math.round((o.at[0] + o.at[2]) * 3)) & 3]), { pos: [Math.cos(a) * 0.13 * s, 0.98 * s, Math.sin(a) * 0.13 * s] }));
  }
  return b.prop({
    kind: 'flowerPot', name: o.name ?? '토분', icon: '🪴', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 8)],
    mass: 1.6 * s, mat: 'ceramic', value: o.value ?? 25000, target: o.target, batch: o.big ? undefined : 'flowerPot',
    breakable: { threshold: 5, hitForce: 300, mode: 'shatter', fx: 'dirt', debris: { count: 7, colors: [o.color ?? '#e58b5a', '#6b4a33'], size: 0.18 * s } },
  });
}

/** a wheelie bin: rolls when pushed */
export function wheelieBin(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#5bb98c';
  grp.add(mesh(box(0.9, 1.5, 1.0, 0.08), M(c), { pos: [0, 0.95, 0] }));
  grp.add(mesh(box(1.0, 0.1, 1.1, 0.04), M(new THREE.Color(c).multiplyScalar(0.8).getStyle()), { pos: [0, 1.74, 0] }));
  for (const z of [-0.38, 0.38]) grp.add(mesh(cyl(0.18, 0.18, 0.12, 8), M('#3a3a48'), { pos: [-0.4, 0.18, z], rot: [Math.PI / 2, 0, 0] }));
  return b.prop({
    kind: 'bin', name: o.name ?? '쓰레기통', icon: '🗑️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.8, hz: 0.5, at: [0, 0.95, 0], round: 0.06 }],
    mass: 3, mat: 'plastic', value: o.value ?? 30000, friction: 0.25, restitution: 0.25, linDamp: 0.4,
  });
}

/** a car-cover-free sign of love: the owner's wax bucket etc. (small light junk) */
export function bucket(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(lathe([[0, 0], [0.26, 0], [0.32, 0.5], [0.29, 0.5], [0.24, 0.04], [0, 0.04]], 10), M(o.color ?? '#4f86c6')));
  grp.add(mesh(cyl(0.27, 0.27, 0.04, 10), M('#bfeaff'), { pos: [0, 0.38, 0], shadow: false }));
  grp.add(mesh(torus(0.3, 0.02, 4, 10, Math.PI), M('#5b5f73'), { pos: [0, 0.5, 0] }));
  return b.prop({
    kind: 'bucket', name: o.name ?? '세차 양동이', icon: '🪣', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.25, r: 0.3, at: [0, 0.25, 0] }],
    mass: 1.2, mat: 'plastic', value: 8000,
    breakable: { threshold: 6, mode: 'damage', fx: 'water', word: '촤악!' },
  });
}

/** a garden hose on its reel: swat to turn it on, the stream goes where the paw pointed */
export function hoseReel(b: Builder, o: O & { dur?: number }): Prop {
  const grp = g();
  grp.add(mesh(box(0.9, 0.12, 0.7, 0.04), M('#5bb98c'), { pos: [0, 0.06, 0] }));
  for (const z of [-0.28, 0.28]) grp.add(mesh(cyl(0.45, 0.45, 0.08, 12), M('#5bb98c'), { pos: [0, 0.6, z], rot: [Math.PI / 2, 0, 0] }));
  grp.add(mesh(cyl(0.36, 0.36, 0.48, 12), M('#ffd23f'), { pos: [0, 0.6, 0], rot: [Math.PI / 2, 0, 0] }));
  const nozzle = keep(g());
  nozzle.add(mesh(cyl(0.06, 0.09, 0.5, 6), M('#ff6b6b'), { rot: [Math.PI / 2, 0, 0], pos: [0, 0, 0.25] }));
  nozzle.position.set(0, 1.15, 0);
  grp.add(nozzle);
  return b.prop({
    kind: 'hose', name: o.name ?? '정원 호스', icon: '🚿', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.55, hz: 0.35, at: [0, 0.55, 0] }],
    mass: 14, mat: 'plastic', value: 40000, special: new HoseSpecial(nozzle, o.dur ?? 4), traits: ['물줄기', '방향'],
  });
}

/** grandma's pine bonsai in a shallow glazed pot */
export function bonsai(b: Builder, o: O & { worth?: Worth }): Prop {
  const grp = g();
  grp.add(mesh(box(1.1, 0.3, 0.75, 0.08), M('#4f86c6'), { pos: [0, 0.15, 0] }));
  grp.add(mesh(box(1.0, 0.04, 0.65, 0.02), M('#6b4a33'), { pos: [0, 0.31, 0] }));
  const bark = M('#7a5a40');
  grp.add(mesh(cyl(0.09, 0.14, 0.6, 6), bark, { pos: [-0.1, 0.6, 0], rot: [0, 0, 0.35] }));
  grp.add(mesh(cyl(0.06, 0.09, 0.55, 6), bark, { pos: [0.12, 1.0, 0], rot: [0, 0, -0.6] }));
  grp.add(mesh(cyl(0.05, 0.07, 0.5, 6), bark, { pos: [-0.25, 1.05, 0.05], rot: [0.2, 0, 0.9] }));
  const leaf = M('#3f8f5a');
  for (const [x, y, z, r] of [[0.38, 1.25, 0, 0.32], [-0.48, 1.25, 0.05, 0.28], [0, 1.5, -0.05, 0.3], [0.1, 1.05, 0.25, 0.2]] as const) grp.add(mesh(sphere(r, 7, 5), leaf, { pos: [x, y, z], scale: [1.3, 0.55, 1] }));
  return b.prop({
    kind: 'bonsai', name: o.name ?? '소나무 분재', icon: '🌳', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.55, hy: 0.16, hz: 0.38, at: [0, 0.16, 0], massShare: 0.8 }, { shape: 'box', hx: 0.5, hy: 0.4, hz: 0.3, at: [0, 1.1, 0], massShare: 0.2 }],
    mass: 2.2, mat: 'ceramic', value: o.value ?? 3200000, target: o.target, worth: o.worth,
    breakable: { threshold: 4.5, mode: 'shatter', fx: 'dirt', word: '와장창! 분재가…', debris: { count: 10, colors: ['#4f86c6', '#3f8f5a', '#7a5a40'], size: 0.2 } },
  });
}

/** an onggi jar (soy sauce, bean paste) — heavy glazed earthenware */
export function onggi(b: Builder, o: O & { size?: number; worth?: Worth }): Prop {
  const s = o.size ?? 1;
  const prof: [number, number][] = [[0, 0], [0.32 * s, 0], [0.55 * s, 0.35 * s], [0.6 * s, 0.6 * s], [0.5 * s, 0.95 * s], [0.36 * s, 1.08 * s], [0.38 * s, 1.14 * s]];
  const grp = g();
  grp.add(mesh(lathe(prof, 10), M('#7a4a2a')));
  grp.add(mesh(cyl(0.61 * s, 0.61 * s, 0.05 * s, 10), M('#5e3a22'), { pos: [0, 0.62 * s, 0] }));
  grp.add(mesh(lathe([[0, 0.2 * s], [0.42 * s, 0], [0.44 * s, 0.03 * s], [0, 0.26 * s]], 10), M('#6e4328'), { pos: [0, 1.12 * s, 0] }));
  return b.prop({
    kind: 'onggi', name: o.name ?? '장독', icon: '🏺', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 8)],
    mass: 4 * s * s, mat: 'ceramic', value: o.value ?? Math.round(180000 * s), target: o.target, worth: o.worth,
    breakable: { threshold: 4.8, hitForce: 260 * s, mode: 'shatter', fx: 'coffee', word: '쩍! 간장 콸콸', debris: { count: 10, colors: ['#7a4a2a', '#5e3a22'], size: 0.24 * s } },
  });
}

/** a four-wheeled garden cart: give it a shove and it rolls; whatever is in it rides along */
export function gardenCart(b: Builder, o: O & { slope?: number }): Prop {
  // open at the front (+x): when it stops, the load keeps going
  const grp = g();
  const c = M(o.color ?? '#ff8f6b');
  const wr = 0.34, bed = 0.78;
  grp.add(mesh(box(1.8, 0.1, 1.2, 0.03), c, { pos: [0, bed, 0] }));
  for (const [x, z, w, d] of [[0, 0.58, 1.8, 0.08], [0, -0.58, 1.8, 0.08], [-0.88, 0, 0.08, 1.2]] as const) grp.add(mesh(box(w, 0.5, d, 0.02), c, { pos: [x, bed + 0.26, z] }));
  grp.add(mesh(cyl(0.04, 0.04, 1.4, 5), M('#5b5f73'), { pos: [-1.4, bed + 0.5, 0], rot: [0, 0, 1.1] }));
  const wheels: [number, number][] = [[0.6, 0.5], [0.6, -0.5], [-0.6, 0.5], [-0.6, -0.5]];
  for (const [x, z] of wheels) grp.add(mesh(cyl(wr, wr, 0.12, 10), M('#3a3a48'), { pos: [x, wr, z], rot: [Math.PI / 2, 0, 0] }));
  const cols: ColDef[] = [
    { shape: 'box', hx: 0.9, hy: 0.05, hz: 0.6, at: [0, bed, 0], massShare: 0.45 },
    { shape: 'box', hx: 0.9, hy: 0.25, hz: 0.04, at: [0, bed + 0.26, 0.58], massShare: 0.12 },
    { shape: 'box', hx: 0.9, hy: 0.25, hz: 0.04, at: [0, bed + 0.26, -0.58], massShare: 0.12 },
    { shape: 'box', hx: 0.04, hy: 0.25, hz: 0.6, at: [-0.88, bed + 0.26, 0], massShare: 0.11 },
  ];
  for (const [x, z] of wheels) cols.push({ shape: 'ball', r: wr, at: [x, wr, z], friction: 0, massShare: 0.05 });
  const quat = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, o.rot ?? 0, -(o.slope ?? 0), 'YXZ'));
  return b.prop({
    kind: 'cart', name: o.name ?? '정원 수레', icon: '🛒', group: grp, pos: o.at, quat,
    colliders: cols, mass: 8, mat: 'metal', value: 60000, frictionMin: true, linDamp: 0.15, angDamp: 1.2, noTopple: true, traits: ['굴러감', '실어 나름'],
  });
}

/** a brick (load for carts, debris for building sites) */
export function brick(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.5, 0.22, 0.26, 0.03), M(o.color ?? '#d9765a')));
  grp.position.y = 0.11;
  const inner = g(); inner.add(grp);
  return b.prop({
    kind: 'brick', name: '벽돌', icon: '🧱', group: inner, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.25, hy: 0.11, hz: 0.13, at: [0, 0.11, 0] }],
    mass: 1.2, mat: 'wood', value: 0, batch: 'brick', scoreMoves: false,
  });
}

/** a stone garden lantern (heavy, topples like a tree) */
export function stoneLantern(b: Builder, o: O): Prop {
  const grp = g();
  const st = M('#c9c3b8');
  grp.add(mesh(box(0.7, 0.2, 0.7, 0.05), st, { pos: [0, 0.1, 0] }));
  grp.add(mesh(cyl(0.16, 0.2, 1.1, 6), st, { pos: [0, 0.75, 0] }));
  grp.add(mesh(box(0.7, 0.55, 0.7, 0.06), st, { pos: [0, 1.55, 0] }));
  grp.add(mesh(box(0.34, 0.3, 0.72, 0.02), M('#ffe9a8'), { pos: [0, 1.55, 0] }));
  grp.add(mesh(cone(0.6, 0.45, 4), st, { pos: [0, 2.05, 0], rot: [0, Math.PI / 4, 0] }));
  return b.prop({
    kind: 'lantern', name: o.name ?? '석등', icon: '🏮', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.35, hy: 0.1, hz: 0.35, at: [0, 0.1, 0], massShare: 0.3 }, { shape: 'cyl', hh: 0.55, r: 0.2, at: [0, 0.75, 0], massShare: 0.2 }, { shape: 'box', hx: 0.35, hy: 0.45, hz: 0.35, at: [0, 1.75, 0], massShare: 0.5 }],
    mass: 9, mat: 'marble', value: o.value ?? 450000, target: o.target,
    breakable: { threshold: 6, hitForce: 3000, mode: 'shatter', fx: 'none', word: '쿵! 와르르', debris: { count: 10, colors: ['#c9c3b8', '#b3ada2'], size: 0.28 } },
  });
}

/** a watering can (spills a slippery puddle when knocked over) */
export function wateringCan(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.3, 0.34, 0.6, 10), M(o.color ?? '#5ec4c9'), { pos: [0, 0.3, 0] }));
  grp.add(mesh(cyl(0.04, 0.07, 0.7, 6), M(o.color ?? '#5ec4c9'), { pos: [0.45, 0.5, 0], rot: [0, 0, -0.9] }));
  grp.add(mesh(torus(0.22, 0.04, 4, 10, Math.PI), M(o.color ?? '#5ec4c9'), { pos: [-0.1, 0.62, 0], rot: [0, 0, 0] }));
  return b.prop({
    kind: 'wateringCan', name: '물뿌리개', icon: '🪣', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.3, r: 0.32, at: [0, 0.3, 0] }],
    mass: 1.1, mat: 'plastic', value: 15000,
    breakable: { threshold: 5.5, mode: 'damage', fx: 'water', word: '촤르륵' },
  });
}

/* ------------------------------ parcels & shops ------------------------------ */

/** a delivery box; fragile ones ("깨지기 쉬움") break when they land hard */
export function parcel(b: Builder, o: O & { size?: [number, number, number]; fragile?: boolean; content?: 'glass' | 'ceramic' | 'electronic' }): Prop {
  const [w, h, d] = o.size ?? [0.9, 0.7, 0.7];
  const grp = g();
  const c = o.color ?? (o.fragile ? '#f2c38b' : '#d9a86c');
  grp.add(mesh(box(w, h, d, 0.04), M(c), { pos: [0, h / 2, 0] }));
  grp.add(mesh(box(w + 0.01, 0.1, 0.18, 0), M('#c99a5e'), { pos: [0, h, 0], shadow: false }));
  if (o.fragile) {
    grp.add(mesh(box(w * 0.55, h * 0.4, 0.02, 0), M('#ff5a6e'), { pos: [0, h * 0.5, d / 2 + 0.01], shadow: false }));
    grp.add(mesh(box(w * 0.3, h * 0.12, 0.03, 0), M('#ffffff'), { pos: [0, h * 0.5, d / 2 + 0.02], shadow: false }));
  }
  const ct = o.content ?? 'ceramic';
  return b.prop({
    kind: o.fragile ? 'fragile' : 'parcel', name: o.name ?? (o.fragile ? '깨지기 쉬운 택배' : '택배 상자'), icon: '📦', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0], round: 0.03 }],
    mass: o.fragile ? 1.2 : 1.6 * w * h * d * 4, mat: 'paper', value: o.value ?? (o.fragile ? 280000 : 30000), target: o.target, friction: 0.55,
    breakable: o.fragile ? { threshold: 4.6, hitForce: 220, mode: 'damage', fx: ct === 'electronic' ? 'sparks' : 'glass', word: ct === 'electronic' ? '퍽! 지지직' : '쨍그랑… (안에서)', onDamage: (p) => { p.group.scale.set(1.04, 0.86, 1.04); } } : undefined,
  });
}

/** a heavy pack of bottled water: the battering ram of the parcel world */
export function waterPack(b: Builder, o: O): Prop {
  const grp = g();
  for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
    grp.add(mesh(cyl(0.16, 0.16, 0.75, 8), M('#bfeaff', { transparent: true, opacity: 0.85 }), { pos: [-0.34 + i * 0.34, 0.4, -0.17 + j * 0.34] }));
    grp.add(mesh(cyl(0.07, 0.07, 0.08, 6), M('#4f86c6'), { pos: [-0.34 + i * 0.34, 0.82, -0.17 + j * 0.34] }));
  }
  grp.add(mesh(box(1.04, 0.32, 0.7, 0.02), M('#4f86c6'), { pos: [0, 0.42, 0], shadow: false }));
  return b.prop({
    kind: 'waterPack', name: '생수 묶음', icon: '💧', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.52, hy: 0.42, hz: 0.35, at: [0, 0.42, 0], round: 0.06 }],
    mass: 3.2, mat: 'plastic', value: 12000, friction: 0.5, restitution: 0.25,
    breakable: { threshold: 9, mode: 'damage', fx: 'water', word: '퍽! 촤악' },
  });
}

/** a drinks vending machine: heavy, expensive, sparks and cans when wrecked */
export function vendingMachine(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff6b6b';
  grp.add(mesh(box(1.6, 3.4, 1.2, 0.08), M(c), { pos: [0, 1.7, 0] }));
  grp.add(mesh(box(1.2, 1.8, 0.05, 0.02), M('#e8f6ff'), { pos: [-0.1, 2.2, 0.61], shadow: false }));
  for (let r = 0; r < 3; r++) for (let k = 0; k < 4; k++) grp.add(mesh(cyl(0.09, 0.09, 0.3, 6), M(['#ffd23f', '#5bb98c', '#4f86c6', '#ff9f43'][(r + k) % 4]), { pos: [-0.5 + k * 0.27, 1.6 + r * 0.55, 0.55], shadow: false }));
  grp.add(mesh(box(0.9, 0.3, 0.06, 0.02), M('#2f3142'), { pos: [-0.1, 0.5, 0.61], shadow: false }));
  return b.prop({
    kind: 'vending', name: o.name ?? '자판기', icon: '🥤', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.8, hy: 1.7, hz: 0.6, at: [0, 1.7, 0] }],
    mass: 30, mat: 'electronic', value: o.value ?? 3500000, target: o.target, friction: 0.7,
    breakable: { threshold: 3.5, hitForce: 4000, mode: 'damage', fx: 'sparks', word: '와장창! 캔 우르르', debris: { count: 12, colors: ['#ffd23f', '#5bb98c', '#4f86c6', '#ff9f43'], size: 0.18 }, onDamage: (p) => { p.group.rotation.z = 0.04; } },
  });
}

/** a big shop window pane (pinned until something hits it) */
export function shopWindow(b: Builder, o: O & { w: number; h: number }): Prop {
  const grp = g();
  grp.add(mesh(box(o.w, o.h, 0.1, 0.02), M('#bfe8ff', { transparent: true, opacity: 0.55 }), { pos: [0, o.h / 2, 0], shadow: false }));
  grp.add(mesh(box(o.w + 0.1, 0.12, 0.14, 0.02), M('#ffffff'), { pos: [0, o.h, 0] }));
  return b.prop({
    kind: 'window', name: o.name ?? '쇼윈도', icon: '🪟', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: o.w / 2, hy: o.h / 2, hz: 0.06, at: [0, o.h / 2, 0] }],
    mass: 6, mat: 'glass', value: o.value ?? 1800000, target: o.target, pinned: 1e9, interactable: false,
    breakable: { threshold: 3, hitForce: 1500, mode: 'shatter', fx: 'glass', word: '와장창!!', debris: { count: 16, colors: ['#e8fbff', '#bfe8ff'], size: 0.3, flat: true } },
  });
}

/** a traffic cone (light, topples, rolls) */
export function cone3(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.6, 0.08, 0.6, 0.02), M('#ff7a3a'), { pos: [0, 0.04, 0] }));
  grp.add(mesh(cone(0.24, 0.9, 10), M('#ff7a3a'), { pos: [0, 0.5, 0] }));
  grp.add(mesh(cyl(0.13, 0.17, 0.16, 10), M('#ffffff'), { pos: [0, 0.5, 0] }));
  return b.prop({
    kind: 'trafficCone', name: '라바콘', icon: '🚧', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cone', hh: 0.47, r: 0.28, at: [0, 0.47, 0] }],
    mass: 0.6, mat: 'rubber', value: 5000, restitution: 0.3, batch: 'cone',
  });
}

/** a fruit crate full of oranges (they spill and roll) */
export function fruitCrate(b: Builder, o: O & { n?: number }): Prop {
  const grp = g();
  grp.add(mesh(box(1.0, 0.45, 0.7, 0.03), M('#c98a5a'), { pos: [0, 0.22, 0] }));
  for (let i = 0; i < 6; i++) grp.add(mesh(sphere(0.16, 7, 5), M('#ff9a2e'), { pos: [-0.3 + (i % 3) * 0.3, 0.5, -0.15 + Math.floor(i / 3) * 0.3], shadow: false }));
  return b.prop({
    kind: 'crate', name: o.name ?? '귤 상자', icon: '🍊', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.5, hy: 0.3, hz: 0.35, at: [0, 0.3, 0] }],
    mass: 2.4, mat: 'wood', value: o.value ?? 45000,
    breakable: {
      threshold: 5, mode: 'shatter', fx: 'none', word: '와르르 데굴데굴', debris: { count: 6, colors: ['#c98a5a'], size: 0.2 },
      after: (game, _p, pos) => {
        // the oranges get away
        const bb = game.builder;
        if (!bb) return;
        for (let i = 0; i < (o.n ?? 6); i++) {
          const f = fruit(bb, { at: [pos.x + (i % 3 - 1) * 0.3, pos.y + 0.3 + Math.floor(i / 3) * 0.3, pos.z + (i % 2 - 0.5) * 0.3], kind: 'orange' });
          f.body.setLinvel({ x: (i % 3 - 1) * 2, y: 2, z: (i % 2 - 0.5) * 3 }, true);
          f.cause = _p; f.activeSwat = game.swatIndex;
        }
      },
    },
  });
}

/** a watermelon (delivered): rolls down anything, splats at the end */
export function watermelon(b: Builder, o: O & { r?: number }): Prop {
  const r = o.r ?? 0.5;
  const grp = g();
  grp.add(mesh(sphere(r, 12, 9), M('#3f9f4f'), { pos: [0, r, 0], scale: [1.08, 1, 1] }));
  for (let i = 0; i < 6; i++) grp.add(mesh(torus(r * 1.005, 0.025, 3, 18, Math.PI), M('#2a6b35'), { pos: [0, r, 0], rot: [0, (i / 6) * Math.PI, Math.PI / 2], shadow: false }));
  grp.add(mesh(cyl(0.03, 0.04, 0.14, 5), M('#7a5a40'), { pos: [0, 2 * r + 0.05, 0] }));
  return b.prop({
    kind: 'watermelon', name: o.name ?? '수박', icon: '🍉', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r, at: [0, r, 0] }],
    mass: 3.4, mat: 'food', value: 35000, restitution: 0.12, friction: 0.9, angDamp: 0.05, linDamp: 0.01, noTopple: true,
    breakable: { threshold: 16, mode: 'shatter', fx: 'juice', word: '퍽! 수박 대폭발', debris: { count: 12, colors: ['#ff5a6e', '#3f9f4f', '#ff8fa3'], size: 0.22 } },
  });
}

/* ------------------------------ workshop & office ------------------------------ */

/** a free-standing glass display tower (vitrine): heavy, tall, glass all round */
export function vitrine(b: Builder, o: O & { h?: number; w?: number; d?: number; shelves?: number; mass?: number }): { prop: Prop; shelfY: number[] } {
  const w = o.w ?? 1.8, h = o.h ?? 5.0, d = o.d ?? 1.2;
  const wood = M(o.color ?? '#5b3b2b');
  const glass = M('#d8f3ff', { transparent: true, opacity: 0.32 });
  const grp = g();
  grp.add(mesh(box(w, 0.5, d, 0.04), wood, { pos: [0, 0.25, 0] }));
  grp.add(mesh(box(w + 0.2, 0.36, d + 0.2, 0.06), wood, { pos: [0, h - 0.1, 0] }));
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) grp.add(mesh(box(0.1, h, 0.1, 0.02), wood, { pos: [x * (w / 2 - 0.05), h / 2, z * (d / 2 - 0.05)] }));
  for (const z of [-1, 1]) grp.add(mesh(box(w - 0.1, h - 0.7, 0.03, 0), glass, { pos: [0, (h + 0.3) / 2, z * (d / 2 - 0.03)], shadow: false }));
  for (const x of [-1, 1]) grp.add(mesh(box(0.03, h - 0.7, d - 0.1, 0), glass, { pos: [x * (w / 2 - 0.03), (h + 0.3) / 2, 0], shadow: false }));
  const n = o.shelves ?? 3;
  const shelfY: number[] = [];
  const cols: ColDef[] = [
    // a heavy carved cornice: top-heavy, so a good shove up high tips it
    { shape: 'box', hx: w / 2, hy: 0.25, hz: d / 2, at: [0, 0.25, 0], massShare: 0.3 },
    { shape: 'box', hx: w / 2, hy: 0.1, hz: d / 2, at: [0, h - 0.1, 0], massShare: 0.2 },
    { shape: 'box', hx: w / 2, hy: (h - 0.7) / 2, hz: 0.03, at: [0, (h + 0.3) / 2, d / 2 - 0.03], massShare: 0.08 },
    { shape: 'box', hx: w / 2, hy: (h - 0.7) / 2, hz: 0.03, at: [0, (h + 0.3) / 2, -d / 2 + 0.03], massShare: 0.08 },
    { shape: 'box', hx: 0.03, hy: (h - 0.7) / 2, hz: d / 2, at: [w / 2 - 0.03, (h + 0.3) / 2, 0], massShare: 0.07 },
    { shape: 'box', hx: 0.03, hy: (h - 0.7) / 2, hz: d / 2, at: [-w / 2 + 0.03, (h + 0.3) / 2, 0], massShare: 0.07 },
  ];
  for (let i = 1; i < n; i++) {
    const y = 0.5 + (i * (h - 0.7)) / n;
    grp.add(mesh(box(w - 0.1, 0.06, d - 0.1, 0.01), M('#e8f6ff', { transparent: true, opacity: 0.6 }), { pos: [0, y, 0], shadow: false }));
    cols.push({ shape: 'box', hx: w / 2 - 0.06, hy: 0.03, hz: d / 2 - 0.06, at: [0, y, 0], massShare: 0.2 / (n - 1) });
    shelfY.push(y + 0.03);
  }
  const prop = b.prop({
    kind: 'vitrine', name: o.name ?? '유리 진열장', icon: '🗄️', group: grp, pos: o.at, rotY: o.rot, colliders: cols,
    mass: o.mass ?? 15, mat: 'glass', value: o.value ?? 1200000, friction: 0.7, traits: ['무거움', '키가 큼', '흔들릴 때 한 번 더'],
    special: new WobbleSpecial(), touchForce: 100,
    breakable: { threshold: 6.5, mode: 'damage', fx: 'glass', word: '와장창!! 유리장', debris: { count: 18, colors: ['#e8fbff', '#bfe8ff'], size: 0.3, flat: true } },
  });
  return { prop, shelfY: [0.5, ...shelfY].map((y) => y + o.at[1]) };
}

/** a moon jar (달항아리): big, white, and three months of someone's life */
export function moonJar(b: Builder, o: O & { worth?: Worth; interactable?: boolean }): Prop {
  const s = o.scale ?? 1;
  const prof: [number, number][] = [[0, 0], [0.3 * s, 0], [0.62 * s, 0.35 * s], [0.68 * s, 0.62 * s], [0.6 * s, 0.95 * s], [0.34 * s, 1.18 * s], [0.36 * s, 1.26 * s]];
  const grp = g();
  grp.add(mesh(lathe(prof, 14), M('#fbf7ee')));
  return b.prop({
    kind: 'moonJar', name: o.name ?? '달항아리', icon: '🏺', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 10)],
    mass: 2.4 * s, mat: 'ceramic', value: o.value ?? 8000000, target: o.target, worth: o.worth, interactable: o.interactable,
    breakable: { threshold: 4.2, mode: 'shatter', fx: 'none', word: '쨍… 와장창!!', debris: { count: 16, colors: ['#fbf7ee', '#ffffff', '#efe6d4'], size: 0.24 * s } },
  });
}

/** a tall drying rack on casters, loaded with unfired pots */
export function dryingRack(b: Builder, o: O & { h?: number }): { prop: Prop; shelfY: number[] } {
  const h = o.h ?? 4.2, w = 1.6, d = 0.9, wr = 0.2;
  const grp = g();
  const wood = M('#c9a27a');
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
    grp.add(mesh(box(0.08, h - wr * 2, 0.08, 0.02), wood, { pos: [x * (w / 2 - 0.04), wr * 2 + (h - wr * 2) / 2, z * (d / 2 - 0.04)] }));
    grp.add(mesh(sphere(wr, 7, 5), M('#3a3a48'), { pos: [x * (w / 2 - 0.1), wr, z * (d / 2 - 0.1)] }));
  }
  const shelfY: number[] = [];
  const cols: ColDef[] = [];
  for (let i = 0; i < 4; i++) {
    const y = wr * 2 + 0.1 + i * ((h - wr * 2 - 0.2) / 3);
    grp.add(mesh(box(w, 0.06, d, 0.01), wood, { pos: [0, y, 0] }));
    cols.push({ shape: 'box', hx: w / 2, hy: 0.03, hz: d / 2, at: [0, y, 0], massShare: 0.16 });
    shelfY.push(y + 0.03);
  }
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) cols.push({ shape: 'ball', r: wr, at: [x * (w / 2 - 0.1), wr, z * (d / 2 - 0.1)], friction: 0, massShare: 0.04 });
  for (const [x, z] of [[-1, -1], [1, 1]] as const) cols.push({ shape: 'box', hx: 0.04, hy: (h - wr * 2) / 2, hz: 0.04, at: [x * (w / 2 - 0.04), wr * 2 + (h - wr * 2) / 2, z * (d / 2 - 0.04)], massShare: 0.0 });
  const prop = b.prop({
    kind: 'rack', name: o.name ?? '건조대', icon: '🛒', group: grp, pos: o.at, rotY: o.rot, colliders: cols,
    mass: 5, mat: 'wood', value: 80000, frictionMin: true, linDamp: 0.1, angDamp: 0.6, traits: ['바퀴', '키가 큼', '실어 나름'],
  });
  return { prop, shelfY: shelfY.map((y) => y + o.at[1]) };
}

/** an unfired pot (greenware): cheap, very fragile */
export function greenware(b: Builder, o: O): Prop {
  const s = o.scale ?? 1;
  const prof: [number, number][] = [[0, 0], [0.2 * s, 0], [0.28 * s, 0.25 * s], [0.22 * s, 0.5 * s], [0.25 * s, 0.56 * s]];
  const grp = g();
  grp.add(mesh(lathe(prof, 9), M(o.color ?? '#d9c4a8')));
  return b.prop({
    kind: 'greenware', name: o.name ?? '초벌 그릇', icon: '🏺', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 7)], mass: 0.5 * s, mat: 'ceramic', value: o.value ?? 60000, batch: 'greenware',
    breakable: { threshold: 3.6, hitForce: 120, mode: 'shatter', fx: 'dirt', debris: { count: 6, colors: [o.color ?? '#d9c4a8', '#c4ab8c'], size: 0.15 * s } },
  });
}

/** a heavy wrapped block of clay */
export function clayBlock(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(1.0, 0.6, 0.7, 0.12), M('#a88c6e'), { pos: [0, 0.3, 0] }));
  grp.add(mesh(box(1.02, 0.08, 0.72, 0.02), M('#7fb8d8', { transparent: true, opacity: 0.6 }), { pos: [0, 0.45, 0], shadow: false }));
  return b.prop({
    kind: 'clay', name: o.name ?? '점토 덩어리', icon: '🟫', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.5, hy: 0.3, hz: 0.35, at: [0, 0.3, 0], round: 0.08 }],
    mass: 6, mat: 'soft', value: 30000, friction: 0.35, restitution: 0.05,
  });
}

/** a slim porcelain bottle (매병): tall, narrow foot, wide shoulder — falls like a domino */
export function maebyeong(b: Builder, o: O): Prop {
  const s = o.scale ?? 1;
  const prof: [number, number][] = [[0, 0], [0.16 * s, 0], [0.2 * s, 0.4 * s], [0.34 * s, 1.05 * s], [0.3 * s, 1.3 * s], [0.12 * s, 1.45 * s], [0.14 * s, 1.55 * s]];
  const grp = g();
  const c = o.color ?? '#8fc3b8';
  grp.add(mesh(lathe(prof, 10), M(c)));
  grp.add(mesh(cyl(0.345 * s, 0.345 * s, 0.07 * s, 10), M('#ffffff'), { pos: [0, 1.0 * s, 0], shadow: false }));
  return b.prop({
    kind: 'maebyeong', name: o.name ?? '매병', icon: '🏺', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hull(prof.slice(1), 8)], mass: 0.9 * s, mat: 'ceramic', value: o.value ?? 260000, target: o.target, batch: 'maebyeong', toppleValue: 8000,
    breakable: { threshold: 3.0, mode: 'shatter', fx: 'none', debris: { count: 8, colors: [c, '#ffffff'], size: 0.18 * s } },
  });
}

/** a brand-new monitor (still in its film), plugged in to its neighbours */
export function monitor(b: Builder, o: O): { prop: Prop; cable: CableSpecial } {
  const grp = g();
  const scr = new THREE.MeshBasicMaterial({ map: screenTexture('laptop') ?? null, color: screenTexture('laptop') ? 0xffffff : 0xc6d6ff });
  grp.add(mesh(box(1.7, 1.05, 0.12, 0.04), M('#2f3142'), { pos: [0, 1.0, 0] }));
  grp.add(mesh(box(1.56, 0.92, 0.02, 0), scr, { pos: [0, 1.0, 0.07], shadow: false }));
  grp.add(mesh(box(1.6, 0.96, 0.01, 0), M('#e8f6ff', { transparent: true, opacity: 0.35 }), { pos: [0, 1.0, 0.085], shadow: false }));
  grp.add(mesh(box(0.12, 0.45, 0.1, 0.02), M('#3a3d4f'), { pos: [0, 0.3, -0.02] }));
  grp.add(mesh(box(0.7, 0.06, 0.45, 0.02), M('#3a3d4f'), { pos: [0, 0.03, 0] }));
  const cable = new CableSpecial();
  const prop = b.prop({
    kind: 'monitor', name: o.name ?? '새 모니터', icon: '🖥️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.85, hy: 0.52, hz: 0.06, at: [0, 1.0, 0], massShare: 0.6 }, { shape: 'box', hx: 0.35, hy: 0.25, hz: 0.22, at: [0, 0.25, 0], massShare: 0.4 }],
    mass: 1.8, mat: 'electronic', value: o.value ?? 650000, target: o.target, special: cable, traits: ['전선 연결', '전자제품'],
    breakable: {
      threshold: 5.2, hitForce: 260, mode: 'damage', fx: 'sparks', word: '파지직! 액정 박살',
      onDamage: () => { const t = screenTexture('broken'); if (t) scr.map = t; else scr.color.set('#111'); scr.needsUpdate = true; },
    },
  });
  return { prop, cable };
}

/** an office desk: heavy but it slides if a chair rams it */
export function officeDesk(b: Builder, o: O & { w?: number; d?: number; h?: number }): { prop: Prop; top: number } {
  const w = o.w ?? 2.4, d = o.d ?? 1.2, h = o.h ?? 1.6;
  const grp = g();
  const c = M(o.color ?? '#f4efe4'), leg = M('#8a8fa6');
  grp.add(mesh(box(w, 0.1, d, 0.03), c, { pos: [0, h - 0.05, 0] }));
  for (const x of [-1, 1]) grp.add(mesh(box(0.08, h - 0.1, d - 0.1, 0.02), leg, { pos: [x * (w / 2 - 0.06), (h - 0.1) / 2, 0] }));
  grp.add(mesh(box(w - 0.2, 0.5, 0.05, 0.01), leg, { pos: [0, h - 0.4, -d / 2 + 0.06] }));
  const prop = b.prop({
    kind: 'desk', name: o.name ?? '사무용 책상', icon: '🗄️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: w / 2, hy: 0.05, hz: d / 2, at: [0, h - 0.05, 0], massShare: 0.5 },
      { shape: 'box', hx: 0.04, hy: (h - 0.1) / 2, hz: d / 2 - 0.05, at: [-(w / 2 - 0.06), (h - 0.1) / 2, 0], massShare: 0.25 },
      { shape: 'box', hx: 0.04, hy: (h - 0.1) / 2, hz: d / 2 - 0.05, at: [w / 2 - 0.06, (h - 0.1) / 2, 0], massShare: 0.25 },
    ],
    mass: 9, mat: 'wood', value: 250000, friction: 0.35, noTopple: true, toppleValue: 20000,
  });
  return { prop, top: o.at[1] + h };
}

/** a water cooler with its big bottle on top (the bottle is the flood) */
export function waterCooler(b: Builder, o: O): Prop[] {
  const grp = g();
  grp.add(mesh(box(0.9, 2.2, 0.8, 0.08), M('#f4f4f8'), { pos: [0, 1.1, 0] }));
  grp.add(mesh(box(0.14, 0.14, 0.1, 0.02), M('#4f86c6'), { pos: [-0.2, 1.6, 0.42] }));
  grp.add(mesh(box(0.14, 0.14, 0.1, 0.02), M('#ff6b6b'), { pos: [0.2, 1.6, 0.42] }));
  const body = b.prop({
    kind: 'cooler', name: o.name ?? '정수기', icon: '🚰', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 1.1, hz: 0.4, at: [0, 1.1, 0] }],
    mass: 5, mat: 'electronic', value: 450000, friction: 0.55,
    breakable: { threshold: 6, mode: 'damage', fx: 'sparks', word: '지지직' },
  });
  const bg = g();
  bg.add(mesh(cyl(0.42, 0.42, 1.1, 12), M('#7fd4ff', { transparent: true, opacity: 0.6 }), { pos: [0, 0.65, 0] }));
  bg.add(mesh(cyl(0.18, 0.42, 0.25, 12), M('#7fd4ff', { transparent: true, opacity: 0.6 }), { pos: [0, 0.07, 0] }));
  const bottle = b.prop({
    kind: 'waterBottle', name: '생수통', icon: '💧', group: bg, pos: [o.at[0], o.at[1] + 2.2, o.at[2]], rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.6, r: 0.42, at: [0, 0.6, 0] }],
    mass: 4, mat: 'plastic', value: 15000,
    breakable: { threshold: 5.5, mode: 'shatter', fx: 'flood', word: '콸콸콸!', debris: { count: 6, colors: ['#bfeaff'], size: 0.2, flat: true } },
  });
  return [body, bottle];
}

/** an office printer (heavy electronic, paper everywhere when it goes) */
export function printer(b: Builder, o: O & { special?: import('./types').Special }): Prop {
  const grp = g();
  grp.add(mesh(box(1.4, 0.8, 1.0, 0.08), M('#e8e8f0'), { pos: [0, 0.4, 0] }));
  grp.add(mesh(box(1.0, 0.06, 0.7, 0.02), M('#ffffff'), { pos: [0, 0.83, 0.1] }));
  grp.add(mesh(box(0.3, 0.1, 0.1, 0.02), M('#5bb98c'), { pos: [0.45, 0.7, 0.51] }));
  return b.prop({
    kind: 'printer', name: o.name ?? '복합기', icon: '🖨️', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.7, hy: 0.4, hz: 0.5, at: [0, 0.4, 0] }],
    mass: 3.5, mat: 'electronic', value: o.value ?? 1800000, target: o.target, special: o.special,
    breakable: { threshold: 5, hitForce: 600, mode: 'damage', fx: 'paper', word: '우두둑! 종이 폭풍' },
  });
}

/** a multi-tap on the floor (water + this = every monitor plugged in) */
export function powerStrip(b: Builder, o: O): { prop: Prop; strip: PowerStripSpecial } {
  const grp = g();
  grp.add(mesh(box(1.0, 0.16, 0.34, 0.05), M('#ffffff'), { pos: [0, 0.08, 0] }));
  for (let i = 0; i < 4; i++) grp.add(mesh(box(0.12, 0.02, 0.14, 0), M('#3a3d4f'), { pos: [-0.33 + i * 0.22, 0.17, 0], shadow: false }));
  grp.add(mesh(box(0.1, 0.06, 0.06, 0.02), M('#ff6b6b'), { pos: [0.44, 0.18, 0], shadow: false }));
  const strip = new PowerStripSpecial();
  const prop = b.prop({
    kind: 'strip', name: '멀티탭', icon: '🔌', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.5, hy: 0.08, hz: 0.17, at: [0, 0.08, 0] }],
    mass: 0.4, mat: 'electronic', value: 15000, special: strip, friction: 0.8, traits: ['젖으면 합선'],
  });
  return { prop, strip };
}

/* ------------------------------ city machines ------------------------------ */

/** a parking barrier: kinematic arm on a rhythm + a booth button that holds it up */
export function parkingBarrier(b: Builder, o: { x: number; z0: number; z1: number; period: number; open: number; offset?: number; button: V3 }): { arm: Prop; spec: import('./specials3').BarrierSpecial } {
  const len = o.z1 - o.z0;
  const grp = g();
  for (let i = 0; i < Math.round(len / 0.5); i++) grp.add(mesh(box(0.5, 0.16, 0.14, 0.03), M(i % 2 ? '#ffffff' : '#ff5a6e'), { pos: [0.25 + i * 0.5, 0, 0] }));
  const spec = new BarrierSpecial({ yaw: -Math.PI / 2, period: o.period, open: o.open, offset: o.offset });
  const arm = b.prop({
    kind: 'barrier', name: '주차 차단기', icon: '🚧', group: grp, pos: [o.x, 1.35, o.z0], rotY: -Math.PI / 2, kinematic: true,
    colliders: [{ shape: 'box', hx: len / 2, hy: 0.1, hz: 0.1, at: [len / 2, 0, 0] }],
    mass: 20, mat: 'metal', value: 0, special: spec, traits: ['일정하게 오르내림'],
  });
  // post + booth
  const post = new THREE.Group();
  post.add(mesh(box(0.5, 1.5, 0.5, 0.05), M('#ffd23f'), { pos: [0, 0.75, 0] }));
  b.solid(post, [{ shape: 'box', hx: 0.25, hy: 0.75, hz: 0.25, at: [0, 0.75, 0] }], [o.x, 0, o.z0 - 0.35]);
  const booth = new THREE.Group();
  booth.add(mesh(box(1.6, 2.6, 1.6, 0.1), M('#e8e2d8'), { pos: [0, 1.3, 0] }));
  booth.add(mesh(box(1.3, 0.9, 0.06, 0.02), M('#bfe8ff'), { pos: [0, 1.9, 0.81], shadow: false }));
  b.solid(booth, [{ shape: 'box', hx: 0.8, hy: 1.3, hz: 0.8, at: [0, 1.3, 0] }], [o.button[0], 0, o.button[2] - 1.0]);
  button(b, { at: o.button, label: '차단기 열기', word: '삑! 열림 고정', action: () => { spec.held = true; } });
  return { arm, spec };
}

/** a big friendly push button on a little stand (or on a wall) */
export function button(b: Builder, o: { at: V3; label: string; word?: string; color?: string; action: (game: import('./Game').Game, self: Prop) => void; once?: boolean }): Prop {
  const grp = g();
  grp.add(mesh(box(0.5, 0.9, 0.4, 0.05), M('#5b5f73'), { pos: [0, 0.45, 0] }));
  const cap = keep(g());
  cap.add(mesh(cyl(0.16, 0.18, 0.12, 12), M(o.color ?? '#ff5a6e'), {}));
  cap.position.set(0, 0.96, 0);
  cap.userData.y0 = 0.96;
  grp.add(cap);
  const trig = new TriggerSpecial({ label: o.label, kind: 'button', word: o.word, handle: cap, action: o.action, once: o.once });
  return b.prop({
    kind: 'button', name: o.label, icon: '🔴', group: grp, pos: o.at, kinematic: true,
    colliders: [{ shape: 'box', hx: 0.25, hy: 0.5, hz: 0.2, at: [0, 0.5, 0] }],
    mass: 5, mat: 'metal', value: 0, special: trig, traits: ['방아쇠'],
  });
}

/** a lever on a post */
export function lever(b: Builder, o: { at: V3; label: string; word?: string; action: (game: import('./Game').Game, self: Prop) => void; rot?: number }): Prop {
  const grp = g();
  grp.add(mesh(box(0.5, 1.0, 0.5, 0.05), M('#5b5f73'), { pos: [0, 0.5, 0] }));
  const h = keep(g());
  h.add(mesh(cyl(0.05, 0.05, 0.9, 6), M('#c9c3b8'), { pos: [0, 0.45, 0] }));
  h.add(mesh(sphere(0.13, 8, 6), M('#ff5a6e'), { pos: [0, 0.92, 0] }));
  h.position.set(0, 1.0, 0);
  h.rotation.z = 0.7;
  h.userData.r0 = 0.7;
  grp.add(h);
  const trig = new TriggerSpecial({ label: o.label, kind: 'lever', word: o.word ?? '철컥!', handle: h, action: o.action });
  return b.prop({
    kind: 'lever', name: o.label, icon: '🕹️', group: grp, pos: o.at, rotY: o.rot, kinematic: true,
    colliders: [{ shape: 'box', hx: 0.25, hy: 0.5, hz: 0.25, at: [0, 0.5, 0] }],
    mass: 5, mat: 'metal', value: 0, special: trig, traits: ['방아쇠'],
  });
}

/** a shopping cart (a garden cart in supermarket colours) */
export function shoppingCart(b: Builder, o: O & { slope?: number }): Prop {
  return gardenCart(b, { ...o, color: o.color ?? '#c9d6ea', name: o.name ?? '쇼핑 카트' });
}

/* ------------------------------ buildings that fall down ------------------------------ */

export interface StructureParts { slabs: Prop[]; pillars: Prop[]; windows: Prop[]; top: number }

/**
 * A building made of real stacked pieces: four pillars and a slab per floor,
 * glass panes on the front. Knock the pillars out (or drop something on it)
 * and it comes down floor by floor.
 */
export function structure(b: Builder, o: { x: number; z: number; w: number; d: number; floors: number; floorH?: number; color?: string; slabColor?: string; name?: string; value?: number; windows?: boolean; targetWindows?: boolean; rot?: number }): StructureParts {
  const fh = o.floorH ?? 2.6, st = 0.35, pw = 0.45;
  const out: StructureParts = { slabs: [], pillars: [], windows: [], top: 0 };
  const v = o.value ?? 400000000;
  const per = v / (o.floors * 6);
  let y = 0;
  for (let f = 0; f < o.floors; f++) {
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]] as const) {
      const grp = g();
      grp.add(mesh(box(pw, fh, pw, 0.04), M(o.color ?? '#fff1d6'), { pos: [0, fh / 2, 0] }));
      out.pillars.push(b.prop({
        kind: 'pillar', name: '기둥', icon: '🏛️', group: grp, pos: [o.x + sx * (o.w / 2 - pw / 2), y, o.z + sz * (o.d / 2 - pw / 2)],
        colliders: [{ shape: 'box', hx: pw / 2, hy: fh / 2, hz: pw / 2, at: [0, fh / 2, 0] }],
        mass: 4, mat: 'marble', value: Math.round(per * 0.3), friction: 0.8, restitution: 0.02, batch: 'pillar',
      }));
    }
    y += fh;
    const sg = g();
    sg.add(mesh(box(o.w, st, o.d, 0.05), M(o.slabColor ?? '#e8e2d8'), { pos: [0, st / 2, 0] }));
    if (f === o.floors - 1) sg.add(mesh(box(o.w + 0.4, 0.25, o.d + 0.4, 0.05), M('#e58b7a'), { pos: [0, st + 0.12, 0] }));
    out.slabs.push(b.prop({
      kind: 'slab', name: f === o.floors - 1 ? '지붕' : `${f + 2}층 바닥`, icon: '🏢', group: sg, pos: [o.x, y, o.z],
      colliders: [{ shape: 'box', hx: o.w / 2, hy: st / 2, hz: o.d / 2, at: [0, st / 2, 0] }],
      mass: 18, mat: 'marble', value: Math.round(per * 3), friction: 0.8, restitution: 0.02, noTopple: true,
      breakable: { threshold: 7, mode: 'damage', fx: 'dirt', word: '쿠르릉!', debris: { count: 10, colors: [o.slabColor ?? '#e8e2d8', '#c9c3b8'], size: 0.35 } },
    }));
    y += st;
    if (o.windows !== false) {
      // a glass pane on the front of the floor below
      const wg = g();
      wg.add(mesh(box(o.w - pw * 2 - 0.1, fh - 0.5, 0.08, 0.02), M('#bfe8ff', { transparent: true, opacity: 0.6 }), { pos: [0, (fh - 0.5) / 2, 0], shadow: false }));
      wg.add(mesh(box(o.w - pw * 2 - 0.1, 0.1, 0.12, 0.02), M('#ffffff'), { pos: [0, fh - 0.5, 0] }));
      out.windows.push(b.prop({
        kind: 'pane', name: '통유리창', icon: '🪟', group: wg, pos: [o.x, y - st - fh + 0.25, o.z + o.d / 2 - 0.05],
        colliders: [{ shape: 'box', hx: (o.w - pw * 2 - 0.1) / 2, hy: (fh - 0.5) / 2, hz: 0.04, at: [0, (fh - 0.5) / 2, 0] }],
        mass: 2, mat: 'glass', value: Math.round(per * 0.6), target: o.targetWindows, pinned: 60, interactable: false,
        breakable: { threshold: 2.5, hitForce: 200, mode: 'shatter', fx: 'glass', word: '와장창!', debris: { count: 10, colors: ['#e8fbff', '#bfe8ff'], size: 0.28, flat: true } },
      }));
    }
  }
  out.top = y;
  return out;
}

/** a tower crane: a mast, a jib, a trolley that shuttles, a hanging load and its lever */
export function towerCrane(b: Builder, o: { mast: [number, number]; x0: number; x1: number; z: number; h: number; speed: number; hang: number; lever: V3; load?: 'beams' | 'container'; loadName?: string }): { load: Prop; crane: import('./specials3').CraneSpecial } {
  const g0 = g();
  const yel = M('#ffd23f'), dark = M('#5b5f73');
  g0.add(mesh(box(0.8, o.h, 0.8, 0.05), yel, { pos: [o.mast[0], o.h / 2, o.mast[1]] }));
  for (let y = 1; y < o.h; y += 1.2) g0.add(mesh(box(0.9, 0.08, 0.9, 0.01), dark, { pos: [o.mast[0], y, o.mast[1]], shadow: false }));
  const jl = o.x1 - o.mast[0] + 1;
  g0.add(mesh(box(jl + 4, 0.5, 0.6, 0.05), yel, { pos: [o.mast[0] + jl / 2 - 2, o.h + 0.25, o.z] }));
  g0.add(mesh(box(2.2, 1.2, 1.2, 0.1), M('#c9d6ea'), { pos: [o.mast[0] - 3, o.h - 0.4, o.z] }));
  g0.add(mesh(box(1.4, 1.2, 1.4, 0.1), M('#ffffff'), { pos: [o.mast[0] + 0.9, o.h - 0.8, o.z] }));
  b.solid(g0, [{ shape: 'box', hx: 0.4, hy: o.h / 2, hz: 0.4, at: [o.mast[0], o.h / 2, o.mast[1]] }], [0, 0, 0]);
  const trolley = keep(g());
  trolley.add(mesh(box(0.9, 0.35, 0.9, 0.05), dark));
  trolley.position.set(o.x0, o.h - 0.15, o.z);
  b.deco(trolley);
  const cable = keep(g());
  cable.add(mesh(cyl(0.04, 0.04, o.hang, 4), dark, { pos: [0, o.h - o.hang / 2 - 0.3, 0], shadow: false }));
  cable.position.set(o.x0, 0, o.z);
  b.deco(cable);
  const lg = g();
  let cols: ColDef[];
  let mass: number;
  if (o.load === 'container') {
    lg.add(mesh(box(5, 2.4, 2.4, 0.08), M('#ff8f6b'), { pos: [0, -1.2, 0] }));
    for (let i = 0; i < 9; i++) lg.add(mesh(box(0.08, 2.2, 2.42, 0), M('#e8735a'), { pos: [-2.2 + i * 0.55, -1.2, 0], shadow: false }));
    cols = [{ shape: 'box', hx: 2.5, hy: 1.2, hz: 1.2, at: [0, -1.2, 0] }];
    mass = 80;
  } else {
    for (let i = 0; i < 3; i++) lg.add(mesh(box(6, 0.4, 0.5, 0.04), M('#c9a0dc'), { pos: [0, -0.3 - i * 0.42, -0.5 + i * 0.5], rot: [0, 0, 0] }));
    lg.add(mesh(box(6, 0.42, 0.5, 0.04), M('#b38cc4'), { pos: [0, -0.72, 0.5] }));
    cols = [{ shape: 'box', hx: 3, hy: 0.6, hz: 0.75, at: [0, -0.75, 0] }];
    mass = 60;
  }
  const crane = new CraneSpecial({ trolley, cable, load: null, x0: o.x0, x1: o.x1, z: o.z, y: o.h - 0.3, speed: o.speed, hang: o.hang });
  const load = b.prop({
    kind: o.load === 'container' ? 'container' : 'beams', name: o.loadName ?? (o.load === 'container' ? '컨테이너' : '철골 다발'), icon: o.load === 'container' ? '📦' : '🏗️', group: lg,
    pos: [o.x0, o.h - 0.3 - o.hang, o.z], kinematic: true, colliders: cols, mass, mat: 'metal', value: 4000000, interactable: false, special: crane,
  });
  crane.load = load;
  lever(b, { at: o.lever, label: '크레인 레버', word: '철컥! 툭', action: (game, self) => crane.release(game, self) });
  return { load, crane };
}

/** a wrecking ball on an excavator arm: its lever lets it swing */
export function wreckingBall(b: Builder, o: { pivot: V3; len: number; dir: [number, number]; from: number; lever: V3; base: V3 }): Prop {
  const pivot = new THREE.Vector3(...o.pivot);
  const d = new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize();
  const chain = keep(g());
  chain.add(mesh(cyl(0.06, 0.06, 1, 5), M('#5b5f73'), { shadow: false }));
  b.deco(chain);
  // the machine: tracks, cab, arm up to the pivot
  const mg = g();
  mg.add(mesh(box(3, 1, 2.2, 0.1), M('#3a3d4f'), { pos: [0, 0.5, 0] }));
  mg.add(mesh(box(2.2, 1.8, 2, 0.15), M('#ffd23f'), { pos: [0, 1.9, 0] }));
  const arm = new THREE.Vector3(o.pivot[0] - o.base[0], o.pivot[1] - 2.6, o.pivot[2] - o.base[2]);
  const am = mesh(cyl(0.18, 0.25, arm.length(), 6), M('#ffd23f'));
  am.position.set(arm.x / 2, 2.6 + arm.y / 2, arm.z / 2);
  am.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), arm.clone().normalize());
  mg.add(am);
  b.solid(mg, [{ shape: 'box', hx: 1.5, hy: 1.4, hz: 1.1, at: [0, 1.4, 0] }], o.base);
  const spec = new WreckingBallSpecial({ pivot, len: o.len, dir: d, from: o.from, chain });
  const bg = g();
  bg.add(mesh(sphere(0.9, 12, 9), M('#3a3d4f')));
  const a = o.from;
  const ball = b.prop({
    kind: 'wreckingBall', name: '철거용 쇠공', icon: '⚫', group: bg,
    pos: [pivot.x + d.x * Math.sin(a) * o.len, pivot.y - Math.cos(a) * o.len, pivot.z + d.z * Math.sin(a) * o.len],
    kinematic: true, colliders: [{ shape: 'ball', r: 0.9 }], mass: 200, mat: 'metal', value: 0, interactable: false, special: spec,
  });
  lever(b, { at: o.lever, label: '쇠공 레버', word: '철컥! 부웅—', action: (game, self) => spec.release(game, ball, self) });
  return ball;
}

/** a portable site toilet (tips over with a very satisfying thud) */
export function portableToilet(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(1.3, 2.6, 1.3, 0.1), M(o.color ?? '#4f86c6'), { pos: [0, 1.3, 0] }));
  grp.add(mesh(box(1.4, 0.18, 1.4, 0.05), M('#ffffff'), { pos: [0, 2.68, 0] }));
  grp.add(mesh(box(0.7, 1.9, 0.04, 0.02), M('#5b9fd8'), { pos: [0, 1.15, 0.66] }));
  grp.add(mesh(cyl(0.12, 0.12, 0.04, 8), M('#ff5a6e'), { pos: [0.25, 1.3, 0.69], rot: [Math.PI / 2, 0, 0] }));
  return b.prop({
    kind: 'toilet', name: o.name ?? '간이 화장실', icon: '🚽', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.65, hy: 1.3, hz: 0.65, at: [0, 1.3, 0] }],
    mass: 3, mat: 'plastic', value: o.value ?? 1500000, toppleValue: 400000, friction: 0.7,
  });
}
