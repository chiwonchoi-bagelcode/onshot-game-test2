import * as THREE from 'three';
import { clamp, damp } from '../core/util';
import type { Prop } from './Prop';

/** Aim arrow, selection outline and target markers. */
export class Aim {
  readonly group = new THREE.Group();
  private arrow = new THREE.Group();
  private shaft: THREE.Mesh;
  private head: THREE.Mesh;
  private ring: THREE.Mesh;
  private arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.95, depthTest: false });
  private arrowEdge = new THREE.MeshBasicMaterial({ color: 0x3b2a4a, transparent: true, opacity: 0.9, depthTest: false });
  private shaftEdge: THREE.Mesh;
  private headEdge: THREE.Mesh;
  private ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false });
  private outlineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
  private outline: THREE.Object3D[] = [];
  private selected: Prop | null = null;
  private t = 0;
  private len = 0;
  private wantLen = 0;
  private ringBase = 1;
  visible = false;

  private markers: { prop: Prop; obj: THREE.Group; spin: THREE.Object3D; pop: number }[] = [];
  private markerMat = new THREE.MeshLambertMaterial({ color: 0xff4f6d, emissive: 0x7a0f22, flatShading: true });
  private markerRingMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false });
  private guardMat = new THREE.MeshLambertMaterial({ color: 0x4f86c6, emissive: 0x13305a, flatShading: true });

  private hints: THREE.Mesh[] = [];
  private hintMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide });
  private hintT = 0;

  constructor() {
    const shaftGeo = new THREE.BoxGeometry(1, 0.02, 0.3);
    shaftGeo.translate(0.5, 0, 0);
    this.shaft = new THREE.Mesh(shaftGeo, this.arrowMat);
    const edgeGeo = new THREE.BoxGeometry(1, 0.02, 0.46);
    edgeGeo.translate(0.5, 0, 0);
    this.shaftEdge = new THREE.Mesh(edgeGeo, this.arrowEdge);
    const mkHead = (s: number) => {
      const hs = new THREE.Shape();
      hs.moveTo(0, -0.45 * s); hs.lineTo(0.7 * s, 0); hs.lineTo(0, 0.45 * s); hs.lineTo(0, -0.45 * s);
      const geo = new THREE.ShapeGeometry(hs);
      geo.rotateX(-Math.PI / 2);
      return geo;
    };
    this.head = new THREE.Mesh(mkHead(1), this.arrowMat);
    this.headEdge = new THREE.Mesh(mkHead(1.35), this.arrowEdge);
    this.headEdge.position.x = -0.12;
    this.shaftEdge.renderOrder = 19; this.headEdge.renderOrder = 19;
    this.arrow.add(this.shaftEdge, this.headEdge);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 28), this.ringMat);
    this.ring.rotation.x = -Math.PI / 2;
    this.arrow.add(this.shaft, this.head);
    for (const m of [this.shaft, this.head, this.ring]) m.renderOrder = 20;
    this.group.add(this.arrow, this.ring);
    this.arrow.visible = false;
    this.ring.visible = false;
  }

  select(p: Prop | null) {
    if (this.selected === p) return;
    for (const o of this.outline) o.parent?.remove(o);
    this.outline = [];
    this.selected = p;
    if (!p) { this.ring.visible = false; return; }
    p.group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.noOutline) return;
      const geo = m.geometry;
      if (!geo.boundingBox) geo.computeBoundingBox();
      const size = new THREE.Vector3();
      geo.boundingBox!.getSize(size);
      const c = new THREE.Vector3();
      geo.boundingBox!.getCenter(c);
      const s = new THREE.Vector3(
        1 + 0.09 / Math.max(0.05, size.x * Math.abs(m.scale.x)),
        1 + 0.09 / Math.max(0.05, size.y * Math.abs(m.scale.y)),
        1 + 0.09 / Math.max(0.05, size.z * Math.abs(m.scale.z)),
      );
      const ol = new THREE.Mesh(geo, this.outlineMat);
      ol.scale.copy(s);
      ol.position.copy(c).multiply(new THREE.Vector3(1 - s.x, 1 - s.y, 1 - s.z));
      ol.userData.noOutline = true;
      ol.castShadow = false;
      m.add(ol);
      this.outline.push(ol);
    });
    this.ring.visible = true;
    this.ringBase = p.radius + 0.35;
    const t = p.body.translation();
    this.ring.position.set(t.x, t.y + 0.06, t.z);
    this.t = 0;
  }

  /** show the swat arrow from `base` in direction `dir` with 0..1 power */
  show(base: THREE.Vector3, dir: THREE.Vector3, power: number, radius: number) {
    this.visible = true;
    this.arrow.visible = power > 0.01;
    const start = radius + 0.25;
    this.wantLen = 0.9 + power * 2.6;
    this.arrow.position.copy(base).addScaledVector(dir, start);
    this.arrow.position.y += 0.08;
    this.arrow.rotation.set(0, Math.atan2(-dir.z, dir.x), 0);
    const c = new THREE.Color().setHSL(clamp(0.15 - power * 0.15, 0, 0.15), 1, 0.58);
    this.arrowMat.color.copy(c);
    this.ring.position.copy(base); this.ring.position.y += 0.06;
    this.ringBase = radius + 0.35;
  }

  hideArrow() { this.arrow.visible = false; this.visible = false; }

  hide() {
    this.hideArrow();
    this.select(null);
    this.clearMarkers();
    this.clearHints();
  }

  /* ---------------------------- target markers ---------------------------- */

  addMarker(p: Prop, kind: 'target' | 'guard' = 'target') {
    const g = new THREE.Group();
    const guard = kind === 'guard';
    // targets: a red pin; protected things: a blue shield
    const pin = guard ? new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.1, 6), this.guardMat) : new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.55, 4), this.markerMat);
    pin.rotation.x = guard ? Math.PI / 2 : Math.PI;
    if (guard) pin.position.y = 0.2;
    const ballM = guard ? new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), this.markerRingMat) : new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), this.markerMat);
    ballM.position.set(0, guard ? 0.2 : 0.42, guard ? 0.07 : 0);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 20), this.markerRingMat);
    ring.rotation.x = -Math.PI / 2;
    const spin = new THREE.Group();
    spin.add(pin, ballM);
    g.add(spin, ring);
    for (const m of [pin, ballM]) { m.castShadow = false; m.userData.noOutline = true; }
    ring.userData.noOutline = true;
    g.renderOrder = 15;
    this.group.add(g);
    this.markers.push({ prop: p, obj: g, spin, pop: 0 });
  }

  clearMarkers() {
    for (const m of this.markers) this.group.remove(m.obj);
    this.markers = [];
  }

  /* ---------------------------- interactable hints ---------------------------- */

  showHints(props: Prop[]) {
    this.clearHints();
    for (const p of props) {
      const r = new THREE.Mesh(new THREE.RingGeometry(0.8, 1, 24), this.hintMat);
      r.rotation.x = -Math.PI / 2;
      r.userData.prop = p;
      r.renderOrder = 12;
      this.group.add(r);
      this.hints.push(r);
    }
    this.hintT = 0;
  }

  clearHints() {
    for (const h of this.hints) this.group.remove(h);
    this.hints = [];
  }

  update(dt: number) {
    this.t += dt;
    this.len = damp(this.len, this.wantLen, 18, dt);
    this.shaft.scale.x = this.len;
    this.shaftEdge.scale.x = this.len;
    this.head.position.x = this.len;
    this.headEdge.position.x = this.len - 0.12;
    const pulse = 1 + Math.sin(this.t * 10) * 0.06;
    if (this.ring.visible) {
      this.ringMat.opacity = 0.65 + Math.sin(this.t * 8) * 0.25;
      this.ring.scale.setScalar(this.ringBase * pulse);
    }

    for (const m of this.markers) {
      const p = m.prop;
      if (!p.alive || p.broken || p.damaged) {
        m.pop += dt * 4;
        m.obj.scale.setScalar(Math.max(0, 1 - m.pop) * (1 + m.pop));
        continue;
      }
      const c = p.center(new THREE.Vector3());
      const small = this.markers.length > 4;
      const top = c.y + Math.max(0.5, p.height * 0.5) + (small ? 0.45 : 0.75);
      m.obj.position.set(c.x, top + Math.sin(this.t * 3 + m.prop.id) * 0.12, c.z);
      if (small) m.obj.scale.setScalar(0.6);
      m.spin.rotation.y += dt * 2.2;
      (m.obj.children[1] as THREE.Object3D).scale.setScalar(1 + ((this.t * 0.9) % 1) * 0.6);
      this.markerRingMat.opacity = 0.85 * (1 - ((this.t * 0.9) % 1));
    }

    if (this.hints.length) {
      this.hintT += dt;
      const a = this.hintT < 0.3 ? this.hintT / 0.3 : Math.max(0, 1 - (this.hintT - 1.6) / 0.6);
      this.hintMat.opacity = a * (0.55 + Math.sin(this.hintT * 9) * 0.25);
      for (const h of this.hints) {
        const p = h.userData.prop as Prop;
        if (!p.alive) { h.visible = false; continue; }
        const t = p.body.translation();
        h.position.set(t.x, t.y + 0.05, t.z);
        h.scale.setScalar(p.radius + 0.3);
      }
      if (this.hintT > 2.3) this.clearHints();
    }
  }
}
