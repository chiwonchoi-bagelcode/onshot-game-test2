import { LEVELS, REMIXES } from '../levels/index';
import { HOME_CHAPTERS } from '../levels/chapters';
import { CATS, ACCESSORIES } from './cats';
import { DISCOVERIES } from './dex';
import { stat, type Profile } from './profile';

/* ------------------------------------------------------------------ */
/* Achievements reward creativity, special chains, discovery and        */
/* mastery – not grinding. Each is "progress ≥ goal" over the profile.  */
/* ------------------------------------------------------------------ */

export interface AchDef {
  id: string;
  icon: string;
  name: string;
  desc: string;
  reward: number;
  goal: number;
  progress(p: Profile): number;
  /** hidden until done (surprise) */
  secret?: boolean;
}

const disc = (id: string) => (p: Profile) => (p.disc.includes(id) ? 1 : 0);
const stars3 = (p: Profile) => Object.values(p.levels).filter((r) => r.stars >= 3).length;
const chals = (p: Profile) => Object.values(p.levels).reduce((a, r) => a + r.ch.filter(Boolean).length, 0);
const totalStars = (p: Profile) => Object.values(p.levels).reduce((a, r) => a + r.stars, 0);
const allChals = () => LEVELS.reduce((a, l) => a + l.challenges.length, 0);

