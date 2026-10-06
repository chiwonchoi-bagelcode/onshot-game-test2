// Screens that are hard to reach in a short flow: seeded profile → cat room tabs, cat reveal,
// chapter map later chapters, a forced 3-star result with rewards, pause, finale story.
// usage: URL=http://localhost:5200 node tools/ui-shots.mjs [outdir]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2] ?? 'shots/ui';
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
const errs = [];
page.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await page.goto(process.env.URL ?? 'http://localhost:5200/');
await page.evaluate(() => {
  const lv = {};
  for (const id of ['1-1', '1-2', '1-3', '1-4', '1-5', '2-1', '2-2']) lv[id] = { stars: 2, best: 200000, ch: [true, false, true], plays: 2, fails: 1, cleared: true, streak: 0 };
  localStorage.setItem('wajangchang-nyang-v2', JSON.stringify({ v: 2, churu: 1500, levels: lv, cats: ['cheese', 'kkamang'], cat: 'cheese', skins: [], skinOf: {}, accs: ['ribbon'], wear: { cheese: ['ribbon'] }, ach: ['first'], disc: ['heavy', 'domino', 'rocket'], seen: ['vase', 'mug', 'book', 'tv'], stats: { damage: 3000000, clears: 7 }, chapterIntro: [1, 2], tutorial: [], settings: { sound: false, music: false, vibrate: true }, finale: false, fresh: ['cats'] }));
});
await page.reload();
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
const shot = (n) => page.screenshot({ path: `${out}/${n}.png` });
const w = (ms) => page.waitForTimeout(ms);
await w(600);
await page.evaluate(() => window.app.toMap(2)); await w(1200); await shot('01-map-ch2');
await page.evaluate(() => window.app.toCats(() => window.app.toMap())); await w(1500); await shot('02-cats');
await page.click('text=🎨 털색', { force: true }); await w(700); await shot('03-skins');
await page.click('text=🎀 꾸미기', { force: true }); await w(700); await shot('04-accs');
await page.click('.crarrow >> nth=1', { force: true }); await w(400);
await page.click('.crarrow >> nth=1', { force: true }); await w(700);
await page.click('text=🐱 고양이', { force: true }); await w(700); await shot('05-cat-buy');
await page.evaluate(() => { window.app.catRoom.close(); window.app.toMap(); }); await w(500);
await page.evaluate(() => { void window.app.catRoom.reveal('siam', window.app.ui.top); }); await w(2600); await shot('06-cat-reveal');
await page.click('.catreveal .btn-big', { force: true }); await w(600);
// a played stage with forced success → result & rewards
await page.evaluate(() => { const a = window.app; void a.toIntro(window.__levels.find((l) => l.id === '1-3')); }); await w(900); await shot('07-intro-1-3');
await page.evaluate(() => window.app.startPlay()); await w(900);
await page.evaluate(() => { const g = window.app.game; for (const p of g.props) if (p.target || p.kind === 'mug') g.breakProp(p, 10); g.addScore(900000, g.catHome.clone()); }); await w(300);
await page.evaluate(() => { const g = window.app.game; for (let i = 0; i < 11; i++) g.addScore(5000, g.catHome.clone()); }); await w(500); await shot('08-climax');
await page.evaluate(() => window.app.pause()); await w(500); await shot('09-pause');
await page.click('text=▶ 계속하기', { force: true }); await w(300);
await page.evaluate(() => { const g = window.app.game; g.paws = 0; }); await w(5200); await shot('10-result');
for (let i = 0; i < 6; i++) { const has = await page.$('.revealscr, .catreveal, .storyscr'); if (!has) break; await shot(`11-reveal-${i}`); await page.click('.revealscr .btn-big, .catreveal .btn-big, .storyscr .btn-big', { force: true }).catch(() => {}); await w(1500); }
await page.click('.reward', { force: true }).catch(() => {}); await w(300); await shot('12-result-open');
await page.evaluate(() => { void window.app.screens.story(['집사의 일기 —', '범인은 아직도 오리무중이다.'], '🏆 와장창 대참사 완성!', 'finale'); }); await w(3800); await shot('13-finale');
console.log('errors:', errs.length ? errs.join('\n') : 'none');
await browser.close();
