import * as C from '../game/catalog';
import type { LevelDef } from '../game/types';
import { livingRoom, LIVING } from './rooms';

const L = LIVING;

const S1_1: LevelDef = {
  id: '1-1', chapter: 1, theme: 'living', title: '첫 번째 장난', subtitle: '탁자 위 물건은 떨어뜨리라고 있는 거다냥',
  challenges: [],
  paws: 2,
  goal: { kind: 'break', text: '탁자 위 꽃병을 깨뜨려라', short: '꽃병 깨기' },
  stars: [145000, 155000],
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

const S1_2: LevelDef = {
  id: '1-2', chapter: 1, theme: 'living', title: 'TV 대참사', subtitle: '집사가 아끼는 새 TV… 화면이 너무 반짝인다',
  challenges: [],
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

const S1_3: LevelDef = {
  id: '1-3', chapter: 1, theme: 'living', title: '책장 꼭대기의 보물', subtitle: '고양이 손이 닿지 않는 곳에 둔 골동품 도자기',
  challenges: [],
  paws: 3,
  goal: { kind: 'break', text: '책장 꼭대기의 골동품 도자기를 깨라', short: '도자기 깨기' },
  stars: [700000, 950000],
  tip: '너무 높은 물건은 직접 칠 수 없어요. 책장을 흔들어 볼까요? 높은 곳을 칠수록 잘 흔들려요.',
  hints: ['책장 위쪽을 눌러 세게 쳐보세요. 흔들릴 때 한 번 더!', '스탠드를 책장 쪽으로 넘어뜨리면 큰 충격을 줄 수 있어요.', '책장이 탁자 쪽으로 쓰러지면 탁자 위 찻잔 세트까지 와장창!'],
  ownerLine: '할머니가 물려주신 도자기가…!!',
  build(b) {
    livingRoom(b, { coffee: true });
    const bs = C.bookshelf(b, { at: [-3.5, 0, -0.3], rot: Math.PI / 2, h: 5.4, w: 2.2, shelves: 4, d: 0.62, mass: 10.5 });
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

export const CH1: LevelDef[] = [S1_1, S1_2, S1_3];
