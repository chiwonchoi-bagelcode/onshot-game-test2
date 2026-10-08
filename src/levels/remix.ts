import type { ChallengeDef, LevelDef } from '../game/types';

/* ------------------------------------------------------------------ */
/* The request board (의뢰판): rule-based variations of house stages,   */
/* opened once the front door is open. Same room, new rules — fewer     */
/* paws, or a trick that opens a route the room never had. Each one is  */
/* backed by a verified solution in tools/cases/remix.ts.               */
/* ------------------------------------------------------------------ */

interface RemixSpec {
  id: string; base: string; title: string; note: string; paws: number; stars: [number, number];
  trick?: 'hairball' | 'knead'; challenges?: ChallengeDef[]; tip?: string;
}

const SPECS: RemixSpec[] = [
  { id: 'R1', base: '1-1', title: '거실 원샷', note: '앞발 단 한 번. 꽃병이 어디로 떨어져야 할까?', paws: 1, stars: [150000, 170000], challenges: [{ type: 'chain', n: 4 }] },
  { id: 'R2', base: '1-5', title: '갈림길 한 방', note: '두 선반을 앞발 한 번에.', paws: 1, stars: [1650000, 1850000], challenges: [{ type: 'stat', key: 'toppleChain', min: 12, text: '한 번에 12개 넘어뜨리기' }] },
  { id: 'R3', base: '2-1', title: '식탁보 단판', note: '식탁보는 한 번만 당길 수 있다.', paws: 1, stars: [340000, 378000] },
  { id: 'R4', base: '4-3', title: '미끄럼틀 한 방', note: '앞발 한 번으로 둑을 무너뜨려라.', paws: 1, stars: [185000, 196000] },
  { id: 'R5', base: '5-2', title: '풍선 하나', note: '풍선 하나로 전부.', paws: 1, stars: [880000, 935000] },
  { id: 'R6', base: '6-2', title: '도미노 일주', note: '집 한 바퀴를 앞발 한 번에.', paws: 1, stars: [450000, 555000] },
  { id: 'R7', base: '2-1', title: '미끄덩 식탁', note: '헤어볼 장착: 식탁 위가 빙판이 된다면?', paws: 2, trick: 'hairball', stars: [400000, 520000], tip: '헤어볼은 앞발을 쓰지 않는 한 번의 덤이에요. 식탁 한가운데에 뱉으면…' },
  { id: 'R8', base: '1-2', title: '꾹꾹이 TV', note: '꾹꾹이 장착: 앞발 대신 무게로.', paws: 1, trick: 'knead', stars: [1000000, 1100000], tip: '꾹꾹이는 4초 동안 고양이 무게를 실어요. 무거운 게 기울어지는 곳은?' },
];

export function buildRemixes(find: (id: string) => LevelDef | undefined): LevelDef[] {
  const out: LevelDef[] = [];
  for (const r of SPECS) {
    const b = find(r.base);
    if (!b) continue;
    out.push({
      ...b,
      id: r.id, title: r.title, subtitle: `의뢰 · ${b.id} ${b.title}`, paws: r.paws, stars: r.stars,
      challenges: r.challenges ?? [], tutorial: undefined, prelude: undefined, tip: r.tip ?? b.tip,
      remix: { base: r.base, trick: r.trick, note: r.note },
    });
  }
  return out;
}
