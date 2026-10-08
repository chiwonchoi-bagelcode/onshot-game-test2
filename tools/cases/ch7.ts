import type { Case } from './types';
import type { Action } from '../sim';

const hit = (pick: string, dir: [number, number], power: number, wait = 6, near?: [number, number, number], at: Action['at'] = 'mid'): Action => ({ pick, near, dir, power, at, wait });

export const CASES: Case[] = [
  // 7-1 문이 열렸다
  { level: '7-1', name: 'tutorial: pull the chock (gate closed)', expect: 'win', challenges: [1], plan: [hit('chock', [1, 0], 0.8, 8)] },
  { level: '7-1', name: 'open the gate, then the chock (3★)', expect: 'win', minStars: 3, challenges: [0, 1], plan: [hit('gate', [1, 0], 0.6, 1.5), hit('chock', [1, 0], 0.8, 8)] },
  { level: '7-1', name: 'chock, then the gate just in time', expect: 'win', minStars: 2, challenges: [0, 1, 2], plan: [hit('chock', [1, 0], 0.8, 0.1), hit('gate', [1, 0], 0.6, 8)] },
  { level: '7-1', name: 'paw the car three times (scratch only)', expect: 'lose', plan: [hit('auto', [1, 0], 1, 2, [-6, 1, -1]), hit('auto', [1, 0], 1, 2, [-6, 1, -1]), hit('auto', [-1, 0], 1, 2, [-6, 1, -1])] },
  { level: '7-1', name: 'garden junk only', expect: 'lose', plan: [hit('bin', [1, 0], 1, 3, [-0.9, 0, 2.6]), hit('gnome', [1, 0], 1, 2, [8.6, 0, 2.2]), hit('birdbath', [1, 0], 1, 3)] },
];
CASES.push(
  // 7-2 할머니의 정원
  { level: '7-2', name: 'hose at the bonsai (seen)', expect: 'win', plan: [hit('hose', [-0.335, -0.942], 0.6, 6)] },
  { level: '7-2', name: 'cart, then hose while grandma looks away (3★)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('cart', [0, -1], 1, 5), hit('hose', [-0.335, -0.942], 0.6, 5), hit('onggi', [1, 0], 1, 4, [5.1, 0.1, -3.2])] },
  { level: '7-2', name: 'hose first, then the cart (seen, 2★)', expect: 'win', minStars: 2, challenges: [0], plan: [hit('hose', [-0.335, -0.942], 0.6, 5), hit('cart', [0, -1], 1, 5)] },
  { level: '7-2', name: 'hose wasted on the jars', expect: 'lose', plan: [hit('hose', [0.58, -0.81], 0.6, 6), hit('cart', [0, -1], 1, 5)] },
  { level: '7-2', name: 'small jar domino into the seed-soy jar (no bonsai)', expect: 'lose', plan: [hit('onggi', [-1, 0], 1, 4, [9.4, 0.1, -3.2], 'top')] },
);
CASES.push(
  // 7-3 택배 대란
  { level: '7-3', name: 'melon bowling + two from the truck', expect: 'win', challenges: [0], plan: [hit('watermelon', [1, 0], 0.6, 5), hit('fragile', [-1, 0.3], 0.8, 3, [6.2, 1.4, -2.5]), hit('fragile', [-1, -0.3], 0.8, 3, [6.3, 1.4, -4.1])] },
  { level: '7-3', name: 'truck first, then a hard melon (3★, unseen)', expect: 'win', minStars: 3, challenges: [0, 1, 2], plan: [hit('fragile', [-1, 0.3], 0.8, 3, [6.2, 1.4, -2.5]), hit('fragile', [-1, -0.3], 0.8, 3, [6.3, 1.4, -4.1]), hit('watermelon', [1, 0], 1, 6)] },
  { level: '7-3', name: 'melon, the hand-truck top, the truck', expect: 'win', minStars: 2, challenges: [0, 1], plan: [hit('watermelon', [1, 0], 1, 5), hit('fragile', [0, 1], 1, 3, [-1, 1.45, -5]), hit('fragile', [-1, 0.3], 0.8, 3, [6.2, 1.4, -2.5])] },
  { level: '7-3', name: 'gentle melon, no follow-up', expect: 'lose', plan: [hit('watermelon', [1, 0], 0.4, 6), hit('trafficCone', [1, 0], 1, 2), hit('bin', [1, 0], 1, 2)] },
);
const A75: [number, number, number] = [-11.9, 3, -2.7], B75: [number, number, number] = [-3.9, 1, -2.7], C75: [number, number, number] = [-7.5, 1, 2.7];
CASES.push(
  // 7-5 언덕길 대참사
  { level: '7-5', name: 'top chock: two cars for one paw', expect: 'win', challenges: [1], plan: [hit('chock', [1, 0], 0.8, 10, A75)] },
  { level: '7-5', name: 'top chock, wait for the pile, then the other lane (3★)', expect: 'win', minStars: 3, challenges: [0], plan: [hit('chock', [1, 0], 0.8, 4, A75), hit('chock', [1, 0], 0.8, 10, C75)] },
  { level: '7-5', name: 'middle + other lane (both vending machines)', expect: 'win', challenges: [2], plan: [hit('chock', [1, 0], 0.8, 4, B75), hit('chock', [1, 0], 0.8, 10, C75)] },
  { level: '7-5', name: 'top and middle at once (wasted paw)', expect: 'lose', plan: [hit('chock', [1, 0], 0.8, 0.3, A75), hit('chock', [1, 0], 0.8, 10, B75)] },
  { level: '7-5', name: 'paw the cars', expect: 'lose', plan: [hit('auto', [1, 0], 1, 2, [-6, 2, -1.7]), hit('auto', [1, 0], 1, 2, [-14, 3, -1.7])] },
);

const wait7 = (s: number): Action => ({ pick: 'wait', dir: [0, 0], power: 0, wait: s });
const YELLOW: [number, number, number] = [2, 1.5, -3.55];
CASES.push(
  // 7-4 아저씨의 프라모델
  { level: '7-4', name: 'paint by the wall, glide the model off the bench', expect: 'win', minStars: 2, plan: [hit('paintCan', [0, -1], 0.6, 2.5, YELLOW, 'top'), hit('kitModel', [1, 0], 1, 5)] },
  { level: '7-4', name: 'paint in front works too', expect: 'win', minStars: 2, plan: [hit('paintCan', [0, 1], 0.4, 2.5, YELLOW, 'top'), hit('kitModel', [1, 0], 1, 5)] },
  { level: '7-4', name: 'while he makes coffee (perfect crime)', expect: 'win', minStars: 2, challenges: [2], plan: [wait7(4), hit('paintCan', [0, -1], 0.6, 1.5, YELLOW, 'top'), hit('kitModel', [1, 0], 1, 4)] },
  { level: '7-4', name: 'model off the bench + the display cabinet (3★)', expect: 'win', minStars: 3, challenges: [1, 2], plan: [wait7(4), hit('paintCan', [0, -1], 0.6, 1.5, YELLOW, 'top'), hit('kitModel', [1, 0], 1, 3), hit('vitrine', [0, 1], 1, 0.9, undefined, 0.86), hit('vitrine', [0, 1], 1, 5, undefined, 0.86)] },
  { level: '7-4', name: 'all three tins on the bench', expect: 'win', challenges: [0], plan: [hit('paintCan', [0, 1], 0.5, 1.5, [-4.9, 1.5, -3.7], 'top'), hit('paintCan', [0, 1], 0.5, 1.5, [-4.25, 1.5, -3.4], 'top'), hit('paintCan', [0, -1], 0.6, 1.5, YELLOW, 'top'), hit('kitModel', [1, 0], 1, 4)] },
  { level: '7-4', name: 'paint poured on the model (half price, 1★)', expect: 'win', maxStars: 1, plan: [hit('paintCan', [-1, 0], 0.4, 3, YELLOW, 'top')] },
  { level: '7-4', name: 'shoving the heavy base by paw', expect: 'lose', plan: [hit('kitModel', [1, 0], 1, 3), hit('kitModel', [0, 1], 1, 3), hit('kitModel', [0, 1], 1, 3)] },
);
