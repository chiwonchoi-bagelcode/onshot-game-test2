import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { LevelDef } from '../game/types';
import { bedroom, BEDROOM, furnishBedroom, rect } from './rooms';
import { block, buildHouse, cabinet, doorOn, rug, windowOn } from './house';

const BR = BEDROOM;

const S3_1: LevelDef = {
  id: '3-1', chapter: 3, theme: 'bedroom', title: '새벽 5시 모닝콜', subtitle: '밥그릇이 비었다. 집사는 코를 골고 있다',
  challenges: [],
  paws: 3,
  goal: { kind: 'wake', text: '곤히 잠든 집사를 깨워라', short: '집사 깨우기' },
  stars: [90000, 140000],
  tip: '시끄러운 소리, 머리 위로 떨어지는 물건… 집사의 잠 게이지를 채워요.',
  hints: ['자명종은 떨어지면 울려요. 침대 가까이 떨어뜨릴수록 효과 만점!', '침대 위 선반의 물건을 떨어뜨려 보세요.', '깨지는 소리도 잠을 방해해요. 가까울수록 크게!'],
  ownerLine: '으아악! 지금 새벽 5시야!!',
  build(b) {
    bedroom(b);
    const sh = C.wallShelf(b, { at: [-2.25, 3.4, -3.4], w: 2.6, pinned: 200 });
    C.book(b, { at: [-2.75, sh.top, -3.4], color: '#e05a5a' });
    C.book(b, { at: [-2.5, sh.top, -3.4], color: '#4f86c6' });
    C.plant(b, { at: [-2.0, sh.top, -3.4] });
    C.piggy(b, { at: [-1.35, sh.top, -3.35], rot: -0.4 });
    C.alarmClock(b, { at: [0.05, BR.night.top, -2.95], rot: 0.4 });
    C.cup(b, { at: [0.55, BR.night.top, -3.3], juice: '#bfe9ff', name: '물컵' });
    C.vase(b, { at: [1.35, BR.desk.top, -2.8], color: '#ffd23f', value: 80000 });
    C.penCup(b, { at: [2.3, BR.desk.top, -3.3] });
    C.bookStack(b, { at: [3.2, BR.desk.top, -3.1], n: 3 });
    C.mug(b, { at: [2.6, BR.desk.top, -2.6], color: '#5ec4c9' });
    C.rubberDuck(b, { at: [1.2, 0, 0.6], rot: 2.4 });
    C.cushion(b, { at: [0.6, 0, 2.0], color: '#ff8fa3' });
    C.roomba(b, { at: [2.6, 0, 1.6] });
    b.cat(2.6, 0, 2.8);
  },
};

