import * as THREE from 'three';
import { formatWon } from '../core/util';
import type { LevelDef } from '../game/types';
import type { Result } from '../game/Game';

const PAW_SVG = `<svg viewBox="0 0 40 40" class="paw"><g fill="#ff8fa3" stroke="#3b2a4a" stroke-width="2.5"><ellipse cx="20" cy="27" rx="9" ry="7.5"/><ellipse cx="9" cy="17" rx="4" ry="5"/><ellipse cx="16" cy="10" rx="4" ry="5"/><ellipse cx="24" cy="10" rx="4" ry="5"/><ellipse cx="31" cy="17" rx="4" ry="5"/></g></svg>`;

export interface Anchor { el: HTMLElement; anchor: () => THREE.Vector3; until: number }

function h<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

export class UI {
  readonly root: HTMLElement;
  private hud: HTMLElement;
  private layer: HTMLElement;
  private overlay: HTMLElement;
  private goalEl!: HTMLElement;
  private goalCnt!: HTMLElement;
  private goalLv!: HTMLElement;
  private goalText!: HTMLElement;
  private meterFill!: HTMLElement;
  private marks: HTMLElement[] = [];
  private scoreVal!: HTMLElement;
  private sleepFill!: HTMLElement;
  private pawsEl!: HTMLElement;
  private endBtn!: HTMLButtonElement;
  private chainEl!: HTMLElement;
  private toastEl!: HTMLElement;
  private aimEl!: HTMLElement;
  private bubbles: Anchor[] = [];
  private toastTimer = 0;
  private shownScore = 0;
  private targetScore = 0;
  private stars: [number, number] = [1, 2];
  private maxScore = 1;
  private tutEl: HTMLElement | null = null;
  onMenu: () => void = () => {};
  onRetry: () => void = () => {};
  onEnd: () => void = () => {};

  constructor(root: HTMLElement, private project: (p: THREE.Vector3) => { x: number; y: number }) {
    this.root = root;
    this.layer = h('div', 'layer');
    this.hud = h('div', 'hud hidden');
    this.overlay = h('div', 'overlays');
    root.append(this.hud, this.layer, this.overlay);
    this.buildHud();
  }

  private buildHud() {
    const top = h('div', 'hud-top');
    const menu = h('button', 'btn-round clickable', '☰');
    menu.onclick = () => this.onMenu();
    const retry = h('button', 'btn-round clickable', '↻');
    retry.onclick = () => this.onRetry();
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
    sleep.append(this.sleepFill);
    this.goalEl.append(this.goalLv, gt, sleep, meter, score);
    top.append(menu, this.goalEl, retry);
    this.pawsEl = h('div', 'paws');
    this.endBtn = h('button', 'endbtn clickable', '😼 시치미 떼기 (끝내기)');
    this.endBtn.onclick = () => this.onEnd();
    this.chainEl = h('div', 'chain');
    this.toastEl = h('div', 'toast');
    this.aimEl = h('div', 'aimlbl');
    this.hud.append(top, this.pawsEl, this.endBtn, this.chainEl, this.toastEl, this.aimEl);
  }

  /* ------------------------------ HUD ------------------------------ */

  showHud(level: LevelDef, index: string) {
    this.hud.classList.remove('hidden');
    this.goalLv.textContent = `${index} · ${level.title}`;
    this.goalText.textContent = level.goal.short;
    this.goalEl.classList.toggle('wake', level.goal.kind === 'wake');
    this.goalEl.classList.remove('done');
    this.stars = level.stars;
    this.maxScore = level.stars[1] * 1.12;
    this.shownScore = 0; this.targetScore = 0;
    this.scoreVal.textContent = '₩0';
    this.meterFill.style.width = '0%';
    const pos = [0.06, level.stars[0] / this.maxScore, level.stars[1] / this.maxScore];
    this.marks.forEach((m, i) => { m.style.left = `${pos[i] * 100}%`; m.classList.remove('on'); });
    this.sleepFill.style.width = '0%';
    this.endBtn.classList.remove('show');
  }

  hideHud() { this.hud.classList.add('hidden'); this.clearFloating(); }

