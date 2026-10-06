import * as THREE from 'three';
import { softDotTexture, starTexture } from '../render/kit';

/* ------------------------------------------------------------------ */
/* Billboard sprite particles (puffs, sparks, stars) – one draw call   */
/* per system, alpha/size animated in a tiny custom shader.            */
/* ------------------------------------------------------------------ */

export interface PuffOpts {
  pos: THREE.Vector3;
  vel?: THREE.Vector3;
  life: number;
  size0: number;
  size1: number;
  color: THREE.ColorRepresentation;
  alpha?: number;
  gravity?: number;
  drag?: number;
  spin?: number;
}

const VERT = /* glsl */ `
attribute vec3 aOffset;
attribute float aSize;
attribute vec3 aColor;
attribute float aAlpha;
attribute float aRot;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vUv = uv;
  vColor = aColor;
  vAlpha = aAlpha;
  float c = cos(aRot), s = sin(aRot);
  vec2 p = vec2(c * position.x - s * position.y, s * position.x + c * position.y) * aSize;
  vec4 mv = modelViewMatrix * vec4(aOffset, 1.0);
  mv.xy += p;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D uMap;
varying vec2 vUv;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 t = texture2D(uMap, vUv);
  float a = t.a * vAlpha;
  if (a < 0.01) discard;
  gl_FragColor = vec4(vColor * t.rgb, a);
}`;

interface P {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number;
  s0: number; s1: number;
  r: number; g: number; b: number;
  a: number; grav: number; drag: number;
  rot: number; spin: number;
}

export class PuffSystem {
  readonly mesh: THREE.Mesh;
  private geo: THREE.InstancedBufferGeometry;
  private parts: P[] = [];
  private aOffset: THREE.InstancedBufferAttribute;
  private aSize: THREE.InstancedBufferAttribute;
  private aColor: THREE.InstancedBufferAttribute;
  private aAlpha: THREE.InstancedBufferAttribute;
  private aRot: THREE.InstancedBufferAttribute;
  private tmpC = new THREE.Color();

  constructor(private max: number, additive: boolean, tex: 'soft' | 'star' = 'soft') {
    const base = new THREE.PlaneGeometry(1, 1);
    this.geo = new THREE.InstancedBufferGeometry();
    this.geo.index = base.index;
    this.geo.attributes.position = base.attributes.position;
    this.geo.attributes.uv = base.attributes.uv;
    this.aOffset = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aSize = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.aColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.aAlpha = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    this.aRot = new THREE.InstancedBufferAttribute(new Float32Array(max), 1);
    for (const a of [this.aOffset, this.aSize, this.aColor, this.aAlpha, this.aRot]) a.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute('aOffset', this.aOffset);
    this.geo.setAttribute('aSize', this.aSize);
    this.geo.setAttribute('aColor', this.aColor);
    this.geo.setAttribute('aAlpha', this.aAlpha);
    this.geo.setAttribute('aRot', this.aRot);
    this.geo.instanceCount = 0;
    const map = (tex === 'star' ? starTexture() : softDotTexture()) ?? null;
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { uMap: { value: map } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 10;
  }

  emit(o: PuffOpts) {
    if (this.parts.length >= this.max) this.parts.shift();
    this.tmpC.set(o.color);
    this.parts.push({
      x: o.pos.x, y: o.pos.y, z: o.pos.z,
      vx: o.vel?.x ?? 0, vy: o.vel?.y ?? 0, vz: o.vel?.z ?? 0,
      life: 0, max: o.life, s0: o.size0, s1: o.size1,
      r: this.tmpC.r, g: this.tmpC.g, b: this.tmpC.b,
      a: o.alpha ?? 1, grav: o.gravity ?? 0, drag: o.drag ?? 1.5,
      rot: Math.random() * 6.28, spin: o.spin ?? (Math.random() - 0.5) * 2,
    });
  }

  update(dt: number) {
    let n = 0;
    const ps = this.parts;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life += dt;
      if (p.life >= p.max) continue;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k; p.vy = p.vy * k + p.grav * dt; p.vz *= k;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.rot += p.spin * dt;
      const t = p.life / p.max;
      this.aOffset.setXYZ(n, p.x, p.y, p.z);
      this.aSize.setX(n, p.s0 + (p.s1 - p.s0) * (1 - (1 - t) * (1 - t)));
      this.aColor.setXYZ(n, p.r, p.g, p.b);
      this.aAlpha.setX(n, p.a * (t < 0.1 ? t / 0.1 : 1 - (t - 0.1) / 0.9));
      this.aRot.setX(n, p.rot);
      ps[n] = p;
      n++;
    }
    ps.length = n;
    this.geo.instanceCount = n;
    for (const a of [this.aOffset, this.aSize, this.aColor, this.aAlpha, this.aRot]) a.needsUpdate = true;
  }

