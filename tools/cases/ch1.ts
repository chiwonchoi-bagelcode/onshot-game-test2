import type { Case } from './types';
import type { Action } from '../sim';

const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

export const CASES: Case[] = [
  { level: '1-1', name: 'direct vase', expect: 'win', plan: [{ pick: 'vase', dir: [0, 1], power: 0.8 }] },
  { level: '1-1', name: 'book domino', expect: 'win', minStars: 2, plan: [book([-1.05, 1.5, 0.55], [1, 0])] },
  { level: '1-1', name: 'domino + mug thrown at tea set', expect: 'win', minStars: 3, plan: [{ ...book([-1.05, 1.5, 0.55], [1, 0]), wait: 3 }, { pick: 'mug', near: [-0.55, 1.4, -0.1], dir: [1, 0.3], power: 0.9 }] },
  { level: '1-2', name: 'TV full-power top swat', expect: 'win', plan: [{ pick: 'tv', dir: [0, 1], power: 1, at: 'top' }] },
  { level: '1-2', name: 'TV weak swat does nothing', expect: 'lose', plan: [{ pick: 'tv', dir: [0, 1], power: 0.5, at: 'top' }, { pick: 'plant', dir: [1, 0], power: 0.3 }, { pick: 'cushion', dir: [0, 1], power: 0.3 }] },
  { level: '1-2', name: 'lamp -> shelf -> TV', expect: 'win', plan: [{ pick: 'lamp', dir: [1.6, -2.0], power: 1, at: 'top' }] },
  { level: '1-2', name: 'soda rocket -> shelf', expect: 'win', plan: [{ pick: 'soda', dir: [1.1, -3.8], power: 0.8 }] },
  { level: '1-3', name: 'shake bookshelf', expect: 'win', plan: [{ pick: 'bookshelf', dir: [1, 0], power: 1, at: 0.86 }] },
  { level: '1-3', name: 'double swat topples bookshelf', expect: 'win', minStars: 3, plan: [{ pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86, wait: 1.0 }, { pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86 }] },
];
