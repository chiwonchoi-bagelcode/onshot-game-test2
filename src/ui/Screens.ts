import { formatHeart, formatWon } from '../core/util';
import type { Result } from '../game/Game';
import type { LedgerEntry, LevelDef } from '../game/types';
import type { Settlement, UnlockItem } from '../meta/rewards';
import type { AchDef } from '../meta/achievements';
import type { Discovery } from '../meta/dex';
import { CHURU_SVG, btn, churu, countUp, esc, h, wait } from './dom';

export interface Sound {
  click(): void; star(i: number): void; fanfare(): void; fail(): void; stamp(): void; reveal(): void; tick(i: number): void; discover(): void; jingle(): void;
}

export interface ChapterCard {
  id: number; name: string; icon: string; color: string; desc: string; learn: string;
  open: boolean; lock: string; stars: number; max: number; chal: number; chalMax: number; cleared: boolean; fresh: boolean; empty: boolean;
}
export interface StageNode { id: string; title: string; stars: number; ch: boolean[]; chN: number; open: boolean; cleared: boolean; current: boolean; goal: string }
export interface MapData {
  churu: number; stars: number; maxStars: number;
  chapters: ChapterCard[]; sel: number; stages: StageNode[];
  badges: { cats: boolean; dex: boolean; ach: boolean };
  catName: string; catColor: string;
}

export interface IntroData {
  level: LevelDef; stars: number; best: number; ch: boolean[];
  challenges: { text: string; icon: string }[];
  cat: { name: string; color: string; perk: string };
  first: boolean;
}

/**
 * Full-screen menus and cards: title, chapter map, stage card, pause,
 * result & reward sequence, unlock reveals, settings, achievements, dex.
 */
export class Screens {
  constructor(private root: HTMLElement, private top: HTMLElement, private snd: Sound) {}

  clear() { this.root.innerHTML = ''; }
  private show(el: HTMLElement) { this.root.innerHTML = ''; this.root.append(el); return el; }

  /* ------------------------------ title ------------------------------ */

  title(o: { onStart: () => void; churu: number; returning: boolean }) {
    const e = h('div', 'title');
    e.innerHTML = `<div class="logo"><div class="l1">와장창<br><span>냥이</span></div><div class="l2">고양이의 완전범죄</div></div>`;
    const bottom = h('div', 'bottom');
    bottom.append(btn('btn-big pulse', o.returning ? '이어서 장난치기 🐾' : '장난 시작! 🐾', o.onStart));
    bottom.append(h('div', 'hint', '한 손가락으로 끌어서 툭! — 소리를 켜면 더 재밌어요'));
    e.append(bottom);
    this.show(e);
  }

  /* ------------------------------ chapter map ------------------------------ */

