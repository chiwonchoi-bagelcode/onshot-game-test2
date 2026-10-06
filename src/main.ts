import './ui/style.css';
import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import { Stage } from './render/Stage';
import { Sfx } from './audio/Sfx';
import { Music } from './audio/Music';
import { Game } from './game/Game';
import { Input } from './game/Input';
import { UI } from './ui/UI';
import { LEVELS, ROOMS } from './levels/levels';
import { ROOM_STYLE } from './levels/rooms';
import { loadSave, writeSave } from './core/save';
import type { LevelDef } from './game/types';

type Mode = 'title' | 'levels' | 'intro' | 'play' | 'pause' | 'result';

class App {
  stage: Stage;
  sfx = new Sfx();
  music: Music;
  game: Game;
  ui: UI;
  input: Input;
  save = loadSave();
  mode: Mode = 'title';
  level: LevelDef = LEVELS[0];
  private last = performance.now();
  private tutorialShown = false;

  constructor() {
    this.stage = new Stage(document.getElementById('game') as HTMLCanvasElement);
    this.sfx.muted = !this.save.sound;
    this.sfx.musicMuted = !this.save.music;
    this.music = new Music(this.sfx);
    this.game = new Game(RAPIER, this.sfx);
    this.stage.scene.add(this.game.scene);
    this.ui = new UI(document.getElementById('ui')!, (p) => this.stage.toScreen(p));
    this.input = new Input(this.stage, this.game, this.sfx);
    this.wire();
    this.loadLevel(LEVELS[0]);
    this.toTitle();
    requestAnimationFrame(this.frame);
    window.addEventListener('pointerdown', () => { this.sfx.unlock(); this.music.start(); }, { once: false });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) { this.sfx.ctx?.suspend(); if (this.mode === 'play') this.pause(); }
      else this.sfx.ctx?.resume();
    });
  }

  private wire() {
    const g = this.game, ui = this.ui;
    g.on((e) => {
      switch (e.type) {
        case 'score': ui.setScore(e.total); ui.popScore(e.amount, e.pos, e.big); break;
        case 'word': ui.popWord(e.text, e.pos, e.size, e.color); break;
        case 'chain': ui.chain(e.n); break;
        case 'paws': ui.setPaws(e.left, e.max); if (e.left < e.max) ui.tutorial(null); break;
        case 'goal': ui.setGoal(e.done, e.need, e.complete, this.level.goal.kind); break;
        case 'goalReached':
          ui.toast(g.paws > 0 ? '🎯 목표 달성! 더 어지르거나 시치미를 떼세요' : '🎯 목표 달성!', 2200);
          break;
        case 'toast': ui.toast(e.text); break;
        case 'bubble': ui.bubble(e.text, e.anchor, e.dur, e.style); break;
        case 'sleep': ui.setSleep(e.value); break;
        case 'phase':
          if (e.phase === 'ending') {
            ui.showEndButton(false);
            this.input.cancel();
            const o = this.game.owner;
            const focus = this.game.cat.group.position.clone();
            if (o?.mode === 'door') focus.lerp(o.group.position, 0.5);
            else if (o) focus.lerp(o.headPos, 0.5);
            this.stage.setFocus(focus, 0.16);
          }
          break;
        case 'end': this.onEnd(e.result); break;
      }
    });
    ui.onMenu = () => this.pause();
    ui.onRetry = () => { this.sfx.click(); this.retry(); };
    ui.onEnd = () => { this.sfx.click(); g.requestEnd(); };
    this.input.onAim = (label, power, x, y, special) => {
      ui.aimLabel(label, power, x, y, special);
      if (label) ui.tutorial(null);
    };
    this.input.onHint = (t) => ui.toast(t, 1500);
  }

  private applyRoomStyle(level: LevelDef) {
    const st = ROOM_STYLE[level.room];
    const bg = document.getElementById('bg')!;
    bg.style.background = `radial-gradient(120% 90% at 50% 30%, ${st.bg[0]}, ${st.bg[1]})`;
    document.querySelector('meta[name=theme-color]')?.setAttribute('content', st.bg[1]);
    this.stage.setLighting(st.hemi[0], st.hemi[1], st.hemi[2], st.sun[0], st.sun[1], st.sun[2]);
  }

  loadLevel(level: LevelDef) {
    this.level = level;
    this.game.load(level);
    this.applyRoomStyle(level);
    this.stage.setFocus(null);
    const v = this.game.view;
    this.stage.frame({ points: this.game.framePoints, yaw: v.yaw, pitch: v.pitch, fov: v.fov });
    this.ui.clearFloating();
    this.ui.tutorial(null);
  }

  index(level: LevelDef) {
    const i = LEVELS.indexOf(level);
    return `${Math.floor(i / 3) + 1}-${(i % 3) + 1}`;
  }

  toTitle() {
    this.mode = 'title';
    this.ui.hideHud();
    this.stage.insetTop = 60; this.stage.insetBottom = 120;
    this.loadLevel(LEVELS[0]);
    this.ui.title(() => { this.sfx.unlock(); this.music.start(); this.sfx.meow('short'); this.toLevels(); });
  }

  toLevels() {
    this.mode = 'levels';
    this.ui.hideHud();
    const unlocked = (i: number) => i === 0 || (this.save.stars[LEVELS[i - 1].id] ?? 0) > 0 || (this.save.stars[LEVELS[i].id] ?? 0) > 0;
    let total = 0;
    for (const l of LEVELS) total += this.save.stars[l.id] ?? 0;
    this.ui.levelSelect(
      ROOMS.map((r, ri) => ({
        ...r,
        levels: LEVELS.slice(ri * 3, ri * 3 + 3).map((l, j) => ({ id: l.id, title: l.title, stars: this.save.stars[l.id] ?? 0, locked: !unlocked(ri * 3 + j) })),
      })),
      total, LEVELS.length * 3,
      (id) => { this.sfx.click(); this.toIntro(LEVELS.find((l) => l.id === id)!); },
      () => { this.sfx.click(); this.toTitle(); },
    );
  }

  toIntro(level: LevelDef) {
    this.mode = 'intro';
    this.stage.insetTop = 140; this.stage.insetBottom = 76;
    this.loadLevel(level);
    this.ui.hideHud();
    this.ui.intro(level, this.index(level), () => { this.sfx.click(); this.startPlay(); });
  }

  startPlay() {
    this.mode = 'play';
    this.ui.clearOverlay();
    this.ui.showHud(this.level, this.index(this.level));
    this.ui.setPaws(this.game.paws, this.game.maxPaws);
    this.game.emitGoal();
    this.game.start();
    this.music.setMood('play');
    // first level: show how to swipe
    if (this.level === LEVELS[0] && !this.tutorialShown) {
      this.tutorialShown = true;
      setTimeout(() => this.showTutorial(), 600);
    }
    setTimeout(() => {
      if (this.mode !== 'play') return;
      this.game.aim.showHints(this.game.props.filter((p) => p.alive && p.interactable && this.game.reachable(p)));
    }, 250);
  }

  private showTutorial() {
    if (this.mode !== 'play' || this.game.paws < this.game.maxPaws) return;
    const t = this.game.targetsLeft()[0];
    if (!t) return;
    const c = t.center(new THREE.Vector3());
    const from = this.stage.toScreen(c);
    const to = this.stage.toScreen(c.clone().add(new THREE.Vector3(1.6, 0, 1.6)));
    this.ui.tutorial(from, to);
    this.ui.toast('꽃병을 누른 채로 떨어뜨릴 방향으로 끌었다 놓아요!', 4000);
  }

  retry() {
    if (this.mode === 'result' || this.mode === 'play' || this.mode === 'pause') {
      this.loadLevel(this.level);
      this.startPlay();
    }
  }

  pause() {
    if (this.mode !== 'play') return;
    this.mode = 'pause';
    this.sfx.click();
    this.input.cancel();
    this.ui.pauseMenu({
      resume: () => { this.sfx.click(); this.mode = 'play'; this.ui.clearOverlay(); this.last = performance.now(); },
      retry: () => { this.sfx.click(); this.ui.clearOverlay(); this.mode = 'play'; this.retry(); },
      levels: () => { this.sfx.click(); this.toLevels(); },
      sound: !this.sfx.muted, music: !this.sfx.musicMuted,
      toggleSound: () => { this.sfx.setMuted(!this.sfx.muted); this.save.sound = !this.sfx.muted; writeSave(this.save); return !this.sfx.muted; },
      toggleMusic: () => { this.sfx.setMusicMuted(!this.sfx.musicMuted); this.save.music = !this.sfx.musicMuted; writeSave(this.save); return !this.sfx.musicMuted; },
    });
  }

  private onEnd(r: import('./game/Game').Result) {
    this.mode = 'result';
    const id = this.level.id;
    const prevBest = this.save.best[id] ?? 0;
    if (r.success) {
      this.save.stars[id] = Math.max(this.save.stars[id] ?? 0, r.stars);
      this.save.best[id] = Math.max(prevBest, r.score);
    } else {
      this.save.fails[id] = (this.save.fails[id] ?? 0) + 1;
    }
    writeSave(this.save);
    const fails = this.save.fails[id] ?? 0;
    let hint: string | null = null;
    if (!r.success && this.level.hints.length) hint = this.level.hints[Math.min(this.level.hints.length - 1, Math.max(0, fails - 1))];
    else if (r.success && r.stars < 3 && this.level.hints.length > 1) hint = '⭐⭐⭐ 힌트: ' + this.level.hints[this.level.hints.length - 1];
    const i = LEVELS.indexOf(this.level);
    this.ui.result(this.level, r, Math.max(prevBest, r.success ? r.score : 0), hint, i < LEVELS.length - 1, {
      retry: () => { this.sfx.click(); this.retry(); },
      next: () => { this.sfx.click(); this.toIntro(LEVELS[i + 1]); },
      menu: () => { this.sfx.click(); this.toLevels(); },
      play: (k, n) => { if (k === 'star') this.sfx.star(n ?? 0); else if (k === 'fanfare') this.sfx.fanfare(); else this.sfx.fail(); },
    });
  }

  private frame = (now: number) => {
    requestAnimationFrame(this.frame);
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    if (this.mode !== 'pause') {
      this.game.update(dt);
      if (this.game.shakeAmt > 0) { this.stage.shake(this.game.shakeAmt); this.game.shakeAmt = 0; }
      if (this.game.punchAmt > 0) { this.stage.punch(this.game.punchAmt); this.game.punchAmt = 0; }
      const showEnd = this.mode === 'play' && this.game.phase === 'ready' && this.game.goalComplete && this.game.paws > 0 && !this.game.cat.busy();
      this.ui.showEndButton(showEnd);
    }
    this.stage.update(dt);
    this.stage.render();
    this.ui.update(dt);
  };
}

async function boot() {
  await RAPIER.init();
  const app = new App();
  (window as unknown as { app: App; __levels: LevelDef[] }).app = app;
  (window as unknown as { __levels: LevelDef[] }).__levels = LEVELS;
  const b = document.getElementById('boot');
  if (b) { b.style.opacity = '0'; setTimeout(() => b.remove(), 500); }
}

boot().catch((e) => {
  console.error(e);
  const b = document.getElementById('boot');
  if (b) b.innerHTML = `<div class="boot-text">앗, 시작하지 못했어요 😿<br><small>${String(e)}</small></div>`;
});
