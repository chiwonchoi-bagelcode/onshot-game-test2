import * as THREE from 'three';
import type { Shot } from '../kit';
import { noIdle, rig } from '../kit';
import { path } from '../camera';
import type { Ctx } from '../director';
import { Cat } from '../../../src/game/Cat';
import { CATS } from '../../../src/meta/cats';
import { M, cyl, mesh, torus, sphere } from '../../../src/render/kit';
import { INK } from '../overlay';

/* ================================================================== */
/* quick hits — one beat each, right before the finale                */
/* ================================================================== */

export const Q_roomba: Shot = {
  id: 'Q_roomba', level: '1-4', cat: 'bengal', dur: 4.2,
  setup(c) { noIdle(c); c.s.muteBubbles = true; c.o.chainVisible = false; },
  cues: [{ t: 0.6, run: (c) => c.d.aimAndSwat('roomba', { dir: [-0.825, 0.565], power: 0.7, aim: 0.3, finger: false, arrow: false }) }],
  tick(c) { c.d.updateAim(); },
  cam: (_c) => ({ pos: new THREE.Vector3(4.3, 1.5, 2.6), look: new THREE.Vector3(2.2, 0.95, -0.55), fov: 32, shadow: 5 }),
};

export const Q_jack: Shot = {
  id: 'Q_jack', level: '5-3', cat: 'ttung', dur: 3.4,
  setup(c) { noIdle(c); c.s.muteBubbles = true; c.o.chainVisible = false; },
  cues: [{ t: 0.6, run: (c) => c.d.aimAndSwat('jack', { near: [-1.0, 0.4, -1.8], dir: [0, -1], power: 0.7, aim: 0.3, finger: false, arrow: false }) }],
  tick(c) { c.d.updateAim(); },
  cam: (c) => ({ ...path([
    { t: 0, pos: [3.4, 2.4, -0.9], look: [-1.0, 2.0, -2.9], fov: 40 },
    { t: 3.4, pos: [3.1, 2.9, -1.1], look: [-1.0, 3.0, -3.2], fov: 40 },
  ], 'none')(c.t), shadow: 6 }),
};

export const Q_phone: Shot = {
  id: 'Q_phone', level: '4-1', cat: 'gold', dur: 3.2,
  setup(c) { noIdle(c); c.s.muteBubbles = true; c.o.chainVisible = false; },
  cues: [{ t: 0.6, run: (c) => c.d.aimAndSwat('phone', { dir: [-1, 0], power: 0.6, aim: 0.3, finger: false, arrow: false }) }],
  tick(c) { c.d.updateAim(); },
  cam: (_c) => ({ pos: new THREE.Vector3(-0.4, 3.0, 0.6), look: new THREE.Vector3(-2.7, 1.45, -2.6), fov: 34, shadow: 5 }),
};

/* ================================================================== */
/* TITLE — every cat, the logo, the line                              */
/* ================================================================== */

interface Lineup { cats: Cat[]; group: THREE.Group; t0: number[] }

