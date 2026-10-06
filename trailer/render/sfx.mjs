// Renders the game-sound stems: one wav per shot (from out/clips/<shot>.sounds.json,
// replayed through the game's synth) plus the designed cue list audio/cues.json
// (game sounds placed by hand on the global timeline).
//   node render/sfx.mjs [--clips out/clips] [--out out/audio/sfx]
import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:5300');
const CLIPS = arg('clips', 'out/clips');
const OUT = arg('out', 'out/audio/sfx');
mkdirSync(OUT, { recursive: true });
const tl = JSON.parse(readFileSync('edit/timeline.json', 'utf8'));

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext()).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`${url}/?w=320&h=180`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });

const shots = [...new Set(tl.video.filter((v) => v.shot).map((v) => v.shot))];
for (const id of shots) {
  const f = join(CLIPS, `${id}.sounds.json`);
  if (!existsSync(f)) { console.log('missing', f); continue; }
  const rec = JSON.parse(readFileSync(f, 'utf8'));
  const dur = rec.frames / rec.fps + 1.5;
  const b64 = await page.evaluate(([s, d]) => window.renderSfx(s, d), [rec.sounds, dur]);
  writeFileSync(join(OUT, `${id}.wav`), Buffer.from(b64, 'base64'));
  console.log(`${id}: ${rec.sounds.length} calls, ${dur.toFixed(1)} s`);
}
if (existsSync('audio/cues.json')) {
  const cues = JSON.parse(readFileSync('audio/cues.json', 'utf8'));
  const ev = cues.events.map((e) => ({ t: e.t, name: e.name, args: e.args ?? [], op: e.op ?? 'call', loop: e.loop }));
  const b64 = await page.evaluate(([s, d]) => window.renderSfx(s, d, 48000, 99), [ev, cues.duration]);
  writeFileSync(join(OUT, `_cues.wav`), Buffer.from(b64, 'base64'));
  console.log(`cues: ${ev.length} calls`);
}
await browser.close();
