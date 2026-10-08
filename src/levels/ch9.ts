import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import * as THREE from 'three';
import { M, box, mesh } from '../render/kit';
import { building, buildLot, roadLines, slab, streetLamp, tree } from './outdoor';
import { Driver, latch, unlatch, type DriveDef } from '../game/specials4';
import type { Prop } from '../game/Prop';
import type { Game } from '../game/Game';
import type { Builder } from './Builder';
import { cyl, sphere } from '../render/kit';

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


/* ================================================================== */
/* 9-4  도시 대붕괴 — pick where to start                                */
/* ================================================================== */

const H94 = { x0: 9, x1: 18, y0: 0, y1: 2.7 };
const SLOPE94 = Math.atan2(H94.y1 - H94.y0, H94.x1 - H94.x0);

const S9_4: LevelDef = {
  id: '9-4', chapter: 9, theme: 'city', title: '도시 대붕괴', subtitle: '크레인, 쇠공, 언덕 위 트럭',
  paws: 3,
  goal: { kind: 'score', amount: 500000000, text: '도시 피해 ₩5억을 넘겨라', short: '₩5억 피해' },
  stars: [550000000, 575000000],
  pawValue: 25000000,
  challenges: [
    { type: 'count', kind: 'slab', n: 6, event: 'break', text: '두 건물의 바닥 6장 부수기' },
    { type: 'paws', max: 2, text: '앞발 두 번으로 두 건물' },
    { type: 'cause', victim: 'slab', culprit: 'auto', text: '트럭으로 건물 들이받기' },
  ],
  tip: '넓은 곳은 먼저 둘러봐요(🔍). 무엇을 먼저 움직일지, 언제 당길지가 전부예요.',
  hints: ['왼쪽 건물은 크레인 짐이 머리 위에 올 때.', '오른쪽 언덕 위 트럭의 고임목을 빼면 오른쪽 건물 1층으로 돌진해요.', '쇠공은 오른쪽 건물 모서리만 부숴요. 트럭과 함께라면?'],
  hintMove: { prop: 'chock', dir: [-1, 0] },
  start: [0, 0],
  ownerLine: '도시가… 도시가!!',
  reactor: '시장님',
  prelude: (k) => {
    k.cam([-8.5, 4, -3], 0.35);
    k.at(2.0, () => k.cam([8.5, 4, -3], 0.35));
    k.at(4.0, () => { k.cam([15, 3, 0.8], 0.5); k.glint('auto', '#ffe680'); });
    k.at(4.2, () => k.say('시장님', '신도시 준공 기념 리본 커팅을…', 2));
    return 6.4;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -18, maxX: 18, minZ: -8, maxZ: 7 },
      patches: [
        { x0: -18, x1: H94.x0, z0: -8, z1: 7, kind: 'paving' },
        { x0: H94.x0, x1: 18, z0: -8, z1: -3.0, kind: 'paving' },
        { x0: H94.x0, x1: 18, z0: 0.2, z1: 7, kind: 'grass' },
      ],
      ramps: [{ x0: H94.x0, x1: H94.x1, z0: -3.0, z1: 0.2, kind: 'asphalt', y0: H94.y0, y1: H94.y1, along: 'x' }],
      base: '#6f7a8f',
      height: 16,
      labels: [{ name: '왼쪽 타워', x: -8.5, z: 0.8 }, { name: '오른쪽 타워', x: 4.5, z: 0.8 }],
    });
    b.game.view.playWidth = 20;
    const A = C3.structure(b, { x: -8.5, z: -3.2, w: 5, d: 4, floors: 3, color: '#d6e4ff', slabColor: '#c9d6ea', value: 380000000 });
    const B = C3.structure(b, { x: 4.5, z: -3.2, w: 5, d: 4, floors: 3, color: '#fbe7ef', slabColor: '#f4dce6', value: 380000000 });
    void A; void B;
    C3.towerCrane(b, { mast: [-15, -6.4], x0: -13, x1: 0, z: -3.2, h: 16, speed: 1.5, hang: 2.6, lever: [-14, 0, 1.0], loadName: '철골 다발' });
    C3.wreckingBall(b, { pivot: [10.2, 9.2, -4.9], len: 6.2, dir: [-1, 0], from: -0.85, lever: [10.6, 0, -6.6], base: [13.4, 0, -6.2] });
    // a truck parked up the hill, nose toward the right tower
    const xT = 14.2, yT = H94.y0 + ((xT - H94.x0) / (H94.x1 - H94.x0)) * (H94.y1 - H94.y0);
    const truck = C3.car(b, { at: [xT, yT, -1.4], rot: Math.PI, slope: SLOPE94, held: true, color: '#5bb98c', name: '언덕 위 트럭', value: 45000000 });
    const cx = xT - 2.05 * Math.cos(SLOPE94);
    C3.chock(b, { at: [cx, H94.y0 + ((cx - H94.x0) / (H94.x1 - H94.x0)) * (H94.y1 - H94.y0), -0.4], rot: Math.PI, slope: SLOPE94, car: truck });
    // the ribbon-cutting stand in between
    C3.vendingMachine(b, { at: [-1.8, 0, -1.6], name: '기념 조형물', color: '#ffd23f', value: 12000000 });
    for (let i = 0; i < 6; i++) C3.cone3(b, { at: [-4.5 + i * 1.6, 0, 2.4] });
    C3.portableToilet(b, { at: [-15.8, 0, 3.6] });
    building(b, { x: 0, z: -8.6, w: 36, d: 1.2, h: 5, color: '#9aa3b8', solid: false });
    for (const x of [-16, 16]) streetLamp(b, x, 6.2);
    b.actor('시장님', { shirt: '#2f3142', pants: '#2f3142', hair: '#d9d4cc', glasses: true, tool: 'scissors' }, -1.5, 0, 4.4, Math.PI, [-1.5, 0]);
    b.cat(-3, 0, 5.4);
  },
};

