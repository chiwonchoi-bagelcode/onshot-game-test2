import * as C from '../game/catalog';
import type { LevelDef } from '../game/types';
import { kitchen, KITCHEN } from './rooms';

const K = KITCHEN;

const S2_1: LevelDef = {
  id: '2-1', chapter: 2, theme: 'kitchen', title: '식탁보의 마술', subtitle: '정성껏 차린 저녁상. 너무 가지런하다…',
  challenges: [],
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

const S2_2: LevelDef = {
  id: '2-2', chapter: 2, theme: 'kitchen', title: '달걀 대소동', subtitle: '내일 아침 오믈렛 재료… 였던 것',
  challenges: [],
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

const S2_3: LevelDef = {
  id: '2-3', chapter: 2, theme: 'kitchen', title: '높은 선반 작전', subtitle: '고양이 손 안 닿는 선반에 귀한 그릇을 숨겼다',
  challenges: [],
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

export const CH2: LevelDef[] = [S2_1, S2_2, S2_3];
