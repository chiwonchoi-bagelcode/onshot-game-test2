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
