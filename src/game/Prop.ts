import * as THREE from 'three';
import type RAPIER from '@dimforge/rapier3d-compat';
import type { BreakDef, Mat, PropSpec, Special } from './types';
import { OBJECTS } from '../meta/dex';

let nextId = 1;

export class Prop {
  readonly id = nextId++;
  readonly kind: string;
  readonly name: string;
  readonly icon: string;
  readonly mat: Mat;
  readonly value: number;
  readonly breakable?: BreakDef;
  readonly special?: Special;
  readonly spec: PropSpec;
  target: boolean;
  interactable: boolean;

  body: RAPIER.RigidBody;
  group: THREE.Object3D;
  colliderHandles: number[] = [];
  /** collider frictions as built (restored when leaving a slippery puddle) */
  baseFriction: number[] = [];
  /** currently on a slippery puddle */
  slippery = false;

  alive = true;
  broken = false;
  damaged = false;
  pinned: number | null;
  kinematic: boolean;

  prevV = new THREE.Vector3();
  prevW = new THREE.Vector3();
  readonly startPos = new THREE.Vector3();
  readonly startUp = new THREE.Vector3(0, 1, 0);
  minY: number;

  fell = false;
  toppled = false;
  moved = false;
  onFloor = false;

  lastSound = -1;
  lastImpact = 0;
  /** who knocked this into the current chain (null = unknown / support gone) */
  cause: Prop | null = null;
  /** was this the object the cat swatted in its chain */
  causeCat = false;
  /** on paint or oil: friction as low as ice */
  slick = false;
  /** swat index in which this prop last got involved */
  activeSwat = -1;
  /** ever swatted directly by the cat */
  swatted = false;
  inWater = false;
  dunked = false;
  /** game time until which impacts are ignored (after swats / spawn) */
  graceUntil = 0;
  lastSwatAt = -10;

  /** bounding radius around body origin, local half-height & center */
  radius: number;
  height: number;
  readonly centerLocal = new THREE.Vector3();
  readonly localBox = new THREE.Box3();

  // scratch
  readonly pos = new THREE.Vector3();
  readonly quat = new THREE.Quaternion();
  // previous physics state for render interpolation
  private readonly pPos = new THREE.Vector3();
  private readonly pQuat = new THREE.Quaternion();
  private readonly cPos = new THREE.Vector3();
  private readonly cQuat = new THREE.Quaternion();
  private hasPrev = false;

  constructor(spec: PropSpec, body: RAPIER.RigidBody) {
    this.spec = spec;
    this.kind = spec.kind;
    this.name = spec.name;
    this.icon = spec.icon ?? OBJECTS[spec.kind]?.icon ?? '📦';
    this.mat = spec.mat;
    this.value = spec.value;
    this.breakable = spec.breakable;
    this.special = spec.special;
    this.target = !!spec.target;
    this.interactable = spec.interactable ?? true;
    this.pinned = spec.pinned ?? null;
    this.kinematic = !!spec.kinematic;
    this.body = body;
    this.group = spec.group;

    this.localBox.setFromObject(spec.group, true);
    // setFromObject uses world matrices; the group is still at origin here.
    this.localBox.getCenter(this.centerLocal);
    const size = new THREE.Vector3();
    this.localBox.getSize(size);
    this.height = size.y;
    this.radius = spec.radius ?? Math.max(size.x, size.z, size.y * 0.8) * 0.5;
    this.startPos.set(spec.pos[0], spec.pos[1], spec.pos[2]);
    this.minY = spec.pos[1];
  }

  /** world-space visual centre */
  center(out: THREE.Vector3): THREE.Vector3 {
    return out.copy(this.centerLocal).applyQuaternion(this.group.quaternion).add(this.group.position);
  }

  sync() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.group.position.set(t.x, t.y, t.z);
    this.group.quaternion.set(r.x, r.y, r.z, r.w);
  }

  /** remember the state before a physics step */
  savePrev() {
    const t = this.body.translation();
    const r = this.body.rotation();
    this.pPos.set(t.x, t.y, t.z);
    this.pQuat.set(r.x, r.y, r.z, r.w);
    this.hasPrev = true;
  }

  /** render at a blend between the previous and current physics state */
  syncInterp(alpha: number) {
    if (!this.hasPrev) { this.sync(); return; }
    const t = this.body.translation();
    const r = this.body.rotation();
    this.cPos.set(t.x, t.y, t.z);
    this.cQuat.set(r.x, r.y, r.z, r.w);
    this.group.position.lerpVectors(this.pPos, this.cPos, alpha);
    this.group.quaternion.slerpQuaternions(this.pQuat, this.cQuat, alpha);
  }

  up(out: THREE.Vector3): THREE.Vector3 {
    const r = this.body.rotation();
    this.quat.set(r.x, r.y, r.z, r.w);
    return out.set(0, 1, 0).applyQuaternion(this.quat);
  }

  isDynamic(): boolean {
    return this.alive && this.pinned === null && !this.kinematic;
  }
}
