import * as THREE from 'three';
import { THEME_STYLE, type Theme } from '../../src/levels/rooms';

export interface CamState { pos: THREE.Vector3; look: THREE.Vector3; fov: number; roll?: number }

/**
 * Trailer renderer: the game's scene graph, rendered with our own cinema
 * camera at a fixed output size, then composited (background gradient,
 * overlays, grading) onto a 2D canvas that becomes the video frame.
 */
export class View {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly hemi: THREE.HemisphereLight;
  readonly sun: THREE.DirectionalLight;
  readonly out: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  private sunOffset = new THREE.Vector3(-6, 16, 10);
  bg: [string, string] = ['#ffe2b8', '#ffb3a7'];
  /** render scale (supersampling factor for the WebGL pass) */
  readonly ss: number;

  constructor(readonly width: number, readonly height: number, ss = 1) {
    this.ss = ss;
    const gl = document.getElementById('gl') as HTMLCanvasElement;
    this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width * ss, height * ss, false);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(30, width / height, 0.3, 400);
    this.hemi = new THREE.HemisphereLight(0xfff4e6, 0x8a6fa8, 1.35);
    this.sun = new THREE.DirectionalLight(0xfff0dc, 1.9);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(4096, 4096);
    this.sun.shadow.bias = -0.0006;
    this.sun.shadow.normalBias = 0.02;
    this.sun.shadow.radius = 3;
    this.scene.add(this.hemi, this.sun, this.sun.target);
    this.out = document.getElementById('out') as HTMLCanvasElement;
    this.out.width = width; this.out.height = height;
    this.ctx = this.out.getContext('2d', { alpha: false })!;
  }

  theme(t: Theme) {
    const st = THEME_STYLE[t];
    this.bg = st.bg;
    this.hemi.color.setHex(st.hemi[0]);
    this.hemi.groundColor.setHex(st.hemi[1]);
    this.hemi.intensity = st.hemi[2];
    this.sun.color.setHex(st.sun[0]);
    this.sun.intensity = st.sun[1];
    this.sunOffset.set(...st.sun[2]);
  }

  /** place the camera; shadows follow the point of interest */
  setCamera(c: CamState, shadowHalf = 10) {
    const cam = this.camera;
    cam.fov = c.fov;
    cam.position.copy(c.pos);
    cam.up.set(0, 1, 0);
    cam.lookAt(c.look);
    if (c.roll) cam.rotateZ(c.roll);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
    const sc = this.sun.shadow.camera;
    if (Math.abs(sc.right - shadowHalf) > 0.01) {
      sc.left = -shadowHalf; sc.right = shadowHalf; sc.top = shadowHalf; sc.bottom = -shadowHalf; sc.near = 1; sc.far = 80;
      sc.updateProjectionMatrix();
    }
    this.sun.position.copy(c.look).add(this.sunOffset);
    this.sun.target.position.copy(c.look);
    this.sun.target.updateMatrixWorld();
  }

  /** world → output pixel coordinates (z>1 means behind the camera) */
  project(p: THREE.Vector3): { x: number; y: number; z: number } {
    const v = p.clone().project(this.camera);
    return { x: (v.x * 0.5 + 0.5) * this.width, y: (-v.y * 0.5 + 0.5) * this.height, z: v.z };
  }

  /** render the 3D pass and composite it over the background */
  render3D(bgOverride?: [string, string]) {
    this.renderer.render(this.scene, this.camera);
    const ctx = this.ctx, w = this.width, h = this.height;
    const [c0, c1] = bgOverride ?? this.bg;
    const g = ctx.createRadialGradient(w * 0.5, h * 0.32, 0, w * 0.5, h * 0.32, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, c0); g.addColorStop(1, c1);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.renderer.domElement, 0, 0, w, h);
  }

  /** soft vignette + slight warm grade */
  grade(vignette = 0.28) {
    const ctx = this.ctx, w = this.width, h = this.height;
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    g.addColorStop(0, 'rgba(40,20,50,0)');
    g.addColorStop(1, `rgba(40,20,50,${vignette})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  fade(color: string, a: number) {
    if (a <= 0) return;
    const ctx = this.ctx;
    ctx.globalAlpha = Math.min(1, a);
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, this.width, this.height);
    ctx.globalAlpha = 1;
  }
}
