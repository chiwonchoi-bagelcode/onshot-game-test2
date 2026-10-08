import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { building, buildLot, deliveryTruck, fence, flowerBed, hedge, houseFront, roadLines, slab, steps, streetLamp, tree } from './outdoor';
import { waterZone } from './rooms';

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


/* ================================================================== */
/* 7-2  할머니의 정원 — the hose, and grandma's eyes                   */
/* ================================================================== */

const GRANDMA = { shirt: '#c9a0dc', pants: '#8e7cc3', hair: '#e8e8f0', old: true, apron: '#fff1c1', tool: 'waterCan' as const, scale: 0.92 };

const S7_2: LevelDef = {
  id: '7-2', chapter: 7, theme: 'street', title: '할머니의 정원', subtitle: '30년 가꾼 분재와 3대째 씨간장',
  paws: 3,
  goal: { kind: 'break', text: '할머니의 소나무 분재를 떨어뜨려라', short: '분재 떨어뜨리기' },
  stars: [10000000, 15000000],
  challenges: [
    { type: 'cause', victim: 'onggi', culprit: 'cart', text: '수레로 장독대 들이받기' },
    { type: 'discover', id: 'perfect', text: '할머니 몰래 (완전 범죄)' },
    { type: 'count', kind: 'onggi', n: 3, text: '장독 3개 이상 깨기' },
  ],
  tip: '분재는 앞발이 닿지 않는 높은 받침대 위에 있어요. 바닥의 주황 부채꼴은 할머니가 보는 곳 — 할머니가 고개를 돌릴 때를 노려요.',
  hints: ['호스를 툭 치면 앞발 방향으로 물줄기가 뿜어져요. 물줄기는 위로 휘어 높은 곳까지 닿아요.', '할머니가 다른 곳을 볼 때 분재가 떨어지면 아무도 못 봐요. 부채꼴을 잘 봐요!', '언덕 위 수레를 아래로 밀면 장독대로 돌진해요. 작은 장독은 옆으로 밀면 줄줄이.'],
  hintMove: { prop: 'hose', dir: [-0.33, -0.94] },
  start: [1, -0.5],
  ownerLine: '아이고, 내 분재야…!!',
  reactor: '할머니',
  prelude: (k) => {
    const a = k.actor('할머니');
    k.cam('bonsai', 0.5);
    a.walkTo(0.2, -2.0).turnTo(1.4, -2.9).do('water', 2.2).do('admire', 1.6).walkTo(-6.5, -3.2).turnTo(-6.5, 2);
    k.at(1.6, () => k.glint('bonsai', '#ff9fc0'));
    k.at(3.4, () => { k.say('할머니', '우리 영감이 심은 지 30년…', 2.2); k.glint('bonsai', '#ff9fc0'); });
    k.at(6.2, () => { k.cam([7, 1, -4], 0.4); k.glint('onggi', '#ff9fc0'); });
    k.at(6.4, () => k.say('할머니', '씨간장도 잘 익는구먼~', 1.8));
    return 9;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -11, maxX: 11, minZ: -7, maxZ: 6 },
      patches: [
        { x0: -11, x1: 11, z0: -7, z1: -4.5, kind: 'grass' },
        { x0: -9, x1: 3, z0: -4.5, z1: -1.8, kind: 'wood', y: 0.8 },
        { x0: -11, x1: -9, z0: -4.5, z1: -1.8, kind: 'grass' },
        { x0: 3, x1: 11, z0: -4.5, z1: -1.8, kind: 'grass' },
        { x0: -11, x1: 11, z0: -1.8, z1: -0.5, kind: 'grass' },
        { x0: -11, x1: 11, z0: -0.5, z1: 1.5, kind: 'paving' },
        { x0: -11, x1: -9.5, z0: 1.5, z1: 6, kind: 'grass' },
        { x0: -9.5, x1: -5, z0: 1.5, z1: 2, kind: 'grass' },
        { x0: -9.5, x1: -5, z0: 5.5, z1: 6, kind: 'grass' },
        { x0: -9.5, x1: -5, z0: 2, z1: 5.5, kind: 'gravel', y: -0.42 },
        { x0: -5, x1: 4, z0: 1.5, z1: 6, kind: 'grass' },
        { x0: 4, x1: 11, z0: 1.5, z1: 2, kind: 'grass' },
        { x0: 4, x1: 11, z0: 4.2, z1: 6, kind: 'grass', y: 1.2 },
      ],
      ramps: [{ x0: 4, x1: 11, z0: 2, z1: 4.2, kind: 'grass', y0: 0, y1: 1.2, along: 'z' }],
      base: '#7d8f6a',
      height: 8,
      labels: [{ name: '장독대', x: 7, z: -1.2 }, { name: '연못', x: -7.2, z: 5.8 }],
    });
    b.game.view.playWidth = 15;
    houseFront(b, { x: -3, z: -5.8, w: 12, d: 2.6, h: 5, wall: '#f4e3c8', roof: '#8e6a5a', door: '#a0714f' });
    // the bonsai on its stone pedestal (out of paw reach)
    slab(b, { x: 1.4, z: -2.9, w: 1.1, d: 1.1, h: 3.8, y: 0.8, color: '#c9c3b8', top: '#b3ada2' });
    C3.bonsai(b, { at: [1.4, 4.6, -2.9], rot: 0.3, target: true, name: '할머니의 소나무 분재', worth: { owner: '할머니', heart: 30 * 8760, story: '할아버지가 심고 30년을 가꾼 소나무' } });
    // jangdokdae: the soy sauce jars on their stone platform
    slab(b, { x: 7, z: -4, w: 5, d: 3, h: 0.12, color: '#d9d4cc', top: '#c9c3b8' });
    C3.onggi(b, { at: [7.25, 0.12, -3.35], size: 1.3, name: '씨간장 독', value: 400000, worth: { owner: '할머니', heart: 50 * 8760, story: '3대째 이어온 50년 씨간장' } });
    C3.onggi(b, { at: [5.6, 0.12, -4.7], size: 1.05, name: '된장 독' });
    C3.onggi(b, { at: [8.9, 0.12, -4.7], size: 1.05, name: '고추장 독' });
    C3.onggi(b, { at: [7.25, 0.12, -4.85], size: 0.8, name: '막장 독' });
    for (const [x, i] of [[5.1, 0], [6.0, 1], [8.5, 3], [9.4, 4]] as const) C3.onggi(b, { at: [x, 0.12, -3.2], size: 0.68, rot: i, name: '작은 장독' });
    // the hose in the middle of the garden
    C3.hoseReel(b, { at: [3, 0, 1.6], rot: 0.4 });
    // the cart on the mound, loaded with bricks
    C3.gardenCart(b, { at: [7.2, 1.2, 5.0], rot: Math.PI / 2 });
    for (const [dx, dz] of [[-0.25, -0.35], [0.25, -0.35], [-0.25, 0.35], [0.25, 0.35]] as const) C3.brick(b, { at: [7.2 + dx, 2.05, 5.0 + dz], rot: Math.PI / 2 });
    // pots along the path, pond, ornaments
    for (let i = 0; i < 6; i++) C3.flowerPot(b, { at: [-8.2 + i * 1.3, 0, -1.15], rot: i * 1.3, big: i === 2 });
    waterZone(b, -9.5, -5, 2, 5.5, -0.42, -0.08, '#7fc4e8');
    C3.stoneLantern(b, { at: [-4.3, 0, 4.4] });
    C3.gnome(b, { at: [-4.4, 0, 2.6], rot: 0.6, color: '#5bb98c' });
    C3.gnome(b, { at: [-2.4, 0, 5.0], rot: -0.4 });
    C3.birdbath(b, { at: [-1.0, 0, 3.2] });
    C3.wateringCan(b, { at: [-4.6, 0.8, -2.2], rot: 0.5 });
    tree(b, 9.6, -6.2, 0.8);
    tree(b, -10, -6, 0.75);
    hedge(b, { x: 0, z: 6.3, w: 21, d: 0.8, h: 1.1 });
    b.actor('할머니', GRANDMA, -6.5, 0.8, -3.2, 0, [1.4, -2.2]);
    b.watcher('할머니', { range: 10, half: 0.55, cycle: [[3.2, 1.15], [3.0, 0.15], [3.4, Math.PI]] });
    b.cat(-1.5, 0, 0.5);
  },
};


