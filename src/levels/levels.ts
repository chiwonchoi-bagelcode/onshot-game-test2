import * as C from '../game/catalog';
import type { LevelDef } from '../game/types';
import { livingRoom, kitchen, bedroom, LIVING, KITCHEN, BEDROOM } from './rooms';

export const ROOMS = [
  { name: '거실', desc: '햇살 가득한 평화로운 오후', icon: '🛋️', color: '#ffb3a7' },
  { name: '주방', desc: '저녁 준비가 한창인 부엌', icon: '🍳', color: '#9fd8cb' },
  { name: '침실', desc: '집사의 방. 조용히… 아니, 시끄럽게', icon: '🌙', color: '#9b8fdd' },
];

const L = LIVING, K = KITCHEN, BR = BEDROOM;

/* ================================================================== */
/* 거실                                                               */
/* ================================================================== */

const A1: LevelDef = {
  id: 'A1', room: 'living', title: '첫 번째 장난', subtitle: '탁자 위 물건은 떨어뜨리라고 있는 거다냥',
  paws: 2,
  goal: { kind: 'break', text: '탁자 위 꽃병을 깨뜨려라', short: '꽃병 깨기' },
  stars: [150000, 190000],
  tip: '물건을 누른 채 보내고 싶은 방향으로 끌었다 놓으세요. 길게 끌수록 세게 칩니다.',
  hints: ['꽃병을 탁자 밖으로 세게 밀어보세요.', '줄 선 책을 쓰러뜨리면 도미노처럼 꽃병까지 밀어요. 남은 앞발로 머그컵도!'],
  ownerLine: '내 꽃병!! 누가 그랬어?!',
  build(b) {
    livingRoom(b);
    const y = L.coffee.top;
    C.vase(b, { at: [1.48, y, 0.55], target: true });
    C.bookRow(b, { at: [-1.05, y, 0.55], n: 4, gap: 0.5 });
    C.mug(b, { at: [-0.55, y, -0.1], color: '#ffd23f' });
    // tea set on the floor right next to the table
    C.plate(b, { at: [2.05, 0, 0.6], color: '#f7c6d9', name: '쟁반 접시' });
    C.mug(b, { at: [1.95, 0.08, 0.42], color: '#f7c6d9', name: '찻잔' });
    C.mug(b, { at: [2.2, 0.08, 0.78], color: '#f7c6d9', name: '찻잔' });
    C.plant(b, { at: [-3.4, 0, -1.3] });
    C.cushion(b, { at: [-2.3, L.sofaSeat, -2.55], color: '#5ec4c9', rot: 0.2 });
    C.cushion(b, { at: [-0.4, L.sofaSeat, -2.55], color: '#ffd23f', rot: -0.15 });
    C.rubberBall(b, { at: [2.7, 0, 1.2] });
    C.yarn(b, { at: [-1.9, 0, 1.9] });
    C.plant(b, { at: [3.2, L.tvStand.top, -3.2], color: '#5ec4c9' });
    C.pictureFrame(b, { at: [1.9, L.tvStand.top, -3.45], w: 1.1, h: 0.85, art: 2, pinned: 99999, name: '가족사진' });
    b.cat(2.6, 0, 2.6);
  },
};

