// Click through the whole v2 flow like a player and screenshot each screen.
// usage: URL=http://localhost:5200 node tools/flow.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots/flow';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + e.stack));
await page.goto(process.env.URL ?? 'http://localhost:5200/');
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const click = async (sel, wait = 600) => { await page.click(sel, { force: true, timeout: 8000 }).catch((e) => errs.push(`click ${sel}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(wait); };
await page.waitForTimeout(800);
await shot('01-title');
await click('text=장난 시작!', 1500);
await shot('02-chapter-title');
await page.waitForTimeout(4200);
await shot('03-intro');
await click('text=장난 개시!', 1400);
await shot('04-play-tutorial');
// long-press the vase (inspect)
const v = await page.evaluate(() => { const g = window.app.game; const p = g.props.find((p) => p.kind === 'vase'); const c = p.center(g.catHome.clone()); return window.app.stage.toScreen(c); });
await page.mouse.move(v.x, v.y); await page.mouse.down();
await page.waitForTimeout(700);
await shot('05-inspect');
for (let i = 1; i <= 10; i++) { await page.mouse.move(v.x + i * 6, v.y + i * 9); await page.waitForTimeout(25); }
await shot('06-aim');
await page.mouse.up();
await page.waitForTimeout(1600);
await shot('07-hit');
await click('text=시치미 떼기', 4500);
await shot('08-result');
await page.waitForTimeout(2500);
await shot('09-result-full');
// dismiss reveal cards if any
for (let i = 0; i < 6; i++) {
  const has = await page.$('.revealscr, .catreveal, .storyscr');
  if (!has) break;
  await shot(`10-reveal-${i}`);
  await page.click('.revealscr .btn-big, .catreveal .btn-big, .storyscr .btn-big', { force: true }).catch(() => {});
  await page.waitForTimeout(900);
}
await click('text=다음 장난', 1200);
await shot('11-next-intro');
await click('.sheet-card .btn-round', 900);
await shot('12-map');
await click('.toolbtn >> nth=0', 1200);
await shot('13-catroom');
await click('.crarrow >> nth=1', 900);
await shot('14-catroom-next');
await click('text=🎀 꾸미기', 700);
await shot('15-catroom-acc');
await click('.catroom .btn-round', 900);
await click('.toolbtn >> nth=1', 800);
await shot('16-dex');
await click('.panel .btn-round', 700);
await click('.toolbtn >> nth=2', 800);
await shot('17-ach');
await click('.panel .btn-round', 700);
await click('.toolbtn >> nth=3', 800);
await shot('18-settings');
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await browser.close();