export const ACHIEVEMENTS: AchDef[] = [
  { id: 'first', icon: '🐾', name: '첫 범행', desc: '아무 스테이지나 클리어하기', reward: 20, goal: 1, progress: (p) => stat(p, 'clears') },
  { id: 'chain10', icon: '⛓️', name: '연쇄 반응', desc: '앞발 한 번으로 연쇄 x10 만들기', reward: 30, goal: 10, progress: (p) => stat(p, 'chainMax') },
  { id: 'chain20', icon: '🔥', name: '대참사 연쇄', desc: '앞발 한 번으로 연쇄 x20 만들기', reward: 60, goal: 20, progress: (p) => stat(p, 'chainMax') },
  { id: 'domino', icon: '🁢', name: '도미노 신사', desc: '앞발 한 번에 물건 12개 넘어뜨리기', reward: 40, goal: 12, progress: (p) => stat(p, 'toppleChainMax') },
  { id: 'oneShot', icon: '🎯', name: '원샷 원킬', desc: '앞발이 3개 이상인 스테이지를 단 1번으로 클리어', reward: 50, goal: 1, progress: (p) => stat(p, 'oneShot') },
  { id: 'indirect5', icon: '🎱', name: '손 안 대고 코 풀기', desc: '목표물을 직접 건드리지 않고 5번 클리어', reward: 40, goal: 5, progress: (p) => stat(p, 'indirect') },
  { id: 'perfect5', icon: '⭐', name: '완전 범죄 x5', desc: '★★★ 스테이지 5개', reward: 40, goal: 5, progress: stars3 },
  { id: 'perfect15', icon: '👑', name: '완전 범죄의 왕', desc: '★★★ 스테이지 15개', reward: 80, goal: 15, progress: stars3 },
  { id: 'allStars', icon: '🌟', name: '별 수집가', desc: '모든 별 모으기', reward: 120, goal: LEVELS.length * 3, progress: totalStars },
  { id: 'chal30', icon: '🏅', name: '도전 정신', desc: '도전 과제 30개 달성', reward: 60, goal: 30, progress: chals },
  { id: 'chalAll', icon: '🏆', name: '장난의 신', desc: '모든 도전 과제 달성', reward: 150, goal: Math.max(1, allChals()), progress: chals },
  { id: 'million', icon: '💸', name: '백만장자 파괴범', desc: '한 판에 손해액 ₩3,000,000', reward: 50, goal: 3000000, progress: (p) => stat(p, 'bestRun') },
  { id: 'total', icon: '🏦', name: '집사 파산', desc: '누적 손해액 ₩50,000,000', reward: 80, goal: 50000000, progress: (p) => stat(p, 'damage') },
  { id: 'splash10', icon: '💦', name: '풍덩 장인', desc: '물건 10개를 물에 빠뜨리기', reward: 30, goal: 10, progress: (p) => stat(p, 'dunks') },
  { id: 'tp', icon: '🧻', name: '휴지 예술가', desc: '두루마리 휴지를 한 번에 12m 넘게 풀기', reward: 30, goal: 12, progress: (p) => Math.floor(stat(p, 'tpMax')) },
  { id: 'balloon10', icon: '🎈', name: '풍선 사냥꾼', desc: '풍선 10개 터뜨리기', reward: 30, goal: 10, progress: (p) => stat(p, 'balloons') },
  { id: 'wake3', icon: '⏰', name: '알람 고양이', desc: '잠든 집사를 3번 깨우기', reward: 25, goal: 3, progress: (p) => stat(p, 'wakes') },
  { id: 'ninja', icon: '🥷', name: '닌자 고양이', desc: '집사를 깨우지 않고 몰래 하기 스테이지 클리어', reward: 40, goal: 1, progress: (p) => stat(p, 'sneak') },
  { id: 'furniture', icon: '🚜', name: '불도저', desc: '무거운 가구 넘어뜨리기', reward: 25, goal: 1, progress: disc('furniture') },
  { id: 'castle', icon: '🏰', name: '성 함락', desc: '블록 성을 한 번에 무너뜨리기', reward: 30, goal: 1, progress: disc('castle') },
  { id: 'flood', icon: '🌊', name: '물난리', desc: '집 안을 물바다로 만들기', reward: 30, goal: 1, progress: disc('flood'), secret: true },
  { id: 'magic', icon: '🎩', name: '마술사 냥', desc: '식탁보 마술 성공시키기', reward: 20, goal: 1, progress: disc('magic'), secret: true },
  { id: 'bonk', icon: '💫', name: '머리 조심', desc: '자는 집사 머리 위로 물건 떨어뜨리기', reward: 20, goal: 1, progress: disc('bonk'), secret: true },
  { id: 'disc10', icon: '🔍', name: '호기심 대장', desc: '새로운 발견 10개', reward: 40, goal: 10, progress: (p) => p.disc.length },
  { id: 'dexAll', icon: '🧙', name: '박물학자', desc: '모든 발견 완성', reward: 120, goal: DISCOVERIES.length, progress: (p) => p.disc.length },
  { id: 'cats5', icon: '😻', name: '고양이 부자', desc: '고양이 5마리 모으기', reward: 50, goal: 5, progress: (p) => p.cats.length },
  { id: 'catsAll', icon: '🐈', name: '고양이 마을', desc: '모든 고양이 모으기', reward: 100, goal: CATS.length, progress: (p) => p.cats.length },
  { id: 'dress', icon: '🎀', name: '패셔니스타', desc: '꾸미기 아이템 5개 모으기', reward: 30, goal: 5, progress: (p) => p.accs.length },
  { id: 'finale', icon: '🏠', name: '와장창 대참사', desc: '우리 집 최종장 클리어', reward: 100, goal: 1, progress: (p) => (p.finale ? 1 : 0) },
  // the world outside
  { id: 'outside', icon: '🚪', name: '현관문 너머', desc: '우리 집을 모두 클리어하고 바깥으로 나가기', reward: 60, goal: 1, progress: (p) => (p.outside || LEVELS.filter((l) => l.chapter <= HOME_CHAPTERS).every((l) => p.levels[l.id]?.cleared) ? 1 : 0) },
  { id: 'perfect3', icon: '🕶️', name: '시치미 9단', desc: '보는 눈이 있는 곳에서 완전 범죄 3번', reward: 50, goal: 3, progress: (p) => stat(p, 'perfect') },
  { id: 'caught', icon: '🚨', name: '현행범', desc: '장난치다 딱 걸리기', reward: 15, goal: 1, progress: (p) => stat(p, 'caught'), secret: true },
  { id: 'heart', icon: '💔', name: '정성 파괴자', desc: '누군가의 정성 1,000시간어치 망가뜨리기', reward: 50, goal: 1000, progress: (p) => Math.floor(stat(p, 'heart')) },
  { id: 'wreck', icon: '🚗', name: '폐차장 직행', desc: '자동차를 완전히 찌그러뜨리기', reward: 30, goal: 1, progress: disc('carWreck') },
  { id: 'tricks', icon: '🌀', name: '기술냥', desc: '장난 기술 10번 쓰기', reward: 40, goal: 10, progress: (p) => stat(p, 'tricks') },
  { id: 'board', icon: '📋', name: '의뢰 해결사', desc: '의뢰판의 의뢰 모두 해결하기', reward: 80, goal: Math.max(1, REMIXES.length), progress: (p) => REMIXES.filter((l) => p.levels[l.id]?.cleared).length },
  { id: 'detective', icon: '🕵️', name: '탐정 고양이', desc: '숨은 사고 5개 해결', reward: 50, goal: 5, progress: (p) => p.cases.length },
  { id: 'caseAll', icon: '🗂️', name: '사건 파일 완성', desc: '숨은 사고 15개 전부 해결', reward: 150, goal: 15, progress: (p) => p.cases.length },
  { id: 'earth', icon: '🪐', name: '난 아무것도 몰라요', desc: '절대 누르지 말라던 버튼을 누르기', reward: 200, goal: 1, progress: (p) => (p.worldEnd ? 1 : 0), secret: true },
];

export const achById = (id: string) => ACHIEVEMENTS.find((a) => a.id === id);
export const ACC_COUNT = ACCESSORIES.length;
