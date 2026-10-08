import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C3 from '../game/catalog3';
import { CableSpecial } from '../game/specials3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { M, box, cyl, mesh } from '../render/kit';
import { buildHouse, doorOn, posterOn, table, windowOn } from './house';
import { rect } from './rooms';
import * as C4 from '../game/catalog4';
import { latch, unlatch } from '../game/specials4';
import type { Prop } from '../game/Prop';
import { buildLot, roadLines, shopFront, streetLamp, tree } from './outdoor';

/* ================================================================== */
/* Chapter 8 — 상점가. Shops and offices: carriers, wheeled things,     */
/* people who keep half an eye on their treasures.                      */
/* ================================================================== */

/** the potter's wheel and stool (solid scenery) */
function pottersWheel(b: Builder, x: number, z: number) {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.9, 1.4, 0.08), M('#8e6a5a'), { pos: [0, 0.45, 0] }));
  g.add(mesh(cyl(0.6, 0.6, 0.12, 16), M('#c9c3b8'), { pos: [0, 1.0, 0] }));
  g.add(mesh(cyl(0.3, 0.38, 0.5, 10), M('#c4ab8c'), { pos: [0, 1.3, 0] }));
  g.add(mesh(cyl(0.45, 0.45, 0.9, 8), M('#b9825a'), { pos: [-1.3, 0.45, 0] }));
  b.solid(g, [{ shape: 'box', hx: 0.8, hy: 0.55, hz: 0.7, at: [0, 0.55, 0] }], [x, 0, z]);
}

/* ================================================================== */
/* 8-1  도자기 공방 — the vitrine                                        */
/* ================================================================== */

const MASTER = { shirt: '#e8e2d8', pants: '#5b5f73', hair: '#d9d4cc', apron: '#8e6a5a', glasses: true, tool: 'none' as const };

