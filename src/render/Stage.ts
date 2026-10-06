import * as THREE from 'three';
import { clamp, damp } from '../core/util';

export interface Framing {
  /** world points that must be visible in the overview */
  points: THREE.Vector3[];
  /** walkable bounds (camera target is clamped inside) */
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  yaw: number;
  pitch: number;
  fov?: number;
}

/** how wide (world units) a comfortable play view is */
const PLAY_WIDTH = 11.5;

/**
 * Owns the WebGL renderer, the diorama camera rig and the lights.
 * Small rooms are shown whole; big houses get a zoomed play view the player
 * can pan / pinch, that also follows the chaos and can toggle to an overview.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly canvas: HTMLCanvasElement;
  /** an alternative scene to render instead (cat room / showcases) */
  overlayScene: THREE.Scene | null = null;
  overlayCamera: THREE.PerspectiveCamera | null = null;

  private framing: Framing | null = null;
  private dir = new THREE.Vector3();
  private sunOffset = new THREE.Vector3(-6, 16, 10);
  readonly target = new THREE.Vector3();
  dist = 30;
  private wantTarget = new THREE.Vector3();
  private wantDist = 30;
  private ovTarget = new THREE.Vector3();
  ovDist = 30;
  playDist = 30;
  /** big house: play view is a zoomed sub-view */
  roomy = false;
  overview = false;
  private lastManual = -100;
  private clock = 0;
  private shakeAmt = 0;
  private shakeT = 0;
  private kick = 0;
  private focus: THREE.Vector3 | null = null;
  private focusAmt = 0;
  private focusCur = 0;
  private shadowHalf = 10;
  /** UI insets in CSS px */
  insetTop = 120;
  insetBottom = 70;
  pixelRatio = 1;
  private maxPixelRatio = 2;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private lowFpsStreak = 0;
  private highFpsStreak = 0;
  fps = 60;
  /** cinematic offsets that ease back to 0 (fly-ins) and an idle sway (title / map) */
  private yawOff = 0;
  private pitchOff = 0;
  swayAmp = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.maxPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 300);

    this.hemi = new THREE.HemisphereLight(0xfff4e6, 0x8a6fa8, 1.35);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0dc, 1.9);
    this.sun.castShadow = true;
    const mobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const sm = mobile ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    this.setShadowHalf(10);
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  private setShadowHalf(h: number) {
    this.shadowHalf = h;
    const sc = this.sun.shadow.camera;
    sc.left = -h; sc.right = h; sc.top = h; sc.bottom = -h; sc.near = 1; sc.far = 60;
    sc.updateProjectionMatrix();
  }

  setLighting(sky: number, ground: number, hemiI: number, sunColor: number, sunI: number, sunPos: [number, number, number]) {
    this.hemi.color.setHex(sky);
    this.hemi.groundColor.setHex(ground);
    this.hemi.intensity = hemiI;
    this.sun.color.setHex(sunColor);
    this.sun.intensity = sunI;
    this.sunOffset.set(...sunPos);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.applyViewOffset();
    if (this.framing) this.setLevel(this.framing, true);
    if (this.overlayCamera) { this.overlayCamera.aspect = w / h; this.overlayCamera.updateProjectionMatrix(); }
  }

  private applyViewOffset() {
    const w = window.innerWidth, h = window.innerHeight;
    // shift the principal point to the centre of the area not covered by the HUD
    this.camera.setViewOffset(w, h, 0, -(this.insetTop - this.insetBottom) / 2, w, h);
    this.camera.updateProjectionMatrix();
  }

  setInsets(top: number, bottom: number) {
    this.insetTop = top; this.insetBottom = bottom;
    this.applyViewOffset();
    if (this.framing) this.setLevel(this.framing, true);
  }

  private place(target: THREE.Vector3, dist: number) {
    this.camera.position.copy(target).addScaledVector(this.dir, dist);
    this.camera.lookAt(target);
    this.camera.updateMatrixWorld();
  }

  /** fit points into the usable screen area; returns target + distance */
  private fit(points: THREE.Vector3[], margin = 0.985): { target: THREE.Vector3; dist: number } {
    const cam = this.camera;
    const h = window.innerHeight;
    const usableH = (h - this.insetTop - this.insetBottom) / h;
    const target = new THREE.Vector3();
    for (const p of points) target.add(p);
    target.multiplyScalar(1 / points.length);
    let dist = 40;
    const right = new THREE.Vector3(), up = new THREE.Vector3(), v = new THREE.Vector3();
    for (let iter = 0; iter < 14; iter++) {
      this.place(target, dist);
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of points) {
        v.copy(p).project(cam);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
      // centre in the usable area (principal point already sits at its centre)
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2 + (this.insetTop - this.insetBottom) / h;
      const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist;
      const halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.addScaledVector(right, cx * halfW).addScaledVector(up, cy * halfH);
      const sx = (maxX - minX) / (2 * margin);
      const sy = (maxY - minY) / (2 * usableH);
      dist *= clamp(Math.max(sx, sy), 0.5, 2);
    }
    return { target, dist };
  }

  /** a new level: compute overview + comfortable play distance */
  setLevel(f: Framing, keepView = false) {
    this.framing = f;
    this.camera.fov = f.fov ?? 30;
    this.applyViewOffset();
    if (!keepView) { this.yawOff = 0; this.pitchOff = 0; }
    this.dir.set(Math.sin(f.yaw) * Math.cos(f.pitch), Math.sin(f.pitch), Math.cos(f.yaw) * Math.cos(f.pitch));
    const ov = this.fit(f.points);
    this.ovTarget.copy(ov.target);
    this.ovDist = ov.dist;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.playDist = Math.min(this.ovDist, PLAY_WIDTH / 2 / (halfFov * Math.max(0.42, Math.min(this.camera.aspect, 0.75))));
    this.roomy = this.ovDist > this.playDist * 1.12;
    if (!keepView) {
      this.overview = !this.roomy;
      this.target.copy(this.ovTarget); this.dist = this.ovDist;
      this.wantTarget.copy(this.ovTarget); this.wantDist = this.ovDist;
    } else if (!this.roomy) {
      this.target.copy(this.ovTarget); this.dist = this.ovDist;
      this.wantTarget.copy(this.ovTarget); this.wantDist = this.ovDist;
    } else if (this.overview) {
      this.wantTarget.copy(this.ovTarget); this.wantDist = this.ovDist;
    } else {
      this.wantDist = Math.min(this.wantDist, this.ovDist);
    }
    if (keepView) this.updateDir();
    this.applyCamera(0);
  }

  /** zoomed play view centred on a point (big houses) */
  lookAtPoint(p: THREE.Vector3, instant = false, dist?: number) {
    if (!this.roomy) return;
    this.overview = false;
    this.wantTarget.set(p.x, Math.min(p.y, 2), p.z);
    this.wantDist = dist ?? this.playDist;
    this.clampWant();
    if (instant) { this.target.copy(this.wantTarget); this.dist = this.wantDist; }
  }

  showOverview(on: boolean) {
    if (!this.roomy) return;
    this.overview = on;
    if (on) { this.wantTarget.copy(this.ovTarget); this.wantDist = this.ovDist; }
    else { this.wantDist = this.playDist; }
  }

  private clampWant() {
    const b = this.framing?.bounds;
    if (!b) return;
    this.wantTarget.x = clamp(this.wantTarget.x, b.minX + 1, b.maxX - 1);
    this.wantTarget.z = clamp(this.wantTarget.z, b.minZ + 1, b.maxZ + 0.5);
    this.wantDist = clamp(this.wantDist, this.playDist * 0.6, this.ovDist * 1.02);
  }

  /** drag on empty space pans the view */
  pan(dxPx: number, dyPx: number) {
    if (!this.roomy && this.dist >= this.ovDist * 0.98) return;
    const h = window.innerHeight;
    const worldPerPx = (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * this.dist) / h;
    const right = new THREE.Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0).setY(0).normalize();
    const fwd = new THREE.Vector3(-this.dir.x, 0, -this.dir.z).normalize();
    const pitchK = 1 / Math.max(0.4, Math.sin(this.framing?.pitch ?? 0.7));
    this.wantTarget.addScaledVector(right, -dxPx * worldPerPx).addScaledVector(fwd, dyPx * worldPerPx * pitchK);
    this.overview = false;
    this.clampWant();
    this.target.copy(this.wantTarget);
    this.lastManual = this.clock;
  }

  zoomBy(f: number) {
    this.wantDist *= f;
    this.clampWant();
    if (!this.roomy) {
      // small rooms can still zoom in a bit to look closely, but never pan away
      this.wantDist = clamp(this.wantDist, this.ovDist * 0.62, this.ovDist);
      if (this.wantDist > this.ovDist * 0.98) this.wantTarget.copy(this.ovTarget);
    }
    this.overview = this.wantDist > this.ovDist * 0.95;
    this.lastManual = this.clock;
  }

  zoomTo(d: number) { this.zoomBy(d / this.wantDist); }

  zoomedIn() { return this.dist < this.ovDist * 0.97; }

  /** follow whatever is flying around (big houses only) */
  track(box: THREE.Box3, n: number) {
    if (!this.roomy || n === 0 || this.clock - this.lastManual < 2.2 || this.overview) return;
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    this.wantTarget.lerp(new THREE.Vector3(c.x, Math.min(c.y, 2), c.z), 0.08);
    const need = Math.max(size.x, size.z * 1.2) + 4;
    const halfFov = Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    const d = need / 2 / (halfFov * Math.max(0.42, Math.min(this.camera.aspect, 0.75)));
    this.wantDist = Math.max(this.wantDist * 0.995, clamp(d, this.playDist, this.ovDist));
    this.clampWant();
  }

  shake(amount: number) { this.shakeAmt = Math.min(1.2, Math.max(this.shakeAmt, amount)); }
  punch(amount: number) { this.kick = Math.min(3, this.kick + amount); }

  /** lean the camera toward a point (endings, reveals) */
  setFocus(p: THREE.Vector3 | null, amount = 0.35) {
    this.focus = p;
    this.focusAmt = p ? amount : 0;
  }

  /** swoop in from far away and from another angle (entering a new space) */
  flyIn(distK = 2.6, yaw = 1.1, pitch = 0.35) {
    this.dist *= distK;
    this.yawOff = yaw;
    this.pitchOff = pitch;
  }

  private updateDir() {
    const f = this.framing;
    if (!f) return;
    const sway = this.swayAmp ? Math.sin(this.clock * 0.18) * this.swayAmp : 0;
    const yaw = f.yaw + this.yawOff + sway;
    const pitch = clamp(f.pitch + this.pitchOff, 0.15, 1.45);
    this.dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
  }

  private applyCamera(dt: number) {
    const cam = this.camera;
    if (dt > 0 && (Math.abs(this.yawOff) > 1e-4 || Math.abs(this.pitchOff) > 1e-4 || this.swayAmp)) {
      this.yawOff = damp(this.yawOff, 0, 1.5, dt);
      this.pitchOff = damp(this.pitchOff, 0, 1.5, dt);
      this.updateDir();
    }
    if (dt > 0) {
      this.target.x = damp(this.target.x, this.wantTarget.x, 5, dt);
      this.target.y = damp(this.target.y, this.wantTarget.y, 5, dt);
      this.target.z = damp(this.target.z, this.wantTarget.z, 5, dt);
      this.dist = damp(this.dist, this.wantDist, 4, dt);
    }
    this.focusCur = damp(this.focusCur, this.focusAmt, 3, dt || 1);
    const target = this.target.clone();
    let dist = this.dist;
    if (this.focusCur > 0.001 && this.focus) {
      target.lerp(this.focus, this.focusCur);
      dist *= 1 - this.focusCur * 0.8;
    }
    cam.position.copy(target).addScaledVector(this.dir, dist);
    cam.lookAt(target);
    if (this.shakeAmt > 0.001) {
      this.shakeT += dt * 60;
      const a = this.shakeAmt * this.shakeAmt * 0.35 * (dist / 45);
      cam.position.x += (Math.sin(this.shakeT * 1.7) + Math.sin(this.shakeT * 3.1)) * a;
      cam.position.y += (Math.sin(this.shakeT * 2.3 + 1) + Math.sin(this.shakeT * 4.3)) * a;
      cam.position.z += Math.sin(this.shakeT * 2.9 + 2) * a;
    }
    const baseFov = this.framing?.fov ?? 30;
    cam.fov = baseFov - this.kick * 0.6;
    cam.updateProjectionMatrix();
    // shadows follow the view
    const halfW = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist * Math.max(cam.aspect, 0.6);
    const want = clamp(halfW * 1.25, 8, 22);
    if (Math.abs(want - this.shadowHalf) > 1) this.setShadowHalf(want);
    this.sun.position.copy(target).add(this.sunOffset);
    this.sun.target.position.copy(target);
  }

  update(dt: number) {
    this.clock += dt;
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.4);
    this.kick = damp(this.kick, 0, 7, dt);
    this.applyCamera(dt);
    this.adaptResolution(dt);
  }

  /** battery saver: no shadows, 1x resolution */
  lowGfx = false;
  /** shadows were switched off automatically because the device struggled */
  autoLow = false;
  private veryLowStreak = 0;

  setLowGfx(on: boolean) {
    if (this.lowGfx === on && !this.autoLow) return;
    this.lowGfx = on;
    this.autoLow = false;
    this.applyShadows(!on);
    this.maxPixelRatio = on ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.pixelRatio = Math.min(this.pixelRatio, this.maxPixelRatio);
    if (!on) this.pixelRatio = this.maxPixelRatio;
    this.renderer.setPixelRatio(this.pixelRatio);
  }

  private applyShadows(on: boolean) {
    if (this.renderer.shadowMap.enabled === on) return;
    this.renderer.shadowMap.enabled = on;
    this.sun.castShadow = on;
    const touch = (o: THREE.Object3D) => {
      const m = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined;
      if (m) (Array.isArray(m) ? m : [m]).forEach((x) => { x.needsUpdate = true; });
    };
    this.scene.traverse(touch);
    this.overlayScene?.traverse(touch);
  }

  /** drop (or restore) pixel ratio to hold the frame rate */
  private adaptResolution(dt: number) {
    this.fpsAcc += dt; this.fpsFrames++;
    if (this.fpsAcc < 1) return;
    const fps = this.fpsFrames / this.fpsAcc;
    this.fps = fps;
    this.fpsAcc = 0; this.fpsFrames = 0;
    // still struggling at 1x: shadows go (auto battery saver)
    if (fps < 40 && this.pixelRatio <= 1 && !this.lowGfx) { if (++this.veryLowStreak >= 4 && !this.autoLow) { this.autoLow = true; this.applyShadows(false); } } else this.veryLowStreak = 0;
    if (fps < 50) { this.lowFpsStreak++; this.highFpsStreak = 0; } else if (fps > 58) { this.highFpsStreak++; this.lowFpsStreak = 0; }
    if (this.lowFpsStreak >= 2 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.lowFpsStreak = 0;
    } else if (this.highFpsStreak >= 8 && this.pixelRatio < this.maxPixelRatio) {
      this.pixelRatio = Math.min(this.maxPixelRatio, this.pixelRatio + 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.highFpsStreak = 0;
    }
  }

  render() {
    if (this.overlayScene && this.overlayCamera) this.renderer.render(this.overlayScene, this.overlayCamera);
    else this.renderer.render(this.scene, this.camera);
  }

  /** world -> CSS pixel coordinates */
  toScreen(p: THREE.Vector3, out = new THREE.Vector2()): THREE.Vector2 {
    const v = p.clone().project(this.camera);
    out.set((v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight);
    return out;
  }

  /** is a world point on screen (with a margin in px) */
  onScreen(p: THREE.Vector3, margin = 0): boolean {
    const s = this.toScreen(p);
    return s.x > margin && s.x < window.innerWidth - margin && s.y > this.insetTop + margin && s.y < window.innerHeight - this.insetBottom - margin;
  }
}
