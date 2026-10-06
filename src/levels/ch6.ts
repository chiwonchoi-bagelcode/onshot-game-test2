import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { LevelDef } from '../game/types';
import { buildHouse, cabinet, doorOn, posterOn, rug, sofa, table, windowOn } from './house';
import { BATH, furnishBathroom, furnishKitchen, furnishLiving, rect } from './rooms';
import { entranceTiles, floodOnBreak, fridge, hooksOn, mirrorOn, shoeCabinet } from './rooms_house';

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
    C2.coatRack(b, { at: [3.0, 0, 0.6] });
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
  stars: [600000, 700000],
  challenges: [],
  tip: '수조가 깨지면 복도가 물바다가 돼요. 바닥에 있는 기계는… 풍덩!',
  hints: ['욕조 말고도 물은 있어요. 복도 수조를 떨어뜨려 보세요!', '선풍기를 켜면 가벼운 물건이 복도를 따라 날아가요.', '옷걸이가 쓰러지면 수조까지 닿아요. 물바다 + 바람 = 한 방에 끝!'],
  start: [0.5, 0],
  ownerLine: '복도가 수영장이 됐어…! 내 폰!!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('bath', '욕실', -3.7, 0, 7.4, 7.5, 'tile', 'bath'), rect('hall', '복도', 2.5, 0, 5, 7.5, 'herring', 'hall')],
      doors: [{ x: 0, z: 1.6, w: 2.2 }],
      base: '#5c8fb0',
    });
    furnishBathroom(b, -3.7, -0.45);
    // --- hallway
    const con = shoeCabinet(b, 2.6, -3.25, 2.8, 0.9, 1.5, 0, '#f4efe4', '#8e5f3e');
    mirrorOn(b, { z: -3.75 }, 1.2, 3.6, 1.0, 1.4);
    const aq = C2.aquarium(b, { at: [2.3, con, -3.25] });
    floodOnBreak(aq, { x0: 0.12, x1: 5, z0: -3.75, z1: 3.75 });
    C2.phone(b, { at: [3.55, con, -3.2], target: true, rot: 0.3, name: '태블릿', color: '#4f86c6' });
    C2.coatRack(b, { at: [3.0, 0, 0.6] });
    C2.standFan(b, { at: [4.3, 0, 2.2], rot: -Math.PI / 2 });
    const bench = shoeCabinet(b, 2.6, 3.2, 2.2, 0.8, 0.9, 0, '#b9825a', '#f4efe4');
    C2.phone(b, { at: [2.9, bench, 3.2], target: true, rot: 1.2, name: '집사 폰' });
    C2.shoe(b, { at: [2.0, 0, 2.2], rot: 1.4, color: '#e05a5a' });
    C2.shoe(b, { at: [1.5, 0, 2.5], rot: 1.7, color: '#e05a5a' });
    C2.umbrellaStand(b, { at: [4.4, 0, -2.6] });
    // --- bathroom
    C2.phone(b, { at: [-2.4, BATH.vanity.top, -3.0], target: true, rot: 0.2, name: '게임기', color: '#ff6b6b' });
    C2.toiletPaper(b, { at: [-0.95, BATH.toilet.tankTop, -3.45], lying: false });
    C.rubberDuck(b, { at: [-5.2, 0, 0.6], rot: 0.5 });
    C2.shampoo(b, { at: [-6.6, BATH.tub.rim, -3.55] });
    C2.soap(b, { at: [-3.6, 0, 1.2] });
    b.cat(3.4, 0, 1.0);
  },
};

export const CH6: LevelDef[] = [S6_1, S6_2, S6_3];
