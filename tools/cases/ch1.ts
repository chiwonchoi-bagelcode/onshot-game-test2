import type { Case } from './types';
import type { Action } from '../sim';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const book = (near: [number, number, number], dir: [number, number], power = 0.5): Action => ({ pick: 'book', near, dir, power, at: 'top' });
void book;

/* 1-1: the first domino book is at (-1.05, 1.25, 0.55) */
const domino11 = (wait = 0.6): Action => ({ ...book([-1.05, 1.5, 0.55], [1, 0]), wait });
/* 1-5: first domino of the trail, the coffee-table soda, the sunroom roomba */
const sodaTV: Action = { pick: 'soda', near: [1.25, 1.5, 0.65], dir: [0.3, -1], power: 0.8, wait: 4 };
const roomba15: Action = { pick: 'roomba', dir: [-1, 0], power: 0.7, wait: 8 };
const domino15: Action = { pick: 'domino', near: [-1.4, 0.3, 2.7], dir: [1, 0.1], power: 0.4, at: 'top', wait: 6 };

export const CASES: Case[] = [
  // 1-1 첫 번째 장난
  { level: '1-1', name: 'direct vase (sure clear)', expect: 'win', challenges: [1], plan: [{ pick: 'vase', dir: [0, 1], power: 0.8 }] },
  { level: '1-1', name: 'book domino, one paw', expect: 'win', minStars: 2, challenges: [0, 1], plan: [domino11()] },
  { level: '1-1', name: 'vase pushed onto the tea set', expect: 'win', minStars: 2, challenges: [1, 2], plan: [{ pick: 'vase', dir: [1, 0], power: 0.5 }] },
  { level: '1-1', name: 'domino + teapot (3 stars)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [domino11(3), { pick: 'teapot', dir: [1, 0], power: 0.6 }] },
  { level: '1-1', name: 'books pushed the wrong way + mug', expect: 'lose', plan: [{ ...book([0.45, 1.5, 0.55], [-1, 0]), wait: 3 }, { pick: 'mug', near: [-0.55, 1.4, -0.1], dir: [0, -1], power: 0.5 }] },

  // 1-2 TV 대참사
  { level: '1-2', name: 'TV full-power top swat', expect: 'win', plan: [{ pick: 'tv', dir: [0, 1], power: 1, at: 'top' }] },
  { level: '1-2', name: 'TV weak swat does nothing', expect: 'lose', plan: [{ pick: 'tv', dir: [0, 1], power: 0.5, at: 'top' }, { pick: 'plant', dir: [1, 0], power: 0.3 }, { pick: 'cushion', dir: [0, 1], power: 0.3 }] },
  { level: '1-2', name: 'lamp -> shelf -> TV', expect: 'win', minStars: 2, challenges: [0, 1], plan: [{ pick: 'lamp', dir: [0.3, -1], power: 0.8, at: 'top' }] },
  { level: '1-2', name: 'soda rocket -> shelf', expect: 'win', minStars: 2, challenges: [0, 1, 2], plan: [{ pick: 'soda', dir: [0.3, -1], power: 0.8 }] },
  { level: '1-2', name: 'rocket shelf + vase (3 stars)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [{ pick: 'soda', dir: [0.3, -1], power: 0.8, wait: 3 }, { pick: 'vase', dir: [0, 1], power: 0.6 }] },

  // 1-3 책장 꼭대기의 보물
  { level: '1-3', name: 'shake bookshelf', expect: 'win', challenges: [0], plan: [{ pick: 'bookshelf', dir: [1, 0], power: 1, at: 0.86 }] },
  { level: '1-3', name: 'double swat topples bookshelf', expect: 'win', minStars: 3, challenges: [1, 2], plan: [{ pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86, wait: 1.0 }, { pick: 'bookshelf', dir: [1, 0], power: 0.8, at: 0.86 }] },
  { level: '1-3', name: 'pushing the low shelf only', expect: 'lose', plan: [{ pick: 'bookshelf', dir: [1, 0], power: 0.5, at: 'low', wait: 2 }, { pick: 'teapot', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'chair', dir: [-1, 0], power: 0.5 }] },

  // 1-4 로봇청소기 출동
  { level: '1-4', name: 'roomba lane topples all three', expect: 'win', minStars: 2, challenges: [0], plan: [{ pick: 'roomba', dir: [-0.825, 0.565], power: 0.7, wait: 8 }] },
  { level: '1-4', name: 'roomba lane + TV-stand vase (3 stars)', expect: 'win', minStars: 3, challenges: [2], plan: [{ pick: 'roomba', dir: [-0.825, 0.565], power: 0.7, wait: 9 }, { pick: 'vase', dir: [0, 1], power: 0.6 }] },
  { level: '1-4', name: 'roomba lane + yarn scribble', expect: 'win', challenges: [1], plan: [{ pick: 'roomba', dir: [-0.825, 0.565], power: 0.7, wait: 9 }, { pick: 'yarn', dir: [1, 0], power: 1 }] },
  { level: '1-4', name: 'roomba + leftover plant by hand (sure clear)', expect: 'win', plan: [{ pick: 'roomba', dir: [-0.825, 0.565], power: 0.7, wait: 9 }, { pick: 'plant', near: [-1.44, 1.7, 1.41], dir: [-1, 0], power: 0.6 }] },
  { level: '1-4', name: 'two plants by hand, yarn scribble', expect: 'lose', plan: [{ pick: 'plant', near: [1.7, 1.7, -0.74], dir: [1, 0], power: 0.6, wait: 2 }, { pick: 'yarn', dir: [1, 0], power: 1 }] },
  { level: '1-4', name: 'direct plant + yarn trail', expect: 'lose', plan: [{ pick: 'plant', near: [0.13, 1.7, 0.33], dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'yarn', dir: [1, 0.2], power: 1 }] },

  // 1-5 거실 대참사
  { level: '1-5', name: 'TV shelf rocket + domino trail (sure clear)', expect: 'win', plan: [sodaTV, domino15] },
  { level: '1-5', name: 'forked domino: both shelves in one paw', expect: 'win', minStars: 2, challenges: [0, 1], plan: [{ ...domino15, wait: 7 }] },
  { level: '1-5', name: 'fork + vase + roomba (3 stars)', expect: 'win', minStars: 3, challenges: [0, 2], plan: [{ ...domino15, wait: 7 }, { pick: 'vase', near: [-0.75, 1.5, 0.7], dir: [0, 1], power: 0.6, wait: 2 }, roomba15] },
  { level: '1-5', name: 'TV by hand + domino', expect: 'win', minStars: 2, plan: [{ pick: 'tv', dir: [0, 1], power: 1, at: 'top', wait: 3 }, domino15] },
  { level: '1-5', name: 'small mess only', expect: 'lose', plan: [{ pick: 'vase', near: [-0.75, 1.5, 0.7], dir: [0, -1], power: 0.6, wait: 2 }, { pick: 'mug', dir: [-1, 0], power: 0.6, wait: 2 }, { pick: 'plant', near: [-3.4, 0.5, -1.3], dir: [1, 0], power: 0.6 }] },
  { level: '1-5', name: 'domino swatted backwards', expect: 'lose', plan: [{ ...domino15, dir: [-1, -0.1], wait: 3 }, { pick: 'mug', dir: [0, 1], power: 0.6, wait: 2 }, { pick: 'cushion', dir: [0, 1], power: 0.5 }] },
];
