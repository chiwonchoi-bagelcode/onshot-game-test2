// Screenshot a stage in the dev-only preview page, optionally replaying a swat plan.
// usage: URL=http://localhost:5173 node tools/preview.mjs <levelId> ['<plan json>'] [outPrefix]
//   - always shoots "<out>-overview.png"; if the house is big also "<out>-play.png" (zoomed at the cat)
//   - with a plan: performs each swat (waiting its `wait` seconds) and shoots frames after each
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.env.URL ?? 'http://localhost:5173';
const [id, planJson, outArg] = process.argv.slice(2);
const out = outArg ?? `shots/${id}`;
mkdirSync(out.split('/').slice(0, -1).join('/') || '.', { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true })).newPage();
const logs = [];
page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
page.on('pageerror', (e) => logs.push('pageerror: ' + e.message));
await page.goto(`${base}/preview.html?level=${id}`);
await page.waitForFunction(() => window.ready === true, null, { timeout: 60000 });
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}-overview.png` });
const roomy = await page.evaluate(() => window.pv.stage.roomy);
if (roomy) {
  await page.evaluate(() => { const g = window.pv.game; window.pv.look(g.catHome.x, g.catHome.z); });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${out}-play.png` });
  await page.evaluate(() => window.pv.look());
  await page.waitForTimeout(900);
}
if (planJson) {
  const plan = JSON.parse(planJson);
  let i = 0;
  for (const a of plan) {
    const r = await page.evaluate((a) => String(window.pv.swat(a)), a);
    console.log('swat', a.pick, r);
    const wait = (a.wait ?? 2.5) * 1000;
    await page.waitForTimeout(Math.min(900, wait));
    await page.screenshot({ path: `${out}-a${i}-0.png` });
    if (wait > 900) { await page.waitForTimeout(wait - 900); await page.screenshot({ path: `${out}-a${i}-1.png` }); }
    i++;
  }
}
const info = await page.evaluate(() => document.getElementById('info').textContent);
console.log(info);
if (logs.length) console.log('errors:\n' + logs.join('\n'));
await browser.close();
