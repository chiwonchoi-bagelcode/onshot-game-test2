import * as THREE from 'three';
import { clamp, damp } from '../core/util';

export interface Framing {
  /** world points that must be visible */
  points: THREE.Vector3[];
  yaw: number;
  pitch: number;
  fov?: number;
}

/**
 * Owns the WebGL renderer, the diorama camera and the lights.
 * The camera is fixed (whole room visible), with shake + punch zoom for juice.
 */
export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly canvas: HTMLCanvasElement;

  private framing: Framing | null = null;
  private baseTarget = new THREE.Vector3();
  private baseDist = 20;
  private dirVec = new THREE.Vector3();
  private shakeAmt = 0;
  private shakeT = 0;
  private kick = 0;
  private focus: THREE.Vector3 | null = null;
  private focusAmt = 0;
  private focusCur = 0;
  private focusPoint = new THREE.Vector3();
  /** UI insets in CSS px */
  insetTop = 120;
  insetBottom = 70;
  pixelRatio = 1;
  private maxPixelRatio = 2;
  private fpsAcc = 0;
  private fpsFrames = 0;
  private lowFpsStreak = 0;

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

    this.camera = new THREE.PerspectiveCamera(30, 1, 0.5, 200);

    this.hemi = new THREE.HemisphereLight(0xfff4e6, 0x8a6fa8, 1.35);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight(0xfff0dc, 1.9);
    this.sun.position.set(-6, 16, 10);
    this.sun.castShadow = true;
    const sm = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 1024 : 2048;
    this.sun.shadow.mapSize.set(sm, sm);
    const sc = this.sun.shadow.camera;
    sc.left = -10; sc.right = 10; sc.top = 10; sc.bottom = -10; sc.near = 1; sc.far = 50;
    this.sun.shadow.bias = -0.0008;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  setLighting(sky: number, ground: number, hemiI: number, sunColor: number, sunI: number, sunPos: [number, number, number]) {
    this.hemi.color.setHex(sky);
    this.hemi.groundColor.setHex(ground);
    this.hemi.intensity = hemiI;
    this.sun.color.setHex(sunColor);
    this.sun.intensity = sunI;
    this.sun.position.set(...sunPos);
    this.sun.target.position.set(0, 0, 0);
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = w + 'px';
    this.canvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.framing) this.frame(this.framing);
  }

  /** Fit the camera so all framing points are visible inside the UI-free area. */
  frame(f: Framing) {
    this.framing = f;
    const cam = this.camera;
    cam.fov = f.fov ?? 30;
    cam.updateProjectionMatrix();
    const h = window.innerHeight;
    const top = 1 - (2 * this.insetTop) / h;
    const bottom = -1 + (2 * this.insetBottom) / h;
    const sideMargin = 0.985;
    this.dirVec.set(
      Math.sin(f.yaw) * Math.cos(f.pitch),
      Math.sin(f.pitch),
      Math.cos(f.yaw) * Math.cos(f.pitch),
    );
    const target = new THREE.Vector3();
    for (const p of f.points) target.add(p);
    target.multiplyScalar(1 / f.points.length);
    let dist = 30;
    const right = new THREE.Vector3(), up = new THREE.Vector3();
    const v = new THREE.Vector3();
    for (let iter = 0; iter < 12; iter++) {
      cam.position.copy(target).addScaledVector(this.dirVec, dist);
      cam.lookAt(target);
      cam.updateMatrixWorld();
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (const p of f.points) {
        v.copy(p).project(cam);
        minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x);
        minY = Math.min(minY, v.y); maxY = Math.max(maxY, v.y);
      }
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      const wantCy = (top + bottom) / 2;
      const halfH = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2)) * dist;
      const halfW = halfH * cam.aspect;
      right.setFromMatrixColumn(cam.matrixWorld, 0);
      up.setFromMatrixColumn(cam.matrixWorld, 1);
      target.addScaledVector(right, cx * halfW).addScaledVector(up, (cy - wantCy) * halfH);
      const sx = (maxX - minX) / (2 * sideMargin);
      const sy = (maxY - minY) / (top - bottom);
      const s = Math.max(sx, sy);
      dist *= clamp(s, 0.5, 2);
    }
    this.baseTarget.copy(target);
    this.baseDist = dist;
    this.applyCamera(0);
  }

  shake(amount: number) {
    this.shakeAmt = Math.min(1.2, Math.max(this.shakeAmt, amount));
  }

  punch(amount: number) {
    this.kick = Math.min(3, this.kick + amount);
  }

  /** gently lean the camera toward a point (used for the ending) */
  setFocus(p: THREE.Vector3 | null, amount = 0.35) {
    this.focus = p;
    if (p) this.focusPoint.copy(p);
    this.focusAmt = p ? amount : 0;
  }

  private applyCamera(dt: number) {
    const cam = this.camera;
    this.focusCur = damp(this.focusCur, this.focusAmt, 3, dt || 1);
    const target = this.baseTarget.clone();
    let dist = this.baseDist;
    if (this.focusCur > 0.001) {
      target.lerp(this.focusPoint, this.focusCur);
      dist *= 1 - this.focusCur * 0.8;
    }
    cam.position.copy(target).addScaledVector(this.dirVec, dist);
    cam.lookAt(target);
    if (this.shakeAmt > 0.001) {
      this.shakeT += dt * 60;
      const a = this.shakeAmt * this.shakeAmt * 0.35;
      cam.position.x += (Math.sin(this.shakeT * 1.7) + Math.sin(this.shakeT * 3.1)) * a;
      cam.position.y += (Math.sin(this.shakeT * 2.3 + 1) + Math.sin(this.shakeT * 4.3)) * a;
      cam.position.z += Math.sin(this.shakeT * 2.9 + 2) * a;
    }
    const baseFov = this.framing?.fov ?? 30;
    cam.fov = baseFov - this.kick * 0.6;
    cam.updateProjectionMatrix();
  }

  update(dt: number) {
    this.shakeAmt = Math.max(0, this.shakeAmt - dt * 2.4);
    this.kick = damp(this.kick, 0, 7, dt);
    if (this.focus) this.focusPoint.copy(this.focus);
    this.applyCamera(dt);
    this.adaptResolution(dt);
  }

  /** drop pixel ratio if the device struggles (keeps big crashes smooth) */
  private adaptResolution(dt: number) {
    this.fpsAcc += dt; this.fpsFrames++;
    if (this.fpsAcc < 1) return;
    const fps = this.fpsFrames / this.fpsAcc;
    this.fpsAcc = 0; this.fpsFrames = 0;
    if (fps < 42) this.lowFpsStreak++; else this.lowFpsStreak = 0;
    if (this.lowFpsStreak >= 2 && this.pixelRatio > 1) {
      this.pixelRatio = Math.max(1, this.pixelRatio - 0.25);
      this.renderer.setPixelRatio(this.pixelRatio);
      this.lowFpsStreak = 0;
    }
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  /** world -> CSS pixel coordinates */
  toScreen(p: THREE.Vector3, out = new THREE.Vector2()): THREE.Vector2 {
    const v = p.clone().project(this.camera);
    out.set((v.x * 0.5 + 0.5) * window.innerWidth, (-v.y * 0.5 + 0.5) * window.innerHeight);
    return out;
  }
}
