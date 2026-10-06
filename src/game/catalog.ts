import * as THREE from 'three';
import { B, M, ball, box, cone, cyl, lathe, mesh, screenTexture, sphere, torus } from '../render/kit';
import { srand } from '../core/util';
import type { Builder } from '../levels/Builder';
import type { ColDef } from './types';
import type { Prop } from './Prop';
import { AlarmSpecial, ClothSpecial, RoombaSpecial, SodaSpecial, ToasterSpecial, YarnSpecial } from './specials';

/* ------------------------------------------------------------------ */
/* Every prop the cat can mess with. Origin = bottom centre.            */
/* ------------------------------------------------------------------ */

export type V3 = [number, number, number];
export interface O { at: V3; rot?: number; target?: boolean; color?: string; name?: string; value?: number; pinned?: number; scale?: number }

const BOOK_COLORS = ['#e05a5a', '#4f86c6', '#f2b134', '#5bb98c', '#9b6fcf', '#ef8a5b', '#3fb6b2', '#e57ba8'];

function hullFromLathe(profile: [number, number][], seg = 8): ColDef {
  const pts: number[] = [];
  for (const [r, y] of profile) {
    if (r < 0.001) { pts.push(0, y, 0); continue; }
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      pts.push(Math.cos(a) * r, y, Math.sin(a) * r);
    }
  }
  return { shape: 'hull', points: pts };
}

const g = () => new THREE.Group();

/* ------------------------------ ceramics ------------------------------ */

export function mug(b: Builder, o: O): Prop {
  const c = o.color ?? '#ff8a8a';
  const grp = g();
  grp.add(mesh(lathe([[0, 0], [0.2, 0], [0.22, 0.04], [0.22, 0.44], [0.19, 0.44], [0.19, 0.4], [0, 0.4]], 10), M(c)));
  grp.add(mesh(cyl(0.18, 0.18, 0.02, 10), M('#6b3f22'), { pos: [0, 0.38, 0] }));
  grp.add(mesh(torus(0.11, 0.035, 5, 8, Math.PI), M(c), { pos: [0.21, 0.22, 0], rot: [0, 0, -Math.PI / 2] }));
  return b.prop({
    kind: 'mug', name: o.name ?? '머그컵', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.22, r: 0.22, at: [0, 0.22, 0] }],
    mass: 0.4, mat: 'ceramic', value: o.value ?? 15000, target: o.target,
    breakable: { threshold: 5, mode: 'shatter', fx: 'coffee', debris: { count: 7, colors: [c, '#ffffff'], size: 0.17 } },
  });
}

export function vase(b: Builder, o: O & { flowers?: boolean; tall?: boolean }): Prop {
  const c = o.color ?? '#5ec4c9';
  const s = o.scale ?? 1;
  const prof: [number, number][] = o.tall
    ? [[0, 0], [0.22, 0], [0.32, 0.25], [0.36, 0.6], [0.26, 1.05], [0.15, 1.3], [0.2, 1.5]]
    : [[0, 0], [0.2, 0], [0.32, 0.2], [0.36, 0.45], [0.24, 0.78], [0.15, 0.92], [0.21, 1.06]];
  const sp = prof.map(([r, y]) => [r * s, y * s] as [number, number]);
  const grp = g();
  grp.add(mesh(lathe(sp, 9), M(c)));
  // painted band
  const bandY = sp[3][1];
  grp.add(mesh(cyl(sp[3][0] + 0.012, sp[3][0] + 0.012, 0.09 * s, 9), M('#ffffff'), { pos: [0, bandY - 0.05 * s, 0] }));
  if (o.flowers !== false) {
    const top = sp[sp.length - 1][1];
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2 + 0.4;
      const stem = mesh(cyl(0.025, 0.025, 0.55 * s, 5), M('#59a85e'), { pos: [Math.cos(a) * 0.07, top + 0.18 * s, Math.sin(a) * 0.07], rot: [Math.sin(a) * 0.3, 0, Math.cos(a) * 0.3] });
      const bloom = mesh(ball(0.12 * s, 0), M(['#ff7aa8', '#ffd23f', '#ffffff'][i]), { pos: [Math.cos(a) * 0.16, top + 0.45 * s, Math.sin(a) * 0.16] });
      grp.add(stem, bloom);
    }
  }
  return b.prop({
    kind: 'vase', name: o.name ?? '꽃병', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hullFromLathe(sp, 8)],
    mass: 1.0 * s, mat: 'ceramic', value: o.value ?? 120000, target: o.target, pinned: o.pinned,
    breakable: { threshold: 5.5, mode: 'shatter', fx: o.flowers === false ? 'none' : 'flowers', debris: { count: 12, colors: [c, '#ffffff', c], size: 0.21 * s } },
  });
}

export function plate(b: Builder, o: O): Prop {
  const c = o.color ?? '#ffffff';
  const grp = g();
  grp.add(mesh(lathe([[0, 0], [0.26, 0], [0.42, 0.05], [0.44, 0.08], [0.4, 0.07], [0, 0.04]], 12), M(c)));
  grp.add(mesh(cyl(0.3, 0.3, 0.012, 12), M(o.name === '케이크 접시' ? '#ffd8e4' : '#9fd8ff'), { pos: [0, 0.045, 0] }));
  return b.prop({
    kind: 'plate', name: o.name ?? '접시', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.04, r: 0.43, at: [0, 0.04, 0] }],
    mass: 0.35, mat: 'ceramic', value: o.value ?? 20000, target: o.target,
    breakable: { threshold: 5, mode: 'shatter', fx: 'none', debris: { count: 7, colors: [c, '#9fd8ff'], size: 0.2, flat: true } },
  });
}

export function plateStack(b: Builder, o: O & { n: number }): Prop[] {
  const out: Prop[] = [];
  for (let i = 0; i < o.n; i++) out.push(plate(b, { ...o, at: [o.at[0], o.at[1] + i * 0.085, o.at[2]] }));
  return out;
}

export function teapot(b: Builder, o: O): Prop {
  const c = o.color ?? '#f7c6d9';
  const grp = g();
  grp.add(mesh(sphere(0.34, 10, 8), M(c), { pos: [0, 0.32, 0], scale: [1, 0.85, 1] }));
  grp.add(mesh(cyl(0.12, 0.2, 0.12, 8), M(c), { pos: [0, 0.6, 0] }));
  grp.add(mesh(ball(0.06, 0), M('#ffffff'), { pos: [0, 0.7, 0] }));
  grp.add(mesh(cyl(0.05, 0.08, 0.36, 6), M(c), { pos: [0.38, 0.38, 0], rot: [0, 0, -0.9] }));
  grp.add(mesh(torus(0.13, 0.035, 5, 8, Math.PI), M(c), { pos: [-0.33, 0.35, 0], rot: [0, 0, Math.PI / 2] }));
  return b.prop({
    kind: 'teapot', name: o.name ?? '찻주전자', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r: 0.33, at: [0, 0.32, 0] }],
    mass: 0.9, mat: 'ceramic', value: o.value ?? 60000, target: o.target,
    breakable: { threshold: 5.5, mode: 'shatter', fx: 'coffee', debris: { count: 9, colors: [c, '#ffffff'], size: 0.19 } },
  });
}

