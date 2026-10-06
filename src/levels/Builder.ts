import * as THREE from 'three';
import type { Game } from '../game/Game';
import type { Prop } from '../game/Prop';
import type { ColDef, PropSpec } from '../game/types';
import { Owner } from '../game/Owner';
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

  ownerAsleep(x: number, y: number, z: number, facing: number) {
    const o = new Owner(this.game, 'sleep', new THREE.Vector3(x, y, z), facing);
    this.game.owner = o;
    this.game.scene.add(o.group);
    return o;
  }

  finish() {
    for (const p of this.game.props) if (p.target) this.game.aim.addMarker(p);
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
