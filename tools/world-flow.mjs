// The expansion's meta flow in a real browser: locked door, the door opening for a save that
// cleared the house, the world map, the request board, and the end of the world.
// usage: URL=http://localhost:5200 node tools/world-flow.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots/world';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('ERR_CERT')) errs.push(m.text()); });
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message + ' ' + e.stack));
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const click = async (sel, wait = 600) => { await page.click(sel, { force: true, timeout: 8000 }).catch((e) => errs.push(`click ${sel}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(wait); };
const boot = async (profile) => {
  await page.goto(process.env.URL ?? 'http://localhost:5200/');
  await page.evaluate((p) => { localStorage.clear(); if (p) localStorage.setItem('wajangchang-nyang-v2', JSON.stringify(p)); }, profile);
  await page.reload();
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
  await page.waitForTimeout(700);
};
const ids = await (async () => { await boot(null); return page.evaluate(() => window.__levels.map((l) => [l.id, l.chapter])); })();
const rec = (stars = 2) => ({ stars, best: 1, ch: [], plays: 1, fails: 0, cleared: true, streak: 0 });
const levels = (pred) => Object.fromEntries(ids.filter(([, ch]) => pred(ch)).map(([id]) => [id, rec()]));
const base = { v: 2, churu: 500, cats: ['cheese'], cat: 'cheese', skins: [], skinOf: {}, accs: [], wear: {}, ach: [], disc: [], seen: [], stats: {}, chapterIntro: [1, 2, 3, 4, 5, 6], tutorial: ['1-1', '1-2', '1-3'], settings: { sound: false, music: false, vibrate: false, lowGfx: false }, finale: true, fresh: [], preludes: [], tricks: [], trick: null, outside: false, worldEnd: false };

// 1. house almost done (one stage left): the outside tab is locked and says why
{
  const lv = levels((c) => c <= 6); delete lv['6-4'];
  await boot({ ...base, levels: lv });
  await click('.title button', 1200);
  await shot('01-map-home');
  await click('.region.world', 500);
  await shot('02-world-locked');
}
// 2. an old save that already cleared the whole house: the door opens on the way to the map
{
  await boot({ ...base, levels: levels((c) => c <= 6) });
  await click('.title button', 1800);
  await shot('03-door-story');
  await page.waitForTimeout(6500);
  await shot('04-door-story-end');
  await click('.storyscr .btn-big', 1200);
  await shot('05a-door-open');
  await page.waitForTimeout(2600);
  await shot('05b-door-pullback');
  await page.waitForTimeout(2400);
  await shot('05-chapter7-title');
  await page.waitForTimeout(5200);
  await shot('06-intro-7-1');
  await click('.sheet-card .btn-round', 1200);
  await shot('07-map-world');
  await click('.region:not(.world)', 900);
  await click('.chtab.board', 900);
  await shot('08-request-board');
  await click('.snode:not(.locked)', 1500);
  await shot('09-remix-intro');
}
// 3. deep in the world: tricks unlocked, the last place open
{
  await boot({ ...base, levels: levels(() => true), outside: true, worldEnd: true, tricks: ['hairball', 'knead'], trick: 'hairball', chapterIntro: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] });
  await click('.title button', 1500);
  await shot('10-map-world-all');
  await page.evaluate(() => window.app.debugLevel('11-3'));
  await page.waitForTimeout(2500);
  await shot('11-play-11-3');
}
// 4. the end of the world (cinematic), then the closing story
{
  await page.evaluate(() => { window.app.mode = 'result'; window.__fin = window.app.earthEnd(false); });
  for (const t of [800, 2200, 3600, 5000, 6400, 8000, 10500, 12800]) {
    await page.waitForTimeout(t - (globalThis.__last ?? 0)); globalThis.__last = t;
    await shot(`12-finale-${String(t).padStart(5, '0')}`);
  }
  await page.waitForFunction(() => !document.querySelector('.finale'), null, { timeout: 15000 }).catch(() => errs.push('finale did not end'));
  await page.evaluate(() => { window.__aft = window.app.afterEarth(); });
  await page.waitForTimeout(7200);
  await shot('13-after-earth');
}
console.log(errs.length ? 'ERRORS:\n' + errs.join('\n') : 'no errors');
await browser.close();
