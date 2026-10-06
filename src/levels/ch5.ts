import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { Prop } from '../game/Prop';
import type { LevelDef } from '../game/types';
import { M, box, cyl, mesh } from '../render/kit';
import type { Builder } from './Builder';
import { playroom, PLAY } from './rooms';

const P = PLAY;
void P;

/* ------------------------------------------------------------------ */
/* Block-castle helpers.                                                */
/* A paw swat gives a block an impulse proportional to its own mass, so  */
/* thin light pillars under load barely budge. Chapter-5 castles use     */
/* heavy ground-floor posts whose top is only just under the lintel:     */
/* swat a post outwards (or hard) and the whole thing comes down.        */
/* ------------------------------------------------------------------ */

const BLOCK_COLORS = ['#ff6b6b', '#ffd23f', '#4f86c6', '#5bb98c', '#ff9f43', '#9b6fcf'];
let colorIdx = 0;

/** wooden block with tunable mass/friction (C2.block always uses volume × 1.6) */
function blk(b: Builder, at: [number, number, number], size: [number, number, number], o: { mass?: number; friction?: number; color?: string; cyl?: boolean; rot?: number } = {}): Prop {
  const [w, h, d] = size;
  const c = o.color ?? BLOCK_COLORS[colorIdx++ % BLOCK_COLORS.length];
  const grp = new THREE.Group();
  grp.add(mesh(o.cyl ? cyl(w / 2, w / 2, h, 12) : box(w, h, d, 0.04), M(c), { pos: [0, h / 2, 0] }));
  const vol = o.cyl ? Math.PI * (w / 2) * (w / 2) * h : w * h * d;
  return b.prop({
    kind: 'block', name: '나무 블록', icon: '🧱', group: grp, pos: at, rotY: o.rot,
    colliders: [o.cyl ? { shape: 'cyl', hh: h / 2, r: w / 2, at: [0, h / 2, 0] } : { shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }],
    mass: o.mass ?? Math.max(0.12, vol * 1.6), mat: 'wood', value: 1500, toppleValue: 450, friction: o.friction ?? 0.65, ccd: false,
  });
}

interface FortOpts {
  floors?: number;
  rot?: number;
  /** ground-floor post spacing */
  span?: number;
  /** ground-floor post height */
  h?: number;
  /** ground-floor post mass */
  pm?: number;
}

/**
 * A block castle: a wide ground floor (heavy posts, lintel resting on their
 * inner edges) and narrower upper floors. Returns the top y and the two
 * ground posts (local -x, +x).
 */
function fort(b: Builder, x: number, y0: number, z: number, o: FortOpts = {}): { top: number; posts: [number, number, number][] } {
  const rot = o.rot ?? 0;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const Pt = (lx: number, y: number): [number, number, number] => [x + ca * lx, y, z - sa * lx];
  const span = o.span ?? 1.2, ph = o.h ?? 1.0, pw = 0.34, pd = 0.42, ld = 0.48, ov = 0.1;
  const posts = [Pt(-span / 2, y0), Pt(span / 2, y0)];
  for (const p of posts) blk(b, p, [pw, ph, pd], { mass: o.pm ?? 1.0, friction: 0.5, rot });
  let y = y0 + ph;
  const w0 = span - pw + 2 * ov;
  blk(b, Pt(0, y), [w0, 0.2, ld], { mass: 0.3, color: '#b9825a', rot });
  y += 0.2;
  const s1 = w0 - pw - 0.06, uh = ph * 0.85;
  for (let f = 1; f < (o.floors ?? 2); f++) {
    for (const lx of [-s1 / 2, s1 / 2]) blk(b, Pt(lx, y), [pw, uh, pd], { mass: 0.5, friction: 0.5, rot });
    y += uh;
    blk(b, Pt(0, y), [s1 + pw, 0.2, ld], { mass: 0.3, color: '#b9825a', rot });
    y += 0.2;
  }
  return { top: y, posts };
}

/* ============================== 5-1 ============================== */

// castle A (tall, doll out of reach) and castle B (snow globe), side by side
const A1 = { x: 0.4, z: -1.6 }, B1 = { x: 2.1, z: -1.4 };

