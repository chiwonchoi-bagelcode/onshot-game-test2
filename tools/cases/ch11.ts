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

const SRV: [number, number, number] = [-8.6, 0, -4.4];
const meowAt = (pick: string, wait = 1.5): Action => ({ pick, dir: [1, 0], power: 0.5, trick: 'meow', wait });
CASES.push(
  // 11-1 보안 구역 잠입
  { level: '11-1', name: 'meow at the vending machine, then the trolley', expect: 'win', challenges: [0], plan: [meowAt('vending'), hit('rack', [1, 0], 1, 6)] },
  { level: '11-1', name: 'trolley under his nose (caught, 1★)', expect: 'win', maxStars: 1, plan: [hit('rack', [1, 0], 1, 6)] },
  { level: '11-1', name: 'folders + the server row (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [meowAt('vending'), hit('rack', [1, 0], 1, 2), hit('server', [1, 0], 1, 0.9, SRV, 0.86), hit('server', [1, 0], 1, 6, SRV, 0.86)] },
  { level: '11-1', name: 'servers first, one meow for both guards', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('server', [1, 0], 1, 0.9, SRV, 0.86), hit('server', [1, 0], 1, 3, SRV, 0.86), meowAt('vending'), hit('rack', [1, 0], 1, 6)] },
  { level: '11-1', name: 'a gentle trolley nudge', expect: 'lose', plan: [meowAt('vending'), hit('rack', [1, 0], 0.5, 6), hit('folder', [0, 1], 0.4, 4, [4.2, 1.1, -5.0])] },
);
CASES.push(
  // 11-2 NASA 발사 준비
  { level: '11-2', name: 'fuel on the floor, the dolly glides into the tank (3★)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [hit('hose', [1, 0], 0.6, 8)] },
  { level: '11-2', name: 'then the spray across mission control', expect: 'win', challenges: [0, 1], plan: [hit('hose', [1, 0], 0.6, 5), hit('hose', [1, 1], 0.6, 6)] },
  { level: '11-2', name: 'shoving the tank by paw', expect: 'lose', plan: [hit('fuelTank', [1, 0], 1, 0.9, undefined, 0.86), hit('fuelTank', [1, 0], 1, 6, undefined, 0.86)] },
  { level: '11-2', name: 'dolly by paw, then a shove on the engine', expect: 'win', challenges: [1], plan: [hit('cart', [1, 0], 1, 4), hit('engine', [1, 0], 1, 6)] },
  { level: '11-2', name: 'a gentle nudge on the dolly', expect: 'lose', plan: [hit('cart', [1, 0], 0.4, 8)] },
);
