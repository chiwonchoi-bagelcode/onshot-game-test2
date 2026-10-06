import * as THREE from 'three';
import { M, box, cone, cyl, mesh, sphere, torus } from '../render/kit';

/* ------------------------------------------------------------------ */
/* Collectible cats: each has its own look, voice, motion, lines and a  */
/* small perk that nudges how you play (never required to win).         */
/* ------------------------------------------------------------------ */

export type Pattern = 'tabby' | 'solid' | 'tuxedo' | 'calico' | 'point' | 'spots';
export type PerkId = 'bonus2x' | 'quiet' | 'heavy' | 'lucky' | 'chatty' | 'domino' | 'elegant' | 'jump' | 'gold';
export type IdleAct = 'lick' | 'stretch' | 'roll' | 'groom' | 'yawn' | 'loaf' | 'tail';

export type Unlock =
  | { kind: 'start' }
  | { kind: 'churu'; cost: number }
  | { kind: 'chapter'; chapter: number }
  | { kind: 'achievement'; id: string }
  | { kind: 'finale' };

export interface CatDef {
  id: string;
  name: string;
  breed: string;
  desc: string;
  look: {
    base: string; belly: string; stripe: string; ear: string; nose: string; eye: string;
    pattern: Pattern; patch?: string; patch2?: string;
    chubby?: number; fluffy?: boolean; size?: number; glowEyes?: boolean; sparkle?: boolean;
  };
  stats: { power: number; speed: number; reach: number };
  perk: { id: PerkId; name: string; text: string };
  voice: number;
  motion: { leap: number; hop: number; wiggle: number; tail: number; idle: IdleAct[] };
  lines: { swat: string[]; heavy: string[]; chain: string[]; big: string[]; innocent: string[]; fail: string[]; hello: string[] };
  unlock: Unlock;
  color: string;
}

