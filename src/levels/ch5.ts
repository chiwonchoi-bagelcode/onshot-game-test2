import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C2 from '../game/catalog2';
import type { Prop } from '../game/Prop';
import type { LevelDef } from '../game/types';
import { M, box, cyl, mesh } from '../render/kit';
import type { Builder } from './Builder';
import { buildHouse, cabinet, doorOn, posterOn, rug, windowOn } from './house';
import { furnishPlayroom, playroom, PLAY, PLAY_D, PLAY_W, rect } from './rooms';

const P = PLAY;

/* ------------------------------------------------------------------ */
/* Block-castle helpers.                                                */
/* A paw swat gives a block an impulse proportional to its own mass, so  */
/* thin light pillars under load barely budge. Chapter-5 castles use     */
/* heavy ground-floor posts whose top is only just under the lintel:     */
/* swat a post outwards (or hard) and the whole thing comes down.        */
/* ------------------------------------------------------------------ */

const BLOCK_COLORS = ['#ff6b6b', '#ffd23f', '#4f86c6', '#5bb98c', '#ff9f43', '#9b6fcf'];

/** wooden block with tunable mass/friction (C2.block always uses volume × 1.6) */
function blk(b: Builder, at: [number, number, number], size: [number, number, number], o: { mass?: number; friction?: number; color?: string; cyl?: boolean; rot?: number } = {}): Prop {
  const [w, h, d] = size;
  const c = o.color ?? BLOCK_COLORS[Math.abs(Math.round(at[0] * 3 + at[1] * 7 + at[2] * 5)) % BLOCK_COLORS.length];
  const grp = new THREE.Group();
  grp.add(mesh(o.cyl ? cyl(w / 2, w / 2, h, 12) : box(w, h, d, 0.04), M(c), { pos: [0, h / 2, 0] }));
  const vol = o.cyl ? Math.PI * (w / 2) * (w / 2) * h : w * h * d;
  return b.prop({
    kind: 'block', name: '나무 블록', icon: '🧱', group: grp, pos: at, rotY: o.rot,
    colliders: [o.cyl ? { shape: 'cyl', hh: h / 2, r: w / 2, at: [0, h / 2, 0] } : { shape: 'box', hx: w / 2, hy: h / 2, hz: d / 2, at: [0, h / 2, 0] }],
    mass: o.mass ?? Math.max(0.12, vol * 1.6), mat: 'wood', value: 1500, toppleValue: 450, friction: o.friction ?? 0.65, ccd: false,
  });
}

/**
 * Rapier lets a resting stack fall asleep, and a post knocked out quickly
 * does not always wake the lintel it was holding up (it then hovers). Keep
 * a castle's pieces together: when any of them moves, wake them all.
 */
function bind(b: Builder, props: Prop[]) {
  b.game.addUpdater(() => {
    let moving = false;
    for (const p of props) {
      if (!p.alive || p.body.isSleeping()) continue;
      const v = p.body.linvel();
      if (v.x * v.x + v.y * v.y + v.z * v.z > 0.04) { moving = true; break; }
    }
    if (moving) for (const p of props) if (p.alive && p.body.isSleeping()) p.body.wakeUp();
  });
  return props;
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
  /** chunky dark ground posts the paw cannot budge */
  heavy?: boolean;
}

/**
 * A block castle: a wide ground floor (heavy posts, lintel resting on just
 * their inner edges) and narrower upper floors. `rot` turns the post axis
 * (rot 0: posts along x). Returns the top y, the two ground-post positions
 * (local -x, +x) and its pieces (push the prop perched on top into `props`
 * so it wakes with the castle).
 */
