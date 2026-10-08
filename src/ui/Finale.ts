import * as THREE from 'three';
import { M, box, cone, cyl, mesh, softDotTexture, sphere, torus } from '../render/kit';
import { Cat } from '../game/Cat';
import { Actor } from '../game/Actor';
import type { Stage } from '../render/Stage';
import type { CatDef } from '../meta/cats';
import { btn, h } from './dom';

/* ------------------------------------------------------------------ */
/* The end of the world: rendered instead of the stage, like the cat    */
/* room. The planet cracks along lines that start where the bomb sat,   */
/* blows apart into pre-cut chunks, and a little ship slips away. On    */
/* board, the owner turns around. The cat knows nothing.                */
/* Timeline (seconds): 0 calm · 1.6 cracks · 4.6 boom · 6.2 ship ·      */
/* 8.8 cabin · 10 owner line · 12 cat line · 15 end.                    */
/* ------------------------------------------------------------------ */

export interface FinaleSound {
  rumble(k?: number): void; boom(): void; whoosh(k?: number): void; reveal(): void; click(): void;
  meow(kind?: 'short' | 'long' | 'ask' | 'smug' | 'annoyed', pitch?: number): void; purr(d?: number): void;
}

const OCEAN = new THREE.Color('#7cc6ea');
const LAND = new THREE.Color('#9fdc8c');
const SAND = new THREE.Color('#f5e3a3');
const ICE = new THREE.Color('#ffffff');
const R = 3;
const END = 15.2;

/** pastel continents: a few overlapping waves on the sphere */
export function landAt(d: THREE.Vector3): THREE.Color {
  const n = Math.sin(d.x * 3.1 + 0.4) * Math.cos(d.y * 2.3 - 0.8) + Math.sin(d.z * 2.7 + d.x * 1.3) * 0.8 + Math.cos(d.y * 4.2 + d.z * 1.7) * 0.35;
  if (Math.abs(d.y) > 0.86) return ICE;
  if (n > 0.55) return LAND;
  if (n > 0.38) return SAND;
  return OCEAN;
}

export function rnd(seed: number) { let s = seed; return () => { s = (s * 16807) % 2147483647; return s / 2147483647; }; }

