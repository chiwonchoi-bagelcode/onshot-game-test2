import type { Case } from './types';
import type { Action } from '../sim';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

export const CASES: Case[] = [
  { level: '3-1', name: 'alarm + falling book', expect: 'win', plan: [{ pick: 'alarm', dir: [-1, 0], power: 0.6, wait: 4 }, book([-3, 3.6, -3.4], [0, 1], 0.4)] },
  { level: '3-1', name: 'plant + two books', expect: 'win', plan: [{ pick: 'plant', dir: [0, 1], power: 0.4, wait: 2 }, book([-3, 3.6, -3.4], [0, 1], 0.4), book([-2.7, 3.6, -3.4], [0, 1], 0.4)] },
  { level: '3-2', name: 'laptop slid off the end', expect: 'win', plan: [{ pick: 'laptop', dir: [1, 0], power: 0.6 }] },
  { level: '3-2', name: 'desk lamp sweep', expect: 'win', plan: [{ pick: 'deskLamp', dir: [-1, 0], power: 1 }] },
  { level: '3-2', name: 'laptop blocked by books', expect: 'lose', plan: [{ pick: 'laptop', dir: [0, 1], power: 0.6 }, { pick: 'cushion', dir: [1, 0], power: 0.3 }] },
  { level: '3-5', name: 'domino -> rocket -> shelf + two vases', expect: 'win', plan: [{ pick: 'domino', near: [-2.6, 0.3, 2.0], dir: [1, 0.3], power: 0.4, at: 'top', wait: 4 }, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
  { level: '3-5', name: 'piecemeal is not enough', expect: 'lose', plan: [{ pick: 'laptop', dir: [1, 0], power: 0.8, wait: 3 }, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
];
