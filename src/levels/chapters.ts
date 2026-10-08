import type { Theme } from './rooms';

export interface ChapterDef {
  id: number;
  name: string;
  icon: string;
  /** short subtitle on the map */
  desc: string;
  color: string;
  theme: Theme;
  /** lines shown when entering the chapter for the first time */
  intro: string[];
  /** what this chapter teaches (shown on the map card) */
  learn: string;
  /** stars needed (in total) to open it */
  needStars: number;
  /** beyond the front door */
  outside?: boolean;
}

export const CHAPTERS: ChapterDef[] = [
  {
    id: 1, name: '거실', icon: '🛋️', desc: '햇살 가득한 평화로운 오후', color: '#ffb3a7', theme: 'living',
    intro: ['집사가 출근했다.', '거실엔 아무도 없다…', '앞발이 근질근질하다냥.'],
    learn: '툭 치기 · 방향과 세기 · 도미노', needStars: 0,
  },
  {
    id: 2, name: '주방', icon: '🍳', desc: '저녁 준비가 한창인 부엌', color: '#9fd8cb', theme: 'kitchen',
    intro: ['맛있는 냄새가 난다.', '식탁 위엔 반짝이는 그릇들…', '전부 바닥에 있어야 할 것 같은데?'],
    learn: '특수 물건 · 당기기 · 높은 선반', needStars: 5,
  },
  {
    id: 3, name: '침실', icon: '🌙', desc: '집사가 잠든 깊은 밤', color: '#9b8fdd', theme: 'bedroom',
    intro: ['새벽 5시. 밥그릇이 비었다.', '집사는 코를 골고 있다.', '깨울까… 몰래 할까…?'],
    learn: '소리와 소음 · 깨우기 · 몰래 하기', needStars: 12,
  },
  {
    id: 4, name: '욕실', icon: '🛁', desc: '물이 찰랑이는 미끄러운 방', color: '#8fc3e6', theme: 'bathroom',
    intro: ['욕조에 물이 받아져 있다.', '물… 싫지만…', '물건이 빠지는 건 좋다냥.'],
    learn: '풍덩! 물 · 미끄러짐 · 바람', needStars: 20,
  },
  {
    id: 5, name: '아이방', icon: '🧸', desc: '장난감 성이 우뚝 선 놀이방', color: '#ffb8d1', theme: 'playroom',
    intro: ['꼬마 집사의 놀이방.', '블록으로 쌓은 성이 무너지길 기다린다.', '오늘은 내가 괴수다냥!'],
    learn: '구조물 붕괴 · 장난감 장치', needStars: 28,
  },
  {
    id: 6, name: '온 집안', icon: '🏠', desc: '방과 복도가 이어진 우리 집 전체', color: '#f7a8a0', theme: 'house',
    intro: ['모든 문이 열려 있다.', '거실에서 시작된 장난이 복도를 지나…', '집 전체가 내 무대다냥!'],
    learn: '방을 넘나드는 연쇄 · 큰 그림', needStars: 36,
  },
  // ---- beyond the front door: opens when every room of the house is a mess
  {
    id: 7, name: '우리 동네', icon: '🏘️', desc: '집 앞 골목과 이웃집 마당', color: '#9fd8a8', theme: 'street', outside: true,
    intro: ['현관문이 빼꼼 열려 있다.', '바깥은… 넓다.', '앞발은 그대로. 대신 어디를 칠지 알게 됐다냥.'],
    learn: '작은 걸 빼면 큰 게 움직인다 · 시선 피하기', needStars: 0,
  },
  {
    id: 8, name: '상점가', icon: '🏪', desc: '공방과 새 사무실', color: '#ffc2b0', theme: 'shops', outside: true,
    intro: ['택배 상자 안에서 잠들었다.', '눈을 떠 보니… 상점가?', '반짝이는 진열장이 가득하다냥.'],
    learn: '흔들릴 때 한 번 더 · 전선과 물', needStars: 0,
  },
  {
    id: 9, name: '도시 블록', icon: '🏙️', desc: '주차장, 공사장, 고층 빌딩', color: '#a7b8e8', theme: 'city', outside: true,
    intro: ['마트 배송 트럭 짐칸에 숨었다.', '도시는 크다.', '크레인… 저건 언제 놓아야 할까?'],
    learn: '언제 놓을지 고르기 · 구조 읽기', needStars: 0,
  },
  {
    id: 10, name: '멀리 떠나자', icon: '🚂', desc: '기차, 그리고 항구', color: '#ff9f87', theme: 'travel', outside: true,
    intro: ['공사 자재와 함께 화물칸에 실렸다.', '덜컹덜컹… 기차는 달린다.', '급정거하면 전부 앞으로 쏟아지겠지?'],
    learn: '모두 함께 미끄러진다 · 도미노', needStars: 0,
  },
  {
    id: 11, name: '극비 기지', icon: '🚀', desc: '지구 최후의 날', color: '#7d70c9', theme: 'base', outside: true,
    intro: ['"극비 화물" 상자에 들어갔다.', '군 수송기에서 내려 보니… 기지.', '빨간 버튼이 보인다. 누르지 말라고 쓰여 있다.'],
    learn: '전부 엮기', needStars: 0,
  },
];

/** the last stage of the house (the old ending) */
export const HOME_LAST = '6-5';
export const HOME_CHAPTERS = 6;