  setGoal(done: number, need: number, complete: boolean, kind: string) {
    this.goalCnt.textContent = kind === 'score' ? `${Math.floor((done / Math.max(1, need)) * 100)}%` : `${done}/${need}`;
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

  setSleep(v: number) { this.sleepFill.style.width = `${v}%`; }

  showEndButton(show: boolean) { this.endBtn.classList.toggle('show', show); }

  /* ------------------------------ floating fx ------------------------------ */

  private recentPops: { x: number; y: number; t: number }[] = [];

  popScore(amount: number, pos: THREE.Vector3, big: boolean) {
    const s = this.project(pos);
    // keep popups that land on the same spot from stacking on top of each other
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
    const e = h('div', 'fx pop-word', text);
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

  chain(n: number) {
    const e = this.chainEl;
    e.textContent = n >= 12 ? `대참사 연쇄 x${n}!!` : n >= 7 ? `연쇄 x${n}!!` : `연쇄 x${n}!`;
    e.className = 'chain';
    if (n >= 7) e.classList.add('hot');
    if (n >= 12) e.classList.add('fire');
    void e.offsetWidth;
    e.classList.add('show');
  }

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
    this.aimEl.innerHTML = `${special ? '✨ ' : ''}${label}<span class="pw">${pw}</span>`;
    this.aimEl.style.left = `${x}px`;
    this.aimEl.style.top = `${y - 30}px`;
  }

  bubble(text: string, anchor: () => THREE.Vector3, dur: number, style: string) {
    // replace an existing bubble of the same style
    for (const b of this.bubbles) if (b.el.dataset.style === style) b.until = 0;
    const e = h('div', `bubble ${style}`, text);
    e.dataset.style = style;
    this.layer.append(e);
    this.bubbles.push({ el: e, anchor, until: performance.now() + dur * 1000 });
  }

  clearFloating() {
    this.layer.innerHTML = '';
    this.bubbles = [];
    this.chainEl.className = 'chain';
  }

  update(dt: number) {
    // score counter tween
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
      // keep speech bubbles fully on screen
      const w = b.el.offsetWidth || 120;
      const x = Math.max(w / 2 + 8, Math.min(window.innerWidth - w / 2 - 8, s.x));
      const y = Math.max((b.el.offsetHeight || 40) + 130, s.y);
      b.el.style.left = `${x}px`;
      b.el.style.top = `${y}px`;
      return true;
    });
  }

  /* ------------------------------ tutorial ------------------------------ */

  tutorial(from: { x: number; y: number } | null, to?: { x: number; y: number }) {
    this.tutEl?.remove();
    this.tutEl = null;
    if (!from || !to) return;
    const e = h('div', 'tut-hand anim', '👆');
    e.style.left = `${from.x}px`;
    e.style.top = `${from.y}px`;
    e.style.setProperty('--dx', `${to.x - from.x}px`);
    e.style.setProperty('--dy', `${to.y - from.y}px`);
    this.layer.append(e);
    this.tutEl = e;
  }

  /* ------------------------------ overlays ------------------------------ */

  clearOverlay() { this.overlay.innerHTML = ''; }

  showOverlay(el: HTMLElement) {
    this.overlay.innerHTML = '';
    this.overlay.append(el);
  }

  title(onStart: () => void) {
    const o = h('div', 'title');
    o.innerHTML = `<div class="logo"><div class="l1">와장창<br><span>냥이</span></div><div class="l2">고양이의 완전범죄</div></div>`;
    const bottom = h('div', 'bottom');
    const btn = h('button', 'btn-big clickable', '장난 시작! 🐾');
    btn.onclick = onStart;
    bottom.append(btn, h('div', 'hint', '한 손가락으로 끌어서 툭! — 소리를 켜면 더 재밌어요'));
    o.append(bottom);
    this.showOverlay(o);
  }

  levelSelect(rooms: { name: string; desc: string; icon: string; color: string; levels: { id: string; title: string; stars: number; locked: boolean }[] }[], total: number, max: number, onPick: (id: string) => void, onBack: () => void) {
    const o = h('div', 'levels');
    const head = h('div', 'head');
    const back = h('button', 'btn-round clickable', '←');
    back.onclick = onBack;
    head.append(back, h('h2', '', '어느 방을 어지를까?'), h('div', 'totstar', `⭐ ${total}/${max}`));
    o.append(head);
    rooms.forEach((r, ri) => {
      const card = h('div', 'room');
      card.style.animationDelay = `${ri * 0.08}s`;
      card.innerHTML = `<div class="rh"><div class="ri" style="background:${r.color}">${r.icon}</div><div><div class="rt">${r.name}</div><div class="rd">${r.desc}</div></div></div>`;
      const lvs = h('div', 'lvs');
      r.levels.forEach((l, i) => {
        const b = h('button', `lvbtn clickable${l.locked ? ' locked' : ''}${l.stars > 0 ? ' cleared' : ''}`);
        b.innerHTML = l.locked ? `<span class="n">🔒</span><span class="t">${l.title}</span>` : `<span class="n">${ri + 1}-${i + 1}</span><span class="t">${l.title}</span><span class="s">${'★'.repeat(l.stars)}${'☆'.repeat(3 - l.stars)}</span>`;
        if (!l.locked) b.onclick = () => onPick(l.id);
        lvs.append(b);
      });
      card.append(lvs);
      o.append(card);
    });
    this.showOverlay(o);
  }

  intro(level: LevelDef, index: string, onGo: () => void) {
    const o = h('div', 'overlay dim clickable');
    const c = h('div', 'card');
    c.innerHTML = `<span class="lvno">${index}</span><h2>${level.title}</h2><div class="sub">${level.subtitle}</div>
      <div class="goalline"><span class="tgt" style="display:inline-block;width:16px;height:16px;border-radius:50%;background:#ff6b6b;border:3px solid #fff;box-shadow:0 0 0 2px #ff6b6b"></span>${level.goal.text}</div>
      <div class="pawsline">앞발 장난 <b>${level.paws}번</b> · ⭐⭐ ${formatWon(level.stars[0])} · ⭐⭐⭐ ${formatWon(level.stars[1])}</div>
      ${level.tip ? `<div class="tip">💡 ${level.tip}</div>` : ''}`;
    const row = h('div', 'row');
    const go = h('button', 'btn-big clickable', '장난 개시!');
    go.onclick = (e) => { e.stopPropagation(); onGo(); };
    row.append(go);
    c.append(row);
    o.append(c);
    this.showOverlay(o);
  }

  result(level: LevelDef, r: Result, best: number, hint: string | null, hasNext: boolean, on: { retry: () => void; next: () => void; menu: () => void; play: (k: 'star' | 'fanfare' | 'fail', i?: number) => void }) {
    const o = h('div', 'overlay dim result');
    const c = h('div', 'card');
    const title = r.success ? (r.stars === 3 ? '완전 범죄!' : r.stars === 2 ? '대성공!' : '미션 성공!') : '아직 너무 평화롭다…';
    const sub = r.success ? '집사는 범인을 끝내 찾지 못했다…' : '목표를 망가뜨리지 못했어요';
    c.innerHTML = `<h2>${title}</h2><div class="sub">${sub}</div>
      <div class="stars"><span class="star">⭐</span><span class="star mid">⭐</span><span class="star">⭐</span></div>
      <div class="stats">
        <span>깨뜨린 물건</span><span class="v">${r.broken}개</span>
        <span>최대 연쇄</span><span class="v">x${r.maxChain}</span>
        ${r.pawBonus ? `<span>남은 앞발 보너스</span><span class="v">+${formatWon(r.pawBonus)}</span>` : ''}
      </div>
      <div class="total">${formatWon(r.score)}</div>
      <div class="best">${best > 0 ? `최고 기록 ${formatWon(best)}` : ''}</div>
      ${hint ? `<div class="tip">💡 ${hint}</div>` : ''}`;
    const row = h('div', 'row');
    const menu = h('button', 'btn-mid clickable', '☰ 방 선택');
    menu.onclick = on.menu;
    const retry = h('button', 'btn-mid clickable', '↻ 다시');
    retry.onclick = on.retry;
    row.append(menu, retry);
    if (r.success && hasNext) {
      const next = h('button', 'btn-mid clickable', '다음 장난 ▶');
      next.style.background = '#ffd23f';
      next.onclick = on.next;
      row.append(next);
    }
    c.append(row);
    o.append(c);
    this.showOverlay(o);
    const stars = c.querySelectorAll('.star');
    if (r.success) {
      on.play('fanfare');
      for (let i = 0; i < r.stars; i++) setTimeout(() => { stars[i].classList.add('on'); on.play('star', i); }, 450 + i * 380);
    } else on.play('fail');
  }

  pauseMenu(o2: { resume: () => void; retry: () => void; levels: () => void; sound: boolean; music: boolean; toggleSound: () => boolean; toggleMusic: () => boolean }) {
    const o = h('div', 'overlay dim menu');
    const c = h('div', 'card');
    c.innerHTML = '<h2>잠깐 쉬는 중…</h2><div class="sub">고양이는 원래 하루 16시간을 자요</div>';
    const mk = (t: string, f: () => void, cls = 'btn-mid') => { const b = h('button', `${cls} clickable`, t); b.onclick = f; c.append(b); return b; };
    mk('▶ 계속하기', o2.resume, 'btn-big');
    mk('↻ 처음부터', o2.retry);
    mk('☰ 방 선택', o2.levels);
    const tg = h('div', 'toggles');
    const s = h('button', `clickable${o2.sound ? '' : ' off'}`, o2.sound ? '🔊 효과음' : '🔇 효과음');
    s.onclick = () => { const v = o2.toggleSound(); s.textContent = v ? '🔊 효과음' : '🔇 효과음'; s.classList.toggle('off', !v); };
    const m = h('button', `clickable${o2.music ? '' : ' off'}`, o2.music ? '🎵 음악' : '🎵 음악 끔');
    m.onclick = () => { const v = o2.toggleMusic(); m.textContent = v ? '🎵 음악' : '🎵 음악 끔'; m.classList.toggle('off', !v); };
    tg.append(s, m);
    c.append(tg);
    o.append(c);
    this.showOverlay(o);
  }
}
