import * as THREE from 'three';
import { M, box, cone, cyl, lathe, mesh, sphere, torus } from '../render/kit';
import { mergeByMaterial } from '../render/merge';
import type { Builder } from '../levels/Builder';
import type { ColDef, Worth } from './types';
import type { Prop } from './Prop';
import { CarSpecial, SwingSpecial, TriggerSpecial, type CarParts } from './specials3';
import type { O, V3 } from './catalog';

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
