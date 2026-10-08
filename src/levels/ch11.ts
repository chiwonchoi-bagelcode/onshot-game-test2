import * as THREE from 'three';
import * as C from '../game/catalog';
import * as C3 from '../game/catalog3';
import type { LevelDef } from '../game/types';
import type { Game } from '../game/Game';
import type { Prop } from '../game/Prop';
import { SwingSpecial, blame } from '../game/specials3';
import { M, box, mesh } from '../render/kit';
import { buildLot, building, slab, streetLamp } from './outdoor';

/* ================================================================== */
/* Chapter 11 — 극비 기지. Everything the cat has learned, tied together.*/
/* 11-3 is the end of the world: a yarn ball from the living room, a    */
/* conveyor, a crane, the planetary defence bomb — and a red button.    */
/* ================================================================== */

const RAMP = { x0: -15, x1: -10, y0: 1.6, y1: 0 };

const GENERAL = { shirt: '#5b6b4a', pants: '#3f4a33', hair: '#d9d4cc', hat: 'cap' as const, hatColor: '#3f4a33', glasses: true, tool: 'clipboard' as const, scale: 1.1 };
const GUARD = { shirt: '#3f4a33', pants: '#2f3142', hat: 'helmet' as const, hatColor: '#5b6b4a', tool: 'none' as const };

