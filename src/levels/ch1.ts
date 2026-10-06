import * as THREE from 'three';
import * as C from '../game/catalog';
import type { V3 } from '../game/catalog';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { M, cyl, mesh, torus } from '../render/kit';
import { armchair, furnishLiving, livingRoom, LIVING, rect } from './rooms';
import { buildHouse, doorOn, rug, windowOn } from './house';

/** a slim, wobbly plant stand: a bump at its feet tips it over (and whatever stands on it) */
function plantStand(b: Builder, o: { at: V3; h?: number; color?: string }) {
  const h = o.h ?? 1.5;
  const grp = new THREE.Group();
  const wood = M(o.color ?? '#b9825a');
  grp.add(mesh(cyl(0.36, 0.34, 0.08, 12), wood, { pos: [0, h - 0.04, 0] }));
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    grp.add(mesh(cyl(0.035, 0.03, h - 0.06, 5), wood, { pos: [Math.cos(a) * 0.2, (h - 0.06) / 2, Math.sin(a) * 0.2], rot: [Math.sin(a) * 0.06, 0, -Math.cos(a) * 0.06] }));
  }
  grp.add(mesh(torus(0.2, 0.025, 4, 12), wood, { pos: [0, h * 0.35, 0], rot: [Math.PI / 2, 0, 0] }));
  b.prop({
    kind: 'stand', name: '화분대', icon: '🪴', group: grp, pos: o.at,
    colliders: [
      { shape: 'cyl', hh: 0.04, r: 0.36, at: [0, h - 0.04, 0], massShare: 0.45 },
      { shape: 'cyl', hh: (h - 0.08) / 2, r: 0.22, at: [0, (h - 0.08) / 2, 0], massShare: 0.55 },
    ],
    mass: 0.9, mat: 'wood', value: 15000, toppleValue: 3000, friction: 0.5,
    traits: ['흔들흔들', '넘어짐'],
  });
  return { top: o.at[1] + h };
}

const L = LIVING;

const S1_1: LevelDef = {
  id: '1-1', chapter: 1, theme: 'living', title: '첫 번째 장난', subtitle: '탁자 위 물건은 떨어뜨리라고 있는 거다냥',
  paws: 2,
  goal: { kind: 'break', text: '탁자 위 꽃병을 깨뜨려라', short: '꽃병 깨기' },
  stars: [142000, 185000],
  challenges: [
    { type: 'chain', n: 6, text: '한 번에 연쇄 x6 (책 도미노!)' },
    { type: 'paws', max: 1 },
    { type: 'count', kind: 'teapot', n: 1, text: '협탁 위 찻주전자까지 와장창' },
  ],
  tip: '물건을 누른 채 보내고 싶은 방향으로 끌었다 놓으세요. 길게 끌수록 세게 칩니다.',
  hints: [
    '꽃병을 누른 채 탁자 밖으로 끌었다 놓아 보세요.',
    '줄 선 책을 꽃병 쪽으로 밀면 도미노처럼 꽃병까지 밀어내요.',
    '꽃병이 노란 협탁 쪽으로 날아가면 찻주전자까지 와장창! 도미노 한 번이면 앞발도 남아요.',
  ],
  hintMove: { prop: 'book', near: [-1.05, 1.5, 0.55], dir: [1, -0.25] },
  tutorial: [
    { text: '꽃병을 꾹 누른 채 탁자 밖으로 끌었다 놓아요!', prop: 'vase', dir: [1, 0] },
    { text: '길게 끌수록 세게 쳐요. 남은 앞발로 책 도미노도 밀어 봐요!', prop: 'book', near: [-1.05, 1.5, 0.55], dir: [1, 0] },
  ],
  ownerLine: '내 꽃병!! 누가 그랬어?!',
  build(b) {
    livingRoom(b);
    const y = L.coffee.top;
    C.vase(b, { at: [1.48, y, 0.55], target: true });
    C.bookRow(b, { at: [-1.05, y, 0.55], n: 4, gap: 0.5 });
    C.mug(b, { at: [-0.55, y, -0.1], color: '#ffd23f' });
    // tea set on a little side table – right where a pushed vase flies
    const st = C.sideTable(b, { at: [2.9, 0, 0.55], h: 1.0, r: 0.72, color: '#ffcf5c' });
    C.teapot(b, { at: [2.75, st.top, 0.55], color: '#f7c6d9', value: 40000 });
    C.mug(b, { at: [3.15, st.top, 0.9], color: '#f7c6d9', name: '찻잔' });
    C.mug(b, { at: [3.2, st.top, 0.2], color: '#f7c6d9', name: '찻잔' });
    C.plant(b, { at: [-3.4, 0, -1.3] });
    C.cushion(b, { at: [-2.3, L.sofaSeat, -2.55], color: '#5ec4c9', rot: 0.2 });
    C.cushion(b, { at: [-0.4, L.sofaSeat, -2.55], color: '#ffd23f', rot: -0.15 });
    C.rubberBall(b, { at: [1.9, 0, 2.2] });
    C.yarn(b, { at: [-1.9, 0, 1.9] });
    C.plant(b, { at: [3.2, L.tvStand.top, -3.2], color: '#5ec4c9' });
    C.pictureFrame(b, { at: [1.9, L.tvStand.top, -3.45], w: 1.1, h: 0.85, art: 2, pinned: 99999, name: '가족사진' });
    b.cat(2.6, 0, 2.6);
  },
};

