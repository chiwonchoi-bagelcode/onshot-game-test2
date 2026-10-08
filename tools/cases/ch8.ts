import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });

export const CASES: Case[] = [
  // 8-1 도자기 공방
  { level: '8-1', name: 'two shoves up high while it rocks', expect: 'win', minStars: 2, challenges: [1], plan: [hit('vitrine', [1, 0], 1, 0.2, undefined, 'top'), hit('vitrine', [1, 0], 1, 5, undefined, 'top')] },
  { level: '8-1', name: 'one shove only', expect: 'lose', plan: [hit('vitrine', [1, 0], 1, 5, undefined, 'top'), hit('vitrine', [-1, 0], 1, 5, undefined, 'low')] },
  { level: '8-1', name: 'shoves too far apart', expect: 'lose', plan: [hit('vitrine', [1, 0], 1, 2.5, undefined, 'top'), hit('vitrine', [1, 0], 1, 5, undefined, 'top')] },
  { level: '8-1', name: 'rack rolls in, paw as it rocks, bench domino (3★)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('rack', [1, -0.1], 1, 4), hit('vitrine', [1, 0], 1, 4, undefined, 'top'), hit('maebyeong', [1, 0], 1, 6, [-6, 1.3, -3.6], 'top')] },
  { level: '8-1', name: 'rack alone', expect: 'lose', plan: [hit('rack', [1, -0.1], 1, 8), hit('bucket', [1, 0], 1, 3)] },
];
CASES.push(
  // 8-2 새 사무실 개업
  { level: '8-2', name: 'water bottle into the aisle: short circuit (1 paw)', expect: 'win', challenges: [0, 1], plan: [hit('waterBottle', [-1, 0], 0.8, 6)] },
  { level: '8-2', name: 'flood + the printer drags the boss monitor (3★)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [hit('waterBottle', [-1, 0], 0.8, 5), hit('printer', [0, 1], 1, 4)] },
  { level: '8-2', name: 'one monitor off each row + printer (3★)', expect: 'win', minStars: 3, challenges: [2], plan: [hit('monitor', [0, 1], 1, 4, [-2.5, 1.6, -3.2]), hit('monitor', [0, 1], 1, 4, [-2.5, 1.6, 1.0]), hit('printer', [0, 1], 1, 4)] },
  { level: '8-2', name: 'bottle the wrong way, then the chairs', expect: 'lose', plan: [hit('waterBottle', [1, 0], 0.8, 5), hit('chair', [-1, 0], 1, 3, [5.6, 0, 0]), hit('chair', [0, -1], 1, 3, [0.2, 0, 2.7])] },
);
