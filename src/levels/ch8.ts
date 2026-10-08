import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C3 from '../game/catalog3';
import { CableSpecial } from '../game/specials3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import { M, box, cyl, mesh } from '../render/kit';
import { buildHouse, doorOn, posterOn, table, windowOn } from './house';
import { rect } from './rooms';

/* ================================================================== */
/* Chapter 8 — 상점가. Shops and offices: carriers, wheeled things,     */
/* people who keep half an eye on their treasures.                      */
/* ================================================================== */

/** the potter's wheel and stool (solid scenery) */
function pottersWheel(b: Builder, x: number, z: number) {
  const g = new THREE.Group();
  g.add(mesh(box(1.6, 0.9, 1.4, 0.08), M('#8e6a5a'), { pos: [0, 0.45, 0] }));
  g.add(mesh(cyl(0.6, 0.6, 0.12, 16), M('#c9c3b8'), { pos: [0, 1.0, 0] }));
  g.add(mesh(cyl(0.3, 0.38, 0.5, 10), M('#c4ab8c'), { pos: [0, 1.3, 0] }));
  g.add(mesh(cyl(0.45, 0.45, 0.9, 8), M('#b9825a'), { pos: [-1.3, 0.45, 0] }));
  b.solid(g, [{ shape: 'box', hx: 0.8, hy: 0.55, hz: 0.7, at: [0, 0.55, 0] }], [x, 0, z]);
}

/* ================================================================== */
/* 8-1  도자기 공방 — the vitrine                                        */
/* ================================================================== */

const MASTER = { shirt: '#e8e2d8', pants: '#5b5f73', hair: '#d9d4cc', apron: '#8e6a5a', glasses: true, tool: 'none' as const };

const S8_1: LevelDef = {
  id: '8-1', chapter: 8, theme: 'shops', title: '도자기 공방', subtitle: '유리장 안의 달항아리',
  paws: 3,
  goal: { kind: 'break', text: '장인의 달항아리를 깨라', short: '달항아리 깨기' },
  stars: [13000000, 17000000],
  challenges: [
    { type: 'cause', victim: 'moonJar', culprit: 'rack', text: '건조대로 유리장 들이받기' },
    { type: 'discover', id: 'perfect', text: '장인 몰래 (완전 범죄)' },
    { type: 'count', kind: 'maebyeong', n: 3, text: '진열대 매병 3개 깨기' },
  ],
  tip: '유리장은 무거워서 한 번에는 안 넘어가요. 흔들릴 때 한 번 더! 장인이 고개를 들 때는 조심.',
  hints: ['유리장 위쪽을 쳐서 흔들고, 기울어질 때 한 번 더 쳐요.', '바퀴 달린 건조대를 밀면 유리장까지 굴러가요.', '진열대 끝의 매병을 밀면 줄줄이 쓰러져요.'],
  hintMove: { prop: 'rack', dir: [1, -0.1] },
  start: [0, 0],
  ownerLine: '석 달 빚은 달항아리가…!!',
  reactor: '장인',
  prelude: (k) => {
    const a = k.actor('장인');
    k.cam('moonJar', 0.55);
    a.walkTo(2.2, 0.9).turnTo(3.2, -0.6).do('work', 1.8).do('admire', 1.6).walkTo(-5.2, 2.6).turnTo(-5.2, 0);
    k.at(0.8, () => k.glint('moonJar', '#ff9fc0'));
    k.at(3.2, () => { k.say('장인', '석 달 만에 완성이구나…', 2.2); k.glint('moonJar', '#ff9fc0'); });
    k.at(5.8, () => k.say('장인', '유리장 안이니 안전하겠지.', 1.8));
    return 8;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('shop', '공방', 0, 0, 16, 9, 'darkwood', 'hall')], base: '#7a6a8f' });
    windowOn(b, { z: -4.5 }, -4.5, 4.4, 2.4, 2.0, false, '#e8b07a');
    windowOn(b, { z: -4.5 }, 4.8, 4.4, 2.4, 2.0, false, '#e8b07a');
    posterOn(b, { x: -8 }, -2, 4.2, 1.4, 1.8, ['#fbf7ee', '#5b3b2b', '#8fc3b8']);
    doorOn(b, { x: -8 }, 2.4, '#8e6a5a');
    // the vitrine with the moon jar and friends
    const v = C3.vitrine(b, { at: [3.2, 0, -0.6], h: 5.2, w: 2.0, d: 1.2, rot: Math.PI / 2, mass: 13 });
    C3.moonJar(b, { at: [3.2, v.shelfY[1], -0.6], target: true, interactable: false, name: '장인의 달항아리', worth: { owner: '장인', heart: 90 * 24, story: '석 달을 빚고 구운 달항아리' } });
    C.vase(b, { at: [3.2, v.shelfY[0], -1.1], color: '#8fc3b8', name: '청자 꽃병', value: 2500000 }).interactable = false;
    C.vase(b, { at: [3.2, v.shelfY[0], -0.1], color: '#fbf7ee', name: '백자 병', value: 1800000, flowers: false }).interactable = false;
    C.mug(b, { at: [3.2, v.shelfY[2], -1.0], color: '#8fc3b8', name: '청자 찻잔', value: 400000 }).interactable = false;
    C.mug(b, { at: [3.2, v.shelfY[2], -0.2], color: '#8fc3b8', name: '청자 찻잔', value: 400000 }).interactable = false;
    // the display bench along the back wall: a row of vases
    const bench = table(b, -2.2, -3.6, 8.4, 1.1, 1.3, '#8e6a5a', '#5b3b2b');
    for (let i = 0; i < 11; i++) C3.maebyeong(b, { at: [-6.0 + i * 0.72, bench, -3.6], color: ['#8fc3b8', '#fbf7ee', '#c98a5a', '#8fb0d8'][i % 4], name: '진열 매병' });
    // the drying rack on casters, full of greenware
    const r = C3.dryingRack(b, { at: [-3.4, 0, 0.0] });
    for (let s = 0; s < 3; s++) for (const dx of [-0.45, 0.45]) C3.greenware(b, { at: [-3.4 + dx, r.shelfY[s], 0.0], color: s % 2 ? '#d9c4a8' : '#cdb59a' });
    // a heavy block of clay on the top shelf: when the rack stops, it keeps going
    C3.clayBlock(b, { at: [-3.4, r.shelfY[3], 0.0] });
    // clay slip bucket (spills a slippery puddle)
    C3.bucket(b, { at: [-1.4, 0, 1.6], color: '#c4ab8c', name: '흙물 양동이' });
    pottersWheel(b, -5.2, 3.2);
    C3.greenware(b, { at: [6.6, 0, 3.0], scale: 1.4, name: '큰 독' });
    b.actor('장인', MASTER, -5.2, 0, 2.6, Math.PI / 2, [2.6, 0.6]);
    b.watcher('장인', { range: 12, half: 0.5, cycle: [[3.6, -0.9], [2.6, 0.38], [2.4, 1.3]] });
    b.cat(6.4, 0, 2.6);
  },
};


