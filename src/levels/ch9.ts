import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
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

export const CH9: LevelDef[] = [S9_1];
