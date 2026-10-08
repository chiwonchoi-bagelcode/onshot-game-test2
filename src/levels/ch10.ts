import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import type { Builder } from './Builder';
import type { Game } from '../game/Game';
import { M, box, cyl, mesh, plane } from '../render/kit';
import { buildHouse, table } from './house';
import { rect, waterZone } from './rooms';
import { jolt } from '../game/specials3';
import { buildLot, building, slab, streetLamp } from './outdoor';
import * as C4 from '../game/catalog4';
import type { Prop } from '../game/Prop';
import { RailFollower, latch, unlatch, type Track } from '../game/specials4';

/* ================================================================== */
/* Chapter 10 — 멀리 떠나자. Everything moves together: a train that    */
/* can stop dead, a port where cranes drop boxes the size of houses.    */
/* ================================================================== */

/** windows of a moving train: one shared scrolling landscape; stops when the train does */
function trainWindows(b: Builder, x0: number, x1: number, z: number, y: number, state: { speed: number }) {
  if (typeof document === 'undefined') return;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d')!;
  const sky = c.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0, '#bfe6ff'); sky.addColorStop(1, '#ffe9d6');
  c.fillStyle = sky; c.fillRect(0, 0, 512, 128);
  c.fillStyle = '#9fd8a8';
  for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(i * 96 + 30, 118, 70, 46, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#7fc48a';
  for (let i = 0; i < 9; i++) { c.beginPath(); c.ellipse(i * 60 + 10, 128, 36, 30, 0, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = '#5b5f73';
  for (let i = 0; i < 8; i++) c.fillRect(i * 64 + 20, 70, 3, 60);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  const mat = new THREE.MeshBasicMaterial({ map: tex });
  const g = new THREE.Group();
  g.userData.keep = true;
  for (let x = x0; x <= x1; x += 4) {
    g.add(mesh(plane(2.6, 1.6), mat, { pos: [x, y, z + 0.06], shadow: false }));
    g.add(mesh(box(2.9, 0.15, 0.1, 0.02), M('#c9a27a'), { pos: [x, y - 0.88, z + 0.08] }));
    g.add(mesh(box(2.9, 0.15, 0.1, 0.02), M('#c9a27a'), { pos: [x, y + 0.88, z + 0.08] }));
  }
  b.deco(g);
  b.game.addUpdater((dt) => { tex.offset.x += state.speed * dt * 0.08; });
}

/* ================================================================== */
/* 10-1  기차 식당칸 — the emergency brake                              */
/* ================================================================== */

const STEWARD = { shirt: '#ffffff', pants: '#2f3142', hair: '#2a1c14', hat: 'cap' as const, hatColor: '#c2264b', tool: 'tray' as const };

const S10_1: LevelDef = {
  id: '10-1', chapter: 10, theme: 'travel', title: '기차 식당칸', subtitle: '칼각으로 세팅된 크리스털',
  paws: 3,
  goal: { kind: 'break', count: 8, text: '샴페인 타워를 무너뜨려라 (잔 8개)', short: '샴페인 타워' },
  stars: [5200000, 6600000],
  challenges: [
    { type: 'count', kind: 'ptable', n: 1, event: 'topple', text: '서빙 카트로 샴페인 테이블 넘어뜨리기' },
    { type: 'count', kind: 'glass', n: 20, text: '잔 20개 이상 깨기' },
    { type: 'discover', id: 'perfect', text: '승무원 몰래 (완전 범죄)' },
  ],
  tip: '비상 브레이크를 당기면 기차가 급정거해요. 바퀴 달린 것, 미끄러운 것은 앞으로 쏟아져요.',
  hints: ['브레이크만 당기면 잔이 조금 쏟아질 뿐이에요. 샴페인 타워는 쟁반 테두리가 지켜 줘요.', '서빙 카트 바퀴 브레이크를 툭 풀어 두고 비상 브레이크!', '승무원이 옆 칸으로 건너간 사이에 당기면 아무도 못 봐요.'],
  hintMove: { prop: 'cart', dir: [1, 0] },
  start: [-4, 0],
  ownerLine: '아, 손님… 아니 고양이님…?!',
  reactor: '승무원',
  prelude: (k) => {
    const a = k.actor('승무원');
    k.cam([9.6, 2, 0], 0.5);
    a.walkTo(8.0, 0.4).turnTo(9.6, 0).do('work', 1.8).do('admire', 1.2).walkTo(-6, 0.3);
    k.at(0.6, () => k.glint('glass', '#ffe680'));
    k.at(2.4, () => k.say('승무원', '샴페인 타워, 완벽해요.', 1.8));
    k.at(4.8, () => k.say('승무원', '칼각 세팅 끝!', 1.4));
    return 7;
  },
  build(b) {
    const state = { speed: 1 };
    buildHouse(b, { rooms: [rect('car', '식당칸', 0, 0, 24, 6.4, 'darkwood', 'study')], base: '#5b3b2b', h: 5.6 });
    trainWindows(b, -9.5, 10, -3.2, 3.2, state);
    b.game.view.playWidth = 15;
    // tables along both sides, each laid with crystal
    for (const x of [-7.5, -2.5, 2.5]) for (const z of [-2.1, 2.1]) {
      const top = table(b, x, z, 2.4, 1.6, 1.5, '#fbf7ee', '#8e6a5a');
      for (const dx of [-0.7, 0, 0.7]) C.wineGlass(b, { at: [x + dx, top, z + (z < 0 ? 0.35 : -0.35)], wine: dx === 0 ? null : '#c2264b', value: 90000, name: '크리스털 잔' });
      C.plate(b, { at: [x - 0.4, top, z + (z < 0 ? -0.25 : 0.25)] });
      C.bottle(b, { at: [x + 0.6, top, z + (z < 0 ? -0.3 : 0.3)] });
    }
    // the champagne tower at the front, on a pedestal table with a tray rim
    const tt = C3.pedestalTable(b, { at: [9.3, 0, 0], r: 1.15, h: 1.4, name: '샴페인 테이블' });
    const lv: [number, number][] = [[-0.45, -0.45], [0, -0.45], [0.45, -0.45], [-0.45, 0], [0, 0], [0.45, 0], [-0.45, 0.45], [0, 0.45], [0.45, 0.45]];
    for (const [x, z] of lv) C.wineGlass(b, { at: [9.3 + x, tt, z], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    for (const [x, z] of [[-0.22, -0.22], [0.22, -0.22], [-0.22, 0.22], [0.22, 0.22]]) C.wineGlass(b, { at: [9.3 + x, tt + 0.62, z], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    C.wineGlass(b, { at: [9.3, tt + 1.24, 0], wine: '#ffe9a8', target: true, value: 150000, name: '샴페인 잔' });
    // the serving cart parked in its alcove, the brake on the wall
    C3.gardenCart(b, { at: [-9.4, 0, 0], name: '서빙 카트', color: '#e8c46a', braked: true });
    for (const dz of [-0.35, 0.35]) C.bottle(b, { at: [-9.6, 0.85, dz] });
    C.wineGlass(b, { at: [-9.1, 0.85, 0], wine: null, name: '크리스털 잔', value: 90000 });
    C3.lever(b, { at: [-11.2, 0, 2.6], label: '비상 브레이크', word: '끼이이익!!', action: (game: Game, self) => { state.speed = 0; jolt(game, new THREE.Vector3(1, 0, 0), 3.5, self); game.discover('trigger', self.center(new THREE.Vector3())); } });
    const ch = new THREE.Group();
    ch.add(mesh(cyl(0.05, 0.05, 1.2, 4), M('#e8c46a'), { pos: [0, 0.6, 0] }));
    b.actor('승무원', STEWARD, 6.5, 0, 0.3, -Math.PI / 2, [8, 0]);
    b.watcher('승무원', { range: 9, half: 0.55, cycle: [[1, 0]], patrol: [[-4.5, 0.3, 2.0], [11.6, 0.0, 6.0, 1], [4.0, 0.3, 1.6]] });
    b.cat(-10.4, 0, 0.8);
  },
};


/* ================================================================== */
/* 10-3  항구 컨테이너 — boxes the size of houses, into the sea         */
/* ================================================================== */

const S10_3: LevelDef = {
  id: '10-3', chapter: 10, theme: 'travel', title: '항구 컨테이너', subtitle: '부두 끝에 쌓인 컨테이너',
  paws: 3,
  goal: { kind: 'dunk', count: 2, text: '세워 둔 수출 컨테이너 2개를 바다에 빠뜨려라', short: '컨테이너 풍덩 ×2' },
  stars: [40000000, 45000000],
  pawValue: 8000000,
  challenges: [
    { type: 'cause', victim: 'container', culprit: 'container', text: '매달린 컨테이너로 세운 컨테이너 밀어 넣기' },
    { type: 'paws', max: 2, text: '크레인 두 대로만 클리어' },
    { type: 'discover', id: 'furniture', text: '세운 컨테이너를 앞발로 넘어뜨리기' },
  ],
  tip: '세워 둔 컨테이너는 도미노. 바다 쪽으로 넘어가게 하면 끝의 것은 풍덩!',
  hints: ['크레인 짐은 바다 쪽으로 움직일 때 놓아야 그 방향으로 쓰러뜨려요.', '가운데 줄은 크레인이 없어요. 맨 앞 컨테이너 꼭대기를 흔들릴 때 한 번 더!', '크레인은 둘, 빠르기가 달라요.'],
  hintMove: { prop: 'lever', near: [-12.5, 0, 4.6], dir: [1, 0] },
  start: [0, 0],
  ownerLine: '수출 물량이…!!',
  reactor: '부두 반장',
  prelude: (k) => {
    k.cam([0, 3, -1], 0.35);
    k.at(0.5, () => k.glint('container', '#ffe680'));
    k.at(1.0, () => k.say('부두 반장', '오늘 선적, 한 개도 빠짐없이!', 2));
    k.at(3.4, () => k.cam([0, 8, -1.6], 0.4));
    return 5.6;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -16, maxX: 16, minZ: -9, maxZ: 6 },
      patches: [
        { x0: -16, x1: 16, z0: -9, z1: -2.2, kind: 'gravel', y: -3.2 },
        { x0: -16, x1: 16, z0: -2.2, z1: 6, kind: 'concrete' },
      ],
      base: '#4f6f8f',
      height: 15,
      labels: [{ name: '부두', x: -12, z: 5.2 }, { name: '바다', x: 12, z: -7 }],
    });
    b.game.view.playWidth = 20;
    waterZone(b, -16, 16, -9, -2.2, -3.2, -0.7, '#4fa3d8');
    slab(b, { x: 0, z: -2.35, w: 32, d: 0.3, h: 0.25, color: '#ffd23f' });
    // three rows of containers stood on end, pointing at the sea
    const cols = ['#ff8f6b', '#4f86c6', '#5bb98c', '#ffd23f', '#c9a0dc', '#ff6b6b', '#7fd3ff', '#ff9f43', '#9fd8cb'];
    let k = 0;
    for (const x of [-7, 0, 7]) {
      C3.container(b, { at: [x, 0, -1.05], standing: true, color: cols[k++], target: true, name: '수출 컨테이너', value: 100000000 });
      // the rest of the shipment, lying in a stack further back
      C3.container(b, { at: [x, 0, 3.6], rot: Math.PI / 2, color: cols[k++], name: '대기 컨테이너', value: 40000000 });
      C3.container(b, { at: [x, 2.31, 3.6], rot: Math.PI / 2, color: cols[k++], name: '대기 컨테이너', value: 40000000 });
    }
    C3.container(b, { at: [-12.8, 0, 0.6], rot: Math.PI / 2, color: '#9aa3b8', name: '빈 컨테이너', value: 8000000 });
    // two gantry cranes running toward the sea over the outer rows
    C3.towerCrane(b, { mast: [-10.5, 5.2], x0: 5.5, x1: -1.0, z: -7, axis: 'z', swing: true, h: 13, speed: 1.6, hang: 2.6, lever: [-12.5, 0, 4.6], load: 'container', loadName: '매달린 컨테이너' });
    C3.towerCrane(b, { mast: [10.5, 5.2], x0: 5.5, x1: -1.0, z: 7, axis: 'z', swing: true, h: 13, speed: 2.3, hang: 2.6, lever: [12.5, 0, 4.6], load: 'container', loadName: '매달린 컨테이너' });
    // the ship waiting offshore
    const ship = new THREE.Group();
    ship.add(mesh(box(26, 3.2, 2.6, 0.3), M('#c2264b'), { pos: [0, -1.4, 0] }));
    ship.add(mesh(box(26.2, 0.4, 2.8, 0.1), M('#ffffff'), { pos: [0, 0.3, 0] }));
    ship.add(mesh(box(4, 3.4, 2.4, 0.2), M('#ffffff'), { pos: [10, 2.2, 0] }));
    ship.position.set(0, 0, -9.6);
    b.deco(ship);
    for (const x of [-12, 12]) streetLamp(b, x, 5.4);
    building(b, { x: 0, z: 6.6, w: 32, d: 1, h: 4, color: '#9fb8d8', solid: false });
    b.actor('부두 반장', { shirt: '#ff8f6b', pants: '#2f3142', hat: 'hardhat', hatColor: '#ffffff', tool: 'clipboard' }, 8.5, 0, 5.0, Math.PI, [3, 1.2]);
    b.cat(-6, 0, 5.2);
  },
};

/* ================================================================== */
/* 10-2  선로 전환기 — which way the runaway wagon goes                 */
/* ================================================================== */

const R102 = { x0: -16, x1: -6, y0: 3, y1: 0 };
const SLOPE102 = Math.atan2(R102.y0 - R102.y1, R102.x1 - R102.x0);
/** the siding leaves the main line at this angle (toward +z) */
const SIDING = 0.39;
const STATION = { shirt: '#ffffff', pants: '#2f3142', hair: '#2a1c14', hat: 'cap' as const, hatColor: '#4f86c6', tool: 'clipboard' as const };

const S10_2: LevelDef = {
  id: '10-2', chapter: 10, theme: 'travel', title: '선로 전환기', subtitle: '고임목 하나에 걸린 화물 화차',
  paws: 3,
  goal: { kind: 'break', count: 5, text: '창고의 수출 도자기 5상자를 깨라', short: '도자기 상자 ×5' },
  stars: [18000000, 28500000],
  challenges: [
    { type: 'count', kind: 'fragile', n: 8, text: '도자기 8상자 전부' },
    { type: 'stat', key: 'switchLate', min: 1, text: '화차가 달리는 중에 선로 바꾸기' },
    { type: 'discover', id: 'perfect', text: '역무원 몰래 (완전 범죄)' },
  ],
  tip: '고임목을 빼면 화차가 내리막을 달려요. 그대로면 직진해서 차막이에 쿵. 선로 전환기는 어느 쪽으로 보낼지 정해요.',
  hints: ['선로 전환기를 툭 치면 노란 레일이 옆 선로 쪽으로 꺾여요.', '전환기 먼저, 고임목은 그다음!', '화차가 이미 달리고 있어도 전환 레일에 닿기 전이면 늦지 않았어요.'],
  hintMove: { prop: 'lever', dir: [1, 0] },
  start: [-4, 0],
  ownerLine: '수출 화물이…!! 누가 전환기를?!',
  reactor: '역무원',
  prelude: (k) => {
    k.cam('fragile', 0.6);
    k.at(0.5, () => k.glint('fragile', '#ffe680'));
    k.at(1.2, () => k.say('역무원', '도자기 수출품, 내일 아침 출발!', 2.0));
    k.at(3.8, () => { k.cam('chock', 0.7); k.say('역무원', '화차는 고임목으로 꽉 잡아 뒀지.', 2.0); });
    return 6.4;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -16, maxX: 16, minZ: -8, maxZ: 9 },
      patches: [
        { x0: -16, x1: -6, z0: -8, z1: -1.6, kind: 'grass', y: 3 },
        { x0: -16, x1: -6, z0: 1.6, z1: 9, kind: 'grass', y: 3 },
        { x0: -6, x1: 16, z0: -8, z1: 9, kind: 'gravel' },
      ],
      ramps: [{ x0: R102.x0, x1: R102.x1, z0: -1.6, z1: 1.6, kind: 'gravel', y0: R102.y0, y1: R102.y1, along: 'x' }],
      base: '#7f8f6f',
      height: 7,
      labels: [{ name: '본선', x: 6, z: -1.2 }, { name: '수출 창고', x: 12.5, z: 7.6 }],
    });
    b.game.view.playWidth = 20;
    const rampY = (x: number) => R102.y0 + ((x - R102.x0) / (R102.x1 - R102.x0)) * (R102.y1 - R102.y0);
    // main line: down the hill, along the flat, into the buffer stop
    C4.rails(b, -16, 0, -6, 0, 1.5);
    C4.rails(b, -6, 0, 13, 0);
    // low platform edges along the main line (scenery)
    const W = 1.75;
    slab(b, { x: 13.6, z: 0, w: 1.0, d: 3.2, h: 1.4, color: '#ff5a6e', top: '#ffd23f' });
    // the siding, off toward the export shed
    const sx = Math.cos(SIDING), sz = Math.sin(SIDING), nx = -sz, nz = sx;
    C4.rails(b, 0, 0, 13 * sx, 13 * sz);
    void W; void nx; void nz;
    // the switch: the yellow blade shows which way the points are set
    const sw = C4.switchBlade(b, { at: [-1.6, 0, -0.75], len: 3.4, a0: 0, a1: -SIDING });
    const main: Track = { x: 0, z: 0, dx: 1, dz: 0 };
    const siding: Track = { x: 0, z: 0, dx: sx, dz: sz };
    // past the points the wagon keeps to whichever track it took
    let took: Track | null = null;
    const follower = new RailFollower({
      pick: (x) => {
        if (x < -6) return null;
        if (x < 0.2) { took = null; return main; }
        if (!took) took = sw.set ? siding : main;
        return took;
      },
    });
    C3.lever(b, {
      at: [-5.0, 0, -3.0], label: '선로 전환기', word: '철컥!', rot: 0,
      action: (game, self) => {
        sw.throwSwitch(game);
        const t = wagon.prop.body.translation(), v = wagon.prop.body.linvel();
        if (wagon.prop.isDynamic() && v.x > 1) {
          game.count('switchLate');
          // thrown right under the wheels: off the rails it goes
          if (t.x > -3 && t.x < 2 && !follower.crashed) {
            follower.crash(game, wagon.prop);
            wagon.prop.body.applyTorqueImpulse({ x: 900, y: 600, z: 0 }, true);
            game.count('derail');
            blameSwitch(game, self);
          }
        }
        game.discover('trigger', self.center(new THREE.Vector3()));
      },
    });
    const blameSwitch = (game: Game, self: Prop) => { wagon.prop.cause = self; wagon.prop.causeCat = false; wagon.prop.activeSwat = game.swatIndex; };
    // the runaway: a freight wagon on the slope, held by its chock
    const yW = rampY(-12.5);
    const wagon = C3.car(b, { at: [-12.5, yW, 0], slope: SLOPE102, held: true, kind: 'wagon', icon: '🚃', name: '화물 화차', color: '#8e6a4a', value: 15000000 });
    wagon.car.driver = follower;
    const shell = new THREE.Group();
    shell.add(mesh(box(5.0, 1.9, 2.5, 0.06), M('#a8714a'), { pos: [0, 1.95, 0] }));
    shell.add(mesh(box(5.05, 0.12, 2.55, 0.02), M('#5b3b2b'), { pos: [0, 2.95, 0] }));
    for (const x of [-1.6, 0, 1.6]) shell.add(mesh(box(0.08, 1.8, 2.52, 0), M('#6e452b'), { pos: [x, 1.95, 0], shadow: false }));
    shell.userData.keep = true;
    wagon.prop.group.add(shell);
    const cx = -12.5 + 2.05 * Math.cos(SLOPE102);
    C3.chock(b, { at: [cx, rampY(cx) + 0.02, 0], slope: SLOPE102, car: wagon });
    // the export shed at the end of the siding
    const shedX = 13 * sx + 0.6, shedZ = 13 * sz;
    slab(b, { x: shedX + 2.2, z: shedZ, w: 0.4, d: 6, h: 4, color: '#c9b08a' });
    slab(b, { x: shedX, z: shedZ + 3.1, w: 4.8, d: 0.4, h: 4, color: '#c9b08a' });
    const crates: Prop[] = [];
    for (let i = 0; i < 8; i++) {
      const row = Math.floor(i / 4), k = i % 4;
      crates.push(C3.parcel(b, { at: [shedX - 0.6 + row * 1.1, k < 2 ? 0 : 0.72, shedZ - 1.2 + (k % 2) * 1.0], size: [0.9, 0.7, 0.9], fragile: true, target: true, name: '수출 도자기', value: 2400000, content: 'ceramic' }));
    }
    void crates;
    // celadon for export on a wheeled rack, parked beside the siding
    const rack = C3.dryingRack(b, { at: [5.0, 0, 4.7], h: 2.6, name: '청자 운반 선반' });
    rack.shelfY.slice(0, 2).forEach((y) => { for (const dx of [-0.35, 0.35]) C3.maebyeong(b, { at: [5.0 + dx, y, 4.7], name: '수출용 청자', value: 600000, scale: 0.55 }); });
    // the platform, the station worker
    slab(b, { x: 3, z: -4.0, w: 16, d: 3, h: 0.8, color: '#d9d1c4', top: '#ffffff' });
    C3.vendingMachine(b, { at: [7.5, 0.8, -4.8], value: 2500000 });
    for (let i = 0; i < 3; i++) C4.toolbox(b, { at: [-1 + i * 1.6, 0.8, -3.4], color: ['#4f86c6', '#ff9f43', '#5bb98c'][i] });
    streetLamp(b, -2, -5.2, 0.8);
    streetLamp(b, 9, -5.2, 0.8);
    b.actor('역무원', STATION, 3.5, 0.8, -3.6, 0, [3, -2.4]);
    b.watcher('역무원', { range: 10, half: 0.55, cycle: [[3.2, -0.9], [2.8, 0.2], [2.6, 1.0]] });
    b.cat(-6.5, 0, -3.0);
  },
};

