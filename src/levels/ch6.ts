import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { LevelDef } from '../game/types';
import { block, buildHouse, cabinet, doorOn, posterOn, rug, sofa, table, windowOn } from './house';
import { BATH, bathtub, bedFrame, furnishBathroom, furnishKitchen, furnishLiving, rect, toilet } from './rooms';
import { entranceTiles, fixTrailNormals, floodOnBreak, fridge, hooksOn, mirrorOn, shoeCabinet } from './rooms_house';

/* ================================================================== */
/* 6-1  현관의 거인 – a chain can travel through a doorway             */
/* ================================================================== */

const S6_1: LevelDef = {
  id: '6-1', chapter: 6, theme: 'house', title: '현관의 거인', subtitle: '현관 괘종시계가 거실 쪽을 내려다보고 있다',
  paws: 2,
  goal: { kind: 'break', text: '거실의 새 TV를 박살내라', short: 'TV 부수기' },
  stars: [1700000, 1800000],
  challenges: [
    { type: 'cause', victim: 'tv', culprit: 'coatRack', text: '옷걸이 → 괘종시계 → TV 연쇄' },
    { type: 'paws', max: 1 },
    { type: 'stat', key: 'break', min: 5, text: '물건 5개 이상 부수기' },
  ],
  tip: '방과 방은 문으로 이어져 있어요. 현관에서 시작한 장난이 거실까지 갈 수 있을까요?',
  hints: ['괘종시계 위쪽을 눌러 거실 문 쪽으로 세게 밀어 보세요.', '옷걸이가 쓰러지면 괘종시계를 밀어줘요. 문을 정확히 겨냥해요!', '옷걸이 → 괘종시계 → TV, 한 번에! 남은 앞발은 보너스예요.'],
  hintMove: { prop: 'grandClock', dir: [1, 0] },
  tutorial: [
    { text: '괘종시계는 나무처럼 쓰러져요. 위쪽을 눌러 거실 문 쪽으로 세게!', prop: 'grandClock', dir: [1, 0] },
    { text: '문을 지나 거실까지 와장창! 남은 앞발로 더 어지럽혀 봐요.', prop: 'roomba', dir: [-1, 0] },
  ],
  start: [-4.5, 1],
  ownerLine: '현관부터 거실까지… 이게 다 뭐야?!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('hall', '현관', -7.25, 0, 5.5, 7.5, 'herring', 'hall'), rect('living', '거실', -0.5, 0, 8, 7.5, 'wood', 'mint')],
      doors: [{ x: -4.5, z: 0.9, w: 2.4 }],
      base: '#8e6a8f',
    });
    // --- hallway
    doorOn(b, { x: -10 }, -1.2, '#c98a5a');
    b.ownerAtDoor(-9.1, 0, -1.2, Math.PI / 2);
    entranceTiles(b, -10, -8.4, -2.6, 0.2);
    const sc = shoeCabinet(b, -7.0, -3.25, 2.6, 0.9, 1.5);
    mirrorOn(b, { z: -3.75 }, -7.0, 3.3);
    hooksOn(b, { x: -10 }, 2.2, 3.6, 3);
    C.plant(b, { at: [-8.0, sc, -3.2], color: '#5ec4c9' });
    C.vase(b, { at: [-7.2, sc, -3.2], color: '#ffd23f', value: 90000, name: '현관 꽃병' });
    C.piggy(b, { at: [-6.3, sc, -3.15], rot: 1.4 });
    C2.coatRack(b, { at: [-8.7, 0, 0.9] });
    C2.grandClock(b, { at: [-6.2, 0, 0.9], rot: Math.PI / 2 });
    const st = C.sideTable(b, { at: [-7.6, 0, -1.4], h: 1.5, r: 0.5, color: '#b9825a' });
    C.vase(b, { at: [-7.6, st.top, -1.4], color: '#4f86c6', value: 150000, tall: true, name: '도자기 화병' });
    C2.umbrellaStand(b, { at: [-9.3, 0, 2.9] });
    C2.shoe(b, { at: [-9.2, 0, -0.4], rot: 0.3, color: '#e05a5a' });
    C2.shoe(b, { at: [-8.8, 0, -0.6], rot: -0.2, color: '#e05a5a' });
    C2.shoe(b, { at: [-7.6, 0, 2.6], rot: 1.2, color: '#4f86c6' });
    // --- living room
    windowOn(b, { z: -3.75 }, 0.2, 4.3, 2.4, 2.2, false, '#ff9f87');
    posterOn(b, { z: -3.75 }, -2.8, 4.4, 1.2, 1.5, ['#fff1c1', '#ff7aa8', '#4f86c6']);
    rug(b, 0.0, 0.9, 4.2, 3.6, ['#ffcf5c', '#ff8c6b', '#ffffff']);
    const tvTop = cabinet(b, -2.4, 0.9, 2.8, 0.9, 1.25, '#f4efe4', '#b9825a', 1, Math.PI / 2);
    // the TV is bolted to its stand: paws can't tip it, only a real crash breaks it
    const tv = C.tv(b, { at: [-2.45, tvTop, 0.9], rot: Math.PI / 2, target: true, name: '새 TV' });
    tv.body.setEnabledRotations(false, true, false, true);
    sofa(b, 2.45, 0.9, -Math.PI / 2, '#ff8c6b');
    const ct = table(b, -0.55, 0.9, 1.6, 2.8, 1.2, '#b9825a', '#8e5f3e');
    C.vase(b, { at: [-1.0, ct, 0.25], color: '#ff8fa3', value: 100000 });
    C.teapot(b, { at: [-1.05, ct, 1.15], color: '#ffffff' });
    C.mug(b, { at: [-1.05, ct, 1.85], color: '#5ec4c9', name: '찻잔' });
    C.mug(b, { at: [-0.2, ct, 1.6], color: '#5ec4c9', name: '찻잔' });
    C.plate(b, { at: [-0.15, ct, 0.6] });
    C.floorLamp(b, { at: [-1.0, 0, -1.3] });
    C.plant(b, { at: [3.0, 0, -3.1] });
    C.cushion(b, { at: [2.6, 1.36, 2.2], color: '#ffd23f', rot: 0.3 });
    C.roomba(b, { at: [0.6, 0, 3.0] });
    b.cat(-5.2, 0, 3.0);
  },
};

