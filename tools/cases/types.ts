import type { Action } from '../sim';

/** an intended solution (or a deliberate non-solution) for a stage */
export interface Case {
  level: string;
  name: string;
  plan: Action[];
  expect: 'win' | 'lose';
  minStars?: number;
  /** indices of the stage's challenges this plan must complete */
  challenges?: number[];
}
