import * as THREE from 'three';
import { formatHeart, formatWon } from '../core/util';
import type { LevelDef } from '../game/types';
import type { Prop } from '../game/Prop';
import { OBJECTS, type Discovery } from '../meta/dex';
import { PAW_SVG, btn, esc, h } from './dom';

export interface Anchor { el: HTMLElement; anchor: () => THREE.Vector3; until: number }

/** short trait chips for the inspect card (derived from physics + gadget) */
export function traitsOf(p: Prop, reachable: boolean): string[] {
  const s = p.spec;
  const t: string[] = [];
  if (p.target) t.push('🎯 목표');
  if (p.special?.label) t.push(`✨ ${p.special.label}`);
  if (p.breakable) t.push(p.breakable.mode === 'shatter' ? '💥 잘 깨짐' : '⚡ 고장 남');
  const m = p.body.mass();
  if (m >= 5) t.push('🐘 아주 무거움'); else if (m >= 1.8) t.push('🧱 묵직함'); else if (m <= 0.45) t.push('🪶 가벼움');
  if (p.pinned !== null) t.push('📌 벽에 고정');
  if (s.friction !== undefined && s.friction < 0.05) t.push('🧊 미끄덩');
  if ((s.restitution ?? 0) >= 0.45) t.push('🏀 통통 튐');
  if (s.noTopple && !s.special) t.push('⚽ 굴러감');
  if (p.mat === 'electronic') t.push('💧 물에 약함');
  else if (s.floats || ['rubber', 'squeak', 'soft'].includes(p.mat)) t.push('🛟 물에 뜸');
  if (p.value >= 300000) t.push('💎 비쌈');
  if (!reachable) t.push('🙀 앞발이 안 닿음');
  return t.slice(0, 6);
}

/**
 * In-game HUD and everything floating over the 3D view: goal card, damage
 * meter, paws, chain counter & climax, popups, speech bubbles, the
 * tutorial coach, discovery banners and the object inspect card.
 */
export class UI {
  readonly root: HTMLElement;
  private hud: HTMLElement;
  private layer: HTMLElement;
  readonly overlay: HTMLElement;
  readonly top: HTMLElement;
  private goalEl!: HTMLElement;
  private goalCnt!: HTMLElement;
  private goalLv!: HTMLElement;
  private goalText!: HTMLElement;
  private meterFill!: HTMLElement;
  private marks: HTMLElement[] = [];
  private scoreVal!: HTMLElement;
  private sleepFill!: HTMLElement;
  private suspFill!: HTMLElement;
  private pawsEl!: HTMLElement;
  private endBtn!: HTMLButtonElement;
  private chainEl!: HTMLElement;
  private climaxEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private aimEl!: HTMLElement;
  private sideEl!: HTMLElement;
  private viewBtn!: HTMLButtonElement;
  private hintBtn!: HTMLButtonElement;
  private bannerEl!: HTMLElement;
  private coachEl!: HTMLElement;
  private inspectEl!: HTMLElement;
  private labelsEl!: HTMLElement;
  private vignette!: HTMLElement;
  private bubbles: Anchor[] = [];
  private toastTimer = 0;
  private shownScore = 0;
  private targetScore = 0;
  private stars: [number, number] = [1, 2];
  private maxScore = 1;
  private tutEl: HTMLElement | null = null;
  private bannerQ: { icon: string; title: string; text: string; cls: string }[] = [];
  private bannerBusy = false;
  private lastClimax = 0;
  private labels: { el: HTMLElement; pos: THREE.Vector3 }[] = [];
  onMenu: () => void = () => {};
  onRetry: () => void = () => {};
  onEnd: () => void = () => {};
  onView: () => void = () => {};
  onHint: () => void = () => {};

