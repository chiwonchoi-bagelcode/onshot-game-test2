/* ------------------------------------------------------------------ */
/* Persistent player profile (localStorage). Everything the meta game  */
/* needs: records per stage, currency, collection, achievements, stats. */
/* ------------------------------------------------------------------ */

const KEY = 'wajangchang-nyang-v2';
const OLD_KEY = 'wajangchang-nyang-v1';

export interface LevelRec {
  stars: number;
  best: number;
  /** challenge completion flags (index = challenge) */
  ch: boolean[];
  plays: number;
  fails: number;
  cleared: boolean;
  /** fails since the last clear (drives escalating hints) */
  streak: number;
}

export interface Settings { sound: boolean; music: boolean; vibrate: boolean; lowGfx: boolean }

export interface Profile {
  v: 2;
  churu: number;
  levels: Record<string, LevelRec>;
  /** owned cats / selected cat */
  cats: string[];
  cat: string;
  /** owned skins and the skin worn by each cat */
  skins: string[];
  skinOf: Record<string, string>;
  /** owned accessories and what each cat wears */
  accs: string[];
  wear: Record<string, string[]>;
  ach: string[];
  disc: string[];
  /** prop kinds met in stages (object book) */
  seen: string[];
  stats: Record<string, number>;
  /** chapters whose intro was staged */
  chapterIntro: number[];
  /** tutorials completed (stage ids) */
  tutorial: string[];
  settings: Settings;
  finale: boolean;
  /** NEW! badges: 'cats', 'dex', 'ach', 'cat:<id>' … */
  fresh: string[];
  /** stage openings already watched (retries start right away) */
  preludes: string[];
  /** cat tricks unlocked, and the one equipped */
  tricks: string[];
  trick: string | null;
  /** the front door opened (the world beyond the house) — the story was shown */
  outside: boolean;
  /** the Earth is gone (11-3) */
  worldEnd: boolean;
}

export function freshProfile(): Profile {
  return {
    v: 2, churu: 0, levels: {}, cats: ['cheese'], cat: 'cheese', skins: [], skinOf: {}, accs: [], wear: {},
    ach: [], disc: [], seen: [], stats: {}, chapterIntro: [], tutorial: [],
    settings: { sound: true, music: true, vibrate: true, lowGfx: false }, finale: false, fresh: [], preludes: [],
    tricks: [], trick: null, outside: false, worldEnd: false,
  };
}

export function levelRec(p: Profile, id: string): LevelRec {
  let r = p.levels[id];
  if (!r) { r = { stars: 0, best: 0, ch: [], plays: 0, fails: 0, cleared: false, streak: 0 }; p.levels[id] = r; }
  return r;
}

/** read-only view (doesn't create records) */
export function peekRec(p: Profile, id: string): LevelRec | undefined { return p.levels[id]; }

function migrateV1(raw: string, p: Profile) {
  try {
    const o = JSON.parse(raw) as { stars?: Record<string, number>; best?: Record<string, number>; sound?: boolean; music?: boolean };
    const map: Record<string, string> = { A1: '1-1', A2: '1-2', A3: '1-3', B1: '2-1', B3: '2-2', B2: '2-3', C1: '3-1', C2: '3-2', C3: '3-5' };
    for (const [old, id] of Object.entries(map)) {
      const s = o.stars?.[old] ?? 0;
      if (s > 0) { const r = levelRec(p, id); r.stars = s; r.cleared = true; r.best = o.best?.[old] ?? 0; r.plays = 1; }
    }
    if (o.sound === false) p.settings.sound = false;
    if (o.music === false) p.settings.music = false;
  } catch { /* ignore */ }
}

export function loadProfile(): Profile {
  const p = freshProfile();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<Profile>;
      Object.assign(p, o);
      p.settings = { ...freshProfile().settings, ...(o.settings ?? {}) };
      if (!p.cats.includes('cheese')) p.cats.unshift('cheese');
      return p;
    }
    const old = localStorage.getItem(OLD_KEY);
    if (old) migrateV1(old, p);
  } catch { /* private mode etc. */ }
  return p;
}

export function saveProfile(p: Profile) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* storage full / blocked */ }
}

export function resetProfile(): Profile {
  try { localStorage.removeItem(KEY); localStorage.removeItem(OLD_KEY); } catch { /* ignore */ }
  return freshProfile();
}

export const stat = (p: Profile, k: string) => p.stats[k] ?? 0;
export function addStat(p: Profile, k: string, n: number) { p.stats[k] = (p.stats[k] ?? 0) + n; }
export function maxStat(p: Profile, k: string, v: number) { if (v > (p.stats[k] ?? 0)) p.stats[k] = v; }