export function piggy(b: Builder, o: O): Prop {
  const c = o.color ?? '#ffa5c0';
  const grp = g();
  grp.add(mesh(sphere(0.34, 10, 8), M(c), { pos: [0, 0.33, 0], scale: [1.15, 0.95, 0.95] }));
  grp.add(mesh(cyl(0.12, 0.12, 0.1, 8), M('#ff8fb0'), { pos: [0.4, 0.35, 0], rot: [0, 0, Math.PI / 2] }));
  for (const [x, z] of [[0.2, 0.18], [0.2, -0.18], [-0.2, 0.18], [-0.2, -0.18]]) grp.add(mesh(cyl(0.06, 0.06, 0.12, 6), M(c), { pos: [x, 0.06, z] }));
  for (const z of [0.15, -0.15]) grp.add(mesh(cone(0.08, 0.14, 4), M(c), { pos: [0.22, 0.65, z] }));
  grp.add(mesh(box(0.16, 0.02, 0.04, 0), M('#7a2e3a'), { pos: [0, 0.65, 0] }));
  return b.prop({
    kind: 'piggy', name: o.name ?? '돼지저금통', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r: 0.33, at: [0, 0.33, 0] }],
    mass: 1.2, mat: 'ceramic', value: o.value ?? 50000, target: o.target, angDamp: 1.5,
    breakable: { threshold: 5.5, mode: 'shatter', fx: 'coins', debris: { count: 9, colors: [c, '#ffd23f'], size: 0.2 } },
  });
}

export function plant(b: Builder, o: O): Prop {
  const grp = g();
  const pot: [number, number][] = [[0, 0], [0.24, 0], [0.33, 0.5], [0.36, 0.52], [0.36, 0.58], [0.3, 0.58], [0, 0.52]];
  grp.add(mesh(lathe(pot, 8), M(o.color ?? '#d9784a')));
  grp.add(mesh(cyl(0.3, 0.3, 0.03, 8), M('#5e3d22'), { pos: [0, 0.54, 0] }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    grp.add(mesh(box(0.16, 0.55, 0.05, 0.02), M(i % 2 ? '#4caf6a' : '#6cc985'), { pos: [Math.cos(a) * 0.12, 0.85, Math.sin(a) * 0.12], rot: [Math.sin(a) * 0.5, -a, Math.cos(a) * 0.5] }));
  }
  return b.prop({
    kind: 'plant', name: o.name ?? '화분', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hullFromLathe([[0.24, 0], [0.36, 0.58], [0.2, 1.05]], 8)],
    mass: 1.6, mat: 'ceramic', value: o.value ?? 45000, target: o.target, pinned: o.pinned,
    breakable: { threshold: 6, mode: 'shatter', fx: 'dirt', debris: { count: 10, colors: ['#d9784a', '#4caf6a', '#c2643a'], size: 0.2 } },
  });
}

/* ------------------------------ glass ------------------------------ */

export function wineGlass(b: Builder, o: O & { wine?: string | null }): Prop {
  const grp = g();
  const glass = M('#cfefff', { transparent: true, opacity: 0.75 });
  grp.add(mesh(lathe([[0, 0], [0.15, 0], [0.15, 0.03], [0.03, 0.05], [0.03, 0.28], [0.16, 0.36], [0.18, 0.5], [0.16, 0.62]], 9), glass));
  if (o.wine !== null) grp.add(mesh(lathe([[0, 0.3], [0.15, 0.37], [0.165, 0.46], [0, 0.46]], 9), M(o.wine ?? '#c2264b')));
  return b.prop({
    kind: 'glass', name: o.name ?? '와인잔', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.31, r: 0.16, at: [0, 0.31, 0] }],
    mass: 0.22, mat: 'glass', value: o.value ?? 25000, target: o.target,
    breakable: { threshold: 4.2, mode: 'shatter', fx: o.wine === null ? 'glass' : 'juice', debris: { count: 7, colors: ['#e8fbff', '#bfe9ff'], size: 0.14 } },
  });
}

export function cup(b: Builder, o: O & { juice?: string }): Prop {
  const grp = g();
  grp.add(mesh(lathe([[0, 0], [0.17, 0], [0.21, 0.5], [0.18, 0.5], [0.15, 0.04], [0, 0.04]], 9), M('#d8f3ff', { transparent: true, opacity: 0.8 })));
  grp.add(mesh(cyl(0.18, 0.15, 0.3, 9), M(o.juice ?? '#ffb347'), { pos: [0, 0.2, 0] }));
  return b.prop({
    kind: 'cup', name: o.name ?? '주스잔', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.25, r: 0.19, at: [0, 0.25, 0] }],
    mass: 0.3, mat: 'glass', value: o.value ?? 10000, target: o.target,
    breakable: { threshold: 4.3, mode: 'shatter', fx: 'juice', debris: { count: 6, colors: ['#e8fbff', '#bfe9ff'], size: 0.14 } },
  });
}

export function bottle(b: Builder, o: O): Prop {
  const c = o.color ?? '#3f8f5a';
  const grp = g();
  const prof: [number, number][] = [[0, 0], [0.17, 0], [0.18, 0.55], [0.08, 0.75], [0.07, 0.95], [0.08, 0.98], [0, 0.98]];
  grp.add(mesh(lathe(prof, 9), M(c)));
  grp.add(mesh(cyl(0.185, 0.185, 0.22, 9), M('#fff4d6'), { pos: [0, 0.3, 0] }));
  return b.prop({
    kind: 'bottle', name: o.name ?? '와인병', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hullFromLathe(prof.slice(1), 8)],
    mass: 0.8, mat: 'glass', value: o.value ?? 80000, target: o.target,
    breakable: { threshold: 5, mode: 'shatter', fx: 'juice', debris: { count: 9, colors: [c, '#fff4d6'], size: 0.17 } },
  });
}

export function marbleJar(b: Builder, o: O): Prop {
  const grp = g();
  const prof: [number, number][] = [[0, 0], [0.3, 0], [0.33, 0.1], [0.33, 0.6], [0.26, 0.7], [0.26, 0.78]];
  grp.add(mesh(lathe(prof, 10), M('#d8f3ff', { transparent: true, opacity: 0.55 })));
  grp.add(mesh(cyl(0.28, 0.28, 0.08, 10), M('#ff6b6b'), { pos: [0, 0.8, 0] }));
  const mc = ['#ff6b6b', '#4f86c6', '#ffd23f', '#5bb98c', '#9b6fcf'];
  for (let i = 0; i < 9; i++) grp.add(mesh(ball(0.09, 0), M(mc[i % 5]), { pos: [Math.sin(i * 2.4) * 0.17, 0.12 + (i % 3) * 0.13, Math.cos(i * 2.4) * 0.17], shadow: false }));
  return b.prop({
    kind: 'marbleJar', name: o.name ?? '구슬병', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.42, r: 0.33, at: [0, 0.42, 0] }],
    mass: 1.2, mat: 'glass', value: o.value ?? 20000, target: o.target,
    breakable: {
      threshold: 4.5, mode: 'shatter', fx: 'glass', debris: { count: 7, colors: ['#e8fbff', '#bfe9ff'], size: 0.16 },
      word: '쨍그랑! 데구르르',
      after: (game, _p, pos, vel) => {
        for (let i = 0; i < 12; i++) {
          const mp = marble(game.builder!, { at: [pos.x + srand(-0.25, 0.25), pos.y + srand(0, 0.3), pos.z + srand(-0.25, 0.25)], color: mc[i % 5] });
          mp.body.setLinvel({ x: vel.x * 0.4 + srand(-4, 4), y: srand(1, 4), z: vel.z * 0.4 + srand(-4, 4) }, true);
          mp.graceUntil = game.time + 0.2;
          mp.prevV.set(0, 0, 0);
        }
      },
    },
  });
}

