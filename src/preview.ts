/* Dev-only level preview (preview.html?level=4-1): renders a stage without the game UI so
   level designers can screenshot it and replay swat plans. Not part of the production build. */
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Stage } from './render/Stage';
import { Game } from './game/Game';
import { LEVELS } from './levels/index';
import { THEME_STYLE } from './levels/rooms';
import type { Prop } from './game/Prop';

const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });

interface Act { pick: string; near?: [number, number, number]; dir: [number, number]; power: number; at?: 'top' | 'mid' | 'low' | number; wait?: number }

await RAPIER.init();
const stage = new Stage(document.getElementById('game') as HTMLCanvasElement);
const game = new Game(RAPIER, noop);
stage.scene.add(game.scene);
const id = new URLSearchParams(location.search).get('level') ?? LEVELS[0].id;
const level = LEVELS.find((l) => l.id === id) ?? LEVELS[0];
stage.setInsets(120, 70);
game.load(level);
const st = THEME_STYLE[level.theme];
document.getElementById('bg')!.style.background = `radial-gradient(120% 90% at 50% 30%, ${st.bg[0]}, ${st.bg[1]})`;
stage.setLighting(st.hemi[0], st.hemi[1], st.hemi[2], st.sun[0], st.sun[1], st.sun[2]);
const v = game.view;
stage.setLevel({ points: game.framePoints, bounds: game.roomBounds, yaw: v.yaw, pitch: v.pitch, fov: v.fov });
game.start();
const info = document.getElementById('info')!;

function find(a: Act): Prop | undefined {
  const c = game.props.filter((p) => p.alive && p.interactable && (p.kind === a.pick || p.name === a.pick));
  if (a.near) { const n = new THREE.Vector3(...a.near); c.sort((x, y) => x.center(new THREE.Vector3()).distanceTo(n) - y.center(new THREE.Vector3()).distanceTo(n)); }
  return c[0];
}

const pv = {
  game, stage, level,
  /** zoomed play view around a point (big houses) or the overview */
  look(x?: number, z?: number) { if (x === undefined) stage.showOverview(true); else stage.lookAtPoint(new THREE.Vector3(x, 0, z), true); },
  swat(a: Act) {
    const p = find(a);
    if (!p) return `no prop ${a.pick}`;
    const c = p.center(new THREE.Vector3());
    const t = p.body.translation();
    const frac = a.at === 'top' ? 0.85 : a.at === 'low' ? 0.15 : a.at === 'mid' || a.at === undefined ? 0.5 : a.at;
    game.paws = Math.max(game.paws, 1);
    return game.swat(p, new THREE.Vector3(a.dir[0], 0, a.dir[1]).normalize(), a.power, new THREE.Vector3(c.x, t.y + p.height * frac, c.z));
  },
};
(window as unknown as { pv: typeof pv }).pv = pv;

let last = performance.now();
const box = new THREE.Box3();
function frame(now: number) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  game.update(dt);
  if (game.shakeAmt > 0) { stage.shake(game.shakeAmt); game.shakeAmt = 0; }
  const n = game.actionBox(box);
  stage.track(box, n);
  stage.update(dt);
  stage.render();
  info.textContent = `${level.id} ${level.title}  score ${Math.round(game.score).toLocaleString()}  goal ${JSON.stringify(game.goalProgress())}  roomy ${stage.roomy}  calls ${stage.renderer.info.render.calls}`;
}
requestAnimationFrame(frame);
(window as unknown as { ready: boolean }).ready = true;