/* ================================================================== */
/* 6-2  로켓 택배 – low interior walls: flying things cross them       */
/* ================================================================== */

const S6_2: LevelDef = {
  id: '6-2', chapter: 6, theme: 'house', title: '로켓 택배', subtitle: '혼수 그릇은 주방 꼭대기 선반에. 탄산음료는 거실에',
  paws: 2,
  goal: { kind: 'break', text: '주방 높은 선반의 혼수 그릇 3개를 깨뜨려라', short: '혼수 그릇' },
  stars: [350000, 600000],
  challenges: [
    { type: 'cause', victim: 'teapot', culprit: 'domino', text: '주방 도미노 → 거실 로켓 → 혼수 찻주전자' },
    { type: 'paws', max: 1 },
    { type: 'chain', n: 30 },
  ],
  tip: '방 사이 벽은 낮아요. 날아가는 물건은 벽을 넘어 옆방까지 갈 수 있어요.',
  hints: ['주방 선반은 너무 높아요. 거실의 탄산음료를 흔들면 로켓이 돼요!', '탄산 로켓은 멀리 갈수록 높이 올라가요. 거실에서 주방 선반 쪽으로 곧장!', '주방에서 시작하는 도미노를 쓰러뜨리면… 문을 지나 거실의 탄산음료까지!'],
  hintMove: { prop: 'soda', dir: [0, -1] },
  start: [0, 0.5],
  ownerLine: '혼수 그릇이… 거실에서 날아온 거야?!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('kitchen', '주방', 0, -3.75, 8, 7.5, 'checker', 'butter'), rect('living', '거실', 0, 3.75, 8, 7.5, 'wood', 'mint')],
      doors: [{ x: -2.4, z: 0, w: 2.0 }],
      base: '#7f6aa6',
    });
    // --- kitchen (back room)
    furnishKitchen(b, 0, -3.75, { shelf: false, fridge: false, table: false, backWall: false });
    fridge(b, -3.0, -6.6);
    windowOn(b, { x: -4 }, -3.2, 4.0, 1.8, 1.3, false, '#ff9fc0');
    const sh = C.wallShelf(b, { at: [1.2, 5.45, -7.1], w: 4.6, d: 0.75, pinned: 70, color: '#e0a46d' });
    C.plate(b, { at: [-0.3, sh.top, -7.05], target: true, color: '#fff4d6', name: '혼수 그릇' });
    C.wineGlass(b, { at: [0.8, sh.top, -7.1], wine: null, target: true, name: '크리스탈 잔' });
    C.teapot(b, { at: [1.9, sh.top, -7.05], target: true, color: '#fff4d6', name: '혼수 찻주전자' });
    C.vase(b, { at: [2.9, sh.top, -7.1], color: '#9fd8cb', value: 60000, flowers: false });
    const ct = 2.6;
    C.eggCarton(b, { at: [0.3, ct, -6.5], eggs: 6 });
    C.flourBag(b, { at: [1.6, ct, -6.6] });
    C.bottle(b, { at: [2.7, ct, -6.5], color: '#5bb98c' });
    C.cup(b, { at: [3.5, ct, -6.35], juice: '#ffb347' });
    const tt = table(b, 1.2, -2.7, 3.0, 1.8, 2.3, '#f4efe4', '#b9825a');
    C.tablecloth(b, { at: [1.2, tt, -2.7], w: 2.8, d: 1.65, tableTop: tt, floorY: 0 });
    C.plate(b, { at: [0.4, tt + 0.05, -3.1] });
    C.plate(b, { at: [2.0, tt + 0.05, -3.1] });
    C.cake(b, { at: [1.2, tt + 0.05, -2.5] });
    C.wineGlass(b, { at: [0.5, tt + 0.05, -2.25] });
    // --- living room (front room)
    doorOn(b, { x: -4 }, 6.3, '#ef8a5b');
    b.ownerAtDoor(-3.1, 0, 6.3, Math.PI / 2);
    posterOn(b, { x: -4 }, 1.6, 4.4, 1.3, 1.7, ['#fff1c1', '#ff7aa8', '#4f86c6']);
    rug(b, 0, 4.0, 4.4, 3.4, ['#ffcf5c', '#ff8c6b', '#ffffff']);
    const tvTop = cabinet(b, -3.45, 3.6, 2.8, 0.9, 1.25, '#f4efe4', '#b9825a', 1, Math.PI / 2);
    C.tv(b, { at: [-3.5, tvTop, 3.6], rot: Math.PI / 2, value: 600000 });
    sofa(b, 2.75, 4.0, -Math.PI / 2, '#ff8c6b');
    const cf = table(b, -0.9, 4.6, 1.6, 2.2, 1.2, '#b9825a', '#8e5f3e');
    C.vase(b, { at: [-1.1, cf, 4.2], color: '#ff8fa3', value: 100000 });
    C.mug(b, { at: [-0.6, cf, 5.1], color: '#ffd23f' });
    C.cushion(b, { at: [2.6, 1.36, 5.3], color: '#5ec4c9', rot: 0.2 });
    C.roomba(b, { at: [1.0, 0, 6.2] });
    // the domino run: kitchen → doorway → living-room soda (aimed back at the kitchen shelf)
    C.dominoPath(b, [[-3.2, -2.9], [-2.6, -1.2], [-2.4, 0], [-2.1, 1.4], [-0.6, 2.6], [0.45, 3.2]], 0, 0.3);
    C.soda(b, { at: [0.85, 0, 3.2], aim: [0, -1] });
    b.cat(2.4, 0, 6.8);
  },
};

