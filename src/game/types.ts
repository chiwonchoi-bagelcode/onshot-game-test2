import type * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { Game } from './Game';
import type { Prop } from './Prop';

export type Mat =
  | 'glass' | 'ceramic' | 'wood' | 'metal' | 'plastic' | 'soft' | 'paper'
  | 'rubber' | 'egg' | 'food' | 'electronic' | 'squeak' | 'marble';

export type ColDef = (
  | { shape: 'box'; hx: number; hy: number; hz: number; round?: number }
  | { shape: 'cyl'; hh: number; r: number }
  | { shape: 'ball'; r: number }
  | { shape: 'cone'; hh: number; r: number }
  | { shape: 'capsule'; hh: number; r: number }
  | { shape: 'hull'; points: number[] }
) & { at?: [number, number, number]; rot?: [number, number, number]; friction?: number; restitution?: number; massShare?: number };

export type FxKind =
  | 'water' | 'dirt' | 'flour' | 'yolk' | 'sparks' | 'coins' | 'coffee' | 'cream' | 'feathers' | 'juice' | 'glass' | 'paper' | 'flowers'
  | 'perfume' | 'snow' | 'flood' | 'cereal' | 'milk' | 'none';

export interface BreakDef {
  /** gravity-compensated delta-v (units/s) needed to break */
  threshold: number;
  /** also breaks when another moving prop hits it with this contact force */
  hitForce?: number;
  mode: 'shatter' | 'damage';
  debris?: { count: number; colors: string[]; size: number; flat?: boolean };
  fx?: FxKind;
  /** word shown on break, e.g. 쨍그랑! */
  word?: string;
  /** called after breaking (spawn marbles, toast, etc.) */
  after?: (game: Game, prop: Prop, pos: THREE.Vector3, vel: THREE.Vector3) => void;
  /** visual change for 'damage' mode */
  onDamage?: (prop: Prop) => void;
}

export interface Special {
  /** shown on the aim arrow, e.g. "켜기" */
  label?: string;
  /** is the special still doing something that should keep the turn alive */
  busy(): boolean;
  /** return true to replace the default paw impulse */
  onSwat?(game: Game, prop: Prop, dir: THREE.Vector3, power: number, point: THREE.Vector3): boolean;
  onImpact?(game: Game, prop: Prop, impact: number): void;
  /** another moving prop pressed against this one (needs spec.touchForce) */
  onTouch?(game: Game, prop: Prop, other: Prop): void;
  /** physics-rate update (before world.step) */
  step?(game: Game, prop: Prop, h: number): void;
  /** frame-rate visual update */
  frame?(game: Game, prop: Prop, dt: number): void;
  onBreak?(game: Game, prop: Prop): void;
  dispose?(game: Game, prop: Prop): void;
}

export interface PropSpec {
  kind: string;
  name: string;
  group: THREE.Object3D;
  colliders: ColDef[];
  mass: number;
  mat: Mat;
  value: number;
  pos: [number, number, number];
  rotY?: number;
  quat?: THREE.Quaternion;
  friction?: number;
  restitution?: number;
  linDamp?: number;
  angDamp?: number;
  breakable?: BreakDef;
  target?: boolean;
  interactable?: boolean;
  /** stays fixed (wall-hung, shelf) until hit with this contact force */
  pinned?: number;
  ccd?: boolean;
  special?: Special;
  /** for picking/aiming; computed from the visual if omitted */
  radius?: number;
  /** kinematic body (tablecloth) */
  kinematic?: boolean;
  /** does not count for "fell"/"toppled" points (e.g. dominoes use custom) */
  scoreMoves?: boolean;
  /** contact force that triggers special.onTouch */
  touchForce?: number;
  /** round things roll – don't count rotation as "toppled" */
  noTopple?: boolean;
  /** custom topple score (dominoes, books) */
  toppleValue?: number;
  rollingResistance?: number;
  /** used by the cat to decide where it lands */
  noLand?: boolean;
  /** floats in water (otherwise sinks slowly) */
  floats?: boolean;
  /** emoji used in chain stories and the object card */
  icon?: string;
  /** short trait tags shown when inspecting (e.g. 깨짐, 무거움, 굴러감) */
  traits?: string[];
  /** slippery things: use the lower friction of the pair instead of the average */
  frictionMin?: boolean;
  /** instancing key – many identical props share one draw call */
  batch?: string;
  /**
   * Why this thing is precious beyond its price: devotion (hours of care
   * that went into it), whose it is and a one-line story. Shown on the
   * object card, as a heart glint in the room and on the damage receipt.
   */
  worth?: Worth;
}

