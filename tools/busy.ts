// Which props keep a level "busy" (prevent it from settling)?
import RAPIER from '@dimforge/rapier3d-compat';
import { Game } from '../src/game/Game';
import { LEVELS } from '../src/levels/levels';
await RAPIER.init();
const noop: any = new Proxy(() => noop, { get: () => noop, apply: () => ({ stop() {}, set() {} }) });
for (const l of LEVELS) {
  const g = new Game(RAPIER, noop, { headless: true });
  g.load(l); g.start(); g.simulate(4);
  const movers = g.props.filter((p) => {
    if (!p.alive) return false;
    if (p.special?.busy()) return true;
    if (!p.isDynamic() || p.body.isSleeping()) return false;
    const v = p.body.linvel(), w = p.body.angvel();
    return v.x * v.x + v.y * v.y + v.z * v.z > 0.12 || w.x * w.x + w.y * w.y + w.z * w.z > 0.5;
  }).map((p) => { const v = p.body.linvel(), w = p.body.angvel(); return `${p.name}(v=${Math.hypot(v.x, v.y, v.z).toFixed(2)} w=${Math.hypot(w.x, w.y, w.z).toFixed(2)})`; });
  const awake = g.props.filter((p) => p.isDynamic() && !p.body.isSleeping()).length;
  console.log(l.id, 'busy:', g.busy(), 'cat', g.cat.busy(), movers.join(' '), 'awake', awake);
  g.unload();
}