/* ================================================================== */
/* 6-3  물바다 – the aquarium floods the hallway (and the bathroom)    */
/* ================================================================== */

const S6_3: LevelDef = {
  id: '6-3', chapter: 6, theme: 'house', title: '물바다 복도', subtitle: '복도 수조에 금붕어가 산다. 집사의 기계들은 물을 싫어한다',
  paws: 3,
  goal: { kind: 'dunk', text: '집사의 전자기기 3개를 물에 빠뜨려라', short: '기계 풍덩' },
  stars: [2500000, 2700000],
  challenges: [
    { type: 'indirect', text: '기계를 직접 건드리지 않고 클리어' },
    { type: 'paws', max: 2 },
    { type: 'stat', key: 'tpLen', min: 6, text: '선풍기로 휴지 6m 풀기' },
  ],
  tip: '수조가 깨지면 복도가 물바다가 돼요. 바닥에 떨어진 기계는… 풍덩!',
  hints: ['욕조 말고도 물은 있어요. 복도 수조를 떨어뜨려 보세요!', '선풍기를 켜면 가벼운 물건이 복도를 따라 날아가요.', '옷걸이가 쓰러지면 수조까지 닿아요. 물바다 + 바람 = 한 방에 끝!'],
  start: [1.5, 1.5],
  ownerLine: '복도가 수영장이 됐어…! 내 폰!!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('bath', '욕실', -4.1, 0, 7.4, 7.5, 'tile', 'bath'), rect('hall', '복도', 4.3, 2.0, 9.4, 3.5, 'herring', 'hall')],
      doors: [{ x: -0.4, z: 2.0, w: 2.0 }],
      base: '#5c8fb0',
    });
    furnishBathroom(b, -4.1, -0.45);
    // --- corridor (back wall z = 0.25)
    const con = shoeCabinet(b, 7.7, 0.75, 2.2, 0.9, 1.5, 0, '#f4efe4', '#8e5f3e');
    const aq = C2.aquarium(b, { at: [7.7, con, 0.72] });
    floodOnBreak(aq, { x0: -4.6, x1: 9, z0: 0.37, z1: 3.75 });
    C2.phone(b, { at: [7.75, con + 1.08, 0.75], target: true, rot: Math.PI / 2 + 0.15, name: '태블릿', color: '#4f86c6', value: 700000 });
    mirrorOn(b, { z: 0.25 }, 5.2, 3.6, 1.0, 1.4);
    hooksOn(b, { z: 0.25 }, 1.6, 3.6, 3);
    const bench = shoeCabinet(b, 3.4, 0.65, 2.0, 0.8, 0.9, 0, '#b9825a', '#f4efe4');
    C2.phone(b, { at: [3.75, bench, 0.7], target: true, rot: 1.2, name: '집사 폰' });
    C2.perfume(b, { at: [4.15, bench, 0.55], rot: 0.3 });
    C2.perfume(b, { at: [3.0, bench, 0.6], color: '#b9a0ff', rot: -0.2 });
    C.cup(b, { at: [2.7, bench, 0.85], juice: '#ffb347' });
    C2.standFan(b, { at: [6.2, 0, 1.55], rot: -Math.PI / 2 });
    C2.coatRack(b, { at: [5.6, 0, 3.1] });
    C2.umbrellaStand(b, { at: [0.6, 0, 0.8] });
    C2.shoe(b, { at: [3.0, 0, 2.0], rot: 1.4, color: '#e05a5a' });
    C2.shoe(b, { at: [3.4, 0, 2.4], rot: 1.7, color: '#e05a5a' });
    C2.shoe(b, { at: [1.6, 0, 2.9], rot: 0.4, color: '#4f86c6' });
    C.rubberBall(b, { at: [4.6, 0, 2.6], color: '#ffd23f' });
    // a spare toilet roll: the fan sends it unrolling down the corridor (damped so it stops in the end)
    const roll = C2.toiletPaper(b, { at: [4.8, 0, 1.6] });
    roll.body.setAngularDamping(0.7);
    roll.body.setLinearDamping(0.3);
    fixTrailNormals(roll);
    // --- bathroom: the owner's earbuds case lies on the bath mat by the door
    C2.phone(b, { at: [-1.8, 0.0, 2.3], target: true, rot: 0.9, name: '게임기', color: '#ff6b6b', value: 450000 });
    C2.toiletPaper(b, { at: [-1.35, BATH.toilet.tankTop, -3.45], lying: false });
    C.rubberDuck(b, { at: [-3.3, 0, 1.4], rot: 0.5 });
    C2.shampoo(b, { at: [-7.0, BATH.tub.rim, -3.55] });
    C2.soap(b, { at: [-2.6, 0, 3.0] });
    C2.toiletPaper(b, { at: [-4.0, 0, 2.6], lying: false });
    b.cat(3.4, 0, 3.0);
  },
};

