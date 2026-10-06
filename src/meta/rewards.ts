import type { Result } from '../game/Game';
import type { LevelDef } from '../game/types';
import { BY_CHAPTER, CHAPTERS, LEVELS } from '../levels/index';
import { ACHIEVEMENTS, type AchDef } from './achievements';
import { ACCESSORIES, CATS, SKINS, type PerkId, type Unlock } from './cats';
import { challengeDone, challengeIcon, challengeText } from './challenges';
import { DISCOVERIES, type Discovery } from './dex';
import { addStat, levelRec, maxStat, peekRec, type Profile } from './profile';

/* ------------------------------------------------------------------ */
/* Rewards (츄르), unlock rules and the post-stage settlement.          */
/* ------------------------------------------------------------------ */

export const CHURU = { firstClear: 20, star: 8, challenge: 15, replay: 3, newBest: 3, discovery: 10 };

export interface UnlockItem { kind: 'cat' | 'acc' | 'skin' | 'chapter'; id: string; name: string; icon: string; color?: string }

export interface ChallengeLine { text: string; icon: string; done: boolean; isNew: boolean; before: boolean }

export interface Settlement {
  lines: { label: string; amount: number }[];
  churu: number;
  prevStars: number;
  stars: number;
  prevBest: number;
  newBest: boolean;
  firstClear: boolean;
  challenges: ChallengeLine[];
  discoveries: Discovery[];
  achievements: AchDef[];
  unlocks: UnlockItem[];
  chapterCleared: number | null;
  finale: boolean;
  hint: string | null;
}

/* ------------------------------ progression ------------------------------ */

export const totalStars = (p: Profile) => Object.values(p.levels).reduce((a, r) => a + r.stars, 0);

export function chapterCleared(p: Profile, ch: number): boolean {
  const ls = BY_CHAPTER[ch - 1];
  if (!ls || !ls.length) return false;
  return !!peekRec(p, ls[ls.length - 1].id)?.cleared;
}

export function chapterOpen(p: Profile, ch: number): boolean {
  if (ch === 1) return true;
  const def = CHAPTERS[ch - 1];
  if (!def || !BY_CHAPTER[ch - 1]?.length) return false;
  return chapterCleared(p, ch - 1) && totalStars(p) >= def.needStars;
}

/** why a chapter is still closed */
export function chapterLock(p: Profile, ch: number): string {
  const def = CHAPTERS[ch - 1];
  if (!chapterCleared(p, ch - 1)) return `${CHAPTERS[ch - 2].name} 마지막 스테이지를 클리어하세요`;
  return `⭐ ${def.needStars}개 필요 (현재 ${totalStars(p)}개)`;
}

export function stageOpen(p: Profile, level: LevelDef): boolean {
  if (!chapterOpen(p, level.chapter)) return false;
  const ls = BY_CHAPTER[level.chapter - 1];
  const i = ls.indexOf(level);
  return i <= 0 || !!peekRec(p, ls[i - 1].id)?.cleared;
}

/** next stage to play after a level (or null at the end) */
export function nextLevel(level: LevelDef): LevelDef | null {
  const i = LEVELS.indexOf(level);
  return LEVELS[i + 1] ?? null;
}

export function unlockMet(p: Profile, u: Unlock): boolean {
  switch (u.kind) {
    case 'start': return true;
    case 'churu': return false;
    case 'chapter': return chapterCleared(p, u.chapter);
    case 'achievement': return p.ach.includes(u.id);
    case 'finale': return p.finale;
  }
}

export function unlockText(u: Unlock): string {
  switch (u.kind) {
    case 'start': return '기본';
    case 'churu': return `츄르 ${u.cost}`;
    case 'chapter': return `${CHAPTERS[u.chapter - 1]?.name ?? u.chapter + '장'} 클리어`;
    case 'achievement': return `업적 「${ACHIEVEMENTS.find((a) => a.id === u.id)?.name ?? u.id}」`;
    case 'finale': return '최종장 클리어';
  }
}