export function marble(b: Builder, o: O): Prop {
  return b.prop({
    kind: 'marble', name: '구슬', group: (() => { const x = g(); x.add(mesh(ball(0.1, 1), M(o.color ?? '#4f86c6'), { pos: [0, 0.1, 0] })); return x; })(),
    pos: o.at, colliders: [{ shape: 'ball', r: 0.1, at: [0, 0.1, 0] }],
    noTopple: true, mass: 0.12, mat: 'marble', value: 300, restitution: 0.55, friction: 0.25, angDamp: 0.05, linDamp: 0.02, interactable: false, scoreMoves: false,
  });
}

/* ------------------------------ books & dominoes ------------------------------ */

export function book(b: Builder, o: O & { lying?: boolean; size?: [number, number, number] }): Prop {
  const c = o.color ?? BOOK_COLORS[Math.floor(Math.abs(o.at[0] * 7 + o.at[2] * 13)) % BOOK_COLORS.length];
  const [w, h, d] = o.size ?? [0.22, 0.78, 0.56];
  const grp = g();
  if (o.lying) {
    grp.add(mesh(box(d, w, h, 0.03), M(c), { pos: [0, w / 2, 0] }));
    grp.add(mesh(box(d - 0.04, w - 0.06, h + 0.01, 0), M('#fffaf0'), { pos: [0.03, w / 2, 0], shadow: false }));
  } else {
    grp.add(mesh(box(w, h, d, 0.03), M(c), { pos: [0, h / 2, 0] }));
    grp.add(mesh(box(w + 0.01, 0.05, d * 0.9, 0), M('#ffffff'), { pos: [0, h * 0.75, 0], shadow: false }));
  }
  const cols: ColDef[] = o.lying ? [{ shape: 'box', hx: d / 2, hy: w / 2, hz: h / 2, at: [0, w / 2, 0] }] : [{ shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }];
  return b.prop({
    kind: 'book', name: o.name ?? '책', group: grp, pos: o.at, rotY: o.rot, colliders: cols,
    mass: 0.6, mat: 'paper', value: o.value ?? 3000, toppleValue: 800, friction: 0.5, target: o.target, pinned: o.pinned,
  });
}

/** row of standing books from `at` along direction angle `rot` */
export function bookRow(b: Builder, o: O & { n: number; gap?: number }): Prop[] {
  const out: Prop[] = [];
  const gap = o.gap ?? 0.36;
  const ang = o.rot ?? 0;
  for (let i = 0; i < o.n; i++) {
    out.push(book(b, { at: [o.at[0] + Math.cos(ang) * gap * i, o.at[1], o.at[2] - Math.sin(ang) * gap * i], rot: ang, color: BOOK_COLORS[i % BOOK_COLORS.length] }));
  }
  return out;
}

export function bookStack(b: Builder, o: O & { n: number }): Prop[] {
  const out: Prop[] = [];
  for (let i = 0; i < o.n; i++) {
    const j = Math.sin(i * 12.9898 + o.at[0] * 78.233) * 0.5;
    out.push(book(b, { at: [o.at[0] + j * 0.06, o.at[1] + i * 0.225, o.at[2] - j * 0.04], rot: (o.rot ?? 0) + j * 0.2, lying: true, color: BOOK_COLORS[(i * 3) % BOOK_COLORS.length] }));
  }
  return out;
}

export function domino(b: Builder, o: O): Prop {
  const c = o.color ?? '#fdfdfd';
  const grp = g();
  grp.add(mesh(box(0.13, 0.66, 0.34, 0.025), M(c), { pos: [0, 0.33, 0] }));
  grp.add(mesh(box(0.135, 0.02, 0.26, 0), M('#33334a'), { pos: [0, 0.33, 0], shadow: false }));
  for (const y of [0.16, 0.5]) grp.add(mesh(sphere(0.035, 5, 4), M('#33334a'), { pos: [0.065, y, 0], shadow: false }));
  return b.prop({
    kind: 'domino', name: '도미노', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.065, hy: 0.33, hz: 0.17, at: [0, 0.33, 0] }],
    mass: 0.25, mat: 'plastic', value: 500, toppleValue: 900, friction: 0.45, ccd: false,
  });
}

/** dominoes along a polyline (spacing ~0.3) */
export function dominoPath(b: Builder, pts: [number, number][], y: number, spacing = 0.3, colors = ['#ff6b6b', '#ffd23f', '#4f86c6', '#5bb98c']): Prop[] {
  const out: Prop[] = [];
  let carry = 0, k = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, z0] = pts[i], [x1, z1] = pts[i + 1];
    const len = Math.hypot(x1 - x0, z1 - z0);
    const ang = Math.atan2(-(z1 - z0), x1 - x0);
    for (let d = carry; d <= len; d += spacing) {
      const t = d / len;
      out.push(domino(b, { at: [x0 + (x1 - x0) * t, y, z0 + (z1 - z0) * t], rot: ang, color: colors[k++ % colors.length] }));
      carry = d + spacing - len;
    }
  }
  return out;
}

/* ------------------------------ toys ------------------------------ */

export function rubberBall(b: Builder, o: O & { r?: number }): Prop {
  const r = o.r ?? 0.3;
  const grp = g();
  grp.add(mesh(ball(r, 1), M(o.color ?? '#ff5e7e'), { pos: [0, r, 0] }));
  grp.add(mesh(torus(r * 1.0, 0.03, 4, 14), M('#ffffff'), { pos: [0, r, 0], rot: [Math.PI / 2, 0, 0], shadow: false }));
  return b.prop({
    kind: 'ball', name: o.name ?? '공', group: grp, pos: o.at,
    colliders: [{ shape: 'ball', r, at: [0, r, 0] }],
    noTopple: true, mass: 0.35, mat: 'rubber', value: 2000, restitution: 0.72, friction: 0.5, angDamp: 0.15, linDamp: 0.05,
  });
}

export function yarn(b: Builder, o: O): Prop {
  const r = 0.28;
  const c = o.color ?? '#ff7aa8';
  const grp = g();
  grp.add(mesh(ball(r, 1), M(c), { pos: [0, r, 0] }));
  for (let i = 0; i < 3; i++) grp.add(mesh(torus(r * 0.98, 0.02, 3, 12), M('#ffffff'), { pos: [0, r, 0], rot: [i * 1.1, i * 0.7, 0], shadow: false }));
  const p = b.prop({
    kind: 'yarn', name: '털실뭉치', group: grp, pos: o.at,
    colliders: [{ shape: 'ball', r, at: [0, r, 0] }],
    noTopple: true, mass: 0.3, mat: 'soft', value: 3000, restitution: 0.3, friction: 0.7, angDamp: 0.3,
    special: new YarnSpecial(b.game, c, r),
  });
  return p;
}

export function rubberDuck(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(sphere(0.25, 8, 6), M('#ffd23f'), { pos: [0, 0.22, 0], scale: [1.25, 0.9, 1] }));
  grp.add(mesh(sphere(0.17, 8, 6), M('#ffd23f'), { pos: [0.17, 0.5, 0] }));
  grp.add(mesh(box(0.14, 0.05, 0.12, 0.02), M('#ff8c42'), { pos: [0.34, 0.47, 0] }));
  for (const z of [0.09, -0.09]) grp.add(mesh(sphere(0.03, 5, 4), M('#2b2233'), { pos: [0.27, 0.55, z], shadow: false }));
  return b.prop({
    kind: 'duck', name: '고무오리', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r: 0.24, at: [0, 0.24, 0] }],
    mass: 0.2, mat: 'squeak', value: 2000, restitution: 0.5,
  });
}

