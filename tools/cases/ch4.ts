import type { Case } from './types';
import type { Action } from '../sim';

const A = (pick: string, dir: [number, number], power: number, extra: Partial<Action> = {}): Action => ({ pick, dir, power, ...extra });

export const CASES: Case[] = [
  /* 4-1 풍덩! */
  { level: '4-1', name: 'tutorial: phone into the tub', expect: 'win', plan: [A('phone', [-1, 0], 0.6)] },
  { level: '4-1', name: 'phone + glass smash', expect: 'win', plan: [A('phone', [-1, 0], 0.6), A('perfume', [0, 1], 0.6), A('toothcup', [0, 1], 0.6)] },
  { level: '4-1', name: 'all electronics in the water (3★)', expect: 'win', minStars: 3, challenges: [2], plan: [A('phone', [-1, 0], 0.8), A('전동칫솔', [-1, 0], 0.6), A('블루투스 스피커', [0, 1], 0.4)] },
  { level: '4-1', name: 'soap shove + shampoo shove + speaker (all ch.)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [A('soap', [-1, 0], 0.8), A('shampoo', [-1, 0], 0.7), A('블루투스 스피커', [0, 1], 0.4)] },
  { level: '4-1', name: 'naive: phone pushed away from the water', expect: 'lose', plan: [A('phone', [0, 1], 0.6), A('perfume', [0, 1], 0.6), A('toothcup', [0, 1], 0.6)] },
];