/** grant every cat / accessory / skin whose condition is met; returns what was new */
export function grantUnlocks(p: Profile): UnlockItem[] {
  const out: UnlockItem[] = [];
  for (const c of CATS) if (!p.cats.includes(c.id) && unlockMet(p, c.unlock)) { p.cats.push(c.id); out.push({ kind: 'cat', id: c.id, name: c.name, icon: '🐱', color: c.color }); p.fresh.push('cats', 'cat:' + c.id); }
  for (const a of ACCESSORIES) if (!p.accs.includes(a.id) && unlockMet(p, a.unlock)) { p.accs.push(a.id); out.push({ kind: 'acc', id: a.id, name: a.name, icon: a.icon }); p.fresh.push('cats'); }
  for (const s of SKINS) if (!p.skins.includes(s.id) && unlockMet(p, s.unlock)) { p.skins.push(s.id); out.push({ kind: 'skin', id: s.id, name: s.name, icon: '🎨', color: s.color }); p.fresh.push('cats'); }
  return out;
}

export type ShopKind = 'cat' | 'acc' | 'skin';

export function costOf(kind: ShopKind, id: string): number | null {
  const u = kind === 'cat' ? CATS.find((c) => c.id === id)?.unlock : kind === 'acc' ? ACCESSORIES.find((a) => a.id === id)?.unlock : SKINS.find((s) => s.id === id)?.unlock;
  return u?.kind === 'churu' ? u.cost : null;
}

export function owned(p: Profile, kind: ShopKind, id: string): boolean {
  return kind === 'cat' ? p.cats.includes(id) : kind === 'acc' ? p.accs.includes(id) : p.skins.includes(id);
}

export function buy(p: Profile, kind: ShopKind, id: string): boolean {
  const cost = costOf(kind, id);
  if (cost === null || owned(p, kind, id) || p.churu < cost) return false;
  p.churu -= cost;
  (kind === 'cat' ? p.cats : kind === 'acc' ? p.accs : p.skins).push(id);
  return true;
}

/** check achievements (+ the unlocks they cause) until nothing changes */
export function checkAchievements(p: Profile): { achievements: AchDef[]; unlocks: UnlockItem[]; churu: number } {
  const achievements: AchDef[] = [];
  const unlocks: UnlockItem[] = [];
  let churu = 0;
  for (let pass = 0; pass < 4; pass++) {
    let changed = false;
    for (const a of ACHIEVEMENTS) {
      if (p.ach.includes(a.id) || a.progress(p) < a.goal) continue;
      p.ach.push(a.id);
      achievements.push(a);
      churu += a.reward;
      p.fresh.push('ach');
      changed = true;
    }
    const u = grantUnlocks(p);
    if (u.length) { unlocks.push(...u); changed = true; }
    if (!changed) break;
  }
  p.churu += churu;
  return { achievements, unlocks, churu };
}

/* ------------------------------ settlement ------------------------------ */

