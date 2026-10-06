import * as THREE from 'three';
import { easeOutBack } from '../core/util';

interface Decal { mesh: THREE.Mesh; t: number; dur: number; target: number }

function blobGeometry(seed: number): THREE.BufferGeometry {
  const n = 14;
  const pts: number[] = [0, 0, 0];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = i === n ? 0 : i;
    const r = 0.75 + 0.25 * Math.sin(k * 2.7 + seed * 3.1) + 0.12 * Math.sin(k * 5.3 + seed);
    pts.push(Math.cos(a) * r, 0, Math.sin(a) * r);
  }
  const idx: number[] = [];
  for (let i = 1; i <= n; i++) idx.push(0, i + 1, i);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** Puddles, stains and flour piles that make the room look properly trashed. */
export class Decals {
  readonly group = new THREE.Group();
  private items: Decal[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private mats = new Map<string, THREE.Material>();

  constructor(private max = 48) {
    for (let i = 0; i < 5; i++) this.geos.push(blobGeometry(i + 1));
  }

  private mat(color: THREE.ColorRepresentation, opacity: number) {
    const key = `${color}|${opacity}`;
    let m = this.mats.get(key);
    if (!m) {
      m = new THREE.MeshLambertMaterial({
        color, transparent: opacity < 1, opacity, depthWrite: false,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
      });
      this.mats.set(key, m);
    }
    return m;
  }

  add(pos: THREE.Vector3, normal: THREE.Vector3, size: number, color: THREE.ColorRepresentation, opacity = 0.85) {
    if (this.items.length >= this.max) {
      const old = this.items.shift()!;
      this.group.remove(old.mesh);
    }
    const g = this.geos[Math.floor(Math.random() * this.geos.length)];
    const m = new THREE.Mesh(g, this.mat(color, opacity));
    m.position.copy(pos).addScaledVector(normal, 0.015 + this.items.length * 0.0004);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    m.rotateY(Math.random() * Math.PI * 2);
    m.scale.setScalar(0.001);
    m.receiveShadow = true;
    m.renderOrder = 2;
    this.group.add(m);
    this.items.push({ mesh: m, t: 0, dur: 0.35 + Math.random() * 0.2, target: size });
  }

  update(dt: number) {
    for (const d of this.items) {
      if (d.t >= d.dur) continue;
      d.t += dt;
      const k = Math.min(1, d.t / d.dur);
      d.mesh.scale.set(d.target * easeOutBack(k), 1, d.target * easeOutBack(k) * 0.85);
    }
  }

  clear() {
    for (const d of this.items) this.group.remove(d.mesh);
    this.items.length = 0;
  }
}
