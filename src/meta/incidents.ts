import type { RunRecord } from '../game/Game';

/* ------------------------------------------------------------------ */
/* Hidden incidents (숨은 사고): three secret cause-chains per place     */
/* outside. Nothing on the stage card mentions them; when one happens,   */
/* it is filed in the 사건 파일 (case files) with its story. The card    */
/* only ever hints at the place and a vague clue.                        */
/* ------------------------------------------------------------------ */

export interface Incident {
  id: string;
  /** the place (chapter) it belongs to */
  chapter: number;
  /** the stage where it can happen */
  level: string;
  icon: string;
  name: string;
  /** what happened (shown once solved) */
  story: string;
  /** shown while unsolved */
  clue: string;
  test(run: RunRecord): boolean;
}

const c = (run: RunRecord, k: string) => run.counters[k] ?? 0;
/** how many `victim`s went with `culprit` somewhere in their chain */
const by = (run: RunRecord, victim: string, culprit: string) => run.culprits.filter((x) => x.kind === victim && x.by.includes(culprit)).length;

export const INCIDENTS: Incident[] = [
  // 7 우리 동네
  { id: 'gnomeBowling', chapter: 7, level: '7-1', icon: '🎳', name: '정원 볼링', story: '굴러간 새 차가 이웃집 난쟁이 둘을 스트라이크로 쓰러뜨렸다.', clue: '이웃집 마당의 작은 사람들…', test: (r) => by(r, 'gnome', 'auto') >= 2 },
  { id: 'melonStrike', chapter: 7, level: '7-3', icon: '🍉', name: '수박 퍼펙트 게임', story: '수박 한 통이 "깨지기 쉬움" 상자 여섯 개를 해치웠다.', clue: '택배 기사님의 수박이 굴러간다면…', test: (r) => by(r, 'fragile', 'watermelon') >= 1 && c(r, 'break:fragile') >= 6 },
  { id: 'vendingWindow', chapter: 7, level: '7-5', icon: '🥤', name: '자판기 창문 돌파', story: '차가 자판기를 밀고, 자판기가 가게 창문을 뚫었다.', clue: '언덕 아래, 음료수가 든 커다란 상자.', test: (r) => r.culprits.some((x) => x.kind === 'window' && x.by.includes('vending') && x.by.includes('auto')) },
  // 8 상점가
  { id: 'rackJar', chapter: 8, level: '8-1', icon: '🏺', name: '선반 수레의 습격', story: '굴러온 건조대가 유리장을 흔들었고, 달항아리는 버티지 못했다.', clue: '공방 구석의 바퀴 달린 선반.', test: (r) => by(r, 'moonJar', 'rack') >= 1 },
  { id: 'printerDrag', chapter: 8, level: '8-2', icon: '🖨️', name: '끌려간 모니터', story: '넘어지는 프린터가 전선으로 사장님 모니터를 끌고 갔다.', clue: '사무실에서 제일 무거운 기계.', test: (r) => by(r, 'monitor', 'printer') >= 1 },
  { id: 'wineDomino', chapter: 8, level: '8-3', icon: '🍷', name: '와인 도미노', story: '와인 한 병이 쓰러지며 옆 병들을 차례로 데려갔다.', clue: '통조림 탑 너머의 매대.', test: (r) => by(r, 'bottle', 'bottle') >= 1 && c(r, 'break:bottle') >= 3 },
  // 9 도시 블록
  { id: 'tripleWreck', chapter: 9, level: '9-1', icon: '🚗', name: '주차장 3중 추돌', story: '굴러간 차가 두 대를 더 끌고 들어가 셋 다 폐차.', clue: '차단기가 올라가는 순간.', test: (r) => c(r, 'wreck') >= 3 },
  { id: 'paradeCrash', chapter: 9, level: '9-2', icon: '💐', name: '퍼레이드 추돌', story: '사고 현장에 다음 꽃차가 그대로 들이받았다.', clue: '퍼레이드는 멈추지 않는다.', test: (r) => by(r, 'float', 'float') >= 1 },
  { id: 'skyVending', chapter: 9, level: '9-4', icon: '🏗️', name: '하늘에서 떨어진 자판기', story: '크레인이 떨어뜨린 철골이 길가 자판기를 납작하게 만들었다.', clue: '크레인 아래 음료수.', test: (r) => by(r, 'vending', 'beams') >= 1 },
  // 10 멀리 떠나자
  { id: 'champagneRain', chapter: 10, level: '10-1', icon: '🥂', name: '샴페인 비', story: '급정거 한 번에 크리스털 잔 스물다섯 개가 날아갔다.', clue: '식당칸의 잔을 전부.', test: (r) => c(r, 'break:glass') >= 25 },
  { id: 'derail', chapter: 10, level: '10-2', icon: '🚃', name: '탈선', story: '화차가 지나가는 바로 그 순간 선로를 바꿨다. 화차는 선로를 떠났다.', clue: '선로 전환기는 언제 당기느냐가 전부.', test: (r) => c(r, 'derail') >= 1 },
  { id: 'luggageSlide', chapter: 10, level: '10-4', icon: '🧳', name: '가방 눈사태', story: '가득 실린 카트에서 가방 다섯 개가 전부 굴러 떨어졌다.', clue: '카트를 끝까지 채운다면…', test: (r) => c(r, 'fall:suitcase') >= 5 },
  // 11 극비 기지
  { id: 'allSecrets', chapter: 11, level: '11-1', icon: '📂', name: '기밀 전부 유출', story: '수레의 서류도, 책상 위 서류도 전부 바닥에.', clue: '책상 위에도 서류가 있다.', test: (r) => c(r, 'break:folder') >= 6 },
  { id: 'engineScrap', chapter: 11, level: '11-2', icon: '🚀', name: '엔진 고철', story: '로켓 엔진이 수레에서 굴러떨어져 찌그러졌다.', clue: '수레 위의 엔진도 소중하다.', test: (r) => c(r, 'break:engine') >= 1 },
  { id: 'savedHumanity', chapter: 11, level: '11-3', icon: '☄️', name: '인류를 구한 고양이', story: '폭탄은 하늘로 날아가 소행성을 막았다. 고양이는 아무것도 모른다.', clue: '폭탄이 위를 향한 채로 버튼을 누른다면?', test: (r) => c(r, 'break:asteroid') >= 1 },
];

export const incidentById = (id: string) => INCIDENTS.find((x) => x.id === id);