  clear() { this.parts.length = 0; this.geo.instanceCount = 0; }
}

/* ------------------------------------------------------------------ */
/* Lit low-poly chunks (water drops, dirt, confetti, coins, feathers)  */
/* ------------------------------------------------------------------ */

export interface ChunkOpts {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  life: number;
  size: number;
  color: THREE.ColorRepresentation;
  gravity?: number;
  drag?: number;
  flat?: boolean;
  floor?: number;
  bounce?: number;
  flutter?: boolean;
}

interface C {
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  life: number; max: number; size: number;
  grav: number; drag: number; floor: number; bounce: number;
  q: THREE.Quaternion; w: THREE.Vector3; flat: boolean; flutter: boolean;
  idx: number;
}

export class ChunkSystem {
  readonly mesh: THREE.InstancedMesh;
  private slots: (C | null)[] = [];
  private m = new THREE.Matrix4();
  private p = new THREE.Vector3();
  private s = new THREE.Vector3();
  private dq = new THREE.Quaternion();
  private e = new THREE.Euler();
  private col = new THREE.Color();
  private next = 0;
  private hi = 0;

  constructor(private max: number) {
    const g = new THREE.OctahedronGeometry(0.5, 0);
    this.mesh = new THREE.InstancedMesh(g, new THREE.MeshLambertMaterial({ flatShading: true }), max);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = false;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < max; i++) {
      this.slots.push(null);
      this.mesh.setColorAt(i, this.col.set(0xffffff));
      this.mesh.setMatrixAt(i, this.m);
    }
  }

  emit(o: ChunkOpts) {
    const idx = this.next; this.next = (this.next + 1) % this.max;
    this.slots[idx] = {
      x: o.pos.x, y: o.pos.y, z: o.pos.z, vx: o.vel.x, vy: o.vel.y, vz: o.vel.z,
      life: 0, max: o.life, size: o.size, grav: o.gravity ?? -22, drag: o.drag ?? 0.3,
      floor: o.floor ?? 0.02, bounce: o.bounce ?? 0.25, q: new THREE.Quaternion().random(),
      w: new THREE.Vector3((Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14, (Math.random() - 0.5) * 14),
      flat: !!o.flat, flutter: !!o.flutter, idx,
    };
    this.hi = Math.max(this.hi, idx + 1);
    this.col.set(o.color);
    this.mesh.setColorAt(idx, this.col);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(dt: number) {
    let any = false;
    for (let i = 0; i < this.hi; i++) {
      const c = this.slots[i];
      if (!c) continue;
      c.life += dt;
      if (c.life >= c.max) {
        this.slots[i] = null;
        this.m.makeScale(0, 0, 0);
        this.mesh.setMatrixAt(i, this.m);
        any = true;
        continue;
      }
      const k = Math.exp(-c.drag * dt);
      c.vx *= k; c.vz *= k; c.vy = c.vy * k + c.grav * dt;
      if (c.flutter) {
        c.vx += Math.sin(c.life * 9 + c.idx) * 6 * dt;
        c.vz += Math.cos(c.life * 7 + c.idx) * 6 * dt;
      }
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      if (c.y < c.floor) {
        c.y = c.floor;
        c.vy = -c.vy * c.bounce;
        c.vx *= 0.6; c.vz *= 0.6;
        c.w.multiplyScalar(0.5);
      }
      this.e.set(c.w.x * dt, c.w.y * dt, c.w.z * dt);
      this.dq.setFromEuler(this.e);
      c.q.multiply(this.dq);
      const t = c.life / c.max;
      const sc = c.size * (t > 0.7 ? 1 - (t - 0.7) / 0.3 : 1);
      this.p.set(c.x, c.y, c.z);
      this.s.set(sc, c.flat ? sc * 0.15 : sc, sc);
      this.m.compose(this.p, c.q, this.s);
      this.mesh.setMatrixAt(i, this.m);
      any = true;
    }
    this.mesh.count = this.hi;
    if (any) this.mesh.instanceMatrix.needsUpdate = true;
  }

  clear() {
    this.m.makeScale(0, 0, 0);
    for (let i = 0; i < this.max; i++) { this.slots[i] = null; this.mesh.setMatrixAt(i, this.m); }
    this.hi = 0; this.next = 0;
    this.mesh.count = 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}
