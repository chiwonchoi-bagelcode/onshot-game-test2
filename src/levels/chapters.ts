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
];