const S5_1: LevelDef = {
  id: '5-1', chapter: 5, theme: 'playroom', title: '블록 성의 공주님', subtitle: '아이가 쌓은 블록 성 꼭대기에 집사의 도자기 인형이…',
  paws: 3,
  goal: { kind: 'break', text: '블록 성 위의 도자기 인형과 스노우볼을 깨라', short: '성 무너뜨리기' },
  stars: [515000, 585000],
  challenges: [
    { type: 'indirect', text: '인형·스노우볼을 직접 치지 않고 클리어' },
    { type: 'paws', max: 1, text: '큰 성을 작은 성 위로 무너뜨려 앞발 1번 클리어' },
    { type: 'score', amount: 700000, text: '찻잔 세트와 저금통까지 와장창! 손해액 ₩700,000' },
  ],
  tip: '높이 있는 건 받침을 무너뜨려요. 블록 기둥은 바깥쪽으로 밀어야 쏙 빠져요.',
  hints: [
    '기둥은 바깥쪽으로 밀어야 빠져요. 성 안쪽으로 밀면 꿈쩍도 안 해요.',
    '높은 성은 기둥이 빠진 쪽으로 무너져요. 옆의 스노우볼 성 쪽으로 무너뜨려 볼까요?',
    '큰 성 오른쪽 기둥을 오른쪽으로! 두 성이 한 번에 와르르. 남은 앞발로 블록 담장과 선반도!',
  ],
  hintMove: { prop: 'block', near: [A1.x + 0.6, 0.5, A1.z], dir: [1, 0] },
  tutorial: [
    { text: '인형은 너무 높아 앞발이 안 닿아요. 맨 아래 기둥을 바깥쪽으로 툭!', prop: 'block', near: [A1.x - 0.6, 0.5, A1.z], dir: [-1, 0] },
    { text: '스노우볼 성도 받침 기둥을 빼내면 와르르! 목표물은 직접 안 쳐도 돼요.', prop: 'block', near: [B1.x, 0.5, B1.z + 0.6], dir: [0, 1] },
  ],
  ownerLine: '내 도자기 인형!! 블록 놀이 하랬더니 누가 성을 부쉈어?!',
  build(b) {
    playroom(b);
    const A = fort(b, A1.x, 0, A1.z, { floors: 4, h: 1.1 });
    C2.doll(b, { at: [A1.x, A.top, A1.z], target: true, name: '도자기 공주 인형', value: 220000 });
    const B = fort(b, B1.x, 0, B1.z, { floors: 2, rot: Math.PI / 2 });
    C2.snowGlobe(b, { at: [B1.x, B.top, B1.z], target: true });
    // mum's real porcelain tea set borrowed for a tea party, and the toy shelf
    const tt = P.table.top;
    C.teapot(b, { at: [0.0, tt, 1.3], color: '#ffffff' });
    C.mug(b, { at: [-0.8, tt, 1.05], color: '#f7c6d9', name: '찻잔' });
    C.mug(b, { at: [-1.25, tt, 1.6], color: '#f7c6d9', name: '찻잔' });
    C.plate(b, { at: [-0.5, tt, 1.85], color: '#fff4d6' });
    const st = 1.5;
    C.piggy(b, { at: [3.1, st, -3.55], rot: -0.4 });
    C.deskLamp(b, { at: [0.0, st, -3.7], color: '#ff8fa3' });
    C.bookRow(b, { at: [1.0, st, -3.7], n: 4, gap: 0.3 });
    C.alarmClock(b, { at: [2.3, st, -3.5], rot: 0.3, color: '#7fd3ff' });
    C.rubberBall(b, { at: [2.9, 0, 1.4], color: '#ffd23f' });
    C2.castle(b, [-2.6, 0, 1.4], 'pyramid', { floors: 1, rot: 0.3 });
    C.toyCar(b, { at: [0.9, 0, 3.1], rot: 0.4 });
    C2.plush(b, { at: [-3.5, P.bed.top, -2.9], kind: 'bunny' });
    b.cat(3.6, 0, 3.0);
  },
};

/* ============================== 5-2 ============================== */

