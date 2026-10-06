import * as THREE from 'three';
import type { View } from './view';

/* ------------------------------------------------------------------ */
/* 2D layer drawn over each frame: the game's own feedback (pop words,  */
/* chain counter, speech bubbles, the finger gesture) restyled for a    */
/* 1080p frame, plus trailer typography (cards, subtitles, title).      */
/* Every element lives in video time so slow motion never stretches it. */
/* ------------------------------------------------------------------ */

export const INK = '#3b2a4a';
const FONT = 'Jua';

const easeOutBack = (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

type Anchor = THREE.Vector3 | (() => THREE.Vector3);
const at = (a: Anchor) => (typeof a === 'function' ? a() : a);

interface Word { text: string; anchor: Anchor; t0: number; size: number; color: string; rot: number; dur: number }
interface Bubble { text: string; anchor: Anchor; t0: number; dur: number; style: 'cat' | 'owner' | 'info' }
interface Card { text: string; t0: number; dur: number; x: number; y: number; size: number; color: string; rot: number; font: string; style: 'slam' | 'soft' | 'type'; sub?: string }
interface Sub { text: string; t0: number; dur: number }

export class Overlay {
  words: Word[] = [];
  bubbles: Bubble[] = [];
  cards: Card[] = [];
  subs: Sub[] = [];
  chainN = 0;
  chainT = -10;
  chainVisible = true;
  /** finger gesture: world point → drag toward world point */
  finger: { from: THREE.Vector3; to: THREE.Vector3; t0: number; dur: number } | null = null;
  damage: { value: number; shown: number; visible: boolean } = { value: 0, shown: 0, visible: false };
  constructor(private v: View) {}

  clear() { this.words = []; this.bubbles = []; this.cards = []; this.chainN = 0; this.chainT = -10; this.finger = null; this.damage = { value: 0, shown: 0, visible: false }; }

  word(text: string, anchor: Anchor, t: number, size = 1, color = '#ffd23f') {
    // avoid stacking words on the same spot
    this.words.push({ text, anchor, t0: t, size, color, rot: (Math.sin(t * 13.7 + text.length) * 0.5) * 0.28, dur: 1.05 });
    if (this.words.length > 14) this.words.shift();
  }
  bubble(text: string, anchor: Anchor, t: number, dur: number, style: Bubble['style']) {
    this.bubbles = this.bubbles.filter((b) => b.style !== style);
    this.bubbles.push({ text, anchor, t0: t, dur, style });
  }
  chain(n: number, t: number) { this.chainN = n; this.chainT = t; }
  card(text: string, t: number, dur: number, o: Partial<Omit<Card, 'text' | 't0' | 'dur'>> = {}) {
    this.cards.push({ text, t0: t, dur, x: o.x ?? 0.5, y: o.y ?? 0.5, size: o.size ?? 150, color: o.color ?? '#ffffff', rot: o.rot ?? -0.04, font: o.font ?? FONT, style: o.style ?? 'slam', sub: o.sub });
  }
  subtitle(text: string, t: number, dur: number) { this.subs.push({ text, t0: t, dur }); }

  /* ------------------------------ drawing helpers ------------------------------ */

  private inkText(text: string, x: number, y: number, size: number, fill: string, stroke = INK, sw = 0.16, font = FONT, align: CanvasTextAlign = 'center') {
    const ctx = this.v.ctx;
    ctx.font = `${Math.round(size)}px ${font}`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    // drop shadow (offset ink) like the game's chunky UI
    ctx.lineWidth = size * sw;
    ctx.strokeStyle = stroke;
    ctx.fillStyle = stroke;
    ctx.strokeText(text, x, y + size * 0.07);
    ctx.fillText(text, x, y + size * 0.07);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = fill;
    ctx.fillText(text, x, y);
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.v.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ------------------------------ per-frame draw ------------------------------ */

  /** world → layout coordinates (the layout is always 1920 wide) */
  private project(p: THREE.Vector3) {
    const q = this.v.project(p), k = this.v.width / 1920;
    return { x: q.x / k, y: q.y / k, z: q.z };
  }

  draw(t: number) {
    const ctx = this.v.ctx, k = this.v.width / 1920, W = 1920, H = this.v.height / k;
    ctx.save();
    ctx.scale(k, k);
    // finger gesture
    if (this.finger) {
      const f = this.finger;
      const k = clamp01((t - f.t0) / f.dur);
      if (k < 1) {
        const a = this.project(f.from), b = this.project(f.to);
        const e = easeOutCubic(clamp01((k - 0.12) / 0.7));
        const x = a.x + (b.x - a.x) * e, y = a.y + (b.y - a.y) * e;
        const alpha = k < 0.08 ? k / 0.08 : k > 0.9 ? (1 - k) / 0.1 : 1;
        // trail
        ctx.globalAlpha = alpha * 0.55;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 16;
        ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(x, y); ctx.stroke();
        // press ripple at the start
        const rp = clamp01((t - f.t0) / 0.45);
        ctx.globalAlpha = alpha * (1 - rp) * 0.9;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(a.x, a.y, 30 + rp * 50, 0, Math.PI * 2); ctx.stroke();
        // fingertip
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        ctx.shadowColor = 'rgba(40,20,50,0.35)'; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
        ctx.beginPath(); ctx.arc(x, y, 34, 0, Math.PI * 2); ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = INK; ctx.lineWidth = 5;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    // pop words (in-world)
    for (const w of this.words) {
      const k = (t - w.t0) / w.dur;
      if (k < 0 || k > 1) continue;
      const p = this.project(at(w.anchor));
      if (p.z > 1) continue;
      const s = k < 0.18 ? 2.2 - 1.2 * easeOutBack(k / 0.18) : 1 - (k - 0.18) * 0.06;
      const a = k < 0.12 ? k / 0.12 : k > 0.78 ? (1 - k) / 0.22 : 1;
      ctx.save();
      ctx.globalAlpha = clamp01(a);
      ctx.translate(p.x, p.y - k * 40);
      ctx.rotate(w.rot);
      ctx.scale(s, s);
      this.inkText(w.text, 0, 0, 74 * w.size, w.color, INK, 0.2);
      ctx.restore();
    }
    // speech bubbles
    for (const b of this.bubbles) {
      const k = (t - b.t0) / b.dur;
      if (k < 0 || k > 1) continue;
      const p = this.project(at(b.anchor));
      if (p.z > 1) continue;
      const size = b.style === 'owner' ? 54 : 48;
      ctx.font = `${size}px ${FONT}`;
      const tw = ctx.measureText(b.text).width;
      const pw = tw + size * 1.1, ph = size * 1.65;
      const pop = easeOutBack(clamp01((t - b.t0) / 0.22));
      const out = clamp01((b.t0 + b.dur - t) / 0.18);
      const x = Math.max(pw / 2 + 30, Math.min(W - pw / 2 - 30, p.x));
      const y = Math.max(ph + 40, p.y - 30);
      ctx.save();
      ctx.globalAlpha = out;
      ctx.translate(x, y);
      ctx.scale(pop, pop);
      ctx.fillStyle = INK;
      this.roundRect(-pw / 2, -ph + 8, pw, ph, ph * 0.38); ctx.fill();
      ctx.fillStyle = b.style === 'owner' ? '#ffe0e0' : b.style === 'cat' ? '#fff6d6' : '#ffffff';
      ctx.strokeStyle = INK; ctx.lineWidth = 7;
      this.roundRect(-pw / 2, -ph, pw, ph, ph * 0.38); ctx.fill(); ctx.stroke();
      // tail
      ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(0, 30); ctx.lineTo(18, -4); ctx.closePath();
      ctx.fillStyle = INK; ctx.fill();
      ctx.beginPath(); ctx.moveTo(-12, -9); ctx.lineTo(0, 17); ctx.lineTo(12, -9); ctx.closePath();
      ctx.fillStyle = b.style === 'owner' ? '#ffe0e0' : b.style === 'cat' ? '#fff6d6' : '#ffffff'; ctx.fill();
      ctx.fillStyle = INK;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(b.text, 0, -ph / 2 + 2);
      ctx.restore();
    }
    // chain counter
    if (this.chainVisible && this.chainN >= 3) {
      const k = t - this.chainT;
      if (k < 1.6) {
        const n = this.chainN;
        const pop = k < 0.2 ? 1.35 - 0.35 * easeOutBack(k / 0.2) : 1;
        const a = k > 1.25 ? (1.6 - k) / 0.35 : 1;
        const col = n >= 20 ? '#ff7a59' : n >= 10 ? '#ffd23f' : '#ffffff';
        const text = n >= 20 ? `대참사 연쇄 x${n}!!` : n >= 10 ? `연쇄 x${n}!!` : `연쇄 x${n}!`;
        ctx.save();
        ctx.globalAlpha = clamp01(a);
        ctx.translate(W / 2, H * 0.14);
        ctx.rotate(-0.03);
        ctx.scale(pop, pop);
        this.inkText(text, 0, 0, n >= 20 ? 96 : 82, col, INK, 0.2);
        ctx.restore();
      }
    }
    // damage counter (finale)
    if (this.damage.visible) {
      const d = this.damage;
      d.shown += (d.value - d.shown) * 0.25;
      if (Math.abs(d.value - d.shown) < 50) d.shown = d.value;
      const s = '₩' + Math.round(d.shown).toLocaleString('ko-KR');
      ctx.save();
      ctx.translate(W - 60, 70);
      this.inkText('집사 손해액', 0, 0, 34, '#ffffff', INK, 0.22, FONT, 'right');
      this.inkText(s, 0, 62, 66, '#ff6b6b', INK, 0.2, FONT, 'right');
      ctx.restore();
    }
    // trailer cards
    for (const c of this.cards) {
      const k = (t - c.t0) / c.dur;
      if (k < 0 || k > 1) continue;
      const age = t - c.t0, left = c.t0 + c.dur - t;
      let s = 1, a = 1, dy = 0;
      if (c.style === 'slam') { s = age < 0.22 ? 2.6 - 1.6 * easeOutBack(age / 0.22) : 1 + (age - 0.22) * 0.03; a = clamp01(age / 0.08) * clamp01(left / 0.25); }
      else { a = clamp01(age / 0.35) * clamp01(left / 0.35); dy = (1 - easeOutCubic(clamp01(age / 0.5))) * 30; }
      ctx.save();
      ctx.globalAlpha = a;
      ctx.translate(c.x * W, c.y * H + dy);
      ctx.rotate(c.rot);
      ctx.scale(s, s);
      const text = c.style === 'type' ? c.text.slice(0, Math.ceil(c.text.length * clamp01(age / 0.45))) : c.text;
      this.inkText(text, 0, 0, c.size, c.color, INK, c.font === FONT ? 0.18 : 0.12, c.font);
      if (c.sub) this.inkText(c.sub, 0, c.size * 0.95, c.size * 0.36, '#ffffff', INK, 0.2, FONT);
      ctx.restore();
    }
    // subtitles (narration)
    for (const sb of this.subs) {
      const age = t - sb.t0, left = sb.t0 + sb.dur - t;
      if (age < 0 || left < 0) continue;
      const a = clamp01(age / 0.18) * clamp01(left / 0.18);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = `46px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const tw = ctx.measureText(sb.text).width;
      ctx.fillStyle = 'rgba(40,24,52,0.55)';
      this.roundRect(W / 2 - tw / 2 - 30, H - 132, tw + 60, 74, 26); ctx.fill();
      ctx.fillStyle = '#fffaf0';
      ctx.fillText(sb.text, W / 2, H - 95);
      ctx.restore();
    }
    ctx.restore();
  }
}
