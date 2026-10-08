import * as THREE from 'three';
import type { Game } from './Game';
import type { Actor } from './Actor';

/* ------------------------------------------------------------------ */
/* Stage openings: a few seconds of the owner caring for the precious  */
/* thing before leaving the cat alone with it. Written per level as a  */
/* small script on the real stage; the first time it plays by itself,  */
/* a tap skips it, retries start right away.                           */
/* ------------------------------------------------------------------ */

export interface PreludeKit {
  game: Game;
  actor(name: string): Actor;
  /** camera: frame a point (or the prop of this kind) — null restores the normal view */
  cam(at: [number, number, number] | string | null, amount?: number): void;
  say(name: string, text: string, dur?: number): void;
  /** run something at t seconds */
  at(t: number, fn: () => void): void;
  /** walk off to (x, z) and wait there, hidden, for the ending */
  leave(name: string, x: number, z: number): void;
  /** a burst of glints on the precious thing */
  glint(kind: string, color?: string): void;
}

/** returns the length of the opening in seconds */
export type PreludeDef = (k: PreludeKit) => number;

export class PreludePlayer {
  t = 0;
  readonly dur: number;
  private cues: { t: number; fn: () => void; done: boolean }[] = [];
  done = false;

  constructor(private game: Game, def: PreludeDef, private camFn: (p: THREE.Vector3 | null, amount: number) => void) {
    const g = game;
    const find = (kind: string) => g.props.find((p) => p.alive && (p.kind === kind || p.name === kind));
    const kit: PreludeKit = {
      game: g,
      actor: (name) => {
        const a = g.actorMap[name];
        if (!a) throw new Error(`no actor ${name}`);
        return a;
      },
      cam: (at, amount = 0.55) => {
        if (at === null) { this.camFn(null, 0); return; }
        if (typeof at === 'string') { const p = find(at); if (p) this.camFn(p.center(new THREE.Vector3()), amount); return; }
        this.camFn(new THREE.Vector3(at[0], at[1], at[2]), amount);
      },
      say: (name, text, dur = 2.2) => {
        const a = g.actorMap[name];
        if (a) g.emit({ type: 'bubble', text, anchor: () => a.top(), dur, style: 'owner' });
      },
      at: (t, fn) => { this.cues.push({ t, fn, done: false }); },
      leave: (name, x, z) => {
        const a = g.actorMap[name];
        if (!a) return;
        a.walkTo(x, z).then(() => { a.group.visible = false; a.exitPos.set(x, a.pos.y, z); });
      },
      glint: (kind, color) => {
        const p = find(kind);
        if (p) g.glowBurst(p.center(new THREE.Vector3()).add(new THREE.Vector3(0, p.height * 0.4, 0)), color ?? (p.spec.worth?.heart ? '#ff9fc0' : '#ffe680'), 12);
      },
    };
    this.dur = def(kit);
    this.cues.sort((a, b) => a.t - b.t);
  }

  update(dt: number) {
    if (this.done) return;
    this.t += dt;
    for (const c of this.cues) if (!c.done && c.t <= this.t) { c.done = true; c.fn(); }
    if (this.t >= this.dur && !this.game.actors.some((a) => a.busy())) this.end();
  }

  /** jump to the end: every actor where its script leaves it */
  skip() {
    if (this.done) return;
    for (const c of this.cues) if (!c.done) { c.done = true; try { c.fn(); } catch { /* ignore */ } }
    for (const a of this.game.actors) a.finish();
    this.end();
  }

  private end() {
    this.done = true;
    this.camFn(null, 0);
  }
}