  constructor(root: HTMLElement, private project: (p: THREE.Vector3) => { x: number; y: number }) {
    this.root = root;
    this.layer = h('div', 'layer');
    this.hud = h('div', 'hud hidden');
    this.overlay = h('div', 'overlays');
    this.top = h('div', 'top-layer');
    this.vignette = h('div', 'vignette');
    root.append(this.vignette, this.hud, this.layer, this.overlay, this.top);
    this.buildHud();
  }

  private buildHud() {
    const top = h('div', 'hud-top');
    const menu = btn('btn-round', '☰', () => this.onMenu());
    const retry = btn('btn-round', '↻', () => this.onRetry());
    this.goalEl = h('div', 'goal');
    this.goalLv = h('div', 'lv');
    const gt = h('div', 'gt');
    this.goalText = h('span', 'txt');
    this.goalCnt = h('span', 'cnt');
    gt.append(h('span', 'tgt'), this.goalText, this.goalCnt);
    const meter = h('div', 'meter');
    this.meterFill = h('div', 'fill');
    meter.append(this.meterFill);
    for (let i = 0; i < 3; i++) { const m = h('div', 'mark', '⭐'); this.marks.push(m); meter.append(m); }
    const score = h('div', 'score');
    this.scoreVal = h('b', '', '₩0');
    score.append(h('span', '', '집사 손해액'), this.scoreVal);
    const sleep = h('div', 'sleepbar');
    this.sleepFill = h('div', 'fill');
    sleep.append(h('span', 'zz', '💤'), this.sleepFill);
    const susp = h('div', 'suspbar');
    this.suspFill = h('div', 'fill');
    susp.append(h('span', 'zz', '👀'), this.suspFill);
    this.goalEl.append(this.goalLv, gt, sleep, susp, meter, score);
    top.append(menu, this.goalEl, retry);
    this.sideEl = h('div', 'hud-side');
    this.viewBtn = btn('btn-round small', '🔍', () => this.onView());
    this.hintBtn = btn('btn-round small', '💡', () => this.onHint());
    this.sideEl.append(this.viewBtn, this.hintBtn);
    this.pawsEl = h('div', 'paws');
    this.endBtn = btn('endbtn', '😼 시치미 떼기 (끝내기)', () => this.onEnd());
    this.chainEl = h('div', 'chain');
    this.climaxEl = h('div', 'climax');
    this.toastEl = h('div', 'toast');
    this.aimEl = h('div', 'aimlbl');
    this.bannerEl = h('div', 'banner');
    this.coachEl = h('div', 'coach');
    this.inspectEl = h('div', 'inspect');
    this.labelsEl = h('div', 'roomlabels');
    this.hud.append(this.labelsEl, top, this.sideEl, this.pawsEl, this.endBtn, this.chainEl, this.climaxEl, this.toastEl, this.aimEl, this.bannerEl, this.coachEl, this.inspectEl);
  }

  /* ------------------------------ HUD ------------------------------ */

  showHud(level: LevelDef, opts: { roomy: boolean; labels: { name: string; pos: THREE.Vector3 }[]; watched?: boolean }) {
    this.hud.classList.remove('hidden');
    this.goalLv.textContent = `${level.id} · ${level.title}`;
    this.goalText.textContent = level.goal.short;
    const sleepy = level.goal.kind === 'wake' || level.goal.kind === 'sneak';
    this.goalEl.classList.toggle('wake', sleepy);
    this.goalEl.classList.toggle('sneak', level.goal.kind === 'sneak');
    this.goalEl.classList.remove('done');
    this.stars = level.stars;
    this.maxScore = level.stars[1] * 1.12;
    this.shownScore = 0; this.targetScore = 0;
    this.scoreVal.textContent = '₩0';
    this.meterFill.style.width = '0%';
    const pos = [0.06, level.stars[0] / this.maxScore, level.stars[1] / this.maxScore];
    this.marks.forEach((m, i) => { m.style.left = `${pos[i] * 100}%`; m.classList.remove('on'); });
    this.sleepFill.style.width = '0%';
    this.suspFill.style.width = '0%';
    this.goalEl.classList.toggle('watched', !!opts.watched);
    this.goalEl.classList.remove('seen');
    this.endBtn.classList.remove('show');
    this.viewBtn.classList.toggle('hidden', !opts.roomy);
    this.labelsEl.innerHTML = '';
    this.labels = opts.labels.map((l) => { const el = h('div', 'rlabel', esc(l.name)); this.labelsEl.append(el); return { el, pos: l.pos }; });
    this.coach(null);
    this.inspect(null, false);
  }