const S8_1: LevelDef = {
  id: '8-1', chapter: 8, theme: 'shops', title: '도자기 공방', subtitle: '유리장 안의 달항아리',
  paws: 3,
  goal: { kind: 'break', text: '장인의 달항아리를 깨라', short: '달항아리 깨기' },
  stars: [13000000, 17000000],
  challenges: [
    { type: 'cause', victim: 'moonJar', culprit: 'rack', text: '건조대로 유리장 들이받기' },
    { type: 'discover', id: 'perfect', text: '장인 몰래 (완전 범죄)' },
    { type: 'count', kind: 'maebyeong', n: 3, text: '진열대 매병 3개 깨기' },
  ],
  tip: '유리장은 무거워서 한 번에는 안 넘어가요. 흔들릴 때 한 번 더! 장인이 고개를 들 때는 조심.',
  hints: ['유리장 위쪽을 쳐서 흔들고, 기울어질 때 한 번 더 쳐요.', '바퀴 달린 건조대를 밀면 유리장까지 굴러가요.', '진열대 끝의 매병을 밀면 줄줄이 쓰러져요.'],
  hintMove: { prop: 'rack', dir: [1, -0.1] },
  start: [0, 0],
  ownerLine: '석 달 빚은 달항아리가…!!',
  reactor: '장인',
  prelude: (k) => {
    const a = k.actor('장인');
    k.cam('moonJar', 0.55);
    a.walkTo(2.2, 0.9).turnTo(3.2, -0.6).do('work', 1.8).do('admire', 1.6).walkTo(-5.2, 2.6).turnTo(-5.2, 0);
    k.at(0.8, () => k.glint('moonJar', '#ff9fc0'));
    k.at(3.2, () => { k.say('장인', '석 달 만에 완성이구나…', 2.2); k.glint('moonJar', '#ff9fc0'); });
    k.at(5.8, () => k.say('장인', '유리장 안이니 안전하겠지.', 1.8));
    return 8;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('shop', '공방', 0, 0, 16, 9, 'darkwood', 'hall')], base: '#7a6a8f' });
    windowOn(b, { z: -4.5 }, -4.5, 4.4, 2.4, 2.0, false, '#e8b07a');
    windowOn(b, { z: -4.5 }, 4.8, 4.4, 2.4, 2.0, false, '#e8b07a');
    posterOn(b, { x: -8 }, -2, 4.2, 1.4, 1.8, ['#fbf7ee', '#5b3b2b', '#8fc3b8']);
    doorOn(b, { x: -8 }, 2.4, '#8e6a5a');
    // the vitrine with the moon jar and friends
    const v = C3.vitrine(b, { at: [3.2, 0, -0.6], h: 5.2, w: 2.0, d: 1.2, rot: Math.PI / 2, mass: 13 });
    C3.moonJar(b, { at: [3.2, v.shelfY[1], -0.6], target: true, interactable: false, name: '장인의 달항아리', worth: { owner: '장인', heart: 90 * 24, story: '석 달을 빚고 구운 달항아리' } });
    C.vase(b, { at: [3.2, v.shelfY[0], -1.1], color: '#8fc3b8', name: '청자 꽃병', value: 2500000 }).interactable = false;
    C.vase(b, { at: [3.2, v.shelfY[0], -0.1], color: '#fbf7ee', name: '백자 병', value: 1800000, flowers: false }).interactable = false;
    C.mug(b, { at: [3.2, v.shelfY[2], -1.0], color: '#8fc3b8', name: '청자 찻잔', value: 400000 }).interactable = false;
    C.mug(b, { at: [3.2, v.shelfY[2], -0.2], color: '#8fc3b8', name: '청자 찻잔', value: 400000 }).interactable = false;
    // the display bench along the back wall: a row of vases
    const bench = table(b, -2.2, -3.6, 8.4, 1.1, 1.3, '#8e6a5a', '#5b3b2b');
    for (let i = 0; i < 11; i++) C3.maebyeong(b, { at: [-6.0 + i * 0.72, bench, -3.6], color: ['#8fc3b8', '#fbf7ee', '#c98a5a', '#8fb0d8'][i % 4], name: '진열 매병' });
    // the drying rack on casters, full of greenware
    const r = C3.dryingRack(b, { at: [-3.4, 0, 0.0] });
    for (let s = 0; s < 3; s++) for (const dx of [-0.45, 0.45]) C3.greenware(b, { at: [-3.4 + dx, r.shelfY[s], 0.0], color: s % 2 ? '#d9c4a8' : '#cdb59a' });
    // a heavy block of clay on the top shelf: when the rack stops, it keeps going
    C3.clayBlock(b, { at: [-3.4, r.shelfY[3], 0.0] });
    // clay slip bucket (spills a slippery puddle)
    C3.bucket(b, { at: [-1.4, 0, 1.6], color: '#c4ab8c', name: '흙물 양동이' });
    pottersWheel(b, -5.2, 3.2);
    C3.greenware(b, { at: [6.6, 0, 3.0], scale: 1.4, name: '큰 독' });
    b.actor('장인', MASTER, -5.2, 0, 2.6, Math.PI / 2, [2.6, 0.6]);
    b.watcher('장인', { range: 12, half: 0.5, cycle: [[3.6, -0.9], [2.6, 0.38], [2.4, 1.3]] });
    b.cat(6.4, 0, 2.6);
  },
};


/* ================================================================== */
/* 8-2  새 사무실 개업 — cables and a water cooler                       */
/* ================================================================== */

const CLERK = { shirt: '#ffffff', pants: '#2f3142', hair: '#3a2a22', glasses: true, tool: 'cup' as const };

