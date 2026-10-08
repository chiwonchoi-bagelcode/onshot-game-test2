import type { ChallengeDef, GoalDef, LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { catBowl } from '../game/catalog4';
import { BEDROOM } from './rooms';

/** the owner naps on the bed (the stage's door owner stays out of it) */
const nap = (b: Builder) => { b.ownerAsleepInstead(BEDROOM.bed.x, 1.1, BEDROOM.bed.z - 0.5, -Math.PI / 2); };

/* ------------------------------------------------------------------ */
/* The request board (의뢰판): rule-based variations of stages, opened  */
/* once the front door is open. Same place, new rules — only the kinds  */
/* that make you think differently (§9.3): fewer paws, a trick that     */
/* opens a route, a thing that must survive, a named culprit, no noise, */
/* and (after the end of the world) one challenge per cat. Each one is  */
/* backed by verified solutions in tools/cases/remix.ts.                */
/* ------------------------------------------------------------------ */

type Kind = NonNullable<LevelDef['remix']>['kind'];

interface RemixSpec {
  id: string; base: string; title: string; note: string; paws: number; stars: [number, number]; kind: Kind;
  trick?: 'hairball' | 'knead' | 'meow' | 'zoomies'; cat?: string;
  protect?: LevelDef['protect']; goal?: GoalDef; hush?: boolean; strict?: boolean;
  extra?: (b: Builder) => void;
  challenges?: ChallengeDef[]; tip?: string;
}

const SPECS: RemixSpec[] = [
  // ---- one paw (앞발 한 번)
  { id: 'R1', kind: 'paws', base: '1-1', title: '거실 원샷', note: '앞발 단 한 번. 꽃병이 어디로 떨어져야 할까?', paws: 1, stars: [150000, 170000], challenges: [{ type: 'chain', n: 4 }] },
  { id: 'R2', kind: 'paws', base: '1-5', title: '갈림길 한 방', note: '두 선반을 앞발 한 번에.', paws: 1, stars: [1650000, 1850000], challenges: [{ type: 'stat', key: 'toppleChain', min: 12, text: '한 번에 12개 넘어뜨리기' }] },
  { id: 'R3', kind: 'paws', base: '2-1', title: '식탁보 단판', note: '식탁보는 한 번만 당길 수 있다.', paws: 1, stars: [340000, 378000] },
  { id: 'R4', kind: 'paws', base: '4-3', title: '미끄럼틀 한 방', note: '앞발 한 번으로 둑을 무너뜨려라.', paws: 1, stars: [185000, 196000] },
  { id: 'R5', kind: 'paws', base: '5-2', title: '풍선 하나', note: '풍선 하나로 전부.', paws: 1, stars: [880000, 935000] },
  { id: 'R6', kind: 'paws', base: '6-2', title: '도미노 일주', note: '집 한 바퀴를 앞발 한 번에.', paws: 1, stars: [450000, 555000] },
  // ---- tricks (기술 필수): posted once the trick is learned
  { id: 'R7', kind: 'trick', base: '2-1', title: '미끄덩 식탁', note: '헤어볼 장착: 식탁 위가 빙판이 된다면?', paws: 2, trick: 'hairball', stars: [400000, 520000], tip: '헤어볼은 앞발을 쓰지 않는 한 번의 덤이에요. 식탁 한가운데에 뱉으면…' },
  { id: 'R8', kind: 'trick', base: '1-2', title: '꾹꾹이 TV', note: '꾹꾹이 장착: 앞발 대신 무게로.', paws: 1, trick: 'knead', stars: [1000000, 1100000], tip: '꾹꾹이는 4초 동안 고양이 무게를 실어요. 무거운 게 기울어지는 곳은?' },
  { id: 'R9', kind: 'trick', base: '7-2', title: '할머니 한눈팔기', note: '야옹 장착: 앞발은 단 한 번. 할머니가 보고 있지 않을 때.', paws: 1, trick: 'meow', stars: [8000000, 9300000], tip: '야옹은 앞발을 쓰지 않아요. 할머니 눈길이 먼 곳에 가 있는 사이에…' },
  { id: 'R10', kind: 'trick', base: '5-3', title: '우다다 블록 성', note: '우다다 장착: 아무리 무거운 블록 탑이라도.', paws: 1, trick: 'zoomies', stars: [550000, 700000], tip: '우다다는 온몸으로 들이받아요. 무거운 것도 두 배로 밀려요.' },
  { id: 'R11', kind: 'trick', base: '1-3', title: '책장 통째로', note: '우다다 장착: 꼭대기 보물을 책장째.', paws: 1, trick: 'zoomies', stars: [700000, 900000] },
  // ---- protected things (이것만은 안 돼)
  { id: 'R12', kind: 'protect', base: '1-1', title: '할머니의 찻주전자', note: '꽃병은 깨도 되지만, 할머니 찻주전자만은 안 돼!', paws: 2, stars: [150000, 180000], protect: [{ kind: 'teapot' }], challenges: [{ type: 'chain', n: 6 }] },
  { id: 'R13', kind: 'protect', base: '2-1', title: '밥그릇 사수', note: '식탁은 엉망으로, 내 밥그릇은 무사히.', paws: 2, stars: [400000, 470000], protect: [{ kind: 'catBowl' }], challenges: [{ type: 'count', kind: 'bottle', n: 2, event: 'break', text: '와인병과 샴페인 모두 깨기' }], extra: (b) => { catBowl(b, { at: [-3.2, 0, 1.4] }); } },
  { id: 'R14', kind: 'protect', base: '6-1', title: '할아버지의 시계', note: 'TV는 부숴도 돼. 괘종시계는 할아버지 유품이야.', paws: 2, stars: [1000000, 1100000], protect: [{ kind: 'grandClock' }] },
  { id: 'R15', kind: 'protect', base: '6-5', title: '금붕어는 무사히', note: '대참사를 일으켜라. 단, 수조는 깨지 말 것.', paws: 3, stars: [2060000, 2100000], protect: [{ kind: 'aquarium' }], goal: { kind: 'score', amount: 1800000, text: '수조는 지키면서 손해 ₩1,800,000 이상', short: '대참사' } },
  // ---- named culprits (원인 지정)
  { id: 'R16', kind: 'cause', base: '2-4', title: '프라이팬 불도저', note: '우유를 엎어라. 단, 프라이팬이 밀어야 한다.', paws: 2, stars: [100000, 125000], goal: { kind: 'cause', victim: 'milk', culprit: 'pan', text: '프라이팬이 밀어서 우유 깨기', short: '팬 → 우유' } },
  { id: 'R17', kind: 'cause', base: '4-5', title: '비누 특급 배송', note: '세탁실 세제병을 깨라. 배달은 비누가 한다.', paws: 2, stars: [500000, 600000], goal: { kind: 'cause', victim: 'bottle', culprit: 'soap', text: '비누가 세탁실까지 미끄러져 세제병 깨기', short: '비누 → 세제' } },
  { id: 'R18', kind: 'cause', base: '5-3', title: '풍선 바람', note: '발레리나 인형을 떨어뜨려라. 앞발 말고 풍선 바람으로.', paws: 2, stars: [380000, 650000], goal: { kind: 'cause', victim: 'doll', culprit: 'balloon', text: '풍선이 터진 바람으로 탑 위 인형 떨어뜨리기', short: '풍선 → 인형' } },
  // ---- no noise (소리 없이): waking the owner fails
  { id: 'R19', kind: 'quiet', base: '3-4', title: '발소리 없는 습격', note: '집사가 침대에서 낮잠 중. 드레스룸을 털되, 깨우면 실패.', paws: 3, stars: [660000, 780000], hush: true, extra: nap, challenges: [{ type: 'quiet', max: 45, text: '소음 45 이하로 (집사가 거의 못 들음)' }] },
  { id: 'R20', kind: 'quiet', base: '3-5', title: '진짜 완전 범죄', note: '대참사를 일으키되, 집사는 끝까지 자고 있어야 한다.', paws: 3, stars: [1900000, 2000000], hush: true, extra: nap },
  // ---- cat challenges (고양이별 도전): after the end of the world, one per cat
  { id: 'C1', kind: 'cat', cat: 'cheese', base: '9-1', title: '치즈의 시치미', note: '치즈 전용: 한 방에 끝내고, 남은 앞발로 시치미 떼기.', paws: 3, stars: [400000000, 430000000] },
  { id: 'C2', kind: 'cat', cat: 'kkamang', base: '3-3', title: '까망의 그림자 작전', note: '까망 전용: 앞발 두 번. 자명종이 울려도 까망의 집사는 안 깬다?', paws: 2, stars: [200000, 250000], challenges: [{ type: 'quiet', max: 22, text: '소음 22 이하로 (까망의 발소리)' }] },
  { id: 'C3', kind: 'cat', cat: 'samsaek', base: '7-5', title: '삼색이의 행운', note: '삼색이 전용: 고임목은 셋, 앞발은 하나. 어느 차에 운을 걸까?', paws: 1, stars: [55000000, 66000000] },
  { id: 'C4', kind: 'cat', cat: 'ttung', base: '5-3', title: '뚱냥의 한 방', note: '뚱냥 전용: 무거운 블록 탑도 앞발로 직접.', paws: 2, stars: [600000, 700000] },
  { id: 'C5', kind: 'cat', cat: 'siam', base: '5-5', title: '샴의 수다 연쇄', note: '샴 전용: 길게 이어질수록 수다도 길어진다.', paws: 2, stars: [1200000, 1650000] },
  { id: 'C6', kind: 'cat', cat: 'tux', base: '5-4', title: '턱시도의 도미노', note: '턱시도 전용: 기차 한 번 출발로 블록 성 전부.', paws: 1, stars: [700000, 915000] },
  { id: 'C7', kind: 'cat', cat: 'persian', base: '2-5', title: '페르시안의 안목', note: '페르시안 전용: 비싼 그릇만 골라서.', paws: 2, stars: [410000, 430000] },
  { id: 'C8', kind: 'cat', cat: 'bengal', base: '5-3', title: '벵갈의 높이뛰기', note: '벵갈 전용: 높은 선반의 보물에 직접 뛰어오른다.', paws: 3, stars: [600000, 700000] },
  { id: 'C9', kind: 'cat', cat: 'gold', base: '8-2', title: '황금냥의 금손', note: '황금냥 전용: 새 모니터 여섯 대. 금손이 닿으면 손해도 금값.', paws: 2, stars: [8000000, 9500000] },
  { id: 'C10', kind: 'cat', cat: 'space', base: '1-2', title: '우주냥의 무중력', note: '우주냥 전용: 탁자 위 물건을 TV 위 선반까지 띄워 올리기.', paws: 1, stars: [1000000, 1100000] },
];

/** the trick a remix needs before it is posted on the board */
export const remixTrick = (l: LevelDef) => l.remix?.trick ?? null;

export function buildRemixes(find: (id: string) => LevelDef | undefined): LevelDef[] {
  const out: LevelDef[] = [];
  for (const r of SPECS) {
    const b = find(r.base);
    if (!b) continue;
    const extra = r.extra;
    out.push({
      ...b,
      id: r.id, title: r.title, subtitle: `의뢰 · ${b.id} ${b.title}`, paws: r.paws, stars: r.stars,
      goal: r.goal ?? b.goal,
      challenges: r.challenges ?? [], tutorial: undefined, prelude: undefined, tip: r.tip ?? b.tip,
      hintMove: r.goal || r.protect || r.cat ? undefined : b.hintMove,
      build: extra ? (bd) => { b.build(bd); extra(bd); } : b.build,
      protect: r.protect, hush: r.hush, strict: r.strict,
      remix: { base: r.base, trick: r.trick, note: r.note, cat: r.cat, kind: r.kind },
    });
  }
  return out;
}


/**
 * Free play (자유 장난): a cleared stage with nothing to reach — twice the paws,
 * no goal, no stars, no rewards. The run ends whenever the cat feels like it,
 * and all that is left is the receipt.
 */
export function freePlay(l: LevelDef): LevelDef {
  return {
    ...l, id: l.id, free: true, paws: Math.max(5, l.paws * 2),
    goal: { kind: 'score', amount: 0, text: '목표 없음. 마음껏 어지르고, 질리면 시치미.', short: '자유 장난' },
    challenges: [], tutorial: undefined, prelude: undefined, hintMove: undefined, protect: undefined, hush: undefined, strict: undefined,
  };
}
