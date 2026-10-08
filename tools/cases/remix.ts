import type { Case } from './types';
import type { Action } from '../sim';

/* the request board (src/levels/remix.ts): each remix shows its star ladder */
const domino15: Action = { pick: 'domino', near: [-1.4, 0.3, 2.7], dir: [1, 0.1], power: 0.4, at: 'top', wait: 7 };
const glassHairball: Action = { pick: 'glass', near: [0.35, 2.35, 0.55], dir: [0, 1], power: 0.5, trick: 'hairball', wait: 1.5 };
const kneadBook: Action = { pick: 'book', near: [2.95, 4.17, -3.3], dir: [0, 1], power: 0.5, trick: 'knead', wait: 6 };

export const CASES: Case[] = [
  // R1 거실 원샷 (1-1, one paw)
  { level: 'R1', name: 'vase pushed onto the tea set (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [{ pick: 'vase', dir: [1, 0], power: 0.5 }] },
  { level: 'R1', name: 'book domino alone (1★)', expect: 'win', maxStars: 1, plan: [{ pick: 'book', near: [-1.05, 1.5, 0.55], dir: [1, 0], power: 0.5, at: 'top', wait: 0.6 }] },
  // R2 갈림길 한 방 (1-5, one paw)
  { level: 'R2', name: 'forked domino takes both shelves (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [domino15] },
  { level: 'R2', name: 'soda rocket alone is not enough', expect: 'lose', plan: [{ pick: 'soda', near: [1.25, 1.5, 0.65], dir: [0.3, -1], power: 0.8, wait: 6 }] },
  // R3 식탁보 단판 (2-1, one pull)
  { level: 'R3', name: 'pull sideways toward the kitchen (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'cloth', dir: [-1, 0], power: 0.5, wait: 4 }] },
  { level: 'R3', name: 'slow pull toward us (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }] },
  { level: 'R3', name: 'magician yank keeps the dishes', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 1, wait: 4 }] },
  // R4 미끄럼틀 한 방 (4-3, one paw)
  { level: 'R4', name: 'knock the speaker dam off the slide (3★)', expect: 'win', minStars: 3, plan: [{ pick: '블루투스 스피커', dir: [0.2, 1], power: 0.7, wait: 8 }] },
  { level: 'R4', name: 'speaker into the toilet clogs it', expect: 'lose', plan: [{ pick: '블루투스 스피커', dir: [1, 0], power: 0.9, wait: 8 }] },
  // R5 풍선 하나 (5-2, one paw)
  { level: 'R5', name: 'the low left balloon starts it all (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, wait: 10 }] },
  { level: 'R5', name: 'the arch balloon only', expect: 'lose', plan: [{ pick: 'balloon', near: [1.2, 2.2, -0.5], dir: [0, -1], power: 0.9, wait: 10 }] },
  // R6 도미노 일주 (6-2, one paw)
  { level: 'R6', name: 'domino loop around the house (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'domino', near: [-3.2, 0.3, -2.9], dir: [0.35, 0.94], power: 0.4, at: 'top', wait: 12 }] },
  { level: 'R6', name: 'soda straight at the wall', expect: 'lose', plan: [{ pick: 'soda', dir: [0, -1], power: 0.6, wait: 8 }] },
  // R7 미끄덩 식탁 (2-1, two paws + hairball)
  { level: 'R7', name: 'hairball mid-table, side pull, champagne (3★)', expect: 'win', minStars: 3, plan: [glassHairball, { pick: 'cloth', dir: [-1, 0], power: 0.5, wait: 4 }, { pick: '샴페인', dir: [0, 1], power: 0.6 }] },
  { level: 'R7', name: 'same without the hairball (2★)', expect: 'win', maxStars: 2, plan: [{ pick: 'cloth', dir: [-1, 0], power: 0.5, wait: 4 }, { pick: '샴페인', dir: [0, 1], power: 0.6 }] },
  // R8 꾹꾹이 TV (1-2, one paw + knead)
  { level: 'R8', name: 'knead on the shelf, then the vase (3★)', expect: 'win', minStars: 3, plan: [kneadBook, { pick: 'vase', dir: [0, 1], power: 0.6 }] },
  { level: 'R8', name: 'knead brings the shelf down by itself (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [kneadBook] },
  { level: 'R8', name: 'soda rocket without kneading (2★)', expect: 'win', maxStars: 2, plan: [{ pick: 'soda', dir: [0.3, -1], power: 0.8, wait: 6 }] },
  { level: 'R8', name: 'TV by paw only (1★)', expect: 'win', maxStars: 1, plan: [{ pick: 'tv', dir: [0, 1], power: 1, at: 'top', wait: 6 }] },
];

/* ---- request board, second batch: tricks, protected things, named culprits, no noise, cat challenges ---- */
const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });
const top = (pick: string, dir: [number, number], power: number, wait = 4, near?: [number, number, number]): Action => ({ pick, near, dir, power, at: 'top', wait });
const pause = (s: number): Action => ({ pick: 'wait', dir: [0, 0], power: 0, wait: s });
const blk = (near: [number, number, number], dir: [number, number], power = 0.6, wait = 4): Action => ({ pick: 'block', near, dir, power, wait });
const hose72 = hit('hose', [-0.335, -0.942], 0.6, 6);
const blockJack: Action = { pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, wait: 4 };
const ballJack: Action = { pick: 'jack', near: [1.5, 0.4, -1.5], dir: [1, 0], power: 0.7, wait: 4 };
const photoJack: Action = { pick: 'jack', near: [-3.2, 1.4, -1.1], dir: [-1, 0], power: 0.7, wait: 4 };
const domino11b: Action = { pick: 'book', near: [-1.05, 1.5, 0.55], dir: [1, 0], power: 0.5, at: 'top', wait: 3 };
const plantHi11: Action = { pick: 'plant', near: [3.2, 1.5, -3.2], dir: [0, 1], power: 0.7 };
const pullFwd: Action = { pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 };
const champagne: Action = { pick: '샴페인', dir: [0, 1], power: 0.6 };
const lamp61 = top('lamp', [-0.3, 1], 0.8);
const sweep61: Action = { pick: 'plant', near: [-8, 1.5, -3.2], dir: [1, 0.15], power: 0.92, at: 'mid', wait: 3 };
const clockTV65 = top('grandClock', [0, 1], 0.9, 8);
const rocket65 = top('domino', [0.74, -0.67], 0.4, 12, [1.2, 0.3, 6.7]);
const cloth24: Action = { pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 };
const A = (pick: string, dir: [number, number], power: number, extra: Partial<Action> = {}): Action => ({ pick, dir, power, ...extra });
const runner34: Action = { pick: 'cloth', dir: [0, 1], power: 0.45, wait: 4 };
const rack34: Action = { pick: 'coatRack', dir: [-1, 0], power: 0.6, at: 'top', wait: 3 };
const domino35: Action = { pick: 'domino', near: [-2.6, 0.3, 2.0], dir: [1, 0.3], power: 0.4, at: 'top', wait: 4 };
const laptop35: Action = { pick: 'laptop', dir: [1, 0], power: 0.8, wait: 3 };
const vaseHi35: Action = { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 };
const doll33: Action = { pick: 'doll', dir: [0, 1], power: 0.6, wait: 3 };
const A75: [number, number, number] = [-11.9, 3, -2.7], B75: [number, number, number] = [-3.9, 1, -2.7];
const ballerina: Action = { pick: 'doll', near: [3.5, 4.7, -2.4], dir: [0, 1], power: 0.6, wait: 3 };

CASES.push(
  // R9 할머니 한눈팔기 (7-2, one paw + meow)
  { level: 'R9', name: 'meow at the far pots, then the hose unseen (3★)', expect: 'win', minStars: 3, plan: [{ ...hit('flowerPot', [1, 0], 0.5, 1, [-8.2, 0, -1.15]), trick: 'meow' }, hose72] },
  { level: 'R9', name: 'hose in plain sight (1★)', expect: 'win', maxStars: 1, plan: [hose72] },
  { level: 'R9', name: 'meow too close to grandma (1★)', expect: 'win', maxStars: 1, plan: [{ ...hit('onggi', [1, 0], 0.5, 1, [8.9, 0.1, -4.7]), trick: 'meow' }, hose72] },
  { level: 'R9', name: 'the cart alone misses the bonsai', expect: 'lose', plan: [hit('cart', [0, -1], 1, 5)] },
  // R10 우다다 블록 성 (5-3, one paw + zoomies)
  { level: 'R10', name: 'zoomies topple the heavy tower, block jack at the shelf (3★)', expect: 'win', minStars: 3, plan: [{ ...blk([3.5, 0.5, -1.6], [0, 1], 1), trick: 'zoomies', wait: 6 }, blockJack] },
  { level: 'R10', name: 'tower toppled backwards (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ ...blk([3.5, 0.5, -2.8], [0, -1], 1), trick: 'zoomies', wait: 6 }, blockJack] },
  { level: 'R10', name: 'zoomies wasted on the jack', expect: 'lose', plan: [{ ...blockJack, trick: 'zoomies' }, blk([3.5, 0.5, -1.6], [0, 1], 1)] },
  // R11 책장 통째로 (1-3, one paw + zoomies)
  { level: 'R11', name: 'zoomies bring the whole bookcase down (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'bookshelf', dir: [1, 0], power: 1, at: 0.86, trick: 'zoomies', wait: 5 }] },
  { level: 'R11', name: 'zoomies toward the room (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'bookshelf', dir: [0, 1], power: 1, at: 0.86, trick: 'zoomies', wait: 5 }] },
  { level: 'R11', name: 'a plain shake (1★)', expect: 'win', maxStars: 1, plan: [{ pick: 'bookshelf', dir: [1, 0], power: 1, at: 0.86 }] },
  // R12 할머니의 찻주전자 (1-1, protect the teapot)
  { level: 'R12', name: 'book domino + the high plant (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [domino11b, plantHi11] },
  { level: 'R12', name: 'vase by paw + the high plant (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'vase', dir: [0, 1], power: 0.8, wait: 2 }, plantHi11] },
  { level: 'R12', name: 'vase by paw only (1★)', expect: 'win', maxStars: 1, plan: [{ pick: 'vase', dir: [0, 1], power: 0.8 }] },
  { level: 'R12', name: 'vase onto the tea set breaks the teapot', expect: 'lose', plan: [{ pick: 'vase', dir: [1, 0], power: 0.5 }] },
  // R13 밥그릇 사수 (2-1, protect the cat bowl)
  { level: 'R13', name: 'pull toward us + champagne (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [pullFwd, champagne] },
  { level: 'R13', name: 'pull away from the bowl + champagne (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'cloth', dir: [1, 0], power: 0.5, wait: 4 }, champagne] },
  { level: 'R13', name: 'pull toward us + toaster (1★)', expect: 'win', maxStars: 1, plan: [pullFwd, { pick: '토스터', dir: [0, 1], power: 0.6 }] },
  { level: 'R13', name: 'side pull dumps it all on the bowl', expect: 'lose', plan: [{ pick: 'cloth', dir: [-1, 0], power: 0.5, wait: 4 }, champagne] },
  // R14 할아버지의 시계 (6-1, protect the grandfather clock)
  { level: 'R14', name: 'lamp onto the TV + cabinet sweep (3★)', expect: 'win', minStars: 3, plan: [lamp61, sweep61] },
  { level: 'R14', name: 'side table + lamp (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [top('sidetable', [1, 0], 0.9), lamp61] },
  { level: 'R14', name: 'lamp only (1★)', expect: 'win', maxStars: 1, plan: [lamp61] },
  { level: 'R14', name: 'the coat rack line takes the clock', expect: 'lose', plan: [top('coatRack', [1, 0], 0.8)] },
  // R15 금붕어는 무사히 (6-5, protect the aquarium)
  { level: 'R15', name: 'clock into the TV + rocket + vase (3★)', expect: 'win', minStars: 3, plan: [clockTV65, rocket65, top('vase', [1, 0], 0.7, 3, [-4.3, 1.3, 4.0])] },
  { level: 'R15', name: 'clock sideways + rocket + lamp (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [top('grandClock', [1, 0], 0.9, 8), rocket65, top('lamp', [-0.69, -0.73], 0.8, 6)] },
  { level: 'R15', name: 'clock into the TV + rocket + hall (1★)', expect: 'win', maxStars: 1, plan: [clockTV65, rocket65, top('coatRack', [-1, 0], 0.8, 10)] },
  { level: 'R15', name: 'the hallway line floods the tank', expect: 'lose', plan: [top('coatRack', [-1, 0], 0.8, 10), top('lamp', [-0.69, -0.73], 0.8, 6)] },
  // R16 프라이팬 불도저 (2-4, the pan must do it)
  { level: 'R16', name: 'cloth, then the pan bulldozer (3★)', expect: 'win', minStars: 3, plan: [cloth24, { pick: 'pan', dir: [0, 1], power: 0.8 }] },
  { level: 'R16', name: 'pan alone (1★)', expect: 'win', maxStars: 1, plan: [{ pick: 'pan', dir: [0, 1], power: 0.8, wait: 3 }] },
  { level: 'R16', name: 'milk by paw does not count', expect: 'lose', plan: [cloth24, { pick: 'milk', dir: [0, 1], power: 0.6 }] },
  // R17 비누 특급 배송 (4-5, the soap must do it)
  { level: 'R17', name: 'soap express + typhoon (3★)', expect: 'win', minStars: 3, plan: [A('soap', [1, 0], 0.9, { wait: 3 }), A('dryer', [-1, 0], 0.6, { wait: 4 })] },
  { level: 'R17', name: 'soap express + fan (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [A('soap', [1, 0], 0.9, { wait: 3 }), A('fan', [-1, 0], 0.6, { wait: 6 })] },
  { level: 'R17', name: 'soap express + speaker (1★)', expect: 'win', maxStars: 1, plan: [A('soap', [1, 0], 0.9, { wait: 3 }), A('블루투스 스피커', [0, 1], 0.5)] },
  { level: 'R17', name: 'typhoon and fan without the soap', expect: 'lose', plan: [A('dryer', [-1, 0], 0.6, { wait: 4 }), A('fan', [-1, 0], 0.6, { wait: 6 })] },
  // R18 풍선 바람 (5-3, the balloon must do it)
  { level: 'R18', name: 'block jack + ball jack (3★)', expect: 'win', minStars: 3, plan: [blockJack, ballJack] },
  { level: 'R18', name: 'ball jack + photo jack (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [ballJack, photoJack] },
  { level: 'R18', name: 'ball jack only (1★)', expect: 'win', maxStars: 1, plan: [ballJack] },
  { level: 'R18', name: 'shelf jack + the tower by paw', expect: 'lose', plan: [blockJack, blk([3.5, 0.5, -1.6], [0, 1], 0.7)] },
  // R19 발소리 없는 습격 (3-4, the owner naps: waking fails)
  { level: 'R19', name: 'runner + guitar + limited perfume, quietly (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [runner34, { pick: 'guitar', dir: [0, 1], power: 0.6, at: 'top', wait: 3 }, { pick: '한정판 향수', dir: [-1, 0], power: 0.6 }] },
  { level: 'R19', name: 'runner + rack + limited perfume (3★, noisier)', expect: 'win', minStars: 3, plan: [runner34, rack34, { pick: '한정판 향수', dir: [-1, 0], power: 0.6 }] },
  { level: 'R19', name: 'runner + rack + mug (1★)', expect: 'win', maxStars: 1, plan: [runner34, rack34, { pick: 'mug', dir: [0, 1], power: 0.6 }] },
  { level: 'R19', name: 'the alarm clock wakes him', expect: 'lose', plan: [runner34, rack34, { pick: 'alarm', dir: [1, 0], power: 0.6 }] },
  // R20 진짜 완전 범죄 (3-5, the owner naps: waking fails)
  { level: 'R20', name: 'domino rocket, laptop, high vase (3★)', expect: 'win', minStars: 3, plan: [domino35, laptop35, vaseHi35] },
  { level: 'R20', name: 'laptop first (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [laptop35, domino35, vaseHi35] },
  { level: 'R20', name: 'the low vase next to the alarm wakes him', expect: 'lose', plan: [domino35, { ...vaseHi35 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
  // C1 치즈의 시치미 (9-1, cheese)
  { level: 'C1', name: 'one timed chock, two paws left doubled (3★)', expect: 'win', minStars: 3, plan: [pause(2.0), hit('chock', [1, 0], 0.8, 8)] },
  { level: 'C1', name: 'booth button + chock (1★)', expect: 'win', maxStars: 1, plan: [hit('button', [1, 0], 0.5, 1), hit('chock', [1, 0], 0.8, 8)] },
  // C2 까망의 그림자 작전 (3-3, kkamang, two paws)
  { level: 'C2', name: 'doll into the alarm, piggy bowling: he sleeps on (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [{ pick: 'doll', dir: [0.5, -1], power: 0.9, wait: 3 }, { pick: 'piggy', dir: [-1, 0.1], power: 0.95, wait: 3 }] },
  { level: 'C2', name: 'piggy bowling + doll, quietly (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [{ pick: 'piggy', dir: [-1, 0.1], power: 0.95, wait: 3 }, doll33] },
  // C3 삼색이의 행운 (7-5, samsaek, one paw)
  { level: 'C3', name: 'the top chock: two cars for one paw (3★)', expect: 'win', minStars: 3, plan: [hit('chock', [1, 0], 0.8, 10, A75)] },
  { level: 'C3', name: 'the middle chock alone', expect: 'lose', plan: [hit('chock', [1, 0], 0.8, 10, B75)] },
  // C4 뚱냥의 한 방 (5-3, ttung)
  { level: 'C4', name: 'shelf jack, then shove the heavy tower (3★)', expect: 'win', minStars: 3, plan: [blockJack, { ...blk([3.5, 0.5, -1.6], [0, 1], 1), at: 'top' }] },
  { level: 'C4', name: 'tower first (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ ...blk([3.5, 0.5, -1.6], [0, 1], 1), at: 'top' }, blockJack] },
  { level: 'C4', name: 'tower pushed low', expect: 'lose', plan: [blockJack, blk([3.5, 0.5, -1.6], [0, 1], 1)] },
  // C5 샴의 수다 연쇄 (5-5, siam)
  { level: 'C5', name: 'train + castle cascade (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'train', dir: [1, 0], power: 0.7, wait: 14 }, blk([0.0, 0.5, -1.8], [1, 0])] },
  { level: 'C5', name: 'cascade + jack falls short', expect: 'lose', plan: [blk([0.0, 0.5, -1.8], [1, 0]), { pick: 'jack', dir: [0, -1], power: 0.6, wait: 4 }] },
  // C6 턱시도의 도미노 (5-4, tux)
  { level: 'C6', name: 'one train start (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'train', dir: [-1, 0], power: 0.7, wait: 12 }] },
  // C7 페르시안의 안목 (2-5, persian)
  { level: 'C7', name: 'dining cloth + flour (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'cloth', dir: [-1, 0], power: 0.4, wait: 4 }, { pick: 'flour', dir: [0, 1], power: 0.95 }] },
  { level: 'C7', name: 'dining cloth + cake (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'cloth', dir: [-1, 0], power: 0.4, wait: 4 }, { pick: 'cake', dir: [0, 1], power: 0.6 }] },
  // C8 벵갈의 높이뛰기 (5-3, bengal reaches the shelf)
  { level: 'C8', name: 'shelf sweep, ballerina, snow globe by paw', expect: 'win', plan: [{ pick: 'doll', near: [-1.9, 5.2, -3.85], dir: [1, 0.2], power: 1, wait: 3 }, ballerina, { pick: 'globeSnow', dir: [0, 1], power: 0.6, wait: 3 }] },
  // C9 황금냥의 금손 (8-2, gold)
  { level: 'C9', name: 'flood + printer drag (3★)', expect: 'win', minStars: 3, plan: [hit('waterBottle', [-1, 0], 0.8, 5), hit('printer', [0, 1], 1, 4)] },
  { level: 'C9', name: 'flood only (1★)', expect: 'win', maxStars: 1, plan: [hit('waterBottle', [-1, 0], 0.8, 6)] },
  // C10 우주냥의 무중력 (1-2, space: lob onto the shelf over the TV)
  { level: 'C10', name: 'vase floated up onto the TV shelf (3★)', expect: 'win', minStars: 3, plan: [{ pick: 'vase', near: [-0.75, 1.25, 0.7], dir: [0.613, -0.79], power: 0.7, wait: 4 }] },
  { level: 'C10', name: 'soda rocket (2★)', expect: 'win', minStars: 2, maxStars: 2, plan: [{ pick: 'soda', dir: [0.3, -1], power: 0.8, wait: 4 }] },
  { level: 'C10', name: 'mug floats into the wall', expect: 'lose', plan: [{ pick: 'mug', near: [-0.2, 1.25, 0.4], dir: [0.6, -0.8], power: 0.7, wait: 4 }] },
);
