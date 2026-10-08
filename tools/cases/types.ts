import type { Action } from '../sim';

/** an intended solution (or a deliberate non-solution) for a stage */
export interface Case {
  level: string;
  name: string;
  plan: Action[];
  expect: 'win' | 'lose';
  minStars?: number;
  /** the plan must not do better than this (star ladders on remixes) */
  maxStars?: number;
  /** indices of the stage's challenges this plan must complete */
  challenges?: number[];
}