const A2: LevelDef = {
  id: 'A2', room: 'living', title: 'TV 대참사', subtitle: '집사가 아끼는 새 TV… 화면이 너무 반짝인다',
  paws: 3,
  goal: { kind: 'break', text: '새 TV 화면을 박살내라', short: 'TV 부수기' },
  stars: [1040000, 1110000],
  tip: 'TV는 무거워서 앞발로는 꿈쩍도 안 할지 몰라요. 위에서 뭔가 떨어진다면…?',
  hints: ['선반 위 트로피를 TV 위로 떨어뜨려 보세요.', '탄산음료를 흔들면 로켓처럼 날아가요. 선반을 맞히면?', '스탠드 조명도 쓰러뜨릴 수 있어요. 로봇청소기는 알아서 사고를 쳐요.'],
  ownerLine: '내 TV!!! 할부도 안 끝났는데?!',
  build(b) {
    livingRoom(b);
    C.tv(b, { at: [L.tvStand.x, L.tvStand.top, L.tvStand.z + 0.2], target: true });
    // wall shelf above the TV
    const sh = C.wallShelf(b, { at: [2.35, 4.05, -3.3], w: 2.8, d: 0.9, pinned: 140 });
    C.trophy(b, { at: [2.0, sh.top, -3.15] });
    C.book(b, { at: [2.7, sh.top, -3.3], color: '#4f86c6' });
    C.book(b, { at: [2.95, sh.top, -3.3], color: '#e05a5a' });
    C.piggy(b, { at: [3.35, sh.top, -3.25], rot: -0.4 });
    C.floorLamp(b, { at: [0.75, 0, -1.45] });
    C.soda(b, { at: [1.25, L.coffee.top, 0.65] });
    C.vase(b, { at: [-0.75, L.coffee.top, 0.7], color: '#ff8fa3', value: 90000 });
    C.mug(b, { at: [-0.2, L.coffee.top, 0.4], color: '#5ec4c9' });
    C.plate(b, { at: [0.5, L.coffee.top, 0.0] });
    C.roomba(b, { at: [-1.6, 0, 1.8] });
    C.cushion(b, { at: [-2.3, L.sofaSeat, -2.55], color: '#5ec4c9', rot: 0.2 });
    C.plant(b, { at: [-3.4, 0, -1.3] });
    b.cat(2.7, 0, 2.6);
  },
};

const A3: LevelDef = {
  id: 'A3', room: 'living', title: '책장 꼭대기의 보물', subtitle: '고양이 손이 닿지 않는 곳에 둔 골동품 도자기',
  paws: 3,
  goal: { kind: 'break', text: '책장 꼭대기의 골동품 도자기를 깨라', short: '도자기 깨기' },
  stars: [700000, 950000],
  tip: '너무 높은 물건은 직접 칠 수 없어요. 책장을 흔들어 볼까요? 높은 곳을 칠수록 잘 흔들려요.',
  hints: ['책장 위쪽을 눌러 세게 쳐보세요. 흔들릴 때 한 번 더!', '스탠드를 책장 쪽으로 넘어뜨리면 큰 충격을 줄 수 있어요.', '책장이 탁자 쪽으로 쓰러지면 탁자 위 찻잔 세트까지 와장창!'],
  ownerLine: '할머니가 물려주신 도자기가…!!',
  build(b) {
    livingRoom(b, { coffee: true });
    const bs = C.bookshelf(b, { at: [-3.5, 0, -0.3], rot: Math.PI / 2, h: 5.4, w: 2.2, shelves: 4, d: 0.65, mass: 12 });
    const top = bs.shelfY[bs.shelfY.length - 1];
    C.vase(b, { at: [-3.45, top, -0.55], tall: true, color: '#3f6fb5', target: true, flowers: false, value: 450000, name: '골동품 도자기' });
    C.piggy(b, { at: [-3.5, top, 0.35], rot: 1.2 });
    // books on the shelves
    for (let s = 0; s < 3; s++) C.bookRow(b, { at: [-3.5, bs.shelfY[s], -1.15 + (s % 2) * 0.2], n: 4, gap: 0.3, rot: -Math.PI / 2 });
    C.plant(b, { at: [-3.45, bs.shelfY[3], 0.45] });
    C.floorLamp(b, { at: [-2.1, 0, -1.45] });
    // tea set on the coffee table
    C.teapot(b, { at: [-0.3, L.coffee.top, 0.4] });
    C.mug(b, { at: [0.4, L.coffee.top, 0.7], color: '#f7c6d9', name: '찻잔' });
    C.mug(b, { at: [0.6, L.coffee.top, 0.0], color: '#f7c6d9', name: '찻잔' });
    C.plate(b, { at: [1.1, L.coffee.top, 0.5] });
    C.rubberBall(b, { at: [1.0, 0, 2.4], color: '#5ec4c9' });
    C.chair(b, { at: [-1.9, 0, 1.6], rot: 2.2, color: '#ffcf5c' });
    C.tv(b, { at: [L.tvStand.x, L.tvStand.top, L.tvStand.z + 0.1], value: 900000 });
    b.cat(2.6, 0, 2.6);
  },
};

