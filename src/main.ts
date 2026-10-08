import './ui/style.css';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Stage } from './render/Stage';
import { Sfx } from './audio/Sfx';
import { Music } from './audio/Music';
import { Game, TRICKS, type Result, type TrickId } from './game/Game';
import { Input } from './game/Input';
import { UI } from './ui/UI';
import { Screens, type ChapterCard, type MapData, type StageNode } from './ui/Screens';
import { CatRoom } from './ui/CatRoom';
import { Finale } from './ui/Finale';
import { BY_CHAPTER, CHAPTERS, LEVELS, REMIXES, levelById } from './levels/index';
import { THEME_STYLE } from './levels/rooms';
import type { LevelDef, TutorialStep } from './game/types';
import { PreludePlayer } from './game/Prelude';
import type { Prop } from './game/Prop';
import { loadProfile, peekRec, resetProfile, saveProfile, stat, type Profile } from './meta/profile';
import { CATS, catById, withSkin } from './meta/cats';
import { challengeDone, challengeIcon, challengeText } from './meta/challenges';
import { DISCOVERIES, OBJECTS, discoveryById } from './meta/dex';
import { ACHIEVEMENTS } from './meta/achievements';
import { CHURU, chapterCleared, chapterLock, chapterOpen, checkAchievements, homeDone, nextLevel, settle, stageOpen, totalStars } from './meta/rewards';
import { HOME_CHAPTERS } from './levels/chapters';
import { formatHeart, formatWon } from './core/util';

type Mode = 'title' | 'map' | 'intro' | 'prelude' | 'play' | 'pause' | 'result' | 'cats' | 'panel';

const _v = new THREE.Vector3();
const _box = new THREE.Box3();

class App {
  stage: Stage;
  sfx = new Sfx();
  music: Music;
  game: Game;
  ui: UI;
  screens: Screens;
  catRoom: CatRoom;
  input: Input;
  profile: Profile = loadProfile();
  mode: Mode = 'title';
  level: LevelDef = LEVELS[0];
  mapChapter = 1;
  private last = performance.now();
  private tut: { steps: TutorialStep[]; i: number; waitSettle: boolean; t: number } | null = null;
  private loadedId = '';
  private hintShown = false;
  /** the tutorial / hint hand, anchored to an object every frame */
  private pointer: { prop: Prop; dir: THREE.Vector3; until: number; showAt: number } | null = null;
  private hintTimer = 0;
  private aiming = false;
  /** the simulation is frozen (pause menu and the settings opened from it) */
  private frozen = false;
  /** a stage opening is playing */
  private prelude: PreludePlayer | null = null;
  private forcePrelude = false;
  /** the end-of-the-world cinematic, while it plays */
  private fin: Finale | null = null;