  hideHud() { this.hud.classList.add('hidden'); this.clearFloating(); }

  setGoal(done: number, need: number, complete: boolean, kind: string) {
    this.goalCnt.textContent = kind === 'score' ? `${Math.floor((done / Math.max(1, need)) * 100)}%` : `${done}/${need}`;
    if (complete && !this.goalEl.classList.contains('done')) { this.goalEl.classList.remove('flash'); void this.goalEl.offsetWidth; this.goalEl.classList.add('flash'); }
    this.goalEl.classList.toggle('done', complete);
    this.marks[0].classList.toggle('on', complete);
  }

  setPaws(left: number, max: number) {
    const prev = this.pawsEl.querySelectorAll('.paw:not(.used)').length;
    this.pawsEl.innerHTML = '<span class="lbl">남은 장난</span>';
    for (let i = 0; i < max; i++) {
      const w = h('span', '', PAW_SVG);
      const svg = w.firstElementChild as HTMLElement;
      if (i >= left) svg.classList.add('used');
      if (i === left && prev > left) svg.classList.add('pop');
      this.pawsEl.append(svg);
    }
  }

  setScore(total: number) { this.targetScore = total; }
  setSuspicion(v: number, seen: boolean) {
    this.suspFill.style.width = `${v}%`;
    this.goalEl.classList.toggle('seen', v >= 60);
    if (seen) { this.suspFill.parentElement!.classList.remove('ping'); void this.suspFill.offsetWidth; this.suspFill.parentElement!.classList.add('ping'); }
  }
  setSleep(v: number) { this.sleepFill.style.width = `${v}%`; this.goalEl.classList.toggle('danger', v >= 60); }
  showEndButton(show: boolean) { this.endBtn.classList.toggle('show', show); }
  setViewActive(overview: boolean) { this.viewBtn.classList.toggle('on', overview); this.labelsEl.classList.toggle('show', overview); }
  hintGlow(on: boolean) { this.hintBtn.classList.toggle('glow', on); }

  /* ------------------------------ floating fx ------------------------------ */

  private recentPops: { x: number; y: number; t: number }[] = [];

  popScore(amount: number, pos: THREE.Vector3, big: boolean) {
    const s = this.project(pos);
    const now = performance.now();
    this.recentPops = this.recentPops.filter((p) => now - p.t < 450);
    let y = s.y;
    for (const p of this.recentPops) if (Math.abs(p.x - s.x) < 60 && Math.abs(p.y - y) < 22) y = p.y - 24;
    this.recentPops.push({ x: s.x, y, t: now });
    const e = h('div', `fx pop-score${big ? ' big' : ''}`, `+${amount.toLocaleString('ko-KR')}`);
    e.style.left = `${s.x}px`; e.style.top = `${y}px`;
    this.layer.append(e);
    setTimeout(() => e.remove(), 1150);
    this.trimLayer();
  }

  popWord(text: string, pos: THREE.Vector3, size: number, color: string) {
    const s = this.project(pos);
    const e = h('div', 'fx pop-word', esc(text));
    e.style.left = `${s.x}px`; e.style.top = `${s.y}px`;
    e.style.fontSize = `${Math.round(30 * size)}px`;
    e.style.color = color;
    e.style.setProperty('--r', `${(Math.random() - 0.5) * 18}deg`);
    this.layer.append(e);
    setTimeout(() => e.remove(), 950);
    this.trimLayer();
  }

