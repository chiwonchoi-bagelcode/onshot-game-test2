import type { Shot } from './kit';
import { orbit } from './camera';

/**
 * Scouting shots: run a stage's known solution with a plain wide camera so
 * the outcome can be judged on a contact sheet before a real shot is built.
 * Not part of the edit.
 */
interface Act { pick: string; near?: [number, number, number]; dir: [number, number]; power: number; at?: 'top' | 'mid' | 'low'; wait?: number }

function scout(level: string, plan: Act[], dur = 12, cat = 'cheese', yaw = 0.35, pitch = 0.62, zoom = 1.45): Shot {
  const times: number[] = [];
  let t = 1;
  for (const a of plan) { times.push(t); t += (a.wait ?? 3) + 1; }
  return {
    id: `S_${level}`,
    level, cat, dur,
    cues: plan.map((a, i) => ({ t: times[i], run: (c) => c.d.aimAndSwat(a.pick, { near: a.near, dir: a.dir, power: a.power, at: a.at, aim: 0.35, finger: false }) })),
    tick(c) { c.d.updateAim(); },
    cam(c) {
      const b = c.g.roomBounds;
      const cx = (b.minX + b.maxX) / 2, cz = (b.minZ + b.maxZ) / 2;
      const size = Math.max(b.maxX - b.minX, b.maxZ - b.minZ);
      return { ...orbit([cx, 1.2, cz], yaw, pitch, size * zoom, 32), shadow: size * 0.75 };
    },
  };
}

export const SCOUTS: Shot[] = [
  scout('1-2', [{ pick: 'soda', near: [1.25, 1.5, 0.65], dir: [0.3, -1], power: 0.8 }], 9),
  scout('1-4', [{ pick: 'roomba', dir: [-0.825, 0.565], power: 0.7 }], 11),
  scout('1-5', [{ pick: 'domino', near: [-1.4, 0.3, 2.7], dir: [1, 0.1], power: 0.4, at: 'top' }], 12),
  scout('2-1', [{ pick: 'cloth', dir: [0, 1], power: 1 }], 7),
  scout('2-2', [{ pick: 'flour', dir: [0, 1], power: 0.8 }], 7),
  scout('2-4', [{ pick: 'cloth', dir: [0, 1], power: 0.4, wait: 4 }, { pick: 'pan', dir: [0, 1], power: 0.8 }], 12),
  scout('4-1', [{ pick: 'phone', dir: [-1, 0], power: 0.6 }], 7),
  scout('4-2', [{ pick: 'soap', dir: [1, 0], power: 0.85 }], 9),
  scout('4-3', [{ pick: '블루투스 스피커', dir: [0.2, 1], power: 0.7 }], 10),
  scout('4-4', [{ pick: 'dryer', dir: [-1, 0], power: 0.6 }], 9),
  scout('4-5', [{ pick: 'soap', dir: [1, 0], power: 0.9, wait: 3 }, { pick: 'dryer', dir: [-1, 0], power: 0.6, wait: 4 }, { pick: 'fan', dir: [-1, 0], power: 0.6 }], 16),
  scout('5-1', [{ pick: 'block', near: [1.0, 0.5, -1.6], dir: [1, 0], power: 0.6 }], 9),
  scout('5-2', [{ pick: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0], power: 0.9 }], 10),
  scout('5-3', [{ pick: 'jack', near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, wait: 4 }, { pick: 'jack', near: [1.5, 0.4, -1.5], dir: [1, 0], power: 0.7 }], 12),
  scout('5-4', [{ pick: 'train', dir: [-1, 0], power: 0.7 }], 14),
  scout('5-5', [{ pick: 'train', dir: [1, 0], power: 0.7, wait: 14 }, { pick: 'block', near: [0.0, 0.5, -1.8], dir: [1, 0], power: 0.6 }], 22),
  scout('6-1', [{ pick: 'coatRack', dir: [1, 0], power: 0.8, at: 'top' }], 12),
  scout('6-2', [{ pick: 'soda', dir: [0, -1], power: 0.6 }], 10),
  scout('6-3', [{ pick: 'fan', dir: [-1, 0], power: 0.5, wait: 3 }, { pick: 'aquarium', dir: [0, 1], power: 0.85, at: 'top' }], 12),
  scout('6-5', [
    { pick: 'domino', near: [1.2, 0.3, 6.7], dir: [0.74, -0.67], power: 0.4, at: 'top', wait: 12 },
    { pick: 'coatRack', dir: [-1, 0], power: 0.8, at: 'top', wait: 10 },
    { pick: 'lamp', dir: [-0.69, -0.73], power: 0.8, at: 'top' },
  ], 34),
];