/* ================================================================== */
/* 10-4  공항 수하물 — a cart that fills itself, a ramp, duty free      */
/* ================================================================== */

const GUARD104 = { shirt: '#2f3142', pants: '#2f3142', hair: '#2a1c14', hat: 'cap' as const, hatColor: '#2f3142', glasses: true };
const LANE104 = -1.6;

const S10_4: LevelDef = {
  id: '10-4', chapter: 10, theme: 'travel', title: '공항 수하물', subtitle: '컨베이어 끝 수하물 카트, 그 아래 면세점',
  paws: 3,
  goal: { kind: 'break', count: 6, text: '면세점 향수 6병을 깨라', short: '향수 ×6' },
  stars: [5000000, 7800000],
  challenges: [
    { type: 'count', kind: 'perfume', n: 10, text: '향수 10병 이상' },
    { type: 'stat', key: 'cartLoad', min: 5, text: '가방 5개를 다 싣고 출발시키기' },
    { type: 'discover', id: 'perfect', text: '보안 요원 몰래 (완전 범죄)' },
  ],
  tip: '수하물 카트는 브레이크가 걸려 있어요. 가방이 많이 실릴수록 무겁고, 무거울수록 세게 부딪혀요. 보안 요원은 정해진 길을 돌아요.',
  hints: ['카트를 툭 치면 브레이크가 풀리면서 경사로로 굴러가요.', '바로 보내면 빈 카트. 가방이 다 실릴 때까지 기다려 봐요.', '보안 요원이 면세점 쪽을 볼 때는 참아요.'],
  hintMove: { prop: 'cart', dir: [1, 0] },
  start: [-4, -1],
  ownerLine: '면세점이…!! 누구 가방이야?!',
  reactor: '보안 요원',
  prelude: (k) => {
    k.cam('perfume', 0.6);
    k.at(0.5, () => k.glint('perfume', '#ffb3c6'));
    k.at(1.0, () => k.say('보안 요원', '면세점 신상 향수 진열 완료~', 1.8));
    k.at(3.4, () => { k.cam('cart', 0.6); k.say('보안 요원', '수하물 카트는 브레이크 걸어 두고.', 1.8); });
    return 5.8;
  },
  build(b) {
    buildHouse(b, { rooms: [rect('airport', '공항', 0, 0, 21, 11, 'marttile', 'mart')], base: '#7f9fc4' });
    b.game.view.playWidth = 18;
    // the baggage hall upstairs, and the ramp down to duty free
    C4.platform(b, { x0: -10.5, x1: -3, z0: -5.5, z1: 1.2, y: 1.4, rail: ['z1'] });
    C4.rampX(b, { x0: -3, x1: 2.5, y0: 1.4, y1: 0, z0: LANE104 - 1.3, z1: LANE104 + 1.3 });
    const belt = C3.conveyor(b, { x0: -10.3, x1: -4.25, z: LANE104, y: 2.85, w: 1.2, speed: 0.9 });
    belt.on = true;
    const colors = ['#4f86c6', '#ff6b6b', '#ffd23f', '#5bb98c', '#c9a0dc'];
    const bags = colors.map((c, i) => C4.suitcase(b, { at: [-9.8 + i * 1.0, 2.86, LANE104], color: c }));
    const cart = C3.gardenCart(b, { at: [-3.35, 1.4, LANE104], name: '수하물 카트', color: '#9aa6bd', braked: true });
    // parked hard: the brake holds it on the edge of the ramp until a paw lets it off
    latch(cart);
    const brake = cart.special!;
    const onSwat = brake.onSwat!.bind(brake);
    brake.onSwat = (game, p, dir, power, point) => { unlatch(game, p, null); return onSwat(game, p, dir, power, point); };
    // the belt stops once it has nothing left on it; the cart remembers how full it was
    b.game.addUpdater(() => {
      const g = b.game;
      if (belt.on && !bags.some((p) => p.alive && p.body.translation().x < -3.9 && p.body.translation().y > 2.6)) belt.on = false;
      const c = cart.body.translation();
      const load = bags.filter((p) => { const t = p.body.translation(); return p.alive && Math.abs(t.x - c.x) < 1.1 && Math.abs(t.z - c.z) < 0.8 && t.y > c.y + 0.6; }).length;
      if (cart.body.linvel().x > 1.5) g.best('cartLoad', load);
    });
    // duty free at the bottom of the ramp
    const vit = C3.vitrine(b, { at: [6.0, 0, LANE104], w: 2.0, h: 3.6, d: 1.0, shelves: 3, color: '#ffffff', name: '면세 진열장', value: 1500000 });
    const pc = ['#ffb3c6', '#c9a0dc', '#7fd3ff', '#ffd23f'];
    vit.shelfY.forEach((y, i) => { for (let k = 0; k < 4; k++) C4.dutyFree(b, { at: [5.35 + k * 0.43, y, LANE104], color: pc[(i + k) % 4], target: true }); });
    const tb = C4.displayTable(b, { at: [8.6, 0, LANE104 + 0.4], w: 1.4, d: 2.4, h: 0.95, color: '#ffffff', name: '향수 매대' });
    for (let k = 0; k < 6; k++) C4.dutyFree(b, { at: [8.3 + (k % 2) * 0.5, tb.top, LANE104 - 0.4 + Math.floor(k / 2) * 0.55], color: pc[k % 4], target: true });
    for (let k = 0; k < 3; k++) C4.dutyFree(b, { at: [9.0, tb.top, LANE104 - 0.3 + k * 0.6], type: 'whisky' });
    // waiting area odds and ends
    for (let i = 0; i < 3; i++) C3.cone3(b, { at: [-0.5 + i * 1.2, 0, 2.8] });
    C3.vendingMachine(b, { at: [9.2, 0, 3.8], rot: Math.PI, color: '#7fd3ff' });
    b.actor('보안 요원', GUARD104, 3.5, 0, 2.6, -Math.PI / 2, [4, 0]);
    b.watcher('보안 요원', { range: 9, half: 0.5, cycle: [[2.5, 0.0], [2.5, 0.8]], patrol: [[3.5, 2.6, 3.5], [-1.5, 3.4, 3.5]] });
    b.cat(-6.5, 1.4, -3.8);
  },
};

export const CH10: LevelDef[] = [S10_1, S10_2, S10_3, S10_4];