/* ================================================================== */
/* 9-2  출근길 사거리 — a signal box, rush hour, a flower parade        */
/* ================================================================== */

const POLICE = { shirt: '#4f86c6', pants: '#2f3142', hair: '#2a1c14', hat: 'cap' as const, hatColor: '#2f3142' };
const MAIN_Z = -1.1, FLOAT_X = 1.1;

/** a traffic light on a pole whose lamps follow `green()` */
function trafficLight(b: Builder, x: number, z: number, rot: number, green: () => boolean) {
  const grp = new THREE.Group();
  grp.add(mesh(cyl(0.1, 0.12, 4.2, 8), M('#5b5f73'), { pos: [0, 2.1, 0] }));
  grp.add(mesh(box(0.5, 1.3, 0.4, 0.05), M('#2f3142'), { pos: [0, 4.0, 0] }));
  const red = new THREE.MeshLambertMaterial({ color: '#ff5a6e', emissive: '#ff2a3c', emissiveIntensity: 1, flatShading: true });
  const grn = new THREE.MeshLambertMaterial({ color: '#5bd98c', emissive: '#2ad86c', emissiveIntensity: 0, flatShading: true });
  red.userData.dynamic = true; grn.userData.dynamic = true;
  const r = mesh(sphere(0.16, 8, 6), red, { pos: [0, 4.35, 0.22], shadow: false });
  const gm = mesh(sphere(0.16, 8, 6), grn, { pos: [0, 3.7, 0.22], shadow: false });
  r.userData.keep = true; gm.userData.keep = true;
  grp.add(r, gm);
  grp.position.set(x, 0, z);
  grp.rotation.y = rot;
  grp.userData.keep = true;
  b.deco(grp);
  b.game.addUpdater(() => { const gOn = green(); red.emissiveIntensity = gOn ? 0.05 : 1; grn.emissiveIntensity = gOn ? 1 : 0.05; });
}