function buildLineup(c: Ctx): Lineup {
  const g = new THREE.Group();
  const rug = mesh(cyl(5.2, 5.4, 0.2, 48), M('#ffcf8a'), { pos: [0, -0.1, 0] });
  rug.scale.set(1, 1, 0.5);
  rug.receiveShadow = true;
  g.add(rug);
  for (const [r, col] of [[4.7, '#ff8fa3'], [4.0, '#ffffff']] as const) {
    const ring = mesh(torus(r, 0.06, 4, 64), M(col), { pos: [0, 0.005, 0], rot: [Math.PI / 2, 0, 0], shadow: false });
    ring.scale.set(1, 0.5, 1);
    g.add(ring);
  }
  g.add(mesh(sphere(0.26, 10, 8), M('#7fd3ff'), { pos: [3.9, 0.24, 1.3] }));
  g.add(mesh(sphere(0.2, 8, 6), M('#ffd23f'), { pos: [-3.9, 0.2, 1.2] }));
  // the protagonist in the middle, the rest fanned out around
  // a group photo: five in front, four on a cushion step behind
  const front = ['samsaek', 'siam', 'cheese', 'tux', 'ttung'];
  const back = ['kkamang', 'persian', 'bengal', 'gold'];
  const accOf: Record<string, string[]> = { gold: ['crown'], tux: ['bandana'], persian: ['ribbon'], siam: ['shades'], samsaek: ['flower'], ttung: ['party'] };
  const step = mesh(cyl(3.3, 3.4, 0.6, 40), M('#ff8fa3'), { pos: [0, 0.3, -0.75] });
  step.scale.set(1, 1, 0.34);
  g.add(step);
  const cats: Cat[] = [];
  const place = (id: string, x: number, y: number, z: number) => {
    const def = CATS.find((d) => d.id === id)!;
    const cat = new Cat(def, accOf[id] ?? []);
    cat.faceYaw = Math.atan2(-x * 0.08, 1);
    cat.reset(new THREE.Vector3(x, y, z));
    (cat as unknown as { nextIdleAct: number }).nextIdleAct = 99;
    g.add(cat.group);
    cats.push(cat);
  };
  front.forEach((id, i) => place(id, (i - 2) * 1.32, 0, 0.75 - Math.abs(i - 2) * 0.12));
  back.forEach((id, i) => place(id, (i - 1.5) * 1.34, 0.6, -0.75));
  c.v.scene.add(g);
  c.d.extraScene = g;
  return { cats, group: g, t0: cats.map((cat) => 0.42 + Math.abs(cat.group.position.x) * 0.06 + (cat.group.position.y > 0 ? 0.05 : 0)) };
}

/** the game's logo, drawn big: 와장창 (white) / 냥이 (sun yellow), ink outline, tilted */
function drawLogo(c: Ctx, t: number) {
  const ctx = c.v.ctx, k = c.v.width / 1920;
  const age = t;
  if (age < 0) return;
  const easeOutBack = (x: number) => { const c1 = 2.2, c3 = c1 + 1; return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2); };
  const s = age < 0.28 ? 2.4 - 1.4 * easeOutBack(age / 0.28) : 1 + Math.sin(age * 2.2) * 0.008;
  const a = Math.min(1, age / 0.06);
  ctx.save();
  ctx.scale(k, k);
  ctx.globalAlpha = a;
  ctx.translate(960, 300);
  ctx.rotate(-0.07);
  ctx.scale(s, s);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const line = (text: string, y: number, size: number, fill: string) => {
    ctx.font = `${size}px Jua`;
    ctx.lineWidth = size * 0.2;
    ctx.strokeStyle = INK; ctx.fillStyle = INK;
    ctx.strokeText(text, 0, y + size * 0.1); ctx.fillText(text, 0, y + size * 0.1);
    ctx.strokeText(text, 0, y);
    ctx.fillStyle = fill; ctx.fillText(text, 0, y);
  };
  line('와장창', -100, 250, '#ffffff');
  line('냥이', 130, 228, '#ffd23f');
  ctx.restore();
}

function drawTagline(c: Ctx, t: number) {
  if (t < 0) return;
  const ctx = c.v.ctx, k = c.v.width / 1920;
  const text = '툭, 한 번이면 충분하다냥.';
  const n = Math.ceil(text.length * Math.min(1, t / 0.55));
  const a = Math.min(1, t / 0.15);
  ctx.save();
  ctx.scale(k, k);
  ctx.globalAlpha = a;
  ctx.font = '64px Jua';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const full = ctx.measureText(text).width;
  const w = full + 90, h = 104, x = 960, y = 590;
  ctx.fillStyle = INK;
  const rr = (yy: number) => { ctx.beginPath(); ctx.roundRect(x - w / 2, yy - h / 2, w, h, 30); };
  rr(y + 8); ctx.fill();
  ctx.fillStyle = '#ffffff'; ctx.strokeStyle = INK; ctx.lineWidth = 7;
  rr(y); ctx.fill(); ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'left';
  ctx.fillText(text.slice(0, n), x - full / 2, y + 2);
  ctx.restore();
}

