import type { Case } from './types';
import type { Action } from '../sim';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

/* 3-1: shelf above the sleeping head */
const alarm31: Action = { pick: 'alarm', dir: [-1, 0], power: 0.6, wait: 2 };
const plant31: Action = { pick: 'plant', dir: [0, 1], power: 0.5, wait: 1.5 };
const piggy31: Action = { pick: 'piggy', dir: [0, 1], power: 0.5, wait: 1.5 };
/* 3-3: sneak */
const doll33: Action = { pick: 'doll', dir: [0, 1], power: 0.6, wait: 3 };
/* 3-4: dressing room */
const cloth34: Action = { pick: 'cloth', dir: [0, 1], power: 0.45, wait: 4 };
const rack34: Action = { pick: 'coatRack', dir: [-1, 0], power: 0.6, at: 'top', wait: 3 };
/* 3-5 */
const domino35: Action = { pick: 'domino', near: [-2.6, 0.3, 2.0], dir: [1, 0.3], power: 0.4, at: 'top', wait: 4 };
const laptop35: Action = { pick: 'laptop', dir: [1, 0], power: 0.8, wait: 3 };

export const CASES: Case[] = [
  // 3-1 새벽 5시 모닝콜
  { level: '3-1', name: 'alarm + plant + book (sure clear)', expect: 'win', minStars: 2, challenges: [1], plan: [alarm31, plant31, book([-2.75, 3.6, -3.4], [0, 1], 0.5)] },
  { level: '3-1', name: 'alarm + piggy on the head (2 paws)', expect: 'win', challenges: [0, 1, 2], plan: [piggy31, { ...alarm31, wait: 4 }] },
  { level: '3-1', name: 'piggy + plant + alarm (3 stars)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [piggy31, plant31, alarm31] },
  { level: '3-1', name: 'quiet toys far from the bed', expect: 'lose', plan: [{ pick: 'duck', dir: [1, 0], power: 0.4, wait: 1 }, { pick: 'cushion', dir: [1, 0], power: 0.4, wait: 1 }, { pick: 'mug', dir: [1, 0], power: 0.3 }] },

  // 3-2 마감 직전 노트북
  { level: '3-2', name: 'laptop slid off the end', expect: 'win', challenges: [0], plan: [{ pick: 'laptop', dir: [1, 0], power: 0.8 }] },
  { level: '3-2', name: 'desk lamp sweep', expect: 'win', challenges: [0, 1], plan: [{ pick: 'deskLamp', dir: [-1, 0], power: 1 }] },
  { level: '3-2', name: 'lamp sweep + piggy (3 stars)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'deskLamp', dir: [-1, 0], power: 1, wait: 3 }, { pick: 'piggy', dir: [0, 1], power: 0.6 }] },
  { level: '3-2', name: 'laptop blocked by books', expect: 'lose', plan: [{ pick: 'laptop', dir: [0, 1], power: 0.6 }, { pick: 'cushion', dir: [1, 0], power: 0.3 }] },

  // 3-3 쉿! 몰래 작전
  { level: '3-3', name: 'one by one, far from the bed (quiet)', expect: 'win', minStars: 2, challenges: [0], plan: [{ pick: 'piggy', dir: [0, 1], power: 0.7, wait: 3 }, { pick: 'globeSnow', dir: [0.5, 1], power: 0.9, wait: 3 }, doll33] },
  // (a repeated pick is skipped when that prop is already broken – it only matters for jittered runs)
  { level: '3-3', name: 'piggy bowls the snow globe (2 paws)', expect: 'win', challenges: [1], plan: [{ pick: 'piggy', dir: [-1, 0.1], power: 0.95, wait: 3 }, doll33, { pick: 'piggy', dir: [0, 1], power: 0.7 }] },
  { level: '3-3', name: 'daring: fancy vase flung across the room (3 stars)', expect: 'win', minStars: 3, challenges: [2], plan: [{ pick: 'piggy', dir: [-1, 0.1], power: 0.95, wait: 3 }, { pick: 'piggy', dir: [0, 1], power: 0.7, wait: 3 }, doll33, { pick: '고급 꽃병', dir: [0, 1], power: 1 }] },
  { level: '3-3', name: 'doll knocked into the alarm wakes him', expect: 'lose', plan: [{ pick: 'doll', dir: [0.5, -1], power: 0.9, wait: 3 }, { pick: 'piggy', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'globeSnow', dir: [0, 1], power: 0.6 }] },
  { level: '3-3', name: 'vase dropped on his head + roomba', expect: 'lose', plan: [{ pick: '고급 꽃병', dir: [0, 1], power: 0.3, wait: 3 }, { pick: 'roomba', dir: [0, -1], power: 0.6, wait: 6 }, { pick: 'piggy', dir: [0, 1], power: 0.6 }] },

  // 3-4 드레스룸 습격
  { level: '3-4', name: 'runner pull + guitar (sure clear)', expect: 'win', plan: [cloth34, { pick: 'guitar', dir: [0, 1], power: 0.6, at: 'top' }] },
  { level: '3-4', name: 'runner + coat rack through the door', expect: 'win', challenges: [0, 1], plan: [cloth34, rack34] },
  { level: '3-4', name: 'runner + rack + limited perfume (3 stars)', expect: 'win', minStars: 3, challenges: [0], plan: [cloth34, rack34, { pick: '한정판 향수', dir: [-1, 0], power: 0.6 }] },
  { level: '3-4', name: 'runner + guitar + feather pillow', expect: 'win', challenges: [2], plan: [cloth34, { pick: 'guitar', dir: [0, 1], power: 0.6, at: 'top', wait: 3 }, { pick: 'pillow', near: [8.15, 4.4, -0.8], dir: [-1, 0.3], power: 0.6 }] },
  { level: '3-4', name: 'magician yank leaves the perfumes', expect: 'lose', plan: [{ pick: 'cloth', dir: [0, 1], power: 1, wait: 3 }, { pick: 'guitar', dir: [0, 1], power: 0.6, at: 'top', wait: 2 }, { pick: 'shoe', dir: [1, 0], power: 0.5 }] },

  // 3-5 완전 범죄
  { level: '3-5', name: 'laptop by hand + domino + vase (sure clear)', expect: 'win', challenges: [0], plan: [laptop35, domino35, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6 }] },
  { level: '3-5', name: 'domino rocket first, then finish off (3 stars)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [domino35, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [0.5, 2, -3.3], dir: [0, 1], power: 0.6 }] },
  { level: '3-5', name: 'domino + marble jar + vase', expect: 'win', challenges: [0, 1], plan: [domino35, { pick: 'marbleJar', dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6 }] },
  { level: '3-5', name: 'piecemeal is not enough', expect: 'lose', plan: [{ pick: 'vase', near: [-2.4, 3.6, -3.35], dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'trophy', dir: [0, 1], power: 0.6, wait: 3 }, { pick: 'mug', dir: [0, 1], power: 0.6 }] },
];
