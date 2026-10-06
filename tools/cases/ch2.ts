import type { Case } from './types';
import type { Action } from '../sim';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

const cloth = (dir: [number, number], power = 0.4, wait = 4): Action => ({ pick: 'cloth', dir, power, wait });

export const CASES: Case[] = [
  // 2-1 식탁보의 마술
  { level: '2-1', name: 'slow tablecloth pull', expect: 'win', minStars: 2, challenges: [0], plan: [cloth([0, 1], 0.4, 0.6)] },
  { level: '2-1', name: 'gentle pull + champagne (3 stars)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [cloth([0, 1], 0.32), { pick: '샴페인', dir: [0, 1], power: 0.6 }] },
  { level: '2-1', name: 'magician yank keeps dishes', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 1 }, { pick: 'toaster', dir: [0, 1], power: 0.3 }] },

  // 2-2 달걀 대소동
  { level: '2-2', name: 'carton + rolling pin (sure clear)', expect: 'win', challenges: [0, 2], plan: [{ pick: 'carton', dir: [0, 1], power: 0.4, wait: 2 }, { pick: 'pin', dir: [0, 1], power: 0.4 }] },
  { level: '2-2', name: 'flour bag pushes the carton + pin (3 stars)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [{ pick: 'flour', dir: [0, 1], power: 0.8, wait: 3 }, { pick: 'pin', dir: [0, 1], power: 0.4 }] },
  { level: '2-2', name: 'carton smashed onto the table', expect: 'lose', plan: [{ pick: 'carton', dir: [0, 1], power: 1, wait: 2 }, { pick: 'pin', dir: [0, -1], power: 0.5, wait: 2 }, { pick: 'cup', dir: [0, 1], power: 0.5 }] },

  // 2-3 높은 선반 작전
  { level: '2-3', name: 'toaster pushed under shelf', expect: 'win', challenges: [0, 1], plan: [{ pick: 'toaster', dir: [0, -1], power: 0.7 }] },
  { level: '2-3', name: 'toast shelf + wine bottle (2 stars)', expect: 'win', minStars: 2, challenges: [1], plan: [{ pick: 'toaster', dir: [0, -1], power: 0.7, wait: 3 }, { pick: 'bottle', dir: [0, 1], power: 0.6 }] },
  { level: '2-3', name: 'soda rocket into shelf', expect: 'win', challenges: [0, 2], plan: [{ pick: 'soda', dir: [0, -1], power: 0.8 }] },
  { level: '2-3', name: 'rocket shelf + bottle + vase (3 stars)', expect: 'win', minStars: 3, challenges: [2], plan: [{ pick: 'soda', dir: [0, -1], power: 0.8, wait: 3 }, { pick: 'bottle', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'vase', dir: [0, 1], power: 0.6 }] },
  { level: '2-3', name: 'only the low stuff', expect: 'lose', plan: [{ pick: 'cup', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'bottle', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'fruit', dir: [1, 0], power: 0.6 }] },

  // 2-4 아침밥 대참사
  { level: '2-4', name: 'cloth + pan bulldozer (sure clear)', expect: 'win', minStars: 2, challenges: [0, 1], plan: [cloth([0, 1]), { pick: 'pan', dir: [0, 1], power: 0.8 }] },
  { level: '2-4', name: 'cloth + pan + candy jar (3 stars)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [cloth([0, 1]), { pick: 'pan', dir: [0, 1], power: 0.9, wait: 3 }, { pick: 'marbleJar', dir: [0, 1], power: 0.6 }] },
  { level: '2-4', name: 'one box at a time', expect: 'lose', plan: [{ pick: 'cereal', near: [0.2, 2.6, 1.0], dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'milk', near: [1.5, 2.6, 0.9], dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'cereal', near: [2.8, 2.9, -2.45], dir: [0, 1], power: 0.6 }] },

  // 2-5 망쳐진 집들이
  { level: '2-5', name: 'dining cloth + cake (sure clear)', expect: 'win', challenges: [0], plan: [cloth([-1, 0]), { pick: 'cake', dir: [0, 1], power: 0.6 }] },
  { level: '2-5', name: 'dining cloth + flour pushes the cake', expect: 'win', challenges: [0, 2], plan: [cloth([-1, 0]), { pick: 'flour', dir: [0, 1], power: 0.95 }] },
  { level: '2-5', name: 'rocket over the wall + cloth + flour (3 stars)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'soda', dir: [0.92, -0.38], power: 0.8, wait: 4 }, cloth([0.71, -0.71]), { pick: 'flour', dir: [0, 1], power: 0.95 }] },
  { level: '2-5', name: 'cake + two plates by hand', expect: 'lose', plan: [{ pick: 'cake', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'plate', near: [5.9, 2.4, 0.1], dir: [-1, 0], power: 0.6, wait: 2 }, { pick: 'plate', near: [8.7, 2.4, 1.1], dir: [1, 0], power: 0.6 }] },
];
