import * as THREE from 'three';
import { clamp } from '../core/util';
import type { Stage } from '../render/Stage';
import type { Game } from './Game';
import type { Prop } from './Prop';
import type { Sfx } from '../audio/Sfx';

type Mode =
  | { kind: 'none' }
  | { kind: 'aim'; prop: Prop; x0: number; y0: number; hit: THREE.Vector3; planeY: number; dir: THREE.Vector3; power: number; id: number; t0: number; inspected: boolean; moved: boolean }
  | { kind: 'pan'; id: number; x: number; y: number; x0: number; y0: number; moved: boolean; t0: number }
  | { kind: 'pinch'; d0: number; dist0: number; mx: number; my: number };

/**
 * One finger: press an object, drag where it should go (length = power),
 * release to swat. Hold still on an object to inspect it.
 * Empty space: drag to pan (big houses), pinch to zoom, double-tap = overview.
 */
export class Input {
  private ray = new THREE.Raycaster();
  private mode: Mode = { kind: 'none' };
  private pointers = new Map<number, { x: number; y: number }>();
  private lastTap = { t: 0, x: 0, y: 0 };
  private holdTimer = 0;
  enabled = true;
  onAim: (label: string | null, power: number, x: number, y: number, special: boolean) => void = () => {};
  onHint: (text: string) => void = () => {};
  onInspect: (p: Prop | null, x: number, y: number) => void = () => {};
  onViewChange: () => void = () => {};

  constructor(private stage: Stage, private game: Game, private sfx: Sfx) {
    const el = stage.canvas;
    el.addEventListener('pointerdown', (e) => this.down(e));
    window.addEventListener('pointermove', (e) => this.move(e));
    window.addEventListener('pointerup', (e) => this.up(e));
    window.addEventListener('pointercancel', (e) => { this.pointers.delete(e.pointerId); this.cancel(); });
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    el.addEventListener('wheel', (e) => { e.preventDefault(); this.stage.zoomBy(e.deltaY > 0 ? 1.08 : 0.93); this.onViewChange(); }, { passive: false });
  }

  private ndc(x: number, y: number) {
    return new THREE.Vector2((x / window.innerWidth) * 2 - 1, -(y / window.innerHeight) * 2 + 1);
  }

