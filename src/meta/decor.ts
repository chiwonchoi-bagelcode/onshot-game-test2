import * as THREE from 'three';
import { M, box, cone, cyl, mesh, sphere, torus } from '../render/kit';
import type { Profile } from './profile';
import { BY_CHAPTER, CHAPTERS } from '../levels/index';

/* ------------------------------------------------------------------ */
/* Souvenirs (장소 기념품): two per place outside, bought with churu once */
/* something there has been cleared. They stand around the rug in the  */
/* cat room — a shelf of trophies from every place the cat has wrecked. */
/* ------------------------------------------------------------------ */

export interface DecorDef {
  id: string;
  name: string;
  icon: string;
  /** the place it comes from */
  chapter: number;
  cost: number;
  /** extra condition beyond "cleared something there" */
  needs?: (p: Profile) => boolean;
  needText?: string;
  build(): THREE.Object3D;
}

const g = () => new THREE.Group();

export const DECOR: DecorDef[] = [
  { id: 'goldChock', name: '황금 고임목', icon: '🔺', chapter: 7, cost: 120,
    build() { const o = g(); o.add(mesh(cone(0.3, 0.42, 4), M('#ffcf3f', { emissive: '#6b4a00', emissiveIntensity: 0.4 }), { pos: [0, 0.21, 0], rot: [0, Math.PI / 4, 0] })); o.add(mesh(cyl(0.32, 0.36, 0.08, 10), M('#5b3b2b'), { pos: [0, 0.04, 0] })); return o; } },
  { id: 'miniBonsai', name: '미니 분재', icon: '🌳', chapter: 7, cost: 150,
    build() { const o = g(); o.add(mesh(box(0.5, 0.14, 0.32, 0.03), M('#4f86c6'), { pos: [0, 0.07, 0] })); o.add(mesh(cyl(0.04, 0.06, 0.3, 6), M('#7a5a40'), { pos: [0, 0.29, 0], rot: [0, 0, 0.3] })); o.add(mesh(sphere(0.2, 7, 5), M('#5bb98c'), { pos: [-0.08, 0.48, 0], scale: [1.4, 0.6, 1] })); return o; } },
  { id: 'miniJar', name: '미니 달항아리', icon: '🏺', chapter: 8, cost: 160,
    build() { const o = g(); o.add(mesh(sphere(0.28, 12, 9), M('#fbf7ef'), { pos: [0, 0.3, 0], scale: [1, 0.95, 1] })); o.add(mesh(cyl(0.12, 0.14, 0.08, 10), M('#fbf7ef'), { pos: [0, 0.58, 0] })); return o; } },
  { id: 'canTower', name: '통조림 탑', icon: '🥫', chapter: 8, cost: 140,
    build() { const o = g(); const cols = ['#ff6b6b', '#ffd23f', '#5bb98c']; let k = 0; for (let r = 0; r < 3; r++) for (let i = 0; i < 3 - r; i++) o.add(mesh(cyl(0.08, 0.08, 0.16, 8), M(cols[k++ % 3]), { pos: [(i - (2 - r) / 2) * 0.17, 0.08 + r * 0.16, 0] })); return o; } },
  { id: 'coneTrophy', name: '라바콘 트로피', icon: '🚧', chapter: 9, cost: 130,
    build() { const o = g(); o.add(mesh(cone(0.18, 0.5, 8), M('#ff9f43'), { pos: [0, 0.31, 0] })); o.add(mesh(torus(0.13, 0.03, 4, 12), M('#ffffff'), { pos: [0, 0.25, 0], rot: [Math.PI / 2, 0, 0] })); o.add(mesh(box(0.4, 0.06, 0.4, 0.02), M('#2f3142'), { pos: [0, 0.03, 0] })); return o; } },
  { id: 'miniCrane', name: '미니 크레인', icon: '🏗️', chapter: 9, cost: 200,
    build() { const o = g(); o.add(mesh(box(0.08, 0.9, 0.08, 0.01), M('#ffd23f'), { pos: [0, 0.45, 0] })); o.add(mesh(box(0.7, 0.06, 0.06, 0.01), M('#ffd23f'), { pos: [0.2, 0.88, 0] })); o.add(mesh(box(0.12, 0.1, 0.12, 0.01), M('#5b5f73'), { pos: [0.45, 0.6, 0] })); o.add(mesh(box(0.3, 0.05, 0.3, 0.01), M('#5b5f73'), { pos: [0, 0.025, 0] })); return o; } },
  { id: 'toyWagon', name: '장난감 화차', icon: '🚃', chapter: 10, cost: 170,
    build() { const o = g(); o.add(mesh(box(0.6, 0.3, 0.3, 0.03), M('#a8714a'), { pos: [0, 0.25, 0] })); for (const x of [-0.18, 0.18]) for (const z of [-0.15, 0.15]) o.add(mesh(cyl(0.07, 0.07, 0.04, 8), M('#3a3a48'), { pos: [x, 0.07, z], rot: [Math.PI / 2, 0, 0] })); return o; } },
  { id: 'miniSuitcase', name: '미니 캐리어', icon: '🧳', chapter: 10, cost: 140,
    build() { const o = g(); o.add(mesh(box(0.34, 0.42, 0.18, 0.05), M('#4f86c6'), { pos: [0, 0.25, 0] })); o.add(mesh(box(0.14, 0.04, 0.04, 0.01), M('#2f3142'), { pos: [0, 0.48, 0] })); o.add(mesh(box(0.08, 0.06, 0.19, 0.01), M('#ffd23f'), { pos: [0.08, 0.32, 0] })); return o; } },
  { id: 'redButton', name: '빨간 버튼 모형', icon: '🔴', chapter: 11, cost: 220,
    build() { const o = g(); o.add(mesh(box(0.4, 0.2, 0.4, 0.04), M('#5b5f73'), { pos: [0, 0.1, 0] })); o.add(mesh(cyl(0.12, 0.14, 0.08, 12), M('#ff2a3c', { emissive: '#ff2a3c', emissiveIntensity: 0.4 }), { pos: [0, 0.24, 0] })); return o; } },
  { id: 'earthShard', name: '지구 조각', icon: '🌍', chapter: 11, cost: 300, needs: (p) => p.worldEnd, needText: '지구 최후의 날 이후',
    build() { const o = g(); o.add(mesh(new THREE.DodecahedronGeometry(0.26, 0), M('#7cc6ea'), { pos: [0, 0.42, 0], rot: [0.4, 0.6, 0.2] })); o.add(mesh(new THREE.DodecahedronGeometry(0.12, 0), M('#9fdc8c'), { pos: [0.12, 0.55, 0.12], rot: [0.2, 0.1, 0.5] })); o.add(mesh(cyl(0.06, 0.06, 0.18, 6), M('#ffd23f'), { pos: [0, 0.09, 0] })); o.add(mesh(cyl(0.22, 0.24, 0.05, 10), M('#3b2a4a'), { pos: [0, 0.02, 0] })); return o; } },
];

export const decorById = (id: string) => DECOR.find((d) => d.id === id);

/** a souvenir can be bought once something in its place has been cleared (and its own condition holds) */
export function decorOpen(p: Profile, d: DecorDef): boolean {
  const cleared = (BY_CHAPTER[d.chapter - 1] ?? []).some((l) => p.levels[l.id]?.cleared);
  return cleared && (!d.needs || d.needs(p));
}

export function decorLock(d: DecorDef): string {
  return d.needText ?? `${CHAPTERS[d.chapter - 1]?.name ?? d.chapter + '장'}에서 한 판 클리어`;
}

export function buyDecor(p: Profile, id: string): boolean {
  const d = decorById(id);
  if (!d || p.decor.includes(id) || !decorOpen(p, d) || p.churu < d.cost) return false;
  p.churu -= d.cost;
  p.decor.push(id);
  return true;
}
