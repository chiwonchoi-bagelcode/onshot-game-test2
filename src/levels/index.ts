import type { LevelDef } from '../game/types';
import { CHAPTERS } from './chapters';
import { CH1 } from './ch1';
import { CH2 } from './ch2';
import { CH3 } from './ch3';
import { CH4 } from './ch4';
import { CH5 } from './ch5';
import { CH6 } from './ch6';
import { CH7 } from './ch7';
import { CH8 } from './ch8';
import { CH9 } from './ch9';
import { CH10 } from './ch10';
import { CH11 } from './ch11';

export { CHAPTERS };
export const BY_CHAPTER: LevelDef[][] = [CH1, CH2, CH3, CH4, CH5, CH6, CH7, CH8, CH9, CH10, CH11];
export const LEVELS: LevelDef[] = BY_CHAPTER.flat();
import { buildRemixes } from './remix';
/** the request board: variations of house stages (not part of the chapters) */
export const REMIXES: LevelDef[] = buildRemixes((id) => LEVELS.find((l) => l.id === id));
export const levelById = (id: string) => LEVELS.find((l) => l.id === id) ?? REMIXES.find((l) => l.id === id);
