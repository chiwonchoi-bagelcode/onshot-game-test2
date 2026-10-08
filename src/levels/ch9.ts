import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import * as THREE from 'three';
import { M, box, mesh } from '../render/kit';
import { building, buildLot, roadLines, slab, streetLamp, tree } from './outdoor';

/* ================================================================== */
/* Chapter 9 — 도시 블록. Timing: barriers that lift on a rhythm,       */
/* a crane trolley that never stops, a wrecking ball. Choose WHEN.      */
/* ================================================================== */

const rampY = (x: number, x0: number, y0: number, x1: number, y1: number) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);

/* ================================================================== */
/* 9-1  주차장의 슈퍼카 — the barrier's rhythm                          */
/* ================================================================== */

const R91 = { x0: -9, x1: 1, y0: 3, y1: 0, z0: -3.0, z1: 0.6 };
const SLOPE91 = Math.atan2(R91.y0 - R91.y1, R91.x1 - R91.x0);

const S9_1: LevelDef = {
  id: '9-1', chapter: 9, theme: 'city', title: '주차장의 슈퍼카', subtitle: '흠집 하나 없는 3억짜리',
  paws: 3,
  goal: { kind: 'break', text: '슈퍼카를 찌그러뜨려라', short: '슈퍼카 망가뜨리기' },
  stars: [370000000, 390000000],
  pawValue: 20000000,
  challenges: [
    { type: 'paws', max: 1, text: '차단기 타이밍 맞춰 앞발 한 번에' },
    { type: 'count', kind: 'auto', n: 3, text: '차 세 대 망가뜨리기' },
    { type: 'discover', id: 'carWreck', text: '슈퍼카 전손' },
  ],
  tip: '차단기는 일정한 박자로 오르내려요. 굴러가는 것이 도착할 때 올라가 있어야 지나가요.',
  hints: ['위층 차의 고임목을 빼면 램프를 굴러 내려가요. 차단기가 내려와 있으면 쾅!', '차단기가 막 내려간 순간에 고임목을 빼면 다음에 열릴 때 딱 도착해요.', '관리실 버튼을 누르면 차단기가 열린 채로 고정돼요 (앞발 하나 더).'],
  hintMove: { prop: 'chock', dir: [1, 0] },
  start: [0, -1],
  ownerLine: '내… 내 슈퍼카가!!!',
  reactor: '차주',
  prelude: (k) => {
    const a = k.actor('차주');
    k.cam('auto', 0.5);
    a.walkTo(9.2, 1.4).turnTo(10.4, -1.2).do('admire', 1.8).walkTo(14.2, 1.6).turnTo(10.4, -1.2);
    k.at(0.5, () => k.glint('auto', '#ffe680'));
    k.at(2.2, () => { k.say('차주', '흠집 하나 없지~ 3억짜리야.', 2); k.glint('auto', '#ffe680'); });
    k.at(5.2, () => k.cam([6.6, 1.4, -1.2], 0.55));
    return 6.8;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -16, maxX: 16, minZ: -7, maxZ: 6 },
      patches: [
        { x0: -16, x1: -9, z0: -7, z1: 6, kind: 'concrete', y: 3 },
        { x0: -9, x1: 1, z0: -7, z1: R91.z0, kind: 'concrete' },
        { x0: -9, x1: 1, z0: R91.z1, z1: 6, kind: 'concrete' },
        { x0: 1, x1: 16, z0: -7, z1: 6, kind: 'concrete' },
      ],
      ramps: [{ x0: R91.x0, x1: R91.x1, z0: R91.z0, z1: R91.z1, kind: 'asphalt', y0: R91.y0, y1: R91.y1, along: 'x' }],
      base: '#6f7a8f',
      height: 9,
      labels: [{ name: '위층', x: -13, z: 5 }, { name: 'VIP 주차', x: 11.5, z: -4.5 }],
    });
    b.game.view.playWidth = 17;
    roadLines(b, { x0: 1, x1: 15, z: -1.2, color: '#ffffff' });
    // ramp curbs keep things in the lane
    slab(b, { x: -4, z: R91.z0 - 0.15, w: 10, d: 0.3, h: 0.6, color: '#ffd23f' });
    slab(b, { x: -4, z: R91.z1 + 0.15, w: 10, d: 0.3, h: 0.6, color: '#ffd23f' });
    // pillars and a back wall
    for (const x of [-5, 5]) slab(b, { x, z: -6.2, w: 0.9, d: 0.9, h: 6, color: '#c9c3b8' });
    building(b, { x: 0, z: -7.6, w: 32, d: 1, h: 6.5, color: '#9aa3b8', solid: false });
    // the car up top, behind its chock
    const yC = rampY(-7.4, R91.x0, R91.y0, R91.x1, R91.y1);
    const top = C3.car(b, { at: [-7.4, yC, -1.2], slope: SLOPE91, held: true, color: '#9fd8cb', name: '위층 승용차', value: 24000000 });
    const cx = -7.4 + 2.05 * Math.cos(SLOPE91);
    C3.chock(b, { at: [cx, rampY(cx, R91.x0, R91.y0, R91.x1, R91.y1), -0.2], slope: SLOPE91, car: top });
    // shopping carts up top
    C3.shoppingCart(b, { at: [-10.0, 3, -1.2] });
    for (let i = 0; i < 3; i++) C3.shoppingCart(b, { at: [-13.5, 3, 1.6 + i * 1.3] });
    // the barrier at the bottom of the ramp, and its booth
    C3.parkingBarrier(b, { x: 6.6, z0: R91.z0, z1: R91.z1, period: 6, open: 2.6, offset: 1.0, button: [5.6, 0, -4.6] });
    // the supercar across the end of the lane, and its neighbour
    C3.car(b, { at: [10.4, 0, -1.2], rot: -Math.PI / 2, parked: true, sport: true, target: true, color: '#ff5a3c', name: '슈퍼카', value: 300000000, worth: { owner: '차주', story: '3억, 출고 3일째', showcase: true } });
    C3.car(b, { at: [13.5, 0, -1.2], rot: -Math.PI / 2, parked: true, color: '#c9d6ea', name: '옆 차', value: 31000000 });
    C3.cone3(b, { at: [8.6, 0, -4.4] });
    C3.cone3(b, { at: [14.2, 0, -4.4] });
    streetLamp(b, 14.8, 5.2);
    tree(b, -14.5, -5.5, 0.7, 3);
    b.actor('차주', { shirt: '#2f3142', pants: '#2f3142', hair: '#2a1c14', glasses: true, tool: 'keys' }, 8.4, 0, -4.0, 0, [10.4, 1.4]);
    b.cat(-12.4, 3, -2.6);
  },
};