/* ================================================================== */
/* 8-2  새 사무실 개업 — cables and a water cooler                       */
/* ================================================================== */

const CLERK = { shirt: '#ffffff', pants: '#2f3142', hair: '#3a2a22', glasses: true, tool: 'cup' as const };

/** a row of three desks with plugged-in monitors near the front edge, cables to one strip */
function monitorRow(b: Builder, z: number, names: string[], stripAt: [number, number]) {
  const mons: import('../game/Prop').Prop[] = [];
  const cables: import('../game/specials3').CableSpecial[] = [];
  const top = C3.officeDesk(b, { at: [-5.0, 0, z], w: 2.4, d: 1.4 }).top;
  C3.officeDesk(b, { at: [-2.5, 0, z], w: 2.4, d: 1.4 });
  C3.officeDesk(b, { at: [0.0, 0, z], w: 2.4, d: 1.4 });
  // the partition behind (keeps the monitors from going over the back)
  const g = new THREE.Group();
  g.add(mesh(box(7.6, 2.6, 0.12, 0.03), M('#c9d6ea'), { pos: [0, 1.3, 0] }));
  b.solid(g, [{ shape: 'box', hx: 3.8, hy: 1.3, hz: 0.06, at: [0, 1.3, 0] }], [-2.5, 0, z - 0.8]);
  for (const [i, x] of [-5.9, -2.5, 0.95].entries()) {
    const m = C3.monitor(b, { at: [x, top, z + 0.2], target: true, name: names[i] });
    mons.push(m.prop); cables.push(m.cable);
  }
  const strip = C3.powerStrip(b, { at: [stripAt[0], 0, stripAt[1]] });
  strip.strip.plugged = mons;
  const anchor = new THREE.Vector3(stripAt[0], 0, stripAt[1]);
  cables.forEach((c, i) => { c.links = mons.filter((_, j) => j !== i); c.anchor = anchor; c.pull = new THREE.Vector3(0, 0, 1); });
  // the cables, from each desk edge down to the strip
  const cg = new THREE.Group();
  for (const x of [-5.9, -2.5, 0.95]) {
    const a = new THREE.Vector3(x, 1.55, z + 0.7), e = new THREE.Vector3(stripAt[0], 0.12, stripAt[1]);
    const len = a.distanceTo(e);
    const c = mesh(cyl(0.03, 0.03, len, 4), M('#3a3d4f'), { shadow: false });
    c.position.copy(a).add(e).multiplyScalar(0.5);
    c.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), e.clone().sub(a).normalize());
    cg.add(c);
  }
  b.deco(cg);
  return mons;
}