/* ================================================================== */
/* 주방                                                               */
/* ================================================================== */

const B1: LevelDef = {
  id: 'B1', room: 'kitchen', title: '식탁보의 마술', subtitle: '정성껏 차린 저녁상. 너무 가지런하다…',
  paws: 2,
  goal: { kind: 'break', count: 4, text: '접시 4개를 모두 깨뜨려라', short: '접시 깨기' },
  stars: [300000, 400000],
  tip: '식탁보 같은 특별한 물건은 끌면 다르게 반응해요.',
  hints: ['식탁보를 잡아당겨 보세요!', '살살 당기면 전부 끌려 떨어지고, 확 잡아빼면… 마술이 됩니다.', '케이크와 와인잔까지 한 번에 떨어뜨리면 피해액 대박!'],
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
    C.fruit(b, { at: [3.6, K.counter.top, -2.6], kind: 'orange' });
    b.cat(3.0, 0, 3.0);
  },
};

const B2: LevelDef = {
  id: 'B2', room: 'kitchen', title: '높은 선반 작전', subtitle: '고양이 손 안 닿는 선반에 귀한 그릇을 숨겼다',
  paws: 3,
  goal: { kind: 'break', count: 3, text: '높은 선반의 그릇 3개를 깨뜨려라', short: '선반 그릇' },
  stars: [280000, 340000],
  tip: '선반은 너무 높아요. 대신 선반을 아래에서 "쾅" 칠 방법을 찾아봐요.',
  hints: ['토스터를 선반 아래로 밀어보세요. 레버를 치면 잠시 후 빵이 튀어 올라요!', '흔든 탄산음료는 로켓처럼 날아가요. 선반을 노려요!', '선반이 떨어지면 아래 조리대 물건까지 연쇄로 와장창!'],
  ownerLine: '혼수 그릇이…!! 이걸 어떻게 꺼낸 거야?!',
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
    C.eggCarton(b, { at: [0.0, K.counter.top, -2.75], eggs: 4 });
    C.cup(b, { at: [-1.4, K.counter.top, -2.6] });
    // table
    C.fruit(b, { at: [0.4, K.table.top, 1.0], kind: 'apple' });
    C.fruit(b, { at: [0.8, K.table.top, 1.3], kind: 'orange' });
    C.bottle(b, { at: [1.8, K.table.top, 1.6] });
    b.cat(3.0, 0, 3.0);
  },
};