export function toyCar(b: Builder, o: O): Prop {
  const c = o.color ?? '#ff5e5e';
  const grp = g();
  grp.add(mesh(box(0.9, 0.25, 0.5, 0.07), M(c), { pos: [0, 0.24, 0] }));
  grp.add(mesh(box(0.45, 0.22, 0.44, 0.07), M('#bfe9ff'), { pos: [-0.05, 0.45, 0] }));
  const wheels = g();
  for (const [x, z] of [[0.28, 0.25], [0.28, -0.25], [-0.28, 0.25], [-0.28, -0.25]]) wheels.add(mesh(cyl(0.12, 0.12, 0.1, 8), M('#33334a'), { pos: [x, 0.12, z], rot: [Math.PI / 2, 0, 0] }));
  grp.add(wheels);
  return b.prop({
    kind: 'car', name: '장난감 자동차', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.14, hz: 0.25, at: [0, 0.2, 0], round: 0.06 }],
    mass: 0.6, mat: 'plastic', value: 8000, friction: 0.04, linDamp: 0.15, angDamp: 2,
  });
}

export function roomba(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.62, 0.64, 0.22, 16), M('#3a3d4f'), { pos: [0, 0.13, 0] }));
  grp.add(mesh(cyl(0.5, 0.5, 0.03, 16), M('#55596e'), { pos: [0, 0.255, 0] }));
  const ledMat = new THREE.MeshLambertMaterial({ color: '#ffffff', emissive: '#330000' });
  grp.add(mesh(cyl(0.08, 0.08, 0.03, 8), ledMat, { pos: [0.3, 0.27, 0] }));
  const brush = g();
  brush.userData.keep = true;
  brush.position.set(0.45, 0.04, 0.35);
  for (let i = 0; i < 3; i++) brush.add(mesh(box(0.32, 0.02, 0.03, 0), M('#ffd23f'), { rot: [0, (i * Math.PI) / 3, 0], shadow: false }));
  grp.add(brush);
  const sp = new RoombaSpecial(Math.round(o.at[0] * 100 + o.at[2] * 7), 3.6, 8);
  sp.led = ledMat; sp.brush = brush;
  const p = b.prop({
    kind: 'roomba', name: '로봇청소기', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.12, r: 0.62, at: [0, 0.13, 0] }],
    mass: 4, mat: 'plastic', value: 0, friction: 0.2, special: sp, scoreMoves: false,
  });
  p.body.setEnabledRotations(false, true, false, true);
  return p;
}

export function soda(b: Builder, o: O & { aim?: [number, number] }): Prop {
  const c = o.color ?? '#ff5e5e';
  const grp = g();
  const prof: [number, number][] = [[0, 0], [0.17, 0], [0.18, 0.08], [0.17, 0.5], [0.08, 0.66], [0.07, 0.74], [0, 0.74]];
  grp.add(mesh(lathe(prof, 9), M('#a8e6c0', { transparent: true, opacity: 0.85 })));
  grp.add(mesh(cyl(0.185, 0.185, 0.2, 9), M(c), { pos: [0, 0.28, 0] }));
  grp.add(mesh(cyl(0.08, 0.08, 0.06, 8), M('#ffffff'), { pos: [0, 0.76, 0] }));
  const sp = new SodaSpecial();
  if (o.aim) sp.aim = new THREE.Vector3(o.aim[0], 0, o.aim[1]).normalize();
  return b.prop({
    kind: 'soda', name: '탄산음료', group: grp, pos: o.at, rotY: o.rot,
    colliders: [hullFromLathe(prof.slice(1), 8)],
    mass: 0.5, mat: 'plastic', value: 3000, special: sp, touchForce: 14,
  });
}

export function cushion(b: Builder, o: O): Prop {
  const c = o.color ?? '#ffcf5c';
  const grp = g();
  grp.add(mesh(box(0.9, 0.3, 0.9, 0.14), M(c), { pos: [0, 0.15, 0] }));
  grp.add(mesh(sphere(0.05, 5, 4), M('#ffffff'), { pos: [0, 0.3, 0], shadow: false }));
  return b.prop({
    kind: 'cushion', name: '쿠션', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.15, hz: 0.45, at: [0, 0.15, 0], round: 0.1 }],
    mass: 0.4, mat: 'soft', value: 1000, restitution: 0.55,
  });
}

/* ------------------------------ electronics ------------------------------ */

export function tv(b: Builder, o: O): Prop {
  const grp = g();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture('tv') ?? null, color: screenTexture('tv') ? 0xffffff : 0x7fd3ff });
  grp.add(mesh(box(2.4, 1.5, 0.22, 0.05), M('#2f3142'), { pos: [0, 1.0, 0] }));
  const scr = mesh(box(2.2, 1.3, 0.02, 0), screenMat, { pos: [0, 1.0, 0.115], shadow: false });
  grp.add(scr);
  grp.add(mesh(box(0.9, 0.08, 0.6, 0.03), M('#2f3142'), { pos: [0, 0.04, 0] }));
  grp.add(mesh(box(0.15, 0.25, 0.1, 0.02), M('#2f3142'), { pos: [0, 0.2, 0] }));
  return b.prop({
    kind: 'tv', name: o.name ?? 'TV', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: 1.2, hy: 0.75, hz: 0.11, at: [0, 1.0, 0], massShare: 0.8 },
      { shape: 'box', hx: 0.45, hy: 0.12, hz: 0.3, at: [0, 0.12, 0], massShare: 0.3 },
    ],
    mass: 9, mat: 'electronic', value: o.value ?? 900000, target: o.target,
    breakable: {
      threshold: 6, hitForce: 260, mode: 'damage', fx: 'sparks', word: '파지직!',
      debris: { count: 6, colors: ['#bfe9ff', '#2f3142'], size: 0.16, flat: true },
      onDamage: () => { const t = screenTexture('broken'); if (t) screenMat.map = t; else screenMat.color.set('#111'); screenMat.needsUpdate = true; },
    },
  });
}

export function laptop(b: Builder, o: O): Prop {
  const grp = g();
  const screenMat = new THREE.MeshBasicMaterial({ map: screenTexture('laptop') ?? null, color: screenTexture('laptop') ? 0xffffff : 0xc6d6ff });
  grp.add(mesh(box(1.1, 0.07, 0.75, 0.02), M('#c9ccd8'), { pos: [0, 0.035, 0] }));
  grp.add(mesh(box(0.95, 0.01, 0.4, 0), M('#7c8095'), { pos: [0, 0.075, 0.05], shadow: false }));
  const lid = g();
  lid.position.set(0, 0.07, -0.36);
  lid.rotation.x = -0.32;
  lid.add(mesh(box(1.1, 0.72, 0.05, 0.02), M('#c9ccd8'), { pos: [0, 0.36, 0] }));
  lid.add(mesh(box(0.98, 0.6, 0.01, 0), screenMat, { pos: [0, 0.37, 0.03], shadow: false }));
  grp.add(lid);
  return b.prop({
    kind: 'laptop', name: o.name ?? '노트북', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: 0.55, hy: 0.04, hz: 0.375, at: [0, 0.04, 0], massShare: 0.6 },
      { shape: 'box', hx: 0.55, hy: 0.36, hz: 0.03, at: [0, 0.42, -0.25], rot: [-0.32, 0, 0], massShare: 0.4 },
    ],
    mass: 1.8, mat: 'electronic', value: o.value ?? 1500000, target: o.target, friction: 0.45,
    breakable: {
      threshold: 6.5, hitForce: 160, mode: 'damage', fx: 'sparks', word: '파지직!',
      debris: { count: 4, colors: ['#c9ccd8', '#7c8095'], size: 0.13, flat: true },
      onDamage: () => { const t = screenTexture('broken'); if (t) screenMat.map = t; else screenMat.color.set('#111'); screenMat.needsUpdate = true; },
    },
  });
}

