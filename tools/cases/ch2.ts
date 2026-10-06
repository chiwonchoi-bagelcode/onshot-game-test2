import type { Case } from './types';
import type { Action } from '../sim';

const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

export const CASES: Case[] = [
  { level: '2-1', name: 'slow tablecloth pull', expect: 'win', minStars: 2, plan: [{ pick: 'cloth', dir: [0, 1], power: 0.4 }] },
  { level: '2-1', name: 'magician yank keeps dishes', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 1 }, { pick: 'toaster', dir: [0, 1], power: 0.3 }] },
  { level: '2-3', name: 'toaster pushed under shelf', expect: 'win', plan: [{ pick: 'toaster', dir: [0, -1], power: 0.5 }] },
  { level: '2-3', name: 'soda rocket into shelf', expect: 'win', plan: [{ pick: 'soda', dir: [0, -1], power: 0.8 }] },
  { level: '2-2', name: 'carton + rolling pin', expect: 'win', plan: [{ pick: 'carton', dir: [0, 1], power: 0.5, wait: 2 }, { pick: 'pin', dir: [0, 1], power: 0.6 }] },
];
