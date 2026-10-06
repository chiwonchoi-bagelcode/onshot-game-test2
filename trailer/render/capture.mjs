// Renders trailer shots frame by frame in headless Chromium and pipes the
// frames straight into ffmpeg (one lossless-ish clip per shot), plus the
// recorded game sound events for the audio pass.
//
//   node render/capture.mjs [--shots A_living,B_cloth] [--w 1920 --h 1080]
//        [--fps 30] [--ss 1] [--out out/clips] [--crf 12] [--from 0 --to 99]
//
// The trailer dev server must be running: npx vite --config vite.config.ts
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const url = arg('url', 'http://localhost:5300');
const W = Number(arg('w', 1920)), H = Number(arg('h', 1080)), FPS = Number(arg('fps', 30)), SS = Number(arg('ss', 1));
const OUT = arg('out', 'out/clips');
const CRF = arg('crf', '12');
const FMT = arg('fmt', 'png');
const from = Number(arg('from', 0)), to = Number(arg('to', 1e9));
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-sandbox'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
page.on('console', (m) => { if (m.type() === 'error' || m.text().startsWith('[T]')) console.log('console', m.text()); });
await page.goto(`${url}/?w=${W}&h=${H}&ss=${SS}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });

const all = await page.evaluate(() => window.T.list());
// --edl: render only the part of each shot the edit uses (+ handles); the
// simulation still runs from the start so every outcome is unchanged
const EDL = process.argv.includes('--edl') ? JSON.parse(readFileSync('edit/timeline.json', 'utf8')).video.filter((v) => v.shot) : null;
const want = arg('shots', '') ? arg('shots', '').split(',') : EDL ? [...new Set(EDL.map((v) => v.shot))] : all.map((s) => s.id);

for (const id of want) {
  const t0 = Date.now();
  const { frames } = await page.evaluate(([id, fps]) => window.T.prepare(id, fps), [id, FPS]);
  let n = Math.min(frames, Math.round(to * FPS));
  let a0 = Math.round(from * FPS), b0 = n;
  if (EDL) {
    const uses = EDL.filter((v) => v.shot === id);
    a0 = Math.max(0, Math.round((Math.min(...uses.map((v) => v.in)) - 0.2) * FPS));
    b0 = Math.min(n, Math.round((Math.max(...uses.map((v) => v.out)) + 0.25) * FPS));
  }
  const file = join(OUT, `${id}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-pix_fmt', 'yuv420p',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv', '-r', String(FPS), file], { stdio: ['pipe', 'inherit', 'inherit'] });
  const type = FMT === 'jpg' ? 'image/jpeg' : 'image/png';
  for (let i = 0; i < n; i++) {
    const draw = i >= a0 && i < b0;
    const d = await page.evaluate(([type, draw]) => { window.T.step(draw); return draw ? window.T.grab(type, 0.95) : ''; }, [type, draw]);
    if (!d) continue;
    const buf = Buffer.from(d.slice(d.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 60 === 0) process.stdout.write(`\r${id} ${i}/${n}`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  const meta = await page.evaluate(() => ({ sounds: window.T.sounds, events: window.T.events, log: window.T.log.splice(0) }));
  writeFileSync(join(OUT, `${id}.clip.json`), JSON.stringify({ start: a0 / FPS, frames: b0 - a0, fps: FPS }));
  writeFileSync(join(OUT, `${id}.sounds.json`), JSON.stringify({ id, fps: FPS, frames: n, sounds: meta.sounds }));
  writeFileSync(join(OUT, `${id}.events.json`), JSON.stringify(meta.events.map((e) => ({ ...e, t: +e.t.toFixed(3) }))));
  console.log(`\r${id}: ${n} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s  ${meta.sounds.length} sounds`);
  for (const l of meta.log) console.log('   ', l);
}
await browser.close();