  pick(x: number, y: number): { prop: Prop; hit: THREE.Vector3 } | null {
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
    let best: Prop | null = null, bestScore = 30;
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
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (!this.enabled) return;
    const g = this.game;
    if (this.pointers.size === 2) {
      // second finger: pinch (cancel any aim)
      this.cancel();
      const [a, b] = [...this.pointers.values()];
      this.mode = { kind: 'pinch', d0: Math.hypot(a.x - b.x, a.y - b.y), dist0: this.stage.dist, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
      return;
    }
    if (this.mode.kind !== 'none') return;
    const now = performance.now();
    const r = g.phase === 'ready' && g.paws > 0 ? this.pick(e.clientX, e.clientY) : null;
    if (!r) {
      // empty space → pan / double-tap
      if (now - this.lastTap.t < 320 && Math.hypot(e.clientX - this.lastTap.x, e.clientY - this.lastTap.y) < 40) {
        this.stage.showOverview(!this.stage.overview);
        if (!this.stage.roomy) this.stage.zoomBy(this.stage.zoomedIn() ? 10 : 0.7);
        this.onViewChange();
        this.lastTap.t = 0;
        return;
      }
      this.mode = { kind: 'pan', id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, moved: false, t0: now };
      return;
    }
    if (!g.reachable(r.prop)) {
      g.emit({ type: 'toast', text: '너무 높아서 앞발이 닿지 않아요! 다른 방법을 찾아봐요' });
      this.sfx.denied();
      this.onInspect(r.prop, e.clientX, e.clientY);
      setTimeout(() => this.onInspect(null, 0, 0), 1600);
      return;
    }
    this.mode = { kind: 'aim', prop: r.prop, x0: e.clientX, y0: e.clientY, hit: r.hit, planeY: r.hit.y, dir: new THREE.Vector3(1, 0, 0), power: 0, id: e.pointerId, t0: now, inspected: false, moved: false };
    g.aim.select(r.prop);
    g.cat.setAim(r.hit);
    this.sfx.select();
    this.onAim(r.prop.special?.label ?? r.prop.name, 0, e.clientX, e.clientY, !!r.prop.special?.label);
    clearTimeout(this.holdTimer);
    const m = this.mode;
    this.holdTimer = window.setTimeout(() => {
      if (this.mode === m && !m.moved) { m.inspected = true; this.onInspect(m.prop, m.x0, m.y0); this.sfx.click(); }
    }, 480);
  }

  private move(e: PointerEvent) {
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const m = this.mode;
    if (m.kind === 'pinch') {
      if (this.pointers.size < 2) return;
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.stage.zoomTo(m.dist0 * (m.d0 / Math.max(20, d)));
      this.stage.pan(mx - m.mx, my - m.my);
      m.mx = mx; m.my = my;
      this.onViewChange();
      return;
    }
    if (m.kind === 'pan' && e.pointerId === m.id) {
      const dx = e.clientX - m.x, dy = e.clientY - m.y;
      if (!m.moved && Math.hypot(e.clientX - m.x0, e.clientY - m.y0) > 8) m.moved = true;
      if (m.moved) { this.stage.pan(dx, dy); this.onViewChange(); }
      m.x = e.clientX; m.y = e.clientY;
      return;
    }
    if (m.kind !== 'aim' || e.pointerId !== m.id) return;
    const dx = e.clientX - m.x0, dy = e.clientY - m.y0;
    const len = Math.hypot(dx, dy);
    if (len > 10 && !m.moved) { m.moved = true; if (m.inspected) this.onInspect(null, 0, 0); }
    const full = Math.min(window.innerWidth, window.innerHeight) * 0.36;
    m.power = len < 16 ? 0 : clamp((len - 16) / full, 0.12, 1);
    const p0 = this.planePoint(m.x0, m.y0, m.planeY);
    const p1 = this.planePoint(e.clientX, e.clientY, m.planeY);
    if (p0 && p1) {
      const d = p1.sub(p0).setY(0);
      if (d.lengthSq() > 1e-6) m.dir.copy(d.normalize());
    }
    const t = m.prop.body.translation();
    if (m.power > 0) this.game.aim.show(new THREE.Vector3(t.x, t.y, t.z), m.dir, m.power, m.prop.radius);
    else this.game.aim.hideArrow();
    this.onAim(m.prop.special?.label ?? m.prop.name, m.power, e.clientX, e.clientY, !!m.prop.special?.label);
  }

  private up(e: PointerEvent) {
    this.pointers.delete(e.pointerId);
    const m = this.mode;
    if (m.kind === 'pinch') {
      if (this.pointers.size === 0) this.mode = { kind: 'none' };
      return;
    }
    if (m.kind === 'pan' && e.pointerId === m.id) {
      this.mode = { kind: 'none' };
      if (!m.moved) {
        this.lastTap = { t: performance.now(), x: e.clientX, y: e.clientY };
        const g = this.game;
        if (g.phase === 'ready') {
          g.aim.showHints(g.props.filter((p) => p.alive && p.interactable && g.reachable(p)));
          this.onHint(this.stage.roomy ? '빛나는 물건을 끌어서 툭! · 빈 곳을 끌면 화면 이동, 두 번 탭하면 전체 보기' : '빛나는 물건을 눌러서 끌어보세요');
        }
      }
      return;
    }
    if (m.kind !== 'aim' || e.pointerId !== m.id) return;
    clearTimeout(this.holdTimer);
    this.mode = { kind: 'none' };
    const g = this.game;
    g.aim.hideArrow();
    g.aim.select(null);
    g.cat.setAim(null);
    this.onAim(null, 0, 0, 0, false);
    if (m.inspected) this.onInspect(null, 0, 0);
    if (m.power <= 0) {
      if (!m.inspected) this.onHint('누른 채로 원하는 방향으로 끌었다가 놓으세요 · 꾹 누르면 물건 정보');
      return;
    }
    if (!g.canAct()) return;
    g.swat(m.prop, m.dir, m.power, m.hit);
  }

  cancel() {
    clearTimeout(this.holdTimer);
    if (this.mode.kind === 'aim') {
      this.game.aim.hideArrow();
      this.game.aim.select(null);
      this.game.cat.setAim(null);
      this.onAim(null, 0, 0, 0, false);
      this.onInspect(null, 0, 0);
    }
    this.mode = { kind: 'none' };
  }
}