export const CATS: CatDef[] = [
  {
    id: 'cheese', name: '치즈', breed: '치즈 태비', color: '#f39a4a',
    desc: '시치미 떼기의 달인. 무슨 일이 있어도 눈을 깜빡일 뿐.',
    look: { base: '#f39a4a', belly: '#fff6e8', stripe: '#d9732c', ear: '#ff9db0', nose: '#ff9db0', eye: '#2b2233', pattern: 'tabby' },
    stats: { power: 1, speed: 1, reach: 0 },
    perk: { id: 'bonus2x', name: '시치미 장인', text: '남은 앞발 보너스 2배' },
    voice: 1, motion: { leap: 1, hop: 1, wiggle: 1, tail: 1, idle: ['lick', 'stretch', 'loaf'] },
    lines: {
      swat: ['툭!', '에잇', '냥!'], heavy: ['칫, 무겁잖아…', '더 세게…?'], chain: ['후훗…', '계획대로다냥', '흐흥~'],
      big: ['완벽해…', '예술이다냥…'], innocent: ['냥? (난 아무것도 몰라요)', '…(눈 깜빡)'], fail: ['흥… 오늘은 봐준다냥'], hello: ['오늘은 뭘 떨어뜨릴까냥'],
    },
    unlock: { kind: 'start' },
  },
  {
    id: 'kkamang', name: '까망', breed: '검은 고양이', color: '#3a3346',
    desc: '그림자처럼 조용히 다가와 와장창. 발소리가 거의 없다.',
    look: { base: '#3a3346', belly: '#4a4258', stripe: '#2b2533', ear: '#6b5a7a', nose: '#6b5a7a', eye: '#ffd23f', pattern: 'solid', glowEyes: true },
    stats: { power: 1, speed: 1.08, reach: 0.15 },
    perk: { id: 'quiet', name: '그림자 걸음', text: '집사가 사고 소리를 40% 덜 들음' },
    voice: 0.9, motion: { leap: 0.8, hop: 1.1, wiggle: 0.7, tail: 1.4, idle: ['groom', 'tail', 'loaf'] },
    lines: {
      swat: ['…', '스윽', '사뿐'], heavy: ['…무겁군'], chain: ['…훗', '예정대로'],
      big: ['어둠 속의 예술', '…완벽'], innocent: ['…(어둠 속으로)', '난 그림자일 뿐'], fail: ['…다음엔'], hello: ['…그림자는 소리가 없지'],
    },
    unlock: { kind: 'chapter', chapter: 1 },
  },
  {
    id: 'samsaek', name: '삼색이', breed: '삼색 고양이', color: '#f2b134',
    desc: '호기심 대장. 모든 물건을 한 번씩은 건드려 봐야 직성이 풀린다.',
    look: { base: '#fff6e8', belly: '#ffffff', stripe: '#d9732c', ear: '#ff9db0', nose: '#ff9db0', eye: '#4c8a3a', pattern: 'calico', patch: '#f39a4a', patch2: '#3a3346' },
    stats: { power: 1, speed: 1, reach: 0 },
    perk: { id: 'lucky', name: '행운의 삼색', text: '스테이지 츄르 보상 +30%' },
    voice: 1.12, motion: { leap: 0.95, hop: 1.05, wiggle: 1.4, tail: 1.2, idle: ['tail', 'lick', 'stretch'] },
    lines: {
      swat: ['이건 뭐야?', '궁금해!', '톡톡'], heavy: ['안 움직이네?'], chain: ['우와와!', '이것도 떨어진다!'],
      big: ['대발견이다냥!', '최고야!'], innocent: ['냥냥? 원래 이랬는걸?', '(고개 갸웃)'], fail: ['다른 것도 건드려 볼래!'], hello: ['오늘은 뭐가 떨어질까?'],
    },
    unlock: { kind: 'churu', cost: 400 },
  },
  {
    id: 'ttung', name: '뚱냥', breed: '브리티시 숏헤어', color: '#8f97a8',
    desc: '느긋하지만 한 방이 묵직하다. 엉덩이가 무기.',
    look: { base: '#8f97a8', belly: '#a9b0bf', stripe: '#7c8496', ear: '#c9a0b0', nose: '#7a5a6a', eye: '#f2b134', pattern: 'solid', chubby: 1.3, size: 1.08 },
    stats: { power: 1.45, speed: 0.9, reach: -0.1 },
    perk: { id: 'heavy', name: '육중한 앞발', text: '무거운 물건을 45% 더 세게 민다 (가벼운 건 살짝 덜 날아감)' },
    voice: 0.78, motion: { leap: 1.3, hop: 0.75, wiggle: 1.6, tail: 0.6, idle: ['loaf', 'yawn', 'roll'] },
    lines: {
      swat: ['영차', '흐읍', '쿵'], heavy: ['이 정도쯤이야', '끄응… 간다'], chain: ['어… 많이 떨어지네', '흠흠'],
      big: ['배고파졌다냥', '간식 시간인가'], innocent: ['…쿨쿨 (자는 척)', '난 계속 여기 누워 있었다냥'], fail: ['낮잠이나 자야지'], hello: ['간식 주면 생각해볼게'],
    },
    unlock: { kind: 'churu', cost: 600 },
  },
  {
    id: 'siam', name: '샴', breed: '샴 고양이', color: '#e8d5b5',
    desc: '수다쟁이 귀족. 사고를 칠 때마다 큰 소리로 자랑한다.',
    look: { base: '#efe0c4', belly: '#f8efe0', stripe: '#5a3b2b', ear: '#5a3b2b', nose: '#4a3022', eye: '#4f9ef0', pattern: 'point' },
    stats: { power: 0.95, speed: 1.12, reach: 0.1 },
    perk: { id: 'chatty', name: '수다쟁이', text: '연쇄 보너스 +40% · 대신 앞발마다 시끄럽게 야옹 (집사가 들음)' },
    voice: 1.3, motion: { leap: 0.85, hop: 1.15, wiggle: 1, tail: 1.6, idle: ['tail', 'groom', 'stretch'] },
    lines: {
      swat: ['야오오옹!', '봐봐!', '나 좀 봐!'], heavy: ['이거 왜 안 넘어가?!'], chain: ['봤어? 봤지?!', '야옹야옹!'],
      big: ['역시 나야!', '박수 쳐!'], innocent: ['야옹? 나 칭찬해줘', '(당당)'], fail: ['다음엔 더 크게 할 거야!'], hello: ['오늘도 내가 주인공이다옹'],
    },
    unlock: { kind: 'chapter', chapter: 2 },
  },
  {
    id: 'tux', name: '턱시도', breed: '턱시도 고양이', color: '#2f2a38',
    desc: '도미노에 진심인 신사. 줄 세워진 물건만 보면 설렌다.',
    look: { base: '#2f2a38', belly: '#ffffff', stripe: '#2b2533', ear: '#ff9db0', nose: '#ff9db0', eye: '#7bd389', pattern: 'tuxedo' },
    stats: { power: 1, speed: 1, reach: 0 },
    perk: { id: 'domino', name: '도미노 신사', text: '넘어뜨리기 점수 2배' },
    voice: 1.0, motion: { leap: 1, hop: 1, wiggle: 0.8, tail: 1, idle: ['groom', 'loaf', 'stretch'] },
    lines: {
      swat: ['실례.', '자, 시작하지', '톡'], heavy: ['신사답지 못하군'], chain: ['아름다운 연쇄군', '브라보'],
      big: ['걸작이로다', '훌륭해'], innocent: ['무슨 일 있었나?', '(넥타이 고쳐 매기)'], fail: ['다음엔 더 우아하게'], hello: ['줄을 세워 두었는가?'],
    },
    unlock: { kind: 'achievement', id: 'domino' },
  },
  {
    id: 'persian', name: '페르시안', breed: '페르시안', color: '#f4f1ff',
    desc: '고고한 털뭉치 귀족. 비싼 물건만 골라 깨뜨리는 안목이 있다.',
    look: { base: '#f7f4ff', belly: '#ffffff', stripe: '#e6e0f5', ear: '#ffc2d1', nose: '#ff9db0', eye: '#4f9ef0', pattern: 'solid', fluffy: true, size: 1.05 },
    stats: { power: 0.95, speed: 0.95, reach: 0 },
    perk: { id: 'elegant', name: '고급 안목', text: '깨진 물건 값 +15%' },
    voice: 0.95, motion: { leap: 1.15, hop: 0.9, wiggle: 0.6, tail: 0.7, idle: ['groom', 'loaf', 'yawn'] },
    lines: {
      swat: ['흥.', '천박하긴', '살짝'], heavy: ['무례하게 무겁군'], chain: ['나쁘지 않아', '우아하게'],
      big: ['이 정도는 돼야지', '명품만 깬다'], innocent: ['(고고하게 외면)', '저급한 일엔 관심 없어'], fail: ['오늘은 기분이 아니야'], hello: ['비싼 것만 건드릴 거야'],
    },
    unlock: { kind: 'churu', cost: 900 },
  },
  {
    id: 'bengal', name: '벵갈', breed: '벵갈 고양이', color: '#d9a35a',
    desc: '점프력 최강 사냥꾼. 남들이 못 닿는 곳도 앞발이 닿는다.',
    look: { base: '#e2b26a', belly: '#fbecd0', stripe: '#6b4423', ear: '#c98a6a', nose: '#b06a4a', eye: '#7bd389', pattern: 'spots' },
    stats: { power: 1.05, speed: 1.05, reach: 0.65 },
    perk: { id: 'jump', name: '높이뛰기', text: '앞발이 닿는 높이 +0.65' },
    voice: 1.05, motion: { leap: 0.9, hop: 1.5, wiggle: 1.2, tail: 1.3, idle: ['stretch', 'tail', 'groom'] },
    lines: {
      swat: ['사냥 개시!', '포착!', '흡!'], heavy: ['사냥감이 너무 크군'], chain: ['몰이 성공!', '우두두!'],
      big: ['대어다!', '정글의 법칙!'], innocent: ['…야생의 본능이었다', '(꼬리 탁탁)'], fail: ['다음 사냥은 꼭'], hello: ['높은 곳도 문제없지'],
    },
    unlock: { kind: 'chapter', chapter: 4 },
  },
  {
    id: 'gold', name: '황금냥', breed: '전설의 고양이', color: '#ffcf3f',
    desc: '집 전체를 엉망으로 만든 자에게만 나타나는 전설의 고양이.',
    look: { base: '#ffcf3f', belly: '#fff3c4', stripe: '#e8a91f', ear: '#ffb3a7', nose: '#ff9db0', eye: '#7a3a00', pattern: 'tabby', sparkle: true },
    stats: { power: 1.1, speed: 1.1, reach: 0.3 },
    perk: { id: 'gold', name: '금손', text: '모든 손해액 +10% · 츄르 +50%' },
    voice: 1.08, motion: { leap: 0.9, hop: 1.2, wiggle: 1.2, tail: 1.2, idle: ['stretch', 'lick', 'tail'] },
    lines: {
      swat: ['반짝!', '황금 앞발!', '찰랑'], heavy: ['황금도 무거운 건 무겁다'], chain: ['반짝반짝 연쇄!', '빛이 난다!'],
      big: ['전설이 된다냥', '황금 대참사!'], innocent: ['냥? (빛나는 눈)', '(반짝이며 외면)'], fail: ['전설은 쉬지 않는다'], hello: ['전설의 시작이다냥'],
    },
    unlock: { kind: 'finale' },
  },
];