  private trimLayer() {
    const kids = this.layer.querySelectorAll('.fx');
    for (let i = 0; i < kids.length - 26; i++) kids[i].remove();
  }

  /** chain counter; returns the climax tier reached (0 none, 1 big, 2 legendary) */
  chain(n: number): number {
    const e = this.chainEl;
    e.textContent = n >= 12 ? `대참사 연쇄 x${n}!!` : n >= 7 ? `연쇄 x${n}!!` : `연쇄 x${n}!`;
    e.className = 'chain';
    if (n >= 7) e.classList.add('hot');
    if (n >= 12) e.classList.add('fire');
    void e.offsetWidth;
    e.classList.add('show');
    const tier = n >= 20 ? 2 : n >= 10 ? 1 : 0;
    if (tier > this.lastClimax) {
      this.lastClimax = tier;
      const c = this.climaxEl;
      c.className = `climax t${tier}`;
      c.innerHTML = tier === 2 ? '<span>전설의</span><b>대참사!!</b>' : '<span>연쇄</span><b>와장창!!</b>';
      void c.offsetWidth;
      c.classList.add('show');
      this.vignette.className = `vignette t${tier}`;
      void this.vignette.offsetWidth;
      this.vignette.classList.add('show');
      return tier;
    }
    return 0;
  }

  resetChainTier() { this.lastClimax = 0; }

