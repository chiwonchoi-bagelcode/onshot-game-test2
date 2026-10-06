import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { LevelDef } from '../game/types';
import { furnishKitchen, kitchen, KITCHEN, rect } from './rooms';
import { buildHouse, cabinet, clockOn, doorOn, rug, table, windowOn } from './house';

const K = KITCHEN;

const S2_1: LevelDef = {
  id: '2-1', chapter: 2, theme: 'kitchen', title: '식탁보의 마술', subtitle: '정성껏 차린 저녁상. 너무 가지런하다…',
  paws: 2,
  goal: { kind: 'break', count: 4, text: '접시 4개를 모두 깨뜨려라', short: '접시 깨기' },
  stars: [360000, 440000],
  challenges: [
    { type: 'paws', max: 1 },
    { type: 'chain', n: 20, text: '한 번에 연쇄 x20 (살살 당길수록 길게!)' },
    { type: 'count', kind: 'bottle', n: 2, text: '와인병과 샴페인 모두 깨기' },
  ],
  tip: '식탁보 같은 특별한 물건은 겨눌 때 ✨표시가 떠요. 끄는 세기에 따라 다르게 반응해요.',
  hints: [
    '식탁보를 잡아당겨 보세요!',
    '짧게 살살 당기면 전부 끌려 떨어지고, 길게 확 잡아빼면… 그릇은 그대로 남는 마술이 돼요.',
    '아주 살살 당길수록 연쇄가 길어져요. 남은 앞발로 조리대 위 샴페인까지 깨면 별 셋!',
  ],
  hintMove: { prop: 'cloth', dir: [0, 1] },
  tutorial: [
    { text: '식탁보는 특별한 물건! 짧게 살살 끌면 위에 있는 게 전부 끌려가요.', prop: 'cloth', dir: [0, 1] },
    { text: '잘했어요! 남은 앞발로 조리대 위 샴페인도 떨어뜨려 봐요.', prop: '샴페인', dir: [0, 1] },
  ],
  ownerLine: '저녁상이…! 손님 오시는데?!',
  build(b) {
    kitchen(b);
    const T = K.table;
    const y = T.top + 0.05;
    C.tablecloth(b, { at: [T.x, T.top, T.z], w: T.w - 0.2, d: T.d - 0.15, tableTop: T.top, floorY: 0 });
    for (const [dx, dz] of [[-1.2, -0.5], [1.2, -0.5], [-1.2, 0.5], [1.2, 0.5]]) C.plate(b, { at: [T.x + dx, y, T.z + dz], target: true, name: '접시' });
    C.cake(b, { at: [T.x, y, T.z] });
    C.wineGlass(b, { at: [T.x - 0.55, y, T.z - 0.65] });
    C.wineGlass(b, { at: [T.x + 0.55, y, T.z + 0.65] });
    C.bottle(b, { at: [T.x + 0.6, y, T.z - 0.55] });
    C.toaster(b, { at: [2.9, K.counter.top, -2.75] });
    C.marbleJar(b, { at: [0.3, K.counter.top, -2.7] });
    C.bottle(b, { at: [1.75, K.counter.top, -2.55], name: '샴페인', color: '#ffd23f', value: 90000 });
    C.fruit(b, { at: [3.6, K.counter.top, -2.6], kind: 'orange' });
    b.cat(3.0, 0, 3.0);
  },
};