/** a row of three desks with plugged-in monitors near the front edge, cables to one strip */
function monitorRow(b: Builder, z: number, names: string[], stripAt: [number, number]) {
  const mons: import('../game/Prop').Prop[] = [];
  const cables: import('../game/specials3').CableSpecial[] = [];
  const top = C3.officeDesk(b, { at: [-5.0, 0, z], w: 2.4, d: 1.4 }).top;
  C3.officeDesk(b, { at: [-2.5, 0, z], w: 2.4, d: 1.4 });
  C3.officeDesk(b, { at: [0.0, 0, z], w: 2.4, d: 1.4 });
  // the partition behind (keeps the monitors from going over the back)
  const g = new THREE.Group();
  g.add(mesh(box(7.6, 2.6, 0.12, 0.03), M('#c9d6ea'), { pos: [0, 1.3, 0] }));
  b.solid(g, [{ shape: 'box', hx: 3.8, hy: 1.3, hz: 0.06, at: [0, 1.3, 0] }], [-2.5, 0, z - 0.8]);
  for (const [i, x] of [-5.9, -2.5, 0.95].entries()) {
    const m = C3.monitor(b, { at: [x, top, z + 0.2], target: true, name: names[i] });
    mons.push(m.prop); cables.push(m.cable);
  }
  const strip = C3.powerStrip(b, { at: [stripAt[0], 0, stripAt[1]] });
  strip.strip.plugged = mons;
  const anchor = new THREE.Vector3(stripAt[0], 0, stripAt[1]);
  cables.forEach((c, i) => { c.links = mons.filter((_, j) => j !== i); c.anchor = anchor; c.pull = new THREE.Vector3(0, 0, 1); });
  // the cables, from each desk edge down to the strip
  const cg = new THREE.Group();
  for (const x of [-5.9, -2.5, 0.95]) {
    const a = new THREE.Vector3(x, 1.55, z + 0.7), e = new THREE.Vector3(stripAt[0], 0.12, stripAt[1]);
    const len = a.distanceTo(e);
    const c = mesh(cyl(0.03, 0.03, len, 4), M('#3a3d4f'), { shadow: false });
    c.position.copy(a).add(e).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().sub(a).normalize());
    cg.add(c);
  }
  b.deco(cg);
  return mons;
}

const S8_2: LevelDef = {
  id: '8-2', chapter: 8, theme: 'shops', title: '새 사무실 개업', subtitle: '비닐도 안 뗀 새 모니터 여섯 대',
  paws: 3,
  goal: { kind: 'break', count: 6, text: '새 모니터 6대를 망가뜨려라', short: '모니터 6대' },
  stars: [6000000, 8600000],
  challenges: [
    { type: 'stat', key: 'short', min: 6, text: '정수기 물로 합선 (모니터 6대 이상)' },
    { type: 'paws', max: 1, text: '앞발 한 번으로 클리어' },
    { type: 'count', kind: 'printer', n: 1, text: '복합기까지 박살' },
  ],
  tip: '모니터는 책상 뒤 칸막이에 막혀 있어요. 전선은 바닥의 멀티탭으로 모여요. 물과 전기는…?',
  hints: ['줄 끝의 모니터를 옆으로 떨어뜨리면 전선이 나머지를 끌어당겨요.', '정수기 물통을 통로 쪽으로 떨어뜨리면 바닥이 물바다.', '물이 멀티탭에 닿으면 파지직! 꽂힌 모니터가 전부 고장.'],
  hintMove: { prop: 'waterBottle', dir: [-1, 0] },
  start: [-1, 0],
  ownerLine: '개업 첫날인데…!!',
  reactor: '직원',
  prelude: (k) => {
    const a = k.actor('직원');
    k.cam('monitor', 0.45);
    a.walkTo(-2.5, -1.8).turnTo(-2.5, -3).do('work', 1.6).do('admire', 1.4).walkTo(6.6, 3.9);
    k.at(0.5, () => k.glint('monitor', '#ffe680'));
    k.at(2.0, () => k.say('직원', '비닐 떼는 맛~ 새 모니터!', 1.8));
    k.at(4.6, () => k.say('직원', '회의 다녀올게요~', 1.4));
    return 6.6;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('office', '사무실', 0, 0, 16, 10, 'checker', 'butter')], base: '#6f7fa6' });
    windowOn(b, { z: -5 }, 4.5, 4.4, 3.2, 2.2, false, '#7fb8d8');
    posterOn(b, { x: -8 }, 1.5, 4.0, 1.6, 1.2, ['#ffffff', '#4f86c6', '#ffd23f']);
    doorOn(b, { x: -8 }, -2.6, '#7f9fd8');
    monitorRow(b, -3.4, ['새 모니터 A1', '새 모니터 A2', '새 모니터 A3'], [-3.6, -2.05]);
    monitorRow(b, 0.8, ['새 모니터 B1', '새 모니터 B2', '새 모니터 B3'], [-3.6, 0.35]);
    // the water cooler in the aisle between the rows
    C3.waterCooler(b, { at: [-2.2, 0, -0.85], rot: Math.PI / 2 });
    // wheeled chairs
    C.chair(b, { at: [-5.0, 0, -1.7], wheels: true, color: '#4f86c6' });
    C.chair(b, { at: [0.2, 0, 2.7], wheels: true, color: '#4f86c6' });
    C.chair(b, { at: [5.6, 0, 0.0], wheels: true, color: '#ff8f6b', rot: -Math.PI / 2 });
    // the boss's corner: a printer and a plant
    const bt = table(b, 5.8, -3.6, 3.0, 1.4, 1.5, '#5b3b2b', '#3a2a22');
    // the printer and the boss's monitor share a cable
    const cable = new CableSpecial();
    cable.pull = new THREE.Vector3(0, 0, 1);
    C3.printer(b, { at: [4.9, bt, -3.35], special: cable });
    const boss = C3.monitor(b, { at: [6.5, bt, -3.45], name: '사장님 대형 모니터', value: 2400000 });
    cable.links = [boss.prop];
    C.plant(b, { at: [7.6, bt, -3.8] });
    C.plant(b, { at: [7.2, 0, 4.2] });
    b.actor('직원', CLERK, -1.2, 0, -1.7, Math.PI, [-2.5, -0.6]);
    b.cat(6.2, 0, 3.0);
  },
};

