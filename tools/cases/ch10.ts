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
CASES.push(
  // 10-2 선로 전환기
  { level: '10-2', name: 'points to the siding, then the chock', expect: 'win', minStars: 2, challenges: [0, 2], plan: [hit('lever', [1, 0], 0.5, 1), hit('chock', [0, 1], 0.8, 8)] },
  { level: '10-2', name: 'chock first, points thrown on the way down', expect: 'win', challenges: [1], plan: [hit('chock', [0, 1], 0.8, 1.3), hit('lever', [1, 0], 0.5, 8)] },
  { level: '10-2', name: 'celadon rack rolled onto the siding (3★)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [hit('lever', [1, 0], 0.5, 1), hit('rack', [0, -1], 0.4, 0.2), hit('chock', [0, 1], 0.8, 8)] },
  { level: '10-2', name: 'chock only: straight into the buffer', expect: 'lose', plan: [hit('chock', [0, 1], 0.8, 8)] },
  { level: '10-2', name: 'points thrown too late', expect: 'lose', plan: [hit('chock', [0, 1], 0.8, 2.3), hit('lever', [1, 0], 0.5, 8)] },
);
CASES.push(
  // 10-4 공항 수하물
  { level: '10-4', name: 'two bags in, cart off down the ramp (2★)', expect: 'win', minStars: 2, challenges: [0, 2], plan: [wait(3), hit('cart', [1, 0], 0.6, 8)] },
  { level: '10-4', name: 'cart + the whisky on the counter (3★)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [wait(3), hit('cart', [1, 0], 0.6, 6), hit('whisky', [0, -1], 1, 6, [9, 0.95, -1.9], 'top')] },
  { level: '10-4', name: 'wait for all five bags', expect: 'win', challenges: [1], plan: [wait(8), hit('cart', [1, 0], 0.6, 8)] },
  { level: '10-4', name: 'two shoves on the duty-free cabinet (1★)', expect: 'win', maxStars: 1, plan: [hit('vitrine', [1, 0], 1, 0.9, undefined, 0.86), hit('vitrine', [1, 0], 1, 6, undefined, 0.86)] },
  { level: '10-4', name: 'cart sent while the guard looks', expect: 'lose', plan: [wait(6), hit('cart', [1, 0], 0.6, 8)] },
);