const SH2 = { x: 1.2, z: -1.6, w: 3.0, h: 4.9, d: 0.8 };
const BAL_COLORS = ['#ff6b6b', '#ffd23f', '#7fd3ff', '#ff8fd0', '#7bd389', '#b39cff'];

/** a party balloon floating at (x, y, z), tied to the floor right below */
function party(b: Builder, x: number, y: number, z: number, i: number, o: { target?: boolean; anchorY?: number; dx?: number; dz?: number } = {}) {
  const ay = o.anchorY ?? 0;
  return C2.balloon(b, { at: [x, y, z], anchor: [x + (o.dx ?? 0), ay, z + (o.dz ?? 0)], length: y - ay - 0.42, color: BAL_COLORS[i % BAL_COLORS.length], target: o.target });
}

const S5_2: LevelDef = {
  id: '5-2', chapter: 5, theme: 'playroom', title: '풍선 파티', subtitle: '생일 파티 준비 끝! 진열장 꼭대기엔 집사의 보물들',
  paws: 3,
  goal: { kind: 'break', text: '진열장 꼭대기 보물 3개와 블록 성의 눈사람 스노우볼을 깨라', short: '보물 4개' },
  stars: [870000, 920000],
  challenges: [
    { type: 'paws', max: 1, text: '풍선 단 한 번 터뜨려서 클리어' },
    { type: 'indirect', text: '보물을 직접 치지 않고 클리어' },
    { type: 'stat', key: 'balloon', min: 13, text: '파티 풍선 13개 전부 펑!' },
  ],
  tip: '풍선이 터지면 가까운 풍선도 연달아 펑! 터지는 바람에 가벼운 물건이 밀려나요.',
  hints: [
    '진열장 뒤에 숨은 풍선들이 보이나요? 거기까지 이어지는 풍선 줄을 찾아봐요.',
    '침대 옆 풍선 사다리 맨 아래를 터뜨리면 진열장 뒤까지 연달아 펑!',
    '떨어지는 보물이 진열장 앞 풍선 아치를 터뜨리면 창가 성까지 이어져요. 앞발 1번이면 충분!',
  ],
  hintMove: { prop: 'balloon', near: [-1.9, 3.5, -1.4], dir: [1, 0] },
  ownerLine: '파티 풍선이 전부…!! 내 인형들은 또 왜 바닥에 있어?!',
  build(b) {
    playroom(b);
    const sh = C.bookshelf(b, { at: [SH2.x, 0, SH2.z], w: SH2.w, h: SH2.h, d: SH2.d, shelves: 4, mass: 40, color: '#ffb3c6' });
    const top = sh.shelfY[sh.shelfY.length - 1];
    C2.doll(b, { at: [SH2.x - 1.0, top, SH2.z + 0.22], target: true });
    C2.snowGlobe(b, { at: [SH2.x, top, SH2.z + 0.22], target: true });
    C2.doll(b, { at: [SH2.x + 1.0, top, SH2.z + 0.22], target: true, color: '#7fd3ff' });
    // toys on the lower shelves
    C.bookRow(b, { at: [SH2.x - 1.1, sh.shelfY[1], SH2.z], n: 4, gap: 0.3 });
    C2.plush(b, { at: [SH2.x + 0.8, sh.shelfY[1], SH2.z], kind: 'bunny' });
    C.toyCar(b, { at: [SH2.x - 0.5, sh.shelfY[2], SH2.z], color: '#4f86c6' });
    C2.plush(b, { at: [SH2.x + 0.6, sh.shelfY[3], SH2.z] });
    // high balloons hiding behind the display shelf
    for (let i = 0; i < 3; i++) party(b, SH2.x - 1.0 + i, 5.55, SH2.z - 0.6, i);
    // the ladder down to the left
    party(b, -1.0, 4.6, -2.4, 3);
    party(b, -1.9, 3.5, -1.4, 4);
    // a low balloon arch in front of the shelf
    party(b, 0.3, 1.9, -0.6, 5);
    party(b, 1.2, 2.2, -0.5, 1);
    party(b, 2.1, 1.9, -0.6, 2);
    // the other bunch by the window seat, next to a little castle
    const F = fort(b, 3.6, 0, 0.6, { floors: 2, rot: Math.PI / 2 });
    C2.snowGlobe(b, { at: [3.6, F.top, 0.6], target: true, name: '눈사람 스노우볼' });
    party(b, 4.3, 3.3, 1.1, 5);
    party(b, 4.0, 2.6, -0.3, 0);
    party(b, 3.9, 3.9, 1.9, 1);
    // party table: cups and plates around a balloon tied to the table
    const tt = P.table.top;
    C.cup(b, { at: [-1.75, tt, 0.95], juice: '#ff9fc0', name: '주스잔' });
    C.cup(b, { at: [-0.55, tt, 1.05], juice: '#ffd23f', name: '주스잔' });
    C.plate(b, { at: [-1.35, tt, 2.0], color: '#fff4d6', name: '파티 접시' });
    C.mug(b, { at: [-0.6, tt, 1.95], color: '#f7c6d9', name: '찻잔' });
    party(b, -1.2, 2.35, 1.5, 2, { anchorY: tt });
    // a lone balloon by the bed with the teddy
    party(b, -3.6, 3.2, 1.2, 3);
    C2.plush(b, { at: [-3.2, 0, 0.5], rot: 0.6 });
    b.cat(2.4, 0, 3.0);
  },
};