/* ================================================================== */
/* 6-4  풍선 릴레이 – wake the owner from the far end of the house      */
/* ================================================================== */

const BAL = ['#ff6b6b', '#ffd23f', '#7fd3ff', '#7bd389', '#ff9fc0', '#b9a0ff'];

const S6_4: LevelDef = {
  id: '6-4', chapter: 6, theme: 'bedroom', title: '풍선 릴레이', subtitle: '새벽 4시. 집사는 침실 맨 끝에서 코를 골고 있다',
  paws: 2,
  goal: { kind: 'wake', text: '침실 끝에서 자는 집사를 깨워라', short: '집사 깨우기' },
  stars: [150000, 400000],
  challenges: [
    { type: 'quiet', max: 5, text: '괘종시계 소음 없이 자명종으로만 깨우기' },
    { type: 'discover', id: 'jack', text: '깜짝 상자로 첫 풍선 터뜨리기' },
    { type: 'score', amount: 420000 },
  ],
  tip: '소리는 멀어질수록 작아져요. 멀리서 시작한 장난을 집사 머리맡까지 배달해 볼까요?',
  hints: ['침실 물건은 전부 푹신해요. 집사 머리 위 선반의 자명종이 보이나요?', '풍선은 터질 때 옆 풍선도 터뜨려요. 그런데 너무 높아서 앞발이 안 닿아요… 키 큰 것이나 날아가는 것을 찾아봐요.', '깜짝 상자 위의 공, 복도의 괘종시계, 탄산 로켓… 어느 쪽이든 첫 풍선만 터뜨리면 펑-펑-펑!'],
  start: [0, -2],
  ownerLine: '으아아… 누가 풍선을… 지금 몇 시야?!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('play', '아이방', -4, -3.75, 8, 7.5, 'playmat', 'play'), rect('bed', '침실', 4, -3.75, 8, 7.5, 'lilac', 'night'), rect('hall', '복도', 0, 1.75, 16, 3.5, 'herring', 'hall')],
      doors: [{ x: -4.5, z: 0, w: 2.0 }, { x: 4.6, z: 0, w: 2.0 }],
      base: '#3f3478',
    });
    // --- bedroom (right): bed at the far end, owner asleep
    bedFrame(b, 5.9, -5.35, 3.4, 4.2, 1.25, { frame: '#b9825a', sheet: '#ffffff', pillow: '#fff4f8' });
    b.ownerAsleep(5.9, 1.1, -5.85, -Math.PI / 2);
    windowOn(b, { z: -7.5 }, 2.4, 4.4, 2.0, 1.8, true, '#5b4aa8');
    cabinet(b, 3.55, -7.0, 1.1, 0.9, 1.6, '#f2b134', '#ffffff', 2);
    // the owner's alarm clock: on a high shelf just left of his head, out of paw reach
    const sh = C.wallShelf(b, { at: [4.85, 4.95, -7.15], w: 1.3, d: 0.7, pinned: 99999, color: '#b9b0ea' });
    const alarm = C.alarmClock(b, { at: [5.25, sh.top, -7.05], rot: 0.1 });
    alarm.body.setLinearDamping(1.0); // a heavy old bell clock: rings in place instead of hopping off the bouncy bed
    C.cushion(b, { at: [7.2, 1.25, -4.0], color: '#ffd23f' });
    C2.plush(b, { at: [2.2, 0, -2.0], rot: 0.6 });
    C2.pillow(b, { at: [1.6, 0, -4.6], rot: 0.3, color: '#ffe3ec' });
    // --- playroom (left)
    cabinet(b, -4.6, -7.05, 3.2, 0.9, 1.5, '#ffb3c6', '#ffffff', 2);
    rug(b, -4.0, -3.4, 4.6, 3.6, ['#a9c8ff', '#ffffff', '#ffd23f']);
    C2.plush(b, { at: [-5.6, 1.5, -7.0] });
    C2.doll(b, { at: [-3.6, 1.5, -7.0], color: '#ff9fc0', value: 120000 });
    C2.jackBox(b, { at: [-5.6, 0, -1.6], rot: 0.3 });
    C.rubberBall(b, { at: [-5.6, 0.8, -1.6], color: '#7fd3ff' });
    C2.castle(b, [-2.2, 0, -2.2], 'tower', { floors: 2 });
    // --- balloons: every one is out of paw reach (y ≥ 4.6)
    const pop = (pts: [number, number, number][], c0: number) => pts.forEach(([x, y, z], i) => C2.balloon(b, { at: [x, y, z], anchor: [x, 0, z], length: y - 0.42, color: BAL[(i + c0) % BAL.length] }));
    // playroom branch: above the jack-in-the-box → across the playroom → over the wall → bed
    pop([[-5.4, 4.62, -3.6], [-3.9, 4.72, -4.6], [-2.4, 4.85, -5.0], [-0.9, 4.95, -5.2], [0.8, 5.05, -5.9], [2.5, 5.15, -6.4], [3.7, 5.25, -6.4]], 0);
    // hallway branch: right above the grand clock's head → through the bedroom door → bed
    pop([[4.6, 4.75, 0.55], [4.9, 4.85, -1.3], [4.6, 4.95, -3.0], [3.85, 5.1, -4.9]], 3);
    // the last one is tied to the headboard, right next to the alarm clock
    C2.balloon(b, { at: [4.4, 5.75, -6.95], anchor: [4.4, 2.9, -7.45], length: 2.45, color: BAL[5] });
    // --- hallway (front)
    C2.grandClock(b, { at: [4.6, 0, 1.6], value: 250000 });
    C2.coatRack(b, { at: [-1.2, 0, 1.0] });
    C2.shoe(b, { at: [-6.6, 0, 2.2], rot: 0.4 });
    C2.shoe(b, { at: [-6.2, 0, 2.6], rot: 0.2 });
    C.soda(b, { at: [0.8, 0, 2.2] });
    b.cat(0, 0, 2.6);
  },
};

