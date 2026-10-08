import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });

const W91 = 2.0;

export const CASES: Case[] = [
  // 9-1 주차장의 슈퍼카
  { level: '9-1', name: 'chock timed to the barrier (1 paw, 3★)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [{ pick: 'wait', dir: [0, 0], power: 0, wait: W91 }, hit('chock', [1, 0], 0.8, 8)] },
  { level: '9-1', name: 'booth button, then the chock (2★)', expect: 'win', minStars: 2, challenges: [1, 2], plan: [hit('button', [1, 0], 0.5, 1), hit('chock', [1, 0], 0.8, 8)] },
  { level: '9-1', name: 'chock while the arm is down', expect: 'lose', plan: [hit('chock', [1, 0], 0.8, 8), hit('cart', [1, 0], 1, 6, [-10, 3, -1.2])] },
  { level: '9-1', name: 'paw the supercar (scratch)', expect: 'lose', plan: [hit('auto', [1, 0], 1, 2, [10.4, 0, -1.2]), hit('auto', [-1, 0], 1, 2, [10.4, 0, -1.2])] },
];
const wait = (s: number): Action => ({ pick: 'wait', dir: [0, 0], power: 0, wait: s });
const CRANE: [number, number, number] = [-9.2, 0, 1.6], BALL: [number, number, number] = [9.6, 0, 4.8];
CASES.push(
  // 9-3 공사장 크레인
  { level: '9-3', name: 'crane dropped right over the house (1 paw, 3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [wait(1), hit('lever', [1, 0], 0.5, 8, CRANE)] },
  { level: '9-3', name: 'crane, the next pass over the house', expect: 'win', minStars: 3, plan: [wait(5), hit('lever', [1, 0], 0.5, 8, CRANE)] },
  { level: '9-3', name: 'wrecking ball, then the crane to finish (2★)', expect: 'win', minStars: 2, plan: [hit('lever', [-1, 0], 0.5, 6, BALL), wait(2), hit('lever', [1, 0], 0.5, 8, CRANE)] },
  { level: '9-3', name: 'wrecking ball alone (half a house)', expect: 'lose', plan: [hit('lever', [-1, 0], 0.5, 10, BALL)] },
  { level: '9-3', name: 'crane dropped on empty ground', expect: 'lose', plan: [wait(4), hit('lever', [1, 0], 0.5, 8, CRANE)] },
  { level: '9-3', name: 'tip the site toilet as a bonus', expect: 'win', challenges: [0, 2], plan: [wait(1), hit('lever', [1, 0], 0.5, 8, CRANE), hit('toilet', [1, 0], 1, 4, undefined, 'top')] },
);
const CRANE94: [number, number, number] = [-14, 0, 1], BALL94: [number, number, number] = [10.6, 0, -6.6];
CASES.push(
  // 9-4 도시 대붕괴
  { level: '9-4', name: 'one perfect crane drop topples both towers (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [wait(1), hit('lever', [1, 0], 0.5, 8, CRANE94)] },
  { level: '9-4', name: 'crane on the left tower, wrecking ball on the right', expect: 'win', minStars: 2, challenges: [0, 1], plan: [wait(1), hit('lever', [1, 0], 0.5, 3, CRANE94), hit('lever', [-1, 0], 0.5, 10, BALL94)] },
  { level: '9-4', name: 'crane, then the truck into the right tower', expect: 'win', challenges: [0, 1, 2], plan: [wait(2), hit('lever', [1, 0], 0.5, 1, CRANE94), hit('chock', [-1, 0], 0.8, 10)] },
  { level: '9-4', name: 'only the right tower (truck + ball)', expect: 'lose', plan: [hit('lever', [-1, 0], 0.5, 3, BALL94), hit('chock', [-1, 0], 0.8, 10)] },
);