  map(d: MapData, on: { chapter: (id: number) => void; stage: (id: string) => void; cats: () => void; dex: () => void; ach: () => void; settings: () => void; title: () => void }) {
    const e = h('div', 'mapscr');
    const head = h('div', 'maphead');
    head.append(btn('btn-round', '🏠', on.title));
    const wallet = h('div', 'wallet clickable', `${churu(d.churu)}<span class="stars">⭐ <b>${d.stars}</b>/${d.maxStars}</span>`);
    head.append(wallet);
    const tools = h('div', 'maptools');
    const tb = (icon: string, label: string, badge: boolean, f: () => void) => { const b = btn(`toolbtn${badge ? ' badge' : ''}`, `<span class="ti">${icon}</span><span class="tl">${label}</span>`, f); tools.append(b); };
    tb(`<i class="catdot" style="background:${d.catColor}"></i>`, '고양이', d.badges.cats, on.cats);
    tb('📖', '도감', d.badges.dex, on.dex);
    tb('🏆', '업적', d.badges.ach, on.ach);
    tb('⚙️', '설정', false, on.settings);
    e.append(head, tools);

    const sheet = h('div', 'mapsheet');
    const tabs = h('div', 'chtabs');
    for (const c of d.chapters) {
      const t = btn(`chtab${c.id === d.sel ? ' sel' : ''}${c.open ? '' : ' locked'}${c.fresh ? ' badge' : ''}`, `<span class="ci">${c.open ? c.icon : '🔒'}</span><span class="cn">${c.id}</span>`, () => { this.snd.click(); on.chapter(c.id); });
      t.style.setProperty('--cc', c.color);
      tabs.append(t);
    }
    sheet.append(tabs);
    const c = d.chapters.find((x) => x.id === d.sel)!;
    const info = h('div', 'chinfo');
    info.style.setProperty('--cc', c.color);
    info.innerHTML = `<div class="cht"><span class="chno">${c.id}장</span> ${esc(c.name)} <span class="chs">⭐ ${c.stars}/${c.max} · 🏅 ${c.chal}/${c.chalMax}</span></div>
      <div class="chd">${esc(c.desc)}</div><div class="chl">배우는 것: ${esc(c.learn)}</div>`;
    sheet.append(info);
    if (!c.open) {
      sheet.append(h('div', 'chlock', c.empty ? '🚧 준비 중인 장소예요' : `🔒 ${esc(c.lock)}`));
    } else {
      const path = h('div', 'stagepath');
      d.stages.forEach((s, i) => {
        const n = btn(`snode${s.open ? '' : ' locked'}${s.cleared ? ' cleared' : ''}${s.current ? ' current' : ''}`,
          s.open ? `<span class="sn">${i + 1}</span><span class="ss">${'★'.repeat(s.stars)}<i>${'★'.repeat(3 - s.stars)}</i></span><span class="sc">${s.ch.map((x) => (x ? '●' : '○')).join('')}</span>` : '<span class="sn">🔒</span>',
          () => { if (s.open) { this.snd.click(); on.stage(s.id); } });
        n.title = s.title;
        const lab = h('div', 'slabel', esc(s.title));
        const w = h('div', 'snwrap');
        w.append(n, lab);
        path.append(w);
      });
      sheet.append(path);
    }
    e.append(sheet);
    this.show(e);
  }

  /* ------------------------------ stage card ------------------------------ */