const S8_2: LevelDef = {
  id: '8-2', chapter: 8, theme: 'shops', title: '새 사무실 개업', subtitle: '비닐도 안 뗀 새 모니터 여섯 대',
  paws: 3,
  goal: { kind: 'break', count: 6, text: '새 모니터 6대를 망가뜨려라', short: '모니터 6대' },
  stars: [6000000, 8600000],
  challenges: [
    { type: 'stat', key: 'short', min: 6, text: '정수기 물로 합선 (모니터 6대 이상)' },
    { type: 'paws', max: 1, text: '앞발 한 번으로 클리어' },
    { type: 'count', kind: 'printer', n: 1, text: '복합기까지 박살' },
  ],
  tip: '모니터는 책상 뒤 칸막이에 막혀 있어요. 전선은 바닥의 멀티탭으로 모여요. 물과 전기는…?',
  hints: ['줄 끝의 모니터를 옆으로 떨어뜨리면 전선이 나머지를 끌어당겨요.', '정수기 물통을 통로 쪽으로 떨어뜨리면 바닥이 물바다.', '물이 멀티탭에 닿으면 파지직! 꽂힌 모니터가 전부 고장.'],
  hintMove: { prop: 'waterBottle', dir: [-1, 0] },
  start: [-1, 0],
  ownerLine: '개업 첫날인데…!!',
  reactor: '직원',
  prelude: (k) => {
    const a = k.actor('직원');
    k.cam('monitor', 0.45);
    a.walkTo(-2.5, -1.8).turnTo(-2.5, -3).do('work', 1.6).do('admire', 1.4).walkTo(6.6, 3.9);
    k.at(0.5, () => k.glint('monitor', '#ffe680'));
    k.at(2.0, () => k.say('직원', '비닐 떼는 맛~ 새 모니터!', 1.8));
    k.at(4.6, () => k.say('직원', '회의 다녀올게요~', 1.4));
    return 6.6;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('office', '사무실', 0, 0, 16, 10, 'checker', 'butter')], base: '#6f7fa6' });
    windowOn(b, { z: -5 }, 4.5, 4.4, 3.2, 2.2, false, '#7fb8d8');
    posterOn(b, { x: -8 }, 1.5, 4.0, 1.6, 1.2, ['#ffffff', '#4f86c6', '#ffd23f']);
    doorOn(b, { x: -8 }, -2.6, '#7f9fd8');
    monitorRow(b, -3.4, ['새 모니터 A1', '새 모니터 A2', '새 모니터 A3'], [-3.6, -2.05]);
    monitorRow(b, 0.8, ['새 모니터 B1', '새 모니터 B2', '새 모니터 B3'], [-3.6, 0.35]);
    // the water cooler in the aisle between the rows
    C3.waterCooler(b, { at: [-2.2, 0, -0.85], rot: Math.PI / 2 });
    // wheeled chairs
    C.chair(b, { at: [-5.0, 0, -1.7], wheels: true, color: '#4f86c6' });
    C.chair(b, { at: [0.2, 0, 2.7], wheels: true, color: '#4f86c6' });
    C.chair(b, { at: [5.6, 0, 0.0], wheels: true, color: '#ff8f6b', rot: -Math.PI / 2 });
    // the boss's corner: a printer and a plant
    const bt = table(b, 5.8, -3.6, 3.0, 1.4, 1.5, '#5b3b2b', '#3a2a22');
    // the printer and the boss's monitor share a cable
    const cable = new CableSpecial();
    cable.pull = new THREE.Vector3(0, 0, 1);
    C3.printer(b, { at: [4.9, bt, -3.35], special: cable });
    const boss = C3.monitor(b, { at: [6.5, bt, -3.45], name: '사장님 대형 모니터', value: 2400000 });
    cable.links = [boss.prop];
    C.plant(b, { at: [7.6, bt, -3.8] });
    C.plant(b, { at: [7.2, 0, 4.2] });
    b.actor('직원', CLERK, -1.2, 0, -1.7, Math.PI, [-2.5, -0.6]);
    b.cat(6.2, 0, 3.0);
  },
};

export const CH8: LevelDef[] = [S8_1, S8_2];
