import * as THREE from 'three';
import { M, cyl, mesh, softDotTexture } from '../render/kit';
import type { Stage } from '../render/Stage';
import { landAt, rnd } from './Finale';
import { btn, esc, h } from './dom';

export interface OrbitPlace { id: number; icon: string; name: string; open: boolean; cleared: boolean }

/**
 * After the end of the world, the map of the outside is a view from orbit:
 * the Earth hangs in pieces, a little glowing core in the middle, and every
 * place the cat has been rides on its own chunk (tap one to go there).
 */
export class OrbitView {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.1, 400);
  private bits = new THREE.Group();
  private big: { g: THREE.Object3D; id: number; base: THREE.Vector3; ph: number }[] = [];
  private labels: { el: HTMLElement; g: THREE.Object3D }[] = [];
  private root: HTMLElement | null = null;
  private t = 0;
  active = false;

  constructor(private stage: Stage) {
    const s = this.scene;
    s.background = new THREE.Color('#1d1636');
    s.add(new THREE.HemisphereLight(0xfff4e6, 0x6a5a9a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2);
    sun.position.set(-6, 5, 8);
    s.add(sun);
    // stars
    const r = rnd(11);
    const pos: number[] = [], col: number[] = [];
    const tint = ['#ffffff', '#ffe6a0', '#ffc7d9', '#c9d8ff'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 600; i++) {
      const d = new THREE.Vector3(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1).normalize().multiplyScalar(120 + r() * 60);
      pos.push(d.x, d.y, d.z);
      const c = tint[i % tint.length]; col.push(c.r, c.g, c.b);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, map: softDotTexture() ?? null, vertexColors: true, transparent: true, depthWrite: false })));
    // what is left: a warm core and a cloud of small pieces around it
    s.add(mesh(new THREE.IcosahedronGeometry(0.9, 2), M('#ffb36b', { emissive: '#ff7a3a', emissiveIntensity: 0.9 }), { shadow: false }));
    for (let i = 0; i < 46; i++) {
      const dir = new THREE.Vector3(r() * 2 - 1, (r() * 2 - 1) * 0.6, r() * 2 - 1).normalize();
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14 + r() * 0.3, 0), new THREE.MeshLambertMaterial({ color: landAt(dir), flatShading: true }));
      m.position.copy(dir).multiplyScalar(2.2 + r() * 3.2);
      m.rotation.set(r() * 6, r() * 6, r() * 6);
      this.bits.add(m);
    }
    s.add(this.bits);
    this.camera.position.set(0, 3.2, 13);
    this.camera.lookAt(0, 0, 0);
  }

  /** the places ride on big chunks around the core */
  private build(places: OrbitPlace[]) {
    for (const b of this.big) this.scene.remove(b.g);
    this.big = [];
    const n = places.length;
    places.forEach((p, i) => {
      const a = (i / n) * Math.PI * 2 + 0.4;
      const base = new THREE.Vector3(Math.cos(a) * 4.2, Math.sin(a * 2) * 0.9, Math.sin(a) * 2.6);
      const g = new THREE.Group();
      const dir = base.clone().normalize();
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.75, 0), new THREE.MeshLambertMaterial({ color: landAt(dir), flatShading: true }));
      rock.scale.set(1.3, 0.6, 1.1);
      g.add(rock);
      // a little flag where the cat was
      g.add(mesh(cyl(0.02, 0.02, 0.6, 5), M('#ffffff'), { pos: [0.2, 0.55, 0], shadow: false }));
      g.add(mesh(new THREE.BoxGeometry(0.28, 0.18, 0.02), M(p.cleared ? '#ffd23f' : '#ff8fa3'), { pos: [0.35, 0.75, 0], shadow: false }));
      g.position.copy(base);
      this.scene.add(g);
      this.big.push({ g, id: p.id, base, ph: i * 1.7 });
    });
  }

  open(places: OrbitPlace[], parent: HTMLElement, pick: (id: number) => void) {
    this.close();
    this.build(places);
    this.active = true;
    this.stage.overlayScene = this.scene;
    this.stage.overlayCamera = this.camera;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    // fit the ring of places across the screen width (phones are narrow)
    const d = Math.max(13, 5.6 / (Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.camera.aspect));
    this.camera.position.set(0, d * 0.24, d);
    this.camera.lookAt(0, 0, 0);
    // keep the pieces above the map sheet
    this.camera.setViewOffset(window.innerWidth, window.innerHeight, 0, window.innerHeight * 0.2, window.innerWidth, window.innerHeight);
    this.camera.updateProjectionMatrix();
    this.root = h('div', 'orbitlabels');
    this.root.append(h('div', 'orbithead', '🪐 지구 궤도 · 조각마다 우리가 지나온 장소'));
    this.labels = [];
    for (const p of places) {
      const b = this.big.find((x) => x.id === p.id)!;
      const el = btn(`orbitlab${p.open ? '' : ' locked'}${p.cleared ? ' cleared' : ''}`, `${p.open ? p.icon : '🔒'} <span>${esc(p.name)}</span>`, () => { if (p.open) pick(p.id); });
      this.root.append(el);
      this.labels.push({ el, g: b.g });
    }
    parent.append(this.root);
  }

  close() {
    if (!this.active) return;
    this.active = false;
    if (this.stage.overlayScene === this.scene) { this.stage.overlayScene = null; this.stage.overlayCamera = null; }
    this.root?.remove();
    this.root = null;
  }

  update(dt: number) {
    if (!this.active) return;
    this.t += dt;
    this.bits.rotation.y += dt * 0.05;
    for (const b of this.big) {
      b.g.position.copy(b.base).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.t * 0.04);
      b.g.position.y += Math.sin(this.t * 0.8 + b.ph) * 0.12;
      b.g.rotation.y += dt * 0.2;
    }
    const v = new THREE.Vector3();
    for (const l of this.labels) {
      v.copy(l.g.position); v.y += 1.15;
      v.project(this.camera);
      l.el.style.left = `${(v.x * 0.5 + 0.5) * window.innerWidth}px`;
      l.el.style.top = `${(-v.y * 0.5 + 0.5) * window.innerHeight}px`;
    }
  }
}