export const catById = (id: string) => CATS.find((c) => c.id === id) ?? CATS[0];

/* ------------------------------------------------------------------ */
/* coat variants (skins)                                                */
/* ------------------------------------------------------------------ */

export interface SkinDef { id: string; cat: string; name: string; look: Partial<CatDef['look']>; unlock: Unlock; color: string }

export const SKINS: SkinDef[] = [
  { id: 'cheese-cream', cat: 'cheese', name: '크림 치즈', color: '#f7d7a8', look: { base: '#f7d7a8', stripe: '#e3b07a', belly: '#fffaf0' }, unlock: { kind: 'churu', cost: 250 } },
  { id: 'kkamang-smoke', cat: 'kkamang', name: '회색 연기', color: '#7d7f8f', look: { base: '#7d7f8f', belly: '#8f91a1', stripe: '#6a6c7a', eye: '#7bd389' }, unlock: { kind: 'achievement', id: 'ninja' } },
  { id: 'samsaek-pastel', cat: 'samsaek', name: '파스텔 삼색', color: '#ffc2d1', look: { patch: '#ffc2d1', patch2: '#9fd8cb' }, unlock: { kind: 'churu', cost: 300 } },
  { id: 'ttung-choco', cat: 'ttung', name: '초코 뚱냥', color: '#8a5a3c', look: { base: '#8a5a3c', belly: '#c9a07a', stripe: '#6b4423', eye: '#7bd389' }, unlock: { kind: 'churu', cost: 300 } },
  { id: 'siam-blue', cat: 'siam', name: '블루 포인트', color: '#5a6b8a', look: { stripe: '#5a6b8a', ear: '#5a6b8a', nose: '#4a5a7a', base: '#eef0f6' }, unlock: { kind: 'achievement', id: 'disc10' } },
  { id: 'tux-gray', cat: 'tux', name: '회색 신사', color: '#6b6f80', look: { base: '#6b6f80', stripe: '#575a69', eye: '#ffd23f' }, unlock: { kind: 'churu', cost: 300 } },
  { id: 'persian-gold', cat: 'persian', name: '샴페인 페르시안', color: '#f2d29b', look: { base: '#f2d29b', belly: '#fff6e0', stripe: '#e6c48a', eye: '#d97a2b' }, unlock: { kind: 'churu', cost: 450 } },
  { id: 'bengal-snow', cat: 'bengal', name: '스노우 벵갈', color: '#efe9e1', look: { base: '#efe9e1', belly: '#ffffff', stripe: '#8a8a99', eye: '#7fc8ff' }, unlock: { kind: 'achievement', id: 'allStars' } },
  { id: 'gold-rainbow', cat: 'gold', name: '무지개 황금냥', color: '#ffb3e6', look: { base: '#ffd1f0', stripe: '#a98bff', belly: '#fff3fb', eye: '#5b4aa8' }, unlock: { kind: 'achievement', id: 'chalAll' } },
];