export interface Worth {
  /** hours of someone's care (a model kit: 300, grandma's bonsai: 30 years ≈ 2600) */
  heart?: number;
  /** whose it is (집사, 이웃 할머니 …) */
  owner?: string;
  /** one line, e.g. "석 달 걸려 조립한 전함" */
  story?: string;
  /** show the gold "expensive" glint even if the price is modest */
  showcase?: boolean;
}

/** one victim on the damage receipt */
export interface LedgerEntry {
  id: number;
  kind: string;
  name: string;
  icon: string;
  /** worst thing that happened to it */
  what: 'break' | 'damage' | 'fall' | 'topple' | 'dunk' | 'other';
  /** overrides the receipt wording (e.g. 전손, 찌그러짐) */
  label?: string;
  /** real money lost (repair / replacement) */
  money: number;
  heart: number;
  owner?: string;
  /** nearest causes first, e.g. ['🚗', '🪵', '🐾'] */
  path: string[];
}

export type GoalKind = 'break' | 'wake' | 'score' | 'floor' | 'dunk' | 'sneak';

export interface GoalDef {
  kind: GoalKind;
  /** for break/floor: how many target props; defaults to all targets */
  count?: number;
  /** for score */
  amount?: number;
  text: string;
  short: string;
}

export type ChallengeDef =
  | { type: 'paws'; max: number; text?: string }
  | { type: 'chain'; n: number; text?: string }
  | { type: 'indirect'; text?: string }
  | { type: 'cause'; victim: string; culprit: string; text: string }
  | { type: 'discover'; id: string; text: string }
  | { type: 'count'; kind: string; n: number; text: string; event?: 'break' | 'topple' | 'dunk' | 'fall' }
  | { type: 'stat'; key: string; min: number; text: string }
  | { type: 'score'; amount: number; text?: string }
  | { type: 'quiet'; max: number; text?: string };

export interface TutorialStep {
  /** text shown in the coach bubble */
  text: string;
  /** prop kind (and optional nearest position) the hand points at */
  prop?: string;
  near?: [number, number, number];
  /** world direction for the drag demo */
  dir?: [number, number];
  /** advance after the n-th swat (default: next swat) */
  until?: 'swat' | 'settle';
}

export interface LevelDef {
  id: string;
  chapter: number;
  theme: import('../levels/rooms').Theme;
  title: string;
  subtitle: string;
  paws: number;
  goal: GoalDef;
  /** score thresholds for 2 and 3 stars */
  stars: [number, number];
  /** up to three mastery challenges */
  challenges: ChallengeDef[];
  tip?: string;
  hints: string[];
  /** a suggested first move (shown by the hint button) */
  hintMove?: { prop: string; near?: [number, number, number]; dir: [number, number] };
  tutorial?: TutorialStep[];
  /** big houses: where the zoomed play view starts (x, z); defaults to the cat */
  start?: [number, number];
  build(b: import('../levels/Builder').Builder): void;
  /** owner's line when they discover the mess */
  ownerLine?: string;
  /** stage opening: the precious thing and its owner (plays once, skippable) */
  prelude?: import('./Prelude').PreludeDef;
  /** which actor comes back to discover the mess at the end */
  reactor?: string;
}

export type RAPIERType = typeof RAPIER;
