import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });

export const CASES: Case[] = [
  // 7-1 문이 열렸다
  { level: '7-1', name: 'tutorial: pull the chock (gate closed)', expect: 'win', challenges: [1], plan: [hit('chock', [1, 0], 0.8, 8)] },
  { level: '7-1', name: 'open the gate, then the chock (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [hit('gate', [1, 0], 0.6, 1.5), hit('chock', [1, 0], 0.8, 8)] },
  { level: '7-1', name: 'chock, then the gate just in time', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('chock', [1, 0], 0.8, 0.1), hit('gate', [1, 0], 0.6, 8)] },
  { level: '7-1', name: 'paw the car three times (scratch only)', expect: 'lose', plan: [hit('auto', [1, 0], 1, 2, [-6, 1, -1]), hit('auto', [1, 0], 1, 2, [-6, 1, -1]), hit('auto', [-1, 0], 1, 2, [-6, 1, -1])] },
  { level: '7-1', name: 'garden junk only', expect: 'lose', plan: [hit('bin', [1, 0], 1, 3, [-0.9, 0, 2.6]), hit('gnome', [1, 0], 1, 2, [8.6, 0, 2.2]), hit('birdbath', [1, 0], 1, 3)] },
];