const S2_2: LevelDef = {
  id: '2-2', chapter: 2, theme: 'kitchen', title: '달걀 대소동', subtitle: '내일 아침 오믈렛 재료… 였던 것',
  paws: 3,
  goal: { kind: 'break', count: 8, text: '달걀 8개를 깨뜨려라', short: '달걀 깨기' },
  stars: [110000, 150000],
  challenges: [
    { type: 'paws', max: 2 },
    { type: 'cause', victim: 'egg', culprit: 'flour', text: '밀가루 봉지로 달걀판 밀어내기' },
    { type: 'count', kind: 'egg', n: 10, text: '달걀 10개 전부 깨기' },
  ],
  tip: '굴러가는 물건은 한 줄로 늘어선 것들을 한꺼번에 쓸어버려요.',
  hints: [
    '달걀판을 조리대 밖으로 살짝 밀어 보세요. 너무 세게 치면 식탁 위에 사뿐히 착지해요!',
    '밀대를 굴리면 식탁 끝에 줄 선 달걀을 한 번에 쓸어요.',
    '달걀판 뒤의 밀가루 봉지를 밀면? 봉지가 달걀판까지 밀어내고 펑! 앞발 2번으로 별 셋.',
  ],
  hintMove: { prop: 'carton', dir: [0, 1] },
  build(b) {
    kitchen(b);
    const ct = K.counter.top, tt = K.table.top;
    C.eggCarton(b, { at: [1.0, ct, -2.29], eggs: 6, targetEggs: true });
    C.flourBag(b, { at: [1.0, ct, -3.15], value: 30000 });
    C.marbleJar(b, { at: [3.4, ct, -2.75] });
    C.toaster(b, { at: [-1.2, ct, -2.75] });
    // eggs lined up along the table edge, a rolling pin right behind them
    C.rollingPin(b, { at: [1.0, tt, 1.45] });
    for (let i = 0; i < 4; i++) C.egg(b, { at: [0.4 + i * 0.4, tt, 2.0], target: true });
    C.cup(b, { at: [2.4, tt, 0.6], juice: '#ffffff', name: '우유잔' });
    C.plate(b, { at: [-0.2, tt, 0.8] });
    C.roomba(b, { at: [-2.4, 0, 1.4] });
    b.cat(3.0, 0, 3.0);
  },
};

const S2_3: LevelDef = {
  id: '2-3', chapter: 2, theme: 'kitchen', title: '높은 선반 작전', subtitle: '고양이 손 안 닿는 선반에 귀한 그릇을 숨겼다',
  paws: 3,
  goal: { kind: 'break', count: 3, text: '높은 선반의 그릇 3개를 깨뜨려라', short: '선반 그릇' },
  stars: [290000, 370000],
  challenges: [
    { type: 'paws', max: 1 },
    { type: 'discover', id: 'toast', text: '토스트 발사로 선반 공격하기' },
    { type: 'discover', id: 'rocket', text: '탄산 로켓으로 선반 공격하기' },
  ],
  tip: '선반은 너무 높아요. 대신 선반을 아래에서 "쾅" 칠 방법을 찾아봐요.',
  hints: [
    '토스터를 선반 아래 벽 쪽으로 밀어 보세요. 레버가 눌리면 잠시 후 빵이 튀어 올라요!',
    '흔든 탄산음료는 로켓처럼 날아가요. 선반 쪽으로 쏘아 올려요!',
    '앞발 한 번으로 선반을 떨어뜨리고, 남은 앞발로 식탁 위 와인병과 꽃병까지 깨면 별 셋!',
  ],
  hintMove: { prop: 'toaster', dir: [0, -1] },
  build(b) {
    kitchen(b, { shelf: false });
    const S = K.shelf;
    // a wobbly wall shelf: knock it from below and it comes down
    const board = C.wallShelf(b, { at: [(S.x0 + S.x1) / 2, S.y - 0.12, S.z], w: S.x1 - S.x0, d: S.d, pinned: 70, color: '#e0a46d' });
    C.plate(b, { at: [0.25, board.top, -3.3], target: true, color: '#fff4d6', name: '혼수 그릇' });
    C.plate(b, { at: [0.25, board.top + 0.09, -3.3], target: true, color: '#fff4d6', name: '혼수 그릇' });
    C.wineGlass(b, { at: [1.2, board.top, -3.4], wine: null, target: true, name: '크리스탈 잔' });
    C.teapot(b, { at: [2.2, board.top, -3.4], target: true, name: '찻주전자' });
    C.wineGlass(b, { at: [3.1, board.top, -3.4], wine: null, target: true, name: '크리스탈 잔' });
    // counter
    C.toaster(b, { at: [1.3, K.counter.top, -2.6] });
    C.soda(b, { at: [3.55, K.counter.top, -2.5] });
    C.pot(b, { at: [2.6, K.counter.top, -3.1] });
    C.eggCarton(b, { at: [0.0, K.counter.top, -2.75], eggs: 6 });
    C.cup(b, { at: [-1.4, K.counter.top, -2.6] });
    // table
    C.fruit(b, { at: [0.4, K.table.top, 1.0], kind: 'apple' });
    C.fruit(b, { at: [0.8, K.table.top, 1.3], kind: 'orange' });
    C.bottle(b, { at: [1.8, K.table.top, 1.6] });
    C.vase(b, { at: [-0.4, K.table.top, 1.5], color: '#ff8fa3', value: 90000 });
    b.cat(3.0, 0, 3.0);
  },
};