export function floorLamp(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.42, 0.48, 0.12, 10), M('#3a3d4f'), { pos: [0, 0.06, 0] }));
  grp.add(mesh(cyl(0.05, 0.05, 3.7, 6), M('#3a3d4f'), { pos: [0, 1.95, 0] }));
  const shadeMat = new THREE.MeshLambertMaterial({ color: '#fff1c1', emissive: '#ffcf6b', emissiveIntensity: 0.55, flatShading: true });
  grp.add(mesh(cyl(0.38, 0.65, 0.8, 10), shadeMat, { pos: [0, 3.95, 0] }));
  return b.prop({
    kind: 'lamp', name: o.name ?? '스탠드', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'cyl', hh: 0.06, r: 0.46, at: [0, 0.06, 0], massShare: 0.5 },
      { shape: 'cyl', hh: 1.85, r: 0.08, at: [0, 1.95, 0], massShare: 0.25 },
      { shape: 'cone', hh: 0.4, r: 0.62, at: [0, 3.95, 0], rot: [Math.PI, 0, 0], massShare: 0.25 },
    ],
    mass: 3.2, mat: 'metal', value: o.value ?? 90000, target: o.target,
    breakable: {
      threshold: 7, mode: 'damage', fx: 'sparks', word: '퍽! 지지직',
      onDamage: () => { shadeMat.emissiveIntensity = 0; shadeMat.color.set('#c9bfa0'); },
    },
  });
}

export function deskLamp(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff8c42';
  grp.add(mesh(cyl(0.25, 0.28, 0.08, 10), M(c), { pos: [0, 0.04, 0] }));
  grp.add(mesh(cyl(0.035, 0.035, 0.8, 6), M('#3a3d4f'), { pos: [0.1, 0.45, 0], rot: [0, 0, -0.25] }));
  const shadeMat = new THREE.MeshLambertMaterial({ color: c, emissive: '#ffcf6b', emissiveIntensity: 0.2, flatShading: true });
  grp.add(mesh(cone(0.24, 0.32, 10), shadeMat, { pos: [0.28, 0.85, 0], rot: [0, 0, 2.2] }));
  return b.prop({
    kind: 'deskLamp', name: '책상 스탠드', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.04, r: 0.27, at: [0, 0.04, 0], massShare: 0.6 }, { shape: 'box', hx: 0.2, hy: 0.4, hz: 0.18, at: [0.15, 0.55, 0], massShare: 0.4 }],
    mass: 1.0, mat: 'metal', value: o.value ?? 35000, target: o.target,
    breakable: { threshold: 7, mode: 'damage', fx: 'sparks', onDamage: () => { shadeMat.emissiveIntensity = 0; } },
  });
}

export function alarmClock(b: Builder, o: O): Prop {
  const grp = g();
  const c = o.color ?? '#ff5e7e';
  grp.add(mesh(cyl(0.3, 0.3, 0.2, 12), M(c), { pos: [0, 0.38, 0], rot: [Math.PI / 2, 0, 0] }));
  grp.add(mesh(cyl(0.24, 0.24, 0.02, 12), M('#ffffff'), { pos: [0, 0.38, 0.1], rot: [Math.PI / 2, 0, 0], shadow: false }));
  grp.add(mesh(box(0.03, 0.17, 0.01, 0), M('#2b2233'), { pos: [0, 0.44, 0.115], shadow: false }));
  grp.add(mesh(box(0.13, 0.03, 0.01, 0), M('#2b2233'), { pos: [0.05, 0.38, 0.115], shadow: false }));
  const bells = g();
  bells.userData.keep = true;
  bells.position.set(0, 0.68, 0);
  for (const x of [-0.17, 0.17]) bells.add(mesh(sphere(0.12, 8, 5), M('#ffd23f'), { pos: [x, 0, 0], scale: [1, 0.8, 1] }));
  grp.add(bells);
  for (const x of [-0.18, 0.18]) grp.add(mesh(cyl(0.03, 0.03, 0.14, 5), M('#3a3d4f'), { pos: [x, 0.06, 0], rot: [0, 0, x * 2] }));
  const sp = new AlarmSpecial();
  sp.bells = bells;
  return b.prop({
    kind: 'alarm', name: '자명종', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.1, r: 0.3, at: [0, 0.38, 0], rot: [Math.PI / 2, 0, 0], massShare: 0.85 }, { shape: 'box', hx: 0.22, hy: 0.05, hz: 0.08, at: [0, 0.06, 0], massShare: 0.15 }],
    mass: 0.6, mat: 'metal', value: 10000, special: sp, target: o.target,
  });
}

/* ------------------------------ kitchen ------------------------------ */

export function egg(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(sphere(0.14, 8, 6), M('#fff6e6'), { pos: [0, 0.16, 0], scale: [0.85, 1.15, 0.85] }));
  return b.prop({
    kind: 'egg', name: o.name ?? '달걀', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'ball', r: 0.135, at: [0, 0.14, 0] }],
    noTopple: true, mass: 0.12, mat: 'egg', value: o.value ?? 3000, target: o.target, angDamp: 3, linDamp: 0.3, friction: 0.8,
    breakable: { threshold: 3.2, mode: 'shatter', fx: 'yolk', debris: { count: 4, colors: ['#fff6e6'], size: 0.1, flat: true } },
  });
}

export function eggCarton(b: Builder, o: O & { eggs?: number; targetEggs?: boolean }): Prop[] {
  const grp = g();
  grp.add(mesh(box(1.1, 0.18, 0.62, 0.04), M('#d7c4a0'), { pos: [0, 0.09, 0] }));
  const carton = b.prop({
    kind: 'carton', name: '달걀판', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'box', hx: 0.55, hy: 0.04, hz: 0.31, at: [0, 0.04, 0], massShare: 0.6 },
      { shape: 'box', hx: 0.55, hy: 0.09, hz: 0.03, at: [0, 0.09, 0.29], massShare: 0.1 },
      { shape: 'box', hx: 0.55, hy: 0.09, hz: 0.03, at: [0, 0.09, -0.29], massShare: 0.1 },
      { shape: 'box', hx: 0.03, hy: 0.09, hz: 0.31, at: [0.53, 0.09, 0], massShare: 0.1 },
      { shape: 'box', hx: 0.03, hy: 0.09, hz: 0.31, at: [-0.53, 0.09, 0], massShare: 0.1 },
    ],
    mass: 1.0, mat: 'paper', value: 1000, friction: 0.4,
  });
  const out = [carton];
  const n = o.eggs ?? 6;
  const rot = o.rot ?? 0;
  for (let i = 0; i < n; i++) {
    const lx = -0.33 + (i % 3) * 0.33, lz = i < 3 ? -0.14 : 0.14;
    const x = o.at[0] + Math.cos(rot) * lx + Math.sin(rot) * lz;
    const z = o.at[2] - Math.sin(rot) * lx + Math.cos(rot) * lz;
    out.push(egg(b, { at: [x, o.at[1] + 0.08, z], target: o.targetEggs }));
  }
  return out;
}

export function flourBag(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.62, 0.85, 0.4, 0.1), M('#f6efe2'), { pos: [0, 0.425, 0] }));
  grp.add(mesh(box(0.5, 0.18, 0.41, 0.03), M('#e05a5a'), { pos: [0, 0.5, 0], shadow: false }));
  grp.add(mesh(box(0.55, 0.12, 0.3, 0.05), M('#efe5d0'), { pos: [0, 0.9, 0] }));
  return b.prop({
    kind: 'flour', name: '밀가루', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.31, hy: 0.45, hz: 0.2, at: [0, 0.45, 0], round: 0.06 }],
    mass: 1.2, mat: 'paper', value: o.value ?? 8000, target: o.target,
    breakable: { threshold: 6.5, mode: 'shatter', fx: 'flour', word: '푸확!', debris: { count: 5, colors: ['#f6efe2', '#e05a5a'], size: 0.2, flat: true } },
  });
}