/* ================================================================== */
/* 8-3  마트 카트 대행진 — a line of carts on a latch                   */
/* ================================================================== */

const MART_CLERK = { shirt: '#5ec4c9', pants: '#3b3f63', hair: '#2a1c14', apron: '#ff9f43', hat: 'cap' as const, hatColor: '#ff9f43' };
const LANE_Z = -3.9;

const S8_3: LevelDef = {
  id: '8-3', chapter: 8, theme: 'shops', title: '마트 카트 대행진', subtitle: '점원이 세 시간 쌓은 특가 통조림 탑',
  paws: 3,
  goal: { kind: 'floor', count: 15, text: '통조림 탑을 무너뜨려라 (15개)', short: '통조림 15개' },
  stars: [600000, 900000],
  challenges: [
    { type: 'count', kind: 'bottle', n: 3, text: '와인 3병도 깨기' },
    { type: 'stat', key: 'cansDown', min: 24, text: '통조림 24개 이상' },
    { type: 'discover', id: 'perfect', text: '점원 몰래 (완전 범죄)' },
  ],
  tip: '통조림은 앞발로 몇 개씩밖에 못 떨어뜨려요. 2층 카트 보관대의 카트들은 고리 하나로 묶여 있어요.',
  hints: [
    '카트 고리를 툭 — 카트 세 대가 무빙워크를 타고 줄줄이 내려가요.',
    '맨 앞 카트에는 수박이 실려 있어요. 카트가 멈추면 짐은 계속 날아가요!',
    '점원은 통로를 왔다 갔다 해요. 등을 돌렸을 때 고리를 풀어요.',
  ],
  hintMove: { prop: 'lever', dir: [1, 0] },
  start: [-1, -1.5],
  ownerLine: '내 세 시간이…!! 누가 카트를 풀었어?!',
  reactor: '점원',
  prelude: (k) => {
    const a = k.actor('점원');
    k.cam('can', 0.55);
    a.walkTo(4.2, -2.6).turnTo(5.5, LANE_Z).do('work', 2.0).do('admire', 1.4).walkTo(2.0, -1.6);
    k.at(0.6, () => k.glint('can', '#ffe680'));
    k.at(2.2, () => k.say('점원', '마지막 한 캔… 완성! 세 시간 걸렸다~', 2.0));
    k.at(4.8, () => k.say('점원', '특가 행사 시작합니다~!', 1.6));
    return 7;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('mart', '마트', 0, 0, 20, 11, 'marttile', 'mart')], base: '#7f9fc4' });
    b.game.view.playWidth = 17;
    // upstairs cart bay and the moving walkway down
    C4.platform(b, { x0: -10, x1: -4.5, z0: -5.5, z1: -1.0, y: 2.0, rail: ['z1'] });
    b.invisible([{ shape: 'box', hx: 0.05, hy: 0.6, hz: 0.9, at: [-4.5, 2.6, -1.9] }], [0, 0, 0]);
    C4.rampX(b, { x0: -4.5, x1: 0.5, y0: 2.0, y1: 0, z0: -5.0, z1: -2.8 });
    const carts: Prop[] = [];
    for (let i = 0; i < 3; i++) carts.push(C3.shoppingCart(b, { at: [-5.4 - i * 1.85, 2.0, LANE_Z] }));
    const melons = [C3.watermelon(b, { at: [-5.1, 2.86, LANE_Z - 0.28], r: 0.32 }), C3.watermelon(b, { at: [-5.1, 2.86, LANE_Z + 0.3], r: 0.32 })];
    for (const c of carts) latch(c);
    for (const m of melons) { latch(m); m.spec.angDamp = 0.9; m.body.setAngularDamping(0.9); }
    C3.lever(b, {
      at: [-4.9, 2.0, -2.25], label: '카트 고리 풀기', word: '철컥! 우르르', rot: Math.PI / 2,
      action: (game, self) => {
        carts.forEach((c) => unlatch(game, c, self, new THREE.Vector3(2.2, 0, 0)));
        for (const m of melons) unlatch(game, m, carts[0], new THREE.Vector3(2.2, 0, 0));
        game.discover('trigger', self.center(new THREE.Vector3()));
      },
    });
    // the special-offer tower
    const disp = C4.displayTable(b, { at: [6.0, 0, LANE_Z], w: 1.0, d: 3.4, h: 0.95 });
    const cans = C4.canPyramid(b, { x: 6.0, y: disp.top, z: LANE_Z, rows: 7, target: true, along: 'z' });
    b.game.addUpdater(() => {
      // a can knocked over counts as the tower coming down
      for (const c of cans) if (!c.onFloor && (c.toppled || c.fell)) c.onFloor = true;
      const n = cans.filter((c) => c.onFloor || c.damaged || !c.alive).length;
      b.game.best('cansDown', n);
    });
    // eggs and wine just past it
    const et = C4.displayTable(b, { at: [8.6, 0, LANE_Z], w: 1.8, d: 2.8, h: 1.0, color: '#ffffff', name: '달걀·와인 매대' });
    C.eggCarton(b, { at: [8.1, et.top, LANE_Z - 0.7] });
    C.eggCarton(b, { at: [8.1, et.top, LANE_Z + 0.6] });
    for (let i = 0; i < 4; i++) C.bottle(b, { at: [9.15, et.top, LANE_Z - 1.0 + i * 0.65] });
    // aisles and odds and ends
    C4.gondola(b, { x0: -4.5, x1: 5.5, z: 0.4 });
    C4.gondola(b, { x0: -4.5, x1: 5.5, z: 3.4 });
    C3.fruitCrate(b, { at: [2.2, 0, -1.6], n: 6 });
    C3.waterPack(b, { at: [-1.6, 0, -1.4] });
    C3.bucket(b, { at: [0.9, 0, -2.2] });
    b.actor('점원', MART_CLERK, 2.0, 0, -1.6, Math.PI / 2, [5, -2.4]);
    b.watcher('점원', { range: 9, half: 0.55, cycle: [[3, 0], [2.5, -1.2], [2.5, 0.4]], patrol: [[2.0, -1.6, 5], [7.4, -1.4, 5]] });
    b.cat(-2.5, 0, -1.6);
  },
};