function fort(b: Builder, x: number, y0: number, z: number, o: FortOpts = {}): { top: number; posts: [number, number, number][]; props: Prop[] } {
  const rot = o.rot ?? 0;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const Pt = (lx: number, y: number): [number, number, number] => [x + ca * lx, y, z - sa * lx];
  const span = o.span ?? 1.2, ph = o.h ?? 1.0, ld = 0.48, ov = 0.1;
  const pw = o.heavy ? 0.5 : 0.34, pd = o.heavy ? 0.56 : 0.42;
  const posts = [Pt(-span / 2, y0), Pt(span / 2, y0)];
  const props: Prop[] = [];
  for (const p of posts) props.push(blk(b, p, [pw, ph, pd], { mass: o.heavy ? 9 : o.pm ?? 1.0, friction: o.heavy ? 0.8 : 0.5, rot, color: o.heavy ? '#8e5f3e' : undefined }));
  let y = y0 + ph;
  const w0 = span - pw + 2 * ov;
  props.push(blk(b, Pt(0, y), [w0, 0.2, ld], { mass: 0.3, color: '#b9825a', rot }));
  y += 0.2;
  const uw = 0.34, ud = 0.42;
  const s1 = w0 - uw - 0.06, uh = ph * 0.85;
  for (let f = 1; f < (o.floors ?? 2); f++) {
    for (const lx of [-s1 / 2, s1 / 2]) props.push(blk(b, Pt(lx, y), [uw, uh, ud], { mass: 0.5, friction: 0.5, rot }));
    y += uh;
    props.push(blk(b, Pt(0, y), [s1 + uw, 0.2, ld], { mass: 0.3, color: '#b9825a', rot }));
    y += 0.2;
  }
  bind(b, props);
  return { top: y, posts, props };
}

/* ============================== 5-1 ============================== */

// castle A (tall, doll out of reach) and castle B (snow globe), side by side
const A1 = { x: 0.4, z: -1.6 }, B1 = { x: 2.1, z: -1.4 };

