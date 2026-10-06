// Draw calls / triangles per stage in the real renderer (play view and overview).
// usage: URL=http://localhost:5200 node tools/drawcalls.mjs [ids...]
import { chromium } from 'playwright';
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true })).newPage();
await page.goto(process.env.URL ?? 'http://localhost:5200/');
await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 60000 });
const ids = process.argv.slice(2).length ? process.argv.slice(2) : await page.evaluate(() => window.__levels.map((l) => l.id));
for (const id of ids) {
  const r = await page.evaluate(async (id) => {
    const a = window.app; a.debugLevel(id);
    await new Promise((r) => setTimeout(r, 2800));
    const rr = a.stage.renderer; rr.info.autoReset = false;
    rr.info.reset(); a.stage.render();
    const play = { calls: rr.info.render.calls, tris: rr.info.render.triangles };
    a.stage.showOverview(true);
    await new Promise((r) => setTimeout(r, 900));
    rr.info.reset(); a.stage.render();
    const ov = { calls: rr.info.render.calls, tris: rr.info.render.triangles };
    rr.info.autoReset = true;
    let meshes = 0; a.stage.scene.traverse((o) => { if (o.isMesh) meshes++; });
    return { play, ov, meshes, props: a.game.props.length, roomy: a.stage.roomy };
  }, id);
  console.log(id.padEnd(4), `props ${String(r.props).padStart(3)}  calls play ${r.play.calls} / overview ${r.ov.calls}  tris ${r.ov.tris}  meshes ${r.meshes}${r.roomy ? '  (big house)' : ''}`);
}
await browser.close();