/* ================================================================== */
/* 7-3  택배 대란 — a staircase of fragile parcels                      */
/* ================================================================== */

const COURIER = { shirt: '#4f86c6', pants: '#2f3142', hair: '#3a2a22', hat: 'cap' as const, hatColor: '#4f86c6', tool: 'clipboard' as const };

const S7_3: LevelDef = {
  id: '7-3', chapter: 7, theme: 'street', title: '택배 대란', subtitle: '빌라 계단에 쌓인 "깨지기 쉬움"',
  paws: 3,
  goal: { kind: 'break', count: 5, text: '깨지기 쉬운 택배 5개를 깨라', short: '택배 5개 깨기' },
  stars: [1900000, 2300000],
  challenges: [
    { type: 'cause', victim: 'fragile', culprit: 'watermelon', text: '수박으로 택배 볼링' },
    { type: 'count', kind: 'fragile', n: 6, text: '깨지기 쉬운 택배 6개 깨기' },
    { type: 'discover', id: 'perfect', text: '기사님 몰래 (완전 범죄)' },
  ],
  tip: '택배 기사님이 오가며 지켜봐요. 기사님이 트럭 쪽을 볼 때가 기회예요.',
  hints: ['현관의 수박을 경사로 아래로 굴려 봐요. 택배 피라미드가 볼링 핀!', '데굴데굴 굴러가며 계단의 상자들을 쓸어 가요. 기사님 시선(부채꼴)에 주의!', '트럭 짐칸 끝의 상자는 밖으로 툭 치면 떨어져 깨져요.'],
  hintMove: { prop: 'watermelon', dir: [1, 0] },
  start: [-1, -1],
  ownerLine: '이거… 다 제가 물어줘야 하나요…?',
  reactor: '기사님',
  prelude: (k) => {
    const a = k.actor('기사님');
    k.cam('fragile', 0.45);
    a.walkTo(0.6, 0.2).turnTo(0, -2).do('work', 1.4).wait(0.2);
    k.at(0.4, () => k.glint('fragile', '#ffe680'));
    k.at(2.4, () => k.say('기사님', '깨지기 쉬움… 조심조심~', 1.8));
    k.at(4.4, () => { k.say('기사님', '다음 집 다녀올게요!', 1.6); k.cam('watermelon', 0.6); });
    return 6.2;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -12, maxX: 12, minZ: -7, maxZ: 6 },
      patches: [
        { x0: -12, x1: 12, z0: -7, z1: -0.5, kind: 'paving' },
        { x0: -12, x1: -4, z0: -0.5, z1: 1.1, kind: 'sidewalk' },
        { x0: 3, x1: 12, z0: -0.5, z1: 1.1, kind: 'sidewalk' },
        { x0: -12, x1: 12, z0: 1.1, z1: 2.5, kind: 'sidewalk' },
        { x0: -12, x1: 12, z0: 2.5, z1: 6, kind: 'asphalt' },
      ],
      // the wheelchair ramp beside the steps
      ramps: [{ x0: -4, x1: 3, z0: -0.5, z1: 1.1, kind: 'concrete', y0: 2.8, y1: 0, along: 'x' }],
      base: '#8e8aa6',
      height: 10,
      labels: [{ name: '빌라 현관', x: -7, z: 0.4 }, { name: '택배 트럭', x: 8.5, z: 0.5 }],
    });
    b.game.view.playWidth = 15;
    building(b, { x: -7.5, z: -5.6, w: 9, d: 3, h: 9, color: '#f4dcc8' });
    building(b, { x: 6, z: -6, w: 12, d: 2, h: 6, color: '#d6e4ff', sign: 'x', signColor: '#ffd23f' });
    // the landing and the steps down to the street
    slab(b, { x: -6.5, z: -1.2, w: 5, d: 4.6, h: 2.8, color: '#e8e2d8', top: '#d9d1c4' });
    steps(b, { x: -4, z: -2, w: 3, n: 7, rise: 0.4, run: 0.8 });
    // railings (thin walls keep things on the stairs)
    slab(b, { x: -1.2, z: -3.55, w: 5.6, d: 0.1, h: 0.8, color: '#5b5f73' });
    // the water pack waiting at the top, fragile parcels on the way down
    C3.watermelon(b, { at: [-4.6, 2.8, 0.3], name: '수박 택배' });
    C3.parcel(b, { at: [-6.6, 2.8, -2.6], name: '이불 택배', size: [1.0, 0.8, 0.9] });
    C3.parcel(b, { at: [-1.2, 1.2, -3.05], fragile: true, target: true, name: '와인 잔', content: 'glass', size: [0.6, 0.6, 0.6], rot: -0.15 });
    // the parcel pyramid at the foot of the stairs (the pins)
    const pyr: [number, number, number, boolean, string][] = [
      [6.4, 0, -0.6, false, ''], [6.4, 0, 0.3, true, '그릇 세트'], [6.4, 0, 1.2, false, ''],
      [6.4, 0.7, -0.15, true, '도자기 화분'], [6.4, 0.7, 0.75, true, '모니터'], [6.4, 1.4, 0.3, true, '유리 액자'],
    ];
    for (const [x, y, z, f, n] of pyr) C3.parcel(b, { at: [x, y, z], fragile: f, target: f, name: f ? n : '택배 상자', size: [0.8, 0.7, 0.85], content: n === '모니터' ? 'electronic' : n === '유리 액자' ? 'glass' : 'ceramic' });
    // the courier's hand truck with two more
    C3.gardenCart(b, { at: [-1.0, 0, -5.0], name: '택배 수레', color: '#5b5f73' });
    C3.parcel(b, { at: [-1.0, 0.85, -5.0], fragile: true, target: true, name: '찻잔 세트', size: [0.9, 0.6, 0.8] });
    C3.parcel(b, { at: [-1.0, 1.45, -5.0], fragile: true, target: true, name: '조명', content: 'glass', size: [0.7, 0.8, 0.7] });
    // the truck, its back open, boxes at the edge
    deliveryTruck(b, { x: 8.8, z: -3.4 });
    C3.parcel(b, { at: [6.2, 1.4, -2.5], fragile: true, target: true, name: '전자레인지', content: 'electronic', size: [0.9, 0.6, 0.7] });
    C3.parcel(b, { at: [6.3, 1.4, -4.1], fragile: true, target: true, name: '꽃병', size: [0.6, 0.8, 0.6] });
    C3.parcel(b, { at: [7.4, 1.4, -3.4], name: '택배 상자', size: [1.2, 1.0, 1.0] });
    C3.parcel(b, { at: [7.4, 2.4, -3.4], name: '택배 상자', size: [1.0, 0.7, 0.9] });
    C3.cone3(b, { at: [9.6, 0, 1.6] });
    C3.wheelieBin(b, { at: [-10.5, 0, 0.6], color: '#4f86c6' });
    streetLamp(b, -0.5, 2.2);
    tree(b, 10.8, 1.8, 0.7);
    b.actor('기사님', COURIER, 4.6, 0, 0.8, -Math.PI / 2, [1, -1]);
    b.watcher('기사님', { range: 8, half: 0.6, cycle: [[1, 0]], patrol: [[0.5, 1.8, 2.2], [4.5, 1.9, 2.6], [5.0, -1.0, 1.4]] });
    b.cat(-7.2, 2.8, -1.4);
  },
};

export const CH7: LevelDef[] = [S7_1, S7_2, S7_3];
