const KEY = 'wajangchang-nyang-v1';

export interface SaveData {
  stars: Record<string, number>;
  best: Record<string, number>;
  fails: Record<string, number>;
  sound: boolean;
  music: boolean;
  tutorialDone: boolean;
}

const fresh = (): SaveData => ({ stars: {}, best: {}, fails: {}, sound: true, music: true, tutorialDone: false });

export function loadSave(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    return { ...fresh(), ...JSON.parse(raw) };
  } catch {
    return fresh();
  }
}

export function writeSave(s: SaveData) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode etc. */ }
}