const S5_1: LevelDef = {
  id: '5-1', chapter: 5, theme: 'playroom', title: '블록 성의 공주님', subtitle: '아이가 쌓은 블록 성 꼭대기에 집사의 도자기 인형이…',
  paws: 3,
  goal: { kind: 'break', text: '블록 성 위의 도자기 인형과 스노우볼을 깨라', short: '성 무너뜨리기' },
  stars: [500000, 585000],
  challenges: [
    { type: 'indirect', text: '인형·스노우볼을 직접 치지 않고 클리어' },
    { type: 'paws', max: 1, text: '큰 성을 작은 성 위로 무너뜨려 앞발 1번 클리어' },
    { type: 'score', amount: 700000, text: '찻잔 세트와 저금통까지 와장창! 손해액 ₩700,000' },
  ],
  tip: '높이 있는 건 받침을 무너뜨려요. 블록 기둥은 바깥쪽으로 밀어야 쏙 빠져요.',
  hints: [
    '기둥은 바깥쪽으로 밀어야 빠져요. 성 안쪽으로 밀면 꿈쩍도 안 해요.',
    '높은 성은 기둥이 빠진 쪽으로 무너져요. 옆의 스노우볼 성 쪽으로 무너뜨려 볼까요?',
    '큰 성 오른쪽 기둥을 오른쪽으로! 두 성이 한 번에 와르르. 남은 앞발로 엄마 찻잔 세트와 저금통도!',
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
    A.props.push(C2.doll(b, { at: [A1.x, A.top, A1.z], target: true, name: '도자기 공주 인형', value: 220000 }));
    const B = fort(b, B1.x, 0, B1.z, { floors: 2, rot: Math.PI / 2 });
    B.props.push(C2.snowGlobe(b, { at: [B1.x, B.top, B1.z], target: true }));
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
function party(b: Builder, x: number, y: number, z: number, i: number, o: { target?: boolean; anchorY?: number } = {}) {
  const ay = o.anchorY ?? 0;
  return C2.balloon(b, { at: [x, y, z], anchor: [x, ay, z], length: y - ay - 0.42, color: BAL_COLORS[i % BAL_COLORS.length], target: o.target });
}

const S5_2: LevelDef = {
  id: '5-2', chapter: 5, theme: 'playroom', title: '풍선 파티', subtitle: '생일 파티 준비 끝! 진열장 꼭대기엔 집사의 보물들',
  paws: 3,
  goal: { kind: 'break', text: '진열장 꼭대기 보물 3개와 블록 성의 눈사람 스노우볼을 깨라', short: '보물 4개' },
  stars: [870000, 930000],
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
    F.props.push(C2.snowGlobe(b, { at: [3.6, F.top, 0.6], target: true, name: '눈사람 스노우볼' }));
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

const S1_3 = { x: -1.0, y: 5.0, z: -3.85, w: 2.6 };
const J1_3: [number, number, number] = [-1.0, 0, -1.8];
const J3_3: [number, number, number] = [1.5, 0, -1.5];
const F3 = { x: 3.5, z: -2.2 };

const S5_3: LevelDef = {
  id: '5-3', chapter: 5, theme: 'playroom', title: '깜짝 상자 대포', subtitle: '고양이 손 안 닿는 높은 선반… 장난감 상자가 도와줄 거다냥',
  paws: 3,
  goal: { kind: 'break', text: '높은 선반의 보물 2개와 블록 탑 꼭대기 인형을 깨라', short: '높은 곳 보물' },
  stars: [620000, 670000],
  challenges: [
    { type: 'paws', max: 2, text: '헛방 없이 앞발 2번으로 클리어' },
    { type: 'cause', victim: 'doll', culprit: 'balloon', text: '공을 쏘아 풍선 바람으로 탑 위 인형 떨어뜨리기' },
    { type: 'score', amount: 770000, text: '침대 위 상자로 가족사진까지! 손해액 ₩770,000' },
  ],
  tip: '깜짝 상자를 치면 뚜껑 위 물건이 "친 방향"으로 높이 날아가요. 무거운 블록은 선반째 떨어뜨려요!',
  hints: [
    '빨간 블록을 얹은 상자를 벽 쪽으로 치면 블록이 선반을 아래에서 쾅! 선반째 와르르.',
    '탑 1층 기둥은 너무 무거워요. 보라 상자의 공을 탑 앞 풍선 쪽으로 쏘아 올려 볼까요?',
    '보라 상자를 오른쪽 탑 쪽으로! 풍선이 터지는 바람에 인형이 떨어져요. 남은 앞발은 침대 위 분홍 상자를 왼쪽 벽 액자 쪽으로!',
  ],
  hintMove: { prop: 'jack', near: [J1_3[0], 0.4, J1_3[2]], dir: [0, -1] },
  ownerLine: '선반이 통째로…?! 장난감 상자를 대포로 쓴 거야?!',
  build(b) {
    playroom(b);
    const s1 = C.wallShelf(b, { at: [S1_3.x, S1_3.y, S1_3.z], w: S1_3.w, d: 0.7, pinned: 200, color: '#ffcf5c' });
    C2.doll(b, { at: [S1_3.x - 0.9, s1.top, S1_3.z], target: true });
    C.piggy(b, { at: [S1_3.x, s1.top, S1_3.z], rot: 0.3 });
    C2.snowGlobe(b, { at: [S1_3.x + 0.9, s1.top, S1_3.z], target: true });
    // tall block tower with a doll on top, party balloons in front of its top
    const F = fort(b, F3.x, 0, F3.z, { floors: 4, h: 1.1, rot: Math.PI / 2, heavy: true });
    F.props.push(C2.doll(b, { at: [F3.x, F.top, F3.z - 0.12], target: true, color: '#7fd3ff', name: '발레리나 인형' }));
    party(b, F3.x - 0.45, 4.95, F3.z + 0.7, 0);
    party(b, F3.x - 0.95, 5.4, F3.z + 1.45, 2);
    party(b, F3.x + 0.05, 5.5, F3.z + 1.45, 4);
    // the jack-in-the-boxes: heavy block, rubber ball, teddy
    C2.jackBox(b, { at: J1_3, launch: 14 });
    blk(b, [J1_3[0], 0.8, J1_3[2]], [0.5, 0.5, 0.5], { mass: 1.0, color: '#ff6b6b' });
    C2.jackBox(b, { at: J3_3, launch: 14, color: '#b39cff' });
    C.rubberBall(b, { at: [J3_3[0], 0.8, J3_3[2]], r: 0.3 });
    C2.jackBox(b, { at: [-3.2, P.bed.top, -1.1], launch: 14, color: '#ff8fd0' });
    C2.plush(b, { at: [-3.2, P.bed.top + 0.8, -1.1] });
    C.pictureFrame(b, { at: [-4.93, 4.6, -1.1], rot: Math.PI / 2, w: 1.3, h: 1.0, art: 1, pinned: 90, name: '가족사진', value: 90000 });
    // toy shelf under the high shelf
    const st = 1.5;
    C.bookRow(b, { at: [0.0, st, -3.7], n: 4, gap: 0.3 });
    C.alarmClock(b, { at: [1.6, st, -3.5], rot: 0.3, color: '#7fd3ff' });
    C.deskLamp(b, { at: [2.9, st, -3.7], color: '#ff8fa3' });
    C.toyCar(b, { at: [-1.6, 0, 1.2], rot: 0.5 });
    b.cat(2.4, 0, 3.0);
  },
};

/* ============================== 5-4 ============================== */

/** the playroom without its little table (room for a train set) */
function playroomNoTable(b: Builder) {
  buildHouse(b, { rooms: [rect('play', '아이방', 0, 0, PLAY_W, PLAY_D, 'playmat', 'play')], base: '#c27aa8', h: 7.2 });
  furnishPlayroom(b, 0, 0, { table: false });
  doorOn(b, { x: -PLAY_W / 2 }, PLAY.doorZ, '#a9c8ff');
  b.ownerAtDoor(-PLAY_W / 2 + 0.9, 0, PLAY.doorZ, Math.PI / 2);
}

/** rounded rectangle loop (clockwise seen from above when dir=1) */
function loopPath(x0: number, z0: number, x1: number, z1: number, c = 0.6): [number, number][] {
  return [
    [x0, z1 - c], [x0, z0 + c], [x0 + c, z0], [x1 - c, z0], [x1, z0 + c], [x1, z1 - c], [x1 - c, z1], [x0 + c, z1],
  ];
}

const TRK = { x0: -1.8, z0: -1.4, x1: 3.0, z1: 2.6 };

const S5_4: LevelDef = {
  id: '5-4', chapter: 5, theme: 'playroom', title: '칙칙폭폭 대탈선', subtitle: '아이가 기찻길 위에 블록 다리를 놓았다. 너무 낮은데…?',
  paws: 3,
  goal: { kind: 'break', text: '블록 다리 위 인형 2개와 큰 성의 스노우볼을 깨라', short: '기찻길 보물' },
  stars: [600000, 800000],
  challenges: [
    { type: 'paws', max: 1, text: '기차 한 번 출발로 전부 클리어' },
    { type: 'indirect', text: '인형·스노우볼을 직접 치지 않고 클리어' },
    { type: 'stat', key: 'toppleChain', min: 18, text: '한 번에 블록 18개 와르르' },
  ],
  tip: '기차를 치면 레일을 따라 달리며 길 위의 물건을 들이받아요. 레일 위를 어지르면 기차가 멈출 수도!',
  hints: [
    '기차가 지나갈 길을 잘 보세요. 블록 다리가 기차보다 낮아요!',
    '큰 성을 먼저 무너뜨리면 블록이 레일을 막아 기차가 멈춰요. 기차를 먼저 출발시켜요.',
    '레일 위에 낮게 뜬 풍선을 기차가 터뜨리면 풍선 줄이 성 위 스노우볼까지 이어져요. 기차 한 번이면 끝!',
  ],
  hintMove: { prop: 'train', dir: [-1, 0] },
  ownerLine: '기찻길이 왜 이래…?! 인형들은 또 왜 바닥에 있어?!',
  build(b) {
    playroomNoTable(b);
    const path = loopPath(TRK.x0, TRK.z0, TRK.x1, TRK.z1);
    // start in the middle of the front straight, heading left
    const start: [number, number] = [0.6, TRK.z1];
    C2.train(b, { at: [start[0], 0, start[1]], path: [start, ...path.slice(7), ...path.slice(0, 7)], loop: true });
    // low block bridges over the rails (the engine is taller than they are)
    const g1 = C2.castle(b, [TRK.x0, 0, 0.6], 'gate', { floors: 2 });
    C2.doll(b, { at: [TRK.x0, g1, 0.6], target: true });
    const g2 = C2.castle(b, [TRK.x1, 0, 0.8], 'gate', { floors: 2 });
    C2.doll(b, { at: [TRK.x1, g2, 0.8], target: true, color: '#7fd3ff' });
    // a tall castle right behind the back straight
    const H = fort(b, 0.6, 0, TRK.z0 - 1.0, { floors: 3, rot: Math.PI / 2, pm: 3 });
    H.props.push(C2.snowGlobe(b, { at: [0.6, H.top, TRK.z0 - 1.0], target: true }));
    // party balloons: one hanging low over the rails, one in front of the snow globe
    party(b, 1.2, 1.25, TRK.z0 + 0.3, 1);
    party(b, 1.45, 2.55, TRK.z0 + 0.1, 5);
    party(b, 1.45, 3.8, TRK.z0 - 1.0, 3);
    // a block wall across the front straight, just behind the station
    C2.castle(b, [2.0, 0, TRK.z1], 'wall', { floors: 2, width: 4, rot: Math.PI / 2 });
    // toys lying around (off the rails)
    C2.plush(b, { at: [-3.4, P.bed.top, -2.8], kind: 'bunny' });
    C2.plush(b, { at: [0.6, 0, 0.6], rot: 0.4 });
    C.rubberBall(b, { at: [-3.0, 0, 1.6], color: '#7fd3ff' });
    C.toyCar(b, { at: [1.6, 0, 1.0], rot: 1.2, color: '#ffd23f' });
    b.cat(3.6, 0, 3.4);
  },
};

/* ============================== 5-5 ============================== */

// playroom (x -5..5) + little sister's room (x 5..12), joined by a wide door the rails run through
const R5 = { split: 5, x1: 12, door: { z: 1.2, w: 4.2 } };
const TRK5 = { x0: 1.2, z0: -0.4, x1: 10.8, z1: 2.8 };
const A5 = { x: -0.6, z: -1.8 }, B5 = { x: 1.1, z: -1.6 };
const J5: [number, number, number] = [-3.4, PLAY.bed.top, -2.0];
const S5 = { x: -3.4, y: 5.0, z: -3.85, w: 2.4 };
const C5 = { x: 8.6, z: -2.0 };

const S5_5: LevelDef = {
  id: '5-5', chapter: 5, theme: 'playroom', title: '놀이방 대소동', subtitle: '아이들은 소풍 갔다. 놀이방도, 동생 방도… 오늘은 다 내 거다냥',
  paws: 4,
  goal: { kind: 'break', count: 5, text: '두 방에 숨은 보물 7개 중 5개를 깨라', short: '보물 5/7' },
  stars: [1400000, 1700000],
  challenges: [
    { type: 'paws', max: 2, text: '앞발 2번으로 클리어' },
    { type: 'stat', key: 'break', min: 7, text: '보물 7개 전부 와장창' },
    { type: 'chain', n: 30, text: '한 번에 연쇄 x30' },
  ],
  tip: '지금까지 배운 장난을 전부! 기차, 풍선, 깜짝 상자, 블록 성… 한 번의 앞발로 여러 보물을 노려요.',
  hints: [
    '동생 방의 기차를 출발시켜 보세요. 문을 지나 놀이방까지 달려요.',
    '큰 블록 성은 오른쪽 기둥을 오른쪽으로! 옆의 성까지 함께 무너져요. 침대 위 깜짝 상자는 벽 쪽으로.',
    '기차 + 큰 성 = 앞발 2번에 보물 5개. 남은 앞발로 침대 위 상자까지 쏘면 7개 전부!',
  ],
  hintMove: { prop: 'train', dir: [1, 0] },
  ownerLine: '소풍 다녀왔더니… 우리 집이 블록 폭탄 맞았어?!',
  start: [2.0, 0.5],
  build(b) {
    buildHouse(b, {
      rooms: [rect('play', '놀이방', 0, 0, PLAY_W, PLAY_D, 'playmat', 'play'), rect('sis', '동생 방', (R5.split + R5.x1) / 2, 0, R5.x1 - R5.split, PLAY_D, 'wood', 'butter')],
      doors: [{ x: R5.split, z: R5.door.z, w: R5.door.w }],
      base: '#c27aa8', h: 7.2,
    });
    // (no hanging mobile here: the high shelf above the bed takes its place)
    furnishPlayroom(b, 0, 0, { table: false, backWall: false });
    windowOn(b, { z: -PLAY_D / 2 }, 1.6, 4.3, 2.6, 2.0, false, '#ffb3c6');
    doorOn(b, { x: -PLAY_W / 2 }, PLAY.doorZ, '#a9c8ff');
    b.ownerAtDoor(-PLAY_W / 2 + 0.9, 0, PLAY.doorZ, Math.PI / 2);
    // sister's room
    windowOn(b, { z: -PLAY_D / 2 }, 8.6, 4.3, 2.2, 1.8, false, '#ffd23f');
    posterOn(b, { z: -PLAY_D / 2 }, 11.0, 4.6, 1.0, 1.3, ['#fff1c1', '#ff8fa3', '#7fd3ff']);
    cabinet(b, 6.4, -3.7, 2.0, 0.8, 1.4, '#ffe08a', '#ffffff', 2);
    rug(b, 8.6, 1.8, 5.0, 3.2, ['#ffd6e3', '#ffffff', '#7fd3ff']);

    // --- train loop through the door ---
    const path = loopPath(TRK5.x0, TRK5.z0, TRK5.x1, TRK5.z1);
    C2.train(b, { at: [6.2, 0, TRK5.z0], path: [[6.2, TRK5.z0], ...path.slice(3), ...path.slice(0, 3)], loop: true, color: '#4f86c6' });
    // low bridges (the engine is taller): one in each room
    const g1 = C2.castle(b, [3.0, 0, TRK5.z1], 'gate', { floors: 2, rot: Math.PI / 2 });
    C2.doll(b, { at: [3.0, g1, TRK5.z1], target: true });
    const g2 = C2.castle(b, [9.6, 0, TRK5.z0], 'gate', { floors: 2, rot: Math.PI / 2 });
    C2.doll(b, { at: [9.6, g2, TRK5.z0], target: true, color: '#7fd3ff' });
    // sister's castle behind the rails, balloons leading up from the track
    const K = fort(b, C5.x, 0, C5.z, { floors: 3, rot: Math.PI / 2, pm: 3 });
    K.props.push(C2.snowGlobe(b, { at: [C5.x, K.top, C5.z], target: true, name: '동생의 스노우볼' }));
    party(b, 7.4, 1.25, TRK5.z0 + 0.3, 1);
    party(b, 7.8, 2.5, TRK5.z0 - 0.5, 5);
    party(b, C5.x - 0.85, 3.85, C5.z, 3);
    // a block wall across the front straight for the train to bowl through
    C2.castle(b, [6.4, 0, TRK5.z1], 'wall', { floors: 2, width: 4, rot: Math.PI / 2 });
    C2.plush(b, { at: [11.2, 0, -1.0], rot: -0.8, kind: 'bunny' });
    C.piggy(b, { at: [6.1, 1.4, -3.65], rot: 0.3 });
    C.rubberBall(b, { at: [3.2, 0, -0.9] });

    // --- playroom castles: a tall one that can fall onto its neighbour ---
    const A = fort(b, A5.x, 0, A5.z, { floors: 4, h: 1.1 });
    A.props.push(C2.doll(b, { at: [A5.x, A.top, A5.z], target: true, name: '도자기 공주 인형', value: 220000 }));
    const B = fort(b, B5.x, 0, B5.z, { floors: 2, rot: Math.PI / 2 });
    B.props.push(C2.snowGlobe(b, { at: [B5.x, B.top, B5.z], target: true }));

    // --- jack-in-the-box on the bed under a high shelf ---
    const sh = C.wallShelf(b, { at: [S5.x, S5.y, S5.z], w: S5.w, d: 0.7, pinned: 200, color: '#ffcf5c' });
    C2.doll(b, { at: [S5.x - 0.7, sh.top, S5.z], target: true, color: '#b39cff', name: '오르골 인형' });
    C2.snowGlobe(b, { at: [S5.x + 0.7, sh.top, S5.z], target: true });
    C2.jackBox(b, { at: J5, launch: 14 });
    blk(b, [J5[0], J5[1] + 0.8, J5[2]], [0.5, 0.5, 0.5], { mass: 1.0, color: '#ff6b6b' });

    b.cat(4.0, 0, 3.6);
  },
};

export const CH5: LevelDef[] = [S5_1, S5_2, S5_3, S5_4, S5_5];