  constructor() {
    this.stage = new Stage(document.getElementById('game') as HTMLCanvasElement);
    const st = this.profile.settings;
    this.sfx.muted = !st.sound;
    this.sfx.musicMuted = !st.music;
    this.music = new Music(this.sfx);
    this.game = new Game(RAPIER, this.sfx);
    this.game.vibrate = st.vibrate;
    if (st.lowGfx) this.stage.setLowGfx(true);
    this.stage.scene.add(this.game.scene);
    this.ui = new UI(document.getElementById('ui')!, (p) => this.stage.toScreen(p));
    const snd = {
      click: () => this.sfx.click(), star: (i: number) => this.sfx.star(i), fanfare: () => this.sfx.fanfare(), fail: () => this.sfx.fail(),
      stamp: () => this.sfx.stamp(), reveal: () => this.sfx.reveal(), tick: (i: number) => this.sfx.tick(i), discover: () => this.sfx.discover(), jingle: () => this.sfx.jingle(), denied: () => this.sfx.denied(),
      meow: (k?: 'short' | 'long' | 'ask' | 'smug' | 'annoyed', p?: number) => this.sfx.meow(k, p), purr: (d?: number) => this.sfx.purr(d),
    };
    this.screens = new Screens(this.ui.overlay, this.ui.top, snd);
    this.catRoom = new CatRoom(this.stage, snd);
    this.input = new Input(this.stage, this.game, this.sfx);
    this.applyCat();
    this.wire();
    this.mapChapter = this.currentChapter();
    this.toTitle();
    requestAnimationFrame(this.frame);
    window.addEventListener('pointerdown', () => { this.sfx.unlock(); this.music.start(); });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.sfx.ctx?.suspend(); if (this.mode === 'play') this.pause(); }
      else this.sfx.ctx?.resume();
    });
  }

  private save() { saveProfile(this.profile); }

  private applyCat() {
    const p = this.profile;
    const def = catById(p.cat);
    this.game.setCat(withSkin(def, p.skinOf[def.id]), p.wear[def.id] ?? []);
  }

  /* ------------------------------------------------------------------ */
  /* game events → HUD                                                  */
  /* ------------------------------------------------------------------ */

  private wire() {
    const g = this.game, ui = this.ui;
    g.on((e) => {
      if (this.mode !== 'play' && this.mode !== 'pause' && e.type !== 'end' && e.type !== 'phase') return;
      switch (e.type) {
        case 'score': ui.setScore(e.total); ui.popScore(e.amount, e.pos, e.big); break;
        case 'word': ui.popWord(e.text, e.pos, e.size, e.color); break;
        case 'chain': {
          const tier = ui.chain(e.n);
          this.music.bump(e.n);
          if (tier) { this.sfx.climax(tier); this.stage.punch(1.5 + tier); g.cat.cheer(); }
          break;
        }
        case 'paws':
          ui.setPaws(e.left, e.max);
          if (e.left < e.max) this.onSwatUsed();
          break;
        case 'goal': ui.setGoal(e.done, e.need, e.complete, this.level.goal.kind); break;
        case 'goalReached':
          this.sfx.jingle();
          ui.toast(g.paws > 0 ? '🎯 목표 달성! 더 어지르거나 시치미를 떼세요' : '🎯 목표 달성!', 2400);
          break;
        case 'toast': ui.toast(e.text); break;
        case 'bubble': ui.bubble(e.text, e.anchor, e.dur, e.style); break;
        case 'sleep':
          ui.setSleep(e.value);
          if (this.level.goal.kind === 'sneak' && e.value >= 60 && !this.hintShown) { this.hintShown = true; ui.toast('😰 집사가 뒤척여요! 더 조용히…', 2200); }
          break;
        case 'suspicion': ui.setSuspicion(e.value, e.seen); if (e.seen) this.sfx.denied(); break;
        case 'trick': this.syncTrick(); break;
        case 'discover': {
          if (this.profile.disc.includes(e.id)) break;
          const d = discoveryById(e.id);
          if (!d) break;
          ui.discovery(d);
          this.sfx.discover();
          break;
        }
        case 'phase':
          if (e.phase === 'ending' && this.mode === 'play') {
            ui.showEndButton(false);
            this.input.cancel();
            this.endTutorial(false);
            const o = g.owner;
            const focus = g.cat.group.position.clone();
            if (o?.mode === 'door') focus.lerp(o.group.position, 0.5);
            else if (o) focus.lerp(o.headPos, 0.5);
            // big houses: pull back so the whole mess (and the owner) is in view
            if (this.stage.roomy) { this.stage.showOverview(true); this.ui.setViewActive(true); }
            else this.stage.setFocus(focus, 0.16);
          }
          break;
        case 'end': if (this.mode === 'play' || this.mode === 'pause') void this.onEnd(e.result); break;
      }
    });
    ui.onMenu = () => this.pause();
    ui.onRetry = () => { this.sfx.click(); this.retry(); };
    ui.onEnd = () => { this.sfx.click(); g.requestEnd(); };
    ui.onView = () => { this.sfx.click(); this.stage.showOverview(!this.stage.overview); if (!this.stage.overview) this.stage.lookAtPoint(g.cat.group.position); ui.setViewActive(this.stage.overview); };
    ui.onHint = () => this.showHint();
    ui.onTrick = () => { if (!g.trick || g.trickUsed || this.mode !== 'play') return; this.sfx.click(); g.armTrick(!g.trickArmed); };
    this.input.onAim = (label, power, x, y, special) => {
      ui.aimLabel(label, power, x, y, special);
      this.aiming = !!label;
      if (label) ui.hand(null);
    };
    this.input.onHint = (t) => ui.toast(t, 1600);
    this.input.onInspect = (p, _x, _y) => this.inspect(p);
    this.input.onViewChange = () => ui.setViewActive(this.stage.overview);
  }

  private inspect(p: Prop | null) {
    this.ui.inspect(p, p ? this.game.reachable(p) : false);
    if (p) this.game.cat.setAim(p.center(_v.clone()));
  }

  /* ------------------------------------------------------------------ */
  /* level loading & camera                                              */
  /* ------------------------------------------------------------------ */

  private applyTheme(level: LevelDef) {
    const st = THEME_STYLE[level.theme];
    const bg = document.getElementById('bg')!;
    bg.style.background = `radial-gradient(120% 90% at 50% 30%, ${st.bg[0]}, ${st.bg[1]})`;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', st.bg[1]);
    this.stage.setLighting(st.hemi[0], st.hemi[1], st.hemi[2], st.sun[0], st.sun[1], st.sun[2]);
  }

  loadLevel(level: LevelDef, force = false) {
    this.level = level;
    if (!force && this.loadedId === level.id && this.game.phase === 'intro') { this.stage.setFocus(null); return; }
    this.loadedId = level.id;
    this.applyCat();
    this.game.trick = this.trickFor(level);
    this.game.load(level);
    this.applyTheme(level);
    this.stage.setFocus(null);
    const v = this.game.view;
    this.stage.setLevel({ points: this.game.framePoints, bounds: this.game.roomBounds, yaw: v.yaw, pitch: v.pitch, fov: v.fov, playWidth: v.playWidth });
    this.ui.clearFloating();
    this.music.setFlavor(level.chapter);
    // object book: remember every kind met
    let fresh = false;
    for (const p of this.game.props) if (OBJECTS[p.kind] && !this.profile.seen.includes(p.kind)) { this.profile.seen.push(p.kind); fresh = true; }
    if (fresh) this.save();
  }

  private setInsets(top: number, bottom: number) { this.stage.setInsets(top, bottom); }

  /** the trick this run uses: the stage's own (remixes) or the equipped one */
  private trickFor(level: LevelDef): TrickId | null {
    if (level.remix?.trick) return level.remix.trick;
    const t = this.profile.trick as TrickId | null;
    return t && this.profile.tricks.includes(t) ? t : null;
  }

  private syncTrick() {
    const g = this.game;
    this.ui.setTrick(g.trick ? TRICKS[g.trick] : null, g.trickArmed, g.trickUsed);
  }

  private currentChapter(): number {
    let ch = 1;
    // the outside stays a surprise until the front door has opened
    for (const c of CHAPTERS) if (chapterOpen(this.profile, c.id) && (c.id <= HOME_CHAPTERS || this.profile.outside)) ch = c.id;
    return ch;
  }

  /** the stage a chapter's diorama shows on the map: the next one to play */
  private focusStage(ch: number): LevelDef {
    if (ch === 0) return REMIXES.find((l) => !peekRec(this.profile, l.id)?.cleared && stageOpen(this.profile, l)) ?? REMIXES[0];
    const ls = BY_CHAPTER[ch - 1] ?? [];
    if (!ls.length) return LEVELS[0];
    return ls.find((l) => !peekRec(this.profile, l.id)?.cleared && stageOpen(this.profile, l)) ?? ls[ls.length - 1];
  }

  /* ------------------------------------------------------------------ */
  /* screens                                                             */
  /* ------------------------------------------------------------------ */

  private leaveOverlayModes() {
    this.frozen = false;
    this.clearHint();
    this.pointer = null;
    if (this.catRoom.active) this.catRoom.close();
    this.ui.hideHud();
    this.ui.hand(null);
    this.stage.swayAmp = 0;
  }

  toTitle() {
    this.mode = 'title';
    this.leaveOverlayModes();
    const lv = this.focusStage(this.currentChapter());
    this.loadLevel(lv);
    this.setInsets(250, 190);
    this.stage.swayAmp = 0.35;
    this.music.setMood('calm');
    const returning = Object.keys(this.profile.levels).length > 0;
    this.screens.title({
      returning, churu: this.profile.churu,
      onStart: () => {
        this.sfx.unlock(); this.music.start(); this.sfx.meow('short', this.game.catDef.voice);
        if (!returning) this.toIntro(LEVELS[0]);
        else this.toMap();
      },
    });
  }

  private lastHome: number | null = null;
  /** the furthest place outside that is open */
  private lastWorld(): number {
    let ch = HOME_CHAPTERS + 1;
    for (const c of CHAPTERS) if (c.id > HOME_CHAPTERS && chapterOpen(this.profile, c.id)) ch = c.id;
    return ch;
  }

  /** the map tab a stage belongs to (request-board stages live on tab 0) */
  private tabOf(level: LevelDef) { return level.remix ? 0 : level.chapter; }

  toMap(ch = this.mapChapter) {
    const p = this.profile;
    // an old save that already cleared the whole house: the door opens now
    if (homeDone(p) && !p.outside) { void this.openDoor(); return; }
    this.mode = 'map';
    this.leaveOverlayModes();
    if (ch === 0 && !homeDone(p)) ch = 1;
    this.mapChapter = ch;
    const region: 'home' | 'world' = ch > HOME_CHAPTERS ? 'world' : 'home';
    if (region === 'home') this.lastHome = ch;
    const lv = this.focusStage(ch);
    if (ch === 0 || BY_CHAPTER[ch - 1].length) this.loadLevel(lv);
    this.stage.swayAmp = 0.3;
    this.music.setMood('calm');
    const inRegion = (id: number) => (region === 'world' ? id > HOME_CHAPTERS : id <= HOME_CHAPTERS);
    const chapters: ChapterCard[] = CHAPTERS.filter((c) => inRegion(c.id)).map((c) => {
      const ls = BY_CHAPTER[c.id - 1];
      const stars = ls.reduce((a, l) => a + (peekRec(p, l.id)?.stars ?? 0), 0);
      const chal = ls.reduce((a, l) => a + (peekRec(p, l.id)?.ch.filter(Boolean).length ?? 0), 0);
      const open = chapterOpen(p, c.id);
      return {
        id: c.id, name: c.name, icon: c.icon, color: c.color, desc: c.desc, learn: c.learn, open, lock: c.id > 1 ? chapterLock(p, c.id) : '',
        stars, max: ls.length * 3, chal, chalMax: ls.reduce((a, l) => a + l.challenges.length, 0), cleared: chapterCleared(p, c.id),
        fresh: open && !p.chapterIntro.includes(c.id), empty: ls.length === 0,
      };
    });
    const ls = ch === 0 ? REMIXES : BY_CHAPTER[ch - 1];
    const stages: StageNode[] = ls.map((l) => {
      const r = peekRec(p, l.id);
      const open = stageOpen(p, l);
      const why = l.remix && !open ? `${l.remix.base} 스테이지를 먼저 클리어하세요` : l.goal.short;
      return { id: l.id, title: l.title, stars: r?.stars ?? 0, ch: l.challenges.map((_, i) => !!r?.ch[i]), chN: l.challenges.length, open, cleared: !!r?.cleared, current: l === lv && !r?.cleared, goal: why };
    });
    const def = catById(p.cat);
    const worldOpen = chapterOpen(p, HOME_CHAPTERS + 1);
    const d: MapData = {
      churu: p.churu, stars: totalStars(p), maxStars: (LEVELS.length + REMIXES.length) * 3, chapters, sel: ch, stages,
      badges: { cats: p.fresh.includes('cats'), dex: p.fresh.includes('dex'), ach: p.fresh.includes('ach') },
      catName: def.name, catColor: def.color,
      region,
      world: { open: worldOpen, lock: chapterLock(p, HOME_CHAPTERS + 1), fresh: worldOpen && !p.chapterIntro.includes(HOME_CHAPTERS + 1), ended: p.worldEnd },
      board: region === 'home' && REMIXES.length ? {
        open: homeDone(p), lock: '우리 집 스테이지를 모두 클리어하면 동네 고양이들이 의뢰를 맡겨요',
        stars: REMIXES.reduce((a, l) => a + (peekRec(p, l.id)?.stars ?? 0), 0), max: REMIXES.length * 3,
      } : null,
    };
    this.screens.map(d, {
      chapter: (id) => this.toMap(id),
      region: (r) => this.toMap(r === 'home' ? (this.lastHome ?? 1) : this.lastWorld()),
      stage: (id) => { const l = levelById(id); if (l) this.toIntro(l); },
      cats: () => this.toCats(() => this.toMap()),
      dex: () => this.toDex(),
      ach: () => this.toAch(),
      settings: () => this.toSettings(() => this.toMap()),
      title: () => { this.sfx.click(); this.toTitle(); },
    });
    requestAnimationFrame(() => {
      const sheet = document.querySelector('.mapsheet') as HTMLElement | null;
      const head = document.querySelector('.maptools') as HTMLElement | null;
      const top = head ? head.getBoundingClientRect().bottom + 6 : 120;
      this.setInsets(top, sheet ? window.innerHeight - sheet.getBoundingClientRect().top + 6 : 330);
    });
  }

  async toIntro(level: LevelDef) {
    this.mode = 'intro';
    this.leaveOverlayModes();
    this.mapChapter = this.tabOf(level);
    this.loadLevel(level);
    const p = this.profile;
    // entering a new space for the first time: chapter title + camera swoop
    if (!p.chapterIntro.includes(level.chapter)) {
      p.chapterIntro.push(level.chapter);
      this.save();
      const c = CHAPTERS[level.chapter - 1];
      this.screens.clear();
      this.setInsets(80, 80);
      this.stage.flyIn(2.8, 1.3, 0.45);
      this.sfx.reveal();
      await this.screens.chapterTitle(c.id, c.name, c.icon, c.intro);
      if (this.mode !== 'intro' || this.level !== level) return;
    }
    const r = peekRec(p, level.id);
    const def = catById(p.cat);
    this.screens.intro({
      level, stars: r?.stars ?? 0, best: r?.best ?? 0, ch: level.challenges.map((_, i) => !!r?.ch[i]),
      challenges: level.challenges.map((c) => ({ text: challengeText(c), icon: challengeIcon(c) })),
      cat: { name: def.name, color: def.color, perk: def.perk.name }, first: !r?.cleared,
      tricks: (level.remix?.trick ? [level.remix.trick] : p.tricks).map((id) => ({ id, ...TRICKS[id as TrickId] })),
      trick: level.remix?.trick ?? p.trick, trickFixed: !!level.remix?.trick,
    }, {
      trick: (id) => { p.trick = id; this.save(); this.game.trick = this.trickFor(level); },
      start: () => { this.sfx.click(); this.startPlay(); },
      back: () => { this.sfx.click(); this.toMap(this.tabOf(level)); },
      cat: () => this.toCats(() => this.toIntro(level)),
      replay: level.prelude && p.preludes.includes(level.id) ? () => { this.sfx.click(); this.forcePrelude = true; this.startPlay(); } : undefined,
    });
    // the whole space (with the goal markers) is in view while the card is up
    this.stage.showOverview(true);
    requestAnimationFrame(() => {
      const card = document.querySelector('.sheet-card') as HTMLElement | null;
      this.setInsets(70, card ? window.innerHeight - card.getBoundingClientRect().top + 8 : 360);
    });
  }

  startPlay() {
    const level = this.level;
    if (this.game.phase !== 'intro') this.loadLevel(level, true);
    // the first time: the owner shows us how precious it all is
    if (level.prelude && (this.forcePrelude || !this.profile.preludes.includes(level.id))) {
      this.forcePrelude = false;
      this.playPrelude(level);
      return;
    }
    this.beginPlay();
  }

  private playPrelude(level: LevelDef) {
    this.mode = 'prelude';
    this.leaveOverlayModes();
    this.setInsets(70, 70);
    this.stage.showOverview(false);
    this.music.setMood('calm');
    this.prelude = new PreludePlayer(this.game, level.prelude!, (p, amt) => {
      if (p && this.stage.roomy) this.stage.lookAtPoint(p);
      this.stage.setFocus(p, amt);
    });
    this.screens.prelude(level.title, () => this.prelude?.skip());
  }

  private endPrelude() {
    const level = this.level;
    this.prelude = null;
    if (!this.profile.preludes.includes(level.id)) { this.profile.preludes.push(level.id); this.save(); }
    this.stage.setFocus(null);
    this.beginPlay();
  }

  private beginPlay() {
    this.mode = 'play';
    const level = this.level;
    this.screens.clear();
    this.setInsets(140, 82);
    this.ui.showHud(level, { roomy: this.stage.roomy, labels: this.game.roomLabels, watched: this.game.watchers.length > 0 });
    this.ui.setPaws(this.game.paws, this.game.maxPaws);
    this.syncTrick();
    this.ui.setViewActive(false);
    this.ui.resetChainTier();
    this.game.emitGoal();
    this.game.start();
    this.hintShown = false;
    this.clearHint();
    this.pointer = null;
    this.music.setMood('play');
    if (this.stage.roomy) {
      const s = level.start ? new THREE.Vector3(level.start[0], 0, level.start[1]) : this.game.catHome.clone();
      this.stage.lookAtPoint(s);
    }
    const rec = peekRec(this.profile, level.id);
    this.ui.hintGlow((rec?.streak ?? 0) >= 1);
    setTimeout(() => {
      if (this.mode !== 'play') return;
      this.game.aim.showHints(this.game.props.filter((p) => p.alive && p.interactable && this.game.reachable(p)));
      this.game.cat.sayLine(this.game, 'hello', 1.8);
    }, 300);
    if (level.tutorial?.length && !this.profile.tutorial.includes(level.id)) {
      this.tut = { steps: level.tutorial, i: 0, waitSettle: false, t: 0 };
      setTimeout(() => this.showTutStep(), 700);
    } else this.tut = null;
  }

  /* ------------------------------------------------------------------ */
  /* tutorial coach & hints                                              */
  /* ------------------------------------------------------------------ */

  private findProp(kind: string, near?: [number, number, number]): Prop | undefined {
    const c = this.game.props.filter((p) => p.alive && p.interactable && (p.kind === kind || p.name === kind));
    if (near) { const n = new THREE.Vector3(...near); c.sort((a, b) => a.center(_v).distanceTo(n) - b.center(new THREE.Vector3()).distanceTo(n)); }
    return c[0];
  }

  /** point the animated hand at an object (and bring it into view first in big houses) */
  private demo(kind: string | undefined, near: [number, number, number] | undefined, dir: [number, number] | undefined, dur = Infinity) {
    this.pointer = null;
    this.ui.hand(null);
    if (!kind) return;
    const p = this.findProp(kind, near);
    if (!p) return;
    const c = p.center(new THREE.Vector3());
    const now = performance.now() / 1000;
    let showAt = now;
    if (!this.stage.onScreen(c, 60)) { this.stage.lookAtPoint(c); showAt = now + 0.7; }
    const d = dir ? new THREE.Vector3(dir[0], 0, dir[1]).normalize() : new THREE.Vector3(0, 0, 1);
    this.pointer = { prop: p, dir: d, until: now + dur, showAt };
  }

  /** keep the hand on its object while the camera moves; hide it while aiming */
  private updatePointer() {
    const pt = this.pointer;
    if (!pt) return;
    const now = performance.now() / 1000;
    if (!pt.prop.alive || now > pt.until || this.mode !== 'play') { this.pointer = null; this.ui.hand(null); return; }
    if (this.aiming || now < pt.showAt) { this.ui.hand(null); return; }
    const c = pt.prop.center(_v);
    const from = this.stage.toScreen(c);
    const to = this.stage.toScreen(c.clone().addScaledVector(pt.dir, 1.9));
    this.ui.moveHand(from, to);
  }

  private clearHint() {
    clearTimeout(this.hintTimer);
    this.hintTimer = 0;
  }

  private showTutStep() {
    const t = this.tut;
    if (!t || this.mode !== 'play') return;
    const s = t.steps[t.i];
    if (!s) { this.endTutorial(true); return; }
    this.ui.coach(s.text, t.i, t.steps.length);
    this.demo(s.prop, s.near, s.dir);
  }

  private onSwatUsed() {
    this.pointer = null;
    this.ui.hand(null);
    const t = this.tut;
    if (!t) return;
    const s = t.steps[t.i];
    t.i++;
    if (s?.until === 'settle') t.waitSettle = true;
    else setTimeout(() => { if (this.tut === t && !t.waitSettle) this.showTutStep(); }, 1400);
    if (t.i >= t.steps.length) { this.ui.coach(null); this.endTutorial(true); }
  }

  private endTutorial(done: boolean) {
    this.pointer = null;
    if (!this.tut) return;
    if (done && !this.profile.tutorial.includes(this.level.id)) { this.profile.tutorial.push(this.level.id); this.save(); }
    this.tut = null;
    this.ui.coach(null);
    this.ui.hand(null);
  }

  private showHint() {
    this.sfx.click();
    const L = this.level;
    const rec = peekRec(this.profile, L.id);
    const i = Math.min(L.hints.length - 1, Math.max(0, (rec?.streak ?? 0) - 1));
    // a fresh hint replaces the previous one (its timer must not hide the new bubble)
    this.clearHint();
    if (L.hints[i]) this.ui.coach(L.hints[i]);
    if (L.hintMove) this.demo(L.hintMove.prop, L.hintMove.near, L.hintMove.dir, 5);
    this.hintTimer = window.setTimeout(() => {
      this.hintTimer = 0;
      if (this.tut) this.showTutStep(); else this.ui.coach(null);
    }, 5000);
  }

  /* ------------------------------------------------------------------ */
  /* flow                                                                */
  /* ------------------------------------------------------------------ */

  /** quitting mid-stage still keeps first discoveries (learning by doing) */
  private keepDiscoveries() {
    if (!this.game.run || this.game.phase === 'intro') return;
    const p = this.profile;
    let n = 0;
    for (const id of this.game.run.discovered) if (!p.disc.includes(id) && DISCOVERIES.some((d) => d.id === id)) { p.disc.push(id); p.fresh.push('dex'); n++; }
    if (n) { p.churu += n * CHURU.discovery; checkAchievements(p); this.save(); }
  }

  retry() {
    if (this.mode === 'result' || this.mode === 'play' || this.mode === 'pause') {
      if (this.mode !== 'result') this.keepDiscoveries();
      this.screens.clear();
      this.loadLevel(this.level, true);
      this.startPlay();
    }
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.frozen = true;
    this.sfx.click();
    this.input.cancel();
    const g = this.game;
    const fake = { success: g.goalComplete, score: g.score, stars: 0, maxChain: g.maxChain, broken: g.brokenCount, pawsLeft: g.paws, pawsUsed: g.maxPaws - g.paws, pawBonus: 0, money: g.money, bonus: g.bonus, heart: g.heart, receipt: [], caught: false, perfect: false, finale: false, story: [], run: g.run, wokeOwner: !!g.owner?.awake, noise: g.noise } as Result;
    const rec = peekRec(this.profile, this.level.id);
    this.screens.pause({
      goal: this.level.goal.text,
      challenges: this.level.challenges.map((c, i) => ({ text: challengeText(c), icon: challengeIcon(c), done: !!rec?.ch[i] || challengeDone(c, fake) })),
      resume: () => { this.sfx.click(); this.mode = 'play'; this.frozen = false; this.screens.clear(); this.last = performance.now(); },
      retry: () => { this.sfx.click(); this.mode = 'play'; this.frozen = false; this.retry(); },
      map: () => { this.sfx.click(); this.keepDiscoveries(); this.toMap(this.tabOf(this.level)); },
      settings: () => { this.sfx.click(); this.toSettings(() => { this.mode = 'play'; this.pause(); }); },
    });
  }

  private async onEnd(r: Result) {
    this.mode = 'result';
    this.endTutorial(false);
    const level = this.level;
    const p = this.profile;
    const s = settle(p, level, r, this.game.perk);
    this.save();
    // the end of the world: the cinematic comes first, the receipt after
    if (r.finale) {
      await this.earthEnd(!s.worldEnd);
      if (this.mode !== 'result') return;
    }
    const next = nextLevel(level, p);
    const hasNext = !!next && stageOpen(p, next) && !s.doorOpened;
    await this.screens.result(level, r, s, hasNext, {
      retry: () => { this.sfx.click(); this.retry(); },
      next: () => { this.sfx.click(); if (next) void this.toIntro(next); },
      map: () => { this.sfx.click(); this.toMap(this.tabOf(level)); },
    });
    // reward reveals, one by one, on top of the result card (the door speaks for chapter 7 itself)
    const unlocks = s.doorOpened ? s.unlocks.filter((u) => !(u.kind === 'chapter' && u.id === String(HOME_CHAPTERS + 1))) : s.unlocks;
    if (s.achievements.length || unlocks.length) {
      await this.screens.revealAll(s.achievements, unlocks, s.discoveries, (id) => this.catRoom.reveal(id, this.ui.top));
    }
    if (s.chapterCleared && !s.finale && !s.worldEnd) {
      const c = CHAPTERS[s.chapterCleared - 1];
      const out = CHAPTERS[s.chapterCleared - 1]?.outside;
      await this.screens.story(out ? [`${c.name}도 이제 완벽한 난장판이다.`, '사람들은 오늘도 범인을 찾지 못했다…', '저 멀리, 더 큰 무언가가 고양이를 부른다.'] : [`${c.name}은(는) 이제 완벽한 난장판이다.`, '집사는 오늘도 범인을 찾지 못했다…'], `${c.icon} ${c.name} 정복!`, 'clear');
    }
    if (s.finale) await this.finale();
    if (s.worldEnd) await this.afterEarth();
    if (s.doorOpened) await this.openDoor();
  }

  /** the planet goes, a little ship gets away; first time: watch at least a moment */
  private async earthEnd(seen: boolean) {
    this.screens.clear();
    this.ui.hideHud();
    this.ui.hand(null);
    this.music.setMood('calm');
    const p = this.profile;
    const def = catById(p.cat);
    this.fin = new Finale(this.stage, this.sfx, withSkin(def, p.skinOf[def.id]), p.wear[def.id] ?? []);
    await this.fin.play(this.ui.top, seen);
    this.fin = null;
  }

  private async afterEarth() {
    await this.screens.story([
      '그날, 지구는 사라졌다.',
      '사건 일지의 첫 줄에는 털실 한 뭉치가 적혀 있었다.',
      '하지만 우주선 안은 따뜻했고, 츄르는 넉넉했다.',
      '집사는 끝내 범인을 찾지 못했다.',
      '…다음 행성에는 뭐가 있을까냥?',
    ], '🪐 와장창 대우주 완결!', 'finale');
  }

  /** all thirty house stages cleared: the front door opens onto the world */
  private async openDoor() {
    const p = this.profile;
    p.outside = true;
    this.save();
    this.mode = 'result';
    this.leaveOverlayModes();
    this.music.setMood('calm');
    this.sfx.reveal();
    await this.screens.story([
      '거실, 주방, 욕실, 아이방, 서재, 그리고 온 집 안.',
      '더 깨뜨릴 게 남아 있지 않았다.',
      '그때, 현관문 틈으로 바깥 냄새가 들어왔다.',
      '끼이익—',
      '이 집은… 너무 작다냥.',
    ], '🚪 현관문이 열렸다!', 'door');
    const first = BY_CHAPTER[HOME_CHAPTERS]?.[0];
    if (first) await this.toIntro(first);
    else this.toMap(1);
  }

  private async finale() {
    this.music.setMood('calm');
    await this.screens.story([
      '집사의 일기 —',
      '거실의 꽃병, 주방의 접시, 욕실의 휴대폰…',
      '아이방의 성은 무너졌고, 괘종시계는 쓰러졌다.',
      '범인은 아직도 오리무중이다.',
      '그런데 왜 우리 냥이는 저렇게 뿌듯한 얼굴일까?',
    ], '🏆 와장창 대참사 완성!', 'finale');
    if (!this.profile.cats.includes('gold')) { /* granted by settle via the finale unlock */ }
    this.music.setMood('play');
  }

  /* ------------------------------------------------------------------ */
  /* meta screens                                                        */
  /* ------------------------------------------------------------------ */

  toCats(back: () => void) {
    this.sfx.click();
    this.mode = 'cats';
    this.ui.hideHud();
    this.catRoom.open(this.profile, this.ui.overlay, {
      save: () => { this.save(); this.applyCat(); this.loadedId = ''; },
      close: () => { this.applyCat(); this.loadedId = ''; back(); },
    });
    this.save();
  }

  toDex() {
    this.sfx.click();
    this.mode = 'panel';
    const p = this.profile;
    p.fresh = p.fresh.filter((f) => f !== 'dex');
    this.save();
    const kinds = Object.keys(OBJECTS);
    const names = new Map<string, string>();
    for (const pr of this.game.props) names.set(pr.kind, pr.name);
    const fmt = (n: number) => Math.round(n).toLocaleString('ko-KR');
    this.screens.dex({
      disc: DISCOVERIES.map((d) => ({ d, found: p.disc.includes(d.id) })),
      objects: kinds.map((k) => ({ icon: OBJECTS[k].icon, name: names.get(k) ?? DEX_NAMES[k] ?? k, tip: OBJECTS[k].tip, seen: p.seen.includes(k) })),
      stats: [
        ['누적 손해액', formatWon(stat(p, 'damage'))], ['한 판 최고 손해액', formatWon(stat(p, 'bestRun'))], ['깨뜨린 물건', `${fmt(stat(p, 'breaks'))}개`],
        ['넘어뜨린 물건', `${fmt(stat(p, 'topples'))}개`], ['물에 빠뜨린 물건', `${fmt(stat(p, 'dunks'))}개`], ['최대 연쇄', `x${stat(p, 'chainMax')}`],
        ['휘두른 앞발', `${fmt(stat(p, 'swats'))}번`], ['플레이', `${fmt(stat(p, 'plays'))}판`], ['클리어', `${fmt(stat(p, 'clears'))}번`],
        ['집사 깨운 횟수', `${fmt(stat(p, 'wakes'))}번`], ['모은 별', `${totalStars(p)}/${(LEVELS.length + REMIXES.length) * 3}`], ['함께하는 고양이', `${p.cats.length}/${CATS.length}`],
        ['망가뜨린 정성', formatHeart(stat(p, 'heart'))], ['완전 범죄', `${fmt(stat(p, 'perfect'))}번`], ['들킨 횟수', `${fmt(stat(p, 'caught'))}번`],
      ],
    }, () => { this.sfx.click(); this.toMap(); });
  }

  toAch() {
    this.sfx.click();
    this.mode = 'panel';
    const p = this.profile;
    p.fresh = p.fresh.filter((f) => f !== 'ach');
    this.save();
    const list = ACHIEVEMENTS.map((a) => ({ a, done: p.ach.includes(a.id), cur: a.progress(p) }));
    list.sort((x, y) => Number(x.done) - Number(y.done) || y.cur / y.a.goal - x.cur / x.a.goal);
    this.screens.achievements(list, () => { this.sfx.click(); this.toMap(); });
  }

  toSettings(back: () => void) {
    this.mode = 'panel';
    const st = this.profile.settings;
    this.screens.settings({
      sound: st.sound, music: st.music, vibrate: st.vibrate, lowGfx: st.lowGfx,
      toggle: (k) => {
        st[k] = !st[k];
        if (k === 'sound') this.sfx.setMuted(!st.sound);
        if (k === 'music') this.sfx.setMusicMuted(!st.music);
        if (k === 'vibrate') { this.game.vibrate = st.vibrate; this.game.buzz(30); }
        if (k === 'lowGfx') this.stage.setLowGfx(st.lowGfx);
        this.sfx.click();
        this.save();
        return st[k];
      },
      reset: () => { this.profile = resetProfile(); this.applyCat(); this.loadedId = ''; this.mapChapter = 1; this.toTitle(); },
      back: () => { this.sfx.click(); back(); },
    });
  }

  /* ------------------------------------------------------------------ */
  /* main loop                                                           */
  /* ------------------------------------------------------------------ */

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (!this.frozen) {
      this.game.update(dt);
      if (this.game.shakeAmt > 0) { this.stage.shake(this.game.shakeAmt); this.game.shakeAmt = 0; }
      if (this.game.punchAmt > 0) { this.stage.punch(this.game.punchAmt); this.game.punchAmt = 0; }
      const showEnd = this.mode === 'play' && this.game.phase === 'ready' && this.game.goalComplete && this.game.paws > 0 && !this.game.cat.busy();
      this.ui.showEndButton(showEnd);
      if (this.mode === 'play' && this.game.phase === 'ready') {
        const n = this.game.actionBox(_box);
        this.stage.track(_box, n);
        const t = this.tut;
        if (t?.waitSettle && !this.game.busy()) { t.waitSettle = false; this.showTutStep(); }
        this.updatePointer();
      }
    }
    if (this.mode === 'prelude' && this.prelude) {
      this.prelude.update(dt);
      if (this.prelude.done) this.endPrelude();
    }
    this.catRoom.update(dt);
    this.fin?.update(dt);
    this.stage.update(dt);
    this.stage.render();
    this.ui.update(dt);
  };

  /* ------------------------------ dev hooks (tools/shot.mjs) ------------------------------ */
  debugLevel(id: string) { const l = levelById(id); if (l) { this.loadedId = ''; this.loadLevel(l, true); this.startPlay(); } }
}