  intro(d: IntroData, on: { start: () => void; back: () => void; cat: () => void; replay?: () => void }) {
    const L = d.level;
    const e = h('div', 'introscr');
    const card = h('div', 'sheet-card');
    const stars = `${'★'.repeat(d.stars)}<i>${'★'.repeat(3 - d.stars)}</i>`;
    const pts = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}점`;
    card.innerHTML = `<div class="ich"><span class="lvno">${L.id}</span><span class="istars">${stars}</span>${d.best ? `<span class="ibest">최고 ${pts(d.best)}</span>` : ''}</div>
      <h2>${esc(L.title)}</h2><div class="sub">${esc(L.subtitle)}</div>
      <div class="goalline"><span class="tgt"></span>${esc(L.goal.text)}</div>
      <div class="pawsline">앞발 장난 <b>${L.paws}번</b> · ⭐⭐ ${pts(L.stars[0])} · ⭐⭐⭐ ${pts(L.stars[1])}</div>
      <div class="chlist">${d.challenges.map((c, i) => `<div class="chrow${d.ch[i] ? ' done' : ''}"><span class="chi">${c.icon}</span><span class="cht2">${esc(c.text)}</span><span class="chk">${d.ch[i] ? '✔' : ''}</span></div>`).join('')}</div>
      ${L.tip ? `<div class="tip">💡 ${esc(L.tip)}</div>` : ''}`;
    const row = h('div', 'row');
    row.append(btn('btn-round', '←', on.back));
    const cat = btn('catchip', `<i class="catdot" style="background:${d.cat.color}"></i><span><b>${esc(d.cat.name)}</b><small>${esc(d.cat.perk)}</small></span>`, on.cat);
    row.append(cat);
    if (on.replay) row.append(btn('btn-round replay', '🎬', on.replay));
    card.append(row);
    card.append(btn('btn-big go', d.first ? '장난 개시! 🐾' : '다시 도전! 🐾', on.start));
    e.append(card);
    this.show(e);
  }

  /** the opening plays over the stage; a tap anywhere skips it */
  prelude(title: string, onSkip: () => void) {
    const e = h('div', 'preludescr');
    e.innerHTML = `<div class="plbar top"></div><div class="plbar bot"><span>${esc(title)}</span></div>`;
    e.append(btn('plskip', '건너뛰기 ▶▶', () => onSkip()));
    e.addEventListener('pointerdown', (ev) => { if (!(ev.target as HTMLElement).closest('.plskip')) onSkip(); });
    this.show(e);
  }

  /* ------------------------------ pause ------------------------------ */

  pause(o: { resume: () => void; retry: () => void; map: () => void; settings: () => void; challenges: { text: string; icon: string; done: boolean }[]; goal: string }) {
    const e = h('div', 'overlay dim menu');
    const c = h('div', 'card');
    c.innerHTML = `<h2>잠깐 쉬는 중…</h2><div class="sub">고양이는 원래 하루 16시간을 자요</div>
      <div class="goalline small"><span class="tgt"></span>${esc(o.goal)}</div>
      <div class="chlist">${o.challenges.map((x) => `<div class="chrow${x.done ? ' done' : ''}"><span class="chi">${x.icon}</span><span class="cht2">${esc(x.text)}</span><span class="chk">${x.done ? '✔' : ''}</span></div>`).join('')}</div>`;
    c.append(btn('btn-big', '▶ 계속하기', o.resume), btn('btn-mid', '↻ 처음부터', o.retry), btn('btn-mid', '🗺️ 장소 선택', o.map), btn('btn-mid', '⚙️ 설정', o.settings));
    e.append(c);
    this.show(e);
  }

  /* ------------------------------ result ------------------------------ */

  async result(level: LevelDef, r: Result, s: Settlement, hasNext: boolean, on: { retry: () => void; next: () => void; map: () => void }) {
    const e = h('div', 'overlay dim result');
    const c = h('div', 'card');
    const caught = r.caught;
    const title = r.success ? (caught ? '현행범 체포!' : r.stars === 3 ? '완전 범죄!' : r.stars === 2 ? '대성공!' : '미션 성공!') : '아직 너무 평화롭다…';
    const sub = r.success
      ? (caught ? '들켜 버렸다… 그래도 피해는 피해다냥.' : level.goal.kind === 'sneak' ? '집사는 아무것도 모른 채 잠들어 있다…' : '범인은 끝내 밝혀지지 않았다…')
      : level.goal.kind === 'sneak' && r.wokeOwner ? '집사가 깨 버렸다! 더 조용히…' : caught ? '들켜 버렸다! 시선을 피해 다시…' : '목표를 아직 망가뜨리지 못했어요';
    c.innerHTML = `<h2>${title}</h2><div class="sub">${sub}</div>
      <div class="stars"><span class="star">⭐</span><span class="star mid">⭐</span><span class="star">⭐</span></div>
      <div class="evalline">장난 평가 <b class="evalv">0</b>점<span class="stamp hidden">신기록!</span></div>
      <div class="best">${s.prevBest > 0 ? `이전 최고 ${Math.round(s.prevBest).toLocaleString('ko-KR')}점` : ''}</div>`;
    const bill = this.receipt(r, s);
    c.append(bill.el);
    const story = h('div', 'story hidden');
    if (r.story.length >= 2) story.innerHTML = `<div class="sh">📜 사건 일지 · 최장 연쇄 x${r.maxChain}</div><div class="sr">${['🐾', ...r.story.map((x) => x.icon)].map((i, k) => `<span style="animation-delay:${k * 0.08}s">${i}</span>`).join('<b>→</b>')}</div>`;
    else story.innerHTML = `<div class="sh">📜 사건 일지</div><div class="sr small">깨뜨린 물건 ${r.broken}개 · 최대 연쇄 x${r.maxChain}</div>`;
    c.append(story);
    const chl = h('div', 'chlist hidden');
    chl.innerHTML = s.challenges.map((x) => `<div class="chrow${x.done || x.before ? ' done' : ''}${x.isNew ? ' new' : ''}"><span class="chi">${x.icon}</span><span class="cht2">${esc(x.text)}</span><span class="chk">${x.isNew ? `<em>NEW</em>` : x.done || x.before ? '✔' : ''}</span></div>`).join('');
    c.append(chl);
    const rew = h('div', 'reward hidden');
    rew.innerHTML = `<div class="rtot">${CHURU_SVG}<b>+${s.churu}</b> 츄르</div><div class="rlines">${s.lines.map((l) => `<div><span>${esc(l.label)}</span><b>+${l.amount}</b></div>`).join('')}</div>`;
    rew.onclick = () => rew.classList.toggle('open');
    c.append(rew);
    if (s.hint) c.append(h('div', 'tip hidden hintline', `💡 ${esc(s.hint)}`));
    const row = h('div', 'row hidden');
    row.append(btn('btn-mid', '🗺️ 지도', on.map), btn('btn-mid', '↻ 다시', on.retry));
    if (r.success && hasNext) { const n = btn('btn-mid nextbtn', '다음 장난 ▶', on.next); row.append(n); }
    c.append(row);
    e.append(c);
    this.show(e);
    // tap anywhere to fast-forward the sequence
    let fast = false;
    e.addEventListener('pointerdown', () => { fast = true; }, { once: true });
    const pause = (ms: number) => (fast ? Promise.resolve() : wait(ms));
    const stars = c.querySelectorAll('.star');
    if (r.success) this.snd.fanfare(); else this.snd.fail();
    await pause(250);
    await bill.play(pause, () => fast);
    countUp(c.querySelector('.evalv') as HTMLElement, r.score, fast ? 1 : 500, (n) => Math.round(n).toLocaleString('ko-KR'));
    await pause(300);
    for (let i = 0; i < r.stars; i++) { stars[i].classList.add('on'); this.snd.star(i); await pause(300); }
    if (s.newBest && s.prevBest > 0) { await pause(200); c.querySelector('.stamp')!.classList.remove('hidden'); this.snd.stamp(); }
    await pause(200);
    story.classList.remove('hidden');
    await pause(300);
    chl.classList.remove('hidden');
    if (s.challenges.some((x) => x.isNew)) this.snd.jingle();
    await pause(250);
    if (s.churu > 0) { rew.classList.remove('hidden'); this.snd.discover(); }
    c.querySelector('.hintline')?.classList.remove('hidden');
    row.classList.remove('hidden');
  }

  /** the damage receipt: what was lost, who did it, and that the cat can't pay */
  private receipt(r: Result, s: Settlement): { el: HTMLElement; play: (pause: (ms: number) => Promise<void>, fast: () => boolean) => Promise<void> } {
    const el = h('div', 'receipt');
    const top = r.receipt.slice(0, 5);
    const rest = r.receipt.slice(5);
    const what = (x: LedgerEntry) => x.label ?? ({ break: '파손', damage: '망가짐', fall: '추락 흠집', topple: '넘어짐', dunk: '침수', other: '피해' } as const)[x.what];
    const line = (x: LedgerEntry) => `<div class="rl"><span class="ri">${x.icon}</span><span class="rn">${esc(x.owner ? `${x.owner}의 ${x.name}` : x.name)} <small>${what(x)}</small>`
      + `${x.heart ? `<em class="rh">💗 정성 ${formatHeart(x.heart)}</em>` : ''}<span class="rp">${x.path.map((i) => `← ${i}`).join(' ')}</span></span>`
      + `<b>${x.money > 0 ? formatWon(x.money) : '값을 매길 수 없음'}</b></div>`;
    const bonusBits = [r.maxChain >= 3 ? `연쇄 x${r.maxChain}` : '', r.pawBonus ? '남은 앞발' : '', r.perfect ? '완전범죄' : '', r.run.swats.length && r.run.swats.every((x) => !x.target) ? '간접 공략' : ''].filter(Boolean).join(' · ');
    el.innerHTML = `<div class="rtitle">손해배상 청구서</div>
      <div class="rlines2">${top.map(line).join('')}${rest.length ? `<div class="rl more"><span class="ri">…</span><span class="rn">그 외 ${rest.length}건</span><b>${formatWon(rest.reduce((a, x) => a + x.money, 0))}</b></div>` : ''}${!top.length ? '<div class="rl more"><span class="rn">아무것도 망가지지 않았다…</span></div>' : ''}</div>
      <div class="rsum"><span>실제 손해</span><b class="rmoney">₩0</b></div>
      ${r.heart ? `<div class="rsum heart"><span>💗 정성 파괴</span><b>${r.finale ? '46억 년' : formatHeart(r.heart)}</b></div>` : ''}
      <div class="rsum bonus"><span>장난 점수${bonusBits ? ` <small>${bonusBits}</small>` : ''}</span><b>+${Math.round(r.bonus).toLocaleString('ko-KR')}</b></div>
      <div class="rbill">청구 대상: 고양이 <small>(지불 능력 없음)</small></div>
      <div class="rstamp hidden">${r.caught ? '현행범' : r.success ? '시치미' : '미수'}</div>`;
    void s;
    const rows = [...el.querySelectorAll('.rl')] as HTMLElement[];
    for (const x of rows) x.classList.add('pre');
    return {
      el,
      play: async (pause, fast) => {
        for (const x of rows) { x.classList.remove('pre'); this.snd.tick(1); await pause(fast() ? 0 : 120); }
        const m = el.querySelector('.rmoney') as HTMLElement;
        if (r.finale) m.textContent = '측정 불가';
        else countUp(m, r.money, fast() ? 1 : 700, formatWon, (i) => { if (!fast()) this.snd.tick(i); });
        await pause(650);
        el.querySelector('.rstamp')!.classList.remove('hidden');
        this.snd.stamp();
      },
    };
  }

  /* ------------------------------ reveal queue ------------------------------ */

  /** one modal card at a time on the top layer; resolves when dismissed */
  reveal(kind: 'ach' | 'unlock' | 'chapter' | 'disc', icon: string, title: string, name: string, text: string, color = '#ffd23f'): Promise<void> {
    return new Promise((res) => {
      const e = h('div', `revealscr ${kind}`);
      e.innerHTML = `<div class="rays"></div><div class="rcard"><div class="rk">${esc(title)}</div><div class="ri" style="--rc:${color}">${icon}</div><div class="rn">${esc(name)}</div><div class="rt">${esc(text)}</div></div>`;
      const ok = btn('btn-big', '좋아!', () => { this.snd.click(); e.classList.add('out'); setTimeout(() => { e.remove(); res(); }, 250); });
      e.querySelector('.rcard')!.append(ok);
      this.top.append(e);
      this.snd.reveal();
    });
  }

  async revealAll(achs: AchDef[], unlocks: UnlockItem[], discs: Discovery[], revealCat: (id: string) => Promise<void>) {
    void discs;
    for (const a of achs) await this.reveal('ach', a.icon, '업적 달성!', a.name, `${a.desc} · 츄르 +${a.reward}`);
    for (const u of unlocks) {
      if (u.kind === 'cat') await revealCat(u.id);
      else if (u.kind === 'chapter') await this.reveal('chapter', u.icon, '새로운 장소 개방!', u.name, '지도에서 새로운 장소를 어지럽혀 보세요', u.color);
      else if (u.kind === 'acc') await this.reveal('unlock', u.icon, '꾸미기 아이템 획득!', u.name, '고양이 방에서 착용할 수 있어요');
      else await this.reveal('unlock', '🎨', '새 털색 획득!', u.name, '고양이 방의 털색 탭에서 바꿀 수 있어요', u.color);
    }
  }

  /* ------------------------------ story (chapter clear / finale) ------------------------------ */

  story(lines: string[], big: string, cls = ''): Promise<void> {
    return new Promise((res) => {
      const e = h('div', `storyscr ${cls}`);
      const box = h('div', 'storybox');
      e.append(box);
      this.top.append(e);
      let i = 0;
      const next = () => {
        if (i < lines.length) {
          const l = h('div', 'sline', esc(lines[i]));
          box.append(l);
          i++;
          setTimeout(next, 1100);
        } else {
          box.append(h('div', 'sbig', big));
          this.snd.reveal();
          const b = btn('btn-big', '계속', () => { this.snd.click(); e.classList.add('out'); setTimeout(() => { e.remove(); res(); }, 400); });
          setTimeout(() => box.append(b), 900);
        }
      };
      setTimeout(next, 500);
    });
  }

  /** chapter title card when entering a new space (non-blocking, fades by itself) */
  chapterTitle(no: number, name: string, icon: string, lines: string[]): Promise<void> {
    return new Promise((res) => {
      const e = h('div', 'chtitle');
      e.innerHTML = `<div class="ctl">${lines.map((l, i) => `<div style="animation-delay:${0.3 + i * 0.9}s">${esc(l)}</div>`).join('')}</div><div class="ctn" style="animation-delay:${0.3 + lines.length * 0.9}s"><span>${no}장</span><b>${icon} ${esc(name)}</b></div>`;
      this.top.append(e);
      const total = 300 + lines.length * 900 + 1900;
      const done = () => { e.classList.add('out'); setTimeout(() => { e.remove(); res(); }, 600); };
      const t = setTimeout(done, total);
      e.onclick = () => { clearTimeout(t); done(); };
      e.classList.add('clickable');
    });
  }

  /* ------------------------------ panels ------------------------------ */

  panel(title: string, onBack: () => void, cls = ''): { el: HTMLElement; body: HTMLElement; tabs: HTMLElement } {
    const e = h('div', `panel ${cls}`);
    const head = h('div', 'phead');
    head.append(btn('btn-round', '←', onBack), h('h2', '', esc(title)));
    const tabs = h('div', 'ptabs');
    const body = h('div', 'pbody');
    e.append(head, tabs, body);
    this.show(e);
    return { el: e, body, tabs };
  }

  settings(o: { sound: boolean; music: boolean; vibrate: boolean; lowGfx: boolean; toggle: (k: 'sound' | 'music' | 'vibrate' | 'lowGfx') => boolean; reset: () => void; back: () => void }) {
    const { body } = this.panel('설정', o.back, 'settings');
    const mk = (k: 'sound' | 'music' | 'vibrate' | 'lowGfx', label: string, on: boolean) => {
      const b = btn(`toggle${on ? ' on' : ''}`, `<span>${label}</span><i></i>`, () => { const v = o.toggle(k); b.classList.toggle('on', v); });
      body.append(b);
    };
    mk('sound', '🔊 효과음', o.sound);
    mk('music', '🎵 배경음악', o.music);
    mk('vibrate', '📳 진동', o.vibrate);
    mk('lowGfx', '🔋 절전 그래픽 (그림자 끄기)', o.lowGfx);
    body.append(h('div', 'help', `<b>조작법</b><br>· 물건을 누른 채 원하는 방향으로 끌었다 놓으면 툭!<br>· 길게 끌수록 세게 쳐요<br>· 물건을 꾹 누르고 있으면 물건 정보<br>· 넓은 집: 빈 곳을 끌어 이동, 두 손가락으로 확대/축소, 두 번 탭하면 전체 보기`));
    let armed = false;
    const r = btn('btn-mid danger', '진행 상황 초기화', () => {
      if (!armed) { armed = true; r.textContent = '정말 초기화할까요? 한 번 더 누르세요'; return; }
      o.reset();
    });
    body.append(r);
    body.append(h('div', 'credits', '와장창 냥이 · three.js + Rapier로 만든 고양이 장난 물리 퍼즐'));
  }

  achievements(list: { a: AchDef; done: boolean; cur: number }[], back: () => void) {
    const { body } = this.panel('업적', back, 'achs');
    const done = list.filter((x) => x.done).length;
    body.append(h('div', 'psum', `달성 ${done}/${list.length}`));
    for (const { a, done: d, cur } of list) {
      const hidden = a.secret && !d;
      const row = h('div', `achrow${d ? ' done' : ''}`);
      const k = Math.min(1, cur / a.goal);
      row.innerHTML = `<div class="ai">${hidden ? '❓' : a.icon}</div><div class="ab"><div class="an">${hidden ? '비밀 업적' : esc(a.name)}</div><div class="ad">${hidden ? '어떤 장난을 치면 열릴까요?' : esc(a.desc)}</div>
        ${d ? '' : `<div class="abar"><i style="width:${k * 100}%"></i><span>${a.goal > 1000 ? `${Math.floor(k * 100)}%` : `${Math.min(cur, a.goal)}/${a.goal}`}</span></div>`}</div>
        <div class="ar">${d ? '✔' : churu('+' + a.reward)}</div>`;
      body.append(row);
    }
  }

  dex(d: { disc: { d: Discovery; found: boolean }[]; objects: { icon: string; name: string; tip: string; seen: boolean }[]; stats: [string, string][] }, back: () => void) {
    const p = this.panel('냥이 도감', back, 'dex');
    const tabs: [string, () => void][] = [
      ['✨ 발견', () => {
        p.body.innerHTML = '';
        p.body.append(h('div', 'psum', `발견 ${d.disc.filter((x) => x.found).length}/${d.disc.length} · 처음 발견하면 츄르 +15`));
        const g = h('div', 'dgrid');
        for (const x of d.disc) g.append(h('div', `dcell${x.found ? ' found' : ''}`, x.found ? `<div class="di">${x.d.icon}</div><div class="dn">${esc(x.d.name)}</div><div class="dd">${esc(x.d.desc)}</div>` : `<div class="di">❓</div><div class="dn">???</div><div class="dd">아직 발견하지 못한 장난</div>`));
        p.body.append(g);
      }],
      ['📦 물건', () => {
        p.body.innerHTML = '';
        p.body.append(h('div', 'psum', `만난 물건 ${d.objects.filter((x) => x.seen).length}/${d.objects.length}`));
        const g = h('div', 'ogrid');
        for (const x of d.objects) g.append(h('div', `ocell${x.seen ? '' : ' unseen'}`, x.seen ? `<div class="oi">${x.icon}</div><div><div class="on">${esc(x.name)}</div><div class="ot">${esc(x.tip)}</div></div>` : `<div class="oi">❔</div><div><div class="on">???</div><div class="ot">아직 만나지 못한 물건</div></div>`));
        p.body.append(g);
      }],
      ['📊 기록', () => {
        p.body.innerHTML = '';
        const t = h('div', 'stats2');
        t.innerHTML = d.stats.map(([k, v]) => `<span>${esc(k)}</span><b>${esc(v)}</b>`).join('');
        p.body.append(t);
      }],
    ];
    tabs.forEach(([label, f], i) => {
      const b = btn(`ptab${i === 0 ? ' sel' : ''}`, label, () => { this.snd.click(); p.tabs.querySelectorAll('.ptab').forEach((x) => x.classList.remove('sel')); b.classList.add('sel'); f(); });
      p.tabs.append(b);
    });
    tabs[0][1]();
  }
}