/* ============================== 5-3 ============================== */

const env = (k: string, d: number) => Number((typeof process !== 'undefined' && process.env[k]) || d);
const S1_3 = { x: 1.8, y: 5.0, z: -3.85, w: 2.8 };
const S2_3 = { x: -4.65, y: 5.0, z: -2.0, w: 2.4 };
const J1_3: [number, number, number] = [env('J1X', 1.8), 0, env('J1Z', -1.8)];
const J2_3: [number, number, number] = [env('J2X', -3.0), P.bed.top, env('J2Z', -2.0)];
const J3_3: [number, number, number] = [env('J3X', -0.6), 0, env('J3Z', -1.2)];

const S5_3: LevelDef = {
  id: '5-3', chapter: 5, theme: 'playroom', title: '깜짝 상자 대포', subtitle: 'test',
  paws: 3,
  goal: { kind: 'break', text: 'test', short: 'test' },
  stars: [100000, 200000],
  challenges: [],
  hints: ['a', 'b', 'c'],
  build(b) {
    playroom(b);
    const s1 = C.wallShelf(b, { at: [S1_3.x, S1_3.y, S1_3.z], w: S1_3.w, d: 0.7, pinned: env('PIN', 200), color: '#ffcf5c' });
    C2.doll(b, { at: [S1_3.x - 0.9, s1.top, S1_3.z], target: true });
    C.piggy(b, { at: [S1_3.x, s1.top, S1_3.z], rot: 0.3 });
    C2.snowGlobe(b, { at: [S1_3.x + 0.9, s1.top, S1_3.z], target: true });
    const s2 = C.wallShelf(b, { at: [S2_3.x, S2_3.y, S2_3.z], w: S2_3.w, d: 0.7, pinned: env('PIN', 200), color: '#9fd8cb', rot: Math.PI / 2 });
    C2.doll(b, { at: [S2_3.x, s2.top, S2_3.z - 0.5], target: true, color: '#7fd3ff' });
    C.bookRow(b, { at: [S2_3.x, s2.top, S2_3.z + 0.3], n: 3, gap: 0.3, rot: Math.PI / 2 });
    C2.jackBox(b, { at: J1_3, launch: env('L', 14) });
    blk(b, [J1_3[0], 0.8, J1_3[2]], [0.5, 0.5, 0.5], { mass: 1.0, color: '#ff6b6b' });
    C2.jackBox(b, { at: J2_3, launch: env('L2', 14), color: '#ff8fd0' });
    blk(b, [J2_3[0], J2_3[1] + 0.8, J2_3[2]], [0.5, 0.5, 0.5], { mass: 1.0, color: '#ffd23f' });
    C2.jackBox(b, { at: J3_3, launch: 14, color: '#b39cff' });
    C.rubberBall(b, { at: [J3_3[0], 0.8, J3_3[2]], r: 0.24 });
    b.cat(2.4, 0, 3.0);
  },
};

export const CH5: LevelDef[] = [S5_1, S5_2, S5_3];