/* ================================================================== */
/* 8-4  상점가 대참사 — three shops, one puddle, one extension cord     */
/* ================================================================== */

const FLORIST = { shirt: '#ffb3c6', pants: '#5b8c6a', hair: '#7a4a2e', apron: '#5bb98c', tool: 'waterCan' as const };

const S8_4: LevelDef = {
  id: '8-4', chapter: 8, theme: 'shops', title: '상점가 대참사', subtitle: '빵집, 꽃집, 전자상가가 나란히',
  paws: 3,
  goal: { kind: 'score', amount: 6000000, text: '상점가 피해 ₩600만 만들기', short: '₩600만' },
  stars: [10000000, 13500000],
  challenges: [
    { type: 'count', kind: 'tv', n: 3, text: '세일 TV 3대 전부 망가뜨리기' },
    { type: 'cause', victim: 'auto', culprit: 'sign', text: '떨어진 간판으로 불법 주차 차 찌그러뜨리기' },
    { type: 'discover', id: 'perfect', text: '꽃집 사장님 몰래 (완전 범죄)' },
  ],
  tip: '세 가게는 이어져 있어요. 꽃 양동이의 물은 어디까지 흐를까요? 인도 위 멀티탭에는 전자상가 전부가 꽂혀 있어요.',
  hints: [
    '꽃 양동이는 울타리 안이라 앞발이 안 닿아요. 무언가 크게 넘어져 덮친다면…?',
    '전자상가 간판도 같은 멀티탭에 연결돼 있어요. 합선되면 간판 아래 차는…',
    '빵집 진열장은 위쪽을 두 번 연달아 밀면 넘어가요. 꽃 양동이 쪽으로!',
  ],
  hintMove: { prop: 'vitrine', dir: [1, 0] },
  start: [0, -1],
  ownerLine: '아니, 이게 다 무슨 일이야?!',
  reactor: '꽃집 사장',
  prelude: (k) => {
    const a = k.actor('꽃집 사장');
    k.cam('flowerBucket', 0.6);
    a.walkTo(-1.4, -2.8).turnTo(-1.4, -3.9).do('water', 2.0).walkTo(1.8, -2.6).turnTo(4.0, -3.6);
    k.at(0.6, () => k.glint('tv', '#ffe680'));
    k.at(2.2, () => k.say('꽃집 사장', '전자상가 연장선이 또 우리 가게 앞이네…', 2.2));
    k.at(4.8, () => k.say('꽃집 사장', '물 조심해야지~', 1.4));
    return 6.6;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -14, maxX: 14, minZ: -8, maxZ: 7 },
      patches: [
        { x0: -14, x1: 14, z0: -8, z1: -5, kind: 'paving' },
        { x0: -14, x1: 14, z0: -5, z1: -1.4, kind: 'paving' },
        { x0: -14, x1: 14, z0: -1.4, z1: 4.6, kind: 'asphalt' },
        { x0: -14, x1: 14, z0: 4.6, z1: 7, kind: 'paving' },
      ],
      base: '#7d7f9a',
      height: 7,
      labels: [{ name: '구름빵집', x: -9.5, z: -2 }, { name: '꽃다발', x: 0, z: -2 }, { name: '반짝전자', x: 9.5, z: -2 }],
    });
    b.game.view.playWidth = 19;
    roadLines(b, { x0: -14, x1: 14, z: 1.6 });
    shopFront(b, { x: -9.5, z: -6, w: 8.6, color: '#fff1d6', sign: '#ff9f43', awning: '#ffcf5c' });
    shopFront(b, { x: 0, z: -6, w: 8.6, color: '#f4fff4', sign: '#5bb98c', awning: '#ff8fa3' });
    shopFront(b, { x: 9.5, z: -6, w: 8.6, color: '#eef3ff', sign: '#4f86c6', awning: '#7fb8ff' });
    // bakery: the glass cake tower by the door
    const vit = C3.vitrine(b, { at: [-5.0, 0, -4.1], w: 1.5, h: 4.2, d: 1.0, shelves: 3, color: '#c98a5a', name: '케이크 진열장', value: 1600000 });
    vit.shelfY.forEach((y, i) => C.cake(b, { at: [-5.0, y, -4.1], name: i === 2 ? '웨딩 케이크' : '생크림 케이크', value: i === 2 ? 450000 : 60000 }));
    // florist: buckets of flowers, pots on a stand
    for (const [x, c] of [[-3.4, '#7fb8d8'], [-2.6, '#c9a0dc'], [-1.8, '#7fb8d8']] as const) C4.flowerBucket(b, { at: [x, 0, -3.9], color: c, interactable: false });
    // a low picket keeps paws (not falling cabinets) away from the buckets
    const pk = new THREE.Group();
    for (let i = 0; i < 9; i++) pk.add(mesh(box(0.08, 0.55, 0.08, 0.01), M('#ffffff'), { pos: [-3.85 + i * 0.3, 0.27, 0] }));
    pk.add(mesh(box(2.6, 0.06, 0.06, 0.01), M('#ffffff'), { pos: [-2.6, 0.42, 0] }));
    b.deco(pk);
    pk.position.z = -3.15;
    const sh = C4.saleStand(b, { x0: 1.0, x1: 3.0, z: -4.2, d: 1.0, h: 0.6, color: '#c98a5a' });
    for (let i = 0; i < 3; i++) C3.flowerPot(b, { at: [1.3 + i * 0.7, sh, -4.2], rot: i });
    // the electronics shop's sidewalk sale, all on one extension cord
    const strip = C3.powerStrip(b, { at: [-0.7, 0, -3.0], rot: 0.2 });
    const tvh = C4.saleStand(b, { x0: 5.4, x1: 13.2, z: -4.4, d: 1.1, h: 0.7, color: '#ff6b6b' });
    const tvs = [6.6, 9.3, 12.0].map((x) => C.tv(b, { at: [x, tvh, -4.4], name: '세일 TV', value: 1200000 }));
    strip.strip.plugged.push(...tvs);
    // the illegally parked boss's car, under the neon sign
    C3.car(b, { at: [9.0, 0, -2.3], parked: true, color: '#2f3142', name: '사장님 차', value: 18000000, worth: { owner: '전자상가 사장님' } });
    const sign = C4.neonSign(b, { at: [9.0, 4.6, -2.3], text: '반짝', name: '반짝전자 네온 간판' });
    strip.strip.onShort = (game, by) => {
      // the neon is on the same cord: it sparks, and the old bracket gives
      sign.cause = by; sign.causeCat = false; sign.activeSwat = game.swatIndex;
      game.unpin(sign);
      game.emit({ type: 'word', text: '끼익… 간판이!', pos: sign.center(new THREE.Vector3()).add(new THREE.Vector3(0, 1, 0)), size: 1.1, color: '#ffd23f' });
    };
    // street furniture
    streetLamp(b, -12.5, -1.8);
    streetLamp(b, 5.0, 5.6);
    tree(b, -12.6, 5.8, 0.7);
    tree(b, 12.6, 5.8, 0.7);
    C3.wheelieBin(b, { at: [-12.4, 0, -2.6] });
    C3.cone3(b, { at: [4.4, 0, -1.8] });
    b.actor('꽃집 사장', FLORIST, 1.8, 0, -2.6, -Math.PI / 2, [0, -1]);
    b.watcher('꽃집 사장', { range: 9, half: 0.55, cycle: [[3, 0], [2.5, -1.4], [2.5, 0.6]], patrol: [[1.8, -2.6, 6], [0.2, -5.4, 5, 1]] });
    b.cat(-6, 0, 0.5);
  },
};

export const CH8: LevelDef[] = [S8_1, S8_2, S8_3, S8_4];