/** paper shards bursting from the logo's impact */
function drawBurst(c: Ctx, t: number) {
  if (t < 0 || t > 1.4) return;
  const ctx = c.v.ctx, k = c.v.width / 1920;
  ctx.save();
  ctx.scale(k, k);
  const cols = ['#ffd23f', '#ff8fa3', '#5ec4c9', '#ffffff', '#ff7a59'];
  for (let i = 0; i < 46; i++) {
    const ang = (i / 46) * Math.PI * 2 + Math.sin(i * 12.9) * 0.3;
    const sp = 900 + ((i * 37) % 11) * 110;
    const x = 960 + Math.cos(ang) * sp * t;
    const y = 360 + Math.sin(ang) * sp * t * 0.75 + 900 * t * t;
    const a = Math.max(0, 1 - t / 1.4);
    ctx.globalAlpha = a;
    ctx.fillStyle = cols[i % cols.length];
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * (6 + (i % 5)) + i);
    ctx.fillRect(-14, -8, 28, 16);
    ctx.restore();
  }
  ctx.restore();
}

export const T_title: Shot = {
  id: 'T_title',
  theme: 'living',
  dur: 6.0,
  bg: ['#fff6e0', '#ffc9b9'],
  vignette: 0.2,
  setup(c) {
    c.s.lineup = buildLineup(c);
    c.v.sun.intensity = 1.7;
  },
  tick(c) {
    const L = c.s.lineup as Lineup;
    L.cats.forEach((cat, i) => {
      if (c.t >= L.t0[i] && c.t < L.t0[i] + 1 / 60 + 1e-6) cat.cheer();
      cat.update(null, 1 / 60, 1 / 60);
    });
  },
  cam: (c) => ({ ...path([
    { t: 0, pos: [0, 3.3, 12.2], look: [0, 2.85, 0], fov: 30 },
    { t: 6, pos: [0, 3.2, 11.5], look: [0, 2.8, 0], fov: 30 },
  ], 'out')(c.t), shadow: 9 }),
  post(c) {
    drawBurst(c, c.t - 0.3);
    drawLogo(c, c.t - 0.3);
    drawTagline(c, c.t - 1.7);
    // flash on the slam
    const f = c.t < 0.3 ? 0 : Math.max(0, 1 - (c.t - 0.3) / 0.35);
    c.v.fade('#ffffff', f * 0.85);
  },
};

/* ================================================================== */
/* STINGER — the oldest cat joke there is                             */
/* ================================================================== */

export const Z_stinger: Shot = {
  id: 'Z_stinger',
  level: '1-1',
  cat: 'cheese',
  dur: 3.6,
  vignette: 0.32,
  setup(c) {
    c.s.muteBubbles = true;
    c.o.chainVisible = false;
    c.g.cat.faceYaw = 0.05;
    c.g.cat.reset(new THREE.Vector3(0.25, 1.25, -0.15));
    noIdle(c);
  },
  cues: [
    { t: 1.55, run: (c) => c.d.aimAndSwat('mug', { near: [-0.55, 1.4, -0.1], dir: [-1, 0], power: 0.42, aim: 0.3, finger: false, arrow: false }) },
  ],
  tick(c) {
    c.d.updateAim();
    const r = rig(c);
    if (c.t < 1.5) r.wantSquint = c.t > 0.7 ? 0.45 : 0;
  },
  cam: (c) => ({ ...path([
    { t: 0, pos: [0.3, 3.7, 4.7], look: [-0.35, 1.55, -0.1], fov: 27 },
    { t: 3.6, pos: [0.25, 3.6, 4.3], look: [-0.4, 1.5, -0.1], fov: 26 },
  ], 'none')(c.t), shadow: 4 }),
};
