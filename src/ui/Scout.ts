import * as THREE from 'three';
import type { Game } from '../game/Game';
import type { Prop } from '../game/Prop';
import type { LevelDef } from '../game/types';
import { formatHeart, formatWonShort } from '../core/util';
import { btn, esc, h } from './dom';

interface Mark { prop: Prop; kind: 'treasure' | 'trigger'; revealed: boolean; el: HTMLElement; hint: boolean }

/**
 * 정찰 (scouting): before the first paw in a wide place, question marks float
 * over the treasures and the things that start chains. A tap reveals what it
 * is; the suggested first move also shows a short dotted line of where it
 * leads. 삼색이 starts with one mark revealed, 페르시안 sees the treasures.
 */
export class Scout {
  private marks: Mark[] = [];
  private root: HTMLElement;
  private lines: THREE.Object3D[] = [];
  taps = 0;

  constructor(
    private game: Game,
    private project: (p: THREE.Vector3) => { x: number; y: number },
    parent: HTMLElement,
    level: LevelDef,
    opts: { lucky: boolean; eye: boolean; preview: boolean; onDone: () => void; onTap: () => void },
  ) {
    const g = game;
    const alive = g.props.filter((p) => p.alive && !p.broken && !p.damaged);
    // the suggested first move (if the stage has one)
    const hm = level.hintMove;
    let hintProp: Prop | undefined;
    if (hm) {
      const c = alive.filter((p) => p.interactable && (p.kind === hm.prop || p.name === hm.prop));
      if (hm.near) { const n = new THREE.Vector3(...hm.near); c.sort((a, b) => a.center(new THREE.Vector3()).distanceTo(n) - b.center(new THREE.Vector3()).distanceTo(n)); }
      hintProp = c[0];
    }
    const treasures = alive.filter((p) => p.target || p.spec.worth).sort((a, b) => (b.value + (b.spec.worth?.heart ?? 0) * 1e5) - (a.value + (a.spec.worth?.heart ?? 0) * 1e5)).slice(0, 5);
    const triggers = alive.filter((p) => p.interactable && p.special?.label && !treasures.includes(p) && p !== hintProp).sort((a, b) => b.value - a.value).slice(0, 3);
    if (hintProp && !treasures.includes(hintProp)) triggers.unshift(hintProp);

    this.root = h('div', 'scoutlayer');
    this.root.append(h('div', 'scouthead', '🔍 정찰 중 · 물음표를 눌러 정체를 확인해 보세요'));
    for (const p of treasures) this.add(p, 'treasure', p === hintProp);
    for (const p of triggers) this.add(p, 'trigger', p === hintProp);
    // perks and the struggling player's nudge
    if (opts.eye) for (const m of this.marks) if (m.kind === 'treasure') this.reveal(m, false);
    const first = this.marks.find((m) => m.hint) ?? this.marks.find((m) => m.kind === 'trigger');
    if ((opts.lucky || opts.preview) && first) this.reveal(first, false);
    const go = btn('btn-big scoutgo', '정찰 끝! 장난 시작 🐾', () => { this.dispose(); opts.onDone(); });
    this.root.append(go);
    parent.append(this.root);
    this.onTap = opts.onTap;
    this.update();
  }

  private onTap: () => void;

  private add(prop: Prop, kind: Mark['kind'], hint: boolean) {
    const el = btn(`scoutq ${kind}`, '?', () => {
      const m = this.marks.find((x) => x.el === el);
      if (!m || m.revealed) return;
      this.taps++;
      this.reveal(m, true);
      this.onTap();
    });
    this.root.append(el);
    this.marks.push({ prop, kind, revealed: false, el, hint });
  }

  private reveal(m: Mark, tapped: boolean) {
    m.revealed = true;
    const p = m.prop;
    const w = p.spec.worth;
    const what = m.kind === 'treasure'
      ? [p.value > 0 ? `💰 ${formatWonShort(p.value)}` : '', w?.heart ? `💗 ${formatHeart(w.heart)}` : '', p.target ? '🎯 목표' : ''].filter(Boolean).join(' · ')
      : `✨ ${p.special?.label ?? '건드리면 움직임'}`;
    m.el.classList.add('open');
    if (tapped) m.el.classList.add('pop');
    m.el.innerHTML = `<b>${esc(p.icon)} ${esc(p.name)}</b><small>${esc(what)}</small>`;
    if (m.hint) this.preview(m.prop);
  }

  /** a short dotted line from the suggested first move, the way it would go */
  private preview(p: Prop) {
    const hm = this.game.level.hintMove;
    if (!hm) return;
    const c = p.center(new THREE.Vector3());
    const d = new THREE.Vector3(hm.dir[0], 0, hm.dir[1]).normalize();
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      pts.push(c.clone().addScaledVector(d, 1.2 + t * 6).setY(c.y + 0.1 + Math.sin(t * Math.PI) * 0.5));
    }
    // big round dots read as a dotted path at any zoom (a 1px line vanishes on a phone)
    const dotGeo = new THREE.SphereGeometry(0.26, 8, 6);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, transparent: true, opacity: 0.95 });
    const line = new THREE.Group();
    for (const q of pts.slice(0, -1)) { const m = new THREE.Mesh(dotGeo, dotMat); m.position.copy(q); m.renderOrder = 20; line.add(m); }
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.4, 0.8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false }));
    tip.position.copy(pts[pts.length - 1]);
    tip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), pts[pts.length - 1].clone().sub(pts[pts.length - 2]).normalize());
    tip.renderOrder = 20;
    this.game.scene.add(line, tip);
    this.lines.push(line, tip);
  }

  get count() { return this.marks.length; }

  update() {
    for (const m of this.marks) {
      const c = m.prop.center(new THREE.Vector3());
      c.y += Math.max(0.6, m.prop.height * 0.6) + (m.revealed ? 1.4 : 0.4);
      const s = this.project(c);
      m.el.style.left = `${s.x}px`;
      m.el.style.top = `${s.y}px`;
    }
  }

  dispose() {
    this.root.remove();
    for (const o of this.lines) {
      this.game.scene.remove(o);
      o.traverse((x) => { const mesh = x as THREE.Mesh; if (!mesh.isMesh) return; mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose(); });
    }
    this.lines = [];
  }
}
