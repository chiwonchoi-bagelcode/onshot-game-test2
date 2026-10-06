import * as THREE from 'three';
import { clamp } from '../core/util';
import type { Stage } from '../render/Stage';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Sfx } from '../audio/Sfx';

/**
 * One-finger control: press on a prop, drag toward where it should go
 * (length = power), release to swat.
 */
export class Input {
  private ray = new THREE.Raycaster();
  private active: { prop: Prop; x0: number; y0: number; hit: THREE.Vector3; planeY: number; dir: THREE.Vector3; power: number; id: number } | null = null;
  enabled = true;
  onAim: (label: string | null, power: number, x: number, y: number, special: boolean) => void = () => {};
  onHint: (text: string) => void = () => {};

  constructor(private stage: Stage, private game: Game, private sfx: Sfx) {
    const el = stage.canvas;
    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', () => this.cancel());
    el.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private ndc(x: number, y: number) {
    return new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  }

  private pick(x: number, y: number): { prop: Prop; hit: THREE.Vector3 } | null {
    const g = this.game;
    this.ray.setFromCamera(this.ndc(x, y), this.stage.camera);
    const hits = this.ray.intersectObjects(g.propGroup.children, true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.prop) o = o.parent;
      const p = o?.userData.prop as Prop | undefined;
      if (p && p.alive && p.interactable) return { prop: p, hit: h.point.clone() };
      if (p && p.alive && !p.interactable) continue;
      break;
    }
    // forgiving screen-space fallback for small props
    let best: Prop | null = null, bestScore = 34;
    const c = new THREE.Vector3(), e = new THREE.Vector3();
    const right = new THREE.Vector3().setFromMatrixColumn(this.stage.camera.matrixWorld, 0);
    for (const p of g.props) {
      if (!p.alive || !p.interactable) continue;
      p.center(c);
      const s = this.stage.toScreen(c);
      const s2 = this.stage.toScreen(e.copy(c).addScaledVector(right, p.radius));
      const r = Math.abs(s2.x - s.x);
      const d = Math.hypot(s.x - x, s.y - y) - r;
      if (d < bestScore) { bestScore = d; best = p; }
    }
    if (!best) return null;
    return { prop: best, hit: best.center(new THREE.Vector3()) };
  }

  private planePoint(x: number, y: number, planeY: number): THREE.Vector3 | null {
    this.ray.setFromCamera(this.ndc(x, y), this.stage.camera);
    const pl = new THREE.Plane(new THREE.Vector3(0, 1, 0), -planeY);
    const out = new THREE.Vector3();
    return this.ray.ray.intersectPlane(pl, out);
  }

  private down(e: PointerEvent) {
    this.sfx.unlock();
    if (!this.enabled || this.active) return;
    const g = this.game;
    if (g.phase !== 'ready') return;
    if (g.paws <= 0) return;
    const r = this.pick(e.clientX, e.clientY);
    if (!r) {
      g.aim.showHints(g.props.filter((p) => p.alive && p.interactable && g.reachable(p)));
      this.onHint('빛나는 물건을 눌러서 끌어보세요');
      return;
    }
    if (!g.reachable(r.prop)) {
      g.emit({ type: 'toast', text: '너무 높아서 앞발이 닿지 않아요! 다른 방법을 찾아봐요' });
      this.sfx.denied();
      return;
    }
    const t = r.prop.body.translation();
    this.active = { prop: r.prop, x0: e.clientX, y0: e.clientY, hit: r.hit, planeY: r.hit.y, dir: new THREE.Vector3(1, 0, 0), power: 0, id: e.pointerId };
    void t;
    g.aim.select(r.prop);
    this.sfx.select();
    this.onAim(r.prop.special?.label ?? r.prop.name, 0, e.clientX, e.clientY, !!r.prop.special?.label);
  }

  private move(e: PointerEvent) {
    const a = this.active;
    if (!a || e.pointerId !== a.id) return;
    const dx = e.clientX - a.x0, dy = e.clientY - a.y0;
    const len = Math.hypot(dx, dy);
    const full = Math.min(window.innerWidth, window.innerHeight) * 0.36;
    a.power = len < 16 ? 0 : clamp((len - 16) / full, 0.12, 1);
    const p0 = this.planePoint(a.x0, a.y0, a.planeY);
    const p1 = this.planePoint(e.clientX, e.clientY, a.planeY);
    if (p0 && p1) {
      const d = p1.sub(p0).setY(0);
      if (d.lengthSq() > 1e-6) a.dir.copy(d.normalize());
    }
    const t = a.prop.body.translation();
    if (a.power > 0) this.game.aim.show(new THREE.Vector3(t.x, t.y, t.z), a.dir, a.power, a.prop.radius);
    else this.game.aim.hideArrow();
    this.onAim(a.prop.special?.label ?? a.prop.name, a.power, e.clientX, e.clientY, !!a.prop.special?.label);
  }

  private up(e: PointerEvent) {
    const a = this.active;
    if (!a || e.pointerId !== a.id) return;
    this.active = null;
    const g = this.game;
    g.aim.hideArrow();
    g.aim.select(null);
    this.onAim(null, 0, 0, 0, false);
    if (a.power <= 0) {
      this.onHint('누른 채로 원하는 방향으로 끌었다가 놓으세요');
      return;
    }
    if (!g.canAct()) return;
    g.swat(a.prop, a.dir, a.power, a.hit);
  }

  cancel() {
    if (!this.active) return;
    this.active = null;
    this.game.aim.hideArrow();
    this.game.aim.select(null);
    this.onAim(null, 0, 0, 0, false);
  }
}
