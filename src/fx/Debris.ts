import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import { GROUPS } from '../core/constants';
import { srand } from '../core/util';

interface Frag {
  body: RAPIER.RigidBody | null;
  pp: THREE.Vector3;
  pq: THREE.Quaternion;
  fresh: boolean;
  sx: number; sy: number; sz: number;
  life: number;
  maxLife: number;
  active: boolean;
}

/** Physical shards from broken props, rendered in a single instanced draw call. */
export class Debris {
  readonly mesh: THREE.InstancedMesh;
  private frags: Frag[] = [];
  private cursor = 0;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private col = new THREE.Color();
  activeCount = 0;

  constructor(private R: typeof RAPIER, private world: RAPIER.World, readonly capacity = 180) {
    const g = new THREE.IcosahedronGeometry(0.5, 0);
    const pos = g.attributes.position as THREE.BufferAttribute;
    // squash into an irregular shard
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      const k = 0.75 + ((Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1 + 1) % 1 * 0.5;
      pos.setXYZ(i, x * k, y * k * 0.9, z * k * 1.1);
    }
    g.computeVertexNormals();
    const mat = new THREE.MeshLambertMaterial({ flatShading: true });
    this.mesh = new THREE.InstancedMesh(g, mat, capacity);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    for (let i = 0; i < capacity; i++) {
      this.frags.push({ body: null, pp: new THREE.Vector3(), pq: new THREE.Quaternion(), fresh: true, sx: 0, sy: 0, sz: 0, life: 0, maxLife: 1, active: false });
      this.mesh.setColorAt(i, this.col.set(0xffffff));
    }
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  }

  spawn(pos: THREE.Vector3, vel: THREE.Vector3, size: number, color: THREE.ColorRepresentation, flat = false, life = srand(16, 24)) {
    const i = this.cursor;
    this.cursor = (this.cursor + 1) % this.capacity;
    const f = this.frags[i];
    if (f.body) this.world.removeRigidBody(f.body);
    const sx = size * srand(0.7, 1.3), sy = size * (flat ? srand(0.18, 0.3) : srand(0.6, 1.1)), sz = size * srand(0.7, 1.3);
    const bd = this.R.RigidBodyDesc.dynamic()
      .setTranslation(pos.x, pos.y, pos.z)
      .setLinvel(vel.x, vel.y, vel.z)
      .setAngvel({ x: srand(-12, 12), y: srand(-12, 12), z: srand(-12, 12) })
      .setLinearDamping(0.15)
      .setAngularDamping(0.6)
      .setCcdEnabled(true);
    this.q.setFromEuler(new THREE.Euler(srand(0, 6.28), srand(0, 6.28), srand(0, 6.28)));
    bd.setRotation({ x: this.q.x, y: this.q.y, z: this.q.z, w: this.q.w });
    const body = this.world.createRigidBody(bd);
    const cd = this.R.ColliderDesc.cuboid(sx * 0.42, sy * 0.42, sz * 0.42)
      .setDensity(0.6)
      .setFriction(0.7)
      .setRestitution(0.25)
      .setCollisionGroups(GROUPS.frag);
    this.world.createCollider(cd, body);
    f.body = body; f.sx = sx; f.sy = sy; f.sz = sz; f.life = 0; f.maxLife = life; f.active = true; f.fresh = true;
    this.mesh.setColorAt(i, this.col.set(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  savePrev() {
    for (const f of this.frags) {
      if (!f.active || !f.body) continue;
      const t = f.body.translation(), r = f.body.rotation();
      f.pp.set(t.x, t.y, t.z); f.pq.set(r.x, r.y, r.z, r.w);
      f.fresh = false;
    }
  }

  update(dt: number, alpha = 1) {
    let maxIdx = 0;
    this.activeCount = 0;
    for (let i = 0; i < this.capacity; i++) {
      const f = this.frags[i];
      if (!f.active || !f.body) {
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      f.life += dt;
      let k = 1;
      const fade = f.maxLife - f.life;
      if (fade < 0.6) k = Math.max(0, fade / 0.6);
      if (f.life >= f.maxLife) {
        this.world.removeRigidBody(f.body);
        f.body = null; f.active = false;
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        continue;
      }
      const t = f.body.translation();
      if (t.y < -6) { f.life = f.maxLife; continue; }
      const r = f.body.rotation();
      this.p.set(t.x, t.y, t.z);
      this.q.set(r.x, r.y, r.z, r.w);
      if (!f.fresh && alpha < 1) {
        this.p.lerpVectors(f.pp, this.p, alpha);
        this.q.slerpQuaternions(f.pq, this.q, alpha);
      }
      this.s.set(f.sx * k, f.sy * k, f.sz * k);
      this.m.compose(this.p, this.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      maxIdx = i + 1;
      this.activeCount++;
    }
    this.mesh.count = maxIdx;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  /** any shard still flying? */
  moving(): boolean {
    for (const f of this.frags) {
      if (!f.active || !f.body || f.body.isSleeping()) continue;
      const v = f.body.linvel();
      if (v.x * v.x + v.y * v.y + v.z * v.z > 1) return true;
    }
    return false;
  }

  clear() {
    for (const f of this.frags) {
      if (f.body) this.world.removeRigidBody(f.body);
      f.body = null; f.active = false;
    }
    this.mesh.count = 0;
  }
}
