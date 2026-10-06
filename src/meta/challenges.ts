import { formatWon } from '../core/util';
import type { Result } from '../game/Game';
import type { ChallengeDef, LevelDef } from '../game/types';

/** display text of a mastery challenge */
export function challengeText(c: ChallengeDef): string {
  if (c.text) return c.text;
  switch (c.type) {
    case 'paws': return c.max === 1 ? '앞발 단 1번으로 클리어' : `앞발 ${c.max}번 이하로 클리어`;
    case 'chain': return `한 번에 연쇄 x${c.n} 달성`;
    case 'indirect': return '목표물을 직접 건드리지 않고 클리어';
    case 'score': return `손해액 ${formatWon(c.amount)} 달성`;
    case 'quiet': return '집사가 소리를 거의 못 듣게 클리어';
    default: return '';
  }
}

export function challengeIcon(c: ChallengeDef): string {
  switch (c.type) {
    case 'paws': return '🐾';
    case 'chain': return '⛓️';
    case 'indirect': return '🎱';
    case 'cause': return '🔗';
    case 'discover': return '✨';
    case 'count': return '🎯';
    case 'stat': return '📏';
    case 'score': return '💸';
    case 'quiet': return '🤫';
  }
}

/** did this run complete the challenge? (all challenges require clearing the stage) */
export function challengeDone(c: ChallengeDef, r: Result): boolean {
  if (!r.success) return false;
  const run = r.run;
  switch (c.type) {
    case 'paws': return r.pawsUsed <= c.max;
    case 'chain': return r.maxChain >= c.n;
    case 'indirect': return run.swats.every((s) => !s.target);
    case 'cause': return run.culprits.some((x) => x.kind === c.victim && x.by.includes(c.culprit));
    case 'discover': return run.discovered.includes(c.id);
    case 'count': return (run.counters[`${c.event ?? 'break'}:${c.kind}`] ?? 0) >= c.n;
    case 'stat': return Math.max(run.counters[c.key] ?? 0, run.maxes[c.key] ?? 0) >= c.min;
    case 'score': return r.score >= c.amount;
    case 'quiet': return r.noise <= c.max;
  }
}

export function evalChallenges(level: LevelDef, r: Result): boolean[] {
  return level.challenges.map((c) => challengeDone(c, r));
}
