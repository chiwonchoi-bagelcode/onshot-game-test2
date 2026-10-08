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
