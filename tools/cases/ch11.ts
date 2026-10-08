import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid', trick?: Action['trick']): Action => ({ pick, near, dir, power, at, wait, trick });
const RED: [number, number, number] = [-2.2, 1, 4.35];

export const CASES: Case[] = [
  // 11-3 지구 최후의 날
  { level: '11-3', name: 'yarn → conveyor → crane → bomb down → red button (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [hit('yarn', [1, 0], 0.6, 10), hit('button', [0, -1], 0.5, 6, RED)] },
  { level: '11-3', name: 'crane lever by paw, then the button', expect: 'win', minStars: 3, challenges: [1], plan: [hit('lever', [1, 0], 0.5, 5, [2.95, 0, -0.8]), hit('button', [0, -1], 0.5, 6, RED)] },
  { level: '11-3', name: 'knead the counterweight pad, then the button', expect: 'win', minStars: 3, challenges: [1, 2], plan: [hit('rig', [1, 0], 0.5, 6, undefined, 'low', 'knead'), hit('button', [0, -1], 0.5, 6, RED)] },
  { level: '11-3', name: 'fake ending: cover by paw, bomb still aimed at the sky (1★)', expect: 'win', plan: [hit('gate', [0, -1], 0.5, 1), hit('button', [0, -1], 0.5, 6, RED)] },
  { level: '11-3', name: 'button under its closed cover', expect: 'lose', plan: [hit('button', [0, -1], 0.5, 2, RED), hit('button', [0, -1], 0.5, 2, RED), hit('button', [0, -1], 0.5, 2, RED)] },
];