/* ================================================================== */
/* 9-3  공사장 크레인 — when to let go                                   */
/* ================================================================== */

const S9_3: LevelDef = {
  id: '9-3', chapter: 9, theme: 'city', title: '공사장 크레인', subtitle: '점심시간, 아무도 없는 공사장',
  paws: 3,
  goal: { kind: 'floor', count: 2, text: '모델하우스를 무너뜨려라 (2층 바닥과 지붕)', short: '모델하우스 붕괴' },
  stars: [255000000, 275000000],
  pawValue: 15000000,
  challenges: [
    { type: 'cause', victim: 'slab', culprit: 'beams', text: '크레인 철골로 지붕 뚫기' },
    { type: 'paws', max: 1, text: '앞발 한 번으로 붕괴' },
    { type: 'count', kind: 'toilet', n: 1, event: 'topple', text: '간이 화장실 넘어뜨리기' },
  ],
  tip: '크레인의 짐은 계속 왔다 갔다 해요. 레버를 당기는 순간 그 자리에 떨어져요.',
  hints: ['쇠공 레버를 당기면 쇠공이 모델하우스 모서리를 때려요. 반쯤 무너질 거예요.', '크레인 짐이 모델하우스 바로 위에 올 때 레버를 당겨요.', '레버 한 번에 끝내면 남은 앞발이 큰 보너스!'],
  hintMove: { prop: 'lever', near: [-9.2, 0, 1.6], dir: [1, 0] },
  start: [2, 0],
  ownerLine: '점심 먹고 왔더니…!!',
  reactor: '반장',
  prelude: (k) => {
    const a = k.actor('반장');
    k.cam('slab', 0.4);
    a.walkTo(1.2, 2.2).turnTo(4.5, -1).do('point', 1.4).walkTo(-12.5, 4.5);
    k.at(0.4, () => k.glint('slab', '#ffe680'));
    k.at(1.6, () => k.say('반장', '모델하우스 오픈 내일이다!', 1.8));
    k.at(3.8, () => { k.say('반장', '점심 먹고 올게~', 1.4); k.cam('beams', 0.45); });
    return 6.2;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -14, maxX: 14, minZ: -7, maxZ: 6 },
      patches: [
        { x0: -14, x1: 14, z0: -7, z1: 4, kind: 'dirt' },
        { x0: -14, x1: 14, z0: 4, z1: 6, kind: 'sidewalk' },
      ],
      base: '#8e7a66',
      height: 12,
      labels: [{ name: '모델하우스', x: 4.5, z: 2.6 }, { name: '크레인', x: -11, z: 0.5 }],
    });
    b.game.view.playWidth = 18;
    // the model house (a real stack of floors)
    const h = C3.structure(b, { x: 4.5, z: -1.2, w: 5, d: 4, floors: 2, color: '#fff1d6', slabColor: '#f4e3c8', value: 360000000, name: '모델하우스' });
    for (const s of h.slabs) s.target = true;
    C3.vendingMachine(b, { at: [1.0, 0, -4.4], name: '분양 안내 키오스크', color: '#5bb98c', value: 2500000 });
    // the crane (its trolley never stops) and the wrecking ball
    C3.towerCrane(b, { mast: [-11, -4.6], x0: -6, x1: 9, z: -1.2, h: 11, speed: 1.6, hang: 2.6, lever: [-9.2, 0, 1.6] });
    C3.wreckingBall(b, { pivot: [9.0, 7.4, 1.0], len: 5.2, dir: [-1, 0], from: -0.85, lever: [9.6, 0, 4.8], base: [11.8, 0, 2.6] });
    // the rest of the site
    const tg = new THREE.Group();
    tg.add(mesh(box(1.2, 2.6, 1.2, 0.1), M('#4f86c6'), { pos: [0, 1.3, 0] }));
    tg.add(mesh(box(1.3, 0.15, 1.3, 0.04), M('#ffffff'), { pos: [0, 2.65, 0] }));
    C3.portableToilet(b, { at: [-2.6, 0, 2.4] });
    for (let i = 0; i < 4; i++) C3.cone3(b, { at: [-5 + i * 1.6, 0, 3.5] });
    for (let i = 0; i < 3; i++) C3.brick(b, { at: [-4.0, 0.22 * i, -4.8], rot: i * 0.3 });
    slab(b, { x: -6.5, z: -5.2, w: 4, d: 2, h: 1.2, color: '#c9c3b8', top: '#b3ada2' });
    building(b, { x: 0, z: -7.8, w: 28, d: 1.2, h: 3, color: '#9fd8cb', solid: false });
    streetLamp(b, 12.5, 5.2);
    tree(b, -13, 5, 0.6);
    b.actor('반장', { shirt: '#ff8f6b', pants: '#5b5f73', hat: 'hardhat', hatColor: '#ffd23f', tool: 'clipboard' }, 0.5, 0, 3.0, Math.PI, [3, 1.8]);
    b.cat(-1.2, 0, 4.6);
  },
};

export const CH9: LevelDef[] = [S9_1, S9_3];