export function pot(b: Builder, o: O): Prop {
  const c = o.color ?? '#ff8c42';
  const grp = g();
  grp.add(mesh(cyl(0.48, 0.44, 0.6, 12), M(c), { pos: [0, 0.3, 0] }));
  grp.add(mesh(cyl(0.5, 0.5, 0.06, 12), M('#3a3d4f'), { pos: [0, 0.63, 0] }));
  grp.add(mesh(sphere(0.07, 6, 4), M('#3a3d4f'), { pos: [0, 0.7, 0] }));
  for (const x of [-0.55, 0.55]) grp.add(mesh(box(0.14, 0.06, 0.18, 0.02), M('#3a3d4f'), { pos: [x, 0.5, 0] }));
  return b.prop({
    kind: 'pot', name: '냄비', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.33, r: 0.5, at: [0, 0.33, 0] }],
    mass: 2.6, mat: 'metal', value: 5000,
  });
}

export function rollingPin(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.16, 0.16, 1.2, 10), M('#e8c08a'), { pos: [0, 0.16, 0], rot: [0, 0, Math.PI / 2] }));
  for (const x of [-0.75, 0.75]) grp.add(mesh(cyl(0.06, 0.06, 0.32, 6), M('#c9965a'), { pos: [x, 0.16, 0], rot: [0, 0, Math.PI / 2] }));
  return b.prop({
    kind: 'pin', name: '밀대', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.6, r: 0.16, at: [0, 0.16, 0], rot: [0, 0, Math.PI / 2], massShare: 0.9 }, { shape: 'cyl', hh: 0.9, r: 0.06, at: [0, 0.16, 0], rot: [0, 0, Math.PI / 2], massShare: 0.1 }],
    noTopple: true, mass: 1.0, mat: 'wood', value: 2000, angDamp: 0.05, friction: 0.8,
  });
}

export function fruit(b: Builder, o: O & { kind?: 'apple' | 'orange' }): Prop {
  const apple = (o.kind ?? 'apple') === 'apple';
  const grp = g();
  grp.add(mesh(ball(0.2, 1), M(apple ? '#e8434b' : '#ff9a2e'), { pos: [0, 0.2, 0] }));
  grp.add(mesh(cyl(0.015, 0.015, 0.1, 4), M('#6b3f22'), { pos: [0, 0.42, 0] }));
  if (apple) grp.add(mesh(box(0.1, 0.02, 0.05, 0), M('#5bb98c'), { pos: [0.05, 0.43, 0], rot: [0, 0, 0.4] }));
  return b.prop({
    kind: 'fruit', name: apple ? '사과' : '오렌지', group: grp, pos: o.at,
    colliders: [{ shape: 'ball', r: 0.2, at: [0, 0.2, 0] }],
    noTopple: true, mass: 0.3, mat: 'food', value: 1000, restitution: 0.35, angDamp: 0.4,
  });
}

export function cake(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.5, 0.5, 0.4, 14), M('#fff4f8'), { pos: [0, 0.2, 0] }));
  grp.add(mesh(cyl(0.505, 0.505, 0.1, 14), M('#ff9fc0'), { pos: [0, 0.22, 0] }));
  grp.add(mesh(cyl(0.34, 0.34, 0.3, 12), M('#fff4f8'), { pos: [0, 0.55, 0] }));
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    grp.add(mesh(ball(0.07, 0), M('#e8434b'), { pos: [Math.cos(a) * 0.38, 0.43, Math.sin(a) * 0.38] }));
  }
  grp.add(mesh(cyl(0.03, 0.03, 0.25, 5), M('#7fd4ff'), { pos: [0, 0.82, 0] }));
  grp.add(mesh(cone(0.04, 0.09, 5), M('#ffd23f'), { pos: [0, 1.0, 0] }));
  return b.prop({
    kind: 'cake', name: o.name ?? '케이크', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'cyl', hh: 0.2, r: 0.5, at: [0, 0.2, 0], massShare: 0.7 }, { shape: 'cyl', hh: 0.15, r: 0.34, at: [0, 0.55, 0], massShare: 0.3 }],
    mass: 1.5, mat: 'food', value: o.value ?? 45000, target: o.target,
    breakable: { threshold: 5.5, mode: 'shatter', fx: 'cream', word: '철퍽!', debris: { count: 8, colors: ['#fff4f8', '#ff9fc0', '#e8434b'], size: 0.2 } },
  });
}

export function toaster(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.9, 0.62, 0.55, 0.14), M(o.color ?? '#9fd8cb'), { pos: [0, 0.31, 0] }));
  for (const z of [-0.12, 0.12]) grp.add(mesh(box(0.62, 0.02, 0.1, 0), M('#2b2233'), { pos: [0, 0.625, z], shadow: false }));
  grp.add(mesh(box(0.08, 0.06, 0.12, 0.02), M('#3a3d4f'), { pos: [0.47, 0.42, 0] }));
  const sp = new ToasterSpecial((game, p) => {
    const t = p.body.translation();
    const r = p.body.rotation();
    const q = new THREE.Quaternion(r.x, r.y, r.z, r.w);
    for (const z of [-0.12, 0.12]) {
      const off = new THREE.Vector3(0, 0.72, z).applyQuaternion(q);
      const tp = toast(game.builder!, { at: [t.x + off.x, t.y + off.y, t.z + off.z], rot: new THREE.Euler().setFromQuaternion(q).y });
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
      tp.body.setLinvel({ x: up.x * 11 + srand(-0.6, 0.6), y: up.y * 11, z: up.z * 11 + srand(-0.6, 0.6) }, true);
      tp.body.setAngvel({ x: srand(-6, 6), y: srand(-2, 2), z: srand(-6, 6) }, true);
      tp.graceUntil = game.time + 0.2;
      tp.prevV.set(up.x * 11, up.y * 11, up.z * 11);
    }
  });
  return b.prop({
    kind: 'toaster', name: '토스터', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.45, hy: 0.31, hz: 0.275, at: [0, 0.31, 0], round: 0.08 }],
    mass: 2.2, mat: 'metal', value: 30000, special: sp, friction: 0.22,
  });
}

export function toast(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(box(0.5, 0.52, 0.09, 0.05), M('#e8b56a'), { pos: [0, 0.26, 0] }));
  grp.add(mesh(box(0.42, 0.44, 0.095, 0.04), M('#fbe3b0'), { pos: [0, 0.25, 0], shadow: false }));
  return b.prop({
    kind: 'toast', name: '토스트', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.25, hy: 0.26, hz: 0.045, at: [0, 0.26, 0] }],
    mass: 0.15, mat: 'soft', value: 1500, interactable: false,
  });
}