/** a flower float: a slow car under a mountain of flowers */
function flowerFloat(b: Builder, z: number, name: string, color: string): { prop: Prop; car: import('../game/specials3').CarSpecial } {
  const c = C3.car(b, { at: [FLOAT_X, 0, z], rot: -Math.PI / 2, color, name, kind: 'float', icon: '💐', value: 26000000, target: true, worth: { heart: 72, owner: '퍼레이드 팀', story: '사흘 밤을 새워 꽂은 꽃 2만 송이' } });
  const fl = new THREE.Group();
  const cols = ['#ff8fa3', '#ffd23f', '#ffffff', '#c9a0dc', '#ff9f43'];
  for (let i = 0; i < 26; i++) fl.add(mesh(sphere(0.32, 6, 5), M(cols[i % cols.length]), { pos: [-2 + (i % 9) * 0.5, 1.9 + Math.floor(i / 9) * 0.32, -0.9 + ((i * 7) % 5) * 0.45], shadow: false }));
  fl.add(mesh(sphere(0.7, 8, 6), M('#ff5a6e'), { pos: [0.2, 3.0, 0] }));
  fl.userData.keep = true;
  c.prop.group.add(fl);
  return c;
}

const S9_2: LevelDef = {
  id: '9-2', chapter: 9, theme: 'city', title: '출근길 사거리', subtitle: '꽃차 퍼레이드가 지나가는 동안 출근 차들은 빨간불',
  paws: 3,
  goal: { kind: 'break', count: 1, text: '퍼레이드 꽃차를 망가뜨려라', short: '꽃차' },
  stars: [32000000, 60000000],
  challenges: [
    { type: 'count', kind: 'auto', n: 2, text: '연쇄 추돌 (자동차 2대 찌그러뜨리기)' },
    { type: 'count', kind: 'float', n: 2, text: '꽃차 두 대 모두' },
    { type: 'discover', id: 'perfect', text: '교통경찰 몰래 (완전 범죄)' },
  ],
  tip: '꽃차는 너무 무거워요. 하지만 출근 차들은 신호만 바뀌면 달려 나갈 준비가 되어 있어요. 언제 바꾸느냐가 전부!',
  hints: [
    '모퉁이의 신호 제어함을 툭 치면 큰길이 잠깐 초록불이 돼요.',
    '너무 일찍 바꾸면 차가 꽃차 앞을 지나쳐 버려요. 꽃차가 횡단보도에 막 들어설 때!',
    '퍼레이드는 계속 돌아요. 두 번째 꽃차 때 한 번 더!',
  ],
  hintMove: { prop: 'button', dir: [1, 0] },
  start: [-4, -3],
  ownerLine: '퍼레이드가…!! 꽃차가!!',
  reactor: '교통경찰',
  prelude: (k) => {
    k.cam('float', 0.6);
    k.at(0.5, () => k.glint('float', '#ff9fc0'));
    k.at(1.4, () => k.say('교통경찰', '퍼레이드 지나갑니다~ 차량 대기!', 2.0));
    k.at(4.0, () => k.say('교통경찰', '이 신호 제어함 고장 났다던데… 설마.', 2.0));
    return 6.4;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -14, maxX: 14, minZ: -12, maxZ: 12 },
      patches: [
        { x0: -14, x1: -2.2, z0: -12, z1: -2.2, kind: 'paving' },
        { x0: 2.2, x1: 14, z0: -12, z1: -2.2, kind: 'paving' },
        { x0: -14, x1: -2.2, z0: 2.2, z1: 12, kind: 'paving' },
        { x0: 2.2, x1: 14, z0: 2.2, z1: 12, kind: 'paving' },
        { x0: -14, x1: 14, z0: -2.2, z1: 2.2, kind: 'asphalt' },
        { x0: -2.2, x1: 2.2, z0: -12, z1: -2.2, kind: 'asphalt' },
        { x0: -2.2, x1: 2.2, z0: 2.2, z1: 12, kind: 'asphalt' },
      ],
      base: '#6f7f9f',
      height: 8,
      labels: [{ name: '큰길', x: -10, z: 0 }, { name: '퍼레이드 길', x: 0, z: 9.5 }],
    });
    b.game.view.playWidth = 20;
    roadLines(b, { x0: -14, x1: -3, z: 0 });
    roadLines(b, { x0: 3, x1: 14, z: 0 });
    roadLines(b, { x0: -12, x1: -3, z: 0, along: 'z' });
    roadLines(b, { x0: 3, x1: 12, z: 0, along: 'z' });
    // zebra crossings
    const zb = new THREE.Group();
    for (let i = 0; i < 6; i++) zb.add(mesh(box(0.45, 0.02, 3.8, 0), M('#ffffff'), { pos: [-3.2 + i * 0.0, 0.012, 0], shadow: false }));
    for (let i = 0; i < 7; i++) { zb.add(mesh(box(0.42, 0.02, 1.4, 0), M('#ffffff'), { pos: [-1.8 + i * 0.6, 0.012, -3.0], shadow: false })); zb.add(mesh(box(0.42, 0.02, 1.4, 0), M('#ffffff'), { pos: [-1.8 + i * 0.6, 0.012, 3.0], shadow: false })); }
    b.deco(zb);
    // the signal: the parade has green; one tap on the box and the big road goes
    let greenUntil = -1;
    const mainGreen = (g: Game) => g.time < greenUntil;
    const lane: { d: Driver; p: Prop }[] = [];
    const queue: { d: Driver; p: Prop; out: boolean; next: number }[] = [];
    const commuter = (x: number, color: string, name: string) => {
      const c = C3.car(b, { at: [x, 0, MAIN_Z], color, name, value: 21000000, worth: { owner: '출근하던 회사원' } });
      const def: DriveDef = { axis: 'x', dir: 1, speed: 6.5, go: mainGreen, stopAt: -6.4, lane, gap: 6.2 };
      const d = new Driver(def);
      c.car.driver = d;
      lane.push({ d, p: c.prop });
      queue.push({ d, p: c.prop, out: false, next: 0 });
    };
    commuter(-6.9, '#7fb8ff', '출근 차');
    commuter(-11.0, '#ffd23f', '택시');
    // through the junction and away; a while later the same car joins the back of the queue again
    b.game.addUpdater(() => {
      const g = b.game;
      for (const q of queue) {
        if (q.d.crashed || !q.p.alive) continue;
        const x = q.p.body.translation().x;
        if (!q.out && x > 10.5) { q.out = true; q.d.paused = true; q.next = g.time + 2.5; latch(q.p); q.p.body.setTranslation({ x: 70 + queue.indexOf(q) * 8, y: 0, z: MAIN_Z }, true); }
        else if (q.out && g.time > q.next && !lane.some((o) => o.p !== q.p && o.p.alive && o.p.body.translation().x < -7.5 && o.p.body.translation().x > -20)) {
          q.out = false; q.d.paused = false; q.d.reset();
          q.p.body.setTranslation({ x: -12.5, y: 0, z: MAIN_Z }, true); q.p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); q.p.prevV.set(0, 0, 0);
          unlatch(g, q.p, null); q.p.cause = null; q.p.causeCat = false;
        }
      }
    });
    trafficLight(b, -3.0, -2.8, 0, () => mainGreen(b.game));
    trafficLight(b, 2.8, 2.9, Math.PI, () => !mainGreen(b.game));
    C3.button(b, {
      at: [-3.6, 0, -3.9], label: '신호 제어함', word: '삑—! 초록불', color: '#5bd98c',
      action: (game) => { greenUntil = game.time + 2.4; game.discover('trigger', new THREE.Vector3(-3.6, 1, -3.9)); },
    });
    // the parade: two floats take turns coming up the road from behind the arch, again and again
    const floats: { p: Prop; d: Driver; next: number; out: boolean }[] = [];
    for (const [name, color, start] of [['장미 꽃차', '#ff8fa3', 0.6], ['라일락 꽃차', '#c9a0dc', 7.4]] as const) {
      const f = flowerFloat(b, -9, name, color);
      const d = new Driver({ axis: 'z', dir: 1, speed: 2.4, go: () => true });
      f.car.driver = d;
      floats.push({ p: f.prop, d, next: start, out: true });
    }
    const park = (f: { p: Prop }, z: number) => { f.p.body.setTranslation({ x: FLOAT_X, y: 0, z }, true); f.p.body.setLinvel({ x: 0, y: 0, z: 0 }, true); f.p.prevV.set(0, 0, 0); };
    for (const f of floats) { park(f, -60 - floats.indexOf(f) * 8); latch(f.p); f.d.paused = true; }
    b.game.addUpdater(() => {
      const g = b.game;
      for (const f of floats) {
        if (f.d.crashed || !f.p.alive) continue;
        const z = f.p.body.translation().z;
        if (f.out && g.time >= f.next) { f.out = false; f.d.paused = false; park(f, -9); unlatch(g, f.p, null); f.p.cause = null; f.p.causeCat = false; }
        else if (!f.out && z > 9) { f.out = true; f.d.paused = true; f.next = g.time + 6.8; latch(f.p); park(f, -60 - floats.indexOf(f) * 8); }
      }
    });
    // arches hide where the parade comes from and goes to
    for (const z of [-10.2, 10.2]) {
      const ar = new THREE.Group();
      for (const x of [-2.6, 2.6]) ar.add(mesh(box(0.5, 5, 0.5, 0.05), M('#ff8fa3'), { pos: [x, 2.5, 0] }));
      ar.add(mesh(box(5.8, 0.8, 0.6, 0.05), M('#ffd23f'), { pos: [0, 5.2, 0] }));
      ar.add(mesh(box(4.7, 4.6, 0.1, 0.02), M('#ffffff', { transparent: true, opacity: 0.85 }), { pos: [0, 2.4, z < 0 ? 0.3 : -0.3], shadow: false }));
      ar.position.z = z;
      b.deco(ar);
    }
    // corners: a café, a bus stop, flower stalls
    building(b, { x: -9, z: -8, w: 8, d: 6, h: 6, color: '#ffe3c4', sign: '모닝 카페', signColor: '#ff9f43' });
    building(b, { x: 9, z: -8, w: 8, d: 6, h: 7, color: '#dfe8ff' });
    building(b, { x: -9, z: 8.5, w: 8, d: 5, h: 5, color: '#e8f4e0' });
    building(b, { x: 9, z: 8.5, w: 8, d: 5, h: 6, color: '#ffe8f0' });
    for (let i = 0; i < 3; i++) C3.flowerPot(b, { at: [4.0 + i * 1.0, 0, 3.4], rot: i, big: i === 1 });
    C3.wheelieBin(b, { at: [-4.2, 0, 3.6] });
    C3.cone3(b, { at: [3.0, 0, -2.6] });
    C3.cone3(b, { at: [-2.8, 0, 2.6] });
    streetLamp(b, -3.4, 4.2);
    streetLamp(b, 3.6, -4.2);
    tree(b, 12.5, 4, 0.7);
    tree(b, -12.5, -4, 0.7);
    b.actor('교통경찰', POLICE, 3.6, 0, 3.6, -Math.PI * 0.75, [3.2, 2.8]);
    b.watcher('교통경찰', { range: 9, half: 0.5, cycle: [[3, 0], [2.4, 0.9], [2.6, -0.5]] });
    b.cat(-5, 0, -4.6);
  },
};

export const CH9: LevelDef[] = [S9_1, S9_2, S9_3, S9_4];
