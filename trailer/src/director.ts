import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { Game } from '../../src/game/Game';
import type { Prop } from '../../src/game/Prop';
import { LEVELS } from '../../src/levels/index';
import { catById, withSkin } from '../../src/meta/cats';
import { View, type CamState } from './view';
import { Overlay } from './overlay';
import { vclock } from './clock';
import { SHOTS, type Shot } from './shots';

/** one recorded sound call (replayed later through the game's own synth) */
export interface SoundEvent { t: number; name: string; args: unknown[]; loop?: number; op?: 'call' | 'stop' | 'set' }

export interface Ctx {
  d: Director;
  g: Game;
  v: View;
  o: Overlay;
  /** shot-local video time (s) */
  t: number;
  /** video frame dt */
  dt: number;
  s: Record<string, unknown>;
}

export class Director {
  view: View;
  game: Game;
  overlay: Overlay;
  shot: Shot | null = null;
  fps = 30;
  frameNo = 0;
  t = 0;
  state: Record<string, unknown> = {};
  sounds: SoundEvent[] = [];
  private loopId = 1;
  private cuesDone = new Set<number>();
  private shakeAmt = 0;
  private shakeT = 0;
  extraScene: THREE.Object3D | null = null;
  log: string[] = [];

  constructor(readonly R: typeof RAPIER, w: number, h: number, ss: number) {
    this.view = new View(w, h, ss);
    this.overlay = new Overlay(this.view);
    // the game talks to "sfx"; we record every call with its video time
    const rec = new Proxy({}, {
      get: (_o, name: string) => (...args: unknown[]) => {
        const ev: SoundEvent = { t: this.t, name, args: JSON.parse(JSON.stringify(args ?? [])), op: 'call' };
        this.sounds.push(ev);
        if (['fizz', 'ring', 'motor', 'zzz'].includes(name)) {
          const id = this.loopId++;
          ev.loop = id;
          return { stop: () => this.sounds.push({ t: this.t, name, args: [], loop: id, op: 'stop' }), set: (v: number) => this.sounds.push({ t: this.t, name, args: [v], loop: id, op: 'set' }) };
        }
        return undefined;
      },
    });
    this.game = new Game(R, rec as never);
    this.view.scene.add(this.game.scene);
    this.game.on((e) => {
      const o = this.overlay, t = this.t;
      if (e.type === 'word') o.word(e.text, e.pos.clone(), t, e.size, e.color);
      else if (e.type === 'chain') o.chain(e.n, t);
      else if (e.type === 'bubble' && !this.state.muteBubbles) o.bubble(e.text, e.anchor, t, e.dur, e.style);
      else if (e.type === 'score') o.damage.value = e.total;
    });
    // trailer controls slow motion itself
    (this.game as unknown as { slowmo: () => void }).slowmo = () => {};
  }

  ctx(): Ctx { return { d: this, g: this.game, v: this.view, o: this.overlay, t: this.t, dt: 1 / this.fps, s: this.state }; }

  list() { return SHOTS.map((s) => ({ id: s.id, dur: s.dur })); }

  /** load a shot and reset time; returns its duration */
  prepare(id: string, fps = 30) {
    const shot = SHOTS.find((s) => s.id === id);
    if (!shot) throw new Error('no shot ' + id);
    this.shot = shot;
    this.fps = fps;
    this.frameNo = 0;
    this.t = 0;
    this.state = {};
    this.sounds = [];
    this.cuesDone.clear();
    this.overlay.clear();
    this.overlay.subs = [];
    this.shakeAmt = 0;
    vclock.reset();
    if (this.extraScene) { this.view.scene.remove(this.extraScene); this.extraScene = null; }
    this.game.scene.visible = true;
    if (shot.level) {
      const lv = LEVELS.find((l) => l.id === shot.level);
      if (!lv) throw new Error('no level ' + shot.level);
      const cat = catById(shot.cat ?? 'cheese');
      this.game.setCat(withSkin(cat, shot.skin), shot.acc ?? []);
      this.game.load(lv);
      this.view.theme(lv.theme);
      this.game.start();
      this.game.paws = this.game.maxPaws = 99;
      if (!shot.markers) this.game.aim.clearMarkers();
    } else {
      this.game.unload();
      this.game.scene.visible = false;
    }
    if (shot.theme) this.view.theme(shot.theme);
    shot.setup?.(this.ctx());
    return { dur: shot.dur, frames: Math.round(shot.dur * fps) };
  }