export function tablecloth(b: Builder, o: O & { w: number; d: number; tableTop: number; floorY: number }): Prop {
  const c = o.color ?? '#ff8fa3';
  const grp = g();
  const tex = M(c);
  grp.add(mesh(box(o.w, 0.05, o.d, 0.01), tex, { pos: [0, 0.025, 0] }));
  const drop = 0.75;
  grp.add(mesh(box(o.w, drop, 0.04, 0), tex, { pos: [0, -drop / 2 + 0.03, o.d / 2] }));
  grp.add(mesh(box(o.w, drop, 0.04, 0), tex, { pos: [0, -drop / 2 + 0.03, -o.d / 2] }));
  grp.add(mesh(box(0.04, drop, o.d, 0), tex, { pos: [o.w / 2, -drop / 2 + 0.03, 0] }));
  grp.add(mesh(box(0.04, drop, o.d, 0), tex, { pos: [-o.w / 2, -drop / 2 + 0.03, 0] }));
  for (let i = -2; i <= 2; i++) grp.add(mesh(box(0.1, 0.052, o.d - 0.1, 0), M('#ffffff'), { pos: [i * (o.w / 5), 0.026, 0], shadow: false }));
  return b.prop({
    kind: 'cloth', name: '식탁보', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: o.w / 2, hy: 0.025, hz: o.d / 2, at: [0, 0.025, 0] }],
    mass: 0.5, mat: 'soft', value: 0, kinematic: true, friction: 0.9, radius: Math.min(o.w, o.d) * 0.5,
    special: new ClothSpecial(Math.max(o.w, o.d)),
  });
}

/* ------------------------------ furniture & decor (dynamic) ------------------------------ */

export function bookshelf(b: Builder, o: O & { h?: number; w?: number; d?: number; shelves?: number; mass?: number }): { prop: Prop; shelfY: number[]; depth: number } {
  const w = o.w ?? 2.2, h = o.h ?? 5.6, d = o.d ?? 0.9;
  const wood = M(o.color ?? '#b9825a'), dark = M('#8e5f3e');
  const grp = g();
  grp.add(mesh(box(w, h, 0.08, 0.02), dark, { pos: [0, h / 2, -d / 2 + 0.04] }));
  for (const x of [-w / 2 + 0.07, w / 2 - 0.07]) grp.add(mesh(box(0.14, h, d, 0.03), wood, { pos: [x, h / 2, 0] }));
  const n = o.shelves ?? 4;
  const shelfY: number[] = [];
  const cols: ColDef[] = [
    { shape: 'box', hx: w / 2, hy: h / 2, hz: 0.04, at: [0, h / 2, -d / 2 + 0.04], massShare: 0.2 },
    { shape: 'box', hx: 0.07, hy: h / 2, hz: d / 2, at: [-w / 2 + 0.07, h / 2, 0], massShare: 0.2 },
    { shape: 'box', hx: 0.07, hy: h / 2, hz: d / 2, at: [w / 2 - 0.07, h / 2, 0], massShare: 0.2 },
  ];
  for (let i = 0; i <= n; i++) {
    const y = 0.1 + (i * (h - 0.2)) / n;
    grp.add(mesh(box(w, 0.12, d, 0.02), wood, { pos: [0, y, 0] }));
    cols.push({ shape: 'box', hx: w / 2, hy: 0.06, hz: d / 2, at: [0, y, 0], massShare: 0.4 / (n + 1) });
    shelfY.push(y + 0.06);
  }
  const prop = b.prop({
    kind: 'bookshelf', name: '책장', group: grp, pos: o.at, rotY: o.rot, colliders: cols,
    mass: o.mass ?? 14, mat: 'wood', value: o.value ?? 150000, toppleValue: 120000, target: o.target, friction: 0.6,
  });
  return { prop, shelfY: shelfY.map((y) => y + o.at[1]), depth: d };
}

export function sideTable(b: Builder, o: O & { h?: number; r?: number }): { prop: Prop; top: number } {
  const h = o.h ?? 1.6, r = o.r ?? 0.7;
  const grp = g();
  const c = M(o.color ?? '#f2b134');
  grp.add(mesh(cyl(r, r, 0.12, 12), c, { pos: [0, h - 0.06, 0] }));
  grp.add(mesh(cyl(0.08, 0.08, h - 0.12, 6), M('#3a3d4f'), { pos: [0, (h - 0.12) / 2, 0] }));
  grp.add(mesh(cyl(0.4, 0.45, 0.08, 10), M('#3a3d4f'), { pos: [0, 0.04, 0] }));
  const prop = b.prop({
    kind: 'sidetable', name: '협탁', group: grp, pos: o.at, rotY: o.rot,
    colliders: [
      { shape: 'cyl', hh: 0.06, r, at: [0, h - 0.06, 0], massShare: 0.35 },
      { shape: 'cyl', hh: (h - 0.12) / 2, r: 0.09, at: [0, (h - 0.12) / 2, 0], massShare: 0.15 },
      { shape: 'cyl', hh: 0.04, r: 0.44, at: [0, 0.04, 0], massShare: 0.5 },
    ],
    mass: 2.6, mat: 'wood', value: 30000, toppleValue: 8000,
  });
  return { prop, top: o.at[1] + h };
}

export function chair(b: Builder, o: O & { wheels?: boolean }): { prop: Prop; seat: number } {
  const c = M(o.color ?? '#5ec4c9');
  const grp = g();
  const seat = 1.25;
  grp.add(mesh(box(1.0, 0.18, 1.0, 0.08), c, { pos: [0, seat - 0.09, 0] }));
  grp.add(mesh(box(1.0, 1.1, 0.16, 0.08), c, { pos: [0, seat + 0.55, -0.42] }));
  if (o.wheels) {
    grp.add(mesh(cyl(0.07, 0.07, seat - 0.3, 6), M('#3a3d4f'), { pos: [0, (seat - 0.3) / 2 + 0.15, 0] }));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      grp.add(mesh(box(0.5, 0.06, 0.08, 0.02), M('#3a3d4f'), { pos: [Math.cos(a) * 0.25, 0.12, Math.sin(a) * 0.25], rot: [0, -a, 0] }));
      grp.add(mesh(sphere(0.07, 5, 4), M('#2b2233'), { pos: [Math.cos(a) * 0.48, 0.07, Math.sin(a) * 0.48] }));
    }
  } else {
    for (const [x, z] of [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]]) grp.add(mesh(box(0.1, seat - 0.18, 0.1, 0.02), M('#8e5f3e'), { pos: [x, (seat - 0.18) / 2, z] }));
  }
  const cols: ColDef[] = [
    { shape: 'box', hx: 0.5, hy: 0.09, hz: 0.5, at: [0, seat - 0.09, 0], massShare: 0.4 },
    { shape: 'box', hx: 0.5, hy: 0.55, hz: 0.08, at: [0, seat + 0.55, -0.42], massShare: 0.25 },
  ];
  if (o.wheels) cols.push({ shape: 'cyl', hh: 0.07, r: 0.5, at: [0, 0.07, 0], massShare: 0.35, friction: 0.05 }, { shape: 'cyl', hh: (seat - 0.3) / 2, r: 0.08, at: [0, (seat - 0.3) / 2 + 0.15, 0], massShare: 0.0001 });
  else for (const [x, z] of [[0.42, 0.42], [-0.42, 0.42], [0.42, -0.42], [-0.42, -0.42]]) cols.push({ shape: 'box', hx: 0.05, hy: (seat - 0.18) / 2, hz: 0.05, at: [x, (seat - 0.18) / 2, z], massShare: 0.35 / 4 });
  const prop = b.prop({
    kind: 'chair', name: o.wheels ? '사무용 의자' : '의자', group: grp, pos: o.at, rotY: o.rot, colliders: cols,
    mass: 3, mat: 'wood', value: 20000, toppleValue: 6000, friction: o.wheels ? 0.08 : 0.5, angDamp: o.wheels ? 1.5 : 0.25,
  });
  return { prop, seat: o.at[1] + seat };
}

