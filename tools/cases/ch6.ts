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
  // 6-3 물바다 복도
  { level: '6-3', name: 'aquarium off + paw the phone', expect: 'win', minStars: 2, challenges: [1], plan: [top('aquarium', [0, 1], 0.85, 4), { pick: 'phone', near: [3.75, 1, 0.7], dir: [0, 1], power: 0.6, wait: 4 }] },
  { level: '6-3', name: 'fan sweep + aquarium flood (3★)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [{ pick: 'fan', dir: [-1, 0], power: 0.5, wait: 3 }, top('aquarium', [0, 1], 0.85, 6)] },
  { level: '6-3', name: 'flood first, then the fan', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [top('aquarium', [0, 1], 0.85, 4), { pick: 'fan', dir: [-1, 0], power: 0.5, wait: 8 }] },
  { level: '6-3', name: 'coat rack smashes tank, tablet pinned', expect: 'lose', plan: [top('coatRack', [0.66, -0.75], 0.8, 4), { pick: 'phone', near: [7.7, 1.6, 0.8], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'phone', near: [3.75, 1, 0.7], dir: [0, 1], power: 0.6, wait: 4 }] },
  { level: '6-3', name: 'everything into the bathtub?', expect: 'lose', plan: [{ pick: 'phone', near: [3.75, 1, 0.7], dir: [-1, -0.3], power: 1, wait: 3 }, { pick: 'phone', near: [-1.8, 0, 2.3], dir: [-1, -1], power: 1, wait: 3 }, { pick: 'phone', near: [7.7, 2.6, 0.8], dir: [-1, 0], power: 1, wait: 3 }] },
  { level: '6-3', name: 'tank nudged too gently', expect: 'lose', plan: [top('aquarium', [0, 1], 0.4, 3), { pick: 'fan', dir: [-1, 0], power: 0.5, wait: 6 }, top('coatRack', [-1, 0], 0.6, 3)] },
  // 6-4 풍선 릴레이
  { level: '6-4', name: 'jack-in-the-box ball pops the relay (quiet)', expect: 'win', minStars: 2, challenges: [0, 1], plan: [{ pick: 'jack', dir: [0, -1], power: 0.6, wait: 8 }] },
  { level: '6-4', name: 'grand clock head pops the hallway branch', expect: 'win', minStars: 3, challenges: [2], plan: [top('grandClock', [0, -1], 0.9, 8)] },
  { level: '6-4', name: 'soda rocket into the bedroom balloons', expect: 'win', challenges: [0], plan: [{ pick: 'soda', dir: [0.54, -0.84], power: 0.6, wait: 8 }] },
  { level: '6-4', name: 'jack relay, then the clock for the mess (3★)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'jack', dir: [0, -1], power: 0.6, wait: 8 }, top('grandClock', [0, -1], 0.9, 5)] },
  { level: '6-4', name: 'soft toys at the owner', expect: 'lose', plan: [{ pick: 'pillow', dir: [1, -0.2], power: 1, wait: 3 }, { pick: 'plush', near: [2.2, 0, -2], dir: [1, -1], power: 1, wait: 3 }] },
  { level: '6-4', name: 'coat rack too short, clock the wrong way', expect: 'lose', plan: [top('coatRack', [1, -0.2], 0.9, 4), top('grandClock', [1, 0], 0.9, 6)] },
  // 6-5 와장창 대참사
  { level: '6-5', name: 'hallway topple line, 1 paw (not enough)', expect: 'lose', plan: [top('coatRack', [-1, 0], 0.8, 10)] },
  { level: '6-5', name: 'hallway line + lamp onto the TV', expect: 'win', minStars: 2, challenges: [0, 2], plan: [top('coatRack', [-1, 0], 0.8, 10), top('lamp', [-0.69, -0.73], 0.8, 6)] },
  { level: '6-5', name: 'domino → rocket + hallway line + lamp/TV (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [top('domino', [0.74, -0.67], 0.4, 12, [1.2, 0.3, 6.7]), top('coatRack', [-1, 0], 0.8, 10), top('lamp', [-0.69, -0.73], 0.8, 6)] },
  { level: '6-5', name: 'clock into the TV + flood + rocket', expect: 'win', minStars: 2, plan: [top('grandClock', [0, 1], 0.9, 8), top('aquarium', [0, 1], 0.85, 8), top('domino', [0.74, -0.67], 0.4, 12, [1.2, 0.3, 6.7])] },
  { level: '6-5', name: 'toaster + hallway line + lamp', expect: 'win', minStars: 2, plan: [{ pick: 'toaster', dir: [0, -1], power: 0.4, wait: 6 }, top('coatRack', [-1, 0], 0.8, 10), top('lamp', [-0.69, -0.73], 0.8, 6)] },
  { level: '6-5', name: 'vase at the TV + rocket + hallway line', expect: 'win', minStars: 3, challenges: [0, 1], plan: [top('vase', [1, 0], 0.7, 3, [-4.3, 1.3, 4.0]), top('domino', [0.74, -0.67], 0.4, 12, [1.2, 0.3, 6.7]), top('coatRack', [-1, 0], 0.8, 10)] },
  { level: '6-5', name: 'small stuff only', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }, { pick: 'perfume', dir: [0, 1], power: 0.7, wait: 3 }, top('doll', [-1, 0], 0.7, 4)] },
];
