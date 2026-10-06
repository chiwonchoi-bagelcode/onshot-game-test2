import { Sfx, type Loop } from '../../src/audio/Sfx';
import { mulberry32 } from '../../src/core/util';
import type { SoundEvent } from './director';

/**
 * Replays recorded sound calls through the game's own WebAudio synth into an
 * OfflineAudioContext, so every swat, crash and splash in the trailer is the
 * exact sound the game makes — placed sample-accurately on the picture.
 */
export async function renderSfx(events: SoundEvent[], dur: number, sr = 48000, seed = 7): Promise<string> {
  const ctx = new OfflineAudioContext(2, Math.ceil(dur * sr), sr);
  let cursor = 0;
  // the synth asks ctx.currentTime for "now": answer with the event's time
  const view = new Proxy(ctx, {
    get(t, p) {
      if (p === 'currentTime') return cursor;
      const v = Reflect.get(t, p, t);
      return typeof v === 'function' ? v.bind(t) : v;
    },
  });
  const sfx = new Sfx();
  const S = sfx as unknown as Record<string, unknown> & { ctx: unknown; voices: number };
  // the same graph Sfx.unlock() builds, minus the live AudioContext
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 10; comp.ratio.value = 5; comp.attack.value = 0.003; comp.release.value = 0.2;
  const master = ctx.createGain(); master.gain.value = 0.9;
  const bus = ctx.createGain(); bus.gain.value = 1;
  const musicBus = ctx.createGain(); musicBus.gain.value = 0;
  bus.connect(comp); musicBus.connect(comp); comp.connect(master); master.connect(ctx.destination);
  const noise = ctx.createBuffer(1, sr, sr);
  const rnd = mulberry32(seed);
  const d = noise.getChannelData(0);
  for (let i = 0; i < sr; i++) d[i] = rnd() * 2 - 1;
  Object.assign(S, { ctx: view, master, bus, musicBus, noiseBuf: noise });
  // trailer mix trims: the soda hiss and the UI-ish plings sit lower than in the game
  const TRIM: Record<string, number> = { fizz: 0.4, chain: 0.6, coins: 0.5, target: 0.5 };
  const trimBus = new Map<string, GainNode>();
  const busFor = (name: string) => {
    if (!(name in TRIM)) return bus;
    let g = trimBus.get(name);
    if (!g) { g = ctx.createGain(); g.gain.value = TRIM[name]; g.connect(comp); trimBus.set(name, g); }
    return g;
  };
  const realRandom = Math.random;
  Math.random = mulberry32(seed + 1);
  const loops = new Map<number, Loop>();
  try {
    for (const e of [...events].sort((a, b) => a.t - b.t)) {
      if (e.t >= dur) break;
      cursor = Math.max(0, e.t);
      S.voices = 0; // nothing "ends" until rendering, so voice stealing would mute everything
      if (e.op === 'stop') { loops.get(e.loop!)?.stop(); loops.delete(e.loop!); continue; }
      if (e.op === 'set') { loops.get(e.loop!)?.set?.(e.args[0] as number); continue; }
      const fn = S[e.name];
      if (typeof fn !== 'function') continue;
      S.bus = busFor(e.name);
      const r = (fn as (...a: unknown[]) => unknown).apply(sfx, e.args);
      S.bus = bus;
      if (e.loop && r) loops.set(e.loop, r as Loop);
    }
    // anything still running fades out at the end of the stem
    cursor = Math.max(0, dur - 0.6);
    for (const l of loops.values()) l.stop();
  } finally {
    Math.random = realRandom;
  }
  const buf = await ctx.startRendering();
  return wavBase64(buf);
}

function wavBase64(buf: AudioBuffer): string {
  const n = buf.length, ch = buf.numberOfChannels, sr = buf.sampleRate;
  const bytes = new ArrayBuffer(44 + n * ch * 2);
  const v = new DataView(bytes);
  const w = (o: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); v.setUint32(4, 36 + n * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, ch, true); v.setUint32(24, sr, true);
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * ch * 2, true);
  const chans = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  let o = 44;
  for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const s = Math.max(-1, Math.min(1, chans[c][i])); v.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7fff, true); o += 2; }
  const u8 = new Uint8Array(bytes);
  let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode(...u8.subarray(i, i + 0x8000));
  return btoa(bin);
}