/* ================================================================== */
/* 6-5  와장창 대참사 – the whole house, several big cross-room chains */
/* ================================================================== */

const S6_5: LevelDef = {
  id: '6-5', chapter: 6, theme: 'house', title: '와장창 대참사', subtitle: '집사는 주말여행. 온 집안이 내 놀이터다냥',
  paws: 3,
  goal: { kind: 'score', amount: 2800000, text: '피해액 ₩2,800,000 달성', short: '대참사' },
  stars: [3300000, 3650000],
  challenges: [],
  tip: '방마다 큰 장치가 하나씩! 한 번의 장난이 몇 개의 방을 지나갈 수 있을까요?',
  hints: ['복도 괘종시계는 어느 쪽으로 넘어지느냐에 따라 결과가 달라져요. 거실 TV? 아니면 수조?', '아이방 도미노 끝에 탄산음료가 있어요. 로켓은 낮은 벽을 넘어 주방 선반까지 날아가요!', '옷걸이 → 괘종시계 → 수조 → 물바다 → 바닥의 기계들. 복도를 한 번에!'],
  start: [-1, 0.5],
  ownerLine: '여행 다녀왔더니… 집이… 우리 집이…!!',
  build(b) {
    buildHouse(b, {
      rooms: [
        rect('kitchen', '주방', -3.5, -4.5, 7, 6, 'checker', 'butter'),
        rect('bath', '욕실', 3.5, -4.5, 7, 6, 'tile', 'bath'),
        rect('hall', '복도', 0, 0, 14, 3, 'herring', 'hall'),
        rect('living', '거실', -3.5, 4.5, 7, 6, 'wood', 'mint'),
        rect('play', '아이방', 3.5, 4.5, 7, 6, 'playmat', 'play'),
      ],
      doors: [{ x: -2.9, z: 1.5, w: 2.0 }, { x: 3.6, z: 1.5, w: 2.0 }, { x: -1.4, z: -1.5, w: 1.8 }, { x: 5.0, z: -1.5, w: 1.8 }],
      base: '#8e6a8f',
    });
    // --- hallway: aquarium ← grand clock ← coat rack, a topple line along -x
    doorOn(b, { x: -7 }, 0, '#c98a5a');
    b.ownerAtDoor(-6.1, 0, 0, Math.PI / 2);
    // (the tank overhangs a slim console so the falling clock knocks it off and still hits the floor)
    const con = shoeCabinet(b, -5.75, -1.05, 2.2, 0.6, 1.0, 0, '#f4efe4', '#8e5f3e');
    const aq = C2.aquarium(b, { at: [-5.8, con, -0.85] });
    floodOnBreak(aq, { x0: -7, x1: 0.6, z0: -1.38, z1: 1.38 });
    C2.grandClock(b, { at: [-2.9, 0, -0.2], rot: Math.PI / 2 });
    C2.coatRack(b, { at: [-0.2, 0, -0.2], rot: Math.PI / 2 });
    // the owner left his gadgets charging on the hallway floor
    C2.phone(b, { at: [-4.2, 0, 0.85], rot: 0.4, name: '집사 폰' });
    C2.phone(b, { at: [-1.5, 0, 0.95], rot: 1.2, name: '게임기', color: '#ff6b6b', value: 450000 });
    C2.umbrellaStand(b, { at: [6.55, 0, 1.0] });
    C2.shoe(b, { at: [-6.4, 0, 0.55], rot: 0.3, color: '#e05a5a' });
    C2.shoe(b, { at: [-6.0, 0, 0.75], rot: -0.2, color: '#e05a5a' });
    // --- living room (front-left): the TV stands right behind the doorway
    posterOn(b, { x: -7 }, 4.4, 4.2, 1.3, 1.6, ['#fff1c1', '#ff7aa8', '#4f86c6']);
    sofa(b, -6.05, 4.7, Math.PI / 2, '#ff8c6b');
    rug(b, -3.9, 4.7, 3.6, 3.2, ['#ffcf5c', '#ff8c6b', '#ffffff']);
    const tvTop = cabinet(b, -2.6, 3.7, 2.6, 0.9, 1.25, '#f4efe4', '#b9825a', 1, -Math.PI / 2);
    const tv = C.tv(b, { at: [-2.55, tvTop, 3.7], rot: -Math.PI / 2, name: '새 TV' });
    tv.body.setEnabledRotations(false, true, false, true); // bolted to the stand
    const cf = table(b, -4.3, 4.7, 1.3, 2.2, 1.2, '#b9825a', '#8e5f3e');
    C.vase(b, { at: [-4.3, cf, 4.0], color: '#ff8fa3', value: 100000 });
    C.teapot(b, { at: [-4.35, cf, 4.9], color: '#ffffff' });
    C.mug(b, { at: [-4.0, cf, 5.5], color: '#5ec4c9', name: '찻잔' });
    C.floorLamp(b, { at: [-1.0, 0, 5.9] });
    C.cushion(b, { at: [-6.0, 1.36, 5.9], color: '#ffd23f', rot: 0.3 });
    C.roomba(b, { at: [-3.3, 0, 6.6] });
    // --- kitchen (back-left): fine china on a shelf nobody can reach
    windowOn(b, { x: -7 }, -4.5, 4.2, 1.8, 1.4, false, '#ff9fc0');
    block(b, -3.6, -6.75, 5.0, 1.5, 2.6, '#7fc8b8', '#fdfbf5');
    const sh = C.wallShelf(b, { at: [-3.6, 5.0, -7.1], w: 4.2, d: 0.75, pinned: 70, color: '#e0a46d' });
    C.plate(b, { at: [-5.1, sh.top, -7.05], color: '#fff4d6', name: '혼수 그릇' });
    C.wineGlass(b, { at: [-4.1, sh.top, -7.1], wine: null, name: '크리스탈 잔' });
    C.teapot(b, { at: [-3.1, sh.top, -7.05], color: '#fff4d6', name: '혼수 찻주전자' });
    C.vase(b, { at: [-2.1, sh.top, -7.1], color: '#9fd8cb', value: 60000, flowers: false });
    C.eggCarton(b, { at: [-4.7, 2.6, -6.5], eggs: 6 });
    C.flourBag(b, { at: [-3.5, 2.6, -6.6] });
    C.toaster(b, { at: [-2.2, 2.6, -6.9] });
    // (kept small and away from the hallway: a pulled cloth sweeps ~its length past the table)
    const kt = table(b, -4.4, -4.3, 2.2, 1.4, 2.3, '#f4efe4', '#b9825a');
    C.tablecloth(b, { at: [-4.4, kt, -4.3], w: 2.0, d: 1.3, tableTop: kt, floorY: 0 });
    C.plate(b, { at: [-5.0, kt + 0.05, -4.55] });
    C.plate(b, { at: [-3.8, kt + 0.05, -4.55] });
    C.cake(b, { at: [-4.4, kt + 0.05, -4.05] });
    // --- bathroom (back-right)
    windowOn(b, { z: -7.5 }, 2.3, 4.6, 1.4, 1.0, false, '#9fd8cb');
    toilet(b, 1.1, -6.9);
    const vt = cabinet(b, 2.65, -7.0, 1.4, 0.9, 1.9, '#9fd8cb', '#ffffff', 2);
    C2.perfume(b, { at: [2.3, vt, -6.95] });
    C2.perfume(b, { at: [2.9, vt, -6.9], color: '#b9a0ff' });
    bathtub(b, 3.6, 6.8, -7.4, -5.8, 1.25, 0.95);
    C2.hairDryer(b, { at: [5.9, 0, -4.4], rot: -Math.PI / 2 - 0.4 });
    C.rubberDuck(b, { at: [4.6, 0, -4.0], rot: 0.4 });
    C2.toiletPaper(b, { at: [1.1, 2.05, -7.35], lying: false });
    // --- playroom (front-right): domino snake → soda aimed over two walls at the kitchen shelf
    rug(b, 3.6, 4.6, 4.6, 3.6, ['#a9c8ff', '#ffffff', '#ffd23f']);
    const ct = C2.castle(b, [5.8, 0, 5.8], 'tower', { floors: 2, rot: Math.PI / 2 });
    C2.doll(b, { at: [5.8, ct, 5.8], value: 150000, name: '도자기 인형' });
    C.dominoPath(b, [[1.2, 6.7], [2.3, 5.7], [3.6, 5.3], [4.8, 4.5], [5.0, 3.4], [4.65, 2.75]], 0, 0.3);
    C.soda(b, { at: [4.4, 0, 2.4], aim: [-0.62, -0.78] });
    C2.plush(b, { at: [1.0, 0, 3.0], rot: 0.8 });
    C.rubberBall(b, { at: [6.2, 0, 2.6], color: '#ffd23f' });
    b.cat(0.6, 0, 0.8);
  },
};

export const CH6: LevelDef[] = [S6_1, S6_2, S6_3, S6_4, S6_5];
