import * as THREE from 'three';
import type { Game } from '../game/Game';
import type { Prop } from '../game/Prop';
import type { ColDef, PropSpec } from '../game/types';
import { Owner } from '../game/Owner';
import { Actor, type ActorLook } from '../game/Actor';
import { Watcher, type WatchDef } from '../game/Watch';
import { mergeByMaterial } from '../render/merge';

/** Helper handed to level build functions. */
export class Builder {
  constructor(readonly game: Game) {
    game.builder = this;
  }

  get env() { return this.game.envGroup; }

  prop(spec: PropSpec): Prop {
    mergeByMaterial(spec.group, { oneShadow: true });
    return this.game.addProp(spec);
  }

  /** static (immovable) geometry + its visual */
  solid(visual: THREE.Object3D | null, cols: ColDef[], pos: [number, number, number], rotY = 0, o: { friction?: number; restitution?: number } = {}) {
    if (visual) {
      visual.position.set(pos[0], pos[1], pos[2]);
      visual.rotation.y = rotY;
      this.env.add(visual);
    }
    if (cols.length) this.game.addStatic(cols, pos, rotY, o);
  }

  deco(obj: THREE.Object3D) { this.env.add(obj); }

  invisible(cols: ColDef[], pos: [number, number, number]) {
    this.game.addStatic(cols, pos, 0, { invisible: true, friction: 0.4, restitution: 0.2 });
  }

  cat(x: number, y: number, z: number) { this.game.catHome.set(x, y, z); }

  ownerAtDoor(x: number, y: number, z: number, facing: number) {
    const o = new Owner(this.game, 'door', new THREE.Vector3(x, y, z), facing);
    this.game.owner = o;
    this.game.scene.add(o.group);
  }

  /** request-board variations: whoever was waiting at the door is napping here instead */
  ownerAsleepInstead(x: number, y: number, z: number, facing: number) {
    const g = this.game;
    if (g.owner) { g.owner.dispose(); g.scene.remove(g.owner.group); g.owner = null; }
    // whatever was lying where they now lie goes away (a cushion under a sleeper is no puzzle)
    for (const p of [...g.props]) {
      const t = p.body.translation();
      if (Math.abs(t.x - x) < 1.1 && Math.abs(t.z - z) < 1.75 && t.y > y - 0.3 && t.y < y + 1.2) { g.removeProp(p); g.props.splice(g.props.indexOf(p), 1); }
    }
    return this.ownerAsleep(x, y, z, facing);
  }

  ownerAsleep(x: number, y: number, z: number, facing: number) {
    const o = new Owner(this.game, 'sleep', new THREE.Vector3(x, y, z), facing);
    this.game.owner = o;
    this.game.scene.add(o.group);
    return o;
  }

  /** a person standing at (x, y, z) facing yaw; scenePos = where they look at the end */
  actor(name: string, look: ActorLook, x: number, y: number, z: number, yaw: number, scene?: [number, number]): Actor {
    const a = new Actor(look);
    a.name = name;
    a.place(x, y, z, yaw);
    a.exitPos.set(x, y, z);
    if (scene) a.scenePos.set(scene[0], y, scene[1]); else a.scenePos.set(x + Math.sin(yaw) * 3, y, z + Math.cos(yaw) * 3);
    this.game.actors.push(a);
    this.game.actorMap[name] = a;
    this.game.scene.add(a.group);
    return a;
  }

  /** the named actor keeps an eye out (see Watch.ts) */
  watcher(name: string, def: WatchDef): Watcher {
    const a = this.game.actorMap[name];
    const w = new Watcher(a, def);
    this.game.watchers.push(w);
    this.game.scene.add(w.holder);
    return w;
  }

  finish() {
    // free play has nothing to aim for: no target pins
    if (!this.game.level.free) for (const p of this.game.props) if (p.target) this.game.aim.addMarker(p);
    // static room geometry never moves: merge it into a handful of draw calls
    const statics = new THREE.Group();
    for (const c of [...this.env.children]) {
      if ((c as THREE.Light).isLight || c.userData.keep) continue;
      statics.add(c);
    }
    mergeByMaterial(statics);
    this.env.add(statics);
  }
}