  /** advance one video frame and draw it */
  step() {
    const shot = this.shot!;
    const dt = 1 / this.fps;
    this.t = this.frameNo / this.fps;
    const c = this.ctx();
    (shot.cues ?? []).forEach((cue, i) => {
      if (!this.cuesDone.has(i) && cue.t <= this.t + 1e-6) { this.cuesDone.add(i); cue.run(c); }
    });
    const rate = shot.rate ? shot.rate(this.t) : 1;
    if (shot.level) {
      vclock.advance(dt * rate * 1000);
      if (this.frameNo > 0) this.game.update(dt * rate);
      else this.game.update(1e-6);
      this.shakeAmt = Math.max(this.shakeAmt, this.game.shakeAmt * (shot.shake ?? 1));
      this.game.shakeAmt = 0;
      this.game.punchAmt = 0;
    } else vclock.advance(dt * 1000);
    shot.tick?.(c);
    // camera (+ impact shake)
    const cam: CamState & { shadow?: number } = shot.cam(c);
    this.shakeT += dt * 60;
    if (this.shakeAmt > 0.002) {
      const a = this.shakeAmt * this.shakeAmt * 0.06 * cam.pos.distanceTo(cam.look) / 20;
      cam.pos.x += (Math.sin(this.shakeT * 1.7) + Math.sin(this.shakeT * 3.1)) * a;
      cam.pos.y += (Math.sin(this.shakeT * 2.3 + 1) + Math.sin(this.shakeT * 4.3)) * a;
      cam.look.x += Math.sin(this.shakeT * 2.9 + 2) * a * 0.5;
    }
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.6);
    this.view.setCamera(cam, cam.shadow ?? 10);
    this.view.render3D(shot.bg);
    shot.under?.(c);
    this.overlay.draw(this.t);
    this.view.grade(shot.vignette ?? 0.26);
    shot.post?.(c);
    this.frameNo++;
  }

  grab(type = 'image/png', q = 0.95) { return this.view.out.toDataURL(type, q); }

  /* ------------------------------ helpers used by shots ------------------------------ */

  find(kind: string, near?: [number, number, number]): Prop {
    const c = this.game.props.filter((p) => p.alive && (p.kind === kind || p.name === kind));
    if (near) { const n = new THREE.Vector3(...near); c.sort((a, b) => a.center(new THREE.Vector3()).distanceTo(n) - b.center(new THREE.Vector3()).distanceTo(n)); }
    if (!c[0]) throw new Error(`no prop ${kind} in ${this.shot?.id}`);
    return c[0];
  }

  /**
   * The player's gesture: the cat eyes the object, the finger drags the aim
   * arrow out, and on release the cat leaps and swats (the real game call).
   */
  aimAndSwat(kind: string, o: { near?: [number, number, number]; dir: [number, number]; power: number; at?: 'top' | 'mid' | 'low' | number; aim?: number; finger?: boolean; arrow?: boolean }) {
    const p = this.find(kind, o.near);
    const g = this.game;
    const c = p.center(new THREE.Vector3());
    const tr = p.body.translation();
    const frac = o.at === 'top' ? 0.85 : o.at === 'low' ? 0.15 : o.at === 'mid' || o.at === undefined ? 0.5 : o.at;
    const hit = new THREE.Vector3(c.x, tr.y + p.height * frac, c.z);
    const dir = new THREE.Vector3(o.dir[0], 0, o.dir[1]).normalize();
    const aimDur = o.aim ?? 0.75;
    const t0 = this.t;
    if (o.arrow !== false) g.aim.select(p);
    g.cat.setAim(hit);
    if (o.finger !== false) this.overlay.finger = { from: hit.clone(), to: hit.clone().addScaledVector(dir, 1.2 + o.power * 2.2), t0, dur: aimDur + 0.25 };
    this.state.aiming = { p, dir, power: o.power, hit, t0, aimDur, arrow: o.arrow !== false };
    this.log.push(`aim ${p.name} at ${t0.toFixed(2)}`);
  }

  /** called every frame by shots that aim (grows the arrow, then releases) */
  updateAim() {
    const a = this.state.aiming as { p: Prop; dir: THREE.Vector3; power: number; hit: THREE.Vector3; t0: number; aimDur: number; arrow: boolean } | undefined;
    if (!a) return;
    const g = this.game;
    const k = Math.min(1, (this.t - a.t0) / a.aimDur);
    const tr = a.p.body.translation();
    if (a.arrow && k > 0.1) g.aim.show(new THREE.Vector3(tr.x, tr.y, tr.z), a.dir, a.power * Math.min(1, (k - 0.1) / 0.75), a.p.radius);
    if (k >= 1) {
      g.aim.hideArrow();
      g.aim.select(null);
      g.cat.setAim(null);
      this.state.aiming = undefined;
      const ok = g.swat(a.p, a.dir, a.power, a.hit);
      this.log.push(`swat ${a.p.name} ok=${ok} t=${this.t.toFixed(2)}`);
    }
  }

  /** current spot of a prop (or its last known spot after it broke) */
  where(p: Prop, out = new THREE.Vector3()) { return p.alive ? p.center(out) : out.copy(p.group.position); }
}
