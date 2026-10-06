// Playwright helper: drive the game in a phone-sized viewport and take screenshots.
// usage: node tools/shot.mjs <scenario> [args]
import { chromium } from 'playwright';

const url = process.env.URL ?? 'http://localhost:5173/';
const out = process.env.OUT ?? 'shots';
const [scenario, ...args] = process.argv.slice(2);

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const logs = [];
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
await page.goto(url);
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30000 });
await page.waitForTimeout(500);
const shot = async (name) => { await page.screenshot({ path: `${out}/${name}.png` }); console.log('shot', name); };

if (scenario === 'title') {
  await shot('title');
} else if (scenario === 'levels') {
  await page.evaluate(() => window.app.toMap());
  await page.waitForTimeout(800);
  await shot('levels');
} else if (scenario === 'level') {
  const id = args[0];
  await page.evaluate((id) => { const a = window.app; a.profile.chapterIntro.push(1, 2, 3, 4, 5, 6); void a.toIntro(window.__levels.find((l) => l.id === id)); }, id);
  await page.waitForTimeout(500);
  await shot(`${id}-intro`);
  await page.evaluate(() => window.app.startPlay());
  await page.waitForTimeout(900);
  await shot(`${id}-play`);
} else if (scenario === 'action') {
  // action <id> <kind> <dx> <dz> <power> <frac> [shots...]
  const [id, kind, dx, dz, pw, frac, near] = args;
  await page.evaluate((id) => window.app.debugLevel(id), id);
  await page.waitForTimeout(1200);
  await page.evaluate(([kind, dx, dz, pw, frac, near]) => {
    const g = window.app.game;
    let cands = g.props.filter((p) => p.alive && p.kind === kind);
    if (near) { const n = near.split(',').map(Number); cands.sort((a, b) => { const ta = a.body.translation(), tb = b.body.translation(); return Math.hypot(ta.x - n[0], ta.z - n[1]) - Math.hypot(tb.x - n[0], tb.z - n[1]); }); }
    const p = cands[0];
    const t = p.body.translation();
    const c = p.center(new t.constructor ? new (Object.getPrototypeOf(g.catHome).constructor)() : null);
    const V = Object.getPrototypeOf(g.catHome).constructor;
    const hit = new V(c.x, t.y + p.height * Number(frac), c.z);
    g.swat(p, new V(Number(dx), 0, Number(dz)).normalize(), Number(pw), hit);
  }, [kind, dx, dz, pw, frac, near]);
  const times = (process.env.TIMES ?? '350,700,1100,1600,2400,3600').split(',').map(Number);
  let last = 0;
  for (const t of times) { await page.waitForTimeout(t - last); last = t; await shot(`${id}-act-${t}`); }
} else if (scenario === 'drag') {
  // real touch drag: drag <id> x0 y0 x1 y1
  const [id, x0, y0, x1, y1] = args.map((v, i) => (i === 0 ? v : Number(v)));
  await page.evaluate((id) => window.app.debugLevel(id), id);
  await page.waitForTimeout(1200);
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 8; i++) { await page.mouse.move(x0 + ((x1 - x0) * i) / 8, y0 + ((y1 - y0) * i) / 8); await page.waitForTimeout(30); }
  await shot(`${id}-aim`);
  await page.mouse.up();
  await page.waitForTimeout(700);
  await shot(`${id}-drag-0.7`);
  await page.waitForTimeout(1500);
  await shot(`${id}-drag-2.2`);
} else if (scenario === 'end') {
  const id = args[0];
  await page.evaluate((id) => window.app.debugLevel(id), id);
  await page.waitForTimeout(800);
  await page.evaluate(() => { const g = window.app.game; for (const p of g.props) if (p.target) g.breakProp(p, 10); });
  await page.waitForTimeout(500);
  await page.evaluate(() => { const g = window.app.game; g.paws = 0; });
  await page.waitForTimeout(2500);
  await shot(`${id}-ending`);
  await page.waitForTimeout(2500);
  await shot(`${id}-result`);
}
console.log(logs.filter((l) => !l.includes('ERR_CERT') && !l.includes('[vite]') && !l.includes('deprecated')).slice(0, 30).join('\n'));
await browser.close();
