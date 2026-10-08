import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import type { Game } from '../game/Game';
import { M, box, cyl, mesh, plane } from '../render/kit';
import { buildHouse, table } from './house';
import { rect, waterZone } from './rooms';
import { jolt } from '../game/specials3';
import { buildLot, building, slab, streetLamp } from './outdoor';

/* ================================================================== */
/* Chapter 10 — 멀리 떠나자. Everything moves together: a train that    */
/* can stop dead, a port where cranes drop boxes the size of houses.    */
/* ================================================================== */

/** windows of a moving train: one shared scrolling landscape; stops when the train does */
function trainWindows(b: Builder, x0: number, x1: number, z: number, y: number, state: { speed: number }) {
  if (typeof document === 'undefined') return;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe9d6');
  c.fillStyle = sky; c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#9fd8a8';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(i * 96 + 30, 118, 70, 46, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#7fc48a';
  for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(i * 60 + 10, 128, 36, 30, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#5b5f73';
  for (let i = 0; i < 8; i++) c.fillRect(i * 64 + 20, 70, 3, 60);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const g = new THREE.Group();
  g.userData.keep = true;
  for (let x = x0; x <= x1; x += 4) {
    g.add(mesh(plane(2.6, 1.6), mat, { pos: [x, y, z + 0.06], shadow: false }));
    g.add(mesh(box(2.9, 0.15, 0.1, 0.02), M('#c9a27a'), { pos: [x, y - 0.88, z + 0.08] }));
    g.add(mesh(box(2.9, 0.15, 0.1, 0.02), M('#c9a27a'), { pos: [x, y + 0.88, z + 0.08] }));
  }
  b.deco(g);
  b.game.addUpdater((dt) => { tex.offset.x += state.speed * dt * 0.08; });
}

/* ================================================================== */
/* 10-1  기차 식당칸 — the emergency brake                              */
/* ================================================================== */

const STEWARD = { shirt: '#ffffff', pants: '#2f3142', hair: '#2a1c14', hat: 'cap' as const, hatColor: '#c2264b', tool: 'tray' as const };

const S10_1: LevelDef = {
  id: '10-1', chapter: 10, theme: 'travel', title: '기차 식당칸', subtitle: '칼각으로 세팅된 크리스털',
  paws: 3,
  goal: { kind: 'break', count: 8, text: '샴페인 타워를 무너뜨려라 (잔 8개)', short: '샴페인 타워' },
  stars: [5200000, 6600000],
  challenges: [
    { type: 'count', kind: 'ptable', n: 1, event: 'topple', text: '서빙 카트로 샴페인 테이블 넘어뜨리기' },
    { type: 'count', kind: 'glass', n: 20, text: '잔 20개 이상 깨기' },
    { type: 'discover', id: 'perfect', text: '승무원 몰래 (완전 범죄)' },
  ],
  tip: '비상 브레이크를 당기면 기차가 급정거해요. 바퀴 달린 것, 미끄러운 것은 앞으로 쏟아져요.',
  hints: ['브레이크만 당기면 잔이 조금 쏟아질 뿐이에요. 샴페인 타워는 쟁반 테두리가 지켜 줘요.', '서빙 카트 바퀴 브레이크를 툭 풀어 두고 비상 브레이크!', '승무원이 옆 칸으로 건너간 사이에 당기면 아무도 못 봐요.'],
  hintMove: { prop: 'cart', dir: [1, 0] },
  start: [-4, 0],
  ownerLine: '아, 손님… 아니 고양이님…?!',
  reactor: '승무원',
  prelude: (k) => {
    const a = k.actor('승무원');
    k.cam([9.6, 2, 0], 0.5);
    a.walkTo(8.0, 0.4).turnTo(9.6, 0).do('work', 1.8).do('admire', 1.2).walkTo(-6, 0.3);
    k.at(0.6, () => k.glint('glass', '#ffe680'));
    k.at(2.4, () => k.say('승무원', '샴페인 타워, 완벽해요.', 1.8));
    k.at(4.8, () => k.say('승무원', '칼각 세팅 끝!', 1.4));
    return 7;
  },
  build(b) {
    const state = { speed: 1 };
    buildHouse(b, { rooms: [rect('car', '식당칸', 0, 0, 24, 6.4, 'darkwood', 'study')], base: '#5b3b2b', h: 5.6 });
    trainWindows(b, -9.5, 10, -3.2, 3.2, state);
    b.game.view.playWidth = 15;
    // tables along both sides, each laid with crystal
    for (const x of [-7.5, -2.5, 2.5]) for (const z of [-2.1, 2.1]) {
      const top = table(b, x, z, 2.4, 1.6, 1.5, '#fbf7ee', '#8e6a5a');
      for (const dx of [-0.7, 0, 0.7]) C.wineGlass(b, { at: [x + dx, top, z + (z < 0 ? 0.35 : -0.35)], wine: dx === 0 ? null : '#c2264b', value: 90000, name: '크리스털 잔' });
      C.plate(b, { at: [x - 0.4, top, z + (z < 0 ? -0.25 : 0.25)] });
      C.bottle(b, { at: [x + 0.6, top, z + (z < 0 ? -0.3 : 0.3)] });
    }
    // the champagne tower at the front, on a pedestal table with a tray rim
    const tt = C3.pedestalTable(b, { at: [9.3, 0, 0], r: 1.15, h: 1.4, name: '샴페인 테이블' });
    const lv: [number, number][] = [[-0.45, -0.45], [0, -0.45], [0.45, -0.45], [-0.45, 0], [0, 0], [0.45, 0], [-0.45, 0.45], [0, 0.45], [0.45, 0.45]];
    for (const [x, z] of lv) C.wineGlass(b, { at: [9.3 + x, tt, z], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) C.wineGlass(b, { at: [9.3 + x, tt + 0.62, z], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    C.wineGlass(b, { at: [9.3, tt + 1.24, 0], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    // the serving cart parked in its alcove, the brake on the wall
    C3.gardenCart(b, { at: [-9.4, 0, 0], name: '서빙 카트', color: '#e8c46a', braked: true });
    for (const dz of [-0.35, 0.35]) C.bottle(b, { at: [-9.6, 0.85, dz] });
    C.wineGlass(b, { at: [-9.1, 0.85, 0], wine: null, name: '크리스털 잔', value: 90000 });
    C3.lever(b, { at: [-11.2, 0, 2.6], label: '비상 브레이크', word: '끼이이익!!', action: (game: Game, self) => { state.speed = 0; jolt(game, new THREE.Vector3(1, 0, 0), 3.5, self); game.discover('trigger', self.center(new THREE.Vector3())); } });
    const ch = new THREE.Group();
    ch.add(mesh(cyl(0.05, 0.05, 1.2, 4), M('#e8c46a'), { pos: [0, 0.6, 0] }));
    b.actor('승무원', STEWARD, 6.5, 0, 0.3, -Math.PI / 2, [8, 0]);
    b.watcher('승무원', { range: 9, half: 0.55, cycle: [[1, 0]], patrol: [[-4.5, 0.3, 2.0], [11.6, 0.0, 6.0, 1], [4.0, 0.3, 1.6]] });
    b.cat(-10.4, 0, 0.8);
  },
};


/* ================================================================== */
/* 10-3  항구 컨테이너 — boxes the size of houses, into the sea         */
/* ================================================================== */

const S10_3: LevelDef = {
  id: '10-3', chapter: 10, theme: 'travel', title: '항구 컨테이너', subtitle: '부두 끝에 쌓인 컨테이너',
  paws: 3,
  goal: { kind: 'dunk', count: 2, text: '세워 둔 수출 컨테이너 2개를 바다에 빠뜨려라', short: '컨테이너 풍덩 ×2' },
  stars: [40000000, 45000000],
  pawValue: 8000000,
  challenges: [
    { type: 'cause', victim: 'container', culprit: 'container', text: '매달린 컨테이너로 세운 컨테이너 밀어 넣기' },
    { type: 'paws', max: 2, text: '크레인 두 대로만 클리어' },
    { type: 'discover', id: 'furniture', text: '세운 컨테이너를 앞발로 넘어뜨리기' },
  ],
  tip: '세워 둔 컨테이너는 도미노. 바다 쪽으로 넘어가게 하면 끝의 것은 풍덩!',
  hints: ['크레인 짐은 바다 쪽으로 움직일 때 놓아야 그 방향으로 쓰러뜨려요.', '가운데 줄은 크레인이 없어요. 맨 앞 컨테이너 꼭대기를 흔들릴 때 한 번 더!', '크레인은 둘, 빠르기가 달라요.'],
  hintMove: { prop: 'lever', near: [-12.5, 0, 4.6], dir: [1, 0] },
  start: [0, 0],
  ownerLine: '수출 물량이…!!',
  reactor: '부두 반장',
  prelude: (k) => {
    k.cam([0, 3, -1], 0.35);
    k.at(0.5, () => k.glint('container', '#ffe680'));
    k.at(1.0, () => k.say('부두 반장', '오늘 선적, 한 개도 빠짐없이!', 2));
    k.at(3.4, () => k.cam([0, 8, -1.6], 0.4));
    return 5.6;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -16, maxX: 16, minZ: -9, maxZ: 6 },
      patches: [
        { x0: -16, x1: 16, z0: -9, z1: -2.2, kind: 'gravel', y: -3.2 },
        { x0: -16, x1: 16, z0: -2.2, z1: 6, kind: 'concrete' },
      ],
      base: '#4f6f8f',
      height: 15,
      labels: [{ name: '부두', x: -12, z: 5.2 }, { name: '바다', x: 12, z: -7 }],
    });
    b.game.view.playWidth = 20;
    waterZone(b, -16, 16, -9, -2.2, -3.2, -0.7, '#4fa3d8');
    slab(b, { x: 0, z: -2.35, w: 32, d: 0.3, h: 0.25, color: '#ffd23f' });
    // three rows of containers stood on end, pointing at the sea
    const cols = ['#ff8f6b', '#4f86c6', '#5bb98c', '#ffd23f', '#c9a0dc', '#ff6b6b', '#7fd3ff', '#ff9f43', '#9fd8cb'];
    let k = 0;
    for (const x of [-7, 0, 7]) {
      C3.container(b, { at: [x, 0, -1.05], standing: true, color: cols[k++], target: true, name: '수출 컨테이너', value: 100000000 });
      // the rest of the shipment, lying in a stack further back
      C3.container(b, { at: [x, 0, 3.6], rot: Math.PI / 2, color: cols[k++], name: '대기 컨테이너', value: 40000000 });
      C3.container(b, { at: [x, 2.31, 3.6], rot: Math.PI / 2, color: cols[k++], name: '대기 컨테이너', value: 40000000 });
    }
    C3.container(b, { at: [-12.8, 0, 0.6], rot: Math.PI / 2, color: '#9aa3b8', name: '빈 컨테이너', value: 8000000 });
    // two gantry cranes running toward the sea over the outer rows
    C3.towerCrane(b, { mast: [-10.5, 5.2], x0: 5.5, x1: -1.0, z: -7, axis: 'z', swing: true, h: 13, speed: 1.6, hang: 2.6, lever: [-12.5, 0, 4.6], load: 'container', loadName: '매달린 컨테이너' });
    C3.towerCrane(b, { mast: [10.5, 5.2], x0: 5.5, x1: -1.0, z: 7, axis: 'z', swing: true, h: 13, speed: 2.3, hang: 2.6, lever: [12.5, 0, 4.6], load: 'container', loadName: '매달린 컨테이너' });
    // the ship waiting offshore
    const ship = new THREE.Group();
    ship.add(mesh(box(26, 3.2, 2.6, 0.3), M('#c2264b'), { pos: [0, -1.4, 0] }));
    ship.add(mesh(box(26.2, 0.4, 2.8, 0.1), M('#ffffff'), { pos: [0, 0.3, 0] }));
    ship.add(mesh(box(4, 3.4, 2.4, 0.2), M('#ffffff'), { pos: [10, 2.2, 0] }));
    ship.position.set(0, 0, -9.6);
    b.deco(ship);
    for (const x of [-12, 12]) streetLamp(b, x, 5.4);
    building(b, { x: 0, z: 6.6, w: 32, d: 1, h: 4, color: '#9fb8d8', solid: false });
    b.actor('부두 반장', { shirt: '#ff8f6b', pants: '#2f3142', hat: 'hardhat', hatColor: '#ffffff', tool: 'clipboard' }, 8.5, 0, 5.0, Math.PI, [3, 1.2]);
    b.cat(-6, 0, 5.2);
  },
};

export const CH10: LevelDef[] = [S10_1, S10_3];