export function pictureFrame(b: Builder, o: O & { w?: number; h?: number; art?: number; facing?: 'z' | 'x' }): Prop {
  const w = o.w ?? 1.2, h = o.h ?? 0.9;
  const grp = g();
  grp.add(mesh(box(w, h, 0.08, 0.02), M(o.color ?? '#f2b134'), { pos: [0, h / 2, 0] }));
  const arts = [['#7fd3ff', '#5bb98c', '#ffd23f'], ['#ffcfdf', '#ff7aa8', '#9b6fcf'], ['#ffe3b0', '#ef8a5b', '#4f86c6']];
  const a = arts[(o.art ?? 0) % arts.length];
  grp.add(mesh(box(w - 0.18, h - 0.18, 0.02, 0), B(a[0]), { pos: [0, h / 2, 0.045], shadow: false }));
  grp.add(mesh(cone((w - 0.3) * 0.32, (h - 0.3) * 0.6, 3), B(a[1]), { pos: [-w * 0.12, h * 0.38, 0.05], rot: [0, 0, 0], scale: [1, 1, 0.05], shadow: false }));
  grp.add(mesh(sphere(0.09, 6, 4), B(a[2]), { pos: [w * 0.22, h * 0.68, 0.055], scale: [1, 1, 0.2], shadow: false }));
  return b.prop({
    kind: 'frame', name: o.name ?? '액자', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: h / 2, hz: 0.04, at: [0, h / 2, 0] }],
    mass: 0.8, mat: 'glass', value: o.value ?? 60000, target: o.target, pinned: o.pinned ?? 90,
    breakable: { threshold: 5, mode: 'damage', fx: 'glass', word: '쨍!', debris: { count: 5, colors: ['#e8fbff'], size: 0.13, flat: true } },
  });
}

export function wallShelf(b: Builder, o: O & { w?: number; d?: number }): { prop: Prop; top: number } {
  const w = o.w ?? 2.4, d = o.d ?? 0.7;
  const grp = g();
  grp.add(mesh(box(w, 0.12, d, 0.03), M(o.color ?? '#e0a46d'), { pos: [0, 0.06, 0] }));
  for (const x of [-w / 2 + 0.3, w / 2 - 0.3]) grp.add(mesh(box(0.08, 0.3, 0.4, 0.02), M('#3a3d4f'), { pos: [x, -0.12, -d / 2 + 0.2] }));
  const prop = b.prop({
    kind: 'shelf', name: '벽 선반', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: w / 2, hy: 0.06, hz: d / 2, at: [0, 0.06, 0] }],
    mass: 1.5, mat: 'wood', value: 15000, pinned: o.pinned ?? 260, interactable: false,
  });
  return { prop, top: o.at[1] + 0.12 };
}

export function trophy(b: Builder, o: O): Prop {
  const grp = g();
  const gold = M('#ffcf3f', { emissive: '#6b4a00', emissiveIntensity: 0.4 });
  grp.add(mesh(box(0.42, 0.14, 0.42, 0.03), M('#5b3b2b'), { pos: [0, 0.07, 0] }));
  grp.add(mesh(cyl(0.05, 0.1, 0.3, 6), gold, { pos: [0, 0.29, 0] }));
  grp.add(mesh(lathe([[0, 0], [0.08, 0], [0.24, 0.12], [0.27, 0.36], [0.24, 0.38], [0, 0.2]], 8), gold, { pos: [0, 0.42, 0] }));
  for (const x of [-0.27, 0.27]) grp.add(mesh(torus(0.09, 0.025, 4, 8), gold, { pos: [x, 0.62, 0], rot: [0, 0, 0] }));
  return b.prop({
    kind: 'trophy', name: o.name ?? '트로피', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.21, hy: 0.07, hz: 0.21, at: [0, 0.07, 0], massShare: 0.5 }, { shape: 'cyl', hh: 0.26, r: 0.24, at: [0, 0.55, 0], massShare: 0.5 }],
    mass: 1.4, mat: 'metal', value: o.value ?? 70000, target: o.target,
    breakable: { threshold: 9, mode: 'damage', word: '찌그럭!', fx: 'glass' },
  });
}

export function globe(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(ball(0.36, 1), M('#5ab8f0'), { pos: [0, 0.36, 0] }));
  for (let i = 0; i < 4; i++) grp.add(mesh(ball(0.14, 0), M('#7bd389'), { pos: [Math.cos(i * 1.7) * 0.3, 0.36 + Math.sin(i * 2.3) * 0.15, Math.sin(i * 1.7) * 0.3], scale: [1, 0.7, 1], shadow: false }));
  return b.prop({
    kind: 'globe', name: '지구본', group: grp, pos: o.at,
    colliders: [{ shape: 'ball', r: 0.36, at: [0, 0.36, 0] }],
    noTopple: true, mass: 0.7, mat: 'plastic', value: 25000, restitution: 0.35, angDamp: 0.1,
  });
}

export function penCup(b: Builder, o: O): Prop {
  const grp = g();
  grp.add(mesh(cyl(0.16, 0.14, 0.38, 8), M(o.color ?? '#9b6fcf'), { pos: [0, 0.19, 0] }));
  const pc = ['#ff6b6b', '#4f86c6', '#ffd23f', '#5bb98c'];
  for (let i = 0; i < 4; i++) grp.add(mesh(cyl(0.025, 0.025, 0.5, 5), M(pc[i]), { pos: [Math.cos(i * 1.6) * 0.07, 0.42, Math.sin(i * 1.6) * 0.07], rot: [Math.sin(i) * 0.2, 0, Math.cos(i) * 0.2] }));
  return b.prop({
    kind: 'pencup', name: '연필꽂이', group: grp, pos: o.at,
    colliders: [{ shape: 'cyl', hh: 0.19, r: 0.16, at: [0, 0.19, 0] }],
    mass: 0.3, mat: 'plastic', value: 3000,
  });
}

export function paperStack(b: Builder, o: O): Prop {
  const grp = g();
  for (let i = 0; i < 5; i++) grp.add(mesh(box(0.7, 0.04, 0.5, 0), M(i % 2 ? '#ffffff' : '#f4f1ea'), { pos: [Math.sin(i * 7.1) * 0.03, 0.02 + i * 0.04, Math.cos(i * 3.3) * 0.03], rot: [0, Math.sin(i * 5.7) * 0.1, 0] }));
  let flown = false;
  return b.prop({
    kind: 'papers', name: '서류', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: 0.35, hy: 0.1, hz: 0.25, at: [0, 0.1, 0] }],
    mass: 0.4, mat: 'paper', value: 5000, target: o.target,
    special: {
      busy: () => false,
      onImpact: (game, p, impact) => {
        if (flown || impact < 4) return;
        flown = true;
        game.fx('paper', p.center(new THREE.Vector3()), 1);
        game.addScore(4000, p.center(new THREE.Vector3()));
      },
    },
  });
}

export function seesaw(b: Builder, o: O & { len?: number; ry?: number }): Prop {
  const len = o.len ?? 2.6;
  const grp = g();
  grp.add(mesh(box(len, 0.08, 0.36, 0.02), M(o.color ?? '#e8c08a'), { pos: [0, 0.04, 0] }));
  grp.add(mesh(sphere(0.2, 8, 5), M('#d7a86a'), { pos: [len / 2 - 0.2, 0.08, 0], scale: [1, 0.35, 1] }));
  return b.prop({
    kind: 'spoon', name: o.name ?? '나무 주걱', group: grp, pos: o.at, rotY: o.rot,
    colliders: [{ shape: 'box', hx: len / 2, hy: 0.04, hz: 0.18, at: [0, 0.04, 0] }],
    mass: 0.4, mat: 'wood', value: 1000, friction: 0.9,
  });
}
