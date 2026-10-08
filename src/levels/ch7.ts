import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { buildLot, fence, flowerBed, hedge, houseFront, roadLines, slab, streetLamp, tree } from './outdoor';

/* ================================================================== */
/* Chapter 7 — 우리 동네. The front door is open: the leverage lesson   */
/* ("pull the little thing and the big thing goes") with cars, gates,   */
/* hoses and hand trucks.                                               */
/* ================================================================== */

const OWNER = { shirt: '#ffd23f', pants: '#4f86c6', hair: '#5a3b2e', tool: 'rag' as const };

/** slope helper: height on a ramp running along x from (x0, y0) to (x1, y1) */
const rampY = (x: number, x0: number, y0: number, x1: number, y1: number) => y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);

/* ================================================================== */
/* 7-1  문이 열렸다 — the chock                                        */
/* ================================================================== */

const R71 = { x0: -7.5, x1: -1.5, y0: 1.8, y1: 0, z0: -3.5, z1: 1.5 };
const SLOPE71 = Math.atan2(R71.y0 - R71.y1, R71.x1 - R71.x0);

function lot71(b: Builder) {
  buildLot(b, {
    bounds: { minX: -15, maxX: 15, minZ: -8, maxZ: 7 },
    patches: [
      { x0: -15, x1: -7.5, z0: -4, z1: 2, kind: 'concrete', y: 1.8 },
      { x0: -15, x1: -7.5, z0: -8, z1: -4, kind: 'grass', y: 1.8 },
      { x0: -15, x1: -7.5, z0: 2, z1: 7, kind: 'grass', y: 1.8 },
      { x0: -7.5, x1: -1.5, z0: -8, z1: R71.z0, kind: 'grass' },
      { x0: -7.5, x1: -1.5, z0: R71.z1, z1: 7, kind: 'grass' },
      { x0: -1.5, x1: 4.5, z0: -8, z1: 7, kind: 'asphalt' },
      { x0: 4.5, x1: 15, z0: -8, z1: 7, kind: 'grass' },
      { x0: 5.2, x1: 13.5, z0: -3, z1: 1, kind: 'paving' },
    ],
    ramps: [{ x0: R71.x0, x1: R71.x1, z0: R71.z0, z1: R71.z1, kind: 'concrete', y0: R71.y0, y1: R71.y1, along: 'x' }],
    base: '#7d8f6a',
    height: 8,
    labels: [{ name: '우리 집', x: -11, z: 4 }, { name: '이웃집', x: 10, z: 4.5 }],
  });
  b.game.view.playWidth = 17;
  roadLines(b, { x0: -8, x1: 7, z: 1.5, along: 'z', color: '#ffe680' });
}

