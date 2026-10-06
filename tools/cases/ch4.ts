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

  /* 4-2 문틈으로 미끄덩 */
  { level: '4-2', name: 'soap under the booth door (1 paw)', expect: 'win', challenges: [0], plan: [A('soap', [1, 0], 0.85)] },
  { level: '4-2', name: 'soap strike + vanity sweep (3★)', expect: 'win', minStars: 3, challenges: [1], plan: [A('soap', [1, 0], 0.85, { wait: 2 }), A('perfume', [-1, 0.3], 0.9, { near: [1.15, 2, -2.55] })] },
  { level: '4-2', name: 'soap + unroll the toilet paper', expect: 'win', challenges: [2], plan: [A('soap', [1, 0], 0.85, { wait: 2 }), A('tp', [0.5, 1], 0.6)] },
  { level: '4-2', name: 'naive: smash the vanity, weak soap', expect: 'lose', plan: [A('perfume', [-1, 0.3], 0.9, { near: [1.15, 2, -2.55] }), A('soap', [1, 0], 0.4)] },

  /* 4-3 휴지 대작전 */
  { level: '4-3', name: 'knock the speaker dam off the slide (1 paw)', expect: 'win', minStars: 2, challenges: [0], plan: [A('블루투스 스피커', [0.2, 1], 0.7)] },
  { level: '4-3', name: 'dam + perfume bomb (3★)', expect: 'win', minStars: 3, challenges: [2], plan: [A('블루투스 스피커', [0.2, 1], 0.7, { wait: 2 }), A('perfume', [0, 1], 0.6)] },
  { level: '4-3', name: 'dam + long toilet-paper trail', expect: 'win', challenges: [1], plan: [A('블루투스 스피커', [0.2, 1], 0.7, { wait: 2 }), A('tp', [1, 0.4], 1, { near: [-3.1, 0.3, 0.3] })] },
  { level: '4-3', name: 'naive: speaker pushed into the toilet clogs it', expect: 'lose', plan: [A('블루투스 스피커', [1, 0], 0.9), A('tp', [1, 0], 0.6, { near: [0.4, 2.6, -2.4] })] },

  /* 4-4 드라이기 태풍 */
  { level: '4-4', name: 'dryer typhoon wakes the owner (1 paw)', expect: 'win', minStars: 2, challenges: [0], plan: [A('dryer', [-1, 0], 0.6)] },
  { level: '4-4', name: 'typhoon + diffuser (3★)', expect: 'win', minStars: 3, challenges: [2], plan: [A('dryer', [-1, 0], 0.6, { wait: 2 }), A('디퓨저', [0, 1], 0.6)] },
  { level: '4-4', name: 'typhoon, then knock the running dryer off', expect: 'win', challenges: [1], plan: [A('dryer', [-1, 0], 0.6, { wait: 3 }), A('dryer', [-1, 0.3], 0.7)] },
  { level: '4-4', name: 'naive: one bottle at a time', expect: 'lose', plan: [A('스킨', [-1, 0], 0.7), A('로션', [-1, 0], 0.8)] },

  /* 4-5 욕실 대홍수 */
  { level: '4-5', name: 'sure: soap express + typhoon + speaker', expect: 'win', minStars: 2, challenges: [0, 2], plan: [A('soap', [1, 0], 0.9, { wait: 3 }), A('dryer', [-1, 0], 0.6, { wait: 4 }), A('블루투스 스피커', [0, 1], 0.5)] },
  { level: '4-5', name: 'soap -> typhoon -> fan (all challenges)', expect: 'win', minStars: 2, challenges: [0, 1, 2], plan: [A('soap', [1, 0], 0.9, { wait: 3 }), A('dryer', [-1, 0], 0.6, { wait: 4 }), A('fan', [-1, 0], 0.6, { wait: 6 })] },
  { level: '4-5', name: 'typhoon -> fan -> soap (3★ big mess)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [A('dryer', [-1, 0], 0.6, { wait: 4 }), A('fan', [-1, 0], 0.6, { wait: 6 }), A('soap', [1, 0], 0.8, { wait: 3 })] },
  { level: '4-5', name: 'naive: single swats only', expect: 'lose', plan: [A('전동칫솔', [-1, 0], 0.6), A('블루투스 스피커', [0, 1], 0.4), A('스킨', [0, 1], 0.6)] },
];
