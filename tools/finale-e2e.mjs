// Play 11-3 for real in the browser (crane lever, then the red button) and follow the
// end of the world through: cinematic → receipt → closing story → map.
// usage: URL=http://localhost:5200 node tools/finale-e2e.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots/finale';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + e.stack));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
await page.goto(process.env.URL ?? 'http://localhost:5200/');
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
const all = await page.evaluate(() => window.__levels.map((l) => l.id));
const levels = Object.fromEntries(all.filter((id) => id !== '11-3').map((id) => [id, { stars: 2, best: 1, ch: [], plays: 1, fails: 0, cleared: true, streak: 0 }]));
await page.evaluate((lv) => { localStorage.clear(); localStorage.setItem('wajangchang-nyang-v2', JSON.stringify({ v: 2, churu: 50, levels: lv, outside: true, finale: true, chapterIntro: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11], preludes: ['11-3'], settings: { sound: false, music: false, vibrate: false, lowGfx: false } })); }, levels);
await page.reload();
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
await page.evaluate(() => window.app.toIntro(window.app.game && window.__levels.find((l) => l.id === '11-3')));
await page.waitForTimeout(1500);
await page.click('text=장난 개시!', { force: true });
await page.waitForFunction(() => window.app.mode === 'play' && window.app.game.canAct(), null, { timeout: 30000 });
await shot('01-play');
const swat = (near, dir, power) => page.evaluate(([near, dir, power]) => {
  const g = window.app.game;
  const V = g.catHome.constructor;
  const p = g.props.filter((q) => q.alive && q.interactable).sort((a, b) => a.startPos.distanceTo(new V(...near)) - b.startPos.distanceTo(new V(...near)))[0];
  const c = p.center(new V());
  return g.swat(p, new V(dir[0], 0, dir[1]).normalize(), power, c) && p.name;
}, [near, dir, power]);
console.log('lever:', await swat([2.95, 0, -0.8], [1, 0], 0.5));
await page.waitForTimeout(6000);
await page.waitForFunction(() => window.app.game.canAct(), null, { timeout: 20000 });
await shot('02-bomb-down');
console.log('button:', await swat([-2.2, 1, 4.35], [0, -1], 0.5));
await page.waitForFunction(() => !!document.querySelector('.finale'), null, { timeout: 40000 }).catch(() => errs.push('no finale'));
await page.waitForTimeout(5200);
await shot('03-finale-boom');
await page.waitForFunction(() => !document.querySelector('.finale'), null, { timeout: 30000 }).catch(() => errs.push('finale stuck'));
await page.waitForTimeout(4500);
await shot('04-receipt');
for (let i = 0; i < 8; i++) {
  const has = await page.$('.revealscr, .catreveal, .storyscr');
  if (!has) { await page.waitForTimeout(800); continue; }
  await page.waitForTimeout(7000);
  await shot(`05-after-${i}`);
  await page.click('.revealscr .btn-big, .catreveal .btn-big, .storyscr .btn-big', { force: true }).catch(() => {});
  await page.waitForTimeout(900);
}
const prof = await page.evaluate(() => ({ worldEnd: window.app.profile.worldEnd, rec: window.app.profile.levels['11-3'], ach: window.app.profile.ach.filter((a) => ['earth', 'outside'].includes(a)) }));
console.log(JSON.stringify(prof));
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
await browser.close();
