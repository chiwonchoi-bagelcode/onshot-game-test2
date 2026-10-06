import type { Case } from './types';
import type { Action } from '../sim';

/** swat a castle block nearest to a point */
const blk = (near: [number, number, number], dir: [number, number], power = 0.6, wait = 4): Action => ({ pick: 'block', near, dir, power, wait });

export const CASES: Case[] = [
  // 5-1 블록 성의 공주님
  { level: '5-1', name: 'tutorial: both castles, posts outward', expect: 'win', challenges: [0], plan: [blk([-0.2, 0.5, -1.6], [-1, 0]), blk([2.1, 0.5, -0.8], [0, 1])] },
  { level: '5-1', name: 'big castle onto small castle (1 paw)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [blk([1.0, 0.5, -1.6], [1, 0])] },
  { level: '5-1', name: 'cascade + tea set + piggy (spectacle)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [blk([1.0, 0.5, -1.6], [1, 0]), { pick: 'teapot', dir: [-1, 0], power: 0.85, wait: 3 }, { pick: 'piggy', dir: [0, 1], power: 0.8 }] },
  { level: '5-1', name: 'swat globe directly, then castle', expect: 'win', plan: [{ pick: 'globeSnow', dir: [0, 1], power: 0.6, wait: 3 }, blk([-0.2, 0.5, -1.6], [-1, 0])] },
  { level: '5-1', name: 'naive: posts pushed inward', expect: 'lose', plan: [blk([1.0, 0.5, -1.6], [-1, 0]), blk([-0.2, 0.5, -1.6], [1, 0]), blk([2.1, 0.5, -0.8], [0, -1])] },
  // 5-2 풍선 파티
  { level: '5-2', name: 'pop the low left balloon: whole chain (1 paw)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [{ pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, wait: 6 }] },
  { level: '5-2', name: 'ladder chain + table + bed balloons (all 13)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, wait: 6 }, { pick: 'balloon', near: [-1.2, 2.4, 1.5], dir: [1, 0], power: 0.9, wait: 3 }, { pick: 'balloon', near: [-3.6, 3.2, 1.2], dir: [1, 0], power: 0.9, wait: 3 }] },
  { level: '5-2', name: 'arch first, then the left ladder', expect: 'win', plan: [{ pick: 'balloon', near: [1.2, 2.2, -0.5], dir: [0, -1], power: 0.9, wait: 5 }, { pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, wait: 5 }] },
  { level: '5-2', name: 'fort post + left ladder', expect: 'win', plan: [{ pick: 'block', near: [3.6, 0.5, 1.2], dir: [0, 1], power: 0.6, wait: 4 }, { pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9, wait: 5 }] },
  { level: '5-2', name: 'naive: shove the shelf, gentle balloon pats', expect: 'lose', plan: [{ pick: 'bookshelf', dir: [0, 1], power: 1, at: 'top', wait: 2 }, { pick: 'balloon', near: [4.3, 3.3, 1.1], dir: [-1, 0], power: 0.9, wait: 3 }, { pick: 'globeSnow', dir: [0, 1], power: 0.7 }] },
  // 5-3 깜짝 상자 대포
  { level: '5-3', name: 'block jack at shelf + ball jack at balloons', expect: 'win', minStars: 3, challenges: [0, 1], plan: [{ pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, wait: 4 }, { pick: 'jack', near: [1.5, 0.4, -1.5], dir: [1, 0], power: 0.7, wait: 4 }] },
  { level: '5-3', name: 'naive: block jack + paw at the heavy tower', expect: 'lose', plan: [{ pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, wait: 4 }, blk([3.5, 0.5, -1.6], [0, 1], 0.7), blk([3.5, 0.5, -2.8], [0, -1], 0.7)] },
  { level: '5-3', name: 'all three jacks (family photo too)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, wait: 4 }, { pick: 'jack', near: [1.5, 0.4, -1.5], dir: [1, 0], power: 0.7, wait: 4 }, { pick: 'jack', near: [-3.2, 1.4, -1.1], dir: [-1, 0], power: 0.7, wait: 4 }] },
  { level: '5-3', name: 'naive: jacks fired toward the camera', expect: 'lose', plan: [{ pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, 1], power: 0.7, wait: 3 }, { pick: 'jack', near: [1.5, 0.4, -1.5], dir: [0, 1], power: 0.7, wait: 3 }, blk([3.5, 0.5, -1.6], [0, -1])] },
  // 5-4 칙칙폭폭 대탈선
  { level: '5-4', name: 'start the train: bridges + rail balloon chain', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [{ pick: 'train', dir: [-1, 0], power: 0.7, wait: 12 }] },
  { level: '5-4', name: 'pop the middle balloon, then the train', expect: 'win', minStars: 2, challenges: [1], plan: [{ pick: 'balloon', near: [1.45, 2.55, -1.3], dir: [0, -1], power: 0.9, wait: 4 }, { pick: 'train', dir: [-1, 0], power: 0.7, wait: 12 }] },
  { level: '5-4', name: 'direct swats on every target', expect: 'win', plan: [{ pick: 'doll', near: [-1.8, 2.5, 0.6], dir: [1, 0], power: 0.7, wait: 3 }, { pick: 'doll', near: [3, 2.5, 0.8], dir: [1, 0], power: 0.7, wait: 3 }, { pick: 'globeSnow', dir: [0, -1], power: 0.7, wait: 3 }] },
  { level: '5-4', name: 'wrong order: castle first jams the rails', expect: 'lose', plan: [blk([0.6, 0.5, -1.8], [0, 1]), { pick: 'train', dir: [-1, 0], power: 0.7, wait: 12 }, { pick: 'plush', near: [0.6, 0.5, 0.6], dir: [1, 0], power: 0.6 }] },
  // 5-5 놀이방 대소동
  { level: '5-5', name: 'train + castle cascade (2 paws)', expect: 'win', minStars: 2, challenges: [0, 2], plan: [{ pick: 'train', dir: [1, 0], power: 0.7, wait: 14 }, blk([0.0, 0.5, -1.8], [1, 0])] },
  { level: '5-5', name: 'train + cascade + jack: all 7', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'train', dir: [1, 0], power: 0.7, wait: 14 }, blk([0.0, 0.5, -1.8], [1, 0]), { pick: 'jack', dir: [0, -1], power: 0.6, wait: 4 }] },
  { level: '5-5', name: 'playroom only: cascade + jack + doll', expect: 'win', plan: [blk([0.0, 0.5, -1.8], [1, 0]), { pick: 'jack', dir: [0, -1], power: 0.6, wait: 4 }, { pick: 'doll', near: [3.0, 2.3, 2.8], dir: [0, 1], power: 0.7, wait: 3 }] },
  { level: '5-5', name: 'naive: pokes at the near things', expect: 'lose', plan: [{ pick: 'ball', dir: [-1, 0], power: 0.8, wait: 3 }, blk([-1.2, 0.5, -1.8], [1, 0]), { pick: 'jack', dir: [1, 0], power: 0.6, wait: 4 }, { pick: 'piggy', dir: [0, 1], power: 0.8 }] },
];