const S3_2: LevelDef = {
  id: '3-2', chapter: 3, theme: 'bedroom', title: '마감 직전 노트북', subtitle: '집사가 밤새 쓴 보고서. 저장은… 했을까?',
  challenges: [],
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

const S3_3: LevelDef = {
  id: '3-3', chapter: 3, theme: 'bedroom', title: '쉿! 몰래 작전', subtitle: '집사가 잠든 사이 보물 사냥. 단, 절대 깨우면 안 된다냥',
  paws: 3,
  goal: { kind: 'sneak', text: '집사를 깨우지 말고 보물 3개를 깨뜨려라', short: '몰래 깨기' },
  stars: [260000, 400000],
  challenges: [
    { type: 'quiet', max: 25, text: '소음 25 이하로 (집사가 거의 못 들음)' },
    { type: 'paws', max: 2 },
    { type: 'count', kind: 'vase', n: 1, text: '침대 위 고급 꽃병까지 깨고도 안 들키기' },
  ],
  tip: '이번엔 몰래! 집사가 깨면 바로 실패예요. 깨지는 소리는 집사 머리에서 멀수록 작아져요.',
  hints: [
    '자명종을 건드리면 집사가 벌떡! 인형은 자명종 반대쪽, 방 앞쪽으로 쳐요.',
    '세게 쳐서 집사에게서 멀리 날려 깨뜨리면 소리가 작아요. 로봇청소기와 고무오리는 시끄러운 함정!',
    '돼지저금통을 스노우볼 쪽으로 세게 밀면 둘 다 와장창. 침대 위 꽃병은 방 쪽으로 멀리 날리면 들키지 않아요.',
  ],
  hintMove: { prop: 'doll', dir: [0.2, 1] },
  ownerLine: 'Zzz… 음냐… 우리 냥이… 착하지…',
  build(b) {
    bedroom(b);
    const y = BR.desk.top, n = BR.night.top;
    // desk: far from the bed – the safe side of the room
    C2.snowGlobe(b, { at: [1.6, y, -2.75], target: true });
    C.piggy(b, { at: [2.45, y, -2.75], target: true, rot: 0.6 });
    C.mug(b, { at: [3.3, y, -2.6], color: '#5ec4c9' });
    C.deskLamp(b, { at: [3.55, y, -3.4], rot: Math.PI });
    C.paperStack(b, { at: [2.4, y, -3.4] });
    // nightstand right by the sleeping head: the doll stands next to the alarm clock
    C.alarmClock(b, { at: [0.05, n, -2.9], rot: 0.5 });
    C2.doll(b, { at: [0.55, n, -3.2], target: true, value: 60000 });
    // above the bed
    const sh = C.wallShelf(b, { at: [-2.25, 3.4, -3.4], w: 2.6, pinned: 200 });
    C.book(b, { at: [-2.9, sh.top, -3.4], color: '#e05a5a' });
    C.book(b, { at: [-2.65, sh.top, -3.4], color: '#4f86c6' });
    C.vase(b, { at: [-1.55, sh.top, -3.35], color: '#9b8fdd', value: 150000, name: '고급 꽃병' });
    // floor: noisy traps
    C.rubberDuck(b, { at: [1.3, 0, 0.3], rot: 2.4 });
    C2.pillow(b, { at: [1.6, 0, -1.4], rot: 0.3 });
    C.roomba(b, { at: [2.4, 0, 1.4] });
    b.cat(2.6, 0, 2.8);
  },
};

const S3_4: LevelDef = {
  id: '3-4', chapter: 3, theme: 'bedroom', title: '드레스룸 습격', subtitle: '집사는 외출 준비로 샤워 중. 드레스룸 문이 열려 있다',
  paws: 3,
  goal: { kind: 'break', count: 4, text: '향수 3병과 기타를 망가뜨려라', short: '드레스룸' },
  stars: [700000, 780000],
  challenges: [
    { type: 'indirect', text: '향수도 기타도 직접 치지 않고 클리어' },
    { type: 'paws', max: 2 },
    { type: 'discover', id: 'feathers', text: '옷장 위 베개로 깃털 폭발' },
  ],
  tip: '침실 옆에 드레스룸이 붙어 있어요. 쓰러지는 물건은 문을 넘어 옆방까지 닿아요.',
  hints: [
    '화장대 덮개를 살살 당기면 향수가 전부 와르르!',
    '문간의 옷걸이 윗부분을 침실 쪽으로 밀면 기타 위로 쿵! 직접 치지 않아도 돼요.',
    '옷장 위 베개는 높이 떨어질수록… 펑! 깃털 폭발까지 터뜨리면 별 셋.',
  ],
  hintMove: { prop: 'cloth', dir: [0, 1] },
  ownerLine: '내 향수…! 기타는 또 왜 이래?!',
  start: [4.0, -0.5],
  build(b) {
    buildHouse(b, {
      rooms: [rect('bedroom', '침실', 0, 0, 8, 7.5, 'lilac', 'night'), rect('dress', '드레스룸', 6.5, 0, 5, 7.5, 'darkwood', 'study')],
      doors: [{ x: 4, z: 0.7, w: 1.9 }],
      base: '#3f3478',
    });
    furnishBedroom(b, 0, 0, { owner: 'none' });
    doorOn(b, { x: -4 }, BR.doorZ, '#b9b0ea');
    b.ownerAtDoor(-4 + 0.9, 0, BR.doorZ, Math.PI / 2);
    // dressing room: vanity with three perfumes on a runner cloth
    const vt = cabinet(b, 6.6, -3.25, 2.6, 0.9, 1.9, '#f4efe4', '#ffd6e3', 2);
    C.tablecloth(b, { at: [6.6, vt, -3.25], w: 2.5, d: 0.8, tableTop: vt, floorY: 0, color: '#b9a6ff' });
    for (const [x, c] of [[5.75, '#ff9fc0'], [6.35, '#b9a6ff'], [7.45, '#ffd23f']] as const) C2.perfume(b, { at: [x, vt + 0.05, -3.2], color: c, target: true });
    C.piggy(b, { at: [6.95, vt + 0.05, -3.25], name: '보석함', color: '#ffd23f', value: 120000, rot: 0.2 });
    // tall wardrobe with spare pillows on top (a long fall = feather explosion)
    block(b, 8.15, -1.2, 1.4, 1.8, 4.2, '#b9825a', '#8e5f3e');
    C2.pillow(b, { at: [8.15, 4.2, -1.6], color: '#ffffff', rot: 0.2 });
    C2.pillow(b, { at: [8.15, 4.2, -0.8], color: '#ffd6e3', rot: -0.2 });
    // coat rack right at the doorway, the guitar just on the bedroom side
    C2.coatRack(b, { at: [4.75, 0, 0.7] });
    C2.guitar(b, { at: [3.2, 0, 0.7], rot: Math.PI / 2, target: true });
    for (const [x, z, r] of [[5.6, 2.6, 0.3], [6.1, 2.8, -0.2]] as const) C2.shoe(b, { at: [x, 0, z], rot: r });
    b.cat(2.6, 0, 2.6);
  },
};

const S3_5: LevelDef = {
  id: '3-5', chapter: 3, theme: 'bedroom', title: '완전 범죄', subtitle: '집사 외출 중. 오늘 이 방은 내 거다냥',
  challenges: [],
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
    C.bookRow(b, { at: [1.3, ds.top, -3.4], n: 2, gap: 0.3 });
    C.bookStack(b, { at: [2.25, ds.top, -3.4], n: 3, rot: Math.PI / 2 });
    C.plant(b, { at: [2.85, ds.top, -3.4] });
    C.teapot(b, { at: [3.45, ds.top, -3.4], color: '#9fd8cb' });
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
    C.soda(b, { at: [1.63, 0, 1.92], aim: [0.75, -5.2] });
    C.chair(b, { at: [0.95, 0, -1.35], wheels: true, rot: -0.5 });
    C.roomba(b, { at: [-0.4, 0, 0.9] });
    C.plant(b, { at: [3.4, 0, -1.4] });
    C.floorLamp(b, { at: [-0.15, 0, -0.85] });
    C.rubberDuck(b, { at: [3.0, 0, 0.4], rot: 2.6 });
    b.cat(3.0, 0, 3.0);
  },
};

export const CH3: LevelDef[] = [S3_1, S3_2, S3_3, S3_4, S3_5];