const S11_3: LevelDef = {
  id: '11-3', chapter: 11, theme: 'base', title: '지구 최후의 날', subtitle: '절대 누르지 마시오',
  paws: 3,
  goal: { kind: 'break', count: 1, text: '빨간 버튼을 눌러라', short: '빨간 버튼' },
  stars: [500000000000000, 900000000000000],
  challenges: [
    { type: 'cause', victim: 'earth', culprit: 'yarn', text: '거실의 털실뭉치에서 지구까지' },
    { type: 'paws', max: 2, text: '앞발 두 번으로 끝내기' },
    { type: 'discover', id: 'knead', text: '꾹꾹이로 폭탄 받침대 누르기' },
  ],
  tip: '폭탄은 하늘을 겨누고 있어요. 받침대 짧은 쪽에 무거운 게 실리면… 버튼 커버는 비상시에만 열려요.',
  hints: ['경사로 위 털실뭉치를 굴려 컨베이어 시작 버튼을 눌러요.', '상자가 크레인 레버를 치면 평형추가 폭탄 받침대 위로 떨어져요.', '폭탄이 땅을 향하면 빨간 버튼의 커버가 열려요. 그다음은… 툭.'],
  hintMove: { prop: 'yarn', dir: [1, 0] },
  start: [-4, 0],
  ownerLine: '절대 누르지 말랬는데…!!',
  reactor: '장군',
  prelude: (k) => {
    const a = k.actor('장군');
    k.cam('rig', 0.4);
    a.walkTo(-2.6, 2.6).turnTo(-2.2, 4.0).do('point', 1.8).walkTo(-12, 4.6);
    k.at(0.4, () => k.glint('rig', '#ff5a6e'));
    k.at(1.4, () => k.say('장군', '소행성 요격 준비 완료.', 1.8));
    k.at(3.4, () => { k.say('장군', '이 버튼은… 절대 누르지 마!', 2); k.cam([-2.2, 1.2, 4.0], 0.6); });
    k.at(6.0, () => { k.cam('yarn', 0.6); k.say('장군', '(…털실뭉치? 누가 가져왔지?)', 1.8); });
    return 8.4;
  },
  build(b) {
    buildLot(b, {
      bounds: { minX: -16, maxX: 16, minZ: -7, maxZ: 6 },
      patches: [
        { x0: -16, x1: RAMP.x0, z0: -7, z1: 6, kind: 'metal', y: RAMP.y0 },
        { x0: RAMP.x0, x1: RAMP.x1, z0: -7, z1: -1.8, kind: 'metal', y: RAMP.y0 },
        { x0: RAMP.x0, x1: RAMP.x1, z0: 0.2, z1: 6, kind: 'metal', y: RAMP.y0 },
        { x0: RAMP.x1, x1: 16, z0: -7, z1: 6, kind: 'metal' },
      ],
      ramps: [{ x0: RAMP.x0, x1: RAMP.x1, z0: -1.8, z1: 0.2, kind: 'deck', y0: RAMP.y0, y1: RAMP.y1, along: 'x' }],
      base: '#2f3142',
      height: 12,
      labels: [{ name: '발사대', x: 9, z: 3.5 }, { name: '관제실', x: -2.2, z: 5.4 }],
    });
    b.game.view.playWidth = 20;
    // the yarn ball (the one from the living room) at the top of the ramp
    C.yarn(b, { at: [-15.45, RAMP.y0, -0.8], name: '털실뭉치 (거실에서 굴러옴)' });
    // the conveyor and its start button at the foot of the ramp
    const belt = C3.conveyor(b, { x0: -7.6, x1: 2.0, z: -0.8, y: 1.2, w: 1.4 });
    const start = C3.button(b, { at: [-8.7, 0, -0.8], label: '컨베이어 시작', word: '삑! 위잉—', bump: 0.5, color: '#5bb98c', action: (game: Game, self: Prop) => { belt.on = true; belt.by = self; game.sfx.rumble(0.4); } });
    void start;
    for (const x of [-6.8, -4.6, -2.4]) C3.ammoCrate(b, { at: [x, 1.2, -0.8] });
    // the maintenance crane: the weight hangs right over the rig's short arm; its lever waits at the belt's end
    C3.towerCrane(b, { mast: [5.2, -4.6], x0: 6.9, x1: 6.92, z: -0.8, h: 10, speed: 0.001, hang: 2.4, lever: [2.95, 0, -0.8], load: 'weight', loadName: '평형추', leverBump: 0.5 });
    // the bomb on its rig, pointing at the sky
    const { prop: rigP, rig } = C3.bombRig(b, { at: [8.0, 3.0, -0.8] });
    // the red button under its cover, in the control room
    slab(b, { x: -2.2, z: 4.6, w: 3.2, d: 1.2, h: 1.0, color: '#5b5f73', top: '#3a3d4f' });
    const cover = C3.gateLeaf(b, { at: [-2.75, 1.0, 4.0], rot: 0, w: 1.1, h: 0.7, to: -1.3, name: '버튼 커버', color: '#bfe8ff', latch: false });
    const cs = cover.special as SwingSpecial;
    const red = C3.button(b, { at: [-2.2, 1.0, 4.35], label: '빨간 버튼', word: '꾸욱…', color: '#ff2a3c', canFire: () => cs.open, action: (game: Game, self: Prop) => { blame(game, rigP, self); rig.fire(game); } });
    void red;
    rig.onDown = (game: Game) => { cs.openNow(game, cover, rigP); game.emit({ type: 'toast', text: '⚠ 비상! 발사 버튼 커버 개방' }); };
    // what the receipt will say
    const earth = C3.phantom(b, { kind: 'earth', name: '지구', icon: '🌍', value: 1e15, at: [0, -3, 0] });
    const asteroid = C3.phantom(b, { kind: 'asteroid', name: '소행성', icon: '☄️', value: 30000000, at: [2, -3, 0] });
    rig.onFire = (game: Game, dir) => {
      game.sfx.roar(1);
      game.shake(1);
      let t = 0;
      game.addUpdater((dt) => {
        if (t < 0) return;
        t += dt;
        if (t > (dir === 'down' ? 1.6 : 1.2)) {
          t = -1;
          if (dir === 'down') {
            game.finale = true;
            // the story runs back through whatever tipped the bomb (all the way to the yarn)
            rigP.cause = rig.tiltBy; rigP.causeCat = !rig.tiltBy; rigP.activeSwat = game.swatIndex;
            earth.cause = rigP; earth.causeCat = false; earth.activeSwat = game.swatIndex;
            game.sfx.boom();
            game.breakProp(earth, 1e9);
          } else {
            blame(game, asteroid, rigP);
            game.emit({ type: 'toast', text: '☄️ 소행성 요격 성공…? 인류를 구한 고양이!' });
            game.breakProp(asteroid, 1e9);
          }
        }
      });
    };
    // scenery: bunkers, the NASA escape ship beyond the fence, lights
    building(b, { x: 0, z: -7.6, w: 32, d: 1, h: 3, color: '#4c5066', solid: false });
    const ship = new THREE.Group();
    ship.add(mesh(box(1.6, 7, 1.6, 0.3), M('#e8e8f0'), { pos: [0, 3.5, 0] }));
    ship.add(mesh(box(2.4, 1.2, 0.3, 0.1), M('#ff5a6e'), { pos: [0, 0.6, 0] }));
    ship.position.set(14, 0, -5.2);
    b.deco(ship);
    for (const x of [-12, 12]) streetLamp(b, x, 5.4, x < 0 ? RAMP.y0 : 0);
    C3.cone3(b, { at: [4.5, 0, 3.6] });
    C3.cone3(b, { at: [11.5, 0, 3.6] });
    b.actor('장군', GENERAL, -4.5, 0, 2.6, Math.PI / 2, [-2.2, 3.2]);
    b.actor('경비병', GUARD, 3.5, 0, 3.2, -Math.PI / 2, [4, 1]);
    b.watcher('경비병', { range: 8, half: 0.5, cycle: [[1, 0]], patrol: [[3.5, 3.2, 3], [12.5, 3.2, 3], [12.5, -4.5, 2.5, 1]] });
    b.cat(-12.8, RAMP.y0, 3.4);
  },
};

export const CH11: LevelDef[] = [S11_3];
