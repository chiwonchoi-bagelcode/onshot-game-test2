import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });

export const CASES: Case[] = [
  // 10-1 기차 식당칸
  { level: '10-1', name: 'release the cart, brake while the steward is next door (3★)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('cart', [1, 0], 0.3, 6), hit('lever', [1, 0], 0.5, 10)] },
  { level: '10-1', name: 'release the cart, brake right away (seen, 2★)', expect: 'win', minStars: 2, challenges: [0, 1], plan: [hit('cart', [1, 0], 0.3, 2), hit('lever', [1, 0], 0.5, 10)] },
  { level: '10-1', name: 'brake only (the rim saves the tower)', expect: 'lose', plan: [hit('lever', [1, 0], 0.5, 10)] },
  { level: '10-1', name: 'cart pushed but no brake', expect: 'lose', plan: [hit('cart', [1, 0], 1, 10)] },
];
const wait = (s: number): Action => ({ pick: 'wait', dir: [0, 0], power: 0, wait: s });
const LA: [number, number, number] = [-12.5, 0, 4.6], LC: [number, number, number] = [12.5, 0, 4.6], MID: [number, number, number] = [0, 2, -1];
CASES.push(
  // 10-3 항구 컨테이너
  { level: '10-3', name: 'both gantries timed seaward (3★)', expect: 'win', minStars: 3, challenges: [1], plan: [wait(1), hit('lever', [1, 0], 0.5, 4, LA), hit('lever', [-1, 0], 0.5, 8, LC)] },
  { level: '10-3', name: 'one gantry + rocking the middle one over', expect: 'win', challenges: [2], plan: [wait(1), hit('lever', [1, 0], 0.5, 2, LA), hit('container', [0, -1], 1, 0.2, MID, 'top'), hit('container', [0, -1], 1, 8, MID, 'top')] },
  { level: '10-3', name: 'gantry released on the way back (misses)', expect: 'lose', plan: [wait(5), hit('lever', [1, 0], 0.5, 8, LA), hit('lever', [-1, 0], 0.5, 8, LC)] },
);