export function settle(p: Profile, level: LevelDef, r: Result, perk: PerkId): Settlement {
  const rec = levelRec(p, level.id);
  const prevStars = rec.stars, prevBest = rec.best, wasCleared = rec.cleared;
  const openBefore = CHAPTERS.map((c) => chapterOpen(p, c.id));
  const lines: { label: string; amount: number }[] = [];
  rec.plays++;

  // lifetime stats
  const run = r.run;
  addStat(p, 'plays', 1);
  addStat(p, 'swats', r.pawsUsed);
  addStat(p, 'damage', Math.round(r.score));
  addStat(p, 'breaks', r.broken);
  addStat(p, 'dunks', run.counters.dunk ?? 0);
  addStat(p, 'balloons', run.counters.balloon ?? 0);
  addStat(p, 'topples', run.counters.topple ?? 0);
  if (r.wokeOwner) addStat(p, 'wakes', 1);
  maxStat(p, 'chainMax', r.maxChain);
  maxStat(p, 'toppleChainMax', run.maxes.toppleChain ?? 0);
  maxStat(p, 'tpMax', run.maxes.tpLen ?? 0);
  maxStat(p, 'bestRun', Math.round(r.score));

  // discoveries pay out even on a failed attempt (learning by doing)
  const discoveries: Discovery[] = [];
  for (const id of run.discovered) {
    if (p.disc.includes(id)) continue;
    const d = DISCOVERIES.find((x) => x.id === id);
    if (!d) continue;
    p.disc.push(id);
    discoveries.push(d);
    p.fresh.push('dex');
  }
  if (discoveries.length) lines.push({ label: `새로운 발견 ×${discoveries.length}`, amount: CHURU.discovery * discoveries.length });

  const challenges: ChallengeLine[] = level.challenges.map((c, i) => ({ text: challengeText(c), icon: challengeIcon(c), done: false, isNew: false, before: !!rec.ch[i] }));
  let chapterClearedNow: number | null = null;
  let finale = false;
  let stageChuru = 0;
  const newBest = r.success && r.score > prevBest;
  if (r.success) {
    rec.cleared = true;
    rec.streak = 0;
    rec.stars = Math.max(rec.stars, r.stars);
    rec.best = Math.max(rec.best, Math.round(r.score));
    addStat(p, 'clears', 1);
    if (level.goal.kind !== 'score' && level.goal.kind !== 'wake' && run.swats.length && run.swats.every((s) => !s.target)) addStat(p, 'indirect', 1);
    if (level.paws >= 3 && r.pawsUsed === 1) addStat(p, 'oneShot', 1);
    if (level.goal.kind === 'sneak') addStat(p, 'sneak', 1);
    if (!wasCleared) { lines.push({ label: '첫 클리어', amount: CHURU.firstClear }); stageChuru += CHURU.firstClear; }
    const ns = rec.stars - prevStars;
    if (ns > 0) { lines.push({ label: `새 별 ${'★'.repeat(ns)}`, amount: CHURU.star * ns }); stageChuru += CHURU.star * ns; }
    level.challenges.forEach((c, i) => {
      const done = challengeDone(c, r);
      challenges[i].done = done;
      if (done && !rec.ch[i]) {
        rec.ch[i] = true;
        challenges[i].isNew = true;
        lines.push({ label: `도전 과제 · ${challenges[i].text}`, amount: CHURU.challenge });
        stageChuru += CHURU.challenge;
      }
    });
    if (!stageChuru) { lines.push({ label: '다시 하기 보상', amount: CHURU.replay }); stageChuru += CHURU.replay; }
    if (newBest && prevBest > 0) { lines.push({ label: '최고 기록 갱신', amount: CHURU.newBest }); stageChuru += CHURU.newBest; }
    const bs = BY_CHAPTER[level.chapter - 1];
    if (!wasCleared && bs[bs.length - 1] === level) chapterClearedNow = level.chapter;
    if (level === LEVELS[LEVELS.length - 1] && !p.finale) { p.finale = true; finale = true; }
  } else {
    rec.fails++;
    rec.streak++;
  }
  const discChuru = CHURU.discovery * discoveries.length;
  if (perk === 'lucky' || perk === 'gold') {
    const k = perk === 'lucky' ? 0.3 : 0.5;
    const bonus = Math.round((stageChuru + discChuru) * k);
    if (bonus > 0) lines.push({ label: perk === 'lucky' ? '행운의 삼색 보너스' : '황금냥 보너스', amount: bonus });
    stageChuru += bonus;
  }
  p.churu += stageChuru + discChuru;

  const ach = checkAchievements(p);
  for (const a of ach.achievements) lines.push({ label: `업적 · ${a.name}`, amount: a.reward });
  const unlocks = [...ach.unlocks];
  CHAPTERS.forEach((c, i) => { if (!openBefore[i] && chapterOpen(p, c.id)) unlocks.push({ kind: 'chapter', id: String(c.id), name: c.name, icon: c.icon, color: c.color }); });

  let hint: string | null = null;
  if (!r.success && level.hints.length) hint = level.hints[Math.min(level.hints.length - 1, Math.max(0, rec.streak - 1))];
  else if (r.success && r.stars < 3 && level.hints.length > 1) hint = level.hints[level.hints.length - 1];

  const churu = lines.reduce((a, l) => a + l.amount, 0);
  return {
    lines, churu, prevStars, stars: r.success ? r.stars : 0, prevBest, newBest, firstClear: r.success && !wasCleared,
    challenges, discoveries, achievements: ach.achievements, unlocks, chapterCleared: chapterClearedNow, finale, hint,
  };
}