export const skinById = (id: string) => SKINS.find((s) => s.id === id);

/** a cat definition with a coat variant applied */
export function withSkin(def: CatDef, skinId: string | undefined): CatDef {
  const sk = skinId ? skinById(skinId) : undefined;
  if (!sk || sk.cat !== def.id) return def;
  return { ...def, look: { ...def.look, ...sk.look } };
}

/* ------------------------------------------------------------------ */
/* accessories (cosmetic)                                               */
/* ------------------------------------------------------------------ */

export type AccSlot = 'head' | 'neck' | 'face';
export interface AccDef {
  id: string;
  name: string;
  slot: AccSlot;
  unlock: Unlock;
  icon: string;
  build(): THREE.Object3D;
}

const g = () => new THREE.Group();

export const ACCESSORIES: AccDef[] = [
  {
    id: 'ribbon', name: '분홍 리본', slot: 'head', unlock: { kind: 'churu', cost: 100 }, icon: '🎀',
    build() { const o = g(); for (const s of [-1, 1]) o.add(mesh(cone(0.11, 0.2, 4), M('#ff7aa8'), { pos: [s * 0.1, 0, 0], rot: [0, 0, s * Math.PI / 2] })); o.add(mesh(sphere(0.06, 6, 4), M('#ff4f8b'))); o.position.set(0.17, 0.3, 0.05); o.rotation.z = -0.4; return o; },
  },
  {
    id: 'party', name: '생일 고깔', slot: 'head', unlock: { kind: 'churu', cost: 120 }, icon: '🥳',
    build() { const o = g(); o.add(mesh(cone(0.17, 0.42, 10), M('#7fd3ff'), { pos: [0, 0.21, 0] })); o.add(mesh(sphere(0.06, 6, 4), M('#ffd23f'), { pos: [0, 0.44, 0] })); o.add(mesh(torus(0.15, 0.025, 4, 12), M('#ff7aa8'), { pos: [0, 0.07, 0], rot: [Math.PI / 2, 0, 0] })); o.position.set(-0.05, 0.33, 0); o.rotation.z = 0.2; return o; },
  },
  {
    id: 'chef', name: '요리사 모자', slot: 'head', unlock: { kind: 'chapter', chapter: 2 }, icon: '👨‍🍳',
    build() { const o = g(); o.add(mesh(cyl(0.2, 0.2, 0.14, 10), M('#ffffff'), { pos: [0, 0.07, 0] })); for (let i = 0; i < 4; i++) o.add(mesh(sphere(0.14, 7, 5), M('#ffffff'), { pos: [Math.cos(i * 1.57) * 0.1, 0.25, Math.sin(i * 1.57) * 0.1] })); o.position.set(0, 0.32, -0.02); return o; },
  },
  {
    id: 'flower', name: '꽃 화관', slot: 'head', unlock: { kind: 'churu', cost: 180 }, icon: '🌸',
    build() { const o = g(); o.add(mesh(torus(0.26, 0.03, 4, 14), M('#5bb98c'), { rot: [Math.PI / 2, 0, 0] })); for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; o.add(mesh(sphere(0.07, 6, 4), M(['#ff7aa8', '#ffd23f', '#ffffff'][i % 3]), { pos: [Math.cos(a) * 0.26, 0.03, Math.sin(a) * 0.26] })); } o.position.set(0, 0.26, 0); o.rotation.x = -0.15; return o; },
  },
  {
    id: 'bandana', name: '해적 두건', slot: 'head', unlock: { kind: 'achievement', id: 'chain20' }, icon: '🏴‍☠️',
    build() { const o = g(); o.add(mesh(sphere(0.33, 10, 6, ), M('#e05a5a'), { scale: [1.1, 0.5, 1.05], pos: [0, 0.12, -0.03] })); o.add(mesh(cone(0.08, 0.25, 4), M('#e05a5a'), { pos: [-0.05, 0.05, -0.36], rot: [-1.2, 0, 0] })); for (let i = 0; i < 4; i++) o.add(mesh(sphere(0.03, 4, 3), M('#ffffff'), { pos: [Math.cos(i * 1.5) * 0.25, 0.22, Math.sin(i * 1.5) * 0.2] })); o.position.set(0, 0.12, 0); return o; },
  },
  {
    id: 'crown', name: '왕관', slot: 'head', unlock: { kind: 'achievement', id: 'perfect15' }, icon: '👑',
    build() { const o = g(); const gold = M('#ffcf3f', { emissive: '#6b4a00', emissiveIntensity: 0.4 }); o.add(mesh(cyl(0.2, 0.2, 0.12, 10), gold, { pos: [0, 0.06, 0] })); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; o.add(mesh(cone(0.06, 0.16, 4), gold, { pos: [Math.cos(a) * 0.17, 0.2, Math.sin(a) * 0.17] })); o.add(mesh(sphere(0.03, 4, 3), M(['#e05a5a', '#4f86c6', '#5bb98c'][i % 3]), { pos: [Math.cos(a) * 0.2, 0.08, Math.sin(a) * 0.2] })); } o.position.set(0, 0.34, 0); return o; },
  },
  {
    id: 'wizard', name: '마법사 모자', slot: 'head', unlock: { kind: 'achievement', id: 'dexAll' }, icon: '🧙',
    build() { const o = g(); o.add(mesh(cyl(0.34, 0.34, 0.04, 14), M('#5b4aa8'), {})); o.add(mesh(cone(0.2, 0.55, 10), M('#5b4aa8'), { pos: [0, 0.29, 0], rot: [0, 0, 0.15] })); for (let i = 0; i < 3; i++) o.add(mesh(sphere(0.03, 4, 3), M('#ffd23f', { emissive: '#ffd23f', emissiveIntensity: 0.6 }), { pos: [0.1 - i * 0.05, 0.15 + i * 0.12, 0.13] })); o.position.set(0, 0.33, 0); return o; },
  },
  {
    id: 'bell', name: '방울 목걸이', slot: 'neck', unlock: { kind: 'churu', cost: 110 }, icon: '🔔',
    build() { const o = g(); o.add(mesh(torus(0.26, 0.035, 4, 16), M('#e05a5a'), { rot: [Math.PI / 2, 0, 0] })); o.add(mesh(sphere(0.08, 8, 6), M('#ffcf3f', { emissive: '#6b4a00', emissiveIntensity: 0.3 }), { pos: [0, -0.07, 0.26] })); return o; },
  },
  {
    id: 'scarf', name: '줄무늬 목도리', slot: 'neck', unlock: { kind: 'churu', cost: 150 }, icon: '🧣',
    build() { const o = g(); o.add(mesh(torus(0.27, 0.07, 6, 16), M('#4f86c6'), { rot: [Math.PI / 2, 0, 0] })); o.add(mesh(box(0.14, 0.35, 0.05, 0.02), M('#4f86c6'), { pos: [0.15, -0.18, 0.24], rot: [0, 0, 0.3] })); for (let i = 0; i < 3; i++) o.add(mesh(box(0.15, 0.04, 0.06, 0), M('#ffffff'), { pos: [0.15 + i * 0.02, -0.08 - i * 0.1, 0.26], rot: [0, 0, 0.3] })); return o; },
  },
  {
    id: 'shades', name: '선글라스', slot: 'face', unlock: { kind: 'achievement', id: 'oneShot' }, icon: '🕶️',
    build() { const o = g(); for (const s of [-1, 1]) o.add(mesh(cyl(0.1, 0.1, 0.03, 10), M('#2b2233'), { pos: [s * 0.14, 0, 0], rot: [Math.PI / 2, 0, 0] })); o.add(mesh(box(0.1, 0.025, 0.02, 0), M('#2b2233'), {})); o.position.set(0, 0.04, 0.33); return o; },
  },
];

export const accById = (id: string) => ACCESSORIES.find((a) => a.id === id);
