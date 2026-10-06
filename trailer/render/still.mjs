// Grab full-resolution stills of a shot at given times (for review):
//   node render/still.mjs G_finale 47.2,61.5 [--w 1920 --h 1080] [--out out/stills]
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
const [shot, times] = process.argv.slice(2);
const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const W = Number(arg('w', 1920)), H = Number(arg('h', 1080)), OUT = arg('out', 'out/stills');
mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 1000, height: 600 } })).newPage();
page.on('pageerror', (e) => console.log('pageerror', e.message));
await page.goto(`${arg('url', 'http://localhost:5300')}/?w=${W}&h=${H}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 180000 });
const ts = times.split(',').map(Number).sort((a, b) => a - b);
await page.evaluate(([s]) => window.T.prepare(s, 30), [shot]);
let f = 0;
for (const t of ts) {
  const target = Math.round(t * 30);
  while (f < target) { await page.evaluate(() => window.T.step()); f++; }
  const d = await page.evaluate(() => { window.T.step(); return window.T.grab('image/png'); });
  f++;
  const file = `${OUT}/${shot}_${t.toFixed(2)}.png`;
  writeFileSync(file, Buffer.from(d.split(',')[1], 'base64'));
  console.log(file);
}
await browser.close();