  toast(text: string, ms = 1800) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => this.toastEl.classList.remove('show'), ms);
  }

  aimLabel(label: string | null, power: number, x: number, y: number, special: boolean) {
    if (!label) { this.aimEl.classList.remove('show'); return; }
    this.aimEl.classList.add('show');
    let pw = power <= 0 ? '방향으로 끌기' : power < 0.35 ? '살짝' : power < 0.7 ? '적당히' : '세게!';
    if (label === '당기기') pw = power <= 0 ? '방향으로 끌기' : power < 0.62 ? '살살 당기기' : '확 잡아빼기!';
    this.aimEl.innerHTML = `${special ? '✨ ' : ''}${esc(label)}<span class="pw">${pw}</span>`;
    this.aimEl.style.left = `${Math.max(70, Math.min(window.innerWidth - 70, x))}px`;
    this.aimEl.style.top = `${y - 30}px`;
  }

  bubble(text: string, anchor: () => THREE.Vector3, dur: number, style: string) {
    for (const b of this.bubbles) if (b.el.dataset.style === style) b.until = 0;
    const e = h('div', `bubble ${style}`, esc(text));
    e.dataset.style = style;
    this.layer.append(e);
    this.bubbles.push({ el: e, anchor, until: performance.now() + dur * 1000 });
  }

  /** non-blocking banner at the top (first discoveries, achievements mid-play) */
  banner(icon: string, title: string, text: string, cls = '') {
    this.bannerQ.push({ icon, title, text, cls });
    if (!this.bannerBusy) this.nextBanner();
  }

  private nextBanner() {
    const b = this.bannerQ.shift();
    if (!b) { this.bannerBusy = false; return; }
    this.bannerBusy = true;
    const e = this.bannerEl;
    e.className = `banner ${b.cls}`;
    e.innerHTML = `<div class="bi">${b.icon}</div><div><div class="bt">${esc(b.title)}</div><div class="bx">${esc(b.text)}</div></div>`;
    void e.offsetWidth;
    e.classList.add('show');
    setTimeout(() => { e.classList.remove('show'); setTimeout(() => this.nextBanner(), 350); }, 2300);
  }

  discovery(d: Discovery) { this.banner(d.icon, `새로운 발견! ${d.name}`, d.desc, 'disc'); }

  clearFloating() {
    this.layer.innerHTML = '';
    this.bubbles = [];
    this.chainEl.className = 'chain';
    this.climaxEl.className = 'climax';
    this.bannerQ = [];
    this.lastClimax = 0;
  }

  update(dt: number) {
    if (this.shownScore !== this.targetScore) {
      const d = this.targetScore - this.shownScore;
      this.shownScore += Math.abs(d) < 50 ? d : d * Math.min(1, dt * 10);
      this.scoreVal.textContent = formatWon(this.shownScore);
      this.meterFill.style.width = `${Math.min(100, (this.shownScore / this.maxScore) * 100)}%`;
      this.marks[1].classList.toggle('on', this.shownScore >= this.stars[0]);
      this.marks[2].classList.toggle('on', this.shownScore >= this.stars[1]);
    }
    const now = performance.now();
    this.bubbles = this.bubbles.filter((b) => {
      if (now > b.until) { b.el.remove(); return false; }
      const s = this.project(b.anchor());
      const w = b.el.offsetWidth || 120;
      const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, s.x));
      const y = Math.max((b.el.offsetHeight || 40) + 130, s.y);
      b.el.style.left = `${x}px`;
      b.el.style.top = `${y}px`;
      return true;
    });
    if (this.labelsEl.classList.contains('show')) {
      for (const l of this.labels) {
        const s = this.project(l.pos);
        l.el.style.left = `${s.x}px`; l.el.style.top = `${s.y}px`;
      }
    }
  }

  /* ------------------------------ tutorial / hints ------------------------------ */

  /** animated hand dragging from one screen point to another */
  hand(from: { x: number; y: number } | null, to?: { x: number; y: number }) {
    this.tutEl?.remove();
    this.tutEl = null;
    if (!from || !to) return;
    const e = h('div', 'tut-hand anim', '👆');
    e.style.left = `${from.x}px`;
    e.style.top = `${from.y}px`;
    e.style.setProperty('--dx', `${to.x - from.x}px`);
    e.style.setProperty('--dy', `${to.y - from.y}px`);
    this.hud.append(e);
    this.tutEl = e;
  }

  /** move the hand without restarting its animation (creates it if needed) */
  moveHand(from: { x: number; y: number }, to: { x: number; y: number }) {
    if (!this.tutEl) { this.hand(from, to); return; }
    const e = this.tutEl;
    e.style.left = `${from.x}px`;
    e.style.top = `${from.y}px`;
    e.style.setProperty('--dx', `${to.x - from.x}px`);
    e.style.setProperty('--dy', `${to.y - from.y}px`);
  }

  /** coach bubble (tutorial steps) */
  coach(text: string | null, step = 0, steps = 0) {
    const e = this.coachEl;
    this.hud.classList.toggle('coach-on', !!text);
    if (!text) { e.classList.remove('show'); return; }
    e.innerHTML = `<div class="cf">😺</div><div class="ct">${esc(text)}${steps > 1 ? `<div class="cs">${'●'.repeat(step + 1)}${'○'.repeat(Math.max(0, steps - step - 1))}</div>` : ''}</div>`;
    e.classList.remove('show');
    void e.offsetWidth;
    e.classList.add('show');
  }

  /** long-press object card */
  inspect(p: Prop | null, reachable: boolean) {
    const e = this.inspectEl;
    if (!p) { e.classList.remove('show'); return; }
    const info = OBJECTS[p.kind];
    const chips = traitsOf(p, reachable).map((t) => `<span>${esc(t)}</span>`).join('');
    const w = p.spec.worth;
    const owner = w?.owner ? `${esc(w.owner)}의 ` : '';
    const story = w?.story || w?.heart ? `<div class="istory">${w.heart ? `💗 정성 ${formatHeart(w.heart)} · ` : ''}${esc(w.story ?? '')}</div>` : '';
    e.innerHTML = `<div class="ih"><div class="ii">${p.icon}</div><div><div class="in">${owner}${esc(p.name)}</div><div class="iv">${p.value ? formatWon(p.value) : '가격 미상'}</div></div></div>
      ${story}<div class="chips">${chips}</div>${info ? `<div class="itip">💡 ${esc(info.tip)}</div>` : ''}`;
    e.classList.add('show');
  }
}