export class Finale {
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(38, 1, 0.1, 400);
  private earth = new THREE.Group();
  private globe: THREE.Mesh;
  private clouds: THREE.Mesh;
  private cracks: THREE.Mesh[] = [];
  private crackMat = new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0 });
  private chunks: { m: THREE.Mesh; v: THREE.Vector3; w: THREE.Vector3 }[] = [];
  private core: THREE.Mesh;
  private coreMat = new THREE.MeshBasicMaterial({ color: '#ffe6a0', transparent: true, opacity: 0, depthWrite: false });
  private ring: THREE.Mesh;
  private ringMat = new THREE.MeshBasicMaterial({ color: '#ffb3c6', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false });
  private moon: THREE.Mesh;
  private ship = new THREE.Group();
  private trail: { m: THREE.Mesh; t: number }[] = [];
  private trailMat = new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.8, depthWrite: false });
  private cabin = new THREE.Group();
  private cat: Cat;
  private owner: Actor;
  private debris: THREE.Group = new THREE.Group();
  private t = 0;
  private shake = 0;
  private fired = new Set<string>();
  private root: HTMLElement | null = null;
  private bubbles: { el: HTMLElement; at: () => THREE.Vector3 }[] = [];
  private done: (() => void) | null = null;
  active = false;

  constructor(private stage: Stage, private snd: FinaleSound, catDef: CatDef, acc: string[]) {
    const s = this.scene;
    s.background = new THREE.Color('#1d1636');
    s.add(new THREE.HemisphereLight(0xfff4e6, 0x6a5a9a, 1.6));
    const sun = new THREE.DirectionalLight(0xfff0dc, 2.2);
    sun.position.set(-6, 4, 8);
    s.add(sun);

    // stars all around
    const rand = rnd(7);
    const pos: number[] = [], col: number[] = [];
    const tint = ['#ffffff', '#ffe6a0', '#ffc7d9', '#c9d8ff'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 700; i++) {
      const d = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1).normalize().multiplyScalar(120 + rand() * 60);
      pos.push(d.x, d.y, d.z);
      const c = tint[i % tint.length]; col.push(c.r, c.g, c.b);
    }
    const sg = new THREE.BufferGeometry();
    sg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    sg.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    s.add(new THREE.Points(sg, new THREE.PointsMaterial({ size: 1.6, map: softDotTexture() ?? null, vertexColors: true, transparent: true, depthWrite: false, sizeAttenuation: true })));

    // the planet: vertex-coloured continents, a cloud shell
    const geo = new THREE.IcosahedronGeometry(R, 4);
    const pa = geo.getAttribute('position');
    const colors: number[] = [];
    const d = new THREE.Vector3();
    for (let i = 0; i < pa.count; i++) {
      d.fromBufferAttribute(pa, i).normalize();
      const c = landAt(d);
      colors.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.globe = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }));
    this.clouds = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 1.05, 2), new THREE.MeshLambertMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, flatShading: true, depthWrite: false }));
    this.earth.add(this.globe, this.clouds);
    s.add(this.earth);
    this.moon = mesh(sphere(0.55, 12, 9), M('#e4dcef'), { shadow: false });
    s.add(this.moon);

    // cracks: wandering lines that start at the base (facing us, a little low)
    const r2 = rnd(31);
    const start = new THREE.Vector3(0.15, -0.25, 1).normalize();
    for (let k = 0; k < 9; k++) {
      const pts: THREE.Vector3[] = [];
      const p = start.clone();
      const heading = new THREE.Vector3(r2() - 0.5, r2() - 0.5, r2() - 0.5).cross(p).normalize();
      for (let i = 0; i < 14; i++) {
        pts.push(p.clone().multiplyScalar(R * 1.012));
        heading.applyAxisAngle(p, (r2() - 0.5) * 0.9);
        p.addScaledVector(heading, 0.16 + r2() * 0.05).normalize();
        heading.sub(p.clone().multiplyScalar(heading.dot(p))).normalize();
      }
      const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.045, 4, false), this.crackMat);
      tube.userData.len = pts.length;
      tube.visible = false;
      this.cracks.push(tube);
      this.earth.add(tube);
    }

    // pre-cut chunks: they fill the globe and fly when it goes
    const r3 = rnd(97);
    const fib = 64;
    for (let i = 0; i < fib; i++) {
      const y = 1 - (i / (fib - 1)) * 2;
      const rr = Math.sqrt(1 - y * y);
      const th = i * 2.399963;
      const dir = new THREE.Vector3(Math.cos(th) * rr, y, Math.sin(th) * rr);
      const g = new THREE.DodecahedronGeometry(0.62 + r3() * 0.32, 0);
      const c = landAt(dir);
      const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: c, flatShading: true }));
      m.position.copy(dir).multiplyScalar(R * 0.78);
      m.rotation.set(r3() * 6, r3() * 6, r3() * 6);
      m.visible = false;
      this.chunks.push({ m, v: dir.clone().multiplyScalar(2.5 + r3() * 5).add(new THREE.Vector3(0, 0, 1.2)), w: new THREE.Vector3(r3() - 0.5, r3() - 0.5, r3() - 0.5).multiplyScalar(5) });
      this.earth.add(m);
    }
    this.core = new THREE.Mesh(new THREE.IcosahedronGeometry(R * 0.9, 2), this.coreMat);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), this.ringMat);
    this.ring.rotation.x = -1.15;
    this.earth.add(this.core, this.ring);

    // the escape ship: a pastel rocket with a round window
    const body = mesh(cyl(0.32, 0.36, 1.3, 14), M('#fff7ef'), { shadow: false });
    const nose = mesh(cone(0.32, 0.6, 14), M('#ff9fb8'), { pos: [0, 0.95, 0], shadow: false });
    const win = mesh(cyl(0.17, 0.17, 0.08, 14), M('#9fd8ff', { emissive: '#4aa3d8', emissiveIntensity: 0.6 }), { pos: [0, 0.2, 0.32], rot: [Math.PI / 2, 0, 0], shadow: false });
    const rim = mesh(torus(0.18, 0.035, 6, 16), M('#ffd23f'), { pos: [0, 0.2, 0.34], shadow: false });
    this.ship.add(body, nose, win, rim);
    for (let i = 0; i < 3; i++) {
      const fin = mesh(box(0.06, 0.45, 0.35, 0.02), M('#8ec5ff'), { shadow: false });
      const a = (i / 3) * Math.PI * 2;
      fin.position.set(Math.sin(a) * 0.36, -0.5, Math.cos(a) * 0.36);
      fin.rotation.y = a;
      this.ship.add(fin);
    }
    const flame = mesh(cone(0.22, 0.6, 10), new THREE.MeshBasicMaterial({ color: '#ffb347' }), { pos: [0, -0.95, 0], rot: [Math.PI, 0, 0], shadow: false });
    this.ship.add(flame);
    this.ship.visible = false;
    s.add(this.ship);

    // the cabin, far away from the planet: a porthole, a cushion, two passengers
    const cab = this.cabin;
    cab.position.set(400, 0, 0);
    const wall = mesh(sphere(6, 20, 14), M('#d9cdf2', { side: THREE.BackSide }), { shadow: false });
    wall.position.set(0, 2, 0);
    const floor = mesh(cyl(4.6, 4.6, 0.2, 24), M('#b9a8e0'), { pos: [0, -0.1, 0], shadow: false });
    const hole = mesh(cyl(1.55, 1.55, 0.1, 32), new THREE.MeshBasicMaterial({ color: '#1d1636' }), { pos: [0, 2.5, -3.9], rot: [Math.PI / 2, 0, 0], shadow: false });
    const frame = mesh(torus(1.6, 0.16, 8, 32), M('#ffd23f'), { pos: [0, 2.5, -3.85], shadow: false });
    const cushion = mesh(cyl(0.62, 0.68, 0.35, 16), M('#ff9fb8'), { pos: [0.42, 0.18, -0.7], shadow: false });
    cab.add(wall, floor, hole, frame, cushion);
    // what is left of the planet, drifting past the window
    this.debris.position.set(0, 2.5, -3.95);
    const r4 = rnd(5);
    for (let i = 0; i < 16; i++) {
      const c = [OCEAN, LAND, SAND][i % 3];
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.08 + r4() * 0.14, 0), new THREE.MeshBasicMaterial({ color: c }));
      m.position.set(r4() * 3 - 1.5, r4() * 2.4 - 1.2, 0);
      m.userData.v = 0.15 + r4() * 0.3;
      this.debris.add(m);
    }
    for (let i = 0; i < 26; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.04, 0.04), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
      m.position.set(r4() * 2.8 - 1.4, r4() * 2.8 - 1.4, -0.01);
      if (m.position.length() < 1.45) this.debris.add(m);
    }
    cab.add(this.debris);
    this.cat = new Cat(catDef, acc);
    this.cat.faceYaw = -0.25;
    this.cat.reset(new THREE.Vector3(0.42, 0.36, -0.7));
    cab.add(this.cat.group);
    this.owner = new Actor({ shirt: '#5b8def', pants: '#3b3f63' });
    this.owner.place(-0.55, 0, -2.3, Math.PI);
    cab.add(this.owner.group);
    const lamp = new THREE.PointLight(0xffe6c4, 18, 14);
    lamp.position.set(0, 4.5, 1.5);
    cab.add(lamp);
    s.add(cab);
  }

  /** plays the whole thing; skippable at once when `quick` (seen before), else after a moment */
  play(top: HTMLElement, quick: boolean): Promise<void> {
    return new Promise((res) => {
      this.done = res;
      this.active = true;
      this.t = 0;
      this.fired.clear();
      this.stage.overlayScene = this.scene;
      this.stage.overlayCamera = this.camera;
      this.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
      this.camera.updateProjectionMatrix();
      const e = h('div', 'finale');
      e.append(h('div', 'fflash'), h('div', 'fcap'), h('div', 'fbars'));
      const skip = btn('fskip', '건너뛰기 ▶', () => { this.snd.click(); this.finish(); });
      if (!quick) { skip.classList.add('later'); }
      e.append(skip);
      top.append(e);
      this.root = e;
    });
  }

  /** distance at which a sphere of radius r fills `frac` of the narrower screen side */
  private fit(r: number, frac: number) {
    const tanV = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    return r / (Math.min(tanV, tanV * this.camera.aspect) * frac);
  }

  private caption(text: string, cls = '') {
    const c = this.root?.querySelector('.fcap') as HTMLElement | null;
    if (!c) return;
    c.className = `fcap show ${cls}`;
    c.textContent = text;
  }

  private bubble(text: string, at: () => THREE.Vector3, cls: string) {
    if (!this.root) return;
    const el = h('div', `fbubble ${cls}`, text);
    this.root.append(el);
    this.bubbles.push({ el, at });
  }

  private once(key: string, t: number, f: () => void) {
    if (this.t >= t && !this.fired.has(key)) { this.fired.add(key); f(); }
  }

  private finish() {
    if (!this.active) return;
    this.active = false;
    this.stage.overlayScene = null;
    this.stage.overlayCamera = null;
    const e = this.root;
    this.root = null;
    this.bubbles = [];
    if (e) { e.classList.add('out'); setTimeout(() => e.remove(), 400); }
    const d = this.done;
    this.done = null;
    d?.();
  }

  update(dt: number) {
    if (!this.active) return;
    this.t += dt;
    const t = this.t;
    const cam = this.camera;
    this.earth.rotation.y += dt * (t < 4.6 ? 0.12 : 0.02);
    this.clouds.rotation.y += dt * 0.05;
    const ma = 2.2 + t * 0.3;
    this.moon.position.set(Math.cos(ma) * 5.2, 2.4 + Math.sin(ma) * 0.8, Math.sin(ma) * 5.2 - 3);

    // 1. calm, then the cracks run out from the base
    this.once('cap0', 0.3, () => this.caption('그날, 지구는 평화로웠다.'));
    this.once('crack', 1.6, () => { this.snd.rumble(0.7); this.caption('…아주 잠깐 동안은.'); });
    if (t >= 1.6 && t < 4.6) {
      const k = Math.min(1, (t - 1.6) / 2.6);
      this.crackMat.opacity = 0.4 + 0.6 * k;
      this.crackMat.color.setHSL(0.07 - k * 0.05, 1, 0.55 + Math.sin(t * 30) * 0.08 * k);
      this.cracks.forEach((c, i) => { c.visible = k * this.cracks.length > i * 0.8; });
      this.shake = 0.03 + k * 0.12;
      this.once('rumble2', 3.2, () => this.snd.rumble(1));
      this.earth.scale.setScalar(1 + Math.sin(t * 40) * 0.006 * k);
    }

    // 2. boom
    this.once('boom', 4.6, () => {
      this.snd.boom(); this.snd.boom();
      this.globe.visible = false; this.clouds.visible = false;
      this.cracks.forEach((c) => (c.visible = false));
      for (const c of this.chunks) c.m.visible = true;
      this.coreMat.opacity = 1;
      this.ringMat.opacity = 0.9;
      this.shake = 0.6;
      this.root?.querySelector('.fflash')?.classList.add('go');
      this.caption('콰광!!!', 'big');
    });
    if (t >= 4.6) {
      const u = t - 4.6;
      for (const c of this.chunks) {
        c.m.position.addScaledVector(c.v, dt);
        c.v.multiplyScalar(1 - dt * 0.25);
        c.m.rotation.x += c.w.x * dt; c.m.rotation.y += c.w.y * dt; c.m.rotation.z += c.w.z * dt;
      }
      this.core.scale.setScalar(1 + u * 1.8);
      this.coreMat.opacity = Math.max(0, 1 - u * 0.9);
      this.ring.scale.setScalar(1 + u * 9);
      this.ringMat.opacity = Math.max(0, 0.9 - u * 0.45);
      this.shake = Math.max(0, this.shake - dt * 0.35);
    }

    // 3. the little ship slips out of the cloud of rubble
    this.once('ship', 6.2, () => { this.ship.visible = true; this.snd.whoosh(1); this.caption('그 와중에…'); });
    if (t >= 6.2 && t < 8.8) {
      const u = (t - 6.2) / 2.6;
      const e = u * u * (3 - 2 * u);
      this.ship.position.set(-0.3 + e * 5.5, -0.4 + e * 9, 1 + e * 3);
      this.ship.rotation.set(-0.5, 0, -1.0 + e * 0.2);
      this.ship.rotateY(t * 6);
      if (Math.random() < dt * 30) {
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.1 + Math.random() * 0.08, 6, 4), this.trailMat);
        m.position.copy(this.ship.position).add(new THREE.Vector3(-0.4, -0.3, -0.4));
        this.scene.add(m);
        this.trail.push({ m, t: 0 });
      }
    }
    for (const p of this.trail) { p.t += dt; p.m.scale.setScalar(1 + Math.min(1, p.t) * 1.2); p.m.visible = p.t < 1.4; }
    this.trailMat.opacity = Math.max(0, 0.8 - Math.max(0, t - 8) * 0.8);

    // camera: slow push in, pull back at the boom, then cut to the cabin
    if (t < 8.8) {
      const near = this.fit(R, 0.62 + Math.min(1, t / 4.6) * 0.16), far = this.fit(R * 3.4, 0.95);
      const pull = t < 4.6 ? near : near + (far - near) * Math.min(1, (t - 4.6) / 1.4) ** 0.6;
      cam.position.set(Math.sin(t * 0.1) * 1.2, 1 + (t > 4.6 ? 1.5 : 0), pull);
      cam.lookAt(t > 6.2 ? this.ship.position.clone().multiplyScalar(0.3) : new THREE.Vector3(0, 0, 0));
    } else {
      this.once('cut', 8.8, () => {
        this.caption('');
        this.root?.querySelector('.fcap')?.classList.remove('show');
        this.root?.classList.add('cabin');
        for (const p of this.trail) this.scene.remove(p.m);
        this.trail = [];
        this.owner.lookYaw = 0;
        this.camera.fov = 50;
        this.camera.updateProjectionMatrix();
        this.snd.purr(2);
      });
      const u = Math.min(1, (t - 8.8) / 6);
      // frame the porthole, the owner behind and the cat in front, whatever the screen shape
      const tanV = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
      const d = Math.max(1.35 / (tanV * cam.aspect), 2.9 / tanV) * (1.04 - u * 0.06);
      const look = new THREE.Vector3(400 - 0.05, 1.75, -1.4);
      cam.position.set(look.x + 0.25 - u * 0.2, look.y + 0.55, look.z + d);
      cam.lookAt(look);
      this.cat.update(null, dt, dt);
      this.owner.update(null, dt);
      for (const m of this.debris.children) {
        if (m.userData.v === undefined) continue;
        m.position.x += m.userData.v * dt;
        if (m.position.x > 1.5) m.position.x = -1.5;
        m.visible = m.position.length() < 1.45;
        m.rotation.z += dt;
      }
      this.once('turn', 9.4, () => { this.owner.turnTo(0.42, -0.7).do('shock', 1.4).do('look', 4); });
      this.once('line1', 10.0, () => this.bubble('…너 여기서 뭐 해?', () => this.owner.headPos().add(new THREE.Vector3(0, 0.35, 0)), 'owner'));
      this.once('line2', 12.2, () => {
        this.snd.meow('ask', 1.1);
        this.bubble('냥? (난 아무것도 몰라요)', () => this.cat.group.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 1.25, 0)), 'cat');
      });
      this.once('end', END - 0.6, () => this.root?.classList.add('fade'));
      if (t >= END) this.finish();
    }

    // shake
    if (this.shake > 0) cam.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));

    // speech bubbles follow the heads
    for (const b of this.bubbles) {
      const p = b.at().project(cam);
      b.el.style.left = `${Math.min(76, Math.max(24, ((p.x + 1) / 2) * 100))}%`;
      b.el.style.top = `${((1 - p.y) / 2) * 100}%`;
    }
    if (this.t > 2.5) this.root?.querySelector('.fskip.later')?.classList.remove('later');
  }
}