const S2_4: LevelDef = {
  id: '2-4', chapter: 2, theme: 'kitchen', title: '아침밥 대참사', subtitle: '집사가 차린 아침 식탁. 시리얼에 우유를 붓기 직전이다',
  paws: 3,
  goal: { kind: 'break', count: 4, text: '시리얼 2개와 우유 2개를 쏟아라', short: '아침밥' },
  stars: [130000, 150000],
  challenges: [
    { type: 'paws', max: 2 },
    { type: 'cause', victim: 'milk', culprit: 'pan', text: '프라이팬으로 우유 밀어내기' },
    { type: 'discover', id: 'marbles', text: '사탕 병까지 와르르' },
  ],
  tip: '한 번에 둘씩! 미는 물건 하나로 여러 개를 함께 떨어뜨려 봐요.',
  hints: [
    '식탁보를 살살 당기면 식탁 위 아침밥이 통째로 와르르!',
    '조리대의 프라이팬을 앞으로 밀어 보세요. 앞에 놓인 시리얼과 우유를 불도저처럼 밀어내요.',
    '식탁보와 프라이팬, 앞발 두 번이면 끝! 남은 앞발로 사탕 병까지 깨면 별 셋.',
  ],
  hintMove: { prop: 'pan', dir: [0, 1] },
  ownerLine: '내 아침밥…! 출근해야 되는데!!',
  build(b) {
    kitchen(b);
    const T = K.table, tt = T.top, ct = K.counter.top;
    // breakfast for two on the table cloth
    C.tablecloth(b, { at: [T.x, tt, T.z], w: T.w - 0.2, d: T.d - 0.15, tableTop: tt, floorY: 0, color: '#9fd8cb' });
    C2.cereal(b, { at: [T.x - 0.7, tt + 0.05, T.z - 0.2], target: true, color: '#ff8fa3' });
    C2.milk(b, { at: [T.x + 0.6, tt + 0.05, T.z - 0.3], target: true });
    C.plate(b, { at: [T.x - 1.3, tt + 0.05, T.z + 0.5], color: '#ffffff', name: '시리얼 그릇' });
    C.plate(b, { at: [T.x + 1.2, tt + 0.05, T.z + 0.5], color: '#ffffff', name: '시리얼 그릇' });
    C.cup(b, { at: [T.x - 0.1, tt + 0.05, T.z + 0.6], juice: '#ffb347' });
    // counter: the frying pan sits right behind the second cereal box and milk – a bulldozer
    C2.pan(b, { at: [3.1, ct, -3.15], rot: 0 });
    C.egg(b, { at: [3.0, ct + 0.1, -3.15], name: '달걀 프라이' });
    C2.cereal(b, { at: [2.8, ct, -2.45], target: true, rot: 0 });
    C2.milk(b, { at: [3.45, ct, -2.45], target: true });
    C.toaster(b, { at: [-1.2, ct, -2.75] });
    C.marbleJar(b, { at: [0.4, ct, -2.6], name: '사탕 병' });
    C.fruit(b, { at: [1.5, ct, -2.7], kind: 'apple' });
    b.cat(3.0, 0, 3.0);
  },
};