const B3: LevelDef = {
  id: 'B3', room: 'kitchen', title: '달걀 대소동', subtitle: '내일 아침 오믈렛 재료… 였던 것',
  paws: 3,
  goal: { kind: 'break', count: 8, text: '달걀 8개를 깨뜨려라', short: '달걀 깨기' },
  stars: [118000, 128000],
  tip: '굴러가는 물건은 한 줄로 늘어선 것들을 한꺼번에 쓸어버려요.',
  hints: ['달걀판을 통째로 떨어뜨려 보세요.', '밀대를 굴리면 식탁 위 달걀을 한 번에 쓸어요.', '밀가루 봉지가 터지면 부엌이 하얗게 변해요. 피해액도 쑥!'],
  ownerLine: '달걀이… 전부…?! 밀가루는 또 뭐야?!',
  build(b) {
    kitchen(b);
    const ct = K.counter.top, tt = K.table.top;
    C.eggCarton(b, { at: [1.0, ct, -2.42], eggs: 6, targetEggs: true });
    C.flourBag(b, { at: [2.3, ct, -2.8] });
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

/* ================================================================== */
/* 침실                                                               */
/* ================================================================== */

const C1: LevelDef = {
  id: 'C1', room: 'bedroom', title: '새벽 5시 모닝콜', subtitle: '밥그릇이 비었다. 집사는 코를 골고 있다',
  paws: 3,
  goal: { kind: 'wake', text: '곤히 잠든 집사를 깨워라', short: '집사 깨우기' },
  stars: [90000, 140000],
  tip: '시끄러운 소리, 머리 위로 떨어지는 물건… 집사의 잠 게이지를 채워요.',
  hints: ['자명종은 떨어지면 울려요. 침대 가까이 떨어뜨릴수록 효과 만점!', '침대 위 선반의 물건을 떨어뜨려 보세요.', '깨지는 소리도 잠을 방해해요. 가까울수록 크게!'],
  ownerLine: '으아악! 지금 새벽 5시야!!',
  build(b) {
    bedroom(b);
    const sh = C.wallShelf(b, { at: [-2.25, 3.4, -3.4], w: 2.6, pinned: 200 });
    C.book(b, { at: [-3.0, sh.top, -3.4], color: '#e05a5a' });
    C.book(b, { at: [-2.7, sh.top, -3.4], color: '#4f86c6' });
    C.plant(b, { at: [-1.6, sh.top, -3.4] });
    C.alarmClock(b, { at: [1.5, BR.desk.top, -2.7], rot: 0.3 });
    C.cup(b, { at: [-0.05, BR.night.top, -2.9], juice: '#bfe9ff', name: '물컵' });
    C.vase(b, { at: [0.5, BR.night.top, -3.3], color: '#ffd23f', value: 80000 });
    C.penCup(b, { at: [2.3, BR.desk.top, -3.3] });
    C.bookStack(b, { at: [3.2, BR.desk.top, -3.1], n: 3 });
    C.mug(b, { at: [2.6, BR.desk.top, -2.6], color: '#5ec4c9' });
    C.rubberDuck(b, { at: [1.2, 0, 0.6], rot: 2.4 });
    C.cushion(b, { at: [0.6, 0, 2.0], color: '#ff8fa3' });
    C.roomba(b, { at: [2.6, 0, 1.6] });
    b.cat(2.6, 0, 2.8);
  },
};

const C2: LevelDef = {
  id: 'C2', room: 'bedroom', title: '마감 직전 노트북', subtitle: '집사가 밤새 쓴 보고서. 저장은… 했을까?',
  paws: 2,
  goal: { kind: 'floor', text: '노트북을 바닥으로 떨어뜨려라', short: '노트북 추락' },
  stars: [1550000, 1585000],
  tip: '노트북은 책 더미 뒤에 숨어 있어요. 앞발 두 번으로 길을 만들어 볼까요?',
  hints: ['노트북 앞을 막은 책 더미를 먼저 치워보세요.', '지구본은 잘 굴러가요. 의자에 바퀴가 달려 있네요?', '책상 위를 한 번에 쓸어버리면 피해액이 쑥쑥!'],
  ownerLine: '내 보고서!!! 마감이 오늘인데!!',
  build(b) {
    bedroom(b, { owner: 'door' });
    const y = BR.desk.top;
    C.laptop(b, { at: [2.5, y, -3.25], target: true });
    C.bookStack(b, { at: [2.0, y, -2.56], n: 3, rot: Math.PI / 2 });
    C.bookStack(b, { at: [2.98, y, -2.56], n: 2, rot: Math.PI / 2 });
    C.deskLamp(b, { at: [3.55, y, -3.35], rot: Math.PI });
    C.penCup(b, { at: [3.7, y, -2.85] });
    C.globe(b, { at: [1.25, y, -2.6] });
    C.paperStack(b, { at: [1.42, y, -3.4] });
    C.chair(b, { at: [2.0, 0, -1.4], wheels: true, rot: 0.3 });
    C.alarmClock(b, { at: [0.05, BR.night.top, -2.95], rot: 0.4 });
    C.piggy(b, { at: [0.5, BR.night.top, -3.3], rot: 0.5 });
    C.cushion(b, { at: [-2.4, BR.bed.top, -0.6], color: '#ffd23f' });
    C.cushion(b, { at: [-1.6, BR.bed.top, -2.9], color: '#ffffff' });
    b.cat(2.6, 0, 2.6);
  },
};

const C3: LevelDef = {
  id: 'C3', room: 'bedroom', title: '완전 범죄', subtitle: '집사 외출 중. 오늘 이 방은 내 거다냥',
  paws: 3,
  goal: { kind: 'score', amount: 1950000, text: '피해액 ₩1,950,000 달성', short: '대참사' },
  stars: [2020000, 2120000],
  tip: '세 번의 장난으로 방 전체를 엉망으로! 연쇄가 길수록 보너스가 커져요.',
  hints: ['도미노 끝에 뭐가 있는지 보세요. 쓰러진 도미노가 탄산음료를 치면…?', '침대 위 선반이 무너지면 매트리스에서 통통 튀어요.', '구슬병이 깨지면 구슬이 사방으로 굴러가요. 책상 위를 노려요!'],
  ownerLine: '…………내 방이…………',
  build(b) {
    bedroom(b, { owner: 'door' });
    const y = BR.desk.top;
    // desk
    C.laptop(b, { at: [2.6, y, -3.25] });
    C.marbleJar(b, { at: [1.35, y, -2.75] });
    C.deskLamp(b, { at: [3.55, y, -3.35], rot: Math.PI });
    C.mug(b, { at: [3.3, y, -2.55], color: '#ff8fa3' });
    C.paperStack(b, { at: [1.6, y, -3.4] });
    // shelf above the desk, loaded with heavy stuff
    const ds = C.wallShelf(b, { at: [2.45, 3.95, -3.4], w: 2.8, pinned: 120, color: '#b9b0ea' });
    C.bookRow(b, { at: [1.3, ds.top, -3.4], n: 3, gap: 0.3 });
    C.plant(b, { at: [2.35, ds.top, -3.4] });
    C.teapot(b, { at: [3.3, ds.top, -3.4], color: '#9fd8cb' });
    // shelf above the bed
    const sh = C.wallShelf(b, { at: [-2.25, 3.4, -3.4], w: 2.8, pinned: 200 });
    C.trophy(b, { at: [-3.2, sh.top, -3.35] });
    C.vase(b, { at: [-2.4, sh.top, -3.35], color: '#5ec4c9', value: 150000 });
    C.book(b, { at: [-1.7, sh.top, -3.4], color: '#e05a5a' });
    C.book(b, { at: [-1.45, sh.top, -3.4], color: '#4f86c6' });
    C.book(b, { at: [-1.2, sh.top, -3.4], color: '#ffd23f' });
    // nightstand
    C.vase(b, { at: [0.5, BR.night.top, -3.3], color: '#ffd23f', value: 80000 });
    C.alarmClock(b, { at: [0.05, BR.night.top, -2.95], rot: 0.4 });
    // bed
    C.piggy(b, { at: [-1.4, BR.bed.top, -0.5], rot: -0.6 });
    C.cushion(b, { at: [-2.6, BR.bed.top, -1.0], color: '#ffffff' });
    // floor: domino trail that ends at a soda bottle aimed at the desk
    C.dominoPath(b, [[-2.6, 2.0], [-0.8, 2.6], [0.8, 3.15], [1.45, 3.0], [1.6, 2.4]], 0, 0.3);
    C.soda(b, { at: [1.63, 0, 1.92] });
    C.chair(b, { at: [0.95, 0, -1.35], wheels: true, rot: -0.5 });
    C.roomba(b, { at: [-0.4, 0, 0.9] });
    C.plant(b, { at: [3.4, 0, -1.4] });
    C.floorLamp(b, { at: [-0.15, 0, -0.85] });
    C.rubberDuck(b, { at: [3.0, 0, 0.4], rot: 2.6 });
    b.cat(3.0, 0, 3.0);
  },
};

export const LEVELS: LevelDef[] = [A1, A2, A3, B1, B2, B3, C1, C2, C3];