const S1_2: LevelDef = {
  id: '1-2', chapter: 1, theme: 'living', title: 'TV 대참사', subtitle: '집사가 아끼는 새 TV… 화면이 너무 반짝인다',
  paws: 3,
  goal: { kind: 'break', text: '새 TV 화면을 박살내라', short: 'TV 부수기' },
  stars: [1040000, 1120000],
  challenges: [
    { type: 'indirect', text: 'TV를 직접 치지 않고 부수기' },
    { type: 'paws', max: 1 },
    { type: 'discover', id: 'rocket', text: '탄산 로켓 발사하기' },
  ],
  tip: 'TV는 무거워서 앞발로는 꿈쩍도 안 할지 몰라요. 위에서 뭔가 떨어진다면…?',
  hints: [
    'TV 위 선반을 떨어뜨려 보세요. 스탠드 조명을 선반 쪽으로 넘어뜨리면?',
    '탄산음료를 치면 흔들려서 로켓처럼 날아가요. 선반을 노려요!',
    '앞발 한 번으로 선반을 떨어뜨리고, 남은 앞발로 탁자 위 꽃병까지 깨면 별 셋!',
  ],
  hintMove: { prop: 'lamp', dir: [0.3, -1] },
  tutorial: [
    { text: 'TV는 너무 무거워서 앞발로는 꿈쩍도 안 해요. 대신 위의 선반을 떨어뜨려요!', prop: 'lamp', dir: [0.3, -1] },
    { text: '스탠드를 선반 쪽으로 넘어뜨리거나, 탄산음료를 선반 쪽으로 날려 봐요.', prop: 'soda', dir: [0.3, -1] },
  ],
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
  paws: 3,
  goal: { kind: 'break', text: '책장 꼭대기의 골동품 도자기를 깨라', short: '도자기 깨기' },
  stars: [700000, 950000],
  challenges: [
    { type: 'paws', max: 1 },
    { type: 'discover', id: 'furniture', text: '책장을 통째로 넘어뜨리기' },
    { type: 'count', kind: 'book', n: 10, event: 'topple', text: '책 10권 쓰러뜨리기' },
  ],
  tip: '너무 높은 물건은 직접 칠 수 없어요. 책장을 흔들어 볼까요? 높은 곳을 칠수록 잘 흔들려요.',
  hints: [
    '책장 위쪽을 눌러 세게 쳐보세요.',
    '흔들릴 때 한 번 더 치면 책장이 통째로 넘어가요!',
    '책장이 탁자 쪽으로 쓰러지면 책이 와르르, 찻잔 세트까지 와장창!',
  ],
  hintMove: { prop: 'bookshelf', dir: [1, 0] },
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

const S1_4: LevelDef = {
  id: '1-4', chapter: 1, theme: 'living', title: '로봇청소기 출동', subtitle: '집사의 화분 삼형제. 청소기 버튼이 눈에 들어온다냥',
  paws: 2,
  goal: { kind: 'break', text: '화분 3개를 모두 깨뜨려라', short: '화분 깨기' },
  stars: [195000, 245000],
  challenges: [
    { type: 'paws', max: 1 },
    { type: 'stat', key: 'yarnLen', min: 8, text: '털실뭉치로 8m 넘게 낙서하기' },
    { type: 'score', amount: 260000 },
  ],
  tip: '화분은 셋, 앞발은 둘! 스스로 움직이는 물건을 이용해 봐요.',
  hints: [
    '로봇청소기를 치면 그 방향으로 달려가요. 화분대 쪽으로 보내 보세요!',
    '화분대 셋이 비스듬히 한 줄로 서 있어요. 줄을 따라 청소기를 보내면 한 번에 와르르!',
    '청소기 한 번으로 화분을 전부 깨고, 남은 앞발로 TV장 위 꽃병까지! 털실뭉치는 굴리면 실을 남겨요.',
  ],
  hintMove: { prop: 'roomba', dir: [-0.825, 0.565] },
  ownerLine: '내 화분 삼형제가…! 청소기는 왜 켜져 있어?!',
  build(b) {
    livingRoom(b, { coffee: false });
    // three wobbly plant stands in a slanted row – the robot vacuum's bowling lane
    for (const [x, z] of [[1.7, -0.74], [0.13, 0.33], [-1.44, 1.41]] as const) {
      const st = plantStand(b, { at: [x, 0, z] });
      C.plant(b, { at: [x, st.top, z], target: true });
    }
    C.roomba(b, { at: [3.1, 0, -1.7] });
    C.yarn(b, { at: [-2.9, 0, -0.9] });
    C.rubberBall(b, { at: [1.0, 0, 2.6], color: '#5ec4c9' });
    // things on the TV stand and the sofa for extra mess
    const y = L.tvStand.top;
    C.vase(b, { at: [1.55, y, -3.15], color: '#ff8fa3', value: 90000 });
    C.piggy(b, { at: [3.2, y, -3.05], rot: -0.5 });
    C.pictureFrame(b, { at: [2.4, y, -3.45], w: 1.1, h: 0.85, art: 1, pinned: 99999, name: '가족사진' });
    C.cushion(b, { at: [-2.3, L.sofaSeat, -2.55], color: '#5ec4c9', rot: 0.2 });
    C.cushion(b, { at: [-0.4, L.sofaSeat, -2.55], color: '#ffd23f', rot: -0.15 });
    b.cat(2.6, 0, 2.4);
  },
};

const S1_5: LevelDef = {
  id: '1-5', chapter: 1, theme: 'living', title: '거실 대참사', subtitle: '집사가 주말 내내 꾸민 거실과 선룸. 문이 활짝 열려 있다',
  paws: 3,
  goal: { kind: 'score', amount: 1500000, text: '피해액 ₩1,500,000 달성', short: '대참사' },
  stars: [1700000, 1900000],
  challenges: [
    { type: 'chain', n: 30, text: '한 번에 연쇄 x30 (거실에서 선룸까지!)' },
    { type: 'paws', max: 2 },
    { type: 'count', kind: 'plant', n: 4, text: '화분 4개 깨기' },
  ],
  tip: '지금까지 배운 장난을 전부! 한 번의 앞발로 여러 장치가 이어지게 해 봐요.',
  hints: [
    'TV 위 선반이 떨어지면 피해액이 껑충! 탄산음료나 스탠드로 선반을 노려요.',
    '도미노 길은 TV 앞에서 두 갈래! 한쪽은 TV 선반, 한쪽은 문 너머 선룸 선반을 노린 탄산음료로 이어져요.',
    '도미노 한 번에 두 선반을 떨어뜨리고, 남은 앞발로 꽃병과 선룸 로봇청소기까지 출동시키면 별 셋!',
  ],
  hintMove: { prop: 'domino', near: [-1.4, 0.3, 2.7], dir: [1, 0.1] },
  start: [1.0, 1.0],
  ownerLine: '선룸까지?! 내 주말이…!!',
  build(b) {
    buildHouse(b, {
      rooms: [rect('living', '거실', 0, 0, 8, 7.5, 'wood', 'mint'), rect('sun', '선룸', 6.75, 0, 5.5, 7.5, 'herring', 'butter')],
      doors: [{ x: 4, z: 1.8, w: 1.9 }],
      base: '#8e6a8f',
    });
    furnishLiving(b, 0, 0);
    doorOn(b, { x: -4 }, LIVING.doorZ, '#ef8a5b');
    b.ownerAtDoor(-4 + 0.9, 0, LIVING.doorZ, Math.PI / 2);
    // sunroom decor
    windowOn(b, { z: -3.75 }, 5.6, 4.3, 1.6, 2.4, false, '#ffd77a');
    windowOn(b, { z: -3.75 }, 8.4, 4.3, 1.6, 2.4, false, '#ffd77a');
    rug(b, 7.2, 1.0, 3.2, 2.6, ['#9fd8cb', '#ffffff', '#ffd23f']);
    armchair(b, 8.5, -2.5, -0.6, '#9fd8cb');
    // --- living room: TV + loaded wall shelf, coffee table with a soda ---
    const y = LIVING.coffee.top;
    C.tv(b, { at: [LIVING.tvStand.x, LIVING.tvStand.top, LIVING.tvStand.z + 0.2] });
    const sh = C.wallShelf(b, { at: [2.35, 4.05, -3.3], w: 2.8, d: 0.9, pinned: 140 });
    C.trophy(b, { at: [2.0, sh.top, -3.15] });
    C.piggy(b, { at: [3.3, sh.top, -3.25], rot: -0.4 });
    C.book(b, { at: [2.7, sh.top, -3.3], color: '#4f86c6' });
    C.soda(b, { at: [1.25, y, 0.65] });
    C.vase(b, { at: [-0.75, y, 0.7], color: '#ff8fa3', value: 90000 });
    C.mug(b, { at: [-0.2, y, 0.4], color: '#5ec4c9' });
    C.plate(b, { at: [0.5, y, 0.0] });
    C.floorLamp(b, { at: [0.75, 0, -1.45] });
    C.cushion(b, { at: [-2.3, LIVING.sofaSeat, -2.55], color: '#5ec4c9', rot: 0.2 });
    C.plant(b, { at: [-3.4, 0, -1.3] });
    // --- domino trail: it forks in front of the TV. One branch knocks a soda aimed at the TV shelf,
    //     the other runs through the doorway to a soda aimed at the sunroom shelf ---
    C.dominoPath(b, [[-1.4, 2.7], [1.0, 2.95], [1.8, 2.95]], 0, 0.3);
    C.dominoPath(b, [[2.08, 2.8], [2.5, 2.2]], 0, 0.3, ['#ff6b6b', '#ffd23f']);
    C.dominoPath(b, [[2.08, 3.1], [3.0, 2.6], [4.6, 1.8], [5.6, 1.2]], 0, 0.3, ['#4f86c6', '#5bb98c']);
    C.soda(b, { at: [2.62, 0, 1.9], aim: [-0.05, -1] });
    C.soda(b, { at: [5.85, 0, 0.95], aim: [0.2, -1] });
    // --- sunroom: wall shelf of plants & a vase over a glass cabinet ---
    const ss = C.wallShelf(b, { at: [6.6, 3.7, -3.35], w: 3.0, d: 0.8, pinned: 110, color: '#ffffff' });
    C.plant(b, { at: [5.5, ss.top, -3.3], color: '#5ec4c9' });
    C.vase(b, { at: [6.5, ss.top, -3.3], tall: true, color: '#3f6fb5', flowers: false, value: 150000, name: '청자 화병' });
    C.plant(b, { at: [7.5, ss.top, -3.3] });
    // roomba bowling lane
    for (const [x, z] of [[7.6, 2.2], [6.2, 2.2]] as const) {
      const st = plantStand(b, { at: [x, 0, z] });
      C.plant(b, { at: [x, st.top, z] });
    }
    C.roomba(b, { at: [9.0, 0, 2.2] });
    C.yarn(b, { at: [8.6, 0, -1.0] });
    b.cat(-2.4, 0, 2.8);
  },
};

export const CH1: LevelDef[] = [S1_1, S1_2, S1_3, S1_4, S1_5];