/** names for kinds not present in the current stage (object book) */
const DEX_NAMES: Record<string, string> = {
  mug: '머그컵', vase: '꽃병', plate: '접시', teapot: '찻주전자', piggy: '돼지저금통', plant: '화분', glass: '와인잔', cup: '주스잔', bottle: '와인병',
  marbleJar: '구슬병', marble: '구슬', book: '책', domino: '도미노', ball: '공', yarn: '털실뭉치', duck: '고무오리', car: '장난감 자동차', roomba: '로봇청소기',
  soda: '탄산음료', cushion: '쿠션', tv: 'TV', laptop: '노트북', lamp: '스탠드', deskLamp: '책상 스탠드', alarm: '자명종', egg: '달걀', carton: '달걀판',
  flour: '밀가루', pot: '냄비', pin: '밀대', fruit: '과일', cake: '케이크', toaster: '토스터', toast: '토스트', cloth: '식탁보', bookshelf: '책장',
  sidetable: '협탁', chair: '의자', frame: '액자', shelf: '벽 선반', trophy: '트로피', globe: '지구본', pencup: '연필꽂이', papers: '서류', seesaw: '시소',
  soap: '비누', tp: '두루마리 휴지', phone: '집사 폰', perfume: '향수', shampoo: '샴푸', toothcup: '양치컵', dryer: '드라이기', block: '나무 블록',
  doll: '도자기 인형', globeSnow: '스노우볼', balloon: '풍선', jack: '깜짝 상자', train: '장난감 기차', plush: '인형', coatRack: '옷걸이', umbrella: '우산꽂이',
  grandClock: '괘종시계', aquarium: '수조', fan: '선풍기', shoe: '운동화', pillow: '베개', guitar: '기타', cereal: '시리얼', milk: '우유', pan: '프라이팬',
  gadget: '전자기기', stool: '목욕 의자', basket: '빨래 바구니', towel: '수건', slipper: '욕실 슬리퍼',
};

async function boot() {
  await RAPIER.init();
  const app = new App();
  const w = window as unknown as { app: App; __levels: LevelDef[] };
  w.app = app;
  w.__levels = LEVELS;
  const b = document.getElementById('boot');
  if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<div class="boot-text">앗, 시작하지 못했어요 😿<br><small>${String(e)}</small></div>`;
});