const S2_5: LevelDef = {
  id: '2-5', chapter: 2, theme: 'kitchen', title: '망쳐진 집들이', subtitle: '주방 옆 다이닝룸에 손님상이 차려졌다. 문은 열려 있고…',
  paws: 3,
  goal: { kind: 'break', count: 5, text: '케이크와 손님용 접시 4개를 깨뜨려라', short: '집들이' },
  stars: [420000, 580000],
  challenges: [
    { type: 'paws', max: 2 },
    { type: 'count', kind: 'plate', n: 7, text: '높은 선반 도자기 접시까지 7장 와장창' },
    { type: 'cause', victim: 'cake', culprit: 'flour', text: '밀가루 봉지로 케이크 밀어내기' },
  ],
  tip: '방이 두 개! 주방에서 시작한 장난이 벽 너머 다이닝룸까지 이어질 수 있어요.',
  hints: [
    '다이닝룸 식탁보를 살살 당기면 손님용 접시가 와르르! 케이크는 주방 조리대에 있어요.',
    '낮은 칸막이벽쯤은 탄산 로켓이 훌쩍 넘어가요. 주방의 탄산음료로 다이닝룸 높은 선반을 노려 봐요.',
    '케이크 뒤의 밀가루 봉지를 밀면 케이크와 함께 펑! 로켓·식탁보·밀가루, 앞발 세 번이면 별 셋.',
  ],
  hintMove: { prop: 'cloth', dir: [-1, 0] },
  ownerLine: '손님 오시기 10분 전인데…!!',
  start: [3.5, 0.5],
  build(b) {
    buildHouse(b, {
      rooms: [rect('kitchen', '주방', 0, 0, 8, 7.5, 'checker', 'butter'), rect('dining', '다이닝룸', 7.25, 0, 6.5, 7.5, 'herring', 'hall')],
      doors: [{ x: 4, z: 1.7, w: 1.9 }],
      base: '#5c7aa6',
    });
    furnishKitchen(b, 0, 0, { table: false });
    doorOn(b, { x: -4 }, K.doorZ, '#7fb8d8');
    b.ownerAtDoor(-4 + 0.9, 0, K.doorZ, Math.PI / 2);
    const ct = K.counter.top;
    // kitchen: the party cake waits on the counter, a shaken soda next to it
    C.cake(b, { at: [2.4, ct, -2.55], target: true, name: '집들이 케이크', value: 60000 });
    C.flourBag(b, { at: [2.4, ct, -3.3] });
    C.soda(b, { at: [3.4, ct, -2.55] });
    C.toaster(b, { at: [-1.2, ct, -2.75] });
    C.eggCarton(b, { at: [0.6, ct, -2.5], eggs: 6 });
    // dining room
    windowOn(b, { z: -3.75 }, 9.3, 4.2, 1.8, 2.0, false, '#c25b5b');
    clockOn(b, { z: -3.75 }, 5.4, 5.6);
    rug(b, 7.3, 0.6, 5.0, 3.6, ['#c25b5b', '#fff1c1', '#ffd23f']);
    const tt = table(b, 7.3, 0.6, 4.2, 2.0, 2.2, '#f4efe4', '#8e5f3e');
    C.tablecloth(b, { at: [7.3, tt, 0.6], w: 4.0, d: 1.85, tableTop: tt, floorY: 0, color: '#ffffff' });
    for (const [dx, dz] of [[-1.4, -0.5], [-0.45, 0.5], [0.45, -0.5], [1.4, 0.5]]) C.plate(b, { at: [7.3 + dx, tt + 0.05, 0.6 + dz], target: true, name: '손님용 접시', color: '#fff4d6' });
    C.wineGlass(b, { at: [5.6, tt + 0.05, 1.25] });
    C.wineGlass(b, { at: [9.0, tt + 0.05, -0.05] });
    C.bottle(b, { at: [7.3, tt + 0.05, 0.6] });
    for (const [x, z, r] of [[6.2, 2.45, Math.PI], [8.4, 2.45, Math.PI], [6.2, -1.25, 0], [8.4, -1.25, 0]] as const) C.chair(b, { at: [x, 0, z], rot: r, color: '#ffcf5c' });
    // china cabinet and a fancy plate shelf (too high to reach)
    cabinet(b, 7.4, -3.25, 2.8, 0.9, 2.0, '#b9825a', '#f4efe4', 2);
    const sh = C.wallShelf(b, { at: [7.0, 4.65, -3.35], w: 3.0, d: 0.8, pinned: 100, color: '#8e5f3e' });
    for (const dx of [-1.0, 0, 1.0]) C.plate(b, { at: [7.0 + dx, sh.top, -3.3], name: '도자기 접시', color: '#9fd8cb', value: 40000 });
    C.vase(b, { at: [6.6, 2.0, -3.2], color: '#c25b5b', value: 90000 });
    C.vase(b, { at: [8.3, 2.0, -3.2], tall: true, color: '#3f6fb5', flowers: false, value: 120000 });
    b.cat(2.6, 0, 2.6);
  },
};

export const CH2: LevelDef[] = [S2_1, S2_2, S2_3, S2_4, S2_5];