const S7_1: LevelDef = {
  id: '7-1', chapter: 7, theme: 'street', title: '문이 열렸다', subtitle: '집 앞, 반짝이는 집사의 새 차',
  paws: 3,
  goal: { kind: 'break', text: '집사의 새 차를 망가뜨려라', short: '새 차 망가뜨리기' },
  stars: [20000000, 60000000],
  challenges: [
    { type: 'count', kind: 'auto', n: 2, text: '이웃집 차까지 망가뜨리기' },
    { type: 'indirect' },
    { type: 'stat', key: 'gateRush', min: 1, text: '굴러가는 차 앞에서 대문 열기' },
  ],
  tip: '앞발로 차를 직접 치면 흠집뿐이에요. 앞발은 그대로 — 대신 어디를 칠지 골라요.',
  hints: ['바퀴 밑 주황색 고임목을 툭! 차가 경사로를 굴러 내려가요.', '이웃집 대문이 닫혀 있으면 차는 대문에서 멈춰요. 대문을 먼저 열면…?', '대문 열기 → 고임목 빼기. 순서가 전부예요!'],
  hintMove: { prop: 'chock', dir: [1, 0] },
  tutorial: [
    { text: '차는 너무 무거워요. 바퀴 밑 고임목을 툭!', prop: 'chock', dir: [1, 0] },
  ],
  start: [-4, -0.5],
  ownerLine: '내… 내 차아아아!!',
  reactor: '집사',
  prelude: (k) => {
    const a = k.actor('집사');
    k.cam('auto', 0.55);
    a.do('polish', 2.4).wait(0.1).turnTo(-3, 2).do('admire', 1.4);
    k.at(0.6, () => k.glint('auto', '#ffe680'));
    k.at(2.7, () => { k.say('집사', '흠집 하나 없지~♪', 2); k.glint('auto', '#ffe680'); });
    k.at(4.6, () => { k.say('집사', '왁스 가져와야지!', 1.6); k.leave('집사', -12.6, -1); });
    k.at(5.4, () => k.cam('chock', 0.72));
    return 7.2;
  },
  build(b) {
    lot71(b);
    // our house (garage faces the driveway)
    houseFront(b, { x: -13.2, z: -1.2, w: 7, d: 3.6, h: 5.5, y: 1.8, wall: '#fff1d6', roof: '#e58b7a', facing: 'x', garage: true });
    // the new car, parked on the driveway slope behind its chock
    const yC = rampY(-6.0, R71.x0, R71.y0, R71.x1, R71.y1);
    const mine = C3.car(b, { at: [-6.0, yC, -1], slope: SLOPE71, held: true, target: true, color: '#ff8fa3', name: '집사의 새 차', value: 38000000, worth: { owner: '집사', story: '3년 적금으로 뽑은 첫 새 차', showcase: true } });
    const cx = -6.0 + 2.05 * Math.cos(SLOPE71), cy = yC - 2.05 * Math.sin(SLOPE71);
    C3.chock(b, { at: [cx, cy, 0], slope: SLOPE71, car: mine });
    C3.bucket(b, { at: [-9.2, 1.8, 2.4] });
    C3.flowerPot(b, { at: [-8.2, 1.8, 3.6], rot: 0.3 });
    C3.flowerPot(b, { at: [-8.2, 1.8, 4.6], rot: 1.1 });
    C3.flowerPot(b, { at: [-8.2, 1.8, -4.8], rot: 2 });
    flowerBed(b, -12.5, 4.8, 4, 1.6, 1.8);
    tree(b, -13.5, -6, 0.9, 1.8);
    // street furniture
    C3.wheelieBin(b, { at: [-0.9, 0, 2.6], rot: 0.2 });
    C3.wheelieBin(b, { at: [-0.9, 0, 3.9], rot: -0.1, color: '#4f86c6' });
    C3.mailbox(b, { at: [-0.9, 0, -4.4], name: '우리 집 우편함' });
    streetLamp(b, -1.0, 6.2);
    streetLamp(b, 4.0, -7.2);
    // the neighbour's wall and gate (closed)
    slab(b, { x: 5, z: -5.5, w: 0.6, d: 5, h: 1.3, color: '#d9d1c4', top: '#c4b8a6' });
    slab(b, { x: 5, z: 4, w: 0.6, d: 6, h: 1.3, color: '#d9d1c4', top: '#c4b8a6' });
    C3.gatePair(b, { x: 5, z0: -3, z1: 1, name: '이웃집 대문' });
    C3.mailbox(b, { at: [5.6, 0, 2.2], rot: Math.PI, color: '#5ec4c9', name: '이웃집 우편함' });
    // the neighbour's garden: guards on the drive, a birdbath, pots, their car
    C3.gnome(b, { at: [7.7, 0, -1.9], rot: -1.6 });
    C3.gnome(b, { at: [7.7, 0, -0.1], rot: -1.5, color: '#5bb98c' });
    C3.gnome(b, { at: [8.6, 0, 2.2], rot: -2.2, color: '#ff9f43' });
    C3.gnome(b, { at: [8.2, 0, -4.0], rot: -0.9, color: '#9b6fcf' });
    C3.birdbath(b, { at: [9.4, 0, -1.0] });
    for (let i = 0; i < 4; i++) C3.flowerPot(b, { at: [6.0 + i * 1.1, 0, -6.6], rot: i });
    for (let i = 0; i < 3; i++) C3.flowerPot(b, { at: [10.6 + i * 1.0, 0, 2.2], rot: i * 2, big: i === 1 });
    C3.car(b, { at: [12.4, 0, -1.0], rot: Math.PI / 2, parked: true, color: '#7fb8ff', name: '이웃집 차', value: 26000000, worth: { owner: '이웃' } });
    houseFront(b, { x: 13.4, z: -5.6, w: 6, d: 4, h: 5, wall: '#e8f4ff', roof: '#7f9fd8', facing: 'z' });
    hedge(b, { x: 10, z: 6.2, w: 9, d: 1 });
    tree(b, 14, 4.5, 0.8);
    fence(b, { x0: 4.7, z0: -7.9, x1: 15, z1: -7.9, h: 1.1 });
    b.actor('집사', OWNER, -9.4, 1.8, 1.9, Math.PI / 2 + 0.6, [-3.5, -1]);
    b.cat(-9.6, 1.8, 4.0);
  },
};

export const CH7: LevelDef[] = [S7_1];
