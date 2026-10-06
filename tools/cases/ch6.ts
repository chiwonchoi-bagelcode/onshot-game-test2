import type { Case } from './types';
import type { Action } from '../sim';

const top = (pick: string, dir: [number, number], power: number, wait = 4, near?: [number, number, number]): Action => ({ pick, near, dir, power, at: 'top', wait });

export const CASES: Case[] = [
  // 6-1 현관의 거인
  { level: '6-1', name: 'tutorial: clock through the door', expect: 'win', plan: [top('grandClock', [1, 0], 0.85)] },
  { level: '6-1', name: 'coat rack line, 1 paw', expect: 'win', challenges: [0, 1], plan: [top('coatRack', [1, 0], 0.8)] },
  { level: '6-1', name: 'coat rack line + cabinet sweep (3★)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [top('coatRack', [1, 0], 0.8), { pick: 'plant', near: [-8, 1.5, -3.2], dir: [1, 0.15], power: 0.92, at: 'mid', wait: 3 }] },
  { level: '6-1', name: 'clock + cabinet sweep', expect: 'win', minStars: 2, plan: [top('grandClock', [1, 0], 0.85), { pick: 'plant', near: [-8, 1.5, -3.2], dir: [1, 0.15], power: 0.92, at: 'mid', wait: 3 }] },
  { level: '6-1', name: 'in-room: floor lamp onto the TV', expect: 'win', plan: [top('lamp', [-0.3, 1], 0.8)] },
  { level: '6-1', name: 'paw the bolted TV', expect: 'lose', plan: [{ pick: 'tv', dir: [1, 0], power: 1, at: 'top', wait: 2 }, { pick: 'tv', dir: [-1, 0], power: 1, at: 'top', wait: 2 }] },
  { level: '6-1', name: 'clock falls the wrong way', expect: 'lose', plan: [top('grandClock', [0, -1], 0.9), top('coatRack', [0, 1], 0.8)] },
  // 6-2 로켓 택배
  { level: '6-2', name: 'shake the soda straight at the shelf', expect: 'win', challenges: [1], plan: [{ pick: 'soda', dir: [0, -1], power: 0.6, wait: 6 }] },
  { level: '6-2', name: 'soda + tablecloth pull (2★)', expect: 'win', minStars: 2, plan: [{ pick: 'soda', dir: [0, -1], power: 0.6, wait: 6 }, { pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }] },
  { level: '6-2', name: 'domino loop kitchen→living→kitchen', expect: 'win', challenges: [0, 1, 2], plan: [top('domino', [0.35, 0.94], 0.4, 8, [-3.2, 0.3, -2.9])] },
  { level: '6-2', name: 'domino loop + tablecloth (3★)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [top('domino', [0.35, 0.94], 0.4, 8, [-3.2, 0.3, -2.9]), { pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }] },
  { level: '6-2', name: 'roomba shoves the soda into the wall', expect: 'lose', plan: [{ pick: 'roomba', dir: [0, -1], power: 0.7, wait: 6 }, { pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }] },
  { level: '6-2', name: 'rocket aimed at the TV side', expect: 'lose', plan: [{ pick: 'soda', dir: [-1, -0.2], power: 0.6, wait: 6 }, { pick: 'vase', dir: [1, 0], power: 0.7, wait: 3, near: [-1.1, 1.3, 4.2] }] },
];
